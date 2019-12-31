from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value, Window
from django.db.models.functions import Length, Concat
from ..models import Audit, League, TeamGame,Week,Phase,PlayerTeamSeasonDepthChart, TeamSeasonWeekRank, Position, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_PlayoffRound,PlayoffRound, NameList, User, Region, State, City,World, Headline, Playoff, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason
import time


def CreateDepthChart(CurrentWorld=None, TS=None, T=None):

    print('Creating depth chart for ', TS)
    if TS is None:
        TS = T.CurrentTeamSeason
    DoAudit = True

    PositionDepthChart = {

    }

    PositionFillIn = {
        'QB': [],
        'RB': [],
        'FB': ['RB'],
        'WR': [],
        'TE': ['WR'],
        'OT': ['OG', 'OC'],
        'OG': ['OT', 'OC'],
        'OC': ['OT', 'OG'],
        'DE': ['DT'],
        'DT': ['DE'],
        'OLB': ['MLB'],
        'MLB': ['OLB'],
        'CB': ['S'],
        'S': ['CB'],
        'K': ['P'],
        'P': ['K'],
    }

    if DoAudit:
        start = time.time()

    Positions = Position.objects.all().values('PositionAbbreviation', 'PositionCountPerAwardTeam')
    for Pos in Positions:
        PositionDepthChart[Pos['PositionAbbreviation']] = {'StarterSpotsLeft': Pos['PositionCountPerAwardTeam'], 'BenchSpotsLeft': 2, 'Starters': [], 'Bench': []}


    Players = TS.playerteamseason_set.all().order_by('-PlayerID__playerseasonskill__OverallRating')
    DCToSave = []

    for PTS in Players:
        PlayerPos = PTS.PlayerID.PositionID.PositionAbbreviation
        PlayerHasPosition = False

        for DepthPos in [PlayerPos] + PositionFillIn[PlayerPos]:
            if PositionDepthChart[DepthPos]['StarterSpotsLeft'] > 0 and not PlayerHasPosition:
                PositionDepthChart[DepthPos]['StarterSpotsLeft'] -= 1
                PositionDepthChart[DepthPos]['Starters'].append(PTS)

                PositionID = Position.objects.filter(PositionAbbreviation=DepthPos).first()
                DepthPosition = len(PositionDepthChart[DepthPos]['Starters'])

                DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID=PositionID, IsStarter = True, DepthPosition=DepthPosition)
                DCToSave.append(DC)
                PlayerHasPosition = True

        if not PlayerHasPosition:
            for DepthPos in [PlayerPos] + PositionFillIn[PlayerPos]:
                if PositionDepthChart[DepthPos]['BenchSpotsLeft'] > 0 and not PlayerHasPosition:
                    PositionDepthChart[DepthPos]['BenchSpotsLeft'] -= 1
                    PositionDepthChart[DepthPos]['Bench'].append(PTS)
                    PositionID = Position.objects.filter(PositionAbbreviation=DepthPos).first()
                    DepthPosition = len(PositionDepthChart[DepthPos]['Starters']) + len(PositionDepthChart[DepthPos]['Bench'])

                    DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID=PositionID, IsStarter = False, DepthPosition=DepthPosition)
                    DCToSave.append(DC)
                    PlayerHasPosition = True

        if not PlayerHasPosition:
            PositionDepthChart[PlayerPos]['Bench'].append(PTS)
            PositionID = Position.objects.filter(PositionAbbreviation=PlayerPos).first()
            DepthPosition = len(PositionDepthChart[DepthPos]['Starters']) + len(PositionDepthChart[DepthPos]['Bench'])
            DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID=PositionID, IsStarter = False, DepthPosition=DepthPosition)
            DCToSave.append(DC)

    for Pos in PositionDepthChart:
        print(Pos, PositionDepthChart[Pos])

    PlayerTeamSeasonDepthChart.objects.bulk_create(DCToSave, ignore_conflicts=True)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Set Depth Charts')


    return None
