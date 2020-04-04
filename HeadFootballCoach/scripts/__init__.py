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
#
# def WriteListOfDictsToFile(List, FileName):
#     f = open(FileName, 'w')
#     FirstElement = List[0]
#     Keys = []
#     S = ''
#     for K in FirstElement:
#         Keys.append(K)
#         S += K+','
#     S += '\n'
#     f.write(S)
#
#
#     for O in List:
#         S = ''
#         for K in Keys:
#             S += str(O[K]) + ','
#         S += '\n'
#         f.write(S)
#     f.close()
#
# import glob
# import json
# from ..models import System_PlayerArchetypeRatingModifier, Audit, TeamRivalry, NameList, System_TournamentRound, GameStructure, League,  System_TournamentGame, World, Region, Nation, State, City, League, Headline, Tournament, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill
#
#
# AllRecruits = []
# RecruitKeys = {}
# HighSchools = {}
# PassedHighSchools = {}
# StatesAndCities = {}
# CityList = []
# NotFoundCityList = []
# for filename in glob.glob('./HeadFootballCoach/scripts/data_import/RecruitingData/*.json'):
#     f = open(filename, 'r')
#
#     with f as json_file:
#         data = json.load(json_file)
#         for r in data:
#             AllRecruits.append(r)
#
# for r in AllRecruits:
#     #print(r)
#     a = 1
#
# Count = 0
# for r in AllRecruits:
#     HS = r['highSchool']
#     if len(HS) == 0 or HS.count(',') != 1:
#         if HS not in PassedHighSchools:
#             PassedHighSchools[HS] = 0
#         PassedHighSchools[HS] +=1
#         continue
#     HS = HS.replace('(', '<<>>').replace(')', '<<>>')
#     HSSplit = HS.split('<<>>')
#
#     HS = HSSplit[-2]
#
#
#     if HS not in HighSchools:
#         HighSchools[HS] = 0
#     HighSchools[HS] += (1 * int(r['stars']))
#
#     GeoSplit = HS.split(',')
#     Ci = GeoSplit[0].strip()
#     St = GeoSplit[1].strip()
#
#     if St not in StatesAndCities:
#         StatesAndCities[St] = {}
#     if Ci not in StatesAndCities[St]:
#         StatesAndCities[St][Ci] = 0
#     StatesAndCities[St][Ci] +=1
#
#
#     Count +=1
#
#
# for HS in HighSchools:
#     #print(HS, HighSchools[HS])
#     continue
#
# f2 = open('./HeadFootballCoach/scripts/data_import/RecruitingData/Output.txt', 'w')
#
# for St in StatesAndCities:
#     StateObj = State.objects.filter(StateAbbreviation = St).first()
#     if StateObj is None:
#         print('Could not find ', St, ' in State list')
#         continue
#     for Ci in StatesAndCities[St]:
#         CityObj = City.objects.filter(StateID = StateObj).filter(CityName = Ci).first()
#         if CityObj is None and StatesAndCities[St][Ci] > 0:
#             print('Could not find ', Ci, ',', St,' in City List - accounting for :', StatesAndCities[St][Ci])
#             NotFoundCityList.append({'CityName': Ci, 'StateName': St, 'Count': StatesAndCities[St][Ci]})
#         else:
#             CityList.append({'CityName': Ci, 'StateName': St, 'Count': StatesAndCities[St][Ci]})
#
#
# CityList = sorted(CityList, key=lambda k: k['Count'], reverse=True)
# WriteListOfDictsToFile( CityList, './HeadFootballCoach/scripts/data_import/RecruitingData/Cities.csv')
#
# NotFoundCityList = sorted(NotFoundCityList, key=lambda k: k['Count'], reverse=True)
# WriteListOfDictsToFile( NotFoundCityList, './HeadFootballCoach/scripts/data_import/RecruitingData/CitiesNotFound.csv')
#
# for C in CityList:
#     continue
#     print(C)
#
# NotFoundCityList = sorted(NotFoundCityList, key=lambda k: k['Count'], reverse=False)
# for C in NotFoundCityList:
#     continue
#     print(C)
#
#
# import glob
# import json
# from ..models import System_PlayerArchetypeRatingModifier, Audit, TeamRivalry, NameList, System_TournamentRound, GameStructure, League,  System_TournamentGame, World, Region, Nation, State, City, League, Headline, Tournament, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill
#
#
# AllRecruits = []
# FullNames = {}
# RejectedNames = []
# FirstNameList = {}
# LastNameList = {}
# for filename in glob.glob('./HeadFootballCoach/scripts/data_import/RecruitingData/*.json'):
#     f = open(filename, 'r')
#
#     with f as json_file:
#         data = json.load(json_file)
#         for r in data:
#             AllRecruits.append(r)
#
# for r in AllRecruits:
#     #print(r)
#     a = 1
#
# Count = 0
# for r in AllRecruits:
#     Name = r['name'].replace(' II', '').replace(' III', '').replace(' Jr.', '').replace(' Jr', '').replace(' IV', '')
#     if Name.count(' ') != 1:
#         RejectedNames.append(Name)
#
#     else:
#
#         NameSplit = Name.split(' ')
#         FirstName = NameSplit[0]
#         LastName  = NameSplit[1]
#         if FirstName not in FirstNameList:
#             FirstNameList[FirstName] = 0
#         FirstNameList[FirstName] +=1
#
#         if LastName not in LastNameList:
#             LastNameList[LastName] = 0
#         LastNameList[LastName] +=1
#
#     Count +=1
#
# f = open('./HeadFootballCoach/scripts/data_import/Names.csv', 'w')
# f.write('Name,IsFirstName,IsLastName,Occurance\n')
# for FN in FirstNameList:
#     f.write(FN+',1,0,'+str(FirstNameList[FN])+'\n')
# for LN in LastNameList:
#     f.write(LN+',0,1,'+str(LastNameList[LN])+'\n')
# f.close()

from ..utilities import NormalVariance

ResultDict = {}
TotalRuns = 1000
for u in range(0,TotalRuns):
    r = NormalVariance(1.0,7)
    if r not in ResultDict:
        ResultDict[r] = 0
    ResultDict[r] +=1

for u in sorted(ResultDict):
    print(u, ResultDict[u] / TotalRuns)
