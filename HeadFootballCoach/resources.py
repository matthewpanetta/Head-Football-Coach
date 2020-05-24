from .models import TeamInfoTopic, TeamSeasonInfoRating, PlayerRecruitingInterest, RecruitTeamSeasonInterest, Audit,TeamGame,Bowl,PlayerTeamSeasonDepthChart,TeamSeasonStrategy, Phase, TeamSeasonPosition, System_PlayerArchetypeRatingModifier, Position,Class, CoachPosition, NameList, Week, TeamSeasonWeekRank, TeamRivalry, League, PlayoffRegion, System_PlayoffRound, PlayoffRound, TeamSeasonDateRank, World, Headline, Playoff, CoachTeamSeason, TeamSeason, RecruitTeamSeason, Team, Player, Coach, Game,PlayerTeamSeason, Conference, LeagueSeason, Calendar, GameEvent, PlayerTeamSeasonSkill, CoachTeamSeason
import random
from datetime import timedelta, date
import pandas as pd
import numpy
from decimal import Decimal
from .scripts.PickName import RandomName, RandomPositionAndMeasurements, RandomCity, PlayerBioDataList
import math
from django.db.models.functions import Coalesce
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case,  ExpressionWrapper, When, FloatField, IntegerField, DecimalField, CharField, BooleanField, Value, Window, OuterRef, Subquery
#from django.db.models import Max, Avg, Count, Func,  Sum, Case, When, FloatField, CharField, Value
from django.db.models.functions.window import Rank, RowNumber, Ntile
from .scripts.rankings import CalculateRankings, CalculateConferenceRankings, SelectBroadcast
from .scripts.DepthChart import CreateDepthChart
from .scripts.SeasonAwards import NationalAwards, SelectPreseasonAllAmericans
from .scripts.Recruiting import FindNewTeamsForRecruit, RandomRecruitPreference
from .utilities import NormalVariance, DistanceBetweenCities,WeightedAverage, MergeDicts, DistanceBetweenCities_Dict, WeightedProbabilityChoice, NormalBounds, NormalTrunc, NormalVariance, Max_Int
from math import sin, cos, sqrt, atan2, radians, log
import time
from django.db import connection, reset_queries




def createCalendar(WorldID=None, LeagueSeasonID=None, SetFirstWeekCurrent = False):

    WeeksInRegularSeason = 15
    BowlWeeks = 2
    OffseasonRecruitingWeeks = 4
    AnnualScheduleOfEvents = []

    AnnualScheduleOfEvents.append({'Phase': 'Preseason',  'WeekName': 'Prepare for Summer Camps', 'LastWeekInPhase': False, 'FirstWeekOfCalendar': True})
    AnnualScheduleOfEvents.append({'Phase': 'Preseason',  'WeekName': 'Training Results', 'LastWeekInPhase': False})
    AnnualScheduleOfEvents.append({'Phase': 'Preseason', 'WeekName': 'Preseason', 'LastWeekInPhase': True})

    for WeekCount in range(1, WeeksInRegularSeason+1):
        WeekDict = {'Phase': 'Regular Season',  'WeekName': 'Week ' + str(WeekCount), 'LastWeekInPhase': False, 'RecruitingWeekModifier': round(1.0 + (WeekCount / 60.0), 2), 'RecruitingAllowed': True}
        if WeekCount == WeeksInRegularSeason:
            WeekDict['LastWeekInPhase'] = True
        AnnualScheduleOfEvents.append(WeekDict)

    AnnualScheduleOfEvents.append({'Phase': 'Conference Championships',  'WeekName': 'Conference Championship Week', 'LastWeekInPhase': True})

    for WeekCount in range(1, BowlWeeks+1):
        WeekDict = {'Phase': 'Bowl Season',  'WeekName': 'Bowl Week ' + str(WeekCount), 'LastWeekInPhase': False}
        if WeekCount == BowlWeeks:
            WeekDict['LastWeekInPhase'] = True
        AnnualScheduleOfEvents.append(WeekDict)

    AnnualScheduleOfEvents.append({'Phase': 'Season Recap',  'WeekName': 'Season Recap', 'LastWeekInPhase': True})
    AnnualScheduleOfEvents.append({'Phase': 'Departures',  'WeekName': 'Coach Carousel', 'LastWeekInPhase': False})
    AnnualScheduleOfEvents.append({'Phase': 'Departures',  'WeekName': 'Draft Departures', 'LastWeekInPhase': False})
    AnnualScheduleOfEvents.append({'Phase': 'Departures',  'WeekName': 'Transfer Announcements', 'LastWeekInPhase': True})


    for WeekCount in range(1, OffseasonRecruitingWeeks+1):
        WeekDict = {'Phase': 'Offseason Recruiting',  'WeekName': 'Offseason Recruiting Week ' + str(WeekCount), 'LastWeekInPhase': False, 'RecruitingWeekModifier': 1.0 + (WeekCount / 10.0), 'RecruitingAllowed': True}
        AnnualScheduleOfEvents.append(WeekDict)

    AnnualScheduleOfEvents.append({'Phase': 'Offseason Recruiting',  'WeekName': 'National Signing Day', 'LastWeekInPhase': True})

    WeeksToSave = []
    PhaseList = []
    FieldExclusions = ['Phase']
    WeekCount = -2
    W = None
    for W in AnnualScheduleOfEvents:

        P,st = Phase.objects.get_or_create(WorldID = WorldID, PhaseName = W['Phase'], LeagueSeasonID=LeagueSeasonID)

        W['PhaseID'] = P
        W['WeekNumber'] = WeekCount
        WeekCount +=1
        for FE in FieldExclusions:
            del W[FE]

        if W['WeekName'] == 'Preseason' and SetFirstWeekCurrent:
            W['IsCurrent'] = True
        W['WorldID'] = WorldID
        NewWeek = Week(**W)
        WeeksToSave.append(NewWeek)

    Week.objects.bulk_create(WeeksToSave)

    WorldID.HasCalendar = True
    WorldID.save()

def CalculateTeamPlayerOverall(TSP, PlayerID):

    TotalRating = 1
    for key in TSP:
        RatingName = key.replace('_Weight', '')
        RatingName2 = 'playerteamseasonskill__' + key.replace('_Weight', '')
        if RatingName in PlayerID:
            TotalRating += TSP[key] * PlayerID[RatingName]
        elif RatingName2 in PlayerID:
            TotalRating += TSP[key] * PlayerID[RatingName2]

    return int(TotalRating / TSP['Total_Rating_Weight'])


def TeamRedshirts(TS, WorldID):

    PlayersToRedshirt = TS.playerteamseason_set.filter(PlayerID__WasPreviouslyRedshirted = False).filter(Q(ClassID__ClassAbbreviation = 'SO') | Q(ClassID__ClassAbbreviation = 'FR')).exclude(playerteamseasondepthchart__IsStarter = True).annotate(DepthChartPositionMin = Coalesce(Min('playerteamseasondepthchart__DepthPosition'), 6))
    HeadCount = TS.coachteamseason_set.filter(CoachPositionID__CoachPositionAbbreviation = 'HC').values('CoachID__RedshirtTendency').first()
    PTRToSave = []
    Num = 4
    Pow = .25
    for PTR in PlayersToRedshirt:
        if random.uniform(0,1) < ((Max_Int(PTR.DepthChartPositionMin + HeadCount['CoachID__RedshirtTendency'] - Num,0) / 10.0) ** Pow):
            PTR.RedshirtedThisSeason = True
            PTRToSave.append(PTR)

    PlayerTeamSeason.objects.bulk_update(PTRToSave, ['RedshirtedThisSeason'])

    return None



def TeamCuts(TS, WorldID, NumPlayersToCut):

    PlayersToCut = TS.playerteamseason_set.exclude(playerteamseasondepthchart__IsStarter = True).annotate(DepthChartPositionMin = Coalesce(Min('playerteamseasondepthchart__DepthPosition'), 10), OverallRating = F('playerteamseasonskill__OverallRating')).order_by('-DepthChartPositionMin', 'OverallRating')[:NumPlayersToCut]
    HeadCount = TS.coachteamseason_set.filter(CoachPositionID__CoachPositionAbbreviation = 'HC').values('CoachID__RedshirtTendency').first()

    for PTR in PlayersToCut:
        print('Cutting {PlayerName} from {Team}, Pos: {PlayerPosition}, Overall: {Overall}, DepthChart: {DepthChartPositionMin}'.format(PlayerName=PTR.PlayerID.PlayerLastName, Team=TS.TeamID.TeamName,PlayerPosition=PTR.PlayerID.PositionID.PositionAbbreviation, Overall=PTR.OverallRating, DepthChartPositionMin=PTR.DepthChartPositionMin))
        PTR.delete()

    return None


def ChooseCaptains(TS, WorldID):
    CaptainNeedCount = 3 - TS.playerteamseason_set.filter(TeamCaptain = True).count()

    if CaptainNeedCount > 0:
        PlayerList = TS.playerteamseason_set.filter(playerteamseasondepthchart__IsStarter = True).filter(ClassID__IsUpperClassman = True).exclude(TeamCaptain = True).annotate(
            OverallRating = F('playerteamseasonskill__OverallRating'),
            LeadershipRating = ExpressionWrapper((F('PlayerID__Personality_LeadershipRating') / 20) ** 2, output_field=IntegerField()),
            CaptainRating = ExpressionWrapper(F('LeadershipRating') + F('OverallRating'), output_field=IntegerField()),
            PositionGroup = F('PlayerID__PositionID__PositionGroupID__PositionGroupName')
        ).order_by('-CaptainRating')[:CaptainNeedCount]

        PositionGroups = []
        PlayersTeamSeasonToSave = []
        for P in PlayerList:
            P.TeamCaptain = True
            PlayersTeamSeasonToSave.append(P)

            if P.PositionGroup not in PositionGroups:
                PositionGroups.append(P.PositionGroup)

        PlayerTeamSeason.objects.bulk_update(PlayersTeamSeasonToSave, ['TeamCaptain'])

        if len(PositionGroups) == 1:
            TakenPositionGroup = PositionGroups[0]
            PTS = TS.playerteamseason_set.exclude(PlayerID__PositionID__PositionGroupID__PositionGroupName = TakenPositionGroup).filter(playerteamseasondepthchart__IsStarter = True).annotate(
                OverallRating = F('playerteamseasonskill__OverallRating'),
                LeadershipRating = ExpressionWrapper((F('PlayerID__Personality_LeadershipRating') / 20) ** 2, output_field=IntegerField()),
                CaptainRating = ExpressionWrapper(F('LeadershipRating') + F('OverallRating'), output_field=IntegerField()),
            ).order_by('-CaptainRating').first()

            PTS.TeamCaptain = True
            PTS.save()


def CreateTeamPositions(LS, WorldID):

    TSPToSave = []
    PositionArchetypes =System_PlayerArchetypeRatingModifier.objects.all()
    ArchetypeFields = [field.name for field in System_PlayerArchetypeRatingModifier._meta.get_fields() if '_Rating' in field.name and 'Base' not in field.name]
    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).order_by('TeamID__TeamName'):
        TSS = TeamSeasonID.teamseasonstrategy_set.all().first()
        for Pos in Position.objects.exclude(PositionAbbreviation = 'ATH'):
            PosAbbr = Pos.PositionAbbreviation
            TSP = {'WorldID': WorldID, 'TeamSeasonID': TeamSeasonID, 'PositionID': Pos, 'StarterPlayerCount': Pos.PositionTypicalStarterCountPerTeam, 'MinimumPlayerCount': Pos.PositionMinimumCountPerTeam, 'NeededPlayerCount': Pos.PositionMinimumCountPerTeam, 'PositionPreference': '' }
            TSP['PositionPriority'] = NormalVariance(1.0, 7)

            if PosAbbr == 'QB':
                TSP['PositionPreference'] = TSS.QB_Preference
            elif  PosAbbr == 'RB':
                TSP['PositionPreference'] = TSS.RB_Preference
            elif  PosAbbr == 'WR':
                TSP['PositionPreference'] = TSS.WR_Preference
            elif  PosAbbr == 'TE':
                TSP['PositionPreference'] = TSS.TE_Preference
            elif  PosAbbr in ('OT', 'OG', 'OC'):
                TSP['PositionPreference'] = TSS.OL_Preference
            elif  PosAbbr == 'DE':
                TSP['PositionPreference'] = TSS.DE_Preference
            elif  PosAbbr == 'DT':
                TSP['PositionPreference'] = TSS.DT_Preference
            elif  PosAbbr == 'OLB':
                TSP['PositionPreference'] = TSS.OLB_Preference
            elif  PosAbbr == 'MLB':
                TSP['PositionPreference'] = TSS.MLB_Preference
            elif  PosAbbr == 'CB':
                TSP['PositionPreference'] = TSS.CB_Preference
            elif  PosAbbr == 'S':
                TSP['PositionPreference'] = TSS.S_Preference

            Archetype = PositionArchetypes.filter(Position = PosAbbr).annotate(
                ArchetypeMatch = Case(
                    When(Archetype = TSP['PositionPreference'], then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )
                ).order_by('-ArchetypeMatch').first()


            TotalWeight = Decimal(0)
            for field in ArchetypeFields:
                TSP[field+'_Weight'] = Decimal(getattr(Archetype, field) * 1.0)
                TotalWeight += Decimal(getattr(Archetype, field)* 1.0)
            TSP['Total_Rating_Weight'] = TotalWeight

            TeamSeasonPositionID = TeamSeasonPosition(**TSP)
            TSPToSave.append(TeamSeasonPositionID)


    TeamSeasonPosition.objects.bulk_create(TSPToSave, ignore_conflicts = True)



def UpdateTeamPositions(LS, WorldID, TeamSeasonID = None):

    Filter = {}
    if TeamSeasonID is not None:
        Filter['TeamSeasonID'] = TeamSeasonID


    TSPs = TeamSeasonPosition.objects.filter(WorldID = WorldID).filter(**Filter).filter(TeamSeasonID__TeamID__isnull = False).filter(TeamSeasonID__LeagueSeasonID = LS).annotate(
        CurrentPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID'))),
        NeededPlayerCount_calc = Case(
            When(CurrentPlayerCount__lt = F('MinimumPlayerCount'), then=F('MinimumPlayerCount') - F('CurrentPlayerCount')),
            default=Value(0),
            output_field=IntegerField()
        ),

        FreshmanPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__ClassID__ClassAbbreviation = 'FR')),
        SophomorePlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__ClassID__ClassAbbreviation = 'SO')),
        JuniorPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__ClassID__ClassAbbreviation = 'JR')),
        SeniorPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__ClassID__ClassAbbreviation = 'SR')),

        Year1PositionOverall_calc = Coalesce(Subquery(PlayerTeamSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID = OuterRef('TeamSeasonID')).filter(PlayerTeamSeasonID__PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerTeamSeasonID__ClassID__ClassSortOrder__lte = 7).values('PlayerTeamSeasonID__TeamSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerTeamSeasonSkillID')).values('Max')  ),0),
        Year2PositionOverall_calc = Coalesce(Subquery(PlayerTeamSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID = OuterRef('TeamSeasonID')).filter(PlayerTeamSeasonID__PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerTeamSeasonID__ClassID__ClassSortOrder__lte = 6).values('PlayerTeamSeasonID__TeamSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerTeamSeasonSkillID')).values('Max')  ),0),
        Year3PositionOverall_calc = Coalesce(Subquery(PlayerTeamSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID = OuterRef('TeamSeasonID')).filter(PlayerTeamSeasonID__PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerTeamSeasonID__ClassID__ClassSortOrder__lte = 5).values('PlayerTeamSeasonID__TeamSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerTeamSeasonSkillID')).values('Max')  ),0),
    )

    TSPsToUpdate = []
    for TSP in TSPs:
        TSP.CurrentPlayerCount = TSP.CurrentPlayerCount_calc
        TSP.NeededPlayerCount  = TSP.NeededPlayerCount_calc
        TSP.FreshmanPlayerCount = TSP.FreshmanPlayerCount_calc
        TSP.SophomorePlayerCount = TSP.SophomorePlayerCount_calc
        TSP.JuniorPlayerCount = TSP.JuniorPlayerCount_calc
        TSP.SeniorPlayerCount = TSP.SeniorPlayerCount_calc
        TSP.Year1PositionOverall = TSP.Year1PositionOverall_calc
        TSP.Year2PositionOverall = TSP.Year2PositionOverall_calc
        TSP.Year3PositionOverall = TSP.Year3PositionOverall_calc

        TSPsToUpdate.append(TSP)

    TeamSeasonPosition.objects.bulk_update(TSPsToUpdate, ['CurrentPlayerCount', 'NeededPlayerCount', 'FreshmanPlayerCount', 'SophomorePlayerCount','JuniorPlayerCount', 'SeniorPlayerCount', 'Year1PositionOverall', 'Year2PositionOverall', 'Year3PositionOverall'])


    return None


