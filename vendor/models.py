from decimal import Decimal

from django.db import models
from shortuuid.django_fields import ShortUUIDField
from userauth.models import user
from django.utils.text import slugify
from django.utils import timezone

NOTIFICATION_TYPE =( #need to add more
    ("New Order","New Order"),
    ("New Review","New Review"),
)

PAYOUT_METHOD =(
    ("Khalti","Khalti"),
)

TYPE=(
    ("New Order","New Order"),
    ("Beautician Assigned","Beautician Assigned"),
    ("Service Completed","Service Completed"),
)

VENDOR_STATUS = (
    ("Pending", "Pending"),
    ("Verified", "Verified"),
    ("Rejected", "Rejected"),
)


# Stores a beauty business and its vendor verification state.
class vendor(models.Model):
        user =models.OneToOneField (user, on_delete=models.CASCADE, null=True,related_name="Vendor_name")
        image=models.ImageField(upload_to="images", default="shop-image.jpg", blank=True)
        store_name = models.CharField(max_length=100 , null=True, blank=True)
        description = models.CharField(max_length=200 , null=True, blank=True)
        email = models.CharField(max_length=100 , null=True, blank=True, default=None)
        country = models.CharField(max_length=100 , null=True, blank=True, default=None)
        city = models.CharField(max_length=100 , null=True, blank=True, default=None)
        document=models.ImageField(upload_to="images",default="default-document.jpg",blank=False)
        vendor_id = ShortUUIDField (unique=True,length=10,max_length=20 , null=True, blank=True, default=None ,alphabet ="1234567890")
        verification_status = models.CharField(max_length=20, choices=VENDOR_STATUS, default="Pending")
        is_verified = models.BooleanField(default=False)
        verified_at = models.DateTimeField(null=True, blank=True)
        date = models.DateField(default=timezone.now)
        slug=models.SlugField(blank=True, null=True)

        def __str__(self):
                return str(self.store_name)

        def save(self, *args, **kwargs):
                # Keep the slug, status, and verification timestamp consistent.
                if self.slug=="" or self.slug==None:
                        self.slug = slugify(self.store_name)
                if self.is_verified and self.verification_status != "Verified":
                        self.verification_status = "Verified"
                if self.is_verified and self.verified_at is None:
                        self.verified_at = timezone.now()
                elif not self.is_verified and self.verification_status == "Verified":
                        self.verification_status = "Pending"
                if not self.is_verified:
                        self.verified_at = None
                super(vendor, self).save(*args, **kwargs)


PAYOUT_STATUS = (
    ("Pending", "Pending"),
    ("Approved", "Approved"),
    ("Processing", "Processing"),
    ("Paid", "Paid"),
    ("Rejected", "Rejected"),
    ("Cancelled", "Cancelled"),
)


