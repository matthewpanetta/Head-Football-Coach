from django.db.models.query import QuerySet
import random
import numpy
from math import sin, cos, sqrt, atan2, radians, log



def FindRange(RangeDict, Value):

    for Slice in RangeDict:
        if Value >= Slice['Floor'] and Value <= Slice['Ceiling']:
            return Slice

    return None

def HumanizeInteger(Val):
    j = Val % 10
    k = Val % 100;

    if j == 1 and k != 11:
        return str(Val) + 'st'

    if (j == 2 and k != 12):
        return str(Val) + "nd"

    if (j == 3 and k != 13):
        return str(Val) + "rd";

    return str(Val) + "th";


def NormalVariance(Modifier, Segments = 5):
    Mean = 1
    Sigma = .1
    SegmentsPerSide = int(Segments / 2)
    MinNumber = -1 * SegmentsPerSide
    MaxNumber = SegmentsPerSide
    g = MinNumber - 1
    LoopCount = 0
    while (g < MinNumber or g > MaxNumber):
        r = NormalTrunc(Mean * Modifier, Sigma, Mean - (SegmentsPerSide*Sigma), Mean + (SegmentsPerSide*Sigma))
        v = (r - Mean) / Sigma * 2
        if v == 0:
            v = -0.0000000001
        PositiveOrNegative = (v / abs(v))
        g = int(round(((abs(v) - Mean) * PositiveOrNegative), 0 ))
        LoopCount += 1
        if LoopCount > 10:
            return 0
    return g

def SecondsToMinutes(Sec):
    Sec = int(Sec)
    RSecs = str(Sec % 60)
    if len(RSecs) == 1:
        RSecs = '0'+RSecs
    return str(int(Sec / 60)) + ':' +RSecs


def UniqueFromQuerySet(QS, Field):
    DistinctValues = []
    for u in QS:
        if getattr(u, Field) not in DistinctValues:
            DistinctValues.append(getattr(u, Field))
    return DistinctValues

def IfNull(a,b):
    if a is None:
        return b
    return a

def IfBlank(a,b):
    if a == '':
        return b
    return a

def GetValuesOfSingleObjectDict(Obj, ValueList):

    ValueDict = {}
    ObjDict = Obj.__dict__
    for Attr in ValueList:
        ValueDict[Attr] = ObjDict[Attr]

    return ValueDict

def GetValuesOfSingleObject(Obj, ValueList):

    ValueDict = {}
    for Attr in ValueList:
        ValueDict[Attr] = getattr(Obj, Attr)

    return ValueDict

def GetValuesOfObject(Obj, ValueList):

    Results = []

    if isinstance(Obj, QuerySet):
        for O in Obj:
            Results.append(GetValuesOfSingleObject(O, ValueList))
    else:
        Results.append(GetValuesOfSingleObject(Obj, ValueList))

    return Results

def MergeDicts(DictList):

    ResultDict = {}
    for d in DictList:
        for k in d:
            ResultDict[k] = d[k]

    return ResultDict

def Min_Int(a,b):
    if a > b:
        return b
    else:
        return a

def Min(a,b):
    if a > b:
        return b
    else:
        return a

def Max(a,b):
    if a > b:
        return a
    else:
        return b

def Max_Int(a,b):
    if a > b:
        return a
    else:
        return b

def Average(Arr, IntCastFlag = False):
    ArrLen = len(Arr)
    ArrSum = sum(Arr)

    if ArrLen > 0:
        Avg = sum(Arr) / len(Arr)
        if IntCastFlag:
            return int(Avg)
        return Avg

    return None

def WeightedAverage(Arr, IntCastFlag = False):
    ArrWeight = 0
    ArrSum = 0

    for Tup in Arr:
        ArrSum += Tup[0] * Tup[1]
        ArrWeight += Tup[1]

    if ArrWeight > 0:
        Avg = ArrSum / ArrWeight
        if IntCastFlag:
            return int(Avg)
        return Avg

    return None


