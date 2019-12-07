from ..models import PlayerTeamSeasonAward, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat


def NationalAwards(WorldID, CurrentSeason):

    if CurrentSeason.AwardsCreated:
        return None

    else:
        AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason)
        AllFreshmen = AllPlayers.filter(PlayerClass = 'Freshman')

        PTS_PERRanked = sorted([u for u in AllPlayers if u.MPG > 20], key=lambda t: t.WinShares, reverse=True)

        PlayerOfTheYear = PTS_PERRanked[0]

        AwardsToCreate = []

        PlayerAward = PlayerTeamSeasonAward(WorldID = WorldID, PlayerTeamSeasonID = PlayerOfTheYear, IsTopPlayer=True, IsNationalAward=True, IsSeasonAward=True)
        #PlayerAward.save()
        AwardsToCreate.append(PlayerAward)
        print(PlayerOfTheYear, 'is the player of the year!')

        for PTS in PTS_PERRanked[0:5]:
            PlayerAward = PlayerTeamSeasonAward(WorldID = WorldID, PlayerTeamSeasonID = PTS, IsFirstTeam=True, IsNationalAward=True, IsSeasonAward=True)
            #PlayerAward.save()
            AwardsToCreate.append(PlayerAward)
            print(PTS, 'is first team all NCAA')
        for PTS in PTS_PERRanked[5:10]:
            PlayerAward = PlayerTeamSeasonAward(WorldID = WorldID, PlayerTeamSeasonID = PTS, IsSecondTeam=True, IsNationalAward=True, IsSeasonAward=True)
            #PlayerAward.save()
            AwardsToCreate.append(PlayerAward)
            print(PTS, 'is second team all NCAA')

        PTS_PERRankedFreshman = sorted([u for u in AllFreshmen if u.MPG > 20], key=lambda t: t.WinShares, reverse=True)
        for PTS in PTS_PERRankedFreshman[0:5]:
            PlayerAward = PlayerTeamSeasonAward(WorldID = WorldID, PlayerTeamSeasonID = PTS, IsFreshmanTeam=True, IsNationalAward=True, IsSeasonAward=True)
            #PlayerAward.save()
            AwardsToCreate.append(PlayerAward)
            print(PTS, 'is first team all NCAA Freshman')

        PlayerTeamSeasonAward.objects.bulk_create(AwardsToCreate)

        CurrentSeason.AwardsCreated = True
        CurrentSeason.save()

    return None
