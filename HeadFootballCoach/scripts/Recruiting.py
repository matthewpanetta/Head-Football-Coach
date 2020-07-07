from ..models import Headline,World, Playoff,Week,Audit, RecruitTeamSeasonInterest, TeamSeasonPosition, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, Driver, PlayerGameStat, Coach, CoachTeamSeason
from random import uniform, randint
import numpy
import time
from ..utilities import WeightedProbabilityChoice, Min, Min_Int, DistanceBetweenCities, GetValuesOfSingleObject, NormalBounds, NormalTrunc
from math import sin, cos, sqrt, atan2, radians, log
from django.db.models import Max, Min, Avg, Count, Func, F, Q, Sum, Case, When,  ExpressionWrapper, FloatField, IntegerField, DecimalField, PositiveSmallIntegerField, CharField, BooleanField, Value, Window, OuterRef, Subquery
from django.db.models.functions.window import Rank, RowNumber
from django.db.models.functions import Length, Concat, Coalesce
from django_cte import CTEManager, With
from django.db import connection, reset_queries

class Round(Func):
  function = 'ROUND'
  arity = 2

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


def ScoutPlayer(RTS, TSP = None):
    if RTS.ScoutingFuzz >= 2:
        RTS.ScoutingFuzz = RTS.ScoutingFuzz - 2
    else:
        RTS.ScoutingFuzz = 0

    RTS_Rating_Fields = [field.name for field in RecruitTeamSeason._meta.get_fields() if 'Scouted_' in field.name and '_Rating' in field.name and 'Base' not in field.name]

    OverallSum = 0
    WeightSum = 0
    for RatingField in RTS_Rating_Fields:
        RawRatingField = RatingField.replace('Scouted_', '')
        WeightRatingField = RawRatingField +'_Weight'
        BaseVal = getattr(RTS.PlayerTeamSeasonID.playerteamseasonskill, RawRatingField)
        NewVal = NormalTrunc(BaseVal, RTS.ScoutingFuzz, 0,99)
        setattr(RTS, RatingField, NewVal)

        OverallSum+= float(NewVal) * float(getattr(TSP, WeightRatingField))
        WeightSum += float(getattr(TSP, WeightRatingField))

    OverallSum = int(OverallSum * 1.0 / WeightSum)
    RTS.Scouted_Overall = OverallSum


    return RTS


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



