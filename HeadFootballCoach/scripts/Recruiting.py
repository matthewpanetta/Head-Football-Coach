from ..models import Headline,World, Playoff,Week, TeamSeasonPosition, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, Driver, PlayerGameStat, Coach, CoachTeamSeason
from random import uniform, randint
import numpy
from ..utilities import WeightedProbabilityChoice, Min, DistanceBetweenCities, GetValuesOfSingleObject, NormalBounds
from math import sin, cos, sqrt, atan2, radians, log
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case, When,  ExpressionWrapper, FloatField, IntegerField, DecimalField, PositiveSmallIntegerField, CharField, BooleanField, Value, Window, OuterRef, Subquery
from django.db.models.functions.window import Rank, RowNumber
from django.db.models.functions import Length, Concat, Coalesce
from django_cte import CTEManager, With
from django.db import connection, reset_queries


def RandomRecruitPreference(RecruitPreferenceBase):

    d = len(RecruitPreferenceBase)
    OrderedPreferences  =[]
    PickedPreferences = []

    PreferenceCount = 1
    while len([u for u in RecruitPreferenceBase if RecruitPreferenceBase[u]['AttributeName'] not in PickedPreferences]) > 0:
        Base = [(RecruitPreferenceBase[u],  RecruitPreferenceBase[u]['RecruitInterestWeight']) for u in RecruitPreferenceBase if RecruitPreferenceBase[u]['AttributeName'] not in PickedPreferences]
        c = WeightedProbabilityChoice(Base, None)
        PickedPreferences.append(c['AttributeName'])
        OrderedPreferences.append(c)

    return OrderedPreferences


def WeeklyRecruiting(WorldID):

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    RecruitsPerWeek = 6

    for T in Team.objects.all():
        #print('Recruiting for ', T)
        for RTS in sorted([u for u in RecruitTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = T) if u.PlayerID.RecruitSigned == False], key=lambda t: t.MatchRating * t.PlayerID.OverallRating, reverse=True)[:RecruitsPerWeek]:
            TS = RTS.TeamSeasonID
            #print(T, 'is recruiting', RTS)
            r = uniform(.7,1.3)
            RTS.InterestLevel += RTS.MatchRating * r * (RTS.PlayerID.RecruitingSpeed / 100.0)

            if RTS.InterestLevel > 2000 and TS.ScholarshipsToOffer > 0:
                RTS.OfferMade = True

            if RTS.OfferMade and RTS.InterestLevel > 4000 and TS.ScholarshipsToOffer > 0:
                T.ScholarshipsToOffer -= 1
                T.save()
                RTS.Signed = True
                RTS.PlayerID.RecruitSigned = True

            RTS.save()

    return None


def WeeklyRecruiting(WorldID):

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    RecruitsPerWeek = 6

    for T in Team.objects.all():
        #print('Recruiting for ', T)
        for RTS in sorted([u for u in RecruitTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = T) if u.PlayerID.RecruitSigned == False], key=lambda t: t.MatchRating * t.PlayerID.OverallRating, reverse=True)[:RecruitsPerWeek]:
            TS = RTS.TeamSeasonID
            #print(T, 'is recruiting', RTS)
            r = uniform(.7,1.3)
            RTS.InterestLevel += RTS.MatchRating * r * (RTS.PlayerID.RecruitingSpeed / 100.0)

            if RTS.InterestLevel > 2000 and TS.ScholarshipsToOffer > 0:
                RTS.OfferMade = True

            if RTS.OfferMade and RTS.InterestLevel > 4000 and TS.ScholarshipsToOffer > 0:
                T.ScholarshipsToOffer -= 1
                T.save()
                RTS.Signed = True
                RTS.PlayerID.RecruitSigned = True

            RTS.save()

    return None

