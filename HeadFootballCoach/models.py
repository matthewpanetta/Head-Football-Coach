from django.db import models
from django.db.models import F, Case, When, Sum, FloatField, Func, Value, CharField, IntegerField, Avg, Count, ExpressionWrapper
from django.db.models.functions import  Concat, Round
from django.utils.timezone import now
import random
import time
from django.db.models import Max
from django.shortcuts import get_object_or_404
from .utilities import GetValuesOfObject,NormalTrunc, MapNumberValuesToLetterGrade, Average, UniformTwoDecimals, WeightedProbabilityChoice, SecondsToMinutes
# Create your models here.


class Round(Func):
  function = 'ROUND'
  arity = 2

#####  CONSTRAINTS   ########

def HundredRange(value):
    if value > 100:
        raise ValidationError(
            ('Cannot insert value > 100'),
            params={'value': value},
        )
    if value < 0:
        raise ValidationError(
            ('Cannot insert value < 0'),
            params={'value': value},
        )


class System_PlayoffRound(models.Model):
    PlayoffRoundID = models.AutoField(primary_key = True)
    PlayoffRoundNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    MinGameNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    MaxGameNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    NumberOfGames = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    NumberOfTeams = models.PositiveSmallIntegerField(blank=True, null=True, default=None)

    IsChampionshipRound = models.BooleanField(default = False)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'
    def __str__(self):

        return 'Round ' + str(self.PlayoffRoundNumber) + ' in Playoff, with ' + str(self.NumberOfGames) + ' games'

    @property
    def NextRound(self):
        return System_PlayoffRound.objects.filter(PlayoffRoundNumber = self.PlayoffRoundNumber - 1).first()

class System_PlayoffGame(models.Model):
    PlayoffGameID = models.AutoField(primary_key = True)

    ThisPlayoffRoundID = models.ForeignKey(System_PlayoffRound, on_delete=models.CASCADE,related_name="ThisPlayoffRoundID"  )

    NextPlayoffRoundID = models.ForeignKey(System_PlayoffRound, on_delete=models.CASCADE,related_name="NextPlayoffRoundID" ,blank=True, null=True, default=None )
    NextPlayoffGameID = models.ForeignKey('self',on_delete=models.CASCADE,blank=True, null=True, default=None)

    GameNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    PlayoffGameNumberInRound = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    NextPlayoffGameNumberInRound = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'
    def __str__(self):
        return 'Game number ' + str(self.GameNumber) + ' in Playoff, in round ' + str(self.ThisPlayoffRoundID.PlayoffRoundNumber)

class Class(models.Model):
    ClassID = models.AutoField(primary_key = True)
    ClassAbbreviation = models.CharField(max_length=6, blank=True, null=True, default=None)
    ClassName = models.CharField(max_length=20, blank=True, null=True, default=None)

    IsRecruit = models.BooleanField(default=False)
    IsUpperClassman = models.BooleanField(default=False)

    ClassSortOrder = models.PositiveSmallIntegerField(blank=True, null=True, default=0)

    def __str__(self):

        return self.ClassAbbreviation

class CoachPosition(models.Model):
    CoachPositionID = models.AutoField(primary_key = True)
    CoachPositionAbbreviation = models.CharField(max_length=6, blank=True, null=True, default=None)
    CoachPositionName = models.CharField(max_length=20, blank=True, null=True, default=None)

    CoachPositionCountPerTeam = models.PositiveSmallIntegerField(blank=True, null=True, default=0)

    CoachPositionSortOrder = models.PositiveSmallIntegerField(blank=True, null=True, default=0)

    CoachPositionParentID = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, default=None)

    IsHeadCoach = models.BooleanField(default = False)
    IsCoordinator = models.BooleanField(default = False)
    IsPositionCoach = models.BooleanField(default = False)

    def __str__(self):
        return self.CoachPositionName
    #############################


class PositionGroup(models.Model):
    PositionGroupID = models.AutoField(primary_key = True)
    PositionGroupName = models.CharField(max_length=20, blank=True, null=True, default=None)

class Position(models.Model):
    PositionID = models.AutoField(primary_key = True)
    PositionAbbreviation = models.CharField(max_length=6, blank=True, null=True, default=None)
    PositionName = models.CharField(max_length=20, blank=True, null=True, default=None)

    PositionCountPerAwardTeam   = models.PositiveSmallIntegerField(blank=True, null=True, default=0)
    PositionMinimumCountPerTeam = models.PositiveSmallIntegerField(blank=True, null=True, default=0)
    PositionMaximumCountPerTeam = models.PositiveSmallIntegerField(blank=True, null=True, default=0)
    PositionTypicalStarterCountPerTeam = models.PositiveSmallIntegerField(blank=True, null=True, default=0)

    PositionGroupID = models.ForeignKey(PositionGroup, on_delete=models.CASCADE, null=True, blank=True, default=None)
    CoachPositionID = models.ForeignKey(CoachPosition, on_delete=models.CASCADE, null=True, blank=True, default=None)

    PositionSortOrder = models.PositiveSmallIntegerField(blank=True, null=True, default=0)

    HeightAverage = models.DecimalField(default = 72, max_digits = 6, decimal_places=2)
    HeightStd = models.DecimalField(default = 1, max_digits = 6, decimal_places=2)
    WeightAverage = models.DecimalField(default = 200, max_digits = 6, decimal_places=2)
    WeightStd = models.DecimalField(default = 10, max_digits = 6, decimal_places=2)

    Occurance = models.IntegerField( blank=True, null=True)

    RandomStart = models.IntegerField(blank=True, null=True)
    RandomStop   = models.IntegerField(blank=True, null=True)


    Strength_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    Agility_Rating_Base              = models.FloatField(default=0, blank=True, null=True)
    Speed_Rating_Base                = models.FloatField(default=0, blank=True, null=True)
    Acceleration_Rating_Base         = models.FloatField(default=0, blank=True, null=True)
    Stamina_Rating_Base              = models.FloatField(default=0, blank=True, null=True)
    Awareness_Rating_Base            = models.FloatField(default=0, blank=True, null=True)
    Jumping_Rating_Base              = models.FloatField(default=0, blank=True, null=True)
    Injury_Rating_Base               = models.FloatField(default=0, blank=True, null=True)
    ThrowPower_Rating_Base           = models.FloatField(default=0, blank=True, null=True)
    ShortThrowAccuracy_Rating_Base   = models.FloatField(default=0, blank=True, null=True)
    MediumThrowAccuracy_Rating_Base  = models.FloatField(default=0, blank=True, null=True)
    DeepThrowAccuracy_Rating_Base    = models.FloatField(default=0, blank=True, null=True)
    ThrowOnRun_Rating_Base           = models.FloatField(default=0, blank=True, null=True)
    ThrowUnderPressure_Rating_Base   = models.FloatField(default=0, blank=True, null=True)
    PlayAction_Rating_Base           = models.FloatField(default=0, blank=True, null=True)
    Elusiveness_Rating_Base          = models.FloatField(default=0, blank=True, null=True)
    BallCarrierVision_Rating_Base    = models.FloatField(default=0, blank=True, null=True)
    JukeMove_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    BreakTackle_Rating_Base          = models.FloatField(default=0, blank=True, null=True)
    Carrying_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    Catching_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    CatchInTraffic_Rating_Base       = models.FloatField(default=0, blank=True, null=True)
    RouteRunning_Rating_Base     = models.FloatField(default=0, blank=True, null=True)
    Release_Rating_Base              = models.FloatField(default=0, blank=True, null=True)
    HitPower_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    Tackle_Rating_Base               = models.FloatField(default=0, blank=True, null=True)
    PassRush_Rating_Base           = models.FloatField(default=0, blank=True, null=True)
    BlockShedding_Rating_Base        = models.FloatField(default=0, blank=True, null=True)
    Pursuit_Rating_Base              = models.FloatField(default=0, blank=True, null=True)
    PlayRecognition_Rating_Base      = models.FloatField(default=0, blank=True, null=True)
    ManCoverage_Rating_Base          = models.FloatField(default=0, blank=True, null=True)
    ZoneCoverage_Rating_Base         = models.FloatField(default=0, blank=True, null=True)
    Press_Rating_Base                = models.FloatField(default=0, blank=True, null=True)
    PassBlock_Rating_Base            = models.FloatField(default=0, blank=True, null=True)
    RunBlock_Rating_Base             = models.FloatField(default=0, blank=True, null=True)
    ImpactBlock_Rating_Base          = models.FloatField(default=0, blank=True, null=True)
    KickPower_Rating_Base            = models.FloatField(default=0, blank=True, null=True)
    KickAccuracy_Rating_Base         = models.FloatField(default=0, blank=True, null=True)
    KickReturn_Rating_Base           = models.FloatField(default=0, blank=True, null=True)

    def __str__(self):
        return self.PositionName
    #############################

    @property
    def OccurancePercent(self):
        OC = Position.objects.all().aggregate(OccuranceSum=Sum(F('Occurance')))
        return (self.Occurance / OC['OccuranceSum']) * 70



class System_PlayerArchetypeRatingModifier(models.Model):
    System_PlayerArchetypeRatingModifierID = models.AutoField(primary_key=True)
    PositionID  = models.ForeignKey(Position, on_delete=models.CASCADE, null=True, blank=True, default=None )
    Position  = models.CharField(max_length=10, default=None, blank=True, null=True)
    Archetype = models.CharField(max_length=30, default=None, blank=True, null=True)

    Strength_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Agility_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Speed_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Acceleration_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Stamina_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Awareness_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Jumping_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowPower_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ShortThrowAccuracy_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    MediumThrowAccuracy_Rating  = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    DeepThrowAccuracy_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowOnRun_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowUnderPressure_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PlayAction_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Elusiveness_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BallCarrierVision_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    JukeMove_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BreakTackle_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Carrying_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Catching_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    CatchInTraffic_Rating       = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    #ShortRouteRunning_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    #MediumRouteRunning_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    #DeepRouteRunning_Rating     = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    RouteRunning_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Release_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    HitPower_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Tackle_Rating               = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PassRush_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BlockShedding_Rating        = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Pursuit_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PlayRecognition_Rating      = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ManCoverage_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ZoneCoverage_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Press_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PassBlock_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    RunBlock_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ImpactBlock_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickPower_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickAccuracy_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickReturn_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)



class SubPosition(models.Model):
    SubPositionID = models.AutoField(primary_key = True)
    PositionID = models.ForeignKey(Position, on_delete=models.CASCADE, null=True, blank=True, default=None)

    SubPositionAbbreviation = models.CharField(max_length=6, blank=True, null=True, default=None)
    SubPositionName = models.CharField(max_length=20, blank=True, null=True, default=None)
    SubPositionSortOrder = models.PositiveSmallIntegerField(blank=True, null=True, default=0)
    PositionTypicalStarterCountPerTeam = models.PositiveSmallIntegerField(blank=True, null=True, default=0)
    def __str__(self):
        return self.SubPositionName
    #############################

class User(models.Model):
    UserID = models.AutoField(primary_key = True)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class World(models.Model):
    WorldID = models.AutoField(primary_key = True, db_index=True)
    UserID = models.ForeignKey(User, on_delete=models.CASCADE )
    IsCurrentWorld = models.BooleanField(default=True)
    IsActive = models.BooleanField(default=True)

    HasPlayers   = models.BooleanField(default=False)
    HasTeams     = models.BooleanField(default=False)
    HasCalendar  = models.BooleanField(default=False)
    HasGeography = models.BooleanField(default=False)
    HasGameStructures = models.BooleanField(default=False)

    AllowInterruptions = models.BooleanField(default=True)
    @property
    def UserTeam(self):
        T = Team.objects.filter(WorldID = self).filter( IsUserTeam = True).first()
        return T

    @property
    def CurrentDate(self):
        C = Calendar.objects.get(WorldID = self, IsCurrent = True)
        return C

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class NameList(models.Model):
    NameID = models.AutoField(primary_key = True)
    Name = models.CharField(max_length = 30, default='N')
    IsFirstName = models.BooleanField(default=False)
    IsLastName = models.BooleanField(default=False)

    RandomStart = models.IntegerField(blank=True, null=True)
    RandomStop   = models.IntegerField(blank=True, null=True)

    Occurance = models.PositiveSmallIntegerField(default = 1)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'
    def __str__(self):
        return self.Name

class Region(models.Model):
    RegionID = models.AutoField(primary_key=True)
    RegionName = models.CharField(max_length=30, default = 'Region Name')
    RegionAbbreviation = models.CharField(max_length = 4, default='RN')

    YouthEngagement = models.IntegerField(default = 0)

    def __str__(self):
        return 'Region: ' + self.RegionName
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'
    @property
    def TotalYouthEngagement(self):
        YouthEngagementIntValue = int(self.YouthEngagement)
        return YouthEngagementIntValue

