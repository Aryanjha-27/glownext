from decimal import Decimal

from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.conf import settings
from shortuuid.django_fields import ShortUUIDField
from django.utils import timezone
from django.utils.text import slugify
from django_ckeditor_5.fields import CKEditor5Field

from userauth import models as user_models
from vendor import models as vendor_models

import shortuuid


STATUS = (
    ("Published", "Published"),
    ("Draft", "Draft"),
    ("Disabled", "Disabled"),
)

PAYMENT_STATUS = (
    ("Paid", "Paid"),
    ("Processing", "Processing"),
    ("Failed", "Failed"),
)

PAYMENT_METHOD = (
    ("Khalti", "Khalti"),
    ("COD", "COD"),
)

ORDER_STATUS = (
    ("Pending", "Pending"),
    ("Confirmed", "Confirmed"),
    ("Completed", "Completed"),
    ("Cancelled", "Cancelled"),
    ("Declined", "Declined"),
)

RATING = (
    (1, "★☆☆☆☆"),
    (2, "★★☆☆☆"),
    (3, "★★★☆☆"),
    (4, "★★★★☆"),
    (5, "★★★★★"),
)

SERVICE_TYPE = (
    ("Home",  "Home Visit"),
    ("Store", "Store Visit"),
    ("Both",  "Home & Store"),
)

DAY_CHOICES = (
    ("Sunday",    "Sunday"),
    ("Monday",    "Monday"),
    ("Tuesday",   "Tuesday"),
    ("Wednesday", "Wednesday"),
    ("Thursday",  "Thursday"),
    ("Friday",    "Friday"),
    ("Saturday",  "Saturday"),
)


# Stores the categories used to group beauty services.
class Category(models.Model):
    title = models.CharField(max_length=255)
    image = models.FileField(upload_to="category", null=True, blank=True)
    slug  = models.SlugField(unique=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['title']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


# Stores reusable labels that can be attached to services.
class Tag(models.Model):
    title = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.title


# Stores a vendor's beauty service and its publication settings.
class Service(models.Model):

    sid = ShortUUIDField(
        unique=True,
        length=10,
        max_length=20,
        alphabet="1234567890",
    )

    
    vendor = models.ForeignKey(
        vendor_models.vendor,
        on_delete=models.CASCADE,
        related_name="services",
    )

    
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services",
    )

  
    tags = models.ManyToManyField(Tag, blank=True)

    
    title       = models.CharField(max_length=255)
    
    description = CKEditor5Field(config_name="extends", null=True, blank=True)
    slug        = models.SlugField(unique=True)


    price          = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)

    duration_minutes = models.PositiveIntegerField(default=60, validators=[MinValueValidator(1)])
    
    discount_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)


    service_type = models.CharField(
        max_length=10,
        choices=SERVICE_TYPE,
        default="Store",
    )

    thumbnail = models.FileField(upload_to="service/thumbnail", null=True, blank=True)


    status   = models.CharField(max_length=20, choices=STATUS, default="Published")
    featured = models.BooleanField(default=False)  # show on homepage?


    date    = models.DateTimeField(default=timezone.now)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def clean(self):
        if self._state.adding and self.vendor_id and not self.vendor.is_verified and self.status != "Draft":
            raise ValidationError("Your vendor account is not verified. Services can be listed after your account is verified.")

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Services"

    def save(self, *args, **kwargs):
        # Enforce verification for public listings while allowing vendor drafts.
        if self._state.adding and self.vendor_id:
            vendor = self.vendor if hasattr(self, "vendor") else vendor_models.vendor.objects.get(pk=self.vendor_id)
            if not vendor.is_verified and self.status != "Draft":
                raise ValidationError("Your vendor account is not verified. Services can be listed after your account is verified.")
        if not self.slug:
            self.slug = slugify(self.title) + "-" + shortuuid.uuid()[:4]
        super().save(*args, **kwargs)

    @property
    def effective_price(self):
        """
        Returns discount_price if set, otherwise returns regular price.
        Use this in your templates: {{ service.effective_price }}
        """
        if self.discount_price and self.discount_price < self.price:
            return self.discount_price
        return self.price

    @property
    def has_discount(self):
        """Returns True if this service currently has a discount."""
        return bool(self.discount_price and self.discount_price < self.price)



    @property
    def average_rating(self):
        """
        Calculates the average star rating from all active verified reviews.
        Returns 0 if no reviews exist yet.
        """
        reviews = self.reviews.filter(active=True)
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return 0

    @property
    def review_count(self):
        """Total number of visible reviews for this service."""
        return self.reviews.filter(active=True).count()

    @property
    def offers_home(self):
        """True if vendor can travel to customer's home for this service."""
        return self.service_type in ("Home", "Both")

    @property
    def offers_store(self):
        """True if customer can visit vendor's store for this service."""
        return self.service_type in ("Store", "Both")


