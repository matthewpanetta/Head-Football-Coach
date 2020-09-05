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

# from .PickName import FullNameList
# from django.db import connection, reset_queries
#
# reset_queries()
#
# TotalRuns = 10
# print(FullNameList(TotalRuns))
# print('Total queries:', len(connection.queries))

print()

#
# from ..models import Team
# import pandas as pd
# from django.db.models import Max, Min, Avg, Count, Func, F
#
# TeamList = list(Team.objects.filter(WorldID_id = 292).annotate(AdjustedTeamPrestige=(F('TeamPrestige')/10)**4))
# TeamDict = {}
# for T in TeamList:
#     TeamDict[T] = {'TeamPrestige': T.AdjustedTeamPrestige, 'PlayerCount': 0, 'StopNumber': None, 'Top100':0, 'Top250': 0, 'Top500': 0, 'Top1000': 0}
#
# NumberOfPlayers = 22
#
# DraftOrder = []
# for u in range(10000):
#     T = [(T, TeamDict[T]['TeamPrestige']) for T in TeamDict if TeamDict[T]['PlayerCount'] < NumberOfPlayers]
#     if len(T) == 0:
#         break
#     SelectedTeam = WeightedProbabilityChoice(T, T[0])
#     TeamDict[SelectedTeam]['PlayerCount'] +=1
#     if TeamDict[SelectedTeam]['PlayerCount'] >= NumberOfPlayers:
#         TeamDict[SelectedTeam]['StopNumber'] = u
#
#     DraftOrder.append(SelectedTeam)
#
#     if u <= 100:
#         TeamDict[SelectedTeam]['Top100'] +=1
#     if u <= 250:
#         TeamDict[SelectedTeam]['Top250'] +=1
#     if u <= 500:
#         TeamDict[SelectedTeam]['Top500'] +=1
#     if u <= 1000:
#         TeamDict[SelectedTeam]['Top1000'] +=1
#
#
#
# pd.set_option('display.max_rows', None)
#
# df = pd.DataFrame(TeamDict)
# df = df.transpose()
# print(df)


#
# from PIL import Image
#
# import glob
# image_list = []
# for filename in glob.glob('/Users/tom.kennedy/Documents/TK/GitFolders/HeadFootballCoachProject/HeadFootballCoach/static/img/TeamLogos/*.png'): #assuming gif
#     print(filename)
#     image = Image.open(filename)
#
#     for image_size in [50,100]:
#         new_image = image.resize((image_size, image_size))
#         new_image.save(filename.replace('.png', '_'+str(image_size)+'.png'))


# from ..utilities import NormalVariance
# import json
#
# ResultDict = {}
# for u in range(30):
#     Result = NormalVariance(1.0, Segments = 13, Floor = 1, Spread = 5)
#     if Result not in ResultDict:
#         ResultDict[Result] = 0
#     ResultDict[Result] += 1
# print(json.dumps(ResultDict, indent = 2))
#
#
#
#
#


# print()


PossibleRange = range(0,10)

ResultDict = {
    'Tie': 0,
    'Joint': 0,
    'Split': 0
}

for Sample in range(0,1000):
    JointStart = 0



    SplitStart = 0
