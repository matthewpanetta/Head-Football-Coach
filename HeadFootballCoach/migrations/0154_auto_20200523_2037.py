# Generated by Django 3.0.2 on 2020-05-23 20:37

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('HeadFootballCoach', '0153_auto_20200523_1953'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamInfoTopic',
            fields=[
                ('TeamInfoTopicID', models.AutoField(primary_key=True, serialize=False)),
                ('AttributeName', models.CharField(default='Attr', max_length=50)),
                ('RecruitMatchIsComputed', models.BooleanField(default=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='playerrecruitinginterest',
            name='PitchName',
        ),
        migrations.RemoveField(
            model_name='recruitteamseasoninterest',
            name='DefaultInclude',
        ),
        migrations.RemoveField(
            model_name='recruitteamseasoninterest',
            name='PitchName',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='AcademicPrestigeRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='CampusLifestyleRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='ChampionshipContenderRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='CoachStabilityRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='FacilitiesRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='LocationRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='ProPotentialRating',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='TeamPrestige',
        ),
        migrations.RemoveField(
            model_name='teamseason',
            name='TelevisionExposureRating',
        ),
        migrations.CreateModel(
            name='TeamSeasonInfoRating',
            fields=[
                ('TeamSeasonInfoRatingID', models.AutoField(db_index=True, primary_key=True, serialize=False)),
                ('TeamInfoTopicID', models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.TeamInfoTopic')),
                ('TeamSeasonID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.TeamSeason')),
                ('WorldID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.World')),
            ],
        ),
        migrations.AddField(
            model_name='playerrecruitinginterest',
            name='TeamInfoTopicID',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.TeamInfoTopic'),
        ),
        migrations.AddField(
            model_name='recruitteamseasoninterest',
            name='TeamInfoTopicID',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, to='HeadFootballCoach.TeamInfoTopic'),
        ),
    ]