class Nation(models.Model):
    NationID = models.AutoField(primary_key = True)
    NationName = models.CharField(max_length = 30, default='Nation Name')
    NationAbbreviation = models.CharField(max_length = 4, default='NN')

    RegionID = models.ForeignKey(Region, on_delete=models.CASCADE, null=True, blank=True)

    YouthEngagement = models.IntegerField(default = 0)

    #Ethnicities
    PercentWhite = models.PositiveSmallIntegerField(default = 20,validators=[HundredRange])
    PercentBlack = models.PositiveSmallIntegerField(default = 20,validators=[HundredRange])
    PercentAsian = models.PositiveSmallIntegerField(default = 20,validators=[HundredRange])
    PercentIndian = models.PositiveSmallIntegerField(default = 20,validators=[HundredRange])
    PercentLatin = models.PositiveSmallIntegerField(default = 20,validators=[HundredRange])

    def __str__(self):
        return 'Nation: ' + self.NationName

    @property
    def TotalYouthEngagement(self):
        YouthEngagementIntValue = int(self.YouthEngagement) + int(self.RegionID.TotalYouthEngagement)
        return YouthEngagementIntValue
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class State(models.Model):
    StateID = models.AutoField(primary_key = True)
    StateName = models.CharField(max_length = 30, default='State Name')
    StateAbbreviation = models.CharField(max_length = 4, default='SN')

    YouthEngagement = models.IntegerField(default = 0)

    NationID = models.ForeignKey(Nation, on_delete=models.CASCADE)

    def __str__(self):
        return 'State: ' + self.StateName

    @property
    def TotalYouthEngagement(self):
        YouthEngagementIntValue = int(self.YouthEngagement) + int(self.NationID.TotalYouthEngagement)
        return YouthEngagementIntValue
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class City(models.Model):
    CityID = models.AutoField(primary_key = True, db_index=True)
    CityName = models.CharField(max_length = 40, default='City Name')

    StateID = models.ForeignKey(State, on_delete=models.CASCADE)

    Population = models.IntegerField(default=0)
    YouthEngagement = models.IntegerField(default = 0)

    Latitude = models.DecimalField(default = 0, max_digits = 15, decimal_places=5)
    Longitude = models.DecimalField(default = 0, max_digits = 15, decimal_places=5)

    Occurance = models.IntegerField( blank=True, null=True)

    RandomStart = models.IntegerField(blank=True, null=True)
    RandomStop   = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return self.CityName + ', ' + self.StateID.StateName + ', ' + self.StateID.NationID.NationAbbreviation

    @property
    def TotalYouthEngagement(self):
        YouthEngagementIntValue = int(self.YouthEngagement) + int(self.StateID.TotalYouthEngagement)
        return YouthEngagementIntValue

    def Set_Occurance(self):

        self.Occurance = int(self.TotalYouthEngagement)
        MaxRandomStop = City.objects.aggregate(Max('RandomStop'))
        if MaxRandomStop['RandomStop__max'] is None:
            MaxRandomStop = 0
        else:
            MaxRandomStop = MaxRandomStop['RandomStop__max']

        self.RandomStart = MaxRandomStop + 1
        self.RandomStop = self.RandomStart + self.Occurance + 1
        self.save()
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class GameStructure(models.Model):
    GameStructureID = models.AutoField(primary_key=True)
    GameStructureName = models.CharField(max_length = 16, default='Standard Pro')
    PeriodCount = models.PositiveSmallIntegerField(default = 4)
    PeriodLength = models.PositiveSmallIntegerField(default = 12)

    OvertimeSettingValue = models.PositiveSmallIntegerField(default=5, blank=True, null=True)

    OVERTIME_CHOICES = [('1','Additional Period'), ('2','First To X'), ('3', 'Win by X')]

    OvertimeType = models.CharField(max_length=19, choices=OVERTIME_CHOICES, default='1')

    def __str__(self):
        return self.GameStructureName +', ' + str(self.PeriodCount) +' periods for ' + str(self.PeriodLength) + ' minutes. Overtime:' + self.OvertimeType
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class League(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    LeagueID = models.AutoField(primary_key=True, db_index=True)
    LeagueName = models.CharField(max_length = 50, default='New League')
    LeagueAbbreviation = models.CharField(max_length = 10, default='NL')
    LeaguePrestige = models.PositiveSmallIntegerField(validators=[HundredRange], default=50)
    GameStructureID = models.ForeignKey(GameStructure, on_delete=models.CASCADE)

    PlayersPerTeam = models.PositiveSmallIntegerField(default = 75)
    MaxSignablePlayersPerTeam = models.PositiveSmallIntegerField(default = 85)


    NumberOfPlayoffTeams = models.PositiveSmallIntegerField(default = 64)
    HomeFieldAdvantage      = models.DecimalField(default=1.02, max_digits=8, decimal_places=5 )
    PlayTimeTalentFactor    = models.DecimalField(default=5.0, max_digits=8, decimal_places=5 )

    PlayClockLength = models.IntegerField(default = 35)
    PeriodLength_Minutes = models.IntegerField(default = 15)
    OvertimeLength_Minutes = models.IntegerField(default=5)

    ConferenceList = models.CharField(default='', max_length=400)

    LeagueLogoURL = models.CharField(max_length = 200, default='')

    LEAGUETYPE_CHOICES = [('1','Pro'), ('2','International'), ('3', 'College'), ('4', 'High School'), ('5', 'International Playoff'), ('6', 'Amateur Playoff')]

    LeagueType = models.CharField(max_length=19, choices=LEAGUETYPE_CHOICES, default='1')
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class LeagueSeason(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    LeagueID = models.ForeignKey(League, on_delete=models.CASCADE, blank=True, null=True, default=None)
    LeagueSeasonID = models.AutoField(primary_key = True, db_index=True)
    SeasonStartYear = models.PositiveSmallIntegerField(default = 0)
    SeasonEndYear = models.PositiveSmallIntegerField(default = 9999)
    IsCurrent = models.BooleanField(default = False, db_index=True)
    ScheduleCreated = models.BooleanField(default=False)
    PlayersCreated  = models.BooleanField(default=False)
    CoachesCreated  = models.BooleanField(default=False)
    TeamSeasonsCreated = models.BooleanField(default=False)
    ConferenceChampionshipsCreated = models.BooleanField(default=False)
    PlayoffCreated = models.BooleanField(default=False)
    AwardsCreated    = models.BooleanField(default=False)
    OffseasonStarted = models.BooleanField(default=False)

    Preseason_UserSetDepthChart  = models.BooleanField(default=False)
    Preseason_UserSetGameplan  = models.BooleanField(default=False)
    Preseason_UserCutPlayers  = models.BooleanField(default=False)
    Preseason_UserSetCaptains  = models.BooleanField(default=False)

    @property
    def LeagueSeasonDisplay(self):
        return str(self.SeasonStartYear) + '-' + str(self.SeasonEndYear) + ' Season'

    @property
    def NextLeagueSeason(self):
        return LeagueSeason.objects.filter(WorldID = self.WorldID).filter(SeasonStartYear = self.SeasonEndYear).first()

    @property
    def PreviousLeagueSeason(self):
        return LeagueSeason.objects.filter(WorldID = self.WorldID).filter(SeasonEndYear = self.SeasonStartYear).first()

    def __str__(self):

        return str(self.SeasonStartYear) + '-' + str(self.SeasonEndYear) + ' Season in World ' + str(self.WorldID)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class Phase(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    PhaseID = models.AutoField(primary_key=True, db_index=True)

    LeagueSeasonID = models.ForeignKey(LeagueSeason, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    PhaseName = models.CharField(max_length=50, blank=True, null=True, default=None)

    def __str__(self):
        return self.PhaseName

    @property
    def NextPhase(self):
        NextPhase = Phase.objects.filter(PhaseID__gt = self.PhaseID).filter(WorldID = self.WorldID).order_by('PhaseID').first()
        return NextPhase

    @property
    def NextPhaseName(self):
        NextPhase = Phase.objects.filter(PhaseID__gt = self.PhaseID).order_by('PhaseID').first()
        if NextPhase is not None:
            return NextPhase.PhaseName
        return ''

class Week(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    WeekID = models.AutoField(primary_key=True, db_index=True)
    PhaseID = models.ForeignKey(Phase, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    WeekNumber = models.SmallIntegerField(default = 0, db_index=True)
    WeekName = models.CharField(max_length=50, blank=True, null=True, default=None)

    IsCurrent = models.BooleanField(default=False)
    BroadcastSelected = models.BooleanField(default=False)

    FirstWeekOfCalendar = models.BooleanField(default = False)
    LastWeekInPhase = models.BooleanField(default = False)

    RecruitingWeekModifier = models.FloatField(default = 1.0)
    RecruitingAllowed = models.BooleanField(default = False)

    def __str__(self):
        return self.WeekName

    @property
    def NextWeek(self):
        NextWeek = Week.objects.filter(WeekNumber = self.WeekNumber + 1).filter(PhaseID__LeagueSeasonID = self.PhaseID.LeagueSeasonID).first()
        if NextWeek is None:
            NextLS = self.PhaseID.LeagueSeasonID.NextLeagueSeason
            NextWeek = Week.objects.filter(PhaseID__LeagueSeasonID = NextLS).order_by('WeekID').first()


        return NextWeek

    @property
    def PreviousWeek(self):
        return Week.objects.filter(WeekNumber = self.WeekNumber - 1).first()

    @property
    def WeeksUntilEndOfSeason(self):
        return Week.objects.filter(WorldID = self.WorldID).filter(PhaseID__PhaseName = 'Regular Season').filter(LastWeekInPhase = True).first().WeekNumber - self.WeekNumber


class Calendar(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    DateID = models.AutoField(primary_key=True, db_index=True)
    Date = models.DateField( db_index=True)
    IsCurrent = models.BooleanField(default = False, db_index=True)

    WeekID = models.ForeignKey(Week, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    BroadcastSelected = models.BooleanField(default=False)


    def __str__(self):

        return str(self.Date)

    def DaysBetween(self, SecondDate):
        return SecondDate.DateID - self.DateID


        #new Date(2015, 0, 1)
    @property
    def JSDateDefinition(self):
        return 'new Date('+str(self.Year) + ', ' + str(self.Month)+ ', '+ str(self.DayOfMonth) + ')'
    @property
    def ShortDisplay(self):
        return str(self.Month) + '/' + str(self.DayOfMonth)

    @property
    def ShortDisplayDayOfWeek(self):
        return self.DayOfWeekNameAbbreviation + ', ' + str(self.MonthNameAbbreviation) + ' ' + str(self.DayOfMonth)
    @property
    def Year(self):
        return self.Date.year
    @property
    def Month(self):
        return self.Date.month
    @property
    def MonthName(self):
        return self.Date.strftime('%B')
    @property
    def MonthNameAbbreviation(self):
        return self.Date.strftime('%b')
    @property
    def DayOfMonth(self):
        return self.Date.day
    @property
    def DayOfWeek(self):
        return self.Date.weekday()
    @property
    def DayOfWeekName(self):
        return self.Date.strftime('%A')
    @property
    def DayOfWeekNameAbbreviation(self):
        return self.Date.strftime('%a')
    @property
    def NextDay(self):
        return Calendar.objects.get(DateID = self.DateID + 1)
    @property
    def DaysToNextMonday(self):
        return 7 - self.DayOfWeek

    def NextDayN(self, N):
        NextDay = Calendar.objects.filter(WorldID = self.WorldID).filter(DateID = self.DateID + N).first()

        if NextDay is None:
            NextDay = Calendar.objects.filter(WorldID = self.WorldID).order_by('DateID').first()
        return NextDay
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class Conference(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    LeagueID = models.ForeignKey(League, on_delete=models.CASCADE, blank=True, null=True, default=None)
    ConferenceID = models.AutoField(primary_key=True, db_index=True)
    ConferenceName = models.CharField(max_length = 40, default='')
    ConferenceAbbreviation = models.CharField(max_length = 10, default='')
    ConferencePrestige = models.PositiveSmallIntegerField(default = 0)
    ConferenceLogoURL = models.CharField(max_length = 99, default=None, null=True, blank=True)

    IsIndependent = models.BooleanField(default = False)
    NumberConferenceGames = models.PositiveSmallIntegerField(default = 8)
    HoldConferenceChampionshipGame = models.BooleanField(default = True)


    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

    def ConferenceStandings(self, Small=True, HighlightedTeams=[], WorldID = None, LeagueSeasonID = None, WeekID = None):

        if WorldID is None:
            WorldID = self.WorldID.WorldID

        RankWeek = WeekID.PreviousWeek

        Standings = TeamSeason.objects.filter(ConferenceID = self).filter(teamseasonweekrank__WeekID = RankWeek).filter(LeagueSeasonID = LeagueSeasonID).values(
            'TeamID__TeamLogoURL_50', 'TeamID__TeamName', 'ConferenceWins', 'ConferenceLosses', 'ConferenceGB', 'ConferenceRank', 'Wins', 'Losses', 'TeamID__TeamLogoURL', 'TeamID', 'TeamID__TeamColor_Primary_HEX'
        ).annotate(
            TeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamID'), output_field=CharField()),
            NationalRank = F('teamseasonweekrank__NationalRank'),
            NationalRankDisplay = Case(
                When(NationalRank__gt = 25, then=Value('')),
                default=Concat(Value('('), F('NationalRank'), Value(')'), output_field=CharField()),
                output_field=CharField()
            ),
            BoldTeam = Case(
                When(TeamID__TeamName__in = HighlightedTeams, then=Value('bold')),
                default=Value(''),
                output_field=CharField()
            ),
        ).order_by('ConferenceRank')

        return Standings

    def __str__(self):
        return self.ConferenceName

class Stadium(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    StadiumID = models.AutoField(primary_key = True, db_index=True)

    CityID = models.ForeignKey(City, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    StadiumName = models.CharField(max_length = 100, blank=True, null=True, default=None)
    StadiumImageURL = models.CharField(max_length = 100, blank=True, null=True, default=None)

    StadiumCapacity = models.IntegerField(default = 0)


class Team(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    LeagueID = models.ForeignKey(League, on_delete=models.CASCADE, blank=True, null=True, default=None)

    TeamID = models.AutoField(primary_key = True, db_index=True)

    StadiumID = models.ForeignKey(Stadium, on_delete=models.CASCADE, blank=True, null=True, default=None)
    CityID = models.ForeignKey(City, on_delete=models.CASCADE, blank=True, null=True, default=None)
    IsUserTeam = models.BooleanField(default=False)
    TeamName = models.CharField(max_length=40)
    TeamNickname = models.CharField(max_length=40)
    Abbreviation = models.CharField(max_length=10, default = '')
    TeamTalent = models.PositiveSmallIntegerField(default = 0)
    TeamLogoURL = models.CharField(max_length = 99, default=None, null=True, blank=True)
    TeamLogoURL_100 = models.CharField(max_length = 99, default=None, null=True, blank=True)
    TeamLogoURL_50 = models.CharField(max_length = 99, default=None, null=True, blank=True)
    TeamColor_Primary_HEX = models.CharField(max_length=6)
    TeamColor_Secondary_HEX = models.CharField(max_length=6)
    TeamJerseyStyle = models.CharField(max_length = 20, default='football')
    TeamJerseyInvert = models.BooleanField( default=False)

    DefaultOffensiveScheme = models.CharField(max_length = 15, blank=True, null=True, default=None)
    DefaultDefensiveScheme = models.CharField(max_length = 15, blank=True, null=True, default=None)


    def __str__(self):
        return self.TeamName + ' ' + self.TeamNickname

    @property
    def LogoURL(self):
        Name = self.TeamName + ' ' + self.TeamNickname
        NameAdjusted = Name.lower().replace(' ', '_').replace('\'', '').replace('.','').replace('&','_')
        URL = '/static/img/TeamLogos/' + NameAdjusted + '.png'
        return URL
    @property
    def TeamHref(self):
        return '/World/' + str(self.WorldID_id) + '/Team/' + str(self.TeamID)
    @property
    def TeamIDURL(self):
        return '/World/' + str(self.WorldID_id) + '/Team/' + str(self.TeamID)
    @property
    def TeamNameAndRecord(self):
        return self.TeamName + ' (' + self.CurrentTeamSeason.TeamRecord + ')'

    @property
    def CurrentTeamSeason(self):
        TS = self.teamseason_set.filter(LeagueSeasonID__IsCurrent = True).first()
        return TS

    @property
    def Name(self):
        return self.TeamName + ' ' + self.TeamNickname
    @property
    def ConferenceName(self):
        return self.CurrentTeamSeason.ConferenceID.ConferenceName

    @property
    def TeamRecord(self):
        CurrentTeamSeason = self.CurrentTeamSeason
        return CurrentTeamSeason.TeamRecord

    @property
    def PlayingTimeValue(self):
        return 50

    @property
    def CoachStyleValue(self):
        return 50

    @property
    def CloseToHomeValue(self):
        return 50

    @property
    def HistoricalTeamWins(self):
        return TeamGame.objects.filter(TeamSeasonID__TeamID = self).filter(IsWinningTeam = True).filter(GameID__WasPlayed=True).count()
    @property
    def HistoricalTeamLosses(self):
        return TeamGame.objects.filter(TeamSeasonID__TeamID = self).filter(IsWinningTeam = False).filter(GameID__WasPlayed=True).count()

    @property
    def luma(self):
        color = self.TeamColor_Secondary_HEX
        R_String = color[0:2]
        G_String = color[2:4]
        B_String = color[4:6]

        luma = 0.2126 * int(R_String, 16) + 0.7152 * int(G_String, 16) + 0.0722 * int(B_String, 16)
        return luma
    @property
    def SecondaryColor_Display(self):

        if self.luma < 225:

            return self.TeamColor_Secondary_HEX
        print('Team secondary color,',self.TeamColor_Secondary_HEX,' too light, sending black instead')
        return '000000'
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'



class TeamRivalry(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    TeamRivalryID = models.AutoField(primary_key = True, db_index=True)

    Team1TeamID = models.ForeignKey(Team, on_delete=models.CASCADE,related_name="Team1", db_index=True  )
    Team2TeamID = models.ForeignKey(Team, on_delete=models.CASCADE,related_name="Team2", db_index=True  )

    RivalryName = models.CharField(max_length = 100, default=None, blank=True, null=True)

    PreferredWeekNumber = models.SmallIntegerField(blank=True, null=True, default=None)

    def __str__(self):
        return str(self.Team1TeamID) + ' vs. ' + str(self.Team2TeamID) + ' in the ' + str(self.RivalryName)


class Bowl(models.Model):
    WorldID  = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)

    BowlID   = models.AutoField(primary_key = True)
    BowlName = models.CharField(max_length=50)
    Team1Rank = models.PositiveSmallIntegerField(default = 0)
    Team2Rank = models.PositiveSmallIntegerField(default = 0)
    IsNationalChampionship = models.BooleanField(default=False)
    BowlPrestige = models.PositiveSmallIntegerField(default = 0)

    def __str__(self):
        return self.BowlName

class Player(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    PlayerID                = models.AutoField(primary_key = True, db_index=True)
    PlayerFirstName         = models.CharField(max_length=50)
    PlayerLastName          = models.CharField(max_length=50)
    WasPreviouslyRedshirted = models.BooleanField(default=False)
    JerseyNumber            = models.PositiveSmallIntegerField(default = 0)
    Height                  = models.PositiveSmallIntegerField(default = 60) #inches
    Weight                  = models.PositiveSmallIntegerField(default = 185) #pounds
    CityID                  = models.ForeignKey(City, on_delete=models.CASCADE, blank=True, null=True, default=None)
    PositionID              = models.ForeignKey(Position, on_delete=models.CASCADE, blank=True, null=True, default=None)

    PlayerFaceJson          = models.CharField(max_length=2000, default='' , blank=True)

    IsRecruit                 = models.BooleanField(default=False, db_index=True)
    RecruitingStars           = models.PositiveSmallIntegerField(default=0)
    RecruitingPointsNeeded    = models.PositiveSmallIntegerField(default=2500)
    RecruitSigned             = models.BooleanField(default=False)
    RecruitingStage           = models.CharField(max_length = 40, default='Not Recruiting')

    Recruiting_NationalRank = models.PositiveSmallIntegerField(default=0, db_index=True)
    Recruiting_NationalPositionalRank = models.PositiveSmallIntegerField(default=0)
    Recruiting_StateRank = models.PositiveSmallIntegerField(default=0)

    Recruiting_40Time = models.DecimalField(default = 0, max_digits=4, decimal_places=2)
    Recruiting_BenchPressReps = models.PositiveSmallIntegerField(default=0)
    Recruiting_VerticalJump = models.DecimalField(default = 0, max_digits=6, decimal_places=3)


    Personality_LeadershipRating           = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_ClutchRating               = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_FriendlyRating             = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_WorkEthicRating            = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_ExpressiveRating           = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_DesireForWinnerRating      = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_LoyaltyRating              = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    Personality_DesireForPlayingTimeRating = models.PositiveSmallIntegerField(blank=True, null=True, default=None)

    #100 is normal : (0-200)
    RecruitingSpeed = models.PositiveSmallIntegerField(default = 100)


    ####IN GAME TENDENCIES###

    #-3 to 3
    DevelopmentRating          = models.SmallIntegerField(default=None, blank=True, null=True)
    DevelopmentGroupID         = models.PositiveSmallIntegerField(default=0)
    DevelopmentDayOfMonth      = models.PositiveSmallIntegerField(default=1)


    #####RECRUITING VALUES BELOW#######
    ChampionshipContenderValue = models.PositiveSmallIntegerField(default=10)
    TeamPrestigeValue          = models.PositiveSmallIntegerField(default=10)
    CloseToHomeValue           = models.PositiveSmallIntegerField(default=10)
    PlayingTimeValue           = models.PositiveSmallIntegerField(default=10)
    CoachStabilityValue        = models.PositiveSmallIntegerField(default=10)
    CoachStyleValue            = models.PositiveSmallIntegerField(default=10)
    FacilitiesValue            = models.PositiveSmallIntegerField(default=10)
    ProPotentialValue          = models.PositiveSmallIntegerField(default=10)
    CampusLifestyleValue       = models.PositiveSmallIntegerField(default=10)
    AcademicPrestigeValue      = models.PositiveSmallIntegerField(default=10)
    TelevisionExposureValue    = models.PositiveSmallIntegerField(default=10)

    def __str__(self):
        return self.PlayerFirstName + ' ' + self.PlayerLastName + ' #' + str(self.JerseyNumber)


    @property
    def CurrentTeamSeason(self):
        CurrentPTS = self.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        if CurrentPTS is not None:
            return CurrentPTS.TeamSeasonID
        return None

    @property
    def TeamJerseyStyle(self):

        TS = self.CurrentTeamSeason
        if TS is not None:
            return str(TS.TeamID.TeamJerseyStyle)

        return 'football'

    @property
    def TeamJerseyInvert(self):

        TS = self.CurrentTeamSeason
        if TS is not None:
            return str(TS.TeamID.TeamJerseyInvert)

        return 'True'

    def GeneratePlayerFaceJSon(self):
        PlayerFatnessMean = ((self.Weight-180) * 0.5 / 100) + 0.1
        colors = [{
            'skin': "#f2d6cb",
            'hair': [
              "#272421",
              "#3D2314",
              "#3D2314",
              "#5A3825",
              "#CC9966",
              "#2C1608",
              "#B55239",
              "#e9c67b",
              "#D7BF91"
            ]
          },
          {
            'skin': "#ddb7a0",
            'hair': [
              "#272421",
              "#3D2314",
              "#5A3825",
              "#CC9966",
              "#2C1608",
              "#B55239",
              "#e9c67b",
              "#D7BF91"
            ]
          },
          {
            'skin': "#ce967d",
            'hair': ["#272421", "#423125", "#423125"]
          },
          {
            'skin': "#bb876f",
            'hair': ["#272421"]
          },
          {
            'skin': "#aa816f",
            'hair': ["#272421"]
          },
          {
            'skin': "#a67358",
            'hair': ["#272421"]
          },
          {
            'skin': "#a67358",
            'hair': ["#272421"]
          },
          {
            'skin': "#a67358",
            'hair': ["#272421"]
          },
          {
            'skin': "#ad6453",
            'hair': ["#272421"]
          },
          {
            'skin': "#ad6453",
            'hair': ["#272421"]
          },
          {
            'skin': "#ad6453",
            'hair': ["#272421"]
          },
          {
            'skin': "#74453d",
            'hair': ["#272421"]
          },
          {
            'skin': "#74453d",
            'hair': ["#272421"]
          },
          {
            'skin': "#74453d",
            'hair': ["#272421"]
          },
          {
            'skin': "#5c3937",
            'hair': ["#272421"]
          },
          {
            'skin': "#5c3937",
            'hair': ["#272421"]
          }
        ]
        svgsIndex = {
          "accessories": ["headband-high", "headband", "none"],
          "body": ["body"],
          "ear": ["ear1", "ear2", "ear3"],
          "eye": ["eye1", "eye2", "eye3", "eye4", "eye5", "eye6", "eye7", "eye8", "eye9"],
          "eyeLine": ["line1", "line2", "line3", "line4", "line5", "line6", "none"],
          "eyebrow": ["eyebrow1", "eyebrow10", "eyebrow11", "eyebrow12", "eyebrow2", "eyebrow3", "eyebrow4", "eyebrow5", "eyebrow6", "eyebrow7", "eyebrow8", "eyebrow9"],
          "facialHair": ["beard1", "beard2", "fullgoatee", "goatee-thin", "goatee1-stache", "goatee1", "goatee2", "goatee3", "goatee4", "goatee5", "goatee6", "goatee7", "goatee8", "handlebar", "honest-abe-stache", "honest-abe", "mustache-thin", "mustache1", "none", "soul-stache", "soul"],
          "glasses": ["facemask", "glasses1-primary", "glasses1-secondary", "glasses2-black", "glasses2-primary", "glasses2-secondary", "none"],
          "hair": [("afro-big", 1), ("afro-med", 1), ("bald", 2), ("buzz-01",3), ("buzz-02",3), ('curly-01',1), ('curly-02',1), ('curly-03',1), ('dreads',1), ('faux-hawk-01',1), ('faux-hawk-02',1), ('hair-01',2), ('hair-02',2), ("cornrows",1), ("crop",2), ("high-01",2), ('high-02',2), ("juice",3), ('messy-01',1), ('messy-02',1), ('messy-03',1),  ('messy-spikes-01',1),( 'messy-spikes-02',1), ('messy-spikes-03',1), ("middle-part",1),( "parted",1), ("short-fade",3), ("short-01",2), ("short-02",2), ("spike-round-01",1),("spike-round-02",1),("spike-round-03",1), ("spike-straight-01",1),("spike-straight-02",1),("spike-straight-03",1),],
          "head": ["head1", "head2", "head3", "head4", "head5", "head6", "head7", "head8"],
          "jersey": [ "football"],
          "miscLine": ["chin1", "chin2",  "none"],#"forehead1", "forehead2", "forehead3", "forehead4", "forehead5",
          "mouth": ["angry", "closed", "mouth", "side", "smile-closed", "smile", "smile2", "smile3", "straight"],
          "nose": ["honker", "nose1", "nose2", "nose3", "nose4", "nose5", "nose6", "nose7", "nose8", "pinocchio"],
          "smileLine": ["line1", "line2", "line3", "line4", "none"]
        }

        eyeAngle = round(random.uniform(0,25) - 10, 0)

        if self.PositionID.PositionAbbreviation in ['QB', 'OT', 'OG', 'OC', 'K', 'P']:
            WPC = [(u, len(u['hair'])) for u in colors]
            palette = WeightedProbabilityChoice(WPC, colors[0])

        elif self.PositionID.PositionAbbreviation in ['MLB', 'DE', 'TE']:
            WPC =  [(u, 1) for u in colors]
            palette = WeightedProbabilityChoice(WPC, colors[0])
        else:
            WPC = [(u, (10 - len(u['hair'])) ** 2) for u in colors]
            palette = WeightedProbabilityChoice(WPC, colors[0])


        skinColor = palette['skin']
        hairColor = random.choice(palette['hair'])
        hairIsFlipped = 'false' if random.uniform(0,1) < 0.5 else 'true'
        mouthIsFlipped = 'false' if random.uniform(0,1) < 0.5 else 'true'
        noseIsFlipped = 'false' if random.uniform(0,1) < 0.5 else 'true'

        face = {
        'fatness': round(NormalTrunc(PlayerFatnessMean,.2, 0, 1), 2),
        'body': {
          'id': random.choice(svgsIndex['body']),
          'color': skinColor
        },
        'jersey': {
          'id': random.choice(svgsIndex['jersey'])
        },
        'ear': {
          'id': random.choice(svgsIndex['ear']),
          'size': round(random.uniform(0,.5) + .75,2)
        },
        'head': {
          'id': random.choice(svgsIndex['head']),
          'shave': 'rgba(0,0,0,' + str(round(random.uniform(0,1) / 5.0 if random.uniform(0,1) < 0.25 else 0,2)) + ')'
        },
        'eyeLine': {
          'id': random.choice(svgsIndex['eyeLine']) if random.uniform(0,1) < 0.75 else 'none'
        },
        'smileLine': {
          'id': random.choice(svgsIndex['smileLine']) if random.uniform(0,1) < 0.75 else 'none',
          'size': round(random.uniform(0,1) + .5,2)
        },
        'miscLine': {
          'id': random.choice(svgsIndex['miscLine']) if random.uniform(0,1) < 0.5 else 'none'
        },
        'facialHair': {
          'id': random.choice(svgsIndex['facialHair']) if random.uniform(0,1) < 0.5 else 'none'
        },
        'eye': {
          'id': random.choice(svgsIndex['eye']),
          'angle': eyeAngle
        },
        'eyebrow': {
          'id': random.choice(svgsIndex['eyebrow']),
          'angle': round(random.uniform(0,35) - 15,2)
        },
        'hair': {
          'id': WeightedProbabilityChoice(svgsIndex['hair'], 'hair-01'),
          'color': hairColor,
          'flip': hairIsFlipped
        },
        'mouth': {
          'id': random.choice(svgsIndex['mouth']),
          'flip': mouthIsFlipped
        },
        'nose': {
          'id': random.choice(svgsIndex['nose']),
          'flip': noseIsFlipped,
          'size': round(random.uniform(0,.75) + .5,2)
        },
        'glasses': {
          'id': random.choice(svgsIndex['glasses']) if random.uniform(0,1) < 0.04 else 'none'
        },
        'accessories': {
          'id': random.choice(svgsIndex['accessories']) if random.uniform(0,1) < 0.1 else 'none'
        }
      }

        self.PlayerFaceJson = face
        self.save()

        return None

    @property
    def PlayerIDURL(self):
        return '/World/' + str(self.WorldID_id) + '/Player/' + str(self.PlayerID)
    @property
    def FullName(self):
        return self.PlayerFirstName + ' ' + self.PlayerLastName

    @property
    def HometownAndState(self):
        return self.CityID.CityName + ', ' + self.CityID.StateID.StateName

    @property
    def RecruitingStatus(self):
        if self.IsRecruit:
            if self.RecruitSigned:
                RTS = RecruitTeamSeason.objects.get(WorldID = self.WorldID, PlayerID = self, Signed=True)
                return 'Signed - ' + RTS.TeamSeasonID.TeamID.TeamName
            else:
                return 'Still in recruiting process'
        return None
    @property
    def RecruitingSignedTeam(self):
        if self.IsRecruit:
            if self.RecruitSigned:
                RTS = RecruitTeamSeason.objects.get(WorldID = self.WorldID, PlayerID = self, Signed=True)
                return RTS.TeamSeasonID.TeamID_id
            else:
                return None
        return None

    @property
    def RecruitingStatusLogoURL(self):
        if self.IsRecruit:
            if self.RecruitSigned:
                RTS = RecruitTeamSeason.objects.get(WorldID = self.WorldID, PlayerID = self, Signed=True)
                return RTS.TeamSeasonID.TeamID.LogoURL
            else:
                return None
        return None

    @property
    def DevelopmentGroup(self):
        GroupMap = {
            -2: 'Very Slow',   #0  Annual Dev Cycles
            -1: 'Slow',        #1  Annual Dev Cycle   1
            0: 'Normal',       #2  Annual Dev Cycles  1,7
            1: 'Quick',        #4  Annual Dev Cycles  1,4,7,10
            2: 'Superstar',    #6  Annual Dev Cycles  1,3,5,7,9,11
            3: 'Generational'  #12 Annual Dev Cycles  1,2,3,4,5,6,7,8,9,10,11,12
        }
        GroupID = DevelopmentRating
        if GroupID not in GroupMap:
            return GroupMap[-2]

        return GroupMap[GroupID]
    @property
    def WeightFormatted(self):
        return str(self.Weight) + ' lbs'

    @property
    def HeightFormatted(self):
        return str(int(self.Height / 12)) + "'" + str(self.Height % 12) + '"'

    @property
    def CurrentSkills(self):
        PSS = self.playerteamseasonskill
        return PSS

    @property
    def CurrentPlayerTeamSeason(self):
        PTS = self.playerteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()
        return PTS
    @property
    def CurrentTeam(self):
        return self.CurrentPlayerTeamSeason.TeamSeasonID.TeamID
    @property
    def RecruitTeamSeasonUserTeam(self):
        RTS = self.recruitteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).filter(TeamSeasonID__TeamID__IsUserTeam = True).first()
        return RTS

    @property
    def OverallRating(self):
        return self.CurrentSkills.OverallRating


    def ReturnAsDict(self):


        CurrentSeason = LeagueSeason.objects.get(WorldID=self.WorldID, IsCurrent=1)
        #CurrentSeason = Season.objects.filter(IsCurrent = 1)
        #ThisTeamSeason = TeamSeason.objects.get(SeasonID = CurrentSeason, TeamID = )
        ThisPlayerTeamSeason = PlayerTeamSeason.objects.filter(PlayerID = self.PlayerID)

        TeamID = None
        TeamName = None
        for PTS in ThisPlayerTeamSeason:
            TS = PTS.TeamSeasonID
            S = TS.LeagueSeasonID
            T = TS.TeamID
            if S.IsCurrent == 1:
                TeamID = TS.TeamID
                TeamName = T.TeamName + ' ' + T.TeamNickname


        return {
            'PlayerID':self.PlayerID,
            'PlayerFirstName':self.PlayerFirstName,
            'PlayerLastName':self.PlayerLastName,
            'PlayerFaceJson': self.PlayerFaceJson,
            'FullName': self.FullName,
            'Class':self.Class,
            'WasPreviouslyRedshirted':self.WasPreviouslyRedshirted,
            'JerseyNumber':self.JerseyNumber,
            'Height':self.Height,
            'Weight':self.Weight,
            'CityID': self.CityID,
            'HeightFormatted': str(int(self.Height / 12)) + "'" + str(self.Height % 12) + '"',
            'WeightFormatted': str(self.Weight) + ' lbs',
            'TeamID': TeamID,
            'TeamName': TeamName,
            'Position':self.PositionID.PositionAbbreviation,
            'HometownAndState': self.HometownAndState,
            'PositionSortOrder': self.PositionID.PositionSortOrder,
            'RecruitingStars': self.RecruitingStars,
            'IsRecruit': self.IsRecruit,
            'TeamJerseyStyle': self.TeamJerseyStyle,
            'TeamJerseyInvert': self.TeamJerseyInvert
        }
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class Playoff(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    PlayoffID = models.AutoField(primary_key = True)
    LeagueSeasonID = models.ForeignKey(LeagueSeason,on_delete=models.CASCADE, null=True, blank=True, default=None)

    MostOutstandingPlayer = models.ForeignKey(Player, on_delete=models.CASCADE, blank = True, null=True)
    ChampionTeam = models.ForeignKey(Team, on_delete=models.CASCADE, blank = True, null=True)

    PlayoffStarted = models.BooleanField(default = False)
    PlayoffCompleted = models.BooleanField(default = False)

    IsPostseason = models.BooleanField(default = False)
    TeamsInPlayoff = models.PositiveSmallIntegerField(default = 0)
    RoundsInPlayoff = models.PositiveSmallIntegerField(default = 0)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class PlayoffRound(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    PlayoffRoundID = models.AutoField(primary_key = True)
    PlayoffID = models.ForeignKey(Playoff,on_delete=models.CASCADE, null=True, blank=True, default=None)

    RoundStarted = models.BooleanField(default = False)
    RoundCompleted = models.BooleanField(default = False)

    PlayoffRoundNumber = models.PositiveSmallIntegerField(default = 1)

    MinGameNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    MaxGameNumber = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    NumberOfGames = models.PositiveSmallIntegerField(blank=True, null=True, default=None)
    NumberOfTeams = models.PositiveSmallIntegerField(blank=True, null=True, default=None)

    WinValue = models.PositiveSmallIntegerField(default = 1)

    IsChampionshipRound = models.BooleanField(default = False)
    IsFinalFour = models.BooleanField(default = False)

    def __str__(self):

        return 'Round ' + str(self.PlayoffRoundNumber) + ' in Playoff, with ' + str(self.NumberOfGames) + ' games'

    @property
    def NextRound(self):
        return PlayoffRound.objects.filter(WorldID = self.WorldID).filter(PlayoffRoundNumber = self.PlayoffRoundNumber - 1).first()
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class PlayoffRegion(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    PlayoffRegionID = models.AutoField(primary_key = True)

    PlayoffRegionName = models.CharField(max_length=50)
    IsFinalFour = models.BooleanField(default = False)

    def __str__(self):

        return self.PlayoffRegionName + ' is Final Four? ' + str(self.IsFinalFour)

    @property
    def NextRound(self):
        return PlayoffRound.objects.filter(WorldID = self.WorldID).filter(PlayoffRoundNumber = self.PlayoffRoundNumber - 1).first()
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class TeamSeason(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    TeamSeasonID = models.AutoField(primary_key=True, db_index=True)
    TeamID       = models.ForeignKey(Team,  on_delete=models.CASCADE, db_index=True, null=True, blank=True)
    LeagueSeasonID     = models.ForeignKey(LeagueSeason,on_delete=models.CASCADE, db_index=True)
    ConferenceID   = models.ForeignKey(Conference,on_delete=models.CASCADE, db_index=True, blank=True, null=True, default=None)

    IsRecruitTeam = models.BooleanField(default=False)
    IsFreeAgentTeam = models.BooleanField(default=False)

    ScholarshipsToOffer = models.SmallIntegerField(default = 0)

    GamesPlayed = models.PositiveSmallIntegerField(default=0)
    Wins = models.PositiveSmallIntegerField(default=0)
    Losses = models.PositiveSmallIntegerField(default=0)
    ConferenceWins = models.PositiveSmallIntegerField(default=0)
    ConferenceLosses = models.PositiveSmallIntegerField(default=0)

    ExpectedWins = models.PositiveSmallIntegerField(default=0)

    ConferenceRank = models.PositiveSmallIntegerField(default=0)
    ConferenceGB   = models.DecimalField(default = 0, max_digits = 5, decimal_places=1)
    WinStreak = models.PositiveSmallIntegerField(default=0)

    PlayoffRegionID = models.ForeignKey(PlayoffRegion, default=None, on_delete=models.CASCADE, null=True, blank=True)
    PlayoffSeed = models.PositiveSmallIntegerField(default=None, null=True, blank=True)
    PlayoffRank = models.PositiveSmallIntegerField(default=None, null=True, blank=True)

    ConferenceChampion = models.BooleanField(default=False)
    NationalRunnerUp = models.BooleanField(default=False)
    NationalChampion = models.BooleanField(default=False)

    RegionalBroadcast = models.PositiveSmallIntegerField(default = 0)
    NationalBroadcast = models.PositiveSmallIntegerField(default = 0)

    RecruitingClassRank = models.PositiveSmallIntegerField(default=None, null=True, blank=True)


    TeamOverallRating = models.PositiveSmallIntegerField(default=None, null=True, blank=True)
    TeamOffenseRating = models.PositiveSmallIntegerField(default=None, null=True, blank=True)
    TeamDefenseRating = models.PositiveSmallIntegerField(default=None, null=True, blank=True)

    TeamOverallRating_Grade = models.CharField(max_length=4, default=None, null=True, blank=True)
    TeamOffenseRating_Grade = models.CharField(max_length=4, default=None, null=True, blank=True)
    TeamDefenseRating_Grade = models.CharField(max_length=4, default=None, null=True, blank=True)

    TeamPrestige = models.PositiveSmallIntegerField(default = 0)
    FacilitiesRating = models.PositiveSmallIntegerField(default=0)
    ProPotentialRating = models.PositiveSmallIntegerField(default=0)
    CampusLifestyleRating = models.PositiveSmallIntegerField(default=0)
    AcademicPrestigeRating      = models.PositiveSmallIntegerField(default=0)
    TelevisionExposureRating = models.PositiveSmallIntegerField(default=0)
    CoachStabilityRating     = models.PositiveSmallIntegerField(default=0)
    ChampionshipContenderRating =models.PositiveSmallIntegerField(default=0)
    LocationRating =models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        TeamName = 'None'
        if self.TeamID is not None:
            TeamName = self.TeamID.Name

        return TeamName  +' in ' + str(self.LeagueSeasonID)


    def PopulateTeamOverallRating(self):
        AllPlayers = PlayerTeamSeason.objects.filter(TeamSeasonID = self).order_by('-playerteamseasonskill__OverallRating')[0:22].values('TeamSeasonID').aggregate(
            Avg(F('playerteamseasonskill__OverallRating'))
        )

        self.TeamOverallRating = int(AllPlayers['playerteamseasonskill__OverallRating__avg'] )#TODO
        self.save()


    @property
    def NextTeamSeasonID(self):
        return self.TeamID.teamseason_set.order_by('-LeagueSeasonID__SeasonStartYear').first()

    @property
    def CurrentTeamSeasonPosition(self):
        TSP = self.teamseasonposition_set.all().values().annotate(PositionAbbreviation = F('PositionID__PositionAbbreviation'))
        TSPDict = {}
        for P in TSP:
            TSPDict[P['PositionAbbreviation']] = P
        return TSPDict

    @property
    def RecruitingClassValue(self):
        RTS = RecruitTeamSeason.objects.filter(TeamSeasonID = self).filter(Signed=True).values('PlayerID__RecruitingStars')
        RecruitingValue = 0
        if RTS.count() > 0:
            RecruitingValue = sum([int(u['PlayerID__RecruitingStars'])**3 for u in RTS]) * 1.0
        return RecruitingValue

    @property
    def DefeatedTeams(self):
        OpposingTeams = []
        Games = self.teamgame_set.filter(IsWinningTeam=True)
        for TG in Games:
            OpposingTeams.append(TG.OpposingTeamGame.TeamSeasonID)

        return OpposingTeams

    @property
    def LostToTeams(self):
        OpposingTeams = []
        Games = self.teamgame_set.filter(IsWinningTeam=False).filter(GameID__WasPlayed = True)
        for TG in Games:
            OpposingTeams.append(TG.OpposingTeamGame.TeamSeasonID)

        return OpposingTeams


    def UpdateWinStreak(self, DidWin):

        if self.WinStreak >= 0:
            PositiveWinStreak = True
        else:
            PositiveWinStreak = False

        if   DidWin and PositiveWinStreak:
            self.WinStreak += 1
        elif DidWin and not PositiveWinStreak:
            self.WinStreak  = 1
        elif not DidWin and PositiveWinStreak:
            self.WinStreak  = -1
        else:
            self.WinStreak  -= 1

    @property
    def PlayoffBidRankingTuple(self):
        if self.ConferenceChampion:
            return (0, self.NationalRank)
        return (1, self.NationalRank)
    @property
    def RankingTuple(self):
        WP = 0
        if self.GamesPlayed > 0:
            WP = (self.Wins ) * 1.0 / self.GamesPlayed
        return (self.NationalChampion, WP, self.Wins, self.TeamPrestige)

    @property
    def ConferenceRankingTuple(self):
        TeamCount = Team.objects.filter(WorldID = self.WorldID).count()
        return (self.ConferenceChampion, self.ConferenceWins - self.ConferenceLosses,self.ConferenceWins , TeamCount - self.NationalRank)

    @property
    def ConferenceRankingDict(self):
        TeamCount = Team.objects.filter(WorldID = self.WorldID).count()
        D = {}
        D['NetWins'] = {'Value': self.ConferenceWins - self.ConferenceLosses, 'Function': 'SortReverse'}
        D['Wins']    = {'Value': self.ConferenceWins , 'Function': 'SortReverse'}
        D['NationalRank'] = {'Value': self.NationalRank, 'Funtion': 'Sort'}
        D['DefeatedTeams'] = {'Value': [self.DefeatedTeams], 'Function': 'HTH'}
        return D


    @property
    def NationalRankObject(self):
        return TeamSeasonWeekRank.objects.filter(TeamSeasonID = self, IsCurrent = True).first()

    @property
    def LeagueSeasonDisplay(self):
        return str(self.LeagueSeasonID.LeagueSeasonDisplay)

    @property
    def TeamRecord(self):
        return str(self.Wins) + '-' + str(self.Losses)
    @property
    def TeamName(self):
        return str(self.TeamID.TeamName)
    @property
    def TeamNameAndRecord(self):
        return self.TeamName + ' (' + self.TeamRecord + ')'

    @property
    def TeamConferenceRecord(self):
        return str(self.ConferenceWins) + '-' + str(self.ConferenceLosses)

    @property
    def NationalRank(self):
        R = self.teamseasonweekrank_set.filter(IsCurrent = True).first()


        if R is None:
            RecentRanking = TeamSeasonWeekRank.objects.filter(TeamSeasonID__TeamID = self.TeamID).filter(IsCurrent = True).first()
            if RecentRanking is not None:
                return RecentRanking.NationalRank
            return None
        return R.NationalRank

    @property
    def NationalRankDisplay(self):

        NationalRank = self.NationalRank
        if NationalRank is None:
            return ''
        elif self.NationalRank > 25:
            return ''

        return '(' + str(self.NationalRank) + ')'

    @property
    def NationalRankDelta(self):
        return self.NationalRankObject.NationalRankDelta * -1

    @property
    def NationalRankDeltaAbs(self):
        return abs(self.NationalRankObject.NationalRankDelta)

    @property
    def TeamGamesPlayed(self):
        TeamGamesPlayedQuery = self.teamgame_set.filter(GameID__WasPlayed = True).aggregate(Count('GameID'))
        print('TeamGamesPlayedQuery', TeamGamesPlayedQuery)
        return TeamGamesPlayedQuery['GameID__count']

    @property
    def Points(self):
        PointQuery = self.teamgame_set.filter(GameID__WasPlayed = True).aggregate(Sum('Points'))
        #print('PointQuery', PointQuery.query)
        print('PointQuery', PointQuery)
        return PointQuery['Points__sum']

    @property
    def PointsAllowed(self):
        PointsAllowedQuery = self.teamgame_set.filter(GameID__WasPlayed = True).aggregate(Sum('OpposingTeamGameID__Points'))
        #print('PointsAllowedQuery', PointsAllowedQuery.query)


        return PointsAllowedQuery['OpposingTeamGameID__Points__sum']

    @property
    def PPG(self):
        print('Getting PPG', self, self.Points, self.TeamGamesPlayed)
        if self.TeamGamesPlayed > 0:
            return round(self.Points * 1.0 / self.TeamGamesPlayed,1)
        else:
            return 0.0
    @property
    def PAPG(self):
        if self.TeamGamesPlayed > 0:
            return round(self.PointsAllowed * 1.0 / self.TeamGamesPlayed,1)
        else:
            return 0.0
    @property
    def PointDiffPG(self):
        if self.GamesPlayed > 0:
            return round(self.PPG - self.PAPG,1)
        else:
            return 0.0
    @property
    def ORTG(self):
        if self.GamesPlayed > 0:
            return round(self.Points * 100.0 / self.Possessions,1)
        else:
            return 0.0

    @property
    def SeasonResultDisplay(self):
        if self.LeagueSeasonID.PlayoffCreated == False:
            return 'On going!'
        elif self.PlayoffBid == False:
            return 'Missed Playoff'
        elif self.NationalChampion == True:
            return 'National Champions!'
        elif self.NationalRunnerUp == True:
            return 'National Runners Up!'
        elif self.FinalFour == True:
            return 'Final Four Appearance!'
        else:
            return 'Made Playoff'


        return None

    @property
    def NumberOfRecruitContacts(self):
        return RecruitTeamSeason.objects.filter(TeamSeasonID = self).count()

    def GetTeamLeaders(self, Fields=None):
        Fields = [
            {'FieldName': 'GameScorePerGame', 'DisplayName': 'Game Score', 'SecondarySort': 'PAS_Yards'},
            {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'SecondarySort': 'PAS_Attempts'},
            {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'SecondarySort': 'RUS_TD'},
            {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'SecondarySort': 'REC_TD'},
            {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'SecondarySort': 'DEF_Tackles'},
            {'FieldName': 'DEF_INT', 'DisplayName': 'Interceptions', 'SecondarySort': 'DEF_Tackles'},
        ]
        PTS = self.playerteamseason_set.values('PlayerID_id', 'PlayerID__PlayerFaceJson', 'PlayerID__PositionID__PositionAbbreviation', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName').annotate(
            PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
            PlayerFaceJson = F('PlayerID__PlayerFaceJson'),
            PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
            PlayerID = F('PlayerID_id'),
            GameScore=Sum('playergamestat__GameScore'),
            GamesPlayed=Sum('playergamestat__GamesPlayed'),
            RUS_Yards=Sum('playergamestat__RUS_Yards'),
            RUS_TD=Sum('playergamestat__RUS_TD'),
            RUS_Carries=Sum('playergamestat__RUS_Carries'),
            REC_Receptions=Sum('playergamestat__REC_Receptions'),
            REC_TD=Sum('playergamestat__REC_TD'),
            PAS_Yards=Sum('playergamestat__PAS_Yards'),
            PAS_TD=Sum('playergamestat__PAS_TD'),
            PAS_Sacks=Sum('playergamestat__PAS_Sacks'),
            PAS_SackYards=Sum('playergamestat__PAS_SackYards'),
            PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
            PAS_Completions=Sum('playergamestat__PAS_Completions'),
            PAS_INT=Sum('playergamestat__PAS_INT'),
            REC_Yards=Sum('playergamestat__REC_Yards'),
            DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
            DEF_INT=Sum('playergamestat__DEF_INT'),
            DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
            DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
            FUM_Forced=Sum('playergamestat__FUM_Forced'),
            FUM_Recovered=Sum('playergamestat__FUM_Recovered'),
            GameScorePerGame = Case(
                When(GamesPlayed = 0, then=0.0),
                default=Round(F('GameScore') * 1.0 / F('GamesPlayed'), 1),
                output_field=FloatField()
            ),
            REC_YardsPerGame = Case(
                When(GamesPlayed = 0, then=0.0),
                default=Round(F('REC_Yards') * 1.0 / F('GamesPlayed'), 1),
                output_field=FloatField()
            ),
            RUS_YardsPerGame = Case(
                When(GamesPlayed = 0, then=0.0),
                default=Round(F('RUS_Yards') * 1.0 / F('GamesPlayed'), 1),
                output_field=FloatField()
            ),
            PAS_YardsPerGame = Case(
                When(GamesPlayed = 0, then=0.0),
                default=Round(F('PAS_Yards') * 1.0 / F('GamesPlayed'), 1),
                output_field=FloatField()
            )
        ).filter(GamesPlayed__gt = 0)

        Results = []

        if PTS.count() > 0:
            for Field in Fields:
                TopPlayer = PTS.order_by('-'+Field['FieldName'], '-'+Field['SecondarySort']).first()
                Field['Value'] = TopPlayer[Field['FieldName']]
                if Field['FieldName'] + 'PerGame' in TopPlayer and TopPlayer['GamesPlayed'] > 1:
                    Field['ValuePerGame'] = TopPlayer[Field['FieldName'] + 'PerGame']
                Field['PTS'] = TopPlayer

                if  len(TopPlayer['PlayerFaceJson']) == 0:
                    PlayerObject = Player.objects.filter(PlayerID = TopPlayer['PlayerID']).first()
                    PlayerObject.GeneratePlayerFaceJSon()
                    Field['PTS']['PlayerFaceJson'] = PlayerObject.PlayerFaceJson


                Results.append(Field)

        return Results
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class TeamSeasonStrategy(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    TeamSeasonStrategyID = models.AutoField(primary_key = True, db_index=True)
    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, db_index=True)

    #GameStrategy
    SituationalAggressivenessTendency = models.SmallIntegerField(default = 0)
    PlaycallPassTendency = models.PositiveSmallIntegerField(default = 55)
    PlayClockAggressivenessTendency = models.SmallIntegerField(default = 0)

    #Playbooks
    OffensivePlaybook = models.CharField(max_length=100, default = None, null=True, blank=True)
    DefensivePlaybook = models.CharField(max_length=100, default = None, null=True, blank=True)

    PassingStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)
    RunningBackStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)

    CoverageStyleStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)
    BlitzStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)

    QB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    RB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    WR_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    TE_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    OL_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)

    DE_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    DT_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    OLB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    MLB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    CB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    S_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)



class PlayerTeamSeason(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    PlayerTeamSeasonID = models.AutoField(primary_key = True, db_index=True)
    PlayerID = models.ForeignKey(Player, on_delete=models.CASCADE, db_index=True)
    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, db_index=True, blank=True, null=True, default=None)
    ClassID = models.ForeignKey(Class, on_delete=models.CASCADE, blank=True, null=True, default=None)

    TeamCaptain = models.BooleanField(default=False)
    RedshirtedThisSeason   = models.BooleanField(default=False)
    LeavingTeamAfterSeason = models.BooleanField(default=False)

    QuitFootballAfterSeason = models.BooleanField(default = False)
    GraduatedAfterSeason = models.BooleanField(default = False)
    LeftEarlyForDraftAfterSeason = models.BooleanField(default = False)
    TransferredAfterSeason = models.BooleanField(default = False)

    def __str__(self):
        if self.TeamSeasonID.TeamID is not None:
            TeamName = self.TeamSeasonID.TeamID.TeamName
        else:
            TeamName = 'None'
        S = self.TeamSeasonID.LeagueSeasonID
        return str(self.PlayerID.FullName) + ' (' + str(self.PlayerID.PositionID.PositionAbbreviation) + ') played for ' + TeamName + ' in ' + str(S.SeasonStartYear)

    def TeamRosterDict(self):

        PlayerObject = self.PlayerID

        PlayerInfoDict = {
            'FullName': PlayerObject.FullName,
            'JerseyNumber': PlayerObject.JerseyNumber,
            'PlayerID': PlayerObject.PlayerID,
            'Position': PlayerObject.PositionID.PositionAbbreviation,
            'HeightFormatted': PlayerObject.HeightFormatted,
            'WeightFormatted': PlayerObject.WeightFormatted,
            'OverallRating': PlayerObject.OverallRating,
            'PlayerClass': self.ClassID.ClassName,
            'ORTG': 0,
            'DRTG': 0
        }

        SkillAggregates = self.ThisPlayerSeasonSkill.RatingAggregateDict()

        for Grade in SkillAggregates:

            PlayerInfoDict[Grade] = SkillAggregates[Grade]['LetterGrade']

        return PlayerInfoDict

    @property
    def ThisPlayerSeasonSkill(self):
        return PlayerTeamSeasonSkill.objects.filter(LeagueSeasonID = self.TeamSeasonID.LeagueSeasonID).filter(PlayerID = self.PlayerID).first()

    def ShotChartColor(self, v):

        if v > .66:
            return '#B80E05'
        elif v > .52:
            return '#F02C21'
        elif v > .4:
            return '#FFA39E'
        elif v > .32:
            return '#BDD9FF'
        elif v > .26:
            return '#7092C0'

        return '#405A7C'


    @property
    def PublicityShares(self):
        return self.TeamSeasonID.RegionalBroadcast + (3* self.TeamSeasonID.NationalBroadcast )
    @property
    def AwardShares(self):
        if self.MPG > 20.0:
            Multiplier = 1.0
            Rank = self.TeamSeasonID.NationalRank
            if Rank == 1:
                Multiplier *= 1.1
            elif Rank <= 5:
                Multiplier *= 1.07
            elif Rank <= 12:
                Multiplier *= 1.05
            elif Rank <= 25:
                Multiplier *= 1.03
            elif Rank > 50:
                Multiplier *= .95
            elif Rank > 90:
                Multiplier *= .7

            return  round(Multiplier * (self.WinShares + self.PPG ), 1) + self.PublicityShares
        else:
            return 0.0

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class PlayerTeamSeasonDepthChart(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    PlayerTeamSeasonDepthChartID = models.AutoField(primary_key = True, db_index=True)
    PlayerTeamSeasonID = models.ForeignKey(PlayerTeamSeason, on_delete=models.CASCADE, db_index=True)

    PositionID = models.ForeignKey(Position, on_delete=models.CASCADE)
    DepthPosition = models.PositiveSmallIntegerField(default = 0)
    IsStarter = models.BooleanField(default=False)

    DepthPositionPlaysOnField = models.PositiveSmallIntegerField(default = 0)

    def __str__(self):
        return str(self.PlayerTeamSeasonID.PlayerID) #+ ' is ' + str(self.PositionID.PositionAbbreviation) + ' #' + str(self.DepthPostion) + ' for ' + str(self.PlayerTeamSeasonID.TeamSeasonID.TeamID)

class PlayerTeamSeasonAward(models.Model):
    WorldID        = models.ForeignKey(World, on_delete=models.CASCADE, db_index=True)
    PlayerTeamSeasonAwardID = models.AutoField(primary_key = True, db_index=True)
    PlayerTeamSeasonID = models.ForeignKey(PlayerTeamSeason, on_delete=models.CASCADE, db_index=True )

    #IsPlayerOfTheYear = models.BooleanField(default = False)
    IsTopPlayer       = models.BooleanField(default = False)
    IsFirstTeam       = models.BooleanField(default = False)
    IsSecondTeam      = models.BooleanField(default = False)
    IsFreshmanTeam    = models.BooleanField(default = False)

    IsConferenceAward  = models.BooleanField(default = False)
    IsNationalAward    = models.BooleanField(default = False)

    IsWeekAward       = models.BooleanField(default = False)
    IsSeasonAward     = models.BooleanField(default = False)
    IsPreseasonAward  = models.BooleanField(default = False)
    IsPlayoffAward = models.BooleanField(default = False)

    IsIndividualAward = models.BooleanField(default = False)
    IsPositionGroupAward = models.BooleanField(default = False)
    IsPositionAward = models.BooleanField(default = False)

    PositionID         = models.ForeignKey(Position, on_delete=models.CASCADE, null=True, blank=True, default=None)
    PositionGroupID    = models.ForeignKey(PositionGroup, on_delete=models.CASCADE, null=True, blank=True, default=None)

    WeekID             = models.ForeignKey(Week, on_delete=models.CASCADE, null=True, blank=True, default=None)
    ConferenceID       = models.ForeignKey(Conference, on_delete=models.CASCADE, null=True, blank=True, default=None)

    def __str__(self):

        return str(self.PlayerTeamSeasonID) + ' is ' + self.AwardName

    @property
    def WorldHistoryDict(self):
        Results = {'PlayerName': '', 'PlayerTeam': '', 'PlayerID': None}

        Results['PlayerName'] = self.PlayerTeamSeasonID.PlayerID.FullName
        Results['PlayerTeam'] = self.PlayerTeamSeasonID.TeamSeasonID.TeamID.TeamName
        Results['PlayerID']   = self.PlayerTeamSeasonID.PlayerID.PlayerID

        return Results

    @property
    def AwardName(self):
        s = ''
        GroupingName = ''
        if self.IsNationalAward:
            GroupingName = 'NCAA'
        elif self.IsConferenceAward:
            GroupingName = self.ConferenceID.ConferenceName

        if self.IsPositionGroupAward:
            s += self.PositionGroupID.PositionGroupName + ' '

        if self.IsTopPlayer:
            s += 'MVP of ' + GroupingName
        else:
            if self.IsFirstTeam:
                s += 'First Team ' + GroupingName
            elif self.IsSecondTeam:
                s += 'Second Team ' + GroupingName
            elif self.IsFreshmanTeam:
                s += 'First Team Freshman ' + GroupingName

        if self.IsWeekAward:
            w = str(self.WeekID) if self.WeekID is not None else ''
            s += ' for ' + w
        elif self.IsPreseasonAward:
            s += 'in the Preseason'

        return s

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class TeamSeasonWeekRank(models.Model):
    WorldID        = models.ForeignKey(World, on_delete=models.CASCADE, db_index=True)
    TeamSeasonWeekRankID = models.AutoField(primary_key = True, db_index=True)
    TeamSeasonID   = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, db_index=True)
    WeekID         = models.ForeignKey(Week,   on_delete=models.CASCADE, db_index=True)
    IsCurrent      = models.BooleanField(default = True, db_index=True)
    NationalRank   = models.PositiveSmallIntegerField(default = None, null=True, blank=True)
    NationalRankDelta   = models.SmallIntegerField(default = None, null=True, blank=True)

    PollPoints = models.PositiveSmallIntegerField(default = None, null=True, blank=True)


    def __str__(self):

        return str(self.TeamSeasonID) + ' is ranked ' + str(self.NationalRank)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class TeamSeasonDateRank(models.Model):
    WorldID        = models.ForeignKey(World, on_delete=models.CASCADE, db_index=True)
    TeamSeasonDateRankID = models.AutoField(primary_key = True, db_index=True)
    TeamSeasonID   = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, db_index=True)
    DateID         = models.ForeignKey(Calendar,   on_delete=models.CASCADE, db_index=True)
    IsCurrent      = models.BooleanField(default = True, db_index=True)
    NationalRank   = models.PositiveSmallIntegerField(default = None, null=True, blank=True)
    NationalRankDelta   = models.SmallIntegerField(default = None, null=True, blank=True)

    PollPoints = models.PositiveSmallIntegerField(default = None, null=True, blank=True)


    def __str__(self):

        return str(self.TeamSeasonID) + ' is ranked ' + str(self.NationalRank)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'




class Game(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    GameID = models.AutoField(primary_key = True, db_index=True)
    LeagueSeasonID = models.ForeignKey(LeagueSeason,on_delete=models.CASCADE, null=True, blank=True, default=None, db_index=True)
    WeekID = models.ForeignKey(Week, on_delete=models.CASCADE, db_index=True, null=True, blank=True, default=None)
    PlayoffID = models.ForeignKey(Playoff, on_delete=models.CASCADE, blank = True, null=True)
    GameTime = models.CharField(max_length = 5)
    WasPlayed = models.BooleanField(default = False, db_index=True)

    WinningTeamID = models.ForeignKey(Team, default = None, null=True, blank=True, on_delete=models.CASCADE ,related_name="WinningTeamID")
    LosingTeamID = models.ForeignKey(Team, default = None, null=True, blank=True, on_delete=models.CASCADE, related_name="LosingTeamID")

    TeamRivalryID = models.ForeignKey(TeamRivalry, default = None, null=True, blank=True, on_delete=models.CASCADE)
    BowlID        = models.ForeignKey(Bowl, default = None, null=True, blank=True, on_delete=models.CASCADE)

    IsConferenceChampionship = models.BooleanField(default = False)

    NationalBroadcast = models.BooleanField(default = False)
    RegionalBroadcast = models.BooleanField(default = False)

    @property
    def GameIDURL(self):
        URL = '/World/' + str(self.WorldID_id) + '/Game/' + str(self.GameID)
        return str(URL)

    @property
    def GameHref(self):
        URL = '/World/' + str(self.WorldID_id) + '/Game/' + str(self.GameID)
        return str(URL)

    @property
    def TopPlayerStats(self):
        if not self.WasPlayed:
            return None

        TopPlayers = PlayerGameStat.objects.filter(TeamGameID__GameID = self).values('PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'TopStatStringDisplay1', 'TopStatStringDisplay2').annotate(
            PlayerHref = Concat(Value('/World/'), Value(self.WorldID_id), Value('/Player/'), F('PlayerTeamSeasonID__PlayerID'), output_field=CharField()),
            PlayerName = Concat( F('PlayerTeamSeasonID__PlayerID__PlayerFirstName'), Value(' '), F('PlayerTeamSeasonID__PlayerID__PlayerLastName'), output_field=CharField()),
        ).order_by('-GameScore')[:3]

        return [{'PlayerName': P['PlayerName'], 'PlayerPosition': P['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'], 'PlayerHref': P['PlayerHref'], 'PlayerTeam': '('+P['PlayerTeamSeasonID__TeamSeasonID__TeamID__Abbreviation']+')', 'PlayerStats': [P['TopStatStringDisplay1'], P['TopStatStringDisplay2']]} for P in TopPlayers]


    def CalculateTopPlayers(self):

        Results = {}

        AwayPGS = self.AwayTeamGameID.playergamestat_set.values('FUM_Recovered','FUM_Forced','FUM_Fumbles','DEF_TD','PAS_INT','PAS_Sacks','DEF_Sacks','DEF_Tackles','DEF_Deflections','DEF_INT','RUS_Yards','RUS_Carries', 'REC_TD','REC_Yards','RUS_TD','PAS_Yards','PAS_Completions', 'PAS_Attempts', 'PAS_TD', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID_id').order_by('-GameScore')
        HomePGS = self.HomeTeamGameID.playergamestat_set.values('FUM_Recovered','FUM_Forced','FUM_Fumbles','DEF_TD','PAS_INT','PAS_Sacks','DEF_Sacks','DEF_Tackles','DEF_Deflections','DEF_INT','RUS_Yards','RUS_Carries', 'REC_TD','REC_Yards','RUS_TD','PAS_Yards','PAS_Completions', 'PAS_Attempts', 'PAS_TD', 'PlayerTeamSeasonID__TeamSeasonID__TeamID', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation', 'PlayerTeamSeasonID__PlayerID_id').order_by('-GameScore')
        HomePlayers = []
        AwayPlayers = []

        GameScoreMap = [
            {'Stat': 'RUS_Yards', 'PointToStatRatio': 1.0 / 10, 'DisplayName': 'rush yards'},
            {'Stat': 'RUS_TD'   , 'PointToStatRatio': 6.0 / 1,  'DisplayName': 'rush TDs'},
            {'Stat': 'PAS_Yards', 'PointToStatRatio': 1.0 / 25, 'DisplayName': 'pass yards'},
            {'Stat': 'PAS_TD',    'PointToStatRatio': 5.0 / 1,  'DisplayName': 'pass TDs'},
            {'Stat': 'REC_Yards', 'PointToStatRatio': 1.0 / 10, 'DisplayName': 'rec. yards'},
            {'Stat': 'REC_TD',    'PointToStatRatio': 6.0 / 1,  'DisplayName': 'rec. TDs'},
            {'Stat': 'PAS_INT',    'PointToStatRatio': -4.0 / 1,  'DisplayName': 'rec. TDs'},
            {'Stat': 'PAS_Sacks',  'PointToStatRatio': -1.0 / 1,  'DisplayName': 'sacked'},
            {'Stat': 'DEF_Sacks',  'PointToStatRatio': 4.0 / 1,  'DisplayName': 'sacks'},
            {'Stat': 'DEF_Tackles',  'PointToStatRatio': 1.0 / 1,  'DisplayName': 'tackles'},
            {'Stat': 'DEF_Deflections',  'PointToStatRatio': 1.0 / 1,  'DisplayName': 'deflections'},
            {'Stat': 'DEF_INT',  'PointToStatRatio': 4.0 / 1,  'DisplayName': 'interceptions'},
            {'Stat': 'DEF_TD',  'PointToStatRatio': 6.0 / 1,  'DisplayName': 'D TDs'},
            {'Stat': 'FUM_Fumbles',  'PointToStatRatio': -3.0 / 1,  'DisplayName': 'fumbles'},
            {'Stat': 'FUM_Forced',  'PointToStatRatio': 2.0 / 1,  'DisplayName': 'fumbles forced'},
            {'Stat': 'FUM_Recovered',  'PointToStatRatio': 2.0 / 1,  'DisplayName': 'fumbles recovered'},
        ]


        HomePlayers = HomePGS[0:3]
        AwayPlayers = AwayPGS[0:3]

        counter = 1
        for P in HomePlayers:
            PlayerName = P['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + P['PlayerTeamSeasonID__PlayerID__PlayerLastName']
            PlayerPosition = P['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']
            PlayerID = P['PlayerTeamSeasonID__PlayerID_id']

            PlayerStats = ''
            for Stat in sorted(GameScoreMap, key=lambda k: P[k['Stat']] * k['PointToStatRatio'], reverse=True)[:2]:
                if P[Stat['Stat']] > 0:
                    PlayerStats += str(P[Stat['Stat']]) + ' ' + Stat['DisplayName'] + ', '

            if len(PlayerStats) >= 2:
                PlayerStats = PlayerStats[:-2]

            Results['HomeTeamPlayer'+str(counter)] = {'PlayerName': PlayerName, 'PlayerPosition': PlayerPosition, 'PlayerStats': PlayerStats, 'PlayerID': PlayerID}
            counter +=1

        counter = 1
        for P in AwayPlayers:
            PlayerName = P['PlayerTeamSeasonID__PlayerID__PlayerFirstName'] + ' ' + P['PlayerTeamSeasonID__PlayerID__PlayerLastName']
            PlayerPosition = P['PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation']
            PlayerID = P['PlayerTeamSeasonID__PlayerID_id']

            PlayerStats = ''
            for Stat in sorted(GameScoreMap, key=lambda k: P[k['Stat']] * k['PointToStatRatio'], reverse=True)[:2]:
                if P[Stat['Stat']] > 0:
                    PlayerStats += str(P[Stat['Stat']]) + ' ' + Stat['DisplayName'] + ', '

            if len(PlayerStats) >= 2:
                PlayerStats = PlayerStats[:-2]

            Results['AwayTeamPlayer'+str(counter)] = {'PlayerName': PlayerName, 'PlayerPosition': PlayerPosition, 'PlayerStats': PlayerStats, 'PlayerID': PlayerID}
            counter +=1


        return Results


    @property
    def HomeTeamGameID(self):
        return self.teamgame_set.filter(IsHomeTeam=True).first()
    @property
    def AwayTeamGameID(self):
        return self.teamgame_set.filter(IsHomeTeam=False).first()
    @property
    def HomeTeamSeasonID(self):
        return self.HomeTeamGameID.TeamSeasonID
    @property
    def AwayTeamSeasonID(self):
        return self.AwayTeamGameID.TeamSeasonID
    @property
    def HomeTeamID(self):
        return self.HomeTeamSeasonID.TeamID
    @property
    def AwayTeamID(self):
        return self.AwayTeamSeasonID.TeamID

    @property
    def HomeTeamRecordDisplay(self):
        if self.HomeTeam.TeamRecord is None:
            return str(self.HomeTeamID.CurrentTeamSeason.Wins) + '-'+str(self.HomeTeam.CurrentTeamSeason.Losses)
        return self.HomeTeamRecord
    @property
    def AwayTeamRecordDisplay(self):
        if self.AwayTeamRecord is None:
            return str(self.AwayTeamID.CurrentTeamSeason.Wins) + '-'+str(self.AwayTeam.CurrentTeamSeason.Losses)
        return self.AwayTeamRecord
    @property
    def HomeTeamRank(self):
        if self.HomeTeamGameID.TeamSeasonWeekRankID is None:
            R = self.HomeTeamSeasonID.NationalRank
        else:
            R = self.HomeTeamGameID.TeamSeasonWeekRankID.NationalRank
        if R > 25:
            return ''

        return '(' + str(R) + ')'

    @property
    def AwayTeamRank(self):
        TSDR = self.AwayTeamGameID.TeamSeasonWeekRankID
        if TSDR is None:
            R = self.AwayTeamSeasonID.NationalRank
        else:
            R = TSDR.NationalRank
        if R > 25:
            return ''

        return '(' + str(R) + ')'

    @property
    def HomeTeamRankValue(self):
        if self.HomeTeamGameID.TeamSeasonWeekRankID is None:
            return self.HomeTeamSeasonID.NationalRank
        else:
            return self.HomeTeamGameID.TeamSeasonWeekRankID.NationalRank

    @property
    def AwayTeamRankValue(self):
        TSDR = self.AwayTeamGameID.TeamSeasonWeekRankID
        if TSDR is None:
            return self.AwayTeamSeasonID.NationalRank
        else:
            return TSDR.NationalRank
    @property
    def WorldPageFilterAttributes(self):
        Attr = 'AllGame=1 '

        if self.AwayTeamGameID.TeamSeasonWeekRankID.NationalRank <= 25 or self.HomeTeamGameID.TeamSeasonWeekRankID.NationalRank <= 25:
            Attr += 'Top25Game=1 '
        else:
            Attr += 'Top25Game=0 '

        if self.NationalBroadcast or self.RegionalBroadcast:
            Attr += 'NationalGame=1 '
        else:
            Attr += 'NationalGame=0 '

        return Attr

    @property
    def WinningTeam(self):
        return self.WinningTeamID
    @property
    def LosingTeam(self):
        return self.LosingTeamID

    @property
    def HomeTeamWinningGameBold(self):
        if self.HomeTeamID == self.WinningTeamID:
            return 'TeamWinningGameBold'
        elif self.HomeTeamID == self.LosingTeamID:
            return 'TeamLosingGame'
        return ''
    @property
    def AwayTeamWinningGameBold(self):
        if self.AwayTeamID == self.WinningTeamID:
            return 'TeamWinningGameBold'
        elif self.AwayTeamID == self.LosingTeamID:
            return 'TeamLosingGame'
        return ''
    @property
    def DateShortDisplay(self):
        return self.WeekID.WeekName
    @property
    def DateShortDisplayDayOfWeek(self):
        return self.WeekID.WeekName
    @property
    def GameHeadlineDisplay(self):


        if self.BowlID is not None:
            if self.BowlID.IsNationalChampionship == True:
                return 'National Championship'
            else:
                return self.BowlID.BowlName
        elif self.IsConferenceChampionship:
            return self.HomeTeamSeasonID.ConferenceID.ConferenceName + ' Championship'
        elif self.TeamRivalryID is not None:
            if self.TeamRivalryID.RivalryName is not None:
                return self.TeamRivalryID.RivalryName
            return 'Rivalry game!'
        elif self.NationalBroadcast:
            return 'National Broadcast'
        elif self.RegionalBroadcast:
            return 'Regional Broadcast'

        return ''

    @property
    def GameDisplay(self):
        TeamsInGame = self.teamgame_set.all().order_by('IsHomeTeam')
        if self.WasPlayed == 1:
            Points = [TeamsInGame[0].Points, TeamsInGame[1].Points]
            Points = sorted(Points, reverse=True)
            Points = [str(u) for u in Points]
            GameDisplay = '-'.join(Points)
        else:
            GameDisplay = 'Preview'#self.GameDateID.Date

        return GameDisplay

    def __str__(self):
        #return 'Game ID: ' +  str(self.GameID)
        #return teamgame_set.objects.all()
        HomeTeam = self.teamgame_set.filter(IsHomeTeam = True).first()
        AwayTeam = self.teamgame_set.filter(IsHomeTeam = False).first()
        return HomeTeam.TeamSeasonID.TeamID.__str__() + ' vs ' + AwayTeam.TeamSeasonID.TeamID.__str__() + ' in ' + str(self.WeekID.WeekName)


    def ReturnAsDict(self):
        TeamsInGame = self.teamgame_set.all().order_by('IsHomeTeam')
        if self.WasPlayed == 1:
            GameDisplay = str(TeamsInGame[0].Points) +'-'+str(TeamsInGame[1].Points)
            TeamGames = self.teamgame_set.all().values('Points', 'IsHomeTeam' ,'RUS_Yards', 'PAS_Yards', 'REC_Yards', 'REC_TD', 'REC_Receptions', 'Turnovers', 'TimeOfPossession', 'FirstDowns', 'PNT_Punts', 'DEF_Sacks', 'DEF_Tackles', 'ThirdDownConversion', 'ThirdDownAttempt', 'FourthDownConversion', 'FourthDownAttempt', 'BiggestLead').annotate(  # call `annotate`
                    GamesPlayed = F('GamesPlayed'),
                    TotalYards=F('PAS_Yards') + F('RUS_Yards'),
                    ThirdDownPercentage=Case(
                        When(ThirdDownAttempt=0, then=0),
                        default=(Round(Sum(F('ThirdDownConversion'))* 100.0 / Sum(F('ThirdDownAttempt')),1)),
                        output_field=FloatField()
                    ),
                    FourthDownPercentage=Case(
                        When(FourthDownAttempt=0, then=0),
                        default=(Round(Sum(F('FourthDownConversion'))* 100.0 / Sum(F('FourthDownAttempt')),1)),
                        output_field=FloatField()
                    ),
                    PAS_CompletionPercentage=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(Sum(F('PAS_Completions'))* 100.0 / Sum(F('PAS_Attempts')),1) ),
                        output_field=FloatField()
                    ),
                    PAS_YardsPerAttempt=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(Sum(F('PAS_Yards')) * 1.0 / Sum(F('PAS_Attempts')),1)),
                        output_field=FloatField()
                    ),
                    PAS_YardsPerCompletion=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('PAS_Completions')),1)),
                        output_field=FloatField()
                    ),
                    RUS_YardsPerCarry=Case(
                        When(RUS_Carries=0, then=0.0),
                        default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('RUS_Carries')),1)),
                        output_field=FloatField()
                    )
                )

        else:
            GameDisplay = self.WeekID.WeekName
            TeamGames = self.teamgame_set.all().values('IsHomeTeam' ).annotate(  # call `annotate`
                    GamesPlayed = Sum('TeamSeasonID__teamgame__GamesPlayed'),
                    Points = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__Points') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    Opponent_Point = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__OpposingTeamGameID__Points') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    RUS_Yards = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__RUS_Yards') * 1.0 / F('GamesPlayed'),output_field=IntegerField()),0),
                        output_field=FloatField()
                    ),
                    PAS_Yards = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__PAS_Yards') * 1.0 / F('GamesPlayed'),output_field=IntegerField()),0),
                        output_field=FloatField()
                    ),
                    Opponent_RUS_Yards = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__OpposingTeamGameID__RUS_Yards') * 1.0 / F('GamesPlayed'),output_field=IntegerField()),0),
                        output_field=FloatField()
                    ),
                    Opponent_PAS_Yards = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__OpposingTeamGameID__PAS_Yards') * 1.0 / F('GamesPlayed'),output_field=IntegerField()),0),
                        output_field=FloatField()
                    ),
                    REC_Yards = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__REC_Yards') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    REC_Receptions = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__REC_Receptions') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    Turnovers = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__Turnovers') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    Opponent_Turnovers = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__OpposingTeamGameID__Turnovers') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    TimeOfPossession = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__TimeOfPossession') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    FirstDowns = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__FirstDowns') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    PNT_Punts = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__PNT_Punts') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    DEF_Sacks = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__DEF_Sacks') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    DEF_Tackles = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__DEF_Tackles') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    ThirdDownConversion = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__ThirdDownConversion') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    ThirdDownAttempt = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__ThirdDownAttempt') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    FourthDownConversion = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__FourthDownConversion') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    FourthDownAttempt = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__FourthDownAttempt') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    BiggestLead = Case(
                        When(GamesPlayed = 0, then=Value(0.0)),
                        default= Round(ExpressionWrapper(Sum('TeamSeasonID__teamgame__BiggestLead') * 1.0 / F('GamesPlayed'),output_field=FloatField()),1),
                        output_field=FloatField()
                    ),
                    TotalYards= Round(F('PAS_Yards') + F('RUS_Yards'),0),
                    Opponent_TotalYards=Round(F('Opponent_PAS_Yards') + F('Opponent_RUS_Yards'),0),
                    ThirdDownPercentage=Case(
                        When(ThirdDownAttempt=0, then=0),
                        default=(Round(F('ThirdDownConversion')* 100.0 / F('ThirdDownAttempt'),1)),
                        output_field=FloatField()
                    ),
                    FourthDownPercentage=Case(
                        When(FourthDownAttempt=0, then=0),
                        default=(Round(F('FourthDownConversion')* 100.0 / F('FourthDownAttempt'),1)),
                        output_field=FloatField()
                    ),
                    PAS_CompletionPercentage=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1) ),
                        output_field=FloatField()
                    ),
                    PAS_YardsPerAttempt=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(F('PAS_Yards') * 1.0 / F('PAS_Attempts'),1)),
                        output_field=FloatField()
                    ),
                    PAS_YardsPerCompletion=Case(
                        When(PAS_Attempts=0, then=0.0),
                        default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Completions'),1)),
                        output_field=FloatField()
                    ),
                    RUS_YardsPerCarry=Case(
                        When(RUS_Carries=0, then=0.0),
                        default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
                        output_field=FloatField()
                    )
                )
        HomeTeamGame = TeamGames.filter(IsHomeTeam = True).first()
        AwayTeamGame = TeamGames.filter(IsHomeTeam = False).first()

        GameDict = {
            'GameID': self.GameID,
            'LeagueSeasonID': self.LeagueSeasonID,
            'WeekID': self.WeekID,
            'GameDate': self.WeekID.WeekName,
            'Date': self.WeekID.WeekName,
            'GameTime': self.GameTime,
            'WasPlayed': self.WasPlayed,
            'AwayTeamID': self.AwayTeamID,
            'HomeTeamID': self.HomeTeamID,
            'GameDisplay':GameDisplay,
            'GameHeadlineDisplay': self.GameHeadlineDisplay,
        }

        for Stat in HomeTeamGame:
            GameDict['Home'+Stat] = HomeTeamGame[Stat]
        for Stat in AwayTeamGame:
            GameDict['Away'+Stat] = AwayTeamGame[Stat]

        return GameDict


    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class GameEvent(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    GameID = models.ForeignKey(Game, on_delete=models.CASCADE, db_index=True)
    GameEventID = models.AutoField(primary_key = True, db_index=True)
    HomePoints = models.PositiveSmallIntegerField(default = 0)
    AwayPoints = models.PositiveSmallIntegerField(default = 0)
    EventTime = models.PositiveSmallIntegerField(default = 0)
    EventPeriod = models.PositiveSmallIntegerField(default = 0)

    IsScoringPlay = models.BooleanField(default = True)
    DisplayTeamID = models.ForeignKey(Team, on_delete=models.CASCADE, default=None, blank=True, null=True)
    PlayType = models.CharField(max_length=6, default=None, blank=True, null=True)
    PlayDescription = models.CharField(max_length=100, default=None, blank=True, null=True)
    DriveDescription = models.CharField(max_length=100, default=None, blank=True, null=True)

    def ReturnAsDict(self):

        return {
            'GameID': self.GameID,
            'GameEventID': self.GameEventID,
            'HomeTeamScore': self.HomePoints,
            'AwayTeamScore': self.AwayPoints,
            'EventTime': self.EventTime,
            'EventPeriod': self.EventPeriod
        }

    @property
    def GameTime(self):
        if self.EventPeriod in [1,2]:
            GameTime = (self.EventPeriod -1) * 1200  + self.EventTime
        else:
            GameTime = 2400  + self.EventTime

        return GameTime
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class TeamGame(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    GameID = models.ForeignKey(Game, on_delete=models.CASCADE, db_index=True)
    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    OpposingTeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True, related_name='teamseason_opposingteamgame')
    OpposingTeamGameID = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True, related_name='teamgame_opposingteamgame')
    TeamSeasonWeekRankID  = models.ForeignKey(TeamSeasonWeekRank, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)

    TeamGameID = models.AutoField(primary_key = True, db_index=True)

    IsHomeTeam = models.BooleanField(default=False, db_index=True)
    IsWinningTeam = models.BooleanField(default=False)
    Points = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    TeamRecord = models.CharField(max_length = 20, default=None, blank=True, null=True)
    TeamConferenceRecord = models.CharField(max_length = 20, default=None, blank=True, null=True)
    GamesPlayed = models.PositiveSmallIntegerField(default=0, blank=True, null=True)

    BiggestLead = models.PositiveSmallIntegerField(default=0, blank=True, null=True)

    PAS_Completions = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Attempts = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_INT = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_SackYards = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_Carries = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_20 = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_BrokenTackles = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_YardsAfterContact = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Drops = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Receptions = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_YardsAfterCatch = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Targets = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Fumbles = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Lost = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Recovered = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Forced = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_ReturnYards = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_ReturnTD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Tackles = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_SoloTackles = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_TacklesForLoss = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Deflections = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_QBHits = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INT = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INTYards = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INTTD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Safeties = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_Returns = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_Returns = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA29 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM29 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA39 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM39 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA49 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM49 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA50 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM50 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_XPA = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_XPM = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_Kickoffs = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_Touchbacks = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Punts = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Touchbacks = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Within20 = models.SmallIntegerField(default=0, null=True, blank=True)
    BLK_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    BLK_Pancakes = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_LNG = models.SmallIntegerField(default=0, null=True, blank=True)

    Possessions = models.SmallIntegerField(default=0, null=True, blank=True)
    Turnovers = models.SmallIntegerField(default=0, null=True, blank=True)
    TimeOfPossession = models.PositiveSmallIntegerField(default = 0)
    FirstDowns = models.PositiveSmallIntegerField(default=0)
    FirstDowns_Pass = models.PositiveSmallIntegerField(default=0)
    FirstDowns_Rush = models.PositiveSmallIntegerField(default=0)


    ThirdDownAttempt = models.PositiveSmallIntegerField(default=0)
    ThirdDownConversion = models.PositiveSmallIntegerField(default=0)
    FourthDownAttempt = models.PositiveSmallIntegerField(default=0)
    FourthDownConversion = models.PositiveSmallIntegerField(default=0)
    TwoPointAttempt = models.PositiveSmallIntegerField(default=0)
    TwoPointConversion = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return str(self.TeamSeasonID) + ' vs ' + str(self.OpposingTeamGame.TeamSeasonID)

    @property
    def OpposingTeamGame(self):
        return self.GameID.teamgame_set.exclude(IsHomeTeam = self.IsHomeTeam).first()

    @property
    def TeamRecordDisplay(self):
        if self.TeamRecord is None:
            return str(self.TeamSeasonID.Wins) + '-'+str(self.TeamSeasonID.Losses)
        return self.TeamRecord

    @property
    def ConferenceTeamRecordDisplay(self):
        if self.TeamConferenceRecord is None:
            return str(self.TeamSeasonID.ConferenceWins) + '-'+str(self.TeamSeasonID.ConferenceLosses)
        return self.TeamConferenceRecord

