from django.contrib import admin
from django.utils import timezone
from vendor import models as vendor_models
from store.models import Notification


# Shows dispute messages as an inline inside the dispute admin form.
class DisputeMessageInline(admin.TabularInline):
    model = vendor_models.DisputeMessage
    extra = 1
    readonly_fields = ("sender", "created_at", "is_internal")
    fields = ("sender", "message", "is_internal", "created_at")
    ordering = ("created_at",)


# Shows the dispute audit history as a read-only inline.
class DisputeAuditLogInline(admin.TabularInline):
    model = vendor_models.DisputeAuditLog
    extra = 0
    readonly_fields = ("changed_by", "action", "previous_status", "new_status", "comment", "timestamp")
    fields = ("changed_by", "action", "previous_status", "new_status", "comment", "timestamp")
    ordering = ("timestamp",)
    can_delete = False

    def has_add_permission(self, request, obj=None):
        # Audit logs are written programmatically — prevent manual creation.
        return False


# Configures the full dispute management interface for admin staff.
class DisputeAdmin(admin.ModelAdmin):
    list_display = (
        "did",
        "customer",
        "vendor",
        "get_service",
        "reason",
        "status",
        "amount",
        "date",
        "updated",
        "resolved_by",
    )
    list_filter = ("status", "reason", "date", "vendor")
    search_fields = (
        "did",
        "vendor__store_name",
        "customer__email",
        "booking__bid",
    )
    ordering = ("-date",)
    list_per_page = 25

    readonly_fields = (
        "did",
        "date",
        "updated",
        "vendor_responded_at",
    )

    fieldsets = (
        ("Dispute Identification", {
            "fields": ("did", "status", "date", "updated"),
        }),
        ("Parties", {
            "fields": ("customer", "vendor", "booking"),
        }),
        ("Customer Complaint", {
            "fields": ("reason", "subject", "description", "attachment", "amount"),
        }),
        ("Vendor Response", {
            "fields": ("vendor_response", "vendor_responded_at"),
            "classes": ("collapse",),
        }),
        ("Admin Resolution", {
            "fields": ("admin_response", "resolution", "resolved_by", "resolved_at"),
        }),
        ("Legacy", {
            "fields": ("notes",),
            "classes": ("collapse",),
        }),
    )

    inlines = [DisputeMessageInline, DisputeAuditLogInline]

    actions = ("mark_under_review", "mark_resolved", "mark_rejected", "mark_closed")

    def get_service(self, obj):
        # Display the booked service title if available.
        if obj.booking and obj.booking.service:
            return obj.booking.service.title
        return "N/A"
    get_service.short_description = "Service"

    def _change_status(self, request, queryset, new_status, action_label):
        """Helper that bulk-changes status and writes audit logs."""
        updated = 0
        for dispute in queryset:
            if dispute.status != new_status:
                old_status = dispute.status
                dispute.status = new_status
                if new_status in ("Resolved", "Rejected", "Closed"):
                    dispute.resolved_by = request.user
                    dispute.resolved_at = timezone.now()
                dispute.save(update_fields=["status", "updated", "resolved_by", "resolved_at"])
                vendor_models.DisputeAuditLog.objects.create(
                    dispute=dispute,
                    changed_by=request.user,
                    action=f"Status changed via admin bulk action: {action_label}",
                    previous_status=old_status,
                    new_status=new_status,
                )
                updated += 1
        self.message_user(request, f"{updated} dispute(s) updated to '{new_status}'.")

    def mark_under_review(self, request, queryset):
        self._change_status(request, queryset, "Under Review", "Mark Under Review")
    mark_under_review.short_description = "Mark selected disputes as Under Review"

    def mark_resolved(self, request, queryset):
        self._change_status(request, queryset, "Resolved", "Mark Resolved")
    mark_resolved.short_description = "Mark selected disputes as Resolved"

    def mark_rejected(self, request, queryset):
        self._change_status(request, queryset, "Rejected", "Mark Rejected")
    mark_rejected.short_description = "Mark selected disputes as Rejected"

    def mark_closed(self, request, queryset):
        self._change_status(request, queryset, "Closed", "Mark Closed")
    mark_closed.short_description = "Mark selected disputes as Closed"

    def save_model(self, request, obj, form, change):
        """Write an audit log entry whenever an admin saves a dispute."""
        if change:
            try:
                old = vendor_models.Dispute.objects.get(pk=obj.pk)
                old_status = old.status
            except vendor_models.Dispute.DoesNotExist:
                old_status = None

            super().save_model(request, obj, form, change)

            if old_status and old_status != obj.status:
                vendor_models.DisputeAuditLog.objects.create(
                    dispute=obj,
                    changed_by=request.user,
                    action="Status changed",
                    previous_status=old_status,
                    new_status=obj.status,
                    comment=f"Changed by admin: {request.user.email}",
                )
                # Set resolved_by/resolved_at when admin resolves/rejects.
                if obj.status in ("Resolved", "Rejected", "Closed") and not obj.resolved_by:
                    obj.resolved_by = request.user
                    obj.resolved_at = timezone.now()
                    obj.save(update_fields=["resolved_by", "resolved_at"])
        else:
            super().save_model(request, obj, form, change)
            # Log creation.
            vendor_models.DisputeAuditLog.objects.create(
                dispute=obj,
                changed_by=request.user,
                action="Dispute created via admin",
                new_status=obj.status,
            )


