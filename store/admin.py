from django.contrib import admin
from store import models as store_models
from vendor import models as vendor_models

# Connect live database platform analytics directly to Jazzmin Admin homepage index
_original_admin_index = admin.site.index

def jazzmin_analytics_index(request, extra_context=None):
    if extra_context is None:
        extra_context = {}
    try:
        from glownext.admin_analytics import get_jazzmin_dashboard_context
        analytics = get_jazzmin_dashboard_context()["analytics"]
        extra_context.update({
            "analytics": analytics,
        })
    except Exception:
        pass
    return _original_admin_index(request, extra_context=extra_context)

admin.site.index = jazzmin_analytics_index




# Shows service gallery records inside the service admin form.
class ServiceGalleryInline(admin.TabularInline):
    model = store_models.ServiceGallery
    extra = 1


# Shows service availability records inside the service admin form.
class ServiceAvailabilityInline(admin.TabularInline):
    model = store_models.ServiceAvailability
    extra = 1




# Configures category fields, search, and automatic slug generation.
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("title", "slug")
    search_fields = ("title",)
    prepopulated_fields = {
        "slug": ("title",)
    }




# Configures the tag list and search behavior in admin.
class TagAdmin(admin.ModelAdmin):
    list_display = ("title",)
    search_fields = ("title",)




# Configures service editing, filtering, related inlines, and vendor choices.
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "vendor",
        "category",
        "price",
        "discount_price",
        "service_type",
        "status",
        "featured",
        "date",
    )

    list_filter = (
        "status",
        "featured",
        "service_type",
        "category",
    )

    search_fields = (
        "title",
        "category__title",
    )

    prepopulated_fields = {
        "slug": ("title",)
    }

    filter_horizontal = (
        "tags",
    )

    readonly_fields = (
        "sid",
        "date",
        "updated",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # Only verified vendors can be selected for new services.
        if db_field.name == "vendor":
            kwargs["queryset"] = vendor_models.vendor.objects.filter(is_verified=True).order_by("store_name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    inlines = [
        ServiceGalleryInline,
        ServiceAvailabilityInline,
    ]




# Configures the service gallery list in admin.
class ServiceGalleryAdmin(admin.ModelAdmin):
    list_display = (
        "service",
        "caption",
        "date",
    )

    search_fields = (
        "service__title",
    )




# Configures service availability filtering and search in admin.
class ServiceAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        "service",
        "day",
        "start_time",
        "end_time",
        "is_active",
    )

    list_filter = (
        "day",
        "is_active",
    )

    search_fields = (
        "service__title",
    )




# Configures booking columns, filters, search, and date navigation.
class BookingAdmin(admin.ModelAdmin):

    list_display = (
        "bid",
        "customer",
        "service",
        "get_vendor",
        "service_type",
        "scheduled_date",
        "scheduled_time",
        "booking_status",
        "payment_status",
        "total",
        "commission_amount",
        "vendor_amount",
    )

    list_filter = (
        "booking_status",
        "payment_status",
        "payment_method",
        "service_type",
        "scheduled_date",
    )

    ordering = ("-scheduled_date", "-scheduled_time")

    search_fields = (
        "bid",
        "customer__email",
        "customer__username",
        "service__title",
        "service__vendor__store_name",
        "khalti_pidx",
        "khalti_txn_id",
    )

    readonly_fields = (
        "bid",
        "date",
        "updated",
    )

    date_hierarchy = "scheduled_date"

    list_per_page = 25

    
    def get_vendor(self, obj):
        # Display the related vendor name while handling missing relations.
        if obj.service and obj.service.vendor:
            return obj.service.vendor.store_name

        return "N/A"



# Configures moderation fields for service reviews.
class ServiceReviewAdmin(admin.ModelAdmin):
    list_display = (
        "service",
        "user",
        "rating",
        "is_verified",
        "active",
        "date",
    )

    list_filter = (
        "rating",
        "active",
        "is_verified",
    )


# Configures notification columns and filters in admin.
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "type",
        "seen",
        "date",
    )

    list_filter = (
        "type",
        "seen",
    )




# Register store models so staff can manage marketplace data in Django admin.
admin.site.register(store_models.Category, CategoryAdmin)
admin.site.register(store_models.Tag, TagAdmin)
admin.site.register(store_models.Service, ServiceAdmin)
admin.site.register(store_models.ServiceGallery, ServiceGalleryAdmin)
admin.site.register(store_models.ServiceAvailability, ServiceAvailabilityAdmin)
admin.site.register(store_models.Booking, BookingAdmin)
admin.site.register(store_models.ServiceReview, ServiceReviewAdmin)
admin.site.register(store_models.Notification, NotificationAdmin)