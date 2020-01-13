from .models import Audit,TeamGame,Bowl,Position,Class, CoachPosition, NameList, Week, TeamSeasonWeekRank, TeamRivalry, League, PlayoffRegion, System_PlayoffRound, PlayoffRound, TeamSeasonDateRank, World, Headline, Playoff, CoachTeamSeason, TeamSeason, RecruitTeamSeason, Team, Player, Coach, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill, CoachTeamSeason
import random
from datetime import timedelta, date
import numpy
from .scripts.PickName import RandomName, RandomPositionAndMeasurements, RandomCity
import math
from django.db.models import F, Count
#from django.db.models import Max, Avg, Count, Func,  Sum, Case, When, FloatField, CharField, Value
from .scripts.rankings import CalculateRankings, CalculateConferenceRankings, SelectBroadcast
from .scripts.SeasonAwards import NationalAwards, SelectPreseasonAllAmericans
from .scripts.Recruiting import FindNewTeamsForRecruit, RandomRecruitPreference
from .scripts.import_csv import createCalendar
from .utilities import DistanceBetweenCities, WeightedProbabilityChoice, NormalBounds, Min, Max, NormalTrunc, NormalVariance
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

    ScheduleDict = {}
    for t in TeamList:
        ScheduleDict[t] = {'CurrentTeamSeason': t.CurrentTeamSeason, 'NonConferenceGames': 0, 'ConferenceGames': 0, 'HomeGames': 0, 'AwayGames': 0, 'WeeksScheduled': [], 'AvailableWeeks':[w for w in WeekMap], 'OpposingTeams': [], 'UnschedulableTeams': [], 'Conference': t.ConferenceID, 'ConferenceRivals': [], 'NonConferenceRivals': [], }

    WeeksInSeason = len(WeekMap)
    GamePerTeam = 12
    NonConferenceGames = 4
    ConferenceGames = GamePerTeam - NonConferenceGames

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
    GamesToSchedule = [(Rivalry.Team1TeamID, Rivalry.Team2TeamID) for Rivalry in TeamRivalry.objects.filter(WorldID = WorldID) if ScheduleDict[Rivalry.Team1TeamID]['Conference'] == ScheduleDict[Rivalry.Team2TeamID]['Conference']]

    while len(UnscheduledTeams) >= 2 and ScheduleLoopCount < 400:
        print()
        print('ScheduleLoopCount', ScheduleLoopCount, 'UnscheduledTeams:', len(UnscheduledTeams))

        if ScheduleLoopCount % 50 == 0 and ScheduleLoopCount > 0:
            print()
            print('Teams still available:')
            for T in UnscheduledTeams:
                print(T, [w for w in WeekMap if w not in ScheduleDict[T]['WeeksScheduled']], 'Conf games needed:',ConferenceGames - ScheduleDict[T]['ConferenceGames'], 'Non-Conf games needed:',NonConferenceGames - ScheduleDict[T]['NonConferenceGames'])
            print()

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

            IsConferenceGame = ScheduleDict[HomeTeam]['Conference'] == ScheduleDict[AwayTeam]['Conference']
            if AwayTeam in ScheduleDict[HomeTeam]['OpposingTeams'] or AwayTeam in ScheduleDict[HomeTeam]['UnschedulableTeams'] :
                KeepGame = False
            else:
                if IsConferenceGame:
                    if  ScheduleDict[HomeTeam]['ConferenceGames'] < ConferenceGames and ScheduleDict[AwayTeam]['ConferenceGames'] < ConferenceGames:
                        KeepGame = True
                    else:
                        KeepGame = False

                else:
                    if  ScheduleDict[HomeTeam]['NonConferenceGames'] < NonConferenceGames and ScheduleDict[AwayTeam]['NonConferenceGames'] < NonConferenceGames:
                        KeepGame = True
                    else:
                        KeepGame = False

            if KeepGame:
                print('game', game)
                if (ScheduleDict[HomeTeam]['HomeGames'] - ScheduleDict[HomeTeam]['AwayGames']) > (ScheduleDict[AwayTeam]['HomeGames'] - ScheduleDict[AwayTeam]['AwayGames']):
                    HomeTeam, AwayTeam = AwayTeam, HomeTeam

                PossibleRivalries = TeamRivalry.objects.filter(Team1TeamID = HomeTeam).filter(Team2TeamID = AwayTeam) | TeamRivalry.objects.filter(Team2TeamID = HomeTeam).filter(Team1TeamID = AwayTeam)
                TeamRivalryID = PossibleRivalries.first()

                GameTime = str(random.choice(GameTimeHourChoices)) + ':' + random.choice(GameTimeMinuteChoices)



                if IsConferenceGame:
                    WeekSet = [(w, w**4) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    print('    Conf WeekSet', WeekSet)
                    if len(WeekSet) == 0:
                        print('Couldn\t find a week for this game!')
                        ScheduleDict[HomeTeam]['UnschedulableTeams'].append(AwayTeam)
                        ScheduleDict[AwayTeam]['UnschedulableTeams'].append(HomeTeam)
                        continue
                    WeekNumber = WeightedProbabilityChoice(WeekSet, None)
                    ScheduleDict[HomeTeam]['ConferenceGames'] += 1
                    ScheduleDict[AwayTeam]['ConferenceGames'] += 1
                else:
                    WeekSet = [(w, (WeeksInSeason - w + 1)) for w in WeekMap if w not in ScheduleDict[HomeTeam]['WeeksScheduled'] and w not in ScheduleDict[AwayTeam]['WeeksScheduled']]
                    print('Non-Conf WeekSet', WeekSet)
                    if len(WeekSet) == 0:
                        print('Couldn\t find a week for this game!')
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

    print('Ending schedule loop. ScheduleLoopCount:', ScheduleLoopCount, 'UnscheduledTeams:', UnscheduledTeams)


    Game.objects.bulk_create(GamesToSave, ignore_conflicts=True)
    TeamGame.objects.bulk_create(TeamGamesToSave, ignore_conflicts=True)

    CurrentSeason.ScheduleCreated = True
    CurrentSeason.save()


def GeneratePlayer(t, s, c, WorldID):
    OverallMean = 70
    OverallSigma = 9

    PlayerClasses = list(Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate'))
    if c is not None:
        PlayerClasses = [c]

    Positions = Position.objects.all()


    ClassOverallPercentage = {
        'HS Senior': (.70, .85),
        'Freshman': (.75, .93),
        'Sophomore': (.82, .98),
        'Junior': (.88, 1),
        'Senior': (.90, 1)
    }

    PlayerPositionAndHeight = RandomPositionAndMeasurements()
    PlayerPositionID = PlayerPositionAndHeight['PositionID']
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

    PlayerDict = {'WorldID':WorldID, 'ClassID':PlayerClassID, 'PlayerFirstName': PlayerFirstName, 'PlayerLastName':PlayerLastName, 'JerseyNumber':PlayerNumber, 'Height':PlayerHeight, 'Weight': PlayerWeight, 'CityID': PlayerCityID, 'PositionID': PlayerPositionID, 'IsRecruit':PlayerClassID.IsRecruit}

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
        'Freshman': .95,
        'Sophomore': .975,
        'Junior': .99,
        'Senior': 1,
    }

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

    C.SituationalAggressivenessTendency = NormalVariance(1.0)
    C.PlayClockAggressivenessTendency = NormalVariance(1.0)
    C.PlaycallPassTendency = int(NormalTrunc(55,10,30,85))

    return C



def CreatePlayers(LS, WorldID):

    PlayersPerTeam = 72

    LotteryOrder = []

    MinimumRosterComposition = {
        'ClassID': {c.ClassID: 12 for c in Class.objects.filter(IsRecruit = False).exclude(ClassName = 'Graduate')},
        'Position': [u for u in Position.objects.all().values('PositionAbbreviation', 'PositionMinimumCountPerTeam').annotate(Position = F('PositionAbbreviation'))]
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
    Player.objects.bulk_create(PlayerPool, ignore_conflicts=True)

    PlayerList = Player.objects.filter(WorldID = WorldID)
    PlayerSkillPool = []
    for P in PlayerList:
        PlayerSkillPool.append(PopulatePlayerSkills(P, CurrentSeason, WorldID))
    PlayerSeasonSkill.objects.bulk_create(PlayerSkillPool, ignore_conflicts=True)
    PlayerPool = [u for u in PlayerList.values('PlayerID', 'ClassID', 'PositionID__PositionAbbreviation', 'playerseasonskill__OverallRating').annotate(Position = F('PositionID__PositionAbbreviation')).order_by('-playerseasonskill__OverallRating')]#sorted(PlayerPool, key = lambda k: k.CurrentSkills.OverallRating, reverse = True)

    PlayersTeamSeasonToSave = []
    for Round in LotteryOrder:
        if Round['TeamsInThisRoundCount'] == 0:
            continue

        for T in sorted(Round['TeamsInThisRound'], key=lambda k: random.random()):
            TS = T.CurrentTeamSeason
            if T not in TeamRosterCompositionNeeds:
                TeamRosterCompositionNeeds[T] = {'ClassID': MinimumRosterComposition['ClassID'], 'Position': {Pos['Position']: Pos['PositionMinimumCountPerTeam'] for Pos in MinimumRosterComposition['Position']}}
            ClassesNeeded =   [u for u in TeamRosterCompositionNeeds[T]['ClassID']    if TeamRosterCompositionNeeds[T]['ClassID'][u]    > 0 ]
            PositionsNeeded = [u for u in TeamRosterCompositionNeeds[T]['Position'] if TeamRosterCompositionNeeds[T]['Position'][u] > 0 ]

            ClassNeedsMet = False
            PositionNeedsMet = False

            if len(ClassesNeeded) == 0:
                ClassNeedsMet = True
            if len(PositionsNeeded) == 0:
                PositionNeedsMet = True

            AvailablePlayers = [u for u in PlayerPool  if (ClassNeedsMet or u['ClassID'] in ClassesNeeded) and (PositionNeedsMet or u['Position'] in PositionsNeeded)]
            if len(AvailablePlayers) == 0:
                PlayerForTeam = PlayerPool[-1]
            elif len(AvailablePlayers) < 21:
                PlayerForTeam = random.choice(AvailablePlayers)
            else:
                AvailablePlayers = AvailablePlayers[:int(len(AvailablePlayers)/12)]
                PlayerForTeam = random.choice(AvailablePlayers)
            PlayerPool.remove(PlayerForTeam)


            TeamRosterCompositionNeeds[T]['ClassID'][PlayerForTeam['ClassID']] -=1
            TeamRosterCompositionNeeds[T]['Position'][PlayerForTeam['Position']] -=1

            P = PlayerList.filter(PlayerID = PlayerForTeam['PlayerID']).first()
            PTS = PlayerTeamSeason(WorldID=WorldID, TeamSeasonID = TS, PlayerID = P, ClassID = P.ClassID)
            PlayersTeamSeasonToSave.append(PTS)

    PlayerTeamSeason.objects.bulk_create(PlayersTeamSeasonToSave, ignore_conflicts=True)

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
        TS.ScholarshipsToOffer = TeamSeniors
        TS.save()

    RecruitPool = []
    print('Creating ',NumberOfPlayersNeeded,' recruits')
    SeniorClassID = Class.objects.filter(ClassName = 'HS Senior').first()
    for PlayerCount in range(0,NumberOfPlayersNeeded):
        RecruitPool.append(GeneratePlayer(None, CurrentSeason, SeniorClassID, WorldID))
        #print(PlayerCount, len(RecruitPool))
    Player.objects.bulk_create(RecruitPool, ignore_conflicts=True)

    RecruitPool = Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit = True)

    RecruitSkillPool = []
    for P in RecruitPool:
        RecruitSkillPool.append(PopulatePlayerSkills(P, CurrentSeason, CurrentWorld))
    PlayerSeasonSkill.objects.bulk_create(RecruitSkillPool, ignore_conflicts=True)


    RecruitPool = sorted(RecruitPool, key = lambda k: NormalBounds(k.OverallRating,3,10,99), reverse = True)


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


    PositionalRankingTracker = {}


    RecruitCount = 0
    RTSToSave = []
    print('Creating RecruitTeamSeasons')
    for Recruit in RecruitPool:
        RecruitCount +=1
        Pos = Recruit.PositionID
        PlayerStar = 1#WeightedProbabilityChoice(PositionStarList[Pos], 'QB')
        #print(Recruit.PlayerFirstName, Recruit.PlayerLastName, RecruitCount, PlayerStar)
        if Pos not in PositionalRankingTracker:
            PositionalRankingTracker[Pos] = 0
        PositionalRankingTracker[Pos] +=1

        for Star in sorted(StarDistribution, key=lambda k: k, reverse=True):
            if PlayerStar == 1 and StarDistribution[Star] * NumberOfRecruits > RecruitCount:
                PlayerStar = Star

        Recruit.RecruitingStars = PlayerStar
        Recruit.Recruiting_NationalRank = RecruitCount
        Recruit.Recruiting_NationalPositionalRank = PositionalRankingTracker[Pos]

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

    CoachesPerTeam = CoachPosition.objects.all()

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
            print('Assigning coach for ', TS, 'at', Position)
            CoachesLeft = CoachList.__len__()
            CoachToPop = random.randint(0, int(CoachesLeft / 8))
            CoachForTeam = CoachList.pop(CoachToPop)
            CTS = CoachTeamSeason(WorldID=WorldID, TeamSeasonID = TS, CoachID = CoachForTeam, CoachPositionID = Position)

            CTSToSave.append(CTS)
    CoachTeamSeason.objects.bulk_create(CTSToSave, ignore_conflicts=False)

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

            HomeTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = HomeTS, IsHomeTeam = True,  GameID = G, TeamSeasonWeekRankID = HomeTSWR)
            AwayTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = AwayTS, IsHomeTeam = False, GameID = G, TeamSeasonWeekRankID = AwayTSWR)

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

            HomeTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = HomeTS, IsHomeTeam = True,  GameID = G, TeamSeasonWeekRankID=HomeTSWR)
            AwayTeamGame = TeamGame(WorldID=CurrentWorld,TeamSeasonID = AwayTS, IsHomeTeam = False, GameID = G, TeamSeasonWeekRankID=AwayTSWR)

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
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Create Team Seasons')


    if IsFirstLeagueSeason:

        #CreateCoaches(LS, WorldID)
        if DoAudit:
            start = time.time()
        #CreatePlayers(LS, WorldID)
        if DoAudit:
            end = time.time()
            TimeElapsed = end - start
            A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='Create Players')


    if DoAudit:
        start = time.time()

    #CreateRecruitingClass(LS, WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 2, AuditDescription='Create Recruiting Class')
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
    SelectPreseasonAllAmericans(WorldID, LS)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='CalculateRankings, CalculateConferenceRankings, SelectBroadcast')
