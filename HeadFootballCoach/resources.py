from .models import Audit,TeamGame,Bowl,PlayerTeamSeasonDepthChart,TeamSeasonStrategy, TeamSeasonPosition, System_PlayerArchetypeRatingModifier, Position,Class, CoachPosition, NameList, Week, TeamSeasonWeekRank, TeamRivalry, League, PlayoffRegion, System_PlayoffRound, PlayoffRound, TeamSeasonDateRank, World, Headline, Playoff, CoachTeamSeason, TeamSeason, RecruitTeamSeason, Team, Player, Coach, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill, CoachTeamSeason
import random
from datetime import timedelta, date
import pandas as pd
import numpy
from decimal import Decimal
from .scripts.PickName import RandomName, RandomPositionAndMeasurements, RandomCity
import math
from django.db.models.functions import Coalesce
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case,  ExpressionWrapper, When, FloatField, IntegerField, DecimalField, CharField, BooleanField, Value, Window, OuterRef, Subquery
#from django.db.models import Max, Avg, Count, Func,  Sum, Case, When, FloatField, CharField, Value
from django.db.models.functions.window import Rank, RowNumber, Ntile
from .scripts.rankings import CalculateRankings, CalculateConferenceRankings, SelectBroadcast
from .scripts.DepthChart import CreateDepthChart
from .scripts.SeasonAwards import NationalAwards, SelectPreseasonAllAmericans
from .scripts.Recruiting import FindNewTeamsForRecruit, RandomRecruitPreference
from .scripts.import_csv import createCalendar
from .utilities import NormalVariance, DistanceBetweenCities, DistanceBetweenCities_Dict, WeightedProbabilityChoice, NormalBounds, NormalTrunc, NormalVariance, Max_Int
from math import sin, cos, sqrt, atan2, radians, log
import time



def CalculateTeamPlayerOverall(TSP, PlayerID):

    TotalRating = 1
    for key in TSP:
        RatingName = key.replace('_Weight', '')
        RatingName2 = 'playerseasonskill__' + key.replace('_Weight', '')
        if RatingName in PlayerID:
            TotalRating += TSP[key] * PlayerID[RatingName]
        elif RatingName2 in PlayerID:
            TotalRating += TSP[key] * PlayerID[RatingName2]

    return int(TotalRating / TSP['Total_Rating_Weight'])


def TeamRedshirts(TS, WorldID):

    PlayersToRedshirt = TS.playerteamseason_set.filter(PlayerID__WasPreviouslyRedshirted = False).filter(Q(PlayerID__ClassID__ClassAbbreviation = 'SO') | Q(PlayerID__ClassID__ClassAbbreviation = 'FR')).exclude(playerteamseasondepthchart__IsStarter = True).annotate(DepthChartPositionMin = Coalesce(Min('playerteamseasondepthchart__DepthPosition'), 6))
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

    PlayersToCut = TS.playerteamseason_set.exclude(playerteamseasondepthchart__IsStarter = True).filter(PlayerID__playerseasonskill__LeagueSeasonID__IsCurrent = True).annotate(DepthChartPositionMin = Coalesce(Min('playerteamseasondepthchart__DepthPosition'), 10), OverallRating = F('PlayerID__playerseasonskill__OverallRating')).order_by('-DepthChartPositionMin', 'OverallRating')[:NumPlayersToCut]
    HeadCount = TS.coachteamseason_set.filter(CoachPositionID__CoachPositionAbbreviation = 'HC').values('CoachID__RedshirtTendency').first()

    for PTR in PlayersToCut:
        print('Cutting {PlayerName} from {Team}, Pos: {PlayerPosition}, Overall: {Overall}, DepthChart: {DepthChartPositionMin}'.format(PlayerName=PTR.PlayerID.PlayerLastName, Team=TS.TeamID.TeamName,PlayerPosition=PTR.PlayerID.PositionID.PositionAbbreviation, Overall=PTR.OverallRating, DepthChartPositionMin=PTR.DepthChartPositionMin))
        PTR.delete()

    return None


def CreateTeamPositions(LS, WorldID):

    TSPToSave = []
    PositionArchetypes =System_PlayerArchetypeRatingModifier.objects.all()
    ArchetypeFields = [field.name for field in System_PlayerArchetypeRatingModifier._meta.get_fields() if '_Rating' in field.name ]
    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).order_by('TeamID__TeamName'):
        TSS = TeamSeasonID.teamseasonstrategy_set.all().first()
        for Pos in Position.objects.exclude(PositionAbbreviation = 'ATH'):
            PosAbbr = Pos.PositionAbbreviation
            TSP = {'WorldID': WorldID, 'TeamSeasonID': TeamSeasonID, 'PositionID': Pos, 'StarterPlayerCount': Pos.PositionTypicalStarterCountPerTeam, 'MinimumPlayerCount': Pos.PositionCountPerAwardTeam, 'NeededPlayerCount': Pos.PositionCountPerAwardTeam, 'PositionPreference': '' }
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



