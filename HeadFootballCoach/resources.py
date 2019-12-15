from .models import Audit,TeamGame, NameList, League, TournamentRegion, System_TournamentRound, TournamentRound, TeamSeasonDateRank, World, Headline, Tournament, CoachTeamSeason, TeamSeason, RecruitTeamSeason, Team, Player, Coach, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill, CoachTeamSeason
import random
from datetime import timedelta, date
import numpy
from .scripts.PickName import RandomName, RandomPositionAndMeasurements, RandomCity
import math
from django.db.models import Count
from .scripts.rankings import CalculateRankings, CalculateConferenceRankings, SelectBroadcast
from .scripts.SeasonAwards import NationalAwards
from .scripts.Recruiting import FindNewTeamsForRecruit, RandomRecruitPreference
from .utilities import DistanceBetweenCities, WeightedProbabilityChoice, NormalBounds, Min, Max
from math import sin, cos, sqrt, atan2, radians, log
import time


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
    random.shuffle(teams)
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

    ScheduleDict = {}
    for t in TeamList:
        ScheduleDict[t] = {'NonConferenceGames': 0, 'HomeGames': 0, 'AwayGames': 0}

    GamePerTeam = 12
    NonConferenceGames = 4
    ConferenceGames = GamePerTeam - NonConferenceGames

    CurrentSeason = LS

    WeekInterval = 7

    StartDay = Calendar.objects.get(WorldID=WorldID, IsCurrent = 1)

    NonConf_rr = round_robin(TeamList, NonConferenceGames)

    weekcount = 0
    GamesToSave = []
    TeamGamesToSave = []
    for week in NonConf_rr:
        print('Creating Schedule for week', week)
        WeekOpenPool = []
        WeekGameCount = 0
        WeekGameLen = len(week)
        for game in week:
            if WeekGameCount > 200:
                return None
            WeekGameCount +=1
            HomeTeam, AwayTeam = game[0], game[1]
            if ScheduleDict[HomeTeam]['HomeGames'] > ScheduleDict[AwayTeam]['HomeGames']:
                HomeTeam, AwayTeam = AwayTeam,HomeTeam
            if HomeTeam.ConferenceID == AwayTeam.ConferenceID:
                continue

            if ScheduleDict[HomeTeam]['NonConferenceGames'] > NonConferenceGames or  ScheduleDict[AwayTeam]['NonConferenceGames'] > NonConferenceGames:
                continue

            ScheduleDict[HomeTeam]['HomeGames'] +=1
            ScheduleDict[AwayTeam]['AwayGames'] +=1
            ScheduleDict[HomeTeam]['NonConferenceGames'] +=1
            ScheduleDict[AwayTeam]['NonConferenceGames'] +=1

            G = Game(WorldID=WorldID, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = '7:05', GameDateID = StartDay.NextDayN(weekcount * WeekInterval ))

            G.save()

            HomeTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = HomeTeam.CurrentTeamSeason, IsHomeTeam = True,  GameID = G)
            AwayTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = AwayTeam.CurrentTeamSeason, IsHomeTeam = False, GameID = G)

            TeamGamesToSave.append(HomeTeamGame)
            TeamGamesToSave.append(AwayTeamGame)

            print(AwayTeamGame, HomeTeamGame)
            #G.save()

        weekcount +=1


    ConfWeekCount = weekcount
    Teams = TeamList
    DistinctConferences = Conference.objects.filter(WorldID = WorldID)#.values_list('ConferenceName', flat=True)
    print('DistinctConferences', DistinctConferences)

    for Conf in DistinctConferences:

        print('Creating Schedule for ',Conf)
        TeamsInConference = [u for u in Conf.team_set.all()]
        Conf_rr = round_robin(TeamsInConference, ConferenceGames)
        weekcount = 0
        for week in Conf_rr:
            for game in week:
                HomeTeam, AwayTeam = game[0], game[1]

                G = Game(WorldID=WorldID, LeagueSeasonID = CurrentSeason, WasPlayed = 0, GameTime = '7:05', GameDateID = StartDay.NextDayN((ConfWeekCount+weekcount) * WeekInterval ))
                G.save()

                HomeTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = HomeTeam.CurrentTeamSeason, IsHomeTeam = True,  GameID = G)
                AwayTeamGame = TeamGame(WorldID=WorldID,TeamSeasonID = AwayTeam.CurrentTeamSeason, IsHomeTeam = False, GameID = G)
                TeamGamesToSave.append(HomeTeamGame)
                TeamGamesToSave.append(AwayTeamGame)


            weekcount +=1

    Game.objects.bulk_create(GamesToSave, ignore_conflicts=True)
    TeamGame.objects.bulk_create(TeamGamesToSave, ignore_conflicts=True)

    FirstGame = Game.objects.filter(WorldID = WorldID).filter( LeagueSeasonID = LS).order_by('GameDateID').first()
    LastGame = Game.objects.filter(WorldID = WorldID).filter( LeagueSeasonID = LS).order_by('-GameDateID').first()

    CurrentSeason.ScheduleCreated = True

    if LastGame is not None:
        LastGameDate = LastGame.GameDateID
        TournamentStartDate = LastGameDate.NextDayN(1)
        CurrentSeason.RegularSeasonEndDateID = TournamentStartDate

    if FirstGame is not None:
        CurrentSeason.RegularSeasonStartDateID = FirstGame.GameDateID

        #RegularSeasonStartDateID

    CurrentSeason.save()


