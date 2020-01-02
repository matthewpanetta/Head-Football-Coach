from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse, JsonResponse
from django.template import loader
from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value, Window
from django.db.models.functions import Length, Concat
from .models import Audit, League, TeamGame,Week,Phase, PlayerTeamSeasonDepthChart, TeamSeasonWeekRank, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_PlayoffRound,PlayoffRound, NameList, User, Region, State, City,World, Headline, Playoff, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason
from datetime import timedelta, date
import random
import numpy
from .resources import CreateBowls, EndSeason, PlayerDeparture,NewSeasonCutover, InitializeLeagueSeason, BeginOffseason, CreateRecruitingClass, round_robin, CreateSchedule, CreatePlayers, ConfigureLineups, CreateCoaches, CreateTeamSeasons, EndRegularSeason
from .scripts.rankings import     CalculateConferenceRankings,CalculateRankings, SelectBroadcast
from .utilities import SecondsToMinutes,MergeDicts,GetValuesOfSingleObjectDict, UniqueFromQuerySet, IfNull, IfBlank, GetValuesOfObject, GetValuesOfSingleObject
from .scripts.GameSim import GameSim
from .scripts.Recruiting import WeeklyRecruiting, FakeWeeklyRecruiting
from .scripts.SeasonAwards import ChoosePlayersOfTheWeek
from .scripts.DepthChart import CreateDepthChart
import math
import json
from .scripts.import_csv import LoadData, ExtractData, LoadGameStructures
from .scripts.serializers import TeamSerializer,TeamSeasonSerializer
from django.core import serializers
import time

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

    return Team.objects.get(WorldID = WorldID, IsUserTeam = True)



def GetAllTeams(WorldID, SortType='National', GroupingName=None, GroupingID=None):

    TeamDictStarter = Team.objects.filter(WorldID = WorldID)

    if SortType == 'National':
        return sorted(TeamDictStarter, key = lambda k: k.CurrentTeamSeason.NationalRank, reverse = False)
    elif SortType == 'Conference':
        if GroupingName is not None:
            TeamDictStarter = TeamDictStarter.filter(ConferenceID__ConferenceName = GroupingName)
        else:
            TeamDictStarter = TeamDictStarter.filter(ConferenceID = GroupingID)
        return sorted(TeamDictStarter, key = lambda k: k.CurrentTeamSeason.ConferenceRank, reverse = False)

    return None




def CurrentDate(WorldID):

    if isinstance(WorldID, int):
        WorldID = World.objects.filter(WorldID = WorldID).first()

    CurrentDate = WorldID.calendar_set.filter(IsCurrent = 1).first()
    #CurrentDate = Calendar.objects.get(WorldID = WorldID, IsCurrent = 1)

    return CurrentDate

def GetCurrentWeek(WorldID):

    if isinstance(WorldID, int):
        WorldID = World.objects.filter(WorldID = WorldID).first()

    CurrentWeek = WorldID.week_set.filter(IsCurrent = 1).first()

    return CurrentWeek



def POST_PickTeam(request, WorldID):


    TeamName = request.POST['TeamName']
    print('Team chosen:', TeamName)

    CurrentWorld = World.objects.get(WorldID = WorldID)

    ChosenTeam = Team.objects.get(WorldID = WorldID, TeamName = TeamName)
    ChosenTeam.IsUserTeam = True
    ChosenTeam.save()

    for L in League.objects.filter(WorldID = WorldID):
        InitializeLeagueSeason(CurrentWorld, L, True) #True for IsFirstLeagueSeason


    return JsonResponse({'success':'value'})



def POST_SetPlayerFaceJson(request, WorldID, PlayerID):

    CurrentWorld = World.objects.get(WorldID = WorldID)
    PlayerToChange = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerID=PlayerID).first()

    PlayerFaceJson = request.POST['PlayerFaceJson']

    if PlayerToChange.PlayerFaceJson == '':
        PlayerToChange.PlayerFaceJson = PlayerFaceJson
        PlayerToChange.save()


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


    NCAALeague = League(WorldID = w, LeagueName = 'NCAA', LeagueAbbreviation = 'NCAA', LeaguePrestige = 100, GameStructureID = NCAAGameStructureID,ConferenceList=ConferenceList, LeagueType = '3', LeagueLogoURL = 'TODO')
    NCAALeague.save()

    LoadData(w, NCAALeague)

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


def NextWeek(WorldID):

    ThisWeek = Week.objects.get(WorldID=WorldID, IsCurrent=1)
    ThisWeek.IsCurrent = 0
    ThisWeek.save()
    NextWeek = Week.objects.get(WorldID=WorldID, WeekNumber = ThisWeek.WeekNumber + 1)
    NextWeek.IsCurrent = 1
    NextWeek.save()


def Page_Audit(request):

    AuditGroups = Audit.objects.exclude(AuditVersion = 0).values('AuditDescription', 'AuditVersion').order_by('AuditDescription', 'AuditVersion').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), LastAuditTime=Max('AuditTime'))

    #AuditGroups = sorted(AuditGroups, key=lambda k: -1 * k['AverageTimeElapsed'])
    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)


def Page_Teams(request, WorldID):
    page = {'PageTitle': 'College Football Teams', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    TeamList = Team.objects.filter(WorldID = WorldID)

    TeamList = sorted(TeamList, key=lambda T: (T.HistoricalTeamWins, T.HistoricalTeamWins-T.HistoricalTeamLosses), reverse=True)
    context = {'TeamList': TeamList}
    context['page'] = page

    return render(request, 'HeadFootballCoach/Teams.html', context)


def Page_Top25(request, WorldID):

    TeamList = Team.objects.filter(WorldID = WorldID)

    context = {'': None}

    return render(request, 'HeadFootballCoach/Teams.html', context)


def Page_TeamHistory(request, WorldID, TeamID):

    AuditGroups = Audit.objects.values('ManualAuditKey').order_by('ManualAuditKey').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), AuditNote=Max('ManualAuditNote'))

    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)

