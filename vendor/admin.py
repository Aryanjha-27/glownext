from django.contrib import admin
from django.utils import timezone
from vendor import models as vendor_models


class DisputeAdmin(admin.ModelAdmin):
    list_display = (
        "vendor",
        "booking",
        "customer",
        "reason",
        "amount",
        "status",
        "date",
    )
    list_filter = ("status", "date")
    search_fields = ("vendor__store_name", "customer__email", "reason")
    ordering = ("-date",)
    list_per_page = 25


# Configures vendor review, search, filtering, and verification actions.
class VendorAdmin(admin.ModelAdmin):

    list_display = (
        "store_name",
        "email",
        "country",
        "city",
        "document",
        "verification_status",
        "is_verified",
        "vendor_id",
        "date",
    )

    search_fields = (
        "store_name",
        "user__username",
        "user__email",
        "vendor_id",
        "verification_status",
    )

    prepopulated_fields = {
        "slug": ("store_name",)
    }

    list_filter = (
        "country",
        "city",
        "verification_status",
        "is_verified",
        "date",
    )

    ordering = (
        "-date",
    )

    readonly_fields = (
        "vendor_id",
        "date",
        "document",
    )

    actions = (
        "verify_selected_vendors",
        "delete_selected",
    )

    def verify_selected_vendors(self, request, queryset):
        # Mark every selected vendor as verified and record the verification time.
        updated = 0
        for vendor in queryset:
            vendor.is_verified = True
            vendor.verification_status = "Verified"
            vendor.verified_at = timezone.now()
            vendor.save()
            updated += 1
        self.message_user(request, f"{updated} vendor(s) verified successfully.")

    verify_selected_vendors.short_description = "Verify selected vendors"

    def save_model(self, request, obj, form, change):
        # Normalize verification fields whenever staff save a vendor.
        if obj.is_verified:
            obj.verification_status = "Verified"
            if obj.verified_at is None:
                obj.verified_at = timezone.now()
        else:
            obj.verification_status = "Pending"
            obj.verified_at = None
        super().save_model(request, obj, form, change)


# Configures vendor payout records in Django admin.
class PayoutAdmin(admin.ModelAdmin):

    list_display = (
        "vendor",
        "item",
        "gross_amount",
        "commission_amount",
        "net_amount",
        "status",
        "date",
    )

    search_fields = (
        "vendor__store_name",
        "item__bid",
    )

    list_filter = (
        "vendor",
        "status",
        "date",
    )

    ordering = (
        "-date",
    )

    actions = (
        "delete_selected",
    )


# Configures vendor payout accounts in Django admin.
class BankAccountAdmin(admin.ModelAdmin):

    list_display = (
        "vendor",
        "account_type",
        "bank_name",
        "account_number",
        "account_name",
    )

    search_fields = (
        "vendor__store_name",
        "bank_name",
        "account_number",
        "account_name",
    )

    list_filter = (
        "account_type",
    )

    actions = (
        "delete_selected",
    )


# Configures vendor notifications in Django admin.
class NotificationsAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "type",
        "booking",
        "seen",
        "date",
    )

    list_filter = (
        "type",
        "seen",
        "date",
    )

    search_fields = (
        "user__username",
        "user__email",
    )

    ordering = (
        "-date",
    )

    actions = (
        "delete_selected",
    )


# Register vendor models so staff can manage them in Django admin.
admin.site.register(vendor_models.vendor, VendorAdmin)
admin.site.register(vendor_models.Payout, PayoutAdmin)
admin.site.register(vendor_models.Dispute, DisputeAdmin)
admin.site.register(vendor_models.BankAccount, BankAccountAdmin)
admin.site.register(vendor_models.Notifications, NotificationsAdmin)