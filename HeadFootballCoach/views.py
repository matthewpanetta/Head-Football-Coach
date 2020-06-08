from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse, JsonResponse
from django.template import loader
import pandas as pd
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case, When, FloatField, DecimalField, IntegerField, CharField, BooleanField, Value, Window, OuterRef, Subquery, ExpressionWrapper
from django.db.models.functions.window import Rank, RowNumber, Lag, Ntile
from django.db.models.functions import Length, Concat, Coalesce
from .models import Audit, League, TeamSeasonStrategy, TeamSeasonInfoRating,TeamGame,Week,Phase,Position, PositionGroup, TeamSeasonPosition, Class, CoachPosition, PlayerTeamSeasonDepthChart, TeamSeasonWeekRank, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_PlayoffRound,PlayoffRound, NameList, User, Region, State, City,World, Headline, Playoff, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason, DivisionSeason, ConferenceSeason
from datetime import timedelta, date
import random
import numpy
from .resources import ChooseCaptains, SetPlayerTeamSeasonTotals, TeamCuts, TeamRedshirts, CreateBowls,UpdateTeamPositions, EndSeason, PlayerDeparture,NewSeasonCutover,InitializeLeaguePlayers, InitializeLeagueSeason, BeginOffseason, CreateRecruitingClass, round_robin, CreateSchedule, CreatePlayers, ConfigureLineups, CreateCoaches, EndRegularSeason
from .scripts.rankings import     CalculateConferenceRankings,CalculateRankings, SelectBroadcast
from .utilities import FindRange, NormalVariance, NormalTrunc, WeightedProbabilityChoice, SecondsToMinutes,MergeDicts,GetValuesOfSingleObjectDict, UniqueFromQuerySet, IfNull, IfBlank, GetValuesOfObject, GetValuesOfSingleObject
from .scripts.GameSim import GameSim
from .scripts.Recruiting import WeeklyRecruiting, FakeWeeklyRecruiting_New, PrepareForSigningDay, ScoutPlayer
from .scripts.SeasonAwards import ChoosePlayersOfTheWeek, SelectPreseasonAllAmericans
from .scripts.DepthChart import CreateDepthChart
from .scripts.Offseason import StartCoachingCarousel, CreateNextLeagueSeason, GraduateSeniors, RolloverNewLeagueSeason, PrepForSeason, TrainingCamps
from .scripts.SRS.SRS   import CalculateSRS
import math
import json
from .scripts.import_csv import LoadData, ExtractData, LoadGameStructures, ImportSubPositions
from .scripts.serializers import TeamSerializer,TeamSeasonSerializer
from django.core import serializers
import time
from .scripts.GenerateHeadlines import GenerateHeadlines
from django.db import connection, reset_queries


class Round(Func):
  function = 'ROUND'
  arity = 2

def Max_Int(a,b):
    if a > b:
        return a
    else:
        return b


def Min_Int(a,b):
    if a > b:
        return b
    else:
        return a


def GetUserTeam(WorldID):

    return Team.objects.filter(WorldID = WorldID, IsUserTeam = True).first()


def NavBarLinks(Path = 'Overview', GroupName='World', WeekID = None, WorldID = None, UserTeam = None):
    TeamID = UserTeam.TeamID
    UserTeamLogo = UserTeam.TeamLogoURL

    CanSim = True

    UserActions = []

    SimAction_Week = {'LinkDisplay': 'Sim This Week', 'id': 'SimThisWeek', 'Href': '#', 'ClassName': 'sim-action'}
    SimAction_Phase = {'LinkDisplay': 'Sim This Phase', 'id': 'SimThisPhase', 'Href': '#', 'ClassName': 'sim-action'}
    if WeekID is not None:
        if WeekID.WeekName == 'Preseason':
            CanSim = True
            SaveLS = False

            CurrentLeagueSeason = WeekID.PhaseID.LeagueSeasonID

            if not CurrentLeagueSeason.Preseason_UserCutPlayers:
                if PlayerTeamSeason.objects.filter(TeamSeasonID__TeamID = UserTeam).filter(TeamSeasonID__LeagueSeasonID = CurrentLeagueSeason).count() > CurrentLeagueSeason.LeagueID.PlayersPerTeam:

                    UserActions.append({'LinkDisplay': 'Cut Players', 'Href': '/World/{WorldID}/Team/{TeamID}/Roster'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''})
                    CanSim = False
                else:
                    CurrentLeagueSeason.Preseason_UserCutPlayers = True
                    SaveLS = True

            if PlayerTeamSeason.objects.filter(TeamSeasonID__TeamID = UserTeam).filter(TeamSeasonID__LeagueSeasonID = CurrentLeagueSeason).filter(TeamCaptain = True).count() < 3:
                UserActions.append({'LinkDisplay': 'Set Captains', 'Href': '/World/{WorldID}/Team/{TeamID}/Roster'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''})
                CanSim = False

            if not CurrentLeagueSeason.Preseason_UserSetGameplan:
                UserActions.append({'LinkDisplay': 'Set Gameplan', 'Href': '/World/{WorldID}/Team/{TeamID}/Gameplan'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''})
                CanSim = False

            if not CurrentLeagueSeason.Preseason_UserSetDepthChart:
                UserActions.append({'LinkDisplay': 'Set Depth Chart', 'Href': '/World/{WorldID}/Team/{TeamID}/DepthChart'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''})
                CanSim = False

            if not CanSim:
                SimAction_Week['ClassName'] += ' w3-disabled'
                SimAction_Phase['ClassName'] += ' w3-disabled'

            if SaveLS:
                CurrentLeagueSeason.save()

        elif WeekID.PhaseID.PhaseName == 'Season Recap':
            UserActions.append({'LinkDisplay': 'View Season Awards', 'Href': '/World/{WorldID}/Awards'.format(WorldID=WorldID), 'ClassName': ''})
        elif WeekID.WeekName == 'Coach Carousel':
            UserActions.append({'LinkDisplay': 'View Coach Carousel', 'Href': '/World/{WorldID}/CoachCarousel'.format(WorldID=WorldID), 'ClassName': ''})
        elif WeekID.WeekName == 'Draft Departures':
            UserActions.append({'LinkDisplay': 'View Player Departures', 'Href': '/World/{WorldID}/PlayerDepartures'.format(WorldID=WorldID), 'ClassName': ''})

        elif WeekID.WeekName == 'National Signing Day':
            UserActions.append({'LinkDisplay': 'View Recruiting Board', 'Href': '/World/{WorldID}/Recruiting'.format(WorldID=WorldID), 'ClassName': ''})

        elif WeekID.WeekName == 'Prepare for Summer Camps':
            UserActions.append({'LinkDisplay': 'Set Player Development', 'Href': '/World/{WorldID}/PlayerDevelopment'.format(WorldID=WorldID), 'ClassName': ''})
#GraduatedAfterSeason


        SimAction_Phase['LinkDisplay'] = 'Sim to ' + WeekID.PhaseID.NextPhaseName
        UserActions.insert(0,SimAction_Phase)

        if not WeekID.LastWeekInPhase:
            UserActions.insert(0,SimAction_Week)

        SeasonStartYear = WeekID.PhaseID.LeagueSeasonID.SeasonStartYear

    SimActionStatus = {'CanSim': CanSim, 'LinkGroups': []}
    LinkGroups = [
        {'GroupName': 'Action', 'GroupDisplay': '{WeekName}, {SeasonStartYear} TASKS'.format(WeekName = WeekID.WeekName, SeasonStartYear=WeekID.PhaseID.LeagueSeasonID.SeasonStartYear), 'GroupLinks': UserActions},
        {'GroupName': 'World', 'GroupDisplay': '<img src="/static/img/TeamLogos/ncaa-text.png" class="" alt="">', 'GroupLinks':[
            {'LinkDisplay': 'Overview', 'id': '', 'Href': '/World/{WorldID}'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Standings', 'id': '', 'Href': '/World/{WorldID}/Conferences'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Rankings', 'id': '', 'Href': '/World/{WorldID}/Rankings'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Schedule', 'id': '', 'Href': '/World/{WorldID}/Schedule'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Headline', 'id': '', 'Href': '/World/{WorldID}/Headlines'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Awards & Races', 'id': '', 'Href': '/World/{WorldID}/Awards'.format(WorldID=WorldID), 'ClassName': ''}
        ]},
        {'GroupName': 'Team', 'GroupDisplay': '<img src="{UserTeamLogo}" class="" alt="">'.format(UserTeamLogo=UserTeamLogo), 'GroupLinks':[
            {'LinkDisplay': 'Overview', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Schedule', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}/Schedule'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Roster', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}/Roster'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Depth Chart', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}/DepthChart'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Gameplan', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}/Gameplan'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Coaches', 'id': '', 'Href': '/World/{WorldID}/Coaches/Team/{TeamID}'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Recruiting', 'id': '', 'Href': '/World/{WorldID}/Recruiting'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'Player Development', 'id': '', 'Href': '/World/{WorldID}/PlayerDevelopment/Team/{TeamID}'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''},
            {'LinkDisplay': 'History', 'id': '', 'Href': '/World/{WorldID}/Team/{TeamID}/History'.format(WorldID=WorldID, TeamID = TeamID), 'ClassName': ''}
        ]},
        {'GroupName': 'Almanac', 'GroupDisplay': 'Almanac', 'GroupLinks':[
            {'LinkDisplay': 'Player Stats', 'id': '', 'Href': '/World/{WorldID}/PlayerStats/Season/{SeasonStartYear}'.format(WorldID=WorldID, SeasonStartYear=SeasonStartYear), 'ClassName': ''},
            {'LinkDisplay': 'Player Records', 'id': '', 'Href': '/World/{WorldID}/PlayerRecords'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Team Stats', 'id': '', 'Href': '/World/{WorldID}/TeamStats/Season/{SeasonStartYear}'.format(WorldID=WorldID, SeasonStartYear=SeasonStartYear), 'ClassName': ''},
            {'LinkDisplay': 'Team Records', 'id': '', 'Href': '/World/{WorldID}/TeamRecords'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Hall of Fame', 'id': '', 'Href': '/World/{WorldID}/HallOfFame'.format(WorldID=WorldID), 'ClassName': ''},
            {'LinkDisplay': 'Coach Stats', 'id': '', 'Href': '/World/{WorldID}/Coaches'.format(WorldID=WorldID), 'ClassName': ''}
        ]},
        {'GroupName': 'Game', 'GroupDisplay': 'Game', 'GroupLinks':[
            {'LinkDisplay': 'Home Page', 'id': '', 'Href': '/', 'ClassName': ''},
            {'LinkDisplay': 'Admin', 'id': '', 'Href': '/admin', 'ClassName': ''},
            {'LinkDisplay': 'Audit', 'id': '', 'Href': '/audit', 'ClassName': ''},
            {'LinkDisplay': 'Credits', 'id': '', 'Href': '/Credits', 'ClassName': ''},
            {'LinkDisplay': 'Acheivements', 'id': '', 'Href': '/Acheivements', 'ClassName': ''}
        ]},
    ]

    for Group in LinkGroups:
        for Link in Group['GroupLinks']:
            if Link['LinkDisplay'] == Path and Group['GroupName'] == GroupName:
                Link['ClassName'] = 'Selected'



    SimActionStatus['LinkGroups'] = LinkGroups
    return SimActionStatus



def TeamHeaderLinks(Path = 'Overview', SeasonStartYear = None, CurrentWorld = None):
    AllPaths = [{'HrefExtension': '', 'Display': 'Overview'},  {'HrefExtension': 'Roster', 'Display': 'Roster'}, {'HrefExtension': 'DepthChart', 'Display': 'Depth Chart'},{'HrefExtension': 'Gameplan', 'Display': 'Gameplan'}, {'HrefExtension': 'Schedule', 'Display': 'Schedule'}, {'HrefExtension': 'History', 'Display': 'History'}]
    LinkPaths = [P for P in AllPaths if P['Display'] != Path]

    for PathObject in AllPaths:
        if PathObject['Display'] == 'History':
            continue

        elif SeasonStartYear is not None:
            if PathObject['Display'] == 'Overview':
                PathObject['HrefExtension'] += 'Season/{SeasonStartYear}'.format(SeasonStartYear=SeasonStartYear)
            else:
                PathObject['HrefExtension'] += '/Season/{SeasonStartYear}'.format(SeasonStartYear=SeasonStartYear)


    if SeasonStartYear is not None:
        Seasons = list(LeagueSeason.objects.filter(WorldID = CurrentWorld).values('SeasonStartYear').annotate(
            SeasonHref=Concat(Value('../'), F('SeasonStartYear')  ,output_field=CharField())
        ).order_by('-SeasonStartYear'))
    else:
        Seasons = list(LeagueSeason.objects.filter(WorldID = CurrentWorld).values('SeasonStartYear').annotate(
            SeasonHref=Concat(Value('./Season/'), F('SeasonStartYear')  ,output_field=CharField())
        ).order_by('-SeasonStartYear'))

    for PathObject in AllPaths:
        if PathObject['Display'] == Path:
            return {'LinkPaths': LinkPaths, 'ExternalPaths': PathObject, 'Seasons': Seasons}
    return AllPaths[0]

def GetAllTeams(WorldID, SortType='National', GroupingName=None, GroupingID=None, LeagueSeasonID = None):

    TeamDictStarter = Team.objects.filter(WorldID = WorldID).annotate(
        DivisionRank = Min('teamseason__DivisionRank', filter = Q(teamseason__LeagueSeasonID__IsCurrent = True)),
        NationalRank = Min('teamseason__teamseasonweekrank__NationalRank', filter = Q(teamseason__teamseasonweekrank__IsCurrent = True))
    )

    if SortType == 'National':
        return sorted(TeamDictStarter, key = lambda k: k.NationalRank, reverse = False)
    elif SortType == 'Conference':
        if GroupingName is not None:
            TeamDictStarter = TeamDictStarter.filter(DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceName = GroupingName)
        else:
            TeamDictStarter = TeamDictStarter.filter(DivisionSeasonID__ConferenceSeasonID__ConferenceID = GroupingID)
        return sorted(TeamDictStarter, key = lambda k: k.DivisionRank, reverse = False)

    return None

def GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason=None, CurrentWeek=None):

    if CurrentSeason is None:
        CurrentSeason = CurrentWorld.leagueseason_set.filter(IsCurrent = 1).first()

    if CurrentWeek is None:
        CurrentWeek = Week.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = True).filter(PhaseID__LeagueSeasonID = CurrentSeason).first()
    LastWeek    = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber__lte = CurrentWeek.WeekNumber-1).annotate(
        GameCount = Count('game__GameID')
    ).filter(GameCount__gt = 0).order_by('-WeekID').first()

    WorldID = CurrentWorld.WorldID

    GameList = Game.objects.filter(WorldID = CurrentWorld).values(
        'GameID', 'GameTime'
    ).annotate(
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
        GameHeadlineDisplay = Case(
            When(BowlID__IsNationalChampionship = True, then=Value('National Championship!')),
            When(BowlID__BowlName__isnull = False, then=F('BowlID__BowlName')),
            When(IsConferenceChampionship = True, then= Concat(Min('teamgame__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation'), Value(' Championship'), output_field=CharField())),
            When(TeamRivalryID__RivalryName__isnull = False, then=F('TeamRivalryID__RivalryName')),
            When(TeamRivalryID__isnull = False, then=Value('Rivalry game')),
            When(NationalBroadcast = True, then=Value('National Broadcast')),
            When(RegionalBroadcast = True, then=Value('Regional Broadcast')),
            default=Value(''),
            output_field=CharField()
        ),
        MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
        UserTeamGame = Max('teamgame__TeamSeasonID__TeamID__IsUserTeam')
    ).order_by('-UserTeamGame'  , 'MinNationalRank')


    TGs = TeamGame.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(GameID__WeekID = LastWeek).values('TeamSeasonID__TeamID','GameID', 'TeamSeasonID', 'Points', 'TeamRecord', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID__Abbreviation', 'TeamSeasonID__TeamID__TeamLogoURL').annotate(
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
        TeamWinningGameBold = Case(
            #When(IsWinningTeam = True, then=Value('TeamWinningGameBold')),
            When(Points = Max('GameID__teamgame__Points'), then=Value('TeamWinningGameBold')),
            default=Value('TeamLosingGame'),
            output_field=CharField()
        ),
        TeamRecordDisplay = Case(
            When(GameID__WasPlayed = True, then=F('TeamRecord')),
            default=Concat(F('TeamSeasonID__Wins'), Value('-'), F('TeamSeasonID__Losses'), output_field=CharField()),
            output_field=CharField()
        ),
        NationalRankDisplay = Case(
            When(TeamSeasonWeekRankID__NationalRank__gt = 25, then=Value('')),
            default=Concat(Value(''), F('TeamSeasonWeekRankID__NationalRank'), output_field=CharField()),
            output_field=CharField()
        ),
    ).order_by('IsHomeTeam')

    TeamGameDict = {}
    for TG in TGs:
        if TG['GameID'] not in TeamGameDict:
            TeamGameDict[TG['GameID']] = []
        TeamGameDict[TG['GameID']].append(TG)

    RecentGames   = list(GameList.filter(WeekID = LastWeek).filter(WasPlayed = 1))
    for G in RecentGames:
        G['TeamGames'] = TeamGameDict[G['GameID']]
    return RecentGames


def CurrentDate(WorldID):

    if isinstance(WorldID, int):
        WorldID = World.objects.filter(WorldID = WorldID).first()

    CurrentDate = WorldID.calendar_set.filter(IsCurrent = 1).first()
    #CurrentDate = Calendar.objects.get(WorldID = WorldID, IsCurrent = 1)

    return CurrentDate

def GetCurrentWeek(WorldID):

    if isinstance(WorldID, int):
        WorldID = World.objects.filter(WorldID = WorldID).first()

    CurrentWeek = WorldID.week_set.filter(IsCurrent = 1).select_related('PhaseID__LeagueSeasonID').first()

    return CurrentWeek


def GetHistoricalWeek(WorldID, LeagueSeasonID):

    if isinstance(WorldID, int):
        WorldID = World.objects.filter(WorldID = WorldID).first()

    if LeagueSeasonID is None:
        CurrentWeek = WorldID.week_set.filter(IsCurrent = 1).first()
    else:
        CurrentWeek = Week.objects.filter(IsCurrent = 1).filter(PhaseID__LeagueSeasonID = LeagueSeasonID).first()

        if CurrentWeek is None:
            CurrentWeek = Week.objects.filter(PhaseID__LeagueSeasonID = LeagueSeasonID).annotate(
                RankCount = Count('teamseasonweekrank__TeamSeasonWeekRankID')
            ).filter(RankCount__gt = 0).order_by('-WeekID').first()

    return CurrentWeek


def POST_PickTeam(request, WorldID):


    TeamName = request.POST['TeamName']
    print('Team chosen:', TeamName)

    CurrentWorld = World.objects.get(WorldID = WorldID)

    ChosenTeam = Team.objects.get(WorldID = WorldID, TeamName = TeamName)
    ChosenTeam.IsUserTeam = True
    ChosenTeam.save()

    LS = CurrentWorld.leagueseason_set.filter(IsCurrent = True).first()

    InitializeLeaguePlayers(CurrentWorld, LS, True) #True for IsFirstLeagueSeason


    return JsonResponse({'success':'value'})



def POST_SetPlayerFaceJson(request, WorldID, PlayerID):

    CurrentWorld = World.objects.get(WorldID = WorldID)
    PlayerToChange = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerID=PlayerID).first()

    PlayerFaceJson = request.POST['PlayerFaceJson']

    if PlayerToChange.PlayerFaceJson == '':
        PlayerToChange.PlayerFaceJson = PlayerFaceJson
        PlayerToChange.save()


    return JsonResponse({'success':'value'})


def RemovePlayerFromDepthChart(WorldID, PlayerID, ):
    CurrentWorld = World.objects.get(WorldID = WorldID)
    PlayerTeamSeasonToCut = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(PlayerID_id=PlayerID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()

    for PlayerTeamSeasonToCutDepthChart in PlayerTeamSeasonToCut.playerteamseasondepthchart_set.all():
        NumberOfStarters = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = PlayerTeamSeasonToCut.TeamSeasonID).filter(PositionID = PlayerTeamSeasonToCutDepthChart.PositionID).filter(IsStarter = True).count()

        PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = PlayerTeamSeasonToCut.TeamSeasonID).filter(PositionID = PlayerTeamSeasonToCutDepthChart.PositionID).filter(DepthPosition__gt = PlayerTeamSeasonToCutDepthChart.DepthPosition).update(
            DepthPosition = F('DepthPosition') - 1
        )

        if PlayerTeamSeasonToCutDepthChart.IsStarter:

            PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = PlayerTeamSeasonToCut.TeamSeasonID).filter(PositionID = PlayerTeamSeasonToCutDepthChart.PositionID).filter(DepthPosition__lte = NumberOfStarters).filter(IsStarter = False).update(
                IsStarter = True
            )

        PlayerTeamSeasonToCutDepthChart.delete()

def POST_PlayerRecruitingBoard(request, WorldID, PlayerID, AddOrRemove):

    print('WorldID, PlayerID, AddOrRemove', WorldID, PlayerID, AddOrRemove)
    RTS = RecruitTeamSeason.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__PlayerID_id=PlayerID, TeamSeasonID__TeamID__IsUserTeam = True).select_related('PlayerTeamSeasonID__PlayerID').first()
    PlayerName = RTS.PlayerTeamSeasonID.PlayerID.FullName

    if RTS is not None:
        if AddOrRemove == 'Add':
            RTS.IsActivelyRecruiting = True
            RTS.save()
            return JsonResponse({'message':'{PlayerName} added to recruiting board'.format(PlayerName = PlayerName)}, status=200)

        elif AddOrRemove == 'Remove':
            RTS.IsActivelyRecruiting = False
            RTS.save()
            return JsonResponse({'message':'{PlayerName} removed from recruiting board'.format(PlayerName = PlayerName)}, status=200)

    return JsonResponse({'message':'Invalid command.'}, status=422)



def POST_ScoutRecruit(request, WorldID, PlayerID):

    print('WorldID, PlayerID', WorldID, PlayerID)
    CurrentWorld = World.objects.filter(WorldID = WorldID).prefetch_related('week_set').first()
    CurrentWeek = CurrentWorld.week_set.all().first()
    RTS = RecruitTeamSeason.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__PlayerID_id=PlayerID).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID__IsUserTeam = True).select_related('PlayerTeamSeasonID__PlayerID').first()
    PlayerName = RTS.PlayerTeamSeasonID.PlayerID.FullName


    if RTS is not None:
        if RTS.UserRecruitingPointsThisWeek < 6 and CurrentWeek.UserRecruitingPointsLeft > 0:
            RTS = ScoutPlayer(RTS)
            RTS.UserRecruitingPointsThisWeek += 1
            CurrentWeek.UserRecruitingPointsLeft -= 1

            CurrentWeek.save()
            RTS.save()
            return JsonResponse({'message':'{PlayerName} scouted'.format(PlayerName = PlayerName)}, status=200)

        else:
            return JsonResponse({'message':'{PlayerName} already maxed out this week.'.format(PlayerName = PlayerName)}, status=422)

    return JsonResponse({'message':'Invalid command.'}, status=422)


def POST_PlayerCut(request, WorldID, PlayerID):

    print('Cutting player from team', WorldID, PlayerID)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = Week.objects.filter(WorldID_id = WorldID).filter(IsCurrent = True).first()
    CurrentPhase = CurrentWeek.PhaseID
    PlayerTeamSeasonToCut = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(PlayerID_id=PlayerID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).select_related('TeamSeasonID').first()
    PlayerName = PlayerTeamSeasonToCut.PlayerID.FullName

    TeamSeasonID = PlayerTeamSeasonToCut.TeamSeasonID

    if CurrentPhase.PhaseName == 'Preseason':
        if PlayerTeamSeasonToCut.TeamSeasonID.TeamID.IsUserTeam:
            #RemovePlayerFromDepthChart(WorldID, PlayerID )

            PlayerTeamSeasonToCut.delete()

            PopulateTeamDepthCharts(TeamSeasonID.LeagueSeasonID, CurrentWorld, FullDepthChart = False, TeamSeasonID = TeamSeasonID)
            UpdateTeamPositions(TeamSeasonID.LeagueSeasonID, CurrentWorld, TeamSeasonID = TeamSeasonID)
            return JsonResponse({'message':'{PlayerName} cut from team'.format(PlayerName = PlayerName)}, status=200)
        else:
            return JsonResponse({'message':'Can only cut players from user team'}, status=422)
    else:
        return JsonResponse({'message':'Can only cut players during preseason'}, status=422)



def POST_PlayerCaptain(request, WorldID, PlayerID, Action):

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = Week.objects.filter(WorldID_id = WorldID).filter(IsCurrent = True).first()
    CurrentPhase = CurrentWeek.PhaseID
    PlayerTeamSeasonToCaptain = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(PlayerID_id=PlayerID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
    PlayerName = PlayerTeamSeasonToCaptain.PlayerID.FullName

    if CurrentPhase.PhaseName == 'Preseason':
        if PlayerTeamSeasonToCaptain.TeamSeasonID.TeamID.IsUserTeam:
            if Action == 'Add':
                if PlayerTeamSeason.objects.filter(TeamSeasonID = PlayerTeamSeasonToCaptain.TeamSeasonID).filter(TeamCaptain = True).count() < 3:
                    PlayerTeamSeasonToCaptain.TeamCaptain = True
                    PlayerTeamSeasonToCaptain.save()
                    return JsonResponse({'message':'Added {PlayerName} as captain'.format(PlayerName = PlayerName)}, status = 200)
                else:
                    return JsonResponse({'message':'Cannot add player as captain. Team has too many captains'}, status=422)
            if Action == 'Remove':
                PlayerTeamSeasonToCaptain.TeamCaptain = False
                PlayerTeamSeasonToCaptain.save()
                return JsonResponse({'message':'Removed {PlayerName} as captain'.format(PlayerName = PlayerName)}, status = 200)
            else:
                return JsonResponse({'message':'Unrecognized Action'}, status=422)
        else:
            return JsonResponse({'message':'Can only change captains from user team'}, status=422)
    else:
        return JsonResponse({'message':'Can only change captains during preseason'}, status=422)


def POST_PlayerRedshirt(request, WorldID, PlayerID, Action):

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = Week.objects.filter(WorldID_id = WorldID).filter(IsCurrent = True).first()
    CurrentPhase = CurrentWeek.PhaseID
    PlayerTeamSeasonToRedshirt = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(PlayerID_id=PlayerID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
    PlayerName = PlayerTeamSeasonToRedshirt.PlayerID.FullName

    if CurrentPhase.PhaseName == 'Preseason':
        if PlayerTeamSeasonToRedshirt.TeamSeasonID.TeamID.IsUserTeam:
            if Action == 'Add':
                if not PlayerTeamSeasonToRedshirt.PlayerID.WasPreviouslyRedshirted:
                    print('Giving player redshirt')
                    RemovePlayerFromDepthChart(WorldID, PlayerID )
                    PlayerTeamSeasonToRedshirt.RedshirtedThisSeason = True
                    PlayerTeamSeasonToRedshirt.save()
                    return JsonResponse({'message':'Added {PlayerName} redshirt'.format(PlayerName = PlayerName)}, status = 200)
                else:
                    return JsonResponse({'message':'{PlayerName} has redshirted in the past'.format(PlayerName = PlayerName)}, status=422)
            if Action == 'Remove':
                PlayerTeamSeasonToRedshirt.RedshirtedThisSeason = False
                PlayerTeamSeasonToRedshirt.save()
                return JsonResponse({'message':'Removed {PlayerName} redshirt'.format(PlayerName = PlayerName)}, status = 200)
            else:
                return JsonResponse({'message':'Unrecognized Action'}, status=422)
        else:
            return JsonResponse({'message':'Can only change redshirts from user team'}, status=422)
    else:
        return JsonResponse({'message':'Can only change redshirts during preseason'}, status=422)



def POST_AutoTeamDepthChart(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)

    TeamSeasonID = TeamSeason.objects.filter(TeamID_id = TeamID).filter(LeagueSeasonID__IsCurrent = True).first()


    if TeamSeasonID.TeamID.IsUserTeam:
        PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).delete()
        Positions = Position.objects.all().values('PositionAbbreviation', 'PositionCountPerAwardTeam', 'PositionID')
        PositionDepthChart = {}
        for Pos in Positions:
            PositionDepthChart[Pos['PositionAbbreviation']] = {'StarterSpotsLeft': Pos['PositionCountPerAwardTeam'], 'BenchSpotsLeft': 3, 'Starters': [], 'Bench': [], 'PositionID': Pos['PositionID'] }
        CreateDepthChart(CurrentWorld=CurrentWorld, TS=TeamSeasonID, FullDepthChart = False, PositionDepthChart=PositionDepthChart.copy())
    else:
        return JsonResponse({'message':'Can only change redshirts from user team'}, status=422)
    return JsonResponse({'message':'Depth Chart Reset.'}, status=200)


def POST_AutoTeamCuts(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)

    TeamSeasonID = TeamSeason.objects.filter(TeamID_id = TeamID).filter(LeagueSeasonID__IsCurrent = True).select_related('LeagueSeasonID__LeagueID').select_related('TeamID').first()

    if TeamSeasonID.TeamID.IsUserTeam:
        NumPlayersToCut = TeamSeasonID.playerteamseason_set.all().count() - TeamSeasonID.LeagueSeasonID.LeagueID.PlayersPerTeam
        if NumPlayersToCut > 0:
            PlayersToCut = TeamCuts(TeamSeasonID, CurrentWorld, NumPlayersToCut)
            PlayerTeamSeason.objects.filter(PlayerTeamSeasonID__in = PlayersToCut).delete()
    else:
        return JsonResponse({'message':'Can only cut players from user team'}, status=422)
    return JsonResponse({'message':'Player team cuts.', 'redirect': ''}, status=200)


def POST_AutoTeamRedshirts(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)

    TeamSeasonID = TeamSeason.objects.filter(TeamID_id = TeamID).filter(LeagueSeasonID__IsCurrent = True).select_related('LeagueSeasonID__LeagueID').select_related('TeamID').first()

    if TeamSeasonID.TeamID.IsUserTeam:
        print('TeamRedshirts(TeamSeasonID, CurrentWorld)')
        TeamRedshirts(TeamSeasonID, CurrentWorld, SaveInFunc=True)
    else:
        return JsonResponse({'message':'Can only change redshirts from user team'}, status=422)
    return JsonResponse({'message':'Players redshirted.', 'redirect': ''}, status=200)


def POST_AutoTeamCaptains(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)

    TeamSeasonID = TeamSeason.objects.filter(TeamID_id = TeamID).filter(LeagueSeasonID__IsCurrent = True).select_related('LeagueSeasonID__LeagueID').select_related('TeamID').first()

    if TeamSeasonID.TeamID.IsUserTeam:

        ChooseCaptains(TeamSeasonID, CurrentWorld)
    else:
        return JsonResponse({'message':'Can only change captains from user team'}, status=422)
    return JsonResponse({'message':'Team captains chosen.', 'redirect': ''}, status=200)



def POST_SetTeamDepthChart(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)
    TeamDepthChart = request.POST.getlist('TeamDepthChart[]')

    TeamDepthChartDict = {}

    for key,value in request.POST.items():
       if 'TeamDepthChart' in key:
           key2list = key.replace('[', ']').split(']')
           key2 = key2list[-2]
           Ord = key2list[-4]
           if key2 in ['PlayerTeamSeasonID', 'DepthPosition']:
               value = int(value)
           if Ord not in TeamDepthChartDict:
               TeamDepthChartDict[Ord] = {}

           TeamDepthChartDict[Ord][key2] = value

    for Ord in TeamDepthChartDict:
        Obj = TeamDepthChartDict[Ord]
        TeamDepthChart.append(Obj)

    if TeamDepthChart is None or len(TeamDepthChart) == 0:
        return JsonResponse({'failure':'No TeamDepthChart'}, status=422)


    DepthChartObjects = PlayerTeamSeasonDepthChart.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID_id = TeamID)

    PTSDCToUpdate = []
    for PTSDC in TeamDepthChart:
        DC = DepthChartObjects.filter(PositionID__PositionAbbreviation = PTSDC['PositionAbbreviation']).filter(DepthPosition=PTSDC['DepthPosition']).first()
        if DC is not None:
            if DC.PlayerTeamSeasonID_id != PTSDC['PlayerTeamSeasonID']:
                DC.PlayerTeamSeasonID_id = PTSDC['PlayerTeamSeasonID']
                PTSDCToUpdate.append(DC)
        else:
            PositionID = Position.objects.filter(PositionAbbreviation = PTSDC['PositionAbbreviation']).first()
            PTSDToCreate = PlayerTeamSeasonDepthChart(WorldID_id = WorldID, PlayerTeamSeasonID_id = PTSDC['PlayerTeamSeasonID'], DepthPosition=PTSDC['DepthPosition'], PositionID = PositionID, IsStarter = False)
            PTSDToCreate.save()
    PlayerTeamSeasonDepthChart.objects.bulk_update(PTSDCToUpdate, ['PlayerTeamSeasonID'])

    return JsonResponse({'success':'value'})



def POST_SetTeamGameplan(request, WorldID, TeamID):
    CurrentWorld = World.objects.get(WorldID = WorldID)
    TeamGameplan = request.POST.getlist('TeamGameplan[]')

    TeamGameplanDict = {}

    for key,value in request.POST.items():
        print('key, value', key, value)
        if 'TeamGameplan' in key:
           key2list = key.replace('[', ']').split(']')
           key2 = key2list[-2]
           if key2 in ['PlayerTeamSeasonID', 'DepthPosition']:
               value = int(value)

           TeamGameplanDict[key2] = value

    if TeamGameplanDict is None or len(TeamGameplanDict) == 0:
        return JsonResponse({'failure':'No TeamGameplan'}, status=422)


    TeamSeasonStrategyID = TeamSeasonStrategy.objects.filter(WorldID_id = WorldID).filter(TeamSeasonID__TeamID_id = TeamID).first()

    for Key in TeamGameplanDict:
        print('Saving', Key, ' as value', TeamGameplanDict[Key], ' to', TeamSeasonStrategyID)
        setattr(TeamSeasonStrategyID, Key, TeamGameplanDict[Key])
    TeamSeasonStrategyID.save()

    return JsonResponse({'success':'value'})



def POST_CreateLeague(request):

    CurrentUser = User.objects.all().first()

    ConferenceList = request.POST.get('ConferenceList')

    w = World(UserID = CurrentUser)

    if City.objects.all().count() > 0:
        w.HasGeography = True
    w.save()

    w.HasGameStructures = GameStructure.objects.count() > 0
    if not w.HasGameStructures:
        LoadGameStructures()
        w.HasGameStructures = True
        w.save()

    NCAAGameStructureID = GameStructure.objects.filter(GameStructureName = 'Standard College').first()

    NCAALeague = League(WorldID = w, LeagueName = 'NCAA', LeagueAbbreviation = 'NCAA', LeaguePrestige = 100, GameStructureID = NCAAGameStructureID,ConferenceList=ConferenceList, LeagueType = '3', LeagueLogoURL = 'TODO', PlayersPerTeam = 75)
    NCAALeague.save()

    LS = InitializeLeagueSeason(w, NCAALeague, True)

    LoadData(w, NCAALeague, LS)

    AllTeams = [u for u in Team.objects.filter(WorldID = w).filter(LeagueID = NCAALeague).order_by('TeamName')]
    AllTeams = TeamSerializer(AllTeams, many=True)

    NumberOfTeamsInWorld = Team.objects.filter(WorldID = w).filter(LeagueID = NCAALeague).count()
    if NumberOfTeamsInWorld > 128:
        NCAALeague.NumberOfPlayoffTeams = 64
    elif NumberOfTeamsInWorld > 64:
        NCAALeague.NumberOfPlayoffTeams = 32
    elif NumberOfTeamsInWorld > 32:
        NCAALeague.NumberOfPlayoffTeams = 16
    elif NumberOfTeamsInWorld > 16:
        NCAALeague.NumberOfPlayoffTeams = 8
    else:
        NCAALeague.NumberOfPlayoffTeams = 4

    NCAALeague.save()

    context = {'success':'value', 'AllTeams': AllTeams.data, 'WorldID': w.WorldID}

    return JsonResponse(context, safe=False)


def get_json_list(query_set):
    list_objects = []
    for obj in query_set:
        dict_obj = {}
        for field in obj._meta.get_fields():
            try:
                if field.many_to_many:
                    dict_obj[field.name] = get_json_list(getattr(obj, field.name).all())
                    continue
                dict_obj[field.name] = getattr(obj, field.name)
            except AttributeError:
                continue
        list_objects.append(dict_obj)
    return list_objects


def NextDay(WorldID):

    date = Calendar.objects.get(WorldID=WorldID, IsCurrent=1)
    date.IsCurrent = 0
    date.save()
    FollowingDate = date.Date + timedelta(days=1)
    date = Calendar.objects.get( WorldID=WorldID, Date = FollowingDate)
    date.IsCurrent = 1
    date.save()


def AdvanceToNextWeek(WorldID, LeagueSeasonID = None, CurrentWeek = None):

    CurrentWeek.IsCurrent = 0
    CurrentWeek.save()
    NextWeek = CurrentWeek.NextWeek
    NextWeek.IsCurrent = 1
    NextWeek.save()

    if NextWeek.FirstWeekOfCalendar:
        RolloverNewLeagueSeason(CurrentSeason = LeagueSeasonID,WorldID = WorldID)



def Page_Audit(request):

    AuditGroups = Audit.objects.exclude(AuditVersion = 0).values('AuditDescription', 'AuditVersion').order_by('AuditDescription', 'AuditVersion').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), LastAuditTime=Max('AuditTime'))

    #AuditGroups = sorted(AuditGroups, key=lambda k: -1 * k['AverageTimeElapsed'])
    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)


def Page_Conferences(request, WorldID, ConferenceID = None):


    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = False
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = CurrentWorld.leagueseason_set.filter(IsCurrent = 1).first()
    CurrentWeek = Week.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = True).first()
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)

    ConferenceList = CurrentWorld.conferenceseason_set.all().annotate(
        IsChosenConference = Case(
            When(ConferenceID = ConferenceID, then=1),
            default=Value(0),
            output_field=IntegerField()
        )
    ).order_by('-IsChosenConference', 'ConferenceID__ConferenceName')

    ConferenceStandings = []

    for CS in ConferenceList:
        ThisConference = {'ConferenceName': CS.ConferenceID.ConferenceName, 'ConferenceAbbreviation': CS.ConferenceID.ConferenceAbbreviation, 'ConferenceID': CS.ConferenceID.ConferenceID, 'ConferenceTeams': [], 'OpposingConferences': []}
        TeamsInConference = CS.ConferenceStandings(Small=False,  LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek)

        for t in TeamsInConference:
            ThisConference['ConferenceTeams'].append(t)

        for OppConf in ConferenceList:#.exclude(ConferenceID = ConferenceID):
            OppConfDict = {}
            OppConfDict = OppConf.__dict__
            ConfAggs = TeamSeason.objects.filter(DivisionSeasonID__ConferenceSeasonID = OppConf).aggregate(Sum('Wins'), Sum('Losses'))
            OppConfDict['Wins'] = ConfAggs['Wins__sum']
            OppConfDict['Losses'] = ConfAggs['Losses__sum']

            OppConfDict['VsWins'] = 0
            OppConfDict['VsLosses'] = 0


            TGAgg = None
            TGAgg = TeamGame.objects.filter(TeamSeasonID__DivisionSeasonID__ConferenceSeasonID = OppConf).filter(GameID__WasPlayed = True).filter(OpposingTeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID_id = ThisConference['ConferenceID']).values('OpposingTeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID', 'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID').aggregate(
                VsLosses = Sum(Case(
                    When(IsWinningTeam = True, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField()
                )) / 2,
                VsWins = Sum(Case(
                    When(IsWinningTeam = True, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField()
                )) / 2,
                TotalGames = Count('TeamGameID'),
                OpponentPointsScored = Sum('Points'),
                PointsScored = Sum(Case(
                    When(GameID__teamgame__TeamGameID = F('TeamGameID'), then=Value(0)),
                    default=F('GameID__teamgame__Points'),
                    output_field=IntegerField()
                ))
            )

            OppConfDict['VsLosses'] = TGAgg['VsLosses']
            OppConfDict['VsWins'] = TGAgg['VsWins']

            if OppConf == ThisConference:
                OppConfDict['BoldConf'] = 'bold'
            ThisConference['OpposingConferences'].append(OppConfDict)

        #ThisConference['OpposingConferences'] = OpposingConferences

        ConferenceStandings.append(ThisConference)

    print('ConferenceList', ConferenceStandings)
    context['ConferenceStandings'] = ConferenceStandings
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription='Conferences Page')

    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': 'Conferences', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['NavBarLinks'] = NavBarLinks(Path = 'Standings', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    context['page'] = page

    context['userTeam'] = UserTeam
    context['CurrentWeek'] = CurrentWeek

    return render(request, 'HeadFootballCoach/Conferences.html', context)



def Page_Schedule(request, WorldID):

    context = {'status':'success', 'WorldID': WorldID}
    page = {'PageTitle': 'NCAA Schedule', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    DoAudit = False
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = CurrentWorld.leagueseason_set.filter(IsCurrent = 1).first()
    CurrentWeek = Week.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = True).select_related('PhaseID').first()
    CurrentWeekNumber = CurrentWeek.WeekNumber
    CurrentWeekID = CurrentWeek.WeekID
    CurrentPhaseID = CurrentWeek.PhaseID

    UserTeam = GetUserTeam(WorldID)
    page['NavBarLinks'] = NavBarLinks(Path = 'Schedule', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
    context['page'] = page
    context['userTeam'] = UserTeam

    ShowWeek = Week.objects.filter(PhaseID__LeagueSeasonID = CurrentSeason).annotate(
        GamesPlayed = Count('game__GameID', filter=Q(game__WasPlayed = True)),
        IsCurrentWeek = Case(
            When(IsCurrent = True, then=Value(True)),
            default=Value(False),
            output_field=BooleanField()
        ),
    ).filter(GamesPlayed__gt = 0).order_by('-IsCurrentWeek', 'WeekID').first()

    WeekList = []

    PeriodScores = GameEvent.objects.filter(GameID__LeagueSeasonID = CurrentSeason).values('GameID', 'EventPeriod').annotate(
        PeriodHomePoints = Max('HomePoints'),
        PeriodAwayPoints = Max('AwayPoints')
    ).order_by('GameID', 'EventPeriod')

    GameEventDict = {}

    PreviousPoints = {'Home': None, 'Away': None}
    for GE in PeriodScores:
        if GE['GameID'] not in GameEventDict:
            GameEventDict[GE['GameID']] = []
            PreviousPoints = {'Home': None, 'Away': None}

        if PreviousPoints['Home'] is None:
            GE['HomePointsScoredThisPeriod'] = GE['PeriodHomePoints']
            GE['AwayPointsScoredThisPeriod'] = GE['PeriodAwayPoints']
        else:
            GE['HomePointsScoredThisPeriod'] = GE['PeriodHomePoints'] - PreviousPoints['Home']
            GE['AwayPointsScoredThisPeriod'] = GE['PeriodAwayPoints'] - PreviousPoints['Away']


        GameEventDict[GE['GameID']].append(GE)
        PreviousPoints = {'Home': GE['PeriodHomePoints'], 'Away': GE['PeriodAwayPoints']}

    PlayerGameStats = PlayerGameStat.objects.filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason, GameScore__gt = 0).select_related('PlayerTeamSeasonID__TeamSeasonID__TeamID', 'TeamGameID__GameID', 'PlayerTeamSeasonID__PlayerID__PositionID').only(
        'TopStatStringDisplay1','TopStatStringDisplay2','TopStatStringDisplay3','PlayerTeamSeasonID__PlayerID__PlayerLastName','PlayerTeamSeasonID__PlayerID__PlayerFirstName','PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation','PlayerTeamSeasonID__TeamSeasonID','PlayerTeamSeasonID','PlayerTeamSeasonID__TeamSeasonID__TeamID', 'TeamGameID','TeamGameID__GameID', 'PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__PlayerID__PositionID'
    ).annotate(
        GameScoreRank = Window(
            expression=RowNumber(),
            partition_by=[F('TeamGameID')],
            order_by=F("GameScore").desc(),
        ),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField())
    ).order_by('-GameScore')

    PlayerGameStatDict = {}

    for PGS in [PGS for PGS in PlayerGameStats if PGS.GameScoreRank<=3]:
        if PGS.TeamGameID.TeamGameID not in PlayerGameStatDict:
            PlayerGameStatDict[PGS.TeamGameID.TeamGameID] = []
        PlayerGameStatDict[PGS.TeamGameID.TeamGameID].append(PGS)

    AllWeeks = Week.objects.filter(WorldID_id = WorldID).filter(PhaseID__LeagueSeasonID__IsCurrent = True).prefetch_related('game_set').annotate(
        GameCount = Count('game__GameID'),

        SelectedWeekBox = Case(
            When(WeekID=ShowWeek.WeekID, then=Value('SelectedWeekBox')),
            default=Value(''),
            output_field=CharField()
        ),
        ShowWeekClass = Case(
            When(SelectedWeekBox='SelectedWeekBox', then=Value('')),
            default=Value('w3-hide'),
            output_field=CharField()
        ),
        PreviousWeekID = Window(
            expression=Lag('WeekID', 1),
            order_by=F('WeekID').asc()
        )
    ).filter(GameCount__gt = 0).order_by('WeekNumber')

    WeekDict = {}

    Games = ThisWeekGames = Game.objects.filter(LeagueSeasonID = CurrentSeason).annotate(
        HomePoints = Max(F('teamgame__Points'), filter=Q(teamgame__IsHomeTeam = True)),
        AwayPoints = Max(F('teamgame__Points'), filter=Q(teamgame__IsHomeTeam = False)),
        HomeTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), Max(F('teamgame__TeamSeasonID__TeamID_id'), filter=Q(teamgame__IsHomeTeam = True)), output_field=CharField()),
        AwayTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), Max(F('teamgame__TeamSeasonID__TeamID_id'), filter=Q(teamgame__IsHomeTeam = False)), output_field=CharField()),
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField() ),
        HomeTeamLogo = Max(F('teamgame__TeamSeasonID__TeamID__TeamLogoURL'), filter=Q(teamgame__IsHomeTeam = True)),
        AwayTeamLogo = Max(F('teamgame__TeamSeasonID__TeamID__TeamLogoURL'), filter=Q(teamgame__IsHomeTeam = False)),
        HomeTeamPrimaryColor = Max(F('teamgame__TeamSeasonID__TeamID__TeamColor_Primary_HEX'), filter=Q(teamgame__IsHomeTeam = True)),
        AwayTeamPrimaryColor = Max(F('teamgame__TeamSeasonID__TeamID__TeamColor_Primary_HEX'), filter=Q(teamgame__IsHomeTeam = False)),
        HomeTeamName = Max(F('teamgame__TeamSeasonID__TeamID__TeamName'), filter=Q(teamgame__IsHomeTeam = True)),
        AwayTeamName = Max(F('teamgame__TeamSeasonID__TeamID__TeamName'), filter=Q(teamgame__IsHomeTeam = False)),
        HomeTeamGameID = Max(F('teamgame__TeamGameID'), filter=Q(teamgame__IsHomeTeam = True)),
        AwayTeamGameID = Max(F('teamgame__TeamGameID'), filter=Q(teamgame__IsHomeTeam = False)),

        HomeTeamWinningGameBold = Case(
            When(WasPlayed=False, then=Value('')),
            When(HomePoints__gt = F('AwayPoints'), then=Value('TeamWinningGameBold') ),
            default=Value('TeamLosingGame'),
            output_field=CharField()
        ),
        AwayTeamWinningGameBold = Case(
            When(WasPlayed=False, then=Value('')),
            When(HomePoints__lt = F('AwayPoints'), then=Value('TeamWinningGameBold') ),
            default=Value('TeamLosingGame'),
            output_field=CharField()
        ),
        HomeTeamRankValue = Case(
            When(WasPlayed = True, then = Max(F('teamgame__TeamSeasonWeekRankID__NationalRank'), filter=(Q(teamgame__IsHomeTeam = True)))),
            default = Max(F('teamgame__TeamSeasonID__teamseasonweekrank__NationalRank'), filter=Q(teamgame__IsHomeTeam = True) & Q(teamgame__TeamSeasonID__teamseasonweekrank__IsCurrent = True)),
            output_field=IntegerField()
        ),
        AwayTeamRankValue = Case(
            When(WasPlayed = True, then = Max(F('teamgame__TeamSeasonWeekRankID__NationalRank'), filter=(Q(teamgame__IsHomeTeam = False)))),
            default = Max(F('teamgame__TeamSeasonID__teamseasonweekrank__NationalRank'), filter=Q(teamgame__IsHomeTeam = False) & Q(teamgame__TeamSeasonID__teamseasonweekrank__IsCurrent = True)),
            output_field=IntegerField()
        ),
        MinTeamRankValue = Case(
            When(HomeTeamRankValue__lte = F('AwayTeamRankValue'), then = F('HomeTeamRankValue')),
            default = F('AwayTeamRankValue'),
            output_field=IntegerField()
        ),
        TotalRankValue = F('HomeTeamRankValue') + F('AwayTeamRankValue') + F('MinTeamRankValue'),
        HomeTeamRank = Case(
            When(HomeTeamRankValue__lte = 25, then=Concat(Value('('), F('HomeTeamRankValue'), Value(')'), output_field=CharField())),
            default=Value(''),
            output_field=CharField()
        ),
        AwayTeamRank = Case(
            When(AwayTeamRankValue__lte = 25, then=Concat(Value('('), F('AwayTeamRankValue'), Value(')'), output_field=CharField())),
            default=Value(''),
            output_field=CharField()
        ),
        HomeTeamRecord = Case(
            When(WasPlayed = True, then=Max(F('teamgame__TeamRecord'), filter=Q(teamgame__IsHomeTeam = True))),
            default=Concat(Max(F('teamgame__TeamSeasonID__Wins'), filter=Q(teamgame__IsHomeTeam = True)), Value('-'), Max(F('teamgame__TeamSeasonID__Losses'), filter=Q(teamgame__IsHomeTeam = True)), output_field=CharField()),
            output_field=CharField()
        ),
        AwayTeamRecord = Case(
            When(WasPlayed = True, then=Max(F('teamgame__TeamRecord'), filter=Q(teamgame__IsHomeTeam = False))),
            default=Concat(Max(F('teamgame__TeamSeasonID__Wins'), filter=Q(teamgame__IsHomeTeam = False)), Value('-'), Max(F('teamgame__TeamSeasonID__Losses'), filter=Q(teamgame__IsHomeTeam = False)), output_field=CharField()),
            output_field=CharField()
        ),
        IsUserGame = Max('teamgame__TeamSeasonID__TeamID__IsUserTeam'),
    ).order_by('-IsUserGame', 'MinTeamRankValue')

    for G in Games:
        if G.WeekID_id not in WeekDict:
            WeekDict[G.WeekID_id] = []

        WeekDict[G.WeekID_id].append(G)


    for W in AllWeeks:

        GameList = []
        ThisWeekGames = WeekDict[W.WeekID]

        for G in ThisWeekGames:

            G_Obj = {'Game': G,  'HomeTopPlayers': PlayerGameStatDict[G.HomeTeamGameID], 'AwayTopPlayers': PlayerGameStatDict[G.AwayTeamGameID],}

            print(G.GameID, GameEventDict)
            if G.GameID in GameEventDict:
                print('found period scores')
                G_Obj['PeriodScores'] = GameEventDict[G.GameID]

            GameList.append(G_Obj)

        WeekList.append({'Week': W, 'Games': GameList})


    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['CurrentWeek'] = CurrentWeek
    context['AllWeeks'] = WeekList
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 0, AuditDescription='Schedule Page', QueryCount = len(connection.queries))


    return render(request, 'HeadFootballCoach/Schedule.html', context)



def Page_Rankings(request, WorldID):


    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = False
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = CurrentWorld.leagueseason_set.filter(IsCurrent = 1).first()
    CurrentWeek = Week.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = True).filter(PhaseID__LeagueSeasonID = CurrentSeason).first()
    LastWeek    = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    TwoWeeksAgo = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-2).first()

    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': 'Top 25', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['NavBarLinks'] = NavBarLinks(Path = 'Rankings', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    TopTeams = TeamSeasonWeekRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent=True).values(
        'TeamSeasonID__TeamID__TeamName','TeamSeasonID__TeamID__TeamNickname', 'TeamSeasonID__TeamID',
        'NationalRank', 'NationalRankDelta',
        'TeamSeasonID__ConferenceChampion', 'TeamSeasonID__DivisionRank', 'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation','TeamSeasonID__NationalChampion', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__TeamID__TeamColor_Primary_HEX'
    ).annotate(
        TeamFullName = Concat( F('TeamSeasonID__TeamID__TeamName'), Value(' '), F('TeamSeasonID__TeamID__TeamNickname'), output_field=CharField()),
        NationalRankDeltaAbs = Func(F('NationalRankDelta'), function='ABS'),
        NationalRankDeltaShow = Case(
            When(NationalRankDelta__isnull = True, then=Value('')),
            When(NationalRankDelta = 0, then=Value('')),
            default=F('NationalRankDeltaAbs'),
            output_field=CharField()
        ),
        NationalRankDeltaSymbol = Case(
            When(NationalRankDelta__lt = 0, then=Value('&#8595;')),
            When(NationalRankDelta__gt = 0, then=Value('&#8593;')),
            default=Value(''),
            output_field=CharField()
        ),
        NationalRankDeltaClass = Case(
            When(NationalRankDelta__lt = 0, then=Value('L')),
            When(NationalRankDelta__gt = 0, then=Value('W')),
            default=Value(''),
            output_field=CharField()
        ),
        NationalRankDisplay =  Case(
            When(NationalRank__gt = 25, then=Value('')),
            default=(Concat(Value('(') , F('NationalRank'), Value(')'), output_field=CharField())),
            output_field = CharField()
        ),
        WinsLosses =  Concat( F('TeamSeasonID__Wins'), Value('-'), F('TeamSeasonID__Losses'), output_field=CharField()),
        ConferenceWinsLosses =  Concat( F('TeamSeasonID__ConferenceWins'), Value('-'), F('TeamSeasonID__ConferenceLosses'), output_field=CharField()),
        TeamHref= Concat( Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID') , output_field=CharField()),
        AdditionalDisplayLogo= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('/static/img/TournamentIcons/NationalChampionTrophy.png')),
            default=(Value('')),
            output_field=CharField()
        ),
        AdditionalDisplayLogo2= Case(
            When(TeamSeasonID__ConferenceChampion=True, then=F('TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceLogoURL')),
            default=(Value('')),
            output_field=CharField()
        ),
        AdditionalDisplayLogoClass= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('')),
            default=(Value('w3-hide')),
            output_field=CharField()
        ),
        AdditionalDisplayLogo2Class= Case(
            When(TeamSeasonID__ConferenceChampion=True, then=Value('')),
            default=(Value('w3-hide')),
            output_field=CharField()
        ),
    ).order_by('NationalRank')[:25]

    LastWeekGameDict = {}
    LastWeekGameList = TeamGame.objects.filter(WorldID = WorldID).filter(GameID__WeekID = LastWeek).values('Points', 'TeamSeasonID__TeamID').annotate(
        OpponentPoints = Subquery(TeamGame.objects.filter(GameID =OuterRef('GameID')).exclude(TeamGameID=OuterRef('pk')).values('TeamGameID').annotate(OpponentPoints=Max('Points')).values('OpponentPoints')),
        WinLossLetter = Case(
            When(IsWinningTeam = True, then=Value('W')),
            default=Value('L'),
            output_field=CharField()
        ),
        VsAtLetter = Case(
            When(IsHomeTeam = True, then=Value('vs.')),
            default=Value('@'),
            output_field=CharField()
        ),
        OpponentTeamName = F('OpposingTeamSeasonID__TeamID__TeamName'),
        Text = Value('', output_field=CharField()),
        OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('OpposingTeamSeasonID__TeamID'), output_field=CharField()),
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
        OpponentNationalRank = Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID =OuterRef('OpposingTeamSeasonID')).filter(WeekID=TwoWeeksAgo).values('NationalRank')),
        OpponentNationalRankDisplay =  Case(
            When(OpponentNationalRank__gt = 25, then=Value('')),
            default=(Concat(Value('(') , F('OpponentNationalRank'), Value(')'), output_field=CharField())),
            output_field = CharField()
        ),
    )
    for TG in LastWeekGameList:
        LastWeekGameDict[TG['TeamSeasonID__TeamID']] = TG

    ThisWeekGameDict = {}
    ThisWeekGameList = TeamGame.objects.filter(WorldID = WorldID).filter(GameID__WeekID = CurrentWeek).values('Points', 'TeamSeasonID__TeamID').annotate(
        OpponentPoints = Subquery(TeamGame.objects.filter(GameID =OuterRef('GameID')).exclude(TeamGameID=OuterRef('pk')).values('TeamGameID').annotate(OpponentPoints=Max('Points')).values('OpponentPoints')),
        WinLossLetter = Case(
            When(IsWinningTeam = True, then=Value('W')),
            default=Value('L'),
            output_field=CharField()
        ),
        VsAtLetter = Case(
            When(IsHomeTeam = True, then=Value('vs.')),
            default=Value('@'),
            output_field=CharField()
        ),
        OpponentTeamName = F('OpposingTeamSeasonID__TeamID__TeamName'),
        Text = Value('', output_field=CharField()),
        OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('OpposingTeamSeasonID__TeamID'), output_field=CharField()),
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
        OpponentNationalRank = Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID =OuterRef('OpposingTeamSeasonID')).filter(WeekID=LastWeek).values('NationalRank')),
        OpponentNationalRankDisplay =  Case(
            When(OpponentNationalRank__gt = 25, then=Value('')),
            default=(Concat(Value('(') , F('OpponentNationalRank'), Value(')'), output_field=CharField())),
            output_field = CharField()
        ),
    )
    for TG in ThisWeekGameList:
        ThisWeekGameDict[TG['TeamSeasonID__TeamID']] = TG


    for T in TopTeams:

        LWG = None
        TWG = None
        TeamID = T['TeamSeasonID__TeamID']

        if TeamID in ThisWeekGameDict:
            TWG = ThisWeekGameList[TeamID]
        if TeamID in LastWeekGameDict:
            LWG = LastWeekGameDict[TeamID]


        if LWG is None:
            T['LastWeekGame'] = 'BYE'
        else:
            T['LastWeekGame'] = LWG

        if TWG is None:
            T['ThisWeekGame'] = 'BYE'
        else:
            T['ThisWeekGame'] = TWG


    context['userTeam'] = UserTeam
    context['TopTeams'] = list(TopTeams)
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['CurrentWeek'] = CurrentWeek
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Rankings Page')
    context['page'] = page

    return render(request, 'HeadFootballCoach/Rankings.html', context)


def Page_Audit_ShootingPercentages(request, WorldID):
    CurrentWorld = World.objects.get(WorldID = WorldID)
    PlayerList = Player.objects.filter(WorldID = CurrentWorld)

    ThreePointRating_Percentage_Map ={}
    for u in range(1,100):
        ThreePointRating_Percentage_Map[u] = {'PlayerCount': 0, 'ThreePA': 0, 'ThreePM': 0}

    for P in PlayerList:

        PTS = P.CurrentPlayerTeamSeason
        Skill = P.CurrentSkills

        ThreePointRating = Skill.ThreePointRating

        if PTS != None:
            ThreePointRating_Percentage_Map[ThreePointRating]['PlayerCount'] +=1
            ThreePointRating_Percentage_Map[ThreePointRating]['ThreePM'] += PTS.ThreePM
            ThreePointRating_Percentage_Map[ThreePointRating]['ThreePA'] += PTS.ThreePA

    OvrGroups = []
    for u in ThreePointRating_Percentage_Map:
        ThreePointRating_Percentage_Map[u]['ThreePointRating'] = u
        if ThreePointRating_Percentage_Map[u]['ThreePA'] == 0:
            ThreePointRating_Percentage_Map[u]['ThreePointPercentage'] = 0
        else:
            ThreePointRating_Percentage_Map[u]['ThreePointPercentage'] = ThreePointRating_Percentage_Map[u]['ThreePM'] * 1.0 / ThreePointRating_Percentage_Map[u]['ThreePA']
        OvrGroups.append(ThreePointRating_Percentage_Map[u])

    OvrGroups = sorted(OvrGroups, key=lambda k: k['ThreePointRating'])

    context = {'ThreePointRating_Percentage_Map': OvrGroups}


    return render(request, 'HeadFootballCoach/auditshooting.html', context)


def Page_Index(request):


    InTesting = True
    InDeepTesting = True

    if InTesting or InDeepTesting:
        World.objects.all().delete()
        Conference.objects.all().delete()
        #System_PlayoffRound.objects.all().delete()
        #NameList.objects.all().delete()

    WorldFields = ['WorldID','CurrentWeek']
    World__UserTeamFields = ['LogoURL', 'TeamNameAndRecord']

    ExtractData()

    if User.objects.all().count() == 0:
        U = User.objects.create()
        U.save()


    Worlds=[]
    for W in World.objects.filter(IsActive = True).filter(week__IsCurrent = True).filter(team__IsUserTeam = True).values('WorldID', 'team__TeamLogoURL', 'team__TeamName', 'week__WeekName' ):

        Worlds.append(W)

    if InDeepTesting:
        NumConferencesToInclude = 1
    elif InTesting:
        NumConferencesToInclude = 3
    else:
        NumConferencesToInclude = 7
    PossibleConferences = [
         #{'ConferenceDisplayName': 'Independents', 'ConferenceFormValue': 'FBS Independents'},
         {'ConferenceDisplayName': 'Big 12', 'ConferenceFormValue': 'Big 12 Conference'},
         {'ConferenceDisplayName': 'ACC', 'ConferenceFormValue': 'Atlantic Coast Conference'},
         {'ConferenceDisplayName': 'SEC', 'ConferenceFormValue': 'Southeastern Conference'},
         {'ConferenceDisplayName': 'Pac-12', 'ConferenceFormValue': 'Pac-12 Conference'},
         #{'ConferenceDisplayName': 'SC1', 'ConferenceFormValue': 'Sample Conference 1'},
         #{'ConferenceDisplayName': 'SC2', 'ConferenceFormValue': 'Sample Conference 2'},
         {'ConferenceDisplayName': 'American', 'ConferenceFormValue': 'American Athletic Conference'},
         #{'ConferenceDisplayName': 'Mountain West', 'ConferenceFormValue': 'Mountain West Conference'},
         {'ConferenceDisplayName': 'Big 10', 'ConferenceFormValue': 'Big Ten Conference'},
    ]

    ConfList = []
    for u in range(0,NumConferencesToInclude):
        ConfList.append(random.choice([k for k in PossibleConferences if k not in ConfList]))
    ConfList = sorted(ConfList, key=lambda k: k['ConferenceDisplayName'])

    if InDeepTesting:
        ConfList = [
            {'ConferenceDisplayName': 'SC1', 'ConferenceFormValue': 'Sample Conference 1'},
            {'ConferenceDisplayName': 'SC2', 'ConferenceFormValue': 'Sample Conference 2'},
        ]


    context = {'Worlds': Worlds}
    context['PossibleConferences'] = ConfList
    return render(request, 'HeadFootballCoach/index.html', context)

def Page_Search(request, WorldID, SearchInput):
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    context = {'page': page, 'result': 'success', 'WorldID': WorldID, 'SearchInput': SearchInput}
    CurrentWorld = World.objects.get(WorldID=WorldID)

    PlayerFirstNameMatches = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerFirstName__icontains=SearchInput).order_by('PlayerLastName')
    PlayerLastNameMatches = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerLastName__icontains=SearchInput).order_by('PlayerLastName')

    PlayerMatches = PlayerFirstNameMatches | PlayerLastNameMatches

    TeamNameMatches = Team.objects.filter(WorldID = CurrentWorld).filter(TeamName__icontains=SearchInput)
    TeamNicknameMatches = Team.objects.filter(WorldID = CurrentWorld).filter(TeamNickname__icontains=SearchInput)

    TeamMatches = TeamNameMatches | TeamNicknameMatches

    Players = PlayerMatches
    Teams   = TeamMatches
    context['Players'] = Players
    context['Teams'] = Teams

    return render(request, 'HeadFootballCoach/Search.html', context)

def Page_World(request, WorldID):

    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.filter(IsCurrent = 1, WorldID = CurrentWorld).select_related('PhaseID', 'PhaseID__LeagueSeasonID').first()
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).select_related('PhaseID', 'PhaseID__LeagueSeasonID').first()
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)


    page['NavBarLinks'] = NavBarLinks(Path = 'Overview', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if DoAudit:
        start = time.time()

    CurrentHeadlines  = Headline.objects.filter(WorldID = CurrentWorld).filter(WeekID=CurrentWeek).filter(HeadlineImportanceValue__gte=3).values('HeadlineText', 'HeadlineHref').order_by('-HeadlineImportanceValue')
    LastWeekHeadlines = Headline.objects.filter(WorldID = CurrentWorld).filter(WeekID=LastWeek).filter(ShowNextWeek=True).filter(HeadlineImportanceValue__gte=3).values('HeadlineText', 'HeadlineHref').order_by('-HeadlineImportanceValue')
    Headlines = CurrentHeadlines | LastWeekHeadlines


    AllTeams = TeamSeasonWeekRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = 1).select_related('TeamSeasonID__TeamID').select_related('TeamSeasonID__teamgame').select_related('TeamSeasonID__teamseason_opposingteamgame').values('TeamSeasonID', 'TeamSeasonID__ConferenceChampion', 'TeamSeasonID__DivisionRank', 'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation', 'teamgame__GameID', 'teamgame__IsHomeTeam', 'TeamSeasonID__TeamID','TeamSeasonID__NationalChampion','TeamSeasonID__TeamID__TeamName','TeamSeasonID__TeamID__TeamNickname', 'TeamSeasonID__TeamID__TeamLogoURL_50', 'TeamSeasonID__TeamID__TeamLogoURL_100', 'TeamSeasonID__Wins', 'TeamSeasonID__Losses', 'NationalRank', 'NationalRankDelta', 'TeamSeasonID__TeamID__TeamColor_Primary_HEX').annotate(
        NationalRankDeltaAbs=Func(F('NationalRankDelta'), function='ABS'),
        AdditionalDisplayLogo= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('/static/img/TournamentIcons/NationalChampionTrophy.png')),
            default=(Value('')),
            output_field=CharField()
        ),
        AdditionalDisplayLogo2= Case(
            When(TeamSeasonID__ConferenceChampion=True, then=F('TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceLogoURL')),
            default=(Value('')),
            output_field=CharField()
        ),
        AdditionalDisplayLogoClass= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('')),
            default=(Value('w3-hide')),
            output_field=CharField()
        ),
        AdditionalDisplayLogo2Class= Case(
            When(TeamSeasonID__ConferenceChampion=True, then=Value('')),
            default=(Value('w3-hide')),
            output_field=CharField()
        ),
        OffensivePossessions = Sum('TeamSeasonID__teamgame__Possessions') / Count('TeamSeasonID__teamseason_opposingteamgame', distinct=True),
        OffensivePoints = Sum('TeamSeasonID__teamgame__Points') / Count('TeamSeasonID__teamseason_opposingteamgame', distinct=True),
        DefensivePossessions = Sum('TeamSeasonID__teamseason_opposingteamgame__Possessions') / Count('TeamSeasonID__teamseason_opposingteamgame', distinct=True),
        DefensivePoints = Sum('TeamSeasonID__teamseason_opposingteamgame__Points') / Count('TeamSeasonID__teamseason_opposingteamgame', distinct=True),
        PPP = Case(
            When(OffensivePossessions=0, then=-1),
            default=(F('OffensivePoints') * 1.0 / F('OffensivePossessions')),
            output_field=FloatField()
        ),
        PPP_Rank = Window(
            expression=Rank(),
            order_by=F('PPP').desc(),
        ),
        PAPP = Case(
            When(DefensivePossessions=0, then=10),
            default=(F('DefensivePoints') * 1.0 / F('DefensivePossessions')),
            output_field=FloatField()
        ),
        PAPP_Rank = Window(
            expression=Rank(),
            order_by=F('PAPP').asc(),
        ),
    ).order_by('NationalRank')


    GameList = Game.objects.filter(WorldID = CurrentWorld).select_related('teamgame__TeamSeasonID__TeamID').select_related('teamgame__TeamSeasonWeekRankID').values(
        'GameID', 'GameTime'
    ).annotate(
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
        GameHeadlineDisplay = Case(
            When(BowlID__IsNationalChampionship = True, then=Value('National Championship!')),
            When(BowlID__BowlName__isnull = False, then=F('BowlID__BowlName')),
            When(IsConferenceChampionship = True, then= Concat(Min('teamgame__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation'), Value(' Championship'), output_field=CharField())),
            When(TeamRivalryID__RivalryName__isnull = False, then=F('TeamRivalryID__RivalryName')),
            When(TeamRivalryID__isnull = False, then=Value('Rivalry game')),
            When(NationalBroadcast = True, then=Value('National Broadcast')),
            When(RegionalBroadcast = True, then=Value('Regional Broadcast')),
            default=Value(''),
            output_field=CharField()
        ),
        MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
        UserTeamGame = Max('teamgame__TeamSeasonID__TeamID__IsUserTeam')
    ).order_by('-UserTeamGame'  , 'MinNationalRank')
    UpcomingGames = GameList.filter(WeekID = CurrentWeek).filter(WasPlayed = 0)
    RecentGames   = GameList.filter(WeekID = LastWeek).filter(WasPlayed = 1)


    AllTeamsList = list(AllTeams)

    TGs = TeamGame.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason, GameID__WeekID = CurrentWeek).values('TeamSeasonID', 'GameID', 'TeamSeasonID__TeamID', 'Points', 'TeamRecord', 'TeamSeasonID__TeamID__TeamName','TeamSeasonID__TeamID__TeamLogoURL_50', 'TeamSeasonID__TeamID__TeamColor_Primary_HEX').annotate(
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
        TeamRecordDisplay = Case(
            When(GameID__WasPlayed = True, then=F('TeamRecord')),
            default=Concat(F('TeamSeasonID__Wins'), Value('-'), F('TeamSeasonID__Losses'), output_field=CharField()),
            output_field=CharField()
        ),
        NationalRankDisplay = Case(
            When(TeamSeasonWeekRankID__NationalRank__gt = 25, then=Value('')),
            default=Concat( F('TeamSeasonWeekRankID__NationalRank') , Value(''), output_field=CharField()),
            output_field=CharField()
        ),
    ).order_by('IsHomeTeam')

    TeamGameDict = {}
    for TG in TGs:
        if TG['GameID'] not in TeamGameDict:
            TeamGameDict[TG['GameID']] = []
        TeamGameDict[TG['GameID']].append(TG)


    for G in UpcomingGames:
        TGs = TeamGameDict[G['GameID']]
        for TG in TGs:
            D = [{'PPP_Rank': T['PPP_Rank'], 'PAPP_Rank': T['PAPP_Rank'], 'PPP': T['PPP'], 'PAPP': T['PAPP']} for T in AllTeamsList if T['TeamSeasonID'] == TG['TeamSeasonID']]
            for u in D[0]:
                TG[u] = D[0][u]

        G['TeamGames'] = TGs


    AllTeams = AllTeams[0:25]


    PreseasonAllAmericans = []
    PreseasonTopProspects = []
    SeasonAllAmericans = []

    if CurrentWeek.WeekName == 'Preseason':
        print('It is the preseason!')
        PreseasonAllAmericans = []
        AllAwards = PlayerTeamSeasonAward.objects.filter(IsPreseasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).select_related('PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__PlayerID__PositionID', 'PlayerTeamSeasonID__ClassID').order_by('PositionID__PositionSortOrder')
        for Conf in [None] + [ u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')]:
            #print('AllAmericans for ', Conf)
            ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
            if Conf is None:
                ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-preseason-award-conference-tab', 'Teams' : []}
                PTSA = AllAwards.filter(IsNationalAward = True)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                    T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                    ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team': PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            else:
                ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ShowConference': 'preseason-allamerican-conf-hide', 'ConferenceSelected': '', 'Teams' : []}
                PTSA = AllAwards.filter(IsConferenceAward = True).filter(ConferenceID = Conf)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                    T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                    ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team':PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            PreseasonAllAmericans.append(ConfDict)
        #print('Preseason Awards', PreseasonAllAmericans)


        Recruits = PlayerTeamSeason.objects.filter(PlayerID__IsRecruit = True).filter(PlayerID__Recruiting_NationalRank__lte = 10).values('PlayerID', 'PlayerTeamSeasonID', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID__PositionID__PositionAbbreviation', 'PlayerID__CityID__CityName', 'PlayerID__CityID__StateID__StateName', 'PlayerID__Recruiting_NationalRank').order_by('PlayerID__Recruiting_NationalRank').annotate(
            PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID__PlayerID'), output_field=CharField()),
        )
        for P in Recruits:
            P['RecruitingTeams'] = []
            RecruitTeamSeasons = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID = P['PlayerTeamSeasonID']).values( 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID_id', 'TeamSeasonID__TeamID__TeamLogoURL_50', 'InterestLevel', 'OfferMade', 'Signed').order_by('-InterestLevel').annotate(
                TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
            )
            for RTS in RecruitTeamSeasons[0:3]:
                P['RecruitingTeams'].append(RTS)

            PreseasonTopProspects.append(P)

    elif CurrentWeek.PhaseID.PhaseName == 'Season Recap':
        print('It is the end of the season!')
        AllAwards = PlayerTeamSeasonAward.objects.filter(IsSeasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).select_related('PositionID', 'ConferenceID', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__PlayerID__PositionID', 'PlayerTeamSeasonID__ClassID').order_by('PositionID__PositionSortOrder')

        for Conf in [None] + [ u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')]:
            ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
            if Conf is None:
                ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-season-award-conference-tab', 'Teams' : []}
                PTSA = [Award for Award in AllAwards if Award.IsNationalAward == True]
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                    if TD['IsFirstTeam'] == 1:
                        T = 'FirstTeam'
                    elif TD['IsSecondTeam'] == 1:
                        T = 'SecondTeam'
                    else:
                        T = 'Freshman'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team': [Award for Award in PTSA if Award.IsFirstTeam == TD['IsFirstTeam'] and Award.IsSecondTeam == TD['IsSecondTeam'] and Award.IsFreshmanTeam == TD['IsFreshmanTeam'] ], 'TeamName': T, 'ShowTeam': ShowTeam})
            else:
                ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ShowConference': 'season-allamerican-conf-hide', 'ConferenceSelected': '', 'Teams' : []}
                PTSA = [Award for Award in AllAwards if Award.IsNationalAward == False and Award.ConferenceID == Conf]
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                    if TD['IsFirstTeam'] == 1:
                        T = 'FirstTeam'
                    elif TD['IsSecondTeam'] == 1:
                        T = 'SecondTeam'
                    else:
                        T = 'Freshman'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team':[Award for Award in PTSA if Award.IsFirstTeam == TD['IsFirstTeam'] and Award.IsSecondTeam == TD['IsSecondTeam'] and Award.IsFreshmanTeam == TD['IsFreshmanTeam'] ], 'TeamName': T, 'ShowTeam': ShowTeam})
            SeasonAllAmericans.append(ConfDict)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 10, AuditDescription = 'Page_World')

    context = {'currentSeason': CurrentSeason, 'allTeams': AllTeams, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek , 'games': UpcomingGames, 'LastWeek': LastWeek}

    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['SeasonAllAmericans'] = SeasonAllAmericans
    context['PreseasonAllAmericans'] = PreseasonAllAmericans
    context['PreseasonTopProspects'] = PreseasonTopProspects
    context['Headlines'] = Headlines
    return render(request, 'HeadFootballCoach/World.html', context)



def Page_Awards(request, WorldID, SeasonStartYear = None):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    WeekNumber = CurrentWeek.WeekNumber
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = WeekNumber-1).first()

    ConferenceList = list(Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName'))

    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    else:
        CurrentSeason = LeagueSeason.objects.filter(WorldID = CurrentWorld).filter(SeasonStartYear = SeasonStartYear).first()

    UserTeam = GetUserTeam(WorldID)
    AllAwards = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason).order_by('WeekID', 'PositionGroupID')
    page['NavBarLinks'] = NavBarLinks(Path = 'Awards & Races', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    WeeklyAwards = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID =CurrentSeason).filter(IsWeekAward = True).filter(WeekID__game__teamgame__playergamestat__PlayerTeamSeasonID = F('PlayerTeamSeasonID')).values(
        'IsConferenceAward', 'IsNationalAward', 'ConferenceID', 'ConferenceID__ConferenceName', 'PositionGroupID__PositionGroupName', 'WeekID__WeekName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamLogoURL_50', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'WeekID__game__teamgame__playergamestat__GameScore', 'WeekID__game__teamgame__playergamestat__TopStatStringDisplay1', 'WeekID__game__teamgame__playergamestat__TopStatStringDisplay2', 'WeekID__game__teamgame__IsWinningTeam', 'WeekID__game__teamgame__Points'
    ).annotate(
        GameWin = Case(
            When(WeekID__game__teamgame__IsWinningTeam = True, then=Value('W')),
            default=Value('L'),
            output_field=CharField()
        ),
        ShortWeekName = Case(
            When(WeekID__WeekName = 'Conference Championship Week', then=Value('Conf Champ')),
            default=F('WeekID__WeekName'),
            output_field=CharField()
        ),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField()),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('PlayerTeamSeasonID__TeamSeasonID__TeamID'), output_field=CharField()),
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('WeekID__game__GameID'), output_field=CharField()),
        ScoreDisplay = Concat(F('WeekID__game__teamgame__Points'), Value('-'), F('WeekID__game__teamgame__OpposingTeamGameID__Points'), output_field=CharField()),
        OpponentTeamName = F('WeekID__game__teamgame__OpposingTeamGameID__TeamSeasonID__TeamID__TeamName'),
        OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('WeekID__game__teamgame__OpposingTeamGameID__TeamSeasonID__TeamID'), output_field=CharField()),
    ).order_by('WeekID')

    AwardDict = {}
    AwardDict['WeeklyAwards'] = []
    AwardDict['WeeklyAwards'].append( {'Group': 'National', 'Awards': {'Offense': [Award for Award in WeeklyAwards if Award['IsNationalAward'] == True and Award['PositionGroupID__PositionGroupName'] == 'Offense'], 'Defense': [Award for Award in WeeklyAwards if Award['IsNationalAward'] == True and Award['PositionGroupID__PositionGroupName'] == 'Defense']}})
    for C in ConferenceList:
        AwardDict['WeeklyAwards'].append( {'Group': C.ConferenceName, 'Awards': {'Offense': [Award for Award in WeeklyAwards if Award['ConferenceID'] == C.ConferenceID and Award['PositionGroupID__PositionGroupName'] == 'Offense'], 'Defense': [Award for Award in WeeklyAwards if Award['ConferenceID'] == C.ConferenceID and Award['PositionGroupID__PositionGroupName'] == 'Offense']}})



    PreseasonAllAmericans = []
    AllAwards = PlayerTeamSeasonAward.objects.filter(IsPreseasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID=CurrentSeason).order_by('PositionID__PositionSortOrder').values(
        'IsConferenceAward', 'IsNationalAward', 'ConferenceID__ConferenceName', 'PositionGroupID__PositionGroupName', 'WeekID__WeekName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamLogoURL_50', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__ClassID__ClassAbbreviation', 'IsFirstTeam', 'IsSecondTeam', 'ConferenceID'
    ).annotate(
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField()),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('PlayerTeamSeasonID__TeamSeasonID__TeamID'), output_field=CharField()),
    )
    for Conf in [None] + ConferenceList:
        ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
        if Conf is None:
            ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'Teams' : []}
            PTSA = [Award for Award in AllAwards if Award['IsNationalAward'] == True]
            for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                ConfDict['Teams'].append({'Team': [Award for Award in PTSA if Award['IsFirstTeam'] == TD['IsFirstTeam'] and Award['IsSecondTeam'] == TD['IsSecondTeam']], 'TeamName': T, 'ShowTeam': ShowTeam})
        else:
            ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ConferenceSelected': '', 'Teams' : []}
            PTSA = [Award for Award in AllAwards if Award['ConferenceID'] == Conf and Award['IsConferenceAward'] == True]
            for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                ConfDict['Teams'].append({'Team': [Award for Award in PTSA if Award['IsFirstTeam'] == TD['IsFirstTeam'] and Award['IsSecondTeam'] == TD['IsSecondTeam']], 'TeamName': T, 'ShowTeam': ShowTeam})
        PreseasonAllAmericans.append(ConfDict)

    AwardDict['PreseasonAllAmericans'] = PreseasonAllAmericans



    PostseasonAllAmericans = []
    AllAwards = PlayerTeamSeasonAward.objects.filter(IsSeasonAward = True).filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID=CurrentSeason).order_by('PositionID__PositionSortOrder').values(
        'IsConferenceAward', 'IsNationalAward', 'ConferenceID__ConferenceName', 'PositionGroupID__PositionGroupName', 'WeekID__WeekName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamLogoURL_50', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__ClassID__ClassAbbreviation', 'PlayerTeamSeasonID__TopStatStringDisplay1', 'PlayerTeamSeasonID__TopStatStringDisplay2', 'PlayerTeamSeasonID__TopStatStringDisplay3'
    ).annotate(
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField()),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('PlayerTeamSeasonID__TeamSeasonID__TeamID'), output_field=CharField()),
    )
    for Conf in [None] + ConferenceList:
        ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
        if Conf is None:
            ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'Teams' : []}
            PTSA = AllAwards.filter(IsNationalAward = True)
            for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                T = ''
                if TD['IsFirstTeam'] == 1:
                    T = 'First Team'
                elif TD['IsFreshmanTeam'] == 1:
                    T = 'Freshmen Team'
                else :
                    T = 'Second Team'
                ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                ConfDict['Teams'].append({'Team': list(PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']).filter(IsFreshmanTeam = TD['IsFreshmanTeam'])), 'TeamName': T, 'ShowTeam': ShowTeam})
        else:
            ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ConferenceSelected': '', 'Teams' : []}
            PTSA = AllAwards.filter(IsConferenceAward = True).filter(ConferenceID = Conf)
            for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                T = ''
                if TD['IsFirstTeam'] == 1:
                    T = 'First Team'
                elif TD['IsFreshmanTeam'] == 1:
                    T = 'Freshmen Team'
                else :
                    T = 'Second Team'
                ShowTeam = '' if T == 'FirstTeam' else 'preseason-allamerican-team-hide'
                ConfDict['Teams'].append({'Team': list(PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']).filter(IsFreshmanTeam = TD['IsFreshmanTeam'])), 'TeamName': T, 'ShowTeam': ShowTeam})
        PostseasonAllAmericans.append(ConfDict)

    AwardDict['PostseasonAllAmericans'] = PostseasonAllAmericans

    HeismanWinner = PlayerTeamSeasonAward.objects.filter(IsSeasonAward = True).filter(IsTopPlayer = True).filter(IsNationalAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID=CurrentSeason).values(
        'PlayerTeamSeasonID__PlayerID',
    ).first()
    NationalChampion = CurrentSeason.teamseason_set.filter(NationalChampion = True).first()
    NationalRunnerUp = CurrentSeason.teamseason_set.filter(NationalRunnerUp = True).first()
    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'AwardDict': AwardDict, 'NationalChampion': NationalChampion, 'NationalRunnerUp': NationalRunnerUp}
    if HeismanWinner is not None:
        HeismanWinner = GET_PlayerCardInfo(None, WorldID,HeismanWinner['PlayerTeamSeasonID__PlayerID'], SeasonStartYear )
        HeismanWinner = json.loads(HeismanWinner.content.strip().decode())
        context['HeismanWinner'] = HeismanWinner
    else:
        HeismanRace = Player.objects.filter(WorldID = WorldID).filter(playerteamseason__TeamSeasonID__LeagueSeasonID=CurrentSeason).filter(playerteamseason__TeamSeasonID__teamseasonweekrank__IsCurrent = True).values('PlayerID','playerteamseason__ClassID__ClassAbbreviation', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'playerteamseason__playerteamseasonskill__OverallRating', 'playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL_50').annotate(
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
            PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
            GameScore=Sum('playerteamseason__playergamestat__GameScore'),
            TeamRank = Max('playerteamseason__TeamSeasonID__teamseasonweekrank__NationalRank', filter=Q(playerteamseason__TeamSeasonID__teamseasonweekrank__IsCurrent = True)),
            PlayerPositionModifier = Max(Case(
                When(playerteamseason__TeamSeasonID__teamseasonweekrank__WeekID__WeekNumber__gt = 4, then=Value(1.0)),
                When(PositionID__PositionAbbreviation = 'QB', then=Value(1.25)),
                When(PositionID__PositionAbbreviation = 'RB', then=Value(1.2)),
                default=Value(0.75),
                output_field=DecimalField()
            )),
            TopStatStringDisplay1 = F('playerteamseason__TopStatStringDisplay1'),
            TopStatStringDisplay2 = F('playerteamseason__TopStatStringDisplay2'),
            TopStatStringDisplay3 = F('playerteamseason__TopStatStringDisplay3'),
            PlayerOverallModifier = ExpressionWrapper((F('playerteamseason__playerteamseasonskill__OverallRating') ** (1.0/(Value(WeekNumber)+1))) * F('PlayerPositionModifier'), output_field=DecimalField()),
            TeamRankModifier = Case(
                When(Q(playerteamseason__TeamSeasonID__teamseasonweekrank__WeekID__WeekNumber__lt = 4) & Q(TeamRank__lte = 10), then=Value(1.0)),
                When(TeamRank = 1,       then=Value(1.25)),
                When(TeamRank__lte = 3,  then=Value(1.15)),
                When(TeamRank__lte = 5,  then=Value(1.05)),
                When(TeamRank__lte = 10, then=Value(1.00)),
                When(TeamRank__lte = 20, then=Value(0.90)),
                When(TeamRank__lte = 30, then=Value(0.80)),
                When(TeamRank__lte = 50, then=Value(0.65)),
                When(TeamRank__lte = 70, then=Value(0.50)),
                When(TeamRank__lte = 90, then=Value(0.30)),
                default=Value(0.1),
                output_field = DecimalField()
            ),
            # GameScoreWeighted = ExpressionWrapper(((F('GameScore') ** (Value(WeekNumber) / 15.0)) + 1) * F('TeamRankModifier') * F('PlayerOverallModifier'), output_field=DecimalField()),
            HeismanRank = Window(
                expression=RowNumber(),
                order_by=F("GameScore").desc(),
            )
        ).order_by( '-GameScore')[:10]#'-GameScoreWeighted',, '-PlayerOverallModifier', '-TeamRankModifier'

        context['HeismanRace'] = HeismanRace


    Seasons = list(LeagueSeason.objects.filter(WorldID_id = WorldID).values('SeasonStartYear').annotate(
        SeasonStatsHref=Concat(Value('/World/'), Value(WorldID), Value('/Awards/Season/'), F('SeasonStartYear')  ,output_field=CharField())
    ).order_by('-SeasonStartYear'))


    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['Seasons'] = Seasons
    return render(request, 'HeadFootballCoach/Awards.html', context)

def Page_PlayerRecords(request, WorldID, TeamID=None, ConferenceID = None):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    page['NavBarLinks'] = NavBarLinks(Path = 'Player Records', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    SeasonFilters = {}
    CareerFilters = {}
    GameFilters = {}

    if TeamID is not None:
        SeasonFilters = {'TeamSeasonID__TeamID': TeamID}
        CareerFilters = {'playerteamseason__TeamSeasonID__TeamID': TeamID}
        GameFilters = {'PlayerTeamSeasonID__TeamSeasonID__TeamID': TeamID}
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display
    elif ConferenceID is not None:
        SeasonFilters = {'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID': ConferenceID}
        CareerFilters = {'playerteamseason__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID': ConferenceID}
        GameFilters = {'PlayerTeamSeasonID__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID': ConferenceID}

    ConferenceList = Conference.objects.filter(WorldID_id = WorldID).values('ConferenceName', 'ConferenceLogoURL').annotate(
        ConferenceHref = Concat(Value('/World/'), Value(WorldID), Value('/PlayerRecords/Conference/'), F('ConferenceID'), output_field=CharField())
    ).order_by('ConferenceName')



    SeasonLeaders = Common_PlayerRecords(CurrentWorld, Timeframe = 'Season', Filters=SeasonFilters, ListLength = 5)
    CareerLeaders = Common_PlayerRecords(CurrentWorld, Timeframe = 'Career', Filters=CareerFilters, ListLength = 5)
    GameLeaders = Common_PlayerRecords(CurrentWorld, Timeframe = 'Game', Filters=GameFilters, ListLength = 5)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'ConferenceList': ConferenceList}
    context['SeasonLeaders'] = SeasonLeaders
    context['CareerLeaders'] = CareerLeaders
    context['GameLeaders'] = GameLeaders
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)

    return render(request, 'HeadFootballCoach/PlayerRecords.html', context)


def Page_Coaches(request, WorldID):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    page['NavBarLinks'] = NavBarLinks(Path = 'Coach Stats', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    CoachList = list(Coach.objects.filter(WorldID_id = WorldID).values(
        'CharismaRating', 'ReputationRating', 'VeteranTendency', 'GameplanRating', 'ScoutingRating', 'RedshirtTendency', 'SituationalAggressivenessTendency', 'PlaycallPassTendency', 'OffensivePlaybook', 'DefensivePlaybook'
    ).annotate(
        CoachPosition = Subquery(CoachTeamSeason.objects.filter(CoachID=OuterRef('CoachID')).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).values('CoachPositionID__CoachPositionAbbreviation')),
        CoachPositionSortOrder = Subquery(CoachTeamSeason.objects.filter(CoachID=OuterRef('CoachID')).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).values('CoachPositionID__CoachPositionSortOrder')),
        CoachName = Concat(F('CoachFirstName'), Value(' '), F('CoachLastName'), output_field=CharField()),
        CoachTeamName = F('coachteamseason__TeamSeasonID__TeamID__TeamName'),
        CoachTeamLogoURL = F('coachteamseason__TeamSeasonID__TeamID__TeamLogoURL'),
        CoachTeamColor = F('coachteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'),
        CoachTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('coachteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        CoachTeamConference = F('coachteamseason__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation'),
        CoachTeamConferenceHref = Concat(Value('/World/'), Value(WorldID), Value('/Conferences/'), F('coachteamseason__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID'), output_field=CharField()),
        Wins = Sum('coachteamseason__TeamSeasonID__Wins'),
        Losses = Sum('coachteamseason__TeamSeasonID__Losses'),

        Top25_Wins = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__coachteamseason__CoachID = OuterRef('CoachID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = True).annotate(Count = Count('TeamGameID')).values('Count')),0),
        Top25_Losses = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__coachteamseason__CoachID = OuterRef('CoachID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = False).filter(GameID__WasPlayed = True).annotate(Count = Count('TeamGameID')).values('Count')),0),
        AllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__coachteamseason__CoachID = OuterRef('CoachID')).filter(IsNationalAward = True).filter(Q(IsPreseasonAward = True) | Q(IsSeasonAward = True)).annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        POTW_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__coachteamseason__CoachID = OuterRef('CoachID')).filter(IsNationalAward = True).filter(IsWeekAward = True).annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
    ).order_by('-Wins'))

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}
    context['CoachList']=CoachList

    return render(request, 'HeadFootballCoach/CoachStats.html', context)



def Page_TeamRecords(request, WorldID, TeamID=None, ConferenceID = None):
    DoAudit = False
    page = {'PageTitle': 'Team Records', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    page['NavBarLinks'] = NavBarLinks(Path = 'Team Records', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    SeasonFilters = {'WorldID': CurrentWorld}
    CareerFilters = {'WorldID': CurrentWorld}
    GameFilters = {'WorldID': CurrentWorld, 'GameID__WasPlayed': True}

    if TeamID is not None:
        Filters['TeamID'] = TeamID
        SeasonFilters = {'TeamID': TeamID}
        CareerFilters = {'TeamID': TeamID}
        GameFilters = {'TeamSeasonID__TeamID': TeamID}
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display

    if ConferenceID is not None:
        SeasonFilters['DivisionSeasonID__ConferenceSeasonID__ConferenceID']= ConferenceID
        CareerFilters['DivisionSeasonID__ConferenceSeasonID__ConferenceID']= ConferenceID
        GameFilters['TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID']= ConferenceID
        ConferenceAbbreviation = Conference.objects.filter(WorldID_id = WorldID).filter(ConferenceID = ConferenceID).values('ConferenceAbbreviation').first()['ConferenceAbbreviation']
        page['PageTitle'] = ConferenceAbbreviation + ' Team Records'


    SeasonLeaders = Common_TeamRecords(CurrentWorld, Timeframe = 'Season', Filters=SeasonFilters, ListLength = 10)
    AlltimeLeaders = Common_TeamRecords(CurrentWorld, Timeframe = 'Alltime', Filters=CareerFilters, ListLength = 10)
    GameLeaders = Common_TeamRecords(CurrentWorld, Timeframe = 'Game', Filters=GameFilters, ListLength = 10)

    ConferenceList = list(Conference.objects.filter(WorldID_id = WorldID).values('ConferenceName', 'ConferenceLogoURL').annotate(
        ConferenceHref = Concat(Value('/World/'), Value(WorldID), Value('/TeamRecords/Conference/'), F('ConferenceID'), output_field=CharField())
    ).order_by('ConferenceName'))

    ConferenceList.insert(0, {'ConferenceName': 'NCAA', 'ConferenceLogoURL': '/static/img/TeamLogos/ncaa-text.png', 'ConferenceHref': '/World/'+str(WorldID)+'/TeamRecords'})


    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}
    context['SeasonLeaders'] = SeasonLeaders
    context['AlltimeLeaders'] = AlltimeLeaders
    context['GameLeaders'] = GameLeaders
    context['ConferenceList'] = ConferenceList
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)

    return render(request, 'HeadFootballCoach/TeamRecords.html', context)



def Page_PlayerStats(request, WorldID, TeamID = None, SeasonStartYear = None):
    DoAudit = False
    if DoAudit:
        start = time.time()
        reset_queries()
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.filter(WorldID = WorldID).first()
    CurrentWeek     = CurrentWorld.week_set.filter(IsCurrent = 1).select_related('PhaseID', 'PhaseID__LeagueSeasonID').first()#Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = CurrentWorld.leagueseason_set.filter(IsCurrent = 1).first()
    UserTeam = GetUserTeam(WorldID)
    Filters = {'WorldID': WorldID, 'playerteamseason__TeamSeasonID__TeamID__isnull': False}
    Filters['playerteamseason__TeamSeasonID__teamseasonweekrank__IsCurrent'] = True

    page['NavBarLinks'] = NavBarLinks(Path = 'Player Stats', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if SeasonStartYear is None:
        page['YearDisplay'] = 'All-Time'

    else:
        page['YearDisplay'] = SeasonStartYear
        Filters['playerteamseason__TeamSeasonID__LeagueSeasonID__SeasonStartYear'] = SeasonStartYear

    if TeamID is not None:
        Filters['TeamID'] = TeamID
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display

    Seasons = [{'SeasonStartYear': 'All-Time', 'SeasonStatsHref': '/World/{WorldID}/TeamStats/'.format(WorldID=WorldID)}] + list(LeagueSeason.objects.filter(WorldID_id = WorldID).values('SeasonStartYear').annotate(
        SeasonStatsHref=Concat(Value('/World/'), Value(WorldID), Value('/PlayerStats/Season/'), F('SeasonStartYear')  ,output_field=CharField())
    ).order_by('-SeasonStartYear'))

    Players = Common_PlayerStats(Filters)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'Seasons': Seasons, 'Players': Players}
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        print('\n\nconnection.queries')

        for q in connection.queries:
            print('\n\t', q)
        print('connection.queries', connection.queries)
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription = 'Page_PlayerStats', QueryCount = len(connection.queries))
    return render(request, 'HeadFootballCoach/PlayerStats.html', context)




def Page_TeamDepthChart(request, WorldID, TeamID, SeasonStartYear = None):
    DoAudit = False
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')

    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['PageTitle'] = ThisTeam.TeamName + ' Players'
    page['PrimaryColor'] = ThisTeam.TeamColor_Primary_HEX
    page['SecondaryColor'] = ThisTeam.SecondaryColor_Display
    page['TabIcon'] = ThisTeam.LogoURL

    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    else:
        CurrentSeason = LeagueSeason.objects.get(SeasonStartYear = SeasonStartYear, WorldID = CurrentWorld )

    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()
    if CurrentWeek.PhaseID.PhaseName == 'Preseason' and not CurrentSeason.Preseason_UserSetDepthChart and CurrentSeason.IsCurrent:
        CurrentSeason.Preseason_UserSetDepthChart = True
        CurrentSeason.save()
    UserTeam = GetUserTeam(WorldID)
    Filters = {'WorldID': WorldID}
    TeamSeasonID = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()
    page['NavBarLinks'] = NavBarLinks(Path = 'Depth Chart', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if ThisTeam == UserTeam and CurrentSeason.IsCurrent:
        Disabled = ''
    else:
        Disabled = 'disabled'

    PTSDC = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).filter(IsStarter = True).count()
    if PTSDC < 22:
        PlayerTeamSeasonDepthChart.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamID = TeamID).delete()
        Positions = Position.objects.all().values('PositionAbbreviation', 'PositionCountPerAwardTeam', 'PositionID')
        PositionDepthChart = {}
        for Pos in Positions:
            PositionDepthChart[Pos['PositionAbbreviation']] = {'StarterSpotsLeft': Pos['PositionCountPerAwardTeam'], 'BenchSpotsLeft': 3, 'Starters': [], 'Bench': [], 'PositionID': Pos['PositionID'] }
        CreateDepthChart(CurrentWorld=CurrentWorld, TS=TeamSeasonID, FullDepthChart = False, PositionDepthChart=PositionDepthChart.copy())


    PlayerList = Player.objects.filter(WorldID_id = WorldID).filter(playerteamseason__TeamSeasonID = TeamSeasonID, playerteamseason__RedshirtedThisSeason = False).values( 'playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL',
        'playerteamseason__TeamSeasonID__TeamID__TeamName', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'PlayerID', 'playerteamseason__playerteamseasonskill__OverallRating','playerteamseason__playerteamseasonskill__Strength_Rating','playerteamseason__playerteamseasonskill__Agility_Rating','playerteamseason__playerteamseasonskill__Speed_Rating','playerteamseason__playerteamseasonskill__Acceleration_Rating','playerteamseason__playerteamseasonskill__Stamina_Rating','playerteamseason__playerteamseasonskill__Awareness_Rating','playerteamseason__playerteamseasonskill__Jumping_Rating','playerteamseason__playerteamseasonskill__ThrowPower_Rating'    ,'playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowOnRun_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating'    ,'playerteamseason__playerteamseasonskill__PlayAction_Rating', 'playerteamseason__playerteamseasonskill__PassRush_Rating', 'playerteamseason__playerteamseasonskill__BlockShedding_Rating', 'playerteamseason__playerteamseasonskill__Tackle_Rating', 'playerteamseason__playerteamseasonskill__HitPower_Rating', 'playerteamseason__playerteamseasonskill__ManCoverage_Rating', 'playerteamseason__playerteamseasonskill__ZoneCoverage_Rating', 'playerteamseason__playerteamseasonskill__Press_Rating', 'playerteamseason__playerteamseasonskill__Carrying_Rating', 'playerteamseason__playerteamseasonskill__Elusiveness_Rating', 'playerteamseason__playerteamseasonskill__BallCarrierVision_Rating', 'playerteamseason__playerteamseasonskill__BreakTackle_Rating', 'playerteamseason__playerteamseasonskill__Catching_Rating', 'playerteamseason__playerteamseasonskill__CatchInTraffic_Rating', 'playerteamseason__playerteamseasonskill__RouteRunning_Rating', 'playerteamseason__playerteamseasonskill__Release_Rating', 'playerteamseason__playerteamseasonskill__PassBlock_Rating', 'playerteamseason__playerteamseasonskill__RunBlock_Rating', 'playerteamseason__playerteamseasonskill__ImpactBlock_Rating', 'playerteamseason__playerteamseasonskill__KickPower_Rating', 'playerteamseason__playerteamseasonskill__KickAccuracy_Rating'
    ).annotate(
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        PlayerTeamSeasonID = F('playerteamseason__PlayerTeamSeasonID'),
        OverallRating_QB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='QB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_RB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='RB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_FB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='FB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_WR = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='WR').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_TE = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='TE').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_OT = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='OT').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_OG = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='OG').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_OC = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='OC').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_DE = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='DE').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_DT = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='DT').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_OLB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='OLB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_MLB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='MLB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_CB = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='CB').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_S = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='S').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_K = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='K').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
        OverallRating_P = Subquery(
                    TeamSeasonPosition.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID=OuterRef('playerteamseason__TeamSeasonID')).filter(PositionID__PositionAbbreviation='P').annotate(
                        OverallForPosition=Round(ExpressionWrapper( ((OuterRef("playerteamseason__playerteamseasonskill__Strength_Rating") * F("Strength_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Agility_Rating") * F("Agility_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Speed_Rating") * F("Speed_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Acceleration_Rating") * F("Acceleration_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Stamina_Rating") * F("Stamina_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Awareness_Rating") * F("Awareness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Jumping_Rating") * F("Jumping_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Injury_Rating") * F("Injury_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowPower_Rating") * F("ThrowPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating") * F("ShortThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating") * F("MediumThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating") * F("DeepThrowAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowOnRun_Rating") * F("ThrowOnRun_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating") * F("ThrowUnderPressure_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayAction_Rating") * F("PlayAction_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Elusiveness_Rating") * F("Elusiveness_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BallCarrierVision_Rating") * F("BallCarrierVision_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__JukeMove_Rating") * F("JukeMove_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BreakTackle_Rating") * F("BreakTackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Carrying_Rating") * F("Carrying_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Catching_Rating") * F("Catching_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__CatchInTraffic_Rating") * F("CatchInTraffic_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RouteRunning_Rating") * F("RouteRunning_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Release_Rating") * F("Release_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__HitPower_Rating") * F("HitPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Tackle_Rating") * F("Tackle_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassRush_Rating") * F("PassRush_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__BlockShedding_Rating") * F("BlockShedding_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Pursuit_Rating") * F("Pursuit_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PlayRecognition_Rating") * F("PlayRecognition_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ManCoverage_Rating") * F("ManCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ZoneCoverage_Rating") * F("ZoneCoverage_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__Press_Rating") * F("Press_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__PassBlock_Rating") * F("PassBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__RunBlock_Rating") * F("RunBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__ImpactBlock_Rating") * F("ImpactBlock_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickPower_Rating") * F("KickPower_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickAccuracy_Rating") * F("KickAccuracy_Rating_Weight")) + (OuterRef("playerteamseason__playerteamseasonskill__KickReturn_Rating") * F("KickReturn_Rating_Weight"))) / F('Total_Rating_Weight'), output_field=FloatField()),0)
                        ).values('OverallForPosition')),
    )

    PositionGroups = PositionGroup.objects.all().values('PositionGroupName', 'PositionGroupID').order_by('PositionGroupID')

    print('PlayerList', PlayerList.query)

    for PG in PositionGroups:

        PG['Positions'] = Position.objects.filter(PositionGroupID = PG['PositionGroupID']).values('PositionAbbreviation', 'PositionName', 'PositionID').annotate(
            StarterCount = F('PositionTypicalStarterCountPerTeam'),
            BenchCount = Value(3, output_field=IntegerField())
        ).order_by('PositionSortOrder')


        for Pos in PG['Positions']:
            PTSDC = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = ThisTeam).filter(PlayerTeamSeasonID__TeamSeasonID = TeamSeasonID).filter(PositionID = Pos['PositionID']).values('PlayerTeamSeasonID__playerteamseasonskill__OverallRating').annotate(
                PlayerName = Concat(F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
                PlayerPosition = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
                PlayerID = F('PlayerTeamSeasonID__PlayerID'),
                PlayerTeamSeasonID = F('PlayerTeamSeasonID'),
                StarterClass = Case(
                    When(IsStarter = True, then=Value('is-starter')),
                    default=Value('is-not-starter'),
                    output_field=CharField()
                ),
                PositionID__PositionAbbreviation = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
                playerteamseasonskill__OverallRating = F('PlayerTeamSeasonID__playerteamseasonskill__OverallRating'),
            ).order_by('DepthPosition')
            Pos['InDepthChart'] = list(PTSDC)

    print('\n\nPositionGroups')
    for u in PositionGroups:
        for P in u['Positions']:
            Taken = len(P['InDepthChart'])
            Needs = 6 - Taken
            for NewPlayer in range(0,Needs):
                P['InDepthChart'].append({'PlayerName': None})


    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'ThisTeamSeason': ThisTeamSeason, 'CurrentWeek': CurrentWeek, 'PositionGroups': PositionGroups}
    context['Disabled'] = Disabled
    context['AvailablePlayers'] = list(PlayerList.order_by('PositionID__PositionSortOrder', '-playerteamseason__playerteamseasonskill__OverallRating'))


    context['HeaderLink'] = TeamHeaderLinks('Depth Chart', SeasonStartYear, CurrentWorld)

    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), Value('/'), Value(context['HeaderLink']['ExternalPaths']['HrefExtension']), output_field=CharField())
    ).order_by('TeamName')

    return render(request, 'HeadFootballCoach/TeamDepthChart.html', context)



def Page_TeamGameplan(request, WorldID, TeamID, SeasonStartYear = None):
    DoAudit = False
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')

    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['PageTitle'] = ThisTeam.TeamName + ' Gameplan'
    page['PrimaryColor'] = ThisTeam.TeamColor_Primary_HEX
    page['SecondaryColor'] = ThisTeam.SecondaryColor_Display
    page['TabIcon'] = ThisTeam.LogoURL

    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    else:
        CurrentSeason = LeagueSeason.objects.get(SeasonStartYear = SeasonStartYear, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)
    TeamSeasonID = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()

    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()

    if CurrentWeek.PhaseID.PhaseName == 'Preseason' and not CurrentSeason.Preseason_UserSetGameplan :
        CurrentSeason.Preseason_UserSetGameplan = True
        CurrentSeason.save()

    if ThisTeam == UserTeam and CurrentSeason.IsCurrent:
        Disabled = 'active'
    else:
        Disabled = 'disabled'

    page['NavBarLinks'] = NavBarLinks(Path = 'Gameplan', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    ThisTeamSeasonStrategy = TeamSeasonID.teamseasonstrategy_set.all().values().first()

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'ThisTeamSeason': ThisTeamSeason, 'CurrentWeek': CurrentWeek, 'ThisTeamSeasonStrategy': ThisTeamSeasonStrategy}

    context['OffensivePlaybook_Options'] = ['Air Raid', 'Heavy Run', 'Spread Option','Spread', 'Pro Style', 'Triple Option']
    context['DefensivePlaybook_Options'] = ['4-3', '3-4', '3-3-5', '4-2-5']
    context['CoverageStyleStrategy_Options'] = ['All-Man','Man Focused','Mixed','Zone Focused','All-Zone',]
    context['BlitzStrategy_Options'] = ['Heavy Blitz','Blitz','Balanced','Some Blitz','No Blitz',]
    context['DE_Preference_Options'] = ['Pass Rush','Run Stuff','Balanced',]
    context['DT_Preference_Options'] = ['Pass Rush','Run Stuff','Balanced',]
    context['OLB_Preference_Options'] = ['Pass Rush','Pass Coverage','Run Stuff','Balanced',]
    context['MLB_Preference_Options'] = ['Field General','Pass Coverage','Run Stuff','Balanced',]
    context['CB_Preference_Options'] = ['Man-to-Man','Zone','Balanced',]
    context['S_Preference_Options'] = ['Hybrid','Run Support','Zone Coverage','Balanced',]
    context['PassingStrategy_Options'] = ['Deep Pass','Moderate Deep','Balanced','Moderate Short','Short',]
    context['RunningBackStrategy_Options'] = ['Committee','Starter Focused','Bellcow',]
    context['QB_Preference_Options'] = ['West-Coast','Dual Threat','Option','Game Manager','Pocket Passer','Balanced',]
    context['RB_Preference_Options'] = ['Bruiser','Receiving','Elusive','Balanced',]
    context['WR_Preference_Options'] = ['Slot','Deep Threat','Possession','Balanced',]
    context['TE_Preference_Options'] = ['Possession','Blocking','Vertical Threat','Balanced',]
    context['OL_Preference_Options'] = ['Pass Block','Run Block','Balanced',]


    context['Disabled'] = Disabled
    context['HeaderLink'] = TeamHeaderLinks('Gameplan', SeasonStartYear, CurrentWorld)

    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), Value('/'), Value(context['HeaderLink']['ExternalPaths']['HrefExtension']), output_field=CharField())
    ).order_by('TeamName')

    return render(request, 'HeadFootballCoach/TeamGameplan.html', context)



def Page_TeamRoster(request, WorldID, TeamID, SeasonStartYear = None):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    Filters = {'WorldID': WorldID}


    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
        Filters['playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent'] = True
    else:
        CurrentSeason = LeagueSeason.objects.get(SeasonStartYear = SeasonStartYear, WorldID = CurrentWorld )
        Filters['playerteamseason__TeamSeasonID__LeagueSeasonID'] = CurrentSeason
    UserTeam = GetUserTeam(WorldID)
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')
    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()

    RosterActions = []
    if UserTeam == ThisTeam and CurrentSeason.IsCurrent:
        if CurrentWeek.WeekName == 'Preseason':

            NumPlayersToCut = ThisTeamSeason.playerteamseason_set.all().count() - CurrentSeason.LeagueID.PlayersPerTeam
            if NumPlayersToCut > 0:
                RosterActions.append({'Display': 'Let CPU Cut Players', 'ConfirmInfo': 'Are you sure you want the CPU to cut players to the limit?', 'ResponseType': 'refresh','Class': 'team-action','AjaxLink': '/World/'+str(WorldID)+'/Team/'+str(TeamID)+'/AutoTeamCuts', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-cut"></i></span>'})

            NumberOfCaptainsNeeded = 3 - ThisTeamSeason.playerteamseason_set.filter(TeamCaptain = True).count()
            if NumberOfCaptainsNeeded > 0:
                RosterActions.append({'Display': 'Let CPU Choose Captains', 'ConfirmInfo': 'Are you sure you want the CPU to choose team captains?', 'ResponseType': 'refresh','Class': 'team-action','AjaxLink': '/World/'+str(WorldID)+'/Team/'+str(TeamID)+'/AutoTeamCaptains', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-crown w3-text-green"></i></span>'})

            RedshirtsAssigned =  ThisTeamSeason.playerteamseason_set.filter(RedshirtedThisSeason = True).count()
            if RedshirtsAssigned < 6:
                RosterActions.append({'Display': 'Let CPU Assign Redshirts', 'ConfirmInfo': 'Are you sure you want the CPU to assign redshirts?', 'ResponseType': 'refresh','Class': 'team-action','AjaxLink': '/World/'+str(WorldID)+'/Team/'+str(TeamID)+'/AutoTeamRedshirts', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-tshirt w3-text-red"></i></span>'})


    page['NavBarLinks'] = NavBarLinks(Path = 'Roster', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if TeamID is not None:
        Filters['playerteamseason__TeamSeasonID__TeamID'] = TeamID
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display
        page['TabIcon'] = TeamID.LogoURL

    Players = Common_PlayerStats(Filters)


    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'ThisTeamSeason': ThisTeamSeason, 'CurrentWeek': CurrentWeek, 'Players': Players}

    context['RosterActions'] = RosterActions
    context['HeaderLink'] = TeamHeaderLinks('Roster', SeasonStartYear, CurrentWorld)
    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), Value('/'), Value(context['HeaderLink']['ExternalPaths']['HrefExtension']), output_field=CharField())
    ).order_by('TeamName')

    return render(request, 'HeadFootballCoach/TeamRoster.html', context)



def Page_TeamSchedule(request, WorldID, TeamID, SeasonStartYear = None):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.filter(WorldID = WorldID).only('WorldID').first()

    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    else:
        CurrentSeason = LeagueSeason.objects.get(SeasonStartYear = SeasonStartYear, WorldID = CurrentWorld )

    CurrentWeek     = GetCurrentWeek(WorldID)
    HistoricalWeek     = GetHistoricalWeek(WorldID, CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')
    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()
    page['NavBarLinks'] = NavBarLinks(Path = 'Schedule', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    page['PageTitle'] = ThisTeam.TeamName + ' Schedule'
    page['PrimaryColor'] = ThisTeam.TeamColor_Primary_HEX
    page['SecondaryColor'] = ThisTeam.SecondaryColor_Display

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'ThisTeamSeason': ThisTeamSeason, 'CurrentWeek': CurrentWeek}

    TeamGames = TeamGame.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__TeamID_id=TeamID, TeamSeasonID__LeagueSeasonID = CurrentSeason).values('GameID', 'TeamGameID', 'GameID__WeekID', 'GameID__WeekID__WeekName').annotate(
        MaxPeriod = Subquery(GameEvent.objects.filter(GameID=OuterRef('GameID')).values('GameID').annotate(MaxPeriod=Max('EventPeriod')).values('MaxPeriod')),
        OvertimeDisplay = Case(
            When(MaxPeriod__isnull = True, then=Value('')),
            When(MaxPeriod = 4, then=Value('')),
            When(MaxPeriod = 5, then=Value('(OT)')),
            default=Concat(Value('('), F('MaxPeriod') - 4, Value('OT)'), output_field=CharField()),
            output_field=CharField()
        ),
        GameHref =Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
        Opposing_TeamColor_Primary_HEX = F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamColor_Primary_HEX'),
        Opposing_TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('OpposingTeamGameID__TeamSeasonID__TeamID'), output_field=CharField()),
        Opposing_TeamName = F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamName'),
        Opposing_TeamNickname = F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamNickname'),
        Opposing_TeamLogoURL = F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamLogoURL'),
        Opposing_TeamRank_Past = F('OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank'),
        Opposing_TeamRank_Current = Min('OpposingTeamGameID__TeamSeasonID__teamseasonweekrank__NationalRank', filter=Q(OpposingTeamGameID__TeamSeasonID__teamseasonweekrank__IsCurrent = True)),
        Opposing_TeamRank_Show = Coalesce(F('Opposing_TeamRank_Past'), F('Opposing_TeamRank_Current')),
        Opposing_TeamRank_Display = Case(
            When(Opposing_TeamRank_Show__lte = 25, then= Concat(Value('('), F('Opposing_TeamRank_Show'), Value(')'), output_field=CharField())),
            default = Value(''),
            output_field=CharField()
        ),
        Opposing_TeamRecord_Past = F('OpposingTeamGameID__TeamRecord'),
        Opposing_TeamRecord_Current = Concat(F('OpposingTeamGameID__TeamSeasonID__Wins'), Value('-'), F('OpposingTeamGameID__TeamSeasonID__Losses'), output_field=CharField()),
        Opposing_TeamRecord_Show = Coalesce(F('Opposing_TeamRecord_Past'), F('Opposing_TeamRecord_Current')),
        GameOutcomeLetter = Case(
            When(IsWinningTeam = True, then=Value('W')),
            When(Q(IsWinningTeam = False) & Q(GameID__WasPlayed = True), then=Value('L')),
            default=Value(''),
            output_field=CharField()
        ),
        GameDisplay = Case(
            When(GameID__WasPlayed = True, then=Concat(F('Points'), Value('-'), F('OpposingTeamGameID__Points'), output_field=CharField())),
            default=Value('Preview'),
            output_field=CharField()
        ),
        TeamRecord_Past = F('TeamRecord'),
        TeamRecord_Current = Concat(F('TeamSeasonID__Wins'), Value('-'), F('TeamSeasonID__Losses'), output_field=CharField()),
        TeamRecord_Show = Coalesce(F('TeamRecord_Past'), F('TeamRecord_Current')),
    ).order_by('GameID__WeekID')


    TopPlayers = PlayerGameStat.objects.filter(TeamGameID__TeamSeasonID__LeagueSeasonID = CurrentSeason, GameScore__gt = 0).filter(Q(TeamGameID__TeamSeasonID = ThisTeamSeason) | Q(TeamGameID__OpposingTeamGameID__TeamSeasonID = ThisTeamSeason)).values('PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'TopStatStringDisplay1', 'TopStatStringDisplay2', 'TeamGameID').annotate(
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField()),
        PlayerName = Concat( F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
        GameScoreRank = Window(
            expression=RowNumber(),
            partition_by=F('TeamGameID'),
            order_by=F("GameScore").desc(),
        )
    ).order_by('GameScore')

    TopPlayersDict = {}
    for TP in TopPlayers:
        if TP['GameScoreRank'] > 3:
            continue

        if TP['TeamGameID'] not in TopPlayersDict:
            TopPlayersDict[TP['TeamGameID']] = []

        TopPlayersDict[TP['TeamGameID']].append(TP)


    for TG in TeamGames:
        TG['TopPlayerStats'] = []
        TopPlayers = []
        if TG['TeamGameID'] in TopPlayersDict:
            TopPlayers = TopPlayersDict[TG['TeamGameID']]

        if len(TopPlayers) > 0:
            TG['TopPlayerStats'] = [{'PlayerName': P['PlayerName'], 'PlayerPosition': P['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'], 'PlayerHref': P['PlayerHref'], 'PlayerTeam': '('+P['PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation']+')', 'PlayerStats': [P['TopStatStringDisplay1'], P['TopStatStringDisplay2']]} for P in TopPlayers]

    context['TeamSchedule'] = list(TeamGames)

    context['HeaderLink'] = TeamHeaderLinks('Schedule', SeasonStartYear, CurrentWorld)
    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), Value('/'), Value(context['HeaderLink']['ExternalPaths']['HrefExtension']), output_field=CharField())
    ).order_by('TeamName')

    return render(request, 'HeadFootballCoach/TeamSchedule.html', context)


def Page_TeamHistory(request, WorldID, TeamID):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')
    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).first()
    page['NavBarLinks'] = NavBarLinks(Path = 'History', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    page['PageTitle'] = ThisTeam.TeamName + ' Schedule'
    page['PrimaryColor'] = ThisTeam.TeamColor_Primary_HEX
    page['SecondaryColor'] = ThisTeam.SecondaryColor_Display

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'team': ThisTeam, 'ThisTeamSeason': ThisTeamSeason, 'CurrentWeek': CurrentWeek}

    TeamSeasonHistory = TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID__ScheduleCreated = True).filter(TeamID = ThisTeam).order_by('LeagueSeasonID').values('TeamSeasonID', 'DivisionRank', 'LeagueSeasonID__SeasonStartYear', 'Wins', 'Losses', 'ConferenceWins', 'ConferenceLosses', 'RecruitingClassRank').annotate(
        TeamRecord = Concat(F('Wins'), Value('-'), F('Losses'), output_field=CharField()),
        TeamConferenceRecord = Concat(F('ConferenceWins'), Value('-'), F('ConferenceLosses'), output_field=CharField()),
        SeasonYear = F('LeagueSeasonID__SeasonStartYear'),
        SeasonRecapLink = Concat(Value('/World/'), Value(WorldID), Value('/Season/'), F('LeagueSeasonID__SeasonStartYear'), output_field=CharField()),
    )

    TeamSeasonHistory = list(TeamSeasonHistory)
    for TSH in TeamSeasonHistory:
        TS = ThisTeam.teamseason_set.filter(TeamSeasonID = TSH['TeamSeasonID']).first()
        FinalTSWR = TS.teamseasonweekrank_set.order_by('-WeekID').first()
        TSH['FinalRank'] = FinalTSWR.NationalRank


        BowlTG = TS.teamgame_set.filter(GameID__BowlID__isnull = False).first()
        if BowlTG is not None:
            OpponentTG = BowlTG.OpposingTeamGame
            BowlG = BowlTG.GameID

            s = ''
            if BowlG.WasPlayed:
                if BowlTG.IsWinningTeam:
                    s += 'W '
                    TSH['BowlResult'] = 'W'
                else:
                    s += 'L '
                    TSH['BowlResult'] = 'L'

                TSH['BowlScore'] = BowlG.GameDisplay
                TSH['BowlHref'] = '/World/' + str(WorldID) + '/Game/' + str(BowlG.GameID)
                TSH['BowlOpponent'] = OpponentTG.TeamSeasonID.TeamID.TeamName
                TSH['BowlOpponentHref'] = '/World/' + str(WorldID) + '/Team/' + str(OpponentTG.TeamSeasonID.TeamID_id)
                TSH['BowlName'] = BowlG.BowlID.BowlName
                TSH['String_BowlVs'] = ' vs '
                TSH['String_BowlIn'] = ' in '
        elif TS.LeagueSeasonID.IsCurrent and TS.LeagueSeasonID.phase_set.filter(week__IsCurrent = True).first().PhaseName in ['Preseason', 'Regular Season', 'Conference Championships']:
            TSH['String_BowlIn'] = '-'
        else:
            TSH['String_BowlIn'] = 'Did not make bowl'

    TeamHistory = []
    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).values('NationalChampion','ConferenceChampion', 'DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation', 'LeagueSeasonID__SeasonEndYear'):

        if TS['NationalChampion']:
            TeamHistory.append({'BannerLine1': 'National', 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})
        if TS['ConferenceChampion']:
            TeamHistory.append({'BannerLine1': TS['DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceAbbreviation'], 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})

    TeamSeasonHistory = list(TeamSeasonHistory)
    context['TeamSeasonHistory'] = TeamSeasonHistory
    context['TeamHistory'] = TeamHistory

    SeasonFilters = {'TeamSeasonID__TeamID': TeamID}
    CareerFilters = {'playerteamseason__TeamSeasonID__TeamID': TeamID}
    GameFilters = {'PlayerTeamSeasonID__TeamSeasonID__TeamID': TeamID}

    context['SeasonLeaders'] = Common_PlayerRecords(CurrentWorld, Timeframe = 'Season', Filters=SeasonFilters, ListLength = 5)
    context['CareerLeaders'] = Common_PlayerRecords(CurrentWorld, Timeframe = 'Career', Filters=CareerFilters, ListLength = 5)
    context['GameLeaders'] = Common_PlayerRecords(CurrentWorld, Timeframe = 'Game', Filters=GameFilters, ListLength = 5)

    context['TeamSeasonLeaders'] = Common_TeamRecords(CurrentWorld, Timeframe = 'Season', Filters={'WorldID': CurrentWorld, 'TeamID': TeamID}, ListLength = 5)
    context['TeamGameLeaders'] = Common_TeamRecords(CurrentWorld, Timeframe = 'Game', Filters={'WorldID': CurrentWorld, 'GameID__WasPlayed': True, 'TeamSeasonID__TeamID': TeamID}, ListLength = 5)

    context['HeaderLink'] = TeamHeaderLinks('History', CurrentWorld=CurrentWorld)
    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), Value('/'), Value(context['HeaderLink']['ExternalPaths']['HrefExtension']), output_field=CharField())
    ).order_by('TeamName')

    return render(request, 'HeadFootballCoach/TeamHistory.html', context)


def Page_TeamStats(request, WorldID, TeamID = None, SeasonStartYear = None):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    page['NavBarLinks'] = NavBarLinks(Path = 'Team Stats', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if SeasonStartYear is None:
        page['YearDisplay'] = 'All-Time'
        Filters = {'WorldID': WorldID,  'teamseason__teamseasonweekrank__IsCurrent': True}
    else:
        page['YearDisplay'] = SeasonStartYear
        Filters = {'WorldID': WorldID, 'teamseason__LeagueSeasonID__SeasonStartYear': SeasonStartYear, 'teamseason__teamseasonweekrank__IsCurrent': True}

    if TeamID is not None:
        Filters['TeamID'] = TeamID
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display

    Teams = Common_TeamStats(Filters)

    Seasons = [{'SeasonStartYear': 'All-Time', 'SeasonStatsHref': '/World/{WorldID}/TeamStats/'.format(WorldID=WorldID)}] + list(LeagueSeason.objects.filter(WorldID_id = WorldID).values('SeasonStartYear').annotate(
        SeasonStatsHref=Concat(Value('/World/'), Value(WorldID), Value('/TeamStats/Season/'), F('SeasonStartYear')  ,output_field=CharField())
    ).order_by('-SeasonStartYear'))

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'Teams': Teams, 'Seasons': Seasons}
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    return render(request, 'HeadFootballCoach/TeamStats.html', context)


def Page_History(request, WorldID):
    DoAudit = False
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)

    page['NavBarLinks'] = NavBarLinks(Path = 'History', GroupName='Almanac', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    if SeasonStartYear is None:
        Filters = {'WorldID': WorldID, 'teamseason__LeagueSeasonID__IsCurrent': 1, 'teamseason__teamseasonweekrank__IsCurrent': True}
    else:
        Filters = {'WorldID': WorldID, 'teamseason__teamseasonweekrank__IsCurrent': True}

    if TeamID is not None:
        Filters['TeamID'] = TeamID
        TeamID = Team.objects.filter(WorldID_id = WorldID).filter(TeamID = TeamID).first()

        page['PageTitle'] = TeamID.TeamName + ' Players'
        page['PrimaryColor'] = TeamID.TeamColor_Primary_HEX
        page['SecondaryColor'] = TeamID.SecondaryColor_Display

    Teams = Common_TeamAccolades(Filters)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'Teams': Teams}
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    return render(request, 'HeadFootballCoach/TeamStats.html', context)



def Page_Player(request, WorldID, PlayerID):


    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    PlayerObject = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerID = PlayerID).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True)
    FirstPlayerObject = PlayerObject.first()
    if len(FirstPlayerObject.PlayerFaceJson) == 0:
        FirstPlayerObject.GeneratePlayerFaceJSon()
    PlayerDict = PlayerObject.values('PlayerID', 'PlayerLastName', 'PlayerFirstName', 'PlayerFaceJson', 'playerteamseason__ClassID__ClassName','WasPreviouslyRedshirted','JerseyNumber', 'Height', 'Weight', 'CityID', 'PositionID__PositionAbbreviation', 'CityID__CityName', 'CityID__StateID__StateName', 'RecruitingStars', 'IsRecruit', 'RecruitingPointsNeeded').annotate(
        HometownAndState=Concat(F('CityID__CityName'), Value(', '), F('CityID__StateID__StateName')),
        FullName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName')),
        HeightFeet = (F('Height') / 12),
        HeightInches = (F('Height') % 12),
        HeightFormatted = Concat('HeightFeet', Value('\''), 'HeightInches', Value('"'), output_field=CharField()),
        ClassID__ClassName = F('playerteamseason__ClassID__ClassName'),
        Position = F('PositionID__PositionAbbreviation'),
    ).first()

    page = {'PageTitle': PlayerDict['FullName'] + ' - HS Recruit', 'PlayerID': PlayerID,'WorldID': WorldID, 'PrimaryColor': 'Blue', 'SecondaryColor': 'Red'}

    UserTeam = GetUserTeam(WorldID)
    CurrentWeek = GetCurrentWeek(CurrentWorld)
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)

    page['NavBarLinks'] = NavBarLinks(Path = 'Player', GroupName='Player', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    PlayerObject = FirstPlayerObject

    CurrentPlayerTeamSeason = PlayerObject.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).select_related('TeamSeasonID__TeamID', 'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID', 'PlayerID__PositionID', 'ClassID').first()
    CurrentPlayerTeamSeasonSkill = CurrentPlayerTeamSeason.playerteamseasonskill#PlayerTeamSeasonSkill.objects.filter(PlayerTeamSeasonID__PlayerID = PlayerObject).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason).first()

    if len(PlayerDict['PlayerFaceJson']) == 0:
        PlayerObject.GeneratePlayerFaceJSon()
    #PlayerDict = PlayerQuerySet.ReturnAsDict()
    PlayerDict['Player'] = PlayerObject
    allTeams = GetAllTeams(WorldID, LeagueSeasonID = CurrentSeason)

    PTS = CurrentPlayerTeamSeason
    TS = PTS.TeamSeasonID
    PT = TS.TeamID
    PlayerTeam = PT
    SeasonStats = None

    context = {'userTeam': UserTeam, 'player':PlayerDict,  'allTeams': allTeams, 'CurrentWeek': GetCurrentWeek(CurrentWorld), 'Actions': []}

    RatingNameMap = {}

    SkillSetRatingMap = {
        'Overall': {'Overall': 'OverallRating'},
         'Physical': {'Agility': 'Agility_Rating', 'Speed': 'Speed_Rating', 'Acceleration': 'Acceleration_Rating', 'Strength': 'Strength_Rating', 'Jumping': 'Jumping_Rating'},
         'Passing': {'Throw Power': 'ThrowPower_Rating', 'Throw Accuracy (S)': 'ShortThrowAccuracy_Rating', 'Throw Accuracy (M)': 'MediumThrowAccuracy_Rating', 'Throw Accuracy (D)': 'DeepThrowAccuracy_Rating', 'Throw on Run': 'ThrowOnRun_Rating', 'Throw Under Pressure': 'ThrowUnderPressure_Rating', 'Play Action': 'PlayAction_Rating'},
         'Running': {'Carrying': 'Carrying_Rating', 'Elusiveness': 'Elusiveness_Rating', 'Ball Carrier Vision': 'BallCarrierVision_Rating', 'Break Tackle': 'BreakTackle_Rating'},
         'Receiving': { 'Catching': 'Catching_Rating', 'Catch In Traffic': 'CatchInTraffic_Rating', 'Route Running': 'RouteRunning_Rating', 'Release': 'Release_Rating'},
         'Blocking': {'Pass Block':'PassBlock_Rating', 'Run Block': 'RunBlock_Rating', 'Impact Block': 'ImpactBlock_Rating'},
         'Defense': {'Pass Rush':'PassRush_Rating', 'Block Shedding': 'BlockShedding_Rating','Tackle': 'Tackle_Rating','Hit Power': 'HitPower_Rating', 'Man Coverage': 'ManCoverage_Rating', 'Zone Coverage': 'ZoneCoverage_Rating', 'Press': 'Press_Rating',},
         'Kicking': {'Kick Power': 'KickPower_Rating','Kick Accuracy':  'KickAccuracy_Rating'},
    }

    PositionSkillSetMap={'QB': ['Overall','Physical', 'Passing', 'Running'],
                         'RB': ['Overall','Physical', 'Running'],
                         'FB': ['Overall','Physical', 'Running', 'Blocking'],
                         'WR': ['Overall','Physical', 'Receiving'],
                         'TE': ['Overall','Physical', 'Receiving', 'Blocking'],
                         'OT': ['Overall','Physical', 'Blocking'],
                         'OG': ['Overall','Physical', 'Blocking'],
                         'OC': ['Overall','Physical', 'Blocking'],
                         'DE': ['Overall','Physical', 'Defense'],
                         'DT': ['Overall','Physical', 'Defense'],
                         'MLB': ['Overall','Physical', 'Defense'],
                         'OLB': ['Overall','Physical', 'Defense'],
                         'CB': ['Overall','Physical', 'Defense'],
                         'S': ['Overall','Physical', 'Defense'],
                         'K': ['Overall','Kicking'],
                         'P': ['Overall','Kicking'],
    }

    SeasonStatGroupings = [
        {
            'StatGroupName': 'Passing',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': True, 'DisplayOrder': 2.5, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': False, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'PAS_YardsPerGame', 'DisplayName': 'Pass YPG', 'DisplayColumn': True, 'DisplayOrder': 4.5, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TD', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'PAS_SacksAndYards', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': False, 'DisplayOrder': 998, 'SeasonAggregateValue': False, 'SmallDisplay': False}
            ]
        },
        {
            'StatGroupName': 'Rushing',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'RUS_YardsPerGame', 'DisplayName': 'Rush YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True},
            ],
        },
        {
            'StatGroupName': 'Receiving',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'REC_YardsPerGame', 'DisplayName': 'Rec YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'REC_YardsPerCatch', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'REC_Targets', 'DisplayName': 'Targets', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': False},
            ],
        },
        {
            'StatGroupName': 'Defense',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False},
                {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True},
                {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False, 'SmallDisplay': False},
                {'FieldName': 'FUM_Recovered', 'DisplayName': 'FR', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False, 'SmallDisplay': False},
            ],
        },
    ]
    PositionRatingMap = {'QB': ['OverallRating', 'Awareness_Rating', 'Speed_Rating',  'ShortThrowAccuracy_Rating', 'MediumThrowAccuracy_Rating', 'DeepThrowAccuracy_Rating', 'ThrowPower_Rating','ThrowOnRun_Rating', 'ThrowUnderPressure_Rating', 'PlayAction_Rating'],
                         'RB': ['OverallRating', 'Agility_Rating', 'Speed_Rating', 'Acceleration_Rating', 'Carrying_Rating', 'Elusiveness_Rating', 'BallCarrierVision_Rating', 'BreakTackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'FB': ['OverallRating', 'Agility_Rating', 'Speed_Rating', 'Acceleration_Rating', 'Carrying_Rating', 'Elusiveness_Rating', 'BallCarrierVision_Rating', 'BreakTackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'WR': ['OverallRating', 'Catching_Rating', 'CatchInTraffic_Rating', 'RouteRunning_Rating', 'Release_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'TE': ['OverallRating', 'Catching_Rating', 'CatchInTraffic_Rating', 'RouteRunning_Rating', 'Release_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'OT': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                         'OG': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                         'OC': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                         'DE': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'DT': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'OLB': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'MLB': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'CB': ['OverallRating', 'ManCoverage_Rating', 'ZoneCoverage_Rating', 'Press_Rating', 'Agility_Rating', 'Acceleration_Rating', 'Tackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'S': ['OverallRating', 'ManCoverage_Rating', 'ZoneCoverage_Rating', 'Press_Rating', 'Agility_Rating', 'Acceleration_Rating', 'Tackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                         'K': ['OverallRating', 'KickPower_Rating', 'KickAccuracy_Rating'],
                         'P': ['OverallRating', 'KickPower_Rating', 'KickAccuracy_Rating'],
    }

    SkillNameMap = {
        'OverallRating': 'Overall',
        'Awareness_Rating': 'Awareness',
        'Speed_Rating': 'Speed',
        'ShortThrowAccuracy_Rating': 'Short Throw Accuracy',
        'MediumThrowAccuracy_Rating': 'Medium Throw Accuracy',
        'DeepThrowAccuracy_Rating': 'Deep Throw Accuracy',
        'ThrowPower_Rating': 'Throw Power',
        'ThrowOnRun_Rating': 'Throw on Run',
        'ThrowUnderPressure_Rating': 'Throw Under Pressure',
        'PlayAction_Rating': 'Play Action',
        'Agility_Rating': 'Agility',
        'Acceleration_Rating': 'Acceleration',
        'Carrying_Rating': 'Carrying',
        'Elusiveness_Rating': 'Elusiveness',
        'BallCarrierVision_Rating': 'Ball Carrier Vision',
        'BreakTackle_Rating': 'Break Tackle',
        'Catching_Rating': 'Catching',
        'CatchInTraffic_Rating': 'Catch in Traffic',
        'RouteRunning_Rating': 'Route Running',
        'Release_Rating': 'Release',
        'PassBlock_Rating': 'Pass Block',
        'RunBlock_Rating': 'Run Block',
        'ImpactBlock_Rating': 'Impact Block',
        'Strength_Rating': 'Strength',
        'PassRush_Rating': 'Pass Rush',
        'BlockShedding_Rating': 'Block Shedding',
        'Tackle_Rating': 'Tackling',
        'HitPower_Rating': 'Hit Power',
        'PlayRecognition_Rating': 'Play Recognition',
        'ManCoverage_Rating': 'Man Coverage',
        'ZoneCoverage_Rating': 'Zone Coverage',
        'Press_Rating': 'Press',
        'KickPower_Rating': 'Kick Power',
        'KickAccuracy_Rating': 'Kick Accuracy'
    }

    #for S in SkillNameMap:
    #    print(S, "= Avg('"+S+"'),")

    PlayerSkills = CurrentPlayerTeamSeasonSkill.__dict__
    PlayerDict['OverallRating'] = PlayerSkills['OverallRating']
    context['OverallRating'] = PlayerSkills['OverallRating']

    PositionAverageSkills = PlayerTeamSeasonSkill.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__PlayerID__PositionID = PlayerObject.PositionID,  PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True, PlayerTeamSeasonID__playerteamseasondepthchart__IsStarter = True).values('PlayerTeamSeasonID__PlayerID__PositionID').annotate(
        PlayerCount = Count('PlayerTeamSeasonID'),
        OverallRating = Round(Avg('OverallRating'),1),
        Awareness_Rating = Round(Avg('Awareness_Rating'),1),
        Speed_Rating = Round(Avg('Speed_Rating'),1),
        Jumping_Rating = Round(Avg('Jumping_Rating'),1),
        ShortThrowAccuracy_Rating = Round(Avg('ShortThrowAccuracy_Rating'),1),
        MediumThrowAccuracy_Rating = Round(Avg('MediumThrowAccuracy_Rating'),1),
        DeepThrowAccuracy_Rating = Round(Avg('DeepThrowAccuracy_Rating'),1),
        ThrowPower_Rating = Round(Avg('ThrowPower_Rating'),1),
        ThrowOnRun_Rating = Round(Avg('ThrowOnRun_Rating'),1),
        ThrowUnderPressure_Rating = Round(Avg('ThrowUnderPressure_Rating'),1),
        PlayAction_Rating = Round(Avg('PlayAction_Rating'),1),
        Agility_Rating = Round(Avg('Agility_Rating'),1),
        Acceleration_Rating = Round(Avg('Acceleration_Rating'),1),
        Carrying_Rating = Round(Avg('Carrying_Rating'),1),
        Elusiveness_Rating = Round(Avg('Elusiveness_Rating'),1),
        BallCarrierVision_Rating = Round(Avg('BallCarrierVision_Rating'),1),
        BreakTackle_Rating = Round(Avg('BreakTackle_Rating'),1),
        Catching_Rating = Round(Avg('Catching_Rating'),1),
        CatchInTraffic_Rating = Round(Avg('CatchInTraffic_Rating'),1),
        RouteRunning_Rating = Round(Avg('RouteRunning_Rating'),1),
        Release_Rating = Round(Avg('Release_Rating'),1),
        PassBlock_Rating = Round(Avg('PassBlock_Rating'),1),
        RunBlock_Rating = Round(Avg('RunBlock_Rating'),1),
        ImpactBlock_Rating = Round(Avg('ImpactBlock_Rating'),1),
        Strength_Rating = Round(Avg('Strength_Rating'),1),
        PassRush_Rating = Round(Avg('PassRush_Rating'),1),
        BlockShedding_Rating = Round(Avg('BlockShedding_Rating'),1),
        Tackle_Rating = Round(Avg('Tackle_Rating'),1),
        HitPower_Rating = Round(Avg('HitPower_Rating'),1),
        PlayRecognition_Rating = Round(Avg('PlayRecognition_Rating'),1),
        ManCoverage_Rating = Round(Avg('ManCoverage_Rating'),1),
        ZoneCoverage_Rating = Round(Avg('ZoneCoverage_Rating'),1),
        Press_Rating = Round(Avg('Press_Rating'),1),
        KickPower_Rating = Round(Avg('KickPower_Rating'),1),
        KickAccuracy_Rating = Round(Avg('KickAccuracy_Rating'),1),
    )[0]


    if TS.DivisionSeasonID is not None:
        PositionConferenceAverageSkills = PlayerTeamSeasonSkill.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).filter(PlayerTeamSeasonID__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID = TS.DivisionSeasonID.ConferenceSeasonID.ConferenceID).filter(PlayerTeamSeasonID__playerteamseasondepthchart__IsStarter = True).filter(PlayerTeamSeasonID__PlayerID__PositionID = PlayerObject.PositionID).values('PlayerTeamSeasonID__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID').annotate(
            OverallRating = Round(Avg('OverallRating'),1),
            Awareness_Rating = Round(Avg('Awareness_Rating'),1),
            Speed_Rating = Round(Avg('Speed_Rating'),1),
            Jumping_Rating = Round(Avg('Jumping_Rating'),1),
            ShortThrowAccuracy_Rating = Round(Avg('ShortThrowAccuracy_Rating'),1),
            MediumThrowAccuracy_Rating = Round(Avg('MediumThrowAccuracy_Rating'),1),
            DeepThrowAccuracy_Rating = Round(Avg('DeepThrowAccuracy_Rating'),1),
            ThrowPower_Rating = Round(Avg('ThrowPower_Rating'),1),
            ThrowOnRun_Rating = Round(Avg('ThrowOnRun_Rating'),1),
            ThrowUnderPressure_Rating = Round(Avg('ThrowUnderPressure_Rating'),1),
            PlayAction_Rating = Round(Avg('PlayAction_Rating'),1),
            Agility_Rating = Round(Avg('Agility_Rating'),1),
            Acceleration_Rating = Round(Avg('Acceleration_Rating'),1),
            Carrying_Rating = Round(Avg('Carrying_Rating'),1),
            Elusiveness_Rating = Round(Avg('Elusiveness_Rating'),1),
            BallCarrierVision_Rating = Round(Avg('BallCarrierVision_Rating'),1),
            BreakTackle_Rating = Round(Avg('BreakTackle_Rating'),1),
            Catching_Rating = Round(Avg('Catching_Rating'),1),
            CatchInTraffic_Rating = Round(Avg('CatchInTraffic_Rating'),1),
            RouteRunning_Rating = Round(Avg('RouteRunning_Rating'),1),
            Release_Rating = Round(Avg('Release_Rating'),1),
            PassBlock_Rating = Round(Avg('PassBlock_Rating'),1),
            RunBlock_Rating = Round(Avg('RunBlock_Rating'),1),
            ImpactBlock_Rating = Round(Avg('ImpactBlock_Rating'),1),
            Strength_Rating = Round(Avg('Strength_Rating'),1),
            PassRush_Rating = Round(Avg('PassRush_Rating'),1),
            BlockShedding_Rating = Round(Avg('BlockShedding_Rating'),1),
            Tackle_Rating = Round(Avg('Tackle_Rating'),1),
            HitPower_Rating = Round(Avg('HitPower_Rating'),1),
            PlayRecognition_Rating = Round(Avg('PlayRecognition_Rating'),1),
            ManCoverage_Rating = Round(Avg('ManCoverage_Rating'),1),
            ZoneCoverage_Rating = Round(Avg('ZoneCoverage_Rating'),1),
            Press_Rating = Round(Avg('Press_Rating'),1),
            KickPower_Rating = Round(Avg('KickPower_Rating'),1),
            KickAccuracy_Rating = Round(Avg('KickAccuracy_Rating'),1),
        )[0]

    PlayerDict['Skills'] = []

    for SkillGroup in SkillSetRatingMap:
        SkillObj = {'TopShow': False, 'Skills': [], 'SkillGroup': SkillGroup}
        for SkillSet in SkillSetRatingMap[SkillGroup]:
            RatingName = SkillSetRatingMap[SkillGroup][SkillSet]
            SkillValue = PlayerSkills[RatingName]
            SkillAttr = {'SkillName': SkillSet, 'SkillValue': SkillValue}
            if TS.DivisionSeasonID is not None:
                SkillAttr['PositionConferenceAverage'] = PositionConferenceAverageSkills[RatingName]
            SkillAttr['PositionAverage'] = PositionAverageSkills[RatingName]

            SkillObj['Skills'].append(SkillAttr)

        if SkillGroup in PositionSkillSetMap[PlayerDict['Position']]:
            SkillObj['TopShow'] = True

        PlayerDict['Skills'].append(SkillObj)

    print("PlayerDict['Skills']", PlayerDict['Skills'])

    if PlayerDict['IsRecruit'] == False:
        PlayerDict['PlayerName'] = PlayerDict['PlayerFirstName'] + ' ' + PlayerDict['PlayerLastName']

        if CurrentWeek.PhaseID.PhaseName == 'Preseason' and PlayerTeam.IsUserTeam:
            if not PlayerDict['WasPreviouslyRedshirted']:
                if not PTS.RedshirtedThisSeason:
                    context['Actions'].append({'Display': 'Redshirt player', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Add', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-tshirt w3-text-red"></i></span>'})
                else:
                    context['Actions'].append({'Display': 'Remove Redshirt'
                                             , 'ConfirmInfo': PlayerDict['PlayerName']
                                             , 'ResponseType': 'refresh'
                                             , 'Class': 'player-action'
                                             , 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Remove'
                                             , 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-stack-2x fa-inverse fa-tshirt w3-text-red"></i></span>'})


            if not PTS.TeamCaptain:
                context['Actions'].append({'Display': 'Add as captain', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Add', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-crown w3-text-green"></i></span>'})
            else:
                context['Actions'].append({'Display': 'Remove as Captain', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Remove', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-crown fa-stack-2x w3-text-green"></i></span>'})

            context['Actions'].append({'Display': 'Cut from team', 'ConfirmInfo': PlayerDict['PlayerName'], 'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCut', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-cut"></i></span>'})


        context['RedshirtedThisSeason'] = PTS.RedshirtedThisSeason
        context['TeamCaptain'] = PTS.TeamCaptain

        page = {'PageTitle': PlayerDict['FullName'] + ' - ' + PlayerTeam.TeamName, 'PlayerID': PlayerID, 'WorldID': WorldID, 'PrimaryColor': PlayerTeam.TeamColor_Primary_HEX, 'SecondaryColor': PlayerTeam.SecondaryColor_Display, 'SecondaryJerseyColor': PlayerTeam.TeamColor_Secondary_HEX}
        page['NavBarLinks'] = NavBarLinks(Path = 'Player', GroupName='Player', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)



        PlayerDict['TeamJerseyInvert'] = PlayerTeam.TeamJerseyInvert


        #PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__GameDateID')
        PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__WeekID').values('RUS_Yards', 'RUS_TD', 'RUS_Carries', 'RUS_20', 'RUS_LNG', 'REC_LNG', 'PAS_Yards', 'PAS_TD', 'PAS_Completions', 'PAS_Attempts', 'PAS_Sacks', 'PAS_SackYards', 'PAS_INT', 'REC_Yards','REC_Receptions', 'REC_TD', 'REC_Targets', 'FUM_Forced', 'FUM_Lost', 'FUM_Recovered', 'DEF_TacklesForLoss',  'GameScore', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation','PlayerTeamSeasonID__ClassID__ClassName','PlayerTeamSeasonID__TeamSeasonID__TeamID_id', 'GamesStarted', 'GamesPlayed', 'DEF_Tackles', 'DEF_Sacks', 'DEF_INT', 'DEF_Deflections', 'DEF_TacklesForLoss', 'FUM_Fumbles', 'TeamGameID', 'TeamGameID__GameID', 'TeamGameID__GameID__WeekID__WeekNumber', 'TeamGameID__GameID__WeekID__WeekName', 'TeamGameID__GameID__WeekID_id', 'BLK_Pancakes', 'BLK_Sacks', 'BLK_Blocks', 'KCK_FGA', 'KCK_FGM', 'KCK_XPM', 'KCK_XPA').annotate(  # call `annotate`
                PAS_CompletionPercentage=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Completions'))* 100.0 / Sum(F('PAS_Attempts')),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerAttempt=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Yards')) * 1.0 / Sum(F('PAS_Attempts')),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerCompletion=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('PAS_Completions')),1)),
                    output_field=FloatField()
                ),
                RUS_YardsPerCarry=Case(
                    When(RUS_Carries=0, then=0.0),
                    default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('RUS_Carries')),1)),
                    output_field=FloatField()
                ),
                PAS_CompletionsAndAttempts=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
                    output_field=CharField()
                ),
                PAS_SacksAndYards=Case(
                    When(PAS_Attempts=0, then=0),
                    default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
                    output_field=CharField()
                ),
                REC_YardsPerCatch=Case(
                    When(REC_Receptions=0, then=0.0),
                    default=(Round(Sum(F('REC_Yards'))* 1.0 / Sum(F('REC_Receptions')),1)),
                    output_field=FloatField()
                ),
                REC_YardsPerGame=Case(
                    When(REC_Receptions=0, then=0.0),
                    default=(Round(Sum(F('REC_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
                    output_field=FloatField()
                ),
                RUS_YardsPerGame=Case(
                    When(RUS_Carries=0, then=0.0),
                    default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerGame=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
                    output_field=FloatField()
                ),
                Position = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
                GameOutcomeLetter = Case(
                    When(TeamGameID__IsWinningTeam = True, then=Value('W')),
                    When(Q(TeamGameID__IsWinningTeam = False) & Q(TeamGameID__GameID__WasPlayed = True), then=Value('L')),
                    default=Value(''),
                    output_field=CharField()
                ),
                OpponentTeamName = F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamName'),
                OpponentTeamLogoURL = F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamLogoURL'),
                OpponentTeamColor_Primary_HEX= F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamColor_Primary_HEX'),
                OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID'), output_field=CharField()),
                GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('TeamGameID__GameID'), output_field=CharField()),
                GameScoreDisplay = Concat(F('TeamGameID__Points'), Value('-'), F('TeamGameID__OpposingTeamGameID__Points'), output_field=CharField()),
            ).order_by('-TeamGameID__GameID__WeekID__WeekNumber')


        PlayerStatsShow = {'Passing': False,
                          'Rushing': False,
                          'Receiving': False,
                          'Blocking': False,
                          'Defense': False,
                          'Kicking': False,}

        PlayerStatsShowMap = {
                    'QB': 'Passing',
                    'RB': 'Rushing',
                    'FB': 'Rushing',
                    'WR': 'Receiving',
                    'TE': 'Receiving',
                    'OT': 'Blocking',
                    'OG': 'Blocking',
                    'OC': 'Blocking',
                    'DE': 'Defense',
                    'DT': 'Defense',
                    'OLB': 'Defense',
                    'MLB': 'Defense',
                    'CB': 'Defense',
                    'S': 'Defense',
                    'K': 'Kicking',
                    'P': 'Kicking'
                          }
        PrimaryStatShow = PlayerStatsShowMap[PlayerDict['PositionID__PositionAbbreviation']]
        for PS in PlayerStats:
            if PS['PAS_Attempts'] > 0:
                PlayerStatsShow['Passing'] = True
            if PS['RUS_Carries'] > 0:
                PlayerStatsShow['Rushing'] = True
            if PS['REC_Targets'] > 0:
                PlayerStatsShow['Receiving'] = True
            if PS['BLK_Blocks'] > 0:
                PlayerStatsShow['Blocking'] = True
            if PS['DEF_Tackles'] + PS['DEF_Deflections'] + PS['DEF_INT'] + PS['FUM_Forced'] > 0:
                PlayerStatsShow['Defense'] = True
            if PS['KCK_FGA'] + PS['KCK_XPA'] > 0:
                PlayerStatsShow['Kicking'] = True


        SeasonStats = PlayerObject.playerteamseason_set.all().order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'TeamSeasonID__LeagueSeasonID__IsCurrent').annotate(  # call `annotate`
                Position = F('PlayerID__PositionID__PositionAbbreviation'),
                GameScore=Sum('playergamestat__GameScore'),
                GamesPlayed=Sum('playergamestat__GamesPlayed'),
                RUS_Yards=Sum('playergamestat__RUS_Yards'),
                RUS_TD=Sum('playergamestat__RUS_TD'),
                RUS_Carries=Sum('playergamestat__RUS_Carries'),
                REC_Receptions=Sum('playergamestat__REC_Receptions'),
                REC_TD=Sum('playergamestat__REC_TD'),
                REC_Targets=Sum('playergamestat__REC_Targets'),
                PAS_Yards=Sum('playergamestat__PAS_Yards'),
                PAS_TD=Sum('playergamestat__PAS_TD'),
                PAS_Sacks=Sum('playergamestat__PAS_Sacks'),
                PAS_SackYards=Sum('playergamestat__PAS_SackYards'),
                PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
                PAS_Completions=Sum('playergamestat__PAS_Completions'),
                PAS_INT=Sum('playergamestat__PAS_INT'),
                REC_Yards=Sum('playergamestat__REC_Yards'),
                DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
                DEF_INT=Sum('playergamestat__DEF_INT'),
                DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
                DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
                FUM_Forced=Sum('playergamestat__FUM_Forced'),
                FUM_Recovered=Sum('playergamestat__FUM_Recovered'),
                PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
                PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
                PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
                PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
                PlayerTeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
                SeasonYear = F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
                PAS_CompletionPercentage=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerAttempt=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(F('PAS_Yards') * 1.0 / F('PAS_Attempts'),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerCompletion=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Completions'),1)),
                    output_field=FloatField()
                ),
                RUS_YardsPerCarry=Case(
                    When(RUS_Carries=0, then=0.0),
                    default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                    output_field=FloatField()
                ),
                PAS_CompletionsAndAttempts=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
                    output_field=CharField()
                ),
                PAS_SacksAndYards=Case(
                    When(PAS_Attempts=0, then=0),
                    default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
                    output_field=CharField()
                ),
                REC_YardsPerCatch=Case(
                    When(REC_Receptions=0, then=0.0),
                    default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                    output_field=FloatField()
                ),
                REC_YardsPerGame=Case(
                    When(REC_Receptions=0, then=0.0),
                    default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                    output_field=FloatField()
                ),
                RUS_YardsPerGame=Case(
                    When(RUS_Carries=0, then=0.0),
                    default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerGame=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                    output_field=FloatField()
                ),
            ).filter(GamesPlayed__gt = 0)

        CareerHigh = {}
        if PlayerStats.count() >0:
            PAS_Yards_CareerHigh = PlayerStats.order_by('-PAS_Yards').first()
            RUS_Yards_CareerHigh = PlayerStats.order_by('-RUS_Yards').first()
            REC_Yards_CareerHigh = PlayerStats.order_by('-REC_Yards').first()
            CareerHigh = {'PAS_Yards': {'Stat': 'Passing Yards', 'Game': PAS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': PAS_Yards_CareerHigh['PAS_Yards']}, 'RUS_Yards':{'Stat': 'Rushing Yards', 'Game': RUS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': RUS_Yards_CareerHigh['RUS_Yards']}, 'REC_Yards': {'Stat': 'Receiving Yards Yards', 'Game': REC_Yards_CareerHigh['TeamGameID__GameID'], 'Value': REC_Yards_CareerHigh['REC_Yards']}}

            StatGrouping = []
            PlayerStatCategories = []
            for StatGrouping in SeasonStatGroupings:
                KeepGroup = False
                for u in SeasonStats:
                    u['SeasonStatVals'] = []
                    for Stat in StatGrouping['Stats']:
                        val = u[Stat['FieldName']]

                        if Stat['DisplayColumn']:
                            u['SeasonStatVals'].append(val)
                            print(val)
                            if val is not None and str(val) not in ['0', '0.0', '-'] and Stat['FieldName'] != 'GamesPlayed':
                                KeepGroup = True
                                StatGrouping['KeepGroup'] = True


                if KeepGroup:
                    StatGrouping['SeasonStats'] = []
                    for u in SeasonStats:

                        StatGrouping['SeasonStats'].append({'SeasonYear': u['SeasonYear'], 'Stats': u['SeasonStatVals']})


        PlayerStats = [u for u in PlayerStats]
        for G in PlayerStats:
            G['Stats'] = []
            for StatCategory in PlayerStatCategories:
                #print('StatCategory', StatCategory)
                if StatCategory['SeasonAggregateValue'] == True:
                    continue
                SC = {}
                SC['Value'] = G[StatCategory['FieldName']]
                SC['FieldName'] = StatCategory['FieldName']
                G['Stats'].append(SC)

        RecentGameStats = PlayerStats[:5]
        GameStats = PlayerStats

        CareerHighList = []
        for ch in CareerHigh:
            CareerHighList.append({'Stat': ch, 'Game': CareerHigh[ch]['Game'], 'Value': CareerHigh[ch]['Value']})


        PlayerListFlat = Player.objects.filter(playerteamseason__TeamSeasonID = TS).values(
            'PositionID__PositionAbbreviation', 'playerteamseason__playerteamseasonskill__OverallRating'
        ).annotate(
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
            PlayerTeamLogoURL = F('playerteamseason__TeamSeasonID__TeamID__TeamLogoURL'),
        ).order_by('PositionID__PositionSortOrder', '-playerteamseason__playerteamseasonskill__OverallRating')

        print('PlayerListFlat', PlayerListFlat.query)

        PlayerList = {}
        for P in list(PlayerListFlat):
            if P['PositionID__PositionAbbreviation'] not in PlayerList:
                PlayerList[P['PositionID__PositionAbbreviation']] = []
            PlayerList[P['PositionID__PositionAbbreviation']].append(P)


        context['GameStats'] = GameStats
        context['RecentGameStats'] = RecentGameStats
        context['careerHigh'] = CareerHighList
        context['SeasonStats'] = SeasonStats
        context['playerTeam'] = PlayerTeam
        context['CurrentPlayerTeamSeason'] = CurrentPlayerTeamSeason
        #context['PlayerStatCategories'] = PlayerStatCategories
        context['SeasonStatGroupings'] = SeasonStatGroupings
        context['PlayerStatsShow'] = PlayerStatsShow
        context['PrimaryStatShow'] = PrimaryStatShow
        context['PlayerList'] = PlayerList

        Awards = []
        AwardQS = PlayerTeamSeasonAward.objects.filter(PlayerTeamSeasonID__PlayerID = PlayerDict['Player'])
        for Award in AwardQS.values('IsWeekAward', 'IsSeasonAward', 'IsPreseasonAward', 'IsConferenceAward', 'ConferenceID', 'IsNationalAward').annotate(AwardCount = Count('PlayerTeamSeasonAwardID')).order_by('-AwardCount'):
            s = ''
            if Award['IsNationalAward']:
                s += 'National Player of the '
            elif Award['IsConferenceAward']:
                Conf = CurrentWorld.conference_set.filter(ConferenceID = Award['ConferenceID']).first()
                s += Conf.ConferenceName + ' Player of the '

            if Award['IsWeekAward']:
                s += 'Week'
            elif Award['IsSeasonAward']:
                s+= 'Year'
            elif Award['IsPreseasonAward']:
                s+= 'Preseason'

            Award['AwardName'] = s

            Awards.append(Award)
        context['Awards'] = Awards


    else:

        page['PrimaryColor'] =  '1763B2'
        page['SecondaryColor'] = '000000'

        RTS = RecruitTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerTeamSeasonID__PlayerID = PlayerID).filter(Q(IsActivelyRecruiting=True) | Q(Signed=True)).order_by('-InterestLevel')

        context['RecruitTeamSeasons'] = RTS


    context['Skills'] = PlayerDict['Skills']
    context['PlayerID'] = PlayerID
    context['page'] = page
    return render(request, 'HeadFootballCoach/Player.html', context)



def Page_Game(request, WorldID, GameID):
    DoAudit = False
    if DoAudit:
        start = time.time()
    GameQuerySet = get_object_or_404(Game, pk=GameID)
    HomeTeamGameID = GameQuerySet.teamgame_set.filter(IsHomeTeam = True).first()
    AwayTeamGameID = GameQuerySet.teamgame_set.filter(IsHomeTeam = False).first()

    GameDict = GameQuerySet.ReturnAsDict()

    allTeams = GetAllTeams(WorldID, LeagueSeasonID = None)
    HomeTeam = GameDict['HomeTeamID']
    AwayTeam = GameDict['AwayTeamID']
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()

    GameWeek = None


    page = {'PageTitle': AwayTeam.TeamName + ' @ ' + HomeTeam.TeamName, 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    CurrentWeek = GetCurrentWeek(CurrentWorld)
    CurrentSeason = CurrentWeek.PhaseID.LeagueSeasonID
    UserTeam = GetUserTeam(WorldID)
    page['NavBarLinks'] = NavBarLinks(Path = 'Game', GroupName='Game', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)

    Events = []
    BoxScore = []
    TeamStatBox = {}
    HomePlayers = []
    AwayPlayers = []

    context = {}
    context['ShowStatBox'] = GameDict['HomeGamesPlayed'] + GameDict['AwayGamesPlayed']  > 0
    BoxScoreStatGroupings = [
        {
            'StatGroupName': 'Passing',
            'Stats': [
                {'FieldName': 'GameStarted_Class', 'DisplayName': '', 'DisplayColumn': False, 'DisplayOrder': 0.9},
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PAS_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True, 'DisplayOrder': 1.5},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': True, 'DisplayOrder': 2},
                {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': True, 'DisplayOrder': 2.5},
                {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': False, 'DisplayOrder': 3},
                {'FieldName': 'PAS_TD', 'DisplayName': 'TD', 'DisplayColumn': True, 'DisplayOrder': 5},
                {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': True, 'DisplayOrder': 6},
                {'FieldName': 'PAS_SacksAndYards', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': True, 'DisplayOrder': 7},
                {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': False, 'DisplayOrder': 998}
            ]
        },
        {
            'StatGroupName': 'Rushing',
            'Stats': [
                {'FieldName': 'GameStarted_Class', 'DisplayName': '', 'DisplayColumn': False, 'DisplayOrder': 0.9},
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': True, 'DisplayOrder': 2},
                {'FieldName': 'RUS_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True, 'DisplayOrder': 3},
                {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5},
                {'FieldName': 'RUS_TD', 'DisplayName': 'TDs', 'DisplayColumn': True, 'DisplayOrder': 4},
                {'FieldName': 'FUM_Fumbles', 'DisplayName': 'Fumbles', 'DisplayColumn': True, 'DisplayOrder': 5},
            ],
        },
        {
            'StatGroupName': 'Receiving',
            'Stats': [
                {'FieldName': 'GameStarted_Class', 'DisplayName': '', 'DisplayColumn': False, 'DisplayOrder': 0.9},
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'DisplayColumn': True, 'DisplayOrder': 2},
                {'FieldName': 'REC_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True, 'DisplayOrder': 3},
                {'FieldName': 'REC_YardsPerCatch', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5},
                {'FieldName': 'REC_TD', 'DisplayName': 'TDs', 'DisplayColumn': True, 'DisplayOrder': 4},
            ],
        },
        {
            'StatGroupName': 'Defense',
            'Stats': [
                {'FieldName': 'GameStarted_Class', 'DisplayName': '', 'DisplayColumn': False, 'DisplayOrder': 0.9},
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'DisplayColumn': True, 'DisplayOrder': 2},
                {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'DisplayColumn': True, 'DisplayOrder': 3},
                {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'DisplayColumn': True, 'DisplayOrder': 4},
                {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'DisplayColumn': True, 'DisplayOrder': 5},
                {'FieldName': 'FUM_Recovered', 'DisplayName': 'FR', 'DisplayColumn': True, 'DisplayOrder': 6},
                {'FieldName': 'FUM_ReturnYards', 'DisplayName': 'FYards', 'DisplayColumn': True, 'DisplayOrder': 7},
                {'FieldName': 'FUM_ReturnTD', 'DisplayName': 'FTDs', 'DisplayColumn': True, 'DisplayOrder': 8},
            ],
        },
        {
            'StatGroupName': 'Kicking',
            'Stats': [
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'FG', 'DisplayName': 'FG', 'DisplayColumn': True, 'DisplayOrder': 3},
                {'FieldName': 'FG29', 'DisplayName': 'FG <29', 'DisplayColumn': True, 'DisplayOrder': 4},
                {'FieldName': 'FG39', 'DisplayName': 'FG 30-39', 'DisplayColumn': True, 'DisplayOrder': 6},
                {'FieldName': 'FG49', 'DisplayName': 'FG 40-49', 'DisplayColumn': True, 'DisplayOrder': 8},
                {'FieldName': 'FG50', 'DisplayName': 'FG 50+', 'DisplayColumn': True, 'DisplayOrder': 10},
                {'FieldName': 'ExtraPoint', 'DisplayName': 'XP', 'DisplayColumn': True, 'DisplayOrder': 12},
            ],
        },
    ]

    if GameDict['WasPlayed'] == 1:
        GameWeek = GameQuerySet.WeekID
        if GameDict['HomePoints'] > GameDict['AwayPoints']:
            #AwayOutcomeLetter
            GameDict['AwayOutcomeLetter'] = 'L'
            GameDict['HomeOutcomeLetter'] = 'W'
        else:
            GameDict['AwayOutcomeLetter'] = 'W'
            GameDict['HomeOutcomeLetter'] = 'L'


        GameEvents = GameEvent.objects.filter(WorldID=WorldID).filter(GameID = GameID)

        EventPeriods = GameEvents.values('EventPeriod').distinct()
        GameEvents = GameEvents.values('EventPeriod', 'EventTime', 'HomePoints', 'AwayPoints', 'IsScoringPlay', 'IsScoringPlay', 'PlayDescription', 'DriveDescription', 'DisplayTeamID__Abbreviation', 'PlayType', 'DisplayTeamID__TeamLogoURL', 'DisplayTeamID__TeamColor_Primary_HEX').annotate(
            PeriodName = Case(
                When(EventPeriod = 1, then=Value('1st')),
                When(EventPeriod = 2, then=Value('2nd')),
                When(EventPeriod = 3, then=Value('3rd')),
                When(EventPeriod = 4, then=Value('4th')),
                When(EventPeriod = 5, then=Value('OT')),
                When(EventPeriod = 6, then=Value('OT2')),
                When(EventPeriod = 7, then=Value('OT3')),
                default=Value('OT4'),
                output_field=CharField()
            ),
            FormattedMinutes = F('EventTime') / 60,
            RawSeconds = F('EventTime') % 60,
            FormattedSeconds = Case(
                When(RawSeconds__lt = 10, then=Concat(Value('0'), F('RawSeconds'), output_field=CharField())),
                default =  F('RawSeconds'),
                output_field=CharField()
            ),
            FormattedTime = Concat(F('FormattedMinutes'), Value(':'), F('FormattedSeconds'), output_field=CharField()),
            DisplayTime = Concat(F('PeriodName'), Value(' | '), F('FormattedTime'), output_field=CharField()),
        )



        for GE in GameEvents:
            GE['GameTime'] = (GE['EventPeriod'] -1) * (60*15)  + ((60*15) - GE['EventTime']) #if GE['EventPeriod'] in [1,2,3,4] else (60*60)  + GE['EventTime']

        PeriodTitleMap = {1: '1st', 2: '2nd', 3:'3rd', 4: '4th', 5: 'OT', 6: '2OT', 7: '3OT', 8: '4OT', 9: '5OT', 10: '6OT', 11: '7OT'}
        PeriodNameMap = {1: '1st Quarter', 2: '2nd Quarter', 3:'3rd Quarter', 4: '4th Quarter', 5: 'Overtime 1', 6: 'Overtime 2', 7: 'Overtime 3', 8: 'Overtime 4', 9: 'Overtime 5', 10: 'Overtime 6', 11: 'Overtime 7'}

        BoxScore = []
        ScoringSummary = []
        HomeScoreLastPeriod = 0
        AwayScoreLastPeriod = 0

        for EP in EventPeriods:
            EventPeriod = EP['EventPeriod']
            PeriodEvents = GameEvents.filter(EventPeriod = EventPeriod)
            HomeScoreEndOfPeriod = PeriodEvents.aggregate(Max('HomePoints'))
            HomeScoreEndOfPeriod = HomeScoreEndOfPeriod['HomePoints__max']
            AwayScoreEndOfPeriod = PeriodEvents.aggregate(Max('AwayPoints'))
            AwayScoreEndOfPeriod = AwayScoreEndOfPeriod['AwayPoints__max']

            HomeScoreThisPeriod = HomeScoreEndOfPeriod - HomeScoreLastPeriod
            AwayScoreThisPeriod = AwayScoreEndOfPeriod - AwayScoreLastPeriod

            PeriodBoxScore = {'HomePoints': HomeScoreThisPeriod,'AwayPoints': AwayScoreThisPeriod}

            PeriodBoxScore['PeriodTitle'] = PeriodTitleMap[EventPeriod]
            BoxScore.append(PeriodBoxScore)

            HomeScoreLastPeriod = HomeScoreEndOfPeriod
            AwayScoreLastPeriod = AwayScoreEndOfPeriod


            PeriodScoringSummary = {}
            ScoreList = []

            for Event in PeriodEvents:
                Event['DisplayTime'] = SecondsToMinutes(Event['EventTime'])
                Event['DriveEventClass'] = 'DriveEndingEvent-All'

                if Event['IsScoringPlay'] == True:
                    Event['DriveEventClass'] += ' DriveEndingEvent-Score'
                else:
                    Event['DriveEventClass'] += ' w3-hide'
                ScoreList.append(Event)

            PeriodScoringSummary['PeriodName'] = PeriodNameMap[EventPeriod]
            PeriodScoringSummary['ScoreList'] = ScoreList

            if len(PeriodScoringSummary['ScoreList']) > 0:
                ScoringSummary.append(PeriodScoringSummary)


        TeamStatBox = []
        StatBoxStats  = [{'FieldName': 'TotalYards', 'DisplayName': 'Total Yards'}, {'FieldName': 'FirstDowns', 'DisplayName': 'First Downs'}]
        StatBoxStats += [{'FieldName': 'TimeOfPossession', 'DisplayName': 'Time Of Possession', 'Formatting': 'Seconds'}, {'FieldName': 'Turnovers', 'DisplayName': 'Turnovers'}]
        StatBoxStats += [{'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks'} , {'FieldName': 'PNT_Punts', 'DisplayName': 'Punts'}]
        StatBoxStats += [{'FieldName': 'ThirdDownPercentage', 'DisplayName': '3rd Down %', 'Formatting': 'Percentagexxx'}, {'FieldName': 'FourthDownPercentage', 'DisplayName': '4th Down %', 'Formatting': 'Percentagexxx'}]
        StatBoxStats += [{'FieldName': 'BiggestLead', 'DisplayName': 'Biggest Lead'}, {'FieldName': 'FourthDownPercentage', 'DisplayName': '4th Down %', 'Formatting': 'Percentagexxx'}]
        for Stat in StatBoxStats:
            StatName = Stat['FieldName']
            Stat['HomeValue'] = GameDict['Home'+StatName]
            Stat['AwayValue'] = GameDict['Away'+StatName]
            MaxValue  = Stat['HomeValue'] if Stat['HomeValue'] > Stat['AwayValue'] else Stat['AwayValue']
            if 'Formatting' in Stat:
                 if Stat['Formatting'] in ['Seconds', 'Percentage']:
                     MaxValue = Stat['HomeValue'] + Stat['AwayValue']
            Stat['HomeRatio'] = round(float(Stat['HomeValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0
            Stat['AwayRatio'] = round(float(Stat['AwayValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0

            Stat['HomeRatio'] = 5 if Stat['HomeRatio'] == 0 else Stat['HomeRatio']
            Stat['AwayRatio'] = 5 if Stat['AwayRatio'] == 0 else Stat['AwayRatio']

            if 'Formatting' in Stat:
                if Stat['Formatting'] == 'Seconds':
                    Stat['HomeValue'] = SecondsToMinutes(Stat['HomeValue'])
                    Stat['AwayValue'] = SecondsToMinutes(Stat['AwayValue'])
                elif Stat['Formatting'] == 'Percentagexxx':
                    Stat['HomeRatio'] = str(Stat['HomeValue']) if Stat['HomeValue'] > 5 else str(5)
                    Stat['AwayRatio'] = str(Stat['AwayValue']) if Stat['AwayValue'] > 5 else str(5)
                    Stat['HomeValue'] = str(Stat['HomeValue']) + '%'
                    Stat['AwayValue'] = str(Stat['AwayValue']) + '%'
            #StatDict = {'StatName': Stat, 'HomeValue': HomeValue, 'AwayValue': AwayValue, 'HomeRatio': HomeRatio, 'AwayRatio': AwayRatio}
            TeamStatBox.append(Stat)

        context['gameEvents'] = GameEvents
        context['ScoringSummary'] = ScoringSummary


        PlayerGames = PlayerGameStat.objects.filter(TeamGameID__GameID = GameQuerySet).values('RUS_Yards', 'RUS_TD', 'RUS_Carries', 'PAS_Yards', 'PAS_TD', 'PAS_Completions', 'GamesStarted', 'PAS_Attempts', 'PAS_Sacks', 'PAS_SackYards', 'PAS_INT', 'REC_Yards','REC_Receptions', 'REC_TD',  'GameScore', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation','PlayerTeamSeasonID__TeamSeasonID__TeamID_id', 'GamesStarted', 'DEF_Tackles', 'DEF_Sacks', 'DEF_INT', 'FUM_Lost', 'FUM_Forced', 'FUM_Fumbles', 'FUM_ReturnTD', 'FUM_Recovered', 'FUM_ReturnYards', 'KCK_XPM', 'KCK_XPA', 'KCK_FGM', 'KCK_FGA', 'KCK_FGM29', 'KCK_FGA29', 'KCK_FGM39', 'KCK_FGA39', 'KCK_FGM49', 'KCK_FGA49', 'KCK_FGM50', 'KCK_FGA50').annotate(  # call `annotate`
                PAS_CompletionPercentage=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Completions'))* 100.0 / Sum(F('PAS_Attempts')),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerAttempt=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Yards')) * 1.0 / Sum(F('PAS_Attempts')),1)),
                    output_field=FloatField()
                ),
                PAS_YardsPerCompletion=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('PAS_Completions')),1)),
                    output_field=FloatField()
                ),
                RUS_YardsPerCarry=Case(
                    When(RUS_Carries=0, then=0.0),
                    default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('RUS_Carries')),1)),
                    output_field=FloatField()
                ),
                PAS_CompletionsAndAttempts=Case(
                    When(PAS_Attempts=0, then=0.0),
                    default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
                    output_field=CharField()
                ),
                PAS_SacksAndYards=Case(
                    When(PAS_Attempts=0, then=0),
                    default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
                    output_field=CharField()
                ),
                REC_YardsPerCatch=Case(
                    When(REC_Receptions=0, then=0.0),
                    default=(Round(Sum(F('REC_Yards'))* 1.0 / Sum(F('REC_Receptions')),1)),
                    output_field=FloatField()
                ),
                ExtraPoint=Concat('KCK_XPM', Value('-') ,'KCK_XPA', output_field=CharField()),
                FG  =Concat('KCK_FGM'  , Value('-') ,'KCK_FGA'  , output_field=CharField()),
                FG29=Concat('KCK_FGM29', Value('-') ,'KCK_FGA29', output_field=CharField()),
                FG39=Concat('KCK_FGM39', Value('-') ,'KCK_FGA39', output_field=CharField()),
                FG49=Concat('KCK_FGM49', Value('-') ,'KCK_FGA49', output_field=CharField()),
                FG50=Concat('KCK_FGM50', Value('-') ,'KCK_FGA50', output_field=CharField()),
                GameStarted_Class=Case(
                    When(GamesStarted=0, then=Value('')),
                    default=Value('gamePlayerStarted'),
                    output_field=CharField()
                ),
            ).order_by('-GameScore')

        for u in PlayerGames:
            u['FullName'] = u['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + u['PlayerTeamSeasonID__PlayerID__PlayerLastName'] + ', ' + u['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']
            u['Position'] = u['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']
            u['PlayerID'] = u['PlayerTeamSeasonID__PlayerID_id']

            for StatGrouping in BoxScoreStatGroupings:
                if 'HomeTeam' not in StatGrouping:
                    StatGrouping['HomeTeam'] = []
                if 'AwayTeam' not in StatGrouping:
                    StatGrouping['AwayTeam'] = []

                PlayerStatGroup = {'Stats':[]}
                NonZeroStat = False
                for Stat in StatGrouping['Stats']:
                    if Stat['FieldName'] in ['FullName', 'PlayerID'] or Stat['DisplayColumn'] == False:
                        continue
                    PSG = {'DisplayName': Stat['FieldName'], 'Value': u[Stat['FieldName']]}
                    PlayerStatGroup[Stat['FieldName']] = u[Stat['FieldName']]
                    if (u[Stat['FieldName']] != 0 and u[Stat['FieldName']] != '0-0') and Stat['FieldName'] not in ['FullName', 'PlayerID']:
                        NonZeroStat = True
                    PlayerStatGroup['Stats'].append(PSG)


                PlayerStatGroup ['PlayerID'] = u['PlayerID']
                PlayerStatGroup ['FullName'] = u['FullName']
                PlayerStatGroup ['GameStarted_Class'] = u['GameStarted_Class']
                if NonZeroStat:
                    if u['PlayerTeamSeasonID__TeamSeasonID__TeamID_id'] == HomeTeam.TeamID:
                        StatGrouping['HomeTeam'].append(PlayerStatGroup)
                    else:
                        StatGrouping['AwayTeam'].append(PlayerStatGroup)

            PlayerToAdd = u


    else:
        GameWeek = CurrentWeek
        HomeTS = HomeTeam.CurrentTeamSeason
        AwayTS = AwayTeam.CurrentTeamSeason
        context['TeamStatHeaderSuffix'] = ' - This Season'
        context['TeamStatNameSuffix'] = ' Per Game'

        LastTeamMeetings = TeamGame.objects.filter(GameID__WasPlayed = True).filter(TeamSeasonID__TeamID = HomeTeam).filter(OpposingTeamGameID__TeamSeasonID__TeamID = AwayTeam).values('TeamSeasonID__TeamID__TeamName', 'OpposingTeamGameID__TeamSeasonID__TeamID__TeamName', 'GameID__WeekID__WeekName').annotate(
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'),F('GameID'), output_field=CharField()),
            WeekName = F('GameID__WeekID__WeekName'),
            Year = F('GameID__WeekID__PhaseID__LeagueSeasonID__SeasonStartYear'),
            WinningTeamName = Case(
                When(IsWinningTeam = True, then=F('TeamSeasonID__TeamID__TeamName')),
                default=F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamName'),
                output_field=CharField()
            ),
            WinningTeamID = Case(
                When(IsWinningTeam = True, then=F('TeamSeasonID__TeamID')),
                default=F('OpposingTeamGameID__TeamSeasonID__TeamID'),
                output_field=CharField()
            ),
            WinningTeamPrimaryColor = Case(
                When(IsWinningTeam = True, then=F('TeamSeasonID__TeamID__TeamColor_Primary_HEX')),
                default=F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamColor_Primary_HEX'),
                output_field=CharField()
            ),
            WinningTeamSecondaryColor = Case(
                When(IsWinningTeam = True, then=F('TeamSeasonID__TeamID__TeamColor_Secondary_HEX')),
                default=F('OpposingTeamGameID__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'),
                output_field=CharField()
            ),
            WinningTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'),F('WinningTeamID'), output_field=CharField()),
            GameOrderRank = Window(
                expression=Rank(),
                order_by=F("GameID__WeekID").asc(),
            ),
            WinningTeamScore = Case(
                When(IsWinningTeam = True, then=F('Points')),
                default=F('OpposingTeamGameID__Points'),
                output_field=CharField()
            ),
            LosingTeamScore = Case(
                When(IsWinningTeam = False, then=F('Points')),
                default=F('OpposingTeamGameID__Points'),
                output_field=CharField()
            ),
            ScoreDisplay = Concat(F('WinningTeamScore'), Value('-'), F('LosingTeamScore'), output_field=CharField()),

        ).order_by('-GameID__WeekID')

        print('LastTeamMeetings', LastTeamMeetings)

        context['LastTeamMeetings'] = LastTeamMeetings

        TeamStatBox = []
        StatBoxStats  = [{'FieldName': 'TotalYards', 'DisplayName': 'Yards Per Game'}, {'FieldName': 'Opponent_TotalYards', 'DisplayName': 'Yards Allowed Per Game'},]
        StatBoxStats  += [{'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards Per Game'}, {'FieldName': 'Opponent_PAS_Yards', 'DisplayName': 'Pass Yards Allowed Per Game'}]
        StatBoxStats  += [{'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards Per Game'}, {'FieldName': 'Opponent_RUS_Yards', 'DisplayName': 'Rush Yards Allowed Per Game'}]
        StatBoxStats += [ {'FieldName': 'Turnovers', 'DisplayName': 'Turnovers Per Game'}, {'FieldName': 'Opponent_Turnovers', 'DisplayName': 'Takeaways Per Game'}]
        StatBoxStats += [{'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks Per Game'} ,{'FieldName': 'ThirdDownPercentage', 'DisplayName': '3rd Down %', 'Formatting': 'Percentagexxx'},]
        for Stat in StatBoxStats:
            StatName = Stat['FieldName']
            Stat['HomeValue'] = GameDict['Home'+StatName]
            Stat['AwayValue'] = GameDict['Away'+StatName]
            MaxValue  = Stat['HomeValue'] if Stat['HomeValue'] > Stat['AwayValue'] else Stat['AwayValue']
            if 'Formatting' in Stat:
                 if Stat['Formatting'] in ['Seconds', 'Percentage']:
                     MaxValue = Stat['HomeValue'] + Stat['AwayValue']
            Stat['HomeRatio'] = round(float(Stat['HomeValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0
            Stat['AwayRatio'] = round(float(Stat['AwayValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0

            Stat['HomeRatio'] = 5 if Stat['HomeRatio'] == 0 else Stat['HomeRatio']
            Stat['AwayRatio'] = 5 if Stat['AwayRatio'] == 0 else Stat['AwayRatio']

            if 'Formatting' in Stat:
                if Stat['Formatting'] == 'Seconds':
                    Stat['HomeValue'] = SecondsToMinutes(Stat['HomeValue'])
                    Stat['AwayValue'] = SecondsToMinutes(Stat['AwayValue'])
                elif Stat['Formatting'] == 'Percentagexxx':
                    Stat['HomeRatio'] = str(Stat['HomeValue']) if Stat['HomeValue'] > 5 else str(5)
                    Stat['AwayRatio'] = str(Stat['AwayValue']) if Stat['AwayValue'] > 5 else str(5)
                    Stat['HomeValue'] = str(Stat['HomeValue']) + '%'
                    Stat['AwayValue'] = str(Stat['AwayValue']) + '%'
            #StatDict = {'StatName': Stat, 'HomeValue': HomeValue, 'AwayValue': AwayValue, 'HomeRatio': HomeRatio, 'AwayRatio': AwayRatio}
            TeamStatBox.append(Stat)

        context['HomeTeamPlayers'] = list(PlayerTeamSeasonDepthChart.objects.filter(IsStarter = True).filter(PlayerTeamSeasonID__TeamSeasonID__teamgame = HomeTeamGameID).values(
            'DepthPosition', 'PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__playerteamseasonskill__OverallRating', 'PlayerTeamSeasonID__PlayerID__PlayerFaceJson'
        ).annotate(
            PlayerName = Concat(F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID__PlayerID'), output_field=CharField()),
            PlayerTeamColor = F('PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamColor_Primary_HEX')
        ).order_by('PositionID__PositionSortOrder', 'DepthPosition'))

        context['AwayTeamPlayers'] = list(PlayerTeamSeasonDepthChart.objects.filter(IsStarter = True).filter(PlayerTeamSeasonID__TeamSeasonID__teamgame = AwayTeamGameID).values(
            'DepthPosition', 'PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__playerteamseasonskill__OverallRating', 'PlayerTeamSeasonID__PlayerID__PlayerFaceJson'
        ).annotate(
            PlayerName = Concat(F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID__PlayerID'), output_field=CharField()),
            PlayerTeamColor = F('PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamColor_Primary_HEX')
        ).order_by('PositionID__PositionSortOrder', 'DepthPosition'))

        context['PlayerTalentComparison'] = []
        counter = 0
        for u in context['HomeTeamPlayers']:
            HomePlayer = u
            AwayPlayer = context['AwayTeamPlayers'][counter]

            ComparisonObj = {'Position': HomePlayer['PositionID__PositionAbbreviation'],'HomePlayer': HomePlayer, 'AwayPlayer': AwayPlayer}

            if HomePlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] > AwayPlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] * 1.08:
                ComparisonObj['AdvantageColor'] = HomePlayer['PlayerTeamColor']
                ComparisonObj['HomePlayer']['AdvantageIcon'] = '<i class="fas fa-angle-double-right"></i>'
            elif HomePlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] > AwayPlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] :
                ComparisonObj['AdvantageColor'] = HomePlayer['PlayerTeamColor']
                ComparisonObj['HomePlayer']['AdvantageIcon'] = '<i class="fas fa-angle-right"></i>'
            elif AwayPlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] > HomePlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] * 1.08:
                ComparisonObj['AdvantageColor'] = AwayPlayer['PlayerTeamColor']
                ComparisonObj['AwayPlayer']['AdvantageIcon'] = '<i class="fas fa-angle-double-left"></i>'
            elif AwayPlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] > HomePlayer['PlayerTeamSeasonID__playerteamseasonskill__OverallRating'] :
                ComparisonObj['AdvantageColor'] = AwayPlayer['PlayerTeamColor']
                ComparisonObj['AwayPlayer']['AdvantageIcon'] = '<i class="fas fa-angle-left"></i>'
            else:
                ComparisonObj['AdvantageColor'] = '777';
                ComparisonObj['HomePlayer']['AdvantageIcon'] = '<i class="fas fa-equals"></i>'
                ComparisonObj['AwayPlayer']['AdvantageIcon'] = '<i class="fas fa-equals"></i>'

            context['PlayerTalentComparison'].append(ComparisonObj)

            counter +=1

        GameDict['HomeTeamWinChance'] = 1.03 #* (((HomeTS.Points - HomeTS.PointsAllowed) * 100.0 / (HomeTS.Possessions + 1)) ** 5 + HomeTS.TeamOverallRating ** 3 )
        GameDict['AwayTeamWinChance'] = 1.00 #* (((AwayTS.Points - AwayTS.PointsAllowed) * 100.0 / (AwayTS.Possessions + 1)) ** 5 + AwayTS.TeamOverallRating ** 3 )

    context['ConferenceStandings'] = []
    TeamSeasonList = [u.TeamSeasonID for u in GameQuerySet.teamgame_set.all().select_related('TeamSeasonID__TeamID', 'TeamSeasonID__DivisionSeasonID__ConferenceSeasonID')]
    ConferenceSeasons = list(set([u.DivisionSeasonID.ConferenceSeasonID for u in TeamSeasonList]))

    for CS in ConferenceSeasons:
        CDict = {'ConferenceName': CS.ConferenceID.ConferenceName}
        CDict['Divisions'] = CS.ConferenceStandings(Small=True, HighlightedTeams=[T.TeamID.TeamName for T in TeamSeasonList], LeagueSeasonID = CurrentSeason, WeekID = GameWeek)
        context['ConferenceStandings'].append(CDict)

    UserTeam = GetUserTeam(WorldID)

    context['page'] = page
    context['userTeam'] = UserTeam
    context['TeamStatBox'] = TeamStatBox
    context['game'] = GameDict
    context['allTeams'] = allTeams
    context['CurrentWeek'] = CurrentWeek
    context['homeTeam'] =  HomeTeam
    context['awayTeam'] = AwayTeam
    context['boxScore'] = BoxScore
    context['homePlayers'] = HomePlayers
    context['awayPlayers'] = AwayPlayers
    context['BoxScoreStatGroupings'] = BoxScoreStatGroupings

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 5, AuditDescription = 'Page_Game')
    return render(request, 'HeadFootballCoach/Game.html', context)



def GET_RecruitingPlayers(request, WorldID):

    Columns = {}
    Orders = {}
    OrderList = []

    Filters = {}

    for u in request.GET:
        if 'order' in u:
            spl = u.replace(']', '').split('[')
            OrderIndex = int(spl[1])
            OrderAttr = spl[2]
            OrderAttrValue = request.GET[u]

            if OrderIndex not in Orders:
                Orders[OrderIndex] = {}
            Orders[OrderIndex][OrderAttr] = OrderAttrValue
        elif 'columns' in u:
            spl = u.replace(']', '').split('[')
            ColumnIndex = int(spl[1])
            ColumnAttr = spl[2]
            ColumnAttrValue = request.GET[u]

            if ColumnIndex not in Columns:
                Columns[ColumnIndex] = {}
            Columns[ColumnIndex][ColumnAttr] = ColumnAttrValue

            if ColumnAttr == 'search' and spl[3] == 'value':
                Columns[ColumnIndex]['SearchValue'] = request.GET[u]


    for ColumnIndex in Columns:
        if len(Columns[ColumnIndex]['SearchValue']) > 1:
            ColName = Columns[ColumnIndex]['data']
            Filters[ColName] = Columns[ColumnIndex]['SearchValue']

    for OrderIndex in sorted(Orders):
        if 'column' not in Orders[OrderIndex]:
            continue
        OrderColumnIndex = int(Orders[OrderIndex]['column'])
        OrderColumnName = Columns[OrderColumnIndex]['data']
        OrderDirection = Orders[OrderIndex]['dir']
        OrderDirectionSign = '-' if OrderDirection == 'desc' else ''

        OrderColumnName = OrderDirectionSign + OrderColumnName

        OrderList.append(OrderColumnName)
    OrderList.append('Recruiting_NationalRank')

    AdjustedFilterList = {}
    for Fil in Filters:
        if '<' in Filters[Fil]:
            vals = Filters[Fil].split('<')
            AdjustedFilterList[Fil+'__gte'] = int(vals[0])
            AdjustedFilterList[Fil+'__lte'] = int(vals[1])
        else:
            AdjustedFilterList[Fil] = Filters[Fil]

    Start = int(request.GET['start'])
    Length = int(request.GET['length'])
    Draw = int(request.GET['draw'])

    Players = Player.objects.filter(WorldID = WorldID).filter(**AdjustedFilterList).filter(IsRecruit = True).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = 1).filter(playerteamseason__recruitteamseason__TeamSeasonID__TeamID__IsUserTeam = True).values('PlayerID','playerteamseason__ClassID__ClassAbbreviation', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'playerteamseason__recruitteamseason__Scouted_Overall', 'playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'RecruitingPointsNeeded', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'PlayerFaceJson', 'RecruitingStars', 'RecruitSigned', 'Recruiting_NationalRank', 'Recruiting_NationalPositionalRank', 'Recruiting_StateRank', 'CityID__CityName', 'CityID__StateID__StateAbbreviation', 'Height').annotate(
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        HeightFeet = (F('Height') / 12),
        HeightInches = (F('Height') % 12),
        HeightFormatted = Concat('HeightFeet', Value('\''), 'HeightInches', Value('"'), output_field=CharField()),
        WeightFormatted = Concat(F('Weight'), Value(' lbs'), output_field=CharField()),
        Intelligence = Value('A', output_field=CharField()),
        Athleticism = Value('A', output_field=CharField()),
        Passing = Value('A', output_field=CharField()),
        MaxInterestLevel = Subquery(RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID =OuterRef('pk')).values('PlayerTeamSeasonID__PlayerID').annotate(MaxInterestLevel=Max('InterestLevel')).values('MaxInterestLevel')),#Max('recruitteamseason__InterestLevel'),
        RecruitingPointsPercent = (Round(F('MaxInterestLevel')* 100.0 / F('RecruitingPointsNeeded'),1))

    ).order_by(*OrderList)

    recordsTotal = Players.count()
    recordsFiltered = recordsTotal

    Players = Players[Start:Start+Length]

    for P in Players:
        SignedTeam = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID_id = P['PlayerID']).values('TeamSeasonID__TeamID__TeamLogoURL', 'InterestLevel', 'Signed', 'PlayerTeamSeasonID__PlayerID').annotate(
            TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
        ).order_by('-Signed', '-InterestLevel')[0:3]

        P['RecruitingTeams'] = []
        for T in SignedTeam:
            P['RecruitingTeams'].append(T)

        if len(P['PlayerFaceJson']) == 0:
            PlayerObj = Player.objects.get(WorldID=WorldID, PlayerID=P['PlayerID'])
            PlayerObj.GeneratePlayerFaceJSon()
            PlayerObj.save()
            P['PlayerFaceJson'] = json.dumps(PlayerObj.PlayerFaceJson)


    context = {'data':list(Players)
             , "draw": Draw
             ,"recordsTotal": recordsTotal
             ,"recordsFiltered": recordsFiltered
        }
    return JsonResponse(context, safe=False)


def GET_PlayerCardInfo(request, WorldID, PlayerID, SeasonStartYear = None):

    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    OverallRange = [
        {'Floor': 93, 'Ceiling': 100, 'Css-Class': 'elite'},
        {'Floor': 82, 'Ceiling': 92, 'Css-Class': 'good'},
        {'Floor': 70, 'Ceiling': 81, 'Css-Class': 'fine'},
        {'Floor': 0, 'Ceiling': 69, 'Css-Class': 'bad'},
    ]

    SkillSetRatingMap = {
         'Physical': {'Agility': 'Agility_Rating', 'Speed': 'Speed_Rating', 'Acceleration': 'Acceleration_Rating', 'Strength': 'Strength_Rating', 'Jumping': 'Jumping_Rating'},
         'Passing': {'Throw Power': 'ThrowPower_Rating', 'Throw Accuracy (S)': 'ShortThrowAccuracy_Rating', 'Throw Accuracy (M)': 'MediumThrowAccuracy_Rating', 'Throw Accuracy (D)': 'DeepThrowAccuracy_Rating', 'Throw on Run': 'ThrowOnRun_Rating', 'Throw Under Pressure': 'ThrowUnderPressure_Rating', 'Play Action': 'PlayAction_Rating'},
         'Running': {'Carrying': 'Carrying_Rating', 'Elusiveness': 'Elusiveness_Rating', 'Ball Carrier Vision': 'BallCarrierVision_Rating', 'Break Tackle': 'BreakTackle_Rating'},
         'Receiving': { 'Catching': 'Catching_Rating', 'Catch In Traffic': 'CatchInTraffic_Rating', 'Route Running': 'RouteRunning_Rating', 'Release': 'Release_Rating'},
         'Blocking': {'Pass Block':'PassBlock_Rating', 'Run Block': 'RunBlock_Rating', 'Impact Block': 'ImpactBlock_Rating'},
         'Defense': {'Pass Rush':'PassRush_Rating', 'Block Shedding': 'BlockShedding_Rating','Tackle': 'Tackle_Rating','Hit Power': 'HitPower_Rating', 'Man Coverage': 'ManCoverage_Rating', 'Zone Coverage': 'ZoneCoverage_Rating', 'Press': 'Press_Rating',},
         'Kicking': {'Kick Power': 'KickPower_Rating','Kick Accuracy':  'KickAccuracy_Rating'},
    }

    PositionSkillSetMap={'QB': ['Physical', 'Passing', 'Running'],
                         'RB': ['Physical', 'Running'],
                         'FB': ['Physical', 'Running', 'Blocking'],
                         'WR': ['Physical', 'Receiving'],
                         'TE': ['Physical', 'Receiving', 'Blocking'],
                         'OT': ['Physical', 'Blocking'],
                         'OG': ['Physical', 'Blocking'],
                         'OC': ['Physical', 'Blocking'],
                         'DE': ['Physical', 'Defense'],
                         'DT': ['Physical', 'Defense'],
                         'MLB': ['Physical', 'Defense'],
                         'OLB': ['Physical', 'Defense'],
                         'CB': ['Physical', 'Defense'],
                         'S': ['Physical', 'Defense'],
                         'K': ['Kicking'],
                         'P': ['Kicking'],
    }

    if SeasonStartYear is None:
        Filter = {'playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent': True}
    else:
        Filter = {'playerteamseason__TeamSeasonID__LeagueSeasonID__SeasonStartYear': SeasonStartYear}

    P = Player.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).filter(**Filter)\
        .values('PlayerID', 'playerteamseason__ClassID__ClassAbbreviation','playerteamseason__ClassID__ClassName', 'PlayerFirstName','PlayerLastName', 'PositionID__PositionAbbreviation', 'PositionID__PositionName' , 'WasPreviouslyRedshirted', 'playerteamseason__RedshirtedThisSeason', 'playerteamseason__TeamCaptain', 'JerseyNumber', 'PlayerFaceJson', 'playerteamseason__TeamSeasonID__TeamID__TeamName', 'playerteamseason__TeamSeasonID__TeamID_id', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert','playerteamseason__TeamSeasonID__TeamID__TeamJerseyStyle','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX', 'playerteamseason__playerteamseasonskill__OverallRating', 'playerteamseason__playerteamseasonskill__Strength_Rating','playerteamseason__playerteamseasonskill__Agility_Rating','playerteamseason__playerteamseasonskill__Speed_Rating','playerteamseason__playerteamseasonskill__Acceleration_Rating','playerteamseason__playerteamseasonskill__Stamina_Rating','playerteamseason__playerteamseasonskill__Awareness_Rating','playerteamseason__playerteamseasonskill__Jumping_Rating','playerteamseason__playerteamseasonskill__ThrowPower_Rating'    ,'playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowOnRun_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating'    ,'playerteamseason__playerteamseasonskill__PlayAction_Rating', 'playerteamseason__playerteamseasonskill__PassRush_Rating', 'playerteamseason__playerteamseasonskill__BlockShedding_Rating', 'playerteamseason__playerteamseasonskill__Tackle_Rating', 'playerteamseason__playerteamseasonskill__HitPower_Rating', 'playerteamseason__playerteamseasonskill__ManCoverage_Rating', 'playerteamseason__playerteamseasonskill__ZoneCoverage_Rating', 'playerteamseason__playerteamseasonskill__Press_Rating', 'playerteamseason__playerteamseasonskill__Carrying_Rating', 'playerteamseason__playerteamseasonskill__Elusiveness_Rating', 'playerteamseason__playerteamseasonskill__BallCarrierVision_Rating', 'playerteamseason__playerteamseasonskill__BreakTackle_Rating', 'playerteamseason__playerteamseasonskill__Catching_Rating', 'playerteamseason__playerteamseasonskill__CatchInTraffic_Rating', 'playerteamseason__playerteamseasonskill__RouteRunning_Rating', 'playerteamseason__playerteamseasonskill__Release_Rating', 'playerteamseason__playerteamseasonskill__PassBlock_Rating', 'playerteamseason__playerteamseasonskill__RunBlock_Rating', 'playerteamseason__playerteamseasonskill__ImpactBlock_Rating', 'playerteamseason__playerteamseasonskill__KickPower_Rating', 'playerteamseason__playerteamseasonskill__KickAccuracy_Rating', 'playerteamseason__TeamSeasonID__TeamID__IsUserTeam' )\
        .annotate(
            PlayerTeamHref = Concat(Value('/World/'),Value(WorldID),Value('/Team/'),F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            Position = F('PositionID__PositionAbbreviation'),
            HometownAndState = Concat(F('CityID__CityName'), Value(', '), F('CityID__StateID__StateAbbreviation'), output_field=CharField()),
            HeightFeet = (F('Height') / 12),
            HeightInches = (F('Height') % 12),
            HeightFormatted = Concat(F('HeightFeet'), Value('\''), F('HeightInches'), Value('"'), output_field=CharField()),
            WeightFormatted = Concat(F('Weight'), Value(' lbs'), output_field=CharField()),
            TeamCaptain = Case(
                When(playerteamseason__TeamCaptain = True, then=Value('Team Captain')),
                default = Value(''),
                output_field=CharField()
            ),
            TeamCaptainIcon = Case(
                When(playerteamseason__TeamCaptain = True, then=Value('<i class="fas fa-crown w3-text-green"></i>')),
                default = Value(''),
                output_field=CharField()
            ),
            RedshirtIcon = Case(
                When(playerteamseason__RedshirtedThisSeason = True, then=Value('<i class="fas fa-tshirt player-class-icon" style="color: red; margin-left: 4px;"></i>')),
                default = Value(''),
                output_field=CharField()
            )

        ).first()



    PhysicalSkills = {
        'Strength': P['playerteamseason__playerteamseasonskill__Strength_Rating'],
        'Speed': P['playerteamseason__playerteamseasonskill__Speed_Rating'],
        'Agility': P['playerteamseason__playerteamseasonskill__Agility_Rating'],
        'Jumping': P['playerteamseason__playerteamseasonskill__Jumping_Rating'],
        'Acceleration': P['playerteamseason__playerteamseasonskill__Acceleration_Rating'],
        'Awareness': P['playerteamseason__playerteamseasonskill__Awareness_Rating'],
    }

    P['Awards'] = {}
    Awards = PlayerTeamSeasonAward.objects.filter(WorldID=WorldID).filter(PlayerTeamSeasonID__PlayerID=PlayerID).select_related('ConferenceID')
    for Award in Awards:
        A = ''

        if Award.IsPreseasonAward:
            if not Award.IsIndividualAward :
                A = 'Preseason '
                if Award.IsFirstTeam:
                    A += ' first team '
                elif Award.IsSecondTeam:
                    A += ' second team '
                else:
                    A += ' freshman team '

                if Award.IsNationalAward:
                    A += 'All-American'
                else:
                    A += Award.ConferenceID.ConferenceAbbreviation


        elif Award.IsWeekAward:
            if Award.IsNationalAward:
                A = 'National POTW'
            else:
                A = Award.ConferenceID.ConferenceAbbreviation + ' POTW'

        elif Award.IsSeasonAward:
            if not Award.IsTopPlayer :
                A = ''
                if Award.IsFirstTeam:
                    A += 'First team '
                elif Award.IsSecondTeam:
                    A += 'Second team '
                else:
                    A += 'Freshman team '

                if Award.IsNationalAward:
                    A += 'All-American'
                else:
                    A += Award.ConferenceID.ConferenceAbbreviation
            else:
                if Award.IsNationalAward:
                    A = 'Heisman Winner'
                else:
                    A = Award.ConferenceID.ConferenceAbbreviation + ' MVP'


        if A not in P['Awards']:
            P['Awards'][A] = 0
        P['Awards'][A] +=1


    P['Skills'] = {}
    SkillSets = PositionSkillSetMap[P['PositionID__PositionAbbreviation']]
    for SkillSet in SkillSets:

        P['Skills'][SkillSet] = {}
        for Skill in SkillSetRatingMap[SkillSet]:

            P['Skills'][SkillSet][Skill] = P['playerteamseason__playerteamseasonskill__'+SkillSetRatingMap[SkillSet][Skill]]

    P['Stats'] = {
        'Passing': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            YRD=Sum('playergamestat__PAS_Yards'),
            PC=Case(
                When(YRD=0, then=0.0),
                default=(Round(Sum('playergamestat__PAS_Completions')* 100.0 / Sum('playergamestat__PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            TD=Sum('playergamestat__PAS_TD'),
            INT=Sum('playergamestat__PAS_INT'),
        ).filter(YRD__gt = 0)),
        'Rushing': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            CAR=Sum('playergamestat__RUS_Carries'),
            YRD=Sum('playergamestat__RUS_Yards'),
            YPC=Case(
                When(CAR=0, then=0.0),
                default=(Round(F('YRD')* 1.0 / F('CAR'),1)),
                output_field=FloatField()
            ),
            TD=Sum('playergamestat__RUS_TD'),
        ).filter(CAR__gt = 0)),
        'Receiving': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            REC=Sum('playergamestat__REC_Receptions'),
            YRD=Sum('playergamestat__REC_Yards'),
            TD=Sum('playergamestat__REC_TD'),
        ).filter(REC__gt = 0)),
        'Blocking': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            Pancakes=Sum('playergamestat__BLK_Pancakes'),
        ).filter(Pancakes__gt=0)),
        'Defense': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            TCK=Sum('playergamestat__DEF_Tackles'),
            Sacks=Sum('playergamestat__DEF_Sacks'),
            INTs=Sum('playergamestat__DEF_INT'),
            TFL=Sum('playergamestat__DEF_TacklesForLoss'),
        ).filter(Q(TCK__gt = 0) | Q(INTs__gt = 0))),
        'Kicking': list(PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassAbbreviation', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
            Season=Concat(F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value(' - '), F('ClassID__ClassAbbreviation'), output_field=CharField()),
            GP=Sum('playergamestat__GamesPlayed'),
            FGM=Sum('playergamestat__KCK_FGM')
        ).filter(FGM__gt = 0)),}

    P['Stats'] = { u: P['Stats'][u]  for u in P['Stats'] if len(P['Stats'][u]) > 0}
    for StatGroup in P['Stats']:
        for Y in P['Stats'][StatGroup]:
            del Y['ClassID__ClassAbbreviation']
            del Y['TeamSeasonID__LeagueSeasonID__SeasonStartYear']


    if len(P['PlayerFaceJson']) == 0:
        PlayerObj = Player.objects.get(WorldID=WorldID, PlayerID=PlayerID)
        PlayerObj.GeneratePlayerFaceJSon()
        P['PlayerFaceJson'] = PlayerObj.PlayerFaceJson
    else:
        P['PlayerFaceJson'] = json.loads(P['PlayerFaceJson'].replace("'", '"'))

    P['OverallCss'] = FindRange(OverallRange, P['playerteamseason__playerteamseasonskill__OverallRating'])['Css-Class']

    P['Actions'] = []
    if P['playerteamseason__TeamSeasonID__TeamID__IsUserTeam']:
        CurrentWeek = CurrentWorld.week_set.filter(IsCurrent = True).select_related('PhaseID').first()
        if CurrentWeek.PhaseID.PhaseName == 'Preseason':
            if not P['WasPreviouslyRedshirted']:
                if not P['playerteamseason__RedshirtedThisSeason']:
                    P['Actions'].append({'Display': 'Redshirt player', 'ConfirmInfo': P['PlayerName'],'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Add', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-tshirt w3-text-red"></i></span>'})
                else:
                    P['Actions'].append({'Display': 'Remove Redshirt', 'ConfirmInfo': P['PlayerName'],'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Remove', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-stack-2x fa-inverse fa-tshirt w3-text-red"></i></span>'})

            if not P['playerteamseason__TeamCaptain']:
                P['Actions'].append({'Display': 'Add as captain', 'ConfirmInfo': P['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Add', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-crown w3-text-green"></i></span>'})
            else:
                P['Actions'].append({'Display': 'Remove as captain', 'ConfirmInfo': P['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Remove', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-crown w3-text-green"></i></span>'})

            P['Actions'].append({'Display': 'Cut from team', 'ConfirmInfo': P['PlayerName'], 'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCut', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-cut"></i></span>'})


    context = P

    return JsonResponse(context, safe=False)



def GET_RecruitCardInfo(request, WorldID, PlayerID):

    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    OverallRange = [
        {'Floor': 93, 'Ceiling': 100, 'Css-Class': 'elite'},
        {'Floor': 82, 'Ceiling': 92, 'Css-Class': 'good'},
        {'Floor': 70, 'Ceiling': 81, 'Css-Class': 'fine'},
        {'Floor': 0, 'Ceiling': 69, 'Css-Class': 'bad'},
    ]

    SkillSetRatingMap = {
         'Physical': {'Agility': 'Agility_Rating', 'Speed': 'Speed_Rating', 'Acceleration': 'Acceleration_Rating', 'Strength': 'Strength_Rating', 'Jumping': 'Jumping_Rating'},
         'Passing': {'Throw Power': 'ThrowPower_Rating', 'Throw Accuracy (S)': 'ShortThrowAccuracy_Rating', 'Throw Accuracy (M)': 'MediumThrowAccuracy_Rating', 'Throw Accuracy (D)': 'DeepThrowAccuracy_Rating', 'Throw on Run': 'ThrowOnRun_Rating', 'Throw Under Pressure': 'ThrowUnderPressure_Rating', 'Play Action': 'PlayAction_Rating'},
         'Running': {'Carrying': 'Carrying_Rating', 'Elusiveness': 'Elusiveness_Rating', 'Ball Carrier Vision': 'BallCarrierVision_Rating', 'Break Tackle': 'BreakTackle_Rating'},
         'Receiving': { 'Catching': 'Catching_Rating', 'Catch In Traffic': 'CatchInTraffic_Rating', 'Route Running': 'RouteRunning_Rating', 'Release': 'Release_Rating'},
         'Blocking': {'Pass Block':'PassBlock_Rating', 'Run Block': 'RunBlock_Rating', 'Impact Block': 'ImpactBlock_Rating'},
         'Defense': {'Pass Rush':'PassRush_Rating', 'Block Shedding': 'BlockShedding_Rating','Tackle': 'Tackle_Rating','Hit Power': 'HitPower_Rating', 'Man Coverage': 'ManCoverage_Rating', 'Zone Coverage': 'ZoneCoverage_Rating', 'Press': 'Press_Rating',},
         'Kicking': {'Kick Power': 'KickPower_Rating','Kick Accuracy':  'KickAccuracy_Rating'},
    }

    PositionSkillSetMap={'QB': ['Physical', 'Passing', 'Running'],
                         'RB': ['Physical', 'Running'],
                         'FB': ['Physical', 'Running', 'Blocking'],
                         'WR': ['Physical', 'Receiving'],
                         'TE': ['Physical', 'Receiving', 'Blocking'],
                         'OT': ['Physical', 'Blocking'],
                         'OG': ['Physical', 'Blocking'],
                         'OC': ['Physical', 'Blocking'],
                         'DE': ['Physical', 'Defense'],
                         'DT': ['Physical', 'Defense'],
                         'MLB': ['Physical', 'Defense'],
                         'OLB': ['Physical', 'Defense'],
                         'CB': ['Physical', 'Defense'],
                         'S': ['Physical', 'Defense'],
                         'K': ['Kicking'],
                         'P': ['Kicking'],
    }

    P = Player.objects.filter(WorldID=WorldID).filter(PlayerID=PlayerID).filter(playerteamseason__recruitteamseason__TeamSeasonID__TeamID__IsUserTeam = True)\
        .values('PlayerID', 'playerteamseason__ClassID__ClassAbbreviation','playerteamseason__ClassID__ClassName', 'PlayerFirstName','PlayerLastName', 'PositionID__PositionAbbreviation', 'PositionID__PositionName' , 'WasPreviouslyRedshirted', 'playerteamseason__recruitteamseason__IsActivelyRecruiting', 'playerteamseason__RedshirtedThisSeason', 'playerteamseason__TeamCaptain', 'JerseyNumber', 'PlayerFaceJson', 'playerteamseason__TeamSeasonID__TeamID__TeamName', 'playerteamseason__TeamSeasonID__TeamID_id', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert','playerteamseason__TeamSeasonID__TeamID__TeamJerseyStyle','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX', 'playerteamseason__recruitteamseason__Scouted_Overall', 'playerteamseason__recruitteamseason__Scouted_Strength_Rating','playerteamseason__recruitteamseason__Scouted_Agility_Rating','playerteamseason__recruitteamseason__Scouted_Speed_Rating','playerteamseason__recruitteamseason__Scouted_Acceleration_Rating','playerteamseason__recruitteamseason__Scouted_Stamina_Rating','playerteamseason__recruitteamseason__Scouted_Awareness_Rating','playerteamseason__recruitteamseason__Scouted_Jumping_Rating','playerteamseason__recruitteamseason__Scouted_ThrowPower_Rating'    ,'playerteamseason__recruitteamseason__Scouted_ShortThrowAccuracy_Rating'    ,'playerteamseason__recruitteamseason__Scouted_MediumThrowAccuracy_Rating'    ,'playerteamseason__recruitteamseason__Scouted_DeepThrowAccuracy_Rating'    ,'playerteamseason__recruitteamseason__Scouted_ThrowOnRun_Rating'    ,'playerteamseason__recruitteamseason__Scouted_ThrowUnderPressure_Rating'    ,'playerteamseason__recruitteamseason__Scouted_PlayAction_Rating', 'playerteamseason__recruitteamseason__Scouted_PassRush_Rating', 'playerteamseason__recruitteamseason__Scouted_BlockShedding_Rating', 'playerteamseason__recruitteamseason__Scouted_Tackle_Rating', 'playerteamseason__recruitteamseason__Scouted_HitPower_Rating', 'playerteamseason__recruitteamseason__Scouted_ManCoverage_Rating', 'playerteamseason__recruitteamseason__Scouted_ZoneCoverage_Rating', 'playerteamseason__recruitteamseason__Scouted_Press_Rating', 'playerteamseason__recruitteamseason__Scouted_Carrying_Rating', 'playerteamseason__recruitteamseason__Scouted_Elusiveness_Rating', 'playerteamseason__recruitteamseason__Scouted_BallCarrierVision_Rating', 'playerteamseason__recruitteamseason__Scouted_BreakTackle_Rating', 'playerteamseason__recruitteamseason__Scouted_Catching_Rating', 'playerteamseason__recruitteamseason__Scouted_CatchInTraffic_Rating', 'playerteamseason__recruitteamseason__Scouted_RouteRunning_Rating', 'playerteamseason__recruitteamseason__Scouted_Release_Rating', 'playerteamseason__recruitteamseason__ScoutingFuzz', 'playerteamseason__recruitteamseason__Scouted_PassBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_RunBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_ImpactBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_KickPower_Rating', 'playerteamseason__recruitteamseason__Scouted_KickAccuracy_Rating', 'playerteamseason__TeamSeasonID__TeamID__IsUserTeam' )\
        .annotate(
            PlayerTeamHref = Concat(Value('/World/'),Value(WorldID),Value('/Team/'),F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            Position = F('PositionID__PositionAbbreviation'),
            HometownAndState = Concat(F('CityID__CityName'), Value(', '), F('CityID__StateID__StateAbbreviation'), output_field=CharField()),
            HeightFeet = (F('Height') / 12),
            HeightInches = (F('Height') % 12),
            HeightFormatted = Concat(F('HeightFeet'), Value('\''), F('HeightInches'), Value('"'), output_field=CharField()),
            WeightFormatted = Concat(F('Weight'), Value(' lbs'), output_field=CharField()),
        ).first()



    PhysicalSkills = {
        'Strength': P['playerteamseason__recruitteamseason__Scouted_Strength_Rating'],
        'Speed': P['playerteamseason__recruitteamseason__Scouted_Speed_Rating'],
        'Agility': P['playerteamseason__recruitteamseason__Scouted_Agility_Rating'],
        'Jumping': P['playerteamseason__recruitteamseason__Scouted_Jumping_Rating'],
        'Acceleration': P['playerteamseason__recruitteamseason__Scouted_Acceleration_Rating'],
        'Awareness': P['playerteamseason__recruitteamseason__Scouted_Awareness_Rating'],
    }

    P['Skills'] = {}
    SkillSets = PositionSkillSetMap[P['PositionID__PositionAbbreviation']]
    for SkillSet in SkillSets:

        P['Skills'][SkillSet] = {}
        for Skill in SkillSetRatingMap[SkillSet]:

            P['Skills'][SkillSet][Skill] = P['playerteamseason__recruitteamseason__Scouted_'+SkillSetRatingMap[SkillSet][Skill]]



    if len(P['PlayerFaceJson']) == 0:
        PlayerObj = Player.objects.get(WorldID=WorldID, PlayerID=PlayerID)
        PlayerObj.GeneratePlayerFaceJSon()
        P['PlayerFaceJson'] = PlayerObj.PlayerFaceJson
    else:
        P['PlayerFaceJson'] = json.loads(P['PlayerFaceJson'].replace("'", '"'))

    P['OverallCss'] = FindRange(OverallRange, P['playerteamseason__recruitteamseason__Scouted_Overall'])['Css-Class']

    P['Actions'] = []
    if P['playerteamseason__recruitteamseason__ScoutingFuzz'] > 0:
        P['Actions'].append({'Display': 'Scout Player', 'ConfirmInfo': P['PlayerName'], 'Class': 'recruiting-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(P['PlayerID'])+'/ScoutRecruit/', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-binoculars w3-text-purple"></i></span>'})

    if P['playerteamseason__recruitteamseason__IsActivelyRecruiting']:
        P['Actions'].append({'Display': 'Remove from Board', 'ConfirmInfo': P['PlayerName'], 'Class': 'recruiting-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(P['PlayerID'])+'/PlayerRecruitingBoard/Remove', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-plus-square w3-text-orange"></i></span>'})
    else:
        P['Actions'].append({'Display': 'Add to Board', 'ConfirmInfo': P['PlayerName'], 'Class': 'recruiting-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(P['PlayerID'])+'/PlayerRecruitingBoard/Add', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-plus-square w3-text-orange"></i></span>'})

    context = P

    return JsonResponse(context, safe=False)



def GET_TeamInfoRating(request, WorldID, TeamID, Category):

    TeamInfoRatings = Team.objects.filter(WorldID = WorldID).values('TeamID', 'teamseason__TeamPrestige', 'TeamName', 'TeamNickname', 'TeamLogoURL',  'teamseason__FacilitiesRating', 'teamseason__ProPotentialRating', 'teamseason__CampusLifestyleRating', 'teamseason__AcademicPrestigeRating', 'teamseason__TelevisionExposureRating', 'teamseason__CoachStabilityRating', 'teamseason__ChampionshipContenderRating', 'teamseason__LocationRating').annotate(
        TeamHref= Concat( Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID') , output_field=CharField()),
        TeamPrestige_Rank=Window(
            expression=Rank(),
            order_by=F("teamseason__TeamPrestige").desc(),
            ),
        FacilitiesRating_Rank=Window(
            expression=Rank(),
            order_by=F("teamseason__FacilitiesRating").desc(),
            ),
        ProPotentialRating_Rank=Window(
            expression=Rank(),
            order_by=F("teamseason__ProPotentialRating").desc(),
            ),
         CampusLifestyleRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__CampusLifestyleRating").desc(),
        ),
        AcademicPrestigeRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__AcademicPrestigeRating").desc(),
             ),
        TelevisionExposureRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__TelevisionExposureRating").desc(),
             ),
        CoachStabilityRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__CoachStabilityRating").desc(),
             ),
        ChampionshipContenderRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__ChampionshipContenderRating").desc(),
             ),
        LocationRating_Rank=Window(
             expression=Rank(),
             order_by=F("teamseason__LocationRating").desc(),
         ),
    )


    TopTeams = list(TeamInfoRatings.order_by('-teamseason__'+Category)[:5])
    BottomTeams = list(TeamInfoRatings.order_by('teamseason__'+Category)[:5])

    TeamInfo = {'TopTeams': TopTeams, 'BottomTeams': BottomTeams}

    context = TeamInfo
    return JsonResponse(context, safe=False)




def GET_TeamCardInfo(request, WorldID, TeamID):

    TeamInfo = Team.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).values('TeamName', 'TeamNickname', 'TeamColor_Primary_HEX', 'TeamColor_Secondary_HEX', 'TeamLogoURL').annotate(
        CityAndState = Concat(F('CityID__CityName'), Value(', '), F('CityID__StateID__StateName'), output_field=CharField()),
    ).first()

    TeamRanks = TeamSeason.objects.filter(WorldID_id = WorldID).filter(teamseasonweekrank__IsCurrent = True).filter(LeagueSeasonID__IsCurrent=True).values('DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceName', 'TeamID', 'TeamOverallRating_Grade', 'TeamOffenseRating_Grade', 'TeamDefenseRating_Grade').annotate(
        GamesPlayed = Sum('teamgame__GamesPlayed'),
        Points = Sum('teamgame__Points'),
        OpponentPoints = Sum('teamgame__OpposingTeamGameID__Points'),
        PPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('Points')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),
        PAPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('OpponentPoints')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),

        PassYards = Sum('teamgame__PAS_Yards'),
        RushYards = Sum('teamgame__RUS_Yards'),
        OpponentPassYards = Sum('teamgame__OpposingTeamGameID__PAS_Yards'),
        OpponentRushYards = Sum('teamgame__OpposingTeamGameID__RUS_Yards'),
        PassYPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('PassYards')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),
        RushYPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('RushYards')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),
        OpponentPassYPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('OpponentPassYards')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),
        OpponentRushYPG = Case(
            When(GamesPlayed = 0, then=Value(0.0)),
            default=Round( F('OpponentRushYards')*1.0 / F('GamesPlayed'),1),
            output_field=FloatField()
        ),
        PPG_Rank = Window(
            expression=RowNumber(),
            order_by=F("PPG").desc(),
        ),
        PAPG_Rank = Window(
            expression=RowNumber(),
            order_by=F("PAPG").asc(),
        ),
        NationalRankDisplay =  Case(
            When(teamseasonweekrank__NationalRank__gt = 25, then=Value('')),
            default=(Concat(Value('(') , F('teamseasonweekrank__NationalRank'), Value(')'), output_field=CharField())),
            output_field = CharField()
        ),
        )

    TeamRanks = [u for u in TeamRanks if u['TeamID'] == TeamID]

    for Attr in TeamRanks[0]:
        TeamInfo[Attr] = TeamRanks[0][Attr]

    context = TeamInfo
    return JsonResponse(context, safe=False)

def GET_TeamHistory(request, WorldID, TeamID):

    T = Team.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).first()
    TeamSeasonHistory = TeamSeason.objects.filter(WorldID = WorldID).filter(LeagueSeasonID__ScheduleCreated = True).filter(TeamID = TeamID).order_by('LeagueSeasonID').values('TeamSeasonID', 'DivisionRank', 'LeagueSeasonID__SeasonStartYear', 'Wins', 'Losses', 'ConferenceWins', 'ConferenceLosses', 'RecruitingClassRank').annotate(
        TeamRecord = Concat(F('Wins'), Value('-'), F('Losses'), output_field=CharField()),
        TeamConferenceRecord = Concat(F('ConferenceWins'), Value('-'), F('ConferenceLosses'), output_field=CharField()),
        SeasonYear = F('LeagueSeasonID__SeasonStartYear'),
        SeasonRecapLink = Concat(Value('/World/'), Value(WorldID), Value('/Season/'), F('LeagueSeasonID__SeasonStartYear'), output_field=CharField()),
    )

    TeamSeasonHistory = list(TeamSeasonHistory)
    for TSH in TeamSeasonHistory:
        TS = T.teamseason_set.filter(TeamSeasonID = TSH['TeamSeasonID']).filter(LeagueSeasonID__IsCurrent = True).first()
        FinalTSWR = TS.teamseasonweekrank_set.order_by('-WeekID').first()
        TSH['FinalRank'] = FinalTSWR.NationalRank


        BowlTG = TS.teamgame_set.filter(GameID__BowlID__isnull = False).first()
        if BowlTG is not None:
            OpponentTG = BowlTG.OpposingTeamGame
            BowlG = BowlTG.GameID

            s = ''
            if BowlG.WasPlayed:
                if BowlTG.IsWinningTeam:
                    s += 'W '
                    TSH['BowlResult'] = 'W'
                else:
                    s += 'L '
                    TSH['BowlResult'] = 'L'

                TSH['BowlScore'] = BowlG.GameDisplay
                TSH['BowlHref'] = '/World/' + str(WorldID) + '/Game/' + str(BowlG.GameID)
                TSH['BowlOpponent'] = OpponentTG.TeamSeasonID.TeamID.TeamName
                TSH['BowlOpponentHref'] = '/World/' + str(WorldID) + '/Team/' + str(OpponentTG.TeamSeasonID.TeamID_id)
                TSH['BowlName'] = BowlG.BowlID.BowlName
                TSH['String_BowlVs'] = ' vs '
                TSH['String_BowlIn'] = ' in '
        elif TS.LeagueSeasonID.IsCurrent and TS.LeagueSeasonID.phase_set.filter(week__IsCurrent = True).first().PhaseName in ['Preseason', 'Regular Season', 'Conference Championships']:
            TSH['String_BowlIn'] = '-'
        else:
            TSH['String_BowlIn'] = 'Did not make bowl'



    context = {'status':'success', 'WorldID': WorldID}

    #context['TeamHistory'] = TeamHistory
    context['TeamSeasonHistory'] = TeamSeasonHistory

    return JsonResponse(context, safe=False)



def GET_PlayerPositions(request):
    PlayerPositions = list(Position.objects.all().values_list('PositionAbbreviation', flat=True).order_by('PositionSortOrder'))
    return JsonResponse(PlayerPositions, safe=False)

def GET_Classes(request):
    Classes = list(Class.objects.filter(IsRecruit = False).values_list('ClassAbbreviation', flat=True).order_by('ClassSortOrder'))
    return JsonResponse(Classes, safe=False)

def GET_Conferences(request, WorldID):
    Conferences = list(Conference.objects.filter(WorldID_id = WorldID).values_list('ConferenceAbbreviation', flat=True).order_by('ConferenceAbbreviation'))
    return JsonResponse(Conferences, safe=False)


def GET_Teams(request, WorldID):
    Teams = []
    return JsonResponse(Teams, safe=False)

def GET_TeamHistoricalLeaders(request, WorldID, TeamID, Timeframe='Season'):

    print('Getting team hist leaders', Timeframe)


    context = {'status':'success', 'WorldID': WorldID}
    context['HistoricalLeaders'] = HistoricalLeaders

    return JsonResponse(context, safe=False)



def GET_LeagueLeaders(request, WorldID):

    CurrentWorld = World.objects.filter(WorldID = WorldID).first()

    #HistoricalPlayersCareer = PlayerTeamSeason.objects
    Filters = {'TeamSeasonID__LeagueSeasonID__IsCurrent': True}
    LeagueLeaders = Common_PlayerRecords(CurrentWorld, Timeframe = 'Season', Filters=Filters, ListLength = 10)

    context = {'status':'success', 'WorldID': WorldID}

    context['LeagueLeaders'] = LeagueLeaders

    return JsonResponse(context, safe=False)



def GET_TeamRoster(request, WorldID, TeamID):
    context = {'status':'success', 'WorldID': WorldID}

    CurrentWorld = World.objects.get(WorldID = WorldID)
    TeamID = Team.objects.get(WorldID = CurrentWorld, TeamID = TeamID)
    CurrentTeamSeason = TeamID.CurrentTeamSeason

    CurrentPlayers = [u.TeamRosterDict() for u in PlayerTeamSeason.objects.filter(TeamSeasonID = CurrentTeamSeason)]
    context['Roster'] = CurrentPlayers

    return JsonResponse(context, safe=False)

def GET_TeamSchedule(request, WorldID, TeamID):
    context = {'status':'success', 'WorldID': WorldID}

    CurrentWorld = World.objects.get(WorldID = WorldID)
    ThisTeam = Team.objects.get(WorldID = CurrentWorld, TeamID = TeamID)
    CurrentTeamSeason = ThisTeam.CurrentTeamSeason
    CurrentSeason = CurrentTeamSeason.LeagueSeasonID

    GamesForThisTeam = TeamGame.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = CurrentTeamSeason).order_by('GameID__WeekID')


    GameFields = ['GameIDURL', 'GameDisplay', 'HomeTeamRank', 'AwayTeamRank', 'TopPlayerStats', 'GameHref']
    OpponentFields = ['TeamIDURL', 'TeamHref', 'TeamName', 'LogoURL', 'TeamColor_Primary_HEX']
    TeamGameFields = ['TeamRecordDisplay', 'ConferenceTeamRecordDisplay']
    WeekFields = ['WeekName']


    FutureGames = []
    PlayedGames = []
    for TG in GamesForThisTeam:
        G = TG.GameID
        WeekValues = GetValuesOfSingleObject(G.WeekID, WeekFields)
        GameValues = GetValuesOfSingleObject(G, GameFields)
        if ThisTeam == G.HomeTeamID:
            OpponentValues = GetValuesOfSingleObject(G.AwayTeamID, OpponentFields)
            OpponentTGValues = GetValuesOfSingleObject(G.AwayTeamGameID, TeamGameFields)
            TGValues = GetValuesOfSingleObject(G.HomeTeamGameID, TeamGameFields)
        else:
            OpponentValues = GetValuesOfSingleObject(G.HomeTeamID, OpponentFields)
            OpponentTGValues = GetValuesOfSingleObject(G.HomeTeamGameID, TeamGameFields)
            TGValues = GetValuesOfSingleObject(G.AwayTeamGameID, TeamGameFields)

        TGValues['ThisTeamRecord'] = TGValues['TeamRecordDisplay']
        TGValues['ThisConferenceTeamRecord'] = TGValues['ConferenceTeamRecordDisplay']
        del TGValues['TeamRecordDisplay']
        del TGValues['ConferenceTeamRecordDisplay']

        GameInfo = MergeDicts([GameValues, OpponentValues, OpponentTGValues, TGValues, WeekValues])

        if ThisTeam == G.HomeTeamID:
            GameInfo['AtOrVs'] = 'vs'
            GameInfo['OpponentRank'] = GameInfo['AwayTeamRank']
        else:
            GameInfo['AtOrVs'] = '@'
            GameInfo['OpponentRank'] = GameInfo['HomeTeamRank']


        if ThisTeam == G.WinningTeamID:
            GameInfo['GameResultLetter'] = 'W'
            GameInfo['GameResultLetterClass'] = 'teamGameResultLetterW'
            PlayedGames.append(GameInfo)
        elif ThisTeam == G.LosingTeamID:
            GameInfo['GameResultLetter'] = 'L'
            GameInfo['GameResultLetterClass'] = 'teamGameResultLetterL'
            PlayedGames.append(GameInfo)
        else:
            GameInfo['GameResultLetter'] = ''
            GameInfo['GameResultLetterClass'] = ''
            FutureGames.append(GameInfo)


    context['Games'] = {'PlayedGames': PlayedGames, 'FutureGames': FutureGames}
    context['TeamData'] = Team.objects.filter(WorldID = CurrentWorld).filter( TeamID = TeamID).values('TeamName', 'TeamNickname', 'TeamColor_Primary_HEX', 'TeamColor_Secondary_HEX', 'TeamLogoURL').first()

    context['TeamList'] = list(Team.objects.filter(WorldID_id = WorldID).values('TeamName', 'TeamNickname', 'TeamID', 'TeamColor_Primary_HEX', 'TeamLogoURL').annotate(
        TeamHref= Concat( Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID') , output_field=CharField())
    ).order_by('TeamName'))
    return JsonResponse(context, safe=False)

def GET_ConferenceStandings(request, WorldID, ConferenceID = None):
    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = False
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    ConferenceList = []
    if ConferenceID is not None:
        ConferenceID = Conference.objects.get(WorldID = CurrentWorld, ConferenceID = ConferenceID)
        ConferenceList.append(ConferenceID)
    else:
        ConferenceList = [u for u in Conference.objects.filter(WorldID = CurrentWorld)]

    ConferenceStandings = []
    TeamFields = ['TeamIDURL', 'LogoURL', 'TeamName']
    TeamSeasonFields = ['DivisionRank', 'NationalRankDisplay', 'WinsLosses','ConferenceWinsLosses', 'PPG', 'PAPG', 'PointDiffPG', 'ORTG']
    TeamHrefBase = '/World/' + str(WorldID) + '/Team/'

    for conf in ConferenceList:
        ThisConference = {'ConferenceName': conf.ConferenceName, 'ConferenceTeams': []}
        TeamsInConference = Team.objects.filter(WorldID = CurrentWorld).filter(teamseason__LeagueSeasonID__IsCurrent = True).filter(teamseason__teamseasonweekrank__IsCurrent = True).filter(ConferenceID = conf).values('TeamID', 'TeamLogoURL', 'TeamName', 'teamseason__DivisionRank', 'teamseason__teamseasonweekrank__NationalRank', 'teamseason__Wins', 'teamseason__ConferenceWins', 'teamseason__ConferenceLosses', 'teamseason__Losses').order_by('-teamseason__teamseasonweekrank__NationalRank').annotate(
            GamesPlayed = Sum('teamseason__teamgame__GamesPlayed'),
            PPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__teamgame__Points')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__teamseason_opposingteamgame__Points')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__teamgame__RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__teamgame__PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            MOV= Round(F('PPG') - F('PAPG'), 1),
            NationalRankDisplay =  Case(
                When(teamseason__teamseasonweekrank__NationalRank__gt = 25, then=Value('')),
                default=(Concat(Value('(') , F('teamseason__teamseasonweekrank__NationalRank'), Value(')'), output_field=CharField())),
                output_field = CharField()
            ),
            WinsLosses =  Concat( F('teamseason__Wins'), Value('-'), F('teamseason__Losses'), output_field=CharField()),
            ConferenceWinsLosses =  Concat( F('teamseason__ConferenceWins'), Value('-'), F('teamseason__ConferenceLosses'), output_field=CharField()),
            TeamHref= Concat( Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID') , output_field=CharField())
        )

        for t in TeamsInConference:
            ThisConference['ConferenceTeams'].append(t)

        ConferenceStandings.append(ThisConference)

    context['ConferenceStandings'] = ConferenceStandings
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription='GET_ConferenceStandings')

    return JsonResponse(context, safe=False)


def GET_AllTeamStats(request, WorldID):

    DoAudit = False
    if DoAudit:
        start = time.time()

    OrderList = []
    OrderList.append('teamseason__teamseasonweekrank__NationalRank')

    TeamsInWorld = Team.objects.filter(WorldID_id = WorldID).filter(teamseason__LeagueSeasonID__IsCurrent = True).filter(teamseason__teamseasonweekrank__IsCurrent = True).values('TeamID', 'TeamLogoURL', 'TeamColor_Primary_HEX', 'TeamName', 'ConferenceID', 'ConferenceID__ConferenceAbbreviation', 'teamseason__DivisionRank', 'teamseason__Wins', 'teamseason__ConferenceWins', 'teamseason__ConferenceLosses', 'teamseason__Losses', 'teamseason__teamseasonweekrank__NationalRank').order_by('-teamseason__teamseasonweekrank__NationalRank').annotate(
        GamesPlayed = Coalesce(Sum('teamseason__teamgame__GamesPlayed'),0),
        PPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__teamgame__Points')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        PAPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__teamseason_opposingteamgame__Points')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        RUS_YardsPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__teamgame__RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        PAS_YardsPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__teamgame__PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        MOV= Round(F('PPG') - F('PAPG'), 1),
        NationalRankDisplay =  Case(
            When(teamseason__teamseasonweekrank__NationalRank__gt = 25, then=Value('')),
            default=(Concat(Value('(') , F('teamseason__teamseasonweekrank__NationalRank'), Value(')'), output_field=CharField())),
            output_field = CharField()
        ),
        WinsLosses =  Concat( F('teamseason__Wins'), Value('-'), F('teamseason__Losses'), output_field=CharField()),
        ConferenceWinsLosses =  Concat( F('teamseason__ConferenceWins'), Value('-'), F('teamseason__ConferenceLosses'), output_field=CharField()),
        TeamHref= Concat( Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID') , output_field=CharField()),
        ConferenceHref= Concat( Value('/World/'), Value(WorldID), Value('/Conferece/'), F('ConferenceID') , output_field=CharField()),
        Possessions = Coalesce(Sum('teamseason__teamgame__Possessions') ,0),
        PAS_Attempts = Coalesce(Sum('teamseason__teamgame__PAS_Attempts'),0),
        PercentPassPlays = Case(
            When(PAS_Attempts=0, then=0.0),
            default=(Round((F('PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks'))* 100.0 / (F('PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks')+ Sum('teamseason__teamgame__RUS_Carries')),1)),
            output_field=FloatField()
        ),
        SacksAllowed = Coalesce(Sum('teamseason__teamgame__PAS_Sacks'),0),
        NumberOfDrives = Coalesce(Sum('teamseason__teamgame__Possessions'),0),
        PercentOfScoringDrives = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__PAS_TD') + Sum('teamseason__teamgame__RUS_TD') + Sum('teamseason__teamgame__KCK_FGM'))* 100.0 / (Sum('teamseason__teamgame__Possessions')),1)),
            output_field=FloatField()
        ),
        PointsPerDrive = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__Points'))* 1.0 / (F('Possessions')),1)),
            output_field=FloatField()
        ),
        PercentOfTurnoverDrives = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__Turnovers') + Sum('teamseason__teamgame__FourthDownConversion') - Sum('teamseason__teamgame__FourthDownAttempt') )* 100.0 / (F('Possessions')),1)),
            output_field=FloatField()
        ),
        TimeOfPossessionPerDriveSeconds = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__TimeOfPossession'))* (1.0 / 60.0) / (F('Possessions')),1)),
            output_field=FloatField()
        ),
        YardsPerDrive = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__RUS_Yards') + Sum('teamseason__teamgame__PAS_Yards'))* (1.0) / (F('Possessions')),1)),
            output_field=FloatField()
        ),
        PlaysPerDrive = Case(
            When(Possessions=0, then=0.0),
            default=(Round((Sum('teamseason__teamgame__PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks') + Sum('teamseason__teamgame__RUS_Carries'))* (1.0) / (F('Possessions')),1)),
            output_field=FloatField()
        ),
        SecondsPerPlay = Case(
            When(Possessions=0, then=0.0),
            default=(Round(Sum('teamseason__teamgame__TimeOfPossession')* (1.0) / (Sum('teamseason__teamgame__PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks') + Sum('teamseason__teamgame__RUS_Carries')),1)),
            output_field=FloatField()
        )

    ).order_by(*OrderList)


    context = {'data':list(TeamsInWorld)
        }

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='GET_TeamStats')

    return JsonResponse(context, safe=False)


def GET_AwardRaces(request, WorldID):
    context = {'status':'success', 'WorldID': WorldID}

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)

    PlayerFields = ['PlayerID', 'FullName', 'OverallRating', 'PlayerIDURL', 'Position']
    PlayerCurrentTeamFields = ['TeamName', 'TeamID', 'ConferenceName', 'TeamLogoURL', 'TeamIDURL']
    PlayerTeamSeasonFields = ['PPG', 'APG', 'RPG', 'PER', 'WinShares', 'AwardShares', 'MPG', 'PublicityShares']

    AwardPlayers = []
    AllPlayers = sorted(Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit = False), key=lambda t: t.CurrentPlayerTeamSeason.AwardShares, reverse=True)[:25]
    for P in AllPlayers:
        PTS = P.CurrentPlayerTeamSeason

        PlayerValues = GetValuesOfSingleObject(P, PlayerFields)
        PlayerCurrentTeamValues = GetValuesOfSingleObject(P.CurrentTeam, PlayerCurrentTeamFields)
        PlayerTeamSeasonValues = GetValuesOfSingleObject(PTS, PlayerTeamSeasonFields)

        PlayerObject = MergeDicts([PlayerValues, PlayerCurrentTeamValues, PlayerTeamSeasonValues])
        AwardPlayers.append(PlayerObject)

    context['AwardPlayers'] = AwardPlayers

    return JsonResponse(context, safe=False)

def GET_TeamCoaches(request, WorldID, TeamID):
    context = {'status':'success', 'WorldID': WorldID}

    CurrentWorld = World.objects.get(WorldID = WorldID)
    TeamID = Team.objects.get(WorldID = CurrentWorld, TeamID = TeamID)
    CurrentTeamSeason = TeamID.CurrentTeamSeason

    TeamCoaches = CoachTeamSeason.objects.filter(TeamSeasonID = CurrentTeamSeason).values('CoachID__CoachFirstName', 'CoachID__CoachLastName', 'CoachPositionID__CoachPositionAbbreviation', 'CoachID').annotate(
        CoachName = Concat(F('CoachID__CoachFirstName'), Value(' '), F('CoachID__CoachLastName'), output_field=CharField()),
        CoachHref = Concat(Value('/World/'), Value(WorldID), Value('/Coach/'), F('CoachID'), output_field=CharField())
    ).order_by('CoachPositionID__CoachPositionSortOrder')
    TeamCoachDict = {C['CoachPositionID__CoachPositionAbbreviation']: C  for C in TeamCoaches}

    TeamInfo = {'TeamName': TeamID.TeamName, 'TeamLogoURL': TeamID.TeamLogoURL}

    context = {'TeamInfo': TeamInfo, 'CoachOrg': TeamCoachDict}
    return JsonResponse(context, safe=False)


def GET_WorldHistory(request, WorldID):

    DoAudit = False
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    AllLeagueSeasons = LeagueSeason.objects.filter(WorldID = CurrentWorld).order_by('-LeagueSeasonID')
    TeamHrefBase = '/World/' + str(WorldID) + '/Team/'
    PlayerHrefBase = '/World/' + str(WorldID) + '/Player/'

    WorldHistory = []
    for LS in AllLeagueSeasons:
        SeasonHistoryObject = {}
        #LSValues = LS.values('SeasonStartYear', 'LeagueSeasonID', 'OffseasonStarted')
        print('Adding', LS, 'to history')

        SeasonHistoryObject['Season'] = {'data-field': LS.SeasonStartYear, 'href-field':  LS.LeagueSeasonID}

        if LS.OffseasonStarted == False:
            continue
        ChampionTeam = LS.teamseason_set.filter(NationalChampion = True).first()
        RunnerUpTeam = LS.teamseason_set.filter(NationalRunnerUp = True).first()


        SeasonHistoryObject['ChampionTeam'] = {'data-field': ChampionTeam.TeamName, 'span-field': ChampionTeam.TeamRecord, 'href-field': TeamHrefBase + str(ChampionTeam.TeamID_id)}
        SeasonHistoryObject['RunnerUpTeam'] = {'data-field': RunnerUpTeam.TeamName, 'span-field': RunnerUpTeam.TeamRecord, 'href-field': TeamHrefBase + str(RunnerUpTeam.TeamID_id)}

        PlayerOfTheYear = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = LS.LeagueSeasonID).filter(IsNationalAward = True).filter(IsTopPlayer = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__TeamSeasonID', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id').first()
        SeasonHistoryObject['POTY'] = {'data-field': PlayerOfTheYear['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + PlayerOfTheYear['PlayerTeamSeasonID__PlayerID__PlayerLastName'], 'href-field': PlayerHrefBase + str(PlayerOfTheYear['PlayerTeamSeasonID__PlayerID_id'])}

        WorldHistory.append(SeasonHistoryObject)


    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='Get_WorldHistory' )
    context = {'status':'success', 'WorldID': WorldID}

    context['WorldHistory'] = WorldHistory
    print('context', context)

    return JsonResponse(context, safe=False)


def GET_TeamAnalytics(request, WorldID, TeamID):
    PlayerState = []
    MaxState = max([StateCount[u] for u in StateCount])
    MinState = min([StateCount[u] for u in StateCount])
    for s in StateCount:
        StateColor = str(hex(255 - int(255 * StateCount[s] / MaxState))[2:3]) + 'f0'
        if StateCount[s] == MinState:
            StateColor = 'ff0'
        PlayerState.append({'StateName': s, 'PlayerCount': StateCount[s], 'StateColor': StateColor})

    return JsonResponse(context, safe=False)


def GET_PlayerStats_Player(request, WorldID, PlayerID):

    PlayerObject = Player.objects.filter(WorldID_id = WorldID).filter(PlayerID=PlayerID).first()
    SeasonStatGroupings = [
        {
            'StatGroupName': 'Passing',
            'Stats': [
                {'FieldName': 'SeasonYear', 'title': 'Season', 'DisplayColumn': True, 'DisplayOrder': 0, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'GamesPlayed', 'title': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_CompletionsAndAttempts', 'title': 'C/ATT', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_CompletionPercentage', 'title': 'Pass %', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'PAS_YardsPerAttempt', 'title': 'YPA', 'DisplayColumn': True, 'DisplayOrder': 2.5, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_Attempts', 'title': 'A', 'DisplayColumn': False, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_Yards', 'title': 'Pass Yards', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'PAS_YardsPerGame', 'title': 'Pass YPG', 'DisplayColumn': True, 'DisplayOrder': 4.5, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_TD', 'title': 'Pass TD', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'PAS_INT', 'title': 'INT', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': True},
                {'FieldName': 'PAS_SacksAndYards', 'title': 'Sck/Yrd', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'PAS_SackYards', 'title': 'Sack Yards', 'DisplayColumn': False, 'DisplayOrder': 998, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False}
            ]
        },
        {
            'StatGroupName': 'Rushing',
            'Stats': [
                {'FieldName': 'SeasonYear', 'title': 'Season', 'DisplayColumn': True, 'DisplayOrder': 0, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'GamesPlayed', 'title': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'RUS_Carries', 'title': 'Car', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': True},
                {'FieldName': 'RUS_Yards', 'title': 'Rush Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'RUS_YardsPerGame', 'title': 'Rush YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'RUS_YardsPerCarry', 'title': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'RUS_TD', 'title': 'Rush TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
            ],
        },
        {
            'StatGroupName': 'Receiving',
            'Stats': [
                {'FieldName': 'SeasonYear', 'title': 'Season', 'DisplayColumn': True, 'DisplayOrder': 0, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'GamesPlayed', 'title': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'REC_Receptions', 'title': 'Rec', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'REC_Yards', 'title': 'Rec Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'REC_YardsPerGame', 'title': 'Rec YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'REC_YardsPerCatch', 'title': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'REC_TD', 'title': 'Rec TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'REC_Targets', 'title': 'Targets', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': True},
            ],
        },
        {
            'StatGroupName': 'Defense',
            'Stats': [
                {'FieldName': 'SeasonYear', 'title': 'Season', 'DisplayColumn': True, 'DisplayOrder': 0, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'GamesPlayed', 'title': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'DEF_Tackles', 'title': 'Tackles', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'DEF_Sacks', 'title': 'Sacks', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'DEF_INT', 'title': 'INTs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False, 'SmallDisplay': True, 'ShowCareerHigh': True},
                {'FieldName': 'DEF_TacklesForLoss', 'title': 'TFL', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': True},
                {'FieldName': 'FUM_Forced', 'title': 'FF', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
                {'FieldName': 'FUM_Recovered', 'title': 'FR', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False, 'SmallDisplay': False, 'ShowCareerHigh': False},
            ],
        },
    ]

    SeasonStats = PlayerObject.playerteamseason_set.all().order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'TeamSeasonID__LeagueSeasonID__IsCurrent').annotate(  # call `annotate`
            Position = F('PlayerID__PositionID__PositionAbbreviation'),
            GameScore=Sum('playergamestat__GameScore'),
            GamesPlayed=Sum('playergamestat__GamesPlayed'),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            RUS_TD=Sum('playergamestat__RUS_TD'),
            RUS_Carries=Sum('playergamestat__RUS_Carries'),
            REC_Receptions=Sum('playergamestat__REC_Receptions'),
            REC_TD=Sum('playergamestat__REC_TD'),
            REC_Targets=Sum('playergamestat__REC_Targets'),
            PAS_Yards=Sum('playergamestat__PAS_Yards'),
            PAS_TD=Sum('playergamestat__PAS_TD'),
            PAS_Sacks=Sum('playergamestat__PAS_Sacks'),
            PAS_SackYards=Sum('playergamestat__PAS_SackYards'),
            PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
            PAS_Completions=Sum('playergamestat__PAS_Completions'),
            PAS_INT=Sum('playergamestat__PAS_INT'),
            REC_Yards=Sum('playergamestat__REC_Yards'),
            DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
            DEF_INT=Sum('playergamestat__DEF_INT'),
            DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
            DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
            FUM_Forced=Sum('playergamestat__FUM_Forced'),
            FUM_Recovered=Sum('playergamestat__FUM_Recovered'),
            PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
            PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
            PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
            PlayerTeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
            SeasonYear = F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerAttempt=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards') * 1.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerCompletion=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Completions'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries=0, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
            PAS_CompletionsAndAttempts=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
                output_field=CharField()
            ),
            PAS_SacksAndYards=Case(
                When(PAS_Attempts=0, then=0),
                default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
                output_field=CharField()
            ),
            REC_YardsPerCatch=Case(
                When(REC_Receptions=0, then=0.0),
                default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                output_field=FloatField()
            ),
            REC_YardsPerGame=Case(
                When(REC_Receptions=0, then=0.0),
                default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerGame=Case(
                When(RUS_Carries=0, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerGame=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
        ).filter(GamesPlayed__gt = 0)


    GameStats = PlayerObject.playerteamseason_set.all().order_by('TeamSeasonID__LeagueSeasonID').values('playergamestat__TeamGameID', 'playergamestat__TeamGameID__OpposingTeamSeasonID__TeamID__TeamName', 'playergamestat__TeamGameID__OpposingTeamSeasonID__TeamID__TeamLogoURL','playergamestat__TeamGameID__GameID', 'ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'TeamSeasonID__LeagueSeasonID__IsCurrent').annotate(  # call `annotate`
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('playergamestat__TeamGameID__GameID'), output_field=CharField()),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            RUS_TD=Sum('playergamestat__RUS_TD'),
            RUS_Carries=Sum('playergamestat__RUS_Carries'),
            REC_Receptions=Sum('playergamestat__REC_Receptions'),
            REC_TD=Sum('playergamestat__REC_TD'),
            REC_Targets=Sum('playergamestat__REC_Targets'),
            PAS_Yards=Sum('playergamestat__PAS_Yards'),
            PAS_TD=Sum('playergamestat__PAS_TD'),
            PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
            PAS_Completions=Sum('playergamestat__PAS_Completions'),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            PAS_INT=Sum('playergamestat__PAS_INT'),
            REC_Yards=Sum('playergamestat__REC_Yards'),
            DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
            DEF_INT=Sum('playergamestat__DEF_INT'),
            DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
            DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
            GameWeek = Concat(F('playergamestat__TeamGameID__GameID__WeekID__WeekName'), Value(' - '), F('playergamestat__TeamGameID__GameID__WeekID__PhaseID__LeagueSeasonID__SeasonStartYear'), output_field=CharField()),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries=0, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
            REC_YardsPerCatch=Case(
                When(REC_Receptions=0, then=0.0),
                default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                output_field=FloatField()
            ),
        )

    print('GameStats:', GameStats)

    CareerStats = PlayerObject.playerteamseason_set.all().values('ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id').annotate(  # call `annotate`
            Position = F('PlayerID__PositionID__PositionAbbreviation'),
            GameScore=Sum('playergamestat__GameScore'),
            GamesPlayed=Sum('playergamestat__GamesPlayed'),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            RUS_TD=Sum('playergamestat__RUS_TD'),
            RUS_Carries=Sum('playergamestat__RUS_Carries'),
            REC_Receptions=Sum('playergamestat__REC_Receptions'),
            REC_TD=Sum('playergamestat__REC_TD'),
            REC_Targets=Sum('playergamestat__REC_Targets'),
            PAS_Yards=Sum('playergamestat__PAS_Yards'),
            PAS_TD=Sum('playergamestat__PAS_TD'),
            PAS_Sacks=Sum('playergamestat__PAS_Sacks'),
            PAS_SackYards=Sum('playergamestat__PAS_SackYards'),
            PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
            PAS_Completions=Sum('playergamestat__PAS_Completions'),
            PAS_INT=Sum('playergamestat__PAS_INT'),
            REC_Yards=Sum('playergamestat__REC_Yards'),
            DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
            DEF_INT=Sum('playergamestat__DEF_INT'),
            DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
            DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
            FUM_Forced=Sum('playergamestat__FUM_Forced'),
            FUM_Recovered=Sum('playergamestat__FUM_Recovered'),
            PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
            PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
            PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
            PlayerTeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
            SeasonYear = Concat(Min('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), Value('-'), Max('TeamSeasonID__LeagueSeasonID__SeasonStartYear'), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerAttempt=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards') * 1.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerCompletion=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Completions'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries=0, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
            PAS_CompletionsAndAttempts=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
                output_field=CharField()
            ),
            PAS_SacksAndYards=Case(
                When(PAS_Attempts=0, then=0),
                default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
                output_field=CharField()
            ),
            REC_YardsPerCatch=Case(
                When(REC_Receptions=0, then=0.0),
                default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                output_field=FloatField()
            ),
            REC_YardsPerGame=Case(
                When(REC_Receptions=0, then=0.0),
                default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerGame=Case(
                When(RUS_Carries=0, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAS_YardsPerGame=Case(
                When(PAS_Attempts=0, then=0.0),
                default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
        ).first()


    if SeasonStats.count() > 0:
        StatGrouping = []
        PlayerStatCategories = []
        RemoveIndeces = []
        Count = 0
        for StatGrouping in SeasonStatGroupings:
            KeepGroup = False
            StatGrouping['CareerHighs'] = []
            for u in SeasonStats:
                u['SeasonStatVals'] = []
                print("StatGrouping['Stats']", StatGrouping['Stats'])
                for Stat in sorted(StatGrouping['Stats'], key=lambda k: k['DisplayOrder'] ):
                    val = u[Stat['FieldName']]

                    if Stat['DisplayColumn']:
                        u['SeasonStatVals'].append(val)
                        if val is not None and str(val) not in ['0', '0.0', '-'] and Stat['FieldName'] not in ['GamesPlayed', 'SeasonYear']:
                            KeepGroup = True
                            StatGrouping['KeepGroup'] = True

                    if Stat['ShowCareerHigh']:
                        High = GameStats.order_by('-' + Stat['FieldName']).first()
                        if   High[Stat['FieldName']] is not None:
                            CareerHighInfo = {'Field': Stat['title'], 'Value': High[Stat['FieldName']], 'Week':High['GameWeek'], 'GameHref': High['GameHref'], 'OpposingTeamName': High['playergamestat__TeamGameID__OpposingTeamSeasonID__TeamID__TeamName'], 'OpposingTeamLogo': High['playergamestat__TeamGameID__OpposingTeamSeasonID__TeamID__TeamLogoURL'] }
                            if CareerHighInfo['Value'] > 0:
                                print(StatGrouping['CareerHighs'])
                                StatGrouping['CareerHighs'].append(CareerHighInfo)

            CareerStatsVals = []
            for Stat in StatGrouping['Stats']:

                if Stat not in ['SeasonYear'] and SeasonStats.count() > 1: #TODO change 0 to 1 after testing
                    val = CareerStats[Stat['FieldName']]

                    if Stat['DisplayColumn']:
                        CareerStatsVals.append(val)
            StatGrouping['CareerStats'] = CareerStatsVals

            if KeepGroup:
                StatGrouping['SeasonStats'] = []
                for u in SeasonStats:
                    StatGrouping['SeasonStats'].append(list(u['SeasonStatVals']))


            else:
                RemoveIndeces.append(Count)
            Count +=1

        for C in sorted(RemoveIndeces, reverse=True):
            SeasonStatGroupings.pop(C)



    return JsonResponse(SeasonStatGroupings, safe=False)

def GET_PlayerStats(request, WorldID, TeamID = None, SeasonStartYear = None):

    Columns = {}
    Orders = {}
    OrderList = []

    Filters = {'WorldID': WorldID}

    if TeamID is not None:
        Filters['playerteamseason__TeamSeasonID__TeamID'] = TeamID

    if SeasonStartYear is not None:
        Filters['playerteamseason__TeamSeasonID__LeagueSeasonID__SeasonStartYear'] = SeasonStartYear

    for u in request.GET:
        if 'order' in u:
            spl = u.replace(']', '').split('[')
            OrderIndex = int(spl[1])
            OrderAttr = spl[2]
            OrderAttrValue = request.GET[u]

            if OrderIndex not in Orders:
                Orders[OrderIndex] = {}
            Orders[OrderIndex][OrderAttr] = OrderAttrValue
        elif 'columns' in u:
            spl = u.replace(']', '').split('[')
            ColumnIndex = int(spl[1])
            ColumnAttr = spl[2]
            ColumnAttrValue = request.GET[u]

            if ColumnIndex not in Columns:
                Columns[ColumnIndex] = {}
            Columns[ColumnIndex][ColumnAttr] = ColumnAttrValue

            if ColumnAttr == 'search' and spl[3] == 'value':
                Columns[ColumnIndex]['SearchValue'] = request.GET[u]


    for ColumnIndex in Columns:
        if len(Columns[ColumnIndex]['SearchValue']) > 1:
            ColName = Columns[ColumnIndex]['data']
            Filters[ColName] = Columns[ColumnIndex]['SearchValue']

    for OrderIndex in sorted(Orders):
        if 'column' not in Orders[OrderIndex]:
            continue
        OrderColumnIndex = int(Orders[OrderIndex]['column'])
        OrderColumnName = Columns[OrderColumnIndex]['data']
        OrderDirection = Orders[OrderIndex]['dir']
        OrderDirectionSign = '-' if OrderDirection == 'desc' else ''

        OrderColumnName = OrderDirectionSign + OrderColumnName

        OrderList.append(OrderColumnName)
    OrderList.append('PlayerID')

    #print('Filters!!!', Filters)


    Start = int(request.GET['start'])
    Length = int(request.GET['length'])
    Draw = int(request.GET['draw'])

    Players = Common_PlayerStats(Filters=Filters, OrderList = OrderList)


    context = {'data':list(Players[Start:Start+Length])
             , "draw": Draw
             ,"recordsTotal": len(Players)
             ,"recordsFiltered": len(Players)
        }
    return JsonResponse(context, safe=False)


def Common_PlayerRecords(WorldID, Timeframe = 'Career', Filters={}, ListLength = 5):

    print('Getting Player Records. ListLength:', ListLength, 'Timeframe:',Timeframe,' Filters:', Filters)
    if Timeframe == 'Season':
        HistoricalStats = PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(**Filters ).values( 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'PlayerID__PositionID__PositionAbbreviation').annotate(
            DEF_INT = Sum('playergamestat__DEF_INT'),
            GameScore=Sum('playergamestat__GameScore'),
            TeamGamesPlayed=Sum('playergamestat__TeamGamesPlayed'),
            PAS_Yards = Sum('playergamestat__PAS_Yards'),
            PAS_TD = Sum('playergamestat__PAS_TD'),
            PAS_Attempts = Sum('playergamestat__PAS_Attempts'),
            PAS_Completions = Sum('playergamestat__PAS_Completions'),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            RUS_TD = Sum('playergamestat__RUS_TD'),
            RUS_Carries = Sum('playergamestat__RUS_Carries'),
            REC_Receptions = Sum('playergamestat__REC_Receptions'),
            REC_TD = Sum('playergamestat__REC_TD'),
            REC_Yards = Sum('playergamestat__REC_Yards'),
            DEF_Sacks = Sum('playergamestat__DEF_Sacks'),
            DEF_TacklesForLoss = Sum('playergamestat__DEF_TacklesForLoss'),
            PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
            PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
            TeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
            Timeframe = F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            TimeframeHref = Concat(Value(''), Value(''), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte=F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt = F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('PlayerID__PlayerLastName')

    elif Timeframe == 'Career':
        HistoricalStats = Player.objects.filter(WorldID = WorldID).filter(**Filters ).values( 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'PlayerID').annotate(
            GameScore=Sum('playerteamseason__playergamestat__GameScore'),
            MinSeason=Min('playerteamseason__TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            MaxSeason=Max('playerteamseason__TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            TeamGamesPlayed=Sum('playerteamseason__playergamestat__TeamGamesPlayed'),
            PAS_Yards = Sum('playerteamseason__playergamestat__PAS_Yards'),
            PAS_TD = Sum('playerteamseason__playergamestat__PAS_TD'),
            PAS_Attempts = Sum('playerteamseason__playergamestat__PAS_Attempts'),
            PAS_Completions = Sum('playerteamseason__playergamestat__PAS_Completions'),
            RUS_Yards=Sum('playerteamseason__playergamestat__RUS_Yards'),
            RUS_TD = Sum('playerteamseason__playergamestat__RUS_TD'),
            RUS_Carries = Sum('playerteamseason__playergamestat__RUS_Carries'),
            REC_Receptions = Sum('playerteamseason__playergamestat__REC_Receptions'),
            REC_TD = Sum('playerteamseason__playergamestat__REC_TD'),
            REC_Yards = Sum('playerteamseason__playergamestat__REC_Yards'),
            DEF_Sacks = Sum('playerteamseason__playergamestat__DEF_Sacks'),
            DEF_INT = Sum('playerteamseason__playergamestat__DEF_INT'),
            DEF_TacklesForLoss = Sum('playerteamseason__playergamestat__DEF_TacklesForLoss'),
            PlayerPosition = F('PositionID__PositionAbbreviation'),
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
            TeamLogoURL = Max('playerteamseason__TeamSeasonID__TeamID__TeamLogoURL'),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), Max('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
            Timeframe = Concat(F('MinSeason'), Value('-'), F('MaxSeason'), output_field=CharField()),
            TimeframeHref = Concat(Value(''), Value(''), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte=F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt = F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('PlayerLastName')

    elif Timeframe == 'Game':
        HistoricalStats = PlayerGameStat.objects.filter(WorldID = WorldID).filter(**Filters).values( 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID_id', 'GameScore', 'PAS_Yards',
            'PAS_TD', 'PAS_Attempts', 'PAS_Completions', 'RUS_Yards', 'RUS_TD', 'REC_Receptions', 'REC_TD', 'REC_Yards',
            'DEF_Sacks', 'DEF_INT', 'DEF_TacklesForLoss'
        ).annotate(
            MinSeason=F('PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            WeekName = F('TeamGameID__GameID__WeekID__WeekName'),
            PlayerPosition = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
            PlayerName = Concat(F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), F('PlayerTeamSeasonID__TeamSeasonID__TeamID'), output_field=CharField()),
            TeamLogoURL = F('PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamLogoURL'),
            PlayerHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID_id'), output_field=CharField()),
            Timeframe = Concat(F('WeekName'), Value(', '), F('MinSeason'), output_field=CharField()),
            TimeframeHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Game/'), F('TeamGameID__GameID_id'), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte=F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt = F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('PlayerTeamSeasonID__PlayerID__PlayerLastName')


    HistoricalLeaders = [
        {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'Players': []},
        {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TDs', 'Players': []},
        {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'Players': []},
        {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'Players': []},
        {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'Rush YPC', 'Players': []},
        {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'Players': []},
        {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'Players': []},
        {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'Players': []},
        {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'Players': []},
        {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'Players': []},
        {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'Players': []},
        {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'Players': []},
    ]

    #print(HistoricalStats.query)

    for LeaderField in HistoricalLeaders:
        LeaderField['Players'] = list(HistoricalStats.order_by('-'+LeaderField['FieldName'])[0:ListLength])
        ValueRank = 1
        for P in LeaderField['Players']:
            P['Value'] = P[LeaderField['FieldName']]
            P['ValueRank'] = ValueRank
            ValueRank +=1

    return list(HistoricalLeaders)


def Common_PlayerStats( Filters = {}, OrderList = []):

    WorldID = Filters['WorldID']

    OrderList.append('PlayerID')

    Players = Player.objects.filter(**Filters).filter(playerteamseason__TeamSeasonID__TeamID__isnull = False).values('PlayerID', 'playerteamseason__PlayerTeamSeasonID', 'playerteamseason__ClassID__ClassAbbreviation', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'playerteamseason__playerteamseasonskill__OverallRating', 'playerteamseason__RedshirtedThisSeason','playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'playerteamseason__TeamCaptain','playerteamseason__playerteamseasonskill__Strength_Rating','playerteamseason__playerteamseasonskill__Agility_Rating','playerteamseason__playerteamseasonskill__Speed_Rating','playerteamseason__playerteamseasonskill__Acceleration_Rating','playerteamseason__playerteamseasonskill__Stamina_Rating','playerteamseason__playerteamseasonskill__Awareness_Rating','playerteamseason__playerteamseasonskill__Jumping_Rating','playerteamseason__playerteamseasonskill__ThrowPower_Rating'    ,'playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowOnRun_Rating'    ,'playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating'    ,'playerteamseason__playerteamseasonskill__PlayAction_Rating', 'playerteamseason__playerteamseasonskill__PassRush_Rating', 'playerteamseason__playerteamseasonskill__BlockShedding_Rating', 'playerteamseason__playerteamseasonskill__Tackle_Rating', 'playerteamseason__playerteamseasonskill__HitPower_Rating', 'playerteamseason__playerteamseasonskill__ManCoverage_Rating', 'playerteamseason__playerteamseasonskill__ZoneCoverage_Rating', 'playerteamseason__playerteamseasonskill__Press_Rating', 'playerteamseason__playerteamseasonskill__Carrying_Rating', 'playerteamseason__playerteamseasonskill__Elusiveness_Rating', 'playerteamseason__playerteamseasonskill__BallCarrierVision_Rating', 'playerteamseason__playerteamseasonskill__BreakTackle_Rating', 'playerteamseason__playerteamseasonskill__Catching_Rating', 'playerteamseason__playerteamseasonskill__CatchInTraffic_Rating', 'playerteamseason__playerteamseasonskill__RouteRunning_Rating', 'playerteamseason__playerteamseasonskill__Release_Rating', 'playerteamseason__playerteamseasonskill__PassBlock_Rating', 'playerteamseason__playerteamseasonskill__RunBlock_Rating', 'playerteamseason__playerteamseasonskill__ImpactBlock_Rating', 'playerteamseason__playerteamseasonskill__KickPower_Rating', 'playerteamseason__playerteamseasonskill__KickAccuracy_Rating').annotate(
        ReasonForLeaving = Case(
            When(playerteamseason__QuitFootballAfterSeason = True, then=Value('Quit football')),
            When(playerteamseason__GraduatedAfterSeason = False, then=Value('Graduated')),
            When(playerteamseason__LeftEarlyForDraftAfterSeason = False, then=Value('Left for draft')),
            When(playerteamseason__TransferredAfterSeason = False, then=Value('Transferred')),
            default=Value(''),
            output_field = CharField()
        ),
        PastRedshirtDisplay = Case(
            When(WasPreviouslyRedshirted = True, then=Value(' (RS)')),
            default = Value(''),
            output_field = CharField()
        ),
        ClassDisplay = Concat( F('playerteamseason__ClassID__ClassAbbreviation'), F('PastRedshirtDisplay'), output_field = CharField()),
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        GamesPlayed=Sum('playerteamseason__playergamestat__GamesPlayed'),
        TeamGamesPlayed=Count('playerteamseason__playergamestat__TeamGameID'),
        GameScore=Sum('playerteamseason__playergamestat__GameScore', output_field=FloatField()),
        PAS_Yards=Sum('playerteamseason__playergamestat__PAS_Yards'),
        PAS_TD=Sum('playerteamseason__playergamestat__PAS_TD'),
        PAS_INT=Sum('playerteamseason__playergamestat__PAS_INT'),
        PAS_Attempts=Sum('playerteamseason__playergamestat__PAS_Attempts'),
        PAS_Completions=Sum('playerteamseason__playergamestat__PAS_Completions'),
        RUS_Carries=Sum('playerteamseason__playergamestat__RUS_Carries'),
        RUS_TD=Sum('playerteamseason__playergamestat__RUS_TD'),
        RUS_Yards=Sum('playerteamseason__playergamestat__RUS_Yards'),
        RUS_20=Sum('playerteamseason__playergamestat__RUS_20'),
        REC_Yards=Sum('playerteamseason__playergamestat__REC_Yards'),
        REC_Receptions=Sum('playerteamseason__playergamestat__REC_Receptions'),
        REC_Targets=Sum('playerteamseason__playergamestat__REC_Targets'),
        REC_TD=Sum('playerteamseason__playergamestat__REC_TD'),
        FUM_Fumbles=Sum('playerteamseason__playergamestat__FUM_Fumbles'),
        DEF_Sacks=Sum('playerteamseason__playergamestat__DEF_Sacks'),
        DEF_INT=Sum('playerteamseason__playergamestat__DEF_INT'),
        DEF_Tackles=Sum('playerteamseason__playergamestat__DEF_Tackles'),
        DEF_TacklesForLoss=Sum('playerteamseason__playergamestat__DEF_TacklesForLoss'),
        DEF_Deflections=Sum('playerteamseason__playergamestat__DEF_Deflections'),
        FUM_Forced=Sum('playerteamseason__playergamestat__FUM_Forced'),
        FUM_Recovered=Sum('playerteamseason__playergamestat__FUM_Recovered'),
        PAS_CompletionPercentage = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                            output_field=FloatField()
                        ),
        PAS_YPG = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_YPG = Case(
                            When(RUS_Carries=0, then=0.0),
                            default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        REC_YPG = Case(
                            When(REC_Receptions=0, then=0.0),
                            default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_YPC = Case(
                            When(RUS_Carries=0, then=0.0),
                            default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                            output_field=FloatField()
                        ),
        REC_YPC = Case(
                            When(REC_Receptions=0, then=0.0),
                            default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                            output_field=FloatField()
                        ),
        RUS_LNG = Max('playerteamseason__playergamestat__RUS_LNG'),
        REC_LNG = Max('playerteamseason__playergamestat__REC_LNG'),
    ).order_by(*OrderList)

    return list(Players)

def Common_TeamRecords(WorldID, Timeframe = 'Alltime', Filters={}, ListLength = 5):
    WorldID = Filters['WorldID']
    print('Getting Player Records. ListLength:', ListLength, 'Timeframe:',Timeframe,' Filters:', Filters)

    if Timeframe == 'Season':
        HistoricalStats = TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID__isnull = False).filter(**Filters ).values( 'LeagueSeasonID__SeasonStartYear', 'TeamID__TeamName', 'TeamID__TeamLogoURL', 'TeamID__TeamColor_Primary_HEX').annotate(
            GamesPlayed=Count('teamgame', filter=Q(teamgame__GameID__WasPlayed = True)),
            Wins=Count('teamgame', filter=Q(teamgame__IsWinningTeam = True)),
            Losses=F('GamesPlayed') - F('Wins'),
            WeeksAt1 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID=OuterRef('TeamSeasonID')).filter(NationalRank=1).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            WeeksTop10 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID=OuterRef('TeamSeasonID')).filter(NationalRank__lte=10).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            WeeksTop25 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID=OuterRef('TeamSeasonID')).filter(NationalRank__lte=25).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            Win_Percentage=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('Wins')* 100.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            Points = Sum('teamgame__Points'),
            PointsAllowed = Sum('teamgame__OpposingTeamGameID__Points'),
            PPG=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('Points')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAPG=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('PointsAllowed')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            MOV=Round(F('PPG') - F('PAPG'),1),
            DEF_INT = Sum('teamgame__DEF_INT'),
            TeamGamesPlayed=Sum('teamgame__GamesPlayed'),
            PAS_Yards = Sum('teamgame__PAS_Yards'),
            PAS_TD = Sum('teamgame__PAS_TD'),
            PAS_Attempts = Sum('teamgame__PAS_Attempts'),
            PAS_Completions = Sum('teamgame__PAS_Completions'),
            RUS_Yards=Sum('teamgame__RUS_Yards'),
            RUS_TD = Sum('teamgame__RUS_TD'),
            RUS_Carries = Sum('teamgame__RUS_Carries'),
            REC_Receptions = Sum('teamgame__REC_Receptions'),
            REC_TD = Sum('teamgame__REC_TD'),
            REC_Yards = Sum('teamgame__REC_Yards'),
            DEF_TacklesForLoss = Sum('teamgame__DEF_TacklesForLoss'),
            DEF_Sacks = Sum('teamgame__DEF_Sacks'),
            DEF_Tackles = Sum('teamgame__DEF_Tackles'),
            DEF_Deflections = Sum('teamgame__DEF_Deflections'),
            FUM_Forced = Sum('teamgame__FUM_Forced'),
            TeamLogoURL = F('TeamID__TeamLogoURL'),
            TeamName = F('TeamID__TeamName'),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
            Timeframe = F('LeagueSeasonID__SeasonStartYear'),
            TimeframeHref = Concat(Value(''), Value(''), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte=F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt = F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('TeamID__TeamName')

    elif Timeframe == 'Alltime':
        HistoricalStats = Team.objects.filter(WorldID = WorldID).filter(**Filters ).values('TeamName', 'TeamLogoURL', 'TeamColor_Primary_HEX').annotate(
            GamesPlayed=Count('teamseason__teamgame', filter=Q(teamseason__teamgame__GameID__WasPlayed = True)),
            Wins=Count('teamseason__teamgame', filter=Q(teamseason__teamgame__IsWinningTeam = True)),
            Losses=F('GamesPlayed') - F('Wins'),
            Win_Percentage=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('Wins')* 100.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            WeeksAt1 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank=1).values('TeamSeasonID__TeamID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            WeeksTop10 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank__lte=10).values('TeamSeasonID__TeamID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            WeeksTop25 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank__lte=25).values('TeamSeasonID__TeamID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
            Points = Sum('teamseason__teamgame__Points'),
            PointsAllowed = Sum('teamseason__teamgame__OpposingTeamGameID__Points'),
            PPG=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('Points')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAPG=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('PointsAllowed')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            MOV=Round(F('PPG') - F('PAPG'),1),
            DEF_INT = Sum('teamseason__teamgame__DEF_INT'),
            TeamGamesPlayed=Sum('teamseason__teamgame__GamesPlayed'),
            PAS_Yards = Sum('teamseason__teamgame__PAS_Yards'),
            PAS_TD = Sum('teamseason__teamgame__PAS_TD'),
            PAS_Attempts = Sum('teamseason__teamgame__PAS_Attempts'),
            PAS_Completions = Sum('teamseason__teamgame__PAS_Completions'),
            RUS_Yards=Sum('teamseason__teamgame__RUS_Yards'),
            RUS_TD = Sum('teamseason__teamgame__RUS_TD'),
            RUS_Carries = Sum('teamseason__teamgame__RUS_Carries'),
            REC_Receptions = Sum('teamseason__teamgame__REC_Receptions'),
            REC_TD = Sum('teamseason__teamgame__REC_TD'),
            REC_Yards = Sum('teamseason__teamgame__REC_Yards'),
            DEF_TacklesForLoss = Sum('teamseason__teamgame__DEF_TacklesForLoss'),
            DEF_Sacks = Sum('teamseason__teamgame__DEF_Sacks'),
            DEF_Tackles = Sum('teamseason__teamgame__DEF_Tackles'),
            DEF_Deflections = Sum('teamseason__teamgame__DEF_Deflections'),
            FUM_Forced = Sum('teamseason__teamgame__FUM_Forced'),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
            Timeframe = Min('teamseason__LeagueSeasonID__SeasonStartYear'),
            TimeframeHref = Concat(Value(''), Value(''), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte=F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt = F('TeamGamesPlayed') * 10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('TeamName')

    elif Timeframe == 'Game':
        HistoricalStats = TeamGame.objects.filter(WorldID = WorldID).filter(**Filters).values( 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__TeamID__TeamColor_Primary_HEX',  'PAS_Yards',
            'PAS_TD', 'PAS_Attempts', 'PAS_Completions', 'RUS_Yards', 'RUS_TD', 'RUS_Carries', 'REC_Receptions', 'REC_TD', 'REC_Yards',
            'DEF_Sacks', 'DEF_INT', 'DEF_Tackles', 'DEF_Deflections', 'DEF_TacklesForLoss', 'FUM_Forced'
        ).annotate(
            PPG=F('Points'),
            PAPG=F('OpposingTeamGameID__Points'),
            MOV=Round(F('PPG') - F('PAPG'),1),
            Wins=Count('IsWinningTeam'),
            Losses=Count('IsWinningTeam'),
            GamesPlayed=Count('TeamGameID'),
            Win_Percentage=Case(
                When(GamesPlayed= 0, then=0.0),
                default=(Round(F('Wins')* 100.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            TeamName = F('TeamSeasonID__TeamID__TeamName'),
            MinSeason=F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
            WeekName = F('GameID__WeekID__WeekName'),
            TeamHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
            TeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
            Timeframe = Concat(F('WeekName'), Value(', '), F('MinSeason'), output_field=CharField()),
            TimeframeHref = Concat(Value('/World/'), Value(WorldID.WorldID), Value('/Game/'), F('GameID_id'), output_field=CharField()),
            PAS_CompletionPercentage=Case(
                When(PAS_Attempts__lte= 10, then=0.0),
                default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPerCarry=Case(
                When(RUS_Carries__lt =  10, then=0.0),
                default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                output_field=FloatField()
            ),
        ).order_by('TeamSeasonID__TeamID__TeamName')


    HistoricalLeaders = [
        {'FieldName': 'Wins', 'DisplayName': 'Wins', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'Losses', 'DisplayName': 'Losses', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'Win_Percentage', 'DisplayName': 'Win %', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'WeeksAt1', 'DisplayName': 'Weeks #1', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'WeeksTop10', 'DisplayName': 'Weeks Top 10', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'WeeksTop25', 'DisplayName': 'Weeks Top 25', 'Players': [], 'Reverse': False, 'Exclude': ['Game']},
        {'FieldName': 'PPG', 'DisplayName': 'PPG', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'PAPG', 'DisplayName': 'PAPG', 'Players': [], 'Reverse': True, 'Exclude': []},
        {'FieldName': 'MOV', 'DisplayName': 'MOV', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TDs', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'Rush YPC', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'Players': [], 'Reverse': False, 'Exclude': ['Alltime', 'Season']},
        {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'Players': [], 'Reverse': False, 'Exclude': ['Alltime', 'Season']},
        {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'Players': [], 'Reverse': False, 'Exclude': ['Alltime', 'Season']},
        {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tckls', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'DEF_Deflections', 'DisplayName': 'DEF', 'Players': [], 'Reverse': False, 'Exclude': []},
        {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'Players': [], 'Reverse': False, 'Exclude': []},
    ]

    #print('\nHistoricalStats.query', HistoricalStats.query)

    HistoricalLeaders = [HL for HL in HistoricalLeaders if Timeframe not in HL['Exclude']]

    for LeaderField in HistoricalLeaders:

        if LeaderField['Reverse']:
            LeaderField['Teams'] = list(HistoricalStats.order_by(LeaderField['FieldName'])[0:ListLength])
        else:
            LeaderField['Teams'] = list(HistoricalStats.order_by('-'+LeaderField['FieldName'])[0:ListLength])

        ValueRank = 1
        for P in LeaderField['Teams']:
            P['Value'] = P[LeaderField['FieldName']]
            P['ValueRank'] = ValueRank
            ValueRank +=1

    return list(HistoricalLeaders)


def Common_TeamAccolades( Filters = {}):

    WorldID = Filters['WorldID']

    Teams = Team.objects.filter(**Filters).values('TeamName','TeamColor_Primary_HEX', 'TeamID', 'TeamLogoURL', 'ConferenceID__ConferenceName').annotate(
        NationalRank = Min('teamseason__teamseasonweekrank__NationalRank'),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
        GamesPlayed=Sum('teamseason__teamgame__GamesPlayed'),
        Wins = Count('teamseason__teamgame', filter=Q(teamseason__teamgame__IsWinningTeam = True)),
        Losses = Count('teamseason__teamgame', filter=Q(teamseason__teamgame__IsWinningTeam = False) & Q(teamseason__teamgame__GameID__WasPlayed = True)),
        Points=Sum('teamseason__teamgame__Points'),
        Opponent_Points=Sum('teamseason__teamgame__OpposingTeamGameID__Points'),


        Top25_Wins = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Top25_Losses = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = False).filter(GameID__WasPlayed = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Top25_GamesPlayed = F('Top25_Wins') + F('Top25_Losses'),
        Top25_WinPercentage = Case(
            When(Top25_GamesPlayed__gt = 0,then=Round((F('Top25_Wins') * 100.0 / (F('Top25_GamesPlayed'))),1)),
            default=Value(0.0),
            output_field=FloatField()
        ),
        Heisman_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsSeasonAward = True).filter(IsTopPlayer=True).annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Conf_AllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Conf_PreSeasonAllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsPreseasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Conf_POTW_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsWeekAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),

        Natl_AllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Natl_PreSeasonAllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsPreseasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Natl_POTW_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsWeekAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),

        Bowl_Wins = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(GameID__BowlID__isnull = False).filter(IsWinningTeam = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Bowl_Losses = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(GameID__BowlID__isnull = False).filter(IsWinningTeam = False).filter(GameID__WasPlayed = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Bowl_GamesPlayed = F('Bowl_Wins') + F('Bowl_Losses'),
        Bowl_WinPercentage = Case(
            When(Bowl_GamesPlayed__gt = 0,then=Round((F('Bowl_Wins') * 100.0 / (F('Bowl_GamesPlayed'))),1)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        ConferenceChampionshipWins = Count('teamseason', filter=Q(teamseason__ConferenceChampion = True),  distinct=True),
        NationalChampionshipWins = Count('teamseason', filter=Q(teamseason__NationalChampion = True),  distinct=True),

    ).order_by('TeamName')

    return list(Teams)


def Common_TeamStats( Filters = {}):

    WorldID = Filters['WorldID']

    Teams = Team.objects.filter(**Filters).values('TeamName','TeamColor_Primary_HEX', 'TeamID', 'TeamLogoURL').annotate(
        ConferenceID__ConferenceName = F('teamseason__DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceName'),
        NationalRank = Min('teamseason__teamseasonweekrank__NationalRank'),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
        GamesPlayed=Sum('teamseason__teamgame__GamesPlayed'),
        Wins = Count('teamseason__teamgame', filter=Q(teamseason__teamgame__IsWinningTeam = True)),
        Losses = Count('teamseason__teamgame', filter=Q(teamseason__teamgame__IsWinningTeam = False) & Q(teamseason__teamgame__GameID__WasPlayed = True)),
        Points=Sum('teamseason__teamgame__Points'),
        Opponent_Points=Sum('teamseason__teamgame__OpposingTeamGameID__Points'),

        Yards = Sum('teamseason__teamgame__PAS_Yards') + Sum('teamseason__teamgame__RUS_Yards'),
        Yards_PerGame = Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(F('Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
        Opponent_Yards = Sum('teamseason__teamgame__OpposingTeamGameID__PAS_Yards') + Sum('teamseason__teamgame__OpposingTeamGameID__RUS_Yards'),
        Opponent_Yards_PerGame = Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(F('Opponent_Yards')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),

        Points_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Points')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_Points_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_Points')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        MOV = Round(F('Points_PerGame') - F('Opponent_Points_PerGame'),1),
        PAS_Yards= Sum('teamseason__teamgame__PAS_Yards'),
        Opponent_PAS_Yards=Sum('teamseason__teamgame__OpposingTeamGameID__PAS_Yards'),
        ###
        PAS_Yards_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        PAS_TD=Sum('teamseason__teamgame__PAS_TD'),
        PAS_TD_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('PAS_TD')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        PAS_INT=Sum('teamseason__teamgame__PAS_INT'),
        PAS_INT_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('PAS_INT')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        PAS_Attempts=Sum('teamseason__teamgame__PAS_Attempts'),
        PAS_Attempts_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('PAS_Attempts')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        PAS_RTG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        Opponent_PAS_RTG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        PAS_LNG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        Opponent_PAS_LNG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        PAS_Sacks = Sum('teamseason__teamgame__PAS_Sacks'),
        Opponent_PAS_Sacks = Sum('teamseason__teamgame__OpposingTeamGameID__PAS_Sacks'),
        PAS_SackYards = Sum('teamseason__teamgame__PAS_SackYards'),
        Opponent_PAS_SackYards = Sum('teamseason__teamgame__OpposingTeamGameID__PAS_SackYards'),

        PAS_Completions=Sum('teamseason__teamgame__PAS_Completions'),
        PAS_Completions_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('PAS_Completions')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_Carries=Sum('teamseason__teamgame__RUS_Carries'),
        RUS_Carries_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('RUS_Carries')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_TD=Sum('teamseason__teamgame__RUS_TD'),
        RUS_TD_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('RUS_TD')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_Yards=Sum('teamseason__teamgame__RUS_Yards'),
        RUS_Yards_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),

        RUS_LNG=Max('teamseason__teamgame__RUS_LNG'),
        Opponent_RUS_LNG=Max('teamseason__teamgame__OpposingTeamGameID__RUS_LNG'),
        REC_LNG=Max('teamseason__teamgame__REC_LNG'),
        Opponent_REC_LNG=Max('teamseason__teamgame__OpposingTeamGameID__REC_LNG'),
        ##
        Opponent_PAS_Yards_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),

        Opponent_PAS_TD=Sum('teamseason__teamgame__OpposingTeamGameID__PAS_TD'),
        Opponent_PAS_TD_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_PAS_TD')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_INT=Sum('teamseason__teamgame__OpposingTeamGameID__PAS_INT'),
        Opponent_PAS_INT_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_PAS_INT')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_Attempts=Sum('teamseason__teamgame__OpposingTeamGameID__PAS_Attempts'),
        Opponent_PAS_Attempts_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_PAS_Attempts')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_Completions=Sum('teamseason__teamgame__OpposingTeamGameID__PAS_Completions'),
        Opponent_PAS_Completions_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_PAS_Completions')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_RUS_Carries=Sum('teamseason__teamgame__OpposingTeamGameID__RUS_Carries'),
        Opponent_RUS_Carries_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_RUS_Carries')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_RUS_TD=Sum('teamseason__teamgame__OpposingTeamGameID__RUS_TD'),
        Opponent_RUS_TD_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_RUS_TD')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_RUS_Yards=Sum('teamseason__teamgame__OpposingTeamGameID__RUS_Yards'),
        Opponent_RUS_Yards_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('Opponent_RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
###

        REC_Yards=Sum('teamseason__teamgame__REC_Yards'),
        REC_Yards_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        REC_Receptions=Sum('teamseason__teamgame__REC_Receptions'),
        REC_Receptions_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('REC_Receptions')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        REC_Targets=Sum('teamseason__teamgame__REC_Targets'),
        REC_Targets_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('REC_Targets')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        REC_TD=Sum('teamseason__teamgame__REC_TD'),
        REC_TD_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('REC_TD')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        FUM_Fumbles=Sum('teamseason__teamgame__FUM_Fumbles'),
        FUM_Fumbles_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('FUM_Fumbles')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        DEF_Sacks=Sum('teamseason__teamgame__DEF_Sacks'),
        DEF_Sacks_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('DEF_Sacks')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        DEF_INT=Sum('teamseason__teamgame__DEF_INT'),
        DEF_INT_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('DEF_INT')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        DEF_Tackles=Sum('teamseason__teamgame__DEF_Tackles'),
        DEF_Tackles_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('DEF_Tackles')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        DEF_TacklesForLoss=Sum('teamseason__teamgame__DEF_TacklesForLoss'),
        DEF_TacklesForLoss_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('DEF_TacklesForLoss')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        FUM_Forced=Sum('teamseason__teamgame__FUM_Forced'),
        FUM_Forced_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('FUM_Forced')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_20=Sum('teamseason__teamgame__RUS_20'),
        FUM_Recovered=Sum('teamseason__teamgame__FUM_Recovered'),
        FUM_Recovered_PerGame = Case(
                            When(GamesPlayed=0, then=0.0),
                            default=(Round(F('FUM_Recovered')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        PAS_CompletionPercentage = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_CompletionPercentage = Case(
                            When(Opponent_PAS_Attempts=0, then=0.0),
                            default=(Round(F('Opponent_PAS_Completions')* 100.0 / F('Opponent_PAS_Attempts'),1)),
                            output_field=FloatField()
                        ),
        PAS_YardsPerAttempt = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Attempts'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_YardsPerAttempt = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Attempts'),1)),
                            output_field=FloatField()
                        ),
        PAS_YPG = Case(
                            When(PAS_Attempts=0, then=0.0),
                            default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_PAS_YPG = Case(
                            When(Opponent_PAS_Attempts=0, then=0.0),
                            default=(Round(F('Opponent_PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_YPG = Case(
                            When(RUS_Carries=0, then=0.0),
                            default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        Opponent_RUS_YPG = Case(
                            When(Opponent_RUS_Carries=0, then=0.0),
                            default=(Round(F('Opponent_RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        REC_YPG = Case(
                            When(REC_Receptions=0, then=0.0),
                            default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
                            output_field=FloatField()
                        ),
        RUS_YPC = Case(
                            When(RUS_Carries=0, then=0.0),
                            default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                            output_field=FloatField()
                        ),
        Opponent_RUS_YPC = Case(
                            When(Opponent_RUS_Carries=0, then=0.0),
                            default=(Round(F('Opponent_RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                            output_field=FloatField()
                        ),
        REC_YPC = Case(
                            When(REC_Receptions=0, then=0.0),
                            default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
                            output_field=FloatField()
                        ),

        FirstDowns = Sum('teamseason__teamgame__FirstDowns'),
        FirstDowns_Pass = Sum('teamseason__teamgame__FirstDowns_Pass'), #TODO
        FirstDowns_Rush = Sum('teamseason__teamgame__FirstDowns_Rush'),#TODO
        FirstDowns_Penalties = Value(0, output_field=IntegerField()),#TODO

        ThirdDownConversion=Sum('teamseason__teamgame__ThirdDownConversion'),
        ThirdDownAttempt=Sum('teamseason__teamgame__ThirdDownAttempt'),
        ThirdDownPercentage=Case(
                            When(ThirdDownAttempt=0, then=0.0),
                            default=(Round(F('ThirdDownConversion')* 100.0 / F('ThirdDownAttempt'),1)),
                            output_field=FloatField()
                        ),

        FourthDownConversion=Sum('teamseason__teamgame__FourthDownConversion'),
        FourthDownAttempt=Sum('teamseason__teamgame__FourthDownAttempt'),
        FourthDownPercentage=Case(
                            When(FourthDownAttempt=0, then=0.0),
                            default=(Round(F('FourthDownConversion')* 100.0 / F('FourthDownAttempt'),1)),
                            output_field=FloatField()
                        ),

        Penalties = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        PenaltyYards = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO

        FG_LNG = Max('teamseason__teamgame__KCK_LNG'),
        FGM = Sum('teamseason__teamgame__KCK_FGM'),
        FGA = Sum('teamseason__teamgame__KCK_FGA'),
        FGPercent=Case(
                            When(FGA=0, then=0.0),
                            default=(Round(F('FGM')* 100.0 / F('FGA'),1)),
                            output_field=FloatField()
                        ),
        XPM = Sum('teamseason__teamgame__KCK_XPM'),
        XPA = Sum('teamseason__teamgame__KCK_XPA'),
        XPPercent=Case(
                            When(XPA=0, then=0.0),
                            default=(Round(F('XPM')* 100.0 / F('XPA'),1)),
                            output_field=FloatField()
                        ),
        FGM_29 = Sum('teamseason__teamgame__KCK_FGM29'),
        FGA_29 = Sum('teamseason__teamgame__KCK_FGA29'),
        FG29 = Concat(F('FGM_29'), Value('-'), F('FGA_29'), output_field=CharField()),

        FGM_39 = Sum('teamseason__teamgame__KCK_FGM39'),
        FGA_39 = Sum('teamseason__teamgame__KCK_FGA39'),
        FG39 = Concat(F('FGM_39'), Value('-'), F('FGA_39'), output_field=CharField()),

        FGM_49 = Sum('teamseason__teamgame__KCK_FGM49'),
        FGA_49 = Sum('teamseason__teamgame__KCK_FGA49'),
        FG49 = Concat(F('FGM_49'), Value('-'), F('FGA_49'), output_field=CharField()),

        FGM_50 = Sum('teamseason__teamgame__KCK_FGM50'),
        FGA_50 = Sum('teamseason__teamgame__KCK_FGA50'),
        FG50 = Concat(F('FGM_50'), Value('-'), F('FGA_50'), output_field=CharField()),

        PNT_LNG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        PNT_NET = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        PNT_Punts = Sum('teamseason__teamgame__PNT_Punts'),
        PNT_Yards = Sum('teamseason__teamgame__PNT_Yards'),
        PNT_AVG = Case(
                            When(PNT_Punts=0, then=0.0),
                            default=(Round(F('PNT_Yards')* 100.0 / F('PNT_Punts'),1)),
                            output_field=FloatField()
                        ),
        RET_PNT_ATT = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_PNT_Yards = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_PNT_AVG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_PNT_LNG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_PNT_TD = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_KCK_ATT = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_KCK_Yards = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_KCK_AVG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_KCK_LNG = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO
        RET_KCK_TD = ExpressionWrapper(Value(0), output_field=IntegerField()),#TODO

        Top25_Wins = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Top25_Losses = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25).filter(IsWinningTeam = False).filter(GameID__WasPlayed = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Top25_GamesPlayed = F('Top25_Wins') + F('Top25_Losses'),
        Top25_WinPercentage = Case(
            When(Top25_GamesPlayed__gt = 0,then=Round((F('Top25_Wins') * 100.0 / (F('Top25_GamesPlayed'))),1)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        WeeksAt1 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank=1).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
        WeeksTop10 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank__lte=10).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),
        WeeksTop25 = Coalesce(Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID=OuterRef('TeamID')).filter(NationalRank__lte=25).values('TeamSeasonID').annotate(Count=Count('TeamSeasonWeekRankID')).values('Count')),0),


        Bowl_Wins = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(GameID__BowlID__isnull = False).filter(IsWinningTeam = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Bowl_Losses = Coalesce(Subquery(TeamGame.objects.filter(WorldID=OuterRef('WorldID')).filter(TeamSeasonID__TeamID = OuterRef('TeamID')).filter(GameID__BowlID__isnull = False).filter(IsWinningTeam = False).filter(GameID__WasPlayed = True).values('TeamSeasonID__TeamID').annotate(Count = Count('TeamGameID')).values('Count')),0),
        Bowl_GamesPlayed = F('Bowl_Wins') + F('Bowl_Losses'),
        Bowl_WinPercentage = Case(
            When(Bowl_GamesPlayed__gt = 0,then=Round((F('Bowl_Wins') * 100.0 / (F('Bowl_GamesPlayed'))),1)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        ConferenceChampionshipWins = Count('teamseason', filter=Q(teamseason__ConferenceChampion = True),  distinct=True),
        NationalChampionshipWins = Count('teamseason', filter=Q(teamseason__NationalChampion = True),  distinct=True),

        Heisman_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsSeasonAward = True).filter(IsTopPlayer=True).annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),

        Conf_AllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Conf_PreSeasonAllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsPreseasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Conf_POTW_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsConferenceAward = True).filter(IsWeekAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),

        Natl_AllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Natl_PreSeasonAllAmericans_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsPreseasonAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
        Natl_POTW_Count = Coalesce(Subquery(PlayerTeamSeasonAward.objects.filter(WorldID=OuterRef('WorldID')).filter(PlayerTeamSeasonID__TeamSeasonID__TeamID = OuterRef('TeamID')).filter(IsNationalAward = True).filter(IsWeekAward = True).values('PlayerTeamSeasonID__TeamSeasonID__TeamID').annotate(Count = Count('PlayerTeamSeasonAwardID')).values('Count')),0),
    ).order_by('TeamName')

    return list(Teams)


def GET_PlayerStats_Departures(request, WorldID):

    return GET_PlayerStats(request, WorldID)


def Page_Team(request,WorldID, TeamID, SeasonStartYear = None):

    DoAudit = False
    if DoAudit:
        start = time.time()
        reset_queries()
#Get Schedule
    AllTeams = Team.objects.filter(WorldID = WorldID)
    CurrentWorld = World.objects.get(WorldID = WorldID)

    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    else:
        CurrentSeason = LeagueSeason.objects.get(SeasonStartYear = SeasonStartYear, WorldID = CurrentWorld )


    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')
    ThisTeamSeason = ThisTeam.teamseason_set.filter(LeagueSeasonID = CurrentSeason).select_related('DivisionSeasonID__ConferenceSeasonID__ConferenceID').first()

    CurrentWeek = GetCurrentWeek(CurrentWorld)
    CurrentWeekNumber = CurrentWeek.WeekNumber
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)

    TeamInfoRatings = TeamSeasonInfoRating.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).values('TeamSeasonID__TeamID', 'TeamInfoTopicID__AttributeName', 'TeamRating').annotate(
        TeamInfoTopic_Rank=Window(
            partition_by=F('TeamInfoTopicID'),
             expression=RowNumber(),
             order_by=F("TeamRating").desc(),
         ),
    )

    TeamInfoRatings = [T for T in TeamInfoRatings if T['TeamSeasonID__TeamID'] == TeamID]

    teamgames = TeamGame.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = ThisTeam, TeamSeasonID__LeagueSeasonID = CurrentSeason).select_related('GameID').select_related('GameID__BowlID').select_related('TeamSeasonWeekRankID').select_related('OpposingTeamGameID__TeamSeasonWeekRankID').select_related('GameID__WeekID__PhaseID').select_related('GameID__BowlID').select_related('TeamSeasonID__TeamID').select_related('OpposingTeamGameID__TeamSeasonID__TeamID').prefetch_related('playergamestat_set').annotate(
        GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID_id') ,output_field=CharField()),
        NationalRankDisplay = Case(
            When(TeamSeasonWeekRankID__NationalRank__gt = 25, then=Value('')),
            default=Concat(Value(''), F('TeamSeasonWeekRankID__NationalRank'), output_field=CharField()),
            output_field=CharField()
        ),
        Opponent_NationalRankDisplay = Case(
            When(TeamSeasonWeekRankID__NationalRank__gt = 25, then=Value('')),
            default=Concat(Value(''), F('TeamSeasonWeekRankID__NationalRank'), output_field=CharField()),
            output_field=CharField()
        ),
        # ThisTeamSeasonPoints = Sum('TeamSeasonID__teamgame__Points'),
        # ThisTeamSeasonGames = Sum('TeamSeasonID__teamgame__GamesPlayed'),
        # ThisTeamSeasonPPG = Case(
        #     When(ThisTeamSeasonGames = 0, then=Value(0.0)),
        #     default=Round(ExpressionWrapper(F('ThisTeamSeasonPoints') * 1.0 / F('ThisTeamSeasonGames'), output_field=FloatField()) ,1)
        # ),
        # ThisTeamSeasonPointsAllowed = Sum('TeamSeasonID__teamseason_opposingteamgame__Points'),
        # ThisTeamSeasonPAPG = Case(
        #     When(ThisTeamSeasonGames = 0, then=Value(0.0)),
        #     default=Round(ExpressionWrapper(F('ThisTeamSeasonPointsAllowed') * 1.0 / F('ThisTeamSeasonGames'), output_field=FloatField()) ,1)
        # ),
        # OpponentTeamSeasonPoints = Sum('OpposingTeamGameID__TeamSeasonID__teamgame__Points'),
        # OpponentTeamSeasonGames = Sum('OpposingTeamGameID__TeamSeasonID__teamgame__GamesPlayed'),
        # OpponentTeamSeasonPPG = Case(
        #     When(OpponentTeamSeasonGames = 0, then=Value(0.0)),
        #     default=Round(ExpressionWrapper(F('OpponentTeamSeasonPoints') * 1.0 / F('OpponentTeamSeasonGames'), output_field=FloatField()) ,1)
        # ),
        # OpponentTeamSeasonPointsAllowed = Sum('OpposingTeamGameID__TeamSeasonID__teamseason_opposingteamgame__Points'),
        # OpponentTeamSeasonPAPG = Case(
        #     When(ThisTeamSeasonGames = 0, then=Value(0.0)),
        #     default=Round(ExpressionWrapper(F('OpponentTeamSeasonPointsAllowed') * 1.0 / F('OpponentTeamSeasonGames'), output_field=FloatField()) ,1)
        # ),
    ).order_by('GameID__WeekID')

    TopPlayersReturning = []
    SelectedGame = None

    SignedRecruits = RecruitTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__TeamID = ThisTeam).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(Signed = True).values(
        'PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank',  'PlayerTeamSeasonID__PlayerID__RecruitingStars',
    ).annotate(
        Hometown = Concat(F('PlayerTeamSeasonID__PlayerID__CityID__CityName'), Value(', '), F('PlayerTeamSeasonID__PlayerID__CityID__StateID__StateAbbreviation'), output_field = CharField()),
        PlayerName = Concat(F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field = CharField()),
        OverallRating = F('PlayerTeamSeasonID__playerteamseasonskill__OverallRating'),
        Position = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field = CharField()),
    ).order_by('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank')


    TopPlayersReturning = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__TeamID = ThisTeam).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).annotate(
        CareerGameScore = Sum('PlayerID__playerteamseason__playergamestat__GameScore')
    ).order_by('-CareerGameScore')[:10]


    SelectedGame = None
    SelectedGameStop = False
    Games = []
    count = 1
    for u in teamgames:
        GameDict = {'GameID': u.GameID, 'WasPlayed': u.GameID.WasPlayed, 'GameHref': u.GameHref}

        if u.IsHomeTeam:
            GameDict['HomeTeamGame'] = u
            GameDict['AwayTeamGame'] = u.OpposingTeamGameID

        else:
            GameDict['HomeTeamGame'] = u.OpposingTeamGameID
            GameDict['AwayTeamGame'] = u


        GameDict['HomeTeamSeason'] = GameDict['HomeTeamGame'].TeamSeasonID
        GameDict['AwayTeamSeason'] = GameDict['AwayTeamGame'].TeamSeasonID

        GameDict['HomeTeam'] = GameDict['HomeTeamSeason'].TeamID
        GameDict['AwayTeam'] = GameDict['AwayTeamSeason'].TeamID

        if GameDict['GameID'].WeekID.PhaseID.PhaseName in ['Regular Season']:
            GameDict['Week'] = GameDict['GameID'].WeekID.WeekName
        elif GameDict['GameID'].WeekID.PhaseID.PhaseName in ['Conference Championships']:
            GameDict['Week'] = GameDict['HomeTeamSeason'].DivisionSeasonID.ConferenceSeasonID.ConferenceID.ConferenceAbbreviation + ' Championship'
        elif GameDict['GameID'].WeekID.PhaseID.PhaseName in ['Bowl Season']:
            GameDict['Week'] = GameDict['GameID'].BowlID.BowlName


        GameDict['HomeTeamWinningGameBold'] = ''
        GameDict['AwayTeamWinningGameBold'] = ''

        if GameDict['WasPlayed']:
            GameDict['HomeTeamRank'] = GameDict['HomeTeamGame'].TeamSeasonWeekRankID
            GameDict['AwayTeamRank'] = GameDict['AwayTeamGame'].TeamSeasonWeekRankID

            GameDict['HomePoints'] = GameDict['HomeTeamGame'].Points
            GameDict['AwayPoints'] = GameDict['AwayTeamGame'].Points

            GameDict['HomeTeamRecord'] = GameDict['HomeTeamGame'].TeamRecord
            GameDict['AwayTeamRecord'] = GameDict['AwayTeamGame'].TeamRecord

            SelectedGame = GameDict['GameID']


        else:
            if not SelectedGameStop:
                SelectedGameStop = True
                SelectedGame = GameDict['GameID']

            GameDict['HomeTeamRank'] = GameDict['HomeTeamSeason'].teamseasonweekrank_set.filter(IsCurrent = True).first()
            GameDict['AwayTeamRank'] = GameDict['AwayTeamSeason'].teamseasonweekrank_set.filter(IsCurrent = True).first()
            GameDict['HomeTeamRecord'] = '{Wins}-{Losses}'.format(Wins = GameDict['HomeTeamSeason'].Wins, Losses = GameDict['HomeTeamSeason'].Losses)
            GameDict['AwayTeamRecord'] = '{Wins}-{Losses}'.format(Wins = GameDict['AwayTeamSeason'].Wins, Losses = GameDict['AwayTeamSeason'].Losses)

        if u == SelectedGame:
            GameDict['SelectedGameBox'] = 'SelectedGameBox'

        GameDict['HomeTeamRankDisplay'] = '({Rank})'.format(Rank=GameDict['HomeTeamRank'].NationalRank) if GameDict['HomeTeamRank'].NationalRank <= 25 else ''
        GameDict['AwayTeamRankDisplay'] = '({Rank})'.format(Rank=GameDict['AwayTeamRank'].NationalRank) if GameDict['AwayTeamRank'].NationalRank <= 25 else ''


        if GameDict['HomeTeam'] == ThisTeam:

            GameDict['VsString'] = 'vs ' + GameDict['AwayTeamRankDisplay'] +' ' +GameDict['AwayTeam'].Abbreviation
            Opponent = GameDict['AwayTeam']
            GameDict['OpponentLogoURL'] = Opponent.LogoURL
            GameDict['OpponentPrimaryColor'] = Opponent.TeamColor_Primary_HEX
            GameDict['Opponent'] = GameDict['AwayTeam']
        else:
            #ThisGame['VsString'] = '@ ' +  HomeTeam.CurrentTeamSeason.NationalRankDisplay +' ' + HomeTeam.TeamName

            GameDict['VsString'] = '@ ' +   GameDict['HomeTeamRankDisplay'] +' ' +GameDict['HomeTeam'].Abbreviation
            Opponent = GameDict['HomeTeam']
            GameDict['OpponentLogoURL'] = Opponent.LogoURL
            GameDict['OpponentPrimaryColor'] = Opponent.TeamColor_Primary_HEX
            GameDict['Opponent'] = GameDict['HomeTeam']

        if GameDict['WasPlayed'] == 1:
            GameDict['OverviewText'] = 'FINAL'
            if GameDict['HomeTeam'] == ThisTeam:
                GameDict['GameDisplay'] =  str(GameDict['HomePoints']) +'-'+str(GameDict['AwayPoints'])
                if GameDict['HomeTeamGame'].IsWinningTeam:
                    GameDict['GameResultLetter'] = 'W'
                    GameDict['HomeTeamWinningGameBold'] = 'TeamWinningGameBold'
                    GameDict['AwayTeamWinningGameBold'] = 'TeamLosingGame'
                else:
                    GameDict['GameResultLetter'] = 'L'
                    GameDict['AwayTeamWinningGameBold'] = 'TeamWinningGameBold'
                    GameDict['HomeTeamWinningGameBold'] = 'TeamLosingGame'
            else:
                GameDict['GameDisplay'] =  str(GameDict['AwayPoints']) +'-'+str(GameDict['HomePoints'])
                if GameDict['AwayTeamGame'].IsWinningTeam:
                    GameDict['GameResultLetter'] = 'W'
                    GameDict['AwayTeamWinningGameBold'] = 'TeamWinningGameBold'
                    GameDict['HomeTeamWinningGameBold'] = 'TeamLosingGame'
                else:
                    GameDict['GameResultLetter'] = 'L'
                    GameDict['HomeTeamWinningGameBold'] = 'TeamWinningGameBold'
                    GameDict['AwayTeamWinningGameBold'] = 'TeamLosingGame'

            GameTopPlayers = u.GameID.CalculateTopPlayers()
            GameDict['HomePlayers'] = GameTopPlayers['HomePlayers']
            GameDict['AwayPlayers'] = GameTopPlayers['AwayPlayers']

        else:
            GameDict['GameDisplay'] = 'Preview'#u.GameDateID.Date
            GameDict['OverviewText'] = GameDict['Week']
            GameDict['HomePoints'] = ''
            GameDict['AwayPoints'] = ''
            #
            # if GameDict['HomeTeam'] == ThisTeam:
            #
            #     GameDict['HomeTeamStats'] = [
            #         {'Header': 'Offense', 'Value': u.ThisTeamSeasonPPG, 'Label': 'PPG'},
            #         {'Header': 'Defense', 'Value': u.ThisTeamSeasonPAPG, 'Label': 'PAPG'},
            #     ]
            #
            #     GameDict['AwayTeamStats'] = [
            #         {'Header': 'Offense', 'Value': u.OpponentTeamSeasonPPG, 'Label': 'PPG'},
            #         {'Header': 'Defense', 'Value': u.OpponentTeamSeasonPAPG, 'Label': 'PAPG'},
            #     ]
            # else:
            #     GameDict['HomeTeamStats'] = [
            #         {'Header': 'Offense', 'Value': u.OpponentTeamSeasonPPG, 'Label': 'PPG'},
            #         {'Header': 'Defense', 'Value': u.OpponentTeamSeasonPAPG, 'Label': 'PAPG'},
            #     ]
            #
            #     GameDict['AwayTeamStats'] = [
            #         {'Header': 'Offense', 'Value': u.ThisTeamSeasonPPG, 'Label': 'PPG'},
            #         {'Header': 'Defense', 'Value': u.ThisTeamSeasonPAPG, 'Label': 'PAPG'},
            #     ]

            if GameDict['HomeTeam'] == ThisTeam:

                GameDict['HomeTeamStats'] = [
                    {'Header': 'Offense', 'Value': 0, 'Label': 'PPG'},
                    {'Header': 'Defense', 'Value': 0, 'Label': 'PAPG'},
                ]

                GameDict['AwayTeamStats'] = [
                    {'Header': 'Offense', 'Value': 0, 'Label': 'PPG'},
                    {'Header': 'Defense', 'Value': 0, 'Label': 'PAPG'},
                ]
            else:
                GameDict['HomeTeamStats'] = [
                    {'Header': 'Offense', 'Value': 0, 'Label': 'PPG'},
                    {'Header': 'Defense', 'Value': 0, 'Label': 'PAPG'},
                ]

                GameDict['AwayTeamStats'] = [
                    {'Header': 'Offense', 'Value': 0, 'Label': 'PPG'},
                    {'Header': 'Defense', 'Value': 0, 'Label': 'PAPG'},
                ]

        Games.append(GameDict)


    for GameDict in Games:
        if GameDict['GameID'] == SelectedGame:
            GameDict['SelectedGameBox'] = 'SelectedGameBox'


    ThisTeamConference = ThisTeamSeason.DivisionSeasonID.ConferenceSeasonID.ConferenceID.ConferenceName

    #allTeams = GetAllTeams(WorldID, 'National', None, LeagueSeasonID = CurrentSeason)
    conferenceTeams = ThisTeamSeason.DivisionSeasonID.ConferenceSeasonID.ConferenceStandings(Small=True, HighlightedTeams=[ThisTeam.TeamName], WorldID=WorldID, LeagueSeasonID = CurrentSeason, WeekID=HistoricalWeek)

    print('conferenceTeams', conferenceTeams)
    TopPlayers = ThisTeamSeason.GetTeamLeaders()

    UserTeam = GetUserTeam(WorldID)


    TeamWeeklyRanks = ThisTeamSeason.teamseasonweekrank_set.order_by('WeekID')
    MaxWeeklyRank = TeamWeeklyRanks.aggregate(Max('NationalRank'))['NationalRank__max']
    page = {'PageTitle':ThisTeam.Name, 'WorldID': WorldID, 'PrimaryColor': ThisTeam.TeamColor_Primary_HEX, 'SecondaryColor': ThisTeam.SecondaryColor_Display, 'SecondaryJerseyColor': ThisTeam.TeamColor_Secondary_HEX, 'TeamJerseyStyle': ThisTeam.TeamJerseyStyle, 'TeamJerseyInvert':ThisTeam.TeamJerseyInvert, 'TabIcon':ThisTeam.LogoURL }


    page['NavBarLinks'] = NavBarLinks(Path = 'Overview', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
    context = {'conferenceTeams': conferenceTeams, 'page': page, 'userTeam': UserTeam, 'ThisTeamSeason': ThisTeamSeason, 'games':Games, 'allGames': teamgames, 'CurrentWeek': CurrentWeek}
    context['SignedRecruits'] = SignedRecruits
    context['TeamWeeklyRanks'] = TeamWeeklyRanks
    context['MaxWeeklyRank'] = MaxWeeklyRank
    context['teamLeaders'] = TopPlayers
    context['TeamInfoRatings'] = TeamInfoRatings
    context['TopPlayersReturning'] = TopPlayersReturning

    context['HeaderLink'] = TeamHeaderLinks('Overview', SeasonStartYear, CurrentWorld)
    context['TeamList'] = Team.objects.filter(WorldID=WorldID).values('TeamName', 'TeamNickname', 'TeamLogoURL').annotate(
        TeamHref=Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), output_field=CharField())
    ).order_by('TeamName')
    #context['TeamSchedule'] = TeamGame.objects.filter(TeamSeasonID__TeamID = ThisTeam).order_by('GameID__GameDateID')

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 9, AuditDescription='Page_team', QueryCount = len(connection.queries) )
    return render(request, 'HeadFootballCoach/Team.html', context)



def POST_SimAction(request, WorldID):

    Duration = request.POST['Duration']

    days = 0
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    CurrentWorld = World.objects.get(WorldID=WorldID)

    CurrentWeek = Week.objects.filter(PhaseID__LeagueSeasonID = CurrentSeason).filter(IsCurrent = True).first()
    CurrentPhase = CurrentWeek.PhaseID

    AllowInterruptions = CurrentWorld.AllowInterruptions
    BreakAfterNextDay = False
    RedirectHref = ''

    DoAudit = False

    if Duration == 'SimWeek':
        WeekList = [CurrentWeek]
    elif Duration == 'SimPhase':
        WeekList = Week.objects.filter(WeekNumber__gte = CurrentWeek.WeekNumber).filter(PhaseID = CurrentPhase).order_by('WeekNumber')
    else:
        return JsonResponse({'message': 'Could not identify duration.'}, status=422)

    for ThisWeek in WeekList:
        print('Simming Week', ThisWeek.WeekName)
        NextWeek = ThisWeek.NextWeek

        GameSet = ThisWeek.game_set.filter(WasPlayed = 0).annotate(MinRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank')).select_related('WorldID').select_related('LeagueSeasonID__LeagueID').select_related('BowlID').prefetch_related('teamgame_set').order_by('MinRank')
        for game in GameSet:

            for TG in game.teamgame_set.all().select_related('TeamSeasonID'):
                PTSDC = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TG.TeamSeasonID).count()
                if PTSDC < 22:
                    Positions = Position.objects.all().values('PositionAbbreviation', 'PositionCountPerAwardTeam', 'PositionID')
                    PositionDepthChart = {}
                    for Pos in Positions:
                        PositionDepthChart[Pos['PositionAbbreviation']] = {'StarterSpotsLeft': Pos['PositionCountPerAwardTeam'], 'BenchSpotsLeft': 3, 'Starters': [], 'Bench': [], 'PositionID': Pos['PositionID'] }
                    CreateDepthChart(CurrentWorld=CurrentWorld, TS=TG.TeamSeasonID, FullDepthChart = False, PositionDepthChart=PositionDepthChart.copy())

            if DoAudit:
                start = time.time()
                reset_queries()

            GameSim(game)

            if DoAudit:
                end = time.time()
                TimeElapsed = end - start
                A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 16, AuditDescription='GameSim', QueryCount = len(connection.queries))


        if ThisWeek.PhaseID.PhaseName in ['Regular Season', 'Conference Championships', 'Bowl Season']:
            CalculateRankings(CurrentSeason, CurrentWorld, CurrentWeek = ThisWeek)
            ChoosePlayersOfTheWeek(CurrentSeason, CurrentWorld, CurrentWeek = ThisWeek)

        if ThisWeek.RecruitingAllowed:
            FakeWeeklyRecruiting_New(WorldID, CurrentWeek = ThisWeek)
            print('would be doing recruting')

        if ThisWeek.PhaseID.PhaseName == 'Regular Season':
            #DO TOURNEY STUFF HERE
            CalculateConferenceRankings(CurrentSeason, CurrentWorld, CurrentWeek = ThisWeek)
            SelectBroadcast(CurrentSeason, CurrentWorld, CurrentWeek = ThisWeek)

            if ThisWeek.LastWeekInPhase:
                print('End regular season!!!')
                EndRegularSeason(WorldID, CurrentWeek = ThisWeek)

        elif ThisWeek.PhaseID.PhaseName == 'Conference Championships':
            #DO TOURNEY STUFF HERE
            CalculateConferenceRankings(CurrentSeason, CurrentWorld, CurrentWeek = ThisWeek)
            print('Creating bowls!!!')
            CreateBowls(WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Bowl Season' and ThisWeek.LastWeekInPhase:
            #DO TOURNEY STUFF HERE
            print('End Season')
            EndSeason(WorldID)

            RedirectHref = "/World/"+ str(WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Season Recap':
            #DO TOURNEY STUFF HERE
            print('Moving to StartCoachingCarousel')
            CreateNextLeagueSeason(CurrentSeason, WorldID)
            StartCoachingCarousel(CurrentSeason, WorldID)

        elif ThisWeek.WeekName == 'Coach Carousel':
            GraduateSeniors(CurrentSeason, WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Offseason Recruiting' and  NextWeek.LastWeekInPhase:
            PrepareForSigningDay(CurrentSeason,WorldID)

        elif NextWeek.WeekName == 'Training Results':
            TrainingCamps(CurrentSeason, WorldID)

        elif NextWeek.WeekName == 'Preseason':
            NavBarLinksStatus = NavBarLinks(Path = 'Overview', GroupName='World', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
            PrepForUserTeam = not NavBarLinksStatus['CanSim']
            PrepForSeason(CurrentSeason, CurrentWorld, ThisWeek, PrepForUserTeam=PrepForUserTeam)

        SetPlayerTeamSeasonTotals(CurrentWorld, CurrentSeason)
        AdvanceToNextWeek(WorldID, LeagueSeasonID=CurrentSeason, CurrentWeek = ThisWeek)
        GenerateHeadlines(CurrentSeason, WorldID, CurrentWeek = ThisWeek)

    return JsonResponse({'success':'value', 'redirect': RedirectHref})


def Page_Bracket(request, WorldID):


    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)
    SortedTeams = GetAllTeams(WorldID, LeagueSeasonID = CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    BracketDict = {'East': {}, 'West': {}, 'South': {}, 'Midwest': {}}

    BracketDict = []
    MaxRound = 1
    MaxPlayoffGameNumber = 0
    if TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(NationalChampion = True).count() > 0:
        TS = TeamSeason.objects.get(LeagueSeasonID = CurrentSeason, NationalChampion = True)
        BracketDict.append({'TeamGameID': 1, 'PlayoffgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': TS.PlayoffSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX})
    else:
        BracketDict.append({'TeamGameID': 1, 'PlayoffgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': 0, 'name': '', 'teamid': 0, 'logourl': '', 'color': ''})


    for G in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(PlayoffGameNumber__isnull=False).order_by('-PlayoffRoundID', '-PlayoffRegionID', '-GameID'):
        HomeTeam = G.HomeTeamID
        AwayTeam = G.AwayTeamID
        if G.PlayoffRoundID.PlayoffRoundNumber in [1,2]:
            print('In final four!',G)
        #
        if HomeTeam is not None:
            if G.PlayoffRoundID.PlayoffRoundNumber in [1,2]:
                BracketDict.append({'TeamGameID': ((G.PlayoffGameNumber) * 2), 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber, 'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': IfNull(G.AwayPoints,0), 'seed': AwayTeam.CurrentTeamSeason.PlayoffSeed, 'name': AwayTeam.Name, 'teamid': AwayTeam.TeamID, 'logourl': AwayTeam.LogoURL, 'color': AwayTeam.TeamColor_Primary_HEX, 'Region': G.PlayoffRegionID.PlayoffRegionName})
                BracketDict.append({'TeamGameID': ((G.PlayoffGameNumber) * 2)+1, 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber,'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': IfNull(G.HomePoints,0), 'seed': HomeTeam.CurrentTeamSeason.PlayoffSeed, 'name': HomeTeam.Name, 'teamid': HomeTeam.TeamID, 'logourl': HomeTeam.LogoURL, 'color': HomeTeam.TeamColor_Primary_HEX, 'Region': G.PlayoffRegionID.PlayoffRegionName})
            else:
                BracketDict.append({'TeamGameID': ((G.PlayoffGameNumber) * 2), 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber,'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': IfNull(G.HomePoints,0), 'seed': HomeTeam.CurrentTeamSeason.PlayoffSeed, 'name': HomeTeam.Name, 'teamid': HomeTeam.TeamID, 'logourl': HomeTeam.LogoURL, 'color': HomeTeam.TeamColor_Primary_HEX, 'Region': G.PlayoffRegionID.PlayoffRegionName})
                BracketDict.append({'TeamGameID': ((G.PlayoffGameNumber) * 2) + 1, 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber, 'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': IfNull(G.AwayPoints,0), 'seed': AwayTeam.CurrentTeamSeason.PlayoffSeed, 'name': AwayTeam.Name, 'teamid': AwayTeam.TeamID, 'logourl': AwayTeam.LogoURL, 'color': AwayTeam.TeamColor_Primary_HEX, 'Region': G.PlayoffRegionID.PlayoffRegionName})

            MaxPlayoffGameNumber = Max_Int(MaxPlayoffGameNumber,((G.PlayoffGameNumber) * 2) + 1 )
        else:
            BracketDict.append( {'TeamGameID': ((G.PlayoffGameNumber) * 2), 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber,'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': 0, 'Region': G.PlayoffRegionID.PlayoffRegionName})
            BracketDict.append( {'TeamGameID': ((G.PlayoffGameNumber) * 2) + 1, 'GameID': G.GameID, 'PlayoffgameNumber':G.PlayoffGameNumber, 'round': G.PlayoffRoundID.PlayoffRoundNumber, 'points': 0, 'Region': G.PlayoffRegionID.PlayoffRegionName})
        #BracketDict[0] = {'round': 7, 'seed': TS.PlayoffSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX}
    page = {'WorldID': WorldID}

    if TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(NationalChampion = True).count() > 0:
        TS = TeamSeason.objects.get(LeagueSeasonID = CurrentSeason, NationalChampion = True)
        BracketDict.append({'TeamGameID':  MaxPlayoffGameNumber + 1, 'PlayoffgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': TS.PlayoffSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX})



    BracketData = {'teams': [], 'results': [[]]}
    MaxPlayoffRoundNumber = max([u.PlayoffRoundID.PlayoffRoundNumber for u in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(PlayoffRoundID__isnull=False)])
    for G in [u for u in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(PlayoffRoundID__PlayoffRoundNumber=MaxPlayoffRoundNumber).order_by('-PlayoffRoundID', '-PlayoffRegionID')]:
        BracketData['teams'].append([str(G.HomeTeamSeed) + ' ' + G.HomeTeamID.TeamName, str(G.AwayTeamSeed) + ' ' + G.AwayTeamID.TeamName])

    for TR in PlayoffRound.objects.filter(PlayoffID__LeagueSeasonID = CurrentSeason).order_by('-PlayoffRoundNumber'):
        #BracketData['results'][0].append(str(TR.PlayoffRoundNumber) + 'games')
        ThisRoundData = []
        for G in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(PlayoffRoundID=TR).order_by('-PlayoffRoundID', '-PlayoffRegionID'):
            HTS = G.HomePoints
            ATS = G.AwayPoints

            UserData = {'GameID': G.GameID}
            FlippedUserData = {'GameID': G.GameID}

            if G.WasPlayed:
                UserData        = {'GameID': G.GameID, 'HomeColor': G.HomeTeamID.TeamColor_Primary_HEX, 'AwayColor': G.AwayTeamID.TeamColor_Primary_HEX}
                FlippedUserData = {'GameID': G.GameID, 'AwayColor': G.HomeTeamID.TeamColor_Primary_HEX, 'HomeColor': G.AwayTeamID.TeamColor_Primary_HEX}
            if TR.IsChampionshipRound:
                ThisRoundData.append([ATS, HTS, FlippedUserData])
            else:
                if TR.IsFinalFour:
                    ThisRoundData.append([HTS, ATS, FlippedUserData])
                    #ThisRoundData.append([HTS, ATS, UserData])
                else:
                    ThisRoundData.append([HTS, ATS, UserData])
        BracketData['results'][0].append(ThisRoundData)
    #print(Teams)
    BracketData = json.dumps(BracketData)
    context = {'page': page, 'BracketData':BracketData,'MaxRound':MaxRound, 'userTeam': UserTeam, 'Teams': Teams, 'CurrentWeek': GetCurrentWeek(WorldID) , 'allTeams': SortedTeams, 'bracketjson': BracketDict}
    print('CurrentWeek', context['CurrentWeek'])
    return render(request, 'HeadFootballCoach/Bracket.html', context)



def Page_ManageTeam(request):

    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam['TeamID']
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    TeamDict = GetAllTeams(WorldID, LeagueSeasonID = CurrentSeason)
    HomeTeamGames = Game.objects.filter(HomeTeamID__isnull=False).filter(HomeTeamID = TeamID)
    AwayTeamGames = Game.objects.filter(HomeTeamID__isnull=False).filter(AwayTeamID = TeamID)
    teamgames = HomeTeamGames | AwayTeamGames

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)

    Games = []
    for u in teamgames:
        HomeTeam = get_object_or_404(Team, TeamID = u.HomeTeamID)
        AwayTeam = get_object_or_404(Team, TeamID = u.AwayTeamID)

        ThisGame = u.ReturnAsDict()

        if u.HomeTeamID == TeamID:
            ThisGame['VsString'] = 'vs ' + IfNull(ThisGame['AwayTeamRankDisplayString'] ,AwayTeam.RankDisplayString)+' ' + AwayTeam.TeamName
            Opponent = AwayTeam.ReturnAsDict()
            ThisGame['OpponentLogoURL'] = Opponent['LogoURL']
        else:
            ThisGame['VsString'] = '@ ' +  IfNull(ThisGame['HomeTeamRankDisplayString'],HomeTeam.RankDisplayString)  +' ' + HomeTeam.TeamName
            Opponent = HomeTeam.ReturnAsDict()
            ThisGame['OpponentLogoURL'] = Opponent['LogoURL']


        if u.WasPlayed == 1:
            if u.HomeTeamID == TeamID:
                ThisGame['GameDisplay'] =  str(u.HomePoints) +'-'+str(u.AwayPoints)
                if u.HomePoints > u.AwayPoints:
                    ThisGame['GameResultLetter'] = 'W'
                else:
                    ThisGame['GameResultLetter'] = 'L'
            else:
                ThisGame['GameDisplay'] =  str(u.AwayPoints) +'-'+str(u.HomePoints)
                if u.HomePoints < u.AwayPoints:
                    ThisGame['GameResultLetter'] = 'W'
                else:
                    ThisGame['GameResultLetter'] = 'L'
        else:
            ThisGame['GameDisplay'] = u.WeekID.WeekName

        Games.append(ThisGame)

    StateCount = {}

    TeamPlayers = PlayerTeamSeason.objects.filter(TeamID = TeamID).filter(LeagueSeasonID = CurrentSeason)
    Players = [u.PlayerID.ReturnAsDict() for u in TeamPlayers]
    for player in Players:
        PlayerSkill = PlayerTeamSeasonSkill.objects.get(PlayerID = player['PlayerID'],LeagueSeasonID = CurrentSeason)
        SkillDict = PlayerSkill.ReturnAsDict()
        PTS = PlayerTeamSeason.objects.get(PlayerID = player['PlayerID'], LeagueSeasonID = CurrentSeason)
        for skill in SkillDict:
            player[skill] = SkillDict[skill]


        #PlayerStats = PlayerGameStat.objects.filter(PlayerID = player['PlayerID']).filter(GameID__SeasonID = CurrentSeason)
        PlayerStats = PlayerGameStat.objects.filter(PlayerTeamSeasonID = PTS)
        PlayerStats = [u.ReturnAsDict() for u in PlayerStats]

        if player['CityID'].StateID.StateName not in StateCount:
            StateCount[player['CityID'].StateID.StateName] = 0
        StateCount[player['CityID'].StateID.StateName] +=1

        SeasonStats = {}
        player['GamesPlayed'] = 0

        for G in PlayerStats:
            GameObject = G['GameID']
            SeasonOfGame = GameObject.SeasonID


            player['GamesPlayed'] +=1

            for Stat in G:
                if Stat in ['PlayerID', 'GameID']:
                    continue
                if Stat not in player:
                    player[Stat] = 0
                player[Stat] += G[Stat]
        if player['GamesPlayed'] > 0:
            player['PPG'] = round(player['Points'] / player['GamesPlayed'],1)
            player['RPG'] = round(player['Rebounds'] / player['GamesPlayed'],1)
            player['APG'] = round(player['Assists'] / player['GamesPlayed'],1)
            player['BPG'] = round(player['Blocks'] / player['GamesPlayed'],1)
            player['MPG'] = round(player['Minutes'] / player['GamesPlayed'],1)

# needs work - need to join through from Players
    # PlayerStats = PlayerGameStat.objects.filter(PlayerID = PlayerQuerySet).filter(GameID__SeasonID = CurrentSeason)
    #
    # PlayerStats = [u.ReturnAsDict() for u in PlayerStats]
    #
    # for Game in PlayerStats:
    #     for Stat in Game:
    #         if Stat not in PlayerDict:
    #             PlayerDict[Stat] = 0
    #         PlayerDict[Stat] += Game[Stat]


    PlayerState = []
    MaxState = Max_Int([StateCount[u] for u in StateCount])
    MinState = Min_Int([StateCount[u] for u in StateCount])
    for s in StateCount:
        StateColor = str(hex(255 - int(255 * StateCount[s] / MaxState))[2:3]) + 'f0'
        print(s, StateCount[s], StateColor )
        if StateCount[s] == MinState:
            StateColor = 'ff0'
        PlayerState.append({'StateName': s, 'PlayerCount': StateCount[s], 'StateColor': StateColor})


    ThisTeam = Team.objects.get(TeamID = TeamID)#.values('ConferenceName')
    ThisTeamConference = ThisTeam.CurrentTeamSeason.DivisionSeasonID.ConferenceSeasonID.ConferenceID.ConferenceName

#Get Current Date
    CurrentWeek = GetCurrentWeek(CurrentWorld)

    allTeams = GetAllTeams(WorldID, LeagueSeasonID = CurrentSeason)
    allTeams = sorted(allTeams, key = lambda k: k['TeamName'])

    Record = TeamRecord(TeamID)
    team = Team.objects.get(WorldID=WorldID, TeamID = TeamID)


    context = {'page': page, 'conferenceStandings': ConferenceRanking, 'playerState': PlayerState, 'userTeam': UserTeam, 'team': team, 'games':Games, 'CurrentWeek': CurrentWeek, 'players':Players, 'allTeams': allTeams, 'record': Record}

    return render(request, 'HeadFootballCoach/ManageTeam.html', context)

def Page_Coach(request, CoachID):

    context = {}
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)

    C = Coach.objects.get(CoachID = CoachID)
    context['Coach'] =  C

    coachTeam = CoachTeamSeason.objects.get(CoachID = CoachID, TeamSeasonID__SeasonID = CurrentSeason).TeamSeasonID
    context['coachTeam'] = coachTeam

    currentCoachTeamSeason = CoachTeamSeason.objects.get(CoachID = CoachID, TeamSeasonID__SeasonID = CurrentSeason)
    context['currentCoachTeamSeason'] = currentCoachTeamSeason



    CTS = CoachTeamSeason.objects.filter(CoachID = CoachID)

    CoachCareerTotals = {'YearsExperience': CTS.count()}
    context['CoachCareerTotals'] = CoachCareerTotals
    CurrentWeek = GetCurrentWeek(WorldID)
    context['CurrentWeek'] = CurrentWeek

    return render(request, 'HeadFootballCoach/Coach.html', context)

def Page_Recruiting(request, WorldID, SeasonStartYear = None):

    DoAudit = False
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    if DoAudit:
        start = time.time()

    if SeasonStartYear is None:
        CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    else:
        CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, SeasonStartYear = SeasonStartYear)
    CurrentWeek = GetCurrentWeek(WorldID)
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    UserTeamSeason = UserTeam.CurrentTeamSeason
    TeamID = UserTeam
    TS = TeamSeason.objects.get(WorldID = WorldID, LeagueSeasonID = CurrentSeason, TeamID = TeamID)
    page = {'PageTitle': 'College HeadFootballCoach - Recruiting', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['NavBarLinks'] = NavBarLinks(Path = 'Recruiting', GroupName='Team', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}
    context['Players'] = []

    #print(context)

    AllTeamSeasons = CurrentSeason.teamseason_set.filter(TeamID__isnull = False).values('TeamID', 'TeamID__TeamName', 'TeamID__TeamLogoURL', 'RecruitingClassRank').order_by('RecruitingClassRank').annotate(
        RecruitsSigned5 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=5))),
        RecruitsSigned4 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=4))),
        RecruitsSigned3 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=3))),
        RecruitsSigned2 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=2))),
        RecruitsSigned1 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=1))),
        RecruitsSigned = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True) )),

        RecruitsSigned5Style = Case(
            When(RecruitsSigned5__gte = 3, then=Value('font-weight:800;')),
            When(RecruitsSigned5__gte = 1, then=Value('opacity: .75;')),
            default=Value('opacity: .2;'),
            output_field=CharField()
        ),
        RecruitsSigned4Style = Case(
            When(RecruitsSigned4__gte = 3, then=Value('font-weight:800;')),
            When(RecruitsSigned4__gte = 1, then=Value('opacity: .75;')),
            default=Value('opacity: .2;'),
            output_field=CharField()
        ),
        RecruitsSigned3Style = Case(
            When(RecruitsSigned3__gte = 3, then=Value('font-weight:800;')),
            When(RecruitsSigned3__gte = 1, then=Value('opacity: .75;')),
            default=Value('opacity: .2;'),
            output_field=CharField()
        ),
        RecruitsSigned2Style = Case(
            When(RecruitsSigned2__gte = 3, then=Value('font-weight:800;')),
            When(RecruitsSigned2__gte = 1, then=Value('opacity: .75;')),
            default=Value('opacity: .2;'),
            output_field=CharField()
        ),
        RecruitsSigned1Style = Case(
            When(RecruitsSigned1__gte = 3, then=Value('font-weight:800;')),
            When(RecruitsSigned1__gte = 1, then=Value('opacity: .75;')),
            default=Value('opacity: .2;'),
            output_field=CharField()
        ),
        RecruitingValue = (5 * F('RecruitsSigned5')) + (4 * F('RecruitsSigned4')) + (3 * F('RecruitsSigned3')) + (2 * F('RecruitsSigned2')) + (1 * F('RecruitsSigned1')) ,
        RecruitingRank = Window(
            expression=RowNumber(),
            order_by=F("RecruitingValue").desc(),
        )
    ).order_by('RecruitingRank')
    #.values('TeamID', 'RecruitingClassRank', )
    print('AllTeamSeasons', AllTeamSeasons.query)
    RecruitingRankings = []

    RecruitingRankings = AllTeamSeasons

    Players = list(Player.objects.filter(WorldID = WorldID).filter(IsRecruit = True).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = 1).filter(playerteamseason__recruitteamseason__TeamSeasonID__TeamID__IsUserTeam = True).values('PlayerID','playerteamseason__ClassID__ClassAbbreviation', 'playerteamseason__recruitteamseason__IsActivelyRecruiting', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'PositionID__PositionSortOrder', 'playerteamseason__recruitteamseason__Scouted_Overall', 'playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'RecruitingPointsNeeded', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'RecruitingStars', 'RecruitSigned', 'Recruiting_NationalRank', 'Recruiting_NationalPositionalRank', 'Recruiting_StateRank', 'CityID__CityName', 'CityID__StateID__StateAbbreviation', 'Height', 'playerteamseason__recruitteamseason__Scouted_Strength_Rating', 'playerteamseason__recruitteamseason__Scouted_Agility_Rating', 'playerteamseason__recruitteamseason__Scouted_Speed_Rating', 'playerteamseason__recruitteamseason__Scouted_Acceleration_Rating', 'playerteamseason__recruitteamseason__Scouted_Stamina_Rating', 'playerteamseason__recruitteamseason__Scouted_Awareness_Rating', 'playerteamseason__recruitteamseason__Scouted_Jumping_Rating', 'playerteamseason__recruitteamseason__Scouted_Injury_Rating', 'playerteamseason__recruitteamseason__Scouted_ThrowPower_Rating', 'playerteamseason__recruitteamseason__Scouted_ShortThrowAccuracy_Rating', 'playerteamseason__recruitteamseason__Scouted_MediumThrowAccuracy_Rating', 'playerteamseason__recruitteamseason__Scouted_DeepThrowAccuracy_Rating', 'playerteamseason__recruitteamseason__Scouted_ThrowOnRun_Rating', 'playerteamseason__recruitteamseason__Scouted_ThrowUnderPressure_Rating', 'playerteamseason__recruitteamseason__Scouted_PlayAction_Rating', 'playerteamseason__recruitteamseason__Scouted_Elusiveness_Rating', 'playerteamseason__recruitteamseason__Scouted_BallCarrierVision_Rating', 'playerteamseason__recruitteamseason__Scouted_JukeMove_Rating', 'playerteamseason__recruitteamseason__Scouted_BreakTackle_Rating', 'playerteamseason__recruitteamseason__Scouted_Carrying_Rating', 'playerteamseason__recruitteamseason__Scouted_Catching_Rating', 'playerteamseason__recruitteamseason__Scouted_CatchInTraffic_Rating', 'playerteamseason__recruitteamseason__Scouted_RouteRunning_Rating', 'playerteamseason__recruitteamseason__Scouted_Release_Rating', 'playerteamseason__recruitteamseason__Scouted_HitPower_Rating', 'playerteamseason__recruitteamseason__Scouted_Tackle_Rating', 'playerteamseason__recruitteamseason__Scouted_PassRush_Rating', 'playerteamseason__recruitteamseason__Scouted_BlockShedding_Rating', 'playerteamseason__recruitteamseason__Scouted_Pursuit_Rating', 'playerteamseason__recruitteamseason__Scouted_PlayRecognition_Rating', 'playerteamseason__recruitteamseason__Scouted_ManCoverage_Rating', 'playerteamseason__recruitteamseason__Scouted_ZoneCoverage_Rating', 'playerteamseason__recruitteamseason__Scouted_Press_Rating', 'playerteamseason__recruitteamseason__Scouted_PassBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_RunBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_ImpactBlock_Rating', 'playerteamseason__recruitteamseason__Scouted_KickPower_Rating', 'playerteamseason__recruitteamseason__Scouted_KickAccuracy_Rating', 'playerteamseason__recruitteamseason__Scouted_KickReturn_Rating', 'playerteamseason__recruitteamseason__InterestLevel', 'playerteamseason__recruitteamseason__ScoutingFuzz', 'Recruiting_40Time', 'Recruiting_BenchPressReps', 'Recruiting_VerticalJump').annotate(
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        HeightFeet = (F('Height') / 12),
        HeightInches = (F('Height') % 12),
        HeightFormatted = Concat('HeightFeet', Value('\''), 'HeightInches', Value('"'), output_field=CharField()),
        WeightFormatted = Concat(F('Weight'), Value(' lbs'), output_field=CharField()),
        Intelligence = Value('A', output_field=CharField()),
        Athleticism = Value('A', output_field=CharField()),
        Passing = Value('A', output_field=CharField()),
        MaxInterestLevel = Subquery(RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID =OuterRef('pk')).values('PlayerTeamSeasonID__PlayerID').annotate(MaxInterestLevel=Max('InterestLevel')).values('MaxInterestLevel')),#Max('recruitteamseason__InterestLevel'),
        RecruitingPointsPercent = (Round(F('MaxInterestLevel')* 100.0 / F('RecruitingPointsNeeded'),1)),


    ).order_by('Recruiting_NationalRank'))


    SavedPlayers = []
    for P in Players:

        SignedTeam = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID_id = P['PlayerID']).values('TeamSeasonID__TeamID__TeamLogoURL', 'InterestLevel', 'Signed', 'PlayerTeamSeasonID__PlayerID').annotate(
            TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID'), output_field=CharField()),
        ).order_by('-Signed', '-InterestLevel')[0:3]

        P['RecruitingTeams'] = []
        for T in SignedTeam:
            P['RecruitingTeams'].append(T)

        if P['playerteamseason__recruitteamseason__IsActivelyRecruiting']:
            SavedPlayers.append(P)



    TeamNeeds = TeamSeasonPosition.objects.filter(TeamSeasonID = UserTeamSeason).exclude(Q(PositionID__PositionAbbreviation = 'PR') | Q(PositionID__PositionAbbreviation = 'KR')).select_related('PositionID').select_related('TeamSeasonID__TeamID').annotate(
        CommitCount = Coalesce(Subquery(RecruitTeamSeason.objects.filter(TeamSeasonID = OuterRef('TeamSeasonID')).filter(PlayerTeamSeasonID__PlayerID__PositionID = OuterRef('PositionID')).filter(Signed = True).values('TeamSeasonID').annotate(SignedCount = Count('RecruitTeamSeasonID')).values('SignedCount')), 0),
        Year1PlayersNeeded_Raw = F('MinimumPlayerCount') - F('FreshmanPlayerCount') - F('SophomorePlayerCount') - F('JuniorPlayerCount') - F('CommitCount'),
        Year1PlayersOnRoster = F('FreshmanPlayerCount') + F('SophomorePlayerCount') + F('JuniorPlayerCount'),
        Year1PlayersNeeded = Case(
            When(Year1PlayersNeeded_Raw__lt = 0, then=Value(0)),
            default = F('Year1PlayersNeeded_Raw'),
            output_field = IntegerField()
        ),
    ).order_by('PositionID__PositionSortOrder')


    TeamNeedsTotals = TeamNeeds.aggregate(
        Sum('Year1PlayersNeeded'),
        Sum('MinimumPlayerCount'),
        Sum('NeededPlayerCount'),
        Sum('CurrentPlayerCount'),
        Sum('FreshmanPlayerCount'),
        Sum('SophomorePlayerCount'),
        Sum('JuniorPlayerCount'),
        Sum('SeniorPlayerCount'),
        Sum('CommitCount'),
        Sum('Year1PlayersOnRoster')
    )


    context['Players'] = Players
    context['SavedPlayers'] = SavedPlayers
    context['TeamNeeds'] = TeamNeeds
    context['TeamNeedsTotals'] = TeamNeedsTotals
    context['RecruitingRankings'] = RecruitingRankings

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 4, AuditDescription='Page_Recruiting', QueryCount = len(connection.queries))


    #print(context)
    return render(request, 'HeadFootballCoach/Recruiting.html', context)



def Page_CoachCarousel(request, WorldID):

    DoAudit = False
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    if DoAudit:
        start = time.time()

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    NextSeason = CurrentSeason.NextLeagueSeason
    CurrentWeek = GetCurrentWeek(WorldID)
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    TS = TeamSeason.objects.get(WorldID = WorldID, LeagueSeasonID = CurrentSeason, TeamID = TeamID)
    page = {'PageTitle': 'College HeadFootballCoach - Recruiting', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['NavBarLinks'] = NavBarLinks(Path = 'View Coach Carousel', GroupName='Action', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}


    AllCoaches = Coach.objects.filter(coachteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).values('coachteamseason__TeamSeasonID__TeamID', 'coachteamseason__TeamSeasonID__TeamID__TeamName', 'coachteamseason__TeamSeasonID__TeamID__TeamLogoURL', 'coachteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'coachteamseason__TeamSeasonID__TeamPrestige', 'coachteamseason__CoachPositionID__CoachPositionAbbreviation', 'coachteamseason__TeamSeasonID__Wins', 'coachteamseason__TeamSeasonID__Losses').annotate(
        CoachHref = Concat(Value('/World/'), Value(WorldID), Value('/Coach/'), F('CoachID'), output_field=CharField()),
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('coachteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        TeamRecord = Concat(F('coachteamseason__TeamSeasonID__Wins'), Value('-'), F('coachteamseason__TeamSeasonID__Losses'), output_field=CharField()),
        CoachName = Concat(F('CoachFirstName'), Value(' '), F('CoachLastName'), output_field=CharField())
    )

    FiredCoaches = AllCoaches.filter(coachteamseason__FiredAfterSeason = True)
    RetiredCoaches = AllCoaches.filter(coachteamseason__RetiredAfterSeason = True)

    OpenJobs = []

    FilledJobs = list(TeamSeason.objects.filter(TeamID__isnull = False).filter(LeagueSeasonID = NextSeason).values('TeamID', 'coachteamseason__CoachPositionID__CoachPositionAbbreviation', 'coachteamseason__CoachTeamSeasonID'))
    AllTeams = list(Team.objects.filter(WorldID = CurrentWorld).filter(teamseason__LeagueSeasonID__IsCurrent = True).values('TeamID', 'TeamName', 'TeamLogoURL', 'TeamColor_Primary_HEX', 'teamseason__TeamPrestige', 'teamseason__Wins').annotate(
        TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
        TeamRecord = Concat(F('teamseason__Wins'), Value('-'), F('teamseason__Losses'), output_field=CharField())
    ))
    CoachPositions = list(CoachPosition.objects.filter(Q(CoachPositionAbbreviation = 'HC') | Q(CoachPositionAbbreviation = 'OC') | Q(CoachPositionAbbreviation = 'DC') | Q(CoachPositionAbbreviation = 'STC') ).values('CoachPositionAbbreviation', 'CoachPositionSortOrder'))
    print('CoachPositions', CoachPositions)
    TeamCoachMap = {}
    CoachPositionMap = {}
    for T in AllTeams:
        TeamID = T['TeamID']
        TeamCoachMap[TeamID] = T
        TeamCoachMap[TeamID]['TeamName'] = T['TeamName']
        TeamCoachMap[TeamID]['CoachingPositions'] = {}
        TeamCoachMap[TeamID]['EmptyJobs'] = 0
        for Pos in CoachPositions:
            print("Pos['CoachPositionAbbreviation']", Pos['CoachPositionAbbreviation'])
            TeamCoachMap[TeamID]['CoachingPositions'][Pos['CoachPositionAbbreviation']] = None


            if Pos['CoachPositionAbbreviation'] not in CoachPositionMap:
                print('Adding ', Pos['CoachPositionAbbreviation'])
                CoachPositionMap[Pos['CoachPositionAbbreviation']] = {'CoachPositionSortOrder': Pos['CoachPositionSortOrder']}


    print()
    for TeamCoachPosition in FilledJobs:
        T = TeamCoachPosition['TeamID']
        Pos = TeamCoachPosition['coachteamseason__CoachPositionID__CoachPositionAbbreviation']
        CTS = TeamCoachPosition['coachteamseason__CoachTeamSeasonID']

        TeamCoachMap[T]['CoachingPositions'][Pos]  = CTS

    for T in TeamCoachMap:
        print('T', T, TeamCoachMap[T])

        for Pos in TeamCoachMap[T]['CoachingPositions']:
            if TeamCoachMap[T]['CoachingPositions'][Pos] is None and Pos is not None:
                JobPosting = {'TeamName': TeamCoachMap[T]['TeamName'], 'TeamHref': TeamCoachMap[T]['TeamHref'], 'TeamLogoURL': TeamCoachMap[T]['TeamLogoURL'], 'TeamPrestige': TeamCoachMap[T]['teamseason__TeamPrestige'], 'Position': Pos, 'Wins': TeamCoachMap[T]['teamseason__Wins'], 'CoachPositionSortOrder': CoachPositionMap[Pos]['CoachPositionSortOrder']}
                JobPosting['TeamRecord'] = TeamCoachMap[T]['TeamRecord']
                OpenJobs.append(JobPosting)
                TeamCoachMap[T]['EmptyJobs'] +=1
        print('CoachPositions-', T, TeamCoachMap[T])

    OpenJobs = sorted(OpenJobs, key=lambda T: (T['CoachPositionSortOrder'],-1*T['TeamPrestige'], -1*T['Wins'] ), reverse=False)
    #OpenJobs = OpenJobs[0:5]

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Page_CoachCarousel')

    context['OpenJobs'] = OpenJobs
    context['FiredCoaches'] = FiredCoaches
    context['RetiredCoaches'] = RetiredCoaches

    print('RetiredCoaches', RetiredCoaches)
    print('FiredCoaches', FiredCoaches)
    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['CurrentWeek'] = CurrentWeek
    #print(context)
    return render(request, 'HeadFootballCoach/CoachCarousel.html', context)


def Page_PlayerDepartures(request, WorldID):

    DoAudit = False
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    if DoAudit:
        start = time.time()

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    NextSeason = CurrentSeason.NextLeagueSeason
    CurrentWeek = GetCurrentWeek(WorldID)
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    TS = TeamSeason.objects.get(WorldID = WorldID, LeagueSeasonID = CurrentSeason, TeamID = TeamID)
    page = {'PageTitle': 'College HeadFootballCoach - Recruiting', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    page['NavBarLinks'] = NavBarLinks(Path = 'View Player Departures', GroupName='Action', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}

    Filters = {'WorldID': WorldID, 'playerteamseason__LeavingTeamAfterSeason': True}

    Players = Common_PlayerStats(Filters)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Page_PlayerDepartures')

    context['recentGames'] = GetRecentGamesForScoreboard(CurrentWorld, CurrentSeason = CurrentSeason, CurrentWeek = CurrentWeek)
    context['CurrentWeek'] = CurrentWeek
    context['Players'] = Players
    #print(context)
    return render(request, 'HeadFootballCoach/PlayerDepartures.html', context)


def Page_Season(request, WorldID, SeasonStartYear):

    ThisSeason = LeagueSeason.objects.get(WorldID = WorldID, SeasonStartYear = SeasonStartYear)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = GetCurrentWeek(WorldID)
    HistoricalWeek = GetHistoricalWeek(CurrentWorld, CurrentSeason)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    context = {}

    AllAmericans = []
    if CurrentWeek.PhaseID.PhaseName == 'Bowl Season':
        print('It is the preseason!')
        AllAmericans = []
        AllAwards = PlayerTeamSeasonAward.objects.filter(IsSeasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('PositionID__PositionSortOrder')
        for Conf in [None] + [ u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')]:
            print('AllAmericans for ', Conf)
            ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
            if Conf is None:
                ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-season-award-conference-tab', 'Teams' : []}
                PTSA = AllAwards.filter(IsNationalAward = True)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                    T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team': PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            else:
                ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ShowConference': 'season-allamerican-conf-hide', 'ConferenceSelected': '', 'Teams' : []}
                PTSA = AllAwards.filter(IsConferenceAward = True).filter(ConferenceID = Conf)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1}]:
                    T = 'FirstTeam' if TD['IsFirstTeam'] == 1 else 'SecondTeam'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team':PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            AllAmericans.append(ConfDict)


    page = {'PageTitle': 'College HeadFootballCoach - '+ str(SeasonStartYear) +' Season', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'AllAmericans': AllAmericans}
    return render(request, 'HeadFootballCoach/Season.html', context)


def StreamingYield():

    for u in range(1000):
        yield str(u)+','