def Page_Conference(request, WorldID, ConferenceID):
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    ThisConference = CurrentWorld.conference_set.filter(ConferenceID = ConferenceID).first()

    OpposingConferences = []
    for OppConf in CurrentWorld.conference_set.all():#.exclude(ConferenceID = ConferenceID):
        OppConfDict = OppConf.__dict__
        OppConfDict['Wins'] = TeamSeason.objects.filter(TeamID__ConferenceID = OppConf).aggregate(Sum('Wins'))['Wins__sum']
        OppConfDict['Losses'] = TeamSeason.objects.filter(TeamID__ConferenceID = OppConf).aggregate(Sum('Losses'))['Losses__sum']

        OppConfDict['VsWins'] = 0
        OppConfDict['VsLosses'] = 0


        for TG in TeamGame.objects.filter(TeamSeasonID__TeamID__ConferenceID = OppConf).filter(GameID__WasPlayed = True):
            if TG.OpposingTeamGame.TeamSeasonID.TeamID.ConferenceID == ThisConference:
                if TG.IsWinningTeam == True:
                    OppConfDict['VsLosses'] +=1
                else:
                    OppConfDict['VsWins'] +=1


        if OppConf == ThisConference:
            OppConfDict['BoldConf'] = 'bold'
        OpposingConferences.append(OppConfDict)


    page = {'PageTitle': ThisConference.ConferenceName, 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    TeamsInConference = ThisConference.team_set.all()
    ConferenceStandings = ThisConference.ConferenceStandings()

    context = {'page': page}
    context['Conference'] = ThisConference
    context['ConferenceStandings'] = ConferenceStandings
    context['OpposingConferences'] = OpposingConferences
    context['CurrentWeek'] = GetCurrentWeek(CurrentWorld)
    context['ConferenceAwards'] = PlayerTeamSeasonAward.objects.filter(IsWeekAward = True).filter(WorldID = CurrentWorld).filter(ConferenceID = ThisConference).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('WeekID', 'PositionGroupID')

    return render(request, 'HeadFootballCoach/Conference.html', context)

def Page_Conferences(request, WorldID):

    AuditGroups = Audit.objects.values('ManualAuditKey').order_by('ManualAuditKey').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), AuditNote=Max('ManualAuditNote'))

    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)


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
    InDeepTesting = False

    if InTesting or InDeepTesting:
        World.objects.all().delete()
        #Region.objects.all().delete()
        #System_PlayoffRound.objects.all().delete()
        #NameList.objects.all().delete()

    WorldFields = ['WorldID','CurrentWeek']
    World__UserTeamFields = ['LogoURL', 'TeamNameAndRecord']

    ExtractData()

    if User.objects.all().count() == 0:
        U = User.objects.create()
        U.save()


    Worlds=[]
    for W in World.objects.filter(IsActive = True):

        WorldValues = GetValuesOfSingleObject(W, WorldFields)
        WorldUserTeamValues = GetValuesOfSingleObject(W.UserTeam, World__UserTeamFields)

        ThisWorld = MergeDicts([WorldValues, WorldUserTeamValues])

        Worlds.append(ThisWorld)

    if InTesting:
        NumConferencesToInclude = 4
    elif InDeepTesting:
        NumConferencesToInclude = 2
    else:
        NumConferencesToInclude = 5
    PossibleConferences = [
         {'ConferenceDisplayName': 'Big 12', 'ConferenceFormValue': 'Big 12 Conference'},
         {'ConferenceDisplayName': 'ACC', 'ConferenceFormValue': 'Atlantic Coast Conference'},
         {'ConferenceDisplayName': 'SEC', 'ConferenceFormValue': 'Southeastern Conference'},
         {'ConferenceDisplayName': 'Pac-12', 'ConferenceFormValue': 'Pac-12 Conference'},
         #{'ConferenceDisplayName': 'SC1', 'ConferenceFormValue': 'Sample Conference 1'},
         #{'ConferenceDisplayName': 'SC2', 'ConferenceFormValue': 'Sample Conference 2'},
         {'ConferenceDisplayName': 'American', 'ConferenceFormValue': 'American Athletic Conference'},
         {'ConferenceDisplayName': 'Mountain West', 'ConferenceFormValue': 'Mountain West Conference'},
         {'ConferenceDisplayName': 'Big 10', 'ConferenceFormValue': 'Big Ten Conference'},
    ]

    ConfList = []
    for u in range(0,NumConferencesToInclude):
        ConfList.append(random.choice([k for k in PossibleConferences if k not in ConfList]))


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
    DoAudit = True
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )

    if DoAudit:
        start = time.time()

    #PlayerTeamSeasonDepthChart.objects.all().delete()

    AllTeams = TeamSeasonWeekRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = 1).filter(NationalRank__lte = 25).order_by('NationalRank').select_related('TeamSeasonID__TeamID').values('TeamSeasonID__TeamID','TeamSeasonID__NationalChampion','TeamSeasonID__TeamID__TeamName','TeamSeasonID__TeamID__TeamNickname', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__Wins', 'TeamSeasonID__Losses', 'NationalRank', 'NationalRankDelta').annotate(
        NationalRankDeltaAbs=Func(F('NationalRankDelta'), function='ABS'),
        AdditionalDisplayLogo= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('/static/img/TournamentIcons/NationalChampionTrophy.png')),
            default=(Value('')),
            output_field=CharField()
        ),
        AdditionalDisplayLogoClass= Case(
            When(TeamSeasonID__NationalChampion=True, then=Value('')),
            default=(Value('w3-hide')),
            output_field=CharField()
        ),
    )


    GameList = Game.objects.filter(WorldID = CurrentWorld)
    UpcomingGames = GameList.filter(WeekID = CurrentWeek).filter(WasPlayed = 0)
    RecentGames   = GameList.filter(WeekID = LastWeek).filter(WasPlayed = 1)

    UserTeam = GetUserTeam(WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription='Page_World - Return teams and games')

    if DoAudit:
        start = time.time()

    PreseasonAllAmericans = []
    PreseasonTopProspects = []
    SeasonAllAmericans = []

    if CurrentWeek.PhaseID.PhaseName == 'Preseason':
        print('It is the preseason!')
        PreseasonAllAmericans = []
        AllAwards = PlayerTeamSeasonAward.objects.filter(IsPreseasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('PositionID__PositionSortOrder')
        for Conf in [None] + [ u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')]:
            print('AllAmericans for ', Conf)
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
        print()
        print('Preseason Awards', PreseasonAllAmericans)


        Recruits = Player.objects.filter(IsRecruit = True).filter(Recruiting_NationalRank__lte = 10).values('PlayerID', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'CityID__CityName', 'CityID__StateID__StateName', 'Recruiting_NationalRank').order_by('Recruiting_NationalRank').annotate(
            PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
            PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        )
        for P in Recruits:
            P['RecruitingTeams'] = []
            RecruitTeamSeasons = RecruitTeamSeason.objects.filter(PlayerID = P['PlayerID']).values( 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID_id', 'TeamSeasonID__TeamID__TeamLogoURL', 'InterestLevel', 'MatchRating', 'OfferMade', 'Signed').order_by('-InterestLevel').annotate(
                TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
            )
            for RTS in RecruitTeamSeasons[0:3]:
                P['RecruitingTeams'].append(RTS)

            PreseasonTopProspects.append(P)

    elif CurrentWeek.PhaseID.PhaseName == 'Season Recap':
        print('It is the end of the season!')
        AllAwards = PlayerTeamSeasonAward.objects.filter(IsSeasonAward = True).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('PositionID__PositionSortOrder')
        for Conf in [None] + [ u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')]:
            print('AllAmericans for ', Conf)
            ConferenceName = Conf.ConferenceName if Conf is not None else 'National'
            if Conf is None:
                ConfDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-season-award-conference-tab', 'Teams' : []}
                PTSA = AllAwards.filter(IsNationalAward = True)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                    if TD['IsFirstTeam'] == 1:
                        T = 'FirstTeam'
                    elif TD['IsSecondTeam'] == 1:
                        T = 'SecondTeam'
                    else:
                        T = 'Freshman'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team': PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']).filter(IsFreshmanTeam = TD['IsFreshmanTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            else:
                ConfDict = {'Conference': {'ConferenceName': Conf.ConferenceName, 'ConferenceAbbreviation': Conf.ConferenceAbbreviation, 'ConferenceID': Conf.ConferenceID}, 'ShowConference': 'season-allamerican-conf-hide', 'ConferenceSelected': '', 'Teams' : []}
                PTSA = AllAwards.filter(IsConferenceAward = True).filter(ConferenceID = Conf)
                for TD in [{'IsFirstTeam': 1, 'IsSecondTeam': 0, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 1, 'IsFreshmanTeam': 0}, {'IsFirstTeam': 0, 'IsSecondTeam': 0, 'IsFreshmanTeam': 1}]:
                    if TD['IsFirstTeam'] == 1:
                        T = 'FirstTeam'
                    elif TD['IsSecondTeam'] == 1:
                        T = 'SecondTeam'
                    else:
                        T = 'Freshman'
                    ShowTeam = '' if T == 'FirstTeam' else 'season-allamerican-team-hide'
                    ConfDict['Teams'].append({'Team':PTSA.filter(IsFirstTeam = TD['IsFirstTeam']).filter(IsSecondTeam = TD['IsSecondTeam']).filter(IsFreshmanTeam = TD['IsFreshmanTeam']), 'TeamName': T, 'ShowTeam': ShowTeam})
            SeasonAllAmericans.append(ConfDict)
        print()
        print('Season Awards', SeasonAllAmericans)
    Leaders = []
    TopRushers = []
    TopPassers = []
    TopReceivers = []
    AllPlayers = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).annotate(GamesPlayed = Sum('playergamestat__GamesPlayed')).filter(GamesPlayed__gt=0).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason)
    if AllPlayers.count() > 0:

        TopPlayers = AllPlayers.values('PlayerTeamSeasonID', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID__Abbreviation','TeamSeasonID__TeamID_id', 'PlayerID__PlayerFirstName','PlayerID__PlayerLastName', 'PlayerID').annotate(
            GamesPlayed=Sum('playergamestat__GamesPlayed'),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            PAS_Yards = Sum('playergamestat__PAS_Yards'),
            REC_Yards = Sum('playergamestat__REC_Yards'),
            PAS_YardsPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('playergamestat__PAS_Yards')* 1.0 / Sum('playergamestat__GamesPlayed'),1)),
                output_field=FloatField()
            ),
            RUS_YardsPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('playergamestat__RUS_Yards')* 1.0 / Sum('playergamestat__GamesPlayed'),1)),
                output_field=FloatField()
            ),
            REC_YardsPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('playergamestat__REC_Yards')* 1.0 / Sum('playergamestat__GamesPlayed'),1)),
                output_field=FloatField()
            )
        )

        Leaders.append({'Stat': 'Pass YPG', 'Players': TopPlayers.filter(PAS_Yards__gt = 0).annotate(Value = F('PAS_YardsPG')).order_by('-PAS_YardsPG')[0:3]})
        Leaders.append({'Stat': 'Rush YPG', 'Players': TopPlayers.filter(RUS_Yards__gt = 0).annotate(Value = F('RUS_YardsPG')).order_by('-RUS_YardsPG')[0:3]})
        Leaders.append({'Stat': 'Rec YPG', 'Players': TopPlayers.filter(REC_Yards__gt = 0).annotate(Value = F('REC_YardsPG')).order_by('-REC_YardsPG')[0:3]})

        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 9, AuditDescription = 'Page_World - return league leaders')
    context = {'currentSeason': CurrentSeason, 'allTeams': AllTeams, 'leaders':Leaders, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek , 'games': UpcomingGames}

    context['recentGames'] = RecentGames
    context['SeasonAllAmericans'] = SeasonAllAmericans
    context['PreseasonAllAmericans'] = PreseasonAllAmericans
    context['PreseasonTopProspects'] = PreseasonTopProspects
    return render(request, 'HeadFootballCoach/World.html', context)



def Page_Awards(request, WorldID):
    DoAudit = True
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)
    AllAwards = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('WeekID', 'PositionGroupID')

    ConferenceAwards = []

    AwardDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-upcoming-gameview-tab'}
    AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsNationalAward = True).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
    AwardDict['AllConferenceAwards'] = []
    for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
        AllAwards.filter(IsSeasonAward = True).filter(IsNationalAward = True).filter(IsPositionAward=True).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
        if AllConferenceGroup == 'First Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
        elif AllConferenceGroup == 'Second Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
        elif AllConferenceGroup == 'Freshman Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
    ConferenceAwards.append(AwardDict)

    for Conf in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName'):
        AwardDict = {'Conference': Conf, 'ConferenceSelected': '', 'ShowConference': 'w3-hide', }
        AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
        AwardDict['AllConferenceAwards'] = []
        for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
            AllAwards.filter(IsSeasonAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
            if AllConferenceGroup == 'First Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
            elif AllConferenceGroup == 'Second Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
            elif AllConferenceGroup == 'Freshman Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
        ConferenceAwards.append(AwardDict)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'ConferenceAwards': ConferenceAwards}
    return render(request, 'HeadFootballCoach/Awards.html', context)



