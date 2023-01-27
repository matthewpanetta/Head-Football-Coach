import csv
import json
import re

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
    "Archetype": 'archetype',
    "Full Name": 'full_name'
}

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

player_list = []
with open('scripts/players/Madden NFL 23 Player Ratings.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row = {key_map[key]: val for key, val in row.items() if key in key_map}

        for key, val in list(row.items()):
            
            if 'athleticism' in key or 'blocking' in key or 'overall' in key or 'passing' in key or 'rushing' in key or 'defense' in key or 'kicking' in key or 'receiving' in key:
                insert_to_dict(row, 'current_player_team_season.ratings.'+key, int_or_null(val, 0))
                del row[key]
            else:
                insert_to_dict(row, key, val)
        # print(json.dumps(row, indent=2))

        player_list.append(row)

player_map = {player['full_name']: player for player in player_list}

# print(json.dumps(player_map, indent=2))

data = []
with open('scripts/players/Player input - Sheet1.csv', 'r') as f:

    reader = csv.DictReader(f)
    for row in reader:
        row['jersey_number'] = int_or_null(row['jersey_number'])
        player_name = row['name']
        row['name'] = {
            'first': player_name.split(' ')[0], 
            'last': ' '.join(player_name.split(' ')[1:]).replace(' (IR)', '').replace(' (IRD)', '').replace(' (PUP)', '').replace(' (NON)', '').replace(' (UFA)', '')
            }

        if len(row['body.height']) == 0:
            row['body.height'] = '6-2'
        row['body'] = {
            'height_inches': int(int_or_null(row['body.height'].split('-')[0], 0) * 12 + int_or_null(row['body.height'].split('-')[1])),
            'weight': int_or_null(row['body.weight'])
        }

        row['body']['height'] = f"{int(row['body']['height_inches'] / 12)}'{row['body']['height_inches'] % 12}"

        print("row['name']", player_name)
        row['current_player_team_season'] = {
            'team_abbreviation': row['team'],
            'age': int_or_null(row['age']),
            'target_overall': int_or_null(row['target overall'], 0),
            'ratings': player_map.get(player_name, {}).get('current_player_team_season', {}).get('ratings')
        }
        print("row['current_player_team_season']", row['current_player_team_season'])

        draft_info = row['drafted'].split(' / ')

        if len(draft_info) > 1:
            row['draft_info'] = {
                'team': draft_info[0],
                'round': int(re.findall(r'\d+', draft_info[1])[0]),
                'overall_pick': int(re.findall(r'\d+', draft_info[2])[0]),
                'year': int(re.findall(r'\d+', draft_info[3])[0]),
            }

        del row['team']
        del row['age']
        del row['puid']
        del row['drafted']
        del row['target overall']
        del row['body.height']
        del row['body.weight']

        data.append(row)

data = sorted(data, key=lambda x: x['current_player_team_season']['target_overall'], reverse=True)

with open('pro/frontend/static/data/import_json/players.json', 'w') as file:
    json.dump(data, file, indent=2)

print('File with',len(data),'players successfully written to pro/frontend/static/data/import_json/players.json')