def InUniformRange(Prob, Modifier):
    r = random.uniform()
    if r < (Prod / 100.0):
        if (r - (Modifier/100.0)) < (Prob / 100.0):
            return True
    return False


def NormalBounds(Mean, Sigma, Min, Max):

    r = numpy.random.normal(Mean, Sigma)
    if r < Min:
        r = (2 * Min) - r
    if r > Max:
        r = (2 * Max) - r
    return r

def NormalTrunc(Mean, Sigma, Min, Max):

    r = Min

    LoopCount = 0
    while (r <= Min or r >= Max) and LoopCount < 100:
        r = numpy.random.normal(Mean, Sigma)
        LoopCount +=1

    if LoopCount >= 100:
        r = Min

    return r

def IntMin(a,b):
    if a < b:
        return int(a)
    return int(b)


def WeightedProbabilityChoice(Arr, Default=None):

    ValueList = []
    if not isinstance(Arr, list):
        for K in Arr:
            ValueList.append((K, Arr[K]))
    else:
        ValueList = Arr

    TotalWeightSum = 0
    for Choice in ValueList:
        TotalWeightSum += Choice[1]

    r = random.randint(1, TotalWeightSum)
    for Choice in ValueList:
        TotalWeightSum -= Choice[1]
        if r > TotalWeightSum:
            return Choice[0]

    print('Choosing default!', r, Arr)
    return Default


def MapNumberValuesToLetterGrade(NumberValue):
    GradeValueMap = [
        {'LetterGrade': 'A+', 'LowerBound': 91, 'UpperBound': 1000},
        {'LetterGrade': 'A',  'LowerBound': 86, 'UpperBound': 90},
        {'LetterGrade': 'A-', 'LowerBound': 81, 'UpperBound': 85},
        {'LetterGrade': 'B+', 'LowerBound': 76, 'UpperBound': 80},
        {'LetterGrade': 'B',  'LowerBound': 71, 'UpperBound': 75},
        {'LetterGrade': 'B-', 'LowerBound': 66, 'UpperBound': 70},
        {'LetterGrade': 'C+', 'LowerBound': 61, 'UpperBound': 65},
        {'LetterGrade': 'C',  'LowerBound': 56, 'UpperBound': 60},
        {'LetterGrade': 'C-', 'LowerBound': 51, 'UpperBound': 55},
        {'LetterGrade': 'D+', 'LowerBound': 46, 'UpperBound': 50},
        {'LetterGrade': 'D',  'LowerBound': 41, 'UpperBound': 45},
        {'LetterGrade': 'D-', 'LowerBound': 36, 'UpperBound': 40},
        {'LetterGrade': 'F',  'LowerBound': 31, 'UpperBound': 35},
        {'LetterGrade': 'F-', 'LowerBound': -1000, 'UpperBound': 30},
    ]

    for GradeObj in GradeValueMap:
        if NumberValue >= GradeObj['LowerBound'] and NumberValue <= GradeObj['UpperBound']:
            return GradeObj['LetterGrade']

    return 'No Grade'

def UniformTwoDecimals():
    return round(random.uniform(0,1),2)

def DistanceBetweenCities(CityA, CityB):

    # approximate radius of earth in km
    R = 6373.0

    lat1 = radians(CityA.Latitude)
    lon1 = radians(CityA.Longitude)
    lat2 = radians(CityB.Latitude)
    lon2 = radians(CityB.Longitude)

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c

    return distance

def DistanceBetweenCities_Dict(CityA, CityB):

    # approximate radius of earth in km
    R = 6373.0

    lat1 = radians(CityA['Latitude'])
    lon1 = radians(CityA['Longitude'])
    lat2 = radians(CityB['Latitude'])
    lon2 = radians(CityB['Longitude'])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c

    return distance


def intWithCommas(x):

    if x < 0:
        return '-' + intWithCommas(-x)
    result = ''
    while x >= 1000:
        x, r = divmod(x, 1000)
        result = ",%03d%s" % (r, result)
    return "%d%s" % (x, result)

