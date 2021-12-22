import random
import itertools

number_combinations = set()
round_draws = []

rounds_to_play = 100
draws_per_round = 5
possible_values = 45

past_values = {2021: {1: 66, 2: 77, 3: 66, 4: 67, 5: 78, 6: 92, 7: 77, 8: 73, 9: 88, 10: 66, 11: 78, 12: 83, 13: 80, 14: 78, 15: 91, 16: 83, 17: 68, 18: 69, 19: 64, 20: 87, 21: 67, 22: 62, 23: 63, 24: 65, 25: 70, 26: 77, 27: 73, 28: 73, 29: 73, 30: 84, 31: 78, 32: 81, 33: 75, 34: 74, 35: 87, 36: 83, 37: 68, 38: 73, 39: 63, 40: 75, 41: 70, 42: 76, 43: 84, 44: 79, 45: 86},
               2020: {1: 78, 2: 85, 3: 84, 4: 79, 5: 91, 6: 90, 7: 81, 8: 79, 9: 78, 10: 80, 11: 84, 12: 85, 13: 89, 14: 85, 15: 81, 16: 82, 17: 80, 18: 79, 19: 88, 20: 69, 21: 62, 22: 82, 23: 74, 24: 71, 25: 72, 26: 90, 27: 79, 28: 87, 29: 83, 30: 81, 31: 75, 32: 88, 33: 86, 34: 70, 35: 72, 36: 73, 37: 96, 38: 91, 39: 92, 40: 93, 41: 66, 42: 82, 43: 90, 44: 83, 45: 75},
               2019: {1: 69, 2: 80, 3: 86, 4: 93, 5: 78, 6: 82, 7: 72, 8: 79, 9: 80, 10: 89, 11: 78, 12: 81, 13: 79, 14: 79, 15: 87, 16: 88, 17: 69, 18: 88, 19: 75, 20: 73, 21: 84, 22: 69, 23: 75, 24: 71, 25: 85, 26: 77, 27: 109, 28: 81, 29: 92, 30: 87, 31: 92, 32: 92, 33: 83, 34: 68, 35: 89, 36: 72, 37: 67, 38: 80, 39: 90, 40: 81, 41: 73, 42: 85, 43: 90, 44: 72, 45: 81},
               2018: {1: 88, 2: 68, 3: 73, 4: 83, 5: 85, 6: 78, 7: 86, 8: 88, 9: 78, 10: 94, 11: 81, 12: 79, 13: 90, 14: 77, 15: 91, 16: 67, 17: 83, 18: 83, 19: 88, 20: 87, 21: 80, 22: 79, 23: 89, 24: 80, 25: 85, 26: 70, 27: 86, 28: 84, 29: 77, 30: 62, 31: 80, 32: 73, 33: 70, 34: 79, 35: 87, 36: 85, 37: 85, 38: 81, 39: 79, 40: 73, 41: 96, 42: 84, 43: 104, 44: 59, 45: 76},
               2017: {1: 85, 2: 99, 3: 80, 4: 66, 5: 68, 6: 70, 7: 83, 8: 75, 9: 88, 10: 82, 11: 78, 12: 77, 13: 86, 14: 94, 15: 85, 16: 75, 17: 78, 18: 84, 19: 72, 20: 83, 21: 72, 22: 98, 23: 83, 24: 94, 25: 85, 26: 78, 27: 97, 28: 83, 29: 74, 30: 87, 31: 64, 32: 80, 33: 92, 34: 74, 35: 81, 36: 78, 37: 77, 38: 74, 39: 74, 40: 87, 41: 76, 42: 75, 43: 84, 44: 78, 45: 97},
               2016: {1: 89, 2: 83, 3: 68, 4: 75, 5: 71, 6: 84, 7: 80, 8: 78, 9: 86, 10: 73, 11: 79, 12: 78, 13: 85, 14: 90, 15: 76, 16: 84, 17: 98, 18: 77, 19: 86, 20: 80, 21: 84, 22: 100, 23: 78, 24: 84, 25: 87, 26: 89, 27: 85, 28: 64, 29: 70, 30: 81, 31: 89, 32: 85, 33: 83, 34: 89, 35: 77, 36: 90, 37: 74, 38: 92, 39: 80, 40: 75, 41: 73, 42: 74, 43: 80, 44: 77, 45: 75},
               2015: {1: 85, 2: 85, 3: 85, 4: 67, 5: 83, 6: 80, 7: 97, 8: 60, 9: 82, 10: 81, 11: 79, 12: 80, 13: 70, 14: 69, 15: 80, 16: 89, 17: 88, 18: 90, 19: 80, 20: 80, 21: 80, 22: 69, 23: 85, 24: 90, 25: 83, 26: 90, 27: 92, 28: 97, 29: 68, 30: 86, 31: 71, 32: 74, 33: 75, 34: 95, 35: 75, 36: 63, 37: 72, 38: 79, 39: 92, 40: 78, 41: 83, 42: 82, 43: 84, 44: 81, 45: 86},
               2014: {1: 90, 2: 85, 3: 91, 4: 88, 5: 98, 6: 92, 7: 96, 8: 90, 9: 79, 10: 100, 11: 97, 12: 75, 13: 88, 14: 88, 15: 78, 16: 89, 17: 90, 18: 96, 19: 96, 20: 80, 21: 87, 22: 84, 23: 83, 24: 93, 25: 90, 26: 79, 27: 98, 28: 99, 29: 75, 30: 86, 31: 86, 32: 77, 33: 86, 34: 88, 35: 86, 36: 92, 37: 75, 38: 88, 39: 90, 40: 39, 41: 34, 42: 47, 43: 40, 44: 26, 45: 36},
}

historical_values = {}
total_count = 0

for year, year_dict in past_values.items():
    for val, count in year_dict.items():
        if val not in historical_values:
            historical_values[val] = 0

        historical_values[val] += count


for val, count in historical_values.items():
    historical_values[val] = int(historical_values[val] ** 1.5)
    total_count += historical_values[val]

historical_values_items = sorted(list(historical_values.items()), key = lambda k: k[1], reverse = True)

print(historical_values_items)
average_count = total_count / len(historical_values_items)
print(average_count)

print([o for o in historical_values_items if o[1] > average_count * 1.066 or o[1] < average_count * .933 ])


def weighted_random_choice(map, default = 1):
    total_odds = 0
    map_items = list(map.items())
    for key, odds in map_items:
        #odds -= 100
        total_odds += odds

    r = random.randint(0, total_odds)
    ind = 0

    while r > 0:
        r -= map_items[ind][1]
        ind += 1

    return map_items[ind - 1][0]



def generate_random_int(floor, ceiling):
    return weighted_random_choice(historical_values, default = 1)



attempt_count = 0

while len(round_draws) < rounds_to_play and attempt_count < 1000:
    has_repeat = False
    round = len(round_draws)
    this_round_draw = set()
    for draw in range(0,draws_per_round):
        r = generate_random_int(1,possible_values)
        while r in this_round_draw:
            r = generate_random_int(1,possible_values)

        this_round_draw.add(r)

    combos = itertools.combinations(this_round_draw, 2)

    for combo in combos:
        sorted_combo = sorted(combo)
        combo_str = f'{sorted_combo[0]},{sorted_combo[1]}'

        if combo_str in number_combinations:
            #print('found repeat combo!', combo_str)
            has_repeat = True
        number_combinations.add(combo_str)

    if not has_repeat:
        print('\n', sorted(this_round_draw) )
        round_draws.append(this_round_draw)

    attempt_count += 1
    if attempt_count % 100 == 0:
        print(f'attempt_count {attempt_count}')
