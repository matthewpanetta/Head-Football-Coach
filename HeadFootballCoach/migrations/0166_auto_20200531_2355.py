# Generated by Django 3.0.2 on 2020-05-31 23:55

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0165_auto_20200531_2212'),
    ]

    operations = [
        migrations.RenameField(
            model_name='teamseason',
            old_name='ConferenceRank',
            new_name='DivisionRank',
        ),
    ]
