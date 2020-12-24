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
    G.rateTeams()
    print()
    teams = G.getTeams()
    teamNames = G.getTeamNames()
    count = 1

    RatingBounds = {'MinRating': 0, 'MaxRating': 0}
    ReturnList = []
    for team in sorted(teams.keys(),key=lambda team: teamNames[teams[team]].head.getRating(),reverse=True):
        thisTeam = teams[team]
        rating = teamNames[thisTeam].head.getRating()
        if rating is None:
            rating = 0

        if RatingBounds['MaxRating'] == 0 or RatingBounds['MinRating'] == 0:
            RatingBounds['MaxRating'] = rating
            RatingBounds['MinRating'] = rating

        else:
            if rating > RatingBounds['MaxRating'] or RatingBounds['MaxRating'] is None:
                RatingBounds['MaxRating'] = rating
            if rating < RatingBounds['MinRating'] or RatingBounds['MinRating'] is None:
                RatingBounds['MinRating'] = rating

    RatingFloorModifier = 0 - RatingBounds['MinRating']
    RatingNormalizationModifier = 100 / (1 + RatingBounds['MaxRating'] - RatingBounds['MinRating'])
    for team in sorted(teams.keys(),key=lambda team: teamNames[teams[team]].head.getRating(),reverse=True):
        thisTeam = teams[team]
        rating = teamNames[thisTeam].head.getRating()
        W = teamNames[thisTeam].head.getWins()
        L = teamNames[thisTeam].head.getLosses()
        T = teamNames[thisTeam].head.getTies()
        spacer = ' ' * (32 - len(str(team.TeamID.TeamName)))

        rating = (rating + RatingFloorModifier) * RatingNormalizationModifier
        print((('{0}        {1}{2}{3}-{4}    {5}').format(count,str(team.TeamID.TeamName),spacer,W,L,round(rating,4))))
        ReturnList.append({'TeamSeason': team, 'Rating': rating})
        count += 1

    return ReturnList