def CalculateGameScore(PlayerTeamSeason):

    GameScoreMap = [
        {'Stat': 'RUS_Yards', 'PointToStatRatio': 1.0 / 10, 'Display': ' rush yards'},
        {'Stat': 'RUS_TD'   , 'PointToStatRatio': 6.0 / 1, 'Display': ' rush TDs'},
        {'Stat': 'PAS_Yards', 'PointToStatRatio': 1.0 / 25, 'Display': ' pass yards'},
        {'Stat': 'PAS_TD',    'PointToStatRatio': 4.0 / 1, 'Display': ' pass TDs'},
        {'Stat': 'PAS_Completions', 'PointToStatRatio': 1.0 / 10, 'Display': ' comp'},
        {'Stat': 'REC_Receptions', 'PointToStatRatio': 1.0 / 2, 'Display': ' rec.'},
        {'Stat': 'REC_Yards', 'PointToStatRatio': 1.0 / 15, 'Display': ' rec. yards'},
        {'Stat': 'REC_TD',    'PointToStatRatio': 5.0 / 1, 'Display': ' rec. TDs'},
        {'Stat': 'PAS_INT',    'PointToStatRatio': -4.0 / 1, 'Display': ' picks'},
        {'Stat': 'PAS_Sacks',  'PointToStatRatio': -1.0 / 4, 'Display': ' sacked'},
        {'Stat': 'DEF_Sacks',  'PointToStatRatio': 2.5 / 1, 'Display': ' sacks'},
        {'Stat': 'DEF_Tackles',  'PointToStatRatio': 1.0 / 2, 'Display': ' tackles'},
        {'Stat': 'DEF_TacklesForLoss',  'PointToStatRatio': 2.0 / 1, 'Display': ' TFLs'},
        {'Stat': 'DEF_Deflections',  'PointToStatRatio': 2.0 / 1, 'Display': ' defl'},
        {'Stat': 'DEF_INT',  'PointToStatRatio': 6.0 / 1, 'Display': ' INTS'},
        {'Stat': 'DEF_TD',  'PointToStatRatio': 6.0 / 1, 'Display': ' def TDs'},
        {'Stat': 'FUM_Fumbles',  'PointToStatRatio': -3.0 / 1, 'Display': ' fumbles'},
        {'Stat': 'FUM_Forced',  'PointToStatRatio': 4.0 / 1, 'Display': ' fumb frcd'},
        {'Stat': 'FUM_Recovered',  'PointToStatRatio': 1.0 / 1, 'Display': ' fumb rec.'},
        {'Stat': 'BLK_Sacks',  'PointToStatRatio': -3.0 / 1, 'Display': ' sacks alwd.'},
        {'Stat': 'BLK_Blocks',  'PointToStatRatio': 1.0 / 10, 'Display': ' blocks'},
    ]

    GameSummary = {'GameScore': 0}
    for StatObj in GameScoreMap:
        StatObj['DisplayValue'] = getattr(PlayerTeamSeason, StatObj['Stat'])
        if StatObj['DisplayValue'] is None:
            StatObj['DisplayValue'] = 0
        StatObj['GameScoreValue'] = StatObj['DisplayValue'] * StatObj['PointToStatRatio']
        GameSummary['GameScore'] += StatObj['GameScoreValue']

    StatCount = 0
    Displays = []
    for Stat in sorted(GameScoreMap, key=lambda k: k['GameScoreValue'],reverse=True):
        StatKey = 'TopStatStringDisplay' + str(StatCount + 1)
        GameSummary[StatKey] = None
        if Stat['DisplayValue'] > 0:
            GameSummary[StatKey] = intWithCommas(Stat['DisplayValue']) + Stat['Display']

        Displays.append(GameSummary[StatKey])
        StatCount +=1

    GameSummary['TopStatStringDisplay1'] = Displays[0]
    GameSummary['TopStatStringDisplay2'] = Displays[1]
    GameSummary['TopStatStringDisplay3'] = Displays[2]
    GameSummary['TopStatStringDisplay4'] = Displays[3]

    return GameSummary