def PopulateTeamDepthCharts(LS, WorldID, FullDepthChart = False):
    print('Populating depth charts')

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False):
        PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).delete()
        CreateDepthChart(CurrentWorld=WorldID, TS=TeamSeasonID, FullDepthChart = False)

def AssignRedshirts(LS, WorldID, PrepForUserTeam=False):
    print('Assigning Redshirts')

    if PrepForUserTeam:
        UserTeamFilter = {}
    else:
        UserTeamFilter = {'TeamID__IsUserTeam': False}

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).filter(**UserTeamFilter):
        TeamRedshirts(TS=TeamSeasonID , WorldID=WorldID )

def CutPlayers(LS, WorldID, PrepForUserTeam=False):
    print('Cutting Players')

    if PrepForUserTeam:
        UserTeamFilter = {}
    else:
        UserTeamFilter = {'TeamID__IsUserTeam': False}

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).filter(**UserTeamFilter).annotate(NumbersOfPlayers = Count('playerteamseason__PlayerTeamSeasonID'), PlayersToCut = ExpressionWrapper(F('NumbersOfPlayers') -  F('LeagueSeasonID__LeagueID__PlayersPerTeam'), output_field=IntegerField())).filter(PlayersToCut__gt = 0):
        TeamCuts(TS=TeamSeasonID , WorldID=WorldID,  NumPlayersToCut=TeamSeasonID.PlayersToCut)

def ChooseTeamCaptains(LS, WorldID, PrepForUserTeam = False):
    print('Choosing Captains')

    if PrepForUserTeam:
        UserTeamFilter = {}
    else:
        UserTeamFilter = {'TeamID__IsUserTeam': False}

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).filter(**UserTeamFilter):
        ChooseCaptains(TS=TeamSeasonID , WorldID=WorldID)


def CalculateTeamOverall(LS, WorldID):


    NtileToGradeMap = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

    TSDict = {}
    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID__isnull = False).values_list('TeamSeasonID', flat=True):
        if TS not in TSDict:
            TSDict[TS] = {'TeamOverallRating': 0, 'TeamOffenseRating': 0, 'TeamDefenseRating': 0, 'TeamOverallRating_Grade': '', 'TeamOffenseRating_Grade': '', 'TeamDefenseRating_Grade': '',  }

    TSOvr = list(TeamSeason.objects.filter(TeamID__isnull = False).filter(WorldID = WorldID).filter(playerteamseason__playerteamseasondepthchart__IsStarter = True).values('TeamSeasonID', 'playerteamseason__PlayerID__PositionID__PositionGroupID__PositionGroupName').annotate(
        AverageOverall = Avg('playerteamseason__playerteamseasonskill__OverallRating'),
        AverageOverall_Ntile = Window(
            expression=Ntile(13),
            partition_by=[F('playerteamseason__PlayerID__PositionID__PositionGroupID')],
            order_by=F("AverageOverall").desc(),
        )
    ).order_by('TeamID', 'playerteamseason__PlayerID__PositionID__PositionGroupID'))
    for TS in TSOvr:
        if TS['playerteamseason__PlayerID__PositionID__PositionGroupID__PositionGroupName'] == 'Offense':
            TSDict[TS['TeamSeasonID']]['TeamOffenseRating'] = int(TS['AverageOverall'])
            TSDict[TS['TeamSeasonID']]['TeamOffenseRating_Grade'] = NtileToGradeMap[TS['AverageOverall_Ntile'] - 1]
        else:
            TSDict[TS['TeamSeasonID']]['TeamDefenseRating'] = int(TS['AverageOverall'])
            TSDict[TS['TeamSeasonID']]['TeamDefenseRating_Grade'] = NtileToGradeMap[TS['AverageOverall_Ntile'] - 1]


    TSOvr = list(TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID__isnull = False).filter(playerteamseason__playerteamseasondepthchart__IsStarter = True).values('TeamSeasonID').annotate(
        AverageOverall = Avg('playerteamseason__playerteamseasonskill__OverallRating'),
        AverageOverall_Ntile = Window(
            expression=Ntile(13),
            order_by=F("AverageOverall").desc(),
        )
    ).order_by('TeamID', 'playerteamseason__PlayerID__PositionID__PositionGroupID'))
    for TS in TSOvr:
        TSDict[TS['TeamSeasonID']]['TeamOverallRating'] = int(TS['AverageOverall'])
        TSDict[TS['TeamSeasonID']]['TeamOverallRating_Grade'] = NtileToGradeMap[TS['AverageOverall_Ntile'] - 1]

    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID__isnull = False).filter(LeagueSeasonID = LS).values_list('TeamSeasonID', flat=True):
        TeamSeason.objects.filter(WorldID_id = WorldID).filter(TeamID__isnull = False).filter(TeamSeasonID = TS).update(TeamOverallRating = TSDict[TS]['TeamOverallRating'], TeamOffenseRating = TSDict[TS]['TeamOffenseRating'], TeamDefenseRating = TSDict[TS]['TeamDefenseRating'], TeamOverallRating_Grade = TSDict[TS]['TeamOverallRating_Grade'], TeamOffenseRating_Grade = TSDict[TS]['TeamOffenseRating_Grade'], TeamDefenseRating_Grade = TSDict[TS]['TeamDefenseRating_Grade'])


def LoadNames(f):
    NamesFile  = open(f, 'r')
    NamesDict = {'FirstNames': [], 'LastNames':[]}

    for line in NamesFile:
        l = line.strip().split(',')
        NamesDict['FirstNames'].append(l[0])
        NamesDict['LastNames'].append(l[1])

    return NamesDict

def round_robin(teams, games):
    teams = [u for u in teams]
    teams = sorted(teams, key=lambda k: random.uniform(0,1))
    FullSchedule = []

    if teams.__len__() % 2 == 0:
        HasByeWeek = False
        last = teams[-1]
        shape = teams[:-1]
    else:
        HasByeWeek = True
        last = None
        shape = teams
        games +=1


    for g in range(games):
        ThisWeek = []
        if HasByeWeek:
            mid = int(teams.__len__() / 2)
        else:
            mid = int((teams.__len__() - 1) / 2)
        for u in range(int((shape.__len__() - 1) / 2)):
            if random.randint(0,1) == 1:
                ThisWeek.append((shape[u], shape[-1*u - 1]))
            else:
                ThisWeek.append((shape[-1*u - 1], shape[u]))
        if not HasByeWeek:
            lasthomeflag = random.randint(0,1)
            if lasthomeflag == True:
                ThisWeek.append((shape[mid], last))
            else:
                ThisWeek.append((last, shape[mid]))
        shape.insert(0,shape.pop())
        FullSchedule.append(ThisWeek)

    return FullSchedule



