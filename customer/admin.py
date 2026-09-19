from django.contrib import admin

from import_export.admin import ImportExportModelAdmin

from customer import models as customer_models


# Configures customer address import, display, and export behavior.
class AddressAdmin(ImportExportModelAdmin):
    list_display = ['full_name','email','country','city','address','mobile']


# Configures customer notification import, display, and export behavior.
class NotificationAdmin(ImportExportModelAdmin):
    list_display = ['user', 'type', 'seen', 'date']


# Register customer models in Django admin.
admin.site.register(customer_models.Address, AddressAdmin)
admin.site.register(customer_models.Notifications, NotificationAdmin)
