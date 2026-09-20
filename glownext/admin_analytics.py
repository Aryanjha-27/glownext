from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.utils import timezone

def get_jazzmin_dashboard_context():
    """
    Computes real database analytics for display inside the Jazzmin Django Admin dashboard.
    Calculates live counts for customers, vendors, services, bookings, financial revenue,
    10% platform commission, vendor earnings, payouts, and open disputes.
    """
    today = timezone.localdate()
    thirty_days_ago = today - timedelta(days=30)
    seven_days_ago = today - timedelta(days=7)

    # Deferred imports to avoid circular imports during app initialization
    from store.models import Booking, Service
    from vendor.models import vendor as VendorModel, Dispute, Payout
    from userauth.models import user as UserModel

    all_bookings = Booking.objects.all()
    paid_bookings = all_bookings.filter(payment_status="Paid")

    total_customers = UserModel.objects.filter(profile__user_type="Customer").count()
    total_vendors = VendorModel.objects.count()
    verified_vendors = VendorModel.objects.filter(is_verified=True).count()
    total_services = Service.objects.count()

    total_bookings = all_bookings.count()
    pending_bookings = all_bookings.filter(booking_status="Pending").count()
    confirmed_bookings = all_bookings.filter(booking_status="Confirmed").count()
    completed_bookings = all_bookings.filter(booking_status="Completed").count()
    cancelled_bookings = all_bookings.filter(booking_status="Cancelled").count()
    declined_bookings = all_bookings.filter(booking_status="Declined").count()

    bookings_today = all_bookings.filter(date__date=today).count()
    bookings_this_week = all_bookings.filter(date__date__gte=seven_days_ago).count()
    bookings_this_month = all_bookings.filter(date__date__gte=thirty_days_ago).count()

    trend_start = today - timedelta(days=29)
    trend_counts = {
        row["scheduled_date"]: row["count"]
        for row in all_bookings.filter(scheduled_date__gte=trend_start, scheduled_date__lte=today)
        .values("scheduled_date")
        .annotate(count=Count("id"))
    }
    revenue_counts = {
        row["scheduled_date"]: row["total"] or Decimal("0.00")
        for row in paid_bookings.filter(scheduled_date__gte=trend_start, scheduled_date__lte=today)
        .values("scheduled_date")
        .annotate(total=Sum("total"))
    }
    trend_max = max(trend_counts.values(), default=1)
    revenue_max = max(revenue_counts.values(), default=Decimal("1.00"))
    booking_trend = [
        {
            "date": trend_start + timedelta(days=index),
            "count": trend_counts.get(trend_start + timedelta(days=index), 0),
            "percent": round((trend_counts.get(trend_start + timedelta(days=index), 0) / trend_max) * 100),
        }
        for index in range(30)
    ]
    revenue_trend = [
        {
            "date": trend_start + timedelta(days=index),
            "amount": revenue_counts.get(trend_start + timedelta(days=index), Decimal("0.00")),
            "percent": round((revenue_counts.get(trend_start + timedelta(days=index), Decimal("0.00")) / revenue_max) * 100),
        }
        for index in range(30)
    ]
    orders_chart_labels = [point["date"].strftime("%m/%d") for point in booking_trend]
    orders_chart_values = [point["count"] for point in booking_trend]
    revenue_chart_values = [float(point["amount"]) for point in revenue_trend]
    payment_method_totals = {
        row["payment_method"] or "Unknown": float(row["total"] or 0)
        for row in paid_bookings.values("payment_method").annotate(total=Sum("total"))
    }
    payment_method_labels = ["Khalti", "Cash"]
    payment_method_values = [
        payment_method_totals.get("Khalti", 0),
        payment_method_totals.get("COD", 0),
    ]

    revenue_stats = paid_bookings.aggregate(
        gross=Sum("total"),
        commission=Sum("commission_amount"),
        vendor_amount=Sum("vendor_amount"),
    )

    total_customer_payments = revenue_stats["gross"] or Decimal("0.00")
    platform_commission = revenue_stats["commission"] or Decimal("0.00")
    vendor_earnings = revenue_stats["vendor_amount"] or Decimal("0.00")

    payouts = Payout.objects.all()
    pending_payouts_sum = payouts.filter(
        status__in=["Pending", "Approved", "Processing"]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    
    completed_payouts_sum = payouts.filter(
        status="Paid"
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    disputes = Dispute.objects.all()
    open_disputes = disputes.filter(status__in=["Open", "Under Review", "Waiting for Customer", "Waiting for Vendor"]).count()
    under_review_disputes = disputes.filter(status="Under Review").count()
    resolved_disputes = disputes.filter(status="Resolved").count()

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

    recent_payout_requests = payouts.select_related("vendor").order_by("-requested_at")[:5]
    recent_disputes_list = disputes.select_related("customer", "vendor", "booking").order_by("-date")[:5]

    return {
        "analytics": {
            "total_customers": total_customers,
            "total_vendors": total_vendors,
            "verified_vendors": verified_vendors,
            "total_services": total_services,
            "total_bookings": total_bookings,
            "pending_bookings": pending_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "declined_bookings": declined_bookings,
            "bookings_today": bookings_today,
            "bookings_this_week": bookings_this_week,
            "bookings_this_month": bookings_this_month,
            "orders_chart_labels": orders_chart_labels,
            "orders_chart_values": orders_chart_values,
            "revenue_chart_values": revenue_chart_values,
            "payment_method_labels": payment_method_labels,
            "payment_method_values": payment_method_values,
            "top_vendors": top_vendors,
            "total_customer_payments": total_customer_payments,
            "platform_commission": platform_commission,
            "vendor_earnings": vendor_earnings,
            "pending_payouts": pending_payouts_sum,
            "completed_payouts": completed_payouts_sum,
            "open_disputes": open_disputes,
            "under_review_disputes": under_review_disputes,
            "resolved_disputes": resolved_disputes,
            "recent_payout_requests": recent_payout_requests,
            "recent_disputes_list": recent_disputes_list,
        }
    }
