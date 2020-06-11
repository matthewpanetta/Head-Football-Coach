from django.db.models import Max, Avg, Count, Func, F, Q, Sum, Case, When, FloatField, CharField, Value, Window, ExpressionWrapper, IntegerField
from django.db.models.functions import Length, Concat
from ..models import Audit, League, TeamGame,Week,Phase,PlayerTeamSeasonDepthChart, TeamSeasonWeekRank, Position, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_PlayoffRound,PlayoffRound, NameList, User, Region, State, City,World, Headline, Playoff, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason
import time
from django.db import connection, reset_queries

def CreateDepthChart(CurrentWorld=None, TS=None, T=None, FullDepthChart = False, PositionDepthChart = {}, PlayerList = []):

    print('in CreateDepthChart', 'PositionDepthChart:', PositionDepthChart, 'TS', TS, 'FullDepthChart', FullDepthChart)
    if TS is None:
        TS = T.CurrentTeamSeason
    DoAudit = False

    if len(PlayerList) == 0:
        PlayerList = PlayerTeamSeason.objects.filter(TeamSeasonID = TS).exclude(RedshirtedThisSeason = True).select_related('PlayerID', 'PlayerID__PositionID', 'TeamSeasonID__TeamID').annotate(
            OverallRating = F('playerteamseasonskill__OverallRating'),
            CoachVeteranTendency = Max('TeamSeasonID__coachteamseason__CoachID__VeteranTendency', filter = Q(TeamSeasonID__coachteamseason__CoachPositionID__CoachPositionAbbreviation = 'HC')),
            PlayerClassOverallModifier = Case(
                When(ClassID__ClassAbbreviation = 'FR', then=Value(-1)),
                When(ClassID__ClassAbbreviation = 'SO', then=Value(-.5)),
                When(ClassID__ClassAbbreviation = 'JR', then=Value(.5)),
                When(ClassID__ClassAbbreviation = 'SR', then=Value(1)),
                default=Value(0),
                output_field=FloatField()
            ),
            CoachPatienceModifier = ExpressionWrapper(F('PlayerClassOverallModifier') * F('CoachVeteranTendency'), output_field=IntegerField()),
            AdjustedOverallRating =  F('OverallRating') + F('CoachPatienceModifier')
        ).order_by('-AdjustedOverallRating')


    PositionFillIn = {
        'QB': [],
        'RB': ['FB'],
        'FB': ['RB'],
        'WR': ['TE'],
        'TE': ['WR'],
        'OT': ['OG', 'OC'],
        'OG': ['OT', 'OC'],
        'OC': ['OT', 'OG'],
        'DE': ['DT', 'OLB'],
        'DT': ['DE'],
        'OLB': ['MLB', 'S'],
        'MLB': ['OLB', 'S'],
        'CB': ['S'],
        'S': ['CB'],
        'K': ['P'],
        'P': ['K'],
    }

    if DoAudit:
        start = time.time()

    Players = PlayerList
    DCToSave = []

    for PTS in Players:
        PlayerPositionID = PTS.PlayerID.PositionID
        PlayerPos = PlayerPositionID.PositionAbbreviation
        PlayerHasPosition = False



        for DepthPos in [PlayerPos] + PositionFillIn[PlayerPos]:
            if PositionDepthChart[DepthPos]['StarterSpotsLeft'] > 0 and not PlayerHasPosition:
                PositionDepthChart[DepthPos]['StarterSpotsLeft'] -= 1
                PositionDepthChart[DepthPos]['Starters'].append(PTS)

                PositionID = PositionDepthChart[DepthPos]['PositionID']
                DepthPosition = len(PositionDepthChart[DepthPos]['Starters'])

                DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID_id=PositionID, IsStarter = True, DepthPosition=DepthPosition)
                DCToSave.append(DC)
                PlayerHasPosition = True

        if not PlayerHasPosition:
            for DepthPos in [PlayerPos] + PositionFillIn[PlayerPos]:
                if PositionDepthChart[DepthPos]['BenchSpotsLeft'] > 0 and not PlayerHasPosition:
                    PositionDepthChart[DepthPos]['BenchSpotsLeft'] -= 1
                    PositionDepthChart[DepthPos]['Bench'].append(PTS)
                    PositionID =  PositionDepthChart[DepthPos]['PositionID']
                    DepthPosition = len(PositionDepthChart[DepthPos]['Starters']) + len(PositionDepthChart[DepthPos]['Bench'])

                    DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID_id=PositionID, IsStarter = False, DepthPosition=DepthPosition)
                    DCToSave.append(DC)
                    PlayerHasPosition = True


        if not PlayerHasPosition and FullDepthChart:
            for DepthPos in [PlayerPos]:
                PositionDepthChart[DepthPos]['BenchSpotsLeft'] -= 1
                PositionDepthChart[DepthPos]['Bench'].append(PTS)
                PositionID =  PositionDepthChart[DepthPos]['PositionID']
                DepthPosition = len(PositionDepthChart[DepthPos]['Starters']) + len(PositionDepthChart[DepthPos]['Bench'])

                DC = PlayerTeamSeasonDepthChart(WorldID = CurrentWorld, PlayerTeamSeasonID=PTS, PositionID_id=PositionID, IsStarter = False, DepthPosition=DepthPosition)
                DCToSave.append(DC)
                PlayerHasPosition = True


    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Set Depth Charts')

    print('DCToSave', DCToSave)
    return DCToSave
