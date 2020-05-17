from ..models import PlayerTeamSeasonAward, Team, Position,Phase,TeamSeasonStrategy, Class, RecruitTeamSeason, Conference, PositionGroup, Week, Player, Game, Calendar, PlayerTeamSeason, GameEvent, PlayerTeamSeasonSkill, LeagueSeason, TeamSeason, CoachTeamSeason, Driver, Coach, PlayerGameStat, World
from django.db.models import Max, Avg, Count, Func, F, Sum, Case, When, FloatField, CharField, Value
import random
from ..resources import createCalendar, UpdateTeamPositions, CreateSchedule, CreateRecruitingClass, PopulateTeamDepthCharts, AssignRedshirts, CutPlayers, ChooseTeamCaptains, CalculateTeamOverall, CalculateRankings, CalculateConferenceRankings, SelectBroadcast, SelectPreseasonAllAmericans
from ..utilities import Max_Int, NormalTrunc, IfNull



def TrainingCamps(CurrentSeason, WorldID):

    PlayersToUpgrade = PlayerTeamSeason.objects.filter(TeamSeasonID__TeamID__isnull = False).filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).select_related('playerteamseasonskill').select_related('PlayerID')


    print('Players to update skills: ', PlayersToUpgrade.count())
    SkillsToUpdate = [field.name for field in PlayerTeamSeasonSkill._meta.get_fields() if '_Rating' in field.name ]
    print('Updating these skills:', SkillsToUpdate)
    PlayerTeamSeasonSkills_ToSave = []
    for PTS in PlayersToUpgrade:
        PTSS = PTS.playerteamseasonskill

        PlayerDev = PTS.PlayerID.DevelopmentRating
        Sigma = (IfNull(PlayerDev, 0) + 4) ** (1.0/1.25)

        for Skill in SkillsToUpdate:
            CurrentVal = getattr(PTSS, Skill)
            UpdatedVal = round(NormalTrunc(CurrentVal, Sigma, CurrentVal, 99),0)
            setattr(PTSS, Skill, UpdatedVal)

        PlayerTeamSeasonSkills_ToSave.append(PTSS)

    print('Players to update skills: ', len(PlayerTeamSeasonSkills_ToSave))
    PlayerTeamSeasonSkill.objects.bulk_update(PlayerTeamSeasonSkills_ToSave, SkillsToUpdate)


def StartCoachingCarousel(CurrentSeason = None, WorldID=None):

    #Coach retires = Coaches older than 60
        #
    #Free agent coaches = Coach where CTS DNE for next season
    #Open jobs =
    #Coach being hired away -> delete existing CTS for next season, create new CTS for next season

    CurrentWorld = CurrentSeason.WorldID

    NextLeagueSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 0, LeagueID=CurrentSeason.LeagueID, SeasonStartYear = CurrentSeason.SeasonEndYear)

    OldCoaches = Coach.objects.filter(CoachAge__gte = 60)
    CoachesToSave = []
    CoachTeamSeasonsToSave = []
    for C in []:#OldCoaches:
        RetireProb = ((C.CoachAge - 60) / 20.0)
        if random.uniform(0,1) < RetireProb:
            print('Retiring', C)
            C.IsActiveCoach = False
            CoachesToSave.append(C)

            CTS = C.CurrentCoachTeamSeason
            CTS.RetiredAfterSeason = True
            CoachTeamSeasonsToSave.append(CTS)

    Coach.objects.bulk_update(CoachesToSave, ['IsActiveCoach'])
    CoachTeamSeason.objects.bulk_update(CoachTeamSeasonsToSave, ['RetiredAfterSeason'])

    ActiveCoaches = Coach.objects.filter(coachteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).annotate(
        TeamPrestige = F('coachteamseason__TeamSeasonID__TeamPrestige'),
        TeamWins = F('coachteamseason__TeamSeasonID__Wins'),
    ).filter(IsActiveCoach = True)

    GoodPerformingCoaches = ActiveCoaches#.filter(TeamPrestige__lt = (F('TeamWins') + 1) * 10)
    #PoorPerformingCoaches = ActiveCoaches.exclude(TeamPrestige__lt = (F('TeamWins') + 1) * 10)

    print('GoodPerformingCoaches', GoodPerformingCoaches)

    CTSToSave = []
    for C in GoodPerformingCoaches:
        TS = C.CurrentCoachTeamSeason.TeamSeasonID.NextTeamSeasonID
        CurrentCTS = C.coachteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        CTS = CoachTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, CoachID = C, CoachPositionID = CurrentCTS.CoachPositionID)
        CTSToSave.append(CTS)


    CoachTeamSeasonsToSave = []

    for C in []:#PoorPerformingCoaches:
        print('Firing ', C)
        CTS = C.CurrentCoachTeamSeason
        CTS.FiredAfterSeason = True
        CoachTeamSeasonsToSave.append(CTS)

    CoachTeamSeason.objects.bulk_update(CoachTeamSeasonsToSave, ['RetiredAfterSeason'])
    CoachTeamSeason.objects.bulk_create(CTSToSave)

    CoachesToSave = []
    for C in OldCoaches:#OldCoaches:
        C.IsActiveCoach = False
        CoachesToSave.append(C)

    Coach.objects.bulk_update(CoachesToSave, ['IsActiveCoach'])



    TSSToSave = []
    for TS in TeamSeason.objects.filter(TeamID__isnull = False).filter(WorldID_id = WorldID):
        HC = Coach.objects.filter(coachteamseason__TeamSeasonID = TS).values().first()
        TSS = TeamSeasonStrategy(TeamSeasonID = TS, WorldID_id = WorldID)

        FieldExclusions = ['TeamSeasonID', 'TeamSeasonStrategyID', 'WorldID']
        for HC_Key in [field.name for field in TeamSeasonStrategy._meta.get_fields()]:
            if HC_Key not in FieldExclusions:
                setattr(TSS, HC_Key, HC[HC_Key])

        TSSToSave.append(TSS)
    TeamSeasonStrategy.objects.bulk_create(TSSToSave)


    return None