class PlayerTeamSeasonSkill(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    PlayerTeamSeasonSkillID = models.AutoField(primary_key = True, db_index=True)
    PlayerTeamSeasonID = models.OneToOneField(PlayerTeamSeason, on_delete=models.CASCADE, db_index=True)


    Strength_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Agility_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Speed_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Acceleration_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Stamina_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Awareness_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Jumping_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Injury_Rating               = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowPower_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ShortThrowAccuracy_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    MediumThrowAccuracy_Rating  = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    DeepThrowAccuracy_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowOnRun_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ThrowUnderPressure_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PlayAction_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Elusiveness_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BallCarrierVision_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    JukeMove_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BreakTackle_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Carrying_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Catching_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    CatchInTraffic_Rating       = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    RouteRunning_Rating     = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Release_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    HitPower_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Tackle_Rating               = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PassRush_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    BlockShedding_Rating        = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Pursuit_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PlayRecognition_Rating      = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ManCoverage_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ZoneCoverage_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Press_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    PassBlock_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    RunBlock_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    ImpactBlock_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickPower_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickAccuracy_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    KickReturn_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)

    OverallRating   = models.SmallIntegerField(blank=True, null=True, default=None)

    def RatingAggregateDict(self):

        AggregateDict = {
            'PassingGrade' : {'NumberValue': Average([self.ThrowPower_Rating, self.ShortThrowAccuracy_Rating, self.MediumThrowAccuracy_Rating, self.DeepThrowAccuracy_Rating]), 'LetterGrade': ''},
        }

        for Grade in AggregateDict:
            AggregateDict[Grade]['LetterGrade'] = MapNumberValuesToLetterGrade(AggregateDict[Grade]['NumberValue'])

        return AggregateDict


    def __str__(self):
        PlayerName = self.PlayerTeamSeasonID.PlayerID.PlayerFirstName + ' ' + self.PlayerTeamSeasonID.PlayerID.PlayerLastName
        return PlayerName + ' was rated ' + str(self.OverallRating) + ' in ' + str(self.PlayerTeamSeasonID.TeamSeasonID.LeagueSeasonID)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class PlayerGameStat(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    PlayerGameStatID = models.AutoField(primary_key = True, db_index=True)
    PlayerTeamSeasonID = models.ForeignKey(PlayerTeamSeason, on_delete=models.CASCADE, blank=True, null=True, db_index=True)
    TeamGameID = models.ForeignKey(TeamGame, on_delete=models.CASCADE,default=None, null=True, blank=True, db_index=True)

    PAS_Completions = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Attempts = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_INT = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    PAS_SackYards = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_Carries = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_20 = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_BrokenTackles = models.SmallIntegerField(default=0, null=True, blank=True)
    RUS_YardsAfterContact = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Drops = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Receptions = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_YardsAfterCatch = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Receptions = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_Targets = models.SmallIntegerField(default=0, null=True, blank=True)
    REC_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Fumbles = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Lost = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Recovered = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_Forced = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_ReturnYards = models.SmallIntegerField(default=0, null=True, blank=True)
    FUM_ReturnTD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Tackles = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_SoloTackles = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_TacklesForLoss = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Deflections = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_QBHits = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INT = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INTYards = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_INTTD = models.SmallIntegerField(default=0, null=True, blank=True)
    DEF_Safeties = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_Returns = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    KR_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_Returns = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_TD = models.SmallIntegerField(default=0, null=True, blank=True)
    PR_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA29 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM29 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA39 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM39 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA49 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM49 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGA50 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_FGM50 = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_XPA = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_XPM = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_Kickoffs = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_Touchbacks = models.SmallIntegerField(default=0, null=True, blank=True)
    KCK_LNG = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Punts = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Yards = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Touchbacks = models.SmallIntegerField(default=0, null=True, blank=True)
    PNT_Within20 = models.SmallIntegerField(default=0, null=True, blank=True)
    BLK_Sacks = models.SmallIntegerField(default=0, null=True, blank=True)
    BLK_Pancakes = models.SmallIntegerField(default=0, null=True, blank=True)
    BLK_Blocks = models.SmallIntegerField(default=0, null=True, blank=True)

    GameScore = models.DecimalField(default = 0, max_digits=13, decimal_places=8)

    GamesPlayed = models.PositiveSmallIntegerField(default=0)
    GamesStarted = models.SmallIntegerField(default = 0)
    PlaysOnField = models.PositiveSmallIntegerField(default=0)
    TeamGamesPlayed = models.PositiveSmallIntegerField(default=0)

    TopStatStringDisplay1 = models.CharField(default=None, null=True, blank=True, max_length=30)
    TopStatStringDisplay2 = models.CharField(default=None, null=True, blank=True, max_length=30)

    def ReturnAsDict(self):
        ThisPlayer = self.PlayerTeamSeasonID.PlayerID
        return {
            'PlayerID': ThisPlayer.PlayerID,

            }

    def __str__(self):
        ThisPlayer = self.PlayerTeamSeasonID.PlayerID

        return ThisPlayer.PlayerFirstName + ' ' + ThisPlayer.PlayerLastName + ' recorded '



class Coach(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    CoachID = models.AutoField(primary_key = True)
    CoachFirstName = models.CharField(max_length = 20)
    CoachLastName = models.CharField(max_length = 20)
    CoachAge      = models.PositiveSmallIntegerField(default=20)

    IsActiveCoach = models.BooleanField(default = True)

    ReputationRating = models.PositiveSmallIntegerField(default = 0)
    CharismaRating = models.PositiveSmallIntegerField(default = 0)
    ScoutingRating = models.PositiveSmallIntegerField(default = 0)
    GameplanRating = models.PositiveSmallIntegerField(default = 0)
    InGameAdjustmentRating = models.PositiveSmallIntegerField(default = 0)

    TeachShooting  = models.PositiveSmallIntegerField(default = 0)
    TeachSkills    = models.PositiveSmallIntegerField(default = 0)

    ##Tendencies
    PatienceTendency = models.SmallIntegerField(default = 0)
    VeteranTendency  = models.SmallIntegerField(default = 0)

    RedshirtTendency  = models.SmallIntegerField(default = 0)

    ValueSkillsTendency      = models.PositiveSmallIntegerField(default = 0)
    ValueAthleticismTendency = models.PositiveSmallIntegerField(default = 0)
    ValueSizeTendency        = models.PositiveSmallIntegerField(default = 0)

    #GameStrategy
    SituationalAggressivenessTendency = models.SmallIntegerField(default = 0)
    PlaycallPassTendency = models.PositiveSmallIntegerField(default = 55)
    PlayClockAggressivenessTendency = models.SmallIntegerField(default = 0)

    #Playbooks
    OffensivePlaybook = models.CharField(max_length=100, default = None, null=True, blank=True)
    DefensivePlaybook = models.CharField(max_length=100, default = None, null=True, blank=True)

    PassingStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)
    RunningBackStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)

    CoverageStyleStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)
    BlitzStrategy = models.CharField(max_length=30, default = None, null=True, blank=True)

    QB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    RB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    WR_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    TE_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    OL_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)

    DE_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    DT_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    OLB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    MLB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    CB_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)
    S_Preference = models.CharField(max_length=30, default = None, null=True, blank=True)

    def __str__(self):
        return self.CoachFirstName + ' ' + self.CoachLastName + ' is the '

    @property
    def CurrentCoachTeamSeason(self):
        return self.coachteamseason_set.filter(TeamSeasonID__LeagueSeasonID__IsCurrent = True).first()

    @property
    def CareerWins(self):
        CTS = CoachTeamSeason.objects.filter(CoachID = self)
        return sum([u.TeamSeasonID.Wins for u in CTS])

    @property
    def CareerLosses(self):
        CTS = CoachTeamSeason.objects.filter(CoachID = self)
        return sum([u.TeamSeasonID.Losses for u in CTS])

    @property
    def CareerGamesCoached(self):
        CTS = CoachTeamSeason.objects.filter(CoachID = self)
        return sum([u.TeamSeasonID.GamesPlayed for u in CTS])

    @property
    def CareerWinningPct(self):
        CTS = CoachTeamSeason.objects.filter(CoachID = self)
        GamesCoached = sum([u.TeamSeasonID.GamesPlayed for u in CTS])
        if GamesCoached > 0:
            return round(sum([u.TeamSeasonID.Wins for u in CTS]) *1.0/ GamesCoached ,2)
        return 0

    @property
    def CareerPlayoffBids(self):
        CTS = CoachTeamSeason.objects.filter(CoachID = self)
        return sum([u.TeamSeasonID.PlayoffBid for u in CTS])


    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'

