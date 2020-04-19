

from ..models import SubPosition, System_PlayerArchetypeRatingModifier, CoachPosition, Class, Phase,Position, PositionGroup,Bowl, Week, Audit, TeamRivalry, NameList, System_PlayoffRound, GameStructure, League,  System_PlayoffGame, World, Region, Nation, State, City, League, Headline, Playoff, Coach, Driver, Team, Player, Game,PlayerTeamSeason, Conference, TeamConference, LeagueSeason, Calendar, GameEvent, PlayerSeasonSkill
import os
from ..utilities import Max
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

            print(LineDict)
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

        NameList.objects.create(**LineDict)

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


def createGeography(inputFile, CountData):

    #Region.objects.all().delete()

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

    for u in sorted(CityCountData):
        print(u, CityCountData[u])

    f2.close()

    f = open(inputFile, 'r')

    linecount = 0
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

            if int(LineDict['GeoLevel']) == 4:
                #print('Region!')

                R = Region( RegionName = LineDict['RegionName'], RegionAbbreviation=LineDict['RegionAbbreviation'], YouthEngagement=0)
                R.save()
            elif int(LineDict['GeoLevel']) == 3:
                #print('Nation!')

                R = Region.objects.get(RegionName = LineDict['RegionName'])

                N = Nation( NationName = LineDict['NationName'], NationAbbreviation=LineDict['NationAbbreviation'], RegionID = R, YouthEngagement=0)
                N.save()
            elif int(LineDict['GeoLevel']) == 2:
                #print('State!')

                N = Nation.objects.get(NationName = LineDict['NationName'])

                S = State( StateName = LineDict['StateName'], StateAbbreviation=LineDict['StateAbbreviation'], NationID = N, YouthEngagement=0)
                S.save()
                print('Creating State-', LineDict['StateName'])
            elif int(LineDict['GeoLevel']) == 1:

                S = State.objects.get(StateName = LineDict['StateName'])

                LineDict['YouthEngagement'] = 1
                if LineDict['StateAbbreviation'] in CityCountData:
                    if LineDict['CityName'] in CityCountData[LineDict['StateAbbreviation']]:
                        LineDict['YouthEngagement'] += (100 * int(CityCountData[LineDict['StateAbbreviation']][LineDict['CityName']]))

                C = City(CityName = LineDict['CityName'], StateID = S, Population=LineDict['Population'], Latitude=LineDict['Latitude'], Longitude=LineDict['Longitude'], YouthEngagement=LineDict['YouthEngagement'])
                C.save()
                C.Set_Occurance()


    #print(headers)

def createCalendar(StartYear=2019, StartAfterMonthDay=(8,25), WorldID=None, LeagueSeasonID=None):

    #Calendar.objects.all().delete()

    print('StartYear', StartYear,'StartAfterMonthDay', StartAfterMonthDay)
    SD = date(StartYear, StartAfterMonthDay[0], StartAfterMonthDay[1])

    WeeksInRegularSeason = 15
    AnnualScheduleOfEvents = [
        {'Phase': 'Preseason', 'WeekNumber': 0, 'WeekName': 'Preseason', 'LastWeekInPhase': True},
    ]
    for WeekCount in range(1, WeeksInRegularSeason+1):
        WeekDict = {'Phase': 'Regular Season', 'WeekNumber': WeekCount, 'WeekName': 'Week ' + str(WeekCount), 'LastWeekInPhase': False}
        if WeekCount == WeeksInRegularSeason:
            WeekDict['LastWeekInPhase'] = True
        AnnualScheduleOfEvents.append(WeekDict)

    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Conference Championships', 'WeekNumber': WeekCount, 'WeekName': 'Conference Championship Week', 'LastWeekInPhase': True})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Bowls', 'WeekNumber': WeekCount, 'WeekName': 'Bowl Season', 'LastWeekInPhase': True})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Season Recap', 'WeekNumber': WeekCount, 'WeekName': 'Season Recap', 'LastWeekInPhase': True})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Coach Carousel', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Draft Departures', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Transfer Announcements', 'LastWeekInPhase': False})

    for u in range(0,4):
        WeekCount += 1
        AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Recruiting Week ' + str(WeekCount), 'LastWeekInPhase': False})

    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'National Signing Day', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Prepare for Summer Camps', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Training Results', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Cut Players', 'LastWeekInPhase': False})
    WeekCount += 1
    AnnualScheduleOfEvents.append({'Phase': 'Offseason', 'WeekNumber': WeekCount, 'WeekName': 'Advance to Next Season', 'LastWeekInPhase': True})


    WeeksToSave = []
    PhaseList = []
    FieldExclusions = ['Phase']
    WeekCount = 1
    W = None
    for W in AnnualScheduleOfEvents:

        P,st = Phase.objects.get_or_create(WorldID = WorldID, PhaseName = W['Phase'], LeagueSeasonID=LeagueSeasonID)

        W['PhaseID'] = P
        for FE in FieldExclusions:
            del W[FE]

        if W['WeekNumber'] == 0:
            W['IsCurrent'] = True
        W['WorldID'] = WorldID
        NewWeek = Week(**W)
        WeeksToSave.append(NewWeek)

    Week.objects.bulk_create(WeeksToSave)

    WorldID.HasCalendar = True
    WorldID.save()


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

