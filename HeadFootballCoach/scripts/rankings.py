from django.db.models import Max, Min, Avg, Count, Func, Q,F, Sum, Case, When, FloatField, CharField, Value, Window
from django.db.models.functions import Coalesce
from django.db.models.functions.window import Rank
from ..models import World, Week,TeamSeasonWeekRank, TeamGame, TeamSeasonDateRank, PlayerTeamSeasonAward, Team,TeamSeason, Player, Game, Conference, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, Driver, PlayerGameStat
import itertools
from .SRS.SRS   import CalculateSRS

def CalculateConferenceRankings(CurrentSeason, CurrentWorld, CurrentWeek=None):

    RankCount = 0
    ConfRankTracker = {}
    TS_ToSave = []

    TeamSeasonDefeatedTeamsDict = {}
    TeamSeasonDefeatedTeamsList = TeamGame.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(IsWinningTeam = True).values('TeamSeasonID', 'OpposingTeamGameID__TeamSeasonID')

    for TG in TeamSeasonDefeatedTeamsList:
        if TG['TeamSeasonID'] not in TeamSeasonDefeatedTeamsDict:
            TeamSeasonDefeatedTeamsDict[TG['TeamSeasonID']] = []
        TeamSeasonDefeatedTeamsDict[TG['TeamSeasonID']].append(TG['OpposingTeamGameID__TeamSeasonID'])

    TeamSeasonDict = {}
    TeamSeasonList = TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(TeamID__isnull = False)
    for TS in TeamSeasonList:
        TeamSeasonDict[TS.TeamSeasonID] = TS

    TeamSeasonConferenceDict = {}
    TeamSeasonList = TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(WorldID=CurrentWorld).filter(teamseasonweekrank__IsCurrent = True).values(
                'TeamID__TeamName', 'TeamSeasonID', 'TeamID', 'ConferenceWins', 'ConferenceLosses', 'ConferenceChampion', 'teamseasonweekrank__NationalRank', 'DivisionSeasonID__ConferenceSeasonID__ConferenceID'
        ).annotate(
        NetWins = Coalesce(F('ConferenceWins') - F('ConferenceLosses'), 0),
        GamesPlayed = Coalesce(Sum('teamgame__GamesPlayed'), 0),
        PPG = Coalesce(Case(
            When(GamesPlayed = 0, then=0),
            default= ( Sum('teamgame__Points') * 1.0 / F('GamesPlayed') ),
            output_field=FloatField()
        ) ,0),
        PAPG = Coalesce(Case(
            When(GamesPlayed = 0, then=0),
            default= ( Sum('teamseason_opposingteamgame__Points') * 1.0 / F('GamesPlayed') ),
            output_field=FloatField()
        ) ,0),
        MOV = Case(
            When(GamesPlayed = 0, then=0),
            default= ( (Sum('teamgame__Points') - Sum('teamseason_opposingteamgame__Points') * 1.0) / F('GamesPlayed') ),
            output_field=FloatField()
        )
    ).order_by('-ConferenceChampion', '-NetWins', '-ConferenceWins', 'teamseasonweekrank__NationalRank')


    for TS in TeamSeasonList:
        if TS['DivisionSeasonID__ConferenceSeasonID__ConferenceID'] not in TeamSeasonConferenceDict:
            TeamSeasonConferenceDict[TS['DivisionSeasonID__ConferenceSeasonID__ConferenceID']] = []
        TeamSeasonConferenceDict[TS['DivisionSeasonID__ConferenceSeasonID__ConferenceID']].append(TS)

    for Conf in Conference.objects.filter(WorldID = CurrentWorld):
        ConfName = Conf.ConferenceName
        ConfTeams =TeamSeasonConferenceDict[Conf.ConferenceID]

        ConfRankTracker[ConfName] = {'Counter': 0, 'TopTeam': None, 'Teams':{}, 'TopTeamRecord': {'Wins': None, 'Losses': None}}

        ConfTeamDict = {'NetWins': {}}

        RankCount = 1
        RankCountWithTies = 1
        for TS in ConfTeams:
            TS['TeamSeason'] = TeamSeasonDict[TS['TeamSeasonID']]
            if ConfRankTracker[ConfName]['TopTeamRecord']['Wins'] is None or ConfRankTracker[ConfName]['TopTeamRecord']['Losses'] is None:
                ConfRankTracker[ConfName]['TopTeamRecord']['Losses'] = TS['ConferenceLosses']
                ConfRankTracker[ConfName]['TopTeamRecord']['Wins']   = TS['ConferenceWins']
                ConfRankTracker[ConfName]['TopTeam'] = TS

            ConfRankTracker[ConfName]['Counter'] +=1
            RankCount +=1

            NetWins = TS['NetWins']
            if NetWins not in ConfTeamDict['NetWins']:
                ConfTeamDict['NetWins'][NetWins] = []

            TS['ConferenceGB']   = round((ConfRankTracker[ConfName]['TopTeamRecord']['Wins'] - TS['ConferenceWins'] + TS['ConferenceLosses'] - ConfRankTracker[ConfName]['TopTeamRecord']['Losses']) / 2.0, 1)
            TS['DivisionRank'] = ConfRankTracker[ConfName]['Counter']

            TS['DefeatedTeams'] = []
            if TS['TeamSeasonID'] in TeamSeasonDefeatedTeamsDict:
                TS['DefeatedTeams'] = TeamSeasonDefeatedTeamsDict[TS['TeamSeasonID']]
            TS['TiebreakerCount'] = 0
            TS['ConferenceChampion'] = TS['ConferenceChampion']

            if TS['ConferenceChampion']:
                TS['TiebreakerCount'] += 10000

            TSID = TS['TeamSeason']
            ConfTeamDict['NetWins'][NetWins].append(TSID)
            ConfRankTracker[ConfName]['Teams'][TSID] = TS
            RankCount +=1
            if len(ConfTeamDict['NetWins'][NetWins]) == 1:
                RankCountWithTies +=1
            TS['RankCountWithTies'] = RankCountWithTies

        for NetWins in ConfTeamDict['NetWins']:
            if len(ConfTeamDict['NetWins'][NetWins]) > 1:
                c = itertools.combinations(ConfTeamDict['NetWins'][NetWins], 2)
                for TiedTeams in c:
                    #print(u)
                    Team1, Team2 = TiedTeams[0], TiedTeams[1]
                    if Team1 in ConfRankTracker[ConfName]['Teams'][Team2]['DefeatedTeams']:
                        ConfRankTracker[ConfName]['Teams'][Team2]['TiebreakerCount'] +=1
                        ConfRankTracker[ConfName]['Teams'][Team1]['TiebreakerCount'] -=1
                    elif Team2 in ConfRankTracker[ConfName]['Teams'][Team1]['DefeatedTeams']:
                        ConfRankTracker[ConfName]['Teams'][Team2]['TiebreakerCount'] -=1
                        ConfRankTracker[ConfName]['Teams'][Team1]['TiebreakerCount'] +=1


        RankCount = 1
        for TS in sorted(ConfRankTracker[ConfName]['Teams'], key=lambda TS: (ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'], -1*ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'], -1*ConfRankTracker[ConfName]['Teams'][TS]['MOV']),reverse=False):

            if CurrentSeason.PlayoffCreated == False:
                TS.DivisionRank = RankCount
                TS.ConferenceGB   = ConfRankTracker[ConfName]['Teams'][TS]['ConferenceGB']

                TS_ToSave.append(TS)
            RankCount +=1

    TeamSeason.objects.bulk_update(TS_ToSave, ['DivisionRank', 'ConferenceGB'])




