from rest_framework import serializers
from ..models import Team, TeamSeason


class TeamSerializer(serializers.Serializer):
    TeamID = serializers.IntegerField(read_only=True)
    TeamName = serializers.CharField(required=True, allow_blank=True, max_length=100)
    TeamNickname = serializers.CharField(required=True, allow_blank=True, max_length=100)
    LogoURL = serializers.CharField(required=True, allow_blank=True, max_length=100)

class TeamSeasonSerializer(serializers.Serializer):
    TeamSeasonID = serializers.IntegerField(read_only=True)
    LeagueSeasonID = serializers.IntegerField(read_only=True)
    Wins = serializers.IntegerField(read_only=True)
    Losses = serializers.IntegerField(read_only=True)
    ConferenceWins = serializers.IntegerField(read_only=True)
    ConferenceLosses = serializers.IntegerField(read_only=True)
    TournamentSeed = serializers.IntegerField(read_only=True)
    RecruitingClassRank = serializers.IntegerField(read_only=True)
