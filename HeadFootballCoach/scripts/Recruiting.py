from ..models import Headline,World, Playoff,Week,Audit, WeekUpdate,RecruitTeamSeasonInterest, TeamSeasonPosition, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, Driver, PlayerGameStat, Coach, CoachTeamSeason
from random import uniform, randint, choice
import numpy
import json
import itertools
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


def ScoutPlayer_Initial(*, RTS = None, CoachObj = None, TSP = None,  PTS = None):


    PositionToScoutingGroups= {
        'QB': [['Intangibles', 'ThrowingArm', 'PassingIntangibles'], ['Athleticism', 'Rushing']],
        'RB': [['Rushing', 'Athleticism'], ['Intangibles'], ['Receiving', 'Blocking']],
        'FB': [['Rushing', 'Athleticism', 'Blocking'], ['Intangibles'], ['Receiving']],
        'WR': [['Athleticism', 'Receiving'], ['Intangibles']],
        'TE': [['Receiving', 'Athleticism', 'Blocking'], ['Intangibles']],
        'OT': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'OG': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'OC': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'DE': [['Athleticism', 'DLine'], ['Intangibles', 'GeneralDefense']],
        'DT': [['Athleticism', 'DLine'], ['Intangibles', 'GeneralDefense']],
        'MLB': [['GeneralDefense', 'Intangibles', 'Athleticism'], ['Coverage', 'DLine']],
        'OLB': [['GeneralDefense', 'Intangibles', 'Athleticism', 'DLine'], ['Coverage']],
        'CB': [['Athleticism', 'Coverage'], ['Intangibles'], ['GeneralDefense']],
        'S': [['Athleticism', 'Coverage', 'GeneralDefense'], ['Intangibles']],
        'K': [['Kicking'], ['Intangibles']],
        'P': [['Kicking'], ['Intangibles']],
    }

    ScoutingGroups = {
        'Intangibles': {
            'Skills': ['Awareness'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 2},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 4},
        },
        'Athleticism': {
            'Skills': ['Strength', 'Speed', 'Agility', 'Acceleration', 'Jumping', 'Stamina', 'Injury', 'KickReturn'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 0},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 0},
        },
        'ThrowingArm': {
            'Skills': ['ThrowPower', 'ShortThrowAccuracy','MediumThrowAccuracy','DeepThrowAccuracy',],
            'ScoutingPrecision': {'Default': 10, 'Floor': 4},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 1},
        },
        'PassingIntangibles': {
            'Skills': ['ThrowOnRun', 'ThrowUnderPressure', 'PlayAction'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 5},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 5},
        },
        'Rushing': {
            'Skills': ['Elusiveness', 'BallCarrierVision', 'JukeMove', 'BreakTackle', 'Carrying'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 0},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 0},
        },
        'Receiving': {
            'Skills': ['Catching', 'CatchInTraffic', 'RouteRunning', 'Release'],
            'ScoutingPrecision': {'Default': 8, 'Floor': 2},
            'ScoutingAccuracy': {'Default': 5, 'Floor': 0},
        },
        'Blocking': {
            'Skills': ['PassBlock', 'RunBlock', 'ImpactBlock'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 1},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 1},
        },
        'DLine': {
            'Skills': ['PassRush', 'BlockShedding'],
            'ScoutingPrecision': {'Default': 6, 'Floor': 3},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 2},
        },
        'GeneralDefense': {
            'Skills': ['HitPower', 'Tackle', 'Pursuit', 'PlayRecognition'],
            'ScoutingPrecision': {'Default': 6, 'Floor': 1},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 4},
        },
        'Coverage': {
            'Skills': ['ManCoverage', 'ZoneCoverage', 'Press'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 4},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 0},
        },
        'Kicking': {
            'Skills': ['KickPower', 'KickAccuracy'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 5},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 5},
        },
    }

    if PTS is None:
        PTS = RTS.PlayerTeamSeasonID
    PlayerSkill = PTS.playerteamseasonskill

    OverallSum = 0
    WeightSum = 0

    CoachScoutingSkill = CoachObj.ScoutingRating
    for SkillGroupKey in ScoutingGroups:
        SkillGroup = ScoutingGroups[SkillGroupKey]

        SkillGroupPrecision_Name = f'Scouting_{SkillGroupKey}_Precision'
        SkillGroupAccuracy_Name = f'Scouting_{SkillGroupKey}_Accuracy'

        SkillGroupPrecision = SkillGroup['ScoutingPrecision']['Default']
        PrecisionRange = range(SkillGroup['ScoutingPrecision']['Floor'], SkillGroup['ScoutingPrecision']['Default'] + 1 )
        for u in range(CoachScoutingSkill):
            r = choice(PrecisionRange)
            SkillGroupPrecision = r if r < SkillGroupPrecision else SkillGroupPrecision

        SkillGroupAccuracy = SkillGroup['ScoutingAccuracy']['Default']
        AccuracyRange = range(SkillGroup['ScoutingAccuracy']['Floor'], SkillGroup['ScoutingAccuracy']['Default'] + 1 )
        for u in range(CoachScoutingSkill):
            r = choice(AccuracyRange)
            SkillGroupAccuracy = r if r < SkillGroupAccuracy else SkillGroupAccuracy

        SkillGroupAccuracy = choice([SkillGroupAccuracy, -1 * SkillGroupAccuracy])

        setattr(RTS, SkillGroupPrecision_Name, SkillGroupPrecision)
        setattr(RTS, SkillGroupAccuracy_Name, SkillGroupAccuracy)

        for Skill in SkillGroup['Skills']:
            RatingName = Skill+'_Rating'
            ScoutedRatingName = f'Scouted_{Skill}_Rating'
            OriginalRatingName = ScoutedRatingName + '_Original'
            WeightRatingField = RatingName +'_Weight'

            BaseVal = getattr(PlayerSkill, RatingName)
            NewVal = randint(BaseVal + SkillGroupAccuracy - SkillGroupPrecision, BaseVal + SkillGroupAccuracy + SkillGroupPrecision)

            NewVal = 0 if NewVal < 0 else NewVal

            setattr(RTS, ScoutedRatingName, NewVal)
            setattr(RTS, OriginalRatingName, NewVal)

            OverallSum+= float(NewVal) * float(getattr(TSP, WeightRatingField))
            WeightSum += float(getattr(TSP, WeightRatingField))

    RTS.SkillGroupsLeftToScout =  sum([len(SkillLevel)  for SkillLevel in PositionToScoutingGroups[PTS.PlayerID.PositionID.PositionAbbreviation]])


    OverallSum = int(OverallSum * 1.0 / WeightSum)
    RTS.Scouted_Overall = OverallSum
    RTS.Scouted_Overall_Original = OverallSum


    return RTS


