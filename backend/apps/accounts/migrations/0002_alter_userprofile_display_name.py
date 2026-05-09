from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='display_name',
            field=models.CharField(max_length=100, blank=True, null=True),
        ),
    ]