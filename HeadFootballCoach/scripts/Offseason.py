from ..models import PlayerTeamSeasonAward, Team, Position, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, TeamSeason, CoachTeamSeason, Driver, Coach, PlayerGameStat, World
from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value
import random

def StartCoachingCarousel(CurrentSeason = None, WorldID=None):

    #Coach retires = Coaches older than 60
        #
    #Free agent coaches = Coach where CTS DNE for next season
    #Open jobs =
    #Coach being hired away -> delete existing CTS for next season, create new CTS for next season

    CurrentWorld = CurrentSeason.WorldID

    NextLeagueSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 0, LeagueID=CurrentSeason.LeagueID, SeasonStartYear = CurrentSeason.SeasonEndYear)

    OldCoaches = Coach.objects.filter(CoachAge__gte = 60)
    for C in OldCoaches:
        RetireProb = 1 - ((80 - C.CoachAge) / 20.0)
        if random.uniform(0,1) < RetireProb:
            print('Retiring', C)
            C.IsActiveCoach = False
            C.save()

    GoodPerformingCoaches = Coach.objects.filter(coachteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).annotate(
        TeamPrestige = F('coachteamseason__TeamSeasonID__TeamID__TeamPrestige'),
        TeamWins = F('coachteamseason__TeamSeasonID__Wins'),
    ).filter(TeamPrestige__lt = F('TeamWins')).filter(IsActiveCoach = True)

    CTSToSave = []
    for C in GoodPerformingCoaches:
        TS = C.CurrentCoachTeamSeason.TeamSeasonID.NextTeamSeasonID
        CurrentCTS = C.coachteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        CTS = CoachTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, CoachID = C, CoachPositionID = CurrentCTS.CoachPositionID)
        CTSToSave.append(CTS)

    CoachTeamSeason.objects.bulk_create(CTSToSave)

    for C in OldCoaches:
        C.IsActiveCoach = False
        C.save()


    return None


def CreateNextLeagueSeason(CurrentSeason = None, WorldID = None):

    CurrentLeagueSeason = CurrentSeason
    CurrentLeagueSeason.OffseasonStarted = True
    CurrentLeagueSeason.save()
    CurrentWorld = CurrentLeagueSeason.WorldID

    LS = LeagueSeason(WorldID = CurrentWorld, LeagueID=CurrentLeagueSeason.LeagueID, IsCurrent = False, SeasonStartYear = CurrentLeagueSeason.SeasonEndYear, SeasonEndYear = CurrentLeagueSeason.SeasonEndYear + 1)
    LS.save()

    TSToSave = []
    for TS in CurrentLeagueSeason.teamseason_set.all():
        NewTS = TeamSeason(WorldID=CurrentWorld, TeamID = TS.TeamID, LeagueSeasonID = LS)
        TSToSave.append(NewTS)
        print('Creating new Team Season!', LS, NewTS)

    TeamSeason.objects.bulk_create(TSToSave, ignore_conflicts = True)


    LS.TeamSeasonsCreated = True
    LS.save()


    return None
