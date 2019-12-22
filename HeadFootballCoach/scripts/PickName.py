

import random
import numpy
from ..models import NameList, Region, Nation, Position, State, City, League, Headline, Playoff, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, Calendar, GameEvent, PlayerSeasonSkill ,LeagueSeason
from django.db.models import  Count,  Sum, Max


def RandomName():
    DoubleLastNameOccurance = 20
    SuffixList = [(' Jr', 8), (' II', 8), (' III', 2)]


    FirstNames = NameList.objects.filter(IsFirstName=True)
    LastNames  = NameList.objects.filter(IsLastName=True)


    FirstNamesCount = FirstNames.aggregate(Max('RandomStop'))
    FirstNameR = random.randint(1, FirstNamesCount['RandomStop__max'])
    FirstName = FirstNames.get(RandomStart__lte=FirstNameR, RandomStop__gte=FirstNameR)


    LastNamesCount = LastNames.aggregate(Max('RandomStop'))
    LastNameList = []
    NumLastNames = 1
    Suffix = ''
    if DoubleLastNameOccurance >= random.randint(0,1000):
        NumLastNames = 2
    else:
        for s in SuffixList:
            if s[1] >=  random.randint(0,1000):
                Suffix=s[0]
    for u in range(0,NumLastNames):
        LastNameR = random.randint(1, LastNamesCount['RandomStop__max'])
        CurrentLastName = LastNames.get(RandomStart__lte=LastNameR,   RandomStop__gte=LastNameR)
        LastNameList.append(CurrentLastName.Name)


    LastName = '-'.join(LastNameList) + Suffix

    return (FirstName.Name, LastName)


def RandomPositionAndMeasurements():

    Positions = Position.objects.filter(Occurance__gt = 0)
    PositionCount = Positions.aggregate(Max('RandomStop'))

    PositionR = random.randint(1, PositionCount['RandomStop__max'])
    PositionID = Positions.filter(RandomStart__lte=PositionR).filter( RandomStop__gte=PositionR).first()



    D = RandomPositionMeasurements(PositionID)
    D['PositionID'] = PositionID

    return   D


def RandomPositionMeasurements(PositionID):
    Height = numpy.random.normal(PositionID.HeightAverage, PositionID.HeightStd )
    Weight = numpy.random.normal(PositionID.WeightAverage, PositionID.WeightStd )

    return {'Height': Height, 'Weight': Weight}


def RandomCity():
    AllCities = City.objects.all()

    if AllCities.filter(RandomStart=None).count()> 0:
        ResetStartStop(AllCities, 'Occurance')


    CityCount = AllCities.aggregate(Max('RandomStop'))

    CityR = random.randint(1, CityCount['RandomStop__max'])
    C = AllCities.get(RandomStart__lte=CityR, RandomStop__gte=CityR)

    return C
