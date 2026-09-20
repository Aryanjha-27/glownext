from django.db import migrations, models
from django.core.validators import MinValueValidator


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0004_delete_wishlist"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="duration_minutes",
            field=models.PositiveIntegerField(default=60, validators=[MinValueValidator(1)]),
        ),
    ]