"""CollegeBasketballDynasty URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from . import views



urlpatterns = [
    path('', views.Page_Index, name='index'),
    path('World/<int:WorldID>', views.Page_World, name='World'),
    path('World/<int:WorldID>/Teams/', views.Page_Teams, name='Teams'),
    path('World/<int:WorldID>/Team/<int:TeamID>/', views.Page_Team, name='Team'),
    path('World/<int:WorldID>/Team/<int:TeamID>/History/', views.Page_TeamHistory, name='TeamHistory'),
    path('World/<int:WorldID>/Player/<int:PlayerID>/', views.Page_Player, name='Player'),
    path('World/<int:WorldID>/Game/<int:GameID>/', views.Page_Game, name='Game'),
    path('World/<int:WorldID>/Bracket/', views.Page_Bracket, name='Bracket'),
    path('World/<int:WorldID>/ManageTeam/', views.Page_ManageTeam, name='ManageTeam'),
    path('World/<int:WorldID>/Recruiting/', views.Page_Recruiting, name='Recruiting'),
    path('World/<int:WorldID>/Coach/<int:CoachID>/', views.Page_Coach, name='Coach'),
    path('World/<int:WorldID>/Season/<int:SeasonStartYear>/', views.Page_Season, name='Season'),
    path('World/<int:WorldID>/Conferences/<int:ConferenceID>/', views.Page_Conferences, name='Conferences'),
    path('World/<int:WorldID>/Conferences/', views.Page_Conferences, name='Conferences'),
    path('World/<int:WorldID>/Top25/', views.Page_Top25, name='Top25'),
    path('World/<int:WorldID>/Awards/', views.Page_Awards, name='Awards'),
    path('World/<int:WorldID>/PlayerStats/', views.Page_PlayerStats, name='PlayerStats'),
    path('World/<int:WorldID>/PlayerStats/Team/<int:TeamID>/', views.Page_PlayerStats, name='PlayerStats'),
    path('World/<int:WorldID>/TeamStats/', views.Page_TeamStats, name='TeamStats'),
    path('World/<int:WorldID>/CoachCarousel/', views.Page_CoachCarousel, name='CoachCarousel'),
    path('World/<int:WorldID>/PlayerDepartures/', views.Page_Rankings, name='Rankings'),

    path('World/<int:WorldID>/Rankings/', views.Page_Rankings, name='PlayerDepartures'),



    path('World/<int:WorldID>/Search/<str:SearchInput>/', views.Page_Search, name='Search'),

    #POSTS BELOW
    path('World/<int:WorldID>/SimDay/', views.POST_SimDay, name='SimDay'),
    path('World/<int:WorldID>/PickTeam/', views.POST_PickTeam, name='PickTeam'),
    path('CreateLeague/', views.POST_CreateLeague, name='CreateLeague'),
    path('World/<int:WorldID>/Player/<int:PlayerID>/SetPlayerFaceJSON', views.POST_SetPlayerFaceJson, name='SetPlayerFaceJSON'),

    #GETS BELOW
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamHistory', views.GET_TeamHistory, name='TeamHistory'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamHistoricalLeaders/<str:Timeframe>', views.GET_TeamHistoricalLeaders, name='TeamHistoricalLeaders'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamRoster', views.GET_TeamRoster, name='TeamRoster'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamSchedule', views.GET_TeamSchedule, name='TeamSchedule'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamCoaches', views.GET_TeamCoaches, name='TeamCoaches'),

    path('World/<int:WorldID>/Player/<int:PlayerID>/PlayerCardInfo', views.GET_PlayerCardInfo, name='PlayerCardInfo'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamCardInfo', views.GET_TeamCardInfo, name='TeamCardInfo'),

    path('World/<int:WorldID>/Player/<int:PlayerID>/PlayerStats', views.GET_PlayerStats_Player, name='PlayerStats'),
    path('World/<int:WorldID>/PlayerStats/Departures', views.GET_PlayerStats_Departures, name='PlayerStats_Departures'),
    path('World/<int:WorldID>/WorldHistory', views.GET_WorldHistory, name='WorldHistory'),
    path('World/<int:WorldID>/ConferenceStandings', views.GET_ConferenceStandings, name='ConferenceStandings'),
    path('World/<int:WorldID>/ConferenceStandings/<int:ConferenceID>', views.GET_ConferenceStandings, name='ConferenceStandings'),
    path('World/<int:WorldID>/AllTeamStats', views.GET_AllTeamStats, name='AllTeamStats'),
    path('World/<int:WorldID>/AwardRaces', views.GET_AwardRaces, name='AwardRaces'),
    path('World/<int:WorldID>/LeagueLeaders', views.GET_LeagueLeaders, name='LeagueLeaders'),
    path('World/<int:WorldID>/RecruitingPlayers', views.GET_RecruitingPlayers, name='RecruitingPlayers'),


    path('GetPlayerPositions/', views.GET_PlayerPositions, name='GetPlayerPositions'),
    path('GetClasses/', views.GET_Classes, name='GetClasses'),
    path('GetConferences/<int:WorldID>', views.GET_Conferences, name='GetConferences'),

    path('audit/', views.Page_Audit, name='Audit'),
    path('admin/', admin.site.urls),
    path('XFLScores/', views.XFLScores),
    path('TestStreaming/', views.TestStreaming),

]



if settings.DEBUG:
    print('Trying to configure DEBUG')
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
        # For django versions before 2.0:
        # url(r'^__debug__/', include(debug_toolbar.urls)),

    ] + urlpatterns
