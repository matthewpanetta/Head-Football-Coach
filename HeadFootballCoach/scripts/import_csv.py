from ..models import TeamSeasonInfoRating, RecruitingPromise, ConferenceSeason, DivisionSeason, TeamInfoTopic, SubPosition,TeamSeason, System_PlayerArchetypeRatingModifier, CoachPosition, Class, Phase,Position, PositionGroup,Bowl, Week, Audit, TeamRivalry, NameList, System_PlayoffRound, GameStructure, League,  System_PlayoffGame, World, Region, State, City, League, Headline, Playoff, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, LeagueSeason, Calendar, GameEvent, PlayerTeamSeasonSkill
import os
from ..utilities import Max, WeightedProbabilityChoice
from datetime import timedelta, date
import random
import time

def IntOrZero(s):

    if s == '':
        return 0
    else:
        return int(s)



def LoadPlayerSkillModifiers(FilePath):

    f = open(FilePath, 'r', encoding='utf-8-sig')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = []

        KeepRow = True


        if KeepRow:

            for FE in FieldExclusions:
                del LineDict[FE]

            LineDict['PositionID'] = Position.objects.filter(PositionAbbreviation = LineDict['Position']).first()

            System_PlayerArchetypeRatingModifier.objects.create(**LineDict)

def LoadGameStructures():

    FilePath = 'HeadFootballCoach/scripts/data_import/GameStructure.csv'

    f = open(FilePath, 'r', encoding='utf-8-sig')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = []

        KeepRow = True


        if KeepRow:

            for FE in FieldExclusions:
                del LineDict[FE]

            GameStructure.objects.create(**LineDict)


def ImportBowls(WorldID):

    FilePath = 'HeadFootballCoach/scripts/data_import/Bowl.csv'

    f = open(FilePath, 'r', encoding='utf-8-sig')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = []

        KeepRow = True


        if KeepRow:
            LineDict['WorldID'] = WorldID
            for FE in FieldExclusions:
                del LineDict[FE]

            Bowl.objects.create(**LineDict)


def ImportTeamInfoTopics():

    FilePath = 'HeadFootballCoach/scripts/data_import/TeamInfoTopic.csv'

    f = open(FilePath, 'r')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = []

        KeepRow = True


        if KeepRow:
            for FE in FieldExclusions:
                del LineDict[FE]

            TeamInfoTopic.objects.create(**LineDict)



def ImportPositions():

    FilePath = 'HeadFootballCoach/scripts/data_import/Position.csv'

    f = open(FilePath, 'r', encoding='utf-8-sig')
    NameStartStopTracker = 0
    FieldExclusions = ['PositionGrouping', 'FK_CoachPositionAbbreviation']
    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1


        KeepRow = True


        if KeepRow:

            OccuranceModifier = 1
            if int(LineDict['Occurance']) == 0:
                OccuranceModifier = 0

            LineDict['RandomStart'] = NameStartStopTracker
            NameStartStopTracker += int(LineDict['Occurance']) + OccuranceModifier
            LineDict['RandomStop'] = NameStartStopTracker - OccuranceModifier

            LineDict['PositionGroupID'], created = PositionGroup.objects.get_or_create(PositionGroupName = LineDict['PositionGrouping'])
            LineDict['CoachPositionID'] = CoachPosition.objects.get(CoachPositionAbbreviation = LineDict['FK_CoachPositionAbbreviation'])

            for FE in FieldExclusions:
                del LineDict[FE]

            Position.objects.create(**LineDict)


def ImportSubPositions():

    FilePath = 'HeadFootballCoach/scripts/data_import/SubPosition.csv'

    f = open(FilePath, 'r', encoding='utf-8-sig')
    NameStartStopTracker = 0
    FieldExclusions = ['FK_PositionAbbreviation']
    linecount = 0
    for line in f:
        print(line)
        KeepRow = False
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1


        KeepRow = True


        if KeepRow:
            LineDict['PositionID'] = Position.objects.get(PositionAbbreviation = LineDict['FK_PositionAbbreviation'])

            for FE in FieldExclusions:
                del LineDict[FE]

            SubPosition.objects.create(**LineDict)


