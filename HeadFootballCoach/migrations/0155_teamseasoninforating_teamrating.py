# Generated by Django 3.0.2 on 2020-05-23 21:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0154_auto_20200523_2037'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamseasoninforating',
            name='TeamRating',
            field=models.IntegerField(default=0),
        ),
    ]
