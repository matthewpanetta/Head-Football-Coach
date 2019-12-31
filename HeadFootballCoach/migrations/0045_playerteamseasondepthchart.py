# Generated by Django 2.2.5 on 2019-12-30 20:44

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0044_auto_20191229_1816'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlayerTeamSeasonDepthChart',
            fields=[
                ('PlayerTeamSeasonDepthChartID', models.AutoField(db_index=True, primary_key=True, serialize=False)),
                ('DepthPostion', models.PositiveSmallIntegerField(default=0)),
                ('IsStarter', models.BooleanField(default=False)),
                ('PlayerTeamSeasonID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.PlayerTeamSeason')),
                ('PositionID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.Position')),
                ('WorldID', models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.World')),
            ],
        ),
    ]
