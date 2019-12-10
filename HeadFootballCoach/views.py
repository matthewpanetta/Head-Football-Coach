from django.shortcuts import get_object_or_404, render
from django.http import HttpResponse, JsonResponse
from django.template import loader
from django.db.models import Max, Avg, Count, Func, F
from .models import Audit, League, TeamGame, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_TournamentRound,TournamentRound, NameList, User, Region, State, City,World, Headline, Tournament, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason
from datetime import timedelta, date
import random
import numpy
from .resources import PlayerDeparture,NewSeasonCutover, InitializeLeagueSeason, BeginOffseason, CreateRecruitingClass, round_robin, CreateSchedule, CreatePlayers, ConfigureLineups, CreateCoaches, CreateTeamSeasons, EndRegularSeason
from .scripts.rankings import    CalculateConferenceRankings,CalculateRankings, SelectBroadcast
from .utilities import SecondsToMinutes,MergeDicts,GetValuesOfSingleObjectDict, UniqueFromQuerySet, IfNull, IfBlank, GetValuesOfObject, GetValuesOfSingleObject
from .scripts.GameSim import GameSim
from .scripts.Recruiting import WeeklyRecruiting, FakeWeeklyRecruiting
import math
import json
from .scripts.import_csv import LoadData, ExtractData, LoadGameStructures
from .scripts.serializers import TeamSerializer,TeamSeasonSerializer
from django.core import serializers
import time



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

    CurrentDate = Calendar.objects.get(WorldID = WorldID, IsCurrent = 1)

    return CurrentDate



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

    CurrentUser = User.objects.get(UserID = 1)

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
        NCAALeague.NumberOfTournamentTeams = 64
    elif NumberOfTeamsInWorld > 64:
        NCAALeague.NumberOfTournamentTeams = 32
    elif NumberOfTeamsInWorld > 32:
        NCAALeague.NumberOfTournamentTeams = 16
    elif NumberOfTeamsInWorld > 16:
        NCAALeague.NumberOfTournamentTeams = 8
    else:
        NCAALeague.NumberOfTournamentTeams = 4

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

    #FollowingDate = date.Date

def Page_Audit(request):

    AuditGroups = Audit.objects.exclude(AuditVersion = 0).values('AuditDescription', 'AuditVersion').order_by('AuditDescription', 'AuditVersion').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), LastAuditTime=Max('AuditTime'))

    #AuditGroups = sorted(AuditGroups, key=lambda k: -1 * k['AverageTimeElapsed'])
    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)


def Page_Teams(request, WorldID):

    AuditGroups = Audit.objects.values('ManualAuditKey').order_by('ManualAuditKey').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), AuditNote=Max('ManualAuditNote'))

    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)


def Page_TeamHistory(request, WorldID, TeamID):

    AuditGroups = Audit.objects.values('ManualAuditKey').order_by('ManualAuditKey').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), AuditNote=Max('ManualAuditNote'))

    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)

def Page_Conference(request, WorldID, ConferenceID):

    AuditGroups = Audit.objects.values('ManualAuditKey').order_by('ManualAuditKey').annotate(AverageTimeElapsed=Avg('TimeElapsed'), NumberOfSamples=Count('TimeElapsed'), AuditNote=Max('ManualAuditNote'))

    context = {'AuditGroups': AuditGroups}

    return render(request, 'HeadFootballCoach/audit.html', context)

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

    print(context)

    return render(request, 'HeadFootballCoach/auditshooting.html', context)


