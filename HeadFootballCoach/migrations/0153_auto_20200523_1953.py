# Generated by Django 3.0.2 on 2020-05-23 19:53

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0152_auto_20200523_1949'),
    ]

    operations = [
        migrations.AlterField(
            model_name='state',
            name='RegionID',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.Region'),
        ),
    ]