def GraduateSeniors(CurrentSeason = None, WorldID = None):

    CurrentWorld = CurrentSeason.WorldID

    NextLeagueSeason = LeagueSeason.objects.get(WorldID = CurrentWorld, IsCurrent = 0, LeagueID=CurrentSeason.LeagueID, SeasonStartYear = CurrentSeason.SeasonEndYear)

    PlayerList = list(Player.objects.filter(WorldID = CurrentWorld).filter(playerteamseason__TeamSeasonID__LeagueSeasonID__IsCurrent = True).filter(playerteamseason__ClassID__IsRecruit = False).exclude(playerteamseason__ClassID__ClassName = 'Graduate'))
    Classes = Class.objects.filter(IsRecruit = False).order_by('-ClassSortOrder')

    ClassDict = {}
    PrevClass = None
    for C in Classes:
        ClassDict[C] = PrevClass
        PrevClass = C

    PToSave = []
    PTSToSave = []
    PTSToUpdate = []
    PTSSkill_ToSave = []

    for P in PlayerList:

        PTS = P.CurrentPlayerTeamSeason
        OldClassID = PTS.ClassID

        if not PTS.RedshirtedThisSeason:
            NewClassID = ClassDict[OldClassID]
        else:
            NewClassID = OldClassID

        if NewClassID.ClassName !=  'Graduate':
            if PTS is not None:
                TS = PTS.TeamSeasonID.NextTeamSeasonID
                CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
                PTS = PlayerTeamSeason(WorldID=CurrentWorld, TeamSeasonID = TS, PlayerID = P, ClassID = NewClassID)
                PTS.save()

                CurrentPTSS = CurrentPTS.playerteamseasonskill
                PTSS = CurrentPTSS
                PTSS.PlayerTeamSeasonSkillID = None
                PTSS.PlayerTeamSeasonID = PTS
                PTSSkill_ToSave.append(PTSS)

        else:
            CurrentPTS = P.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
            if CurrentPTS is not None:
                CurrentPTS.LeavingTeamAfterSeason = True
                CurrentPTS.GraduatedAfterSeason = True
                PTSToUpdate.append(CurrentPTS)

    PlayerTeamSeason.objects.bulk_update(PTSToUpdate, ['GraduatedAfterSeason', 'LeavingTeamAfterSeason'])
    PlayerTeamSeason.objects.bulk_create(PTSToSave)
    PlayerTeamSeasonSkill.objects.bulk_create(PTSSkill_ToSave)


