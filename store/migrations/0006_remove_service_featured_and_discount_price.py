from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0005_service_duration_minutes"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="service",
            name="discount_price",
        ),
        migrations.RemoveField(
            model_name="service",
            name="featured",
        ),
    ]