def GeneratePlayer(t, s, c, WorldID):
    OverallMean = 70
    OverallSigma = 9

    PlayerClasses = ['Freshman', 'Sophomore', 'Junior', 'Senior']
    IsRecruit = False
    if c == None:
        PlayerClasses = ['Freshman', 'Sophomore', 'Junior', 'Senior']

    else:
        PlayerClasses = [c]
        if c == 'HS Senior':
            IsRecruit = True

    Positions = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'OG', 'OC', 'DE', 'DT', 'OLB', 'MLB', 'CB', 'S', 'K', 'P']


    ClassOverallPercentage = {
        'HS Senior': (.70, .85),
        'Freshman': (.75, .93),
        'Sophomore': (.82, .98),
        'Junior': (.88, 1),
        'Senior': (.90, 1)
    }

    # factorAthleticism  = NormalBounds(1, 0.2, 0.2, 1.35)
    # factorShooting     = NormalBounds(1, 0.2, 0.2, 1.35)
    # factorSkill        = NormalBounds(1, 0.2, 0.2, 1.35)
    # factorIns          = NormalBounds(1, 0.2, 0.2, 1.35)
    # athleticismRatings = ["StrengthRating", "SpeedRating", "JumpingRating", "EnduranceRating", "DunkLayupRating"]
    # shootingRatings    = ["FreeThrowRating", "MidrangeRating", "ThreePointRating"]
    # skillRatings       = ["OffensiveIQRating", "DefensiveIQRating", "DribblingRating", "PassingRating"]
    # insideRatings      = ["InsideShootingRating", "ReboundingRating"]


    PlayerPositionAndHeight = RandomPositionAndMeasurements()
    PlayerPosition = PlayerPositionAndHeight['Position']
    PlayerWeight = PlayerPositionAndHeight['Weight']
    PlayerHeight = PlayerPositionAndHeight['Height']


    PlayerClass = random.choice(PlayerClasses)
    #PlayerPosition = random.choice(Positions)
    PlayerNumber = random.randint(1,90)

    PlayerNameTuple  = RandomName()
    PlayerFirstName = PlayerNameTuple[0]
    PlayerLastName = PlayerNameTuple[1]

    PlayerCityID = RandomCity()

    PlayerRatings = {}


    P=Player(WorldID=WorldID, Class = PlayerClass, PlayerFirstName = PlayerFirstName, PlayerLastName = PlayerLastName, JerseyNumber = PlayerNumber, Height = PlayerHeight, Weight = PlayerWeight, CityID = PlayerCityID, Position = PlayerPosition, IsRecruit = IsRecruit)



    #PST = PlayerTeamSeason(PlayerID = P, SeasonID = s, TeamID = t)
    P.LeadershipRating = NormalBounds(55,15,2,98)
    P.ClutchRating = NormalBounds(55,15,2,98)
    P.FriendlyRating = NormalBounds(55,15,2,98)
    P.WorkEthicRating = NormalBounds(55,12,2,98)
    P.MicrowaveRating = NormalBounds(55,12,2,98)
    P.ExpressiveRating = NormalBounds(55,12,2,98)
    P.DesireForWinnerRating = NormalBounds(55,15,2,98)
    P.LoyaltyRating = NormalBounds(50,20,2,98)
    P.DesireForPlayingTimeRating = NormalBounds(55,20,2,98)

    P.save()

    PlayerSkill = PlayerSeasonSkill(WorldID=WorldID, PlayerID = P, LeagueSeasonID = s)


    P.save()

    PlayerSkill.save()
    PlayerSkill.PopulateOverallRating()
    PlayerSkill.save()

    return P