def Page_PlayerStats(request, WorldID):
    DoAudit = True
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)
    AllAwards = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('WeekID', 'PositionGroupID')

    ConferenceAwards = []

    AwardDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-upcoming-gameview-tab'}
    AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsNationalAward = True).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
    AwardDict['AllConferenceAwards'] = []
    for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
        AllAwards.filter(IsSeasonAward = True).filter(IsNationalAward = True).filter(IsPositionAward=True).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
        if AllConferenceGroup == 'First Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
        elif AllConferenceGroup == 'Second Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
        elif AllConferenceGroup == 'Freshman Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
    ConferenceAwards.append(AwardDict)

    for Conf in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName'):
        AwardDict = {'Conference': Conf, 'ConferenceSelected': '', 'ShowConference': 'w3-hide', }
        AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
        AwardDict['AllConferenceAwards'] = []
        for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
            AllAwards.filter(IsSeasonAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
            if AllConferenceGroup == 'First Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
            elif AllConferenceGroup == 'Second Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
            elif AllConferenceGroup == 'Freshman Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
        ConferenceAwards.append(AwardDict)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'ConferenceAwards': ConferenceAwards}
    return render(request, 'HeadFootballCoach/PlayerStats.html', context)


def Page_TeamStats(request, WorldID):
    DoAudit = True
    page = {'PageTitle': 'College HeadFootballCoach', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentWeek     = Week.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    LastWeek        = Week.objects.filter(WorldID = CurrentWorld).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )
    UserTeam = GetUserTeam(WorldID)
    AllAwards = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = True).order_by('WeekID', 'PositionGroupID')

    ConferenceAwards = []

    AwardDict = {'Conference': {'ConferenceName': 'National', 'ConferenceAbbreviation': 'National', 'ConferenceID': 0}, 'ShowConference': '', 'ConferenceSelected': 'selected-upcoming-gameview-tab'}
    AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsNationalAward = True).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
    AwardDict['AllConferenceAwards'] = []
    for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
        AllAwards.filter(IsSeasonAward = True).filter(IsNationalAward = True).filter(IsPositionAward=True).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
        if AllConferenceGroup == 'First Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
        elif AllConferenceGroup == 'Second Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
        elif AllConferenceGroup == 'Freshman Team':
            AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
    ConferenceAwards.append(AwardDict)

    for Conf in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName'):
        AwardDict = {'Conference': Conf, 'ConferenceSelected': '', 'ShowConference': 'w3-hide', }
        AwardDict['WeeklyAwards'] = AllAwards.filter(IsWeekAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('WeekID', 'ConferenceID', 'PositionGroupID')
        AwardDict['AllConferenceAwards'] = []
        for AllConferenceGroup in ['First Team', 'Second Team', 'Freshman Team']:
            AllAwards.filter(IsSeasonAward = True).filter(IsConferenceAward = True).filter(ConferenceID=Conf).order_by('PositionID', 'ConferenceID', 'PositionGroupID')
            if AllConferenceGroup == 'First Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFirstTeam=True)})
            elif AllConferenceGroup == 'Second Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsSecondTeam=True)})
            elif AllConferenceGroup == 'Freshman Team':
                AwardDict['AllConferenceAwards'].append({'AllConferenceGroup': AllConferenceGroup, 'AwardWinners': AllAwards.filter(IsFreshmanTeam=True)})
        ConferenceAwards.append(AwardDict)

    context = {'currentSeason': CurrentSeason, 'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'ConferenceAwards': ConferenceAwards}
    return render(request, 'HeadFootballCoach/TeamStats.html', context)


def Page_Player(request, WorldID, PlayerID):


    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    PlayerObject = Player.objects.filter(WorldID = CurrentWorld).filter(PlayerID = PlayerID)
    if len(PlayerObject.first().PlayerFaceJson) == 0:
        PlayerObject.first().GeneratePlayerFaceJSon()
    PlayerDict = PlayerObject.values('PlayerID', 'PlayerLastName', 'PlayerFirstName', 'PlayerFaceJson', 'ClassID__ClassName', 'IsCurrentlyRedshirted','WasPreviouslyRedshirted','JerseyNumber','Height', 'Weight', 'CityID', 'PositionID__PositionAbbreviation', 'CityID__CityName', 'CityID__StateID__StateName', 'RecruitingStars', 'IsRecruit').annotate(
        HometownAndState=Concat(F('CityID__CityName'), Value(', '), F('CityID__StateID__StateName')),
        FullName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName')),
        HeightFeet = (F('Height') / 12),
        HeightInches = (F('Height') % 12),
        HeightFormatted = Concat('HeightFeet', Value('\''), 'HeightInches', Value('"'), output_field=CharField()),
        Position = F('PositionID__PositionAbbreviation')
    ).first()

    PlayerObject = PlayerObject.first()

    CurrentPlayerTeamSeason = PlayerObject.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
    CurrentPlayerSeasonSkill = PlayerObject.playerseasonskill_set.filter(LeagueSeasonID__IsCurrent = True).first()

    if len(PlayerDict['PlayerFaceJson']) == 0:
        PlayerObject.GeneratePlayerFaceJSon()
    #PlayerDict = PlayerQuerySet.ReturnAsDict()
    PlayerDict['Player'] = PlayerObject
    allTeams = GetAllTeams(WorldID)


    SeasonStats = None
    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': PlayerDict['FullName'] + ' - HS Recruit', 'WorldID': WorldID, 'PrimaryColor': 'Blue', 'SecondaryColor': 'Red'}

    context = {'userTeam': UserTeam, 'player':PlayerDict,  'allTeams': allTeams, 'CurrentWeek': GetCurrentWeek(CurrentWorld)}

    RatingNameMap = {}

    BoxScoreStatGroupings = [
        {
            'StatGroupName': 'Passing',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True},
                {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': True, 'DisplayOrder': 2.5, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': False, 'DisplayOrder': 3, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_YardsPerGame', 'DisplayName': 'Pass YPG', 'DisplayColumn': True, 'DisplayOrder': 4.5, 'SeasonAggregateValue': True},
                {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TD', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_SacksAndYards', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False},
                {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': False, 'DisplayOrder': 998, 'SeasonAggregateValue': False}
            ]
        },
        {
            'StatGroupName': 'Rushing',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True},
                {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False},
                {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False},
                {'FieldName': 'RUS_YardsPerGame', 'DisplayName': 'Rush YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True},
                {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False},
                {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False},
            ],
        },
        {
            'StatGroupName': 'Receiving',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True},
                {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False},
                {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False},
                {'FieldName': 'REC_YardsPerGame', 'DisplayName': 'Rec YPG', 'DisplayColumn': True, 'DisplayOrder': 3.2, 'SeasonAggregateValue': True},
                {'FieldName': 'REC_YardsPerCatch', 'DisplayName': 'YPC', 'DisplayColumn': True, 'DisplayOrder': 3.5, 'SeasonAggregateValue': False},
                {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False},
                {'FieldName': 'REC_Targets', 'DisplayName': 'Targets', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False},
            ],
        },
        {
            'StatGroupName': 'Defense',
            'Stats': [
                {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': True, 'DisplayOrder': 1, 'SeasonAggregateValue': True},
                {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'DisplayColumn': True, 'DisplayOrder': 2, 'SeasonAggregateValue': False},
                {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'DisplayColumn': True, 'DisplayOrder': 3, 'SeasonAggregateValue': False},
                {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'DisplayColumn': True, 'DisplayOrder': 4, 'SeasonAggregateValue': False},
                {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'DisplayColumn': True, 'DisplayOrder': 5, 'SeasonAggregateValue': False},
                {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'DisplayColumn': True, 'DisplayOrder': 6, 'SeasonAggregateValue': False},
                {'FieldName': 'FUM_Recovered', 'DisplayName': 'FR', 'DisplayColumn': True, 'DisplayOrder': 7, 'SeasonAggregateValue': False},
            ],
        },
    ]
    PositionRatingMap = {'QB': ['OverallRating', 'ThrowPower_Rating', 'ShortThrowAccuracy_Rating', 'MediumThrowAccuracy_Rating', 'DeepThrowAccuracy_Rating', 'ThrowOnRun_Rating', 'ThrowUnderPressure_Rating', 'PlayAction_Rating', 'Awareness_Rating', 'Speed_Rating'],
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


    if PlayerDict['IsRecruit'] == False:
        PTS = CurrentPlayerTeamSeason
        PT = PTS.TeamSeasonID.TeamID
        PlayerTeam = PT

        page = {'PageTitle': PlayerDict['FullName'] + ' - ' + PlayerTeam.TeamName, 'WorldID': WorldID, 'PrimaryColor': PlayerTeam.TeamColor_Primary_HEX, 'SecondaryColor': PlayerTeam.SecondaryColor_Display, 'SecondaryJerseyColor': PlayerTeam.TeamColor_Secondary_HEX}

        PlayerSkills = CurrentPlayerSeasonSkill.__dict__

        PlayerDict['Skills'] = []
        for u in PositionRatingMap[PlayerDict['Position']]:
            PlayerDict['Skills'].append({'SkillName': u, 'Value':PlayerSkills[u]})


        #PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__GameDateID')
        PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__WeekID').values('RUS_Yards', 'RUS_TD', 'RUS_Carries', 'PAS_Yards', 'PAS_TD', 'PAS_Completions', 'PAS_Attempts', 'PAS_Sacks', 'PAS_SackYards', 'PAS_INT', 'REC_Yards','REC_Receptions', 'REC_TD', 'REC_Targets', 'FUM_Forced', 'FUM_Lost', 'FUM_Recovered', 'DEF_TacklesForLoss',  'GameScore', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation','PlayerTeamSeasonID__ClassID__ClassName','PlayerTeamSeasonID__TeamSeasonID__TeamID_id', 'GamesStarted', 'GamesPlayed', 'DEF_Tackles', 'DEF_Sacks', 'DEF_INT', 'TeamGameID', 'TeamGameID__GameID', 'TeamGameID__GameID__WeekID__WeekNumber', 'TeamGameID__GameID__WeekID__WeekName', 'TeamGameID__GameID__WeekID_id').annotate(  # call `annotate`
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
                Position = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation')

            ).order_by('-TeamGameID__GameID__WeekID__WeekNumber')


        SeasonStats = PlayerObject.playerteamseason_set.all().order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear').annotate(  # call `annotate`
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
            )

        CareerHigh = {}
        if PlayerStats.count() >0:
            PAS_Yards_CareerHigh = PlayerStats.order_by('-PAS_Yards').first()
            RUS_Yards_CareerHigh = PlayerStats.order_by('-RUS_Yards').first()
            REC_Yards_CareerHigh = PlayerStats.order_by('-REC_Yards').first()
            CareerHigh = {'PAS_Yards': {'Stat': 'Passing Yards', 'Game': PAS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': PAS_Yards_CareerHigh['PAS_Yards']}, 'RUS_Yards':{'Stat': 'Rushing Yards', 'Game': RUS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': RUS_Yards_CareerHigh['RUS_Yards']}, 'REC_Yards': {'Stat': 'Receiving Yards Yards', 'Game': REC_Yards_CareerHigh['TeamGameID__GameID'], 'Value': REC_Yards_CareerHigh['REC_Yards']}}

        PlayerStatCategoriesTaken = []
        BoxScoreStatGroupingsTaken = []
        PlayerStatCategories = []
        for G in PlayerStats:
            for S in ['RUS_Yards', 'RUS_TD', 'RUS_Carries', 'GamesPlayed', 'RUS_YardsPerCarry', 'PAS_Yards', 'PAS_YardsPerGame','RUS_YardsPerGame','REC_YardsPerGame', 'PAS_TD', 'PAS_CompletionsAndAttempts','PAS_CompletionPercentage', 'PAS_SacksAndYards', 'PAS_INT', 'REC_Yards','REC_Receptions','REC_YardsPerCatch', 'REC_TD',  'GameScore','DEF_Tackles', 'DEF_Sacks', 'DEF_INT', 'FUM_Forced', 'FUM_Lost', 'FUM_Recovered', 'DEF_TacklesForLoss', 'REC_Targets']:
                if str(G[S]) != '0' and str(G[S]) != '0.0' and S not in PlayerStatCategoriesTaken:
                    PlayerStatCategoriesTaken.append(S)
                    for StatGroup in BoxScoreStatGroupings:
                        for Stat in StatGroup['Stats']:
                            if S == Stat['FieldName'] and S not in BoxScoreStatGroupingsTaken:
                                PlayerStatCategories.append({'FieldName': S, 'DisplayName': Stat['DisplayName'], 'DisplayOrder': Stat['DisplayOrder'], 'SeasonAggregateValue': Stat['SeasonAggregateValue']})
                                BoxScoreStatGroupingsTaken.append(S)

        PlayerStatCategories = sorted(PlayerStatCategories, key=lambda k: k['DisplayOrder'])
        PlayerStats = [u for u in PlayerStats]
        RecentGameStats = []
        for G in PlayerStats:
            G['Stats'] = []
            OpposingTeamGame = TeamGame.objects.filter(TeamGameID = G['TeamGameID']).first().OpposingTeamGame
            G['OpposingTeamID'] = OpposingTeamGame.TeamSeasonID.TeamID_id
            G['OpposingTeamLogoURL'] = OpposingTeamGame.TeamSeasonID.TeamID.TeamLogoURL
            G['OpposingTeamName'] = OpposingTeamGame.TeamSeasonID.TeamID.TeamName
            for StatCategory in PlayerStatCategories:
                if StatCategory['SeasonAggregateValue'] == True:
                    continue
                SC = {}
                SC['Value'] = G[StatCategory['FieldName']]
                SC['FieldName'] = StatCategory['FieldName']
                G['Stats'].append(SC)
            RecentGameStats.append(G)
            if len(RecentGameStats) > 5:
                RecentGameStats.pop()

        GameStats = PlayerStats


        SeasonStats = [u for u in SeasonStats]
        for S in SeasonStats:
            S['Stats'] = []
            for StatCategory in PlayerStatCategories:
                SC = {}
                SC['Value'] = S[StatCategory['FieldName']]
                SC['FieldName'] = StatCategory['FieldName']
                S['Stats'].append(SC)


        CareerHighList = []
        for ch in CareerHigh:
            CareerHighList.append({'Stat': ch, 'Game': CareerHigh[ch]['Game'], 'Value': CareerHigh[ch]['Value']})

        context['GameStats'] = GameStats
        context['RecentGameStats'] = RecentGameStats
        context['careerHigh'] = CareerHighList
        context['SeasonStats'] = SeasonStats
        context['playerTeam'] = PlayerTeam
        context['PlayerStatCategories'] = PlayerStatCategories
        context['Skills'] = PlayerDict['Skills']

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


    #if player IS a recruit
    else:

        page['PrimaryColor'] =  '1763B2'
        page['SecondaryColor'] = '000000'

        RTS = RecruitTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID = PlayerID)

        context['RecruitTeamSeasons'] = RTS



    context['page'] = page
    return render(request, 'HeadFootballCoach/Player.html', context)



