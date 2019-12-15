from ..models import Headline,World, Tournament, RecruitTeamSeason,TeamSeason, Team, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerSeasonSkill, LeagueSeason, Driver, PlayerGameStat, Coach, CoachTeamSeason
from random import uniform, randint
import numpy
from ..utilities import WeightedProbabilityChoice, Min, DistanceBetweenCities, GetValuesOfSingleObject, NormalBounds
from math import sin, cos, sqrt, atan2, radians, log





def RandomRecruitPreference(RecruitPreferenceBase):

    d = len(RecruitPreferenceBase)
    OrderedPreferences  ={}
    PickedPreferences = []
    for P in RecruitPreferenceBase:
        OrderedPreferences[P[0]] = 10

    PreferenceCount = 1
    while len([u for u in RecruitPreferenceBase if u[0] not in PickedPreferences]) > 0:
        Base = [u for u in RecruitPreferenceBase if u[0] not in PickedPreferences]
        c = WeightedProbabilityChoice(Base, Base[0][0])
        OrderedPreferences[c] = PreferenceCount
        PickedPreferences.append(c)
        #print(c, PreferenceCount)
        PreferenceCount +=1

    return OrderedPreferences


def WeeklyRecruiting(WorldID):

    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)
    RecruitsPerWeek = 6

    for T in Team.objects.all():
        print('Recruiting for ', T)
        for RTS in sorted([u for u in RecruitTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = T) if u.PlayerID.RecruitSigned == False], key=lambda t: t.MatchRating * t.PlayerID.OverallRating, reverse=True)[:RecruitsPerWeek]:
            TS = RTS.TeamSeasonID
            print(T, 'is recruiting', RTS)
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
        print('Recruiting for ', T)
        for RTS in sorted([u for u in RecruitTeamSeason.objects.filter(WorldID = WorldID).filter(TeamSeasonID__TeamID = T) if u.PlayerID.RecruitSigned == False], key=lambda t: t.MatchRating * t.PlayerID.OverallRating, reverse=True)[:RecruitsPerWeek]:
            TS = RTS.TeamSeasonID
            print(T, 'is recruiting', RTS)
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
        RTS.ScoutedOverall = NormalBounds(Recruit.OverallRating, 1.5, 0,99)
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

    TeamContactsPerRecruit = 20
    RecruitStateInterestModifier = 1
    RecruitTeamPrestigeInterestModifier = 15

    CurrentWorld = WorldID

    if RecruitTopPreferences is None:
        RecruitTopPreferences = FindRecruitTopPreferences(Recruit)

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

    TeamList = TeamSeason.objects.filter(WorldID = WorldID).filter(ScholarshipsToOffer__gt = 0)

    RecruitTeamDict = {'TeamList': []}

    for TS in TeamList:
        T = TS.TeamID

        RecruitDistance = DistanceBetweenCities(Recruit.CityID, T.CityID)
        RecruitDistanceInterestValue = 0
        for Locality in RecruitSchoolDistanceMap:
            if RecruitDistance >= RecruitSchoolDistanceMap[Locality]['LowerBound'] and RecruitDistance <= RecruitSchoolDistanceMap[Locality]['UpperBound']:
                RecruitDistanceInterestValue = RecruitSchoolDistanceMap[Locality]['PointValue']


        #print(RecruitTopPreferences)
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

    RTSToSave = []
    NumberOfTeamsToAdd = Min(TeamContactsPerRecruit, TeamList.count())
    for T in sorted(RecruitTeamDict['TeamList'], key = lambda k: k['MatchValue'] , reverse=True)[:NumberOfTeamsToAdd - 1]:
        RTS =  RecruitTeamSeason(WorldID=CurrentWorld, TeamSeasonID = T['TeamObject'].CurrentTeamSeason, PlayerID = Recruit, ScoutedOverall = NormalBounds(Recruit.OverallRating, 1.5, 0,99), MatchRating = T['MatchValue'])
        RTSToSave.append(RTS)

    return RTSToSave

def FakeWeeklyRecruiting(WorldID):
    print('Doing fake recruiting!!')
    CurrentWorld = World.objects.get(WorldID = WorldID)
    CurrentDay = Calendar.objects.get(WorldID = CurrentWorld, IsCurrent = 1)
    CurrentSeason = LeagueSeason.objects.get(WorldID = WorldID, IsCurrent = 1)

    RegularSeasonEndDateID = CurrentSeason.RegularSeasonEndDateID

    PlayersThatNeedMoreTeams = []

    WeeksUntilEndOfSeason = int(CurrentDay.DaysBetween(RegularSeasonEndDateID) / 7)
    if WeeksUntilEndOfSeason == 0:
        return None

    RecruitList = Player.objects.filter(WorldID= CurrentWorld).filter(IsRecruit=True).filter(RecruitSigned=False)
    RecruitsNeedToSignPerWeek = int(RecruitList.count() / WeeksUntilEndOfSeason)

    for Recruit in RecruitList.order_by('Recruiting_NationalRank')[:RecruitsNeedToSignPerWeek]:
        print()
        NumTeamRange = randint(1,8)
        RecruitingTeams = RecruitTeamSeason.objects.filter(WorldID=CurrentWorld).filter(TeamSeasonID__ScholarshipsToOffer__gt = 0).filter(PlayerID = Recruit)
        if RecruitingTeams.count() == 0:
            PlayersThatNeedMoreTeams.append(Recruit)
            continue
        NumTeamRange = Min(NumTeamRange, RecruitingTeams.count())
        print(Recruit, ' rated ', Recruit.OverallRating,' talking to ', NumTeamRange, ' teams')
        RTS_List = [(u, u.MatchRating)  for u in RecruitingTeams.order_by('-MatchRating')[:NumTeamRange]]
        for S in RTS_List:
            print(S)
            RTS = S[0]
            RTS.OfferMade = True
            RTS.InterestLevel += RTS.MatchRating
            RTS.save()

        RecruitChoice = WeightedProbabilityChoice(RTS_List, RTS_List[0][0])

        print('chooses!! - ')
        print(RecruitChoice.TeamSeasonID)

        RecruitChoice.InterestLevel +=500

        TS = RecruitChoice.TeamSeasonID
        TS.ScholarshipsToOffer -=1
        TS.save()

        RecruitChoice.Signed = True
        Recruit.RecruitSigned = True
        Recruit.save()
        RecruitChoice.save()

    TSCounter = 1
    TSSaveList = []
    for TS in sorted(TeamSeason.objects.filter(WorldID = CurrentWorld).filter(LeagueSeasonID = CurrentSeason), key=lambda TS: TS.RecruitingClassValue, reverse=True):
        if TS.ScholarshipsToOffer * 2 > RecruitTeamSeason.objects.filter(WorldID = CurrentWorld).filter(Signed=False).filter(TeamSeasonID = TS).count():
            FindNewRecruitsForTeam(WorldID, TS, (TS.ScholarshipsToOffer * 2) - RecruitTeamSeason.objects.filter(WorldID = CurrentWorld).filter(Signed=False).filter(TeamSeasonID = TS).count())

        TS.RecruitingClassRank = TSCounter
        TSSaveList.append(TS)
        TSCounter +=1
    TeamSeason.objects.bulk_update(TSSaveList, ['RecruitingClassRank'])


    for P in PlayersThatNeedMoreTeams:
        FindNewTeamsForRecruit(CurrentWorld, P)
