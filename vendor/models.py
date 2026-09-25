from decimal import Decimal

from django.db import models
from shortuuid.django_fields import ShortUUIDField
from userauth.models import user
from django.utils.text import slugify
from django.utils import timezone

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
                if self.slug=="" or self.slug==None:
                        self.slug = slugify(self.store_name)
                if self.is_verified and self.verification_status != "Verified":
                        self.verification_status = "Pending"
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

    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    date = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pid:
            import shortuuid
            self.pid = f"PO-{shortuuid.ShortUUID(alphabet='1234567890').random(length=10)}"
        if self.amount and not self.gross_amount:
            self.gross_amount = self.amount
        elif self.gross_amount and not self.amount:
            self.amount = self.gross_amount

        if self.amount and not self.net_amount:
            self.net_amount = self.amount
        elif self.net_amount and not self.amount:
            self.amount = self.net_amount

        if self.amount and not self.commission_amount:
            self.commission_amount = Decimal("0.00")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payout {self.pid or self.id} — {self.vendor} [{self.status}]"

    class Meta:
        ordering = ["-requested_at", "-date"]


DISPUTE_REASON = (
    ("Service not provided", "Service not provided"),
    ("Service quality issue", "Service quality issue"),
    ("Beautician did not arrive", "Beautician did not arrive"),
    ("Incorrect service", "Incorrect service"),
    ("Payment issue", "Payment issue"),
    ("Booking issue", "Booking issue"),
    ("Other", "Other"),
)

DISPUTE_STATUS = (
    ("Open", "Open"),
    ("Under Review", "Under Review"),
    ("Waiting for Customer", "Waiting for Customer"),
    ("Waiting for Vendor", "Waiting for Vendor"),
    ("Resolved", "Resolved"),
    ("Rejected", "Rejected"),
    ("Closed", "Closed"),
)


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

    reason = models.CharField(max_length=50, choices=DISPUTE_REASON, default="Other")
    subject = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(blank=True, default="")

    

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

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

    vendor_response = models.TextField(null=True, blank=True)
    vendor_responded_at = models.DateTimeField(null=True, blank=True)

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


