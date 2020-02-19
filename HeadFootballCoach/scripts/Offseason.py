from ..models import PlayerTeamSeasonAward, Team, Position, Class, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, TeamSeason, CoachTeamSeason, Driver, Coach, PlayerGameStat, World
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
    for C in []:#OldCoaches:
        RetireProb = 1 - ((80 - C.CoachAge) / 20.0)
        if random.uniform(0,1) < RetireProb:
            print('Retiring', C)
            C.IsActiveCoach = False
            C.save()

            CTS = C.CurrentCoachTeamSeason
            CTS.RetiredAfterSeason = True
            CTS.save()

    ActiveCoaches = Coach.objects.filter(coachteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).annotate(
        TeamPrestige = F('coachteamseason__TeamSeasonID__TeamID__TeamPrestige'),
        TeamWins = F('coachteamseason__TeamSeasonID__Wins'),
    ).filter(IsActiveCoach = True)

    GoodPerformingCoaches = ActiveCoaches.filter(TeamPrestige__lt = F('TeamWins') + 1)
    PoorPerformingCoaches = ActiveCoaches.exclude(TeamPrestige__lt = F('TeamWins') + 1)

    CTSToSave = []
    for C in ActiveCoaches:
        TS = C.CurrentCoachTeamSeason.TeamSeasonID.NextTeamSeasonID
        CurrentCTS = C.coachteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        CTS = CoachTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, CoachID = C, CoachPositionID = CurrentCTS.CoachPositionID)
        CTSToSave.append(CTS)

    for C in []:#PoorPerformingCoaches:
        CTS = C.CurrentCoachTeamSeason
        CTS.FiredAfterSeason = True
        CTS.save()

    CoachTeamSeason.objects.bulk_create(CTSToSave)

    for C in []:#OldCoaches:
        C.IsActiveCoach = False
        C.save()


    return None

def GraduateSeniors(CurrentSeason = None, WorldID = None):

    CurrentWorld = CurrentSeason.WorldID

    NextLeagueSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 0, LeagueID=CurrentSeason.LeagueID, SeasonStartYear = CurrentSeason.SeasonEndYear)

    PlayerList = list(Player.objects.filter(WorldID = CurrentWorld).filter(ClassID__IsRecruit = False).exclude(ClassID__ClassName = 'Graduate'))
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

        OldClassID = P.ClassID
        NewClassID = ClassDict[OldClassID]
        P.ClassID = NewClassID
        PToSave.append(P)

        if OldClassID.ClassName not in  ['Senior', 'Graduate']:
            TS = P.CurrentPlayerTeamSeason.TeamSeasonID.NextTeamSeasonID
            CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
            PTS = PlayerTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, PlayerID = P, ClassID = NewClassID)
            PTSToSave.append(PTS)
        elif OldClassID.ClassName == 'Senior':
            CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
            CurrentPTS.LeavingTeamAfterSeason = True
            CurrentPTS.GraduatedAfterSeason = True
            PTSToUpdate.append(CurrentPTS)


        print()

    Player.objects.bulk_update(PToSave, ['ClassID'])
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
