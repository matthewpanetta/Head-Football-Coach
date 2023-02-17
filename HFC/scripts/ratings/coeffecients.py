import pandas as pd
from sklearn.linear_model import Ridge
import os
import json


key_map = {
    "awareness_rating": 'intangibles.awareness',
    "speed_rating": 'athleticism.speed',
    "acceleration_rating": 'athleticism.acceleration',
    "agility_rating": 'athleticism.agility',
    "jumping_rating": 'athleticism.jumping',
    "strength_rating": 'athleticism.strength',
    "throwPower_rating": 'passing.throw_power',
    "throwAccuracyShort_rating": 'passing.short_throw_accuracy',
    "throwAccuracyMid_rating": 'passing.medium_throw_accuracy',
    "throwAccuracyDeep_rating": 'passing.deep_throw_accuracy',
    "throwUnderPressure_rating": 'passing.throw_under_pressure',
    "throwOnTheRun_rating": 'passing.throw_on_run',
    "bCVision_rating": 'rushing.ball_carrier_vision',
    "playAction_rating": 'passing.play_action',
    "toughness_rating": 'athleticism.toughness',
    "carrying_rating": 'rushing.carrying',
    "breakTackle_rating": 'rushing.break_tackle',
    "trucking_rating": 'rushing.trucking',
    "spinMove_rating": 'rushing.elusiveness',
    "finesseMoves_rating": 'defense.pass_rush_finesse',
    "changeOfDirection_rating": 'rushing.change_of_direction',
    "catching_rating": 'receiving.catching',
    "catchInTraffic_rating": 'receiving.catch_in_traffic',
    "shortRouteRunning_rating": 'receiving.route_running',
    "spectacularCatch_rating": 'receiving.spectacular_catch',
    "impactBlocking_rating": 'blocking.impact_block',
    "leadBlock_rating": 'blocking.lead_blocking',
    "runBlock_rating": 'blocking.run_block',
    "runBlockPower_rating": 'blocking.run_block_power',
    "passBlock_rating": 'blocking.pass_block',
    "passBlockPower_rating": 'blocking.pass_block_power',
    "playRecognition_rating": 'intangibles.play_recognition',
    "tackle_rating": 'defense.tackle',
    "pursuit_rating": 'defense.pursuit',
    "powerMoves_rating": 'defense.pass_rush_power',
    "passBlockFinesse_rating": 'blocking.pass_block_finesse',
    "runBlockFinesse_rating": 'blocking.run_block_finesse',
    "release_rating": 'receiving.release',
    "hitPower_rating": 'defense.hit_power',
    "blockShedding_rating": 'defense.block_shedding',
    "manCoverage_rating": 'defense.man_coverage',
    "zoneCoverage_rating": 'defense.zone_coverage',
    "press_rating": 'defense.press',
    "kickPower_rating": 'special_teams.kick_power',
    "kickAccuracy_rating": 'special_teams.kick_accuracy',
    'kickReturn_rating': 'special_teams.kick_return',
    "Kick Return": 'athleticism.injury',
    "stamina_rating": 'athleticism.injury',
    "injury_rating": 'athleticism.injury',
    "mediumRouteRunning_rating": 'receiving.medium_route_running',
    "deepRouteRunning_rating": 'receiving.deep_route_running',
    "stiffArm_rating": 'rushing.stiff_arm',
    "jukeMove_rating": 'rushing.juke_move',
    "breakSack_rating": 'passing.break_sack',
    "position": 'position',
    "archetype": 'archetype',
}

position_skill_group_map = {
    'QB': ["intangibles", "athleticism", "passing", "rushing"],
    'RB': ["intangibles", "athleticism", "rushing"],
    'FB': ["intangibles", "athleticism", "rushing", "Blocking"],
    'WR': ["intangibles", "athleticism", "receiving"],
    'TE': ["intangibles", "athleticism", "receiving", "blocking"],
    'OT': ["intangibles", "athleticism", "blocking"],
    'G': ["intangibles", "athleticism", "blocking"],
    'C': ["intangibles", "athleticism", "blocking"],
    'EDGE': ["intangibles", "athleticism", "defense"],
    'DL': ["intangibles", "athleticism", "defense"],
    'LB': ["intangibles", "athleticism", "defense"],
    'CB': ["intangibles", "athleticism", "defense"],
    'S': ["intangibles", "athleticism", "defense"],
    'K': ["intangibles", "special_teams"],
    'P': ["intangibles", "special_teams"], }

all_skill_groups = [
    'intangibles', "athleticism", "passing", "rushing", "receiving", "blocking", "defense", "special_teams"
]


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
# Read the data from the json file

# df_list = [pd.read_json(file_name) for file_name in ['scripts/players/m22-ratings-final.json','scripts/players/m23-ratings-week-1.json','scripts/players/m23-ratings-week-9.json','scripts/players/m23-ratings-final.json']]
df_list = [pd.read_json(file_name) for file_name in ['../players/m22-ratings-final.json','../players/m23-ratings-week-1.json','../players/m23-ratings-week-9.json','../players/m23-ratings-final.json']]
df = pd.concat(df_list, ignore_index=True)

