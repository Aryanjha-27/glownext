import json
from datetime import timedelta
from decimal import Decimal
from urllib import request as urllib_request
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.db import transaction
from django.db import IntegrityError
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from customer.models import Address as CustomerAddress, Notifications as CustomerNotification
from store.models import (
    Category,
    Service,
    ServiceGallery,
    ServiceReview,
    Notification,
    Booking,
)
from vendor.models import (
    Dispute, DisputeMessage, DisputeAuditLog,
    Payout, Notifications as VendorNotifications, vendor as VendorModel, DISPUTE_REASON,
)
from userauth.models import profile as ProfileModel, user as UserModel
from .serializers import (
    CategorySerializer,
    CustomerAddressSerializer,
    CustomerNotificationSerializer,
    DisputeSerializer,
    DisputeMessageSerializer,
    NotificationSerializer,
    BookingSerializer,
    ServiceReviewSerializer,
    ServiceSerializer,
    UserSerializer,
    PublicVendorSerializer,
    VendorSerializer,
    VendorTransactionSerializer,
    PayoutSerializer,
)


# Returns a simple response used to confirm that the Django API is reachable.
class TestAPI(APIView):
    # Handle the API health-check request.
    def get(self, request):
        return Response({"message": "Django is connected!"})


def user_payload(user):
    ProfileModel.objects.get_or_create(user=user)
    return UserSerializer(user).data


class RegisterAPI(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = (data.get("email") or "").strip().lower()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        password2 = data.get("password2") or ""
        full_name = (data.get("full_name") or "").strip()
        user_type = data.get("user_type") or "Customer"

        errors = {}
        if not email:
            errors["email"] = ["Email is required."]
        if not username:
            errors["username"] = ["Username is required."]
        if len(password) < 8:
            errors["password"] = ["Password must be at least 8 characters long."]
        if password != password2:
            errors["password2"] = ["Passwords do not match."]
        if user_type not in {"Customer", "Vendor"}:
            errors["user_type"] = ["User type must be Customer or Vendor."]
        if UserModel.objects.filter(email__iexact=email).exists():
            errors["email"] = ["An account with this email already exists."]

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = UserModel.objects.create_user(
                email=email,
                username=username,
                password=password,
            )
            ProfileModel.objects.create(
                user=user,
                full_name=full_name or username,
                mobile=data.get("mobile") or "",
                user_type=user_type,
            )
            if user_type == "Vendor":
                VendorModel.objects.create(
                    user=user,
                    store_name=full_name or username,
                    email=email,
                )

        return Response({"user": user_payload(user)}, status=status.HTTP_201_CREATED)


class LoginAPI(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_payload(user),
        })


class CurrentUserAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_payload(request.user))


class ProfileAPI(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        profile, _ = ProfileModel.objects.get_or_create(user=request.user)
        for field in ("full_name", "mobile", "address"):
            if field in request.data:
                setattr(profile, field, request.data[field])
        if "image" in request.FILES:
            profile.image = request.FILES["image"]
        profile.save(update_fields=["full_name", "mobile", "address", "image"])
        return Response(user_payload(request.user))


class LogoutAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


# Returns all service categories sorted alphabetically.
class CategoriesAPI(APIView):
    # Query categories, serialize them, and send JSON to the client.
    def get(self, request):
        categories = Category.objects.all().order_by("title")
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if not VendorModel.objects.filter(user=request.user).exists():
            return Response({"detail": "Only vendors can create categories."}, status=status.HTTP_403_FORBIDDEN)
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["Category title is required."]}, status=status.HTTP_400_BAD_REQUEST)
        payload = {"title": title, "slug": slugify(title)}
        if request.FILES.get("image"):
            payload["image"] = request.FILES["image"]
        serializer = CategorySerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            category = serializer.save()
        except IntegrityError:
            return Response({"title": ["A category with this name already exists."]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


def category_filter_queryset(queryset, request):
    category_value = request.query_params.get("category")
    if not category_value:
        return queryset
    category = None
    if category_value.isdigit():
        category = Category.objects.filter(pk=int(category_value)).first()
    if category is None:
        category = Category.objects.filter(slug=category_value).first()
    if category is None:
        return queryset.none()
    return queryset.filter(category=category)


# Returns published services that belong to verified vendors.
class ServicesAPI(APIView):
    # Load related objects efficiently before serializing the service list.
    def get(self, request):
        services = Service.objects.filter(status="Published", vendor__is_verified=True).select_related("vendor", "category").prefetch_related("tags", "gallery", "availability")
        services = category_filter_queryset(services, request)
        search = request.query_params.get("search")
        if search:
            services = services.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(vendor__store_name__icontains=search)
            )

        location = request.query_params.get("location")
        if location:
            services = services.filter(
                Q(vendor__city__icontains=location)
                | Q(vendor__country__icontains=location)
            )

        service_type = request.query_params.get("service_type")
        if service_type in {"Home", "Store"}:
            services = services.filter(Q(service_type=service_type) | Q(service_type="Both"))

        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        if min_price:
            services = services.filter(price__gte=min_price)
        if max_price:
            services = services.filter(price__lte=max_price)

        if request.query_params.get("featured") == "true":
            services = services.filter(featured=True)

        min_rating = request.query_params.get("min_rating")
        if min_rating:
            services = services.annotate(avg_rating=Avg("reviews__rating", filter=Q(reviews__active=True))).filter(
                avg_rating__gte=min_rating
            )

        ordering = request.query_params.get("ordering")
        if ordering in {"price", "-price", "date", "-date", "title", "-title"}:
            services = services.order_by(ordering)
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)


def current_vendor(request):
    if not request.user.is_authenticated:
        return None
    return get_object_or_404(VendorModel, user=request.user)


class VendorServicesAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        services = Service.objects.filter(vendor=vendor).select_related("category").order_by("-date")
        return Response(ServiceSerializer(services, many=True).data)

    def post(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        requested_status = request.data.get("status", "Draft")
        if requested_status == "Published" and not vendor.is_verified:
            return Response(
                {"detail": "Your vendor account is not verified. Services can be listed after your account is verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        category = None
        category_id = request.data.get("category_id")
        if category_id:
            category = get_object_or_404(Category, pk=category_id)

        service = Service(
            vendor=vendor,
            category=category,
            title=request.data.get("title", "").strip(),
            description=request.data.get("description", ""),
            price=request.data.get("price", 0),
            duration_minutes=request.data.get("duration_minutes", 60),
            discount_price=request.data.get("discount_price") or None,
            service_type=request.data.get("service_type", "Store"),
            status=request.data.get("status", "Draft"),
            featured=False,
        )
        if "thumbnail" in request.FILES:
            service.thumbnail = request.FILES["thumbnail"]
        if not service.title:
            return Response({"title": ["Title is required."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service.full_clean(exclude=["slug"])
            service.save()
            for file in request.FILES.getlist("gallery"):
                ServiceGallery.objects.create(service=service, image=file)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)

    def patch(self, request, sid):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        service = get_object_or_404(Service, sid=sid, vendor=vendor)
        requested_status = request.data.get("status", service.status)
        if requested_status == "Published" and not vendor.is_verified:
            return Response(
                {"detail": "Your vendor account is not verified. Services can be listed after your account is verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        for field in ("title", "description", "price", "discount_price", "duration_minutes", "service_type", "status"):
            if field in request.data:
                value = request.data[field]
                if field == "discount_price":
                    setattr(service, field, value or None)
                else:
                    setattr(service, field, value)
        if "category_id" in request.data:
            service.category = get_object_or_404(Category, pk=request.data["category_id"])
        if "thumbnail" in request.FILES:
            service.thumbnail = request.FILES["thumbnail"]
        try:
            service.full_clean(exclude=["slug"])
            service.save()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        for file in request.FILES.getlist("gallery"):
            ServiceGallery.objects.create(service=service, image=file)
        return Response(ServiceSerializer(service).data)

    def delete(self, request, sid):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        service = get_object_or_404(Service, sid=sid, vendor=vendor)
        service.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorBookingsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        bookings = Booking.objects.filter(service__vendor=vendor).select_related(
            "customer", "service", "service__category"
        ).order_by("-scheduled_date", "-scheduled_time", "-date")
        booking_status = request.query_params.get("booking_status")
        if booking_status and booking_status != "All":
            bookings = bookings.filter(booking_status=booking_status)
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request, bid, action):
        vendor = current_vendor(request)
        booking = get_object_or_404(Booking, bid=bid, service__vendor=vendor)
        if action == "confirm" and booking.booking_status == "Pending":
            booking.booking_status = "Confirmed"
            create_booking_notification(
                booking.customer,
                booking,
                f"Your beautician has been assigned for {booking.service.title}. Your booking is confirmed.",
                vendor_type="Beautician Assigned",
            )
        elif action == "decline" and booking.booking_status in {"Pending", "Confirmed"}:
            booking.booking_status = "Declined"
            booking.decline_reason = request.data.get("decline_reason", "")
        elif action == "complete" and booking.booking_status == "Confirmed":
            booking.booking_status = "Completed"
            create_user_notification(
                booking.customer,
                f"Your service for booking {booking.bid} has been completed. Please confirm your cash payment.",
                notification_type="Booking",
                booking=booking,
            )
        else:
            return Response({"detail": "This booking cannot be changed from its current status."}, status=status.HTTP_400_BAD_REQUEST)
        booking.save(update_fields=["booking_status", "decline_reason", "updated"])
        return Response(BookingSerializer(booking).data)


class CashPaymentConfirmationAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, bid):
        booking = get_object_or_404(
            Booking.objects.select_related("service__vendor"),
            bid=bid,
            customer=request.user,
        )
        if booking.payment_method != "COD":
            return Response({"detail": "Only cash/COD bookings can be confirmed here."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.booking_status != "Completed":
            return Response({"detail": "The vendor must complete the service before payment confirmation."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.payment_status == "Paid":
            return Response(BookingSerializer(booking).data)
        if booking.payment_status in {"Failed", "Refunded"}:
            return Response({"detail": "This booking cannot be marked as paid."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking = Booking.objects.select_for_update().select_related("service__vendor").get(pk=booking.pk)
            if booking.payment_status != "Paid":
                booking.payment_status = "Paid"
                booking.save()
                create_user_notification(
                    booking.customer,
                    f"Your cash payment of Rs. {booking.total} for booking {booking.bid} was recorded successfully.",
                    notification_type="Payment",
                    booking=booking,
                )
                vendor_user = booking.service.vendor.user if booking.service and booking.service.vendor else None
                create_user_notification(
                    vendor_user,
                    f"Customer confirmed cash payment for booking {booking.bid}. Amount: Rs. {booking.total}. "
                    f"GlowNext commission: Rs. {booking.commission_amount}. Your earnings: Rs. {booking.vendor_amount}.",
                    notification_type="Payment",
                    booking=booking,
                )
        return Response(BookingSerializer(booking).data)


class VendorDashboardAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        services = Service.objects.filter(vendor=vendor)
        bookings = Booking.objects.filter(service__vendor=vendor)
        status_data = list(bookings.values("booking_status").annotate(total=Count("id")).order_by("booking_status"))
        paid_bookings = bookings.filter(payment_status="Paid", booking_status="Completed")
        total_earned = paid_bookings.aggregate(total=Sum("vendor_amount"))["total"] or 0
        payout_total = Payout.objects.filter(vendor=vendor, status="Paid").aggregate(total=Sum("amount"))["total"] or 0
        rating = ServiceReview.objects.filter(service__vendor=vendor, active=True).aggregate(value=Avg("rating"))["value"] or 0
        return Response({
            "total_services": services.count(),
            "published_services": services.filter(status="Published").count(),
            "draft_services": services.filter(status="Draft").count(),
            "disabled_services": services.filter(status="Disabled").count(),
            "total_bookings": bookings.count(),
            "pending_bookings": bookings.filter(booking_status="Pending").count(),
            "confirmed_bookings": bookings.filter(booking_status="Confirmed").count(),
            "completed_bookings": bookings.filter(booking_status="Completed").count(),
            "cancelled_bookings": bookings.filter(booking_status="Cancelled").count(),
            "declined_bookings": bookings.filter(booking_status="Declined").count(),
            "revenue": float(total_earned),
            "total_earned": float(total_earned),
            "pending_earnings": float(bookings.filter(payment_status="Processing").aggregate(total=Sum("vendor_amount"))["total"] or 0),
            "available_payout": float(max(total_earned - payout_total, 0)),
            "total_paid_out": float(payout_total),
            "total_customers": bookings.values("customer").distinct().count(),
            "average_rating": round(float(rating), 1),
            "total_reviews": ServiceReview.objects.filter(service__vendor=vendor, active=True).count(),
            "verification_status": vendor.verification_status,
            "is_verified": vendor.is_verified,
            "booking_status": [
                {"label": item["booking_status"], "value": item["total"]}
                for item in status_data
            ],
        })


class VendorAnalyticsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = days if days in {7, 30, 180} else 30
        start = timezone.localdate() - timedelta(days=days - 1)
        bookings = Booking.objects.filter(service__vendor=vendor, scheduled_date__gte=start)
        booking_rows = {
            row["scheduled_date"]: row["count"]
            for row in bookings.values("scheduled_date").annotate(count=Count("id")).order_by("scheduled_date")
        }
        earnings_rows = {
            row["scheduled_date"]: float(row["amount"] or 0)
            for row in bookings.filter(payment_status="Paid", booking_status="Completed")
            .values("scheduled_date")
            .annotate(amount=Sum("vendor_amount"))
        }
        dates = [timezone.localdate() - timedelta(days=index) for index in range(days)]
        return Response({
            "period_days": days,
            "bookings": [{"date": day.isoformat(), "count": booking_rows.get(day, 0)} for day in dates],
            "earnings": [{"date": day.isoformat(), "amount": earnings_rows.get(day, 0)} for day in dates],
        })


def get_vendor_finance_stats(vendor_obj):
    """
    Computes vendor sales, platform commission, net earnings, pending payouts,
    completed payouts, and current available balance using strict Decimal math.
    """
    paid_bookings = Booking.objects.filter(service__vendor=vendor_obj, payment_status="Paid")
    totals = paid_bookings.aggregate(
        gross=Sum("total"),
        commission=Sum("commission_amount"),
        net=Sum("vendor_amount"),
    )
    total_sales = totals["gross"] or Decimal("0.00")
    platform_commission = totals["commission"] or Decimal("0.00")
    vendor_earnings = totals["net"] or Decimal("0.00")

    payouts = Payout.objects.filter(vendor=vendor_obj)
    
    pending_payouts = payouts.filter(
        status__in=["Pending", "Approved", "Processing"]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    completed_payouts = payouts.filter(
        status="Paid"
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    available_balance = vendor_earnings - pending_payouts - completed_payouts
    if available_balance < Decimal("0.00"):
        available_balance = Decimal("0.00")

    return {
        "total_sales": total_sales,
        "platform_commission": platform_commission,
        "vendor_earnings": vendor_earnings,
        "pending_payouts": pending_payouts,
        "completed_payouts": completed_payouts,
        "available_balance": available_balance,
    }


class VendorPayoutsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if pk is not None:
            payout = (
                Payout.objects.filter(vendor=vendor, id=pk if str(pk).isdigit() else -1).first()
                or Payout.objects.filter(vendor=vendor, pid=str(pk)).first()
            )
            if not payout:
                return Response({"detail": "Payout record not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(PayoutSerializer(payout).data)

        payouts = Payout.objects.filter(vendor=vendor).order_by("-requested_at", "-date")
        serializer = PayoutSerializer(payouts, many=True)
        return Response(serializer.data)

    def post(self, request, pk=None):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        if not vendor.is_verified:
            return Response({"detail": "Vendor verification is required before requesting a payout."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            req_amount = Decimal(str(request.data.get("amount", "0")))
        except Exception:
            return Response({"detail": "Invalid amount provided."}, status=status.HTTP_400_BAD_REQUEST)

        if req_amount <= Decimal("0.00"):
            return Response({"detail": "Payout amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        stats = get_vendor_finance_stats(vendor)
        available = stats["available_balance"]

        if req_amount > available:
            return Response(
                {"detail": f"Payout amount (Rs. {req_amount:.2f}) exceeds your current available balance of Rs. {available:.2f}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            VendorModel.objects.select_for_update().get(pk=vendor.pk)
            stats = get_vendor_finance_stats(vendor)
            available = stats["available_balance"]
            if req_amount > available:
                return Response(
                    {"detail": f"Payout amount (Rs. {req_amount:.2f}) exceeds your current available balance of Rs. {available:.2f}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payout = Payout.objects.create(
                vendor=vendor,
                amount=req_amount,
                net_amount=req_amount,
                status="Pending",
            )

        # Notify staff users
        for admin_user in UserModel.objects.filter(is_staff=True):
            create_user_notification(
                admin_user,
                f"New payout request of Rs. {req_amount:.2f} from {vendor.store_name} (ID: {payout.pid}).",
                notification_type="General",
            )
        create_user_notification(
            vendor.user,
            f"Your payout request {payout.pid} for Rs. {req_amount:.2f} was submitted and is pending admin review.",
            notification_type="General",
        )

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED)


class VendorEarningsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        stats = get_vendor_finance_stats(vendor)
        payouts = Payout.objects.filter(vendor=vendor).order_by("-requested_at", "-date")
        
        return Response({
            "total_earned": stats["total_sales"],
            "platform_commission": stats["platform_commission"],
            "vendor_earnings": stats["vendor_earnings"],
            "pending_earnings": stats["pending_payouts"],
            "total_paid_out": stats["completed_payouts"],
            "available_earnings": stats["available_balance"],
            "payouts": PayoutSerializer(payouts, many=True).data,
        })


class VendorProfileAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        data = VendorSerializer(vendor).data
        data["address"] = getattr(getattr(request.user, "profile", None), "address", "")
        return Response(data)

    def patch(self, request):
        vendor = current_vendor(request)
        resubmitting = vendor.verification_status == "Rejected"
        for field in ("store_name", "description", "email", "country", "city"):
            if field in request.data:
                setattr(vendor, field, request.data[field])
        if "image" in request.FILES:
            vendor.image = request.FILES["image"]
        if "document" in request.FILES:
            vendor.document = request.FILES["document"]
        if resubmitting:
            vendor.verification_status = "Pending"
            vendor.verified_at = None
        vendor.save()
        if "address" in request.data and request.user.is_authenticated:
            profile, _ = ProfileModel.objects.get_or_create(user=request.user)
            profile.address = request.data["address"]
            profile.save(update_fields=["address"])
        data = VendorSerializer(vendor).data
        data["address"] = getattr(getattr(request.user, "profile", None), "address", "")
        return Response(data)


# Returns one published service identified by its slug.
class ServiceDetailAPI(APIView):
    # Find the requested public service or return a 404 response.
    def get(self, request, slug):
        service = get_object_or_404(Service, slug=slug, status="Published", vendor__is_verified=True)
        serializer = ServiceSerializer(service)
        return Response(serializer.data)


# Returns the public list of verified vendors.
class VendorsAPI(APIView):
    # Query verified vendors, serialize them, and return their public data.
    def get(self, request):
        vendors = VendorModel.objects.filter(is_verified=True).order_by("store_name")
        serializer = PublicVendorSerializer(vendors, many=True)
        return Response(serializer.data)


# Returns unverified vendors for administrator review.
class PendingVendorsAPI(APIView):
    permission_classes = [IsAdminUser]

    # Restrict the result to pending vendors and staff users.
    def get(self, request):
        vendors = VendorModel.objects.filter(is_verified=False).order_by("-date")
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)


# Returns one verified vendor identified by its slug.
class VendorDetailAPI(APIView):
    # Find the requested verified vendor or return a 404 response.
    def get(self, request, slug):
        vendor = get_object_or_404(VendorModel, slug=slug, is_verified=True)
        serializer = PublicVendorSerializer(vendor)
        return Response(serializer.data)


# Allows an administrator to approve or reject a vendor.
class VendorVerificationAPI(APIView):
    permission_classes = [IsAdminUser]

    # Apply the requested verification action and return the new state.
    def post(self, request, pk):
        vendor = get_object_or_404(VendorModel, id=pk)
        action = (request.data.get("action") or "verify").lower()

        if action in ["verify", "approved", "accept"]:
            vendor.is_verified = True
            vendor.verification_status = "Verified"
            vendor.verified_at = timezone.now()
            create_user_notification(
                vendor.user,
                "Your vendor profile has been approved. You can now publish services and receive bookings.",
                notification_type="General",
                title="Vendor approved",
            )
        elif action in ["reject", "decline", "deny"]:
            vendor.is_verified = False
            vendor.verification_status = "Rejected"
            vendor.verified_at = None
            create_user_notification(
                vendor.user,
                "Your vendor verification was rejected. Please fill in the vendor profile form again, upload the corrected certificate, and submit it for review.",
                notification_type="General",
                title="Verification rejected",
            )
        else:
            return Response({"error": "action must be verify or reject."}, status=status.HTTP_400_BAD_REQUEST)

        vendor.save(update_fields=["is_verified", "verification_status", "verified_at"])

        return Response({
            "id": vendor.id,
            "store_name": vendor.store_name,
            "is_verified": vendor.is_verified,
            "verification_status": vendor.verification_status,
            "verified_at": vendor.verified_at,
        })


# Lists existing bookings and creates new bookings.
class BookingsAPI(APIView):
    # Return bookings with their related customer and service data.
    def get(self, request, bid=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if getattr(getattr(request.user, "profile", None), "user_type", "Customer") != "Customer":
            return Response({"detail": "Only customer accounts can access customer bookings."}, status=status.HTTP_403_FORBIDDEN)
        if bid is not None:
            return Response({"detail": "Use POST to cancel a booking."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        bookings = Booking.objects.filter(customer=request.user).select_related("customer", "service", "service__vendor", "service__category").order_by("-scheduled_date", "-scheduled_time", "-date")
        booking_status = request.query_params.get("booking_status")
        if booking_status and booking_status != "All":
            bookings = bookings.filter(booking_status=booking_status)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    # Validate incoming booking JSON and save a valid booking.
    def post(self, request, bid=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if getattr(getattr(request.user, "profile", None), "user_type", "Customer") != "Customer":
            return Response({"detail": "Only customer accounts can create or cancel bookings."}, status=status.HTTP_403_FORBIDDEN)
        if bid is not None:
            booking = get_object_or_404(Booking, bid=bid, customer=request.user)
            if booking.booking_status not in {"Pending", "Confirmed"}:
                return Response(
                    {"detail": "Only pending or confirmed bookings can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            booking.booking_status = "Cancelled"
            booking.save(update_fields=["booking_status", "updated"])
            create_user_notification(
                booking.service.vendor.user if booking.service and booking.service.vendor else None,
                f"Booking {booking.bid} was cancelled by the customer.",
                notification_type="Booking",
                booking=booking,
            )
            return Response(BookingSerializer(booking).data)
        payload = request.data.copy()
        payload["customer_id"] = request.user.pk
        if "service" in payload and "service_id" not in payload:
            payload["service_id"] = payload.pop("service")
        if "notes" in payload and "note" not in payload:
            payload["note"] = payload.pop("notes")
        serializer = BookingSerializer(data=payload)
        if serializer.is_valid():
            booking = serializer.save()
            booking.total = booking.service.effective_price
            booking.save(update_fields=["total", "commission_amount", "vendor_amount", "commission_rate"])
            vendor_user = booking.service.vendor.user if booking.service and booking.service.vendor else None
            create_booking_notification(
                vendor_user,
                booking,
                f"New booking received for {booking.service.title}. Please confirm the appointment.",
                vendor_type="New Order",
            )
            return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Returns active reviews belonging to a service.
class ReviewsAPI(APIView):
    # Find the service and serialize only visible reviews.
    def get(self, request, slug):
        service = get_object_or_404(Service.objects.filter(Q(slug=slug) | Q(sid=slug)).distinct())
        reviews = service.reviews.filter(active=True).select_related("user", "service")
        serializer = ServiceReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    def post(self, request, slug):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        service = get_object_or_404(Service.objects.filter(Q(slug=slug) | Q(sid=slug)).distinct())
        booking = get_object_or_404(
            Booking,
            bid=request.data.get("booking"),
            customer=request.user,
            service=service,
            booking_status="Completed",
        )
        if ServiceReview.objects.filter(booking=booking).exists():
            return Response({"detail": "This booking has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)
        review = ServiceReview.objects.create(
            service=service,
            booking=booking,
            user=request.user,
            rating=request.data.get("rating"),
            review=request.data.get("review", ""),
            is_verified=True,
        )
        return Response(ServiceReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class MyReviewsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = ServiceReview.objects.filter(user=request.user).select_related("user", "service").order_by("-date")
        return Response(ServiceReviewSerializer(reviews, many=True).data)


def create_user_notification(user, message, notification_type="General", booking=None, title=None):
    if user is None:
        return None
    return Notification.objects.create(
        user=user,
        booking=booking,
        type=notification_type,
        message=message,
    )


def create_booking_notification(user, booking, message, *, notification_type="Booking", vendor_type=None):
    if user is None or booking is None:
        return None
    notification = Notification.objects.create(
        user=user,
        booking=booking,
        type=notification_type,
        message=message,
    )

    if booking.service and booking.service.vendor and booking.service.vendor.user_id == getattr(user, "id", None):
        try:
            VendorNotifications.objects.create(
                user=user,
                booking=booking,
                type=vendor_type or "New Order",
            )
        except Exception:
            pass

    return notification


# Returns notifications for the authenticated user.
class NotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).select_related("user", "booking").order_by("-date")
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    def post(self, request, pk=None):
        notifications = Notification.objects.filter(user=request.user)
        if pk is not None:
            notification = get_object_or_404(notifications, pk=pk)
            notification.seen = True
            notification.save(update_fields=["seen"])
            return Response(NotificationSerializer(notification).data)
        notifications.update(seen=True)
        return Response({"detail": "Notifications marked as read."})


# Returns notifications belonging to customers.
class CustomerNotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).select_related("user", "booking").order_by("-date")
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    def post(self, request, pk=None):
        notifications = Notification.objects.filter(user=request.user)
        if pk is not None:
            notification = get_object_or_404(notifications, pk=pk)
            notification.seen = True
            notification.save(update_fields=["seen"])
            return Response(NotificationSerializer(notification).data)
        notifications.update(seen=True)
        return Response({"detail": "Notifications marked as read."})


# Returns customer address records.
class CustomerAddressAPI(APIView):
    permission_classes = [IsAuthenticated]

    # Query addresses and serialize them as JSON.
    def get(self, request):
        addresses = CustomerAddress.objects.filter(user=request.user).order_by("id")
        serializer = CustomerAddressSerializer(addresses, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy()
        if data.get("title") and not data.get("full_name"):
            data["full_name"] = data["title"]
        serializer = CustomerAddressSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        address = get_object_or_404(CustomerAddress, pk=pk, user=request.user)
        serializer = CustomerAddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            return Response(serializer.data if serializer.save() else serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        address = get_object_or_404(CustomerAddress, pk=pk, user=request.user)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Calculates summary statistics for the administrator dashboard.
class AdminDashboardAPI(APIView):
    permission_classes = [IsAdminUser]

    # Aggregate counts, revenue, booking statuses, and pending vendors.
    def get(self, request):
        total_services = Service.objects.count()
        total_vendors = VendorModel.objects.count()
        verified_vendors = VendorModel.objects.filter(is_verified=True).count()
        pending_vendors = VendorModel.objects.filter(is_verified=False).count()
        total_bookings = Booking.objects.count()
        total_revenue = Booking.objects.filter(payment_status="Paid").aggregate(total=Sum("total"))["total"] or 0
        total_platform_commission = Booking.objects.filter(payment_status="Paid").aggregate(total=Sum("commission_amount"))["total"] or 0
        total_vendor_payout = Booking.objects.filter(payment_status="Paid").aggregate(total=Sum("vendor_amount"))["total"] or 0
        open_disputes = Dispute.objects.filter(status="Open").count()

        booking_status_data = list(
            Booking.objects.values("booking_status").annotate(total=Count("id")).order_by("booking_status")
        )

        chart_data = []
        max_value = max((item["total"] for item in booking_status_data), default=1)
        for item in booking_status_data:
            chart_data.append({
                "label": item["booking_status"],
                "value": item["total"],
                "percent": 0 if max_value == 0 else round((item["total"] / max_value) * 100),
            })

        return Response({
            "total_services": total_services,
            "total_vendors": total_vendors,
            "verified_vendors": verified_vendors,
            "pending_vendors": pending_vendors,
            "total_bookings": total_bookings,
            "total_revenue": float(total_revenue),
            "total_platform_commission": float(total_platform_commission),
            "total_vendor_payout": float(total_vendor_payout),
            "open_disputes": open_disputes,
            "booking_status": chart_data,
            "pending_vendor_list": [
                {
                    "id": vendor.id,
                    "store_name": vendor.store_name,
                    "email": vendor.email,
                    "verification_status": vendor.verification_status,
                }
                for vendor in VendorModel.objects.filter(is_verified=False).order_by("-date")[:5]
            ],
        })


# Starts a payment request with the Khalti payment service.
class KhaltiInitiateAPI(APIView):
    # Validate the booking amount, call Khalti, and mark payment as processing.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response({"error": "booking_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        booking = get_object_or_404(Booking, id=booking_id, customer=request.user)
        amount_value = booking.total
        if amount_value <= 0:
            return Response({"error": "The booking has no payable amount."}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "return_url": getattr(settings, "KHALTI_RETURN_URL", "http://localhost:8000/api/payments/khalti/callback/"),
            "website_url": getattr(settings, "WEBSITE_URL", "http://localhost:8000"),
            "amount": int(amount_value * 100),
            "purchase_order_id": f"booking-{booking.id}",
            "purchase_order_name": booking.service.title if booking.service else "GlowNext Booking",
            "customer_info": {
                "name": booking.customer.username if booking.customer else "Customer",
                "email": booking.customer.email if booking.customer else "customer@example.com",
                "phone": "9800000000",
            },
        }

        secret_key = str(getattr(settings, "KHALTI_SECRET_KEY", "") or "").strip()
        if not secret_key:
            return Response(
                {"error": "Khalti is not configured. Set the KHALTI_SECRET_KEY in your .env or OS environment and restart Django before paying."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        url = getattr(settings, "KHALTI_BASE_URL", "https://dev.khalti.com/api/v2/") + "epayment/initiate/"

        req = urllib_request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Key {secret_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(req) as res:
                response_data = json.loads(res.read().decode("utf-8"))
        except Exception as exc:
            return Response({"error": f"Khalti request failed: {str(exc)}"}, status=status.HTTP_400_BAD_REQUEST)

        booking.payment_method = "Khalti"
        booking.payment_status = "Processing"
        booking.khalti_pidx = response_data.get("pidx")
        booking.khalti_txn_id = response_data.get("purchase_order_id")
        booking.save(update_fields=["payment_method", "payment_status", "khalti_pidx", "khalti_txn_id", "commission_rate", "commission_amount", "vendor_amount", "updated"])

        return Response({
            "message": "Payment started.",
            "payment_url": response_data.get("payment_url"),
            "pidx": response_data.get("pidx"),
            "amount": amount_value,
        })


# Receives Khalti's return request and verifies the payment status.
class KhaltiCallbackAPI(APIView):
    # Look up the payment and mark the matching booking as paid when complete.
    @staticmethod
    def frontend_redirect(success, purchase_order_id=""):
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        route = "/payment/success" if success else "/payment/failure"
        query = urlencode({"purchase_order_id": purchase_order_id}) if purchase_order_id else ""
        target = f"{frontend_url}{route}"
        return redirect(f"{target}?{query}" if query else target)

    def get(self, request):
        pidx = request.GET.get("pidx")
        purchase_order_id = request.GET.get("purchase_order_id", "")
        if not pidx:
            return self.frontend_redirect(False, purchase_order_id)

        secret_key = str(getattr(settings, "KHALTI_SECRET_KEY", "") or "").strip()
        if not secret_key:
            return self.frontend_redirect(False, purchase_order_id)
        url = getattr(settings, "KHALTI_BASE_URL", "https://dev.khalti.com/api/v2/") + "epayment/lookup/"

        payload = json.dumps({"pidx": pidx}).encode("utf-8")
        req = urllib_request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Key {secret_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(req) as res:
                data = json.loads(res.read().decode("utf-8"))
        except Exception as exc:
            return self.frontend_redirect(False, purchase_order_id)

        status_name = data.get("status")
        if status_name == "Completed":
            booking = Booking.objects.filter(khalti_pidx=pidx).first()
            if booking:
                booking.payment_status = "Paid"
                booking.khalti_txn_id = data.get("transaction", {}).get("txnId") or booking.khalti_txn_id
                # Recalculate commission and vendor amount on confirmed payment.
                # Booking.save() computes these from total + commission_rate.
                booking.save()  # triggers full commission recalculation
                create_user_notification(
                    booking.customer,
                    f"Your payment of Rs. {booking.total} for {booking.service.title if booking.service else 'your booking'} was successful. "
                    f"Booking ID: {booking.bid}.",
                    notification_type="Payment",
                    booking=booking,
                )
                create_user_notification(
                    booking.service.vendor.user if booking.service and booking.service.vendor else None,
                    f"Payment received for booking {booking.bid}. Your earnings are Rs. {booking.vendor_amount}.",
                    notification_type="Payment",
                    booking=booking,
                )
            purchase_order_id = purchase_order_id or data.get("purchase_order_id", "")
            return self.frontend_redirect(True, purchase_order_id)

        return self.frontend_redirect(False, purchase_order_id or data.get("purchase_order_id", ""))


# ──────────────────────────────────────────────────────────────────────────────
# CUSTOMER DISPUTE ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────


# Lists a customer's own disputes and allows raising a new dispute.
class CustomerDisputeListCreateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        disputes = (
            Dispute.objects.filter(customer=request.user)
            .select_related("vendor", "booking", "booking__service")
            .prefetch_related("messages", "audit_logs")
            .order_by("-date")
        )
        serializer = DisputeSerializer(disputes, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        # Validate that the booking belongs to this customer (accepts booking_id, booking, or pk).
        booking_val = request.data.get("booking_id") or request.data.get("booking")
        if not booking_val:
            return Response({"detail": "booking or booking_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        booking = (
            Booking.objects.filter(bid=str(booking_val), customer=request.user).first()
            or Booking.objects.filter(id=booking_val if str(booking_val).isdigit() else -1, customer=request.user).first()
        )
        if not booking:
            return Response(
                {"detail": "Booking not found or does not belong to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.booking_status not in ("Completed", "Confirmed", "Pending"):
            return Response(
                {"detail": "Disputes can only be raised for active or completed bookings."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate disputes on the same booking.
        if Dispute.objects.filter(booking=booking, customer=request.user).exclude(
            status__in=("Resolved", "Rejected", "Closed")
        ).exists():
            return Response(
                {"detail": "An active dispute already exists for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine the vendor from the booking.
        vendor = booking.service.vendor if booking.service else None
        if vendor is None:
            return Response(
                {"detail": "Cannot raise a dispute — no vendor associated with this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason_aliases = {
            "Service Quality": "Service quality issue",
            "Vendor No Show": "Vendor did not arrive",
            "Billing Issue": "Payment issue",
        }
        reason = reason_aliases.get(request.data.get("reason"), request.data.get("reason", "Other"))
        valid_reasons = {value for value, _ in DISPUTE_REASON}
        if reason not in valid_reasons:
            return Response({"reason": ["Choose a valid dispute reason."]}, status=status.HTTP_400_BAD_REQUEST)
        description = (request.data.get("description") or "").strip()
        if not description:
            return Response({"description": ["Please describe your issue."]}, status=status.HTTP_400_BAD_REQUEST)

        dispute = Dispute.objects.create(
            vendor=vendor,
            booking=booking,
            customer=request.user,
            reason=reason,
            subject=request.data.get("subject", ""),
            description=description,
            amount=booking.total,
            status="Open",
        )

        if "attachment" in request.FILES:
            dispute.attachment = request.FILES["attachment"]
            dispute.save(update_fields=["attachment"])

        # Create initial audit log entry.
        DisputeAuditLog.objects.create(
            dispute=dispute,
            changed_by=request.user,
            action="Dispute created by customer",
            new_status="Open",
        )

        # Notify admin (all staff users).
        for admin_user in UserModel.objects.filter(is_staff=True):
            create_user_notification(
                admin_user,
                f"New dispute raised by {request.user.email} for booking {booking.bid}. Reason: {dispute.get_reason_display()}.",
                notification_type="General",
            )

        # Notify vendor.
        if vendor.user:
            create_user_notification(
                vendor.user,
                f"A customer has raised a dispute for booking {booking.bid} ({booking.service.title if booking.service else 'N/A'}). "
                f"Reason: {dispute.get_reason_display()}. Please check your dispute panel.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Helper function to find a dispute by ID or did
def get_dispute_by_lookup(lookup, **filters):
    if str(lookup).isdigit():
        d = Dispute.objects.filter(id=int(lookup), **filters).first()
        if d:
            return d
    d = Dispute.objects.filter(did=str(lookup), **filters).first()
    if d:
        return d
    return None


# Returns the detail of a single customer dispute — only the owning customer can view.
class CustomerDisputeDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        dispute = get_dispute_by_lookup(pk, customer=request.user)
        if not dispute:
            return Response({"detail": "Dispute not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)


# Allows a customer to post additional messages on their own dispute.
class CustomerDisputeMessageAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        dispute = get_dispute_by_lookup(pk, customer=request.user)
        if not dispute:
            return Response({"detail": "Dispute not found."}, status=status.HTTP_404_NOT_FOUND)
        if dispute.status in ("Resolved", "Rejected", "Closed"):
            return Response(
                {"detail": "This dispute is already closed and cannot receive new messages."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        message_text = (request.data.get("message") or "").strip()
        if not message_text:
            return Response({"message": ["Message cannot be empty."]}, status=status.HTTP_400_BAD_REQUEST)

        msg = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=message_text,
            is_internal=False,
        )

        # If status is Waiting for Customer, move it back to Under Review.
        if dispute.status == "Waiting for Customer":
            old_status = dispute.status
            dispute.status = "Under Review"
            dispute.save(update_fields=["status", "updated"])
            DisputeAuditLog.objects.create(
                dispute=dispute,
                changed_by=request.user,
                action="Customer added information",
                previous_status=old_status,
                new_status="Under Review",
            )

        serializer = DisputeMessageSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────────────────
# VENDOR DISPUTE ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────


# Lists disputes related to the authenticated vendor's bookings.
class VendorDisputeListAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        disputes = (
            Dispute.objects.filter(vendor=vendor)
            .select_related("customer", "booking", "booking__service")
            .prefetch_related("messages")
            .order_by("-date")
        )
        serializer = DisputeSerializer(disputes, many=True, context={"request": request})
        return Response(serializer.data)


# Returns detail of a single dispute relevant to the authenticated vendor.
class VendorDisputeDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        dispute = get_dispute_by_lookup(pk, vendor=vendor)
        if not dispute:
            return Response({"detail": "Dispute not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)


# Allows the vendor to submit a response to a dispute on their booking.
class VendorDisputeResponseAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        dispute = get_dispute_by_lookup(pk, vendor=vendor)
        if not dispute:
            return Response({"detail": "Dispute not found."}, status=status.HTTP_404_NOT_FOUND)

        if dispute.status in ("Resolved", "Rejected", "Closed"):
            return Response(
                {"detail": "This dispute is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vendor_response_text = (request.data.get("vendor_response") or "").strip()
        if not vendor_response_text:
            return Response(
                {"vendor_response": ["Vendor response cannot be empty."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = dispute.status
        dispute.vendor_response = vendor_response_text
        dispute.vendor_responded_at = timezone.now()
        dispute.status = "Under Review"
        dispute.save(update_fields=["vendor_response", "vendor_responded_at", "status", "updated"])

        # Also create a visible message in the dispute thread.
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=vendor_response_text,
            is_internal=False,
        )

        DisputeAuditLog.objects.create(
            dispute=dispute,
            changed_by=request.user,
            action="Vendor submitted response",
            previous_status=old_status,
            new_status="Under Review",
        )

        # Notify customer that vendor has responded.
        if dispute.customer:
            create_user_notification(
                dispute.customer,
                f"The vendor has responded to your dispute (ID: {dispute.did}). "
                "Admin is reviewing the case.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)


# Lists paid booking transactions for the authenticated vendor with commission breakdown.
class VendorTransactionsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        transactions = (
            Booking.objects.filter(
                service__vendor=vendor,
                payment_status="Paid",
            )
            .select_related("service")
            .order_by("-date")
        )

        # Allow optional status filter.
        booking_status_filter = request.query_params.get("booking_status")
        if booking_status_filter and booking_status_filter != "All":
            transactions = transactions.filter(booking_status=booking_status_filter)

        serializer = VendorTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# ADMIN-ONLY ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────


# Returns comprehensive platform analytics data for admin users.
class AdminAnalyticsAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from decimal import Decimal as D
        from datetime import timedelta
        from django.db.models.functions import TruncDate

        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=30)

        all_bookings = Booking.objects.all()
        paid_bookings = all_bookings.filter(payment_status="Paid")

        revenue = paid_bookings.aggregate(
            gross=Sum("total"),
            commission=Sum("commission_amount"),
            vendor_amount=Sum("vendor_amount"),
        )

        booking_by_status = list(
            all_bookings.values("booking_status")
            .annotate(count=Count("id"))
            .order_by("booking_status")
        )

        daily_trend = list(
            all_bookings.filter(date__date__gte=thirty_days_ago)
            .annotate(day=TruncDate("date"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        all_disputes = Dispute.objects.all()

        return Response({
            "booking": {
                "total": all_bookings.count(),
                "pending": all_bookings.filter(booking_status="Pending").count(),
                "confirmed": all_bookings.filter(booking_status="Confirmed").count(),
                "completed": all_bookings.filter(booking_status="Completed").count(),
                "cancelled": all_bookings.filter(booking_status="Cancelled").count(),
                "home_service": all_bookings.filter(service_type="Home").count(),
                "store_service": all_bookings.filter(service_type="Store").count(),
                "by_status": booking_by_status,
                "daily_trend_30d": [
                    {"date": str(r["day"]), "count": r["count"]}
                    for r in daily_trend
                ],
            },
            "revenue": {
                "gross_total": float(revenue["gross"] or 0),
                "total_commission": float(revenue["commission"] or 0),
                "total_vendor_amount": float(revenue["vendor_amount"] or 0),
                "net_platform_revenue": float(revenue["commission"] or 0),
            },
            "vendor": {
                "total": VendorModel.objects.count(),
                "active": VendorModel.objects.filter(is_verified=True).count(),
                "pending": VendorModel.objects.filter(is_verified=False, verification_status="Pending").count(),
                "rejected": VendorModel.objects.filter(verification_status="Rejected").count(),
            },
            "customer": {
                "total": UserModel.objects.filter(profile__user_type="Customer").count(),
                "new_30d": UserModel.objects.filter(
                    date_joined__date__gte=thirty_days_ago,
                    profile__user_type="Customer",
                ).count(),
            },
            "dispute": {
                "total": all_disputes.count(),
                "open": all_disputes.filter(status="Open").count(),
                "under_review": all_disputes.filter(status="Under Review").count(),
                "resolved": all_disputes.filter(status="Resolved").count(),
                "rejected": all_disputes.filter(status="Rejected").count(),
            },
        })


# Lists all disputes for admin with filtering and search capabilities.
class AdminDisputeListAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        disputes = (
            Dispute.objects.all()
            .select_related("vendor", "booking", "booking__service", "customer", "resolved_by")
            .prefetch_related("messages", "audit_logs")
            .order_by("-date")
        )

        # Filters.
        status_filter = request.query_params.get("status")
        if status_filter:
            disputes = disputes.filter(status=status_filter)

        reason_filter = request.query_params.get("reason")
        if reason_filter:
            disputes = disputes.filter(reason=reason_filter)

        vendor_filter = request.query_params.get("vendor_id")
        if vendor_filter:
            disputes = disputes.filter(vendor_id=vendor_filter)

        # Search.
        search = request.query_params.get("search")
        if search:
            disputes = disputes.filter(
                Q(did__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(vendor__store_name__icontains=search)
                | Q(booking__bid__icontains=search)
            )

        serializer = DisputeSerializer(disputes, many=True, context={"request": request})
        return Response(serializer.data)


# Returns one dispute detail and allows admin to update status/resolution.
class AdminDisputeDetailAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        dispute = get_object_or_404(
            Dispute.objects.select_related(
                "vendor", "booking", "booking__service", "customer", "resolved_by"
            ).prefetch_related("messages", "audit_logs"),
            pk=pk,
        )
        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        dispute = get_object_or_404(Dispute, pk=pk)
        old_status = dispute.status

        allowed_fields = ("status", "admin_response", "resolution")
        changed = []
        for field in allowed_fields:
            if field in request.data:
                setattr(dispute, field, request.data[field])
                changed.append(field)

        if not changed:
            return Response({"detail": "No valid fields to update."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = dispute.status

        # Set resolution metadata when marking as resolved/rejected/closed.
        if new_status in ("Resolved", "Rejected", "Closed") and old_status != new_status:
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()

        dispute.save()

        # Write audit log for every admin patch.
        action_parts = []
        if "status" in request.data and old_status != new_status:
            action_parts.append(f"Status: {old_status} → {new_status}")
        if "admin_response" in request.data:
            action_parts.append("Admin response updated")
        if "resolution" in request.data:
            action_parts.append("Resolution recorded")

        DisputeAuditLog.objects.create(
            dispute=dispute,
            changed_by=request.user,
            action=" | ".join(action_parts) or "Admin updated dispute",
            previous_status=old_status,
            new_status=new_status,
            comment=request.data.get("admin_response", ""),
        )

        # Notify the customer when status changes.
        if old_status != new_status and dispute.customer:
            create_user_notification(
                dispute.customer,
                f"Your dispute (ID: {dispute.did}) status has been updated to '{new_status}'. "
                + (f"Admin response: {dispute.admin_response}" if dispute.admin_response else ""),
                notification_type="General",
            )

        # Notify the vendor when the dispute is resolved/rejected.
        if new_status in ("Resolved", "Rejected", "Closed") and dispute.vendor and dispute.vendor.user:
            create_user_notification(
                dispute.vendor.user,
                f"A dispute against your booking (ID: {dispute.booking.bid if dispute.booking else 'N/A'}) "
                f"has been {new_status.lower()} by the admin.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)