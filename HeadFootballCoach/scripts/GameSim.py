from ..models import World, CoachTeamSeason, Coach, Calendar, Headline, Tournament, TeamSeason, Team, Player, Game,PlayerTeamSeason, LeagueSeason, GameEvent, PlayerSeasonSkill, PlayerGameStat
import random
import numpy
from .rankings import CalculateRankings
from ..utilities import WeightedProbabilityChoice
import math


def RoundUp(Val):
    return int(math.ceil(Val / 10.0)) * 10

def CalculateGameScore(PlayerGameStats):
    return 1#PlayerGameStats['Points'] + (0.4 * PlayerGameStats['FGM']) - (0.7 * PlayerGameStats['FGA']) - (0.4*(PlayerGameStats['FTA'] - PlayerGameStats['FTM'])) + (0.7 * PlayerGameStats['OffensiveRebounds']) + (0.3 * (PlayerGameStats['Rebounds'] - PlayerGameStats['OffensiveRebounds'] )) + PlayerGameStats['Steals'] + (0.7 * PlayerGameStats['Assists']) + (0.7 * PlayerGameStats['Blocks']) - (0.4 * PlayerGameStats['PersonalFouls']) - PlayerGameStats['Turnovers']

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

def LineupPositionFactors(Lineup, AllPlayers):

    PositionAttributes = {
        'PG': {'SizeGrouping': 'Small', 'RoleGrouping': 'Point'},
        'SG': {'SizeGrouping': 'Small', 'RoleGrouping': 'Wing'},
        'SF': {'SizeGrouping': 'Small', 'RoleGrouping': 'Wing'},
        'PF': {'SizeGrouping': 'Big',   'RoleGrouping': 'Big'},
        'C':  {'SizeGrouping': 'Big',   'RoleGrouping': 'Big'},
    }

    RoleAttributes = {
        'Point': {'Count': 0, 'IdealCount': 1, 'RequiredCount': 1, 'MaxCount': 2},
        'Wing':  {'Count': 0, 'IdealCount': 2, 'RequiredCount': 1, 'MaxCount': 3},
        'Big':   {'Count': 0, 'IdealCount': 2, 'RequiredCount': 1, 'MaxCount': 3}
    }

    for P in Lineup:
        ThisPlayer = AllPlayers[P]
        PlayerPosition = ThisPlayer['Position']
        PlayerPositionAttributes = PositionAttributes[PlayerPosition]
        PlayerPositionRole = RoleAttributes[PlayerPositionAttributes['RoleGrouping']]
        PlayerPositionRole['Count'] +=1

    for Role in RoleAttributes:
        RoleAttributes[Role]['Factor'] = 1.0
        if RoleAttributes[Role]['Count'] < RoleAttributes[Role]['RequiredCount']:
            RoleAttributes[Role]['Factor'] = 3.0
        elif RoleAttributes[Role]['Count'] < RoleAttributes[Role]['IdealCount']:
            RoleAttributes[Role]['Factor'] = 2.0
        elif RoleAttributes[Role]['Count'] >= RoleAttributes[Role]['MaxCount']:
            RoleAttributes[Role]['Factor'] = .25

    PositionResults = {}
    for Position in PositionAttributes:
        PositionResults[Position] = RoleAttributes[PositionAttributes[Position]['RoleGrouping']]['Factor']
    return PositionResults

def RandomInteger(a,b):
    if a < b:
        return random.randint(a,b)
    return random.randint(b,a)


