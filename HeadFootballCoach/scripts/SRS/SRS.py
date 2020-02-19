'''
    Simple Rating System
    by: Kyle Galloway

    # A rudimentary college football rating system.
'''
import sys
import time
from .includes.graph import Graph

def CalculateSRS(TeamList, GameList):

    G = Graph()

    for T in TeamList:
        G.addTeam(T)

    G.buildGraph(GameList)
    print()
    G.rateTeams()
    print()
    teams = G.getTeams()
    teamNames = G.getTeamNames()
    count = 1

    ReturnList = []
    for team in sorted(teams.keys(),key=lambda team: teamNames[teams[team]].head.getRating(),reverse=True):
        thisTeam = teams[team]
        rating = teamNames[thisTeam].head.getRating()
        W = teamNames[thisTeam].head.getWins()
        L = teamNames[thisTeam].head.getLosses()
        T = teamNames[thisTeam].head.getTies()
        spacer = ' ' * (32 - len(str(team.TeamID.TeamName)))
        print((('{0}        {1}{2}{3}-{4}-{5}    {6}').format(count,str(team.TeamID.TeamName),spacer,W,L,T,round(rating,4))))
        ReturnList.append({'TeamSeason': team, 'Rating': rating})
        count += 1

    return ReturnList