def UpdateTeamPositions(LS, WorldID):


    TSPs = TeamSeasonPosition.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = LS).annotate(
        CurrentPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID'))),
        NeededPlayerCount_calc = Case(
            When(CurrentPlayerCount__lt = F('MinimumPlayerCount'), then=F('MinimumPlayerCount') - F('CurrentPlayerCount')),
            default=Value(0),
            output_field=IntegerField()
        ),

        FreshmanPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__PlayerID__ClassID__ClassAbbreviation = 'FR')),
        SophomorePlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__PlayerID__ClassID__ClassAbbreviation = 'SO')),
        JuniorPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__PlayerID__ClassID__ClassAbbreviation = 'JR')),
        SeniorPlayerCount_calc = Count('TeamSeasonID__playerteamseason', filter=Q(TeamSeasonID__playerteamseason__PlayerID__PositionID = F('PositionID')) & Q(TeamSeasonID__playerteamseason__PlayerID__ClassID__ClassAbbreviation = 'SR')),

        Year1PositionOverall_calc = Coalesce(Subquery(PlayerSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerID__playerteamseason__TeamSeasonID = OuterRef('TeamSeasonID')).filter(LeagueSeasonID = OuterRef('TeamSeasonID__LeagueSeasonID')).filter(PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerID__ClassID__ClassSortOrder__lte = 7).values('LeagueSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerSeasonSkillID')).values('Max')  ),0),
        Year2PositionOverall_calc = Coalesce(Subquery(PlayerSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerID__playerteamseason__TeamSeasonID = OuterRef('TeamSeasonID')).filter(LeagueSeasonID = OuterRef('TeamSeasonID__LeagueSeasonID')).filter(PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerID__ClassID__ClassSortOrder__lte = 6).values('LeagueSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerSeasonSkillID')).values('Max')  ),0),
        Year3PositionOverall_calc = Coalesce(Subquery(PlayerSeasonSkill.objects.filter(WorldID = OuterRef('WorldID')).filter(PlayerID__playerteamseason__TeamSeasonID = OuterRef('TeamSeasonID')).filter(LeagueSeasonID = OuterRef('TeamSeasonID__LeagueSeasonID')).filter(PlayerID__PositionID = OuterRef('PositionID')).filter(PlayerID__ClassID__ClassSortOrder__lte = 5).values('LeagueSeasonID').annotate(
                                            Max=Max('OverallRating'), Count=Count('PlayerSeasonSkillID')).values('Max')  ),0),
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

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS):
        PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).delete()
        CreateDepthChart(CurrentWorld=WorldID, TS=TeamSeasonID, FullDepthChart = False)

def AssignRedshirts(LS, WorldID):
    print('Assigning Redshirts')

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).exclude(TeamID__IsUserTeam = True):
        TeamRedshirts(TS=TeamSeasonID , WorldID=WorldID )

def CutPlayers(LS, WorldID):
    print('Cutting Players')

    for TeamSeasonID in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).exclude(TeamID__IsUserTeam = True).annotate(NumbersOfPlayers = Count('playerteamseason__PlayerTeamSeasonID'), PlayersToCut = ExpressionWrapper(F('NumbersOfPlayers') -  F('LeagueSeasonID__LeagueID__PlayersPerTeam'), output_field=IntegerField())).filter(PlayersToCut__gt = 0):
        TeamCuts(TS=TeamSeasonID , WorldID=WorldID,  NumPlayersToCut=TeamSeasonID.PlayersToCut)