def CreateSchedule(LS, WorldID):
    #print('Creating schedule!')

    TeamList = Team.objects.filter(WorldID=WorldID).filter(teamseason__LeagueSeasonID__IsCurrent = True).annotate(
        ConferenceID = F('teamseason__ConferenceID'),
        NumberConferenceGames = F('teamseason__ConferenceID__NumberConferenceGames'),
        ConferenceIsIndependent = F('teamseason__ConferenceID__IsIndependent')
    )
    WeekMap = {w.WeekNumber: w for w in Week.objects.filter(WorldID=WorldID).filter(PhaseID__PhaseName = 'Regular Season').filter(PhaseID__LeagueSeasonID__IsCurrent = True)}

    WeeksInSeason = len(WeekMap)
    GamePerTeam = 12
    NonConferenceGames = 4
    ConferenceGames = GamePerTeam - NonConferenceGames

    ScheduleDict = {}
    for t in TeamList:
        ScheduleDict[t] = {'CurrentTeamSeason': t.CurrentTeamSeason, 'NonConferenceGames': 0, 'ConferenceGames': 0, 'TotalConferenceGames': t.NumberConferenceGames, 'TotalNonConferenceGames': GamePerTeam - t.NumberConferenceGames, 'HomeGames': 0, 'AwayGames': 0, 'WeeksScheduled': [], 'AvailableWeeks':[w for w in WeekMap], 'OpposingTeams': [], 'UnschedulableTeams': [], 'Conference': t.ConferenceID, 'ConferenceIsIndependent': t.ConferenceIsIndependent, 'ConferenceRivals': [], 'NonConferenceRivals': [], }


    GameTimeHourChoices = [12, 12, 2, 3, 3, 7, 7, 8]
    GameTimeMinuteChoices = ['00', '00', '00', '00', '30', '30', '30', '05']

    CurrentSeason = LS
    Teams = TeamList
    allweeks = range(1,WeeksInSeason + 1)
    WeekNumber = 1
    GamesToSave = []
    TeamGamesToSave = []
    DistinctConferences = WorldID.conference_set.all()#.values_list('ConferenceName', flat=True)
    ScheduleLoopCount = 0


    UnscheduledTeams = [t for t in ScheduleDict]
    for Rivalry in TeamRivalry.objects.filter(WorldID = WorldID):
        TeamA, TeamB = Rivalry.Team1TeamID, Rivalry.Team2TeamID
        DictConferenceClass = 'NonConferenceRivals'
        if ScheduleDict[TeamA]['Conference'] == ScheduleDict[TeamA]['Conference']:
            DictConferenceClass = 'ConferenceRivals'

        ScheduleDict[TeamA][DictConferenceClass].append(TeamB)
        ScheduleDict[TeamB][DictConferenceClass].append(TeamA)


    GamesToSchedule = []
    for T in UnscheduledTeams:
        for R in ScheduleDict[T]['ConferenceRivals']:
            GamesToSchedule.append((T, R))

    for T in UnscheduledTeams:
        for R in ScheduleDict[T]['NonConferenceRivals']:
            GamesToSchedule.append((T, R))

    while len(UnscheduledTeams) >= 2 and ScheduleLoopCount < 400:

        if ScheduleLoopCount > 1 and ScheduleLoopCount < 10:
            UnscheduledConferences = {}
            for T in UnscheduledTeams:
                if ScheduleDict[T]['Conference'] not in UnscheduledConferences:
                    UnscheduledConferences[ScheduleDict[T]['Conference']] = []
                if ScheduleDict[T]['ConferenceGames'] < ScheduleDict[T]['TotalConferenceGames']:
                    UnscheduledConferences[ScheduleDict[T]['Conference']].append(T)

            for Conf in UnscheduledConferences:
                ConfTeams = UnscheduledConferences[Conf]
                if len(ConfTeams) < 2:
                    continue
                rr = round_robin(ConfTeams, int(len(ConfTeams) / 5) +1  )
                for w in rr:
                    GamesToSchedule += w

            GamesToSchedule = sorted(GamesToSchedule, key=lambda G: ScheduleDict[G[0]]['ConferenceGames'] + ScheduleDict[G[1]]['ConferenceGames'])
        else:
            rr = round_robin(UnscheduledTeams, 2)
            for w in rr:
                GamesToSchedule += w

        for game in GamesToSchedule:
            HomeTeam, AwayTeam = game[0], game[1]
            if random.uniform(0,1) < .5:
                HomeTeam, AwayTeam = AwayTeam, HomeTeam
            KeepGame = True

            IsConferenceGame = ((ScheduleDict[HomeTeam]['Conference'] == ScheduleDict[AwayTeam]['Conference']) and (not ScheduleDict[HomeTeam]['ConferenceIsIndependent']))
            if AwayTeam in ScheduleDict[HomeTeam]['OpposingTeams'] or AwayTeam in ScheduleDict[HomeTeam]['UnschedulableTeams'] :
                KeepGame = False
            else:
                if IsConferenceGame:
                    KeepGame = ScheduleDict[HomeTeam]['ConferenceGames'] < ScheduleDict[HomeTeam]['TotalConferenceGames'] and ScheduleDict[AwayTeam]['ConferenceGames'] < ScheduleDict[AwayTeam]['TotalConferenceGames']
                else:
                    KeepGame = ScheduleDict[HomeTeam]['NonConferenceGames'] < ScheduleDict[HomeTeam]['TotalNonConferenceGames'] and ScheduleDict[AwayTeam]['NonConferenceGames'] < ScheduleDict[AwayTeam]['TotalNonConferenceGames']

                KeepGame = KeepGame and len(ScheduleDict[HomeTeam]['WeeksScheduled']) < GamePerTeam and len(ScheduleDict[AwayTeam]['WeeksScheduled']) < GamePerTeam

            if KeepGame:
                if (ScheduleDict[HomeTeam]['HomeGames'] - ScheduleDict[HomeTeam]['AwayGames']) > (ScheduleDict[AwayTeam]['HomeGames'] - ScheduleDict[AwayTeam]['AwayGames']):
                    HomeTeam, AwayTeam = AwayTeam, HomeTeam

                PossibleRivalries = TeamRivalry.objects.filter(Team1TeamID = HomeTeam).filter(Team2TeamID = AwayTeam) | TeamRivalry.objects.filter(Team2TeamID = HomeTeam).filter(Team1TeamID = AwayTeam)
                TeamRivalryID = PossibleRivalries.first()

                GameTime = str(random.choice(GameTimeHourChoices)) + ':' + random.choice(GameTimeMinuteChoices)


                if IsConferenceGame or ScheduleDict[HomeTeam]['ConferenceIsIndependent']:
                    WeekSet = [(w, w**4) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    if len(WeekSet) == 0:
                        ScheduleDict[HomeTeam]['UnschedulableTeams'].append(AwayTeam)
                        ScheduleDict[AwayTeam]['UnschedulableTeams'].append(HomeTeam)
                        continue
                    WeekNumber = WeightedProbabilityChoice(WeekSet, None)
                    ScheduleDict[HomeTeam]['ConferenceGames'] += 1
                    ScheduleDict[AwayTeam]['ConferenceGames'] += 1
                else:
                    WeekSet = [(w, (WeeksInSeason - w + 1)) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    if len(WeekSet) == 0:
                        ScheduleDict[HomeTeam]['UnschedulableTeams'].append(AwayTeam)
                        ScheduleDict[AwayTeam]['UnschedulableTeams'].append(HomeTeam)
                        continue
                    WeekNumber = WeightedProbabilityChoice(WeekSet, None)
                    ScheduleDict[HomeTeam]['NonConferenceGames'] += 1
                    ScheduleDict[AwayTeam]['NonConferenceGames'] += 1

                WeekForGame = WeekMap[WeekNumber]

                G = Game(WorldID=WorldID, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = GameTime, WeekID = WeekForGame, TeamRivalryID=TeamRivalryID)
                G.save()

                HomeTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = ScheduleDict[HomeTeam]['CurrentTeamSeason'], IsHomeTeam = True,  GameID = G, OpposingTeamSeasonID=ScheduleDict[AwayTeam]['CurrentTeamSeason'])
                AwayTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = ScheduleDict[AwayTeam]['CurrentTeamSeason'], IsHomeTeam = False, GameID = G, OpposingTeamSeasonID=ScheduleDict[HomeTeam]['CurrentTeamSeason'])
                TeamGamesToSave.append(HomeTeamGame)
                TeamGamesToSave.append(AwayTeamGame)

                ScheduleDict[HomeTeam]['HomeGames'] +=1
                ScheduleDict[AwayTeam]['AwayGames'] +=1

                ScheduleDict[HomeTeam]['WeeksScheduled'].append(WeekNumber)
                ScheduleDict[AwayTeam]['WeeksScheduled'].append(WeekNumber)

                ScheduleDict[HomeTeam]['OpposingTeams'].append(AwayTeam)
                ScheduleDict[AwayTeam]['OpposingTeams'].append(HomeTeam)


        GamesToSchedule = []
        ScheduleLoopCount +=1
        UnscheduledTeams = [t for t in ScheduleDict if len(ScheduleDict[t]['WeeksScheduled']) < GamePerTeam]
        if ScheduleLoopCount > 125:
            for T in UnscheduledTeams:
                if ScheduleDict[T]['ConferenceGames'] < ScheduleDict[T]['TotalConferenceGames']:
                    ScheduleDict[T]['TotalConferenceGames'] -= 1
                    ScheduleDict[T]['TotalNonConferenceGames'] += 1
                elif ScheduleDict[T]['NonConferenceGames'] < ScheduleDict[T]['TotalNonConferenceGames']:
                    ScheduleDict[T]['TotalNonConferenceGames'] -= 1
                    ScheduleDict[T]['TotalConferenceGames'] += 1

    while len(UnscheduledTeams) >= 2 and ScheduleLoopCount > 400:

        UnscheduledConferences = {}

        if ScheduleLoopCount == 1 or (ScheduleLoopCount>0 and ScheduleLoopCount % 5 == 0):
            for T in UnscheduledTeams:
                if ScheduleDict[T]['Conference'] not in UnscheduledConferences:
                    UnscheduledConferences[ScheduleDict[T]['Conference']] = []
                if ScheduleDict[T]['ConferenceGames'] < ConferenceGames:
                    UnscheduledConferences[ScheduleDict[T]['Conference']].append(T)

            for Conf in UnscheduledConferences:
                ConfTeams = UnscheduledConferences[Conf]
                if len(ConfTeams) < 2:
                    continue
                rr = round_robin(ConfTeams, len(ConfTeams))
                for w in rr:
                    GamesToSchedule += w

        elif ScheduleLoopCount == 2:
            GamesToSchedule = [(Rivalry.Team1TeamID, Rivalry.Team2TeamID) for Rivalry in TeamRivalry.objects.filter(WorldID = WorldID) if ScheduleDict[Rivalry.Team1TeamID]['Conference'] != ScheduleDict[Rivalry.Team2TeamID]['Conference']]

        elif ScheduleLoopCount == 3 or ScheduleLoopCount > 6:
            rr = round_robin(UnscheduledTeams, 2)
            for w in rr:
                GamesToSchedule += w

        if ScheduleLoopCount % 2 == 0:
            GamesToSchedule = sorted(GamesToSchedule, key=lambda G: len(ScheduleDict[G[0]]['WeeksScheduled']) + len(ScheduleDict[G[1]]['WeeksScheduled']))

        for game in GamesToSchedule:
            HomeTeam, AwayTeam = game[0], game[1]
            if random.uniform(0,1) < .5:
                HomeTeam, AwayTeam = AwayTeam, HomeTeam
            KeepGame = True

            IsConferenceGame = ((ScheduleDict[HomeTeam]['Conference'] == ScheduleDict[AwayTeam]['Conference']) and (not ScheduleDict[HomeTeam]['ConferenceIsIndependent']))
            if AwayTeam in ScheduleDict[HomeTeam]['OpposingTeams'] or AwayTeam in ScheduleDict[HomeTeam]['UnschedulableTeams'] :
                KeepGame = False
            else:
                if IsConferenceGame:
                    if  (ScheduleDict[HomeTeam]['ConferenceGames'] < ConferenceGames) and (ScheduleDict[AwayTeam]['ConferenceGames'] < ConferenceGames):
                        KeepGame = True
                    else:
                        KeepGame = False

                else:
                    if  ScheduleDict[HomeTeam]['NonConferenceGames'] < NonConferenceGames and ScheduleDict[AwayTeam]['NonConferenceGames'] < NonConferenceGames:
                        KeepGame = True
                    else:
                        KeepGame = False

            if KeepGame:
                if (ScheduleDict[HomeTeam]['HomeGames'] - ScheduleDict[HomeTeam]['AwayGames']) > (ScheduleDict[AwayTeam]['HomeGames'] - ScheduleDict[AwayTeam]['AwayGames']):
                    HomeTeam, AwayTeam = AwayTeam, HomeTeam

                PossibleRivalries = TeamRivalry.objects.filter(Team1TeamID = HomeTeam).filter(Team2TeamID = AwayTeam) | TeamRivalry.objects.filter(Team2TeamID = HomeTeam).filter(Team1TeamID = AwayTeam)
                TeamRivalryID = PossibleRivalries.first()

                GameTime = str(random.choice(GameTimeHourChoices)) + ':' + random.choice(GameTimeMinuteChoices)



                if IsConferenceGame or ScheduleDict[HomeTeam]['ConferenceIsIndependent']:
                    WeekSet = [(w, w**4) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    if len(WeekSet) == 0:
                        ScheduleDict[HomeTeam]['UnschedulableTeams'].append(AwayTeam)
                        ScheduleDict[AwayTeam]['UnschedulableTeams'].append(HomeTeam)
                        continue
                    WeekNumber = WeightedProbabilityChoice(WeekSet, None)
                    ScheduleDict[HomeTeam]['ConferenceGames'] += 1
                    ScheduleDict[AwayTeam]['ConferenceGames'] += 1
                else:
                    WeekSet = [(w, (WeeksInSeason - w + 1)) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    if len(WeekSet) == 0:
                        ScheduleDict[HomeTeam]['UnschedulableTeams'].append(AwayTeam)
                        ScheduleDict[AwayTeam]['UnschedulableTeams'].append(HomeTeam)
                        continue
                    WeekNumber = WeightedProbabilityChoice(WeekSet, None)
                    ScheduleDict[HomeTeam]['NonConferenceGames'] += 1
                    ScheduleDict[AwayTeam]['NonConferenceGames'] += 1

                WeekForGame = WeekMap[WeekNumber]

                G = Game(WorldID=WorldID, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = GameTime, WeekID = WeekForGame, TeamRivalryID=TeamRivalryID)
                G.save()

                HomeTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = ScheduleDict[HomeTeam]['CurrentTeamSeason'], IsHomeTeam = True,  GameID = G, OpposingTeamSeasonID=ScheduleDict[AwayTeam]['CurrentTeamSeason'])
                AwayTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = ScheduleDict[AwayTeam]['CurrentTeamSeason'], IsHomeTeam = False, GameID = G, OpposingTeamSeasonID=ScheduleDict[HomeTeam]['CurrentTeamSeason'])
                TeamGamesToSave.append(HomeTeamGame)
                TeamGamesToSave.append(AwayTeamGame)

                ScheduleDict[HomeTeam]['HomeGames'] +=1
                ScheduleDict[AwayTeam]['AwayGames'] +=1

                ScheduleDict[HomeTeam]['WeeksScheduled'].append(WeekNumber)
                ScheduleDict[AwayTeam]['WeeksScheduled'].append(WeekNumber)

                ScheduleDict[HomeTeam]['OpposingTeams'].append(AwayTeam)
                ScheduleDict[AwayTeam]['OpposingTeams'].append(HomeTeam)


        GamesToSchedule = []
        ScheduleLoopCount +=1
        UnscheduledTeams = [t for t in ScheduleDict if len(ScheduleDict[t]['WeeksScheduled']) < GamePerTeam]

    Game.objects.bulk_create(GamesToSave, ignore_conflicts=True)
    TeamGame.objects.bulk_create(TeamGamesToSave, ignore_conflicts=True)

    TeamGamesToSave = []
    for TG in TeamGame.objects.filter(OpposingTeamGameID = None):
        TG.OpposingTeamGameID = TG.OpposingTeamGame
        TeamGamesToSave.append(TG)

    TeamGame.objects.bulk_update(TeamGamesToSave, ['OpposingTeamGameID'])

    CurrentSeason.ScheduleCreated = True
    CurrentSeason.save()


