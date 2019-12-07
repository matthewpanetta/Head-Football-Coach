print('------------------------------------------------')
# import os
# cwd = os.getcwd()
# print('Current folder-', cwd)
# print('Loading rivalries')
#
# f = open('./HeadFootballCoach/scripts/data_import/RivalsRaw.csv', 'r')
# w = open('./HeadFootballCoach/scripts/data_import/TeamRivals.csv', 'w')
#
# RivalList = {}
#
# LineCount = 0
# for l in f:
#     print(l)
#     l = l.strip()
#     if LineCount == 0:
#         Headers = l.split(',')
#
#     else:
#         Values = l.split(',')
#
#         BaseTeam = Values[0]
#
#
#         for RivalTeam in [u for u in Values[1:] if len(u) > 0]:
#             print(BaseTeam, RivalTeam)
#             RivalCombo = [BaseTeam, RivalTeam]
#             RivalCombo = sorted(RivalCombo)
#
#             if RivalCombo[0] not in RivalList:
#                 RivalList[RivalCombo[0]] = []
#
#             if RivalCombo[1] not in RivalList[RivalCombo[0]]:
#                 RivalList[RivalCombo[0]].append(RivalCombo[1])
#
#
#     LineCount +=1
#
# for Team in RivalList:
#     if len(RivalList[Team]) == 0:
#         continue
#     for Rival in RivalList[Team]:
#         w.write(Team + ',' + Rival + '\n')
#
# w.close()
