from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0006_remove_service_featured_and_discount_price"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ServiceAvailability",
        ),
    ]
