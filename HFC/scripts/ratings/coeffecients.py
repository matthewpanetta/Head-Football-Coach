import pandas as pd
from sklearn.linear_model import Ridge
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
df = pd.read_csv(os.path.join(
    __location__, "Madden NFL 23 Player Ratings.csv"))

df['Position'].replace({"FS": "S", "HB": "RB", "LE": "EDGE", "RE": "EDGE", "DT": "DL", "SS": "S",
                       "LG": "G", "RG": "G", "LOLB": "LB", "ROLB": "LB", "MLB": "LB", "LT": "OT", "RT": "OT"}, inplace=True)

df.loc[df['Archetype'] == 'OLB_SpeedRusher', 'Position'] = 'EDGE'
df.loc[df['Archetype'] == 'OLB_PowerRusher', 'Position'] = 'EDGE'

df.loc[df['Archetype'] == 'DE_PowerRusher', 'Position'] = 'DL'
df.loc[df['Archetype'] == 'DE_RunStopper', 'Position'] = 'DL'

df.rename(columns=key_map, inplace=True)

# Group the data by the "Position" field
# grouped_df_pos = df.groupby(["position", "archetype"])
grouped_df_pos = df.groupby("position")

position_results = []

for name, group in grouped_df_pos:

    if type(name) == str:
        position = name
        archetype = ''
    else:
        position = name[0]
        archetype = name[1]

    relevant_skills_x = group[[col for col in group.columns if col.startswith(
        tuple(position_skill_group_map[position]))]]
    all_skills_x = group.loc[:, "overall.awareness":"athleticism.injury"]
    # Select the overall rating column as the target variable
    y = group["Overall Rating"]

    # Create a linear regression object
    reg = Ridge()

    # Fit the model using the selected columns
    reg.fit(relevant_skills_x, y)

    position_dict = {
        'position': position,
        'archetype': archetype,
        'skills': {}
    }

    coef_mapped = dict(zip(relevant_skills_x.columns, reg.coef_))
    mean_mapped = dict(zip(all_skills_x.columns, all_skills_x.mean()))
    quan_mapped = dict(zip(all_skills_x.columns, all_skills_x.quantile(.25)))

    # How to be more pythonic?
    for data, key in [(coef_mapped, 'original_ovr_weight'), (mean_mapped, 'mean'), (quan_mapped, '25th_quan')]:
        for field in data:
            if field not in position_dict['skills']:
                position_dict['skills'][field] = {}

            position_dict['skills'][field][key] = round(data[field], 2)

    # print(json.dumps(position_dict, indent=2))
    position_results.append(position_dict)

output_list = []
saved_keys = ['position', 'archetype']
for position_dict in position_results:
    lowest_original_ovr_weight = None
    for key, skill_dict in position_dict['skills'].items():
        if 'original_ovr_weight' not in skill_dict:
            skill_dict['original_ovr_weight'] = 0
        if lowest_original_ovr_weight is None or (skill_dict['original_ovr_weight'] < lowest_original_ovr_weight):
            lowest_original_ovr_weight = skill_dict['original_ovr_weight']

    starting_summed_original_ovr_weights = sum(
        [skill_dict['original_ovr_weight'] for key, skill_dict in position_dict['skills'].items()])

    for key in position_dict['skills']:
        position_dict['skills'][key]['zero_based_ovr_weight'] = (
            lowest_original_ovr_weight * -1) + position_dict['skills'][key]['original_ovr_weight']

    ending_summed_original_ovr_weights = sum(
        [skill_dict['zero_based_ovr_weight'] for key, skill_dict in position_dict['skills'].items()])

    for key in position_dict['skills']:
        position_dict['skills'][key]['ovr_weight_percentage'] = position_dict['skills'][key]['zero_based_ovr_weight'] * \
            starting_summed_original_ovr_weights / ending_summed_original_ovr_weights
        position_dict['skills'][key]['one_based_ovr_weight_percentage'] = position_dict['skills'][key]['zero_based_ovr_weight'] / \
            ending_summed_original_ovr_weights

    output_obj = {}
    for key in position_dict['skills']:
        insert_to_dict(output_obj, key, position_dict['skills'][key])

    position_dict['skills'] = output_obj
    output_list.append(position_dict)

# print(json.dumps(output_list, indent=2))
out_file_location = 'pro/frontend/static/data/import_json/player_archetype_overall_coefficients.json'
with open(out_file_location, 'w') as file:
    json.dump(output_list, file, indent=2)
    print('Writing file for ', len(output_list),
          'positions + archetypes to ', out_file_location)
