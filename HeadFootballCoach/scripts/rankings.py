
from ..models import World, Week,TeamSeasonWeekRank, TeamSeasonDateRank, PlayerTeamSeasonAward, Team,TeamSeason, Player, Game, Conference, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat
import itertools

def Min(a,b):
    if a > b:
        return b
    else:
        return a

def CalculateConferenceRankings(LS, WorldID):
    TeamDictStarter = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
    CurrentWorld = WorldID

    RankCount = 0
    ConfRankTracker = {}


    for Conf in Conference.objects.filter(WorldID = CurrentWorld):
        print()
        print('Calculating rankings for ', Conf)
        ConfName = Conf.ConferenceName
        ConfTeams = TeamSeason.objects.filter(WorldID=CurrentWorld).filter(TeamID__ConferenceID = Conf)
        ConfTeams = sorted(ConfTeams, key = lambda k: k.ConferenceRankingTuple, reverse = True)
        ConfRankTracker[ConfName] = {'Counter': 0, 'TopTeam': None, 'Teams':{}, 'TopTeamRecord': {'Wins': None, 'Losses': None}}

        ConfTeamDict = {'NetWins': {}}

        RankCount = 1
        RankCountWithTies = 1
        for TS in ConfTeams:
            ConfRankTracker[ConfName]['Teams'][TS] = {}
            if ConfRankTracker[ConfName]['TopTeamRecord']['Wins'] is None or ConfRankTracker[ConfName]['TopTeamRecord']['Losses'] is None:
                ConfRankTracker[ConfName]['TopTeamRecord']['Losses'] = TS.ConferenceLosses
                ConfRankTracker[ConfName]['TopTeamRecord']['Wins']   = TS.ConferenceWins
                ConfRankTracker[ConfName]['TopTeam'] = TS



            ConfRankTracker[ConfName]['Counter'] +=1
            RankCount +=1

            NetWins = TS.ConferenceWins - TS.ConferenceLosses
            if NetWins not in ConfTeamDict['NetWins']:
                ConfTeamDict['NetWins'][NetWins] = []
            ConfTeamDict['NetWins'][NetWins].append(TS)
            RankCount +=1
            if len(ConfTeamDict['NetWins'][NetWins]) == 1:
                RankCountWithTies +=1

            ConfRankTracker[ConfName]['Teams'][TS]['ConferenceGB']   = round((ConfRankTracker[ConfName]['TopTeamRecord']['Wins'] - TS.ConferenceWins + TS.ConferenceLosses - ConfRankTracker[ConfName]['TopTeamRecord']['Losses']) / 2.0, 1)
            ConfRankTracker[ConfName]['Teams'][TS]['ConferenceRank'] = ConfRankTracker[ConfName]['Counter']
            ConfRankTracker[ConfName]['Teams'][TS]['DefeatedTeams'] = TS.DefeatedTeams
            ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'] = 0
            ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'] = RankCountWithTies
            ConfRankTracker[ConfName]['Teams'][TS]['MOV'] = TS.Points - TS.PointsAllowed



        for NetWins in ConfTeamDict['NetWins']:
            if len(ConfTeamDict['NetWins'][NetWins]) > 1:
                print()
                print('Tied with ', NetWins)
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
                for TS in ConfTeamDict['NetWins'][NetWins]:
                    print(TS, ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'])


        RankCount = 1
        for TS in sorted(ConfRankTracker[ConfName]['Teams'], key=lambda TS: (ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'], -1*ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'], -1*ConfRankTracker[ConfName]['Teams'][TS]['MOV']),reverse=False):

            print('TeamRankDetails: ', str(TS).ljust(50), '  RankCountWithTies:',ConfRankTracker[ConfName]['Teams'][TS]['RankCountWithTies'],'  TiebreakerCount:',ConfRankTracker[ConfName]['Teams'][TS]['TiebreakerCount'], '  ConferenceGB:',ConfRankTracker[ConfName]['Teams'][TS]['ConferenceGB'], '  MOV:',ConfRankTracker[ConfName]['Teams'][TS]['MOV'])
            if CurrentSeason.PlayoffCreated == False:
                TS.ConferenceRank = RankCount
                TS.ConferenceGB   = ConfRankTracker[ConfName]['Teams'][TS]['ConferenceGB']

                TS.save()
            RankCount +=1