def PrepForSeason(CurrentSeason,WorldID, CurrentWeek):
    LS = CurrentSeason

    print('PrepForSeason(CurrentSeason,WorldID, CurrentWeek)', CurrentSeason,WorldID, CurrentWeek)

    UpdateTeamPositions(LS, WorldID)
    CreateSchedule(LS, WorldID)
    CreateRecruitingClass(LS, WorldID)
    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=True)
    AssignRedshirts(LS, WorldID)
    CutPlayers(LS, WorldID)
    PopulateTeamDepthCharts(LS, WorldID, FullDepthChart=False)
    ChooseTeamCaptains(LS, WorldID)
    CalculateTeamOverall(LS, WorldID)
    CalculateRankings(LS, WorldID, CurrentWeek)
    CalculateConferenceRankings(LS, WorldID, CurrentWeek)
    SelectBroadcast(LS, WorldID, CurrentWeek)
    SelectPreseasonAllAmericans(WorldID, LS)

def RolloverNewLeagueSeason(CurrentSeason,WorldID):

    CurrentSeason.IsCurrent = False
    CurrentSeason.save()

    NextLeagueSeason = CurrentSeason.NextLeagueSeason
    NextLeagueSeason.IsCurrent = True
    NextLeagueSeason.save()

    SignedRecruitTeamSeasons = RecruitTeamSeason.objects.filter(TeamSeasonID__LeagueSeasonID = CurrentSeason).filter(Signed = True)

    PlayerTeamSeasonSkills_ToSave = []
    Players_ToSave = []
    FreshmanClassID = Class.objects.filter(ClassAbbreviation = 'FR').first()
    for RTS in SignedRecruitTeamSeasons:

        P = RTS.PlayerTeamSeasonID.PlayerID
        PlayerDict = {'WorldID': RTS.WorldID, 'PlayerID': RTS.PlayerTeamSeasonID.PlayerID, 'TeamSeasonID': RTS.TeamSeasonID.NextTeamSeasonID, 'ClassID': FreshmanClassID}
        PlayerTeamSeasonID = PlayerTeamSeason(**PlayerDict)
        PlayerTeamSeasonID.save()

        P.IsRecruit = False
        Players_ToSave.append(P)


        PTSS = RTS.PlayerTeamSeasonID.playerteamseasonskill

        PTSS.PlayerTeamSeasonID = PlayerTeamSeasonID
        PTSS.PlayerTeamSeasonSkillID = None
        PlayerTeamSeasonSkills_ToSave.append(PTSS)

    Player.objects.bulk_update(Players_ToSave, ['IsRecruit'])
    PlayerTeamSeasonSkill.objects.bulk_create(PlayerTeamSeasonSkills_ToSave)


    return None

def CreateNextLeagueSeason(CurrentSeason = None, WorldID = None):

    CurrentLeagueSeason = CurrentSeason
    CurrentLeagueSeason.OffseasonStarted = True
    CurrentLeagueSeason.save()
    CurrentWorld = CurrentLeagueSeason.WorldID

    LS = LeagueSeason(WorldID = CurrentWorld, LeagueID=CurrentLeagueSeason.LeagueID, IsCurrent = False, SeasonStartYear = CurrentLeagueSeason.SeasonEndYear, SeasonEndYear = CurrentLeagueSeason.SeasonEndYear + 1)
    LS.save()

    TSToSave = []
    for TS in CurrentLeagueSeason.teamseason_set.all():
        NewTS = TeamSeason(WorldID=CurrentWorld, TeamID = TS.TeamID, LeagueSeasonID = LS, ConferenceID=TS.ConferenceID, IsRecruitTeam=TS.IsRecruitTeam, IsFreeAgentTeam=TS.IsFreeAgentTeam, TeamPrestige=TS.TeamPrestige, FacilitiesRating=TS.FacilitiesRating, ProPotentialRating=TS.ProPotentialRating, CampusLifestyleRating=TS.CampusLifestyleRating, AcademicPrestigeRating=TS.AcademicPrestigeRating, TelevisionExposureRating=TS.TelevisionExposureRating, CoachStabilityRating=TS.CoachStabilityRating, ChampionshipContenderRating=TS.ChampionshipContenderRating, LocationRating=TS.LocationRating)

        TSToSave.append(NewTS)
        print('Creating new Team Season!', LS, NewTS)

    TeamSeason.objects.bulk_create(TSToSave, ignore_conflicts = True)

    createCalendar(WorldID=CurrentWorld, LeagueSeasonID=LS, SetFirstWeekCurrent = False)

    LS.TeamSeasonsCreated = True
    LS.save()


    return None