def AssignTemporaryTeamSeasonID(CurrentWorld, LS,PlayerList , ClassID , IsFreeAgentTeam = False, IsRecruitTeam = False):

    TS = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(LeagueSeasonID = LS).filter(IsRecruitTeam = IsRecruitTeam).filter(IsFreeAgentTeam = IsFreeAgentTeam).first()
    PTS_ToSave = []
    if ClassID is not None:
        PlayerClasses = [ClassID]
    else:
        PlayerClasses = list(Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate'))
    for P in PlayerList:

        PlayerClassID = random.choice(PlayerClasses)

        PTS = PlayerTeamSeason(PlayerID = P, TeamSeasonID = TS, WorldID = CurrentWorld, ClassID = PlayerClassID)
        PTS_ToSave.append(PTS)

    PlayerTeamSeason.objects.bulk_create(PTS_ToSave, ignore_conflicts=False)


def GeneratePlayer(t, s, c, WorldID, PositionAbbreviation = None, PlayerBioData = {}):
    PlayerNumber = 0

    IsRecruit = False
    if c is not None:
        IsRecruit = c.IsRecruit

    PlayerDict = MergeDicts([{'WorldID':WorldID, 'JerseyNumber':PlayerNumber, 'IsRecruit':IsRecruit}, PlayerBioData])

    PlayerDict['DevelopmentRating'] = round(NormalTrunc(0, 1, -3, 3),0)

    PlayerDict['Personality_LeadershipRating'] = NormalBounds(55,15,2,98)
    PlayerDict['Personality_ClutchRating'] = NormalBounds(55,15,2,98)
    PlayerDict['Personality_FriendlyRating'] = NormalBounds(55,15,2,98)
    PlayerDict['Personality_WorkEthicRating'] = NormalBounds(55,12,2,98)
    PlayerDict['Personality_ExpressiveRating'] = NormalBounds(55,12,2,98)
    PlayerDict['Personality_DesireForWinnerRating'] = NormalBounds(55,15,2,98)
    PlayerDict['Personality_LoyaltyRating'] = NormalBounds(50,20,2,98)
    PlayerDict['Personality_DesireForPlayingTimeRating'] = NormalBounds(55,20,2,98)

    P = Player(**PlayerDict)


    return P

def PopulatePlayerSkills(PTS, WorldID):
    PlayerClass = PTS.ClassID.ClassName

    PlayerPosition = PTS.PlayerID.PositionID.PositionAbbreviation

    PlayerArchetypes = PTS.PlayerID.PositionID.system_playerarchetyperatingmodifier_set.all()
    PlayerArchetype = random.choice(PlayerArchetypes)
    PA_Dict = {}

    for PA in PlayerArchetypes:
        PA_Dict[PA] = {'OverallSum': 0, 'WeightSum': 0}

    ClassPhysicalModifierMap = {
        'HS Senior': .96,
        'Freshman': .98,
        'Sophomore': .99,
        'Junior': 1,
        'Senior': 1,
    }

    ClassSkillModifierMap = {
        'HS Senior': .87,
        'Freshman': .91,
        'Sophomore': .95,
        'Junior': 1,
        'Senior': 1,
    }

    ClassAwarenessModifierMap = {
        'HS Senior': .7,
        'Freshman': .8,
        'Sophomore': .90,
        'Junior': 1,
        'Senior': 1,
    }

    CorrelatedSkills = {
        'Agility_Rating': [('Speed_Rating', 2), ('Acceleration_Rating', 1), ],
        'ThrowUnderPressure_Rating': [('ThrowUnderPressure_Rating', 1), ('Awareness_Rating', 2),],
        'ThrowOnRun_Rating': [('ThrowOnRun_Rating', 2), ('Awareness_Rating', 3),('Speed_Rating', 1),],
        'PlayAction_Rating': [('PlayAction_Rating', 2), ('Awareness_Rating', 3),],
        'DeepThrowAccuracy_Rating': [('ShortThrowAccuracy_Rating', 1), ('ThrowPower_Rating', 3),],
        'MediumThrowAccuracy_Rating': [('ShortThrowAccuracy_Rating', 1), ('ThrowPower_Rating', 1),],
        'KickReturn_Rating': [('Speed_Rating', 5), ('Agility_Rating', 2.5),('Acceleration_Rating', 2.5),('BallCarrierVision_Rating', 1),],
        'Release_Rating': [('RouteRunning_Rating', 1), ('Awareness_Rating', 2),('Strength_Rating', 1.5),('Acceleration_Rating', 1),],
        'RouteRunning_Rating': [('RouteRunning_Rating', 3), ('Awareness_Rating', 1)],
    }

    PhysicalSkills = ['Strength_Rating', 'Agility_Rating', 'Speed_Rating', 'Acceleration_Rating', 'Jumping_Rating', 'Stamina_Rating']


    ClassPhysicalModifier = NormalTrunc(ClassPhysicalModifierMap[PlayerClass], .03, .85, 1.1)
    ClassSkillModifier = NormalTrunc(ClassSkillModifierMap[PlayerClass], .03, .85, 1.1)
    BaseSkill =  NormalTrunc(85 * ClassSkillModifier,10,60,99)
    BasePhysical =  NormalTrunc(85 * ClassPhysicalModifier,10,60,99)

    PlayerSkillDict = {'WorldID':WorldID, 'PlayerTeamSeasonID' : PTS}

    OverallSum = 0
    WeightSum = 0
    for Skill in [field.name for field in System_PlayerArchetypeRatingModifier._meta.get_fields() if '_Rating' in field.name and 'Base' not in field.name ]:
        PositionBase = getattr(PlayerArchetype, Skill+'_Base')
        if Skill in PhysicalSkills:
            PlayerSkillDict[Skill] = int(NormalTrunc(BaseSkill *  PositionBase,4,10,99))
        elif Skill == 'Awareness_Rating':
            PlayerSkillDict[Skill] = int(NormalTrunc(75 * ClassAwarenessModifierMap[PlayerClass],10,10,99))
        else:
            PlayerSkillDict[Skill] = int(NormalTrunc(BasePhysical *  PositionBase,4,10,99))


        WeightVal = getattr(PlayerArchetype, Skill)
        OverallSum+= float(PlayerSkillDict[Skill]) * float(WeightVal)
        WeightSum += float(WeightVal)




    PlayerSkillDict['OverallRating'] = OverallSum / WeightSum
    PlayerSkill = PlayerTeamSeasonSkill(**PlayerSkillDict )
    return PlayerSkill


def GenerateCoach(WorldID):

    PlayerNameTuple  = RandomName()
    C = Coach(WorldID=WorldID, CoachFirstName = PlayerNameTuple[0], CoachLastName = PlayerNameTuple[1])


    OffensivePlaybook_List = {'Air Raid': 8
                            , 'Heavy Run': 7
                            , 'Spread Option': 20
                            , 'Spread': 40
                            , 'Pro Style': 20
                            , 'Triple Option': 5}

    OffensivePlaybook_Options = {'Air Raid': {'PassingStrategy': {'Deep Pass': 30, 'Moderate Deep': 30, 'Balanced': 20, 'Moderate Short': 10, 'Short': 10},
                                              'RunningBackStrategy': {'Committee': 20, 'Starter Focused': 50, 'Bellcow': 30},
                                              'QB_Preference': {'West-Coast': 10, 'Dual Threat': 10, 'Option': 0, 'Game Manager': 30, 'Pocket Passer': 30, 'Balanced': 20},
                                              'RB_Preference': {'Bruiser': 0, 'Receiving': 60, 'Elusive': 20, 'Balanced': 20},
                                              'WR_Preference': {'Slot': 20, 'Deep Threat': 50, 'Possession': 10, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 20, 'Blocking': 0, 'Vertical Threat': 50, 'Balanced': 30},
                                              'OL_Preference': {'Pass Block': 80, 'Run Block': 0, 'Balanced': 20},
                                              'SituationalAggressivenessTendency': [1.1],
                                              'PlaycallPassTendency': [65, 5, 60, 90],
                                              'PlayClockAggressivenessTendency': [1.2]}

                            , 'Heavy Run':   {'PassingStrategy': {'Deep Pass': 0, 'Moderate Deep': 10, 'Balanced': 30, 'Moderate Short': 30, 'Short': 30},
                                              'RunningBackStrategy': {'Committee': 0, 'Starter Focused': 50, 'Bellcow': 50},
                                              'QB_Preference': {'West-Coast': 10, 'Dual Threat': 0, 'Option': 0, 'Game Manager': 30, 'Pocket Passer': 30, 'Balanced': 20},
                                              'RB_Preference': {'Bruiser': 80, 'Receiving': 0, 'Elusive': 20, 'Balanced': 20},
                                              'WR_Preference': {'Slot': 10, 'Deep Threat': 0, 'Possession': 80, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 10, 'Blocking': 80, 'Vertical Threat': 0, 'Balanced': 30},
                                              'OL_Preference': {'Pass Block': 0, 'Run Block': 100, 'Balanced': 20},
                                              'SituationalAggressivenessTendency': [.8],
                                              'PlaycallPassTendency': [40, 5, 20, 50],
                                              'PlayClockAggressivenessTendency': [.8]}

                            , 'Spread Option':{'PassingStrategy': {'Deep Pass': 0, 'Moderate Deep': 10, 'Balanced': 30, 'Moderate Short': 30, 'Short': 30},
                                              'RunningBackStrategy': {'Committee': 50, 'Starter Focused': 50, 'Bellcow': 0},
                                              'QB_Preference': {'West-Coast': 10, 'Dual Threat': 80, 'Option': 10, 'Game Manager': 0, 'Pocket Passer': 0, 'Balanced': 0},
                                              'RB_Preference': {'Bruiser': 10, 'Receiving': 10, 'Elusive': 80, 'Balanced': 20},
                                              'WR_Preference': {'Slot': 30, 'Deep Threat': 0, 'Possession': 80, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 40, 'Blocking': 40, 'Vertical Threat': 0, 'Balanced': 10},
                                              'OL_Preference': {'Pass Block': 50, 'Run Block': 50, 'Balanced': 50},
                                              'SituationalAggressivenessTendency': [1.2],
                                              'PlaycallPassTendency': [50, 10, 30, 90],
                                              'PlayClockAggressivenessTendency': [1.2]}

                            , 'Spread':      {'PassingStrategy': {'Deep Pass': 30, 'Moderate Deep': 30, 'Balanced': 30, 'Moderate Short': 10, 'Short': 10},
                                              'RunningBackStrategy': {'Committee': 30, 'Starter Focused': 30, 'Bellcow': 30},
                                              'QB_Preference': {'West-Coast': 30, 'Dual Threat': 40, 'Option': 0, 'Game Manager': 0, 'Pocket Passer': 30, 'Balanced': 30},
                                              'RB_Preference': {'Bruiser': 0, 'Receiving': 50, 'Elusive': 50, 'Balanced': 20},
                                              'WR_Preference': {'Slot': 40, 'Deep Threat': 80, 'Possession': 10, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 40, 'Blocking': 0, 'Vertical Threat': 50, 'Balanced': 10},
                                              'OL_Preference': {'Pass Block': 50, 'Run Block': 20, 'Balanced': 50},
                                              'SituationalAggressivenessTendency': [1.1],
                                              'PlaycallPassTendency': [60, 5, 50, 90],
                                              'PlayClockAggressivenessTendency': [1.1]}

                            , 'Pro Style':   {'PassingStrategy': {'Deep Pass': 0, 'Moderate Deep': 20, 'Balanced': 100, 'Moderate Short': 20, 'Short': 0},
                                              'RunningBackStrategy': {'Committee': 0, 'Starter Focused': 30, 'Bellcow': 0},
                                              'QB_Preference': {'West-Coast': 30, 'Dual Threat': 0, 'Option': 0, 'Game Manager': 0, 'Pocket Passer': 30, 'Balanced': 30},
                                              'RB_Preference': {'Bruiser': 40, 'Receiving': 0, 'Elusive': 0, 'Balanced': 20},
                                              'WR_Preference': {'Slot': 0, 'Deep Threat': 0, 'Possession': 10, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 40, 'Blocking': 30, 'Vertical Threat': 0, 'Balanced': 10},
                                              'OL_Preference': {'Pass Block': 0, 'Run Block': 0, 'Balanced': 50},
                                              'SituationalAggressivenessTendency': [.8],
                                              'PlaycallPassTendency': [50, 5, 20, 90],
                                              'PlayClockAggressivenessTendency': [.9]}
                            , 'Triple Option':{'PassingStrategy': {'Deep Pass': 0, 'Moderate Deep': 0, 'Balanced': 10, 'Moderate Short': 20, 'Short': 40},
                                              'RunningBackStrategy': {'Committee': 100, 'Starter Focused': 1, 'Bellcow': 0},
                                              'QB_Preference': {'West-Coast': 0, 'Dual Threat': 10, 'Option': 90, 'Game Manager': 0, 'Pocket Passer': 0, 'Balanced': 0},
                                              'RB_Preference': {'Bruiser': 40, 'Receiving': 0, 'Elusive': 40, 'Balanced': 10},
                                              'WR_Preference': {'Slot': 0, 'Deep Threat': 0, 'Possession': 100, 'Balanced': 20},
                                              'TE_Preference': {'Possession': 0, 'Blocking': 50, 'Vertical Threat': 0, 'Balanced': 10},
                                              'OL_Preference': {'Pass Block': 0, 'Run Block': 100, 'Balanced': 1},
                                              'SituationalAggressivenessTendency': [.8],
                                              'PlaycallPassTendency': [25, 2, 20, 35],
                                              'PlayClockAggressivenessTendency': [.7]}}

    DefensivePlaybook_List = {'4-3': 40
                            , '3-4': 40
                            , '3-3-5': 10
                            , '4-2-5': 10}

    DefensivePlaybook_Options = {'4-3': {'CoverageStyleStrategy': {'All-Man': 20, 'Man Focused': 20, 'Mixed': 20, 'Zone Focused': 20, 'All-Zone': 20},
                                         'BlitzStrategy': {'Heavy Blitz': 10, 'Blitz': 20, 'Balanced': 30, 'Some Blitz': 20, 'No Blitz': 10},
                                         'DE_Preference': {'Pass Rush': 50, 'Run Stuff': 10, 'Balanced': 30},
                                         'DT_Preference': {'Pass Rush': 50, 'Run Stuff': 10, 'Balanced': 30},
                                         'OLB_Preference': {'Pass Rush': 0, 'Pass Coverage': 30, 'Run Stuff': 10, 'Balanced': 30},
                                         'MLB_Preference': {'Field General': 30, 'Pass Coverage': 30, 'Run Stuff': 0, 'Balanced': 30},
                                         'CB_Preference': {'Man-to-Man': 40, 'Zone': 30, 'Balanced': 30},
                                         'S_Preference': {'Hybrid': 30, 'Run Support': 30, 'Zone Coverage': 30, 'Balanced': 30},}

                            , '3-4': {   'CoverageStyleStrategy': {'All-Man': 5, 'Man Focused': 5, 'Mixed': 20, 'Zone Focused': 20, 'All-Zone': 20},
                                         'BlitzStrategy': {'Heavy Blitz': 30, 'Blitz': 30, 'Balanced': 30, 'Some Blitz': 10, 'No Blitz': 0},
                                         'DE_Preference': {'Pass Rush': 10, 'Run Stuff': 50, 'Balanced': 30},
                                         'DT_Preference': {'Pass Rush': 0, 'Run Stuff': 100, 'Balanced': 10},
                                         'OLB_Preference': {'Pass Rush': 50, 'Pass Coverage': 0, 'Run Stuff': 40, 'Balanced': 10},
                                         'MLB_Preference': {'Field General': 0, 'Pass Coverage': 30, 'Run Stuff': 40, 'Balanced': 10},
                                         'CB_Preference': {'Man-to-Man': 10, 'Zone': 50, 'Balanced': 30},
                                         'S_Preference': {'Hybrid': 30, 'Run Support': 30, 'Zone Coverage': 30, 'Balanced': 30},}

                            , '3-3-5': { 'CoverageStyleStrategy': {'All-Man': 5, 'Man Focused': 25, 'Mixed': 20, 'Zone Focused': 20, 'All-Zone': 10},
                                         'BlitzStrategy': {'Heavy Blitz': 0, 'Blitz': 10, 'Balanced': 30, 'Some Blitz': 40, 'No Blitz': 40},
                                         'DE_Preference': {'Pass Rush': 10, 'Run Stuff': 50, 'Balanced': 30},
                                         'DT_Preference': {'Pass Rush': 0, 'Run Stuff': 100, 'Balanced': 10},
                                         'OLB_Preference': {'Pass Rush': 50, 'Pass Coverage': 0, 'Run Stuff': 40, 'Balanced': 10},
                                         'MLB_Preference': {'Field General': 0, 'Pass Coverage': 30, 'Run Stuff': 40, 'Balanced': 10},
                                         'CB_Preference': {'Man-to-Man': 10, 'Zone': 50, 'Balanced': 30},
                                         'S_Preference': {'Hybrid': 30, 'Run Support': 30, 'Zone Coverage': 30, 'Balanced': 30},}

                            , '4-2-5': { 'CoverageStyleStrategy': {'All-Man': 45, 'Man Focused': 25, 'Mixed': 20, 'Zone Focused': 0, 'All-Zone': 0},
                                         'BlitzStrategy': {'Heavy Blitz': 30, 'Blitz': 30, 'Balanced': 30, 'Some Blitz': 10, 'No Blitz': 0},
                                         'DE_Preference': {'Pass Rush': 90, 'Run Stuff': 0, 'Balanced': 10},
                                         'DT_Preference': {'Pass Rush': 90, 'Run Stuff': 10, 'Balanced': 10},
                                         'OLB_Preference': {'Pass Rush': 10, 'Pass Coverage': 0, 'Run Stuff': 40, 'Balanced': 10},
                                         'MLB_Preference': {'Field General': 0, 'Pass Coverage': 30, 'Run Stuff': 40, 'Balanced': 10},
                                         'CB_Preference': {'Man-to-Man': 50, 'Zone': 50, 'Balanced': 30},
                                         'S_Preference': {'Hybrid': 30, 'Run Support': 30, 'Zone Coverage': 30, 'Balanced': 30},}}

    ChosenOffense = WeightedProbabilityChoice(OffensivePlaybook_List, 'Spread')
    C.OffensivePlaybook = ChosenOffense
    for GameplanKey in OffensivePlaybook_Options[ChosenOffense]:
        if GameplanKey in ['SituationalAggressivenessTendency', 'PlayClockAggressivenessTendency']:
            Modifier = OffensivePlaybook_Options[ChosenOffense][GameplanKey][0]
            setattr(C, GameplanKey, NormalVariance(Modifier))

        elif GameplanKey in ['PlaycallPassTendency']:
            Mean = OffensivePlaybook_Options[ChosenOffense][GameplanKey][0]
            Sigma = OffensivePlaybook_Options[ChosenOffense][GameplanKey][1]
            Min = OffensivePlaybook_Options[ChosenOffense][GameplanKey][2]
            Max = OffensivePlaybook_Options[ChosenOffense][GameplanKey][3]

            setattr(C, GameplanKey, NormalTrunc(Mean, Sigma, Min, Max))
        else:
            setattr(C, GameplanKey, WeightedProbabilityChoice(OffensivePlaybook_Options[ChosenOffense][GameplanKey]))

    ChosenDefense = WeightedProbabilityChoice(DefensivePlaybook_List, '4-3')
    C.DefensivePlaybook = ChosenDefense

    for GameplanKey in DefensivePlaybook_Options[ChosenDefense]:
        setattr(C, GameplanKey, WeightedProbabilityChoice(DefensivePlaybook_Options[ChosenDefense][GameplanKey]))


    C.CoachAge = random.randint(35,70)

    C.ReputationRating       =  NormalBounds(50, 10, 30,99)
    C.CharismaRating         =  NormalBounds(50, 10, 30,99)
    C.ScoutingRating         =  NormalBounds(50, 10, 30,99)


    C.GameplanRating         =  NormalBounds(50, 10, 30,89)
    C.InGameAdjustmentRating =  NormalBounds(C.GameplanRating, 3, 30,99)

    TeachingBaseline = int(NormalBounds(50, 10, 30,89))
    C.TeachSkills   =  random.randint(TeachingBaseline-10, TeachingBaseline+10)

    Patience = NormalVariance(1, 7)
    C.PatienceTendency = Patience
    PatienceModifier = 1.0 + (Patience / 10.0)
    C.VeteranTendency  = NormalVariance(PatienceModifier, 7)
    C.RedshirtTendency  = NormalVariance(PatienceModifier, 7)

    return C



def CreatePlayers(LS, WorldID):

    PlayersPerTeam = 75

    MinimumRosterComposition = {
        'ClassID': {c.ClassID: 13 for c in Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate')},
        'Position': [u for u in Position.objects.all().values('PositionAbbreviation', 'PositionMinimumCountPerTeam','PositionMaximumCountPerTeam', 'PositionTypicalStarterCountPerTeam').annotate(Position = F('PositionAbbreviation'))]
    }
    ClassOverallNormalizer = {
        C.ClassID: C.OverallNormalizer for C in Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate').annotate(
            OverallNormalizer = Case(
                When(ClassAbbreviation = 'FR', then=Value(1.09)),
                When(ClassAbbreviation = 'SO', then=Value(1.06)),
                When(ClassAbbreviation = 'JR', then=Value(1.03)),
                When(ClassAbbreviation = 'SR', then=Value(1.0)),
                default=Value(1.0),
                output_field=FloatField()
            )
        )
    }
    PositionNumbers = {
        'QB': [(1,18)],
        'RB': [(20, 35)],
        'FB': [(20, 59)],
        'WR': [(1,19), (80, 89)],
        'TE': [(70,89) ],
        'OT': [(50,69)],
        'OG': [(50,69)],
        'OC': [(50,69)],
        'DE': [(50,59), (70, 79), (90,99)],
        'DT': [(50,59), (70, 79), (90,99)],
        'OLB': [(40,59)],
        'MLB': [(40,59)],
        'CB': [(20,45)],
        'S': [(20,45)],
        'K': [(60,99)],
        'P': [(60,99)],
    }
    TeamRosterCompositionNeeds = {}

    NamesDict = None
    AllTeams = Team.objects.filter(WorldID = WorldID)
    NumberOfTeams = AllTeams.count()
    CurrentSeason = LS
    CurrentWorld = WorldID
    TeamsThatNeedPlayers = []
    PlayerTeamSeasonList = PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True)
    NumberOfPlayersNeeded = (PlayersPerTeam +  4) *  NumberOfTeams
    NumberOfPlayersNeeded -= PlayerTeamSeasonList.count()

    DraftTeamList = list(TeamSeason.objects.filter(WorldID_id = WorldID).filter(TeamID__isnull = False).annotate(
        TeamPrestige = Max('teamseasoninforating__TeamRating', filter=Q(teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),
        AdjustedTeamPrestige=(F('TeamPrestige') * 1.0 /10)**3.5))
    TeamDict = {}
    for TS in DraftTeamList:
        TeamDict[TS] = {'TeamPrestige': int(TS.AdjustedTeamPrestige), 'PlayerCount': 0, 'StopNumber': None, 'Top100':0, 'Top250': 0, 'Top500': 0, 'Top1000': 0, 'PositionPreference': {}}
        TeamDict[TS]['PositionPreference']['Offense'] = NormalTrunc(1.05, 0.1, .5, 1.5)
        TeamDict[TS]['PositionPreference']['Defense'] = 2 - TeamDict[TS]['PositionPreference']['Offense']
        TeamDict[TS]['PositionPreference']['Special Teams'] = .75
        TeamDict[TS]['TSP'] = TS.CurrentTeamSeasonPosition

    DraftOrder = []
    for u in range(int(NumberOfPlayersNeeded * 1.2)):
        T = [(T, TeamDict[T]['TeamPrestige']) for T in TeamDict if TeamDict[T]['PlayerCount'] < PlayersPerTeam]
        if len(T) == 0:
            break
        SelectedTeam = WeightedProbabilityChoice(T, T[0])
        TeamDict[SelectedTeam]['PlayerCount'] +=1
        if TeamDict[SelectedTeam]['PlayerCount'] >= PlayersPerTeam:
            TeamDict[SelectedTeam]['StopNumber'] = u

        DraftOrder.append(SelectedTeam)

        if u <= 100:
            TeamDict[SelectedTeam]['Top100'] +=1
        if u <= 250:
            TeamDict[SelectedTeam]['Top250'] +=1
        if u <= 500:
            TeamDict[SelectedTeam]['Top500'] +=1
        if u <= 1000:
            TeamDict[SelectedTeam]['Top1000'] +=1

    for T in sorted(TeamDict, key=lambda T: TeamDict[T]['TeamPrestige']):
        for pick in range(0,4):
            DraftOrder.append(T)


    pd.set_option('display.max_rows', None)

    df = pd.DataFrame(TeamDict)
    df = df.transpose()
    print(df)

    PlayerPool = []

    PlayerBioData = PlayerBioDataList(NumberOfPlayersNeeded, PositionID = None)
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        #print(PlayerCount)
        PlayerPool.append(GeneratePlayer(None, CurrentSeason, None, WorldID, PlayerBioData = PlayerBioData[PlayerCount]))
    Player.objects.bulk_create(PlayerPool, ignore_conflicts=False)

    PlayerList = Player.objects.filter(WorldID = WorldID)

    AssignTemporaryTeamSeasonID(WorldID, LS,PlayerList, ClassID = None, IsFreeAgentTeam = True, IsRecruitTeam = False)
    PlayerTeamSeasonList = PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = LS)

    PlayerSkillPool = []
    for PTS in PlayerTeamSeasonList:
        PlayerSkillPool.append(PopulatePlayerSkills(PTS, WorldID))
    PlayerTeamSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=False)

    PlayerPool = [u for u in PlayerTeamSeasonList.values('PlayerTeamSeasonID', 'PlayerID', 'ClassID', 'playerteamseasonskill__OverallRating','playerteamseasonskill__Strength_Rating','playerteamseasonskill__Agility_Rating','playerteamseasonskill__Speed_Rating','playerteamseasonskill__Acceleration_Rating','playerteamseasonskill__Stamina_Rating','playerteamseasonskill__Awareness_Rating','playerteamseasonskill__Jumping_Rating','playerteamseasonskill__ThrowPower_Rating'    ,'playerteamseasonskill__ShortThrowAccuracy_Rating'    ,'playerteamseasonskill__MediumThrowAccuracy_Rating'    ,'playerteamseasonskill__DeepThrowAccuracy_Rating'    ,'playerteamseasonskill__ThrowOnRun_Rating'    ,'playerteamseasonskill__ThrowUnderPressure_Rating'    ,'playerteamseasonskill__PlayAction_Rating', 'playerteamseasonskill__PassRush_Rating', 'playerteamseasonskill__BlockShedding_Rating', 'playerteamseasonskill__Tackle_Rating', 'playerteamseasonskill__HitPower_Rating', 'playerteamseasonskill__ManCoverage_Rating', 'playerteamseasonskill__ZoneCoverage_Rating', 'playerteamseasonskill__Press_Rating', 'playerteamseasonskill__Carrying_Rating', 'playerteamseasonskill__Elusiveness_Rating', 'playerteamseasonskill__BallCarrierVision_Rating', 'playerteamseasonskill__BreakTackle_Rating', 'playerteamseasonskill__Catching_Rating', 'playerteamseasonskill__CatchInTraffic_Rating', 'playerteamseasonskill__RouteRunning_Rating', 'playerteamseasonskill__Release_Rating', 'playerteamseasonskill__PassBlock_Rating', 'playerteamseasonskill__RunBlock_Rating', 'playerteamseasonskill__ImpactBlock_Rating', 'playerteamseasonskill__KickPower_Rating', 'playerteamseasonskill__KickAccuracy_Rating').annotate(
        Position = F('PlayerID__PositionID__PositionAbbreviation'),
        PositionGroup = F('PlayerID__PositionID__PositionGroupID__PositionGroupName')
    ).order_by('-playerteamseasonskill__OverallRating')]

    PlayersTeamSeasonToUpdate = []

    count = 0
    print('Drafting players!')
    for TS in DraftOrder:

        count +=1
        if count % 100 == 0:
            print('Drafting player', count)
        TSP = TeamDict[TS]['TSP']
        if TS not in TeamRosterCompositionNeeds:
            TeamRosterCompositionNeeds[TS] = {'ClassID': MinimumRosterComposition['ClassID'], 'PositionMaximums': {Pos['Position']: Pos['PositionMaximumCountPerTeam'] for Pos in MinimumRosterComposition['Position']}, 'StarterPosition': {Pos['Position']: Pos['PositionTypicalStarterCountPerTeam'] for Pos in MinimumRosterComposition['Position']},'FullPosition': {Pos['Position']: Pos['PositionMinimumCountPerTeam'] for Pos in MinimumRosterComposition['Position']}}
        ClassesNeeded =   [u for u in TeamRosterCompositionNeeds[TS]['ClassID']    if TeamRosterCompositionNeeds[TS]['ClassID'][u]    > 0 ]
        StartersNeeded = [u for u in TeamRosterCompositionNeeds[TS]['StarterPosition'] if TeamRosterCompositionNeeds[TS]['StarterPosition'][u] >= 0 ]
        PositionsNeeded = [u for u in TeamRosterCompositionNeeds[TS]['FullPosition'] if TeamRosterCompositionNeeds[TS]['FullPosition'][u] > 0 ]

        ClassNeedModifier = {}
        for C in TeamRosterCompositionNeeds[TS]['ClassID']:
            if TeamRosterCompositionNeeds[TS]['ClassID'][C] > 6:
                ClassNeedModifier[C] = 1.1
            elif TeamRosterCompositionNeeds[TS]['ClassID'][C] > 3:
                ClassNeedModifier[C] = 1.05
            elif TeamRosterCompositionNeeds[TS]['ClassID'][C] > 0:
                ClassNeedModifier[C] = 1.0
            else:
                ClassNeedModifier[C] = .95

        PositionNeedModifier = {}
        for P in TeamRosterCompositionNeeds[TS]['StarterPosition']:
            if TeamRosterCompositionNeeds[TS]['StarterPosition'][P] > 0:
                PositionNeedModifier[P] = 1.5
            elif TeamRosterCompositionNeeds[TS]['FullPosition'][P] > 0:
                PositionNeedModifier[P] = 1.1
            elif TeamRosterCompositionNeeds[TS]['FullPosition'][P] < -2:
                PositionNeedModifier[P] = .5
            elif TeamRosterCompositionNeeds[TS]['FullPosition'][P] <= 0:
                PositionNeedModifier[P] = .9
            else:
                PositionNeedModifier[P] = 1.0

        ClassNeedsMet = False
        StarterNeedsMet = False
        PositionNeedsMet = False

        if len(ClassesNeeded) == 0:
            ClassNeedsMet = True
        if len(PositionsNeeded) == 0:
            PositionNeedsMet = True
        if len(StartersNeeded) == 0:
            StarterNeedsMet = True

        AvailablePlayers = []
        AP_count = 0
        while len(AvailablePlayers) == 0:
            AvailablePlayers = [u for u in PlayerPool  if ( TeamRosterCompositionNeeds[TS]['PositionMaximums'][u['Position']] > 0)]
            if AP_count == 0:
                AvailablePlayers = [u for u in AvailablePlayers  if (StarterNeedsMet or u['Position'] in StartersNeeded) and (ClassNeedsMet or u['ClassID'] in ClassesNeeded)]
            elif AP_count == 1:
                AvailablePlayers = [u for u in AvailablePlayers  if (StarterNeedsMet or u['Position'] in StartersNeeded)]
            elif AP_count == 2:
                AvailablePlayers = [u for u in AvailablePlayers  if (ClassNeedsMet or u['ClassID'] in ClassesNeeded) and (PositionNeedsMet or u['Position'] in PositionsNeeded)]
            elif AP_count == 3:
                AvailablePlayers = [u for u in AvailablePlayers  if (PositionNeedsMet or u['Position'] in PositionsNeeded)]
            else :
                AvailablePlayers = [u for u in PlayerPool]
            AP_count += 1


        #AvailablePlayers = sorted(AvailablePlayers, key=lambda P: CalculateTeamPlayerOverall(TSP[P['Position']], P) * ClassOverallNormalizer[P['ClassID']] * ClassNeedModifier[P['ClassID']] * PositionNeedModifier[P['Position']] * TeamDict[T]['PositionPreference'][P['PositionID__PositionGroupID__PositionGroupName']], reverse=True)
        AvailablePlayers = sorted(AvailablePlayers, key=lambda P: P['playerteamseasonskill__OverallRating'] * ClassOverallNormalizer[P['ClassID']] * ClassNeedModifier[P['ClassID']] * PositionNeedModifier[P['Position']] * TeamDict[TS]['PositionPreference'][P['PositionGroup']], reverse=True)


        if len(AvailablePlayers) < 5:
            PlayerForTeam = random.choice(AvailablePlayers)
        else:
            AvailablePlayers = AvailablePlayers[:4]
            PlayerForTeam = random.choice(AvailablePlayers)
        PlayerPool.remove(PlayerForTeam)

        TeamRosterCompositionNeeds[TS]['ClassID'][PlayerForTeam['ClassID']] -=1
        TeamRosterCompositionNeeds[TS]['FullPosition'][PlayerForTeam['Position']] -=1
        TeamRosterCompositionNeeds[TS]['StarterPosition'][PlayerForTeam['Position']] -=1
        TeamRosterCompositionNeeds[TS]['PositionMaximums'][PlayerForTeam['Position']] -=1

        PlayerTeamSeason.objects.filter(PlayerTeamSeasonID = PlayerForTeam['PlayerTeamSeasonID']).update(TeamSeasonID = TS)


    PlayerClasses = list(Class.objects.filter(IsUpperClassman = True))
    PlayerSkillPool = []
    for TS in TeamRosterCompositionNeeds:
        print('Creating players to fill holes for', TS)
        for Pos in TeamRosterCompositionNeeds[TS]['FullPosition']:
            if TeamRosterCompositionNeeds[TS]['FullPosition'][Pos] > 0:
                for u in range(TeamRosterCompositionNeeds[TS]['FullPosition'][Pos]):

                    PlayerBioData = PlayerBioDataList(1, PositionAbbreviation = Pos)
                    NewPlayer = GeneratePlayer(None, CurrentSeason, None, WorldID, Pos, PlayerBioData = PlayerBioData[0])
                    NewPlayer.save()

                    PlayerClassID = random.choice(PlayerClasses)

                    PTS = PlayerTeamSeason(WorldID=WorldID, TeamSeasonID = TS, PlayerID = NewPlayer, ClassID = PlayerClassID)
                    PTS.save()

                    PlayerSkillPool.append(PopulatePlayerSkills(PTS, WorldID))

    PlayerTeamSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=True)
    PlayerTeamSeason.objects.bulk_update(PlayersTeamSeasonToUpdate, ['TeamSeasonID'])

    PlayersToSave = []
    for TS in DraftTeamList:

        TS.PopulateTeamOverallRating()
        TS.save()

        TakenNumbers = []
        for PTS in TS.playerteamseason_set.filter(PlayerID__JerseyNumber = 0):
            P = PTS.PlayerID
            Pos = P.PositionID.PositionAbbreviation
            NumberRanges = PositionNumbers[Pos]
            PlayerNumbers = []
            for Ranges in NumberRanges:
                PlayerNumbers += [u for u in range(Ranges[0], Ranges[1]+1) if u not in TakenNumbers]
            if len(PlayerNumbers) > 0:
                N = random.choice(PlayerNumbers)
                P.JerseyNumber = N
                TakenNumbers.append(N)
                PlayersToSave.append(P)

    Player.objects.bulk_update(PlayersToSave, ['JerseyNumber'])

    CurrentSeason.PlayersCreated = True
    CurrentSeason.save()

    CurrentWorld.HasPlayers = True
    CurrentWorld.save()