def Page_Index(request):


    InTesting = True

    if InTesting:
        World.objects.all().delete()
        Region.objects.all().delete()
        #System_TournamentRound.objects.all().delete()
        #NameList.objects.all().delete()


    WorldFields = ['WorldID','CurrentDate']
    World__UserTeamFields = ['LogoURL', 'TeamNameAndRecord']

    ExtractData()


    Worlds=[]
    for W in World.objects.filter(IsActive = True):

        WorldValues = GetValuesOfSingleObject(W, WorldFields)
        WorldUserTeamValues = GetValuesOfSingleObject(W.UserTeam, World__UserTeamFields)

        ThisWorld = MergeDicts([WorldValues, WorldUserTeamValues])

        Worlds.append(ThisWorld)

    NumConferencesToInclude = 4
    PossibleConferences = [
         {'ConferenceDisplayName': 'Big 12', 'ConferenceFormValue': 'Big 12 Conference'},
         #{'ConferenceDisplayName': 'ACC', 'ConferenceFormValue': 'Atlantic Coast Conference'},
         {'ConferenceDisplayName': 'SEC', 'ConferenceFormValue': 'Southeastern Conference'},
         {'ConferenceDisplayName': 'Pac-12', 'ConferenceFormValue': 'Pac-12 Conference'},
         #{'ConferenceDisplayName': 'American', 'ConferenceFormValue': 'American Athletic Conference'},
         #{'ConferenceDisplayName': 'Mountain West', 'ConferenceFormValue': 'Mountain West Conference'},
         {'ConferenceDisplayName': 'Big 10', 'ConferenceFormValue': 'Big Ten Conference'},
    ]

    ConfList = []
    for u in range(0,NumConferencesToInclude):
        ConfList.append(random.choice([k for k in PossibleConferences if k not in ConfList]))


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
    StartDate     = Calendar.objects.get(IsCurrent = 1, WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )

    if DoAudit:
        start = time.time()

    #AllTeams = sorted(Team.objects.filter(WorldID = CurrentWorld), key=lambda p: p.CurrentTeamSeason.NationalRank)
    #AllTeams = [u.TeamSeasonID.TeamID for u in TeamSeasonDateRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = 1).filter(NationalRank__lte = 25).order_by('NationalRank').select_related('TeamSeasonID__TeamID')]
    AllTeams = TeamSeasonDateRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent = 1).filter(NationalRank__lte = 25).order_by('NationalRank').select_related('TeamSeasonID__TeamID').values('TeamSeasonID__TeamID','TeamSeasonID__TeamID__TeamName','TeamSeasonID__TeamID__TeamNickname', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__Wins', 'TeamSeasonID__Losses', 'NationalRank', 'NationalRankDelta').annotate(NationalRankDeltaAbs=Func(F('NationalRankDelta'), function='ABS'))

    UpcomingDateWindow = StartDate.NextDayN(7)
    RecentDateWindow = StartDate.NextDayN(-7)

    GameList = Game.objects.filter(WorldID = CurrentWorld)
    UpcomingGames = GameList.filter(GameDateID__lt = UpcomingDateWindow.DateID).filter(WasPlayed = 0).order_by('GameDateID')
    RecentGames   = GameList.filter(GameDateID__gte = RecentDateWindow.DateID).filter(WasPlayed = 1).order_by('-GameDateID')
    #TODO#RecentGames   = RecentGames.filter(HomeTeamSeasonDateRankID__NationalRank__lte=25) | RecentGames.filter(AwayTeamSeasonDateRankID__NationalRank__lte=25)

    UserTeam = GetUserTeam(WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Page_World - Return teams and games')

    if DoAudit:
        start = time.time()

    Leaders = []
    TopRushers = []
    TopPassers = []
    TopReceivers = []
    AllPlayers = PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(GamesPlayed__gt=0).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason)
    if AllPlayers.count() > 0:

        TopPlayers = AllPlayers.order_by('-RUS_Yards').values('PlayerTeamSeasonID', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__TeamID__Abbreviation','TeamSeasonID__TeamID_id', 'PlayerID__PlayerFirstName','PlayerID__PlayerLastName', 'PlayerID', 'GamesPlayed', 'RUS_Yards', 'PAS_Yards', 'REC_Yards')

        for P in TopPlayers:
            if not P['GamesPlayed'] > 0:
                continue

            RUS_YardsPG = 1.0 * P['RUS_Yards'] / P['GamesPlayed']
            PAS_YardsPG = 1.0 * P['PAS_Yards'] / P['GamesPlayed']
            REC_YardsPG = 1.0 * P['REC_Yards'] / P['GamesPlayed']

            if len(TopRushers) < 3 or RUS_YardsPG > TopRushers[-1]['RUS_YardsPG']:
                if len(TopRushers) >= 3:
                    TopRushers.pop()
                P['RUS_YardsPG'] = round(RUS_YardsPG,1)
                TopRushers.append(P)
                TopRushers = sorted(TopRushers, key=lambda k: k['RUS_YardsPG'], reverse=True)

            if len(TopPassers) < 3 or PAS_YardsPG > TopPassers[-1]['PAS_YardsPG']:
                if len(TopPassers) >= 3:
                    TopPassers.pop()
                P['PAS_YardsPG'] = round(PAS_YardsPG,1)
                TopPassers.append(P)
                TopPassers = sorted(TopPassers, key=lambda k: k['PAS_YardsPG'], reverse=True)

            if len(TopReceivers) < 3 or REC_YardsPG > TopReceivers[-1]['REC_YardsPG']:
                if len(TopReceivers) >= 3:
                    TopReceivers.pop()
                P['REC_YardsPG'] = round(REC_YardsPG,1)
                TopReceivers.append(P)
                TopReceivers = sorted(TopReceivers, key=lambda k: k['REC_YardsPG'], reverse=True)


        for u in range(0,3):
            Leaders.append({'RUS_YardsPG': TopRushers[u], 'PAS_YardsPG': TopPassers[u], 'REC_YardsPG': TopReceivers[u]})
            print(Leaders[-1])

        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription = 'Page_World - return league leaders')
    context = {'currentSeason': CurrentSeason, 'allTeams': AllTeams, 'leaders':Leaders, 'page': page, 'userTeam': UserTeam, 'date': StartDate , 'games': UpcomingGames}

    context['recentGames'] = RecentGames
    return render(request, 'HeadFootballCoach/World.html', context)


def Page_Player(request, WorldID, PlayerID):


    PlayerQuerySet = get_object_or_404(Player, pk=PlayerID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    PlayerDict = PlayerQuerySet.ReturnAsDict()
    PlayerDict['Player'] = PlayerQuerySet
    allTeams = GetAllTeams(WorldID)

    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': PlayerDict['FullName'] + ' - HS Recruit', 'WorldID': WorldID, 'PrimaryColor': 'Blue', 'SecondaryColor': 'Red'}

    context = {'userTeam': UserTeam, 'player':PlayerDict,  'allTeams': allTeams, 'date': CurrentDate(WorldID)}

    if PlayerDict['IsRecruit'] == False:
        PTS = PlayerTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerID = PlayerQuerySet).get(TeamSeasonID__LeagueSeasonID = CurrentSeason)
        PT = PTS.TeamSeasonID.TeamID
        PlayerTeam = PT

        page = {'PageTitle': PlayerDict['FullName'] + ' - ' + PlayerTeam.TeamName, 'WorldID': WorldID, 'PrimaryColor': PlayerTeam.TeamColor_Primary_HEX, 'SecondaryColor': PlayerTeam.SecondaryColor_Display}

        PlayerSkills = PlayerSeasonSkill.objects.get(WorldID=WorldID, PlayerID = PlayerQuerySet, LeagueSeasonID = CurrentSeason)

        PlayerSkills = PlayerSkills.__dict__

        for u in PlayerSkills:
            PlayerDict[u] = PlayerSkills[u]


        PlayerStats = PlayerGameStat.objects.filter(WorldID=WorldID).filter(PlayerTeamSeasonID = PTS)

        SeasonStats = {}
        PAS_Yards_CareerHigh = PlayerStats.order_by('-PAS_Yards').first()
        RUS_Yards_CareerHigh = PlayerStats.order_by('-RUS_Yards').first()
        REC_Yards_CareerHigh = PlayerStats.order_by('-REC_Yards').first()
        CareerHigh = {'PAS_Yards': {'Stat': 'Passing Yards', 'Game': PAS_Yards_CareerHigh.TeamGameID.GameID, 'Value': PAS_Yards_CareerHigh.PAS_Yards}, 'RUS_Yards':{'Stat': 'Rushing Yards', 'Game': RUS_Yards_CareerHigh.TeamGameID.GameID, 'Value': RUS_Yards_CareerHigh.RUS_Yards}, 'REC_Yards': {'Stat': 'Receiving Yards Yards', 'Game': REC_Yards_CareerHigh.TeamGameID.GameID, 'Value': REC_Yards_CareerHigh.REC_Yards}}

        print(CareerHigh)
        GameCount = 0
        GameStats = []
        for G in PlayerStats.order_by('TeamGameID__GameID'):

            PlayerStatDict = G.__dict__
            GameObject = G.TeamGameID.GameID
            SeasonOfGame = GameObject.LeagueSeasonID

            GameCount +=1
            PlayerStatDict['GameOfSeason'] = GameCount

            SeasonTeam =  PTS.TeamSeasonID.TeamID

            if PTS.TeamSeasonID.TeamID == GameObject.HomeTeamID:
                PlayerStatDict['Opponent'] = GameObject.AwayTeamID
            else:
                PlayerStatDict['Opponent'] = GameObject.HomeTeamID

            GameStats.append(PlayerStatDict)

        CareerHighList = []
        for ch in CareerHigh:
            CareerHighList.append({'Stat': ch, 'Game': CareerHigh[ch]['Game'], 'Value': CareerHigh[ch]['Value']})

        SeasonStatList = []
        for u in SeasonStats:
            SeasonStatList.append(SeasonStats[u])

        for g in GameStats:
            if g['GameOfSeason'] > PlayerStats.count() - 5:
                g['RecentGame'] = 1
            else:
                g['RecentGame'] = 0

        context['gameStats'] = PlayerStats
        context['careerHigh'] = CareerHighList
        context['seasonStats'] = SeasonStatList
        context['playerTeam'] = PlayerTeam

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
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True},
                {'FieldName': 'PlayerID', 'DisplayName': ''},
                {'FieldName': 'PAS_Completions', 'DisplayName': 'C/ATT', 'DisplayColumn': True},
                {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': False},
                {'FieldName': 'PAS_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True},
                {'FieldName': 'PAS_TD', 'DisplayName': 'TD', 'DisplayColumn': True},
                {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': True},
                {'FieldName': 'PAS_Sacks', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': True},
                {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': False}
            ]
        },
        {
            'StatGroupName': 'Rushing',
            'Stats': [
                {'FieldName': 'FullName', 'DisplayName': 'Player Name', 'DisplayColumn': True},
                {'FieldName': 'PlayerID', 'DisplayName': ''},
                {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': True},
                {'FieldName': 'RUS_Yards', 'DisplayName': 'Yards', 'DisplayColumn': True},
                {'FieldName': 'RUS_TD', 'DisplayName': 'TDs', 'DisplayColumn': True},
            ],
        },
    ]

    context['ConferenceStandings'] = []
    TeamList = [u.TeamSeasonID.TeamID for u in GameQuerySet.teamgame_set.all()]
    Conferences = list(set([u.ConferenceID for u in TeamList]))
    print(Conferences)
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
            GE['GameTime'] = (GE['EventPeriod'] -1) * (60*15)  + ((60*15) - GE['EventTime']) if GE['EventPeriod'] in [1,2,3,4] else (60*60)  + GE['EventTime']



        PeriodTitleMap = {1: '1st', 2: '2nd', 3:'3rd', 4: '4th', 5: 'OT', 6: '2OT', 7: '3OT'}
        PeriodNameMap = {1: '1st Quarter', 2: '2nd Quarter', 3:'3rd Quarter', 4: '4th Quarter', 5: 'Overtime 1', 6: 'Overtime 2', 7: 'Overtime 3'}

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


        GameDict['HomeTotalYards'] = GameDict['HomeRUS_Yards'] + GameDict['HomeREC_Yards'] + GameDict['HomePAS_Yards']
        GameDict['AwayTotalYards'] = GameDict['AwayRUS_Yards'] + GameDict['AwayREC_Yards'] + GameDict['AwayPAS_Yards']

        TeamStatBox = []
        StatBoxStats = ['TotalYards', 'Turnovers', 'TimeOfPossession', 'FirstDowns']
        StatBoxFormatting = {'TimeOfPossession': 'Seconds'}
        for Stat in StatBoxStats:
            HomeValue = GameDict['Home'+Stat]
            AwayValue = GameDict['Away'+Stat]
            MaxValue  = HomeValue if HomeValue > AwayValue else AwayValue
            HomeRatio = round(float(HomeValue) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0
            AwayRatio = round(float(AwayValue) * 100.0 / float(MaxValue),1) if MaxValue != 0 else 0

            HomeRatio = 5 if HomeRatio == 0 else HomeRatio
            AwayRatio = 5 if AwayRatio == 0 else AwayRatio

            if Stat in StatBoxFormatting:
                if StatBoxFormatting[Stat] == 'Seconds':
                    HomeValue = SecondsToMinutes(HomeValue)
                    AwayValue = SecondsToMinutes(AwayValue)
            StatDict = {'StatName': Stat, 'HomeValue': HomeValue, 'AwayValue': AwayValue, 'HomeRatio': HomeRatio, 'AwayRatio': AwayRatio}
            TeamStatBox.append(StatDict)

        context['gameEvents'] = GameEvents
        context['ScoringSummary'] = ScoringSummary

        print('Scoring Summary')
        for P in ScoringSummary:
            print(P['PeriodName'])
            for S in P['ScoreList']:
                print(S)


        PlayerGames = PlayerGameStat.objects.filter(TeamGameID__GameID = GameQuerySet).order_by('-GameScore').values('RUS_Yards', 'RUS_TD', 'RUS_Carries', 'PAS_Yards', 'PAS_TD', 'PAS_Completions', 'PAS_Attempts', 'PAS_Sacks', 'PAS_SackYards', 'PAS_INT', 'REC_Yards', 'REC_TD',  'GameScore', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id', 'PlayerTeamSeasonID__PlayerID__Position','PlayerTeamSeasonID__TeamSeasonID__TeamID_id', 'GamesStarted')
        for u in PlayerGames:
            #PlayerSeason = u.PlayerTeamSeasonID
            #P = PlayerSeason.PlayerID
            #P = P.ReturnAsDict()

            #GameStatDict = u.ReturnAsDict()
            #for Stat in GameStatDict:
            #    P[Stat] = GameStatDict[Stat]

            u['FullName'] = u['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + u['PlayerTeamSeasonID__PlayerID__PlayerLastName']
            u['Position'] = u['PlayerTeamSeasonID__PlayerID__Position']
            u['PlayerID'] = u['PlayerTeamSeasonID__PlayerID_id']

            u['Bench'] = False


            print('Stats for:', u['FullName'], u['Position'])
            for StatGrouping in BoxScoreStatGroupings:
                if 'HomeTeam' not in StatGrouping:
                    StatGrouping['HomeTeam'] = []
                if 'AwayTeam' not in StatGrouping:
                    StatGrouping['AwayTeam'] = []

                PlayerStatGroup = {}
                NonZeroStat = False
                for Stat in StatGrouping['Stats']:
                    PlayerStatGroup[Stat['FieldName']] = u[Stat['FieldName']]
                    if u[Stat['FieldName']] != 0 and Stat['FieldName'] not in ['FullName', 'PlayerID']:
                        print(Stat['FieldName'], u[Stat['FieldName']])
                        NonZeroStat = True

                PlayerStatGroup ['PlayerID'] = u['PlayerID']
                PlayerStatGroup ['FullName'] = u['FullName']
                if NonZeroStat:
                    if u['PlayerTeamSeasonID__TeamSeasonID__TeamID_id'] == HomeTeam.TeamID:
                        StatGrouping['HomeTeam'].append(PlayerStatGroup)
                    else:
                        StatGrouping['AwayTeam'].append(PlayerStatGroup)

            PlayerToAdd = u


        print(BoxScoreStatGroupings)



    else:
        HomeTS = HomeTeam.CurrentTeamSeason
        AwayTS = AwayTeam.CurrentTeamSeason
        context['TeamStatHeaderSuffix'] = ' - This Season'


        TeamStatBox = {
            'HomeReboundBarPercent': 20,
            'AwayReboundBarPercent': 40
        }

        GameDict['HomeTeamWinChance'] = 1.03 * (((HomeTS.Points - HomeTS.PointsAllowed) * 100.0 / (HomeTS.Possessions + 1)) ** 5 + HomeTS.TeamOverallRating ** 3 )
        GameDict['AwayTeamWinChance'] = 1.00 * (((AwayTS.Points - AwayTS.PointsAllowed) * 100.0 / (AwayTS.Possessions + 1)) ** 5 + AwayTS.TeamOverallRating ** 3 )
        print(HomeTeam.TeamName, GameDict['HomeTeamWinChance'], AwayTeam.TeamName, GameDict['AwayTeamWinChance'])

    UserTeam = GetUserTeam(WorldID)

    page = {'PageTitle': AwayTeam.TeamName + ' @ ' + HomeTeam.TeamName, 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}
    context['page'] = page
    context['userTeam'] = UserTeam
    context['TeamStatBox'] = TeamStatBox
    context['game'] = GameDict
    context['allTeams'] = allTeams
    context['date'] = CurrentDate(WorldID)
    context['homeTeam'] =  HomeTeam
    context['awayTeam'] = AwayTeam
    context['boxScore'] = BoxScore
    context['homePlayers'] = HomePlayers
    context['awayPlayers'] = AwayPlayers
    context['BoxScoreStatGroupings'] = BoxScoreStatGroupings

    print('TeamStatBox', TeamStatBox)

    for Stat in TeamStatBox:
        print(Stat['StatName'], Stat)


    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription = 'Page_Game')
    return render(request, 'HeadFootballCoach/Game.html', context)

def GET_TeamHistory(request, WorldID, TeamID):

    TeamSeasonHistory = TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).order_by('LeagueSeasonID')
    TeamSeasonHistoryValues = ['TeamSeasonID', 'LeagueSeasonDisplay', 'TeamRecord', 'TeamConferenceRecord', 'TournamentSeed', 'RecruitingClassRank', 'SeasonResultDisplay']
    TeamSeasonHistory = GetValuesOfObject(TeamSeasonHistory, TeamSeasonHistoryValues)

    TeamHistory = []

    TeamPlayerHistoryLeaders = []
    AllHistoricalPlayersStats = [u.PlayerID.PlayerTeamCareerStatTotals(TeamID, ['Points', 'Rebounds', 'Assists'], True, False) for u in PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = TeamID)]

    NumberOfHistoricalLeadersShown = 5
    HistoricalLeaders = []
    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['PointsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['PPGRank'] = rank
        rank +=1

    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['ReboundsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['RPGRank'] = rank
        rank +=1

    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['AssistsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['APGRank'] = rank
        rank +=1

    for u in AllHistoricalPlayersStats:
        if 'APGRank' in u or 'PPGRank' in u or 'RPGRank' in u:
            HistoricalLeaders.append(u)


    context = {'status':'success', 'WorldID': WorldID}

    context['TeamHistory'] = TeamHistory
    context['TeamSeasonHistory'] = TeamSeasonHistory
    context['HistoricalLeaders'] = HistoricalLeaders

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

    ThisYearsGames = Game.objects.filter(WorldID = CurrentWorld).filter(LeagueSeasonID = CurrentSeason).order_by('GameDateID')
    GamesForThisTeam = ThisYearsGames.filter(HomeTeamID = TeamID) | ThisYearsGames.filter(AwayTeamID = TeamID)

    GameFields = ['GameIDURL', 'GameDisplay', 'HomeTeamRank', 'AwayTeamRank', 'DateShortDisplayDayOfWeek']
    OpponentFields = ['TeamIDURL', 'TeamName', 'LogoURL']

    FutureGames = []
    PlayedGames = []
    for G in GamesForThisTeam:
        GameValues = GetValuesOfSingleObject(G, GameFields)
        if TeamID == G.HomeTeamID:
            OpponentValues = GetValuesOfSingleObject(G.AwayTeamID, OpponentFields)
        else:
            OpponentValues = GetValuesOfSingleObject(G.HomeTeamID, OpponentFields)

        GameInfo = MergeDicts([GameValues, OpponentValues])

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
    TeamSeasonFields = ['ConferenceRank', 'NationalRankDisplay', 'Wins', 'Losses','ConferenceWins', 'ConferenceLosses', 'PPG', 'PAPG', 'PointDiffPG', 'FGPercentage', 'ThreePointPercentage', 'Pace', 'ORTG']
    TeamHrefBase = '/World/' + str(WorldID) + '/Team/'

    for conf in ConferenceList:
        ThisConference = {'ConferenceName': conf.ConferenceName, 'ConferenceTeams': []}
        TeamsInConference = TeamSeasonDateRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent=1).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(TeamSeasonID__TeamID__ConferenceID = conf).values('TeamSeasonID__TeamID_id', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__ConferenceRank', 'NationalRank', 'TeamSeasonID__Wins', 'TeamSeasonID__GamesPlayed','TeamSeasonID__Losses','TeamSeasonID__ConferenceWins', 'TeamSeasonID__ConferenceLosses', 'TeamSeasonID__Points', 'TeamSeasonID__PointsAllowed',  'TeamSeasonID__FGM', 'TeamSeasonID__FGA', 'TeamSeasonID__ThreePM','TeamSeasonID__ThreePA', 'TeamSeasonID__Possessions').order_by('-NationalRank')#sorted(Team.objects.filter(WorldID = CurrentWorld).filter(ConferenceID = conf), key=lambda t: t.CurrentTeamSeason.ConferenceRank)
        for t in TeamsInConference:

            t = dict((key.replace('TeamSeasonID__', '').replace('TeamID__','').replace('_id',''), value) for (key, value) in t.items())


            #'ConferenceRank', 'NationalRankDisplay', 'Wins', 'Losses','ConferenceWins', 'ConferenceLosses', 'PPG', 'PAPG', 'PointDiffPG', 'FGPercentage', 'ThreePointPercentage', 'Pace', 'ORTG'

            t['TeamIDURL'] = TeamHrefBase + str(t['TeamID'])
            if t['GamesPlayed'] == 0:
                t['PPG'] = 0
                t['PAPG'] = 0
                t['Pace'] = 0
                t['PointDiffPG'] = 0
                t['FGPercentage'] = 0
                t['ThreePointPercentage'] = 0
                t['ORTG'] = 0
            else:
                t['PPG'] = round(1.0 * t['Points'] / t['GamesPlayed'] , 1)
                t['PAPG'] = round(1.0 * t['PointsAllowed'] / t['GamesPlayed'] , 1)
                t['Pace'] = round(1.0 * t['Possessions'] / t['GamesPlayed'] , 1)
                t['PointDiffPG'] = round(1.0 * (t['Points'] - t['PointsAllowed']) / t['GamesPlayed'] , 1)
                t['FGPercentage'] = round(1.0 * t['FGM'] / t['FGA'] , 2)
                t['ThreePointPercentage'] = round(1.0 * t['ThreePM'] / t['ThreePA'] , 2)
                t['ORTG'] = round(100.0 * t['Points'] / t['Possessions'] , 1)


            ThisConference['ConferenceTeams'].append(t)

        ConferenceStandings.append(ThisConference)

    context['ConferenceStandings'] = ConferenceStandings
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='GET_ConferenceStandings')

    return JsonResponse(context, safe=False)


def GET_AllTeamStats(request, WorldID):
    context = {'status':'success', 'WorldID': WorldID}

    DoAudit = True
    if DoAudit:
        start = time.time()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    TeamHrefBase = '/World/' + str(WorldID) + '/Team/'

    TeamStats = []

    TeamsInWorld = TeamSeasonDateRank.objects.filter(WorldID = CurrentWorld).filter(IsCurrent=1).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).values('TeamSeasonID__TeamID_id', 'TeamSeasonID__TeamID__TeamLogoURL', 'TeamSeasonID__TeamID__TeamName', 'TeamSeasonID__ConferenceRank', 'NationalRank', 'TeamSeasonID__Wins', 'TeamSeasonID__GamesPlayed','TeamSeasonID__Losses','TeamSeasonID__ConferenceWins', 'TeamSeasonID__ConferenceLosses', 'TeamSeasonID__Points', 'TeamSeasonID__PointsAllowed',  'TeamSeasonID__RUS_Yards', 'TeamSeasonID__RUS_TD', 'TeamSeasonID__PAS_Yards','TeamSeasonID__PAS_TD', 'TeamSeasonID__Possessions').order_by('-NationalRank')#sorted(Team.objects.filter(WorldID = CurrentWorld).filter(ConferenceID = conf), key=lambda t: t.CurrentTeamSeason.ConferenceRank)
    for t in TeamsInWorld:

        t = dict((key.replace('TeamSeasonID__', '').replace('TeamID__','').replace('_id',''), value) for (key, value) in t.items())

        t['TeamIDURL'] = TeamHrefBase + str(t['TeamID'])
        if t['GamesPlayed'] == 0:
            t['RUS_Yards'] = 0
            t['RUS_TD'] = 0
            t['PAS_Yards'] = 0
            t['PAS_TD'] = 0
            t['PPG'] = 0.0
            t['PAPG'] = 0.0
        else:
            t['RUS_YardsPG'] = round(1.0 * t['RUS_Yards'] / t['GamesPlayed'] , 1)
            t['RUS_TDPG'] = round(1.0 * t['RUS_TD'] / t['GamesPlayed'] , 1)
            t['PAS_YardsPG'] = round(1.0 * t['PAS_Yards'] / t['GamesPlayed'] , 1)
            t['PAS_TDPG'] = round(1.0 * t['PAS_TD'] / t['GamesPlayed'] , 1)
            t['Diff'] = round(1.0 * (t['Points'] - t['PointsAllowed']) / t['GamesPlayed'] , 1)
            t['PPG'] = round(1.0 * (t['Points']) / t['GamesPlayed'] , 1)
            t['PAPG'] = round(1.0 * (t['PointsAllowed']) / t['GamesPlayed'] , 1)


        TeamStats.append(t)

    context['TeamStats'] = TeamStats

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='GET_TeamStats')

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
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Get_WorldHistory' )
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



def Page_Team(request,WorldID, TeamID):


    DoAudit = True
    if DoAudit:
        start = time.time()
#Get Schedule
    date = CurrentDate(WorldID)
    AllTeams = Team.objects.filter(WorldID = WorldID)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    ThisTeam = Team.objects.get(WorldID = WorldID, TeamID = TeamID)#.values('ConferenceName')

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)

    teamgames = TeamGame.objects.filter(WorldID = WorldID).filter(TeamSeasonID = ThisTeam.CurrentTeamSeason)
    for u in teamgames:
        print(u.GameID.HomeTeamID, u.GameID.AwayTeamID )

    PlayedGames = teamgames.filter(GameID__WasPlayed = 1).order_by('-GameID__GameDateID')
    UnplayedGames = teamgames.filter(GameID__WasPlayed = 0).order_by('GameID__GameDateID')

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
    print('Selected Game 1 - ', SelectedGame)

    teamgames = PlayedGames[:PlayedGamesToShow] | UnplayedGames[:UnplayedGamesToShow]

    teamgames = sorted([u.GameID for u in teamgames], key=lambda t: t.GameDateID.DateID, reverse=False)


    Games = []
    for u in teamgames:
        print(ThisTeam, u)
        HomeTeam = u.HomeTeamID
        AwayTeam = u.AwayTeamID

        HomeTeamGame = u.HomeTeamGameID
        AwayTeamGame = u.AwayTeamGameID

        HomeTeamSeason = u.HomeTeamSeasonID
        AwayTeamSeason = u.AwayTeamSeasonID

        ThisGame = u.__dict__
        ThisGame['Game'] = u
        ThisGame['DateShortDisplay'] = u.DateShortDisplay
        ThisGame['HomeTeam'] = HomeTeam
        ThisGame['AwayTeam'] = AwayTeam

        ThisGame['HomeTeamRank'] = u.HomeTeamRank
        ThisGame['AwayTeamRank'] = u.AwayTeamRank

        ThisGame['HomePoints'] = HomeTeamGame.Points
        ThisGame['AwayPoints'] = AwayTeamGame.Points

        ThisGame['HomeTeamWinningGameBold'] = ''
        ThisGame['AwayTeamWinningGameBold'] = ''

        ThisGame['HomeTeamRecord'] = IfNull(u.HomeTeamGameID.TeamRecord, HomeTeamSeason.TeamRecord)
        ThisGame['AwayTeamRecord'] = IfNull(u.AwayTeamGameID.TeamRecord, AwayTeamSeason.TeamRecord)

        if u == SelectedGame:
            ThisGame['SelectedGameBox'] = 'SelectedGameBox'
            print('Selected game-', ThisGame)



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

    SignedRecruits = RecruitTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID__TeamID = ThisTeam).filter(Signed = True)

    ThisTeamConference = ThisTeam.ConferenceID.ConferenceName

    allTeams = GetAllTeams(WorldID, 'National', None)
    conferenceTeams = GetAllTeams(WorldID, 'Conference', ThisTeamConference)

    TopPlayers = ThisTeam.CurrentTeamSeason.GetTeamLeaders(['GamesPlayed'])

    UserTeam = GetUserTeam(WorldID)

    TeamHistory = []
    for TS in TeamSeason.objects.filter(WorldID = WorldID).filter(TeamID = TeamID).values('NationalChampion','ConferenceChampion', 'TeamID__ConferenceID__ConferenceAbbreviation', 'LeagueSeasonID__SeasonEndYear'):

        if TS['NationalChampion']:
            TeamHistory.append({'BannerLine1': 'National', 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})
        if TS['ConferenceChampion']:
            TeamHistory.append({'BannerLine1': TS['TeamID__ConferenceID__ConferenceAbbreviation'], 'BannerLine2': 'Champions', 'Season': str(TS['LeagueSeasonID__SeasonEndYear'])})


    TeamWeeklyRanks = ThisTeam.CurrentTeamSeason.teamseasondaterank_set.order_by('DateID')
    MaxWeeklyRank = TeamWeeklyRanks.aggregate(Max('NationalRank'))['NationalRank__max']

    page = {'PageTitle':ThisTeam.Name, 'WorldID': WorldID, 'PrimaryColor': ThisTeam.TeamColor_Primary_HEX, 'SecondaryColor': ThisTeam.SecondaryColor_Display, 'TeamJerseyStyle': ThisTeam.TeamJerseyStyle, 'TeamJerseyInvert':ThisTeam.TeamJerseyInvert, 'TabIcon':ThisTeam.LogoURL }

    context = {'conferenceTeams': conferenceTeams, 'page': page, 'userTeam': UserTeam, 'team': ThisTeam, 'games':Games, 'allGames': teamgames, 'date': date, 'allTeams': allTeams}
    context['SignedRecruits'] = SignedRecruits
    context['TeamWeeklyRanks'] = TeamWeeklyRanks
    context['MaxWeeklyRank'] = MaxWeeklyRank
    context['teamLeaders'] = TopPlayers
    context['TeamHistory'] = TeamHistory

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 8, AuditDescription='Page_team' )
    return render(request, 'HeadFootballCoach/Team.html', context)