def ImportRecruitingPromise():

    FilePath = 'HeadFootballCoach/scripts/data_import/RecruitingPromise.csv'

    TeamInfoTopicDict = {}
    for TIT in TeamInfoTopic.objects.all():
        TeamInfoTopicDict[TIT.AttributeName] = TIT


    RecruitingPromise_ToCreate = []

    f = open(FilePath, 'r', encoding='utf-8-sig')
    FieldExclusions = ['FK_TeamInfoTopic_AttributeName']
    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            #print('Headers:', Headers)
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        KeepRow = True

        if KeepRow:
            if LineDict['FK_TeamInfoTopic_AttributeName'] is not None:
                LineDict['TeamInfoTopicID'] = TeamInfoTopicDict[LineDict['FK_TeamInfoTopic_AttributeName']]

            for FE in FieldExclusions:
                del LineDict[FE]

            RecruitingPromiseObj = RecruitingPromise(**LineDict)
            RecruitingPromise_ToCreate.append(RecruitingPromiseObj)

    RecruitingPromise.objects.bulk_create(RecruitingPromise_ToCreate)

def ImportCoachPositions():

    FilePath = 'HeadFootballCoach/scripts/data_import/CoachPosition.csv'

    f = open(FilePath, 'r', encoding='utf-8-sig')
    FieldExclusions = ['FK_CoachPositionParentAbbreviation']
    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            #print('Headers:', Headers)
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        KeepRow = True

        if KeepRow:
            if LineDict['FK_CoachPositionParentAbbreviation'] is not None:
                LineDict['CoachPositionParentID'] = CoachPosition.objects.get(CoachPositionAbbreviation = LineDict['FK_CoachPositionParentAbbreviation'])

            for FE in FieldExclusions:
                del LineDict[FE]

            CoachPos = CoachPosition(**LineDict)
            CoachPos.save()



def ImportClasses():

    FilePath = 'HeadFootballCoach/scripts/data_import/Class.csv'
    FieldExclusions = []
    f = open(FilePath, 'r', encoding='utf-8-sig')
    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1


        KeepRow = True


        if KeepRow:
            for FE in FieldExclusions:
                del LineDict[FE]

            Class.objects.create(**LineDict)


def import_TeamRivalries(FilePath, WorldID, LeagueID):

    f = open(FilePath, 'r', encoding='utf-8-sig')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {'WorldID': WorldID}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = ['Team1Name', 'Team2Name']

        Team1Options = Team.objects.filter(WorldID = WorldID, TeamName = LineDict['Team1Name'])
        Team2Options = Team.objects.filter(WorldID = WorldID, TeamName = LineDict['Team2Name'])

        if Team1Options.count() > 0 and Team2Options.count() > 0:
            KeepRow = True
            LineDict['Team1TeamID'] = Team1Options.first()
            LineDict['Team2TeamID'] = Team2Options.first()

        if KeepRow:

            for FE in FieldExclusions:
                del LineDict[FE]

            TeamRivalry.objects.create(**LineDict)


def LoadNames(FilePath):

    f = open(FilePath, 'r', encoding='utf-8-sig')

    NameToSave = []
    linecount = 0
    NameStartStopTracker = {'1': 0, '0': 0}
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0


        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V.strip()
            FieldCount +=1

        FieldExclusions = []
        IsFirstName = LineDict['IsFirstName']
        LineDict['RandomStart'] = NameStartStopTracker[IsFirstName]
        NameStartStopTracker[IsFirstName] += int(LineDict['Occurance']) + 1
        LineDict['RandomStop'] = NameStartStopTracker[IsFirstName] - 1

        for FE in FieldExclusions:
            del LineDict[FE]

        NameToSave.append(NameList(**LineDict))

    NameList.objects.bulk_create(NameToSave)

