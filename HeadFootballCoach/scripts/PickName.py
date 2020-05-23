

import random
import numpy
from ..models import NameList, Region, Position, State, City, League, Headline, Playoff, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, Calendar, GameEvent, PlayerTeamSeasonSkill ,LeagueSeason
from django.db.models import  Count,  Sum, Max
from ..utilities import DistanceBetweenCities, DistanceBetweenCities_Dict, WeightedProbabilityChoice, NormalBounds, NormalTrunc, NormalVariance


def PlayerBioDataList(NumberOfPlayers, PositionID = None, PositionAbbreviation = None):
    Players = []
    DoubleLastNameOccurance = 20
    SuffixList = [(' Jr', 8), (' II', 8), (' III', 2)]


    FirstNames = NameList.objects.filter(IsFirstName=True)
    LastNames  = NameList.objects.filter(IsLastName=True)
    Cities  = City.objects.filter(Occurance__gt = 0)

    if PositionID is None and PositionAbbreviation is None:
        Positions = Position.objects.filter(Occurance__gt = 0)
    elif PositionID is not None:
        Positions = Position.objects.filter(Occurance__gt = 0).filter(PositionID = PositionID)
    elif PositionAbbreviation is not None:
        Positions = Position.objects.filter(Occurance__gt = 0).filter(PositionAbbreviation = PositionAbbreviation)

    FirstNameList = []
    LastNameList = []
    PositionList = []
    CityList = []


    for FirstName in FirstNames:
        FirstNameList.append((FirstName.Name, FirstName.Occurance))
    for LastName in LastNames:
        LastNameList.append((LastName.Name, LastName.Occurance))
    for Pos in Positions:
        PositionList.append((Pos, Pos.Occurance))
    for C in Cities:
        CityList.append((C, C.Occurance))

    for P in range(0, NumberOfPlayers):
        PlayerDict = {'PlayerFirstName': None, 'PlayerLastName': None, 'LastNameList': [], 'PositionID': None, 'Height': None, 'Weight': None, 'CityID': None}

        PlayerDict['PositionID'] = WeightedProbabilityChoice(PositionList, PositionList[0])
        PlayerDict['Height'] = int(NormalTrunc(PlayerDict['PositionID'].HeightAverage, PlayerDict['PositionID'].HeightStd, 65, 82 ))
        HeightVariance = PlayerDict['Height'] / PlayerDict['PositionID'].HeightAverage
        PlayerDict['Weight'] = int(NormalTrunc(PlayerDict['PositionID'].WeightAverage * HeightVariance, PlayerDict['PositionID'].WeightStd, 150, 400 ))

        PlayerDict['CityID'] = WeightedProbabilityChoice(CityList, CityList[0])

        while PlayerDict['PlayerFirstName'] is None:
            PlayerDict['PlayerFirstName'] = WeightedProbabilityChoice(FirstNameList, 'Tom')

        NumLastNames = 1
        Suffix = ''
        if DoubleLastNameOccurance >= random.randint(0,1000):
            NumLastNames = 2
        else:
            for s in SuffixList:
                if s[1] >=  random.randint(0,1000):
                    Suffix=s[0]
        for u in range(0,NumLastNames):
            CurrentLastName = None
            while CurrentLastName is None:
                CurrentLastName = WeightedProbabilityChoice(LastNameList, 'Kennedy')
            PlayerDict['LastNameList'].append(CurrentLastName)

        PlayerDict['PlayerLastName'] = '-'.join(PlayerDict['LastNameList']) + Suffix

        del PlayerDict['LastNameList']
        Players.append(PlayerDict)


    return Players

def RandomName():
    DoubleLastNameOccurance = 20
    SuffixList = [(' Jr', 8), (' II', 8), (' III', 2)]


    FirstNames = NameList.objects.filter(IsFirstName=True)
    LastNames  = NameList.objects.filter(IsLastName=True)


    FirstNamesCount = FirstNames.aggregate(Max('RandomStop'))
    FirstName = None
    while FirstName is None:
        FirstNameR = random.randint(1, FirstNamesCount['RandomStop__max'])
        FirstName = FirstNames.filter(RandomStart__lte=FirstNameR).filter( RandomStop__gte=FirstNameR).first()


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
        CurrentLastName = None
        while CurrentLastName is None:
            LastNameR = random.randint(1, LastNamesCount['RandomStop__max'])
            CurrentLastName = LastNames.filter(RandomStart__lte=LastNameR).filter(   RandomStop__gte=LastNameR).first()
        LastNameList.append(CurrentLastName.Name)


    LastName = '-'.join(LastNameList) + Suffix

    return (FirstName.Name, LastName)


def RandomPositionAndMeasurements(PositionAbbreviation = None):

    Positions = Position.objects.filter(Occurance__gt = 0)
    PositionCount = Positions.aggregate(Max('RandomStop'))

    if PositionAbbreviation is None:
        PositionR = random.randint(1, PositionCount['RandomStop__max'])
        PositionID = Positions.filter(RandomStart__lte=PositionR).filter( RandomStop__gte=PositionR).values('HeightAverage', 'HeightStd', 'WeightAverage', 'WeightStd', 'PositionID').first()
    else:
        PositionID = Positions.filter(PositionAbbreviation = PositionAbbreviation).values('HeightAverage', 'HeightStd', 'WeightAverage', 'WeightStd', 'PositionID').first()
        print('Got specialized request for', PositionAbbreviation, '- result:', PositionID)

    D = RandomPositionMeasurements(PositionID)
    D['PositionID'] = PositionID

    return   D


def RandomPositionMeasurements(PositionID):
    Height = NormalTrunc(PositionID['HeightAverage'], PositionID['HeightStd'], 65, 82 )
    Weight = NormalTrunc(PositionID['WeightAverage'], PositionID['WeightStd'], 150, 400 )

    return {'Height': Height, 'Weight': Weight}


def RandomCity():
    AllCities = City.objects.all()

    if AllCities.filter(RandomStart=None).count()> 0:
        ResetStartStop(AllCities, 'Occurance')


    CityCount = AllCities.aggregate(Max('RandomStop'))

    CityR = random.randint(1, CityCount['RandomStop__max'])
    C = AllCities.get(RandomStart__lte=CityR, RandomStop__gte=CityR)

    return C