def POST_SimDay(request, WorldID):

    DayString = request.POST['Days']
    days = 0
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here
    Today = Calendar.objects.get(WorldID = WorldID, IsCurrent=1)

    AllowInterruptions = CurrentWorld.AllowInterruptions
    BreakAfterNextDay = False

    if DayString == 'SimToday':
        days = 1
    elif DayString == 'SimNextWeek':
        days = 7
    elif DayString == 'SimNextMonth':
        days = 28
    elif DayString == 'SimUntilMonday':
        days = Today.DaysToNextMonday
    elif DayString == 'SimRegularSeason':
        days = Today.DaysBetween(CurrentSeason.RegularSeasonEndDateID)


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

    for u in range(0,days):
        print('Simming day ', u)
        date = Calendar.objects.get(WorldID = WorldID, IsCurrent=1)

        GameSet = date.game_set.filter(WasPlayed = 0)#Game.objects.filter(WorldID = WorldID).filter(GameDateID = date.DateID).filter(WasPlayed = False)
        for game in GameSet:

            if DoAudit:
                start = time.time()

            GameSim(game)

            if DoAudit:
                end = time.time()
                TimeElapsed = end - start
                A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='GameSim')


        if date.DayOfWeek == 6:#day of week = Sunday
            CalculateRankings(CurrentSeason, CurrentWorld)
            SelectBroadcast(CurrentSeason, CurrentWorld)
        elif date.DayOfWeek == 0 and CurrentSeason.RegularSeasonEndDateID.DateID > date.DateID:#day of week = Sunday
            FakeWeeklyRecruiting(WorldID)
        CalculateConferenceRankings(CurrentSeason, CurrentWorld)

        #DEVELOPMENT
        #PlayersToDevelopToday = Player.objects.filter(WorldID = WorldID).filter(DevelopmentDayOfMonth = date.DayOfMonth).filter(DevelopmentGroupID__in=DevelopmentGroupMonths[date.Month])
        #DevelopPlayers(PlayersToDevelopToday)


        #END DEVELOPMENT

        if CurrentSeason.TournamentCreated == False and CurrentSeason.RegularSeasonEndDateID.DateID <= date.DateID:
            #DO TOURNEY STUFF HERE
            print('End regular season!!!')
            EndRegularSeason(WorldID)
            BreakAfterNextDay = True


        if CurrentSeason.TournamentCreated == True:
            Flip = False
            CurrentTournament = Tournament.objects.get(WorldID = WorldID,LeagueSeasonID = CurrentSeason)

            if CurrentTournament.TournamentStarted == True and CurrentTournament.TournamentCompleted == False and Game.objects.filter(HomeTeamID__isnull=False).filter(WorldID = WorldID).filter(WasPlayed = False).count() == 0:

                TournamentRoundID = TournamentRound.objects.filter(WorldID = CurrentWorld, RoundStarted=True, RoundCompleted=False).first()
                TournamentRoundGames = Game.objects.filter(WorldID = CurrentWorld).filter( TournamentRoundID = TournamentRoundID).order_by('TournamentRoundID')

                if TournamentRoundGames.filter(WasPlayed = False).count() == 0:
                    TournamentRoundID.RoundCompleted = True
                    TournamentRoundID.save()

                    NextRound = TournamentRoundID.NextRound

                    NextRound.RoundStarted = True
                    NextRound.save()