def PopulateSystemPlayoffRounds():

    if System_PlayoffRound.objects.all().count() == 0:
        RoundList = [1,2,3,4,5,6,7]

        PlayoffMaxGameNumber = 1

        for Round in RoundList:
            MinGameNumber = 2 ** (Round-1)
            MaxGameNumber = (2 ** Round) - 1
            NumberOfGames = MaxGameNumber - MinGameNumber + 1
            NumberOfTeams = NumberOfGames * 2

            PlayoffMaxGameNumber = Max(MaxGameNumber, PlayoffMaxGameNumber)

            RoundDict = {'PlayoffRoundNumber': Round, 'MinGameNumber': MinGameNumber, 'MaxGameNumber': MaxGameNumber, 'NumberOfGames': NumberOfGames, 'NumberOfTeams': NumberOfTeams}

            if Round == 1:
                RoundDict['IsChampionshipRound'] = True
            TR = System_PlayoffRound(**RoundDict)
            TR.save()

            for GameNumber in range(MinGameNumber, MaxGameNumber + 1):
                PlayoffGameNumberInRound = (GameNumber-(2 ** (Round - 1))) + 1
                ThisPlayoffRoundID = TR
                NextPlayoffRoundID = TR.NextRound
                if NextPlayoffRoundID is not None:
                    NextPlayoffGameNumberInRound = int((GameNumber- (2 ** (TR.NextRound.PlayoffRoundNumber)))/2) + 1
                    NextPlayoffGameID = System_PlayoffGame.objects.filter(ThisPlayoffRoundID = TR.NextRound).filter( PlayoffGameNumberInRound = NextPlayoffGameNumberInRound).first()
                else:
                    NextPlayoffGameNumberInRound = None
                    NextPlayoffGameID = None

                GameDict = {'GameNumber': GameNumber, 'PlayoffGameNumberInRound': PlayoffGameNumberInRound,'ThisPlayoffRoundID': ThisPlayoffRoundID, 'NextPlayoffRoundID': NextPlayoffRoundID, 'NextPlayoffGameNumberInRound': NextPlayoffGameNumberInRound, 'NextPlayoffGameID': NextPlayoffGameID}

                TG = System_PlayoffGame(**GameDict)
                TG.save()

    else:
        return None


def createGeography(StateFile, inputFile, CountData):

    #Region.objects.all().delete()

    StateDict = {}

    f2 = open(StateFile, 'r')

    linecount = 0
    for l2 in f2:
        linecount +=1
        FieldCount = 0
        if linecount == 1:
            #print('header row')
            headers = l2.strip().split(',')

        else:
            LineDict2 = {}
            data2 = l2.strip().split(',')
            for field in data2:
                LineDict2[headers[FieldCount]] = data2[FieldCount]
                FieldCount +=1

            print(LineDict2)
            StateName = LineDict2['StateName']
            StateAbbreviation = LineDict2['StateAbbreviation']
            RegionName = LineDict2['RegionName']
            SVGPath = LineDict2['SVGPath']

            RegionID, cr = Region.objects.get_or_create(RegionName=RegionName)
            print('RegionID', RegionID)
            StateID, cr = State.objects.get_or_create(StateName = StateName, RegionID = RegionID, StateAbbreviation=StateAbbreviation, SVGPath = SVGPath)

            StateDict[StateName] = StateID

    f2.close()
    print('StateDict', StateDict)
    CityCountData = {}

    f2 = open(CountData, 'r')

    linecount = 0
    for l2 in f2:
        linecount +=1
        FieldCount = 0
        if linecount == 1:
            #print('header row')
            headers = l2.strip().split(',')

        else:
            LineDict2 = {}
            data2 = l2.strip().split(',')
            for field in data2:
                LineDict2[headers[FieldCount]] = data2[FieldCount]
                FieldCount +=1

            St = LineDict2['StateName']
            Ci = LineDict2['CityName']
            C  = LineDict2['Count']

            if St not in CityCountData:
                CityCountData[St] = {}
            if Ci not in CityCountData[St]:
                CityCountData[St][Ci] = 0
            CityCountData[St][Ci] = C


    f2.close()

    f = open(inputFile, 'r')

    linecount = 0
    CitiesToSave = []
    for l in f:
        #print(linecount, l)
        linecount +=1
        FieldCount = 0
        if linecount == 1:
            #print('header row')
            headers = l.strip().split(',')

        else:
            LineDict = {}
            data = l.strip().split(',')
            for f in data:
                LineDict[headers[FieldCount]] = data[FieldCount]
                FieldCount +=1


            S = StateDict[LineDict['StateName']]
            StateAbbreviation = S.StateAbbreviation

            LineDict['YouthEngagement'] = 1
            if StateAbbreviation in CityCountData:
                if LineDict['CityName'] in CityCountData[StateAbbreviation]:
                    LineDict['YouthEngagement'] += (100 * int(CityCountData[StateAbbreviation][LineDict['CityName']]))

            C = City(CityName = LineDict['CityName'], StateID = S, Population=LineDict['Population'], Latitude=LineDict['Latitude'], Longitude=LineDict['Longitude'], YouthEngagement=LineDict['YouthEngagement'])
            CitiesToSave.append(C)


    City.objects.bulk_create(CitiesToSave, ignore_conflicts=False)

    CityList = City.objects.all().select_related('StateID__RegionID')
    OccuranceCount = 0
    City_ToUpdate = []
    for C in CityList:
        C.Occurance = C.YouthEngagement + C.StateID.YouthEngagement + C.StateID.RegionID.YouthEngagement
        C.RandomStart = OccuranceCount + 1
        C.RandomStop = C.RandomStart + C.Occurance + 1
        City_ToUpdate.append(C)

    City.objects.bulk_update(City_ToUpdate, ['Occurance', 'RandomStart', 'RandomStop'])



