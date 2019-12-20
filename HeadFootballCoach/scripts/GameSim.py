from ..models import World, CoachTeamSeason, Coach, Calendar, Headline, Playoff, TeamSeason, Team, Player, Game,PlayerTeamSeason, LeagueSeason, GameEvent, PlayerSeasonSkill, PlayerGameStat
import random
from .rankings import CalculateRankings
from ..utilities import WeightedProbabilityChoice, IfNull, SecondsToMinutes, Average, NormalTrunc
import math


def RoundUp(Val):
    return int(math.ceil(Val / 10.0)) * 10

def CalculateGameScore(PlayerGameStats):

    GameScoreMap = [
        {'Stat': 'RUS_Yards', 'PointToStatRatio': 1.0 / 10},
        {'Stat': 'RUS_TD'   , 'PointToStatRatio': 6.0 / 1},
        {'Stat': 'PAS_Yards', 'PointToStatRatio': 1.0 / 20},
        {'Stat': 'PAS_TD',    'PointToStatRatio': 6.0 / 1},
        {'Stat': 'PAS_Completions', 'PointToStatRatio': 1.0 / 5},
        {'Stat': 'REC_Yards', 'PointToStatRatio': 1.0 / 10},
        {'Stat': 'REC_TD',    'PointToStatRatio': 6.0 / 1},
        {'Stat': 'PAS_INT',    'PointToStatRatio': -4.0 / 1},
        {'Stat': 'PAS_Sacks',  'PointToStatRatio': -1.0 / 1},
        {'Stat': 'DEF_Sacks',  'PointToStatRatio': 4.0 / 1},
        {'Stat': 'DEF_Tackles',  'PointToStatRatio': 1.0 / 1},
        {'Stat': 'DEF_Deflections',  'PointToStatRatio': 1.0 / 1},
        {'Stat': 'DEF_INT',  'PointToStatRatio': 4.0 / 1},
        {'Stat': 'DEF_TD',  'PointToStatRatio': 6.0 / 1},
        {'Stat': 'FUM_Fumbles',  'PointToStatRatio': -3.0 / 1},
        {'Stat': 'FUM_Forced',  'PointToStatRatio': 2.0 / 1},
        {'Stat': 'FUM_Recovered',  'PointToStatRatio': 2.0 / 1},
    ]

    GameScore = 0
    for StatObj in GameScoreMap:
        if StatObj['Stat'] in PlayerGameStats:
            GameScore += PlayerGameStats[StatObj['Stat']] * StatObj['PointToStatRatio']

    return GameScore

def Max(a,b):
    if a > b:
        return a
    else:
        return b