def GenerateCoach(WorldID):

    PlayerNameTuple  = RandomName()
    C = Coach(WorldID=WorldID, CoachFirstName = PlayerNameTuple[0], CoachLastName = PlayerNameTuple[1])

    C.CoachAge = random.randint(35,70)

    C.ReputationRating       =  NormalBounds(50, 10, 30,99)
    C.CharismaRating         =  NormalBounds(50, 10, 30,99)
    C.ScoutingRating         =  NormalBounds(50, 10, 30,99)


    C.GameplanRating         =  NormalBounds(50, 10, 30,89)
    C.InGameAdjustmentRating =  NormalBounds(C.GameplanRating, 3, 30,99)

    TeachingBaseline = int(NormalBounds(50, 10, 30,89))
    C.TeachSkills   =  random.randint(TeachingBaseline-10, TeachingBaseline+10)

    C.PatienceTendency = NormalBounds(50, 10, 30,99)
    C.VeteranTendency  = NormalBounds(50, 10, 30,99)

    C.save()

    return C



def CreatePlayers(LS, WorldID):

    PlayersPerTeam = 72

    LotteryOrder = []

    MinimumRosterComposition = {
        'Class': {'Freshman': 12, 'Sophomore':12, 'Junior': 12, 'Senior': 12},
        'Positions': {'QB': 3, 'RB': 3, 'FB':0, 'WR': 5, 'TE': 3, 'OT': 4, 'OG': 4, 'OC': 2, 'DE': 4, 'DT': 3, 'OLB': 4, 'MLB': 3, 'CB': 5, 'S': 4, 'K': 1, 'P': 1}

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

    TeamList = AllTeams.order_by('-TeamPrestige')
    TeamsToAddToLottery = int(NumberOfPlayersNeeded * 1.5)
    RoundCount = 1
    while TeamsToAddToLottery > 0:
        NumTeamThisRound = ((RoundCount * 2) + 1)
        if NumTeamThisRound > Min(NumberOfTeams,TeamsToAddToLottery):
            NumTeamThisRound = Min(NumberOfTeams,TeamsToAddToLottery)

        Round = {'RoundNumber': RoundCount, 'MaxTeamsInThisRound': NumTeamThisRound, 'TeamsInThisRoundCount':0, 'TeamsInThisRound': [], 'RoundFull': False}

        LotteryOrder.append(Round)

        TeamsToAddToLottery -= NumTeamThisRound
        RoundCount +=1

    for T in TeamList:
        TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
        NumPlayersNeededForThisTeam = PlayersPerTeam - TS.playerteamseason_set.count()
        RoundCount = 0
        for Round in LotteryOrder:
            if Round['RoundFull']:
                RoundCount +=1
                continue
            else:
                break

        while NumPlayersNeededForThisTeam > 0:
            LotteryOrder[RoundCount]['TeamsInThisRound'].append(T)
            LotteryOrder[RoundCount]['TeamsInThisRoundCount'] +=1
            if LotteryOrder[RoundCount]['TeamsInThisRoundCount'] >= LotteryOrder[RoundCount]['MaxTeamsInThisRound']:
                LotteryOrder[RoundCount]['RoundFull'] = True
            RoundCount +=1
            NumPlayersNeededForThisTeam -=1


    PlayerPool = []
    print('Creating ',NumberOfPlayersNeeded, ' players')
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        #print(PlayerCount)
        PlayerPool.append(GeneratePlayer(None, CurrentSeason, None, WorldID))
    print('PlayerPool',PlayerPool)
    Player.objects.bulk_create(PlayerPool, ignore_conflicts=True)

    PlayerList = Player.objects.filter(WorldID = WorldID)
    PlayerPool = [u for u in PlayerList.values('PlayerID', 'Class', 'Position', 'playerseasonskill__OverallRating').order_by('-playerseasonskill__OverallRating')]#sorted(PlayerPool, key = lambda k: k.CurrentSkills.OverallRating, reverse = True)

    PlayersTeamSeasonToSave = []
    print(PlayerPool)
    for Round in LotteryOrder:
        if Round['TeamsInThisRoundCount'] == 0:
            continue

        for T in sorted(Round['TeamsInThisRound'], key=lambda k: random.random()):
            TS = T.CurrentTeamSeason
            if T not in TeamRosterCompositionNeeds:
                TeamRosterCompositionNeeds[T] = {        'Class': {'Freshman': 12, 'Sophomore':12, 'Junior': 12, 'Senior': 12},'Position': {'QB': 3, 'FB':0, 'ATH':0, 'RB': 3, 'WR': 5, 'TE': 3, 'OT': 4, 'OG': 4, 'OC': 2, 'DE': 4, 'DT': 3, 'OLB': 4, 'MLB': 3, 'CB': 5, 'S': 4, 'K': 1, 'P': 1}}
            ClassesNeeded =   [u for u in TeamRosterCompositionNeeds[T]['Class']    if TeamRosterCompositionNeeds[T]['Class'][u]    > 0 ]
            PositionsNeeded = [u for u in TeamRosterCompositionNeeds[T]['Position'] if TeamRosterCompositionNeeds[T]['Position'][u] > 0 ]

            ClassNeedsMet = False
            PositionNeedsMet = False

            if len(ClassesNeeded) == 0:
                ClassNeedsMet = True
            if len(PositionsNeeded) == 0:
                PositionNeedsMet = True

            AvailablePlayers = [u for u in PlayerPool  if (ClassNeedsMet or u['Class'] in ClassesNeeded) and (PositionNeedsMet or u['Position'] in PositionsNeeded)]
            if len(AvailablePlayers) == 0:
                PlayerForTeam = PlayerPool[-1]
            elif len(AvailablePlayers) < 21:
                PlayerForTeam = random.choice(AvailablePlayers)
            else:
                AvailablePlayers = AvailablePlayers[:int(len(AvailablePlayers)/20)]
                PlayerForTeam = random.choice(AvailablePlayers)
            PlayerPool.remove(PlayerForTeam)

            TeamRosterCompositionNeeds[T]['Class'][PlayerForTeam['Class']] -=1
            TeamRosterCompositionNeeds[T]['Position'][PlayerForTeam['Position']] -=1

            P = PlayerList.filter(PlayerID = PlayerForTeam['PlayerID']).first()
            PTS = PlayerTeamSeason(WorldID=WorldID, TeamSeasonID = TS, PlayerID = P, PlayerClass = PlayerForTeam['Class'])
            PlayersTeamSeasonToSave.append(PTS)

    PlayerTeamSeason.objects.bulk_create(PlayersTeamSeasonToSave, ignore_conflicts=True)

    for T in AllTeams:
        TS = TeamSeason.objects.get(TeamID=T, WorldID = WorldID, LeagueSeasonID = CurrentSeason)
        TS.PopulateTeamOverallRating()
        TS.save()

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
        TeamSeniors = PTS.filter(PlayerClass = 'Senior').count()
        TS.ScholarshipsToOffer = TeamSeniors
        TS.save()

    RecruitPool = []
    print('Creating ',NumberOfPlayersNeeded,' recruits')
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        RecruitPool.append(GeneratePlayer(None, CurrentSeason, 'HS Senior', WorldID))
        #print(PlayerCount, len(RecruitPool))
    Player.objects.bulk_create(RecruitPool, ignore_conflicts=True)


    RecruitPool = sorted(RecruitPool, key = lambda k: NormalBounds(k.OverallRating,3,10,99), reverse = True)


    TeamList = sorted(TeamsThatNeedPlayers, key = lambda k: k[0].TeamPrestige, reverse = True)

    NumberOfRecruits = len(RecruitPool)

    StarDistribution = {5:.075,
                        4:.200,
                        3:.400,
                        2:.700,
                        1: 1.0}

    RecruitPreferenceBase = [
        ('ChampionshipContenderValue', 50),
        ('TeamPrestigeValue',          99),
        ('CloseToHomeValue',           99),
        ('PlayingTimeValue',           99),
        ('CoachStabilityValue',        60),
        ('CoachStyleValue',            20),
        ('FacilitiesValue',            20),
        ('ProPotentialValue',          80),
        ('CampusLifestyleValue',       20),
        ('AcademicPrestigeValue',      10),
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
        'TelevisionExposureValue':'TelevisionExposureRating'
    }

    PositionStarList = {
    #'ATH': {1:24, 2: 319, 3: 571, 4: 75, 5: 4},
    'CB': {1:22, 2: 442, 3: 657, 4: 123, 5: 13},
    'DE': {1:25, 2: 388, 3: 739, 4: 142, 5: 18},
    'DT': {1:14, 2: 276, 3: 443, 4: 90, 5: 18},
    'FB': {1:3, 2: 13, 3: 22, 4: 2},
    'K': {1:8, 2: 82, 3: 58},
    'OC': {1:6, 2: 68, 3: 93, 4: 18, 5: 2},
    'OG': {1:33, 2: 300, 3: 386, 4: 75, 5: 2},
    'OLB': {1:19, 2: 297, 3: 526, 4: 81, 5: 9},
    'OT': {1:36, 2: 371, 3: 640, 4: 108, 5: 14},
    'P': {1:1, 2: 41, 3: 37},
    'RB': {1:29, 2: 338, 3: 595, 4: 109, 5: 9},
    'S': {1:21, 2: 299, 3: 582, 4: 82, 5: 5},
    'TE': {1:13, 2: 203, 3: 309, 4: 56, 5: 1},
    'WR': {1:44, 2: 577, 3: 930, 4: 186, 5: 14},
    'QB': {1:29, 2: 284, 3: 436, 4: 93, 5: 10},
    'MLB': {1:18, 2: 249, 3: 291, 4: 62, 5: 4},
    }

    PositionalRankingTracker = {'ATH': 0,#993,
    'CB': 0,
    'DE': 0,
    'DT': 0,
    'FB': 0,
    'K': 0,
    'OC': 0,
    'OG': 0,
    'OLB': 0,
    'OT': 0,
    'P': 0,
    'RB': 0,
    'S': 0,
    'TE': 0,
    'WR': 0,
    'QB': 0,
    'MLB': 0}


    RecruitCount = 0
    RTSToSave = []
    print('Creating RecruitTeamSeasons')
    for Recruit in RecruitPool:
        RecruitCount +=1
        PlayerStar = WeightedProbabilityChoice(PositionStarList[Recruit.Position], 'QB')
        #print(Recruit.PlayerFirstName, Recruit.PlayerLastName, RecruitCount, PlayerStar)
        PositionalRankingTracker[Recruit.Position] +=1

        Recruit.RecruitingStars = PlayerStar
        Recruit.Recruiting_NationalRank = RecruitCount
        Recruit.Recruiting_NationalPositionalRank = PositionalRankingTracker[Recruit.Position]

        RecruitPreferences = RandomRecruitPreference(RecruitPreferenceBase)

        RecruitTopPreferences = []

        for Pref in RecruitPreferences:
            setattr(Recruit, Pref, RecruitPreferences[Pref])
            if RecruitPreferences[Pref] in [1,2,3]:
                RecruitTopPreferences.append((Pref, RecruitPreferences[Pref]))
            #print()
        Recruit.save()


        RTSToSave = RTSToSave + FindNewTeamsForRecruit(WorldID, Recruit, RecruitTopPreferences=None)
    RecruitTeamSeason.objects.bulk_create(RTSToSave, ignore_conflicts=True)

def CreateCoaches(LS, WorldID):

    CoachesPerTeam = ['HC', 'OC', 'DC']

    AllTeams = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    TeamsThatNeedCoaches = []
    NumberOfCoachesNeeded = 0
    for t in AllTeams:
        TS = TeamSeason.objects.get(WorldID=WorldID, TeamID = t, LeagueSeasonID = CurrentSeason)
        CTS = CoachTeamSeason.objects.filter(WorldID=WorldID, TeamSeasonID = TS).count()
        #print(CTS, 'coaches on team ', t)
        TeamsThatNeedCoaches.append((t, len(CoachesPerTeam) - CTS))
        NumberOfCoachesNeeded += (len(CoachesPerTeam) - CTS)

    CoachPool = []
    for CoachCount in range(0,NumberOfCoachesNeeded):
        #print(CoachCount)
        CoachPool.append(GenerateCoach(WorldID))

    CoachPool = sorted(CoachPool, key = lambda k: k.ReputationRating + (3*k.GameplanRating) + k.CharismaRating, reverse = True)
    TeamList = sorted(TeamsThatNeedCoaches, key = lambda k: k[0].TeamPrestige, reverse = True)

    DraftList  = []
    PositionMultiplier = 0
    for Position in CoachesPerTeam:
        PositionMultiplier +=1
        for TeamTuple in TeamList:
            if TeamTuple[1] == 0:
                continue
            #print(TeamTuple[0])
            CoachesLeft = CoachPool.__len__()
            CoachToPop = random.randint(0, int(CoachesLeft / 8))
            CoachForTeam = CoachPool.pop(CoachToPop)
            TS = TeamSeason.objects.get(WorldID=WorldID, TeamID = TeamTuple[0], LeagueSeasonID = CurrentSeason)
            CTS = CoachTeamSeason(WorldID=WorldID, TeamSeasonID = TS, CoachID = CoachForTeam, Position = Position)
            CTS.Salary = PositionMultiplier * TeamTuple[0].TeamPrestige
            CTS.save()

    CurrentSeason.CoachesCreated = True
    CurrentSeason.save()
    return None


def CreateTeamSeasons(LS, WorldID):

    CurrentWorld = LS.WorldID
    ListOfTeams = Team.objects.filter(WorldID = CurrentWorld)
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    CurrentDate = Calendar.objects.get(WorldID = WorldID, IsCurrent = 1)

    for u in ListOfTeams:
        obj, created = TeamSeason.objects.get_or_create(WorldID=WorldID, TeamID = u, LeagueSeasonID = CurrentSeason)
        obj.save()

    ListOfTeamSeasons = sorted(TeamSeason.objects.filter(WorldID = CurrentWorld), key = lambda k: k.RankingTuple, reverse = True)


    CurrentSeason.TeamSeasonsCreated = True
    CurrentSeason.save()

def ConfigureLineups():


    return None


def EndRegularSeason(WorldID):
    CurrentSeason = LeagueSeason.objects.filter(WorldID=WorldID).filter(IsCurrent = 1).first()
    CurrentLeague = CurrentSeason.LeagueID
    CurrentWorld = World.objects.get(WorldID=WorldID)
    #put tourney check here
    Today = Calendar.objects.get(WorldID=WorldID, IsCurrent=1)

    print('time to do tourney stuff!')
    CalculateRankings(CurrentSeason, CurrentWorld)


    if CurrentSeason.TournamentCreated == False:


        #TeamsInTournament = 64
        NumberOfTeamsInTournament = CurrentLeague.NumberOfTournamentTeams
        GamesInTournament = NumberOfTeamsInTournament - 1
        Regions = ['South','East','West','Midwest']
        NumberOfTournamentRounds = int(log(NumberOfTeamsInTournament,2))

        TeamSeasonList = TeamSeason.objects.filter(WorldID= CurrentWorld).filter(LeagueSeasonID = CurrentSeason)
        for TS in TeamSeasonList:
            if TS.ConferenceRank == 1:
                TS.ConferenceChampion = True
                TS.save()
        for TS in sorted(TeamSeasonList, key=lambda k: k.TournamentBidRankingTuple)[:NumberOfTeamsInTournament]:
            TS.TournamentBid = True
            TS.save()

        TournamentRankCount = 1
        for TS in sorted(TeamSeasonList.filter(TournamentBid = True), key=lambda k: k.NationalRank):
            TS.TournamentRank = TournamentRankCount
            TS.save()
            TournamentRankCount +=1

        LastRoundDate = Today.NextDayN(3 * NumberOfTournamentRounds)
        ThisRoundDate = LastRoundDate.NextDayN(0)

        DefaultSeedOrder = [1,8,4,5,3,6,7,2]
        SeedOrder = []
        for u in DefaultSeedOrder:
            if u <= NumberOfTeamsInTournament / 8:
                SeedOrder.append(u)
        print('Seed order!!', SeedOrder)
        print('NumberOfTeamsInTournament',NumberOfTeamsInTournament,'GamesInTournament',GamesInTournament,'NumberOfTournamentRounds',NumberOfTournamentRounds)

        T = Tournament(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, TournamentStarted = True, IsPostseason = True, TeamsInTournament = NumberOfTeamsInTournament, RoundsInTournament = NumberOfTournamentRounds)
        T.save()
        TournamentGameNumber = 1
        for TournamentRoundNumber in range(1,NumberOfTournamentRounds+1):
            TournamentRoundDict = {'WorldID': CurrentWorld, 'TournamentID': T, 'RoundStarted': False, 'TournamentRoundNumber': TournamentRoundNumber}

            System_TournamentRound_Clone = System_TournamentRound.objects.get(TournamentRoundNumber = TournamentRoundNumber)

            MinGameNumber = System_TournamentRound_Clone.MinGameNumber
            MaxGameNumber = System_TournamentRound_Clone.MaxGameNumber
            NumberOfGames = System_TournamentRound_Clone.NumberOfGames
            NumberOfTeams = System_TournamentRound_Clone.NumberOfTeams
            IsChampionshipRound = System_TournamentRound_Clone.IsChampionshipRound

            TournamentRoundDict['MinGameNumber'] = MinGameNumber
            TournamentRoundDict['MaxGameNumber'] = MaxGameNumber
            TournamentRoundDict['NumberOfGames'] = NumberOfGames
            TournamentRoundDict['NumberOfTeams'] = NumberOfTeams
            TournamentRoundDict['IsChampionshipRound'] = IsChampionshipRound

            if TournamentRoundNumber in [1,2]:
                TournamentRoundDict['IsFinalFour'] = True
            if TournamentRoundNumber == NumberOfTournamentRounds:
                TournamentRoundDict['RoundStarted'] = True
            ThisRoundDate = ThisRoundDate.NextDayN(-2)

            TR = TournamentRound(**TournamentRoundDict)
            TR.save()

            if TournamentRoundNumber < NumberOfTournamentRounds:
                for G in range(0,NumberOfGames):

                    NewGame = Game(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, GameDateID = ThisRoundDate, TournamentID = T, GameTime = '19:05', TournamentRoundID = TR, TournamentGameNumber = TournamentGameNumber)
                    NewGame.save()
                    TournamentGameNumber +=1

            elif TournamentRoundNumber == NumberOfTournamentRounds:
                #TournamentGameNumber = GamesInTournament + 1
                for G in range(1,int(NumberOfTeamsInTournament) + 1):

                    HighSeed = G

                    Region, created = TournamentRegion.objects.get_or_create(TournamentRegionName = Regions[G % 4])

                    #HighSeedTeam = TeamSeason.objects.get(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, NationalRank = HighSeed)
                    #LowSeedTeam  = TeamSeason.objects.get(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, NationalRank = LowSeed)

                    HighSeedTeam = TeamSeason.objects.get(WorldID=CurrentWorld, LeagueSeasonID = CurrentSeason, TournamentRank = HighSeed)

                    HighSeedTeam.TournamentRegionID = Region


                    HighSeedTeam.save()

                for R in Regions:
                    Region, created = TournamentRegion.objects.get_or_create(TournamentRegionName = R)
                    TeamsInRegion = sorted([u for u in TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason, WorldID = CurrentWorld, TournamentRegionID = Region)], key=lambda b: b.NationalRank )

                    TeamPairs = []

                    for u in SeedOrder:
                        Pair = {'HighSeedTeam':TeamsInRegion[u - 1], 'HighSeed': u, 'LowSeedTeam': TeamsInRegion[TeamsInRegion.__len__() - u], 'LowSeed': TeamsInRegion.__len__() - u + 1}
                        print(Pair)
                        TeamPairs.append(Pair)
                    for TeamPair in TeamPairs:
                        HighSeedTeam = TeamPair['HighSeedTeam']
                        LowSeedTeam = TeamPair['LowSeedTeam']
                        HighSeed = TeamPair['HighSeed']
                        LowSeed = TeamPair['LowSeed']

                        GameNum = TournamentGameNumber#AdjustedGameNumberMap[math.ceil(TournamentGameNumber / 4.0)] + ((TournamentGameNumber % 4) * 8)

                        HighSeedTeam.TournamentSeed = HighSeed
                        LowSeedTeam.TournamentSeed  = LowSeed

                        HighSeedTeam.save()
                        LowSeedTeam.save()

                        NewGame = Game(WorldID=CurrentWorld, TournamentRegionID = Region, LeagueSeasonID = CurrentSeason, GameDateID = ThisRoundDate, TournamentID = T, GameTime = '19:05', TournamentRoundID = TR, HomeTeamSeed = HighSeed, AwayTeamSeed = LowSeed, HomeTeamID = HighSeedTeam.TeamID, AwayTeamID = LowSeedTeam.TeamID, TournamentGameNumber = TournamentGameNumber)
                        NewGame.save()

                        TournamentGameNumber +=1

            FinalFourRegion, created = TournamentRegion.objects.get_or_create(IsFinalFour = True, TournamentRegionName = 'Final Four')
            for G in Game.objects.filter(TournamentRoundID = TR).filter(WorldID = CurrentWorld):
                print(G, G.TournamentRegionID, G.NextTournamentGameID)
                Region = G.TournamentRegionID
                ThisGame = G.NextTournamentGameID
                if ThisGame is None:
                    continue
                else:
                    while ThisGame is not None:
                        if ThisGame.TournamentRoundID.IsFinalFour and ThisGame.TournamentRegionID is None:
                            ThisGame.TournamentRegionID = FinalFourRegion
                            ThisGame.save()
                        elif ThisGame.TournamentRegionID is None:
                            ThisGame.TournamentRegionID = Region
                            ThisGame.save()

                        ThisGame = ThisGame.NextTournamentGameID



        TournamentDict = {}


        AdjustedGameNumberMap = {
            1:	1,
            2:	7,
            3:	5,
            4:	3,
            5:	4,
            6:	6,
            7:	8,
            8:	2
        }

        TR = TournamentRound.objects.filter(TournamentID = T, TournamentRoundNumber = NumberOfTournamentRounds).first()

        CurrentSeason.TournamentCreated = True
        CurrentSeason.save()
    CurrentSeason.save()
    return None