def GameSim(game):

    # PlayType =["ast", "blkAtRim", "blkLowPost", "blkMidRange", "blkTp", "drb", "fgAtRim", "fgAtRimAndOne", "fgLowPost", "fgLowPostAndOne", "fgMidRange", "fgMidRangeAndOne", "foulOut", "ft", "injury", "missAtRim", "missFt", "missLowPost", "missMidRange", "missTp", "orb", "overtime", "pf", "quarter", "stl", "sub", "tov", "tp", "tpAndOne"]
    # ShotType = ["atRim" , "ft" , "lowPost" , "midRange" , "threePointer"]
    # Stat =[ "ast", "ba", "benchTime", "blk", "courtTime", "drb", "energy", "fg", "fgAtRim", "fgLowPost", "fgMidRange", "fga", "fgaAtRim", "fgaLowPost", "fgaMidRange" , "ft", "fta", "gs", "min", "orb", "pf", "pts", "stl", "tov", "tp", "tpa"]
    #
    # CompositeRating = ["blocking", "fouling", "passing", "rebounding", "stealing", "turnovers", "usage"]

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


    HeadCoachDiff = HomeHeadCoach.CoachID.GameplanRating - AwayHeadCoach.CoachID.GameplanRating
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


    Periods = [1,2,3,4]
    MinutesInPeriod = 15
    SecondsInMinute = 60
    SecondsInPeriod = MinutesInPeriod * SecondsInMinute

    SubsEveryN = 12
    SynergyFactor = 0.1
    Overtimes = 0
    TalentRandomness = float(0.05)
    HomeCourtAdvantage = float(CurrentLeague.HomeFieldAdvantage)
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
        AllPlayers[PlayerID] = PlayerDict


        SkillMultiplier = 1.0
        TalentRandomnessMultiplier = round(random.uniform(1.0 - TalentRandomness, 1.0 + TalentRandomness), 3)
        SkillMultiplier *= TalentRandomnessMultiplier

        if P in HomeTeamPlayers:
            AllPlayers[PlayerID]['TeamObj'] = HomeTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = HomeTeamSeason
            SkillMultiplier *= HomeCourtAdvantage
            SkillMultiplier *= HomeCoachFactor
        else:
            AllPlayers[PlayerID]['TeamObj'] = AwayTeam
            AllPlayers[PlayerID]['TeamSeasonObj'] = AwayTeamSeason
            SkillMultiplier /= HomeCourtAdvantage
            SkillMultiplier /= HomeCoachFactor


        AllPlayers[PlayerID]['PlayerSkills'] = PlayerSkillDict
        for Skill in PlayerSkillDict:
            if Skill not in SkillMultiplierExclusions:
                AllPlayers[PlayerID]['PlayerSkills'][Skill] = int(  AllPlayers[PlayerID]['PlayerSkills'][Skill] * SkillMultiplier  )


        AllPlayers[PlayerID]['GameStats'] = { 'GamesStarted':0}

        AllPlayers[PlayerID]['Energy'] = 100

    GameDict = {HomeTeam:{'Wins':0, 'Losses': 0,'GamesPlayed': 1,'Points':0,'RegionalBroadcast': RegionalBroadcast, 'NationalBroadcast': NationalBroadcast}
              , AwayTeam:{'Wins':0, 'Losses': 0,'GamesPlayed': 1,'Points':0,'RegionalBroadcast': RegionalBroadcast, 'NationalBroadcast': NationalBroadcast}
            }


    OffensiveTeam = AwayTeam
    DefensiveTeam = HomeTeam

    ChangeInPossesion = False
    TurnoverOnDowns = False
    OffensiveTouchdown = False

    Down = 1
    YardsToGo = 10
    BallSpot = 20

    GameEventsToSave = []
    PlayerGameStatToSave = []

    for Period in Periods:
        SecondsLeftInPeriod = SecondsInPeriod


        while SecondsLeftInPeriod > 0:
            TurnoverOnDowns = False
            OffensiveTouchdown = False

            YardsThisRush = numpy.random.normal(3,1)
            SecondsThisPlay = numpy.random.normal(25,4)

            YardsToGo -= YardsThisRush
            BallSpot += YardsThisRush
            SecondsLeftInPeriod -= SecondsThisPlay

            Down +=1

            if YardsToGo < 0:
                Down = 1
                YardsToGo = 10

            if BallSpot >= 100:
                OffensiveTouchdown = True
                GameDict[OffensiveTeam]['Points'] += 7
                print(OffensiveTeam, ' touchdown! ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
                BallSpot = 20

            if Down > 4 and YardsToGo > 0:
                TurnoverOnDowns = True
                print('Turnover on downs - ', OffensiveTeam)
                BallSpot = 100 - BallSpot


            if OffensiveTouchdown or TurnoverOnDowns:
                OffensiveTeam, DefensiveTeam = DefensiveTeam, OffensiveTeam
                Down = 1
                YardsToGo = 10


        if Period == max(Periods) and GameDict[HomeTeam]['Points'] == GameDict[AwayTeam]['Points']:
            Periods.append(Period+1)



    game.WasPlayed = 1
    print('FINAL -- ', OffensiveTeam, ': ', GameDict[OffensiveTeam]['Points'],' , ', DefensiveTeam, ': ', GameDict[DefensiveTeam]['Points'])
    game.HomeTeamSeasonDateRankID = HomeTeam.CurrentTeamSeason.NationalRankObject
    game.AwayTeamSeasonDateRankID = AwayTeam.CurrentTeamSeason.NationalRankObject


    if GameDict[HomeTeam]['Points'] > GameDict[AwayTeam]['Points']:
        GameDict[HomeTeam]['Wins'] =1
        GameDict[AwayTeam]['Losses'] =1
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

    for P in AllPlayers:
        ThisPlayerTeamSeason = PlayerTeamSeason.objects.get(WorldID = CurrentWorld, PlayerID = P, TeamSeasonID__LeagueSeasonID = CurrentSeason)

        #if AllPlayers[P]['GameStats']['Minutes'] == 0:
        #    continue
        StatDict = {}
        ThisPlayerTeamSeason.GamesPlayed +=1

        StatDict = AllPlayers[P]['GameStats']

        PTSStats = ThisPlayerTeamSeason.__dict__
        for S in AllPlayers[P]['GameStats']:
            setattr(ThisPlayerTeamSeason, S, float(PTSStats[S]) + float(AllPlayers[P]['GameStats'][S]))
        StatDict['WorldID'] = CurrentWorld
        if ThisPlayerTeamSeason == HomeTeamSeason:
            StatDict['TeamGameID'] = HomeTeamGame
        else:
            StatDict['TeamGameID'] = AwayTeamGame
        StatDict['PlayerTeamSeasonID'] =ThisPlayerTeamSeason

        PlayerGameStatToSave.append(PlayerGameStat(**StatDict))
        ElementsToSave.append(ThisPlayerTeamSeason)


    TeamCountingStatsExclusion = ['Minutes','PlusMinusSinceLastSub', 'Tempo', 'TimePerPossession']
    for T in GameDict:
        #TS = TeamSeason.objects.get(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, TeamID = T)
        TS = T.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
        TSDict = TS.__dict__
        for S in GameDict[T]:
            if S in TeamCountingStatsExclusion:
                continue

            setattr(TS, S, (TSDict[S] + GameDict[T][S]))

        ElementsToSave.append(TS)

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

    PlayerGameStat.objects.bulk_create(PlayerGameStatToSave)
    GameEvent.objects.bulk_create(GameEventsToSave)
    HomeTeamGame.TeamRecord = str(getattr(HomeTeam.CurrentTeamSeason, 'Wins')) + '-' + str(getattr(HomeTeam.CurrentTeamSeason, 'Losses'))
    AwayTeamGame.TeamRecord = str(getattr(AwayTeam.CurrentTeamSeason, 'Wins')) + '-' + str(getattr(AwayTeam.CurrentTeamSeason, 'Losses'))
    HomeTeamGame.TeamScore = GameDict[HomeTeam]['Points']
    AwayTeamGame.TeamScore = GameDict[AwayTeam]['Points']

    HomeTeamGame.save()
    AwayTeamGame.save()
    game.save()
    #print(PlayerStats)
    return None