# Manages vendor financial payout requests and payment processing.
class Payout(models.Model):
    pid = models.CharField(max_length=30, unique=True, null=True, blank=True)
    vendor = models.ForeignKey(vendor, on_delete=models.CASCADE, related_name="payouts", null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS, default="Pending")
    payment_reference = models.CharField(max_length=200, null=True, blank=True)
    admin_note = models.TextField(null=True, blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        user, on_delete=models.SET_NULL, null=True, blank=True, related_name="processed_payouts"
    )

    # Legacy fields kept for backward compatibility with booking-linked payouts
    item = models.ForeignKey("store.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="store_item")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    date = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pid:
            import shortuuid
            self.pid = f"PO-{shortuuid.ShortUUID(alphabet='1234567890').random(length=10)}"
        if self.amount and not self.net_amount:
            self.net_amount = self.amount
        elif self.net_amount and not self.amount:
            self.amount = self.net_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payout {self.pid or self.id} — {self.vendor} [{self.status}]"

    class Meta:
        ordering = ["-requested_at", "-date"]


# Dispute reason choices used by customers when raising a complaint.
DISPUTE_REASON = (
    ("Service not provided", "Service not provided"),
    ("Service quality issue", "Service quality issue"),
    ("Vendor did not arrive", "Vendor did not arrive"),
    ("Incorrect service", "Incorrect service"),
    ("Payment issue", "Payment issue"),
    ("Booking issue", "Booking issue"),
    ("Refund request", "Refund request"),
    ("Other", "Other"),
)

# Dispute status progression managed by the admin team.
DISPUTE_STATUS = (
    ("Open", "Open"),
    ("Under Review", "Under Review"),
    ("Waiting for Customer", "Waiting for Customer"),
    ("Waiting for Vendor", "Waiting for Vendor"),
    ("Resolved", "Resolved"),
    ("Rejected", "Rejected"),
    ("Closed", "Closed"),
)


# Stores a customer's formal dispute raised against a booking.
class Dispute(models.Model):
    did = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    vendor = models.ForeignKey(vendor, on_delete=models.CASCADE, related_name="disputes")
    booking = models.ForeignKey(
        "store.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes",
    )
    customer = models.ForeignKey(
        "userauth.user",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes",
    )

    # Dispute reason and description from the customer.
    reason = models.CharField(max_length=50, choices=DISPUTE_REASON, default="Other")
    subject = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(blank=True, default="")

    # Optional evidence attachment uploaded by the customer.
    attachment = models.FileField(upload_to="disputes/attachments/", null=True, blank=True)

    # Financial context captured at the time of dispute creation.
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    # Status and resolution managed exclusively by the admin team.
    status = models.CharField(max_length=25, choices=DISPUTE_STATUS, default="Open")
    admin_response = models.TextField(null=True, blank=True)
    resolution = models.TextField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "userauth.user",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_disputes",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Vendor's response to the customer's complaint — set by the vendor.
    vendor_response = models.TextField(null=True, blank=True)
    vendor_responded_at = models.DateTimeField(null=True, blank=True)

    # Legacy notes field kept for backward compatibility with migration 0004.
    notes = models.TextField(blank=True)

    date = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.did:
            import shortuuid
            self.did = f"DIS-{shortuuid.ShortUUID(alphabet='1234567890').random(length=10)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Dispute {self.did} — {self.get_reason_display()} [{self.status}]"

    class Meta:
        ordering = ["-date"]
        verbose_name = "Customer Dispute"
        verbose_name_plural = "Customer Disputes"


# Stores threaded messages from customers, vendors, and admins on a dispute.
class DisputeMessage(models.Model):
    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        "userauth.user",
        on_delete=models.SET_NULL,
        null=True,
        related_name="dispute_messages",
    )
    message = models.TextField()
    # Internal messages are visible to admin only — hidden from customers and vendors.
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message on Dispute {self.dispute.did} by {self.sender}"

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Dispute Message"
        verbose_name_plural = "Dispute Messages"


# Stores an immutable audit record of every status change or action on a dispute.
class DisputeAuditLog(models.Model):
    dispute = models.ForeignKey(
        Dispute,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    changed_by = models.ForeignKey(
        "userauth.user",
        on_delete=models.SET_NULL,
        null=True,
        related_name="dispute_audit_logs",
    )
    action = models.CharField(max_length=150)
    previous_status = models.CharField(max_length=25, null=True, blank=True)
    new_status = models.CharField(max_length=25, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Audit: Dispute {self.dispute.did} — {self.action}"

    class Meta:
        ordering = ["timestamp"]
        verbose_name = "Dispute Audit Log"
        verbose_name_plural = "Dispute Audit Logs"


# Stores the bank or payment account used for vendor payouts.
class BankAccount(models.Model):
        vendor= models.OneToOneField(vendor, on_delete=models.SET_NULL,null=True)
        account_type=models.CharField(max_length=50, choices=PAYOUT_METHOD, null=True, blank=True)
        bank_name=models.CharField(max_length=500)
        account_number=models.CharField(max_length=100)
        account_name=models.CharField(max_length=100)
        khalti_id=models.CharField(max_length=100,null=True,blank=True)

        class Meta:
                verbose_name_plural = "Bank Account"

        def __str__(self):
                return self.bank_name


# Stores notifications sent to vendors.
class Notifications(models.Model):
        user=models.ForeignKey(user, on_delete=models.CASCADE, null=True, related_name="vendor_notifications")
        type= models.CharField(max_length=100, choices=TYPE,default=None)
        booking= models.ForeignKey("store.Booking", on_delete=models.CASCADE,null=True,blank=True, related_name="vendor_notifications")
        seen=models.BooleanField(default=False)
        date = models.DateField(auto_now_add=True)

        class Meta:
                verbose_name_plural ="Notification"

        def __str__(self):
                return self.type
