# Generated by Django 2.2.5 on 2019-12-28 06:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0038_auto_20191227_0052'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='coach',
            name='OnsideKickTendency',
        ),
        migrations.AddField(
            model_name='coach',
            name='SituationalAggresivenessTendency',
            field=models.SmallIntegerField(default=0),
        ),
    ]
