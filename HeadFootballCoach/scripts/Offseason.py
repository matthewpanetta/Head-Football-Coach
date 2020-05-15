from ..models import PlayerTeamSeasonAward, Team, Position, Class, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, TeamSeason, CoachTeamSeason, Driver, Coach, PlayerGameStat, World
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
    CoachesToSave = []
    CoachTeamSeasonsToSave = []
    for C in []:#OldCoaches:
        RetireProb = ((C.CoachAge - 60) / 20.0)
        if random.uniform(0,1) < RetireProb:
            print('Retiring', C)
            C.IsActiveCoach = False
            CoachesToSave.append(C)

            CTS = C.CurrentCoachTeamSeason
            CTS.RetiredAfterSeason = True
            CoachTeamSeasonsToSave.append(CTS)

    Coach.objects.bulk_update(CoachesToSave, ['IsActiveCoach'])
    CoachTeamSeason.objects.bulk_update(CoachTeamSeasonsToSave, ['RetiredAfterSeason'])

    ActiveCoaches = Coach.objects.filter(coachteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).annotate(
        TeamPrestige = F('coachteamseason__TeamSeasonID__TeamPrestige'),
        TeamWins = F('coachteamseason__TeamSeasonID__Wins'),
    ).filter(IsActiveCoach = True)

    GoodPerformingCoaches = ActiveCoaches#.filter(TeamPrestige__lt = (F('TeamWins') + 1) * 10)
    #PoorPerformingCoaches = ActiveCoaches.exclude(TeamPrestige__lt = (F('TeamWins') + 1) * 10)

    CTSToSave = []
    for C in GoodPerformingCoaches:
        TS = C.CurrentCoachTeamSeason.TeamSeasonID.NextTeamSeasonID
        CurrentCTS = C.coachteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        CTS = CoachTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, CoachID = C, CoachPositionID = CurrentCTS.CoachPositionID)
        CTSToSave.append(CTS)


    CoachTeamSeasonsToSave = []

    for C in []:#PoorPerformingCoaches:
        print('Firing ', C)
        CTS = C.CurrentCoachTeamSeason
        CTS.FiredAfterSeason = True
        CoachTeamSeasonsToSave.append(CTS)

    CoachTeamSeason.objects.bulk_update(CoachTeamSeasonsToSave, ['RetiredAfterSeason'])
    CoachTeamSeason.objects.bulk_create(CTSToSave)

    CoachesToSave = []
    for C in OldCoaches:#OldCoaches:
        C.IsActiveCoach = False
        CoachesToSave.append(C)

    Coach.objects.bulk_update(CoachesToSave, ['IsActiveCoach'])

    return None

def GraduateSeniors(CurrentSeason = None, WorldID = None):

    CurrentWorld = CurrentSeason.WorldID

    NextLeagueSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 0, LeagueID=CurrentSeason.LeagueID, SeasonStartYear = CurrentSeason.SeasonEndYear)

    PlayerList = list(Player.objects.filter(WorldID = CurrentWorld).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).filter(playerteamseason__ClassID__IsRecruit = False).exclude(playerteamseason__ClassID__ClassName = 'Graduate'))
    Classes = Class.objects.filter(IsRecruit = False).order_by('-ClassSortOrder')

    ClassDict = {}
    PrevClass = None
    for C in Classes:
        ClassDict[C] = PrevClass
        PrevClass = C

    PToSave = []
    PTSToSave = []
    PTSToUpdate = []

    for P in PlayerList:

        PTS = P.CurrentPlayerTeamSeason
        OldClassID = PTS.ClassID

        if not PTS.RedshirtedThisSeason:
            NewClassID = ClassDict[OldClassID]
        else:
            NewClassID = OldClassID

        if NewClassID.ClassName !=  'Graduate':
            if PTS is not None:
                TS = PTS.TeamSeasonID.NextTeamSeasonID
                CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
                PTS = PlayerTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, PlayerID = P, ClassID = NewClassID)
                PTSToSave.append(PTS)
        else:
            CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
            if CurrentPTS is not None:
                CurrentPTS.LeavingTeamAfterSeason = True
                CurrentPTS.GraduatedAfterSeason = True
                PTSToUpdate.append(CurrentPTS)

    PlayerTeamSeason.objects.bulk_update(PTSToUpdate, ['GraduatedAfterSeason', 'LeavingTeamAfterSeason'])
    PlayerTeamSeason.objects.bulk_create(PTSToSave)


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
