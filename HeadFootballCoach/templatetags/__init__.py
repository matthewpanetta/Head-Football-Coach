from math import ceil, floor
import json
import itertools

def TierPlacement(Tiers = 5, PopulationSize = 100, Distribution = 'Normal', RankPlace = 1):
    TierList = range(1,Tiers+1)
    TierDict = {Tier: {'Start': None, 'Stop': None, 'SegmentSize': None, 'SegmentRatio': None, 'PopulationCount': None} for Tier in TierList}

    MiddleTier = int(Tiers / 2) + 1
    TotalSegmentSize = 0
    Placement = 1

    PreviousStop = 0

    if Distribution == 'Normal':
        for Tier in TierDict:
            TierObj = TierDict[Tier]
            TierObj['SegmentSize'] = MiddleTier - abs(MiddleTier - Tier)
            TotalSegmentSize += MiddleTier - abs(MiddleTier - Tier)

            TierObj['SegmentSize']

    elif Distibution == 'Uniform':
        for Tier in TierDict:
            print(Tier)


    for Tier in TierDict:
        TierObj = TierDict[Tier]
        TierObj['SegmentRatio'] = TierObj['SegmentSize']*1.0 / TotalSegmentSize
        TierObj['PopulationCount'] = floor(TierObj['SegmentRatio']* PopulationSize)

        TierObj['Start'] = PreviousStop + 1
        TierObj['Stop'] = TierObj['Start']  + TierObj['PopulationCount']
        PreviousStop = TierObj['Stop']

        if RankPlace >= TierObj['Start'] and RankPlace <= TierObj['Stop']:
            Placement = Tier

    print(f'RankPlace {RankPlace} Placement {Placement}', json.dumps(TierDict, indent=2))
    #print(f'RankPlace {RankPlace} Placement {Placement}')

    return int(Placement)


# Objs = []
# groups={}
# for u in range(101):
#     Objs.append({'Key': u, 'G': int(u/10)})
#
#
# key_func = lambda x: x['G']
# for k, g in itertools.groupby(Objs, key_func):
#     groups[k] = list(g)
#
# print(json.dumps(groups, indent=2))
