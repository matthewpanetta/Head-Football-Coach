# Generated by Django 3.0.7 on 2020-11-08 04:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0186_auto_20201108_0431'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='WeekUpdates',
            new_name='WeekUpdate',
        ),
        migrations.RenameField(
            model_name='weekupdate',
            old_name='WeekUpdatesID',
            new_name='WeekUpdateID',
        ),
    ]
