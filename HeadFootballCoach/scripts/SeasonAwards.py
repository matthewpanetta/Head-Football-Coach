from ..models import PlayerTeamSeasonAward, Team, Position, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, Driver, PlayerGameStat, World
from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value, Q, ExpressionWrapper, IntegerField

class Round(Func):
  function = 'ROUND'
  arity = 2

def NationalAwards(WorldID, CurrentSeason):

    CurrentWorld = World.objects.get(WorldID = WorldID)
    print('-----Assigning Awards------')

    AwardsToCreate = []
    if CurrentSeason.AwardsCreated or PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).count() == 0:
        return None
    else:
        AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).values('PlayerTeamSeasonID','PlayerID', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName').annotate(
            TeamGamesPlayed=Sum('playergamestat__TeamGamesPlayed'),
            GameScore=Sum('playergamestat__GameScore'),
            GameScorePerGame=Case(
                When(TeamGamesPlayed=0, then=0.0),
                default=(Round(F('GameScore')* 1.0 / F('TeamGamesPlayed'),1)),
                output_field=FloatField()
            ),
            OverallRating=Max(
                'playerteamseasonskill__OverallRating'
            ),
        ).order_by('-GameScore', '-OverallRating')

        for Conf in [u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')] + [None]:

            if Conf is None:
                PlayerOfTheYearPTS = AllPlayers.first()
                PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PlayerOfTheYearPTS['PlayerTeamSeasonID'])
                PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=True, IsNationalAward=True, IsSeasonAward=True)
            else:
                PlayerOfTheYearPTS = AllPlayers.filter(TeamSeasonID__ConferenceID = Conf).first()
                PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PlayerOfTheYearPTS['PlayerTeamSeasonID'])
                PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=True, IsConferenceAward=True, IsSeasonAward=True, ConferenceID = Conf)

            AwardsToCreate.append(PlayerAward)

            for Pos in Position.objects.filter(Occurance__gt = 0):
                PositionPlayers = AllPlayers.filter(PlayerID__PositionID = Pos)
                if Conf is not None:
                    PositionPlayers = PositionPlayers.filter(TeamSeasonID__ConferenceID = Conf)

                for PlayerCount in range(0,Pos.PositionCountPerAwardTeam * 2):
                    IsFirstTeam = False
                    IsSecondTeam = False
                    if PlayerCount < Pos.PositionCountPerAwardTeam:
                        IsFirstTeam = True
                    else:
                        IsSecondTeam = True

                    if PlayerCount < len(PositionPlayers):
                        if Conf is None:
                            PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                            PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsNationalAward=True, IsSeasonAward=True)
                        else:
                            PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                            PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsConferenceAward=True, IsSeasonAward=True, ConferenceID = Conf)

                        AwardsToCreate.append(PlayerAward)


                FreshmanPositionPlayers = PositionPlayers.filter(ClassID__ClassName = 'Freshman')
                for PlayerCount in range(0,Pos.PositionCountPerAwardTeam):
                    IsFreshmanTeam = False

                    #print('len(FreshmanPositionPlayers) < PlayerCount', len(FreshmanPositionPlayers) , PlayerCount)
                    if len(FreshmanPositionPlayers) <= PlayerCount:
                        continue

                    if Conf is None:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = FreshmanPositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFreshmanTeam=True, IsNationalAward=True, IsSeasonAward=True)
                    else:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = FreshmanPositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFreshmanTeam=True, IsConferenceAward=True, ConferenceID=Conf, IsSeasonAward=True)

                    AwardsToCreate.append(PlayerAward)


        PlayerTeamSeasonAward.objects.bulk_create(AwardsToCreate)

        CurrentSeason.AwardsCreated = True
        CurrentSeason.save()

    return None

