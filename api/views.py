import json
from datetime import timedelta
from decimal import Decimal
from urllib import request as urllib_request
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate, login as django_login
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from store.models import (
    Service,
    ServiceReview,
    Booking,
)
from vendor.models import (
    Dispute, Payout, vendor as VendorModel, DISPUTE_REASON,
)
from userauth.models import profile as ProfileModel, user as UserModel, Notification
from .serializers import (
    DisputeSerializer,
    BookingSerializer,
    ServiceReviewSerializer,
    ServiceSerializer,
    UserSerializer,
    PublicVendorSerializer,
    VendorSerializer,
    PayoutSerializer,
)


class TestAPI(APIView):
    def get(self, request):
        return Response({"message": "Django is connected!"})


def user_payload(user):
    ProfileModel.objects.get_or_create(user=user)
    return UserSerializer(user).data


def jwt_payload(user):
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    return {
        "access": access_token,
        "refresh": refresh_token,
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_payload(user),
    }


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
        if password != password2:
            errors["password2"] = ["Passwords do not match."]
        if user_type not in {"Customer", "Vendor"}:
            errors["user_type"] = ["User type must be Customer or Vendor."]
        if UserModel.objects.filter(email__iexact=email).exists():
            errors["email"] = ["An account with this email already exists."]
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user = UserModel.objects.create_user( email=email,username=username,password=password,)
            ProfileModel.objects.create(user=user,full_name=full_name or username,mobile=data.get("mobile") or "",user_type=user_type,)
            if user_type == "Vendor":
                VendorModel.objects.create(user=user,store_name=full_name or username,email=email,)
        return Response(jwt_payload(user), status=status.HTTP_201_CREATED)


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
        django_login(request, user)
        return Response(jwt_payload(user))


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


class CategoriesAPI(APIView):
    def get(self, request):
        categories = Service.objects.exclude(category="").values_list("category", flat=True).distinct().order_by("category")
        return Response([{"id": slugify(title), "title": title, "slug": slugify(title), "image": None} for title in categories])

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        if not VendorModel.objects.filter(user=request.user).exists():
            return Response({"detail": "Only vendors can create categories."}, status=status.HTTP_403_FORBIDDEN)
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"title": ["Category title is required."]}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"id": slugify(title), "title": title, "slug": slugify(title), "image": None}, status=status.HTTP_201_CREATED)


def category_filter_queryset(queryset, request):
    category_value = request.query_params.get("category")
    if not category_value:
        return queryset
    return queryset.filter(category__iexact=category_value.replace("-", " "))


class ServicesAPI(APIView):
    def get(self, request):
        services = Service.objects.filter(status="Published", vendor__is_verified=True).select_related("vendor")
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


def require_vendor(request):
    vendor = current_vendor(request)
    if vendor is None:
        return None, Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
    return vendor, None


def require_customer(request):
    if not request.user.is_authenticated:
        return None, Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    if getattr(getattr(request.user, "profile", None), "user_type", "Customer") != "Customer":
        return None, Response({"detail": "Only customer accounts can access customer bookings."}, status=status.HTTP_403_FORBIDDEN)
    return request.user, None


class VendorServicesAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
        services = Service.objects.filter(vendor=vendor).order_by("-date")
        return Response(ServiceSerializer(services, many=True).data)

    def post(self, request):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
        requested_status = request.data.get("status", "Draft")
        if requested_status == "Published" and not vendor.is_verified:
            return Response(
                {"detail": "Your vendor account is not verified. Services can be listed after your account is verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        category = request.data.get("category") or request.data.get("category_id") or ""
        if isinstance(category, str) and category:
            category = category.strip()
            if category.lower().replace("-", " ") in {item.lower().replace("-", " ") for item in (vendor.categories or [])}:
                category = next(item for item in (vendor.categories or []) if item.lower().replace("-", " ") == category.lower().replace("-", " "))

        service = Service(
            vendor=vendor,
            category=category,
            title=request.data.get("title", "").strip(),
            description=request.data.get("description", ""),
            price=request.data.get("price", 0),
            duration_minutes=request.data.get("duration_minutes", 60),
            service_type=request.data.get("service_type", "Store"),
            status=request.data.get("status", "Draft"),
        )
        if "thumbnail" in request.FILES:
            service.thumbnail = request.FILES["thumbnail"]
        if not service.title:
            return Response({"title": ["Title is required."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service.full_clean(exclude=["slug"])
            service.save()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)

    def patch(self, request, sid):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
        service = get_object_or_404(Service, sid=sid, vendor=vendor)
        requested_status = request.data.get("status", service.status)
        if requested_status == "Published" and not vendor.is_verified:
            return Response(
                {"detail": "Your vendor account is not verified. Services can be listed after your account is verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        for field in ("title", "description", "price", "duration_minutes", "service_type", "status"):
            if field in request.data:
                setattr(service, field, request.data[field])
        if "category" in request.data or "category_id" in request.data:
            category = request.data.get("category") or request.data.get("category_id") or ""
            if isinstance(category, str) and category:
                category = category.strip()
                if category.lower().replace("-", " ") in {item.lower().replace("-", " ") for item in (vendor.categories or [])}:
                    category = next(item for item in (vendor.categories or []) if item.lower().replace("-", " ") == category.lower().replace("-", " "))
            service.category = category
        if "thumbnail" in request.FILES:
            service.thumbnail = request.FILES["thumbnail"]
        try:
            service.full_clean(exclude=["slug"])
            service.save()
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ServiceSerializer(service).data)

    def delete(self, request, sid):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
        service = get_object_or_404(Service, sid=sid, vendor=vendor)
        service.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorBookingsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
        bookings = Booking.objects.filter(service__vendor=vendor).select_related(
            "customer", "service"
        ).order_by("-date", "-scheduled_date", "-scheduled_time")
        booking_status = request.query_params.get("booking_status")
        if booking_status and booking_status != "All":
            bookings = bookings.filter(booking_status=booking_status)
        return Response(BookingSerializer(bookings, many=True).data)

    def post(self, request, bid, action):
        vendor, error = require_vendor(request)
        if error is not None:
            return error
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
            if booking.payment_status == "Paid":
                refund_amount = Decimal(str(booking.total or 0))
                booking.payment_status = "Refunded"
                booking.commission_amount = Decimal("0.00")
                booking.vendor_amount = Decimal("0.00")
                create_user_notification(
                    booking.customer,
                    f"Your payment of Rs. {refund_amount:.2f} for {booking.service.title} was refunded because the vendor declined the booking{f'. Reason: {booking.decline_reason}' if booking.decline_reason else '.'}",
                    notification_type="Payment",
                    booking=booking,
                )
                vendor_user = booking.service.vendor.user if booking.service and booking.service.vendor else None
                create_user_notification(
                    vendor_user,
                    f"Booking {booking.bid} was declined after payment. Rs. {refund_amount:.2f} was refunded to the customer and removed from your payout balance.",
                    notification_type="Payment",
                    booking=booking,
                )
            else:
                create_user_notification(
                    booking.customer,
                    f"Your booking request for {booking.service.title} was declined by the vendor{f'. Reason: {booking.decline_reason}' if booking.decline_reason else '.'}",
                    notification_type="Booking",
                    booking=booking,
                )
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
        booking.save(update_fields=["booking_status", "decline_reason", "payment_status", "commission_amount", "vendor_amount", "updated"])
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
        if booking.payment_status == "Failed":
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
        vendor, error = require_vendor(request)
        if error is not None:
            return error
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


def get_vendor_finance_stats(vendor_obj):
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
        vendor, error = require_vendor(request)
        if error is not None:
            return error

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
        vendor, error = require_vendor(request)
        if error is not None:
            return error
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
                gross_amount=req_amount,
                net_amount=req_amount,
                commission_amount=Decimal("0.00"),
                status="Pending",
            )

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
        vendor, error = require_vendor(request)
        if error is not None:
            return error

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
        store_name = (request.data.get("store_name") or vendor.store_name or "").strip()
        document = request.FILES.get("document")
        if not store_name:
            return Response({"store_name": ["Store name is required."]}, status=status.HTTP_400_BAD_REQUEST)
        has_real_document = vendor.document and vendor.document.name != "default-document.jpg"
        if not vendor.is_verified and not document and not has_real_document:
            return Response({"document": ["Verification certificate is required."]}, status=status.HTTP_400_BAD_REQUEST)
        vendor.store_name = store_name
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


class ServiceDetailAPI(APIView):
    def get(self, request, slug):
        service = get_object_or_404(Service, slug=slug, status="Published", vendor__is_verified=True)
        serializer = ServiceSerializer(service)
        return Response(serializer.data)


class VendorsAPI(APIView):
    def get(self, request):
        vendors = VendorModel.objects.filter(is_verified=True).order_by("store_name")
        serializer = PublicVendorSerializer(vendors, many=True)
        return Response(serializer.data)


class PendingVendorsAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        vendors = VendorModel.objects.filter(is_verified=False).order_by("-date")
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)


class VendorDetailAPI(APIView):
    def get(self, request, slug):
        vendor = get_object_or_404(VendorModel, slug=slug, is_verified=True)
        serializer = PublicVendorSerializer(vendor)
        return Response(serializer.data)


class VendorVerificationAPI(APIView):
    permission_classes = [IsAdminUser]

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
            )
        elif action in ["reject", "decline", "deny"]:
            vendor.is_verified = False
            vendor.verification_status = "Rejected"
            vendor.verified_at = None
            create_user_notification(
                vendor.user,
                "Your vendor verification was rejected. Please fill in the vendor profile form again, upload the corrected certificate, and submit it for review.",
                notification_type="General",
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


class BookingsAPI(APIView):
    def get(self, request, bid=None):
        customer, error = require_customer(request)
        if error is not None:
            return error
        if bid is not None:
            return Response({"detail": "Use POST to cancel a booking."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        bookings = Booking.objects.filter(customer=request.user).select_related("customer", "service", "service__vendor").order_by("-date", "-scheduled_date", "-scheduled_time")
        booking_status = request.query_params.get("booking_status")
        if booking_status and booking_status != "All":
            bookings = bookings.filter(booking_status=booking_status)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request, bid=None):
        customer, error = require_customer(request)
        if error is not None:
            return error
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


class ReviewsAPI(APIView):
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
        )
        if booking.booking_status not in {"Completed", "Confirmed"}:
            return Response({"detail": "Only completed or confirmed bookings can be reviewed."}, status=status.HTTP_400_BAD_REQUEST)
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


def create_user_notification(user, message, notification_type="General", booking=None):
    if user is None:
        return None
    if not getattr(user, "is_authenticated", False) and user.pk is None:
        return None
    return Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        booking=booking,
    )


def create_booking_notification(user, booking, message, *, notification_type="Booking", vendor_type=None):
    if user is None or booking is None:
        return None
    if not getattr(user, "is_authenticated", False) and user.pk is None:
        return None
    notification = Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        booking=booking,
    )
    if vendor_type:
        notification.message = f"{vendor_type}: {message}"
        notification.save(update_fields=["message"])
    return notification


class NotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by("-created_at")
        payload = [
            {
                "id": item.id,
                "message": item.message,
                "notification_type": item.notification_type,
                "read": item.read,
                "booking_id": item.booking_id if item.booking else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in notifications
        ]
        return Response(payload)

    def patch(self, request, pk=None):
        if pk is None:
            pk = request.data.get("id")
        notification = get_object_or_404(Notification, id=pk, user=request.user)
        notification.read = request.data.get("read", True)
        notification.save(update_fields=["read", "updated_at"])
        return Response({
            "id": notification.id,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "read": notification.read,
            "booking_id": notification.booking_id if notification.booking else None,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
        })


class CustomerAddressAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = ProfileModel.objects.get_or_create(user=request.user)
        return Response([self.as_address(profile)])

    def post(self, request):
        profile, _ = ProfileModel.objects.get_or_create(user=request.user)
        self.update_profile(profile, request.data)
        return Response(self.as_address(profile), status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        profile = get_object_or_404(ProfileModel, pk=pk, user=request.user)
        self.update_profile(profile, request.data)
        return Response(self.as_address(profile))

    def delete(self, request, pk):
        profile = get_object_or_404(ProfileModel, pk=pk, user=request.user)
        profile.address = ""
        profile.save(update_fields=["address"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def update_profile(profile, data):
        for field in ("full_name", "mobile", "address"):
            if field in data:
                setattr(profile, field, data[field])
        profile.save(update_fields=["full_name", "mobile", "address"])

    @staticmethod
    def as_address(profile):
        return {
            "id": profile.id,
            "full_name": profile.full_name,
            "mobile": profile.mobile,
            "email": profile.user.email,
            "country": "",
            "city": "",
            "address": profile.address,
        }


class AdminDashboardAPI(APIView):
    permission_classes = [IsAdminUser]

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


class KhaltiInitiateAPI(APIView):
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


class KhaltiCallbackAPI(APIView):
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
                booking.save()
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


class CustomerDisputeListCreateAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        disputes = (
            Dispute.objects.filter(customer=request.user)
            .select_related("vendor", "booking", "booking__service")
            .order_by("-date")
        )
        serializer = DisputeSerializer(disputes, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
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

        if Dispute.objects.filter(booking=booking, customer=request.user).exclude(
            status__in=("Resolved", "Rejected", "Closed")
        ).exists():
            return Response(
                {"detail": "An active dispute already exists for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

      

        for admin_user in UserModel.objects.filter(is_staff=True):
            create_user_notification(
                admin_user,
                f"New dispute raised by {request.user.email} for booking {booking.bid}. Reason: {dispute.get_reason_display()}.",
                notification_type="General",
            )

        if vendor.user:
            create_user_notification(
                vendor.user,
                f"A customer has raised a dispute for booking {booking.bid} ({booking.service.title if booking.service else 'N/A'}). "
                f"Reason: {dispute.get_reason_display()}. Please check your dispute panel.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def get_dispute_by_lookup(lookup, **filters):
    if str(lookup).isdigit():
        d = Dispute.objects.filter(id=int(lookup), **filters).first()
        if d:
            return d
    d = Dispute.objects.filter(did=str(lookup), **filters).first()
    if d:
        return d
    return None


class CustomerDisputeDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        dispute = get_dispute_by_lookup(pk, customer=request.user)
        if not dispute:
            return Response({"detail": "Dispute not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)


class VendorDisputeListAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = current_vendor(request)
        if not vendor:
            return Response({"detail": "Vendor profile not found."}, status=status.HTTP_404_NOT_FOUND)
        disputes = (
            Dispute.objects.filter(vendor=vendor)
            .select_related("customer", "booking", "booking__service")
            .order_by("-date")
        )
        serializer = DisputeSerializer(disputes, many=True, context={"request": request})
        return Response(serializer.data)


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

        if dispute.customer:
            create_user_notification(
                dispute.customer,
                f"The vendor has responded to your dispute (ID: {dispute.did}). "
                "Admin is reviewing the case.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)


class AdminAnalyticsAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
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


class AdminDisputeListAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        disputes = (
            Dispute.objects.all()
            .select_related("vendor", "booking", "booking__service", "customer", "resolved_by")
            .order_by("-date")
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            disputes = disputes.filter(status=status_filter)

        reason_filter = request.query_params.get("reason")
        if reason_filter:
            disputes = disputes.filter(reason=reason_filter)

        vendor_filter = request.query_params.get("vendor_id")
        if vendor_filter:
            disputes = disputes.filter(vendor_id=vendor_filter)

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


class AdminDisputeDetailAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        dispute = get_object_or_404(
            Dispute.objects.select_related(
                "vendor", "booking", "booking__service", "customer", "resolved_by"
            ),
            pk=pk,
        )
        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        dispute = get_object_or_404(Dispute, pk=pk)
        old_status = dispute.status

        allowed_fields = ("status", "admin_response", )
        changed = []
        for field in allowed_fields:
            if field in request.data:
                setattr(dispute, field, request.data[field])
                changed.append(field)

        if not changed:
            return Response({"detail": "No valid fields to update."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = dispute.status

        if new_status in ("Resolved", "Rejected", "Closed") and old_status != new_status:
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()

        dispute.save()

        action_parts = []
        if "status" in request.data and old_status != new_status:
            action_parts.append(f"Status: {old_status} → {new_status}")
        if "admin_response" in request.data:
            action_parts.append("Admin response updated")
       

        if old_status != new_status and dispute.customer:
            create_user_notification(
                dispute.customer,
                f"Your dispute (ID: {dispute.did}) status has been updated to '{new_status}'. "
                + (f"Admin response: {dispute.admin_response}" if dispute.admin_response else ""),
                notification_type="General",
            )

        if new_status in ("Resolved", "Rejected", "Closed") and dispute.vendor and dispute.vendor.user:
            create_user_notification(
                dispute.vendor.user,
                f"A dispute against your booking (ID: {dispute.booking.bid if dispute.booking else 'N/A'}) "
                f"has been {new_status.lower()} by the admin.",
                notification_type="General",
            )

        serializer = DisputeSerializer(dispute, context={"request": request})
        return Response(serializer.data)