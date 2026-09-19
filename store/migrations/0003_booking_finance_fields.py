from decimal import Decimal

from django.db import migrations, models


def backfill_booking_finance(apps, schema_editor):
    Booking = apps.get_model("store", "Booking")
    for booking in Booking.objects.all():
        total = Decimal(str(booking.total or 0))
        commission_rate = Decimal(str(getattr(booking, "commission_rate", 10) or 10))
        commission_amount = (total * commission_rate / Decimal("100")).quantize(Decimal("0.01"))
        vendor_amount = (total - commission_amount).quantize(Decimal("0.01"))
        Booking.objects.filter(pk=booking.pk).update(
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            vendor_amount=vendor_amount,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="commission_rate",
            field=models.DecimalField(decimal_places=2, default=10.00, max_digits=5),
        ),
        migrations.AddField(
            model_name="booking",
            name="commission_amount",
            field=models.DecimalField(decimal_places=2, default=0.00, max_digits=8),
        ),
        migrations.AddField(
            model_name="booking",
            name="vendor_amount",
            field=models.DecimalField(decimal_places=2, default=0.00, max_digits=8),
        ),
        migrations.RunPython(backfill_booking_finance, migrations.RunPython.noop),
    ]