class CoachTeamSeason(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    CoachTeamSeasonID = models.AutoField(primary_key = True)
    CoachID = models.ForeignKey(Coach, on_delete=models.CASCADE)
    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE)

    CoachPositionID = models.ForeignKey(CoachPosition, on_delete=models.CASCADE, blank=True, null=True, default=None)
    Salary   = models.PositiveSmallIntegerField(default = 200000)

    NationalCoachOfTheYearAward = models.BooleanField(default = False)
    ConferenceCoachOfTheYearAward = models.BooleanField(default = False)

    RetiredAfterSeason = models.BooleanField(default = False)
    FiredAfterSeason = models.BooleanField(default = False)
    LeftForNewJobAfterSeason = models.BooleanField(default = False)

    JobSecurity = models.PositiveSmallIntegerField(default = 100) #Scale 1 - 100

    def ReturnAsDict(self):
        CoachObject = self.CoachID
        return {
            'CoachID' : self.CoachID,
            'TeamSeasonID': self.TeamSeasonID,
            'Position': self.Position,
            'Salary': self.Salary,
            'NationalCoachOfTheYearAward': self.NationalCoachOfTheYearAward,
            'ConferenceCoachOfTheYearAward': self.ConferenceCoachOfTheYearAward,
            'JobSecurity': self.JobSecurity,
            'CoachFirstName': CoachObject.CoachFirstName,
            'CoachLastName': CoachObject.CoachLastName,
            'CoachAge': CoachObject.CoachAge

        }

    def __str__(self):

        return self.Name + ' is the ' + str(self.CoachPositionID) + ' for ' + ' in ' + str(self.TeamSeasonID.LeagueSeasonID)

    @property
    def Name(self):
        return self.CoachID.CoachFirstName + ' ' + self.CoachID.CoachLastName

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class RecruitTeamSeason(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None, db_index=True)
    RecruitTeamSeasonID = models.AutoField(primary_key = True, db_index=True)
    PlayerTeamSeasonID = models.ForeignKey(PlayerTeamSeason, on_delete=models.CASCADE, db_index=True)
    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, db_index=True)

    Signed = models.BooleanField(default=False)

    OfferMade = models.BooleanField(default=False)
    InterestLevel = models.PositiveSmallIntegerField(default=0)
    MatchRating = models.PositiveSmallIntegerField(default=0)
    IsActivelyRecruiting = models.BooleanField(default=False)

    RecruitingTeamRank = models.IntegerField(default = 1)

    Scouted_Overall = models.PositiveSmallIntegerField(default=0)
    ScoutingFuzz = models.PositiveSmallIntegerField(default=0)


    Scouted_Strength_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Agility_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Speed_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Acceleration_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Stamina_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Awareness_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Jumping_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Injury_Rating               = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ThrowPower_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ShortThrowAccuracy_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_MediumThrowAccuracy_Rating  = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_DeepThrowAccuracy_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ThrowOnRun_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ThrowUnderPressure_Rating   = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_PlayAction_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Elusiveness_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_BallCarrierVision_Rating    = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_JukeMove_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_BreakTackle_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Carrying_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Catching_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_CatchInTraffic_Rating       = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_RouteRunning_Rating     = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Release_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_HitPower_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Tackle_Rating               = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_PassRush_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_BlockShedding_Rating        = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Pursuit_Rating              = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_PlayRecognition_Rating      = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ManCoverage_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ZoneCoverage_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_Press_Rating                = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_PassBlock_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_RunBlock_Rating             = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_ImpactBlock_Rating          = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_KickPower_Rating            = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_KickAccuracy_Rating         = models.PositiveSmallIntegerField(default=0, blank=True, null=True)
    Scouted_KickReturn_Rating           = models.PositiveSmallIntegerField(default=0, blank=True, null=True)

    DistanceMatchRating = models.IntegerField(default = 0)
    TeamPrestigeRating = models.IntegerField(default = 0)

    Preference1Name = models.CharField(max_length = 32, default='')
    Preference1MatchRating = models.IntegerField(default = 0)

    Preference2Name = models.CharField(max_length = 32, default='')
    Preference2MatchRating = models.IntegerField(default = 0)

    Preference3Name = models.CharField(max_length = 32, default='')
    Preference3MatchRating = models.IntegerField(default = 0)

    def __str__(self):
        return str(self.PlayerTeamSeasonID.PlayerID) + ' ' + str(self.TeamSeasonID)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'