def CreateRecruitingClass(LS, WorldID):

    TeamsThatNeedPlayers = []
    NumberOfPlayersNeeded = 0
    CurrentSeason = LS
    CurrentWorld = WorldID
    RecruitsPerTeam = 22
    TeamContactsPerRecruit = 12
    RecruitStateInterestModifier = 1
    RecruitTeamPrestigeInterestModifier = 15
    RecruitContactsPerTeam = int(RecruitsPerTeam * TeamContactsPerRecruit)

    AllTeamSeasons = TeamSeason.objects.filter(WorldID=WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).annotate(
        PlayerCount = Count('playerteamseason__PlayerTeamSeasonID'),
        SeniorCount = Count('playerteamseason__PlayerTeamSeasonID', filter=Q(playerteamseason__ClassID__ClassAbbreviation = 'SR')),
    )
    NumTeams = AllTeamSeasons.count()
    NumberOfExistingRecruits = Player.objects.filter(WorldID=WorldID, IsRecruit = True).count()
    NumberOfPlayersNeeded = int(RecruitsPerTeam * NumTeams) - NumberOfExistingRecruits


    TeamSeason.objects.filter(WorldID=WorldID).filter(LeagueSeasonID = LS).filter(TeamID__isnull = False).annotate(
        PlayerCount = Count('playerteamseason__PlayerTeamSeasonID'),
        SeniorCount = Count('playerteamseason__PlayerTeamSeasonID', filter=Q(playerteamseason__ClassID__ClassAbbreviation = 'SR')),
    )

    TeamSeason_ToSave = []
    for TS in AllTeamSeasons:
        TeamSeniors = TS.SeniorCount
        TS.ScholarshipsToOffer = int(TeamSeniors * 1.2)
        TeamSeason_ToSave.append(TS)

    TeamSeason.objects.bulk_update(TeamSeason_ToSave, ['ScholarshipsToOffer'])

    PlayerPool = []
    SeniorClassID = Class.objects.filter(ClassName = 'HS Senior').first()

    PlayerBioData = PlayerBioDataList(NumberOfPlayersNeeded, PositionID = None)
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        PlayerPool.append(GeneratePlayer(None, CurrentSeason, SeniorClassID, WorldID, PlayerBioData=PlayerBioData[PlayerCount]))

    Player.objects.bulk_create(PlayerPool, ignore_conflicts=False)

    print('Recruits created', len(connection.queries))

    PlayerList = Player.objects.filter(WorldID = WorldID).filter(IsRecruit = True)

    AssignTemporaryTeamSeasonID(WorldID, LS,PlayerList, ClassID = SeniorClassID, IsFreeAgentTeam = False, IsRecruitTeam = True)
    PlayerTeamSeasonList = PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = LS).filter(PlayerID__IsRecruit = True)
    print('Recruits assigned Temp TS', len(connection.queries))
    PlayerSkillPool = []
    for PTS in PlayerTeamSeasonList:
        PlayerSkillPool.append(PopulatePlayerSkills(PTS, WorldID))
    PlayerTeamSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=False)


    PlayerTeamSeasons_ForMeasurables = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__LeagueSeasonID = LS).filter(TeamSeasonID__IsRecruitTeam = True).select_related('PlayerID').select_related('playerteamseasonskill').annotate(
        Position = F('PlayerID__PositionID__PositionAbbreviation'),
        PositionGroup = F('PlayerID__PositionID__PositionGroupID__PositionGroupName'),
        State = F('PlayerID__CityID__StateID'),
        OverallRating = F('playerteamseasonskill__OverallRating')
    )

    Players_ToSave = []
    for PTS in PlayerTeamSeasons_ForMeasurables:
        PTS.PlayerID.Recruiting_40Time = round(NormalTrunc((PTS.playerteamseasonskill.Speed_Rating - 234.33) / (-32.16), .1, 4.0, 7.0),2)
        if PTS.playerteamseasonskill.Strength_Rating > 55:
            PTS.PlayerID.Recruiting_BenchPressReps = int(NormalTrunc((PTS.playerteamseasonskill.Strength_Rating - 55), 3, 0, 55))

        PTS.PlayerID.Recruiting_VerticalJump = round(NormalTrunc((PTS.playerteamseasonskill.Jumping_Rating - 23.61) / 1.74, 2, 0,45  ), 2)
        Players_ToSave.append(PTS.PlayerID)

    Player.objects.bulk_update(Players_ToSave, ['Recruiting_40Time', 'Recruiting_BenchPressReps', 'Recruiting_VerticalJump'])
    print('Recruit measurables updated', len(connection.queries))
    StarDistribution = {5:.0166,
                        4:.1,
                        3:.3,
                        2:.6,
                        1: 1.0}

    TITDict = {TIT['AttributeName']: TIT for TIT in TeamInfoTopic.objects.values('TeamInfoTopicID','AttributeName','RecruitMatchIsComputed','RecruitInterestWeight')}


    PositionalRankingTracker = {}
    StateRankingTracker = {}

    RecruitStateInterestModifier = 1
    RecruitTeamPrestigeInterestModifier = 2

    RecruitSchoolDistanceMap = {
        'Home Town':     {'LowerBound': 0, 'UpperBound': 40, 'PointValue': 100},
        'Near-by':       {'LowerBound': 41, 'UpperBound': 150, 'PointValue': 80},
        'Local':         {'LowerBound': 151, 'UpperBound': 300, 'PointValue': 65},
        'Regional':      {'LowerBound': 301, 'UpperBound': 500, 'PointValue': 50},
        'National':      {'LowerBound': 501, 'UpperBound': 850, 'PointValue': 35},
        'National':      {'LowerBound': 851, 'UpperBound': 1200, 'PointValue': 20},
        'International': {'LowerBound': 1201, 'UpperBound': 10000, 'PointValue': 5},
    }

    TeamSeasonList = TeamSeason.objects.filter(TeamID__isnull = False).filter(WorldID = CurrentWorld).filter(LeagueSeasonID = LS).filter(ScholarshipsToOffer__gte = 0).filter(coachteamseason__CoachPositionID__CoachPositionAbbreviation = 'HC').values('TeamSeasonID', 'TeamID', 'TeamID__CityID__Latitude', 'TeamID__CityID__Longitude', 'coachteamseason__CoachID__ScoutingRating' ).annotate(
        CoachScoutVariance = Case(
            When(coachteamseason__CoachID__ScoutingRating__gte = 90, then=1),
            When(coachteamseason__CoachID__ScoutingRating__gte = 70, coachteamseason__CoachID__ScoutingRating__lt = 90, then=2),
            When(coachteamseason__CoachID__ScoutingRating__gte = 45, coachteamseason__CoachID__ScoutingRating__lt = 70, then=3),
            default=Value(4),
            output_field = IntegerField()
        ),
        TeamPrestige = Max('teamseasoninforating__TeamRating', filter=Q(teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),

        TeamPrestigeValue = ExpressionWrapper(ExpressionWrapper(F('TeamPrestige') * 1.0 / 10, output_field=IntegerField()) ** 2, output_field=IntegerField()),
        ChampionshipContenderValue = F('TeamPrestigeValue'),
        PlayingTimeValue  =Value(50, output_field=IntegerField()),
        CoachStyleValue = Value(50, output_field=IntegerField())
    ).order_by('-TeamPrestige')

    TSDict = {}
    for T in TeamSeasonList:
        AddKey = {}
        for k in T:
            NewKey = k.replace('TeamID__', '')
            AddKey[NewKey] = T[k]
        for k in AddKey:
            T[k] = AddKey[k]
        T['TeamCity'] = {'Longitude': T['CityID__Longitude'], 'Latitude': T['CityID__Latitude']}
        T['TeamSeasonInfoRatingDict'] = {I['TeamInfoTopicID__AttributeName']: I['TeamRating'] for I in TeamSeasonInfoRating.objects.filter(TeamSeasonID_id = T['TeamSeasonID']).values('TeamInfoTopicID','TeamInfoTopicID__AttributeName', 'TeamSeasonInfoRatingID', 'TeamRating')}
        TSPList = TeamSeasonPosition.objects.filter(TeamSeasonID__LeagueSeasonID = LS).filter(TeamSeasonID_id = T['TeamSeasonID']).select_related('PositionID')
        T['TSPDict'] = {}
        for TSP in TSPList:
            T['TSPDict'][TSP.PositionID.PositionAbbreviation] = TSP

        TSDict[T['TeamSeasonID']] = T

    print('TS Dict created', len(connection.queries))

    RecruitTeamDict = {'TeamList': []}

    RecruitPool = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__LeagueSeasonID = LS).filter(TeamSeasonID__IsRecruitTeam = True).select_related('PlayerID').annotate(
        Position = F('PlayerID__PositionID__PositionAbbreviation'),
        PositionGroup = F('PlayerID__PositionID__PositionGroupID__PositionGroupName'),
        State = F('PlayerID__CityID__StateID'),
        OverallRating = F('playerteamseasonskill__OverallRating')
    )

    RecruitPool = sorted(RecruitPool, key = lambda k: NormalBounds(k.OverallRating,2,10,99), reverse = True)
    NumberOfRecruits = len(RecruitPool)

    RecruitCount = 0
    RTSToSave = []
    PlayersToSave = []
    PlayerRecruitingInterestToSave = []
    PlayerList = {}
    RecruitCityDict = {}
    RTS_Rating_Fields = [field.name for field in RecruitTeamSeason._meta.get_fields() if 'Scouted_' in field.name and '_Rating' in field.name and 'Base' not in field.name]
    for Recruit in RecruitPool:
        RecruitCount +=1
        Pos = Recruit.Position
        State = Recruit.State
        PlayerStar = 1

        if Pos not in PositionalRankingTracker:
            PositionalRankingTracker[Pos] = 0
        PositionalRankingTracker[Pos] +=1

        if State not in StateRankingTracker:
            StateRankingTracker[State] = 0
        StateRankingTracker[State] +=1

        for Star in sorted(StarDistribution, key=lambda k: k, reverse=True):
            if PlayerStar == 1 and StarDistribution[Star] * NumberOfRecruits > RecruitCount:
                PlayerStar = Star

        P = Recruit.PlayerID

        P.RecruitingStars = PlayerStar
        P.Recruiting_NationalRank = RecruitCount
        P.Recruiting_NationalPositionalRank = PositionalRankingTracker[Pos]
        P.Recruiting_StateRank = StateRankingTracker[State]

        RecruitPreferences = RandomRecruitPreference(TITDict)
        RecruitTopPreferences = {}

        PrefCount = 1
        for Pref in RecruitPreferences:
            RecruitTopPreferences[PrefCount] = Pref
            PRI = PlayerRecruitingInterest(WorldID = CurrentWorld, PlayerID = P, TeamInfoTopicID_id= Pref['TeamInfoTopicID'], PitchRecruitInterestRank = PrefCount)
            PlayerRecruitingInterestToSave.append(PRI)

            PrefCount += 1


        PlayersToSave.append(P)
        PlayerList[Recruit.PlayerID] = Recruit

        RecruitCity = {'Longitude': Recruit.PlayerID.CityID.Longitude, 'Latitude': Recruit.PlayerID.CityID.Latitude}
        RecruitCityDict[Recruit.PlayerID_id] = RecruitCity

        for TS in TeamSeasonList:

            TSP = TS['TSPDict'][Pos]

            RTS = RecruitTeamSeason(WorldID = WorldID, PlayerTeamSeasonID_id = Recruit.PlayerTeamSeasonID, TeamSeasonID_id = TS['TeamSeasonID'], ScoutingFuzz = TS['CoachScoutVariance'], IsActivelyRecruiting = False)

            OverallSum = 0
            WeightSum = 0
            for RatingField in RTS_Rating_Fields:
                RawRatingField = RatingField.replace('Scouted_', '')
                WeightRatingField = RawRatingField +'_Weight'
                BaseVal = getattr(Recruit.playerteamseasonskill, RawRatingField)
                NewVal = NormalTrunc(BaseVal, TS['CoachScoutVariance'], 0,99)
                setattr(RTS, RatingField, NewVal)

                OverallSum+= float(NewVal) * float(getattr(TSP, WeightRatingField))
                WeightSum += float(getattr(TSP, WeightRatingField))

            OverallSum = int(OverallSum * 1.0 / WeightSum)
            RTS.Scouted_Overall = OverallSum

            RTSToSave.append(RTS)

    print('RTS created', len(connection.queries))
    Player.objects.bulk_update(PlayersToSave, ['Recruiting_StateRank', 'Recruiting_NationalPositionalRank', 'Recruiting_NationalRank', 'RecruitingStars'])
    RecruitTeamSeason.objects.bulk_create(RTSToSave, ignore_conflicts=False)
    PlayerRecruitingInterest.objects.bulk_create(PlayerRecruitingInterestToSave, ignore_conflicts=False)

    RTS = RecruitTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = LS).select_related('PlayerTeamSeasonID__PlayerID').select_related('TeamSeasonID__TeamID__CityID__StateID__RegionID').annotate(RecruitingTeamRank_new = Window(
        expression=RowNumber(),
        partition_by=F("PlayerTeamSeasonID"),
        order_by=F("InterestLevel").desc(),
    ))

    CalculatedTITs = ['Close to Home', 'Playing Time', 'Play Style']

    RecruitTeamSeasonInterest_ToSave = []
    for R in RTS:
        R.RecruitingTeamRank = R.RecruitingTeamRank_new

        RecruitCity = RecruitCityDict[R.PlayerTeamSeasonID.PlayerID_id]
        TS =TSDict[R.TeamSeasonID_id]

        PlayerRecruitingInfoRatingDict = {I['TeamInfoTopicID__AttributeName']: I['PlayerRecruitingInterestID'] for I in R.PlayerTeamSeasonID.PlayerID.playerrecruitinginterest_set.all().values('TeamInfoTopicID', 'TeamInfoTopicID__AttributeName','PlayerRecruitingInterestID')}

        RecruitDistance = DistanceBetweenCities_Dict(RecruitCity, TS['TeamCity'])
        RecruitDistanceInterestValue = 0
        for Locality in RecruitSchoolDistanceMap:
            if RecruitDistance >= RecruitSchoolDistanceMap[Locality]['LowerBound'] and RecruitDistance <= RecruitSchoolDistanceMap[Locality]['UpperBound']:
                RecruitDistanceInterestValue = RecruitSchoolDistanceMap[Locality]['PointValue']

        CloseToHomeValue = RecruitDistanceInterestValue
        PlayingTimeValue = 50
        PlayStyleValue = 50

        for TIT in TITDict:
            if TITDict[TIT]['AttributeName'] == 'Close to Home':
                TeamRating = CloseToHomeValue
            elif TITDict[TIT]['AttributeName'] == 'Playing Time':
                TeamRating = PlayingTimeValue
            elif TITDict[TIT]['AttributeName'] == 'Play Style':
                TeamRating = PlayStyleValue
            else:
                TeamRating = TS['TeamSeasonInfoRatingDict'][TITDict[TIT]['AttributeName']]

            RTSI = RecruitTeamSeasonInterest(WorldID = CurrentWorld, RecruitTeamSeasonID = R, TeamRating = TeamRating, PlayerRecruitingInterestID_id = PlayerRecruitingInfoRatingDict[TITDict[TIT]['AttributeName']])
            RecruitTeamSeasonInterest_ToSave.append(RTSI)

    RecruitTeamSeasonInterest.objects.bulk_create(RecruitTeamSeasonInterest_ToSave)
    RecruitTeamSeason.objects.bulk_update(RTS,['RecruitingTeamRank'])
    print('Ranks updated, info ratings created', len(connection.queries))