# Configures the dispute messages list in admin.
class DisputeMessageAdmin(admin.ModelAdmin):
    list_display = ("dispute", "sender", "is_internal", "created_at")
    list_filter = ("is_internal", "created_at")
    search_fields = ("dispute__did", "sender__email", "message")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)


# Shows the immutable audit log records in admin.
class DisputeAuditLogAdmin(admin.ModelAdmin):
    list_display = ("dispute", "changed_by", "action", "previous_status", "new_status", "timestamp")
    list_filter = ("new_status", "timestamp")
    search_fields = ("dispute__did", "changed_by__email", "action")
    ordering = ("-timestamp",)
    readonly_fields = ("dispute", "changed_by", "action", "previous_status", "new_status", "comment", "timestamp")

    def has_add_permission(self, request):
        # Audit logs must only be created programmatically.
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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
        "reject_selected_vendors",
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

    def reject_selected_vendors(self, request, queryset):
        updated = 0
        for vendor in queryset:
            vendor.is_verified = False
            vendor.verification_status = "Rejected"
            vendor.verified_at = None
            vendor.save(update_fields=["is_verified", "verification_status", "verified_at"])
            if vendor.user:
                Notification.objects.create(
                    user=vendor.user,
                    type="General",
                    message="Your vendor verification was rejected. Please fill in the vendor profile form again, upload the corrected certificate, and submit it for review.",
                )
            updated += 1
        self.message_user(request, f"{updated} vendor(s) rejected successfully.")

    reject_selected_vendors.short_description = "Reject selected vendors"

    def save_model(self, request, obj, form, change):
        # Normalize verification fields whenever staff save a vendor.
        if obj.is_verified:
            obj.verification_status = "Verified"
            if obj.verified_at is None:
                obj.verified_at = timezone.now()
        elif obj.verification_status != "Rejected":
            obj.verification_status = "Pending"
        obj.verified_at = timezone.now() if obj.is_verified else None
        super().save_model(request, obj, form, change)


# Configures vendor payout records in Django admin.
class PayoutAdmin(admin.ModelAdmin):
    list_display = (
        "pid",
        "vendor",
        "amount",
        "status",
        "payment_reference",
        "admin_note",
        "requested_at",
        "processed_at",
        "processed_by",
    )
    list_filter = (
        "status",
        "requested_at",
        "vendor",
    )
    search_fields = (
        "pid",
        "vendor__store_name",
        "vendor__user__email",
        "payment_reference",
    )
    readonly_fields = (
        "pid",
        "requested_at",
        "processed_at",
        "processed_by",
    )
    ordering = ("-requested_at",)

    actions = (
        "mark_approved",
        "mark_processing",
        "mark_paid",
        "mark_rejected",
    )

    def mark_approved(self, request, queryset):
        updated = 0
        for payout in queryset:
            if payout.status in {"Pending", "Processing"}:
                payout.status = "Approved"
                payout.save(update_fields=["status"])
                updated += 1
        self.message_user(request, f"{updated} payout(s) marked as Approved.")
    mark_approved.short_description = "Approve selected payouts"

    def mark_processing(self, request, queryset):
        updated = 0
        for payout in queryset:
            if payout.status in {"Pending", "Approved"}:
                payout.status = "Processing"
                payout.save(update_fields=["status"])
                updated += 1
        self.message_user(request, f"{updated} payout(s) marked as Processing.")
    mark_processing.short_description = "Mark selected payouts as Processing"

    def mark_paid(self, request, queryset):
        now = timezone.now()
        updated = 0
        for payout in queryset:
            payout.status = "Paid"
            payout.processed_at = now
            payout.processed_by = request.user
            payout.save(update_fields=["status", "processed_at", "processed_by"])
            if payout.vendor and payout.vendor.user:
                Notification.objects.create(
                    user=payout.vendor.user,
                    type="Payment",
                    message=f"Your payout {payout.pid} of Rs. {payout.amount} has been paid.",
                )
            updated += 1
        self.message_user(request, f"{updated} payout(s) marked as Paid.")
    mark_paid.short_description = "Mark selected payouts as Paid"

    def mark_rejected(self, request, queryset):
        updated = 0
        for payout in queryset:
            if payout.status not in {"Paid", "Rejected", "Cancelled"}:
                payout.status = "Rejected"
                payout.processed_by = request.user
                payout.processed_at = timezone.now()
                payout.save(update_fields=["status", "processed_by", "processed_at"])
                if payout.vendor and payout.vendor.user:
                    Notification.objects.create(
                        user=payout.vendor.user,
                        type="General",
                        message=f"Your payout {payout.pid} was rejected. Check the admin note for details.",
                    )
                updated += 1
        self.message_user(request, f"{updated} payout(s) marked as Rejected.")
    mark_rejected.short_description = "Reject selected payouts"

    def save_model(self, request, obj, form, change):
        if obj.status == "Paid" and not obj.processed_by:
            obj.processed_by = request.user
            obj.processed_at = timezone.now()
        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        return False


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
admin.site.register(vendor_models.DisputeMessage, DisputeMessageAdmin)
admin.site.register(vendor_models.DisputeAuditLog, DisputeAuditLogAdmin)
admin.site.register(vendor_models.Notifications, NotificationsAdmin)