def FakeWeeklyRecruiting_New(WorldID, CurrentWeek):


    RecruitingConcentrationMap  = {
        -3: [2] * 30,
        -2: [3] * 20,
        -1: [6] * 2 + [4] * 12,
         0: [6] * 4  + [5] * 4+ [4] * 4,
         1: [6] * 6 + [5] * 2 + [4] * 3,
         2: [6] * 8 + [4] * 3,
         3: [6] * 10,
    }

    DoAudit = True
    if DoAudit:
        start = time.time()
        reset_queries()

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)

    CurrentWeekNumber = CurrentWeek.WeekNumber

    InterestModifier = CurrentWeek.RecruitingWeekModifier


    PlayersThatNeedMoreTeams = []

    TeamSeasonList = CurrentSeason.teamseason_set.filter(teamseasonweekrank__IsCurrent = True).select_related('TeamID').annotate(
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

        CoachRecruitingConcentration = Max('coachteamseason__CoachID__RecruitingConcentration', filter=Q(coachteamseason__CoachPositionID__CoachPositionAbbreviation = 'HC'))
    ).order_by('-TeamPrestige', 'teamseasonweekrank__NationalRank')


    TeamPrestigeModified = .5
    TeamInterestRankModifier = 1
    RTSToSave = []
    RTS_InterestToSave = []
    TSDict = {}

    print('Starting recruiting', len(connection.queries))

    AllRecruitsAvailable = RecruitTeamSeason.objects.filter(WorldID_id=WorldID).filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False).select_related('PlayerTeamSeasonID', 'PlayerTeamSeasonID__playerteamseasonskill', 'PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__PlayerID__PositionID', 'TeamSeasonID').annotate(
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
        RecruitingPointsNeededPercent = ExpressionWrapper(F('RecruitingPointsNeeded') / F('MaxInterestLevel'), output_field=IntegerField()),
        InterestRank = F('RecruitingTeamRank'),
        InterestRankPriorityModifier = Case(
            When(InterestRank__gt = 20-CurrentWeekNumber, then=.75),
            When(InterestRank__gt = 16-CurrentWeekNumber, then=.9),
            When(InterestRank__lte = 3, then=1.1),
            default=Value(1.0),
            output_field=DecimalField()
        ),
        ActivelyRecruitingModifier = Case(
            When(IsActivelyRecruiting = True, then=1.15),
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
        RecruitingPriority = ExpressionWrapper(F('Scouted_Overall') * F('InterestRankPriorityModifier') * F('CommitsNeededModifier') * F('ActivelyRecruitingModifier'), output_field=DecimalField())
    ).order_by('-RecruitingPriority')

    RTS_TeamSeasonDict = {}
    for RTS in AllRecruitsAvailable:
        if RTS.TeamSeasonID not in RTS_TeamSeasonDict:
            RTS_TeamSeasonDict[RTS.TeamSeasonID] = []

        RTS_TeamSeasonDict[RTS.TeamSeasonID].append(RTS)

    TeamSeasonPositionList = TeamSeasonPosition.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).select_related('PositionID', 'TeamSeasonID')
    TeamSeasonPositionDict = {}
    for TS in TeamSeasonList:
        TeamSeasonPositionDict[TS] = {}
    for TSP in TeamSeasonPositionList:
        TeamSeasonPositionDict[TSP.TeamSeasonID][TSP.PositionID] = TSP

    RTS_TeamInterestDict = {}
    RTS_TeamInterestList = RecruitTeamSeasonInterest.objects.filter(RecruitTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason).annotate(
        PitchValue =  Round(((12 - F('PlayerRecruitingInterestID__PitchRecruitInterestRank')) ** .5) * ((F('TeamRating') / 10.0) ** 2), -1),
        KnownPitchValue =  Case(
            When(PitchRecruitInterestRank_IsKnown = True, then=F('PitchValue')),
            default = Value(0),
            output_field=FloatField()
        )
    ).select_related('RecruitTeamSeasonID').order_by('-KnownPitchValue', '-TeamRating')

    for RTSI in RTS_TeamInterestList:
        if RTSI.RecruitTeamSeasonID not in RTS_TeamInterestDict:
            RTS_TeamInterestDict[RTSI.RecruitTeamSeasonID] = []
        RTS_TeamInterestDict[RTSI.RecruitTeamSeasonID].append(RTSI)

    print('Starting Team recruiting', len(connection.queries))
    for TS in TeamSeasonList:
        RecruitsActivelyRecruiting_QS = RTS_TeamSeasonDict[TS]
        RecruitsActivelyRecruiting = []
        TSPosCounter = {}
        RecruitsActivelyRecruitingCounter = 0
        RecruitingTimeAllocation = RecruitingConcentrationMap[TS.CoachRecruitingConcentration]

        TotalMinutesToTalk = TS.MaxRecruitingPointsPerPlayerPerWeek
        if TS.TeamID.IsUserTeam:
            TotalMinutesToTalk = CurrentWeek.UserRecruitingPointsLeftThisWeek

        if TS.ScholarshipsToOffer <= 0:
            continue

        for RTS in RecruitsActivelyRecruiting_QS:
            if RTS.PlayerTeamSeasonID.PlayerID.PositionID not in TSPosCounter:
                TSPosCounter[RTS.PlayerTeamSeasonID.PlayerID.PositionID] = 0

            if TSPosCounter[RTS.PlayerTeamSeasonID.PlayerID.PositionID] < 2 and RecruitsActivelyRecruitingCounter < len(RecruitingTimeAllocation):
                RecruitsActivelyRecruitingCounter +=1
                TSPosCounter[RTS.PlayerTeamSeasonID.PlayerID.PositionID] +=1
                RecruitsActivelyRecruiting.append(RTS)

        counter = 0
        for counter in range(0, len(RecruitsActivelyRecruiting)):
            RTS = RecruitsActivelyRecruiting[counter]
            RTS_Interests = RTS_TeamInterestDict[RTS][:6]
            UnknownInterests = [RTS for RTS in RTS_Interests if RTS.PitchRecruitInterestRank_IsKnown == False]

            ThisWeekInterestIncrease = 0
            MinutesToTalk = RecruitingTimeAllocation[counter]
            PitchCount = 0
            ThisWeekInterestIncrease = 0

            if TS.TeamID.IsUserTeam:
                MinutesToTalk = Min_Int(MinutesToTalk,RTS.UserRecruitingPointsLeftThisWeek)


            while MinutesToTalk > 0 and TotalMinutesToTalk>0:
                ActionTaken = False

                if RTS.ScoutingFuzz > 0:

                    RTS = ScoutPlayer(RTS, TSP = TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID])

                elif not RTS.OfferMade:
                    RTS.OfferMade = True
                    ActionTaken = True

                elif len(UnknownInterests) > 0:
                    InterestToGaugeInterest = UnknownInterests.pop(0)
                    InterestToGaugeInterest.PitchRecruitInterestRank_IsKnown = True
                    RTS_InterestToSave.append(InterestToGaugeInterest)

                else:
                    ThisWeekInterestIncrease += RTS_Interests[PitchCount].PitchValue
                    PitchCount+=1

                RTS.IsActivelyRecruiting = True
                MinutesToTalk -= 1
                TotalMinutesToTalk -= 1


            ThisWeekInterestIncrease *= InterestModifier
            ThisWeekInterestIncrease = int(ThisWeekInterestIncrease / 5.0) * 5
            RTS.InterestLevel += ThisWeekInterestIncrease
            RTSToSave.append(RTS)

    print('Starting to save RTS', len(connection.queries))

    FieldsToSave = ['VisitWeekID', 'CommitWeekID','Signed','OfferMade','InterestLevel', 'IsActivelyRecruiting','RecruitingTeamRank','Scouted_Overall','ScoutingFuzz','Scouted_Strength_Rating', 'Scouted_Agility_Rating','Scouted_Speed_Rating','Scouted_Acceleration_Rating','Scouted_Stamina_Rating','Scouted_Awareness_Rating','Scouted_Jumping_Rating','Scouted_Injury_Rating','Scouted_ThrowPower_Rating','Scouted_ShortThrowAccuracy_Rating','Scouted_MediumThrowAccuracy_Rating','Scouted_DeepThrowAccuracy_Rating','Scouted_ThrowOnRun_Rating', 'Scouted_ThrowUnderPressure_Rating','Scouted_PlayAction_Rating','Scouted_Elusiveness_Rating','Scouted_BallCarrierVision_Rating', 'Scouted_JukeMove_Rating','Scouted_BreakTackle_Rating','Scouted_Carrying_Rating','Scouted_Catching_Rating','Scouted_CatchInTraffic_Rating','Scouted_RouteRunning_Rating','Scouted_Release_Rating','Scouted_HitPower_Rating','Scouted_Tackle_Rating', 'Scouted_PassRush_Rating','Scouted_BlockShedding_Rating','Scouted_Pursuit_Rating', 'Scouted_PlayRecognition_Rating','Scouted_ManCoverage_Rating','Scouted_ZoneCoverage_Rating','Scouted_Press_Rating','Scouted_PassBlock_Rating','Scouted_RunBlock_Rating','Scouted_ImpactBlock_Rating','Scouted_KickPower_Rating','Scouted_KickAccuracy_Rating','Scouted_KickReturn_Rating']
    RecruitTeamSeason.objects.bulk_update(RTSToSave, FieldsToSave)
    RecruitTeamSeasonInterest.objects.bulk_update(RTS_InterestToSave, ['PitchRecruitInterestRank_IsKnown'])
    print('Saved RTS', len(connection.queries))

    RTS = RecruitTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).annotate(
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
    US = Player.objects.filter(RecruitSigned = False).update(
        RecruitingPointsNeeded = ExpressionWrapper( F('RecruitingPointsNeeded') - Value(100) + Coalesce( Subquery(Player.objects.filter(PlayerID = OuterRef('PlayerID')).filter(playerteamseason__recruitteamseason__IsActivelyRecruiting = True).annotate(count=10*Count('playerteamseason__recruitteamseason__RecruitTeamSeasonID')).values('count')),0), IntegerField()))

    print('Saved recruiting ranks', len(connection.queries))

    PlayersReadyToSign = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False, OfferMade = True, InterestLevel__gte = F('PlayerTeamSeasonID__PlayerID__RecruitingPointsNeeded')).annotate(
        TeamRank = Window(
            expression=RowNumber(),
            partition_by=F("PlayerTeamSeasonID__PlayerID"),
            order_by=F("InterestLevel").desc(),
        )
    ).select_related('PlayerTeamSeasonID__PlayerID','PlayerTeamSeasonID__PlayerID__PositionID', 'TeamSeasonID__TeamID').order_by('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank')


    print('Starting to sign players', len(connection.queries))
    print('Number of players ready to sign', PlayersReadyToSign.count())
    if PlayersReadyToSign.count() > 0:

        print('\n\nPlayers ready to sign' )

        for TS in TeamSeasonList:
            TSDict[TS.TeamSeasonID] = TS

        RTSToSave = []
        TSPToSave = []
        PlayersToSave = []
        for RTS in [u for u in PlayersReadyToSign if u.TeamRank == 1 and u.OfferMade]:
            print('\t', RTS)
            RTS.Signed = True
            RTS.CommitWeekID = CurrentWeek
            RTS.PlayerTeamSeasonID.PlayerID.RecruitSigned = True

            TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable -= 1

            print('Scholarships available', TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable)
            if TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable >= 0:
                RTSToSave.append(RTS)
                PlayersToSave.append(RTS.PlayerTeamSeasonID.PlayerID)

                TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID].CommitPlayerCount +=1
                TSPToSave.append(TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID])


        TeamSeasonPosition.objects.bulk_update(TSPToSave, ['CommitPlayerCount'])
        RecruitTeamSeason.objects.bulk_update(RTSToSave, ['Signed', 'CommitWeekID'])
        Player.objects.bulk_update(PlayersToSave, ['RecruitSigned'])

        ScholarshipsRemainingList = TeamSeason.objects.filter(LeagueSeasonID = CurrentSeason, TeamID__isnull = False).select_related('LeagueSeasonID__LeagueID').annotate(
            #TotalPlayerCount_old = Count('playerteamseason__PlayerTeamSeasonID'),
            TotalPlayerCount = Coalesce(Subquery(PlayerTeamSeason.objects.filter(TeamSeasonID = OuterRef('TeamSeasonID')).values('TeamSeasonID').annotate(PlayerCount = Count('PlayerTeamSeasonID')).values('PlayerCount')[:1]), 0),
            #SeniorCount_old = Count('playerteamseason__PlayerTeamSeasonID', filter=Q(playerteamseason__ClassID__ClassAbbreviation = 'SR')),
            SeniorCount = Coalesce(Subquery(PlayerTeamSeason.objects.filter(TeamSeasonID = OuterRef('TeamSeasonID'), ClassID__ClassAbbreviation = 'SR').values('TeamSeasonID').annotate(PlayerCount = Count('PlayerTeamSeasonID')).values('PlayerCount')[:1]), 0),
            #PlayersSigned_old = Count('recruitteamseason__RecruitTeamSeasonID', filter=Q(recruitteamseason__Signed = True)),
            PlayersSigned = Coalesce(Subquery(RecruitTeamSeason.objects.filter(TeamSeasonID = OuterRef('TeamSeasonID'), Signed = True).values('TeamSeasonID').annotate(PlayerCount = Count('RecruitTeamSeasonID')).values('PlayerCount')[:1]), 0),
        )

        print('ScholarshipsRemainingList', ScholarshipsRemainingList.query)

        for TS in ScholarshipsRemainingList:
            PlayersSigned = TS.PlayersSigned
            PlayersPerTeam = TS.LeagueSeasonID.LeagueID.MaxSignablePlayersPerTeam
            TotalPlayers = TS.TotalPlayerCount
            SeniorCount = TS.SeniorCount
            TS.ScholarshipsToOffer = PlayersPerTeam - TotalPlayers +SeniorCount - PlayersSigned
            print('TS',TS, 'TS.ScholarshipsToOffer', TS.ScholarshipsToOffer, 'PlayersSigned', PlayersSigned, 'PlayersPerTeam',PlayersPerTeam, 'TotalPlayers',TotalPlayers, 'SeniorCount',SeniorCount)

        TeamSeason.objects.bulk_update(ScholarshipsRemainingList, ['ScholarshipsToOffer'])

    RTS_ToUpdate = []
    RTS_SetPoints = RecruitTeamSeason.objects.filter(WorldID = WorldID, TeamSeasonID__TeamID__IsUserTeam = True).exclude( UserRecruitingPointsLeftThisWeek = F('TeamSeasonID__MaxRecruitingPointsPerPlayerPerWeek')).select_related('TeamSeasonID')
    for RTS in RTS_SetPoints:
        RTS.UserRecruitingPointsLeftThisWeek = RTS.TeamSeasonID.MaxRecruitingPointsPerPlayerPerWeek
        RTS_ToUpdate.append(RTS)
    RecruitTeamSeason.objects.bulk_update(RTS_ToUpdate, ['UserRecruitingPointsLeftThisWeek'])

    RecruitTeamSeasonInterest.objects.filter(WorldID = WorldID, UtilizedThisWeek = True).update(UtilizedThisWeek = False)
    print('Recruiting complete', len(connection.queries))
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Weekly Recruiting', QueryCount = len(connection.queries))