def CreateRecruitTeamSeason(WorldID, T, Recruit):

    RecruitSchoolDistanceMap = {
        'Home Town':     {'LowerBound': 0, 'UpperBound': 40, 'PointValue': 200},
        'Local':         {'LowerBound': 41, 'UpperBound': 150, 'PointValue': 65},
        'Regional':      {'LowerBound': 151, 'UpperBound': 500, 'PointValue': 40},
        'National':      {'LowerBound': 501, 'UpperBound': 4000, 'PointValue': 20},
        'International': {'LowerBound': 4001, 'UpperBound': 10000, 'PointValue': 5},
    }

    PreferenceRatingMap = {
        'ChampionshipContenderValue': 'ChampionshipContenderRating',
        'TeamPrestigeValue':        'TeamPrestige',
        'CloseToHomeValue':   'CloseToHomeValue',
        'PlayingTimeValue':   'PlayingTimeValue',
        'CoachStabilityValue': 'CoachStabilityRating',
        'CoachStyleValue':     'CoachStyleValue',
        'FacilitiesValue':     'FacilitiesRating',
        'ProPotentialValue': 'ProPotentialRating',
        'CampusLifestyleValue': 'CampusLifestyleRating',
        'AcademicPrestigeValue': 'AcademicPrestigeRating',
        'TelevisionExposureValue':'TelevisionExposureRating'
    }
    RecruitTopPreferences = FindRecruitTopPreferences(Recruit)
    RecruitTeamPrestigeInterestModifier = 15
    RecruitTeamDict = {'TeamList': []}
    CurrentWorld = World.objects.get(WorldID = WorldID)

    RecruitDistance = DistanceBetweenCities(Recruit.CityID, T.CityID)
    RecruitDistanceInterestValue = 0
    for Locality in RecruitSchoolDistanceMap:
        if RecruitDistance >= RecruitSchoolDistanceMap[Locality]['LowerBound'] and RecruitDistance <= RecruitSchoolDistanceMap[Locality]['UpperBound']:
            RecruitDistanceInterestValue = RecruitSchoolDistanceMap[Locality]['PointValue']


    #RecruitTeamDict['TeamList'].append(
    TeamRecruitingValues = {'TeamObject': T
           , 'MatchValue': None
           , 'RecruitDistanceMatchValue': RecruitDistanceInterestValue
           , 'RecruitSpecificValues': {
                     RecruitTopPreferences[0][1]: getattr(T, PreferenceRatingMap[RecruitTopPreferences[0][1]]) * 3
                   , RecruitTopPreferences[1][1]: getattr(T, PreferenceRatingMap[RecruitTopPreferences[1][1]]) * 2
                   , RecruitTopPreferences[2][1]: getattr(T, PreferenceRatingMap[RecruitTopPreferences[2][1]]) }
           , 'TeamPrestigeValue': RecruitTeamPrestigeInterestModifier * getattr(T,'TeamPrestige')}


    MatchValue =  TeamRecruitingValues['TeamPrestigeValue']
    MatchValue += TeamRecruitingValues['RecruitDistanceMatchValue']
    for Pref in TeamRecruitingValues['RecruitSpecificValues']:
        MatchValue += TeamRecruitingValues['RecruitSpecificValues'][Pref]

    TeamRecruitingValues['MatchValue'] = MatchValue

    RecruitTeamDict['TeamList'].append(TeamRecruitingValues)

    for T in sorted(RecruitTeamDict['TeamList'], key = lambda k: k['MatchValue'] , reverse=True)[:25]:
        RTS =  RecruitTeamSeason(WorldID=CurrentWorld, TeamSeasonID = T['TeamObject'].CurrentTeamSeason, PlayerID = Recruit)
        RTS.MatchRating = T['MatchValue'] #
        RTS.Scouted_Overall = NormalBounds(Recruit.OverallRating, 1.5, 0,99)
        RTS.save()


def FindNewRecruitsForTeam(WorldID, TS, NumPlayers):
    CurrentWorld = World.objects.get(WorldID = WorldID)

    PlayerList = Player.objects.filter(WorldID = CurrentWorld).filter(IsRecruit=True).filter(RecruitSigned = False).order_by('?')[:NumPlayers]
    for Recruit in PlayerList:
        CreateRecruitTeamSeason(WorldID, TS.TeamID, Recruit)