df['position'].replace({"FS": "S", "HB": "RB", "LE": "EDGE", "RE": "EDGE", "DT": "DL", "SS": "S",
                       "LG": "G", "RG": "G", "LOLB": "LB", "ROLB": "LB", "MLB": "LB", "LT": "OT", "RT": "OT"}, inplace=True)

df.loc[df['archetype'] == 'OLB_SpeedRusher', 'position'] = 'EDGE'
df.loc[df['archetype'] == 'OLB_PowerRusher', 'position'] = 'EDGE'

df.loc[df['archetype'] == 'DE_PowerRusher', 'position'] = 'DL'
df.loc[df['archetype'] == 'DE_RunStopper', 'position'] = 'DL'

# df.loc[(df['position'] == 'OT') & ~('OT' not in (df['archetype'])), 'archetype'] = 'OT_Agile'

df.rename(columns=key_map, inplace=True)

# Group the data by the "position" field
grouped_df_pos = df.groupby(["position", "archetype"])
grouped_df_pos_null = df.groupby("position")

group_list = [grouped_df_pos, grouped_df_pos_null]

# grouped_df_pos = df.groupby("position")

position_results = []

for group_df in group_list:
    for name, group in group_df:

        if type(name) == str:
            position = name
            archetype = f'{position}_Balanced'
        else:
            position = name[0]
            archetype = name[1]

        relevant_skills_x = group[[col for col in group.columns if col.startswith(
            tuple(position_skill_group_map[position]))]]
        all_skills_x = group[[col for col in group.columns if col.startswith(
            tuple(all_skill_groups))]]
        # Select the overall rating column as the target variable
        y = group["overall_rating"]

        # Create a linear regression object
        # reg = Ridge()
        reg = Ridge(alpha=0.65, positive=True)

        # Fit the model using the selected columns
        reg.fit(relevant_skills_x, y)

        position_dict = {
            'position': position,
            'archetype': archetype,
            'skills': {}
        }

        coef_mapped = dict(zip(relevant_skills_x.columns, reg.coef_))
        mean_mapped = dict(zip(all_skills_x.columns, all_skills_x.mean()))
        std_mapped = dict(zip(all_skills_x.columns, all_skills_x.std()))
        # quan_mapped = dict(zip(all_skills_x.columns, all_skills_x.quantile(.25)))

        for data, key in [(coef_mapped, 'original_ovr_weight'), (mean_mapped, 'mean'), (std_mapped, 'std')]:
            for field in data:
                if field not in position_dict['skills']:
                    position_dict['skills'][field] = {}

                position_dict['skills'][field][key] = round(data[field], 2)

        position_results.append(position_dict)

output_list = []
saved_keys = ['position', 'archetype']
for position_dict in position_results:
    lowest_original_ovr_weight = None
    for key, skill_dict in position_dict['skills'].items():
        # if 'original_ovr_weight' not in skill_dict:
        #     skill_dict['original_ovr_weight'] = 0
        if 'original_ovr_weight' in skill_dict and (lowest_original_ovr_weight is None or (skill_dict['original_ovr_weight'] < lowest_original_ovr_weight)):
            lowest_original_ovr_weight = skill_dict['original_ovr_weight']

    starting_summed_original_ovr_weights = sum(
        [skill_dict['original_ovr_weight'] for key, skill_dict in position_dict['skills'].items() if 'original_ovr_weight' in skill_dict])

    if lowest_original_ovr_weight >= 0:
        lowest_original_ovr_weight = 0
    
    for key, skill_dict in position_dict['skills'].items():
        if 'original_ovr_weight' in skill_dict:
            position_dict['skills'][key]['zero_based_ovr_weight'] = round((
                lowest_original_ovr_weight * -1) + position_dict['skills'][key]['original_ovr_weight'], 2)
        else:
            position_dict['skills'][key]['zero_based_ovr_weight'] = 0

    ending_summed_original_ovr_weights = sum(
        [skill_dict['zero_based_ovr_weight'] for key, skill_dict in position_dict['skills'].items()])

    print(position_dict['position'], starting_summed_original_ovr_weights, ending_summed_original_ovr_weights, )
    for key in position_dict['skills']:
        position_dict['skills'][key]['ovr_weight_percentage'] = round(position_dict['skills'][key]['zero_based_ovr_weight'] *
                                                                      starting_summed_original_ovr_weights / ending_summed_original_ovr_weights, 4)
        position_dict['skills'][key]['one_based_ovr_weight_percentage'] = round(position_dict['skills'][key]['zero_based_ovr_weight'] /
                                                                                ending_summed_original_ovr_weights, 4)

    output_obj = {}
    for key in position_dict['skills']:
        insert_to_dict(output_obj, key, position_dict['skills'][key])

    position_dict['skills'] = output_obj
    output_list.append(position_dict)

# print(json.dumps(output_list, indent=2))
out_file_location = 'pro/frontend/static/data/import_json/player_archetype_overall_coefficients.json'
out_file_location = '../../pro/frontend/static/data/import_json/player_archetype_overall_coefficients.json'
with open(out_file_location, 'w') as file:
    json.dump(output_list, file, indent=2)
    # json.dump(output_list, file, separators=(',', ':'))
    print('Writing file for ', len(output_list),
          'positions + archetypes to ', out_file_location)
