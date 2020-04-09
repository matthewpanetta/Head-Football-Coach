from django import template

register = template.Library()

@register.filter
def modulo(num, val):
    return num % val


@register.filter
def PeriodMap(num):
    PeriodDict = {
        5: 'OT'
    }
    if num in PeriodDict:
        return PeriodDict[num]
    return num

@register.filter
def keyvalue(dict, key):
    return dict[key]
