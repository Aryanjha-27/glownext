from datetime import datetime

from django.db.models import Avg
from django.utils import timezone
from rest_framework import serializers

from store.models import (
    Service,
    Booking,
    ServiceReview,
)
from userauth.models import user as UserModel, profile as ProfileModel, Notification
from vendor.models import vendor as VendorModel, Dispute, Payout


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileModel
        fields = ["id", "full_name", "image", "address", "mobile", "user_type"]


class NotificationSerializer(serializers.ModelSerializer):
    booking_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "message",
            "notification_type",
            "read",
            "booking_id",
            "created_at",
        ]

    def get_booking_id(self, obj):
        return obj.booking_id if obj.booking else None


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    notifications = serializers.SerializerMethodField()

    class Meta:
        model = UserModel
        fields = [
            "id",
            "email",
            "username",
            "is_staff",
            "is_superuser",
            "profile",
            "notifications",
        ]

    def get_notifications(self, obj):
        qs = obj.notifications.order_by("-created_at")[:10]
        return NotificationSerializer(qs, many=True).data


class VendorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = VendorModel
        fields = [
            "id",
            "store_name",
            "slug",
            "description",
            "email",
            "country",
            "city",
            "image",
            "document",
            "vendor_id",
            "verification_status",
            "is_verified",
            "user",
        ]


class PublicVendorSerializer(VendorSerializer):
    services = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta(VendorSerializer.Meta):
        fields = [
            *[
                field for field in VendorSerializer.Meta.fields
                if field != "document"
            ],
            "services",
            "average_rating",
            "review_count",
            "reviews",
        ]

    def get_services(self, obj):
        services = (
            obj.services.filter(status="Published")
            .select_related("vendor")
            .order_by("-date")
        )
        return ServiceSerializer(services, many=True).data

    def get_reviews(self, obj):
        reviews = (
            ServiceReview.objects.filter(service__vendor=obj, active=True)
            .select_related("user", "service")
            .order_by("-date")
        )
        return ServiceReviewSerializer(reviews, many=True).data

    def get_average_rating(self, obj):
        average = (
            ServiceReview.objects.filter(service__vendor=obj, active=True)
            .aggregate(avg=Avg("rating"))["avg"]
        )
        if average is None:
            return 0
        return round(float(average), 1)

    def get_review_count(self, obj):
        return ServiceReview.objects.filter(service__vendor=obj, active=True).count()


class ServiceSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category", read_only=True)
    effective_price = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()
    booking_count = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "sid",
            "title",
            "slug",
            "description",
            "price",
            "duration_minutes",
            "effective_price",
            "service_type",
            "thumbnail",
            "status",
            "date",
            "updated",
            "vendor",
            "vendor_name",
            "category_name",
            "average_rating",
            "review_count",
            "booking_count",
        ]

    def get_vendor_name(self, obj):
        return obj.vendor.store_name if obj.vendor else None

    def get_booking_count(self, obj):
        return obj.bookings.count()


class BookingSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    has_review = serializers.SerializerMethodField()
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=UserModel.objects.all(),
        write_only=True,
        required=False,
    )
    service_id = serializers.PrimaryKeyRelatedField(
        source="service",
        queryset=Service.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Booking
        fields = [
            "id",
            "bid",
            "customer",
            "customer_id",
            "service",
            "service_id",
            "service_type",
            "address",
            "scheduled_date",
            "scheduled_time",
            "note",
            "booking_status",
            "decline_reason",
            "payment_method",
            "payment_status",
            "total",
            "commission_rate",
            "commission_amount",
            "vendor_amount",
            "date",
            "has_review",
        ]

    def get_has_review(self, obj):
        return ServiceReview.objects.filter(booking=obj).exists()

    def validate(self, attrs):
        scheduled_date = attrs.get("scheduled_date")
        scheduled_time = attrs.get("scheduled_time")
        if scheduled_date and scheduled_time:
            try:
                selected_dt = datetime.combine(scheduled_date, scheduled_time)
            except TypeError:
                raise serializers.ValidationError({"scheduled_date": "Choose a valid appointment date and time."})
            if scheduled_date < timezone.localdate():
                raise serializers.ValidationError({"scheduled_date": "Past dates cannot be selected."})
            selected_dt = timezone.make_aware(selected_dt, timezone.get_current_timezone())
            if scheduled_date == timezone.localdate() and selected_dt < timezone.now():
                raise serializers.ValidationError({"scheduled_time": "Past times cannot be selected."})
        return super().validate(attrs)


class ServiceReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)

    class Meta:
        model = ServiceReview
        fields = [
            "id",
            "rid",
            "service",
            "user",
            "rating",
            "review",
            "is_verified",
            "active",
            "date",
        ]