#UniqueFromQuerySet(Team.objects.filter(WorldID = CurrentWorld), 'ConferenceID'):
                for TournamentGame in TournamentRoundGames:
                    if TournamentGame.WasPlayed == True:
                        NextTournamentGameID  = TournamentGame.NextTournamentGameID

                        if NextTournamentGameID.TournamentRoundID.IsFinalFour:
                            Flip = False

                        if NextTournamentGameID is not None:
                            if NextTournamentGameID.HomeTeamID is None or (NextTournamentGameID.HomeTeamID is None and Flip):
                                NextTournamentGameID.HomeTeamID = TournamentGame.WinningTeamID
                                NextTournamentGameID.HomeTeamSeed = TournamentGame.WinningTeamSeed
                                NextTournamentGameID.save()
                            else:
                                NextTournamentGameID.AwayTeamID = TournamentGame.WinningTeamID
                                NextTournamentGameID.AwayTeamSeed = TournamentGame.WinningTeamSeed
                                NextTournamentGameID.save()
                        else:
                            BreakAfterNextDay = True

                # if TournamentRound == 4:
                #     #RemainingTeams = Team Objects
                #     H = Headline(SeasonID = CurrentSeason, DateID = Today)
                #     H.HeadlineType = 'Final Four'
                #     HeadLineText = 'The Final Four is set! Last teams remaining are ' + str(RemainingTeams[0]) + ', '+ str(RemainingTeams[1]) + ', '+ str(RemainingTeams[2]) + ', '+ str(RemainingTeams[3])
                #     HeadLineTextHTML = 'The Final Four is set! Last teams remaining are <a href="/Team/'+str(RemainingTeams[0].TeamID)+'">' + str(RemainingTeams[0]) + '</a>, <a href="/Team/'+str(RemainingTeams[1].TeamID)+'">'+ str(RemainingTeams[1]) + '</a>, <a href="/Team/'+str(RemainingTeams[2].TeamID)+'">'+ str(RemainingTeams[2]) + '</a>, <a href="/Team/'+str(RemainingTeams[3].TeamID)+'">'+ str(RemainingTeams[3]) + '</a>'
                #     H.HeadlineText = HeadLineText
                #     H.HeadlineTextHTML = HeadLineTextHTML
                #     H.Team1TeamID = RemainingTeams[0].TeamID
                #     H.Team2TeamID = RemainingTeams[1].TeamID
                #     H.Team3TeamID = RemainingTeams[2].TeamID
                #     H.Team4TeamID = RemainingTeams[3].TeamID
                #
                #     HeadlineImportanceValue = 4
                #     H.HeadlineImportanceValue = HeadlineImportanceValue
                #     H.save()

            elif CurrentTournament.TournamentStarted == True and CurrentTournament.TournamentCompleted == True and CurrentSeason.OffseasonStarted == False:
                BeginOffseason(CurrentWorld)


        if date.DateID < CurrentSeason.CoachCarouselDateID.DateID:
            BreakAfterNextDay = False
        elif date.DateID == CurrentSeason.CoachCarouselDateID.DateID:
            print('Do coach carousel!!')
            BreakAfterNextDay = True

        elif date.DateID == CurrentSeason.PlayerDepartureDayDateID.DateID:
            print('Do coach carousel!!')
            PlayerDeparture(WorldID)

        elif date.DateID == CurrentSeason.RecruitingSigningDayDateID.DateID:
            print('Do coach carousel!!')
            BreakAfterNextDay = True

        elif date.DateID == CurrentSeason.NextSeasonCutoverDayDateID.DateID:
            print('Do coach carousel!!')
            BreakAfterNextDay = True
            NewSeasonCutover(WorldID)

        NextDay(WorldID)

        if BreakAfterNextDay and AllowInterruptions:
            return JsonResponse({'success':'value'})

    return JsonResponse({'success':'value'})


