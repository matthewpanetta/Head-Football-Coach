# Generated by Django 2.2.5 on 2019-12-28 06:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0039_auto_20191228_0649'),
    ]

    operations = [
        migrations.RenameField(
            model_name='coach',
            old_name='SituationalAggresivenessTendency',
            new_name='SituationalAggressivenessTendency',
        ),
        migrations.AddField(
            model_name='coach',
            name='PlayClockAggressivenessTendency',
            field=models.SmallIntegerField(default=0),
        ),
    ]
