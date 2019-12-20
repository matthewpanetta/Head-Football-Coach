

PositionList = {#'ATH': 0,#993,
'CB': 1257,
'DE': 1312,
'DT': 841,
'FB': 40,
'K': 148,
'OC': 247,
'OG': 796,
'OLB': 932,
'OT': 1169,
'P': 79,
'RB': 1080,
'S': 989,
'TE': 582,
'WR': 1751,
'QB': 852,
'MLB': 624}

PositionStarList = {
#'ATH': {1:24, 2: 319, 3: 571, 4: 75, 5: 4},
'CB': {1:22, 2: 442, 3: 657, 4: 123, 5: 13},
'DE': {1:25, 2: 388, 3: 739, 4: 142, 5: 18},
'DT': {1:14, 2: 276, 3: 443, 4: 90, 5: 18},
'FB': {1:3, 2: 13, 3: 22, 4: 2},
'K': {1:8, 2: 82, 3: 58},
'OC': {1:6, 2: 68, 3: 93, 4: 18, 5: 2},
'OG': {1:33, 2: 300, 3: 386, 4: 75, 5: 2},
'OLB': {1:19, 2: 297, 3: 526, 4: 81, 5: 9},
'OT': {1:36, 2: 371, 3: 640, 4: 108, 5: 14},
'P': {1:1, 2: 41, 3: 37},
'RB': {1:29, 2: 338, 3: 595, 4: 109, 5: 9},
'S': {1:21, 2: 299, 3: 582, 4: 82, 5: 5},
'TE': {1:13, 2: 203, 3: 309, 4: 56, 5: 1},
'WR': {1:44, 2: 577, 3: 930, 4: 186, 5: 14},
'QB': {1:29, 2: 284, 3: 436, 4: 93, 5: 10},
'MLB': {1:18, 2: 249, 3: 291, 4: 62, 5: 4},
}

PositionMeasurementsList = {
#'ATH': {'HeightAvg':72.62, 'HeightStd': 2.24,'WeightAvg':188.93, 'WeightStd': 20.39},
'CB': {'HeightAvg':71.58, 'HeightStd': 1.61,'WeightAvg':175.16, 'WeightStd': 9.9},
'DE': {'HeightAvg':75.73, 'HeightStd': 1.37,'WeightAvg':238.76, 'WeightStd': 18.83},
'DT': {'HeightAvg':74.57, 'HeightStd': 1.46,'WeightAvg':282.73, 'WeightStd': 23.55},
'FB': {'HeightAvg':73, 'HeightStd': 1.47,'WeightAvg':232, 'WeightStd': 14.12},
'K': {'HeightAvg':71.89, 'HeightStd': 2,'WeightAvg':178.32, 'WeightStd': 15.76},
'OC': {'HeightAvg':74.98, 'HeightStd': 1.01,'WeightAvg':283.92, 'WeightStd': 15.91},
'OG': {'HeightAvg':75.63, 'HeightStd': 1.1,'WeightAvg':292.36, 'WeightStd': 22.27},
'OLB': {'HeightAvg':74, 'HeightStd': 1.39,'WeightAvg':212.09, 'WeightStd': 12.56},
'OT': {'HeightAvg':77.4, 'HeightStd': 1.16,'WeightAvg':285.06, 'WeightStd': 23.29},
'P': {'HeightAvg':73.86, 'HeightStd': 1.69,'WeightAvg':191.54, 'WeightStd': 17.31},
'RB': {'HeightAvg':70.51, 'HeightStd': 1.73,'WeightAvg':191.69, 'WeightStd': 16.36},
'S': {'HeightAvg':72.64, 'HeightStd': 1.5,'WeightAvg':187.73, 'WeightStd': 10.83},
'TE': {'HeightAvg':76.42, 'HeightStd': 1.26,'WeightAvg':229.05, 'WeightStd': 13.15},
'WR': {'HeightAvg':73.17, 'HeightStd': 2.3,'WeightAvg':183.67, 'WeightStd': 15.07},
'QB': {'HeightAvg':74.4, 'HeightStd': 1.73,'WeightAvg':196.45, 'WeightStd': 15.43},
'MLB': {'HeightAvg':73.3, 'HeightStd': 1.32,'WeightAvg':220.63, 'WeightStd': 11.75},
}

import random
import numpy
from ..models import NameList, Region, Nation, State, City, League, Headline, Playoff, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, Calendar, GameEvent, PlayerSeasonSkill ,LeagueSeason
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
    PositionCount = sum([PositionList[u] for u in PositionList])
    r = random.randint(0, PositionCount)
    runningsum = 0
    for Key,Value in PositionList.items():
        #print(Key,Value)
        runningsum += Value
        if runningsum >= r:
            Position = Key
            break

    D = RandomPositionMeasurements(Position)
    D['Position'] = Position

    return   D


def RandomPositionMeasurements(Pos):
    PositionMeasurementsObj = PositionMeasurementsList[Pos]
    Height = numpy.random.normal(PositionMeasurementsObj['HeightAvg'], PositionMeasurementsObj['HeightStd'] )
    Weight = numpy.random.normal(PositionMeasurementsObj['WeightAvg'], PositionMeasurementsObj['WeightStd'] )

    return {'Height': Height, 'Weight': Weight}


def RandomCity():
    AllCities = City.objects.all()

    if AllCities.filter(RandomStart=None).count()> 0:
        ResetStartStop(AllCities, 'Occurance')


    CityCount = AllCities.aggregate(Max('RandomStop'))

    CityR = random.randint(1, CityCount['RandomStop__max'])
    C = AllCities.get(RandomStart__lte=CityR, RandomStop__gte=CityR)

    return C