def ScoutPlayer(RTS, TSP = None, CoachObj = None):

    print('\tScouting player')


    PositionToScoutingGroups= {
        'QB': [['Intangibles', 'ThrowingArm', 'PassingIntangibles'], ['Athleticism', 'Rushing']],
        'RB': [['Rushing', 'Athleticism'], ['Intangibles'], ['Receiving', 'Blocking']],
        'FB': [['Rushing', 'Athleticism', 'Blocking'], ['Intangibles'], ['Receiving']],
        'WR': [['Athleticism', 'Receiving'], ['Intangibles']],
        'TE': [['Receiving', 'Athleticism', 'Blocking'], ['Intangibles']],
        'OT': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'OG': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'OC': [[ 'Blocking'], ['Athleticism','Intangibles']],
        'DE': [['Athleticism', 'DLine'], ['Intangibles', 'GeneralDefense']],
        'DT': [['Athleticism', 'DLine'], ['Intangibles', 'GeneralDefense']],
        'MLB': [['GeneralDefense', 'Intangibles', 'Athleticism'], ['Coverage', 'DLine']],
        'OLB': [['GeneralDefense', 'Intangibles', 'Athleticism', 'DLine'], ['Coverage']],
        'CB': [['Athleticism', 'Coverage'], ['Intangibles'], ['GeneralDefense']],
        'S': [['Athleticism', 'Coverage', 'GeneralDefense'], ['Intangibles']],
        'K': [['Kicking'], ['Intangibles']],
        'P': [['Kicking'], ['Intangibles']],
    }

    ScoutingGroups = {
        'Intangibles': {
            'Skills': ['Awareness'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 2},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 4},
        },
        'Athleticism': {
            'Skills': ['Strength', 'Speed', 'Agility', 'Acceleration', 'Jumping', 'Stamina', 'Injury', 'KickReturn'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 0},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 0},
        },
        'ThrowingArm': {
            'Skills': ['ThrowPower', 'ShortThrowAccuracy','MediumThrowAccuracy','DeepThrowAccuracy',],
            'ScoutingPrecision': {'Default': 10, 'Floor': 4},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 1},
        },
        'PassingIntangibles': {
            'Skills': ['ThrowOnRun', 'ThrowUnderPressure', 'PlayAction'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 5},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 5},
        },
        'Rushing': {
            'Skills': ['Elusiveness', 'BallCarrierVision', 'JukeMove', 'BreakTackle', 'Carrying'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 0},
            'ScoutingAccuracy': {'Default': 4, 'Floor': 0},
        },
        'Receiving': {
            'Skills': ['Catching', 'CatchInTraffic', 'RouteRunning', 'Release'],
            'ScoutingPrecision': {'Default': 8, 'Floor': 2},
            'ScoutingAccuracy': {'Default': 5, 'Floor': 0},
        },
        'Blocking': {
            'Skills': ['PassBlock', 'RunBlock', 'ImpactBlock'],
            'ScoutingPrecision': {'Default': 4, 'Floor': 1},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 1},
        },
        'DLine': {
            'Skills': ['PassRush', 'BlockShedding'],
            'ScoutingPrecision': {'Default': 6, 'Floor': 3},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 2},
        },
        'GeneralDefense': {
            'Skills': ['HitPower', 'Tackle', 'Pursuit', 'PlayRecognition'],
            'ScoutingPrecision': {'Default': 6, 'Floor': 1},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 4},
        },
        'Coverage': {
            'Skills': ['ManCoverage', 'ZoneCoverage', 'Press'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 4},
            'ScoutingAccuracy': {'Default': 8, 'Floor': 0},
        },
        'Kicking': {
            'Skills': ['KickPower', 'KickAccuracy'],
            'ScoutingPrecision': {'Default': 12, 'Floor': 5},
            'ScoutingAccuracy': {'Default': 12, 'Floor': 5},
        },
    }

    if RTS.SkillGroupsLeftToScout <= 0:
        return RTS

    SkillGroupToScout = None
    PlayerPositionAbbreviation = RTS.PlayerTeamSeasonID.PlayerID.PositionID.PositionAbbreviation
    PositionScoutingGroups = PositionToScoutingGroups[PlayerPositionAbbreviation]

    ValidScoutingGroups = []

    for ScoutingLevel in PositionScoutingGroups:
        ValidGroups = []
        for ScoutingGroupKey in ScoutingLevel:
            ScoutingGroup = ScoutingGroups[ScoutingGroupKey]
            ScoutingGroupPercent_FieldName = f'Scouting_{ScoutingGroupKey}_ScoutingPercent'

            if getattr(RTS, ScoutingGroupPercent_FieldName) < 100:
                ValidGroups.append(ScoutingGroupKey)
        if len(ValidGroups) > 0:
            ValidScoutingGroups.append(ValidGroups)

    if len(ValidScoutingGroups) > 0:
        SkillGroupToScout = choice(ValidScoutingGroups[0])
    else:
        print('Something weird in scouting!!!', ValidScoutingGroups, SkillGroupToScout)
        return None

    PlayerSkill = RTS.PlayerTeamSeasonID.playerteamseasonskill

    CoachScoutingRating = CoachObj.ScoutingRating
    CoachScoutingLevel = 1
    if CoachScoutingRating >= 12:
        CoachScoutingLevel = 4
    elif CoachScoutingRating >= 9:
        CoachScoutingLevel = 3
    elif CoachScoutingRating >= 6:
        CoachScoutingLevel = 2
    else:
        CoachScoutingLevel = 1


    OverallSum = 0
    WeightSum = 0


    SkillGroupKey = SkillGroupToScout

    SkillGroup = ScoutingGroups[SkillGroupKey]

    SkillGroupPrecision_Name = f'Scouting_{SkillGroupKey}_Precision'
    SkillGroupAccuracy_Name = f'Scouting_{SkillGroupKey}_Accuracy'
    SkillGroupPercent_Name = f'Scouting_{SkillGroupKey}_ScoutingPercent'

    SkillGroupPrecision = getattr(RTS, SkillGroupPrecision_Name)
    PrecisionRange = range(0, SkillGroupPrecision + 1 )
    for u in range(CoachScoutingLevel):
        r = choice(PrecisionRange)
        SkillGroupPrecision = r if r < SkillGroupPrecision else SkillGroupPrecision

    SkillGroupAccuracy = getattr(RTS, SkillGroupAccuracy_Name)
    if SkillGroupAccuracy > 0:
        AccuracyRange = range(0, SkillGroupAccuracy + 1 )
    else:
        AccuracyRange = range(SkillGroupAccuracy, 1 )
    for u in range(CoachScoutingLevel):
        r = choice(AccuracyRange)
        SkillGroupAccuracy = r if r < SkillGroupAccuracy else SkillGroupAccuracy

    SkillGroupAccuracy = choice([SkillGroupAccuracy, -1 * SkillGroupAccuracy])

    setattr(RTS, SkillGroupPrecision_Name, SkillGroupPrecision)
    setattr(RTS, SkillGroupAccuracy_Name, SkillGroupAccuracy)

    NewScoutingPercent = getattr(RTS, SkillGroupPercent_Name) + (25 * CoachScoutingLevel)
    NewScoutingPercent = 100 if NewScoutingPercent > 100 else NewScoutingPercent
    setattr(RTS, SkillGroupPercent_Name, NewScoutingPercent)



    for ThisSkillGroupKey in ScoutingGroups:
        ThisSkillGroup = ScoutingGroups[ThisSkillGroupKey]

        for Skill in ThisSkillGroup['Skills']:
            RatingName = Skill+'_Rating'
            ScoutedRatingName = f'Scouted_{Skill}_Rating'
            OriginalRatingName = ScoutedRatingName + '_Original'
            WeightRatingField = RatingName +'_Weight'


            BaseVal = getattr(PlayerSkill, RatingName)
            NewVal = BaseVal
            if ThisSkillGroupKey == SkillGroupKey:
                NewVal = randint(BaseVal + SkillGroupAccuracy - SkillGroupPrecision, BaseVal + SkillGroupAccuracy + SkillGroupPrecision)

                NewVal = 0 if NewVal < 0 else NewVal

                setattr(RTS, ScoutedRatingName, NewVal)

            OverallSum+= float(NewVal) * float(getattr(TSP, WeightRatingField))
            WeightSum += float(getattr(TSP, WeightRatingField))

    RTS.SkillGroupsLeftToScout =  sum([len([SkillGroup for SkillGroup in SkillLevel if getattr(RTS, f'Scouting_{SkillGroup}_ScoutingPercent') < 100])  for SkillLevel in PositionToScoutingGroups[RTS.PlayerTeamSeasonID.PlayerID.PositionID.PositionAbbreviation]])


    OverallSum = int(OverallSum * 1.0 / WeightSum)
    RTS.Scouted_Overall = OverallSum


    return RTS



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


