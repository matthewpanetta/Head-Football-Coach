from django.contrib import admin

from .models import DivisionSeason, ConferenceSeason, RecruitTeamSeasonInterest, SubPosition,PlayerRecruitingInterest, TeamInfoTopic, TeamSeasonStrategy, TeamSeasonPosition, Audit, Position, Class, Bowl, Week,Phase, PositionGroup,TeamSeasonWeekRank, System_PlayerArchetypeRatingModifier,PlayerTeamSeasonAward,TeamRivalry, TeamGame, GameStructure, PlayoffRegion, PlayoffRound, System_PlayoffRound, System_PlayoffGame,TeamSeasonDateRank, User,World,Region, State, City, NameList,League, Headline,Playoff, TeamSeason, RecruitTeamSeason, Coach, CoachTeamSeason, Team, Player, Game,PlayerTeamSeason, Conference, LeagueSeason, Calendar, GameEvent, PlayerTeamSeasonSkill,Driver, PlayerGameStat, PlayerTeamSeasonDepthChart,CoachPosition, GameDrive, DrivePlay


class TeamSeasonStrategyAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonStrategy._meta.get_fields() if field.name not in ('game', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['TeamSeasonID__TeamID__IsUserTeam']

class BowlAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Bowl._meta.get_fields() if field.name not in ('game', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class SubPositionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in SubPosition._meta.get_fields() if field.name not in ('game', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class RegionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Region._meta.get_fields() if field.name not in ('playoff','state', 'nation','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason') ]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')


class StateAdmin(admin.ModelAdmin):
    list_display = [field.name for field in State._meta.get_fields() if field.name not in ('playoff', 'city', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class CityAdmin(admin.ModelAdmin):
    list_display = [field.name for field in City._meta.get_fields() if field.name not in ('playoff','player','stadium', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['StateID']
class NameListAdmin(admin.ModelAdmin):
    list_display = [field.name for field in NameList._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class CalendarAdmin(admin.ModelAdmin):
    list_display = ('WorldID', 'Date', 'IsCurrent')

class HeadlineAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Headline._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['WeekID', 'HeadlineImportanceValue', 'ShowNextWeek']

class LeagueAdmin(admin.ModelAdmin):
    list_display = [field.name for field in League._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')

class GameStructureAdmin(admin.ModelAdmin):
    list_display = [field.name for field in GameStructure._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'league', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')

class PlayerAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Player._meta.get_fields() if field.name not in ('playoff', 'playerrecruitinginterest', 'playerteamseason', 'playerseasonskill', 'recruitteamseason')]#('PlayerFirstName', 'PlayerLastName', 'Position', 'Class', 'IsRecruit','PlayerID', 'OverallRating', 'CurrentTeam', 'PassingRating', 'DribblingRating', 'CityID')
    list_filter = ['PositionID', 'RecruitSigned', 'IsRecruit']

class CoachAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Coach._meta.get_fields() if field.name not in ['coachteamseason']]

class CoachTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CoachTeamSeason._meta.get_fields() if field.name not in ('position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]
    list_filter = [ 'TeamSeasonID__TeamID__TeamName', 'CoachPositionID']


class PlayerTeamSeasonSkillAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeasonSkill._meta.get_fields()]
    list_filter = ['PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__PlayerID__PositionID']

class RecruitTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in RecruitTeamSeason._meta.get_fields() if field.name not in ('VisitWeekID','VisitWeekID_id', 'recruitteamseasoninterest','visitweekid', 'visitweek_recruitteamseason','playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID__RecruitingStars', 'Signed', 'TeamSeasonID__TeamID__TeamName',  'OfferMade', 'PlayerTeamSeasonID__PlayerID__CityID__StateID__StateAbbreviation']


class TeamSeasonAdmin(admin.ModelAdmin):
    list_display = ['TeamSeasonID', 'WorldID','TeamID', 'DivisionSeasonID', 'LeagueSeasonID','TeamOverallRating','TeamOffenseRating','TeamDefenseRating','TeamOverallRating_Grade','TeamOffenseRating_Grade','TeamDefenseRating_Grade', 'GamesPlayed','Wins','Losses', 'ConferenceWins',  'ConferenceLosses','DivisionRank', 'ConferenceGB' , 'WinStreak', 'ScholarshipsToOffer', 'RecruitingClassRank']
    list_filter = ['WorldID',]

class PlayerGameStatAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerGameStat._meta.get_fields() if field.name not in ('playerteamseason', 'teamseasondaterank', 'coachteamseason', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['TeamGameID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']

class AuditAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Audit._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['AuditDescription']

class GameAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Game._meta.get_fields() if field.name not in ('gamedrive', 'playchoicelog', 'teamgame','Playoff', 'playergamestat','gameevent','playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class GameEventAdmin(admin.ModelAdmin):
    list_display = [field.name for field in GameEvent._meta.get_fields() if field.name not in ('playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PlayType', 'EventPeriod', 'IsScoringPlay']

class PlayerTeamSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeason._meta.get_fields() if field.name not in ('playerteamseasonskill', 'playerteamseasondepthchart','Player1PlayerTeamSeasonID','Player2PlayerTeamSeasonID','playergamestat', 'playerteamseasonaward','Playoff', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['ClassID__ClassName', 'PlayerID__PositionID','TeamSeasonID__TeamID__TeamName', 'RedshirtedThisSeason', 'TeamSeasonID__IsRecruitTeam']

class PlayerTeamSeasonAwardAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeasonAward._meta.get_fields() if field.name not in ('Player1PlayerTeamSeasonID','Player2PlayerTeamSeasonID','playergamestat', 'playerteamseasonaward','Playoff', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['ConferenceID__ConferenceName', 'PositionID__PositionAbbreviation', 'IsSeasonAward', 'IsWeekAward', 'IsPreseasonAward', 'IsFirstTeam', 'IsSecondTeam', 'IsNationalAward', 'WeekID']

class TeamAdmin(admin.ModelAdmin):
    list_display = ['TeamName', 'TeamNickname', 'WorldID', 'Abbreviation',  'IsUserTeam', 'TeamJerseyStyle', 'TeamColor_Primary_HEX', 'TeamColor_Secondary_HEX', 'TeamJerseyInvert', 'CityID', 'TeamLogoURL',]
    list_filter = ['WorldID', 'IsUserTeam']

class TeamSeasonDateRankAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonDateRank._meta.get_fields() if field.name not in ('teamgame','playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class TeamSeasonWeekRankAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonWeekRank._meta.get_fields() if field.name not in ('teamgame','playoff', 'playerteamseason', 'conference', 'leagueseason', 'team', 'playerseasonskill', 'recruitteamseason')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['TeamSeasonID__TeamID__TeamName']

class TeamGameAdmin(admin.ModelAdmin):
    list_display = ['TeamGameID', 'GameID', 'TeamSeasonID', 'IsHomeTeam', 'IsWinningTeam', 'Points', 'BiggestLead', 'OpposingTeamGameID', 'OpposingTeamSeasonID']#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['GameID__WasPlayed', 'GameID__WeekID']

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
    list_display = [field.name for field in Position._meta.get_fields() if field.name not in ('subposition', 'coachposition', 'system_playerarchetyperatingmodifier', 'teamseasonposition','playerteamseasondepthchart', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')] + ['OccurancePercent']#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')

class PositionGroupAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PositionGroup._meta.get_fields() if field.name not in ('coachposition', 'position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')


class PlayerTeamSeasonDepthChartAdmin(admin.ModelAdmin):
    list_display = [field.name for field in PlayerTeamSeasonDepthChart._meta.get_fields() if field.name not in ('position', 'player', 'week','playerteamseasonaward', 'hold', 'calendar', 'driver', 'teamseasonweekrank', 'game', 'headline')]#('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = ['PositionID__PositionAbbreviation', 'IsStarter', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName']


class CoachPositionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in CoachPosition._meta.get_fields() if field.name not in ('coachposition', 'coachteamseason', 'position')] #('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = [ 'CoachPositionParentID', ]

class LeagueSeasonAdmin(admin.ModelAdmin):
    list_display = [field.name for field in LeagueSeason._meta.get_fields() if field.name not in ('phase', 'playoff', 'teamseason', 'game', 'playerseasonskill', 'headline', 'driver')] #('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    #list_filter = [ 'CoachPositionParentID', ]

class GameDriveAdmin(admin.ModelAdmin):
    list_display = [field.name for field in GameDrive._meta.get_fields() if field.name not in ('driveplay', 'playoff', 'teamseason', 'game', 'playerseasonskill', 'headline', 'driver')] #('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    #list_filter = [ 'CoachPositionParentID', ]

class DrivePlayAdmin(admin.ModelAdmin):
    list_display = [field.name for field in DrivePlay._meta.get_fields() if field.name not in ('phase', 'playoff', 'teamseason', 'game', 'playerseasonskill', 'headline', 'driver')] #('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = [ 'IsPass', 'IsRun', 'IsScoringPlay', 'IsChangeOfPossessionPlay', 'IsFirstDown']

class TeamSeasonPositionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in TeamSeasonPosition._meta.get_fields() if field.name not in ('phase', 'playoff', 'teamseason', 'game', 'playerseasonskill', 'headline', 'driver')] #('TeamID', 'LeagueSeasonID', 'GamesPlayed', 'Points', 'ThreePM', 'ThreePointPercentage', 'FGA', 'PlayoffSeed', 'NationalBroadcast', 'RegionalBroadcast')
    list_filter = [ 'TeamSeasonID__TeamID__TeamName', 'PositionID__PositionAbbreviation']

class ConferenceAdmin(admin.ModelAdmin):
    list_display = ['WorldID', 'ConferenceName']
    list_filter = ['WorldID']


class ConferenceSeasonAdmin(admin.ModelAdmin):
    list_display = ['WorldID', 'ConferenceID', 'LeagueSeasonID']
    list_filter = ['WorldID']


class DivisionSeasonAdmin(admin.ModelAdmin):
    list_display = ['WorldID', 'DivisionName', 'ConferenceSeasonID']
    list_filter = ['WorldID']

class TeamInfoTopicAdmin(admin.ModelAdmin):
    list_display = ['TeamInfoTopicID', 'AttributeName', 'RecruitMatchIsComputed', 'RecruitInterestWeight', 'IsPrestigeOrLocation']

class PlayerRecruitingInterestAdmin(admin.ModelAdmin):
    list_display = ['PlayerRecruitingInterestID', 'PlayerID', 'PitchRecruitInterestRank', 'TeamInfoTopicID']
    list_filter = ['TeamInfoTopicID__AttributeName']

class RecruitTeamSeasonInterestAdmin(admin.ModelAdmin):
    list_display = ['RecruitTeamSeasonInterestID', 'RecruitTeamSeasonID', 'PlayerRecruitingInterestID', 'TeamRating', 'PitchRecruitInterestRank_IsKnown']



admin.site.register(TeamSeasonStrategy, TeamSeasonStrategyAdmin)
admin.site.register(User)
admin.site.register(Team, TeamAdmin)
admin.site.register(World)
admin.site.register(Player, PlayerAdmin)
admin.site.register(Game, GameAdmin)
admin.site.register(PlayerTeamSeason, PlayerTeamSeasonAdmin)
admin.site.register(Conference, ConferenceAdmin)
admin.site.register(ConferenceSeason, ConferenceSeasonAdmin)
admin.site.register(DivisionSeason, DivisionSeasonAdmin)
admin.site.register(LeagueSeason, LeagueSeasonAdmin)
admin.site.register(Headline,HeadlineAdmin)
admin.site.register(Calendar,CalendarAdmin)
admin.site.register(GameEvent, GameEventAdmin)
admin.site.register(PlayerTeamSeasonSkill, PlayerTeamSeasonSkillAdmin)
admin.site.register(Driver)
admin.site.register(PlayerGameStat, PlayerGameStatAdmin)
admin.site.register(Coach, CoachAdmin)
admin.site.register(CoachTeamSeason, CoachTeamSeasonAdmin)
admin.site.register(RecruitTeamSeason, RecruitTeamSeasonAdmin)
admin.site.register(TeamSeason, TeamSeasonAdmin)
admin.site.register(Playoff)
admin.site.register(League, LeagueAdmin)
admin.site.register(Region, RegionAdmin)
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
admin.site.register(CoachPosition, CoachPositionAdmin)
admin.site.register(GameDrive, GameDriveAdmin)
admin.site.register(DrivePlay, DrivePlayAdmin)
admin.site.register(SubPosition, SubPositionAdmin)
admin.site.register(TeamSeasonPosition, TeamSeasonPositionAdmin)
admin.site.register(TeamInfoTopic, TeamInfoTopicAdmin)
admin.site.register(PlayerRecruitingInterest, PlayerRecruitingInterestAdmin)
admin.site.register(RecruitTeamSeasonInterest, RecruitTeamSeasonInterestAdmin)
