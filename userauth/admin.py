from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from userauth import models


class ProfileInline(admin.StackedInline):
    model = models.profile
    can_delete = False
    extra = 1

    fields = (
        "user_type",
        "full_name",
        "address",
        "mobile",
        "image",
    )


class CustomUserAdmin(UserAdmin):

    list_display = (
        
        "username",
        "email",
        "get_user_type",
        "is_active",
        "is_staff",
        "date_joined",
    )

    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
        "profile__user_type",
    )

    search_fields = (
        "email",
        "username",
        "profile__full_name",
        "profile__mobile",
    )

    ordering = (
        "-date_joined",
    )

    readonly_fields = (
        "date_joined",
        "last_login",
    )

    fieldsets = (
        ("Login Information", {
            "fields": (
                "email",
                "password",
            )
        }),

        ("Personal Information", {
            "fields": (
                "username",
                "first_name",
                "last_name",
            )
        }),

        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
            )
        }),

        ("Important Dates", {
            "fields": (
                "last_login",
                "date_joined",
            )
        }),
    )

    add_fieldsets = (
        ("Create User", {
            "classes": ("wide",),
            "fields": (
                "email",
                "username",
                "password1",
                "password2",
                "is_active",
                "is_staff",
            ),
        }),
    )

    inlines = [ProfileInline]

    def get_user_type(self, obj):
        try:
            return obj.profile.user_type or "Not Set"
        except models.profile.DoesNotExist:
            return "Not Set"

    get_user_type.short_description = "Role"


class ProfileAdmin(admin.ModelAdmin):

    list_display = (
        "full_name",
        "get_email",
        "address",
        "mobile",
        "user_type",
        
    )

    list_filter = (
        "user_type",
    )

    search_fields = (
        "full_name",
        "user__email",
        "user__username",
        "mobile",
    )

    def get_email(self, obj):
        return obj.user.email

    get_email.short_description = "Email"


admin.site.register(models.user, CustomUserAdmin)
admin.site.register(models.profile, ProfileAdmin)