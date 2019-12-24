from ..models import PlayerTeamSeasonAward, Team, Position, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat, World
from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value

class Round(Func):
  function = 'ROUND'
  arity = 2

def NationalAwards(WorldID, CurrentSeason):

    CurrentWorld = World.objects.get(WorldID = WorldID)

    AwardsToCreate = []
    if CurrentSeason.AwardsCreated:
        return None
    else:
        AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).values('PlayerTeamSeasonID','PlayerID', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName').annotate(
            GameScorePerGame=Case(
                When(GamesPlayed=0, then=0.0),
                default=(Round(F('GameScore')* 1.0 / F('GamesPlayed'),1)),
                output_field=FloatField()
            ),
            OverallRating=Max(
                'PlayerID__playerseasonskill__OverallRating'
            ),
        ).order_by('-GameScorePerGame', '-OverallRating')

        for Conf in [u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')] + [None]:

            if Conf is None:
                PlayerOfTheYearPTS = AllPlayers.first()
                PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PlayerOfTheYearPTS['PlayerTeamSeasonID'])
                PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=True, IsNationalAward=True, IsSeasonAward=True)
            else:
                PlayerOfTheYearPTS = AllPlayers.filter(PlayerTeamSeasonID__TeamSeasonID__TeamID__ConferenceID = Conf).first()
                PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PlayerOfTheYearPTS['PlayerTeamSeasonID'])
                PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=True, IsConferenceAward=True, IsSeasonAward=True, ConferenceID = Conf)

            AwardsToCreate.append(PlayerAward)

            for Pos in Position.objects.filter(Occurance__gt = 0):
                PositionPlayers = AllPlayers.filter(PlayerID__PositionID = Pos)
                for PlayerCount in range(0,Pos.PositionCountPerAwardTeam * 2):
                    IsFirstTeam = False
                    IsSecondTeam = False
                    if PlayerCount < Pos.PositionCountPerAwardTeam:
                        IsFirstTeam = True
                    else:
                        IsSecondTeam = True

                    if Conf is None:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsNationalAward=True, IsSeasonAward=True)
                    else:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsConferenceAward=True, IsSeasonAward=True, ConferenceID = Conf)

                    AwardsToCreate.append(PlayerAward)


                FreshmanPositionPlayers = AllPlayers.filter(PlayerID__PositionID = Pos).filter(PlayerID__Class = 'Freshman')
                for PlayerCount in range(0,Pos.PositionCountPerAwardTeam * 2):
                    IsFirstTeam = False
                    IsSecondTeam = False
                    if PlayerCount < Pos.PositionCountPerAwardTeam:
                        IsFirstTeam = True
                    else:
                        IsSecondTeam = True

                    if Conf is None:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = FreshmanPositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsNationalAward=True, IsSeasonAward=True)
                    else:
                        PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = FreshmanPositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                        PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsConferenceAward=True, ConferenceID=Conf, IsSeasonAward=True)

                    AwardsToCreate.append(PlayerAward)


        PlayerTeamSeasonAward.objects.bulk_create(AwardsToCreate)

        CurrentSeason.AwardsCreated = True
        CurrentSeason.save()

    return None

def SelectPreseasonAllAmericans(WorldID, LeagueSeasonID):
    CurrentWorld = WorldID

    AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = LeagueSeasonID).values('PlayerTeamSeasonID','PlayerID', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName').annotate(
        GameScorePerGame=Case(
            When(GamesPlayed=0, then=0.0),
            default=(Round(F('GameScore')* 1.0 / F('GamesPlayed'),1)),
            output_field=FloatField()
        ),
        OverallRating=Max(
            'PlayerID__playerseasonskill__OverallRating'
        ),
    ).order_by('-GameScorePerGame', '-OverallRating')

    AwardsToCreate = []
    for Conf in [u for u in Conference.objects.filter(WorldID = CurrentWorld).order_by('ConferenceName')] + [None]:

        for Pos in Position.objects.filter(Occurance__gt = 0):
            PositionPlayers = AllPlayers.filter(PlayerID__PositionID = Pos)
            if Conf is not None:
                PositionPlayers = PositionPlayers.filter(TeamSeasonID__TeamID__ConferenceID = Conf)

            for PlayerCount in range(0,Pos.PositionCountPerAwardTeam * 2):
                IsFirstTeam = False
                IsSecondTeam = False
                if PlayerCount < Pos.PositionCountPerAwardTeam:
                    IsFirstTeam = True
                else:
                    IsSecondTeam = True

                if Conf is not None:
                    print('PositionPlayers, PlayerCount', Conf.ConferenceAbbreviation, Pos.PositionAbbreviation, PositionPlayers, PositionPlayers.count(), PlayerCount)

                if Conf is None:
                    PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                    PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsNationalAward=True, IsPreseasonAward=True)
                else:
                    PTS = PlayerTeamSeason.objects.get(PlayerTeamSeasonID = PositionPlayers[PlayerCount]['PlayerTeamSeasonID'])
                    PlayerAward = PlayerTeamSeasonAward(WorldID = CurrentWorld, PlayerTeamSeasonID = PTS, IsTopPlayer=False, PositionID = Pos, IsFirstTeam=IsFirstTeam, IsSecondTeam=IsSecondTeam, IsConferenceAward=True, IsPreseasonAward=True, ConferenceID = Conf)

                AwardsToCreate.append(PlayerAward)

    PlayerTeamSeasonAward.objects.bulk_create(AwardsToCreate)
    return None


def ChoosePlayersOfTheWeek(LS, WorldID):
    CurrentSeason = LS
    CurrentWeek = Week.objects.get(WorldID=WorldID, IsCurrent = 1)
    CurrentWorld = WorldID


    for PositionGroupID in PositionGroup.objects.exclude(PositionGroupName = 'Special Teams'):
        print(PositionGroupID)

        PTG = PlayerGameStat.objects.filter(WorldID = CurrentWorld).filter(TeamGameID__GameID__WeekID = CurrentWeek).filter(PlayerTeamSeasonID__PlayerID__PositionID__PositionGroupID = PositionGroupID).filter(TeamGameID__GameID__WasPlayed = True).order_by('-GameScore')

        if PTG.count() == 0:
            continue

        NationalPlayerOfTheWeek = PTG[0].PlayerTeamSeasonID

        Award = PlayerTeamSeasonAward(WorldID = CurrentWorld, IsTopPlayer = True, IsNationalAward = True, IsWeekAward = True, IsPositionGroupAward = True, PositionGroupID = PositionGroupID, PlayerTeamSeasonID = NationalPlayerOfTheWeek, WeekID = CurrentWeek)
        Award.save()
        for Conf in CurrentWorld.conference_set.all():
            ConfPTG = PTG.filter(TeamGameID__TeamSeasonID__TeamID__ConferenceID = Conf).order_by('-GameScore')
            ConferencePlayerOfTheWeek = ConfPTG[0].PlayerTeamSeasonID
            Award = PlayerTeamSeasonAward(WorldID = CurrentWorld, IsTopPlayer = True, IsConferenceAward = True, IsWeekAward = True, ConferenceID = Conf, PlayerTeamSeasonID = ConferencePlayerOfTheWeek, IsPositionGroupAward = True, PositionGroupID = PositionGroupID, WeekID = CurrentWeek)
            Award.save()
