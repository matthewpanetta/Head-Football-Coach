# Generated by Django 3.0.2 on 2020-04-07 20:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0089_auto_20200406_2151'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamgame',
            name='BiggestLead',
            field=models.PositiveSmallIntegerField(blank=True, default=0, null=True),
        ),
    ]