def FindRecruitTopPreferences(Recruit):

    RecruitingFields = ['ChampionshipContenderValue','TeamPrestigeValue','CloseToHomeValue','PlayingTimeValue','CoachStabilityValue','CoachStyleValue','FacilitiesValue','ProPotentialValue','CampusLifestyleValue','AcademicPrestigeValue','TelevisionExposureValue']
    RecruitingValues = GetValuesOfSingleObject(Recruit, RecruitingFields)

    RecruitTopPreferences = []
    for V in RecruitingValues:
        if RecruitingValues[V] <=3:
            RecruitTopPreferences.append((RecruitingValues[V], V))
    RecruitTopPreferences = sorted(RecruitTopPreferences, key=lambda k: k[0])

    return RecruitTopPreferences

def FindNewTeamsForRecruit(WorldID, Recruit, RecruitTopPreferences=None):

    return None


def PrepareForSigningDay(CurrentSeason,WorldID):

    print('\n\nIts Signing Day!!!')
    TeamSeasonList = CurrentSeason.teamseason_set.filter(TeamID__isnull = False).values(
        'TeamSeasonID', 'ScholarshipsToOffer'
    ).annotate(
        ScholarshipsAvailable = F('ScholarshipsToOffer'),
    )
    TeamSeasonDict = {}
    for TS in TeamSeasonList:
        TeamSeasonDict[TS['TeamSeasonID']] = TS


    print('TeamSeasonDict', TeamSeasonDict)


    AllRecruitsAvailable = RecruitTeamSeason.objects.filter(WorldID_id=WorldID).filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False).annotate(
        InterestLevelAndActive = Case(
            When(IsActivelyRecruiting = True, then =F('InterestLevel')),
            default = ExpressionWrapper(F('InterestLevel') / 10.0, output_field=DecimalField()),
            output_field=DecimalField()
        ),
        InterestRank = F('RecruitingTeamRank'),
        NationalRank = F('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank')
    ).order_by('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank', 'InterestRank')

    RTSDict = {}
    for RTS in AllRecruitsAvailable:
        if RTS.PlayerTeamSeasonID not in RTSDict:
            RTSDict[RTS.PlayerTeamSeasonID] = {'NationalRank': RTS.NationalRank, 'RTSList': []}
        RTSDict[RTS.PlayerTeamSeasonID]['RTSList'].append(RTS)

    RecruitTeamSeasons_ToSave = []
    PlayersToSave = []
    TeamSeasons_ToSave = []
    for PlayerTeamSeasonID in sorted(RTSDict, key=lambda k: RTSDict[k]['NationalRank']):
        RTS = RTSDict[PlayerTeamSeasonID]
        AvailableRTS = [u for u in RTS['RTSList'] if TeamSeasonDict[u.TeamSeasonID.TeamSeasonID]['ScholarshipsAvailable'] > 0]
        if len(AvailableRTS) > 0:

            AvailableRTS[0].Signed = True
            AvailableRTS[0].PlayerTeamSeasonID.PlayerID.RecruitSigned = True
            TeamSeasonDict[AvailableRTS[0].TeamSeasonID.TeamSeasonID]['ScholarshipsAvailable'] -= 1

            RecruitTeamSeasons_ToSave.append(AvailableRTS[0])
            PlayersToSave.append(AvailableRTS[0].PlayerTeamSeasonID.PlayerID)
            TeamSeasons_ToSave.append(AvailableRTS[0].TeamSeasonID)

            print('Signing', AvailableRTS[0])

    RecruitTeamSeason.objects.bulk_update(RecruitTeamSeasons_ToSave, ['Signed'])
    Player.objects.bulk_update(PlayersToSave, ['RecruitSigned'])

    TeamSeasonList = TeamSeason.objects.filter(LeagueSeasonID=CurrentSeason).filter(TeamID__isnull = False).annotate(
        RecruitsSigned5 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=5))),
        RecruitsSigned4 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=4))),
        RecruitsSigned3 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=3))),
        RecruitsSigned2 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=2))),
        RecruitsSigned1 = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True)  & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitingStars=1))),
        RecruitsSigned = Count('recruitteamseason__PlayerTeamSeasonID__PlayerID', filter=(Q(recruitteamseason__Signed=True) )),

        RecruitingValue = (5 * F('RecruitsSigned5')) + (4 * F('RecruitsSigned4')) + (3 * F('RecruitsSigned3')) + (2 * F('RecruitsSigned2')) + (1 * F('RecruitsSigned1')) ,
        RecruitingRank = Window(
            expression=RowNumber(),
            order_by=F("RecruitingValue").desc(),
        )
    )

    TeamSeasons_ToSave = []
    for TS in TeamSeasonList:
        TS.RecruitingClassRank = TS.RecruitingRank
        TeamSeasons_ToSave.append(TS)
    TeamSeason.objects.bulk_update(TeamSeasons_ToSave, ['RecruitingClassRank'])