def import_League( File, WorldID):
    #print( File)

    f = open(File, 'r')

    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')

        LeagueName = ''

        FieldCount = 0
        for Field in Row:
            if Headers[FieldCount] == 'LeagueName':
                LeagueName = Field
            FieldCount +=1

        CurrLeag = League.objects.filter(LeagueName = LeagueName)
        if CurrLeag.count() > 0:
            continue
        #
        L = League(WorldID = WorldID)
        FieldCount = 0
        for Field in Row:
            #print(Headers[FieldCount], Field )
            FieldValue = Field
            if Headers[FieldCount] == 'LeagueName' and Field in ['NBA']:
                KeepRow = True

            if FieldValue == '':
                FieldValue = None
            setattr(L, Headers[FieldCount], FieldValue)
            FieldCount +=1

        if KeepRow:
            L.save()

def import_Conference(File, WorldID, LeagueID, LeagueSeasonID):

    ConferenceList = LeagueID.ConferenceList
    ConferenceList = ConferenceList.split(',')

    f = open(File, 'r', encoding='utf-8-sig')
    FieldExclusions = []
    ConferencesToCreate = []
    linecount = 0
    for line in f:
        KeepRow = False
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        Row = line.strip().split(',')
        print(line, Row)

        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        if LineDict['ConferenceName'] in ConferenceList:
            LineDict['WorldID'] = WorldID
            LineDict['LeagueID'] = LeagueID

            for FE in FieldExclusions:
                del LineDict[FE]

            C = Conference(**LineDict)

            ConferencesToCreate.append(C)

    Conference.objects.bulk_create(ConferencesToCreate)
    ConferenceSeasonsToCreate = []
    for C in WorldID.conference_set.all():
        CS = ConferenceSeason(ConferenceID = C, LeagueSeasonID = LeagueSeasonID, WorldID = WorldID)
        ConferenceSeasonsToCreate.append(CS)
    ConferenceSeason.objects.bulk_create(ConferenceSeasonsToCreate)


def import_Division(File, WorldID, LeagueID, LeagueSeasonID):

    ConferenceList = ConferenceSeason.objects.filter(WorldID = WorldID).select_related('ConferenceID')
    ConferenceDict = {}

    for CS in ConferenceList:
        ConferenceDict[CS.ConferenceID.ConferenceName]  = CS

    f = open(File, 'r', encoding='utf-8-sig')
    FieldExclusions = ['ConferenceName']
    DivisionSeasonsToCreate = []

    linecount = 0
    for line in f:
        KeepRow = False
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        Row = line.strip().split(',')

        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        if LineDict['ConferenceName'] in ConferenceDict:
            LineDict['WorldID'] = WorldID
            LineDict['LeagueSeasonID'] = LeagueSeasonID
            LineDict['ConferenceSeasonID'] = ConferenceDict[LineDict['ConferenceName']]

            for FE in FieldExclusions:
                del LineDict[FE]

            DS = DivisionSeason(**LineDict)
            DivisionSeasonsToCreate.append(DS)

    DivisionSeason.objects.bulk_create(DivisionSeasonsToCreate)



