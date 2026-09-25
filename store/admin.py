from django.contrib import admin
from store import models as store_models
from vendor import models as vendor_models

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




class CategoryAdmin(admin.ModelAdmin):
    pass






class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "vendor",
        "category",
        "price",
        "service_type",
        "status",
        "date",
    )

    list_filter = (
        "status",
        "service_type",
        "category",
    )

    search_fields = ("title", "category")

    prepopulated_fields = {
        "slug": ("title",)
    }

    readonly_fields = (
        "sid",
        "date",
        "updated",
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "vendor":
            kwargs["queryset"] = vendor_models.vendor.objects.filter(is_verified=True).order_by("store_name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class BookingAdmin(admin.ModelAdmin):

    list_display = (
        "bid",
        "customer",
        "service",
        "vendor",
        "service_type",
        "scheduled_date",
        "scheduled_time",
        "booking_status",
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

    def vendor(self, obj):
        if obj.service and obj.service.vendor:
            return obj.service.vendor.store_name

        return "N/A"

    vendor.short_description = "Vendor"
    vendor.admin_order_field = "service__vendor__store_name"


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


admin.site.register(store_models.Service, ServiceAdmin)
admin.site.register(store_models.Booking, BookingAdmin)
admin.site.register(store_models.ServiceReview, ServiceReviewAdmin)
