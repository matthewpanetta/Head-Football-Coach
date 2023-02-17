import csv
import json
import re

new_key_map = {'college': 'college', 'awareness_rating': 'intangibles.awareness',
               'strength_rating': 'athleticism.strength', 'catchInTraffic_rating': 'receiving.catch_in_traffic',
               'pursuit_rating': 'defense.pursuit',
               'catching_rating': 'receiving.catching', 'spinMove_rating': 'rushing.elusiveness',
               'height': 'height', 'finesseMoves_rating': 'defense.pass_rush_finesse',
               'runBlock_rating': 'blocking.run_block', 'tackle_rating': 'defense.tackle',
               'zoneCoverage_rating': 'defense.zone_coverage',
               'totalSalary': 'total_salary',
               'trucking_rating': 'rushing.trucking', 'jukeMove_rating': 'rushing.juke_move',
               'playRecognition_rating': 'intangibles.play_recognition', 'shortRouteRunning_rating': 'receiving.route_running',
               'lastName': 'last_name',
               'jerseyNum': 'jersey_number', 'breakSack_rating': 'passing.break_sack',
               'jumping_rating': 'athleticism.jumping', 'release_rating': 'receiving.release',
               'hitPower_rating': 'defense.hit_power', 'throwAccuracyMid_rating': 'passing.medium_throw_accuracy',
               'kickAccuracy_rating': 'special_teams.kick_accuracy', 'stamina_rating': 'athleticism.stamina',
               'kickPower_rating': 'special_teams.kick_power',
               'throwUnderPressure_rating': 'passing.throw_under_pressure', 'team': 'team',
               'signingBonus': 'signing_bonus', 'blockShedding_rating': 'defense.block_shedding',
               'fullNameForSearch': 'full_name', 'overall_rating': 'overall.overall',
               'passBlockFinesse_rating': 'blocking.pass_block_finesse',
               'throwPower_rating': 'passing.throw_power', 'kickReturn_rating': 'special_teams.kick_return',
               'leadBlock_rating': 'blocking.lead_blocking', 'bCVision_rating': 'rushing.ball_carrier_vision',
               'playAction_rating': 'passing.play_action', 'mediumRouteRunning_rating': 'receiving.medium_route_running',
               'acceleration_rating': 'athleticism.acceleration', 'spectacularCatch_rating': 'receiving.spectacular_catch',
               'injury_rating': 'athleticism.injury', 'weight': 'weight', 'deepRouteRunning_rating': 'receiving.deep_route_running',
               'firstName': 'first_name', 'yearsPro': 'years_pro',
               'throwAccuracyShort_rating': 'passing.short_throw_accuracy', 'position': 'position',
               'speed_rating': 'athleticism.speed', 'runBlockPower_rating': 'blocking.run_block_power',
               'toughness_rating': 'athleticism.toughness', 'throwOnTheRun_rating': 'passing.throw_on_run',
               'manCoverage_rating': 'defense.man_coverage', 'stiffArm_rating': 'rushing.stiff_arm',
               'powerMoves_rating': 'defense.pass_rush_power',
               'passBlockPower_rating': 'blocking.pass_block_power', 'impactBlocking_rating': 'blocking.impact_block',
               'carrying_rating': 'rushing.carrying', 'breakTackle_rating': 'rushing.break_tackle',
               'passBlock_rating': 'blocking.pass_block',
               'changeOfDirection_rating': 'rushing.change_of_direction', 'press_rating': 'defense.press',
               'throwAccuracyDeep_rating': 'passing.deep_throw_accuracy', 'archetype': 'archetype',
               'runBlockFinesse_rating': 'blocking.run_block_finesse',
               'agility_rating': 'athleticism.agility',
               'age': 'age', }


def int_or_null(val, default=None):
    if len(val) == 0:
        return default
    return int(val)


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


def clean_name(name):
    name = name.replace(' (IR)', '').replace(' (IRD)', '').replace(
        ' (SUS)', '').replace(' (PUP)', '').replace(' (NON)', '').replace(' (UFA)', '')
    name = name.replace(' Sr.', ' Sr').replace(' Sr', '')
    name = name.replace(' Jr.', ' Jr').replace(' Jr', '').replace('.', '')
    name = name.replace(' IV', '').replace(' III', '').replace(' II', '')

    name = name.strip()

    return name


def clean_22_key(key):
    return " ".join(re.findall(r'[A-Z][a-z]*', key)).replace(' Rating', '')


def clean_position(pos, archetype):
    switch_map = {"FS": "S", "HB": "RB", "LE": "EDGE", "RE": "EDGE", "DT": "DL", "SS": "S",
                  "LG": "G", "RG": "G", "LOLB": "LB", "ROLB": "LB", "MLB": "LB", "LT": "OT", "RT": "OT"}

    pos = switch_map.get(pos, pos)

    if archetype in ('OLB_SpeedRusher', 'OLB_PowerRusher'):
        pos = 'EDGE'
    elif archetype in ('DE_PowerRusher', 'DE_RunStopper'):
        pos = 'DL'

    return pos