def Page_Game(request, WorldID, GameID):
    DoAudit = True
    if DoAudit:
        start = time.time()
    GameQuerySet = get_object_or_404(Game, pk=GameID)

    GameDict = GameQuerySet.ReturnAsDict()

    allTeams = GetAllTeams(WorldID)
    HomeTeam = GameDict['HomeTeamID']
    AwayTeam = GameDict['AwayTeamID']
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()

    Events = []
    BoxScore = []
    TeamStatBox = {}
    HomePlayers = []
    AwayPlayers = []

    context = {}

    BoxScoreStatGroupings = [
        {
            'StatGroupName': 'Passing',
            'Stats': [
                {'FieldName': 'GameStarted_Class', 'DisplayName': '', 'DisplayColumn': False, 'DisplayOrder': 0.9},
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True, 'DisplayOrder': 1},
                {'FieldName': 'PlayerID', 'DisplayName': '', 'DisplayColumn': False,'DisplayOrder': 999},
                {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': True, 'DisplayOrder': 2},
                {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': True, 'DisplayOrder': 2.5},
                {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': False, 'DisplayOrder': 3},
                {'FieldName': 'PAS_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True, 'DisplayOrder': 4},
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

    context['ConferenceStandings'] = []
    TeamList = [u.TeamSeasonID.TeamID for u in GameQuerySet.teamgame_set.all()]
    Conferences = list(set([u.ConferenceID for u in TeamList]))

    for C in Conferences:
        CDict = {'ConferenceName': C.ConferenceName}
        CDict['conferenceTeams'] = C.ConferenceStandings(Small=True, HighlightedTeams=TeamList)
        context['ConferenceStandings'].append(CDict)

    if GameDict['WasPlayed'] == 1:
        if GameDict['HomePoints'] > GameDict['AwayPoints']:
            #AwayOutcomeLetter
            GameDict['AwayOutcomeLetter'] = 'L'
            GameDict['HomeOutcomeLetter'] = 'W'
        else:
            GameDict['AwayOutcomeLetter'] = 'W'
            GameDict['HomeOutcomeLetter'] = 'L'


        GameEvents = GameEvent.objects.filter(WorldID=WorldID).filter(GameID = GameID)

        EventPeriods = GameEvents.values('EventPeriod').distinct()
        GameEvents = GameEvents.values('EventPeriod', 'EventTime', 'HomePoints', 'AwayPoints', 'IsScoringPlay', 'IsScoringPlay', 'PlayDescription', 'DriveDescription', 'ScoringTeamID__Abbreviation', 'PlayType', 'ScoringTeamID__TeamLogoURL')


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

                if Event['IsScoringPlay'] == True:
                    ScoreList.append(Event)

            PeriodScoringSummary['PeriodName'] = PeriodNameMap[EventPeriod]
            PeriodScoringSummary['ScoreList'] = ScoreList

            if len(PeriodScoringSummary['ScoreList']) > 0:
                ScoringSummary.append(PeriodScoringSummary)


        TeamStatBox = []
        StatBoxStats  = [{'FieldName': 'TotalYards', 'DisplayName': 'Total Yards'}, {'FieldName': 'FirstDowns', 'DisplayName': 'First Downs'}]
        StatBoxStats += [{'FieldName': 'TimeOfPossession', 'DisplayName': 'Time Of Possession', 'Formatting': 'Seconds'}, {'FieldName': 'Turnovers', 'DisplayName': 'Turnovers'}]
        StatBoxStats += [{'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks'} , {'FieldName': 'PNT_Punts', 'DisplayName': 'Punts'}]
        StatBoxStats += [{'FieldName': 'ThirdDownPercentage', 'DisplayName': '3rd Down %', 'Formatting': 'Percentage'}, {'FieldName': 'FourthDownPercentage', 'DisplayName': '4th Down %', 'Formatting': 'Percentage'}]
        for Stat in StatBoxStats:
            StatName = Stat['FieldName']
            Stat['HomeValue'] = GameDict['Home'+StatName]
            Stat['AwayValue'] = GameDict['Away'+StatName]
            MaxValue  = Stat['HomeValue'] if Stat['HomeValue'] > Stat['AwayValue'] else Stat['AwayValue']
            Stat['HomeRatio'] = round(float(Stat['HomeValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0
            Stat['AwayRatio'] = round(float(Stat['AwayValue']) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0

            Stat['HomeRatio'] = 5 if Stat['HomeRatio'] == 0 else Stat['HomeRatio']
            Stat['AwayRatio'] = 5 if Stat['AwayRatio'] == 0 else Stat['AwayRatio']

            if 'Formatting' in Stat:
                if Stat['Formatting'] == 'Seconds':
                    Stat['HomeValue'] = SecondsToMinutes(Stat['HomeValue'])
                    Stat['AwayValue'] = SecondsToMinutes(Stat['AwayValue'])
                elif Stat['Formatting'] == 'Percentagexxx':
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
            u['FullName'] = u['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + u['PlayerTeamSeasonID__PlayerID__PlayerLastName']
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
        HomeTS = HomeTeam.CurrentTeamSeason
        AwayTS = AwayTeam.CurrentTeamSeason
        context['TeamStatHeaderSuffix'] = ' - This Season'


        TeamStatBox = {
            'HomeReboundBarPercent': 20,
            'AwayReboundBarPercent': 40
        }

        GameDict['HomeTeamWinChance'] = 1.03 #* (((HomeTS.Points - HomeTS.PointsAllowed) * 100.0 / (HomeTS.Possessions + 1)) ** 5 + HomeTS.TeamOverallRating ** 3 )
        GameDict['AwayTeamWinChance'] = 1.00 #* (((AwayTS.Points - AwayTS.PointsAllowed) * 100.0 / (AwayTS.Possessions + 1)) ** 5 + AwayTS.TeamOverallRating ** 3 )

    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': AwayTeam.TeamName + ' @ ' + HomeTeam.TeamName, 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    context['page'] = page
    context['userTeam'] = UserTeam
    context['TeamStatBox'] = TeamStatBox
    context['game'] = GameDict
    context['allTeams'] = allTeams
    context['CurrentWeek'] = GetCurrentWeek(CurrentWorld)
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

def GET_TeamHistory(request, WorldID, TeamID):

    T = Team.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).first()
    TeamSeasonHistory = TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).order_by('LeagueSeasonID').values('TeamSeasonID', 'ConferenceRank', 'LeagueSeasonID__SeasonStartYear', 'Wins', 'Losses', 'ConferenceWins', 'ConferenceLosses', 'RecruitingClassRank').annotate(
        TeamRecord = Concat(F('Wins'), Value('-'), F('Losses'), output_field=CharField()),
        TeamConferenceRecord = Concat(F('ConferenceWins'), Value('-'), F('ConferenceLosses'), output_field=CharField()),
        SeasonYear = F('LeagueSeasonID__SeasonStartYear'),
        SeasonRecapLink = Concat(Value('/World/'), Value(WorldID), Value('/Season/'), F('LeagueSeasonID__SeasonStartYear'), output_field=CharField()),
    )

    TeamSeasonHistory = list(TeamSeasonHistory)
    for TSH in TeamSeasonHistory:
        TS = T.teamseason_set.filter(TeamSeasonID = TSH['TeamSeasonID']).first()
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


    #HistoricalPlayersCareer = PlayerTeamSeason.objects
    HistoricalPlayersSeasons = PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = T ).values( 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID__PositionID__PositionAbbreviation', 'PlayerID_id').annotate(
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
        DEF_INT = Sum('playergamestat__DEF_INT'),
        DEF_Tackles = Sum('playergamestat__DEF_Tackles'),
        PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
        PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
        SeasonYear = F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
        PAS_CompletionPercentage=Case(
            When(PAS_Attempts__lte=F('TeamGamesPlayed') * 5, then=0.0),
            default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
            output_field=FloatField()
        ),
        RUS_YardsPerCarry=Case(
            When(RUS_Carries__lt = F('TeamGamesPlayed') * 5, then=0.0),
            default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
            output_field=FloatField()
        ),
    )

    HistoricalLeaders = [
        {'FieldName': 'PAS_Yards', 'DisplayName': 'Passing Yards', 'Players': []},
        {'FieldName': 'PAS_TD', 'DisplayName': 'Passing TDs', 'Players': []},
        {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Passing %', 'Players': []},
        {'FieldName': 'RUS_Yards', 'DisplayName': 'Rushing Yards', 'Players': []},
        {'FieldName': 'RUS_TD', 'DisplayName': 'Rushing TDs', 'Players': []},
        {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'Rushing YPC', 'Players': []},
        {'FieldName': 'REC_Yards', 'DisplayName': 'Receiving Yards', 'Players': []},
        {'FieldName': 'REC_TD', 'DisplayName': 'Receiving TDs', 'Players': []},
        {'FieldName': 'REC_Receptions', 'DisplayName': 'Receptions', 'Players': []},
        {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'Players': []},
        {'FieldName': 'DEF_INT', 'DisplayName': 'Interceptions', 'Players': []},
        {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'Players': []},
    ]

    for LeaderField in HistoricalLeaders:
        LeaderField['Players'] = list(HistoricalPlayersSeasons.order_by('-'+LeaderField['FieldName'])[0:5])
        ValueRank = 1
        for P in LeaderField['Players']:
            P['Value'] = P[LeaderField['FieldName']]
            P['ValueRank'] = ValueRank
            ValueRank +=1

    context = {'status':'success', 'WorldID': WorldID}

    #context['TeamHistory'] = TeamHistory
    context['TeamSeasonHistory'] = TeamSeasonHistory
    context['HistoricalLeaders'] = HistoricalLeaders

    return JsonResponse(context, safe=False)



def GET_LeagueLeaders(request, WorldID):

    CurrentWorld = World.objects.filter(WorldID = WorldID).first()

    #HistoricalPlayersCareer = PlayerTeamSeason.objects
    PlayersSeasons = PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).values( 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID__PositionID__PositionAbbreviation', 'PlayerID_id', 'TeamSeasonID__TeamID_id', 'TeamSeasonID__TeamID__TeamLogoURL').annotate(
        GameScore=Sum('playergamestat__GameScore'),
        RUS_Yards=Sum('playergamestat__RUS_Yards'),
        RUS_TD=Sum('playergamestat__RUS_TD'),
        RUS_Carries=Sum('playergamestat__RUS_Carries'),
        REC_Receptions=Sum('playergamestat__REC_Receptions'),
        REC_TD=Sum('playergamestat__REC_TD'),
        PAS_Yards=Sum('playergamestat__PAS_Yards'),
        PAS_TD=Sum('playergamestat__PAS_TD'),
        PAS_Attempts = Sum('playergamestat__PAS_Attempts'),
        TeamGamesPlayed = Sum('playergamestat__TeamGamesPlayed'),
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
            When(PAS_Attempts__lte = F('TeamGamesPlayed') * 10, then=0.0),
            default=(Round(Sum('playergamestat__PAS_Completions')* 100.0 / Sum('playergamestat__PAS_Attempts'),1)),
            output_field=FloatField()
        ),
        RUS_YardsPerCarry=Case(
            When(RUS_Carries__lte= F('TeamGamesPlayed') * 10, then=0.0),
            default=(Round(Sum('playergamestat__RUS_Yards')* 1.0 / Sum('playergamestat__RUS_Carries'),1)),
            output_field=FloatField()
        ),
    )

    LeagueLeaders = [
        {'FieldName': 'PAS_Yards', 'DisplayName': 'Passing Yards', 'Players': []},
        {'FieldName': 'PAS_TD', 'DisplayName': 'Passing TDs', 'Players': []},
        {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Passing %', 'Players': []},
        {'FieldName': 'RUS_Yards', 'DisplayName': 'Rushing Yards', 'Players': []},
        {'FieldName': 'RUS_TD', 'DisplayName': 'Rushing TDs', 'Players': []},
        {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'Rushing YPC', 'Players': []},
        {'FieldName': 'REC_Yards', 'DisplayName': 'Receiving Yards', 'Players': []},
        {'FieldName': 'REC_TD', 'DisplayName': 'Receiving TDs', 'Players': []},
        {'FieldName': 'REC_Receptions', 'DisplayName': 'Receptions', 'Players': []},
        {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'Players': []},
        {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'Tack for loss', 'Players': []},
        {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'Players': []},
        {'FieldName': 'DEF_INT', 'DisplayName': 'Interceptions', 'Players': []},
        {'FieldName': 'FUM_Forced', 'DisplayName': 'Fum forced', 'Players': []},
        {'FieldName': 'FUM_Recovered', 'DisplayName': 'Fum rec.', 'Players': []},
    ]

    for LeaderField in LeagueLeaders:
        LeaderField['Players'] = list(PlayersSeasons.order_by('-'+LeaderField['FieldName'])[0:5])
        ValueRank = 1
        for P in LeaderField['Players']:
            P['Value'] = P[LeaderField['FieldName']]
            P['ValueRank'] = ValueRank
            ValueRank +=1


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
    TeamID = Team.objects.get(WorldID = CurrentWorld, TeamID = TeamID)
    CurrentTeamSeason = TeamID.CurrentTeamSeason
    CurrentSeason = CurrentTeamSeason.LeagueSeasonID

    GamesForThisTeam = TeamGame.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = CurrentTeamSeason).order_by('GameID__WeekID')


    GameFields = ['GameIDURL', 'GameDisplay', 'HomeTeamRank', 'AwayTeamRank']
    OpponentFields = ['TeamIDURL', 'TeamName', 'LogoURL']
    TeamGameFields = ['TeamRecord']
    WeekFields = ['WeekName']


    FutureGames = []
    PlayedGames = []
    for TG in GamesForThisTeam:
        G = TG.GameID
        WeekValues = GetValuesOfSingleObject(G.WeekID, WeekFields)
        GameValues = GetValuesOfSingleObject(G, GameFields)
        if TeamID == G.HomeTeamID:
            OpponentValues = GetValuesOfSingleObject(G.AwayTeamID, OpponentFields)
            OpponentTGValues = GetValuesOfSingleObject(G.AwayTeamGameID, TeamGameFields)
        else:
            OpponentValues = GetValuesOfSingleObject(G.HomeTeamID, OpponentFields)
            OpponentTGValues = GetValuesOfSingleObject(G.HomeTeamGameID, TeamGameFields)

        GameInfo = MergeDicts([GameValues, OpponentValues, OpponentTGValues, WeekValues])

        if TeamID == G.HomeTeamID:
            GameInfo['AtOrVs'] = 'vs'
            GameInfo['OpponentRank'] = GameInfo['AwayTeamRank']
        else:
            GameInfo['AtOrVs'] = '@'
            GameInfo['OpponentRank'] = GameInfo['HomeTeamRank']


        if TeamID == G.WinningTeamID:
            GameInfo['GameResultLetter'] = 'W'
            GameInfo['GameResultLetterClass'] = 'teamGameResultLetterW'
            PlayedGames.append(GameInfo)
        elif TeamID == G.LosingTeamID:
            GameInfo['GameResultLetter'] = 'L'
            GameInfo['GameResultLetterClass'] = 'teamGameResultLetterL'
            PlayedGames.append(GameInfo)
        else:
            GameInfo['GameResultLetter'] = ''
            GameInfo['GameResultLetterClass'] = ''
            FutureGames.append(GameInfo)


    context['Games'] = {'PlayedGames': PlayedGames, 'FutureGames': FutureGames}

    return JsonResponse(context, safe=False)

def GET_ConferenceStandings(request, WorldID, ConferenceID = None):
    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = True
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
    TeamSeasonFields = ['ConferenceRank', 'NationalRankDisplay', 'WinsLosses','ConferenceWinsLosses', 'PPG', 'PAPG', 'PointDiffPG', 'ORTG']
    TeamHrefBase = '/World/' + str(WorldID) + '/Team/'

    for conf in ConferenceList:
        ThisConference = {'ConferenceName': conf.ConferenceName, 'ConferenceTeams': []}
        TeamsInConference = Team.objects.filter(WorldID = CurrentWorld).filter(teamseason__LeagueSeasonID__IsCurrent = True).filter(teamseason__teamseasonweekrank__IsCurrent = True).filter(ConferenceID = conf).values('TeamID', 'TeamLogoURL', 'TeamName', 'teamseason__ConferenceRank', 'teamseason__teamseasonweekrank__NationalRank', 'teamseason__Wins', 'teamseason__ConferenceWins', 'teamseason__ConferenceLosses', 'teamseason__Losses').order_by('-teamseason__teamseasonweekrank__NationalRank').annotate(
            GamesPlayed = Sum('teamseason__teamgame__GamesPlayed'),
            PPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__teamgame__Points')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            PAPG=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(Sum('teamseason__opposingteamgame__Points')* 1.0 / F('GamesPlayed'),1)),
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
    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = True
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)

    TeamStats = []

    TeamsInWorld = Team.objects.filter(WorldID = CurrentWorld).filter(teamseason__LeagueSeasonID__IsCurrent = True).filter(teamseason__teamseasonweekrank__IsCurrent = True).values('TeamID', 'TeamLogoURL', 'TeamName', 'ConferenceID', 'ConferenceID__ConferenceAbbreviation', 'teamseason__ConferenceRank', 'teamseason__Wins', 'teamseason__ConferenceWins', 'teamseason__ConferenceLosses', 'teamseason__Losses', 'teamseason__teamseasonweekrank__NationalRank').order_by('-teamseason__teamseasonweekrank__NationalRank').annotate(
        GamesPlayed = Sum('teamseason__teamgame__GamesPlayed'),
        PPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__teamgame__Points')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        PAPG=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(Sum('teamseason__opposingteamgame__Points')* 1.0 / F('GamesPlayed'),1)),
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
        Possessions = Sum('teamseason__teamgame__Possessions'),
        PAS_Attempts = Sum('teamseason__teamgame__PAS_Attempts'),
        PercentPassPlays = Case(
            When(PAS_Attempts=0, then=0.0),
            default=(Round((F('PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks'))* 100.0 / (F('PAS_Attempts') + Sum('teamseason__teamgame__PAS_Sacks')+ Sum('teamseason__teamgame__RUS_Carries')),1)),
            output_field=FloatField()
        ),
        SacksAllowed = Sum('teamseason__teamgame__PAS_Sacks'),
        NumberOfDrives = Sum('teamseason__teamgame__Possessions'),
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

    )




#TODO - First downs
#TODO - Average start of drive (Total Ballspot / possessions)

    for t in TeamsInWorld:

        t['TimeOfPossessionPerDrive'] = SecondsToMinutes(60 * t['TimeOfPossessionPerDriveSeconds'])

        TeamStats.append(t)

    context['TeamStats'] = TeamStats

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

    TeamCoaches = [u.ReturnAsDict() for u in CoachTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID = CurrentTeamSeason)]

    HeadCoach          = [u for u in TeamCoaches if u['Position'] == 'HC' ].pop()
    AssociateHeadCoach = [u for u in TeamCoaches if u['Position'] == 'AHC'].pop()
    AssistantCoach      = [u for u in TeamCoaches if u['Position'] == 'AC' ].pop()


    context['HC']  = HeadCoach
    context['AHC'] = AssociateHeadCoach
    context['AC']  = AssistantCoach

    return JsonResponse(context, safe=False)


def GET_WorldHistory(request, WorldID):

    DoAudit = True
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    AllLeagueSeasons = LeagueSeason.objects.filter(WorldID = CurrentWorld).order_by('-LeagueSeasonID')

    TeamHistoryFields  = ['TeamName', 'TeamRecord', 'TeamID_id', 'TeamSeasonID']
    LeagueSeasonFields = ['LeagueSeasonID', 'SeasonStartYear']
    POTYFields = ['PlayerID', 'TeamSeasonID']

    WorldHistory = []
    for LS in AllLeagueSeasons.values('SeasonStartYear', 'LeagueSeasonID', 'OffseasonStarted', 'LeagueSeasonID'):
        SeasonHistoryObject = {}
        #LSValues = LS.values('SeasonStartYear', 'LeagueSeasonID', 'OffseasonStarted')

        SeasonHistoryObject['Season'] = {'data-field': LS['SeasonStartYear'], 'href-field':  LS['LeagueSeasonID']}

        FinalFourTeams = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(LeagueSeasonID = LS['LeagueSeasonID']).filter(FinalFour = True)

        if LS['OffseasonStarted'] == False:
            continue
        ChampionTeam = FinalFourTeams.filter(NationalChampion = True).first()
        RunnerUpTeam = FinalFourTeams.filter(NationalRunnerUp = True).first()
        FinalFourTeam1 = FinalFourTeams.filter(NationalChampion = False).filter(NationalRunnerUp = False).order_by('-TeamID').first()
        FinalFourTeam2 = FinalFourTeams.filter(NationalChampion = False).filter(NationalRunnerUp = False).order_by( 'TeamID').first()

        TeamHrefBase = '/World/' + str(WorldID) + '/Team/'
        PlayerHrefBase = '/World/' + str(WorldID) + '/Player/'

        SeasonHistoryObject['ChampionTeam'] = {'data-field': ChampionTeam.TeamName, 'span-field': ChampionTeam.TeamRecord, 'href-field': TeamHrefBase + str(ChampionTeam.TeamID_id)}
        SeasonHistoryObject['RunnerUpTeam'] = {'data-field': RunnerUpTeam.TeamName, 'span-field': RunnerUpTeam.TeamRecord, 'href-field': TeamHrefBase + str(RunnerUpTeam.TeamID_id)}
        SeasonHistoryObject['FinalFourTeam1'] = {'data-field': FinalFourTeam1.TeamName, 'span-field': FinalFourTeam1.TeamRecord, 'href-field': TeamHrefBase + str(FinalFourTeam1.TeamID_id)}
        SeasonHistoryObject['FinalFourTeam2'] = {'data-field': FinalFourTeam2.TeamName, 'span-field': FinalFourTeam2.TeamRecord, 'href-field': TeamHrefBase + str(FinalFourTeam2.TeamID_id)}

        PlayerOfTheYear = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = LS['LeagueSeasonID']).filter(IsNationalAward = True).filter(IsTopPlayer = True).filter(IsSeasonAward = True).values('PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__TeamSeasonID', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id').first()
        SeasonHistoryObject['POTY'] = {'data-field': PlayerOfTheYear['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + PlayerOfTheYear['PlayerTeamSeasonID__PlayerID__PlayerLastName'], 'href-field': PlayerHrefBase + str(PlayerOfTheYear['PlayerTeamSeasonID__PlayerID_id'])}

        WorldHistory.append(SeasonHistoryObject)



    Leaders = []
    TopScorers = []
    TopAssisters = []
    TopRebounders = []
    AllPlayers = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(GamesPlayed__gt=0)#.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason)
    if AllPlayers.count() > 0:

        TopPlayers = AllPlayers.order_by('-Points').values('TeamSeasonID__LeagueSeasonID__SeasonStartYear','TeamSeasonID__LeagueSeasonID__SeasonEndYear', 'PlayerTeamSeasonID', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID__Abbreviation','TeamSeasonID__TeamID_id', 'PlayerID__PlayerFirstName','PlayerID__PlayerLastName', 'PlayerID', 'GamesPlayed', 'Points', 'Rebounds', 'Assists')


        for P in TopPlayers:
            if P['GamesPlayed'] == 0:
                continue

            RPG = 1.0 * P['Rebounds'] / P['GamesPlayed']
            APG = 1.0 * P['Assists'] / P['GamesPlayed']
            PPG = 1.0 * P['Points'] / P['GamesPlayed']

            P['FullName'] = P['PlayerID__PlayerFirstName'] + ' ' + P['PlayerID__PlayerLastName']
            P['PlayerIDURL'] = '/World/'+str(WorldID) + '/Player/' + str(P['PlayerID'])
            P['TeamIDURL']   = '/World/'+str(WorldID) + '/Team/' + str(P['TeamSeasonID__TeamID_id'])
            P['Seasons'] = str(P['TeamSeasonID__LeagueSeasonID__SeasonStartYear']) + '-' + str(P['TeamSeasonID__LeagueSeasonID__SeasonEndYear'])


            if len(TopRebounders) < 3 or RPG > TopRebounders[-1]['RPG']:
                if len(TopRebounders) >= 3:
                    TopRebounders.pop()
                P['RPG'] = round(RPG,1)
                TopRebounders.append(P)
                TopRebounders = sorted(TopRebounders, key=lambda k: k['RPG'], reverse=True)
                RankCount = 1
                for PR in TopRebounders:
                    PR['RPGRank'] = RankCount
                    RankCount +=1
            if len(TopAssisters) < 3 or APG > TopAssisters[-1]['APG']:
                if len(TopAssisters) >= 3:
                    TopAssisters.pop()
                P['APG'] = round(APG,1)
                TopAssisters.append(P)
                TopAssisters = sorted(TopAssisters, key=lambda k: k['APG'], reverse=True)
                RankCount = 1
                for PR in TopAssisters:
                    PR['APGRank'] = RankCount
                    RankCount +=1
            if len(TopScorers) < 3 or PPG > TopScorers[-1]['PPG']:
                if len(TopScorers) >= 3:
                    TopScorers.pop()
                P['PPG'] = round(PPG,1)
                TopScorers.append(P)
                TopScorers = sorted(TopScorers, key=lambda k: k['PPG'], reverse=True)
                RankCount = 1
                for PR in TopScorers:
                    PR['PPGRank'] = RankCount
                    RankCount +=1


    Leaders = {'TopScorers': TopScorers, 'TopRebounders': TopRebounders, 'TopAssisters': TopAssisters }

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='Get_WorldHistory' )
    context = {'status':'success', 'WorldID': WorldID}

    context['WorldHistory'] = WorldHistory
    context['HistoricalLeaders'] = Leaders

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


def GET_PlayerStats(request, WorldID):

    Columns = {}
    Orders = {}
    OrderList = []

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


    Start = int(request.GET['start'])
    Length = int(request.GET['length'])
    Draw = int(request.GET['draw'])




    Players = Player.objects.filter(WorldID = WorldID).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = 1).filter(playerseasonskill__LeagueSeasonID__IsCurrent = 1).values('PlayerID','ClassID__ClassAbbreviation', 'PlayerFirstName', 'PlayerLastName', 'PositionID__PositionAbbreviation', 'playerseasonskill__OverallRating', 'playerteamseason__TeamSeasonID__TeamID__TeamName','playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX', 'playerteamseason__TeamSeasonID__TeamID', 'playerteamseason__TeamSeasonID__TeamID__TeamLogoURL').annotate(
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
        PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
        PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('playerteamseason__TeamSeasonID__TeamID'), output_field=CharField()),
        GamesPlayed=Sum('playerteamseason__playergamestat__GamesPlayed'),
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


    context = {'data':list(Players[Start:Start+Length])
             , "draw": Draw
             ,"recordsTotal": Players.count()
             ,"recordsFiltered": Players.count()
        }
    return JsonResponse(context, safe=False)


def Page_Team(request,WorldID, TeamID):


    DoAudit = True
    if DoAudit:
        start = time.time()
#Get Schedule
    AllTeams = Team.objects.filter(WorldID = WorldID)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = GetCurrentWeek(CurrentWorld)

    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)

    teamgames = TeamGame.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = ThisTeam).order_by('GameID__WeekID')

    PlayedGames = teamgames.filter(GameID__WasPlayed = 1).order_by('-GameID__WeekID')
    UnplayedGames = teamgames.filter(GameID__WasPlayed = 0).order_by('GameID__WeekID')

    PlayedGamesCount = PlayedGames.count()
    UnplayedGamesCount = UnplayedGames.count()
    PlayedGamesToShow = 6
    UnplayedGamesToShow = 6
    if PlayedGamesCount < 6:
        PlayedGamesToShow = PlayedGamesCount
        UnplayedGamesToShow = 12 - PlayedGamesCount
    if UnplayedGamesCount < 6:
        UnplayedGamesToShow = UnplayedGamesCount
        PlayedGamesToShow = 12 - UnplayedGamesCount

    if PlayedGames.count() > 0:
        SelectedGame = PlayedGames[0].GameID
    else:
        SelectedGame = UnplayedGames[0].GameID

    teamgames = PlayedGames[:PlayedGamesToShow] | UnplayedGames[:UnplayedGamesToShow]

    teamgames = sorted([u.GameID for u in teamgames], key=lambda t: t.WeekID.WeekNumber, reverse=False)


    Games = []
    for u in teamgames:
        HomeTeam = u.HomeTeamID
        AwayTeam = u.AwayTeamID

        HomeTeamGame = u.HomeTeamGameID
        AwayTeamGame = u.AwayTeamGameID

        HomeTeamSeason = u.HomeTeamSeasonID
        AwayTeamSeason = u.AwayTeamSeasonID

        ThisGame = u.__dict__
        ThisGame['Game'] = u
        ThisGame['DateShortDisplay'] = u.WeekID.WeekName
        ThisGame['HomeTeam'] = HomeTeam
        ThisGame['AwayTeam'] = AwayTeam

        ThisGame['HomeTeamRank'] = u.HomeTeamRank
        ThisGame['AwayTeamRank'] = u.AwayTeamRank

        ThisGame['Week'] = str(u.WeekID)

        ThisGame['HomePoints'] = HomeTeamGame.Points
        ThisGame['AwayPoints'] = AwayTeamGame.Points

        ThisGame['HomeTeamWinningGameBold'] = ''
        ThisGame['AwayTeamWinningGameBold'] = ''

        ThisGame['HomeTeamRecord'] = IfNull(u.HomeTeamGameID.TeamRecord, HomeTeamSeason.TeamRecord)
        ThisGame['AwayTeamRecord'] = IfNull(u.AwayTeamGameID.TeamRecord, AwayTeamSeason.TeamRecord)

        if u == SelectedGame:
            ThisGame['SelectedGameBox'] = 'SelectedGameBox'



        if u.HomeTeamID == ThisTeam:
            #ThisGame['VsString'] = 'vs ' + AwayTeam.CurrentTeamSeason.NationalRankDisplay +' ' + AwayTeam.TeamName
            ThisGame['VsString'] = 'vs ' + AwayTeam.CurrentTeamSeason.NationalRankDisplay +' ' +AwayTeam.Abbreviation
            Opponent = AwayTeam
            ThisGame['OpponentLogoURL'] = Opponent.LogoURL
            ThisGame['OpponentPrimaryColor'] = Opponent.TeamColor_Primary_HEX
            ThisGame['Opponent'] = AwayTeam
        else:
            #ThisGame['VsString'] = '@ ' +  HomeTeam.CurrentTeamSeason.NationalRankDisplay +' ' + HomeTeam.TeamName
            ThisGame['VsString'] = '@ ' +   HomeTeam.CurrentTeamSeason.NationalRankDisplay +' ' +HomeTeam.Abbreviation
            Opponent = HomeTeam
            ThisGame['OpponentLogoURL'] = Opponent.LogoURL
            ThisGame['OpponentPrimaryColor'] = Opponent.TeamColor_Primary_HEX
            ThisGame['Opponent'] = HomeTeam

        if u.WasPlayed == 1:
            ThisGame['OverviewText'] = 'FINAL'
            if u.HomeTeamID == ThisTeam:
                ThisGame['GameDisplay'] =  str(HomeTeamGame.Points) +'-'+str(AwayTeamGame.Points)
                if HomeTeamGame.Points > AwayTeamGame.Points:
                    ThisGame['GameResultLetter'] = 'W'
                    ThisGame['HomeTeamWinningGameBold'] = 'TeamWinningGameBold'
                    ThisGame['AwayTeamWinningGameBold'] = 'TeamLosingGame'
                else:
                    ThisGame['GameResultLetter'] = 'L'
                    ThisGame['AwayTeamWinningGameBold'] = 'TeamWinningGameBold'
                    ThisGame['HomeTeamWinningGameBold'] = 'TeamLosingGame'
            else:
                ThisGame['GameDisplay'] =  str(AwayTeamGame.Points) +'-'+str(HomeTeamGame.Points )
                if HomeTeamGame.Points  < AwayTeamGame.Points:
                    ThisGame['GameResultLetter'] = 'W'
                    ThisGame['AwayTeamWinningGameBold'] = 'TeamWinningGameBold'
                    ThisGame['HomeTeamWinningGameBold'] = 'TeamLosingGame'
                else:
                    ThisGame['GameResultLetter'] = 'L'
                    ThisGame['AwayTeamWinningGameBold'] = 'TeamLosingGame'
                    ThisGame['HomeTeamWinningGameBold'] = 'TeamWinningGameBold'

            GameTopPlayers = u.CalculateTopPlayers()
            for LineItem in GameTopPlayers:
                ThisGame[LineItem] = GameTopPlayers[LineItem]
        else:
            ThisGame['GameDisplay'] = 'Preview'#u.GameDateID.Date
            ThisGame['OverviewText'] = ThisGame['DateShortDisplay']
            ThisGame['HomePoints'] = ''
            ThisGame['AwayPoints'] = ''

        Games.append(ThisGame)

    SignedRecruits = RecruitTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__TeamID = ThisTeam).filter(Signed = True).order_by('PlayerID__Recruiting_NationalRank')

    ThisTeamConference = ThisTeam.ConferenceID.ConferenceName

    allTeams = GetAllTeams(WorldID, 'National', None)
    conferenceTeams = ThisTeam.ConferenceID.ConferenceStandings(Small=True, HighlightedTeams=[ThisTeam])

    TopPlayers = ThisTeam.CurrentTeamSeason.GetTeamLeaders()

    UserTeam = GetUserTeam(WorldID)

    TeamHistory = []
    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).values('NationalChampion','ConferenceChampion', 'TeamID__ConferenceID__ConferenceAbbreviation', 'LeagueSeasonID__SeasonEndYear'):

        if TS['NationalChampion']:
            TeamHistory.append({'BannerLine1': 'National', 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})
        if TS['ConferenceChampion']:
            TeamHistory.append({'BannerLine1': TS['TeamID__ConferenceID__ConferenceAbbreviation'], 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})


    TeamWeeklyRanks = ThisTeam.CurrentTeamSeason.teamseasonweekrank_set.order_by('WeekID')
    MaxWeeklyRank = TeamWeeklyRanks.aggregate(Max('NationalRank'))['NationalRank__max']

    page = {'PageTitle':ThisTeam.Name, 'WorldID': WorldID, 'PrimaryColor': ThisTeam.TeamColor_Primary_HEX, 'SecondaryColor': ThisTeam.SecondaryColor_Display, 'SecondaryJerseyColor': ThisTeam.TeamColor_Secondary_HEX, 'TeamJerseyStyle': ThisTeam.TeamJerseyStyle, 'TeamJerseyInvert':ThisTeam.TeamJerseyInvert, 'TabIcon':ThisTeam.LogoURL }

    context = {'conferenceTeams': conferenceTeams, 'page': page, 'userTeam': UserTeam, 'team': ThisTeam, 'games':Games, 'allGames': teamgames, 'CurrentWeek': CurrentWeek, 'allTeams': allTeams}
    context['SignedRecruits'] = SignedRecruits
    context['TeamWeeklyRanks'] = TeamWeeklyRanks
    context['MaxWeeklyRank'] = MaxWeeklyRank
    context['teamLeaders'] = TopPlayers
    context['TeamHistory'] = TeamHistory
    #context['TeamSchedule'] = TeamGame.objects.filter(TeamSeasonID__TeamID = ThisTeam).order_by('GameID__GameDateID')

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 9, AuditDescription='Page_team' )
    return render(request, 'HeadFootballCoach/Team.html', context)


def POST_SimDay(request, WorldID):

    DayString = request.POST['Days']
    days = 0
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    CurrentWorld = World.objects.get(WorldID=WorldID)

    AllowInterruptions = CurrentWorld.AllowInterruptions
    BreakAfterNextDay = False
    RedirectHref = ''



    if DayString == 'SimThisWeek':
        Weeks = 1
    elif DayString == 'SimNextMonth':
        Weeks = 4
    elif DayString == 'SimRegularSeason':
        Weeks = 15



    DevelopmentGroupMonths = {
        1: [-1,0,1,2,3],
        2: [3],
        3: [2,3],
        4: [1,3],
        5: [2,3],
        6: [3],
        7: [0,1,2,3],
        8: [3],
        9: [2,3],
        10:[1,3],
        11:[2,3],
        12:[3]
    }

    DoAudit = True

    for u in range(0,Weeks):
        print('Simming Week')
        ThisWeek = Week.objects.get(WorldID = WorldID, IsCurrent=1)

        GameSet = ThisWeek.game_set.filter(WasPlayed = 0)
        for game in GameSet:

            for TG in game.teamgame_set.all():
                PTSDC = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = TG.TeamSeasonID).count()
                if PTSDC < 22:
                    CreateDepthChart(CurrentWorld=CurrentWorld, TS=TG.TeamSeasonID)

            if DoAudit:
                start = time.time()

            GameSim(game)

            if DoAudit:
                end = time.time()
                TimeElapsed = end - start
                A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 5, AuditDescription='GameSim')


        if ThisWeek.PhaseID.PhaseName in ['Regular Season', 'Conference Championships', 'Bowls']:
            CalculateRankings(CurrentSeason, CurrentWorld)
            ChoosePlayersOfTheWeek(CurrentSeason, CurrentWorld)


        if ThisWeek.PhaseID.PhaseName == 'Regular Season':
            #DO TOURNEY STUFF HERE
            CalculateConferenceRankings(CurrentSeason, CurrentWorld)
            SelectBroadcast(CurrentSeason, CurrentWorld)
            FakeWeeklyRecruiting(WorldID)

            if ThisWeek.LastWeekInPhase:
                print('End regular season!!!')
                EndRegularSeason(WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Conference Championships':
            #DO TOURNEY STUFF HERE
            CalculateConferenceRankings(CurrentSeason, CurrentWorld)
            print('Creating bowls!!!')
            CreateBowls(WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Bowls':
            #DO TOURNEY STUFF HERE
            print('End Season')
            EndSeason(WorldID)

            RedirectHref = "/World/"+ str(WorldID)

        elif ThisWeek.PhaseID.PhaseName == 'Preseason':
            SelectBroadcast(CurrentSeason, CurrentWorld)

        NextWeek(WorldID)

    return JsonResponse({'success':'value', 'redirect': RedirectHref})


def Page_Bracket(request, WorldID):


    Teams = GetAllTeams(WorldID)
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)
    SortedTeams = GetAllTeams(WorldID)
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
    TeamDict = GetAllTeams(WorldID)
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
        PlayerSkill = PlayerSeasonSkill.objects.get(PlayerID = player['PlayerID'],LeagueSeasonID = CurrentSeason)
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
    ThisTeamConference = ThisTeam.ConferenceID.ConferenceName

#Get Current Date
    CurrentWeek = GetCurrentWeek(CurrentWorld)

    allTeams = GetAllTeams(WorldID)
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

def Page_Recruiting(request, WorldID):

    DoAudit = True
    CurrentWorld = World.objects.filter(WorldID = WorldID).first()
    if DoAudit:
        start = time.time()

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    CurrentWeek = GetCurrentWeek(WorldID)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    TS = TeamSeason.objects.get(WorldID = WorldID, LeagueSeasonID = CurrentSeason, TeamID = TeamID)
    page = {'PageTitle': 'College HeadFootballCoach - Recruiting', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek}
    context['Players'] = []

    for P in Player.objects.filter(WorldID = WorldID).filter(IsRecruit = True).annotate(json_len=Length('PlayerFaceJson')).filter(json_len__lte = 0).order_by('Recruiting_NationalRank')[:100]:
        P.GeneratePlayerFaceJSon()

    context['Players'] = Player.objects.filter(WorldID = WorldID).filter(IsRecruit = True).order_by('Recruiting_NationalRank')[:100]
    #print(context)

    AllTeamSeasons = CurrentSeason.teamseason_set.all().order_by('RecruitingClassRank')

    RecruitingRankings = []

    TeamCounter = 1
    for TS in AllTeamSeasons:
        RecruitingTeamObj = {'TeamID': TS.TeamID, 'RecruitingRank': TeamCounter}

        RecruitsSigned = TS.recruitteamseason_set.filter(Signed=True)
        RecruitingTeamObj['RecruitsSigned'] = RecruitsSigned.count()
        for Stars in [5,4,3,2,1]:
            RecruitingTeamObj['RecruitsSigned'+str(Stars)] = RecruitsSigned.filter(PlayerID__RecruitingStars = Stars).count()
            if RecruitingTeamObj['RecruitsSigned'+str(Stars)] == 0:
                RecruitingTeamObj['RecruitsSignedStyle'+str(Stars)] = 'opacity: .2;'
            if RecruitingTeamObj['RecruitsSigned'+str(Stars)] == 1:
                RecruitingTeamObj['RecruitsSignedStyle'+str(Stars)] = 'opacity: .75;'
            if RecruitingTeamObj['RecruitsSigned'+str(Stars)] > 2:
                RecruitingTeamObj['RecruitsSignedStyle'+str(Stars)] = 'font-weight:800;'

        TeamCounter +=1

        RecruitingRankings.append(RecruitingTeamObj)

    context['RecruitingRankings'] = RecruitingRankings

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription='Page_Recruiting')


    #print(context)
    return render(request, 'HeadFootballCoach/Recruiting.html', context)


def Page_Season(request, WorldID, SeasonStartYear):

    ThisSeason = LeagueSeason.objects.get(WorldID = WorldID, SeasonStartYear = SeasonStartYear)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentWeek = GetCurrentWeek(WorldID)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    context = {}

    AllAmericans = []
    if CurrentWeek.PhaseID.PhaseName == 'Bowls':
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
        print()
        print('Preseason Awards', AllAmericans)


    page = {'PageTitle': 'College HeadFootballCoach - '+ str(SeasonStartYear) +' Season', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    context = {'page': page, 'userTeam': UserTeam, 'CurrentWeek': CurrentWeek, 'AllAmericans': AllAmericans}
    for u in context:
        print(u, context[u])
    return render(request, 'HeadFootballCoach/Season.html', context)