def CalculateTeamOverall(LS, WorldID):


    NtileToGradeMap = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

    TSDict = {}
    for TS in TeamSeason.objects.filter(WorldID = WorldID).values_list('TeamSeasonID', flat=True):
        if TS not in TSDict:
            TSDict[TS] = {'TeamOverallRating': 0, 'TeamOffenseRating': 0, 'TeamDefenseRating': 0, 'TeamOverallRating_Grade': '', 'TeamOffenseRating_Grade': '', 'TeamDefenseRating_Grade': '',  }

    TSOvr = list(TeamSeason.objects.filter(WorldID = WorldID).filter(playerteamseason__PlayerID__playerseasonskill__LeagueSeasonID = LS).filter(playerteamseason__playerteamseasondepthchart__IsStarter = True).values('TeamSeasonID', 'playerteamseason__PlayerID__PositionID__PositionGroupID__PositionGroupName').annotate(
        AverageOverall = Avg('playerteamseason__PlayerID__playerseasonskill__OverallRating'),
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


    TSOvr = list(TeamSeason.objects.filter(WorldID = WorldID).filter(playerteamseason__PlayerID__playerseasonskill__LeagueSeasonID = LS).filter(playerteamseason__playerteamseasondepthchart__IsStarter = True).values('TeamSeasonID').annotate(
        AverageOverall = Avg('playerteamseason__PlayerID__playerseasonskill__OverallRating'),
        AverageOverall_Ntile = Window(
            expression=Ntile(13),
            order_by=F("AverageOverall").desc(),
        )
    ).order_by('TeamID', 'playerteamseason__PlayerID__PositionID__PositionGroupID'))
    for TS in TSOvr:
        TSDict[TS['TeamSeasonID']]['TeamOverallRating'] = int(TS['AverageOverall'])
        TSDict[TS['TeamSeasonID']]['TeamOverallRating_Grade'] = NtileToGradeMap[TS['AverageOverall_Ntile'] - 1]

    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID = LS).values_list('TeamSeasonID', flat=True):
        print(TSDict[TS])
        TeamSeason.objects.filter(WorldID_id = WorldID).filter(TeamSeasonID = TS).update(TeamOverallRating = TSDict[TS]['TeamOverallRating'], TeamOffenseRating = TSDict[TS]['TeamOffenseRating'], TeamDefenseRating = TSDict[TS]['TeamDefenseRating'], TeamOverallRating_Grade = TSDict[TS]['TeamOverallRating_Grade'], TeamOffenseRating_Grade = TSDict[TS]['TeamOffenseRating_Grade'], TeamDefenseRating_Grade = TSDict[TS]['TeamDefenseRating_Grade'])


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

    TeamList = Team.objects.filter(WorldID=WorldID)
    WeekMap = {w.WeekNumber: w for w in Week.objects.filter(WorldID=WorldID).filter(PhaseID__PhaseName = 'Regular Season').filter(PhaseID__LeagueSeasonID__IsCurrent = True)}

    WeeksInSeason = len(WeekMap)
    GamePerTeam = 12
    NonConferenceGames = 4
    ConferenceGames = GamePerTeam - NonConferenceGames

    ScheduleDict = {}
    for t in TeamList:
        ScheduleDict[t] = {'CurrentTeamSeason': t.CurrentTeamSeason, 'NonConferenceGames': 0, 'ConferenceGames': 0, 'TotalConferenceGames': t.ConferenceID.NumberConferenceGames, 'TotalNonConferenceGames': GamePerTeam - t.ConferenceID.NumberConferenceGames, 'HomeGames': 0, 'AwayGames': 0, 'WeeksScheduled': [], 'AvailableWeeks':[w for w in WeekMap], 'OpposingTeams': [], 'UnschedulableTeams': [], 'Conference': t.ConferenceID, 'ConferenceRivals': [], 'NonConferenceRivals': [], }


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

            IsConferenceGame = ((ScheduleDict[HomeTeam]['Conference'] == ScheduleDict[AwayTeam]['Conference']) and (not ScheduleDict[HomeTeam]['Conference'].IsIndependent))
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


                if IsConferenceGame or ScheduleDict[HomeTeam]['Conference'].IsIndependent:
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

            IsConferenceGame = ((ScheduleDict[HomeTeam]['Conference'] == ScheduleDict[AwayTeam]['Conference']) and (not ScheduleDict[HomeTeam]['Conference'].IsIndependent))
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



                if IsConferenceGame or ScheduleDict[HomeTeam]['Conference'].IsIndependent:
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


def GeneratePlayer(t, s, c, WorldID, PositionAbbreviation = None):
    OverallMean = 70
    OverallSigma = 9

    if c is not None:
        PlayerClasses = [c]
    else:
        PlayerClasses = list(Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate'))


    Positions = Position.objects.all()


    ClassOverallPercentage = {
        'HS Senior': (.70, .85),
        'Freshman': (.75, .93),
        'Sophomore': (.82, .98),
        'Junior': (.88, 1),
        'Senior': (.90, 1)
    }

    PlayerPositionAndHeight = RandomPositionAndMeasurements(PositionAbbreviation)
    PlayerPositionID = PlayerPositionAndHeight['PositionID']['PositionID']
    PlayerWeight = PlayerPositionAndHeight['Weight']
    PlayerHeight = PlayerPositionAndHeight['Height']


    PlayerClassID = random.choice(PlayerClasses)
    #PlayerPosition = random.choice(Positions)
    PlayerNumber = 0

    PlayerNameTuple  = RandomName()
    PlayerFirstName = PlayerNameTuple[0]
    PlayerLastName = PlayerNameTuple[1]

    PlayerCityID = RandomCity()

    PlayerRatings = {}

    PlayerDict = {'WorldID':WorldID, 'ClassID':PlayerClassID, 'PlayerFirstName': PlayerFirstName, 'PlayerLastName':PlayerLastName, 'JerseyNumber':PlayerNumber, 'Height':PlayerHeight, 'Weight': PlayerWeight, 'CityID': PlayerCityID, 'PositionID_id': PlayerPositionID, 'IsRecruit':PlayerClassID.IsRecruit}

    #PST = PlayerTeamSeason(PlayerID = P, SeasonID = s, TeamID = t)
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

def PopulatePlayerSkills(P, s, WorldID):
    PlayerClass = P.ClassID.ClassName

    ClassOverallModifier = {
        'HS Senior': .92,
        'Freshman': .90,
        'Sophomore': .95,
        'Junior': .99,
        'Senior': 1,
    }

    # 40 time calculation:
    # (-32.16 * <40Time>) + 234.33 = SpeedRating
    # 40Time = (SpeedRating - 234.33) / -32.16

    #Bench Press calculation:
    # Strength Rating = BenchPress + 55
    # Bench Press = Strength Rating - 55 (floor 0)

    #Standing Jump calc:
    # JumpRating = 1.74(Inches) + 23.61
    # VerticalInches = (JumpRating - 23.61) / 1.74

    OvrMultiplier = NormalTrunc(ClassOverallModifier[PlayerClass], .02, .85, 1.1)
    PlayerSkill = PlayerSeasonSkill(WorldID=WorldID, PlayerID = P, LeagueSeasonID = s )

    Ovr =  NormalTrunc(OvrMultiplier * 78,6,60,99)
    PlayerSkill.OverallRating = Ovr

    for Skill in [field.name for field in PlayerSeasonSkill._meta.get_fields() if '_Rating' in field.name ]:
        setattr(PlayerSkill, Skill, NormalTrunc(OvrMultiplier * Ovr,6,50,99))


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
    PTS = PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True)
    NumberOfPlayersNeeded = PlayersPerTeam *  NumberOfTeams
    NumberOfPlayersNeeded -= PTS.count()

    DraftTeamList = list(Team.objects.filter(WorldID_id = WorldID).annotate(AdjustedTeamPrestige=(F('TeamPrestige') * 1.0 /10)**3.5))
    TeamDict = {}
    for T in DraftTeamList:
        TeamDict[T] = {'TeamPrestige': int(T.AdjustedTeamPrestige), 'PlayerCount': 0, 'StopNumber': None, 'Top100':0, 'Top250': 0, 'Top500': 0, 'Top1000': 0, 'PositionPreference': {}}
        TeamDict[T]['PositionPreference']['Offense'] = NormalTrunc(1.05, 0.1, .5, 1.5)
        TeamDict[T]['PositionPreference']['Defense'] = 2 - TeamDict[T]['PositionPreference']['Offense']
        TeamDict[T]['PositionPreference']['Special Teams'] = .75
        TeamDict[T]['TSP'] = T.CurrentTeamSeason.CurrentTeamSeasonPosition

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


    pd.set_option('display.max_rows', None)

    df = pd.DataFrame(TeamDict)
    df = df.transpose()
    print(df)

    PlayerPool = []
    print('Creating ',int(NumberOfPlayersNeeded * 1.1), ' players')
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        #print(PlayerCount)
        PlayerPool.append(GeneratePlayer(None, CurrentSeason, None, WorldID))
    Player.objects.bulk_create(PlayerPool, ignore_conflicts=True)

    PlayerList = Player.objects.filter(WorldID = WorldID)
    PlayerSkillPool = []
    for P in PlayerList:
        PlayerSkillPool.append(PopulatePlayerSkills(P, CurrentSeason, WorldID))
    PlayerSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=True)
    PlayerPool = [u for u in PlayerList.values('PlayerID', 'ClassID', 'PositionID__PositionAbbreviation','PositionID__PositionGroupID__PositionGroupName' , 'playerseasonskill__OverallRating','playerseasonskill__Strength_Rating','playerseasonskill__Agility_Rating','playerseasonskill__Speed_Rating','playerseasonskill__Acceleration_Rating','playerseasonskill__Stamina_Rating','playerseasonskill__Awareness_Rating','playerseasonskill__Jumping_Rating','playerseasonskill__ThrowPower_Rating'    ,'playerseasonskill__ShortThrowAccuracy_Rating'    ,'playerseasonskill__MediumThrowAccuracy_Rating'    ,'playerseasonskill__DeepThrowAccuracy_Rating'    ,'playerseasonskill__ThrowOnRun_Rating'    ,'playerseasonskill__ThrowUnderPressure_Rating'    ,'playerseasonskill__PlayAction_Rating', 'playerseasonskill__PassRush_Rating', 'playerseasonskill__BlockShedding_Rating', 'playerseasonskill__Tackle_Rating', 'playerseasonskill__HitPower_Rating', 'playerseasonskill__ManCoverage_Rating', 'playerseasonskill__ZoneCoverage_Rating', 'playerseasonskill__Press_Rating', 'playerseasonskill__Carrying_Rating', 'playerseasonskill__Elusiveness_Rating', 'playerseasonskill__BallCarrierVision_Rating', 'playerseasonskill__BreakTackle_Rating', 'playerseasonskill__Catching_Rating', 'playerseasonskill__CatchInTraffic_Rating', 'playerseasonskill__RouteRunning_Rating', 'playerseasonskill__Release_Rating', 'playerseasonskill__PassBlock_Rating', 'playerseasonskill__RunBlock_Rating', 'playerseasonskill__ImpactBlock_Rating', 'playerseasonskill__KickPower_Rating', 'playerseasonskill__KickAccuracy_Rating').annotate(
        Position = F('PositionID__PositionAbbreviation'),
        PositionGroup = F('PositionID__PositionGroupID__PositionGroupName')
    ).order_by('-playerseasonskill__OverallRating')]

    PlayersTeamSeasonToSave = []
    for T in DraftOrder:
        TS = T.CurrentTeamSeason
        TSP = TeamDict[T]['TSP']
        if T not in TeamRosterCompositionNeeds:
            TeamRosterCompositionNeeds[T] = {'ClassID': MinimumRosterComposition['ClassID'], 'PositionMaximums': {Pos['Position']: Pos['PositionMaximumCountPerTeam'] for Pos in MinimumRosterComposition['Position']}, 'StarterPosition': {Pos['Position']: Pos['PositionTypicalStarterCountPerTeam'] for Pos in MinimumRosterComposition['Position']},'FullPosition': {Pos['Position']: Pos['PositionMinimumCountPerTeam'] for Pos in MinimumRosterComposition['Position']}}
        ClassesNeeded =   [u for u in TeamRosterCompositionNeeds[T]['ClassID']    if TeamRosterCompositionNeeds[T]['ClassID'][u]    > 0 ]
        StartersNeeded = [u for u in TeamRosterCompositionNeeds[T]['StarterPosition'] if TeamRosterCompositionNeeds[T]['StarterPosition'][u] >= 0 ]
        PositionsNeeded = [u for u in TeamRosterCompositionNeeds[T]['FullPosition'] if TeamRosterCompositionNeeds[T]['FullPosition'][u] > 0 ]

        ClassNeedModifier = {}
        for C in TeamRosterCompositionNeeds[T]['ClassID']:
            if TeamRosterCompositionNeeds[T]['ClassID'][C] > 6:
                ClassNeedModifier[C] = 1.1
            elif TeamRosterCompositionNeeds[T]['ClassID'][C] > 3:
                ClassNeedModifier[C] = 1.05
            elif TeamRosterCompositionNeeds[T]['ClassID'][C] > 0:
                ClassNeedModifier[C] = 1.0
            else:
                ClassNeedModifier[C] = .95

        PositionNeedModifier = {}
        for P in TeamRosterCompositionNeeds[T]['StarterPosition']:
            if TeamRosterCompositionNeeds[T]['StarterPosition'][P] > 0:
                PositionNeedModifier[P] = 1.5
            elif TeamRosterCompositionNeeds[T]['FullPosition'][P] > 0:
                PositionNeedModifier[P] = 1.1
            elif TeamRosterCompositionNeeds[T]['FullPosition'][P] < -2:
                PositionNeedModifier[P] = .5
            elif TeamRosterCompositionNeeds[T]['FullPosition'][P] <= 0:
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
            AvailablePlayers = [u for u in PlayerPool  if ( TeamRosterCompositionNeeds[T]['PositionMaximums'][u['Position']] > 0)]
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
        AvailablePlayers = sorted(AvailablePlayers, key=lambda P: P['playerseasonskill__OverallRating'] * ClassOverallNormalizer[P['ClassID']] * ClassNeedModifier[P['ClassID']] * PositionNeedModifier[P['Position']] * TeamDict[T]['PositionPreference'][P['PositionID__PositionGroupID__PositionGroupName']], reverse=True)


        if len(AvailablePlayers) < 5:
            PlayerForTeam = random.choice(AvailablePlayers)
        else:
            AvailablePlayers = AvailablePlayers[:4]
            PlayerForTeam = random.choice(AvailablePlayers)
        PlayerPool.remove(PlayerForTeam)


        TeamRosterCompositionNeeds[T]['ClassID'][PlayerForTeam['ClassID']] -=1
        TeamRosterCompositionNeeds[T]['FullPosition'][PlayerForTeam['Position']] -=1
        TeamRosterCompositionNeeds[T]['StarterPosition'][PlayerForTeam['Position']] -=1
        TeamRosterCompositionNeeds[T]['PositionMaximums'][PlayerForTeam['Position']] -=1

        #P = PlayerList.filter(PlayerID = PlayerForTeam['PlayerID']).first()
        PTS = PlayerTeamSeason(WorldID=WorldID, TeamSeasonID = TS, PlayerID_id = PlayerForTeam['PlayerID'], ClassID_id = PlayerForTeam['ClassID'])
        PlayersTeamSeasonToSave.append(PTS)

    PlayerSkillPool = []
    for T in TeamRosterCompositionNeeds:
        TS = None
        for Pos in TeamRosterCompositionNeeds[T]['StarterPosition']:
            if TeamRosterCompositionNeeds[T]['StarterPosition'][Pos] > 0:
                for u in range(TeamRosterCompositionNeeds[T]['StarterPosition'][Pos]):
                    if TS is None:
                        TS = T.CurrentTeamSeason
                    NewPlayer = GeneratePlayer(None, CurrentSeason, None, WorldID, Pos)
                    NewPlayer.save()

                    PTS = PlayerTeamSeason(WorldID=WorldID, TeamSeasonID = TS, PlayerID = NewPlayer, ClassID =NewPlayer.ClassID)
                    PlayersTeamSeasonToSave.append(PTS)

                    PlayerSkillPool.append(PopulatePlayerSkills(NewPlayer, CurrentSeason, WorldID))

                    print('New PTS', PTS)

    PlayerSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=True)
    PlayerTeamSeason.objects.bulk_create(PlayersTeamSeasonToSave)

    for T in AllTeams:
        TS = TeamSeason.objects.get(TeamID=T, WorldID = WorldID, LeagueSeasonID = CurrentSeason)
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
                P.save()




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

    AllTeams = Team.objects.filter(WorldID=WorldID)
    NumTeams = AllTeams.count()
    NumberOfExistingRecruits = Player.objects.filter(WorldID=WorldID, IsRecruit = True).count()
    NumberOfPlayersNeeded = int(RecruitsPerTeam * NumTeams) - NumberOfExistingRecruits

    for T in AllTeams:
        TS = TeamSeason.objects.get(TeamID=T, WorldID = WorldID, LeagueSeasonID = CurrentSeason)
        PTS = PlayerTeamSeason.objects.filter(TeamSeasonID = TS)
        TeamSeniors = PTS.filter(ClassID__ClassName = 'Senior').count()
        TS.ScholarshipsToOffer = int(TeamSeniors * 1.2)
        TS.save()

    RecruitPool = []
    print('Creating ',NumberOfPlayersNeeded,' recruits')
    SeniorClassID = Class.objects.filter(ClassName = 'HS Senior').first()
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        RecruitPool.append(GeneratePlayer(None, CurrentSeason, SeniorClassID, WorldID))
        #print(PlayerCount, len(RecruitPool))
    Player.objects.bulk_create(RecruitPool, ignore_conflicts=True)
    print('Done creating recruits')

    RecruitPool = Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit = True)

    RecruitSkillPool = []
    for P in RecruitPool:
        RecruitSkillPool.append(PopulatePlayerSkills(P, CurrentSeason, CurrentWorld))
    PlayerSeasonSkill.objects.bulk_create(RecruitSkillPool, ignore_conflicts=True)

    TeamList = sorted(TeamsThatNeedPlayers, key = lambda k: k[0].TeamPrestige, reverse = True)

    NumberOfRecruits = len(RecruitPool)

    StarDistribution = {5:.0166,
                        4:.1,
                        3:.3,
                        2:.6,
                        1: 1.0}

    RecruitPreferenceBase = [
        ('ChampionshipContenderValue', 50),
        ('TeamPrestigeValue',          99),
        ('CloseToHomeValue',           99),
        ('PlayingTimeValue',           10),
        ('CoachStabilityValue',        10),
        ('CoachStyleValue',            10),
        ('FacilitiesValue',            50),
        ('ProPotentialValue',          80),
        ('CampusLifestyleValue',       50),
        ('AcademicPrestigeValue',      10),
        #('LocationValue',              10),
        ('TelevisionExposureValue',    50)
    ]

    PreferenceRatingMap = {
        'ChampionshipContenderValue': 'ChampionshipContenderRating',
        'TeamPrestigeValue':        'TeamPrestige',
        'CloseToHomeValue':   'CloseToHomeValue',
        'PlayingTimeValue':   'PlayingTimeValue',
        'CoachStabilityValue': 'CoachStabilityRating',
        'CoachStyleValue':     'CoachStyleValue',
        'FacilitiesValue':     'FacilitiesRating',
        'ProPotentialValue': 'ProPotentialRating',
        'CampusLifestyleValue': 'CampusLifestyleRating',
        'AcademicPrestigeValue': 'AcademicPrestigeRating',
        'TelevisionExposureValue':'TelevisionExposureRating',
        'LocationValue': 'LocationRating'
    }


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



    TeamList = list(TeamSeason.objects.filter(WorldID = WorldID).filter(ScholarshipsToOffer__gte = 0).filter(coachteamseason__CoachPositionID__CoachPositionAbbreviation = 'HC').values('TeamSeasonID', 'TeamID', 'TeamID__CityID__Latitude', 'TeamID__CityID__Longitude', 'coachteamseason__CoachID__ScoutingRating' , 'TeamID__TeamPrestige', 'TeamID__FacilitiesRating', 'TeamID__ProPotentialRating', 'TeamID__CampusLifestyleRating', 'TeamID__AcademicPrestigeRating', 'TeamID__TelevisionExposureRating', 'TeamID__CoachStabilityRating', 'TeamID__ChampionshipContenderRating', 'TeamID__LocationRating').annotate(
        CoachScoutVariance = Case(
            When(coachteamseason__CoachID__ScoutingRating__gte = 90, then=1),
            When(coachteamseason__CoachID__ScoutingRating__gte = 70, coachteamseason__CoachID__ScoutingRating__lt = 90, then=2),
            When(coachteamseason__CoachID__ScoutingRating__gte = 45, coachteamseason__CoachID__ScoutingRating__lt = 70, then=3),
            default=Value(4),
            output_field = IntegerField()
        )
    ))
    for T in TeamList:
        AddKey = {}
        for k in T:
            NewKey = k.replace('TeamID__', '')
            AddKey[NewKey] = T[k]
        for k in AddKey:
            T[k] = AddKey[k]
        T['TeamCity'] = {'Longitude': T['CityID__Longitude'], 'Latitude': T['CityID__Latitude']}
        T['PlayingTimeValue'] = 50
        T['CoachStyleValue'] = 50
        T['TeamPrestigeValue'] = T['TeamID__TeamPrestige'] ** 2
        T['ChampionshipContenderValue'] = T['TeamID__TeamPrestige'] ** 2


    RecruitTeamDict = {'TeamList': []}


    RecruitPool = Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit = True)
    RecruitPool = sorted(RecruitPool, key = lambda k: NormalBounds(k.OverallRating,2,10,99), reverse = True)

    RecruitCount = 0
    RTSToSave = []
    PlayersToSave = []
    for Recruit in RecruitPool:
        RecruitCount +=1
        Pos = Recruit.PositionID
        State = Recruit.CityID.StateID
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

        Recruit.RecruitingStars = PlayerStar
        Recruit.Recruiting_NationalRank = RecruitCount
        Recruit.Recruiting_NationalPositionalRank = PositionalRankingTracker[Pos]
        Recruit.Recruiting_StateRank = StateRankingTracker[State]

        RecruitPreferences = RandomRecruitPreference(RecruitPreferenceBase)

        RecruitTopPreferences = []

        for Pref in RecruitPreferences:
            setattr(Recruit, Pref, RecruitPreferences[Pref])
            if RecruitPreferences[Pref] in [1,2,3]:
                RecruitTopPreferences.append((Pref, RecruitPreferences[Pref]))
            #print()
        PlayersToSave.append(Recruit)

    Player.objects.bulk_update(PlayersToSave, ['RecruitingStars', 'Recruiting_NationalRank', 'Recruiting_NationalPositionalRank', 'Recruiting_StateRank', 'ChampionshipContenderValue', 'TeamPrestigeValue', 'CloseToHomeValue', 'PlayingTimeValue', 'CoachStabilityValue', 'CoachStyleValue', 'FacilitiesValue', 'ProPotentialValue', 'CampusLifestyleValue', 'AcademicPrestigeValue', 'TelevisionExposureValue' ])


    RecruitPool = Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit = True).values('PlayerID', 'PositionID', 'playerseasonskill__OverallRating', 'CityID__Latitude', 'CityID__Longitude', 'CityID__StateID', 'ChampionshipContenderValue', 'TeamPrestigeValue', 'CloseToHomeValue', 'PlayingTimeValue', 'CoachStabilityValue', 'CoachStyleValue', 'FacilitiesValue', 'ProPotentialValue', 'CampusLifestyleValue', 'AcademicPrestigeValue', 'TelevisionExposureValue')

    for Recruit in RecruitPool:
        RecruitTopPreferences = {}
        RecruitCity = {'Longitude': Recruit['CityID__Longitude'], 'Latitude': Recruit['CityID__Latitude']}
        for RecruitingPreference in ['ChampionshipContenderValue', 'TeamPrestigeValue', 'CloseToHomeValue', 'PlayingTimeValue', 'CoachStabilityValue', 'CoachStyleValue', 'FacilitiesValue', 'ProPotentialValue', 'CampusLifestyleValue', 'AcademicPrestigeValue', 'TelevisionExposureValue']:
            if Recruit[RecruitingPreference] in [1,2,3]:
                RecruitTopPreferences[Recruit[RecruitingPreference]] = RecruitingPreference


        for TS in TeamList:

            ScoutedOverall = NormalTrunc(Recruit['playerseasonskill__OverallRating'], TS['CoachScoutVariance'], 1, 99)

            RecruitDistance = DistanceBetweenCities_Dict(RecruitCity, TS['TeamCity'])
            RecruitDistanceInterestValue = 0
            for Locality in RecruitSchoolDistanceMap:
                if RecruitDistance >= RecruitSchoolDistanceMap[Locality]['LowerBound'] and RecruitDistance <= RecruitSchoolDistanceMap[Locality]['UpperBound']:
                    RecruitDistanceInterestValue = RecruitSchoolDistanceMap[Locality]['PointValue']

            TS['CloseToHomeValue'] = RecruitDistanceInterestValue


            RTS = RecruitTeamSeason(WorldID = WorldID, PlayerID_id = Recruit['PlayerID'], TeamSeasonID_id = TS['TeamSeasonID'], ScoutedOverall = ScoutedOverall, IsActivelyRecruiting = False, Preference1Name = RecruitTopPreferences[1],Preference1MatchRating = TS[PreferenceRatingMap[RecruitTopPreferences[1]]], Preference2Name = RecruitTopPreferences[2],Preference2MatchRating = TS[PreferenceRatingMap[RecruitTopPreferences[2]]], Preference3Name = RecruitTopPreferences[3],Preference3MatchRating = TS[PreferenceRatingMap[RecruitTopPreferences[3]]], TeamPrestigeRating=TS['TeamPrestige'], DistanceMatchRating = RecruitDistanceInterestValue)
            RTS.InterestLevel = int((1.5*RTS.Preference1MatchRating) + (1.25*RTS.Preference2MatchRating) + (1*RTS.Preference3MatchRating) + RTS.DistanceMatchRating + (.5 * RTS.TeamPrestigeRating))
            RTSToSave.append(RTS)



    RecruitTeamSeason.objects.bulk_create(RTSToSave, ignore_conflicts=False)
    RTS = RecruitTeamSeason.objects.all().annotate(RecruitingTeamRank_new = Window(
        expression=RowNumber(),
        partition_by=F("PlayerID"),
        order_by=F("InterestLevel").desc(),
    ))
    for R in RTS:
        R.RecruitingTeamRank = R.RecruitingTeamRank_new
    RecruitTeamSeason.objects.bulk_update(RTS,['RecruitingTeamRank'])
    print('RecruitTeamSeasons Complete')