def import_Team( File, WorldID, LeagueID, CurrentSeason):


    JerseyOptions = {"football": 7, 'football3': 1, 'football4': 1, 'football5': 1}

    TeamInfoFields = ['Team Prestige', 'Facilities', 'Pro Potential', 'Campus Lifestyle', 'Academic Prestige', 'Television Exposure', 'Coach Loyalty', 'Location', 'Championship Contender',]

    f = open(File, 'r', encoding='utf-8-sig')

    DivisionSeasonList = DivisionSeason.objects.filter(WorldID = WorldID).select_related('ConferenceSeasonID', 'ConferenceSeasonID__ConferenceID', )

    ConferenceDict = {}
    for DS in DivisionSeasonList:
        if DS.ConferenceSeasonID.ConferenceID.ConferenceName not in ConferenceDict:
            ConferenceDict[DS.ConferenceSeasonID.ConferenceID.ConferenceName] = {}

        ConferenceDict[DS.ConferenceSeasonID.ConferenceID.ConferenceName][DS.DivisionName] = DS

    TeamDict = {}
    TeamInfoDict = {}
    TeamsToCreate = []
    linecount = 0
    for line in f:
        KeepRow = False
        #print()
        linecount +=1
        if linecount == 1:
            Headers = line.strip().split(',')
            continue

        #print(line)
        Row = line.strip().split(',')
        LineDict = {}
        FieldCount = 0

        for f in Row:
            V = Row[FieldCount]
            if V == '':
                V = None
            LineDict[Headers[FieldCount]] = V
            FieldCount +=1

        FieldExclusions = ['City', 'State', 'LeagueName', 'Country', 'DivisionName', 'ConferenceName', 'DivisionSeasonID','Team Prestige', 'Facilities', 'Campus Lifestyle', 'Academic Prestige', 'Television Exposure', 'Coach Loyalty', 'Location', 'Championship Contender', 'ConferenceID', 'Pro Potential']

        if LineDict['ConferenceName'] in ConferenceDict:
            KeepRow = True
            LineDict['DivisionSeasonID'] = ConferenceDict[LineDict['ConferenceName']][LineDict['DivisionName']]

        if LineDict['TeamColor_Primary_HEX'] is None:
            LineDict['TeamColor_Primary_HEX'] = '000000'
        elif len(LineDict['TeamColor_Primary_HEX']) < 6:
            s = ['0'] * (6 - len(LineDict['TeamColor_Primary_HEX']))
            LineDict['TeamColor_Primary_HEX'] = ''.join(s) + LineDict['TeamColor_Primary_HEX']

        if LineDict['TeamColor_Secondary_HEX'] is None:
            LineDict['TeamColor_Secondary_HEX'] = '000000'
        elif len(LineDict['TeamColor_Secondary_HEX']) < 6:
            s = ['0'] * (6 - len(LineDict['TeamColor_Secondary_HEX']))
            LineDict['TeamColor_Secondary_HEX'] = ''.join(s) + LineDict['TeamColor_Secondary_HEX']


        if KeepRow:
            #print(LineDict)
            CityList = City.objects.filter(CityName = LineDict['City']).filter( StateID__StateName = LineDict['State'])
            CityToPopulate = None
            if len(CityList) == 1:
                CityToPopulate = CityList[0]
            LineDict['CityID'] = CityToPopulate
            LineDict['WorldID'] = WorldID
            LineDict['TeamJerseyStyle'] = WeightedProbabilityChoice(JerseyOptions, 'football')
            #LineDict['TeamJerseyInvert'] = random.choice([True, False,False,False,False])

            Name = LineDict['TeamName'] + ' ' + LineDict['TeamNickname']
            NameAdjusted = Name.lower().replace(' ', '_').replace('\'', '').replace('.','').replace('&','_')
            URL = '/static/img/TeamLogos/' + NameAdjusted + '.png'
            URL_50 = '/static/img/TeamLogos/' + NameAdjusted + '_50.png'
            URL_100 = '/static/img/TeamLogos/' + NameAdjusted + '_100.png'
            LineDict['TeamLogoURL'] = URL
            LineDict['TeamLogoURL_50'] = URL_50
            LineDict['TeamLogoURL_100'] = URL_100
            LineDict['LeagueID'] = LeagueID

            print('\nLineDict', LineDict)

            TeamDict[LineDict['TeamName']] = LineDict.copy()
            TeamInfoDict[LineDict['TeamName']] = {}

            for F in TeamInfoFields:
                TeamInfoDict[LineDict['TeamName']][F] = LineDict[F]

            for FE in FieldExclusions:
                if FE in LineDict:
                    del LineDict[FE]


            TeamsToCreate.append(Team(**LineDict))

    Team.objects.bulk_create(TeamsToCreate)

    CurrentWorld = WorldID
    ListOfTeams = Team.objects.filter(WorldID = CurrentWorld).values('TeamName', 'TeamID')
    CurrentSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 1)

    FieldExclusions = ['Country','LeagueID', 'CityID','TeamJerseyStyle',  'TeamLogoURL','TeamLogoURL_50', 'TeamLogoURL_100', 'TeamColor_Primary_HEX', 'TeamColor_Secondary_HEX', 'TeamJerseyInvert', 'ConferenceName','ConferenceID', 'DivisionName', 'DefaultOffensiveScheme', 'DefaultDefensiveScheme','TeamTalent',   'TeamName', 'TeamNickname', 'LeagueName', 'Abbreviation', 'City', 'State'] + TeamInfoFields

    TS_ToSave = []
    for u in ListOfTeams:
        LineDict = TeamDict[u['TeamName']]
        LineDict['LeagueSeasonID'] = CurrentSeason
        LineDict['TeamID_id'] = u['TeamID']

        print('LineDict', LineDict)

        for FE in FieldExclusions:
            if FE in LineDict:
                del LineDict[FE]

        obj = TeamSeason(**LineDict)
        TS_ToSave.append(obj)

    obj = TeamSeason(WorldID=WorldID, LeagueSeasonID = CurrentSeason, IsFreeAgentTeam = True)
    TS_ToSave.append(obj)
    obj = TeamSeason(WorldID=WorldID, LeagueSeasonID = CurrentSeason, IsRecruitTeam = True)
    TS_ToSave.append(obj)

    TeamSeason.objects.bulk_create(TS_ToSave, ignore_conflicts=False)
    TeamSeasonList = TeamSeason.objects.filter(WorldID = CurrentWorld).filter(TeamID__isnull = False).values('TeamSeasonID', 'TeamID', 'TeamID__TeamName')

    TeamInfoTopics = TeamInfoTopic.objects.all().values('AttributeName', 'TeamInfoTopicID')
    TopicDict = {}
    for TIT in TeamInfoTopics:
        TopicDict[TIT['AttributeName']] = TIT['TeamInfoTopicID']

    print('TopicDict', TopicDict)
    TeamSeasonInfoRating_ToSave = []
    for TS in TeamSeasonList:
        Ratings = TeamInfoDict[TS['TeamID__TeamName']]
        for F in Ratings:
            TIT = TopicDict[F]
            TSIR = TeamSeasonInfoRating(WorldID = CurrentWorld, TeamInfoTopicID_id = TIT, TeamRating = Ratings[F], TeamSeasonID_id = TS['TeamSeasonID'])
            TeamSeasonInfoRating_ToSave.append(TSIR)

    TeamSeasonInfoRating.objects.bulk_create(TeamSeasonInfoRating_ToSave)

    CurrentSeason.TeamSeasonsCreated = True
    CurrentSeason.save()

    WorldID.HasTeams = True
    WorldID.save()


