import random

all_selected_numbers = set()
round_draws = []

rounds_to_play = 7
draws_per_round = 5
possible_values = 45

print()

for round in range(0,rounds_to_play):
    round_draws.append([])
    for draw in range(0,draws_per_round):
        r = random.randint(1,possible_values)
        while r in all_selected_numbers:
            r = random.randint(1,possible_values)

        all_selected_numbers.add(r)
        round_draws[round].append(r)


for round in round_draws:
    print(sorted(round))
