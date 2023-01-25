import csv
import json
import re

def int_or_null(val, default=None):
    if len(val) == 0:
        return default
    return int(val)


data = []
with open('scripts/players/Player input - Sheet1.csv', 'r') as f:

    reader = csv.DictReader(f)
    for row in reader:
        row['jersey_number'] = int_or_null(row['jersey_number'])
        row['name'] = {
            'first': row['name'].split(' ')[0], 
            'last': ' '.join(row['name'].split(' ')[1:]).replace(' (IR)', '').replace(' (IRD)', '').replace(' (PUP)', '').replace(' (NON)', '').replace(' (UFA)', '')
            }

        if len(row['body.height']) == 0:
            row['body.height'] = '6-2'
        row['body'] = {
            'height_inches': int(int_or_null(row['body.height'].split('-')[0], 0) * 12 + int_or_null(row['body.height'].split('-')[1])),
            'weight': int_or_null(row['body.weight'])
        }

        row['body']['height'] = f"{int(row['body']['height_inches'] / 12)}'{row['body']['height_inches'] % 12}"

        row['current_player_team_season'] = {
            'team_abbreviation': row['team'],
            'age': int_or_null(row['age']),
            'target_overall': int_or_null(row['target overall'], 0)
        }

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