def CalculateRankings(LS, WorldID):

    print('Calculating Rankings!!')

    TeamDictStarter = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
    NextWeek = CurrentWeek.NextWeek
    CurrentWorld = WorldID
    TeamList = sorted(TeamDictStarter, key = lambda k: k.CurrentTeamSeason.RankingTuple, reverse = True)

    TeamDict = {}

    for t in TeamDictStarter:
        TS = t.CurrentTeamSeason
        TeamDict[t] = {'NationalChampion': TS.NationalChampion,'TeamOverallRating':TS.TeamOverallRating, 'MarginOfVictory': 0, 'Wins': 0, 'MediaShares': 0 }
        TeamDict[t]['CurrentTeamSeason'] = TS
        TeamDict[t]['MarginOfVictory'] = 0
        TeamDict[t]['Wins'] = 0
        TeamDict[t]['MediaShares'] = 0
        TeamDict[t]['WinningPercentage'] = 0
        TeamDict[t]['TeamPrestige'] =  t.TeamPrestige
        if TS.GamesPlayed > 0:
            TeamDict[t]['MarginOfVictory'] = round((TS.Points - TS.PointsAllowed) / TS.GamesPlayed,3)
            TeamDict[t]['Wins'] = TS.Wins - (5 * TS.Losses)
            TeamDict[t]['MediaShares'] = TS.RegionalBroadcast + (5* TS.NationalBroadcast )
            TeamDict[t]['WinningPercentage'] = round(TS.Wins / TS.GamesPlayed,2)
            TeamDict[t]['ConferenceChampion'] = TS.ConferenceChampion


    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['TeamOverallRating'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['TeamOverallRating'] == TeamDict[PrevT]['TeamOverallRating']:
            TeamDict[t]['TeamOverallRatingRank'] = TeamDict[PrevT]['TeamOverallRatingRank']
        else:
            TeamDict[t]['TeamOverallRatingRank'] = Counter

        Counter +=1
        PrevT = t

    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['ConferenceChampion'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['ConferenceChampion'] == TeamDict[PrevT]['ConferenceChampion']:
            TeamDict[t]['ConferenceChampionRank'] = TeamDict[PrevT]['ConferenceChampionRank']
        else:
            TeamDict[t]['ConferenceChampionRank'] = Counter

        Counter +=1
        PrevT = t

    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['WinningPercentage'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['WinningPercentage'] == TeamDict[PrevT]['WinningPercentage']:
            TeamDict[t]['WinningPercentageRank'] = TeamDict[PrevT]['WinningPercentageRank']
        else:
            TeamDict[t]['WinningPercentageRank'] = Counter

        Counter +=1
        PrevT = t

    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['MarginOfVictory'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['MarginOfVictory'] == TeamDict[PrevT]['MarginOfVictory']:
            TeamDict[t]['MarginOfVictoryRank'] = TeamDict[PrevT]['MarginOfVictoryRank']
        else:
            TeamDict[t]['MarginOfVictoryRank'] = Counter

        Counter +=1
        PrevT = t

    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['Wins'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['Wins'] == TeamDict[PrevT]['Wins']:
            TeamDict[t]['WinsRank'] = TeamDict[PrevT]['WinsRank']
        else:
            TeamDict[t]['WinsRank'] = Counter

        Counter +=1
        PrevT = t


    Counter = 1
    PrevT = None
    for t in sorted(TeamDict, key = lambda k: (TeamDict[k]['MediaShares'], TeamDict[k]['TeamPrestige']), reverse=False):
        if PrevT is not None and TeamDict[t]['MediaShares'] == TeamDict[PrevT]['MediaShares']:
            TeamDict[t]['MediaSharesRank'] = TeamDict[PrevT]['MediaSharesRank']
        else:
            TeamDict[t]['MediaSharesRank'] = Counter

        Counter +=1
        PrevT = t
        TeamDict[t]['RankValue'] = 0
        TeamDict[t]['RankValue'] =  (1000 *TeamDict[t]['NationalChampion'])
        TeamDict[t]['RankValue'] += (.1   * TeamDict[t]['MediaSharesRank'])
        TeamDict[t]['RankValue'] += ( 1   * TeamDict[t]['WinsRank'])
        TeamDict[t]['RankValue'] += ( 1   * TeamDict[t]['WinningPercentageRank'])
        TeamDict[t]['RankValue'] += ( 1   * TeamDict[t]['MarginOfVictoryRank'])
        TeamDict[t]['RankValue'] += (.075 * TeamDict[t]['TeamOverallRatingRank'])
        TeamDict[t]['RankValue'] += (1    * TeamDict[t]['ConferenceChampionRank'])

    Counter = 1
    for t in sorted(TeamDict, key = lambda t: TeamDict[t]['RankValue'], reverse=True):
        TeamDict[t]['Rank'] = Counter
        Counter +=1

    RankCount = 0
    for t in sorted(TeamDict, key = lambda k: TeamDict[k]['Rank'], reverse=False):
        #print(t, TeamDict[t])

        TS = TeamDict[t]['CurrentTeamSeason']

        TSDR = TeamSeasonWeekRank(TeamSeasonID = TS, WorldID = CurrentWorld, WeekID = CurrentWeek, NationalRank = TeamDict[t]['Rank'], IsCurrent = False)
        if TS.NationalRank is not None:
            OldTSDR = TS.NationalRankObject
            TSDR.NationalRankDelta = OldTSDR.NationalRank - TeamDict[t]['Rank']
            OldTSDR.IsCurrent = False
            OldTSDR.save()

        TSDR.IsCurrent = True
        TSDR.save()

        NextTeamGame = TS.teamgame_set.filter(GameID__WasPlayed = False).filter(GameID__WeekID = NextWeek).first()
        #print()
        #print(t, 'Rank', TeamDict[t]['Rank'], 'NextGame:', NextTeamGame)
        if NextTeamGame is not None:
            NextTeamGame.TeamSeasonWeekRankID = TSDR
            NextTeamGame.save()

    CurrentSeason.save()

    return None

def SelectBroadcast(LS, WorldID):

    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)

    if CurrentWeek.BroadcastSelected == True:
        return None

    GamesThisWeek = Game.objects.filter(WorldID=WorldID, WeekID = CurrentWeek)
    GamesThisWeek = sorted(GamesThisWeek, key=lambda r: r.HomeTeamRankValue + r.AwayTeamRankValue + Min(r.HomeTeamRankValue , r.AwayTeamRankValue) - (r.AwayTeamID.TeamPrestige) - (r.HomeTeamID.TeamPrestige )) #TODO
    RegionalGames = GamesThisWeek[1:3]
    for g in RegionalGames:
        print('Regional game!!' , g)
        g.RegionalBroadcast = True
        g.save()

    if len(GamesThisWeek) > 0:
        NationalGame = GamesThisWeek[0]
        print('National Game!!', NationalGame)
        NationalGame.NationalBroadcast = True
        NationalGame.save()

    CurrentWeek.BroadcastSelected = True
    CurrentWeek.save()

    return None
