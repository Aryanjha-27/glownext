from datetime import datetime

from django.db.models import Avg
from django.utils import timezone
from rest_framework import serializers

from store.models import (
    Category,
    Tag,
    Service,
    ServiceGallery,
    ServiceAvailability,
    Booking,
    ServiceReview,
    Notification,
)
from userauth.models import user as UserModel, profile as ProfileModel
from vendor.models import vendor as VendorModel
from customer.models import Address as CustomerAddress, Notifications as CustomerNotification


# Converts category model records into API JSON.
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "title", "slug", "image"]


# Converts service tag records into API JSON.
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "title"]


# Converts gallery image records into API JSON.
class ServiceGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceGallery
        fields = ["id", "image", "caption", "date"]


# Converts service opening-hour records into API JSON.
class ServiceAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceAvailability
        fields = ["id", "day", "start_time", "end_time", "is_active"]


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
        fields = ["id", "email", "username", "profile"]


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
            .prefetch_related("tags", "gallery", "availability")
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
    tags = TagSerializer(many=True, read_only=True)
    gallery = ServiceGallerySerializer(many=True, read_only=True)
    availability = ServiceAvailabilitySerializer(many=True, read_only=True)
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
            "discount_price",
            "effective_price",
            "service_type",
            "thumbnail",
            "status",
            "featured",
            "date",
            "updated",
            "vendor",
            "vendor_name",
            "category",
            "category_name",
            "tags",
            "gallery",
            "availability",
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