def CreateCoaches(LS, WorldID):

    CoachesPerTeam = CoachPosition.objects.filter(Q(IsCoordinator=True) | Q(IsHeadCoach=True))

    TeamList = TeamSeason.objects.filter(WorldID=WorldID).filter(TeamID__isnull = False).filter(LeagueSeasonID = LS).annotate(
        TeamPrestige = Max('teamseasoninforating__TeamRating', filter=Q(teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),
    ).order_by('-TeamPrestige')
    CurrentSeason = LS
    TeamsThatNeedCoaches = []
    NumberOfCoachesNeeded = TeamList.count() * CoachesPerTeam.count()

    print('NumberOfCoachesNeeded', NumberOfCoachesNeeded)


    CoachPool = []
    for CoachCount in range(0,NumberOfCoachesNeeded):
        #print(CoachCount)
        CoachPool.append(GenerateCoach(WorldID))
    Coach.objects.bulk_create(CoachPool, ignore_conflicts=True)

    CoachList = list(Coach.objects.filter(WorldID = WorldID).order_by('-GameplanRating', '-ReputationRating'))

    CTSToSave = []
    for Position in CoachesPerTeam:
        for TS in TeamList:
            CoachesLeft = CoachList.__len__()
            CoachToPop = random.randint(0, int(CoachesLeft / 8))
            CoachForTeam = CoachList.pop(CoachToPop)
            CTS = CoachTeamSeason(WorldID=WorldID, TeamSeasonID = TS, CoachID = CoachForTeam, CoachPositionID = Position)

            CTSToSave.append(CTS)
    CoachTeamSeason.objects.bulk_create(CTSToSave, ignore_conflicts=False)

    TSSToSave = []
    for TS in TeamSeason.objects.filter(TeamID__isnull = False).filter(WorldID_id = WorldID):
        HC = Coach.objects.filter(coachteamseason__TeamSeasonID = TS).values().first()
        TSS = TeamSeasonStrategy(TeamSeasonID = TS, WorldID = WorldID)

        FieldExclusions = ['TeamSeasonID', 'TeamSeasonStrategyID', 'WorldID']
        for HC_Key in [field.name for field in TeamSeasonStrategy._meta.get_fields()]:
            if HC_Key not in FieldExclusions:
                setattr(TSS, HC_Key, HC[HC_Key])

        TSSToSave.append(TSS)
    TeamSeasonStrategy.objects.bulk_create(TSSToSave)

    CurrentSeason.CoachesCreated = True
    CurrentSeason.save()
    return None


def ConfigureLineups():


    return None


def EndRegularSeason(WorldID, CurrentWeek = None):
    CurrentSeason = LeagueSeason.objects.filter(WorldID=WorldID).filter(IsCurrent = 1).first()
    CurrentLeague = CurrentSeason.LeagueID
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here

    GameTimeHourChoices = [12, 12, 2, 3, 3, 7, 7, 8]
    GameTimeMinuteChoices = ['00', '00', '00', '00', '30', '30', '30', '05']

    NextWeek = CurrentWeek.NextWeek

    if CurrentSeason.ConferenceChampionshipsCreated == False:
        print('time to do Conf Champ stuff!')
        for Conf in CurrentWorld.conference_set.all():
            TeamSeasonList = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(ConferenceID = Conf).filter(ConferenceRank__lte = 2).filter(TeamID__isnull = False)

            HomeTS = TeamSeasonList.filter(ConferenceRank = 1).first()
            AwayTS = TeamSeasonList.filter(ConferenceRank = 2).first()

            GameTime = str(random.choice(GameTimeHourChoices)) + ':' + random.choice(GameTimeMinuteChoices)
            G = Game(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = GameTime, WeekID = NextWeek, IsConferenceChampionship=True)
            G.save()

            HomeTSWR = TeamSeasonWeekRank.objects.filter(TeamSeasonID = HomeTS).filter(IsCurrent=1).first()
            AwayTSWR = TeamSeasonWeekRank.objects.filter(TeamSeasonID = AwayTS).filter(IsCurrent=1).first()

            HomeTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = HomeTS,OpposingTeamSeasonID=AwayTS, IsHomeTeam = True,  GameID = G, TeamSeasonWeekRankID = HomeTSWR)
            AwayTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = AwayTS,OpposingTeamSeasonID=HomeTS, IsHomeTeam = False, GameID = G, TeamSeasonWeekRankID = AwayTSWR)

            HomeTeamGame.save()
            AwayTeamGame.save()

            HomeTeamGame.OpposingTeamGameID = AwayTeamGame
            AwayTeamGame.OpposingTeamGameID = HomeTeamGame

            HomeTeamGame.save()
            AwayTeamGame.save()

    CurrentSeason.ConferenceChampionshipsCreated = True
    CurrentSeason.save()
    return None


