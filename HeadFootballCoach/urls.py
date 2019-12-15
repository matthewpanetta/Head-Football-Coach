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
from django.urls import path

from . import views


urlpatterns = [
    path('', views.Page_Index, name='index'),
    path('World/<int:WorldID>', views.Page_World, name='World'),
    path('World/<int:WorldID>/Teams/', views.Page_Teams, name='Teams'),
    path('World/<int:WorldID>/Team/<int:TeamID>/', views.Page_Team, name='Team'),
    path('World/<int:WorldID>/Team/<int:TeamID>/History/', views.Page_TeamHistory, name='TeamHistory'),
    path('World/<int:WorldID>/Player/<int:PlayerID>/', views.Page_Player, name='Player'),
    path('World/<int:WorldID>/Game/<int:GameID>/', views.Page_Game, name='Game'),
    path('World/<int:WorldID>/PlayerAnalytics/', views.Page_PlayerAnalytics, name='PlayerAnalytics'),
    path('World/<int:WorldID>/Bracket/', views.Page_Bracket, name='Bracket'),
    path('World/<int:WorldID>/ManageTeam/', views.Page_ManageTeam, name='ManageTeam'),
    path('World/<int:WorldID>/Recruiting/', views.Page_Recruiting, name='Recruiting'),
    path('World/<int:WorldID>/Coach/<int:CoachID>/', views.Page_Coach, name='Coach'),
    path('World/<int:WorldID>/Season/<int:SeasonStartYear>/', views.Page_Season, name='Season'),
    path('World/<int:WorldID>/Conference/<int:ConferenceID>/', views.Page_Conference, name='Conference'),
    path('World/<int:WorldID>/Conferences/', views.Page_Conferences, name='Conferences'),
    path('World/<int:WorldID>/Top25/', views.Page_Top25, name='Top25'),

    path('World/<int:WorldID>/Search/<str:SearchInput>/', views.Page_Search, name='Search'),

    #POSTS BELOW
    path('World/<int:WorldID>/SimDay/', views.POST_SimDay, name='SimDay'),
    path('World/<int:WorldID>/PickTeam/', views.POST_PickTeam, name='PickTeam'),
    path('CreateLeague/', views.POST_CreateLeague, name='CreateLeague'),
    path('World/<int:WorldID>/Player/<int:PlayerID>/SetPlayerFaceJSON', views.POST_SetPlayerFaceJson, name='SetPlayerFaceJSON'),

    #GETS BELOW
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamHistory', views.GET_TeamHistory, name='TeamHistory'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamRoster', views.GET_TeamRoster, name='TeamRoster'),
    path('World/<int:WorldID>/Team/<int:TeamID>/TeamSchedule', views.GET_TeamSchedule, name='TeamSchedule'),
    path('World/<int:WorldID>/WorldHistory', views.GET_WorldHistory, name='WorldHistory'),
    path('World/<int:WorldID>/ConferenceStandings', views.GET_ConferenceStandings, name='ConferenceStandings'),
    path('World/<int:WorldID>/ConferenceStandings/<int:ConferenceID>', views.GET_ConferenceStandings, name='ConferenceStandings'),
    path('World/<int:WorldID>/AllTeamStats', views.GET_AllTeamStats, name='AllTeamStats'),
    path('World/<int:WorldID>/AwardRaces', views.GET_AwardRaces, name='AwardRaces'),

    path('audit/', views.Page_Audit, name='Audit'),
    path('audit/ShootingPercentages/<int:WorldID>/', views.Page_Audit_ShootingPercentages, name='AuditShootingPercentages'),
    path('admin/', admin.site.urls),

]