def CalculateRankings_old(LS, WorldID, CurrentWeek = None):

    TeamList = Team.objects.filter(WorldID=WorldID).filter(teamseason__LeagueSeasonID__IsCurrent = True).values('TeamName', 'teamseason__NationalChampion', 'teamseason__ConferenceChampion', 'teamseason__TeamOverallRating', 'teamseason__Wins', 'teamseason__Losses', 'teamseason__TeamSeasonID', 'teamseason__NationalBroadcast', 'teamseason__RegionalBroadcast').annotate(
        TeamPrestige = Max('teamseason__teamseasoninforating__TeamRating', filter=Q(teamseason__teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),
        Points = Sum('teamseason__teamgame__Points'),
        PointsAllowed = Sum('teamseason__teamseason_opposingteamgame__Points'),
        GamesPlayed = Sum('teamseason__teamgame__GamesPlayed'),
        MarginOfVictory = Case(
            When(GamesPlayed = 0, then=0),
            default= ((F('Points') -F('PointsAllowed'))  * 1.0 / F('GamesPlayed')),
            output_field=FloatField()
        ),
        WinningPercentage = Case(
            When(GamesPlayed = 0, then=0),
            default= (F('teamseason__Wins') * 1.0 / F('GamesPlayed')),
            output_field=FloatField()
        ),
        MediaShares = (F('teamseason__NationalBroadcast') * 5 + F('teamseason__RegionalBroadcast')),
        WinShares = (F('teamseason__Wins') - (5 * F('teamseason__Losses'))),
        WinSharesRank=Window(
            expression=Rank(),
            order_by=F('WinShares').desc(),
        ),
        TeamOverallRatingRank = Window(
            expression=Rank(),
            order_by=F('teamseason__TeamOverallRating').desc(),
        ),
        NationalChampionRank=Window(
            expression=Rank(),
            order_by=F('teamseason__NationalChampion').desc(),
        ),
        ConferenceChampionRank=Window(
            expression=Rank(),
            order_by=F('teamseason__ConferenceChampion').desc(),
        ),
        WinningPercentageRank=Window(
            expression=Rank(),
            order_by=F('WinningPercentage').desc(),
        ),
        MarginOfVictoryRank=Window(
            expression=Rank(),
            order_by=F('MarginOfVictory').desc(),
        ),
        MediaSharesRank=Window(
            expression=Rank(),
            order_by=F('MediaShares').desc(),
        ),
    )

    for T in TeamList:
        T['RankingValue'] = ( (1000 * T['NationalChampionRank']) + (.1 * T['MediaSharesRank']) + (10 * T['WinSharesRank']) + (1 * T['MarginOfVictoryRank']) + (.25 * T['TeamOverallRatingRank']) + (1 * T['ConferenceChampionRank']) )

    CurrentSeason = LS
    NextWeek = CurrentWeek.NextWeek
    CurrentWorld = WorldID

    RankValue = 0
    for t in sorted(TeamList, key=lambda T: T['RankingValue']):
        RankValue += 1
        TS = TeamSeason.objects.get(TeamSeasonID = t['teamseason__TeamSeasonID'])

        TSDR = TeamSeasonWeekRank(TeamSeasonID = TS, WorldID = CurrentWorld, WeekID = CurrentWeek, NationalRank = RankValue, IsCurrent = False)
        if TS.NationalRank is not None:
            OldTSDR = TS.NationalRankObject
            TSDR.NationalRankDelta = OldTSDR.NationalRank - RankValue
            OldTSDR.IsCurrent = False
            OldTSDR.save()

        TSDR.IsCurrent = True
        TSDR.save()

        NextTeamGame = TS.teamgame_set.filter(GameID__WasPlayed = False).filter(GameID__WeekID = NextWeek).first()

        if NextTeamGame is not None:
            NextTeamGame.TeamSeasonWeekRankID = TSDR
            NextTeamGame.save()

    CurrentSeason.save()

    return None

def CalculateRankings(LS, WorldID, CurrentWeek = None):
        #Custom game output
    CurrentSeason = LS
    NextWeek = CurrentWeek.NextWeek
    CurrentWorld = WorldID
    Games = CurrentSeason.game_set.filter(WasPlayed = True)
    TeamList = list(CurrentSeason.teamseason_set.filter(TeamID__isnull = False).annotate(
        TeamPrestige = Max('teamseasoninforating__TeamRating', filter=Q(teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),
    ))

    print('TeamList', TeamList)
    CurrentWeekNumber = CurrentWeek.WeekNumber

    GameList = []
    for G in Games:
        TeamGames = G.teamgame_set.all()
        GameInfo = {'HomeTeam': None, 'HomeTeamScore': 0, 'AwayTeam': None, 'AwayTeamScore': 0}
        for TG in TeamGames:
            if TG.IsHomeTeam:
                GameInfo['HomeTeam'] = TG.TeamSeasonID
                GameInfo['HomeTeamScore'] = TG.Points
            else:
                GameInfo['AwayTeam'] = TG.TeamSeasonID
                GameInfo['AwayTeamScore'] = TG.Points

        GameList.append([GameInfo['AwayTeam'], GameInfo['AwayTeamScore'], GameInfo['HomeTeam'], GameInfo['HomeTeamScore']])

    SRSRatingValue = 1
    OverallRatingValue = 0

    if CurrentWeekNumber <= 1:
        SRSRatingValue = 0
        OverallRatingValue = 1
    elif CurrentWeekNumber >= 9:
        SRSRatingValue = 1
        OverallRatingValue = 0
    else:
        SRSRatingValue = CurrentWeekNumber / 9
        OverallRatingValue = 1 - (CurrentWeekNumber / 9)

    RankValue  = 0
    RankedTeamSeasons = CalculateSRS(TeamList, GameList)
    TSDict = {}
    OverallRatingBounds = {'MinRating': 0, 'MaxRating': 0}

    for TSObj in RankedTeamSeasons:
        TS = TSObj['TeamSeason']
        rating = TS.TeamOverallRating
        if OverallRatingBounds['MaxRating'] == 0 or OverallRatingBounds['MinRating'] == 0:
            OverallRatingBounds['MaxRating'] = rating
            OverallRatingBounds['MinRating'] = rating
        else:
            if rating > OverallRatingBounds['MaxRating'] or OverallRatingBounds['MaxRating'] == 0:
                OverallRatingBounds['MaxRating'] = rating
            if rating < OverallRatingBounds['MinRating'] or OverallRatingBounds['MinRating'] == 0:
                OverallRatingBounds['MinRating'] = rating

    RatingFloorModifier = 0 - OverallRatingBounds['MinRating']
    RatingNormalizationModifier = 100 / (1 + OverallRatingBounds['MaxRating'] - OverallRatingBounds['MinRating'])
    for TSObj in RankedTeamSeasons:
        TS = TSObj['TeamSeason']
        RankValue += 1
        TSDict[TS] = {'Rating': TSObj['Rating'] * SRSRatingValue, 'OverallRating': (TS.TeamOverallRating + RatingFloorModifier) * RatingNormalizationModifier, 'TeamPrestige': TS.TeamPrestige}
        if TSDict[TS]['OverallRating'] is None:
            TSDict[TS]['OverallRating'] = 0

        TSDict[TS]['NationalRankObject'] = TS.NationalRankObject

        TSDict[TS]['OverallRating'] *= OverallRatingValue

        TSDict[TS]['ConferenceChampModifier'] = 1.1 if TS.ConferenceChampion else 1.0
        TSDict[TS]['NationalChampModifier'] = 2.0 if TS.NationalChampion else 1.0

        TSDict[TS]['TotalRating'] = TSDict[TS]['OverallRating'] + TSObj['Rating']

        TSDict[TS]['TotalRating'] *= TSDict[TS]['ConferenceChampModifier']
        TSDict[TS]['TotalRating'] *= TSDict[TS]['NationalChampModifier']


    RankValue = 0
    TeamSeasonWeekRank.objects.filter(IsCurrent = True).filter(WorldID = CurrentWorld).update(IsCurrent = False)
    for TS in sorted(TSDict.keys(), key=lambda TS: (TSDict[TS]['TotalRating'], TSDict[TS]['Rating'], TSDict[TS]['OverallRating'],  TSDict[TS]['TeamPrestige']), reverse=True):
        RankValue += 1

        TSDR = TeamSeasonWeekRank(TeamSeasonID = TS, WorldID = CurrentWorld, WeekID = CurrentWeek, NationalRank = RankValue, IsCurrent = False)
        if TSDict[TS]['NationalRankObject'] is not None:
            OldTSDR = TSDict[TS]['NationalRankObject']

            if OldTSDR is not None:
                TSDR.NationalRankDelta = OldTSDR.NationalRank - RankValue

        TSDR.IsCurrent = True
        TSDR.save()

        NextTeamGame = TS.teamgame_set.filter(GameID__WasPlayed = False).filter(GameID__WeekID = NextWeek).first()

        if NextTeamGame is not None:
            NextTeamGame.TeamSeasonWeekRankID = TSDR
            NextTeamGame.save()

    CurrentSeason.save()

    return None


def SelectBroadcast(LS, WorldID, CurrentWeek=None):

    NextWeek = CurrentWeek.NextWeek

    if CurrentWeek.BroadcastSelected == True:
        return None

    GamesThisWeek = Game.objects.filter(WorldID=WorldID, WeekID = NextWeek).values('GameID').annotate(
        MinTeamRank=Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
        MaxTeamRank=Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
        GameValue = F('MaxTeamRank') + F('MinTeamRank') + F('MinTeamRank')
    ).order_by('GameValue')


    for G in GamesThisWeek:
        G['GameObj'] = Game.objects.get(GameID = G['GameID'])

    RegionalGames = GamesThisWeek[1:3]
    for g in RegionalGames:
        g['GameObj'].RegionalBroadcast = True
        g['GameObj'].save()

    if len(GamesThisWeek) > 0:
        NationalGame = GamesThisWeek[0]
        NationalGame['GameObj'].NationalBroadcast = True
        NationalGame['GameObj'].save()

    CurrentWeek.BroadcastSelected = True
    CurrentWeek.save()

    return None
