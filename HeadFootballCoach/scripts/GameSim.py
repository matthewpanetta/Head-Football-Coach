from ..models import World, GameDrive, DrivePlay, CoachTeamSeason, PlayerTeamSeasonDepthChart, Coach, Week, Calendar, Headline, Playoff, TeamSeason, Team, Player, Game,PlayerTeamSeason, LeagueSeason, GameEvent, PlayerTeamSeasonSkill, PlayerGameStat
import random
from django.db.models import  Max, Q, F, Value, CharField
from django.db.models.functions import Length, Concat
from .rankings import CalculateRankings
from django.db import transaction
from ..utilities import WeightedProbabilityChoice, IfNull, SecondsToMinutes, Average, NormalTrunc, Max_Int
import math
from django.db import connection, reset_queries

def RoundUp(Val):
    return int(math.ceil(Val / 10.0)) * 10

def AdjustBiggestLead(HomeTeam, AwayTeam):

    HomeLead = Max_Int(HomeTeam.Points - AwayTeam.Points, 0)
    AwayLead = Max_Int(AwayTeam.Points - HomeTeam.Points, 0)

    HomeTeam.BiggestLead = Max_Int(HomeTeam.BiggestLead, HomeLead)
    AwayTeam.BiggestLead = Max_Int(AwayTeam.BiggestLead, AwayLead)

    return None


def CalculateGameScore(PlayerGameStats):

    GameScoreMap = [
        {'Stat': 'RUS_Yards', 'PointToStatRatio': 1.0 / 10, 'Display': ' rush yards'},
        {'Stat': 'RUS_TD'   , 'PointToStatRatio': 6.0 / 1, 'Display': ' rush TDs'},
        {'Stat': 'PAS_Yards', 'PointToStatRatio': 1.0 / 25, 'Display': ' pass yards'},
        {'Stat': 'PAS_TD',    'PointToStatRatio': 4.0 / 1, 'Display': ' pass TDs'},
        {'Stat': 'PAS_Completions', 'PointToStatRatio': 1.0 / 10, 'Display': ' comp'},
        {'Stat': 'REC_Receptions', 'PointToStatRatio': 1.0 / 2, 'Display': ' rec.'},
        {'Stat': 'REC_Yards', 'PointToStatRatio': 1.0 / 15, 'Display': ' rec. yards'},
        {'Stat': 'REC_TD',    'PointToStatRatio': 5.0 / 1, 'Display': ' rec. TDs'},
        {'Stat': 'PAS_INT',    'PointToStatRatio': -4.0 / 1, 'Display': ' picks'},
        {'Stat': 'PAS_Sacks',  'PointToStatRatio': -1.0 / 4, 'Display': ' sacked'},
        {'Stat': 'DEF_Sacks',  'PointToStatRatio': 2.5 / 1, 'Display': ' sacks'},
        {'Stat': 'DEF_Tackles',  'PointToStatRatio': 1.0 / 2, 'Display': ' tackles'},
        {'Stat': 'DEF_TacklesForLoss',  'PointToStatRatio': 2.0 / 1, 'Display': ' TFLs'},
        {'Stat': 'DEF_Deflections',  'PointToStatRatio': 2.0 / 1, 'Display': ' defl'},
        {'Stat': 'DEF_INT',  'PointToStatRatio': 6.0 / 1, 'Display': ' INTS'},
        {'Stat': 'DEF_TD',  'PointToStatRatio': 6.0 / 1, 'Display': ' def TDs'},
        {'Stat': 'FUM_Fumbles',  'PointToStatRatio': -3.0 / 1, 'Display': ' fumbles'},
        {'Stat': 'FUM_Forced',  'PointToStatRatio': 4.0 / 1, 'Display': ' fumb frcd'},
        {'Stat': 'FUM_Recovered',  'PointToStatRatio': 1.0 / 1, 'Display': ' fumb rec.'},
        {'Stat': 'BLK_Sacks',  'PointToStatRatio': -3.0 / 1, 'Display': ' sacks alwd.'},
        {'Stat': 'BLK_Blocks',  'PointToStatRatio': 1.0 / 10, 'Display': ' blocks'},
    ]

    GameSummary = {'GameScore': 0}
    for StatObj in GameScoreMap:
        StatObj['DisplayValue'] = getattr(PlayerGameStats, StatObj['Stat'])
        StatObj['GameScoreValue'] = StatObj['DisplayValue'] * StatObj['PointToStatRatio']
        GameSummary['GameScore'] += StatObj['GameScoreValue']

    Displays = [str(int(u['DisplayValue'])) + u['Display'] for u in sorted(GameScoreMap, key=lambda k: k['GameScoreValue'],reverse=True)[:2]]
    GameSummary['TopStatStringDisplay1'] = Displays[0]
    GameSummary['TopStatStringDisplay2'] = Displays[1]

    return GameSummary

def Min(a,b):
    if a > b:
        return b
    else:
        return a


def YardsBound(BallSpot, YardsThisPlay):
    return Min(100 - BallSpot, YardsThisPlay)


def DeterminePlayChoice(Down=4, YardsToGo=10, BallSpot=1, Period=1, OffensivePointDifferential = 0, SecondsLeftInPeriod = 60, IsCloseGame=False, IsLateGame=False, HalfEndPeriod = True, FinalPeriod = True):
    DrivePlayObject = DrivePlay(Down=Down, YardsToGo=YardsToGo, BallSpot=BallSpot,Period=Period, OffensivePointDifferential=OffensivePointDifferential, SecondsLeftInPeriod=SecondsLeftInPeriod)
    PlayClockUrgency = 0
    PlayChoices = {'Run': 50,'Pass': 50,'Punt': 0,'Field Goal': 0}

    if (Period not in [1,3] and SecondsLeftInPeriod <= (3 * 60)) or (Period >= 4 and SecondsLeftInPeriod <= (5 * 60)):
        #run out clock end of first half
        if FinalPeriod:
            if not IsCloseGame:
                PlayClockUrgency = -2
                if Down == 4:
                    PlayChoices = {'Run': 0,'Pass': 0,'Punt': 100,'Field Goal': 0}
                else:
                    PlayChoices = {'Run': 80,'Pass': 20,'Punt': 0,'Field Goal': 0}
            else:
                if Down == 4:
                    PlayClockUrgency = 1
                    if BallSpot > 70 and OffensivePointDifferential in [-3, -2, -1, 0, 1, 4,5,6,11,12,13,14]:
                        PlayChoices = {'Run': 0,'Pass': 0,'Punt': 0,'Field Goal': 100}
                    elif OffensivePointDifferential < -3:
                        if YardsToGo <= 2:
                            PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}
                        elif YardsToGo >1 and YardsToGo <= 4:
                            PlayChoices = {'Run': 60,'Pass': 40,'Punt': 0,'Field Goal': 0}
                        else:
                            PlayChoices = {'Run': 0,'Pass': 100,'Punt': 0,'Field Goal': 0}
                    elif YardsToGo <= 2:
                        PlayChoices = {'Run': 70,'Pass': 15,'Punt': 15,'Field Goal': 0}
                    else:
                        if BallSpot > 70:
                            PlayChoices = {'Run': 1,'Pass': 9,'Punt': 10,'Field Goal': 80}
                        else:
                            PlayChoices = {'Run': 1,'Pass': 9,'Punt': 90,'Field Goal': 0}

                else:
                    if SecondsLeftInPeriod <= 30 and BallSpot > 70 and OffensivePointDifferential in [-3, -2, -1, 0]:
                        PlayClockUrgency = 2
                        PlayChoices = {'Run': 0,'Pass': 0,'Punt': 0,'Field Goal': 100}
                    elif OffensivePointDifferential > 0:
                        PlayClockUrgency = -3
                        if Down == 3 and YardsToGo > 5:
                            PlayChoices = {'Run': 15,'Pass': 85,'Punt': 0,'Field Goal': 0}
                        else:
                            PlayChoices = {'Run': 85,'Pass': 15,'Punt': 0,'Field Goal': 0}
                    else:
                        PlayClockUrgency = 2
                        PlayChoices = {'Run': 30,'Pass': 70,'Punt': 0,'Field Goal': 0}
        else:
            if SecondsLeftInPeriod <= (60) and BallSpot < 30 and Down < 4:
                PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}
                PlayClockUrgency = -3

            elif SecondsLeftInPeriod <= (60) and BallSpot < 30 and Down == 4:
                if YardsToGo > 4:
                    PlayChoices = {'Run': 0,'Pass': 0,'Punt': 100,'Field Goal': 0}
                else:
                    PlayChoices = {'Run': 15,'Pass': 15,'Punt': 70,'Field Goal': 0}

            elif SecondsLeftInPeriod <= (60) and BallSpot > 70:
                if SecondsLeftInPeriod < 20 or Down == 4:
                    PlayClockUrgency = 2
                    if BallSpot > 95:
                        PlayChoices = {'Run': 33,'Pass': 33,'Punt': 0,'Field Goal': 33}
                    else:
                        PlayChoices = {'Run': 5,'Pass': 25,'Punt': 0,'Field Goal': 70}
                PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}
                PlayClockUrgency = -2

            elif Down < 4:
                PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}
                PlayClockUrgency = 1

            else:
                PlayChoices = {'Run': 0,'Pass': 0,'Punt': 100,'Field Goal': 0}


    elif Down == 3:
        PlayClockUrgency = 0
        if YardsToGo < 2:
            PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}
        elif YardsToGo > 6:
            PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}
        else:
            PlayChoices = {'Run': 30,'Pass': 70,'Punt': 0,'Field Goal': 0}
    elif Down == 4:
        PlayClockUrgency = 0
        if BallSpot > 70:
            if YardsToGo <= 1:
                PlayChoices = {'Run': 70,'Pass': 0,'Punt': 0,'Field Goal': 30}
            elif YardsToGo > 1 and YardsToGo < 4:
                PlayChoices = {'Run': 15,'Pass': 15,'Punt': 0,'Field Goal': 70}
            else:
                PlayChoices = {'Run': 1,'Pass': 2,'Punt': 0,'Field Goal': 97}
        elif BallSpot > 55:
            if YardsToGo <= 1:
                PlayChoices = {'Run': 70,'Pass': 0,'Punt': 30,'Field Goal': 0}
            elif YardsToGo > 1 and YardsToGo < 4:
                PlayChoices = {'Run': 15,'Pass': 15,'Punt': 70,'Field Goal': 0}
            else:
                PlayChoices = {'Run': 1,'Pass': 2,'Punt': 97,'Field Goal': 0}
        elif BallSpot < 30:
            if YardsToGo <= 1:
                PlayChoices = {'Run': 10,'Pass': 0,'Punt': 90,'Field Goal': 0}
            elif YardsToGo > 1 and YardsToGo < 4:
                PlayChoices = {'Run': 2,'Pass': 2,'Punt': 96,'Field Goal': 0}
            else:
                PlayChoices = {'Run': 0,'Pass': 1,'Punt': 99,'Field Goal': 0}
        else:
            if YardsToGo <= 1:
                PlayChoices = {'Run': 50,'Pass': 10,'Punt': 40,'Field Goal': 0}
            elif YardsToGo > 1 and YardsToGo < 4:
                PlayChoices = {'Run': 25,'Pass': 25,'Punt': 50,'Field Goal': 0}
            else:
                PlayChoices = {'Run': 5,'Pass': 15,'Punt': 80,'Field Goal': 0}
    else:
        PlayClockUrgency = 0
        PlayChoices = {'Run': 50,'Pass': 50,'Punt': 0,'Field Goal': 0}


    DrivePlayObject.Run_Prob = PlayChoices['Run']
    DrivePlayObject.Pass_Prob = PlayChoices['Pass']
    DrivePlayObject.Punt_Prob = PlayChoices['Punt']
    DrivePlayObject.FG_Prob = PlayChoices['Field Goal']
    DrivePlayObject.PlayClockUrgency = PlayClockUrgency

    return {'PlayChoices': PlayChoices, 'PlayClockUrgency': PlayClockUrgency, 'DrivePlayObject':DrivePlayObject}