def GraduateSeniors(WorldID, CurrentSeason):

    SeniorList = Player.objects.filter(WorldID = WorldID).filter(PlayerClass = 'Senior')
    for P in SeniorList:
        P.PlayerClass = 'Graduated'
        P.save()


def AddYearToPlayers(WorldID, CurrentSeason):
    ClassNextYearMap = {
        'HS Junior': 'HS Senior',
        'HS Senior': 'Freshman',
        'Freshman': 'Sophomore',
        'Sophomore': 'Junior',
        'Junior': 'Senior',
        'Senior': 'Graduated'
    }

    PlayerList = Player.objects.filter(WorldID = WorldID).exclude(PlayerClass='Graduated')
    for P in PlayerList:
        P.PlayerClass = ClassNextYearMap[P.PlayerClass]
        P.save()


def AddRecruitsToTeams(WorldID, CurrentSeason):


    return None


def BeginOffseason(WorldID):

    CurrentSeason = LeagueSeason.objects.filter(WorldID = WorldID).filter(IsCurrent = True).first()

    CurrentSeason.OffseasonStarted = True
    CurrentSeason.save()

    NationalAwards(WorldID, CurrentSeason)

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

    CurrentDate = Calendar.objects.get(WorldID = WorldID, IsCurrent = True)
    StartYear = CurrentDate.Year
    if not IsFirstLeagueSeason:
        CurrentLeagueSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1, LeagueID=LeagueID)
        CurrentLeagueSeason.IsCurrent = False
        CurrentLeagueSeason.save()


    LS = LeagueSeason(WorldID = WorldID, LeagueID=LeagueID, IsCurrent = True, SeasonStartYear = StartYear, SeasonEndYear = StartYear+1)


    LS.CoachCarouselDateID            = Calendar.objects.filter(WorldID = WorldID).filter(Date__year = StartYear+1).filter(Date__month = 4).filter(Date__day = 20).first()
    LS.PlayerDepartureDayDateID       = Calendar.objects.filter(WorldID = WorldID).filter(Date__year = StartYear+1).filter(Date__month = 5).filter(Date__day =  1).first()
    LS.RecruitingSigningDayDateID     = Calendar.objects.filter(WorldID = WorldID).filter(Date__year = StartYear+1).filter(Date__month = 5).filter(Date__day = 10).first()
    LS.IncomingPlayerArrivalDayDateID = Calendar.objects.filter(WorldID = WorldID).filter(Date__year = StartYear+1).filter(Date__month = 8).filter(Date__day =  1).first()
    LS.NextSeasonCutoverDayDateID     = Calendar.objects.filter(WorldID = WorldID).filter(Date__year = StartYear+1).filter(Date__month = 9).filter(Date__day =  1).first()

    LS.save()

    if LS.NextSeasonCutoverDayDateID is None:
        return None

    DoAudit = True

    if DoAudit:
        start = time.time()
    CreateTeamSeasons(LS, WorldID)
    LS.TeamSeasonsCreated = True
    LS.save()
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create Team Seasons')


    if IsFirstLeagueSeason:
        if DoAudit:
            start = time.time()
        CreatePlayers(LS, WorldID)
        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create Players')

        CreateCoaches(LS, WorldID)

    if DoAudit:
        start = time.time()

    CreateRecruitingClass(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create Recruiting Class')
    if DoAudit:
        start = time.time()

    CreateSchedule(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 3, AuditDescription='CreateSchedule')
    if DoAudit:
        start = time.time()

    CalculateRankings(LS, WorldID)
    CalculateConferenceRankings(LS, WorldID)
    SelectBroadcast(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='CalculateRankings, CalculateConferenceRankings, SelectBroadcast')