class DisputeSerializer(serializers.ModelSerializer):
    customer_email = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_store = serializers.SerializerMethodField()
    booking_bid = serializers.SerializerMethodField()
    service_title = serializers.SerializerMethodField()
    booking_total = serializers.SerializerMethodField()
    booking_commission = serializers.SerializerMethodField()
    booking_vendor_amount = serializers.SerializerMethodField()
    resolved_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            "id",
            "did",
            "customer",
            "customer_email",
            "customer_name",
            "vendor",
            "vendor_name",
            "vendor_store",
            "booking",
            "booking_bid",
            "service_title",
            "booking_total",
            "booking_commission",
            "booking_vendor_amount",
            "reason",
            "subject",
            "description",
            "attachment",
            "amount",
            "status",
            "admin_response",
            "resolution",
            "resolved_by",
            "resolved_by_email",
            "resolved_at",
            "vendor_response",
            "vendor_responded_at",
            "notes",
            "date",
            "updated",
        ]
        read_only_fields = [
            "did", "status", "admin_response", "resolution",
            "resolved_by", "resolved_by_email", "resolved_at",
            "vendor_response", "vendor_responded_at",
            "date", "updated",
        ]

    def get_customer_email(self, obj):
        return obj.customer.email if obj.customer else None

    def get_customer_name(self, obj):
        if obj.customer is None:
            return None
        profile = getattr(obj.customer, "profile", None)
        return getattr(profile, "full_name", None) or obj.customer.username

    def get_vendor_name(self, obj):
        return obj.vendor.user.email if obj.vendor and obj.vendor.user else None

    def get_vendor_store(self, obj):
        return obj.vendor.store_name if obj.vendor else None

    def get_booking_bid(self, obj):
        return obj.booking.bid if obj.booking else None

    def get_service_title(self, obj):
        if obj.booking and obj.booking.service:
            return obj.booking.service.title
        return None

    def get_booking_total(self, obj):
        return float(obj.booking.total) if obj.booking else None

    def get_booking_commission(self, obj):
        return float(obj.booking.commission_amount) if obj.booking else None

    def get_booking_vendor_amount(self, obj):
        return float(obj.booking.vendor_amount) if obj.booking else None

    def get_resolved_by_email(self, obj):
        return obj.resolved_by.email if obj.resolved_by else None



class PayoutSerializer(serializers.ModelSerializer):
    vendor_store_name = serializers.ReadOnlyField(source="vendor.store_name")
    processed_by_email = serializers.ReadOnlyField(source="processed_by.email")

    class Meta:
        model = Payout
        fields = [
            "id",
            "pid",
            "vendor",
            "vendor_store_name",
            "amount",
            "status",
            "payment_reference",
            "admin_note",
            "requested_at",
            "processed_at",
            "processed_by",
            "processed_by_email",
        ]
        read_only_fields = [
            "id",
            "pid",
            "vendor",
            "vendor_store_name",
            "status",
            "requested_at",
            "processed_at",
            "processed_by",
            "processed_by_email",
        ]