def CreateBowls(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID=WorldID).filter(IsCurrent = 1).first()
    CurrentLeague = CurrentSeason.LeagueID
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here

    CurrentWeek = Week.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    NextWeek = CurrentWeek.NextWeek

    NumberOfBowls = int((CurrentWorld.conference_set.all().count() * 4) / 2) * 2

    GameTimeHourChoices = [12, 12, 2, 3, 3, 7, 7, 8]
    GameTimeMinuteChoices = ['00', '00', '00', '00', '30', '30', '30', '05']

    print('CurrentSeason.PlayoffCreated', CurrentSeason.PlayoffCreated)
    print('time to do Bowl stuff!')
    #CalculateRankings(CurrentSeason, CurrentWorld)

    if CurrentSeason.PlayoffCreated == False:
        TeamRanksAvailable = []
        for u in TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).values('NationalRank'):
            TeamRanksAvailable.append(u['NationalRank'])

        for B in Bowl.objects.filter(WorldID = CurrentWorld).order_by('Team1Rank')[:NumberOfBowls]:

            if len(TeamRanksAvailable) < 2:
                continue
            HomeTSWR = TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).filter(NationalRank = TeamRanksAvailable.pop(0)).first()
            HomeTS   = HomeTSWR.TeamSeasonID

            AwayTSWR = None
            TeamRankCount = 0
            while AwayTSWR is None:
                AttemptedRank = TeamRanksAvailable[TeamRankCount]
                AwayTSWR = TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).exclude(TeamSeasonID__ConferenceID = HomeTS.ConferenceID).filter(NationalRank = AttemptedRank).first()
                TeamRankCount +=1

            if AttemptedRank in TeamRanksAvailable:
                TeamRanksAvailable.remove(AttemptedRank)

            AwayTS = AwayTSWR.TeamSeasonID

            GameTime = str(random.choice(GameTimeHourChoices)) + ':' + random.choice(GameTimeMinuteChoices)
            G = Game(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = GameTime, WeekID = NextWeek, BowlID = B)
            G.save()

            HomeTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = HomeTS, OpposingTeamSeasonID=AwayTS, IsHomeTeam = True,  GameID = G, TeamSeasonWeekRankID=HomeTSWR)
            AwayTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = AwayTS, OpposingTeamSeasonID=HomeTS,IsHomeTeam = False, GameID = G, TeamSeasonWeekRankID=AwayTSWR)

            HomeTeamGame.save()
            AwayTeamGame.save()

            HomeTeamGame.OpposingTeamGameID = AwayTeamGame
            AwayTeamGame.OpposingTeamGameID = HomeTeamGame

            HomeTeamGame.save()
            AwayTeamGame.save()
        #CalculateRankings(CurrentSeason, CurrentWorld)

    CurrentSeason.PlayoffCreated = True
    CurrentSeason.save()
    return None




