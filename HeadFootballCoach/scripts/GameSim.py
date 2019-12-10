from ..models import World, CoachTeamSeason, Coach, Calendar, Headline, Tournament, TeamSeason, Team, Player, Game,PlayerTeamSeason, LeagueSeason, GameEvent, PlayerSeasonSkill, PlayerGameStat
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
        {'Stat': 'PAS_Yards', 'PointToStatRatio': 1.0 / 25},
        {'Stat': 'PAS_TD',    'PointToStatRatio': 5.0 / 1},
        {'Stat': 'REC_Yards', 'PointToStatRatio': 1.0 / 10},
        {'Stat': 'REC_TD',    'PointToStatRatio': 6.0 / 1},
    ]

    GameScore = 0
    for StatObj in GameScoreMap:
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

    # PlayType =["ast", "blkAtRim", "blkLowPost", "blkMidRange", "blkTp", "drb", "fgAtRim", "fgAtRimAndOne", "fgLowPost", "fgLowPostAndOne", "fgMidRange", "fgMidRangeAndOne", "foulOut", "ft", "injury", "missAtRim", "missFt", "missLowPost", "missMidRange", "missTp", "orb", "overtime", "pf", "quarter", "stl", "sub", "tov", "tp", "tpAndOne"]
    # ShotType = ["atRim" , "ft" , "lowPost" , "midRange" , "threePointer"]
    # Stat =[ "ast", "ba", "benchTime", "blk", "FieldTime", "drb", "energy", "fg", "fgAtRim", "fgLowPost", "fgMidRange", "fga", "fgaAtRim", "fgaLowPost", "fgaMidRange" , "ft", "fta", "gs", "min", "orb", "pf", "pts", "stl", "tov", "tp", "tpa"]
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

    KeysToSave = []#['PlusMinus', 'GamesStarted', 'Points', 'FGA', 'ThreePA', 'FGM', 'ThreePM', 'InsideShotA', 'InsideShotM', 'MidRangeShotA', 'MidRangeShotM', 'Minutes', 'Rebounds', 'OffensiveRebounds','ReboundChances','Assists','Possessions']

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


        AllPlayers[PlayerID]['GameStats'] = { 'GamesStarted':0, 'RUS_Yards':0, 'RUS_Carries':0, 'RUS_TD':0, 'PAS_Attempts':0, 'PAS_Completions':0, 'PAS_Yards':0, 'PAS_TD':0, 'REC_Yards':0, 'REC_TD':0, 'GamesPlayed':0, 'GameScore': 0}

        AllPlayers[PlayerID]['Energy'] = 100

    GameDict = {}
    for T in [HomeTeam, AwayTeam]:
        GameDict[T] = {'Wins':0, 'Losses': 0,'Possessions':0,'Turnovers':0,'FirstDowns':0,'TimeOfPossession':0.0,'GamesPlayed': 1,'Points':0, 'PAS_Yards':0, 'PAS_Attempts':0,'PAS_TD':0, 'REC_Yards':0, 'REC_TD':0, 'PAS_Completions':0, 'RUS_Yards':0,'RUS_TD':0,'RUS_Carries':0,'RegionalBroadcast': RegionalBroadcast, 'NationalBroadcast': NationalBroadcast}


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

    ChangeInPossesion = False
    TurnoverOnDowns = False
    OffensiveTouchdown = False

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


        while SecondsLeftInPeriod > 0:
            TurnoverOnDowns = False
            OffensiveTouchdown = False
            SwitchPossession = False
            Kickoff = False

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




            PlayChoices = {
                'Run': 55,
                'Pass': 45
            }

            PlayChoice = WeightedProbabilityChoice(PlayChoices, 'Run')

            if PlayChoice == 'Run':
                RunningBackPlayerID = OffensiveTeamPlayers['RB'][0]
                RunGameModifier = (RunningbackTalent + OffensiveLineTalent) / DefensiveLineTalent / 2.0
                YardsThisPlay = round(NormalTrunc(2.5 + RunGameModifier, 2, -2, 12),0)

                GameDict[OffensiveTeam]['RUS_Yards'] += YardsThisPlay
                GameDict[OffensiveTeam]['RUS_Carries'] += 1
                AllPlayers[RunningBackPlayerID]['GameStats']['RUS_Yards'] += YardsThisPlay
                AllPlayers[RunningBackPlayerID]['GameStats']['RUS_Carries'] += 1

            elif PlayChoice == 'Pass':
                QuarterbackPlayerID = OffensiveTeamPlayers['QB'][0]
                AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Attempts'] += 1
                GameDict[OffensiveTeam]['PAS_Attempts'] += 1
                PassGameModifier = (QuarterbackTalent + ReceiverTalent + OffensiveLineTalent) / (DefensiveLineTalent + SecondaryTalent) / 1.5

                if (random.uniform(0,1) < (.6 * PassGameModifier)) :
                    YardsThisPlay = round(NormalTrunc(3 + PassGameModifier, 4, -2, 20),0)
                    AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Completions'] += 1
                    GameDict[OffensiveTeam]['PAS_Completions'] += 1
                else:
                    YardsThisPlay = 0

                GameDict[OffensiveTeam]['PAS_Yards'] += YardsThisPlay
                AllPlayers[QuarterbackPlayerID]['GameStats']['PAS_Yards'] += YardsThisPlay


            SecondsThisPlay = int(NormalTrunc(25,4, 12, 35))
            GameDict[OffensiveTeam]['TimeOfPossession'] += SecondsThisPlay
            SecondsLeftInPeriod -= SecondsThisPlay

            YardsToGo -= YardsThisPlay
            BallSpot += YardsThisPlay

            Down +=1
            DrivePlayCount +=1
            DriveDuration += SecondsThisPlay


            #Check for first down
            if YardsToGo < 0:
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

                print(OffensiveTeam, ' touchdown! ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
                Kickoff = True

            #check for turnover
            elif Down > 4 and YardsToGo > 0:
                TurnoverOnDowns = True
                print('Turnover on downs - ', OffensiveTeam)
                GameDict[OffensiveTeam]['Turnovers'] += 1




            if OffensiveTouchdown:
                PlayDescription = AllPlayers[RunningBackPlayerID]['PlayerName'] + ' ' + str(int(100 - (BallSpot - YardsThisPlay))) + ' Yd ' + PlayChoice
                DriveDescription = str(DrivePlayCount) + ' plays, ' + str(int(100 - DriveStartBallSpot)) + ' yards, ' + SecondsToMinutes(DriveDuration)
                GE = GameEvent(GameID = game, WorldID = CurrentWorld, DriveDescription=DriveDescription, PlayDescription = PlayDescription, PlayType='TD', IsScoringPlay = True,ScoringTeamID=OffensiveTeam, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
                SwitchPossession = True

            elif  TurnoverOnDowns:
                GE = GameEvent(GameID = game, WorldID = CurrentWorld,PlayType='TO-D', IsScoringPlay = False, HomePoints = GameDict[HomeTeam]['Points'], AwayPoints = GameDict[AwayTeam]['Points'], EventPeriod = Period, EventTime = SecondsLeftInPeriod)
                GameEventsToSave.append(GE)
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
                else:
                    BallSpot = 100 - BallSpot
                DriveStartBallSpot = BallSpot
                DrivePlayCount = 0

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
        WinningTeam = HomeTeam
        LosingTeam = AwayTeam

    else:
        GameDict[HomeTeam]['Losses'] =1
        GameDict[AwayTeam]['Wins'] =1
        game.WinningTeamID = AwayTeam
        game.LosingTeamID = HomeTeam
        WinningTeam = AwayTeam
        LosingTeam = HomeTeam

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
            if S in TeamCountingStatsExclusion:
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

    HomeTeamGame.save()
    AwayTeamGame.save()
    game.save()
    #print(PlayerStats)
    return None