def CreateCoaches(LS, WorldID):

    CoachesPerTeam = CoachPosition.objects.filter(Q(IsCoordinator=True) | Q(IsHeadCoach=True))

    TeamList = TeamSeason.objects.filter(WorldID=WorldID).filter(LeagueSeasonID = LS).order_by('-TeamID__TeamPrestige')
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
    for TS in TeamSeason.objects.filter(WorldID_id = WorldID):
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


def CreateTeamSeasons(LS, WorldID):

    CurrentWorld = LS.WorldID
    ListOfTeams = Team.objects.filter(WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)

    for u in ListOfTeams:
        obj, created = TeamSeason.objects.get_or_create(WorldID=WorldID, TeamID = u, LeagueSeasonID = CurrentSeason)
        obj.save()


    CurrentSeason.TeamSeasonsCreated = True
    CurrentSeason.save()

def ConfigureLineups():


    return None


def EndRegularSeason(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID=WorldID).filter(IsCurrent = 1).first()
    CurrentLeague = CurrentSeason.LeagueID
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here

    GameTimeHourChoices = [12, 12, 2, 3, 3, 7, 7, 8]
    GameTimeMinuteChoices = ['00', '00', '00', '00', '30', '30', '30', '05']

    CurrentWeek = Week.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    NextWeek = CurrentWeek.NextWeek

    if CurrentSeason.ConferenceChampionshipsCreated == False:
        print('time to do Conf Champ stuff!')
        for Conf in CurrentWorld.conference_set.all():
            TeamSeasonList = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamID__ConferenceID = Conf).filter(ConferenceRank__lte = 2)

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

    GameTimeHourChoices = [12, 12, 2, 3, 3, 7, 7, 8]
    GameTimeMinuteChoices = ['00', '00', '00', '00', '30', '30', '30', '05']

    print('CurrentSeason.PlayoffCreated', CurrentSeason.PlayoffCreated)
    print('time to do Bowl stuff!')
    #CalculateRankings(CurrentSeason, CurrentWorld)

    if CurrentSeason.PlayoffCreated == False:
        TeamRanksAvailable = []
        for u in TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).values('NationalRank'):
            TeamRanksAvailable.append(u['NationalRank'])

        for B in Bowl.objects.filter(WorldID = CurrentWorld).filter(BowlPrestige__gte = 7).order_by('Team1Rank'):

            HomeTSWR = TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).filter(NationalRank = TeamRanksAvailable.pop(0)).first()
            HomeTS   = HomeTSWR.TeamSeasonID

            AwayTSWR = None
            TeamRankCount = 0
            while AwayTSWR is None:
                AttemptedRank = TeamRanksAvailable[TeamRankCount]
                AwayTSWR = TeamSeasonWeekRank.objects.filter(WorldID=CurrentWorld).filter(IsCurrent = 1).exclude(TeamSeasonID__TeamID__ConferenceID = HomeTS.TeamID.ConferenceID).filter(NationalRank = AttemptedRank).first()
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


