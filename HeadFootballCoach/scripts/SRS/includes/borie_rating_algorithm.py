

class RatingAlgorithm():

    def __init__(self, iterations = 5000):
        self.ITERATION_CONSTANT = 50

    def improveScores(self,scoreDiff):
        if scoreDiff > 21:
            scoreDiff = 3
        elif scoreDiff > 14:
            scoreDiff = 2
        elif scoreDiff > 0:
            scoreDiff = 1
        elif scoreDiff <= -28:
            scoreDiff = -7
        elif scoreDiff <= -14:
            scoreDiff = -5
        elif scoreDiff <= -7:
            scoreDiff = -4
        elif scoreDiff < 0:
            scoreDiff = -3

        return scoreDiff

    def rateTeams(self, array, dict):
        for team in range(len(array)):
            place = array[team].head.next
            total, count, W, L, T = 0, 0 ,0 ,0 ,0
            while place != None:
                scoreDiff = place.getScoreDiff()
                if scoreDiff > 0: W += 1
                elif scoreDiff < 0: L += 1
                else: T += 1
                total += scoreDiff
                count += 1
                place = place.next
            avg = total / count if count > 0 else 0
            array[team].head.setPerformance(avg)
            array[team].head.setRating(avg)
            array[team].head.setWins(W)
            array[team].head.setLosses(L)
            array[team].head.setTies(T)
        for i in range(self.ITERATION_CONSTANT):
            for team in range(len(array)):
                place = array[team].head.next
                total, count = 0, 0
                while place != None:
                    team2 = dict[place.getTeam2()]
                    total += array[team2].head.getRating()
                    count += 1
                    place = place.next
                avg = (total / (count / (.975 ** i))) if count > 0 else 0
                array[team].head.setScheduleFactor(avg)
            for team in range(len(array)):
                performance = array[team].head.getPerformance()
                scheduleFactor = array[team].head.getScheduleFactor()
                newRating = performance + scheduleFactor
                array[team].head.setRating(newRating)

        return array