def EndSeason(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID=WorldID).filter(IsCurrent = 1).first()
    CurrentLeague = CurrentSeason.LeagueID
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here

    CurrentWeek = Week.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    NextWeek = CurrentWeek.NextWeek

    if CurrentSeason.AwardsCreated == False:
        print('Assigning awards!')
        NationalAwards(WorldID, CurrentSeason)

    CurrentSeason.AwardsCreated = True
    CurrentSeason.save()
    return None


def GraduateSeniors(WorldID, CurrentSeason):

    SeniorList = Player.objects.filter(WorldID = WorldID).filter(ClassID__ClassName = 'Senior')
    for P in SeniorList:
        P.PlayerClass = 'Graduated'
        P.save()


def AddYearToPlayers(WorldID, CurrentSeason):
    return None


def PopulateTeamSeasonPositions(WorldID, CurrentSeason):

    TSPToCreate = []
    PositionMap = {
        'QB': {
            'ThrowPower_Rating_Weight': 1.0,
            'ShortThrowAccuracy_Rating_Weight': 1.0,
            'MediumThrowAccuracy_Rating_Weight': .75,
            'DeepThrowAccuracy_Rating_Weight': .5,
            'ThrowOnRun_Rating_Weight': .25,
            'ThrowUnderPressure_Rating_Weight': .25,
            'PlayAction_Rating_Weight': .1,
            'Awareness_Rating_Weight': 1.0,
            'Speed_Rating_Weight': .15,
        },
        'RB': {
            'Speed_Rating_Weight': .75,
            'Acceleration_Rating_Weight': .25,
            'Agility_Rating_Weight': .25,
            'Elusiveness_Rating_Weight': .5,
            'BreakTackle_Rating_Weight': .5,
            'Carrying_Rating_Weight': .75,
            'BallCarrierVision_Rating_Weight': .75,
            'Catching_Rating_Weight': .125,
            'PassBlock_Rating_Weight': .125,
            'JukeMove_Rating_Weight': .125,
        },
        'FB': {
            'Speed_Rating_Weight': .125,
            'Acceleration_Rating_Weight': .125,
            'Agility_Rating_Weight': .125,
            'Elusiveness_Rating_Weight': 0,
            'BreakTackle_Rating_Weight': 0,
            'Carrying_Rating_Weight': .75,
            'BallCarrierVision_Rating_Weight': 0,
            'Catching_Rating_Weight': 0,
            'PassBlock_Rating_Weight': .25,
            'RunBlock_Rating_Weight': .25,
        },
        'WR': {
            'Speed_Rating_Weight': 1,
            'Acceleration_Rating_Weight': .25,
            'Agility_Rating_Weight': .25,
            'Jumping_Rating_Weight': .25,
            'Catching_Rating_Weight': 1,
            'CatchInTraffic_Rating_Weight': .5,
            'Release_Rating_Weight': .25,
            'RouteRunning_Rating_Weight': 1,
        },
        'TE': {
            'Speed_Rating_Weight': .5,
            'Acceleration_Rating_Weight': .25,
            'Agility_Rating_Weight': .1,
            'Jumping_Rating_Weight': .25,
            'Catching_Rating_Weight': 1,
            'CatchInTraffic_Rating_Weight': 1,
            'Release_Rating_Weight': .25,
            'RouteRunning_Rating_Weight': .5,
            'PassBlock_Rating_Weight': .25,
            'RunBlock_Rating_Weight': .25,
        },
        'OT': {
            'Strength_Rating_Weight': .75,
            'Acceleration_Rating_Weight': .25,
            'PassBlock_Rating_Weight': 1,
            'RunBlock_Rating_Weight': 1,
            'Awareness_Rating_Weight': 1,
        },
        'OG': {
            'Strength_Rating_Weight': .75,
            'Acceleration_Rating_Weight': .25,
            'PassBlock_Rating_Weight': 1,
            'RunBlock_Rating_Weight': 1,
            'Awareness_Rating_Weight': 1,
        },
        'OC': {
            'Strength_Rating_Weight': .75,
            'Acceleration_Rating_Weight': .25,
            'PassBlock_Rating_Weight': 1,
            'RunBlock_Rating_Weight': 1,
            'Awareness_Rating_Weight': 1,
        },
        'DE': {
            'Speed_Rating_Weight': 0,
            'Acceleration_Rating_Weight': .5,
            'Agility_Rating_Weight': 0,
            'Strength_Rating_Weight': .25,
            'PassRush_Rating_Weight': 1,
            'BlockShedding_Rating_Weight': 1,
            'Tackle_Rating_Weight': .5,
            'HitPower_Rating_Weight': .25,
        },
        'DT': {
            'Speed_Rating_Weight': 0,
            'Acceleration_Rating_Weight': .25,
            'Agility_Rating_Weight': 0,
            'Strength_Rating_Weight': .75,
            'PassRush_Rating_Weight': 1,
            'BlockShedding_Rating_Weight': 1,
            'Tackle_Rating_Weight': .5,
            'HitPower_Rating_Weight': .25,
        },
        'OLB': {
            'Speed_Rating_Weight': .5,
            'Acceleration_Rating_Weight': .5,
            'Agility_Rating_Weight': .15,
            'Strength_Rating_Weight': .1,
            'PassRush_Rating_Weight': .75,
            'BlockShedding_Rating_Weight': .5,
            'Tackle_Rating_Weight': .5,
            'HitPower_Rating_Weight': .25,
            'ManCoverage_Rating_Weight': 0,
            'ZoneCoverage_Rating_Weight': 0,
        },
        'MLB': {
            'Speed_Rating_Weight': .5,
            'Acceleration_Rating_Weight': .5,
            'Agility_Rating_Weight': .15,
            'Strength_Rating_Weight': .1,
            'PassRush_Rating_Weight': .1,
            'BlockShedding_Rating_Weight': .5,
            'Tackle_Rating_Weight': 1,
            'HitPower_Rating_Weight': .25,
            'ManCoverage_Rating_Weight': .125,
            'ZoneCoverage_Rating_Weight': .125,
        },
        'CB': {
            'Speed_Rating_Weight': .75,
            'Acceleration_Rating_Weight': .15,
            'Agility_Rating_Weight': .1,
            'Tackle_Rating_Weight': .25,
            'HitPower_Rating_Weight': 0,
            'ManCoverage_Rating_Weight': 1.5,
            'ZoneCoverage_Rating_Weight': 1.5,
        },
        'S': {
            'Speed_Rating_Weight': .5,
            'Acceleration_Rating_Weight': .25,
            'Agility_Rating_Weight': .1,
            'Tackle_Rating_Weight': .5,
            'HitPower_Rating_Weight': .25,
            'ManCoverage_Rating_Weight': 1,
            'ZoneCoverage_Rating_Weight': 1,
        },
        'K': {
            'KickPower_Rating_Weight': 1.0,
            'KickAccuracy_Rating_Weight': 1.0,
        },
        'P': {
            'KickPower_Rating_Weight': 1.0,
            'KickAccuracy_Rating_Weight': 1.0,
        },
        'KR': {
            'Speed_Rating_Weight': 1.0,
        },
        'PR': {
            'Speed_Rating_Weight': 1.0,
        },
        'ATH': {
            'Speed_Rating_Weight': 1.0,
        },
    }
    for P in PositionMap:
        PMap = PositionMap[P]
        PMap['Total_Rating_Weight'] = 0
        for W in [k for k in PMap if k!='Total_Rating_Weight']:
            PMap['Total_Rating_Weight']+=PMap[W]

    TeamSeasonPosition.objects.all().delete()
    if TeamSeasonPosition.objects.all().count() == 0:
        Positions = list(Position.objects.all())
        for TS in list(TeamSeason.objects.filter(TeamID__isnull = False).filter(WorldID = CurrentWorld)):
            for Pos in Positions:
                PMap = PositionMap[Pos.PositionAbbreviation].copy()
                PMap['TeamSeasonID'] = TS
                PMap['PositionID'] = Pos
                PMap['WorldID'] = CurrentWorld
                TSP = TeamSeasonPosition(**PMap)
                TSPToCreate.append(TSP)

        TeamSeasonPosition.objects.bulk_create(TSPToCreate)


def AddRecruitsToTeams(WorldID, CurrentSeason):

    return None


def BeginOffseason(WorldID):

    CurrentSeason = LeagueSeason.objects.filter(WorldID = WorldID).filter(IsCurrent = True).first()

    CurrentSeason.OffseasonStarted = True
    CurrentSeason.save()


    #InitializeLeagueSeason(WorldID, IsFirstLeagueSeason=False)

    #GraduateSeniors(WorldID, CurrentSeason)
    #AddRecruitsToTeams(WorldID, CurrentSeason)
    #AddYearToPlayers(WorldID, CurrentSeason)

    return None


def PlayerDeparture(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID = WorldID).filter(IsCurrent = True).first()
    GraduateSeniors(WorldID, CurrentSeason)
    #SendPlayersToNBA()
    #PlayerTransfers()

def NewSeasonCutover(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID = WorldID).filter(IsCurrent = True).first()

    AddRecruitsToTeams(WorldID, CurrentSeason)
    #AddTransfersToTeams(WorldID, CurrentSeason)

def InitializeLeagueSeason(WorldID, LeagueID, IsFirstLeagueSeason ):

    AuditTeamCount = Team.objects.filter(WorldID = WorldID).count()


    if  IsFirstLeagueSeason:
        StartYear = 2019
    else:
        CurrentLeagueSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1, LeagueID=LeagueID)
        CurrentLeagueSeason.IsCurrent = False
        CurrentLeagueSeason.save()

        StartYear = CurrentLeagueSeason.SeasonEndYear


    LS = LeagueSeason(WorldID = WorldID, LeagueID=LeagueID, IsCurrent = True, SeasonStartYear = StartYear, SeasonEndYear = StartYear+1)
    LS.save()

    DoAudit = True
    if DoAudit:
        start = time.time()
        reset_queries()

    createCalendar(WorldID=WorldID, LeagueSeasonID=LS, SetFirstWeekCurrent = True)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create calendar', QueryCount = len(connection.queries))

    return LS


def InitializeLeaguePlayers(WorldID, LS, IsFirstLeagueSeason ):
    CurrentWeek = Week.objects.filter(PhaseID__LeagueSeasonID = LS).filter(IsCurrent = 1).first()
    AuditTeamCount = Team.objects.filter(WorldID = WorldID).count()
    DoAudit = True
    if IsFirstLeagueSeason:

        CreateCoaches(LS, WorldID)
        CreateTeamPositions(LS, WorldID)
        if DoAudit:
            start = time.time()
            reset_queries()
        CreatePlayers(LS, WorldID)
        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 3, AuditDescription='Create Players', QueryCount = len(connection.queries))

        UpdateTeamPositions(LS, WorldID)

    if DoAudit:
        start = time.time()
        reset_queries()


    CreateRecruitingClass(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 4, AuditDescription='Create Recruiting Class', QueryCount = len(connection.queries))
    if DoAudit:
        start = time.time()
        reset_queries()


    CreateSchedule(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 3, AuditDescription='CreateSchedule', QueryCount = len(connection.queries))
    if DoAudit:
        start = time.time()
        reset_queries()

    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=True)
    AssignRedshirts(LS, WorldID)
    CutPlayers(LS, WorldID)
    UpdateTeamPositions(LS, WorldID)
    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=False)
    ChooseTeamCaptains(LS, WorldID)
    CalculateTeamOverall(LS, WorldID)
    CalculateRankings(LS, WorldID, CurrentWeek)
    CalculateConferenceRankings(LS, WorldID, CurrentWeek)
    SelectBroadcast(LS, WorldID, CurrentWeek)
    SelectPreseasonAllAmericans(WorldID, LS)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 1, AuditDescription='CalculateRankings, CalculateConferenceRankings, SelectBroadcast', QueryCount = len(connection.queries))
