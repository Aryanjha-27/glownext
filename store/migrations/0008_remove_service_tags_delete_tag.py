from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0007_delete_serviceavailability"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="service",
            name="tags",
        ),
        migrations.DeleteModel(
            name="Tag",
        ),
    ]