def FakeWeeklyRecruiting(WorldID, CurrentWeek):
    print('Doing fake recruiting!!')
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)

    CurrentWeekNumber = CurrentWeek.WeekNumber

    InterestModifier = CurrentWeek.RecruitingWeekModifier


    PlayersThatNeedMoreTeams = []

    RecruitList = Player.objects.filter(WorldID= CurrentWorld).filter(IsRecruit=True).filter(RecruitSigned=False)

    TeamSeasonList = CurrentSeason.teamseason_set.filter(teamseasonweekrank__IsCurrent = True).values('TeamSeasonID', 'TeamID', 'ScholarshipsToOffer', 'TeamID__TeamName').annotate(
        TeamPrestige = Max('teamseasoninforating__TeamRating', filter=Q(teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige')),
        NumberOfRecruits_FullSell = Value(6, output_field=IntegerField()),
        NumberOfRecruits_HalfSell = Value(4, output_field=IntegerField()),
        NumberOfRecruits_LightSell = Value(2, output_field=IntegerField()),
        NumberOfRecruits_OnBoard = ExpressionWrapper(Value(6, output_field=IntegerField()) + F('TeamPrestige'), output_field=IntegerField()),
        ActiveRecruitCount = Value(30, output_field=IntegerField()),#ExpressionWrapper(F('NumberOfRecruits_FullSell') + F('NumberOfRecruits_HalfSell') + F('NumberOfRecruits_LightSell') + F('NumberOfRecruits_OnBoard'), output_field=IntegerField()),
        RecruitsActivelyRecruiting = Sum(Case(
            When((Q(recruitteamseason__IsActivelyRecruiting = True) & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitSigned = False)), then=1),
            default=(Value(0)),
            output_field=IntegerField()
        )),
        RecruitsToAddToBoard = ExpressionWrapper(F('ActiveRecruitCount') - F('RecruitsActivelyRecruiting'), output_field=IntegerField()),
        ScholarshipsAvailable = F('ScholarshipsToOffer'),
    ).order_by('-TeamPrestige', 'teamseasonweekrank__NationalRank')


    TeamPrestigeModified = .5
    TeamInterestRankModifier = 1
    RTSToSave = []
    TSDict = {}
    print('Teams doing recruiting!')

    AllRecruitsAvailable = RecruitTeamSeason.objects.filter(WorldID_id=WorldID).filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False).annotate(
        CommitsNeeded = Subquery(TeamSeasonPosition.objects.filter(TeamSeasonID = OuterRef('TeamSeasonID')).filter(PositionID = OuterRef('PlayerTeamSeasonID__PlayerID__PositionID')).annotate(
            PlayersNeeded = F('MinimumPlayerCount') - F('FreshmanPlayerCount') - F('SophomorePlayerCount') - F('JuniorPlayerCount') - F('CommitPlayerCount'),
        ).values('PlayersNeeded')),
        InterestLevelAndActive = Case(
            When(IsActivelyRecruiting = True, then =F('InterestLevel')),
            default = ExpressionWrapper(F('InterestLevel') / 10.0, output_field=DecimalField()),
            output_field=DecimalField()
        ),
        RecruitingPointsNeeded = F('PlayerTeamSeasonID__PlayerID__RecruitingPointsNeeded'),
        #MaxInterestLevel = Max(F('PlayerID__recruitteamseason__InterestLevel')),
        MaxInterestLevel = F('InterestLevel'),
        RecruitingPointsNeededPercent = (F('RecruitingPointsNeeded') / F('MaxInterestLevel')),
        InterestRank = F('RecruitingTeamRank'),
        InterestRankPriorityModifier = Case(
            When(InterestRank__gt = 20-CurrentWeekNumber, then=.75),
            When(InterestRank__gt = 16-CurrentWeekNumber, then=.9),
            When(InterestRank__lte = 3, then=1.1),
            default=Value(1.0),
            output_field=DecimalField()
        ),
        CommitsNeededModifier = Case(
            When(CommitsNeeded__gte = 2, then=Value(1.4)),
            When(CommitsNeeded = 1, then=Value(1.2)),
            When(CommitsNeeded = 0, then=Value(1.0)),
            When(CommitsNeeded = -1, then=Value(.9)),
            When(CommitsNeeded = -2, then=Value(.7)),
            When(CommitsNeeded__lt = -2, then=Value(.4)),
            default=Value(1.0),
            output_field=FloatField()
        ),
        RecruitingPriority = ExpressionWrapper(F('Scouted_Overall') * F('InterestRankPriorityModifier') * F('CommitsNeededModifier'), output_field=DecimalField())
    ).order_by('-RecruitingPriority')


    for TS in TeamSeasonList:
        print(TS)
        TSDict[TS['TeamSeasonID']] = TS
        TSDict[TS['TeamSeasonID']]['RecruitsActivelyRecruiting'] = []
        TSDict[TS['TeamSeasonID']]['RecruitsNotActivelyRecruiting'] = []

        TSDict[TS['TeamSeasonID']]['AllRecruitsAvailable'] = AllRecruitsAvailable.filter(TeamSeasonID_id = TS['TeamSeasonID'])[:35]

        count = 1
        for RTS in TSDict[TS['TeamSeasonID']]['AllRecruitsAvailable']:
            count +=1
            if RTS.IsActivelyRecruiting:
                TSDict[TS['TeamSeasonID']]['RecruitsActivelyRecruiting'].append(RTS)
            else:
                TSDict[TS['TeamSeasonID']]['RecruitsNotActivelyRecruiting'].append(RTS)


    for TS in TeamSeasonList:
        RecruitsActivelyRecruiting = TSDict[TS['TeamSeasonID']]['RecruitsActivelyRecruiting']
        RecruitsNotActivelyRecruiting = TSDict[TS['TeamSeasonID']]['RecruitsNotActivelyRecruiting']


        for u in range(0, TS['ActiveRecruitCount'] - len(RecruitsActivelyRecruiting)):
            if u < len(RecruitsNotActivelyRecruiting):
                RTS = RecruitsNotActivelyRecruiting[u]
                RTS.IsActivelyRecruiting = True

                RecruitsActivelyRecruiting.append(RTS)

        counter = 0
        for counter in range(0, len(RecruitsActivelyRecruiting)):
            RTS = RecruitsActivelyRecruiting[counter]
            ThisWeekInterestIncrease = 0
            if counter < TS['NumberOfRecruits_FullSell']:
                ThisWeekInterestIncrease =  RTS.Preference1MatchRating + RTS.Preference2MatchRating + RTS.Preference3MatchRating + (TeamPrestigeModified * RTS.TeamPrestigeRating) + RTS.DistanceMatchRating
            elif counter < TS['NumberOfRecruits_FullSell'] + TS['NumberOfRecruits_HalfSell']:
                ThisWeekInterestIncrease =  RTS.Preference1MatchRating + RTS.Preference2MatchRating + (TeamPrestigeModified * RTS.TeamPrestigeRating) + RTS.DistanceMatchRating
            elif counter < TS['NumberOfRecruits_FullSell'] + TS['NumberOfRecruits_HalfSell'] + TS['NumberOfRecruits_LightSell']:
                ThisWeekInterestIncrease =  RTS.Preference1MatchRating + (TeamPrestigeModified * RTS.TeamPrestigeRating) + RTS.DistanceMatchRating
            elif counter < TS['NumberOfRecruits_FullSell'] + TS['NumberOfRecruits_HalfSell'] + TS['NumberOfRecruits_LightSell'] + TS['NumberOfRecruits_OnBoard']:
                ThisWeekInterestIncrease =  (TeamPrestigeModified * RTS.TeamPrestigeRating) + RTS.DistanceMatchRating

            else:
                RTS.IsActivelyRecruiting = False

            ThisWeekInterestIncrease *= InterestModifier
            ThisWeekInterestIncrease = int(ThisWeekInterestIncrease / 5.0) * 5
            RTS.InterestLevel += ThisWeekInterestIncrease
            RTSToSave.append(RTS)

    RecruitTeamSeason.objects.bulk_update(RTSToSave, ['InterestLevel', 'IsActivelyRecruiting'])
    RTS = RecruitTeamSeason.objects.all().annotate(
    InterestLevelAdjusted = Case(
        When(IsActivelyRecruiting=False, then=F('InterestLevel') / 10.0),
        default=F('InterestLevel'),
        output_field=IntegerField()
    ),
    RecruitingTeamRank_new = Window(
        expression=RowNumber(),
        partition_by=F("PlayerTeamSeasonID__PlayerID"),
        order_by=F("InterestLevelAdjusted").desc(),
    ))
    for R in RTS:
        R.RecruitingTeamRank = R.RecruitingTeamRank_new
    RecruitTeamSeason.objects.bulk_update(RTS,['RecruitingTeamRank'])

    US = Player.objects.filter(RecruitSigned = False).update(RecruitingPointsNeeded=F('RecruitingPointsNeeded') - Value(100) + Coalesce( Subquery(Player.objects.filter(PlayerID = OuterRef('PlayerID')).filter(playerteamseason__recruitteamseason__IsActivelyRecruiting = True).annotate(count=10*Count('playerteamseason__recruitteamseason__RecruitTeamSeasonID')).values('count')),0))

    PlayersReadyToSign = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False).filter(InterestLevel__gte = F('PlayerTeamSeasonID__PlayerID__RecruitingPointsNeeded')).prefetch_related('TeamSeasonID__teamseasonposition_set').annotate(
        TeamRank = Window(
            expression=RowNumber(),
            partition_by=F("PlayerTeamSeasonID__PlayerID"),
            order_by=F("InterestLevel").desc(),
        )
    ).order_by('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank')


    if PlayersReadyToSign.count() > 0:

        RTSToSave = []
        TSPToSave = []
        PlayersToSave = []
        for RTS in [u for u in PlayersReadyToSign if u.TeamRank == 1]:
            RTS.Signed = True
            RTS.PlayerTeamSeasonID.PlayerID.RecruitSigned = True

            TSDict[RTS.TeamSeasonID.TeamSeasonID]['ScholarshipsAvailable'] -= 1


            if TSDict[RTS.TeamSeasonID.TeamSeasonID]['ScholarshipsAvailable'] >= 0:
                RTSToSave.append(RTS)
                PlayersToSave.append(RTS.PlayerTeamSeasonID.PlayerID)

                TSP = RTS.TeamSeasonID.teamseasonposition_set.filter(PositionID = RTS.PlayerTeamSeasonID.PlayerID.PositionID).update(
                    CommitPlayerCount = F('CommitPlayerCount') + 1
                )


        RecruitTeamSeason.objects.bulk_update(RTSToSave, ['Signed'])
        Player.objects.bulk_update(PlayersToSave, ['RecruitSigned'])

        reset_queries()
        ScholarshipsRemainingList = TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason).filter(TeamID__isnull = False).select_related('LeagueSeasonID__LeagueID').prefetch_related('playerteamseason_set__ClassID').prefetch_related('recruitteamseason_set')

        for TS in ScholarshipsRemainingList:
            PlayersSigned = TS.recruitteamseason_set.filter(Signed = True).count()
            PlayersPerTeam = TS.LeagueSeasonID.LeagueID.MaxSignablePlayersPerTeam
            TotalPlayers = TS.playerteamseason_set.all().count()
            SeniorCount = TS.playerteamseason_set.filter(ClassID__ClassAbbreviation = 'SR').count()
            TS.ScholarshipsToOffer = PlayersPerTeam - TotalPlayers +SeniorCount - PlayersSigned

        TeamSeason.objects.bulk_update(ScholarshipsRemainingList, ['ScholarshipsToOffer'])
