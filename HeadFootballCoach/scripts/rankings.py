
from ..models import World, TeamSeasonDateRank, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat

def Min(a,b):
    if a > b:
        return b
    else:
        return a

def CalculateConferenceRankings(LS, WorldID):
    TeamDictStarter = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    CurrentDate = Calendar.objects.get(WorldID=WorldID, IsCurrent = 1)
    CurrentWorld = WorldID

    TeamList = sorted(TeamDictStarter, key = lambda k: k.CurrentTeamSeason.ConferenceRankingTuple, reverse = True)
    RankCount = 0
    ConfRankTracker = {}

    for t in TeamList:

        if t.ConferenceID.ConferenceName not in ConfRankTracker:
            ConfRankTracker[t.ConferenceID.ConferenceName] = {'Counter': 0, 'TopTeam': t, 'TopTeamRecord': {'Wins': t.CurrentTeamSeason.ConferenceWins, 'Losses': t.CurrentTeamSeason.ConferenceLosses}}

        TS = t.CurrentTeamSeason
        ConfRankTracker[t.ConferenceID.ConferenceName]['Counter'] +=1
        RankCount +=1

        if CurrentSeason.TournamentCreated == False:
            TS.ConferenceRank = ConfRankTracker[t.ConferenceID.ConferenceName]['Counter']
            TS.ConferenceGB   = round((ConfRankTracker[t.ConferenceID.ConferenceName]['TopTeamRecord']['Wins'] - TS.ConferenceWins + TS.ConferenceLosses - ConfRankTracker[t.ConferenceID.ConferenceName]['TopTeamRecord']['Losses']) / 2.0, 1)
        TS.save()

def CalculateRankings(LS, WorldID):

    print('Calculating Rankings!!')

    TeamDictStarter = Team.objects.filter(WorldID=WorldID)
    CurrentSeason = LS
    CurrentDate = Calendar.objects.get(WorldID=WorldID, IsCurrent = 1)
    CurrentWorld = WorldID
    TeamList = sorted(TeamDictStarter, key = lambda k: k.CurrentTeamSeason.RankingTuple, reverse = True)

    Next7Days = CurrentDate.NextDayN(7).DateID

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

        print(t, TeamDict[t])

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

    Counter = 1
    for t in sorted(TeamDict, key = lambda t: TeamDict[t]['RankValue'], reverse=True):
        TeamDict[t]['Rank'] = Counter
        Counter +=1

    RankCount = 0
    for t in sorted(TeamDict, key = lambda k: TeamDict[k]['Rank'], reverse=False):
        print(t, TeamDict[t])

        TS = TeamDict[t]['CurrentTeamSeason']

        TSDR = TeamSeasonDateRank(TeamSeasonID = TS, WorldID = CurrentWorld, DateID = CurrentDate, NationalRank = TeamDict[t]['Rank'], IsCurrent = False)
        if TS.NationalRank is not None:
            OldTSDR = TS.NationalRankObject
            TSDR.NationalRankDelta = OldTSDR.NationalRank - TeamDict[t]['Rank']
            OldTSDR.IsCurrent = False
            OldTSDR.save()

        TSDR.IsCurrent = True
        TSDR.save()

        NextTeamGame = TS.teamgame_set.filter(GameID__WasPlayed = False).filter(GameID__GameDateID_id__lte = Next7Days).first()
        if NextTeamGame is not None:
            NextTeamGame.TeamSeasonDateRankID = TSDR
            NextTeamGame.save()


    CurrentSeason.RankingsLastCalculated =CurrentDate.Date
    CurrentSeason.save()

    return None

def SelectBroadcast(LS, WorldID):

    CurrentDate = Calendar.objects.get(WorldID=WorldID, IsCurrent = 1)
    for N in range(0,8):
        SelectedDate = CurrentDate.NextDayN(N)
        if SelectedDate.BroadcastSelected == True:
            continue

        GamesOnSelectedDay = Game.objects.filter(WorldID=WorldID, GameDateID = SelectedDate)
        #GamesOnSelectedDay = sorted(GamesOnSelectedDay, key=lambda r: r.HomeTeamID.CurrentTeamSeason.NationalRank + r.AwayTeamID.CurrentTeamSeason.NationalRank + Min(r.HomeTeamID.CurrentTeamSeason.NationalRank , r.AwayTeamID.CurrentTeamSeason.NationalRank) - (r.AwayTeamID.TeamPrestige / 4) - (r.HomeTeamID.TeamPrestige / 4)) #TODO
        RegionalGames = GamesOnSelectedDay[1:3]
        for g in RegionalGames:
            print('Regional game!!' , g)
            g.RegionalBroadcast = True
            g.save()

        if len(GamesOnSelectedDay) > 0:
            NationalGame = GamesOnSelectedDay[0]
            print('National Game!!', NationalGame)
            NationalGame.NationalBroadcast = True
            NationalGame.save()

    return None
