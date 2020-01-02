from django.contrib import admin

from .models import Audit, Position, Class, Bowl, Week,Phase, PositionGroup,TeamSeasonWeekRank, System_PlayerArchetypeRatingModifier,PlayerTeamSeasonAward,TeamRivalry, TeamGame, GameStructure, PlayoffRegion, PlayoffRound, System_PlayoffRound, System_PlayoffGame,TeamSeasonDateRank, User,World,Region, Nation, State, City, NameList,League, Headline,Playoff, TeamSeason, RecruitTeamSeason, Coach, CoachTeamSeason, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill,Driver, PlayerGameStat, PlayerTeamSeasonDepthChart
# Register your models here.
from import_export.admin import ImportExportModelAdmin
from import_export import resources
from django.utils.html import format_html
from django.urls import reverse


class BowlAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Bowl._meta.get_fields() if field.name not in ('game', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class RegionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Region._meta.get_fields() if field.name not in ('playoff', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class NationAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Nation._meta.get_fields() if field.name not in ('playoff', 'state','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class StateAdmin(admin.ModelAdmin):
    list_display = [field.name for field in State._meta.get_fields() if field.name not in ('playoff', 'city', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class CityAdmin(admin.ModelAdmin):
    list_display = [field.name for field in City._meta.get_fields() if field.name not in ('playoff','player', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['StateID']
class NameListAdmin(admin.ModelAdmin):
    list_display = [field.name for field in NameList._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class CalendarAdmin(admin.ModelAdmin):
    list_display = ('WorldID', 'Date', 'IsCurrent')

class HeadlineAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Headline._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class LeagueAdmin(admin.ModelAdmin):
    list_display = [field.name for field in League._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')

class GameStructureAdmin(admin.ModelAdmin):
    list_display = [field.name for field in GameStructure._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'league', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')

class PlayerAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Player._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')
    list_filter = ['PositionID', 'ClassID']

class CoachAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Coach._meta.get_fields() if field.name not in ['coachteamseason']]

class CoachTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CoachTeamSeason._meta.get_fields() if field.name not in ('position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')] + ['SituationalAggressivenessTendency','PlayClockAggressivenessTendency','PlaycallPassTendency']
    list_filter = ['Position', 'TeamSeasonID__TeamID__TeamName']

    def SituationalAggressivenessTendency(self, obj):
        return obj.CoachID.SituationalAggressivenessTendency
    def PlayClockAggressivenessTendency(self, obj):
        return obj.CoachID.PlayClockAggressivenessTendency
    def PlaycallPassTendency(self, obj):
        return obj.CoachID.PlaycallPassTendency

class PlayerSkillAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerSeasonSkill._meta.get_fields()]
    list_filter = ['PlayerID__PositionID', 'PlayerID__ClassID']

class RecruitTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RecruitTeamSeason._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class TeamSeasonAdmin(admin.ModelAdmin):
    list_display = ['TeamSeasonID', 'WorldID','TeamID', 'LeagueSeasonID','TeamOverallRating', 'GamesPlayed','Wins','Losses', 'ConferenceWins',  'ConferenceLosses','ConferenceRank', 'ConferenceGB' , 'WinStreak', 'ScholarshipsToOffer']

class PlayerGameStatAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerGameStat._meta.get_fields() if field.name not in ('playerteamseason', 'teamseasondaterank', 'coachteamseason', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['TeamGameID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']

class AuditAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Audit._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class GameAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Game._meta.get_fields() if field.name not in ('teamgame','Playoff', 'playergamestat','gameevent','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class GameEventAdmin(admin.ModelAdmin):
    list_display = [field.name for field in GameEvent._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PlayType', 'EventPeriod', 'IsScoringPlay']

class PlayerTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeason._meta.get_fields() if field.name not in ('playerteamseasondepthchart','Player1PlayerTeamSeasonID','Player2PlayerTeamSeasonID','playergamestat', 'playerteamseasonaward','Playoff', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PlayerID__PositionID', 'PlayerID__ClassID']

class PlayerTeamSeasonAwardAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeasonAward._meta.get_fields() if field.name not in ('Player1PlayerTeamSeasonID','Player2PlayerTeamSeasonID','playergamestat', 'playerteamseasonaward','Playoff', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['ConferenceID__ConferenceName', 'PositionID__PositionAbbreviation', 'IsSeasonAward', 'IsWeekAward', 'IsPreseasonAward', 'IsFirstTeam', 'IsSecondTeam', 'IsNationalAward']

class TeamAdmin(admin.ModelAdmin):
    list_display = ['TeamName', 'TeamNickname', 'TeamPrestige']

class TeamSeasonDateRankAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonDateRank._meta.get_fields() if field.name not in ('teamgame','playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class TeamSeasonWeekRankAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonWeekRank._meta.get_fields() if field.name not in ('teamgame','playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class TeamGameAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamGame._meta.get_fields() if field.name not in ('playergamestat','teamgame','Playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class TeamRivalryAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamRivalry._meta.get_fields() if field.name not in ('hold', 'game')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class System_PlayerArchetypeRatingModifierAdmin(admin.ModelAdmin):
    list_display = [field.name for field in System_PlayerArchetypeRatingModifier._meta.get_fields() if field.name not in ('hold')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class WeekAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Week._meta.get_fields() if field.name not in ('playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class PhaseAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Phase._meta.get_fields() if field.name not in ('week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class ClassAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Class._meta.get_fields() if field.name not in ('playerteamseason', 'playerteamseasondepthchart', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class PositionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Position._meta.get_fields() if field.name not in ('playerteamseasondepthchart', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')] + ['OccurancePercent']#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class PositionGroupAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PositionGroup._meta.get_fields() if field.name not in ('position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class PlayerTeamSeasonDepthChartAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeasonDepthChart._meta.get_fields() if field.name not in ('position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PositionID__PositionAbbreviation', 'IsStarter', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName']

admin.site.register(User)
admin.site.register(Team, TeamAdmin)
admin.site.register(World)
admin.site.register(Player, PlayerAdmin)
admin.site.register(Game, GameAdmin)
admin.site.register(PlayerTeamSeason, PlayerTeamSeasonAdmin)
admin.site.register(Conference)
admin.site.register(TeamConference)
admin.site.register(LeagueSeason)
admin.site.register(Headline,HeadlineAdmin)
admin.site.register(Calendar,CalendarAdmin)
admin.site.register(GameEvent, GameEventAdmin)
admin.site.register(PlayerSeasonSkill, PlayerSkillAdmin)
admin.site.register(Driver)
admin.site.register(PlayerGameStat, PlayerGameStatAdmin)
admin.site.register(Coach, CoachAdmin)
admin.site.register(CoachTeamSeason, CoachTeamSeasonAdmin)
admin.site.register(RecruitTeamSeason, RecruitTeamSeasonAdmin)
admin.site.register(TeamSeason, TeamSeasonAdmin)
admin.site.register(Playoff)
admin.site.register(League, LeagueAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(Nation, NationAdmin)
admin.site.register(State, StateAdmin)
admin.site.register(City, CityAdmin)
admin.site.register(NameList, NameListAdmin)
admin.site.register(TeamSeasonDateRank, TeamSeasonDateRankAdmin)
admin.site.register(TeamSeasonWeekRank, TeamSeasonWeekRankAdmin)
admin.site.register(System_PlayoffRound)
admin.site.register(System_PlayoffGame)
admin.site.register(PlayoffRound)
admin.site.register(PlayoffRegion)
admin.site.register(PlayerTeamSeasonAward, PlayerTeamSeasonAwardAdmin)
admin.site.register(Audit, AuditAdmin)
admin.site.register(GameStructure, GameStructureAdmin)
admin.site.register(TeamGame, TeamGameAdmin)
admin.site.register(TeamRivalry, TeamRivalryAdmin)
admin.site.register(Week, WeekAdmin)
admin.site.register(Phase, PhaseAdmin)
admin.site.register(Position, PositionAdmin)
admin.site.register(PositionGroup, PositionGroupAdmin)
admin.site.register(Bowl, BowlAdmin)
admin.site.register(Class, ClassAdmin)
admin.site.register(PlayerTeamSeasonDepthChart, PlayerTeamSeasonDepthChartAdmin)
admin.site.register(System_PlayerArchetypeRatingModifier, System_PlayerArchetypeRatingModifierAdmin)
