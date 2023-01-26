import pandas as pd
from sklearn.linear_model import LogisticRegression, LinearRegression
import os
import json


key_map = {
    "Awareness": 'overall.awareness',
    "Speed": 'athleticism.speed',
    "Acceleration": 'athleticism.acceleration',
    "Agility": 'athleticism.agility',
    "Jumping": 'athleticism.jumping',
    "Strength": 'athleticism.strength',
    "Throw Power": 'passing.throwing_power',
    "Throw Accuracy Short": 'passing.short_throw_accuracy',
    "Throw Accuracy Middle": 'passing.medium_throw_accuracy',
    "Throw Accuracy Deep": 'passing.deep_throw_accuracy',
    "Throw Under Pressure": 'passing.throw_under_pressure',
    "Throw On The Run": 'passing.throw_on_run',
    "Ball Carrier Vision": 'rushing.ball_carrier_vision',
    "Play Action": 'passing.play_action',
    "Toughness": 'athleticism.toughness',
    "Carrying": 'rushing.carrying',
    "Break Tackle": 'rushing.break_tackle',
    "Trucking": 'rushing.trucking',
    "Spin Move": 'rushing.elusiveness',
    "Finesse Moves": 'defense.finesse_moves',
    "Change Of Direction": 'athleticism.change_of_direction',
    "Catching": 'receiving.catching',
    "Catch In Traffic": 'receiving.catch_in_traffic',
    "Short Route Running": 'receiving.route_running',
    "Spectacular Catch": 'receiving.spectacular_catch',
    "Impact Blocking": 'blocking.impact_block',
    "Lead Blocking": 'blocking.lead_blocking',
    "Run Block": 'blocking.run_block',
    "Run Block Power": 'blocking.run_block_power',
    "Pass Block": 'blocking.pass_block',
    "Pass Block Power": 'blocking.pass_block_power',
    "Play Recognition": 'defense.play_recognition',
    "Tackle": 'defense.tackle',
    "Pursuit": 'defense.pursuit',
    "Power Moves": 'defense.power_moves',
    "Pass Block Finesse": 'blocking.pass_block_finesse',
    "Run Block Finesse": 'blocking.run_block_finesse',
    "Release": 'receiving.release',
    "Hit Power": 'defense.hit_power',
    "Block Shedding": 'defense.block_shedding',
    "Man Coverage": 'defense.man_coverage',
    "Zone Coverage": 'defense.zone_coverage',
    "Press": 'defense.press',
    "Kick Power": 'kicking.kick_power',
    "Kick Accuracy": 'kicking.kick_accuracy',
    "Kick Return": 'athleticism.injury',
    "Stamina": 'athleticism.injury',
    "Injury": 'athleticism.injury',
    "Medium Route Running": 'receiving.medium_route_running',
    "Deep Route Running": 'receiving.deep_route_running',
    "Stiff Arm": 'rushing.stiff_arm',
    "Juke Move": 'rushing.juke_move',
    "Break Sack": 'passing.break_sack',
    "Position": 'position',
    "Archetype": 'archetype'
}

position_skill_group_map = {
    'QB': ["overall", "athleticism", "passing", "rushing"],
    'RB': ["overall", "athleticism", "rushing"],
    'FB': ["overall", "athleticism", "rushing", "Blocking"],
    'WR': ["overall", "athleticism", "receiving"],
    'TE': ["overall", "athleticism", "receiving", "blocking"],
    'OT': ["overall", "athleticism", "blocking"],
    'G': ["overall", "athleticism", "blocking"],
    'C': ["overall", "athleticism", "blocking"],
    'EDGE': ["overall", "athleticism", "defense"],
    'DL': ["overall", "athleticism", "defense"],
    'LB': ["overall", "athleticism", "defense"],
    'CB': ["overall", "athleticism", "defense"],
    'S': ["overall", "athleticism", "defense"],
    'K': ["overall", "kicking"],
    'P': ["overall", "kicking"], }


def insert_to_dict(obj, key, val):
    key_split = key.split('.')
    iter_obj = obj

    for ind, key_part in enumerate(key_split):
        if ind == len(key_split) - 1:
            iter_obj[key_part] = val
        else:
            if key_part not in iter_obj:
                iter_obj[key_part] = {}

            iter_obj = iter_obj[key_part]

    return iter_obj


__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))
# Read the data from the CSV file
df = pd.read_excel(os.path.join(
    __location__, "madden_nfl_23_player_ratings.xlsx"))

df['Position'].replace({"FS": "S", "HB": "RB", "LE": "EDGE", "RE": "EDGE","DT": "DL","SS": "S",
                       "LG": "G", "RG": "G", "LOLB": "LB", "ROLB": "LB", "MLB": "LB", "LT": "OT", "RT": "OT"}, inplace=True)

df.rename(columns=key_map, inplace=True)

# Group the data by the "Position" field
grouped_df_pos = df.groupby(["position", "archetype"])

coefs_pos = []

for name, group in grouped_df_pos:

    position = name[0]
    archetype = name[1]

    X = group[[col for col in group.columns if col.startswith(tuple(position_skill_group_map[position]))]]

    # Select the overall rating column as the target variable
    y = group["Overall Rating"]

    # Create a linear regression object
    reg = LinearRegression()

    # Fit the model using the selected columns
    reg.fit(X, y)

    coef_mapped = dict(zip(X.columns, reg.coef_))
    coef_mapped['position'] = position
    coef_mapped['archetype'] = archetype
    coefs_pos.append(coef_mapped)

output_list = []
saved_keys = ['position', 'archetype']
for coef in coefs_pos:
    print(coef)
    lowest_val = 1
    for key, val in coef.items():
        if key in saved_keys:
            continue
        print(key, val, lowest_val)
        if lowest_val is None or val < lowest_val:
            lowest_val = val
        
    if lowest_val < 0:
        for key, val in coef.items():
            if key in saved_keys:
                continue
            coef[key] += (lowest_val * -1)
    
    summed_vals = sum([val for key, val in coef.items() if key not in saved_keys])
    
    for key, val in coef.items():
        if key in saved_keys:
            continue
        coef[key] = val / summed_vals

    output_obj = {}
    for key in coef:
        insert_to_dict(output_obj, key, coef[key])

    output_list.append(output_obj)

print(output_list)
with open('pro/frontend/static/data/import_json/player_overall_coefficients.json', 'w') as file:
    json.dump(output_list, file, indent=2)