def PopulateTeamSeasonPositions():

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
        for TS in list(TeamSeason.objects.filter(WorldID = CurrentWorld)):
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

    createCalendar(StartYear=StartYear, StartAfterMonthDay=(8,25), WorldID=WorldID, LeagueSeasonID=LS)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create calendar')


    if DoAudit:
        start = time.time()
    CreateTeamSeasons(LS, WorldID)
    LS.TeamSeasonsCreated = True
    LS.save()
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditDescription='Create Team Seasons')


    if IsFirstLeagueSeason:

        CreateCoaches(LS, WorldID)
        CreateTeamPositions(LS, WorldID)
        if DoAudit:
            start = time.time()
        CreatePlayers(LS, WorldID)
        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 3, AuditDescription='Create Players')

        UpdateTeamPositions(LS, WorldID)

    if DoAudit:
        start = time.time()

    #CreateRecruitingClass(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 4, AuditDescription='Create Recruiting Class')
    if DoAudit:
        start = time.time()

    CreateSchedule(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 3, AuditDescription='CreateSchedule')
    if DoAudit:
        start = time.time()

    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=True)
    AssignRedshirts(LS, WorldID)
    CutPlayers(LS, WorldID)
    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=False)
    CalculateTeamOverall(LS, WorldID)
    CalculateRankings(LS, WorldID)
    CalculateConferenceRankings(LS, WorldID)
    SelectBroadcast(LS, WorldID)
    SelectPreseasonAllAmericans(WorldID, LS)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed,ScalesWithTeams=True, NumberTeam=AuditTeamCount, AuditVersion = 1, AuditDescription='CalculateRankings, CalculateConferenceRankings, SelectBroadcast')