def Min(a,b):
    if a > b:
        return b
    else:
        return a


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

    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent=1)
    CurrentLeague = game.LeagueSeasonID.LeagueID

    CurrentDay = Calendar.objects.get(WorldID = CurrentWorld, IsCurrent=1)

    HomeTeamGame = game.HomeTeamGameID
    AwayTeamGame = game.AwayTeamGameID

    HomeTeam = game.HomeTeamID
    AwayTeam = game.AwayTeamID
    print()
    print('Simming ', HomeTeam, 'vs', AwayTeam)
    HomeTeamSeason = game.HomeTeamSeasonID
    AwayTeamSeason = game.AwayTeamSeasonID

    HomeTeamPlayers = [u.PlayerID for u in PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = HomeTeamSeason).select_related('PlayerID')]
    AwayTeamPlayers = [u.PlayerID for u in PlayerTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = AwayTeamSeason).select_related('PlayerID')]

    #print(HomeTeam.SchoolName +' hosts '+AwayTeam.SchoolName)
    HomeCoaches = CoachTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = HomeTeamSeason)
    AwayCoaches = CoachTeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamSeasonID = AwayTeamSeason)

    HomeHeadCoach = HomeCoaches.get(Position = 'HC')
    AwayHeadCoach = AwayCoaches.get(Position = 'HC')

    CoachDict = {
        HomeTeam: {'Coach': HomeHeadCoach.CoachID.__dict__, 'CoachTeamSeason': HomeHeadCoach.__dict__},
        AwayTeam: {'Coach': AwayHeadCoach.CoachID.__dict__, 'CoachTeamSeason': AwayHeadCoach.__dict__}
    }


    HeadCoachDiff = CoachDict[HomeTeam]['Coach']['GameplanRating'] - CoachDict[AwayTeam]['Coach']['GameplanRating']#HomeHeadCoach.CoachID.GameplanRating - AwayHeadCoach.CoachID.GameplanRating
    if HeadCoachDiff == 0:
        HomeCoachFactor = 1.0
    elif HeadCoachDiff > 0 and HeadCoachDiff < 8 :
        HomeCoachFactor = 1.03
    elif HeadCoachDiff >= 8:
        HomeCoachFactor = 1.06
    elif HeadCoachDiff < 0 and HeadCoachDiff > -8 :
        HomeCoachFactor = .97
    elif HeadCoachDiff <= -8:
        HomeCoachFactor = .94
    else:
        HomeCoachFactor = 1.0


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


    Periods = [1,2,3,4]
    MinutesInPeriod = 15
    SecondsInMinute = 60
    SecondsInPeriod = MinutesInPeriod * SecondsInMinute

    SubsEveryN = 12
    SynergyFactor = 0.1
    Overtimes = 0
    TalentRandomness = float(0.05)
    HomeFieldAdvantage = float(CurrentLeague.HomeFieldAdvantage)
    GlobalScoreNormalizationFactor = .4

    HomeTeamScoreDifference = 0
    PossessionCount = 0

    RegionalBroadcast = 0
    NationalBroadcast = 0
    if game.RegionalBroadcast:
        RegionalBroadcast = 1
    elif game.NationalBroadcast:
        NationalBroadcast = 1



    AllPlayers = {}

    KeysToSave = []#['PlusMinus', 'GamesStarted', 'Points', 'KCK_FGA', 'ThreePA', 'KCK_FGM', 'ThreePM', 'InsideShotA', 'InsideShotM', 'MidRangeShotA', 'MidRangeShotM', 'Minutes', 'Rebounds', 'OffensiveRebounds','ReboundChances','Assists','Possessions']

    SkillMultiplierExclusions = ['PlayerSeasonSkillID', 'PlayerID', 'LeagueSeasonID', 'WorldID', '_state', 'WorldID_id', 'PlayerID_id']
    for P in HomeTeamPlayers+AwayTeamPlayers:
        PSD = PlayerSeasonSkill.objects.get(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, PlayerID = P)
        PlayerSkillDict = PSD.__dict__
        PlayerDict = P.__dict__
        PTS = PlayerTeamSeason.objects.get(TeamSeasonID__LeagueSeasonID = CurrentSeason, PlayerID = P)
        PlayerID = PlayerDict['PlayerID']
        PlayerDict['PlayerTeam'] = PSD.PlayerID.CurrentPlayerTeamSeason.TeamSeasonID.TeamID
        AllPlayers[PlayerID] = PlayerDict
        AllPlayers[PlayerID]['PlayerName'] = PlayerDict['PlayerFirstName'] +' '+PlayerDict['PlayerLastName']


        SkillMultiplier = 1.0
        TalentRandomnessMultiplier = round(random.uniform(1.0 - TalentRandomness, 1.0 + TalentRandomness), 3)
        SkillMultiplier *= TalentRandomnessMultiplier

        if P in HomeTeamPlayers:
            AllPlayers[PlayerID]['TeamObj'] = HomeTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = HomeTeamSeason
            SkillMultiplier *= HomeFieldAdvantage
            SkillMultiplier *= HomeCoachFactor
        else:
            AllPlayers[PlayerID]['TeamObj'] = AwayTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = AwayTeamSeason
            SkillMultiplier /= HomeFieldAdvantage
            SkillMultiplier /= HomeCoachFactor


        AllPlayers[PlayerID]['PlayerSkills'] = PlayerSkillDict
        for Skill in PlayerSkillDict:
            if Skill not in SkillMultiplierExclusions:
                AllPlayers[PlayerID]['PlayerSkills'][Skill] = int(  AllPlayers[PlayerID]['PlayerSkills'][Skill] * SkillMultiplier  )


        AllPlayers[PlayerID]['GameStats'] = { 'GamesStarted':0, 'RUS_Yards':0, 'RUS_Carries':0, 'RUS_TD':0, 'PAS_Attempts':0, 'PAS_Completions':0, 'PAS_Yards':0, 'PAS_TD':0, 'REC_Yards':0, 'REC_TD':0, 'PNT_Punts': 0,'GamesPlayed':0, 'GameScore': 0,'KCK_FGA': 0, 'KCK_FGM': 0, 'DEF_Tackles':0, 'DEF_Sacks':0, 'PAS_INT': 0, 'PAS_Sacks': 0, 'PAS_SackYards': 0}

        AllPlayers[PlayerID]['Energy'] = 100

    GameDict = {}
    for T in [HomeTeam, AwayTeam]:
        GameDict[T] = {'Wins':0, 'Losses': 0,'Possessions':0,'Turnovers':0,'PNT_Punts':0,'FirstDowns':0,'ThirdDownConversion': 0, 'ThirdDownAttempt': 0,'FourthDownConversion': 0, 'FourthDownAttempt': 0, 'TimeOfPossession':0.0,'GamesPlayed': 1,'Points':0, 'PAS_Yards':0, 'PAS_Attempts':0,'PAS_TD':0, 'REC_Yards':0, 'REC_TD':0, 'PAS_Completions':0, 'RUS_Yards':0,'RUS_TD':0,'RUS_Carries':0, 'KCK_FGA': 0, 'KCK_FGM': 0, 'PAS_INT': 0, 'PAS_Sacks': 0, 'PAS_SackYards': 0, 'DEF_Tackles':0, 'DEF_Sacks':0, 'RegionalBroadcast': RegionalBroadcast, 'NationalBroadcast': NationalBroadcast}


    TeamPlayers = {HomeTeam:{'PlayersOnField':{},'AllPlayers':{}}, AwayTeam:{'PlayersOnField':{},'AllPlayers':{}}}

    for Team in GameDict:
        for Position in PlayerStartersByPosition:
            TeamPlayers[Team]['PlayersOnField'][Position] = []
            TeamPlayers[Team]['AllPlayers'][Position] = []

        for PlayerID in AllPlayers:
            if AllPlayers[PlayerID]['PlayerTeam'] == Team:
                Position = AllPlayers[PlayerID]['Position']
                TeamPlayers[Team]['AllPlayers'][Position].append(PlayerID)
                if Position == 'K':
                    TeamPlayers[Team]['AllPlayers']['P'].append(PlayerID)
                elif Position == 'P':
                    TeamPlayers[Team]['AllPlayers']['K'].append(PlayerID)

        for Position in TeamPlayers[Team]['AllPlayers']:
            if len(TeamPlayers[Team]['AllPlayers'][Position]) == 0:
                PositionOverlapList = PositionOverlapMap[Position]
                for Backups in PositionOverlapList:
                    TeamPlayers[Team]['AllPlayers'][Position] += TeamPlayers[Team]['AllPlayers'][Backups]

            NumberOfStarters = PlayerStartersByPosition[Position]
            TeamPlayers[Team]['AllPlayers'][Position] = sorted(TeamPlayers[Team]['AllPlayers'][Position], key=lambda k: AllPlayers[k]['PlayerSkills']['OverallRating'], reverse=True)
            for u in range(0,NumberOfStarters):
                PlayerToStart = TeamPlayers[Team]['AllPlayers'][Position].pop(0)
                TeamPlayers[Team]['PlayersOnField'][Position].append(PlayerToStart)
                TeamPlayers[Team]['AllPlayers'][Position].append(PlayerToStart)
                AllPlayers[PlayerToStart]['GameStats']['GamesStarted'] = 1


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

    ConfigureTeams = True

    GameEventsToSave = []
    PlayerGameStatToSave = []

    for Period in Periods:
        SecondsLeftInPeriod = SecondsInPeriod

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
            SecondsThisPlay = SecondsLeftInPeriod


            if ConfigureTeams:
                ConfigureTeams = False
                OffensiveTeamPlayers = TeamPlayers[OffensiveTeam]['PlayersOnField']
                DefensiveTeamPlayers = TeamPlayers[DefensiveTeam]['PlayersOnField']


                QuarterbackTalent   = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in OffensiveTeamPlayers['QB']], IntCastFlag=True)
                RunningbackTalent   = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in OffensiveTeamPlayers['RB']], IntCastFlag=True)
                ReceiverTalent      = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in OffensiveTeamPlayers['WR']], IntCastFlag=True)
                OffensiveLineTalent = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in OffensiveTeamPlayers['OT'] + OffensiveTeamPlayers['OG'] + OffensiveTeamPlayers['OC']], IntCastFlag=True)

                DefensiveLineTalent = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in DefensiveTeamPlayers['DE']  + OffensiveTeamPlayers['DT'] ], IntCastFlag=True)
                LinebackerTalent    = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in DefensiveTeamPlayers['OLB'] + OffensiveTeamPlayers['MLB']], IntCastFlag=True)
                SecondaryTalent     = Average([AllPlayers[u]['PlayerSkills']['OverallRating'] for u in DefensiveTeamPlayers['CB']  + OffensiveTeamPlayers['S']  ], IntCastFlag=True)

                KickerTalent        = OffensiveTeamPlayers['K'][0]



            if FinalPeriod and SecondsLeftInPeriod <= (5 * 60):
                IsLateGame = True
            PlayChoices = None

            #2 minute drill
            if HalfEndPeriod and SecondsLeftInPeriod <= (2 * 60):
                OffensivePointDifferential = GameDict[OffensiveTeam]['Points'] - GameDict[DefensiveTeam]['Points']
                #run out clock end of first half
                if FinalPeriod:
                    if not IsCloseGame:
                        if Down == 4:
                            PlayChoices = {
                                'Run': 0,
                                'Pass': 0,
                                'Punt': 100,
                                'Field Goal': 0
                            }
                        else:
                            PlayChoices = {
                                'Run': 80,
                                'Pass': 20,
                                'Punt': 0,
                                'Field Goal': 0
                            }
                    else:
                        if Down == 4:
                            if BallSpot > 70 and OffensivePointDifferential in [-3, -2, -1, 0, 1, 4,5,6]:
                                PlayChoices = {'Run': 0,'Pass': 0,'Punt': 0,'Field Goal': 100}
                            elif OffensivePointDifferential < -3:
                                if YardsToGo <= 1:
                                    PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}
                                elif YardsToGo >1 and YardsToGo <= 4:
                                    PlayChoices = {'Run': 50,'Pass': 50,'Punt': 0,'Field Goal': 0}
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
                            if SecondsLeftInPeriod <= 20 and BallSpot > 70 and OffensivePointDifferential in [-3, -2, -1, 0]:
                                PlayChoices = {'Run': 0,'Pass': 0,'Punt': 0,'Field Goal': 100}
                            elif OffensivePointDifferential > 0:
                                if Down == 3 and YardsToGo > 5:
                                    PlayChoices = {'Run': 15,'Pass': 85,'Punt': 0,'Field Goal': 0}
                                else:
                                    PlayChoices = {'Run': 85,'Pass': 15,'Punt': 0,'Field Goal': 0}
                            else:
                                PlayChoices = {'Run': 30,'Pass': 70,'Punt': 0,'Field Goal': 0}
                else:
                    if SecondsLeftInPeriod <= (60) and BallSpot < 30 and Down < 4:
                        PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}

                    elif SecondsLeftInPeriod <= (60) and BallSpot < 30 and Down == 4:
                        if YardsToGo > 4:
                            PlayChoices = {'Run': 0,'Pass': 0,'Punt': 100,'Field Goal': 0}
                        else:
                            PlayChoices = {'Run': 15,'Pass': 15,'Punt': 70,'Field Goal': 0}

                    elif SecondsLeftInPeriod <= (60) and BallSpot < 70:
                        if SecondsLeftInPeriod < 20 or Down == 4:
                            if BallSpot > 95:
                                PlayChoices = {'Run': 33,'Pass': 33,'Punt': 0,'Field Goal': 33}
                            else:
                                PlayChoices = {'Run': 5,'Pass': 25,'Punt': 0,'Field Goal': 70}
                        PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}

                    elif Down < 4:
                        PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}
                    else:
                        PlayChoices = {'Run': 0,'Pass': 0,'Punt': 100,'Field Goal': 0}


            elif Down == 3:
                if YardsToGo < 2:
                    PlayChoices = {'Run': 90,'Pass': 10,'Punt': 0,'Field Goal': 0}
                elif YardsToGo > 6:
                    PlayChoices = {'Run': 10,'Pass': 90,'Punt': 0,'Field Goal': 0}
                else:
                    PlayChoices = {'Run': 30,'Pass': 70,'Punt': 0,'Field Goal': 0}
            elif Down == 4:
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
                PlayChoices = {'Run': 50,'Pass': 50,'Punt': 0,'Field Goal': 0}


            #Not Late Game, far on 4th
            if PlayChoices is None:
                print('Could not find play. Period:', Period, 'BallSpot:', BallSpot, 'Down:', Down, 'YardsToGo:', YardsToGo, 'SecondsLeftInPeriod:', SecondsLeftInPeriod)
                PlayChoices = {'Run': 55,'Pass': 45,'Punt': 0,'Field Goal': 0}




            PlayChoice = WeightedProbabilityChoice(PlayChoices, 'Run')

            if PlayChoice == 'Run':
                RunningBackPlayerID = OffensiveTeamPlayers['RB'][0]
                RunGameModifier = (RunningbackTalent + OffensiveLineTalent) / DefensiveLineTalent / 2.0
                RunGameModifier = RunGameModifier ** 1.1
                YardsThisPlay = round(NormalTrunc(4.25 * RunGameModifier, 2, -0.5, 12),0)

                GameDict[OffensiveTeam]['RUS_Yards'] += YardsThisPlay
                GameDict[OffensiveTeam]['RUS_Carries'] += 1
                AllPlayers[RunningBackPlayerID]['GameStats']['RUS_Yards'] += YardsThisPlay
                AllPlayers[RunningBackPlayerID]['GameStats']['RUS_Carries'] += 1

            elif PlayChoice == 'Pass':
                QuarterbackPlayerID = OffensiveTeamPlayers['QB'][0]
                AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Attempts'] += 1
                GameDict[OffensiveTeam]['PAS_Attempts'] += 1
                PassGameModifier = ((3 * QuarterbackTalent) + ReceiverTalent + OffensiveLineTalent) / (DefensiveLineTalent + SecondaryTalent) / 2.5


                if (random.uniform(0,1) < (.03 / PassGameModifier)):
                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_INT'] += 1
                    GameDict[OffensiveTeam]['PAS_INT'] += 1
                    Turnover = True
                    YardsThisPlay = 0

                    DefensivePlayers = [(u, AllPlayers[u]['PlayerSkills']['OverallRating'] ** 2) for u in DefensiveTeamPlayers['DE']  + OffensiveTeamPlayers['DT'] + DefensiveTeamPlayers['CB']  + OffensiveTeamPlayers['S'] + DefensiveTeamPlayers['OLB']  + OffensiveTeamPlayers['MLB']  ]
                    DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    AllPlayers[DefensiveTackler]['GameStats']['DEF_Tackles'] += 1
                    GameDict[DefensiveTeam]['DEF_Tackles'] += 1

                elif (random.uniform(0,1) < (.08 / (PassGameModifier ** 2))):
                    YardsThisPlay = round(NormalTrunc(-5, 2, -10, -1),0)
                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Sacks'] += 1
                    GameDict[OffensiveTeam]['PAS_Sacks'] += 1

                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_SackYards'] += abs(YardsThisPlay)
                    GameDict[OffensiveTeam]['PAS_SackYards'] += abs(YardsThisPlay)

                    DefensivePlayers = [(u, AllPlayers[u]['PlayerSkills']['OverallRating'] ** 2) for u in DefensiveTeamPlayers['DE']  + OffensiveTeamPlayers['DT'] + DefensiveTeamPlayers['OLB']  + OffensiveTeamPlayers['MLB']  ]
                    DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    AllPlayers[DefensiveTackler]['GameStats']['DEF_Sacks'] += 1
                    GameDict[DefensiveTeam]['DEF_Sacks'] += 1

                    AllPlayers[DefensiveTackler]['GameStats']['DEF_Tackles'] += 1
                    GameDict[DefensiveTeam]['DEF_Tackles'] += 1


                elif (random.uniform(0,1) < (.6 * PassGameModifier)) :
                    PassGameModifier = PassGameModifier ** 1.1
                    YardsThisPlay = round(NormalTrunc(5.5 * PassGameModifier, 4, 0, 30),0)
                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Completions'] += 1
                    GameDict[OffensiveTeam]['PAS_Completions'] += 1

                    DefensivePlayers = [(u, AllPlayers[u]['PlayerSkills']['OverallRating'] ** 2) for u in DefensiveTeamPlayers['CB']  + OffensiveTeamPlayers['S'] + DefensiveTeamPlayers['OLB']  + OffensiveTeamPlayers['MLB']  ]
                    DefensiveTackler = WeightedProbabilityChoice(DefensivePlayers, DefensivePlayers[0])

                    AllPlayers[DefensiveTackler]['GameStats']['DEF_Tackles'] += 1
                    GameDict[DefensiveTeam]['DEF_Tackles'] += 1

                else:
                    YardsThisPlay = 0
                    IncompletePass = True

                GameDict[OffensiveTeam]['PAS_Yards'] += YardsThisPlay
                AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Yards'] += YardsThisPlay

            elif PlayChoice == 'Punt':
                Punt = True
                GameDict[OffensiveTeam]['PNT_Punts'] += 1

            elif PlayChoice == 'Field Goal':
                YardsThisPlay = 0
                KickerPlayerID = OffensiveTeamPlayers['K'][0]
                AllPlayers[KickerPlayerID]['GameStats']['KCK_FGA'] += 1
                GameDict[OffensiveTeam]['KCK_FGA'] += 1

                KickGameModifier = KickerTalent / 100.0
                r = random.uniform(0,1)
                FieldGoalDistance = 100 - BallSpot + 17
                KickDifficultModifier = 0
                if FieldGoalDistance < 25:
                    KickDifficultModifier += .25
                elif FieldGoalDistance < 35:
                    KickDifficultModifier -= .05
                elif FieldGoalDistance < 45:
                    KickDifficultModifier -= .25
                else:
                    KickDifficultModifier -= .5

                if r < (KickGameModifier + KickDifficultModifier):
                    AllPlayers[KickerPlayerID]['GameStats']['KCK_FGM'] += 1
                    GameDict[OffensiveTeam]['KCK_FGM'] += 1

                    FieldGoalMake = True
                else:
                    FieldGoalMiss = False


            if Down == 3:
                GameDict[OffensiveTeam]['ThirdDownAttempt'] +=1
            elif Down == 4 and PlayChoice in ['Run', 'Pass']:
                GameDict[OffensiveTeam]['FourthDownAttempt'] +=1


            SecondsThisPlay = Min(SecondsThisPlay, int(NormalTrunc(27,4, 16, 35)))
            if IncompletePass:
                SecondsThisPlay = 8
            if random.uniform(0,1) < .10: #run out of bounds
                SecondsThisPlay = Min(8, SecondsThisPlay)
            GameDict[OffensiveTeam]['TimeOfPossession'] += SecondsThisPlay
            SecondsLeftInPeriod -= SecondsThisPlay

            YardsToGo -= YardsThisPlay
            BallSpot += YardsThisPlay

            Down +=1
            DrivePlayCount +=1
            DriveDuration += SecondsThisPlay


            #Check for first down
            if YardsToGo < 0:

                if Down == 4:
                    GameDict[OffensiveTeam]['ThirdDownConversion'] +=1
                elif Down == 5:
                    GameDict[OffensiveTeam]['FourthDownConversion'] +=1

                Down = 1
                YardsToGo = 10
                GameDict[OffensiveTeam]['FirstDowns'] +=1


            #check for touchdown
            if BallSpot >= 100:
                OffensiveTouchdown = True
                GameDict[OffensiveTeam]['Points'] += 7

                if PlayChoice == 'Run':
                    GameDict[OffensiveTeam]['RUS_TD'] += 1
                    AllPlayers[RunningBackPlayerID]['GameStats']['RUS_TD'] += 1
                elif PlayChoice == 'Pass':
                    GameDict[OffensiveTeam]['PAS_TD'] += 1
                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_TD'] += 1


                #print(OffensiveTeam, ' touchdown! ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
                Kickoff = True

            elif FieldGoalMake:
                GameDict[OffensiveTeam]['Points'] += 3
                #print(OffensiveTeam, ' field goal! ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
            #check for turnover
            elif Turnover:
                #print('Turnover - ', OffensiveTeam)
                GameDict[OffensiveTeam]['Turnovers'] += 1
            elif Down > 4 and YardsToGo > 0 and not Punt:
                TurnoverOnDowns = True
                #print('Turnover on downs - ', OffensiveTeam)
                GameDict[OffensiveTeam]['Turnovers'] += 1

            if SecondsLeftInPeriod < 0 and HalfEndPeriod:
                Kickoff = True
                SwitchPossession = True





            if OffensiveTouchdown:
                if PlayChoice == 'Run':
                    PlayDescription = AllPlayers[RunningBackPlayerID]['PlayerName'] + ' ' + str(int(100 - (BallSpot - YardsThisPlay))) + ' Yd ' + PlayChoice
                elif PlayChoice == 'Pass':
                    PlayDescription = AllPlayers[QuarterbackPlayerID]['PlayerName'] + ' ' + str(int(100 - (BallSpot - YardsThisPlay))) + ' Yd ' + PlayChoice
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(100 - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld, DriveDescription=DriveDescription, PlayDescription = PlayDescription, PlayType='TD', IsScoringPlay = True,ScoringTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True

                if abs(GameDict[OffensiveTeam]['Points'] - GameDict[DefensiveTeam]['Points']) > 28:
                    IsCloseGame = False
                else:
                    IsCloseGame = False

            elif  TurnoverOnDowns:
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='TO-D', IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True
            elif  Turnover:
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='INT', IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True
            elif Punt:
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='PUNT', IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True
            elif FieldGoalMake:
                PlayDescription = AllPlayers[KickerPlayerID]['PlayerName'] + ' ' + str(FieldGoalDistance) + ' Yd ' + PlayChoice
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(BallSpot - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='FG', IsScoringPlay = True, ScoringTeamID=OffensiveTeam,HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod, PlayDescription=PlayDescription, DriveDescription=DriveDescription)
                GameEventsToSave.append(GE)
                SwitchPossession = True
                Kickoff = True
            elif FieldGoalMiss:
                SwitchPossession = True


            if SwitchPossession:
                OffensiveTeam, DefensiveTeam = DefensiveTeam, OffensiveTeam
                GameDict[OffensiveTeam]['Possessions'] +=1
                Down = 1
                YardsToGo = 10
                DriveDuration = 0

                ConfigureTeams = True

                if Kickoff:
                    BallSpot = 20
                elif Punt:
                    OrigBallSpot = BallSpot
                    BallSpot = BallSpot + 35
                    BallSpot = 100 - BallSpot
                    if BallSpot < 10:
                        BallSpot = 20
                    #print('Punt from ', OrigBallSpot, 'to', BallSpot)
                elif TurnoverOnDowns or Turnover:
                    BallSpot = 100 - BallSpot
                elif FieldGoalMiss:
                    BallSpot = 100 - BallSpot
                    if BallSpot < 20:
                        BallSpot = 20
                DriveStartBallSpot = BallSpot
                DrivePlayCount = 0

                if InOvertime and GameDict[HomeTeam]['Points'] != GameDict[AwayTeam]['Points']:
                    SecondsLeftInPeriod == 0

        if Period == max(Periods) and GameDict[HomeTeam]['Points'] == GameDict[AwayTeam]['Points']:
            Periods.append(Period+1)



    game.WasPlayed = 1
    print('FINAL -- ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
    game.HomeTeamSeasonDateRankID = HomeTeam.CurrentTeamSeason.NationalRankObject
    game.AwayTeamSeasonDateRankID = AwayTeam.CurrentTeamSeason.NationalRankObject


    if GameDict[HomeTeam]['Points'] > GameDict[AwayTeam]['Points']:
        GameDict[HomeTeam]['Wins'] =1
        GameDict[AwayTeam]['Losses'] =1
        game.WinningTeamID = HomeTeam
        game.LosingTeamID = AwayTeam
        HomeTeamGame.IsWinningTeam = True
        WinningTeam = HomeTeam
        LosingTeam = AwayTeam
        WinningTeamSeason = HomeTeamSeason
        LosingTeamSeason = AwayTeamSeason

    else:
        GameDict[HomeTeam]['Losses'] =1
        GameDict[AwayTeam]['Wins'] =1
        game.WinningTeamID = AwayTeam
        game.LosingTeamID = HomeTeam
        AwayTeamGame.IsWinningTeam = True
        WinningTeam = AwayTeam
        LosingTeam = HomeTeam
        WinningTeamSeason = AwayTeamSeason
        LosingTeamSeason = HomeTeamSeason

    #Set win streak on TS table - True means team won, False = Loss
    WinningTeam.CurrentTeamSeason.UpdateWinStreak(True)
    LosingTeam.CurrentTeamSeason.UpdateWinStreak(False)

    if HomeTeam.ConferenceID == AwayTeam.ConferenceID:
        GameDict[HomeTeam]['ConferenceLosses'] = GameDict[HomeTeam]['Losses']
        GameDict[HomeTeam]['ConferenceWins'] = GameDict[HomeTeam]['Wins']
        GameDict[AwayTeam]['ConferenceWins'] = GameDict[AwayTeam]['Wins']
        GameDict[AwayTeam]['ConferenceLosses'] = GameDict[AwayTeam]['Losses']

    GameDict[HomeTeam]['PointsAllowed'] = GameDict[AwayTeam]['Points']
    GameDict[AwayTeam]['PointsAllowed'] = GameDict[HomeTeam]['Points']

    ElementsToSave = []
    PlayerGameStatToSave = []

    StatDictExclusions = ['GamesPlayed']
    for P in AllPlayers:
        ThisPlayerTeamSeason = PlayerTeamSeason.objects.get(WorldID = CurrentWorld, PlayerID = P, TeamSeasonID__LeagueSeasonID = CurrentSeason)

        #if AllPlayers[P]['GameStats']['Minutes'] == 0:
        #    continue
        StatDict = {}
        ThisPlayerTeamSeason.GamesPlayed +=1

        StatDict = AllPlayers[P]['GameStats']

        StatDict['GameScore'] = CalculateGameScore(AllPlayers[P]['GameStats'])

        PTSStats = ThisPlayerTeamSeason.__dict__
        for S in AllPlayers[P]['GameStats']:
            if AllPlayers[P]['GameStats'][S] != 0:
                setattr(ThisPlayerTeamSeason, S, float(IfNull(PTSStats[S], 0)) + float(AllPlayers[P]['GameStats'][S]))
        StatDict['WorldID'] = CurrentWorld
        if ThisPlayerTeamSeason.TeamSeasonID == HomeTeamSeason:
            StatDict['TeamGameID'] = HomeTeamGame
        else:
            StatDict['TeamGameID'] = AwayTeamGame
        StatDict['PlayerTeamSeasonID'] =ThisPlayerTeamSeason
        for FE in StatDictExclusions:
            del StatDict[FE]

        PlayerGameStatToSave.append(PlayerGameStat(**StatDict))
        ElementsToSave.append(ThisPlayerTeamSeason)


    TeamCountingStatsExclusion = ['Minutes','PlusMinusSinceLastSub', 'Tempo', 'TimePerPossession']
    for T in GameDict:
        #TS = TeamSeason.objects.get(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, TeamID = T)
        TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
        TSDict = TS.__dict__
        TG = HomeTeamGame if T == HomeTeam else AwayTeamGame
        for S in GameDict[T]:
            if S in TeamCountingStatsExclusion or (GameDict[T][S] == 0 and S != 'Points'):
                continue

            setattr(TS, S, (float(TSDict[S]) + float(GameDict[T][S])))
            setattr(TG, S, float(GameDict[T][S]))

        ElementsToSave.append(TS)
        ElementsToSave.append(TG)

    game.save()


    # if WinningTeam.CurrentTeamSeason.NationalRank > 50:
    #     if LosingTeam.CurrentTeamSeason.NationalRank <= 10:
    #         print('headline here!')
    #         H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, DateID = CurrentDay)
    #         H.HeadlineType = 'Upset'
    #         HeadLineText = 'On ' + str(CurrentDay.Date) + ' ' + str(WinningTeam) + ' upset ' +str(LosingTeam.CurrentTeamSeason.NationalRankDisplay) +' '+str(LosingTeam) + ' [' + str(GameDict[WinningTeam]['Points']) + '-' + str(GameDict[LosingTeam]['Points']) + ']'
    #         HeadLineTextHTML = 'On ' + str(CurrentDay.Date) + '   <a href="/Team/'+str(WinningTeam.TeamID)+'">' + str(WinningTeam) + '</a>   upset   <a href="/Team/'+str(LosingTeam.TeamID)+'">' +str(LosingTeam.CurrentTeamSeason.NationalRankDisplay) +'  '+str(LosingTeam) + '</a>    <a href="/Game/'+str(game.GameID)+'">[' + str(GameDict[WinningTeam]['Points']) + '-' + str(GameDict[LosingTeam]['Points']) + '] </a>'
    #         H.HeadlineText = HeadLineText
    #         H.HeadlineTextHTML = HeadLineTextHTML
    #         H.Team1TeamID = WinningTeam
    #         H.Team2TeamID = LosingTeam
    #
    #         HeadlineImportanceValue = 4
    #         if LosingTeam.CurrentTeamSeason.NationalRank <= 4:
    #             HeadlineImportanceValue = 6
    #         H.HeadlineImportanceValue = HeadlineImportanceValue
    #         H.save()

    #
    # #for P in AllPlayers:
    # for P in []:
    #     #double double logic here
    #     DoubleDigitCategories = []
    #     if AllPlayers[P]['GameStats']['Points'] >= 10:
    #         DoubleDigitCategories.append('Points')
    #     if AllPlayers[P]['GameStats']['Assists'] >= 10:
    #         DoubleDigitCategories.append('Assists')
    #     if AllPlayers[P]['GameStats']['Rebounds'] >= 10:
    #         DoubleDigitCategories.append('Rebounds')
    #
    #     DoubleDigitCategoriesMap = {
    #         2: 'Double Double',
    #         3: 'Triple Double'
    #     }
    #     DoubleDigitCategoriesCount = len(DoubleDigitCategories)
    #     if DoubleDigitCategoriesCount > 2:
    #         print('headline here!')
    #         H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, DateID = CurrentDay)
    #         H.HeadlineType = DoubleDigitCategoriesMap[DoubleDigitCategoriesCount]
    #         HeadLineText = 'On ' + str(CurrentDay.Date) + ' ' + str(P) + ' recorded a '+DoubleDigitCategoriesMap[DoubleDigitCategoriesCount]+', with '
    #         CategoryCount = 0
    #         for u in DoubleDigitCategories:
    #             if CategoryCount > 0:
    #                 HeadLineText += ' and '
    #             CategoryCount +=1
    #             HeadLineText += str(AllPlayers[P]['GameStats'][u]) + ' ' + u
    #
    #         H.HeadlineText = HeadLineText
    #         H.Player1PlayerTeamSeasonID = P.CurrentPlayerTeamSeason
    #         H.HeadlineImportanceValue = DoubleDigitCategoriesCount ** 2
    #         H.save()

    for u in ElementsToSave:
        #print('saving', u)
        u.save()

    PlayerGameStat.objects.bulk_create(PlayerGameStatToSave, ignore_conflicts=True)
    GameEvent.objects.bulk_create(GameEventsToSave, ignore_conflicts=True)
    HomeTeamGame.TeamRecord = str(getattr(HomeTeam.CurrentTeamSeason, 'Wins')) + '-' + str(getattr(HomeTeam.CurrentTeamSeason, 'Losses'))
    AwayTeamGame.TeamRecord = str(getattr(AwayTeam.CurrentTeamSeason, 'Wins')) + '-' + str(getattr(AwayTeam.CurrentTeamSeason, 'Losses'))


    if game.IsConferenceChampionship:
        for T in GameDict:
            if GameDict[T]['Wins'] == 1:
            #TS = TeamSeason.objects.get(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, TeamID = T)
                TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
                TS.ConferenceChampion = True
                TS.save()

    if game.BowlID is not None:
        if game.BowlID.IsNationalChampionship:
            for T in GameDict:
                if GameDict[T]['Wins'] == 1:
                #TS = TeamSeason.objects.get(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, TeamID = T)
                    TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
                    TS.NationalChampion = True
                    TS.save()
                else:
                    TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
                    TS.NationalRunnerUp = True
                    TS.save()


    if HomeTeamGame.TeamSeasonDateRankID is None:
        HomeTeamSeasonDateRankID = HomeTeamSeason.teamseasondaterank_set.filter(IsCurrent = 1).first()
        AwayTeamSeasonDateRankID = AwayTeamSeason.teamseasondaterank_set.filter(IsCurrent = 1).first()

        HomeTeamGame.TeamSeasonDateRankID = HomeTeamSeasonDateRankID
        AwayTeamGame.TeamSeasonDateRankID = AwayTeamSeasonDateRankID

    HomeTeamGame.save()
    AwayTeamGame.save()
    game.save()
    #print(PlayerStats)
    return None