def Page_PlayerAnalytics(request):

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)
    AllPlayers = PlayerTeamSeason.objects.filter(SeasonID = CurrentSeason)

    return render(request, 'HeadFootballCoach/TopPlayers.html', context)



def Page_Bracket(request, WorldID):


    Teams = GetAllTeams(WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent=1)
    SortedTeams = GetAllTeams(WorldID)
    UserTeam = GetUserTeam(WorldID)
    BracketDict = {'East': {}, 'West': {}, 'South': {}, 'Midwest': {}}

    BracketDict = []
    MaxRound = 1
    MaxTournamentGameNumber = 0
    if TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(NationalChampion = True).count() > 0:
        TS = TeamSeason.objects.get(LeagueSeasonID = CurrentSeason, NationalChampion = True)
        BracketDict.append({'TeamGameID': 1, 'TournamentgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': TS.TournamentSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX})
    else:
        BracketDict.append({'TeamGameID': 1, 'TournamentgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': 0, 'name': '', 'teamid': 0, 'logourl': '', 'color': ''})


    for G in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(TournamentGameNumber__isnull=False).order_by('-TournamentRoundID', '-TournamentRegionID','GameDateID', '-GameID'):
        HomeTeam = G.HomeTeamID
        AwayTeam = G.AwayTeamID
        if G.TournamentRoundID.TournamentRoundNumber in [1,2]:
            print('In final four!',G)
        #
        if HomeTeam is not None:
            if G.TournamentRoundID.TournamentRoundNumber in [1,2]:
                BracketDict.append({'TeamGameID': ((G.TournamentGameNumber) * 2), 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber, 'round': G.TournamentRoundID.TournamentRoundNumber, 'points': IfNull(G.AwayPoints,0), 'seed': AwayTeam.CurrentTeamSeason.TournamentSeed, 'name': AwayTeam.Name, 'teamid': AwayTeam.TeamID, 'logourl': AwayTeam.LogoURL, 'color': AwayTeam.TeamColor_Primary_HEX, 'Region': G.TournamentRegionID.TournamentRegionName})
                BracketDict.append({'TeamGameID': ((G.TournamentGameNumber) * 2)+1, 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber,'round': G.TournamentRoundID.TournamentRoundNumber, 'points': IfNull(G.HomePoints,0), 'seed': HomeTeam.CurrentTeamSeason.TournamentSeed, 'name': HomeTeam.Name, 'teamid': HomeTeam.TeamID, 'logourl': HomeTeam.LogoURL, 'color': HomeTeam.TeamColor_Primary_HEX, 'Region': G.TournamentRegionID.TournamentRegionName})
            else:
                BracketDict.append({'TeamGameID': ((G.TournamentGameNumber) * 2), 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber,'round': G.TournamentRoundID.TournamentRoundNumber, 'points': IfNull(G.HomePoints,0), 'seed': HomeTeam.CurrentTeamSeason.TournamentSeed, 'name': HomeTeam.Name, 'teamid': HomeTeam.TeamID, 'logourl': HomeTeam.LogoURL, 'color': HomeTeam.TeamColor_Primary_HEX, 'Region': G.TournamentRegionID.TournamentRegionName})
                BracketDict.append({'TeamGameID': ((G.TournamentGameNumber) * 2) + 1, 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber, 'round': G.TournamentRoundID.TournamentRoundNumber, 'points': IfNull(G.AwayPoints,0), 'seed': AwayTeam.CurrentTeamSeason.TournamentSeed, 'name': AwayTeam.Name, 'teamid': AwayTeam.TeamID, 'logourl': AwayTeam.LogoURL, 'color': AwayTeam.TeamColor_Primary_HEX, 'Region': G.TournamentRegionID.TournamentRegionName})

            MaxTournamentGameNumber = Max_Int(MaxTournamentGameNumber,((G.TournamentGameNumber) * 2) + 1 )
        else:
            BracketDict.append( {'TeamGameID': ((G.TournamentGameNumber) * 2), 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber,'round': G.TournamentRoundID.TournamentRoundNumber, 'points': 0, 'Region': G.TournamentRegionID.TournamentRegionName})
            BracketDict.append( {'TeamGameID': ((G.TournamentGameNumber) * 2) + 1, 'GameID': G.GameID, 'TournamentgameNumber':G.TournamentGameNumber, 'round': G.TournamentRoundID.TournamentRoundNumber, 'points': 0, 'Region': G.TournamentRegionID.TournamentRegionName})
        #BracketDict[0] = {'round': 7, 'seed': TS.TournamentSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX}
    page = {'WorldID': WorldID}

    if TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(NationalChampion = True).count() > 0:
        TS = TeamSeason.objects.get(LeagueSeasonID = CurrentSeason, NationalChampion = True)
        BracketDict.append({'TeamGameID':  MaxTournamentGameNumber + 1, 'TournamentgameNumber':0,'round': 0, 'BracketSpaceID': 1,'points': 0, 'seed': TS.TournamentSeed, 'name': TS.TeamID.Name, 'teamid': TS.TeamID.TeamID, 'logourl': TS.TeamID.LogoURL, 'color': TS.TeamID.TeamColor_Primary_HEX})



    BracketData = {'teams': [], 'results': [[]]}
    MaxTournamentRoundNumber = max([u.TournamentRoundID.TournamentRoundNumber for u in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(TournamentRoundID__isnull=False)])
    for G in [u for u in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(TournamentRoundID__TournamentRoundNumber=MaxTournamentRoundNumber).order_by('-TournamentRoundID', '-TournamentRegionID','-GameDateID')]:
        BracketData['teams'].append([str(G.HomeTeamSeed) + ' ' + G.HomeTeamID.TeamName, str(G.AwayTeamSeed) + ' ' + G.AwayTeamID.TeamName])

    for TR in TournamentRound.objects.filter(TournamentID__LeagueSeasonID = CurrentSeason).order_by('-TournamentRoundNumber'):
        #BracketData['results'][0].append(str(TR.TournamentRoundNumber) + 'games')
        ThisRoundData = []
        for G in Game.objects.filter(LeagueSeasonID = CurrentSeason).filter(TournamentRoundID=TR).order_by('-TournamentRoundID', '-TournamentRegionID','-GameDateID'):
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
    context = {'page': page, 'BracketData':BracketData,'MaxRound':MaxRound, 'userTeam': UserTeam, 'Teams': Teams, 'date': CurrentDate(WorldID) , 'allTeams': SortedTeams, 'bracketjson': BracketDict}
    return render(request, 'HeadFootballCoach/Bracket.html', context)



