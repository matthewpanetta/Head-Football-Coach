# Generated by Django 2.2.5 on 2019-12-15 22:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0031_auto_20191212_0303'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamgame',
            name='IsWinningTeam',
            field=models.BooleanField(default=False),
        ),
    ]