def WeeklyRecruiting():
    print('YOU SHOULDNT BE IN HERE')
    return None

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
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)

    CurrentWeekNumber = CurrentWeek.WeekNumber

    NextWeek = None

    InterestModifier = CurrentWeek.RecruitingWeekModifier

    print(f'Got world info. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}


    CoachDict = {}
    for HC in CoachTeamSeason.objects.filter(CoachPositionID__CoachPositionAbbreviation = 'HC', TeamSeasonID__LeagueSeasonID = CurrentSeason).select_related('TeamSeasonID', 'CoachID'):
        CoachDict[HC.TeamSeasonID_id] = HC.CoachID

    print(f'Build CoachDict. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}


    PlayersThatNeedMoreTeams = []

    TeamSeasonList = CurrentSeason.teamseason_set.filter(teamseasonweekrank__IsCurrent = True, coachteamseason__CoachPositionID__CoachPositionAbbreviation = 'HC', teamseasoninforating__TeamInfoTopicID__AttributeName = 'Team Prestige').select_related('TeamID').annotate(
        TeamPrestige = F('teamseasoninforating__TeamRating'),
        ActiveRecruitCount = Value(30, output_field=IntegerField()),
        RecruitsActivelyRecruiting = Sum(Case(
            When((Q(recruitteamseason__IsActivelyRecruiting = True) & Q(recruitteamseason__PlayerTeamSeasonID__PlayerID__RecruitSigned = False)), then=1),
            default=(Value(0)),
            output_field=IntegerField()
        )),
        RecruitsToAddToBoard = ExpressionWrapper(F('ActiveRecruitCount') - F('RecruitsActivelyRecruiting'), output_field=IntegerField()),
        ScholarshipsAvailable = F('ScholarshipsToOffer'),

        CoachRecruitingConcentration = F('coachteamseason__CoachID__RecruitingConcentration')
    ).order_by('-TeamPrestige', 'teamseasonweekrank__NationalRank')

    TeamSeasonList = list(TeamSeasonList)

    print(f'Built teamseasonlist. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    TeamPrestigeModified = .5
    TeamInterestRankModifier = 1
    RTSToSave = []
    RTS_InterestToSave = []
    TSDict = {}


    AllRecruitsAvailable = RecruitTeamSeason.objects.filter(WorldID_id=WorldID).filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False).filter(TeamSeasonID__teamseasonposition__PositionID = F('PlayerTeamSeasonID__PlayerID__PositionID')).select_related('PlayerTeamSeasonID', 'PlayerTeamSeasonID__playerteamseasonskill', 'PlayerTeamSeasonID__PlayerID', 'PlayerTeamSeasonID__PlayerID__PositionID', 'TeamSeasonID', 'TeamSeasonStateID').annotate(
        CommitsNeeded = F('TeamSeasonID__teamseasonposition__MinimumPlayerCount') - F('TeamSeasonID__teamseasonposition__FreshmanPlayerCount') - F('TeamSeasonID__teamseasonposition__SophomorePlayerCount') - F('TeamSeasonID__teamseasonposition__JuniorPlayerCount') - F('TeamSeasonID__teamseasonposition__CommitPlayerCount'),
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

    RTS_TeamInterestDict = {}
    RTS_TeamSeasonDict = {}
    for RTS in AllRecruitsAvailable:
        if RTS.TeamSeasonID not in RTS_TeamSeasonDict:
            RTS_TeamSeasonDict[RTS.TeamSeasonID] = []

        RTS_TeamSeasonDict[RTS.TeamSeasonID].append(RTS)
        RTS_TeamInterestDict[RTS] = []

    print(f'Built RTS_TeamSeasonDict. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    TeamSeasonPositionList = TeamSeasonPosition.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).select_related('PositionID', 'TeamSeasonID')
    TeamSeasonPositionDict = {}
    for TS in TeamSeasonList:
        TeamSeasonPositionDict[TS] = {}

    for TSP in TeamSeasonPositionList:
        TeamSeasonPositionDict[TSP.TeamSeasonID][TSP.PositionID] = TSP

    print(f'Built TeamSeasonPositionList. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    RTS_TeamInterestList = RecruitTeamSeasonInterest.objects.filter(RecruitTeamSeasonID__TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(RecruitTeamSeasonID__PlayerTeamSeasonID__PlayerID__RecruitSigned = False).annotate(
        PitchValue =  Round(((12 - F('PlayerRecruitingInterestID__PitchRecruitInterestRank')) ** .5) * ((F('TeamRating') / 10.0) ** 2), -1),
        KnownPitchValue =  Case(
            When(PitchRecruitInterestRank_IsKnown = True, then=F('PitchValue')),
            default = Value(0),
            output_field=FloatField()
        ),
        KnownPitchValue_Rank = Window(
            expression=RowNumber(),
            partition_by=F("RecruitTeamSeasonID"),
            order_by=F("KnownPitchValue").desc(),
        )
    ).select_related('RecruitTeamSeasonID').order_by('-KnownPitchValue', '-TeamRating')

    print(f'Built query for RTS_TeamInterestList. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    print('RTS_TeamInterestList Length', len(RTS_TeamInterestList), len(RTS_TeamInterestList) * 1.0 / len(TeamSeasonList), 'RTSI per team'  )
    RTS_TeamInterestList = [RTSI for RTSI in RTS_TeamInterestList if RTSI.KnownPitchValue_Rank <= 8]
    for RTSI in RTS_TeamInterestList:
        RTS_TeamInterestDict[RTSI.RecruitTeamSeasonID].append(RTSI)

    # key_func = lambda x: x.RecruitTeamSeasonID
    # for RTS, RTSI_List in itertools.groupby(RTS_TeamInterestList, key_func):
    #     RTS_TeamInterestDict[RTS] = list(RTSI_List)

    print('RTS_TeamInterestDict length', len(RTS_TeamInterestDict))

    print(f'Build RTS_TeamInterestList Starting TS Loop. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    for TS in TeamSeasonList:
        CoachObj = CoachDict[TS.TeamSeasonID]
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

                if RTS.SkillGroupsLeftToScout > 0 and uniform(0,1) ** RTS.SkillGroupsLeftToScout < .33:

                    RTS = ScoutPlayer(RTS, TSP = TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID], CoachObj = CoachObj)

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
            InterestIncreaseModifier = 1.0
            if RTS.TeamSeasonStateID.IsPipelineState:
                InterestIncreaseModifier = 1.2
            elif RTS.TeamSeasonStateID.IsConnectedState:
                InterestIncreaseModifier = 1.1
            RTS.InterestLevel += int(ThisWeekInterestIncrease * InterestIncreaseModifier)
            RTSToSave.append(RTS)

    print(f'Starting to save RTS. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    FieldsToSave = ['VisitWeekID', 'CommitWeekID','Signed','OfferMade','InterestLevel', 'IsActivelyRecruiting','RecruitingTeamRank','Scouted_Overall','Scouted_Strength_Rating', 'Scouted_Agility_Rating','Scouted_Speed_Rating','Scouted_Acceleration_Rating','Scouted_Stamina_Rating','Scouted_Awareness_Rating','Scouted_Jumping_Rating','Scouted_Injury_Rating','Scouted_ThrowPower_Rating','Scouted_ShortThrowAccuracy_Rating','Scouted_MediumThrowAccuracy_Rating','Scouted_DeepThrowAccuracy_Rating','Scouted_ThrowOnRun_Rating', 'Scouted_ThrowUnderPressure_Rating','Scouted_PlayAction_Rating','Scouted_Elusiveness_Rating','Scouted_BallCarrierVision_Rating', 'Scouted_JukeMove_Rating','Scouted_BreakTackle_Rating','Scouted_Carrying_Rating','Scouted_Catching_Rating','Scouted_CatchInTraffic_Rating','Scouted_RouteRunning_Rating','Scouted_Release_Rating','Scouted_HitPower_Rating','Scouted_Tackle_Rating', 'Scouted_PassRush_Rating','Scouted_BlockShedding_Rating','Scouted_Pursuit_Rating', 'Scouted_PlayRecognition_Rating','Scouted_ManCoverage_Rating','Scouted_ZoneCoverage_Rating','Scouted_Press_Rating','Scouted_PassBlock_Rating','Scouted_RunBlock_Rating','Scouted_ImpactBlock_Rating','Scouted_KickPower_Rating','Scouted_KickAccuracy_Rating','Scouted_KickReturn_Rating','SkillGroupsLeftToScout'
    , 'Scouting_Intangibles_ScoutingPercent', 'Scouting_Intangibles_Precision', 'Scouting_Intangibles_Accuracy'
    , 'Scouting_Athleticism_ScoutingPercent', 'Scouting_Athleticism_Precision', 'Scouting_Athleticism_Accuracy'
    , 'Scouting_ThrowingArm_ScoutingPercent', 'Scouting_ThrowingArm_Precision', 'Scouting_ThrowingArm_Accuracy'
    , 'Scouting_PassingIntangibles_ScoutingPercent', 'Scouting_PassingIntangibles_Precision', 'Scouting_PassingIntangibles_Accuracy'
    , 'Scouting_Rushing_ScoutingPercent', 'Scouting_Rushing_Precision', 'Scouting_Rushing_Accuracy'
    , 'Scouting_Receiving_ScoutingPercent', 'Scouting_Receiving_Precision', 'Scouting_Receiving_Accuracy'
    , 'Scouting_Blocking_ScoutingPercent', 'Scouting_Blocking_Precision', 'Scouting_Blocking_Accuracy'
    , 'Scouting_DLine_ScoutingPercent', 'Scouting_DLine_Precision', 'Scouting_DLine_Accuracy'
    , 'Scouting_GeneralDefense_ScoutingPercent', 'Scouting_GeneralDefense_Precision', 'Scouting_GeneralDefense_Accuracy'
    , 'Scouting_Kicking_ScoutingPercent', 'Scouting_Kicking_Precision', 'Scouting_Kicking_Accuracy'
    , 'Scouting_Coverage_ScoutingPercent', 'Scouting_Coverage_Precision', 'Scouting_Coverage_Accuracy']

    RecruitTeamSeason.objects.bulk_update(RTSToSave, FieldsToSave)
    RecruitTeamSeasonInterest.objects.bulk_update(RTS_InterestToSave, ['PitchRecruitInterestRank_IsKnown'])
    print(f'Saved RTS. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    RTSToSave = []
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
        if R.RecruitingTeamRank != R.RecruitingTeamRank_new:
            R.RecruitingTeamRank = R.RecruitingTeamRank_new
            RTSToSave.append(R)
    RecruitTeamSeason.objects.bulk_update(RTSToSave,['RecruitingTeamRank'])
    print(f'Saved recruiting ranks. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    US = Player.objects.filter(RecruitSigned = False).update(
        RecruitingPointsNeeded = ExpressionWrapper( F('RecruitingPointsNeeded') - Value(100) + Coalesce( Subquery(Player.objects.filter(PlayerID = OuterRef('PlayerID')).filter(playerteamseason__recruitteamseason__IsActivelyRecruiting = True).annotate(count=10*Count('playerteamseason__recruitteamseason__RecruitTeamSeasonID')).values('count')),0), IntegerField()))

    print(f'Saved RecruitingPointsNeeded. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}

    PlayersReadyToSign = RecruitTeamSeason.objects.filter(PlayerTeamSeasonID__PlayerID__RecruitSigned = False, OfferMade = True, InterestLevel__gte = F('PlayerTeamSeasonID__PlayerID__RecruitingPointsNeeded')).annotate(
        TeamRank = Window(
            expression=RowNumber(),
            partition_by=F("PlayerTeamSeasonID__PlayerID"),
            order_by=F("InterestLevel").desc(),
        )
    ).select_related('PlayerTeamSeasonID__PlayerID','PlayerTeamSeasonID__PlayerID__PositionID', 'TeamSeasonID__TeamID').order_by('PlayerTeamSeasonID__PlayerID__Recruiting_NationalRank')


    print(f'Starting to sign players. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}
    print('Number of players ready to sign', PlayersReadyToSign.count())
    if PlayersReadyToSign.count() > 0:

        print('\n\nPlayers ready to sign' )

        for TS in TeamSeasonList:
            TSDict[TS.TeamSeasonID] = TS

        RTSToSave = []
        TSPToSave = []
        PlayersToSave = []
        for RTS in [u for u in PlayersReadyToSign if u.TeamRank == 1 and u.OfferMade]:
            RTS.Signed = True
            RTS.CommitWeekID = CurrentWeek
            RTS.PlayerTeamSeasonID.PlayerID.RecruitSigned = True

            TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable -= 1

            #print('Scholarships available', TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable)
            if TSDict[RTS.TeamSeasonID.TeamSeasonID].ScholarshipsAvailable >= 0:
                RTSToSave.append(RTS)
                PlayersToSave.append(RTS.PlayerTeamSeasonID.PlayerID)

                TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID].CommitPlayerCount +=1
                TSPToSave.append(TeamSeasonPositionDict[RTS.TeamSeasonID][RTS.PlayerTeamSeasonID.PlayerID.PositionID])


                if RTS.TeamSeasonID.TeamID.IsUserTeam:
                    if NextWeek is None:
                        NextWeek = CurrentWeek.NextWeek
                    WU = WeekUpdate(WorldID_id = WorldID, WeekID = NextWeek, LeagueSeasonID = CurrentSeason, MessageImportanceValue=2, LinkHref = f'/World/{WorldID}/Player/{RTS.PlayerTeamSeasonID.PlayerID.PlayerID}', LinkText = 'Player profile', MessageText = '')

                    PlayerName = f'{RTS.PlayerTeamSeasonID.PlayerID.PlayerFirstName} {RTS.PlayerTeamSeasonID.PlayerID.PlayerLastName}'

                    WU.MessageText += f'{PlayerName} has signed with your team'
                    WU.save()


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

        #print('ScholarshipsRemainingList', ScholarshipsRemainingList.query)

        for TS in ScholarshipsRemainingList:
            PlayersSigned = TS.PlayersSigned
            PlayersPerTeam = TS.LeagueSeasonID.LeagueID.MaxSignablePlayersPerTeam
            TotalPlayers = TS.TotalPlayerCount
            SeniorCount = TS.SeniorCount
            TS.ScholarshipsToOffer = PlayersPerTeam - TotalPlayers +SeniorCount - PlayersSigned
            #print('TS',TS, 'TS.ScholarshipsToOffer', TS.ScholarshipsToOffer, 'PlayersSigned', PlayersSigned, 'PlayersPerTeam',PlayersPerTeam, 'TotalPlayers',TotalPlayers, 'SeniorCount',SeniorCount)

        TeamSeason.objects.bulk_update(ScholarshipsRemainingList, ['ScholarshipsToOffer'])

    RTS_ToUpdate = []
    RTS_SetPoints = RecruitTeamSeason.objects.filter(WorldID = WorldID, TeamSeasonID__TeamID__IsUserTeam = True).exclude( UserRecruitingPointsLeftThisWeek = F('TeamSeasonID__MaxRecruitingPointsPerPlayerPerWeek')).select_related('TeamSeasonID')
    for RTS in RTS_SetPoints:
        RTS.UserRecruitingPointsLeftThisWeek = RTS.TeamSeasonID.MaxRecruitingPointsPerPlayerPerWeek
        RTS_ToUpdate.append(RTS)
    RecruitTeamSeason.objects.bulk_update(RTS_ToUpdate, ['UserRecruitingPointsLeftThisWeek'])

    RecruitTeamSeasonInterest.objects.filter(WorldID = WorldID, UtilizedThisWeek = True).update(UtilizedThisWeek = False, InterestEarnedThisWeek = 0)
    print(f'Recruiting complete. {len(connection.queries) - Logger["Queries"]} queries in {time.time() - Logger["Time"]} seconds' )
    Logger = {"Time": time.time(), "Queries": len(connection.queries)}
    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Weekly Recruiting', QueryCount = len(connection.queries))
