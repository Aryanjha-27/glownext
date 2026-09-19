from django.db import models

from store.models import Service
from userauth.models import user

TYPE=(
    ("New Order","New Order"),
    ("Beautician Assigned","Beautician Assigned"),
    ("Service Completed","Service Completed"),
)

# Stores a customer's contact and delivery address.
class Address(models.Model):
    user =models.ForeignKey(user, on_delete=models.CASCADE, null=True)
    full_name = models.CharField(max_length=200 , null=True, blank=True, default=None)
    mobile = models.CharField(max_length=14 , null=True, blank=True, default=None)
    email = models.CharField(max_length=100 , null=True, blank=True, default=None)
    country = models.CharField(max_length=100 , null=True, blank=True, default=None)
    city = models.CharField(max_length=100 , null=True, blank=True, default=None)
    address = models.CharField(max_length=100 , null=True, blank=True, default=None)

    class Meta:
        verbose_name_plural = "Customer Info"

    def __str__(self):
        return self.full_name

# Stores notifications shown to customers.
class Notifications(models.Model):
        user =models.ForeignKey(user, on_delete=models.CASCADE,related_name="customer_norifications", null=True)
        type = models.CharField(max_length=100 , choices=TYPE, default=None)
        seen = models.BooleanField(default=False)
        date= models.DateField(auto_now_add=True)

        class Meta:
            verbose_name_plural = "Notifications"

        def __str__(self):
            return self.type

        