def Page_ManageTeam(request):

    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam['TeamID']

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
            ThisGame['GameDisplay'] = u.GameDateID.Date

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
    date = CurrentDate(WorldID)

    allTeams = GetAllTeams(WorldID)
    allTeams = sorted(allTeams, key = lambda k: k['TeamName'])

    Record = TeamRecord(TeamID)
    team = Team.objects.get(WorldID=WorldID, TeamID = TeamID)


    context = {'page': page, 'conferenceStandings': ConferenceRanking, 'playerState': PlayerState, 'userTeam': UserTeam, 'team': team, 'games':Games, 'date': date, 'players':Players, 'allTeams': allTeams, 'record': Record}

    return render(request, 'HeadFootballCoach/ManageTeam.html', context)

def Page_Coach(request, CoachID):

    context = {}

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
    date = CurrentDate(WorldID)
    context['date'] = date

    return render(request, 'HeadFootballCoach/Coach.html', context)

def Page_Recruiting(request, WorldID):

    DoAudit = True

    if DoAudit:
        start = time.time()

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    date = CurrentDate(WorldID)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    TS = TeamSeason.objects.get(WorldID = WorldID, LeagueSeasonID = CurrentSeason, TeamID = TeamID)
    page = {'PageTitle': 'College HeadFootballCoach - Recruiting', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    context = {'page': page, 'userTeam': UserTeam, 'date': date}
    context['Players'] =  Player.objects.filter(WorldID = WorldID).filter(IsRecruit = True).order_by('Recruiting_NationalRank')
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
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='Page_Recruiting')


    #print(context)
    return render(request, 'HeadFootballCoach/Recruiting.html', context)


