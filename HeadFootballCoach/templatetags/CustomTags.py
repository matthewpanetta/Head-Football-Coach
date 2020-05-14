from django import template

register = template.Library()

@register.filter
def modulo(num, val):
    return num % val


@register.filter
def PeriodMap(num):
    PeriodDict = {
        5: 'OT',
        6: '2OT',
        7: '3OT',
        8: '4OT'
    }
    if num in PeriodDict:
        return PeriodDict[num]
    return num

@register.filter
def keyvalue(dict, key):
    return dict[key]


@register.filter
def NumberToGrade(NumberValue):

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

    return 'NA'


@register.filter
def NumberToGradeClass(NumberValue):

    return NumberToGrade(NumberValue).replace('-', '-Minus').replace('+', '-Plus')


@register.filter
def TeamBackgroundFontColor(BackgroundColor):
    R = int(BackgroundColor[:2], 16)
    G = int(BackgroundColor[2:4], 16)
    B = int(BackgroundColor[4:6], 16)

    Luma = (0.299 * (R**2) + 0.587 * (G**2) + 0.114 * (B**2)) ** .5
    if Luma > 200:
        return "000"

    return "FFF"


@register.filter
def TeamSecondaryColor(SecondaryColor):
    R = int(SecondaryColor[:2], 16)
    G = int(SecondaryColor[2:4], 16)
    B = int(SecondaryColor[4:6], 16)

    Luma = (0.299 * (R**2) + 0.587 * (G**2) + 0.114 * (B**2)) ** .5
    if Luma > 230:
        return "000"

    return SecondaryColor

@register.filter
def TeamBackgroundFontColorBlack(BackgroundColor):
    R = int(BackgroundColor[:2], 16)
    G = int(BackgroundColor[2:4], 16)
    B = int(BackgroundColor[4:6], 16)

    Luma = (0.299 * (R**2) + 0.587 * (G**2) + 0.114 * (B**2)) ** .5
    if Luma > 200:
        return "000"

    return BackgroundColor