def DetermineGoForTwo(OffensivePointDifferential, Period, SecondsLeftInPeriod, CoachObj):
    #For sure go for 2
    FourthAggr = CoachObj['FourthDownAggressiveness']
    if Period <= 2:
        if random.uniform(0,1) < (0 + (FourthAggr)):
            return True
        return False
    elif abs(OffensivePointDifferential) > 20:
        return False
    else:
        if OffensivePointDifferential in [-18, -13, -10, -5, -2, 1, 4, 5, 12, 15, 19]:
            return True
        #For sure go for 1
        elif OffensivePointDifferential in [-22, -17, -15, -12, -9, -8, -7, -4, -1, 0, 2, 3, 6, 8, 9, 16]:
            return False
        else:
            if random.uniform(0,1) < (.1 + (FourthAggr)):
                return True
            return False


def RandomInteger(a,b):
    if a < b:
        return random.randint(a,b)
    return random.randint(b,a)


def GameSim(game):

    # PlayType =["ast", "blkAtRim", "blkLowPost", "blkMidRange", "blkTp", "drb", "KCK_FGAtRim", "KCK_FGAtRimAndOne", "fgLowPost", "fgLowPostAndOne", "KCK_FGMidRange", "KCK_FGMidRangeAndOne", "foulOut", "ft", "injury", "missAtRim", "missFt", "missLowPost", "missMidRange", "missTp", "orb", "overtime", "pf", "quarter", "stl", "sub", "tov", "tp", "tpAndOne"]
    # ShotType = ["atRim" , "ft" , "lowPost" , "midRange" , "threePointer"]
    # Stat =[ "ast", "ba", "benchTime", "blk", "FieldTime", "drb", "energy", "fg", "KCK_FGAtRim", "fgLowPost", "KCK_FGMidRange", "KCK_FGA", "KCK_FGAAtRim", "KCK_FGALowPost", "KCK_FGAMidRange" , "ft", "fta", "gs", "min", "orb", "pf", "pts", "stl", "tov", "tp", "tpa"]
    #
    # CompositeRating = ["blocking", "fouling", "passing", "rebounding", "stealing", "turnovers", "usage"]


    if game.WasPlayed == 1:
        return None

    CurrentWorld  = game.WorldID

    CurrentSeason = game.LeagueSeasonID
    CurrentLeague = game.LeagueSeasonID.LeagueID

    CurrentWeek = game.WeekID

    TeamGames = game.teamgame_set.all()

    HomeTeamGame = TeamGames.filter(IsHomeTeam = True).first()
    AwayTeamGame = TeamGames.filter(IsHomeTeam = False).first()

    HomeTeamSeason = HomeTeamGame.TeamSeasonID
    AwayTeamSeason = AwayTeamGame.TeamSeasonID

    HomeTeam = HomeTeamSeason.TeamID
    AwayTeam = AwayTeamSeason.TeamID

    print()
    print('Simming ', HomeTeam, 'vs', AwayTeam)

    HomePlayerTeamSeasonDepthChart = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = HomeTeamSeason).values('PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID_id', 'IsStarter', 'DepthPosition').order_by('PositionID__PositionAbbreviation', 'DepthPosition')
    AwayPlayerTeamSeasonDepthChart = PlayerTeamSeasonDepthChart.objects.filter(PlayerTeamSeasonID__TeamSeasonID = AwayTeamSeason).values('PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID_id', 'IsStarter', 'DepthPosition').order_by('PositionID__PositionAbbreviation', 'DepthPosition')

    HomeTeamPlayers = Player.objects.filter(WorldID = CurrentWorld).filter(playerteamseason__TeamSeasonID = HomeTeamSeason).prefetch_related('playerteamseason_set__playerteamseasonskill').prefetch_related('playerteamseason_set__TeamSeasonID__TeamID', 'playerteamseason_set__TeamSeasonID').annotate(
        PlayerTeamSeasonID = Max('playerteamseason__PlayerTeamSeasonID'),
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField())
    )
    AwayTeamPlayers = Player.objects.filter(WorldID = CurrentWorld).filter(playerteamseason__TeamSeasonID = AwayTeamSeason).prefetch_related('playerteamseason_set__playerteamseasonskill').prefetch_related('playerteamseason_set__TeamSeasonID__TeamID', 'playerteamseason_set__TeamSeasonID').annotate(
        PlayerTeamSeasonID = Max('playerteamseason__PlayerTeamSeasonID'),
        PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField())
    )

    #print(HomeTeam.SchoolName +' hosts '+AwayTeam.SchoolName)
    HomeCoaches = CoachTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = HomeTeamSeason).select_related('CoachID')
    AwayCoaches = CoachTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = AwayTeamSeason).select_related('CoachID')

    HomeHeadCoach = HomeCoaches.get(CoachPositionID__CoachPositionAbbreviation = 'HC')
    AwayHeadCoach = AwayCoaches.get(CoachPositionID__CoachPositionAbbreviation = 'HC')

    PlayerSkills = {P.PlayerTeamSeasonID.PlayerID_id: P for P in PlayerTeamSeasonSkill.objects.filter(Q(PlayerTeamSeasonID__TeamSeasonID = HomeTeamSeason) | Q(PlayerTeamSeasonID__TeamSeasonID = AwayTeamSeason)).select_related('PlayerTeamSeasonID__PlayerID')}

    CoachDict = {
        HomeTeam: {'Coach': HomeHeadCoach.CoachID.__dict__, 'CoachTeamSeason': HomeHeadCoach.__dict__, 'TeamSeasonStrategy': HomeTeamSeason.teamseasonstrategy_set.all().first().__dict__},
        AwayTeam: {'Coach': AwayHeadCoach.CoachID.__dict__, 'CoachTeamSeason': AwayHeadCoach.__dict__, 'TeamSeasonStrategy': AwayTeamSeason.teamseasonstrategy_set.all().first().__dict__}
    }

    AdjustedOverallPowerFactor = 1.5

    HomePlayerTeamSeasonDepthChartDict = {}
    for P in HomePlayerTeamSeasonDepthChart:
        HomePlayerTeamSeasonDepthChartDict[P['PlayerTeamSeasonID__PlayerID_id']] = P

    AwayPlayerTeamSeasonDepthChartDict = {}
    for P in AwayPlayerTeamSeasonDepthChart:
        AwayPlayerTeamSeasonDepthChartDict[P['PlayerTeamSeasonID__PlayerID_id']] = P

    PassingStrategy_PassRushModifier = {
        'Deep Pass': 1.1,
        'Moderate Deep': 1.05,
        'Balanced': 1,
        'Moderate Short': .975,
        'Short': .95
    }

    PassingStrategy_YardsSigma = {
        'Deep Pass': 11,
        'Moderate Deep': 9,
        'Balanced': 7,
        'Moderate Short': 5,
        'Short': 3
    }

    PassingStrategy_CompletionModifier = {
        'Deep Pass': .9,
        'Moderate Deep': .95,
        'Balanced': 1,
        'Moderate Short': 1.05,
        'Short': 1.1
    }

    RunningBackStrategy = {
        'Deep Pass': .9,
        'Moderate Deep': .95,
        'Balanced': 1,
        'Moderate Short': 1.05,
        'Short': 1.1
    }


    BlitzStrategy = {
        'Heavy Blitz': 1.1,
        'Blitz': 1.05,
        'Balanced': 1,
        'Some Blitz': .95,
        'No Blitz': .9
    }

    PositionEnergyMap = {
        'QB': {'OnFieldEnergyDrain': .0075, 'SubOutThreshold': .5, 'SubInThreshold': .55, 'EnergyImpactOnOverall': (1/12.0)},
        'RB': {'OnFieldEnergyDrain': .0175 , 'SubOutThreshold': .75, 'SubInThreshold': .8, 'EnergyImpactOnOverall': (1/5.0)},
        'FB': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .75, 'SubInThreshold': .8, 'EnergyImpactOnOverall': (1/5.0)},
        'WR': {'OnFieldEnergyDrain': .013, 'SubOutThreshold': .75, 'SubInThreshold': .8, 'EnergyImpactOnOverall': (1/6.0)},
        'TE': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .75, 'SubInThreshold': .8, 'EnergyImpactOnOverall': (1/6.0)},
        'OT': {'OnFieldEnergyDrain': .01, 'SubOutThreshold': .6, 'SubInThreshold': .7, 'EnergyImpactOnOverall': (1/7.0)},
        'OG': {'OnFieldEnergyDrain': .01, 'SubOutThreshold': .6, 'SubInThreshold': .7, 'EnergyImpactOnOverall': (1/7.0)},
        'OC': {'OnFieldEnergyDrain': .01, 'SubOutThreshold': .6, 'SubInThreshold': .7, 'EnergyImpactOnOverall': (1/7.0)},
        'DE': {'OnFieldEnergyDrain': .02, 'SubOutThreshold': .8, 'SubInThreshold': .85, 'EnergyImpactOnOverall': (1/5.0)},
        'DT': {'OnFieldEnergyDrain': .02, 'SubOutThreshold': .75, 'SubInThreshold': .85, 'EnergyImpactOnOverall': (1/5.0)},
        'OLB': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .75, 'SubInThreshold': .85, 'EnergyImpactOnOverall': (1/6.0)},
        'MLB': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .75, 'SubInThreshold': .85, 'EnergyImpactOnOverall': (1/6.0)},
        'CB': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .6, 'SubInThreshold': .7, 'EnergyImpactOnOverall': (1/6.0)},
        'S': {'OnFieldEnergyDrain': .015, 'SubOutThreshold': .6, 'SubInThreshold': .7, 'EnergyImpactOnOverall': (1/6.0)},
        'K': {'OnFieldEnergyDrain': .01, 'SubOutThreshold': .3, 'SubInThreshold': .35, 'EnergyImpactOnOverall': (1/12.0)},
        'P': {'OnFieldEnergyDrain': .01, 'SubOutThreshold': .3, 'SubInThreshold': .35, 'EnergyImpactOnOverall': (1/12.0)},
    }


    PassRushByPosition = {
        'DE': 1,
        'DT': .8,
        'OLB': .8,
        'MLB': .6,
        'CB': .1,
        'S': .1,
    }

    InterceptionsByPosition = {
        'DE': .01,
        'DT': .01,
        'OLB': .5,
        'MLB': .5,
        'CB': 1,
        'S': .8,
    }

    CompletionTacklerByPosition = {
        'DE': .2,
        'DT': .1,
        'OLB': .75,
        'MLB': .75,
        'CB': 1,
        'S': 1,
    }

    DeflectionsByPosition = {
        'DE': .2,
        'DT': .1,
        'OLB': .75,
        'MLB': .75,
        'CB': 1,
        'S': 1,
    }

    for CT in CoachDict:
        C = CoachDict[CT]['Coach']
        TSS = CoachDict[CT]['TeamSeasonStrategy']
        CoachDict[CT]['Tendencies'] = {}
        CoachDict[CT]['Tendencies']['FourthDownAggressiveness'] = ( TSS['SituationalAggressivenessTendency'] / 10.0)
        CoachDict[CT]['Tendencies']['TwoPointAggressiveness'] = (TSS['SituationalAggressivenessTendency'] / 10.0)
        CoachDict[CT]['Tendencies']['Playcall_PassRatio'] = (TSS['PlaycallPassTendency'] / 50.0) ** 1.1
        CoachDict[CT]['Tendencies']['Playcall_RunRatio'] = ((100 - TSS['PlaycallPassTendency']) / 50.0) ** 1.1
        CoachDict[CT]['Tendencies']['PlayClockAggressiveness'] = (TSS['PlayClockAggressivenessTendency'] / 10.0)
        CoachDict[CT]['Tendencies']['PassingStrategy'] = (TSS['PassingStrategy'])
        CoachDict[CT]['Tendencies']['RunningBackStrategy'] = (TSS['RunningBackStrategy'])
        CoachDict[CT]['Tendencies']['BlitzStrategy'] = (TSS['BlitzStrategy'])
        CoachDict[CT]['PositionEnergyMap'] = PositionEnergyMap.copy()

        if CoachDict[CT]['Tendencies']['RunningBackStrategy'] == 'Bellcow':
            CoachDict[CT]['PositionEnergyMap']['RB']['SubOutThreshold'] = .54
            CoachDict[CT]['PositionEnergyMap']['RB']['SubInThreshold'] = .55
        elif CoachDict[CT]['Tendencies']['RunningBackStrategy'] == 'Starter Focused':
            CoachDict[CT]['PositionEnergyMap']['RB']['SubOutThreshold'] = .65
            CoachDict[CT]['PositionEnergyMap']['RB']['SubInThreshold'] = .75
        elif CoachDict[CT]['Tendencies']['RunningBackStrategy'] == 'Committee':
            CoachDict[CT]['PositionEnergyMap']['RB']['SubOutThreshold'] = .85
            CoachDict[CT]['PositionEnergyMap']['RB']['SubInThreshold'] = .98

        #print(CT, 'Run:', CoachDict[CT]['Tendencies']['Playcall_RunRatio'], 'Pass:', CoachDict[CT]['Tendencies']['Playcall_PassRatio'] )


    HeadCoachDiff = CoachDict[HomeTeam]['Coach']['GameplanRating'] - CoachDict[AwayTeam]['Coach']['GameplanRating']#HomeHeadCoach.CoachID.GameplanRating - AwayHeadCoach.CoachID.GameplanRating
    if HeadCoachDiff == 0:
        HomeCoachFactor = 1.0
    elif HeadCoachDiff > 0 and HeadCoachDiff < 8 :
        HomeCoachFactor = 1.02
    elif HeadCoachDiff >= 8:
        HomeCoachFactor = 1.04
    elif HeadCoachDiff < 0 and HeadCoachDiff > -8 :
        HomeCoachFactor = .98
    elif HeadCoachDiff <= -8:
        HomeCoachFactor = .96
    else:
        HomeCoachFactor = 1.0

    PlayClockUrgencyTimeParameters = {
        -3: {'Mean': 36, 'Sigma': 4, 'Min': 31, 'Max': 40},
        -2: {'Mean': 33, 'Sigma': 6, 'Min': 28, 'Max': 40},
        -1: {'Mean': 30, 'Sigma': 6, 'Min': 24, 'Max': 40},
         0: {'Mean': 28, 'Sigma': 8, 'Min': 12, 'Max': 40},
         1: {'Mean': 24, 'Sigma': 6, 'Min': 20, 'Max': 34},
         2: {'Mean': 20, 'Sigma': 6, 'Min': 15, 'Max': 29},
         3: {'Mean': 14, 'Sigma': 4, 'Min': 12, 'Max': 24},
    }

    PlayerStartersByPosition = {
        'QB': 1,
        'RB': 1,
        'FB': 0,
        'WR': 3,
        'TE': 1,
        'OT': 2,
        'OG': 2,
        'OC': 1,
        'DE': 2,
        'DT': 2,
        'OLB': 2,
        'MLB': 1,
        'CB': 2,
        'S': 2,
        'K': 1,
        'P': 1
    }



    SideOfBallPositions = {
        'Offense': ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'OG', 'OC', 'K'],
        'Defense': ['DE', 'DT', 'OLB', 'MLB', 'CB', 'S', 'P']
    }


    PositionOverlapMap = {
        'QB': ['RB'],
        'RB': ['WR'],
        'FB': ['RB', 'TE'],
        'WR': ['TE', 'RB'],
        'TE': ['WR', 'OT'],
        'OT': ['OG', 'OC'],
        'OG': ['OT', 'OC'],
        'OC': ['OG', 'OT'],
        'DE': ['DT', 'OLB'],
        'DT': ['DE'],
        'OLB': ['MLB', 'DE', 'S'],
        'MLB': ['OLB', 'S'],
        'CB': [ 'S'],
        'S': ['CB', 'MLB'],
        'K': ['P', 'QB'],
        'P': ['K', 'QB']
    }

    PassRushByPosition = {
        'DE': 1,
        'DT': .8,
        'OLB': .8,
        'MLB': .6,
        'CB': .1,
        'S': .1,
    }

    InterceptionsByPosition = {
        'DE': .01,
        'DT': .01,
        'OLB': .5,
        'MLB': .5,
        'CB': 1,
        'S': .8,
    }

    CompletionTacklerByPosition = {
        'DE': .2,
        'DT': .1,
        'OLB': .75,
        'MLB': .75,
        'CB': 1,
        'S': 1,
    }

    DeflectionsByPosition = {
        'DE': .2,
        'DT': .1,
        'OLB': .75,
        'MLB': .75,
        'CB': 1,
        'S': 1,
    }

    Periods = [1,2,3,4]
    MinutesInPeriod = 15
    SecondsInMinute = 60
    SecondsInPeriod = MinutesInPeriod * SecondsInMinute

    SubsEveryN = 12
    SynergyFactor = 0.1
    EnergyRegenerationRate = .01
    DefaultEnergyNormalizationFactor = 4
    Overtimes = 0
    TalentRandomness = 0.0#float(0.05)
    HomeFieldAdvantage = float(CurrentLeague.HomeFieldAdvantage)
    GlobalScoreNormalizationFactor = .4
    Batch_Size = 10000

    HomeTeamScoreDifference = 0
    PossessionCount = 0

    RegionalBroadcast = 0
    NationalBroadcast = 0
    if game.RegionalBroadcast:
        RegionalBroadcast = 1
    elif game.NationalBroadcast:
        NationalBroadcast = 1


    TeamPlayers = {HomeTeam:{'PlayersOnField':{},'AllPlayers':{}}, AwayTeam:{'PlayersOnField':{},'AllPlayers':{}}}
    for T in TeamPlayers:
        for Pos in PlayerStartersByPosition:
            for Group in TeamPlayers[T]:
                TeamPlayers[T][Group][Pos] = []
    AllPlayers = {}

    KeysToSave = []#['PlusMinus', 'GamesStarted', 'Points', 'KCK_FGA', 'ThreePA', 'KCK_FGM', 'ThreePM', 'InsideShotA', 'InsideShotM', 'MidRangeShotA', 'MidRangeShotM', 'Minutes', 'Rebounds', 'OffensiveRebounds','ReboundChances','Assists','Possessions']

    SkillMultiplierExclusions = ['PlayerTeamSeasonSkillID', 'PlayerID', 'LeagueSeasonID', 'WorldID', '_state', 'WorldID_id', 'PlayerID_id']

    count = 0
    for P in HomeTeamPlayers | AwayTeamPlayers:
        # count +=1
        # if count == 2:
        #     reset_queries()
        # elif count == 3:
        #     print('\n\nconnection.queries', connection.queries)

        DC = None
        PlayerDict = P
        PTS = P.PlayerTeamSeasonID
        PSD = PlayerSkills[P.PlayerID]
        PlayerSkillDict = PSD.__dict__
        PlayerID = P.PlayerID
        #PlayerDict['PlayerTeam'] = PTS.TeamSeasonID.TeamID_id
        AllPlayers[PlayerID] = {'PlayerObj': P}


        SkillMultiplier = 1.0
        TalentRandomnessMultiplier = round(random.uniform(1.0 - TalentRandomness, 1.0 + TalentRandomness), 3)
        SkillMultiplier *= TalentRandomnessMultiplier


        AllPlayers[PlayerID]['PlayerSkills'] = PlayerSkillDict
        for Skill in PlayerSkillDict:
            if Skill not in SkillMultiplierExclusions:
                AllPlayers[PlayerID]['PlayerSkills'][Skill] = int(  AllPlayers[PlayerID]['PlayerSkills'][Skill] * SkillMultiplier  )

        AllPlayers[PlayerID]['PlayerGameStat'] = PlayerGameStat(PlayerTeamSeasonID_id = PTS, WorldID = CurrentWorld, TeamGamesPlayed = 1)

        if P in HomeTeamPlayers:
            AllPlayers[PlayerID]['TeamObj'] = HomeTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = HomeTeamSeason
            SkillMultiplier *= HomeFieldAdvantage
            SkillMultiplier *= HomeCoachFactor
            ThisTeamGame = HomeTeamGame
            ThisTeam = HomeTeam
            if PlayerID in HomePlayerTeamSeasonDepthChartDict:
                DC = HomePlayerTeamSeasonDepthChartDict[PlayerID]

        else:
            AllPlayers[PlayerID]['TeamObj'] = AwayTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = AwayTeamSeason
            SkillMultiplier /= HomeFieldAdvantage
            SkillMultiplier /= HomeCoachFactor
            ThisTeamGame = AwayTeamGame
            ThisTeam = AwayTeam
            if PlayerID in AwayPlayerTeamSeasonDepthChartDict:
                DC = AwayPlayerTeamSeasonDepthChartDict[PlayerID]


        if DC is not None:
            PlayerPosition = DC['PositionID__PositionAbbreviation']
            AllPlayers[PlayerID]['Position'] = PlayerPosition
            AllPlayers[PlayerID]['PositionDepthChart'] = DC['DepthPosition']

            if DC['IsStarter'] == True:
                TeamPlayers[ThisTeam]['PlayersOnField'][PlayerPosition].append(PlayerID)
                AllPlayers[PlayerID]['PlayerGameStat'].GamesStarted = 1
                AllPlayers[PlayerID]['PlayerGameStat'].GamesPlayed = 1

            TeamPlayers[ThisTeam]['AllPlayers'][PlayerPosition].append(PlayerID)


        AllPlayers[PlayerID]['PlayerGameStat'].TeamGameID = ThisTeamGame
        AllPlayers[PlayerID]['Energy'] = 1
        AllPlayers[PlayerID]['AdjustedOverallRating'] = int(AllPlayers[PlayerID]['PlayerSkills']['OverallRating'] ** AdjustedOverallPowerFactor)

    GameDict = {}
    for T in [{'Team': HomeTeam, 'TeamGame': HomeTeamGame, 'TeamSeason': HomeTeamSeason}, {'Team':AwayTeam, 'TeamGame': AwayTeamGame, 'TeamSeason': AwayTeamSeason}]:
        GameDict[T['Team']] = {'TeamGame': T['TeamGame'], 'TeamSeason': T['TeamSeason']}

        GameDict[T['Team']]['TeamGame'].GamesPlayed = 1

        #{'Wins':0, 'Losses': 0,'Possessions':0,'Turnovers':0,'PNT_Punts':0,'FirstDowns':0,'ThirdDownConversion': 0, 'ThirdDownAttempt': 0,'FourthDownConversion': 0, 'FourthDownAttempt': 0, 'TimeOfPossession':0.0,'GamesPlayed': 1,'Points':0, 'PAS_Yards':0, 'PAS_Attempts':0,'PAS_TD':0, 'REC_Yards':0, 'REC_Receptions':0,'REC_TD':0, 'PAS_Completions':0, 'RUS_Yards':0,'RUS_TD':0,'RUS_Carries':0, 'KCK_FGA': 0, 'KCK_FGM': 0, 'KCK_FGA29':0,'KCK_FGM29':0,'KCK_FGA39':0, 'KCK_FGM39':0,'KCK_FGA49':0, 'KCK_FGM49':0,'KCK_FGA50':0, 'KCK_FGM50':0,'KCK_XPA':0, 'KCK_XPM':0, 'PAS_INT': 0, 'PAS_Sacks': 0, 'PAS_SackYards': 0, 'DEF_Tackles':0, 'DEF_Sacks':0,'DEF_INT':0, 'DEF_TacklesForLoss': 0, 'FUM_Lost': 0, 'FUM_Forced': 0, 'FUM_Fumbles': 0, 'FUM_Recovered': 0,'FUM_ReturnTD': 0,'FUM_ReturnYards': 0, 'RegionalBroadcast': RegionalBroadcast, 'NationalBroadcast': NationalBroadcast, 'TwoPointAttempt': 0, 'TwoPointConversion': 0}



    OffensiveTeam = AwayTeam
    DefensiveTeam = HomeTeam

    SuddenDeathInOvertime = True

    ChangeInPossesion = False
    TurnoverOnDowns = False
    OffensiveTouchdown = False
    FinalPeriod = False
    IsCloseGame = True
    HalfEndPeriod = False
    InOvertime = False

    Down = 1
    YardsToGo = 10
    BallSpot = 20
    DriveDuration = 0
    DrivePlayCount = 0
    DriveStartBallSpot = BallSpot


    OffensiveLineTalent = 0
    DefensiveLineTalent = 0
    QuarterbackTalent = 0
    ReceiverTalent = 0
    SecondaryTalent = 0
    LinebackerTalent = 0
    RunningbackTalent = 0

    TotalPlayCount = 0
    SubsEveryN = 6

    ConfigureTeams = True

    GameEventsToSave = []
    DrivePlaysToSave = []
    GameDrivesToSave = []
    PlayerGameStatToSave = []

    for Period in Periods:
        SecondsLeftInPeriod = SecondsInPeriod

        if Period not in [2,4]:
            PlaysThisHalf = 0
        if Period not in [1,2,3]:
            FinalPeriod = True
        if Period not in [1,3]:
            HalfEndPeriod = True
        if Period > 4:
            InOvertime = True
            print()
            print('Going to overtime!')
            print()

        while SecondsLeftInPeriod > 0:
            TurnoverOnDowns = False
            OffensiveTouchdown = False
            SwitchPossession = False
            Kickoff = False
            Punt = False
            IsLateGame = False
            IncompletePass = False
            FieldGoalMake = False
            FieldGoalMiss = False
            Turnover = False
            DefensiveTouchdown = False
            FumbleOnPlay = False
            InterceptionOnPlay = False
            TwoPointConversionAttempt = False
            TwoPointConversionSuccess = False
            ExtraPointAttempt = False
            ExtraPointSuccess = False
            PlayClockUrgency = 0 # -3 Chew clock, 3 Very Fast
            FumbleRecoveryYards = 0
            SecondsThisPlay = SecondsLeftInPeriod
            SecondStringers = False
            SubOutMultiplier = 1.0
            SubInMultiplier = 1.0
            LogDrive = False
            Safety = False
            PuntYards = 0

            if PlaysThisHalf == 0 and Period > 1:

                OffensiveTeam, DefensiveTeam = HomeTeam, AwayTeam
                GameDict[OffensiveTeam]['TeamGame'].Possessions +=1
                Down = 1
                YardsToGo = 10
                DriveDuration = 0
                BallSpot = 20
                DriveStartBallSpot = BallSpot
                DrivePlayCount = 0
                ConfigureTeams = True


            PlaysThisHalf +=1


            if FinalPeriod and SecondsLeftInPeriod <= (5 * 60):
                IsLateGame = True
            PlayChoices = None

            #2 minute drill
            OffensivePointDifferential = GameDict[OffensiveTeam]['TeamGame'].Points - GameDict[DefensiveTeam]['TeamGame'].Points

            PlayDetermination = DeterminePlayChoice(Down=Down, YardsToGo=YardsToGo, BallSpot=BallSpot, Period=Period, OffensivePointDifferential = OffensivePointDifferential, SecondsLeftInPeriod = SecondsLeftInPeriod, IsCloseGame=IsCloseGame, IsLateGame=IsLateGame, HalfEndPeriod = HalfEndPeriod, FinalPeriod = FinalPeriod)
            PlayChoices = PlayDetermination['PlayChoices']
            PlayClockUrgency = PlayDetermination['PlayClockUrgency']

            DrivePlayObject = PlayDetermination['DrivePlayObject']
            DrivePlayObject.GameID = game
            DrivePlayObject.WorldID = CurrentWorld

            PlayChoices['Run'] = int(PlayChoices['Run'] * CoachDict[OffensiveTeam]['Tendencies']['Playcall_RunRatio'])
            PlayChoices['Pass'] = int(PlayChoices['Pass'] * CoachDict[OffensiveTeam]['Tendencies']['Playcall_PassRatio'])

            if PlayChoices is None:
                print('Could not find play. Period:', Period, 'BallSpot:', BallSpot, 'Down:', Down, 'YardsToGo:', YardsToGo, 'SecondsLeftInPeriod:', SecondsLeftInPeriod)
                PlayChoices = {'Run': 55,'Pass': 45,'Punt': 0,'Field Goal': 0}

            PlayChoice = WeightedProbabilityChoice(PlayChoices, 'Run')


            if CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] > 0:
                PlayClockUrgency += 1
                if CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] >= 3 or (CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] == 2 and random.uniform(0,1) < .25):
                    PlayClockUrgency += 1
                if PlayClockUrgency > 3:
                    PlayClockUrgency = 3
            elif CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] < 0:
                PlayClockUrgency -= 1
                if CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] <= -3 or (CoachDict[OffensiveTeam]['Tendencies']['PlayClockAggressiveness'] == -2 and random.uniform(0,1) < .25):
                    PlayClockUrgency -= 1
                if PlayClockUrgency < -3:
                    PlayClockUrgency = -3

            TotalPlayCount += 1
            if TotalPlayCount % (SubsEveryN + PlayClockUrgency) == 0 or ConfigureTeams:
                ConfigureTeams = True
                ScoreDiff = abs(GameDict[HomeTeam]['TeamGame'].Points - GameDict[AwayTeam]['TeamGame'].Points)
                if FinalPeriod and int(SecondsLeftInPeriod/60) + 20 < ScoreDiff:
                    SecondStringers = True
                elif FinalPeriod and int(SecondsLeftInPeriod/60) + 14 < ScoreDiff:
                    SubOutMultiplier = 1.1
                elif FinalPeriod and ScoreDiff <= 4:
                    SubOutMultiplier = .8
                    SubInMultiplier = .8
                elif FinalPeriod and ScoreDiff <= 7:
                    SubOutMultiplier = .9
                    SubInMultiplier = .9


                for Team in GameDict:
                    EnergyMap = CoachDict[Team]['PositionEnergyMap']
                    for Position in PlayerStartersByPosition:
                        StartersOnBenchReadyToGoIn = [P for P in TeamPlayers[Team]['AllPlayers'][Position] if P not in TeamPlayers[Team]['PlayersOnField'][Position] and AllPlayers[P]['Energy'] > EnergyMap[Position]['SubInThreshold'] * SubInMultiplier and AllPlayers[P]['PositionDepthChart'] <= PlayerStartersByPosition[Position]]
                        TeamPlayers[Team]['PlayersOnField'][Position] = sorted([P for P in TeamPlayers[Team]['PlayersOnField'][Position] if AllPlayers[P]['Energy'] >  EnergyMap[Position]['SubOutThreshold'] * SubOutMultiplier], key=lambda P: AllPlayers[P]['PositionDepthChart'])

                        for P in StartersOnBenchReadyToGoIn:
                            if len(TeamPlayers[Team]['PlayersOnField'][Position]) > 0:
                                TeamPlayers[Team]['PlayersOnField'][Position].pop()


                        if SecondStringers:
                            #print('Fielding second stringers')
                            TeamPlayers[Team]['PlayersOnField'][Position] = []
                            EligiblePlayers    = sorted([P for P in TeamPlayers[Team]['AllPlayers'][Position] if  AllPlayers[P]['Energy'] >  EnergyMap[Position]['SubInThreshold'] * SubInMultiplier and AllPlayers[P]['PositionDepthChart'] > PlayerStartersByPosition[Position]], key=lambda P: AllPlayers[P]['PositionDepthChart'])
                            EligiblePlayersAll = sorted([P for P in TeamPlayers[Team]['AllPlayers'][Position] if P not in EligiblePlayers], key=lambda P: AllPlayers[P]['PositionDepthChart'])
                        else:
                            EligiblePlayers    = sorted([P for P in TeamPlayers[Team]['AllPlayers'][Position] if P not in TeamPlayers[Team]['PlayersOnField'][Position] and AllPlayers[P]['Energy'] >  EnergyMap[Position]['SubInThreshold'] * SubInMultiplier], key=lambda P: AllPlayers[P]['PositionDepthChart'])
                            EligiblePlayersAll = sorted([P for P in TeamPlayers[Team]['AllPlayers'][Position] if P not in TeamPlayers[Team]['PlayersOnField'][Position] + EligiblePlayers], key=lambda P: AllPlayers[P]['PositionDepthChart'])


                        NumberOfPlayersNeeded = PlayerStartersByPosition[Position] - len(TeamPlayers[Team]['PlayersOnField'][Position])

                        if NumberOfPlayersNeeded > len(EligiblePlayers):
                            #print('Filling EligiblePlayers with All')
                            EligiblePlayers += EligiblePlayersAll
                            #print('Filling field', Period, Team, Position, NumberOfPlayersNeeded, len(EligiblePlayers))


                        for PI in range(0,NumberOfPlayersNeeded):
                            TeamPlayers[Team]['PlayersOnField'][Position].append(EligiblePlayers[PI])
                            AllPlayers[EligiblePlayers[PI]]['PlayerGameStat'].GamesPlayed = 1


            if ConfigureTeams:
                OffensiveTendencies = CoachDict[OffensiveTeam]['Tendencies']
                DefensiveTendencies = CoachDict[DefensiveTeam]['Tendencies']

                ConfigureTeams = False
                OffensiveTeamPlayers = TeamPlayers[OffensiveTeam]['PlayersOnField']
                DefensiveTeamPlayers = TeamPlayers[DefensiveTeam]['PlayersOnField']

                QuarterbackTalent   = Average([AllPlayers[u]['AdjustedOverallRating'] for u in OffensiveTeamPlayers['QB']], IntCastFlag=True)
                RunningbackTalent   = Average([AllPlayers[u]['AdjustedOverallRating'] for u in OffensiveTeamPlayers['RB']], IntCastFlag=True)
                ReceiverTalent      = Average([AllPlayers[u]['AdjustedOverallRating'] for u in OffensiveTeamPlayers['WR']], IntCastFlag=True)
                OffensiveLineTalent = Average([AllPlayers[u]['AdjustedOverallRating'] for u in OffensiveTeamPlayers['OT'] + OffensiveTeamPlayers['OG'] + OffensiveTeamPlayers['OC']], IntCastFlag=True)

                DefensiveLineTalent = Average([AllPlayers[u]['AdjustedOverallRating'] for u in DefensiveTeamPlayers['DE']  + OffensiveTeamPlayers['DT'] ], IntCastFlag=True)
                LinebackerTalent    = Average([AllPlayers[u]['AdjustedOverallRating'] for u in DefensiveTeamPlayers['OLB'] + OffensiveTeamPlayers['MLB']], IntCastFlag=True)
                SecondaryTalent     = Average([AllPlayers[u]['AdjustedOverallRating'] for u in DefensiveTeamPlayers['CB']  + OffensiveTeamPlayers['S']  ], IntCastFlag=True)
                KickerPlayerID      = OffensiveTeamPlayers['K'][0]
                PunterPlayerID      = OffensiveTeamPlayers['P'][0]

                KickerTalent        = AllPlayers[KickerPlayerID]['PlayerSkills']['OverallRating']


            if PlayChoice == 'Run':
                DrivePlayObject.IsRun = True
                r = random.uniform(0,1)
                if r < .94:
                    RunningBackPlayerID = OffensiveTeamPlayers['RB'][0]
                elif r < .97:
                    RunningBackPlayerID = OffensiveTeamPlayers['QB'][0]
                else:
                    RunningBackPlayerID = random.choice(OffensiveTeamPlayers['WR'])

                RunGameModifier = (2 * RunningbackTalent + OffensiveLineTalent) * 1.0 / DefensiveLineTalent / 3.0
                RunGameModifier = RunGameModifier ** 1.5
                YardsThisPlay = round(NormalTrunc(4.25 * RunGameModifier, 5, -2, 12),0)

                #Run is a fumble
                if random.uniform(0,1) < (.011 / ((RunningbackTalent / (77.5 ** AdjustedOverallPowerFactor)))):
                    DefensivePlayers = [(u, AllPlayers[u]['PlayerSkills']['HitPower_Rating'] ** 4) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DE']+DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB']+DefensiveTeamPlayers['CB']  + DefensiveTeamPlayers['S'] ]
                    DefensiveFumbleForcerID = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    GameDict[OffensiveTeam]['TeamGame'].FUM_Fumbles += 1
                    AllPlayers[RunningBackPlayerID]['PlayerGameStat'].FUM_Fumbles += 1

                    GameDict[DefensiveTeam]['TeamGame'].FUM_Forced += 1
                    AllPlayers[DefensiveFumbleForcerID]['PlayerGameStat'].FUM_Forced += 1
                    FumbleOnPlay = True

                    #Offense recovers
                    if random.uniform(0,1) < .55:
                        OffensivePlayers = [(u, 1) for u in OffensiveTeamPlayers['OT']  + OffensiveTeamPlayers['OG']+OffensiveTeamPlayers['OC']  + OffensiveTeamPlayers['WR']+OffensiveTeamPlayers['TE']  + OffensiveTeamPlayers['RB'] ]
                        FumbleRecovererID = WeightedProbabilityChoice(OffensivePlayers, OffensivePlayers[0])

                        GameDict[OffensiveTeam]['TeamGame'].FUM_Recovered += 1
                        AllPlayers[FumbleRecovererID]['PlayerGameStat'].FUM_Recovered += 1

                    else:
                        FumbleRecovererID = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                        GameDict[DefensiveTeam]['TeamGame'].FUM_Recovered += 1
                        AllPlayers[FumbleRecovererID]['PlayerGameStat'].FUM_Recovered += 1

                        GameDict[OffensiveTeam]['TeamGame'].FUM_Lost += 1
                        AllPlayers[RunningBackPlayerID]['PlayerGameStat'].FUM_Lost += 1

                        FumbleBallSpot = BallSpot + YardsThisPlay
                        OpposingFumbleBallSpot = 100 - FumbleBallSpot
                        if random.uniform(0,1) < .33:
                            FumbleRecoveryYards = round(NormalTrunc(0,2,-10,20), 0)
                        else:
                            FumbleRecoveryYards = random.randint(0,100)

                        if FumbleRecoveryYards > OpposingFumbleBallSpot:
                            GameDict[DefensiveTeam]['TeamGame'].FUM_ReturnTD += 1
                            AllPlayers[FumbleRecovererID]['PlayerGameStat'].FUM_ReturnTD += 1
                            GameDict[DefensiveTeam]['TeamGame'].FUM_ReturnYards += OpposingFumbleBallSpot
                            AllPlayers[FumbleRecovererID]['PlayerGameStat'].FUM_ReturnYards += OpposingFumbleBallSpot
                            DefensiveTouchdown = True
                        else:
                            GameDict[DefensiveTeam]['TeamGame'].FUM_ReturnYards += FumbleRecoveryYards
                            AllPlayers[FumbleRecovererID]['PlayerGameStat'].FUM_ReturnYards += FumbleRecoveryYards

                        Turnover = True

                elif YardsThisPlay > 8 and (random.uniform(0,1) < (.05 * ((RunningbackTalent / (85 ** AdjustedOverallPowerFactor)) ** 8))):
                    YardsThisPlay = round(NormalTrunc(30, 50, 28, 100),0)


                if BallSpot + YardsThisPlay > 100:
                    YardsThisPlay = 100 - BallSpot
                GameDict[OffensiveTeam]['TeamGame'].RUS_Yards += YardsThisPlay
                GameDict[OffensiveTeam]['TeamGame'].RUS_Carries += 1
                GameDict[OffensiveTeam]['TeamGame'].RUS_LNG = Max_Int(GameDict[OffensiveTeam]['TeamGame'].RUS_LNG, YardsThisPlay)

                AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_Yards += YardsThisPlay
                AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_Carries += 1
                AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_LNG = Max_Int(AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_LNG, YardsThisPlay)

                if YardsThisPlay >= 20:
                    GameDict[OffensiveTeam]['TeamGame'].RUS_20 += 1
                    AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_20 += 1

                DefensivePlayers = [(u, AllPlayers[u]['AdjustedOverallRating'] ** 2) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB']  ]
                DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_Tackles += 1
                GameDict[DefensiveTeam]['TeamGame'].DEF_Tackles += 1

                if YardsThisPlay < 0:
                        AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_TacklesForLoss += 1
                        GameDict[DefensiveTeam]['TeamGame'].DEF_TacklesForLoss += 1

            elif PlayChoice == 'Pass':
                PassingStrategy = OffensiveTendencies['PassingStrategy']
                BlitzingStrategy = OffensiveTendencies['BlitzStrategy']
                DrivePlayObject.IsPass = True
                PassOutcome = ''
                QuarterbackPlayerID = OffensiveTeamPlayers['QB'][0]
                AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_Attempts += 1
                GameDict[OffensiveTeam]['TeamGame'].PAS_Attempts += 1
                PassGameModifier = (((3.0 * QuarterbackTalent) + ReceiverTalent + OffensiveLineTalent) / ((DefensiveLineTalent ** BlitzStrategy[BlitzingStrategy]) + (SecondaryTalent ** (1/ BlitzStrategy[BlitzingStrategy]))) / 2.5) ** .8

                if (PassGameModifier > 1.2) or (PassGameModifier < .8):
                    print('PassGameModifier', PassGameModifier, 'QuarterbackTalent',QuarterbackTalent, 'ReceiverTalent',ReceiverTalent, 'OffensiveLineTalent',OffensiveLineTalent, 'DefensiveLineTalent',DefensiveLineTalent, 'SecondaryTalent',SecondaryTalent, 'PostModRate', ((.7024 * PassingStrategy_CompletionModifier[PassingStrategy]) * (PassGameModifier ** .9)) / BlitzStrategy[BlitzingStrategy])

                PassRushModifier = OffensiveLineTalent * 1.0 / DefensiveLineTalent
                PassRushModifier = PassRushModifier ** (PassingStrategy_PassRushModifier[PassingStrategy] * BlitzStrategy[BlitzingStrategy])
                LinemanSackAllowedPlayerID = None
                OffensiveLinemen = [(u, int((110 ** AdjustedOverallPowerFactor) - AllPlayers[u]['AdjustedOverallRating']) ** 2) for u in OffensiveTeamPlayers['OG']  + OffensiveTeamPlayers['OT'] + OffensiveTeamPlayers['OC'] ]

                WideReceivers = [(u, AllPlayers[u]['AdjustedOverallRating'] ** 3) for u in OffensiveTeamPlayers['WR'] ] + [(u, int(AllPlayers[u]['AdjustedOverallRating'] ** 2.25)) for u in OffensiveTeamPlayers['RB'] ]
                WideReceiverPlayer = WeightedProbabilityChoice(WideReceivers, WideReceivers[0])

                if Down == 3 and YardsToGo > 4:
                    PassRushModifier /= 1.1

                if (random.uniform(0,1) < (.0203 / PassGameModifier)):
                    PassOutcome = 'Interception'
                    if GameDict[DefensiveTeam]['TeamGame'].DEF_INT >= 4 and random.uniform(0,1) < .95 :
                        PassOutcome = 'Incompletion'
                elif (random.uniform(0,1) < (.10 / (PassRushModifier ** 4)) * BlitzStrategy[BlitzingStrategy]):
                    PassOutcome = 'Sack'
                elif (random.uniform(0,1) < ((.7024 * PassingStrategy_CompletionModifier[PassingStrategy]) * (PassGameModifier ** .9)) / BlitzStrategy[BlitzingStrategy]) :
                    PassOutcome = 'Completion'
                else:
                    PassOutcome = 'Incompletion'


                if PassOutcome != 'Sack':
                    AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_Targets += 1
                    GameDict[OffensiveTeam]['TeamGame'].REC_Targets += 1


                #INTERCEPTED
                if PassOutcome == 'Interception':
                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_INT += 1
                    GameDict[OffensiveTeam]['TeamGame'].PAS_INT += 1
                    Turnover = True
                    InterceptionOnPlay = True
                    YardsThisPlay = 0
                    InterceptionReturnYards = 0

                    DefensivePlayers = [(u, int(InterceptionsByPosition[AllPlayers[u]['Position']] * AllPlayers[u]['AdjustedOverallRating']) ** 4) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB']  + DefensiveTeamPlayers['CB']  + DefensiveTeamPlayers['S']  ]
                    DefensiveIntercepter = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    AllPlayers[DefensiveIntercepter]['PlayerGameStat'].DEF_INT += 1
                    GameDict[DefensiveTeam]['TeamGame'].DEF_INT += 1

                #Play was SACK
                elif PassOutcome == 'Sack':
                    YardsThisPlay = round(NormalTrunc(-5, 2, -10, -1),0)
                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_Sacks += 1
                    GameDict[OffensiveTeam]['TeamGame'].PAS_Sacks += 1

                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_SackYards += abs(YardsThisPlay)
                    GameDict[OffensiveTeam]['TeamGame'].PAS_SackYards += abs(YardsThisPlay)

                    #AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].RUS_Yards -= abs(YardsThisPlay)
                    #GameDict[OffensiveTeam]['TeamGame'].RUS_Yards -= abs(YardsThisPlay)

                    #AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].RUS_Carries += 1
                    #GameDict[OffensiveTeam]['TeamGame'].RUS_Carries += 1

                    DefensivePlayers = [(u, int(PassRushByPosition[AllPlayers[u]['Position']] * AllPlayers[u]['AdjustedOverallRating']) ** 3) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB'] + DefensiveTeamPlayers['CB']  + DefensiveTeamPlayers['S'] ]
                    DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])
                    LinemanSackAllowedPlayerID = WeightedProbabilityChoice(OffensiveLinemen, OffensiveLinemen[0])

                    AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_Sacks += 1
                    GameDict[DefensiveTeam]['TeamGame'].DEF_Sacks += 1

                    AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_Tackles += 1
                    GameDict[DefensiveTeam]['TeamGame'].DEF_Tackles += 1

                    AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_TacklesForLoss += 1
                    GameDict[DefensiveTeam]['TeamGame'].DEF_TacklesForLoss += 1

                    AllPlayers[LinemanSackAllowedPlayerID]['PlayerGameStat'].BLK_Sacks += 1
                    GameDict[OffensiveTeam]['TeamGame'].BLK_Sacks += 1

                #PASS COMPLETE
                elif PassOutcome == 'Completion' :
                    PassGameModifier = PassGameModifier ** 1.1
                    YardsThisPlay = round(NormalTrunc(10.1 * PassGameModifier, PassingStrategy_YardsSigma[PassingStrategy], -3, 110),0)

                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_Completions += 1
                    GameDict[OffensiveTeam]['TeamGame'].PAS_Completions += 1

                    WideReceiverTalent = AllPlayers[WideReceiverPlayer]['AdjustedOverallRating']

                    if YardsThisPlay >= 20 and (random.uniform(0,1) < (.05 * ((WideReceiverTalent / (85 ** AdjustedOverallPowerFactor)) ** 6))):
                        YardsThisPlay = round(NormalTrunc(30, 50, 28, 100),0)

                    AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_Receptions += 1
                    GameDict[OffensiveTeam]['TeamGame'].REC_Receptions += 1

                    DefensivePlayers = [(u, int(CompletionTacklerByPosition[AllPlayers[u]['Position']] * AllPlayers[u]['AdjustedOverallRating']) ** 2) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB']  + DefensiveTeamPlayers['CB']  + DefensiveTeamPlayers['S']  ]
                    DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    AllPlayers[DefensiveTackler]['PlayerGameStat'].DEF_Tackles += 1
                    GameDict[DefensiveTeam]['TeamGame'].DEF_Tackles += 1

                    if YardsThisPlay + BallSpot > 100:
                        YardsThisPlay = 100 - BallSpot

                    GameDict[OffensiveTeam]['TeamGame'].PAS_Yards += YardsThisPlay
                    GameDict[OffensiveTeam]['TeamGame'].REC_Yards += YardsThisPlay
                    GameDict[OffensiveTeam]['TeamGame'].REC_LNG = Max_Int(GameDict[OffensiveTeam]['TeamGame'].REC_LNG, YardsThisPlay)

                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_Yards += YardsThisPlay
                    AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_Yards += YardsThisPlay
                    AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_LNG = Max_Int(AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_LNG, YardsThisPlay)

                #Incomplete pass
                elif PassOutcome == 'Incompletion':
                    YardsThisPlay = 0
                    IncompletePass = True

                    #Deflected pass
                    if (random.uniform(0,1) < (.2 )):
                        DefensivePlayers = [(u, int(DeflectionsByPosition[AllPlayers[u]['Position']] * AllPlayers[u]['AdjustedOverallRating']) ** 3) for u in DefensiveTeamPlayers['DE']  + DefensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + DefensiveTeamPlayers['MLB']  + DefensiveTeamPlayers['CB']  + DefensiveTeamPlayers['S']  ]
                        Deflector = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])
                        GameDict[DefensiveTeam]['TeamGame'].DEF_Deflections += 1
                        AllPlayers[Deflector]['PlayerGameStat'].DEF_Deflections += 1


                for OLPlayerID in [P for P in OffensiveLinemen if P != LinemanSackAllowedPlayerID]:
                    AllPlayers[OLPlayerID[0]]['PlayerGameStat'].BLK_Blocks += 1




            elif PlayChoice == 'Punt':
                DrivePlayObject.IsPunt = True
                Punt = True

                PuntYards = round(NormalTrunc(40, 8, 15, 50),0)

                OrigBallSpot = BallSpot
                if BallSpot + PuntYards > 90:
                    PuntToYard = round(NormalTrunc(90, 3, 85, 99),0)
                    PuntYards = PuntToYard - BallSpot

                GameDict[OffensiveTeam]['TeamGame'].PNT_Punts += 1
                GameDict[OffensiveTeam]['TeamGame'].PNT_Yards += PuntYards

                AllPlayers[PunterPlayerID]['PlayerGameStat'].PNT_Punts += 1
                AllPlayers[PunterPlayerID]['PlayerGameStat'].PNT_Yards += PuntYards

                if BallSpot + PuntYards >= 80:
                    GameDict[OffensiveTeam]['TeamGame'].PNT_Within20 += 1
                    AllPlayers[PunterPlayerID]['PlayerGameStat'].PNT_Within20 += PuntYards


            elif PlayChoice == 'Field Goal':
                DrivePlayObject.IsFieldGoalAttempt = True
                YardsThisPlay = 0
                KickerPlayerID = OffensiveTeamPlayers['K'][0]

                FGMField = ''
                FGAField = ''

                KickGameModifier = KickerTalent / 100.0
                r = random.uniform(0,1)
                FieldGoalDistance = 100 - BallSpot + 17
                KickDifficultModifier = 0
                if FieldGoalDistance <= 29:
                    KickDifficultModifier += .25
                    FGMField, FGAField = 'KCK_FGM29', 'KCK_FGA29'
                elif FieldGoalDistance <= 39:
                    KickDifficultModifier -= .05
                    FGMField, FGAField = 'KCK_FGM39', 'KCK_FGA39'
                elif FieldGoalDistance <= 49:
                    KickDifficultModifier -= .25
                    FGMField, FGAField = 'KCK_FGM49', 'KCK_FGA49'
                else:
                    KickDifficultModifier -= .5
                    FGMField, FGAField = 'KCK_FGM50', 'KCK_FGA50'

                AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_FGA += 1
                GameDict[OffensiveTeam]['TeamGame'].KCK_FGA += 1


                setattr(GameDict[OffensiveTeam]['TeamGame'], FGAField, getattr(GameDict[OffensiveTeam]['TeamGame'], FGAField) + 1)
                setattr(AllPlayers[KickerPlayerID]['PlayerGameStat'], FGAField, getattr(AllPlayers[KickerPlayerID]['PlayerGameStat'], FGAField) + 1)


                if r < (KickGameModifier + KickDifficultModifier):
                    DrivePlayObject.IsFieldGoalMake = True
                    AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_FGM += 1
                    GameDict[OffensiveTeam]['TeamGame'].KCK_FGM += 1

                    AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_LNG = Max_Int(AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_LNG, FieldGoalDistance)
                    GameDict[OffensiveTeam]['TeamGame'].KCK_LNG = Max_Int(GameDict[OffensiveTeam]['TeamGame'].KCK_LNG, FieldGoalDistance)

                    setattr(GameDict[OffensiveTeam]['TeamGame'], FGMField, getattr(GameDict[OffensiveTeam]['TeamGame'], FGMField) + 1)
                    setattr(AllPlayers[KickerPlayerID]['PlayerGameStat'], FGMField, getattr(AllPlayers[KickerPlayerID]['PlayerGameStat'], FGMField) + 1)

                    FieldGoalMake = True
                    FieldGoalMiss = False
                else:
                    FieldGoalMiss = True
                    FieldGoalMake = False

            if Down == 3:
                GameDict[OffensiveTeam]['TeamGame'].ThirdDownAttempt +=1
            elif Down == 4 and PlayChoice in ['Run', 'Pass']:
                GameDict[OffensiveTeam]['TeamGame'].FourthDownAttempt +=1

            PlayClockUrgencyValues = PlayClockUrgencyTimeParameters[PlayClockUrgency]
            SecondsThisPlay = Min(SecondsThisPlay, int(NormalTrunc(PlayClockUrgencyValues['Mean'], PlayClockUrgencyValues['Sigma'], PlayClockUrgencyValues['Min'], PlayClockUrgencyValues['Max'])))

            if SecondsThisPlay > 40:
                print('!!!! SecondsThisPlay out of range!', SecondsThisPlay, ' at ', SecondsLeftInPeriod)

            if IncompletePass:
                SecondsThisPlay = 9
            if random.uniform(0,1) < .08: #run out of bounds
                SecondsThisPlay = 9
            GameDict[OffensiveTeam]['TeamGame'].TimeOfPossession += SecondsThisPlay
            SecondsLeftInPeriod -= SecondsThisPlay

            if PlayChoice in ['Run', 'Pass']:
                YardsToGo -= YardsThisPlay
                BallSpot += YardsThisPlay
                DrivePlayObject.YardsThisPlay = YardsThisPlay


            Down +=1
            DrivePlayCount +=1
            DriveDuration += SecondsThisPlay
            DrivePlayObject.PlayDuration = SecondsThisPlay



            #Check for first down
            if YardsToGo <= 0:
                DrivePlayObject.IsFirstDown = True
                if Down == 4:
                    GameDict[OffensiveTeam]['TeamGame'].ThirdDownConversion +=1
                elif Down == 5:
                    GameDict[OffensiveTeam]['TeamGame'].FourthDownConversion +=1

                Down = 1
                YardsToGo = 10
                if BallSpot > 90:
                    YardsToGo = 100 - BallSpot
                GameDict[OffensiveTeam]['TeamGame'].FirstDowns +=1

                if PlayChoice == 'Pass':
                    GameDict[OffensiveTeam]['TeamGame'].FirstDowns_Pass +=1
                elif PlayChoice == 'Run':
                    GameDict[OffensiveTeam]['TeamGame'].FirstDowns_Rush +=1


            #check for touchdown
            if BallSpot >= 100:
                OffensiveTouchdown = True
                GameDict[OffensiveTeam]['TeamGame'].Points += 6
                OffensivePointDifferential = GameDict[OffensiveTeam]['TeamGame'].Points - GameDict[DefensiveTeam]['TeamGame'].Points

                #Todo GO FOR 2
                if DetermineGoForTwo(OffensivePointDifferential, Period, SecondsLeftInPeriod, CoachDict[OffensiveTeam]['Tendencies']):
                    TwoPointConversionAttempt = True
                    GameDict[OffensiveTeam]['TeamGame'].TwoPointAttempt +=1
                    if random.uniform(0,1) < .55:
                        GameDict[OffensiveTeam]['TeamGame'].Points += 2
                        TwoPointConversionSuccess = True
                        GameDict[OffensiveTeam]['TeamGame'].TwoPointConversion +=1
                else:
                    ExtraPointAttempt = True
                    GameDict[OffensiveTeam]['TeamGame'].KCK_XPA +=1
                    AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_XPA += 1
                    if random.uniform(0, 1) < ((KickerTalent / 90.0) ** (1/2.0)):
                        ExtraPointSuccess = True
                        GameDict[OffensiveTeam]['TeamGame'].Points += 1
                        GameDict[OffensiveTeam]['TeamGame'].KCK_XPM += 1
                        AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_XPM += 1

                if PlayChoice == 'Run':
                    GameDict[OffensiveTeam]['TeamGame'].RUS_TD += 1
                    AllPlayers[RunningBackPlayerID]['PlayerGameStat'].RUS_TD += 1
                elif PlayChoice == 'Pass':
                    GameDict[OffensiveTeam]['TeamGame'].PAS_TD += 1
                    GameDict[OffensiveTeam]['TeamGame'].REC_TD += 1

                    AllPlayers[QuarterbackPlayerID]['PlayerGameStat'].PAS_TD += 1
                    AllPlayers[WideReceiverPlayer]['PlayerGameStat'].REC_TD += 1

                AdjustBiggestLead(GameDict[OffensiveTeam]['TeamGame'], GameDict[DefensiveTeam]['TeamGame'])

                Kickoff = True
            elif BallSpot < 0:
                print()
                print('WOULD BE A SAFETY!!!!')
                print()
                GameDict[DefensiveTeam]['TeamGame'].Points += 2
                AdjustBiggestLead(GameDict[OffensiveTeam]['TeamGame'], GameDict[DefensiveTeam]['TeamGame'])
                Kickoff = True
                Safety = True

            elif FieldGoalMake:
                GameDict[OffensiveTeam]['TeamGame'].Points += 3
                AdjustBiggestLead(GameDict[OffensiveTeam]['TeamGame'], GameDict[DefensiveTeam]['TeamGame'])

            #check for turnover
            elif Turnover and DefensiveTouchdown:
                GameDict[DefensiveTeam]['TeamGame'].Points += 6
                OffensivePointDifferential = GameDict[DefensiveTeam]['TeamGame'].Points - GameDict[OffensiveTeam]['TeamGame'].Points
                #Todo GO FOR 2
                if DetermineGoForTwo(OffensivePointDifferential, Period, SecondsLeftInPeriod, CoachDict[DefensiveTeam]['Tendencies']):
                    TwoPointConversionAttempt = True
                    GameDict[OffensiveTeam]['TeamGame'].TwoPointAttempt +=1
                    if random.uniform(0,1) < .55:
                        GameDict[DefensiveTeam]['TeamGame'].Points += 2
                        TwoPointConversionSuccess = True
                        GameDict[OffensiveTeam]['TeamGame'].TwoPointConversion +=1
                else:
                    KickerPlayerID      = DefensiveTeamPlayers['K'][0]
                    KickerTalent        = AllPlayers[KickerPlayerID]['PlayerSkills']['OverallRating']

                    ExtraPointAttempt = True
                    GameDict[DefensiveTeam]['TeamGame'].KCK_XPA +=1
                    AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_XPA += 1
                    if random.uniform(0, 1) < ((KickerTalent / 90.0) ** (1/2.0)):
                        ExtraPointSuccess = True
                        GameDict[DefensiveTeam]['TeamGame'].Points += 1
                        GameDict[DefensiveTeam]['TeamGame'].KCK_XPM += 1
                        AllPlayers[KickerPlayerID]['PlayerGameStat'].KCK_XPM += 1


                AdjustBiggestLead(GameDict[OffensiveTeam]['TeamGame'], GameDict[DefensiveTeam]['TeamGame'])
                GameDict[OffensiveTeam]['TeamGame'].Turnovers += 1
                Kickoff = True

            elif Turnover:
                GameDict[OffensiveTeam]['TeamGame'].Turnovers += 1

            elif Down > 4 and YardsToGo > 0 and not Punt and not (FieldGoalMiss or FieldGoalMake):
                TurnoverOnDowns = True
                GameDict[OffensiveTeam]['TeamGame'].Turnovers += 1



            if OffensiveTouchdown:
                if PlayChoice == 'Run':
                    PlayDescription = AllPlayers[RunningBackPlayerID]['PlayerObj'].PlayerName + ' ' + str(int(100 - (BallSpot - YardsThisPlay))) + ' Yd ' + PlayChoice
                elif PlayChoice == 'Pass':
                    PlayDescription = AllPlayers[QuarterbackPlayerID]['PlayerObj'].PlayerName + ' ' + str(int(100 - (BallSpot - YardsThisPlay))) + ' Yd ' + PlayChoice + ' to ' + AllPlayers[WideReceiverPlayer]['PlayerObj'].PlayerName

                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(100 - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)

                if TwoPointConversionAttempt:
                    if TwoPointConversionSuccess:
                        DriveDescription += '  -  2pt conversion good'
                    else:
                        DriveDescription += '  -  2pt conversion NO GOOD'
                elif ExtraPointAttempt:
                    if ExtraPointSuccess:
                        DriveDescription += '  -  Extra point good'
                    else:
                        DriveDescription += '  -  Extra point MISSED'

                GE = GameEvent(GameID = game, WorldID = CurrentWorld, DriveDescription=DriveDescription, PlayDescription = PlayDescription, PlayType='TD', IsScoringPlay = True,DisplayTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True

                if abs(GameDict[OffensiveTeam]['TeamGame'].Points - GameDict[DefensiveTeam]['TeamGame'].Points) > 28:
                    IsCloseGame = False
                else:
                    IsCloseGame = True

            elif DefensiveTouchdown:

                if FumbleOnPlay:
                    PlayDescription = AllPlayers[FumbleRecovererID]['PlayerObj'].PlayerName + ' ' + str(int(100 - (FumbleRecoveryYards))) + ' Yd fumble recovery for TD'
                elif InterceptionOnPlay:
                    PlayDescription = AllPlayers[DefensiveIntercepter]['PlayerObj'].PlayerName + ' ' + str(int(100 - (InterceptionReturnYards))) + ' Yd interception for TD'

                DriveDescription = 'Fumble returned ' + str(int(100 - (FumbleRecoveryYards))) + ' yards for TD'
                GE = GameEvent(GameID = game, WorldID = CurrentWorld, DriveDescription=DriveDescription, PlayDescription = PlayDescription, PlayType='DEF-TD', IsScoringPlay = True,DisplayTeamID=DefensiveTeam, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)

                if abs(GameDict[OffensiveTeam]['TeamGame'].Points - GameDict[DefensiveTeam]['TeamGame'].Points) > 28:
                    IsCloseGame = False
                else:
                    IsCloseGame = True
                Kickoff = True
                SwitchPossession = False


            elif  TurnoverOnDowns:
                PlayDescription = 'Turnover on downs'
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='TO-D', DriveDescription=DriveDescription, PlayDescription = PlayDescription,IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points,DisplayTeamID=OffensiveTeam, EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True
            elif  Turnover or Safety:
                if InterceptionOnPlay:
                    PlayDescription = AllPlayers[QuarterbackPlayerID]['PlayerObj'].PlayerName + ' intercepted by ' + AllPlayers[DefensiveIntercepter]['PlayerObj'].PlayerName
                    PlayTypeString = 'INT'
                    DisplayTeam = OffensiveTeam
                    IsScoringPlay = False
                elif Safety:
                    PlayDescription = AllPlayers[DefensiveTackler]['PlayerObj'].PlayerName + ' tackle for a Safety!'
                    PlayTypeString = 'SAF'
                    DisplayTeam = DefensiveTeam
                    IsScoringPlay = True
                else:
                    PlayDescription = AllPlayers[RunningBackPlayerID]['PlayerObj'].PlayerName +  ' fumble recovered by ' + AllPlayers[FumbleRecovererID]['PlayerObj'].PlayerName + ', returned ' + str(FumbleRecoveryYards) + ' yards'
                    PlayTypeString = 'FUMB'
                    DisplayTeam = OffensiveTeam
                    IsScoringPlay = False

                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType=PlayTypeString, DriveDescription=DriveDescription, PlayDescription = PlayDescription,IsScoringPlay = IsScoringPlay, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points,DisplayTeamID=DisplayTeam, EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True
            elif Punt:
                PlayDescription = 'Punt on ' + str(Down-1) + 'th down for ' + str(int(PuntYards)) + ' yards'
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='PUNT', DriveDescription=DriveDescription, PlayDescription = PlayDescription,IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points,DisplayTeamID=OffensiveTeam, EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True

            elif FieldGoalMake:
                PlayDescription = AllPlayers[KickerPlayerID]['PlayerObj'].PlayerName + ' ' + str(FieldGoalDistance) + ' Yd ' + PlayChoice
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='FG', IsScoringPlay = True, DisplayTeamID=OffensiveTeam,HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = SecondsLeftInPeriod, PlayDescription=PlayDescription, DriveDescription=DriveDescription)
                GameEventsToSave.append(GE)
                SwitchPossession = True
                Kickoff = True

            elif FieldGoalMiss:
                PlayDescription = AllPlayers[KickerPlayerID]['PlayerObj'].PlayerName + ' MISSED ' + str(FieldGoalDistance) + ' Yd ' + PlayChoice
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='FG-MISS', IsScoringPlay = False, DisplayTeamID=OffensiveTeam,HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = SecondsLeftInPeriod, PlayDescription=PlayDescription, DriveDescription=DriveDescription)
                GameEventsToSave.append(GE)
                SwitchPossession = True


            if SwitchPossession or (Kickoff and not SwitchPossession):

                TurnoverOnDrive = TurnoverOnDowns or Turnover
                ScoreOnDrive = OffensiveTouchdown or FieldGoalMake
                DriveYards = int(BallSpot - DriveStartBallSpot)
                GD = GameDrive(WorldID = CurrentWorld, GameID=game, DriveDescription=DriveDescription, DriveDuration=DriveDuration, DrivePlayCount=DrivePlayCount, DriveStartBallSpot=DriveStartBallSpot, DriveYards=DriveYards,HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = SecondsLeftInPeriod, OffensiveTeamGameID=GameDict[OffensiveTeam]['TeamGame'], DefensiveTeamGameID=GameDict[DefensiveTeam]['TeamGame'], TurnoverOnDrive=TurnoverOnDrive , ScoreOnDrive=ScoreOnDrive)
                GameDrivesToSave.append(GD)
                LogDrive = True

                if SwitchPossession:
                    OffensiveTeam, DefensiveTeam = DefensiveTeam, OffensiveTeam
                GameDict[OffensiveTeam]['TeamGame'].Possessions +=1
                Down = 1
                YardsToGo = 10
                DriveDuration = 0

                ConfigureTeams = True

                if Kickoff:
                    BallSpot = 20
                elif Punt:

                    BallSpot = 100 - (BallSpot + PuntYards)
                    #print('Punt from ', OrigBallSpot, 'to', BallSpot)
                elif TurnoverOnDowns or Turnover:
                    BallSpot = 100 - BallSpot
                elif FieldGoalMiss:
                    BallSpot = 100 - BallSpot
                    if BallSpot < 20:
                        BallSpot = 20
                DriveStartBallSpot = BallSpot
                DrivePlayCount = 0

                if InOvertime and GameDict[HomeTeam]['TeamGame'].Points != GameDict[AwayTeam]['TeamGame'].Points:
                    SecondsLeftInPeriod = 0



            PlayersCurrentlyOnField = []
            for T in [{'SideOfBall': 'Defense', 'Players': DefensiveTeamPlayers}, {'SideOfBall': 'Offense', 'Players': OffensiveTeamPlayers}]:
                for Pos in T['Players']:
                    if Pos not in SideOfBallPositions[T['SideOfBall']]:
                        continue
                    for P in T['Players'][Pos]:
                        PlayersCurrentlyOnField.append(P)
                        AllPlayers[P]['Energy'] -=  CoachDict[Team]['PositionEnergyMap'][Pos]['OnFieldEnergyDrain']
                        AllPlayers[P]['PlayerGameStat'].PlaysOnField +=1
                        if AllPlayers[P]['Energy'] <=0:
                            AllPlayers[P]['Energy'] = 0.01

                        AllPlayers[P]['AdjustedOverallRating'] = int(math.ceil((AllPlayers[P]['PlayerSkills']['OverallRating'] ** AdjustedOverallPowerFactor) * math.pow(AllPlayers[P]['Energy'] , CoachDict[Team]['PositionEnergyMap'][Pos]['EnergyImpactOnOverall'])))

            for P in AllPlayers:
                if P in PlayersCurrentlyOnField:
                    continue
                AllPlayers[P]['Energy'] += EnergyRegenerationRate
                if AllPlayers[P]['Energy'] > 1 :
                    AllPlayers[P]['Energy'] = 1

            DrivePlaysToSave.append(DrivePlayObject)

        if Period == max(Periods) and GameDict[HomeTeam]['TeamGame'].Points == GameDict[AwayTeam]['TeamGame'].Points:
            Periods.append(Period+1)
            GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='REGULATION', IsScoringPlay = False, DisplayTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = 0, PlayDescription='End of regulation')
            GameEventsToSave.append(GE)
            LogDrive = not LogDrive
        elif Period == max(Periods) and GameDict[HomeTeam]['TeamGame'].Points != GameDict[AwayTeam]['TeamGame'].Points:
            GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='FINAL', IsScoringPlay = False, DisplayTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = 0, PlayDescription='End of game')
            GameEventsToSave.append(GE)
            LogDrive = not LogDrive
        elif Period == 2:
            GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='HALF', IsScoringPlay = False, DisplayTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['TeamGame'].Points, AwayPoints = GameDict[AwayTeam]['TeamGame'].Points, EventPeriod = Period, EventTime = 0, PlayDescription='End of 1st half')
            GameEventsToSave.append(GE)
            LogDrive = not LogDrive

    game.WasPlayed = 1
    print('FINAL -- ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['TeamGame'].Points,' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['TeamGame'].Points)
    game.HomeTeamSeasonWeekRankID = HomeTeam.CurrentTeamSeason.NationalRankObject
    game.AwayTeamSeasonWeekRankID = AwayTeam.CurrentTeamSeason.NationalRankObject


    if GameDict[HomeTeam]['TeamGame'].Points > GameDict[AwayTeam]['TeamGame'].Points:
        game.WinningTeamID = HomeTeam
        game.LosingTeamID = AwayTeam
        WinningTeam = HomeTeam
        LosingTeam = AwayTeam

    else:
        game.WinningTeamID = AwayTeam
        game.LosingTeamID = HomeTeam
        WinningTeam = AwayTeam
        LosingTeam = HomeTeam


    #Set win streak on TS table - True means team won, False = Loss
    WinningTeam.CurrentTeamSeason.UpdateWinStreak(True)
    LosingTeam.CurrentTeamSeason.UpdateWinStreak(False)

    GameDict[WinningTeam]['TeamSeason'].Wins +=1
    GameDict[LosingTeam]['TeamSeason'].Losses +=1

    GameDict[WinningTeam]['TeamGame'].IsWinningTeam = True

    GameDict[HomeTeam]['TeamGame'].PointsAllowed = GameDict[AwayTeam]['TeamGame'].Points
    GameDict[AwayTeam]['TeamGame'].PointsAllowed = GameDict[HomeTeam]['TeamGame'].Points

    ElementsToSave = []
    PlayerGameStatToSave = []

    StatDictExclusions = []
    for P in AllPlayers:
        PlayerGameSummary = CalculateGameScore(AllPlayers[P]['PlayerGameStat'])
        AllPlayers[P]['PlayerGameStat'].GameScore = PlayerGameSummary['GameScore']
        AllPlayers[P]['PlayerGameStat'].TopStatStringDisplay1 = PlayerGameSummary['TopStatStringDisplay1']
        AllPlayers[P]['PlayerGameStat'].TopStatStringDisplay2 = PlayerGameSummary['TopStatStringDisplay2']
        PlayerGameStatToSave.append(AllPlayers[P]['PlayerGameStat'])

    for T in GameDict:
        ElementsToSave.append(GameDict[T]['TeamGame'])
        ElementsToSave.append(GameDict[T]['TeamSeason'])

    game.save()

    for u in ElementsToSave:
        u.save()

    DrivePlay.objects.bulk_create(DrivePlaysToSave, ignore_conflicts=False, batch_size=10000)
    PlayerGameStat.objects.bulk_create(PlayerGameStatToSave, ignore_conflicts=True, batch_size=Batch_Size)
    GameEvent.objects.bulk_create(GameEventsToSave, ignore_conflicts=True, batch_size=Batch_Size)
    HomeTeamGame.TeamRecord = str(GameDict[HomeTeam]['TeamSeason'].Wins) + '-' + str(GameDict[HomeTeam]['TeamSeason'].Losses)
    AwayTeamGame.TeamRecord = str(GameDict[AwayTeam]['TeamSeason'].Wins) + '-' + str(GameDict[AwayTeam]['TeamSeason'].Losses)


    if GameDict[HomeTeam]['TeamSeason'].ConferenceID == GameDict[AwayTeam]['TeamSeason'].ConferenceID:
        GameDict[WinningTeam]['TeamSeason'].ConferenceWins +=1
        GameDict[LosingTeam]['TeamSeason'].ConferenceLosses +=1

        HomeTeamGame.TeamConferenceRecord = str(GameDict[HomeTeam]['TeamSeason'].ConferenceWins) + '-' + str(GameDict[HomeTeam]['TeamSeason'].ConferenceLosses)
        AwayTeamGame.TeamConferenceRecord = str(GameDict[AwayTeam]['TeamSeason'].ConferenceWins) + '-' + str(GameDict[AwayTeam]['TeamSeason'].ConferenceLosses)


    if game.IsConferenceChampionship:
        GameDict[WinningTeam]['TeamSeason'].ConferenceChampion = True

    if game.BowlID is not None:
        if game.BowlID.IsNationalChampionship:
            GameDict[WinningTeam]['TeamSeason'].NationalChampion = True
            GameDict[LosingTeam]['TeamSeason'].NationalRunnerUp = True


    for T in GameDict:
        GameDict[T]['TeamGame'].save()
        GameDict[T]['TeamSeason'].save()

    game.save()

    return None