def delete_All_Teams():
    Team.objects.all().delete()

def delete_All_Games():
    Game.objects.all().delete()

def delete_All_Players():
    Player.objects.all().delete()


def delete_All_Coaches():
    Coach.objects.all().delete()

def reset_Date(d):

    #print(d)

    CurrentDate = Calendar.objects.get(IsCurrent = 1)
    CurrentDate.IsCurrent = 0
    CurrentDate.save()

    CurrentDate = Calendar.objects.get(Date = d)
    CurrentDate.IsCurrent = 1
    CurrentDate.save()

    CurrentSeason = LeagueSeason.objects.get(IsCurrent = 1)
    CurrentSeason.PlayersCreated = False
    CurrentSeason.CoachesCreated = False
    CurrentSeason.ScheduleCreated = False
    CurrentSeason.TeamSeasonsCreated = False
    CurrentSeason.PlayoffCreated = False
    CurrentSeason.save()

    Playoff.objects.all().delete()

    for u in [c for u in Calendar.objects.filter(BroadcastSelected = True)]:
        u.BroadcastSelected = False
        u.save()

    Headline.objects.all().delete()


def LoadData(WorldID, LeagueID, LeagueSeasonID):

    print('RUNNING IMPORT CSV')
    #

    DoAudit = True

    if DoAudit:
        start = time.time()

    DeleteAppData = False
    ResetDate = False
    CreateCalendar = not WorldID.HasCalendar
    CreateGeography = not WorldID.HasGeography
    CreateTeams =  World.HasTeams

    PopulateSystemPlayoffRounds()
    ImportBowls(WorldID)

    if RecruitingPromise.objects.all().count() == 0:
        ImportRecruitingPromise()

    if CoachPosition.objects.all().count() == 0:
        ImportCoachPositions()

    if Position.objects.all().count() == 0:
        SubPosition.objects.all().delete()
        ImportPositions()
        ImportSubPositions()

    if Class.objects.all().count() == 0:
        ImportClasses()

    if TeamInfoTopic.objects.all().count() == 0:
        ImportTeamInfoTopics()

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Initialize data import')
    if DoAudit:
        start = time.time()

    if DeleteAppData:
        delete_All_Players()
        delete_All_Teams()
        delete_All_Games()
        delete_All_Coaches()
    if ResetDate:
        reset_Date('2019-08-25', WorldID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Delete all old data')
    if DoAudit:
        start = time.time()

    if NameList.objects.count() == 0:
        LoadNames( 'HeadFootballCoach/scripts/data_import/Names.csv')

    if System_PlayerArchetypeRatingModifier.objects.count() == 0:
        LoadPlayerSkillModifiers('HeadFootballCoach/scripts/data_import/PlayerSkillModifiers.csv')

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Load Names')
    if DoAudit:
        start = time.time()


    if CreateGeography:
        createGeography('HeadFootballCoach/scripts/data_import/State.csv','HeadFootballCoach/scripts/data_import/uscitiesv1.5.csv', 'HeadFootballCoach/scripts/data_import/RecruitingData/Cities.csv')
    #import_League('FullCourtHeadFootballCoach/scripts/data_import/League.csv')

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Import geo data')
    if DoAudit:
        start = time.time()

    if CreateTeams:
        import_Conference('HeadFootballCoach/scripts/data_import/Conference.csv', WorldID, LeagueID, LeagueSeasonID)
        import_Division('HeadFootballCoach/scripts/data_import/Division.csv', WorldID, LeagueID, LeagueSeasonID)
        import_Team('HeadFootballCoach/scripts/data_import/Team.csv', WorldID, LeagueID, LeagueSeasonID)
        import_TeamRivalries('HeadFootballCoach/scripts/data_import/TeamRivals.csv', WorldID, LeagueID)

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Import team data')

def ExtractData():
    ExportNames = False
    if ExportNames:
        f = open('HeadFootballCoach/scripts/data_import/NameList.csv', 'w')
        BoolMap = {True: '1', False: '0'}
        L = 'Name,IsFirstName,IsLastName,Occurance\n'
        f.write(L)

        for N in NameList.objects.all().values('Name', 'IsFirstName', 'IsLastName', 'Occurance'):

            L = N['Name'] + ','+BoolMap[N['IsFirstName']]+','+BoolMap[N['IsLastName']]+','+str(N['Occurance'])
            f.write(L)
            f.write("\n")#LoadData()