player_map = {}
player_position_map = {}


file_names = ['m22-ratings-final.json', 'm23-ratings-week-1.json',
              'm23-ratings-week-9.json', 'm23-ratings-final.json', ]
player_list_list = []
for file_name in file_names:
    with open('scripts/players/'+file_name, 'r') as f:
        reader = json.load(f)
        player_list = []
        for row in reader:

            row = {new_key_map.get(key, key): val for key, val in row.items()}
            row['full_name'] = clean_name(row['full_name'])

            row['position'] = clean_position(row['position'], row['archetype'])

            for key, val in list(row.items()):

                if 'athleticism' in key or 'blocking' in key or 'overall' in key or 'intangibles' in key or 'passing' in key or 'rushing' in key or 'defense' in key or 'special_teams' in key or 'receiving' in key:
                    insert_to_dict(
                        row, 'current_player_team_season.ratings.'+key, val)
                    del row[key]
                else:
                    insert_to_dict(row, key, val)

            player_list.append(row)

        player_map = {}
        for player in player_list:
            player_position_map[player['full_name'] +
                                '|' + player['position']] = player

            if player['full_name'] not in player_map:
                player_map[player['full_name']] = []

            player_map[player['full_name']].append(player)

        player_list_list.append(player_list)

for player_list in reversed(player_list_list[:-1]):
    for player in player_list:
        if player['full_name'] not in player_map:
            player_map[player['full_name']] = [player]


missing_players = []
data = []
with open('scripts/players/Player input - Sheet1.csv', 'r') as f:

    reader = csv.DictReader(f)
    for row in reader:
        row['jersey_number'] = int_or_null(row['jersey_number'])
        player_name = clean_name(row['name'])

        row['name'] = {
            'first': player_name.split(' ')[0],
            'last': ' '.join(player_name.split(' ')[1:])
        }

        if len(row['body.height']) == 0:
            row['body.height'] = '6-2'
        row['body'] = {
            'height_inches': int(int_or_null(row['body.height'].split('-')[0], 0) * 12 + int_or_null(row['body.height'].split('-')[1])),
            'weight': int_or_null(row['body.weight'])
        }

        row['body']['height'] = f"{int(row['body']['height_inches'] / 12)}'{row['body']['height_inches'] % 12}"

        draft_info = row['drafted'].split(' / ')

        if len(draft_info) > 1:
            row['draft_info'] = {
                'team': draft_info[0],
                'round': int(re.findall(r'\d+', draft_info[1])[0]),
                'overall_pick': int(re.findall(r'\d+', draft_info[2])[0]),
                'year': int(re.findall(r'\d+', draft_info[3])[0]),
            }

        player_position = clean_position(row['position'], '')

        player_pos_obj = player_position_map.get(
            f'{player_name}|{player_position}', {})
        player_obj_list = player_map.get(f'{player_name}', [])
        if player_pos_obj == {}:
            if len(player_obj_list) != 1:
                missing_players.append(
                    {'player': row, 'player_obj_list': player_obj_list, 'player_pos_obj': player_pos_obj})
            else:
                player_pos_obj = player_obj_list[0]
        # if len(player_map_list) > 1:
        #     pass
        # elif len(player_map_list) == 0:
        #     missing_players.append(row)
        # else:
        #     player_obj = player_map_list[0]

        row['current_player_team_season'] = {
            'team_abbreviation': row['team'],
            'age': int_or_null(row['age']),
            'target_overall': int_or_null(row['target overall'], 0),
            'ratings': player_pos_obj.get('current_player_team_season', {}).get('ratings')
        }

        row['archetype'] = player_pos_obj.get('archetype', f'{row["position"]}_Balanced')

        del row['team']
        del row['age']
        del row['puid']
        del row['drafted']
        del row['target overall']
        del row['body.height']
        del row['body.weight']

        data.append(row)


missing_players = sorted(
    missing_players, key=lambda p: (int(p['player'].get('draft_info', {}).get('overall_pick', 1000)), -1 * int(p['player']['value'])), reverse=True)
# print(json.dumps([{'name': p['player']['name'], 'position': p['player']['position'], 'years_pro': int(
#     p['player'].get('years pro', 0)), 'player_pos_obj': len(p['player_pos_obj']), 'player_obj_list': len(p['player_obj_list']), 'drafted': p['player'].get('draft_info')} for p in missing_players], indent=2))

data = sorted(
    data, key=lambda x: x['current_player_team_season']['target_overall'], reverse=True)

with open('pro/frontend/static/data/import_json/players.json', 'w') as file:
    json.dump(data, file, indent=2)
    # json.dump(data, file, separators=(',', ':'))

print('File with', len(data),
      'players successfully written to pro/frontend/static/data/import_json/players.json')
