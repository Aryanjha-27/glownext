from datetime import datetime

from django.db.models import Avg
from django.utils import timezone
from rest_framework import serializers

from store.models import (
    Category,
    Service,
    ServiceGallery,
    Booking,
    ServiceReview,
    Notification,
)
from userauth.models import user as UserModel, profile as ProfileModel
from vendor.models import vendor as VendorModel, Dispute, DisputeMessage, DisputeAuditLog, Payout
from customer.models import Address as CustomerAddress, Notifications as CustomerNotification



# Converts category model records into API JSON.
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "title", "slug", "image"]


# Converts gallery image records into API JSON.
class ServiceGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceGallery
        fields = ["id", "image", "caption", "date"]


# Converts a user profile into API JSON.
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileModel
        fields = ["id", "full_name", "image", "address", "mobile", "user_type"]


# Converts the custom user and its profile into API JSON.
class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = UserModel
        fields = ["id", "email", "username", "is_staff", "is_superuser", "profile"]


# Converts complete vendor data, including verification documents for staff.
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


# Removes the private verification document from public vendor responses.
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
            .select_related("vendor", "category")
            .prefetch_related("gallery")
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


# Builds the nested public JSON representation of a service.
class ServiceSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    gallery = ServiceGallerySerializer(many=True, read_only=True)
    vendor_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
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
            "category",
            "category_name",
            "gallery",
            "average_rating",
            "review_count",
            "booking_count",
        ]

    # Return the vendor's display name for clients that need a flat value.
    def get_vendor_name(self, obj):
        return obj.vendor.store_name if obj.vendor else None

    # Return the category title for clients that need a flat value.
    def get_category_name(self, obj):
        return obj.category.title if obj.category else None

    def get_booking_count(self, obj):
        return obj.bookings.count()


# Serializes bookings and accepts related objects through their ID fields.
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
        return hasattr(obj, "review")

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


# Converts service review records into API JSON.
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


# Converts store notification records into API JSON.
class NotificationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    booking = BookingSerializer(read_only=True)
    title = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="date", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "nid", "user", "booking", "type", "title", "message", "seen", "date", "created_at"]

    def get_title(self, obj):
        return obj.type or "Update"


# Converts customer notification records into API JSON.
class CustomerNotificationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    booking = BookingSerializer(read_only=True)
    title = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="date", read_only=True)

    class Meta:
        model = CustomerNotification
        fields = ["id", "user", "type", "title", "message", "seen", "date", "created_at", "booking"]

    def get_title(self, obj):
        return obj.type or "Update"


# Converts customer address records into API JSON.
class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAddress
        fields = [
            "id",
            "full_name",
            "mobile",
            "email",
            "country",
            "city",
            "address",
        ]


# Converts dispute message records into API JSON.
class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = DisputeMessage
        fields = ["id", "sender", "sender_email", "sender_name", "message", "is_internal", "created_at"]
        read_only_fields = ["sender", "sender_email", "sender_name", "is_internal", "created_at"]

    def get_sender_email(self, obj):
        return obj.sender.email if obj.sender else None

    def get_sender_name(self, obj):
        if obj.sender is None:
            return None
        profile = getattr(obj.sender, "profile", None)
        return getattr(profile, "full_name", None) or obj.sender.username


# Converts dispute audit log entries into API JSON.
class DisputeAuditLogSerializer(serializers.ModelSerializer):
    changed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = DisputeAuditLog
        fields = [
            "id", "changed_by", "changed_by_email",
            "action", "previous_status", "new_status",
            "comment", "timestamp",
        ]
        read_only_fields = fields

    def get_changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else "System"


# Converts dispute records into full API JSON for customers, vendors, and admin.
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
    messages = serializers.SerializerMethodField()
    audit_logs = serializers.SerializerMethodField()
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
            "messages",
            "audit_logs",
        ]
        read_only_fields = [
            "did", "status", "admin_response", "resolution",
            "resolved_by", "resolved_by_email", "resolved_at",
            "vendor_response", "vendor_responded_at",
            "date", "updated", "messages", "audit_logs",
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

    def get_messages(self, obj):
        # External viewers see only non-internal messages.
        request = self.context.get("request")
        qs = obj.messages.all()
        if request and not (request.user.is_staff or request.user.is_superuser):
            qs = qs.filter(is_internal=False)
        return DisputeMessageSerializer(qs, many=True).data

    def get_audit_logs(self, obj):
        # Audit logs are visible to admin only.
        request = self.context.get("request")
        if request and (request.user.is_staff or request.user.is_superuser):
            return DisputeAuditLogSerializer(obj.audit_logs.all(), many=True).data
        return []


# Converts a single paid booking into a vendor transaction record showing commission breakdown.
class VendorTransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    gross_amount = serializers.DecimalField(source="total", max_digits=8, decimal_places=2, read_only=True)
    net_amount = serializers.DecimalField(source="vendor_amount", max_digits=8, decimal_places=2, read_only=True)
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    service_title = serializers.SerializerMethodField()
    commission_percent = serializers.DecimalField(source="commission_rate", max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "bid",
            "customer_name",
            "service_title",
            "scheduled_date",
            "booking_status",
            "payment_status",
            "total",
            "gross_amount",
            "commission_percent",
            "commission_rate",
            "commission_amount",
            "vendor_amount",
            "net_amount",
            "date",
        ]
        read_only_fields = fields

    def get_service_title(self, obj):
        return obj.service.title if obj.service else "N/A"

    def get_customer_name(self, obj):
        if not obj.customer:
            return "Customer"
        profile = getattr(obj.customer, "profile", None)
        return getattr(profile, "full_name", None) or obj.customer.username


# Serializes vendor payout request records for vendor finance management.
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