class Headline(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    HeadlineID = models.AutoField(primary_key = True)
    WeekID = models.ForeignKey(Week, on_delete=models.CASCADE)
    LeagueSeasonID = models.ForeignKey(LeagueSeason,on_delete=models.CASCADE, null=True, blank=True, default=None)


    #Upset, #1 Seeds in Tourney, Final Four Field Set, Final Four Win, Championship, Triple Double, Award
    #New #1 team, Stat Leader
    HeadlineImportanceValue = models.PositiveSmallIntegerField(default = 0)

    HeadlineText = models.CharField(default='', max_length=400)
    HeadlineHref = models.CharField(default='', max_length=400)

    ShowNextWeek = models.BooleanField(default=False)

    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class Audit(models.Model):
    AuditID = models.AutoField(primary_key = True)
    TimeElapsed = models.DecimalField(default = 0, max_digits=13, decimal_places=8)
    AuditTime = models.DateTimeField(auto_now=True, blank=True, null=True)

    AuditDescription = models.CharField(max_length=255, blank=True, null=True, default=None)
    AuditVersion     = models.PositiveSmallIntegerField(blank=True, null=True, default=None)

    NumberTeam = models.PositiveSmallIntegerField( default=1)
    QueryCount = models.PositiveSmallIntegerField( default=0)
    ScalesWithTeams = models.BooleanField(default = False)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'


class Driver(models.Model):
    #DriverID = models.AutoField( blank=True, null=True, default=None)
    #WorldID = models.ForeignKey(World, on_delete=models.CASCADE)
    CurrentSeason = models.ForeignKey(LeagueSeason , on_delete=models.CASCADE)
    CurrentWeek =  models.ForeignKey(Week , on_delete=models.CASCADE, blank=True, null=True, default=None)
    CurrentTeam = models.ForeignKey(Team, on_delete=models.CASCADE,null=True, blank=True)
    class Meta:
              # specify this model as an Abstract Model
            app_label = 'HeadFootballCoach'
    def ReturnAsDict(self):
        return {
            'CurrentSeason': self.CurrentSeason,
            'CurrentDay': self.CurrentDay,
            'CurrentTeam': self.CurrentTeam
        }

class GameDrive(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    GameDriveID = models.AutoField(primary_key = True)

    GameID = models.ForeignKey(Game, on_delete=models.CASCADE,null=True, blank=True)
    DriveDescription = models.CharField(max_length = 32, default = None, blank=True, null=True)

    DriveDuration = models.SmallIntegerField(blank=True, null=True, default=0)
    DrivePlayCount = models.SmallIntegerField(blank=True, null=True, default=0)
    DriveStartBallSpot = models.SmallIntegerField(blank=True, null=True, default=0)
    DriveYards = models.SmallIntegerField(blank=True, null=True, default=0)
    ScoreOnDrive = models.BooleanField(default = False)
    TurnoverOnDrive = models.BooleanField(default = False)
    OffensiveTeamGameID = models.ForeignKey(TeamGame, on_delete=models.CASCADE, default=None, blank=True, null=True, related_name='offensivegamedrive')
    DefensiveTeamGameID = models.ForeignKey(TeamGame, on_delete=models.CASCADE, default=None, blank=True, null=True, related_name='defensivegamedrive')

    DriveDescription = models.CharField(max_length=255, default=None, blank=True, null=True)
    HomePoints = models.SmallIntegerField(default = 0)
    AwayPoints = models.SmallIntegerField(default = 0)
    EventTime = models.SmallIntegerField(default = 0)
    EventPeriod = models.SmallIntegerField(default = 0)

    @property
    def GameTime(self):
        if self.EventPeriod in [1,2]:
            GameTime = (self.EventPeriod -1) * 1200  + self.EventTime
        else:
            GameTime = 2400  + self.EventTime

        return GameTime


class TeamSeasonPosition(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    TeamSeasonPositionID = models.AutoField(primary_key = True)

    TeamSeasonID = models.ForeignKey(TeamSeason, on_delete=models.CASCADE, blank=True, null=True, default=None)
    PositionID = models.ForeignKey(Position, on_delete=models.CASCADE, blank=True, null=True, default=None)

    PositionPriority = models.IntegerField(default=0) #  -3 to 3
    PositionPreference = models.CharField(max_length = 20, default=None, blank=True, null=True)

    CurrentPlayerCount = models.IntegerField(default=0)
    MinimumPlayerCount = models.IntegerField(default=0)
    NeededPlayerCount = models.IntegerField(default=0)
    StarterPlayerCount = models.IntegerField(default=0)

    CommitPlayerCount = models.IntegerField(default=0)
    FreshmanPlayerCount = models.IntegerField(default=0)
    SophomorePlayerCount = models.IntegerField(default=0)
    JuniorPlayerCount = models.IntegerField(default=0)
    SeniorPlayerCount = models.IntegerField(default=0)

    Year1PositionOverall = models.IntegerField(default=0)
    Year2PositionOverall = models.IntegerField(default=0)
    Year3PositionOverall = models.IntegerField(default=0)


    Strength_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Agility_Rating_Weight              = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Speed_Rating_Weight                = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Acceleration_Rating_Weight         = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Stamina_Rating_Weight              = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Awareness_Rating_Weight            = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Jumping_Rating_Weight              = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Injury_Rating_Weight               = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ThrowPower_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ShortThrowAccuracy_Rating_Weight   = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    MediumThrowAccuracy_Rating_Weight  = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    DeepThrowAccuracy_Rating_Weight    = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ThrowOnRun_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ThrowUnderPressure_Rating_Weight   = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    PlayAction_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Elusiveness_Rating_Weight          = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    BallCarrierVision_Rating_Weight    = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    JukeMove_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    BreakTackle_Rating_Weight          = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Carrying_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Catching_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    CatchInTraffic_Rating_Weight       = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    RouteRunning_Rating_Weight     = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Release_Rating_Weight              = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    HitPower_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Tackle_Rating_Weight               = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    PassRush_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    BlockShedding_Rating_Weight        = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Pursuit_Rating_Weight              = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    PlayRecognition_Rating_Weight      = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ManCoverage_Rating_Weight          = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ZoneCoverage_Rating_Weight         = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    Press_Rating_Weight                = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    PassBlock_Rating_Weight            = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    RunBlock_Rating_Weight             = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    ImpactBlock_Rating_Weight          = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    KickPower_Rating_Weight            = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    KickAccuracy_Rating_Weight         = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)
    KickReturn_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)

    Total_Rating_Weight           = models.DecimalField(default = 0.0, max_digits = 6, decimal_places=2)


class DrivePlay(models.Model):
    WorldID = models.ForeignKey(World, on_delete=models.CASCADE, blank=True, null=True, default=None)
    DrivePlayID = models.AutoField(primary_key = True)

    GameDriveID = models.ForeignKey(GameDrive, on_delete=models.CASCADE,null=True, blank=True)

    BallSpot = models.SmallIntegerField(blank=True, null=True, default=None)
    YardsToGo = models.SmallIntegerField(blank=True, null=True, default=None)
    Down = models.SmallIntegerField(blank=True, null=True, default=None)
    OffensivePointDifferential = models.SmallIntegerField(blank=True, null=True, default=None)
    Period = models.SmallIntegerField(blank=True, null=True, default=None)
    SecondsLeftInPeriod = models.SmallIntegerField(blank=True, null=True, default=None)

    Run_Prob = models.SmallIntegerField(blank=True, null=True, default=None)
    Pass_Prob = models.SmallIntegerField(blank=True, null=True, default=None)
    Punt_Prob = models.SmallIntegerField(blank=True, null=True, default=None)
    FG_Prob = models.SmallIntegerField(blank=True, null=True, default=None)
    PlayClockUrgency = models.SmallIntegerField(blank=True, null=True, default=None)
    ClockIsRunning = models.BooleanField(default=False)

    PlayDescription = models.CharField(max_length=100, default=None, blank=True, null=True)

    PlayYards = models.SmallIntegerField(blank=True, null=True, default=None)
    PlayDuration = models.SmallIntegerField(blank=True, null=True, default=None)
    IsFirstDown = models.BooleanField(default=False)
    IsScoringPlay = models.BooleanField(default=False)
    IsChangeOfPossessionPlay = models.BooleanField(default=False)

    IsFieldGoalAttempt = models.BooleanField(default=False)
    IsFieldGoalMake = models.BooleanField(default=False)
    IsPunt = models.BooleanField(default=False)
    IsPass = models.BooleanField(default=False)
    IsRun = models.BooleanField(default=False)
    IsKneel = models.BooleanField(default=False)

    IsInterception = models.BooleanField(default=False)
    IsFumble = models.BooleanField(default=False)
    IsFumbleRecoveryDefense = models.BooleanField(default=False)
    IsDefensiveTouchdown = models.BooleanField(default=False)

    @property
    def TimeLeftInPeriod(self):
        return SecondsToMinutes(self.SecondsLeftInPeriod)

    @property
    def PointDifferentialGroup(self):
        return 'Hello'

    def __str__(self):
        return 'PlayChoiceLogID:' + str(self.PlayChoiceLogID) + ' for ' + str(self.GameID) + ' Period: ' + str(self.Period) + ', Time left: ' + SecondsToMinutes(self.SecondsLeftInPeriod) + ' OffensivePointDifferential: ' + str(self.OffensivePointDifferential)