# Stores additional images belonging to a service.
class ServiceGallery(models.Model):

    gid = ShortUUIDField(
        unique=True,
        length=10,
        max_length=20,
        alphabet="1234567890",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="gallery",
    )
    image   = models.FileField(upload_to="service/gallery")
    caption = models.CharField(max_length=200, null=True, blank=True)
    date    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery — {self.service.title}"

    class Meta:
        verbose_name_plural = "Service Gallery"
        ordering = ["date"]


# Stores the days and hours when a service can be booked.
class ServiceAvailability(models.Model):

    service    = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="availability",
    )
    day        = models.CharField(max_length=15, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time   = models.TimeField()

    is_active  = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.service.title} — {self.day} {self.start_time}–{self.end_time}"

    class Meta:
        verbose_name_plural = "Service Availability"

        unique_together = ["service", "day", "start_time"]
        ordering = ["day", "start_time"]


# Stores customer booking, schedule, status, and payment information.
class Booking(models.Model):

    bid = ShortUUIDField(
        unique=True,
        length=10,
        max_length=20,
        alphabet="1234567890",
    )

    customer = models.ForeignKey(
        user_models.user,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bookings",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bookings",
    )

    service_type   = models.CharField(
        max_length=10,
        choices=(("Home", "Home Visit"), ("Store", "Store Visit")),
        default="Store",
    )
 
    address        = models.TextField(null=True, blank=True)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    note           = models.TextField(null=True, blank=True)

    
    booking_status = models.CharField(max_length=20, choices=ORDER_STATUS, default="Pending")
    decline_reason = models.TextField(null=True, blank=True)

    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD, default="Khalti")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="Processing")
    total          = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    commission_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    vendor_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)

  
    khalti_pidx  = models.CharField(max_length=200, null=True, blank=True)
    khalti_txn_id= models.CharField(max_length=200, null=True, blank=True)


    date    = models.DateTimeField(default=timezone.now)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Booking {self.bid} — {self.service.title if self.service else 'N/A'}"

    def save(self, *args, **kwargs):
        if self.total is not None:
            commission_rate = Decimal(str(getattr(settings, "PLATFORM_COMMISSION_PERCENT", 10)))
            self.commission_rate = commission_rate
            commission_value = (Decimal(str(self.total)) * commission_rate / Decimal("100")).quantize(Decimal("0.01"))
            self.commission_amount = commission_value
            self.vendor_amount = (Decimal(str(self.total)) - commission_value).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Bookings"


# Stores a customer's rating and review for a service.
class ServiceReview(models.Model):

    rid = ShortUUIDField(
        unique=True,
        length=10,
        max_length=20,
        alphabet="1234567890",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    
    booking = models.OneToOneField(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review",
    )
    user = models.ForeignKey(
        user_models.user,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reviews",
    )
    rating      = models.IntegerField(choices=RATING, default=None ,null=True,blank=True)
    review      = models.TextField(null=True, blank=True)
    
    is_verified = models.BooleanField(default=False)
    
    active      = models.BooleanField(default=True)
    date        = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating}★ — {self.service.title}"

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Service Reviews"


# Stores booking, payment, and general messages for users.
class Notification(models.Model):

    NOTIFICATION_TYPE = (
        ("Booking",  "Booking"),
        ("Payment",  "Payment"),
        ("Review",   "Review"),
        ("General",  "General"),
    )

    nid = ShortUUIDField(
        unique=True,
        length=10,
        max_length=20,
        alphabet="1234567890",
    )
    user = models.ForeignKey(
        user_models.user,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    type    = models.CharField(max_length=20, choices=NOTIFICATION_TYPE, default="General")
    message = models.TextField()

    seen    = models.BooleanField(default=False)
    date    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} — {self.user} — {'Seen' if self.seen else 'Unseen'}"

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Notifications"