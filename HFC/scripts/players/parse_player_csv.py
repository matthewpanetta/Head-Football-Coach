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


key_map_22 = {
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
    "First Name": 'first_name',
    "Last Name": 'last_name',
    "Jersey Num": 'jersey_number',
    "Overall": 'beeblop.overall',
    "B C Vision": 'rushing.ball_carrier_vision',
    "Lead Block": 'blocking.lead_blocking',
    "Running Style": 'rn style',
    "Throw Accuracy Mid": 'passing.medium_throw_accuracy',
    "Height": 'height',
    "Weight": 'weight',
    "Age": 'age',
    "College": 'college',
    "Total Salary": 'salary',
    "Signing Bonus": 'bonus',
    "Years Pro": 'yrspro',
    'P L Y R B I R T H D A T E': 'dob',
    'P L Y R H A N D E D N E S S': 'hnd',
    "Team": 'team'
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


player_list_22 = []
with open('scripts/players/Madden NFL 22 Final Roster.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # row = {key_map_22[key]: val for key, val in row.items() if key in key_map_22}
        row = {key_map_22[clean_22_key(key)]: val for key, val in row.items()}
        row['full_name'] = clean_name(
            row['first_name'] + ' ' + row['last_name'])

        row['position'] = clean_position(row['position'], row['archetype'])

        for key, val in list(row.items()):

            if 'athleticism' in key or 'blocking' in key or 'overall' in key or 'passing' in key or 'rushing' in key or 'defense' in key or 'kicking' in key or 'receiving' in key:
                insert_to_dict(
                    row, 'current_player_team_season.ratings.'+key, int_or_null(val, 0))
                del row[key]
            else:
                insert_to_dict(row, key, val)

        player_list_22.append(row)

    for player in player_list_22:
        player_position_map[player['full_name'] +
                            '|' + player['position']] = player

        


player_list = []
with open('scripts/players/Madden NFL 23 Player Ratings.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row = {key_map[key]: val for key, val in row.items() if key in key_map}
        row['full_name'] = clean_name(row['full_name'])
        row['position'] = clean_position(row['position'], row['archetype'])

        for key, val in list(row.items()):

            if 'athleticism' in key or 'blocking' in key or 'overall' in key or 'passing' in key or 'rushing' in key or 'defense' in key or 'kicking' in key or 'receiving' in key:
                insert_to_dict(
                    row, 'current_player_team_season.ratings.'+key, int_or_null(val, 0))
                del row[key]
            else:
                insert_to_dict(row, key, val)

        player_list.append(row)

    for player in player_list:
        player_position_map[player['full_name'] +
                            '|' + player['position']] = player

        if player['full_name'] not in player_map:
            player_map[player['full_name']] = []

        player_map[player['full_name']].append(player)


for player in player_list_22:
    if player['full_name'] not in player_map:
        player_map[player['full_name']] = [player]

double_names = ['Josh Allen', 'Chris Jones', 'Michael Thomas', 'Lamar Jackson', 'A.J. Green', 'Kyle Fuller', 'Jonah Williams',
                'Connor McGovern', 'David Long Jr', 'Ryan Griffin', 'Josh Jones', 'Brandon Smith', 'Aaron Brewer', 'Jaylon Moore']


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

        player_pos_obj = player_position_map.get(f'{player_name}|{player_position}', {})
        player_obj_list = player_map.get(f'{player_name}', [])
        if player_pos_obj == {}:
            if len(player_obj_list) != 1:
                missing_players.append({'player':row, 'player_obj_list': player_obj_list, 'player_pos_obj': player_pos_obj})
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

        del row['team']
        del row['age']
        del row['puid']
        del row['drafted']
        del row['target overall']
        del row['body.height']
        del row['body.weight']

        data.append(row)


missing_players = sorted(
    missing_players, key=lambda p: int(p['player'].get('draft_info', {}).get('round', 1000)), reverse=True)
print(json.dumps([{'name': p['player']['name'], 'position': p['player']['position'], 'years_pro': int(
    p['player'].get('years pro', 0)), 'player_pos_obj': len(p['player_pos_obj']), 'player_obj_list': len(p['player_obj_list']), 'drafted': p['player'].get('draft_info') } for p in missing_players], indent=2))

data = sorted(
    data, key=lambda x: x['current_player_team_season']['target_overall'], reverse=True)

with open('pro/frontend/static/data/import_json/players.json', 'w') as file:
    json.dump(data, file, indent=2)

print('File with', len(data),
      'players successfully written to pro/frontend/static/data/import_json/players.json')
