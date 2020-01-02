from django.db.models import Max, Min, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value, Window
from django.db.models.functions.window import Rank
from ..models import World, Week,TeamSeasonWeekRank, TeamSeasonDateRank, PlayerTeamSeasonAward, Team,TeamSeason, Player, Game, Conference, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat
import itertools


def CalculateConferenceRankings(LS, WorldID):
    TeamDictStarter = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
    CurrentWorld = WorldID

    RankCount = 0
    ConfRankTracker = {}


    for Conf in Conference.objects.filter(WorldID = CurrentWorld):
        ConfName = Conf.ConferenceName
        ConfTeams = TeamSeason.objects.filter(WorldID=CurrentWorld).filter(TeamID__ConferenceID = Conf).filter(teamseasonweekrank__IsCurrent = True).values(
                'TeamID__TeamName', 'TeamSeasonID', 'TeamID', 'ConferenceWins', 'ConferenceLosses', 'ConferenceChampion', 'teamseasonweekrank__NationalRank'
        ).annotate(
            NetWins = F('ConferenceWins') - F('ConferenceLosses'),
            GamesPlayed = Sum('teamgame__GamesPlayed'),
            PPG = Case(
                When(GamesPlayed = 0, then=0),
                default= ( Sum('teamgame__Points') * 1.0 / F('GamesPlayed') ),
                output_field=FloatField()
            ) ,
            PAPG = Case(
                When(GamesPlayed = 0, then=0),
                default= ( Sum('opposingteamgame__Points') * 1.0 / F('GamesPlayed') ),
                output_field=FloatField()
            ) ,
            MOV = Case(
                When(GamesPlayed = 0, then=0),
                default= ( (Sum('teamgame__Points') - Sum('opposingteamgame__Points') * 1.0) / F('GamesPlayed') ),
                output_field=FloatField()
            )
        ).order_by('-ConferenceChampion', '-NetWins', '-ConferenceWins', 'teamseasonweekrank__NationalRank')

        ConfRankTracker[ConfName] = {'Counter': 0, 'TopTeam': None, 'Teams':{}, 'TopTeamRecord': {'Wins': None, 'Losses': None}}

        ConfTeamDict = {'NetWins': {}}

        print()
        print(ConfTeams.query)
        print()

        RankCount = 1
        RankCountWithTies = 1
        for TS in ConfTeams:
            print(TS)
            TS['TeamSeason'] = TeamSeason.objects.get(TeamSeasonID = TS['TeamSeasonID'])
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
            TS['ConferenceRank'] = ConfRankTracker[ConfName]['Counter']
            TS['DefeatedTeams'] = TS['TeamSeason'].DefeatedTeams
            TS['TiebreakerCount'] = 0
            TS['RankCountWithTies'] = RankCountWithTies
            TS['ConferenceChampion'] = TS['ConferenceChampion']

            if TS['ConferenceChampion']:
                TS['TiebreakerCount'] += 10000

            TSID = TS['TeamSeason']
            ConfTeamDict['NetWins'][NetWins].append(TSID)
            ConfRankTracker[ConfName]['Teams'][TSID] = TS
            RankCount +=1
            if len(ConfTeamDict['NetWins'][NetWins]) == 1:
                RankCountWithTies +=1

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
        for TS in ConfRankTracker[ConfName]['Teams']:
            print(ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'], ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'], ConfRankTracker[ConfName]['Teams'][TS]['MOV'])
        for TS in sorted(ConfRankTracker[ConfName]['Teams'], key=lambda TS: (ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'], -1*ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'], -1*ConfRankTracker[ConfName]['Teams'][TS]['MOV']),reverse=False):

            if CurrentSeason.PlayoffCreated == False:
                TS.ConferenceRank = RankCount
                TS.ConferenceGB   = ConfRankTracker[ConfName]['Teams'][TS]['ConferenceGB']

                TS.save()
            RankCount +=1




def CalculateRankings(LS, WorldID):

    TeamList = Team.objects.filter(WorldID=WorldID).filter(teamseason__LeagueSeasonID__IsCurrent = True).values('TeamName', 'teamseason__NationalChampion', 'teamseason__ConferenceChampion', 'TeamPrestige', 'teamseason__TeamOverallRating', 'teamseason__Wins', 'teamseason__Losses', 'teamseason__TeamSeasonID', 'teamseason__NationalBroadcast', 'teamseason__RegionalBroadcast').annotate(
        Points = Sum('teamseason__teamgame__Points'),
        PointsAllowed = Sum('teamseason__opposingteamgame__Points'),
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
    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
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

def SelectBroadcast(LS, WorldID):

    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
    NextWeek = CurrentWeek.NextWeek

    if CurrentWeek.BroadcastSelected == True:
        return None

    GamesThisWeek = Game.objects.filter(WorldID=WorldID, WeekID = NextWeek).values('GameID').annotate(
        MinTeamRank=Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
        MaxTeamRank=Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
        TeamPrestige = Sum('teamgame__TeamSeasonID__TeamID__TeamPrestige'),
        GameValue = F('MaxTeamRank') + F('MinTeamRank') + F('MinTeamRank') - F('TeamPrestige')
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
