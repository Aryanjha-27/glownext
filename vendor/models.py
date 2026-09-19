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

# Links a vendor's payout record to a completed booking.
class Payout(models.Model):
        vendor=models.ForeignKey(vendor, on_delete=models.SET_NULL,null=True)
        item = models.ForeignKey("store.Booking", on_delete=models.SET_NULL,null=True,related_name="store_item")
        gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
        commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
        net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
        status = models.CharField(max_length=20, choices=(("Requested", "Requested"), ("Processed", "Processed"), ("Disputed", "Disputed"), ("Paid", "Paid")), default="Requested")
        date = models.DateTimeField(auto_now_add=True)

        def __str__(self):
                return str(self.vendor)

        class Meta:
                ordering =['-date']


class Dispute(models.Model):
        vendor = models.ForeignKey(vendor, on_delete=models.CASCADE, related_name="disputes")
        booking = models.ForeignKey("store.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="disputes")
        customer = models.ForeignKey("userauth.user", on_delete=models.SET_NULL, null=True, blank=True, related_name="disputes")
        reason = models.TextField()
        notes = models.TextField(blank=True)
        amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
        status = models.CharField(max_length=20, choices=(("Open", "Open"), ("In Review", "In Review"), ("Resolved", "Resolved"), ("Rejected", "Rejected")), default="Open")
        date = models.DateTimeField(auto_now_add=True)

        def __str__(self):
                return f"Dispute for {self.vendor}"

        class Meta:
                ordering = ["-date"]

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

