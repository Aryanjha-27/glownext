from django.db.models import Count, Q, Sum

def get_jazzmin_dashboard_context():
    """Return the simple analytics shown on the admin homepage."""
    from vendor.models import vendor as VendorModel
    from userauth.models import user as UserModel

    total_customers = UserModel.objects.filter(profile__user_type="Customer").count()
    total_vendors = VendorModel.objects.count()

    top_vendors = list(
        VendorModel.objects.annotate(
            paid_earnings=Sum(
                "services__bookings__vendor_amount",
                filter=Q(services__bookings__payment_status="Paid"),
            ),
            paid_orders=Count(
                "services__bookings",
                filter=Q(services__bookings__payment_status="Paid"),
                distinct=True,
            ),
        )
        .order_by("-paid_earnings", "store_name")[:5]
        .values("store_name", "paid_earnings", "paid_orders")
    )

    return {
        "analytics": {
            "total_customers": total_customers,
            "total_vendors": total_vendors,
            "top_vendors": top_vendors,
        }
    }