def Page_Season(request, WorldID, SeasonStartYear):

    ThisSeason = LeagueSeason.objects.get(WorldID = WorldID, SeasonStartYear = SeasonStartYear)
    CurrentWorld = World.objects.get(WorldID = WorldID)
    date = CurrentDate(WorldID)
    UserTeam = GetUserTeam(WorldID)
    TeamID = UserTeam
    context = {}

    TeamHistoryFields  = ['TeamName', 'TeamRecord', 'TeamID_id', 'TeamSeasonID']
    LeagueSeasonFields = ['LeagueSeasonID', 'SeasonStartYear']
    POTYFields = ['PlayerID', 'TeamSeasonID']

    SeasonHistoryObject = {}

    SeasonHistoryObject['Season'] = {'data-field': ThisSeason.SeasonStartYear, 'href-field':  ThisSeason.LeagueSeasonID}

    FinalFourTeams = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(LeagueSeasonID = ThisSeason).filter(FinalFour = True)

    if FinalFourTeams.count() > 0:

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

        PlayerOfTheYear = PlayerTeamSeasonAward.objects.filter(WorldID = CurrentWorld).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = ThisSeason).filter(IsNationalAward = True).filter(IsPlayerOfTheYear = True).first()
        SeasonHistoryObject['POTY'] = {'data-field': PlayerOfTheYear.PlayerTeamSeasonID.PlayerID.FullName, 'href-field': PlayerHrefBase + str(PlayerOfTheYear.PlayerTeamSeasonID.PlayerID.PlayerID)}

        context['SeasonHistoryObject'] = SeasonHistoryObject

    TeamPlayerHistoryLeaders = []
    AllHistoricalPlayersStats = [u.PlayerID.PlayerTeamCareerStatTotals(None, ['Points', 'Rebounds', 'Assists'], True, False) for u in PlayerTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__LeagueSeasonID = ThisSeason)]

    NumberOfHistoricalLeadersShown = 5
    HistoricalLeaders = []
    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['PointsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['PPGRank'] = rank
        rank +=1

    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['ReboundsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['RPGRank'] = rank
        rank +=1

    rank = 1
    for u in sorted(AllHistoricalPlayersStats, key=lambda t: t['AssistsPG'], reverse=True)[0:NumberOfHistoricalLeadersShown]:
        u['APGRank'] = rank
        rank +=1

    for u in AllHistoricalPlayersStats:
        if 'APGRank' in u or 'PPGRank' in u or 'RPGRank' in u:
            HistoricalLeaders.append(u)


    page = {'PageTitle': 'College HeadFootballCoach - '+ str(SeasonStartYear) +' Season', 'WorldID': WorldID, 'PrimaryColor': '1763B2', 'SecondaryColor': '000000'}

    context = {'page': page, 'userTeam': UserTeam, 'date': date}
    for u in context:
        print(u, context[u])
    return render(request, 'HeadFootballCoach/Season.html', context)