def import_Conference(File, WorldID, LeagueID):

    ConferenceList = LeagueID.ConferenceList
    ConferenceList = ConferenceList.split(',')

    f = open(File, 'r', encoding='utf-8-sig')
    FieldExclusions = []

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

            Conference.objects.create(**LineDict)


def import_Team( File, WorldID, LeagueID):


    JerseyOptions = ["football"]

    f = open(File, 'r', encoding='utf-8-sig')

    ConferenceList = LeagueID.ConferenceList
    ConferenceList = ConferenceList.split(',')


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

        FieldExclusions = ['City', 'State', 'LeagueName', 'Country', 'ConferenceName']

        if LineDict['ConferenceName'] in ConferenceList:
            KeepRow = True
            LineDict['ConferenceID'] = Conference.objects.get(WorldID=WorldID, LeagueID = LeagueID, ConferenceName = LineDict['ConferenceName'])

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
            LineDict['TeamJerseyStyle'] = JerseyOptions[0]
            #LineDict['TeamJerseyInvert'] = random.choice([True, False,False,False,False])

            Name = LineDict['TeamName'] + ' ' + LineDict['TeamNickname']
            NameAdjusted = Name.lower().replace(' ', '_').replace('\'', '').replace('.','').replace('&','_')
            URL = '/static/img/TeamLogos/' + NameAdjusted + '.png'
            LineDict['TeamLogoURL'] = URL
            LineDict['LeagueID'] = LeagueID

            for FE in FieldExclusions:
                del LineDict[FE]


            #for K in LineDict:
                #print(K, LineDict[K])

                #setattr(T, K, LineDict[K])
            Team.objects.create(**LineDict)

            #T.save()

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


def LoadData(WorldID, LeagueID):

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

    if CoachPosition.objects.all().count() == 0:
        ImportCoachPositions()

    if Position.objects.all().count() == 0:
        SubPosition.objects.all().delete()
        ImportPositions()
        ImportSubPositions()

    if Class.objects.all().count() == 0:
        ImportClasses()

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
        createGeography('HeadFootballCoach/scripts/data_import/uscitiesv1.5.csv', 'HeadFootballCoach/scripts/data_import/RecruitingData/Cities.csv')
    #import_League('FullCourtHeadFootballCoach/scripts/data_import/League.csv')

    if DoAudit:
        end = time.time()
        TimeElapsed = end - start
        A = Audit.objects.create(TimeElapsed = TimeElapsed, AuditVersion = 1, AuditDescription='Import geo data')
    if DoAudit:
        start = time.time()

    if CreateTeams:
        import_Conference('HeadFootballCoach/scripts/data_import/Conference.csv', WorldID, LeagueID)
        import_Team('HeadFootballCoach/scripts/data_import/Team.csv', WorldID, LeagueID)
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
