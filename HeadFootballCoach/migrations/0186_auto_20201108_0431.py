# Generated by Django 3.0.7 on 2020-11-08 04:31

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0185_weekmessage'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='WeekMessage',
            new_name='WeekUpdates',
        ),
        migrations.RenameField(
            model_name='weekupdates',
            old_name='WeekMessageID',
            new_name='WeekUpdatesID',
        ),
    ]