def SelectPreseasonAllAmericans(WorldID, LeagueSeasonID):
    CurrentWorld = WorldID

    AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = LeagueSeasonID).exclude(ClassID__ClassName = 'Freshman').values('PlayerTeamSeasonID','PlayerID', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName').annotate(
        TeamGamesPlayed=Sum('playergamestat__TeamGamesPlayed'),
        GameScore=Sum('playergamestat__GameScore'),
        GameScorePerGame=Case(
            When(TeamGamesPlayed=0, then=0.0),
            default=(Round(F('GameScore')* 1.0 / F('TeamGamesPlayed'),1)),
            output_field=FloatField()
        ),
        OverallRating=Max(
            'playerteamseasonskill__OverallRating'
        ),
        MaxStarterValue = Max('playerteamseasondepthchart__IsStarter'),
        IsStarter = Case(
            When(MaxStarterValue = True, then=Value(1)),
            default=Value(0),
            output_field = IntegerField()
        )
    ).order_by('-IsStarter', '-GameScorePerGame', '-OverallRating')

    if AllPlayers.count() == 0:
        return None

    AwardsToCreate = []
    for Conf in [u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')] + [None]:

        for Pos in Position.objects.filter(Occurance__gt = 0):
            PositionPlayers = AllPlayers.filter(PlayerID__PositionID = Pos)
            if Conf is not None:
                PositionPlayers = PositionPlayers.filter(TeamSeasonID__ConferenceID = Conf)

            for PlayerCount in range(0,Pos.PositionCountPerAwardTeam * 2):
                IsFirstTeam = False
                IsSecondTeam = False
                if PlayerCount < Pos.PositionCountPerAwardTeam:
                    IsFirstTeam = True
                else:
                    IsSecondTeam = True

                if PlayerCount < len(PositionPlayers):
                    if Conf is None:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsNationalAward=True, IsPreseasonAward=True)
                    else:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsConferenceAward=True, IsPreseasonAward=True, ConferenceID = Conf)

                    AwardsToCreate.append(PlayerAward)

    PlayerTeamSeasonAward.objects.bulk_create(AwardsToCreate)
    return None


def ChoosePlayersOfTheWeek(CurrentSeason, CurrentWorld, CurrentWeek=None):

    for PositionGroupID in PositionGroup.objects.exclude(PositionGroupName = 'Special Teams'):

        PTG = PlayerGameStat.objects.filter(WorldID = CurrentWorld).filter(TeamGameID__GameID__WeekID = CurrentWeek).filter(PlayerTeamSeasonID__PlayerID__PositionID__PositionGroupID = PositionGroupID).filter(TeamGameID__GameID__WasPlayed = True).annotate(
            GameWinModifier = Case(
                When(Q(TeamGameID__IsWinningTeam = True) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 5), then=Value(1.25)),
                When(Q(TeamGameID__IsWinningTeam = True) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 15), then=Value(1.15)),
                When(Q(TeamGameID__IsWinningTeam = True) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25), then=Value(1.1)),
                When(Q(TeamGameID__IsWinningTeam = True) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 45), then=Value(1.05)),
                When(Q(TeamGameID__IsWinningTeam = True), then=Value(1.0)),
                When(Q(TeamGameID__IsWinningTeam = False) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 5), then=Value(1.05)),
                When(Q(TeamGameID__IsWinningTeam = False) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 15), then=Value(1.0)),
                When(Q(TeamGameID__IsWinningTeam = False) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 25), then=Value(0.90)),
                When(Q(TeamGameID__IsWinningTeam = False) & Q(TeamGameID__OpposingTeamGameID__TeamSeasonWeekRankID__NationalRank__lte = 45), then=Value(0.8)),
                When(Q(TeamGameID__IsWinningTeam = False), then=Value(0.7)),
                default=Value(0.9),
                output_field = FloatField()
            ),
            AdjustedGameScore = ExpressionWrapper(F('GameScore') * F('GameWinModifier'), output_field=FloatField())
        ).order_by('-AdjustedGameScore')

        if PTG.count() == 0:
            continue

        NationalPlayerOfTheWeek = PTG[0].PlayerTeamSeasonID

        Award = PlayerTeamSeasonAward(WorldID = CurrentWorld, IsTopPlayer = True, IsNationalAward = True, IsWeekAward = True, IsPositionGroupAward = True, PositionGroupID = PositionGroupID, PlayerTeamSeasonID = NationalPlayerOfTheWeek, WeekID = CurrentWeek)
        Award.save()
        ConfList = CurrentWorld.conference_set.all().filter(teamseason__teamgame__GameID__WeekID = CurrentWeek).annotate(GamesPlayed = Count('teamseason__teamgame')).filter(GamesPlayed__gt = 0)
        for Conf in ConfList:
            ConfPTG = PTG.filter(TeamGameID__TeamSeasonID__ConferenceID = Conf).order_by('-GameScore')
            ConferencePlayerOfTheWeek = ConfPTG[0].PlayerTeamSeasonID
            Award = PlayerTeamSeasonAward(WorldID = CurrentWorld, IsTopPlayer = True, IsConferenceAward = True, IsWeekAward = True, ConferenceID = Conf, PlayerTeamSeasonID = ConferencePlayerOfTheWeek, IsPositionGroupAward = True, PositionGroupID = PositionGroupID, WeekID = CurrentWeek)
            Award.save()
