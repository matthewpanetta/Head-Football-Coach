from ..models import Audit, League, TeamGame,Week,Phase,Position, Class, CoachPosition, PlayerTeamSeasonDepthChart, TeamSeasonWeekRank, TeamSeasonDateRank, GameStructure, Conference, PlayerTeamSeasonAward, System_PlayoffRound,PlayoffRound, NameList, User, Region, State, City,World, Headline, Playoff, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, PlayerGameStat, Coach, CoachTeamSeason
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case, When, FloatField, IntegerField, CharField, BooleanField, Value, Window, OuterRef, Subquery
from django.db.models.functions.window import Rank
from django.db.models.functions import Length, Concat, Coalesce

def GenerateHeadlines(LeagueSeasonID, WorldID):


    CurrentWorld  = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1, WorldID = CurrentWorld )


    CurrentWeek     = CurrentWorld.week_set.filter(IsCurrent=1).first()
    LastWeek        = Week.objects.filter(WorldID = WorldID).filter( WeekNumber = CurrentWeek.WeekNumber-1).first()
    print('Generate Headlines for World', WorldID)

    PhaseName = CurrentWeek.PhaseID.PhaseName
    if PhaseName in ['Regular Season', 'Conference Championships', 'Bowls']:
        print('going from preseason to reg season')

        ThisWeekHeadlineGames = CurrentWeek.game_set.all().values('GameID').annotate(
            RivalryValue = Case(
                When(TeamRivalryID__isnull = False, then=-5),
                default=0,
                output_field=IntegerField()
            ),
            RivalryName = Case(
                When(TeamRivalryID__isnull = False, then=F('TeamRivalryID__RivalryName')),
                default=Value(''),
                output_field=CharField()
            ),
            MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
            MaxNationalRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
            NationalRankValue = F('MinNationalRank') * 2 + F('MaxNationalRank') + F('RivalryValue'),
            HomeTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsHomeTeam = True)),
            AwayTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsHomeTeam = False)),
            HomeTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsHomeTeam = True)),
            AwayTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsHomeTeam = False)),
            HomeTeamRankDisplay = Case(
                When(HomeTeamRank__lte = 25, then=Concat(Value('('), F('HomeTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            AwayTeamRankDisplay = Case(
                When(AwayTeamRank__lte = 25, then=Concat(Value('('), F('AwayTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field = CharField()),
        ).order_by('NationalRankValue')[0:2]

        for HeadlineGame in ThisWeekHeadlineGames:
            if HeadlineGame['RivalryName'] is not None:
                HeadlineGame['GameHeadline'] = HeadlineGame['HomeTeamRankDisplay'] + ' ' +HeadlineGame['HomeTeamName'] + ' takes on ' + HeadlineGame['AwayTeamRankDisplay'] + ' ' +HeadlineGame['AwayTeamName']
                if len(HeadlineGame['RivalryName']) > 0:
                     HeadlineGame['GameHeadline'] += ' in the ' + HeadlineGame['RivalryName']
            else:
                HeadlineGame['GameHeadline'] = HeadlineGame['HomeTeamRankDisplay'] + ' ' +HeadlineGame['HomeTeamName'] + ' takes on ' + HeadlineGame['AwayTeamRankDisplay'] + ' ' +HeadlineGame['AwayTeamName']

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek, HeadlineImportanceValue=5, HeadlineText=HeadlineGame['GameHeadline'], HeadlineHref=HeadlineGame['GameHref'])
            H.save()
            print(HeadlineGame)


        HeadlineGame = LastWeek.game_set.all().values('GameID').annotate(
            RivalryValue = Case(
                When(TeamRivalryID__isnull = False, then=-5),
                default=0,
                output_field=IntegerField()
            ),
            RivalryName = Case(
                When(TeamRivalryID__isnull = False, then=F('TeamRivalryID__RivalryName')),
                default=Value(''),
                output_field=CharField()
            ),
            MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
            MaxNationalRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
            NationalRankValue = F('MinNationalRank') * 2 + F('MaxNationalRank') + F('RivalryValue'),
            WinningTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRankDisplay = Case(
                When(WinningTeamRank__lte = 25, then=Concat(Value('('), F('WinningTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            LosingTeamRankDisplay = Case(
                When(LosingTeamRank__lte = 25, then=Concat(Value('('), F('LosingTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field = CharField()),
        ).order_by('NationalRankValue').first()

        if HeadlineGame is not None:
            HeadlineGame['GameHeadline'] = HeadlineGame['WinningTeamRankDisplay'] + ' ' +HeadlineGame['WinningTeamName'] + ' beats ' + HeadlineGame['LosingTeamRankDisplay'] + ' ' +HeadlineGame['LosingTeamName']

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek, HeadlineImportanceValue=5, HeadlineText=HeadlineGame['GameHeadline'], HeadlineHref=HeadlineGame['GameHref'])
            H.save()
            print(HeadlineGame)

        HeadlineGame = LastWeek.game_set.all().values('GameID').annotate(
            RivalryValue = Case(
                When(TeamRivalryID__isnull = False, then=-5),
                default=0,
                output_field=IntegerField()
            ),
            RivalryName = Case(
                When(TeamRivalryID__isnull = False, then=F('TeamRivalryID__RivalryName')),
                default=Value(''),
                output_field=CharField()
            ),
            MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
            MaxNationalRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
            NationalRankValue = F('MinNationalRank') * 2 + F('MaxNationalRank') + F('RivalryValue'),
            WinningTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRankDisplay = Case(
                When(WinningTeamRank__lte = 25, then=Concat(Value('('), F('WinningTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            LosingTeamRankDisplay = Case(
                When(LosingTeamRank__lte = 25, then=Concat(Value('('), F('LosingTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field = CharField()),
            RankDifference = F('WinningTeamRank') - F('LosingTeamRank')
        ).order_by('-RankDifference', 'NationalRankValue').first()

        if HeadlineGame is not None:

            HeadlineGame['GameHeadline'] = HeadlineGame['WinningTeamRankDisplay'] + ' ' +HeadlineGame['WinningTeamName'] + ' upsets ' + HeadlineGame['LosingTeamRankDisplay'] + ' ' +HeadlineGame['LosingTeamName']

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek, HeadlineImportanceValue=5, HeadlineText=HeadlineGame['GameHeadline'], HeadlineHref=HeadlineGame['GameHref'])
            H.save()
            print(HeadlineGame)


        ThisWeekAwards = LastWeek.playerteamseasonaward_set.filter(IsTopPlayer = True).filter(IsNationalAward = False).values('ConferenceID__ConferenceAbbreviation', 'PositionGroupID__PositionGroupName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation').annotate(
            AwardHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID_id'), output_field = CharField()),
        )
        for Award in ThisWeekAwards:
            Award['AwardHeadline'] = Award['PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'] + ' ' +  Award['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PlayerLastName'] + ' is the ' + Award['ConferenceID__ConferenceAbbreviation'] + ' ' + Award['PositionGroupID__PositionGroupName'] + ' player of the week'

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = LastWeek, HeadlineImportanceValue=2, HeadlineText=Award['AwardHeadline'], HeadlineHref=Award['AwardHref'], ShowNextWeek = True)
            H.save()
            print(Award)


        ThisWeekAwards = LastWeek.playerteamseasonaward_set.filter(IsTopPlayer = True).filter(IsNationalAward = True).values('PositionGroupID__PositionGroupName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation').annotate(
            AwardHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID_id'), output_field = CharField()),
        )
        for Award in ThisWeekAwards:
            Award['AwardHeadline'] = Award['PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'] + ' ' +  Award['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PlayerLastName'] + ' is the ' + ' national ' + Award['PositionGroupID__PositionGroupName'] + ' player of the week'

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = LastWeek, HeadlineImportanceValue=3, HeadlineText=Award['AwardHeadline'], HeadlineHref=Award['AwardHref'], ShowNextWeek = True)
            H.save()
            print(Award)

    elif PhaseName == 'Season Recap':

        HeadlineGames = LastWeek.game_set.filter(BowlID__BowlPrestige__gte = 7).values('GameID', 'BowlID__BowlName', 'BowlID__IsNationalChampionship', 'BowlID__BowlPrestige').annotate(
            MinNationalRank = Min('teamgame__TeamSeasonWeekRankID__NationalRank'),
            MaxNationalRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank'),
            NationalRankValue = F('MinNationalRank') * 2 + F('MaxNationalRank'),
            WinningTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamName = Max('teamgame__TeamSeasonID__TeamID__TeamName', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = True)),
            LosingTeamRank = Max('teamgame__TeamSeasonWeekRankID__NationalRank', filter=Q(teamgame__IsWinningTeam = False)),
            WinningTeamRankDisplay = Case(
                When(WinningTeamRank__lte = 25, then=Concat(Value('('), F('WinningTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            LosingTeamRankDisplay = Case(
                When(LosingTeamRank__lte = 25, then=Concat(Value('('), F('LosingTeamRank'), Value(')'), output_field=CharField())),
                default = Value(''),
                output_field=CharField()
            ),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field = CharField()),
            GameHeadline = Case(
                When(BowlID__IsNationalChampionship = True, then=Concat(F('WinningTeamName'), Value(' wins the National Championship!!'), output_field = CharField())),
                default=Concat(F('WinningTeamName'), Value(' wins the '), F('BowlID__BowlName'), output_field = CharField()),
                output_field=CharField()
            ),
            HeadlineImportanceValue = F('BowlID__BowlPrestige')
        ).order_by('NationalRankValue')

        for HeadlineGame in HeadlineGames:
            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek, HeadlineImportanceValue= 5, HeadlineText=HeadlineGame['GameHeadline'], HeadlineHref=HeadlineGame['GameHref'])
            H.save()
            print(HeadlineGame)


        PlayerOfTheYearAward = PlayerTeamSeasonAward.objects.filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(IsTopPlayer = True).filter(IsNationalAward = True).filter(IsSeasonAward = True).values('PositionGroupID__PositionGroupName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__TeamName', 'PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation').annotate(
            AwardHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID_id'), output_field = CharField()),
        ).first()
        for Award in [PlayerOfTheYearAward]:
            Award['AwardHeadline'] = Award['PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'] + ' ' +  Award['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + Award['PlayerTeamSeasonID__PlayerID__PlayerLastName'] + ' is the national player of the year'

            H = Headline(WorldID = CurrentWorld, LeagueSeasonID = CurrentSeason, WeekID = CurrentWeek, HeadlineImportanceValue=3, HeadlineText=Award['AwardHeadline'], HeadlineHref=Award['AwardHref'], ShowNextWeek = False)
            H.save()
            print(Award)
