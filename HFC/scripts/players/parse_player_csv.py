import csv
import json

def int_or_null(val, default=None):
    if len(val) == 0:
        return default
    return int(val)


data = []
with open('scripts/players/Player input - Sheet1.csv', 'r') as f:

    reader = csv.DictReader(f)
    for row in reader:

        print(row)
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
            'target_overall': int_or_null(row['target overall'])
        }

        del row['team']
        del row['age']
        del row['puid']
        del row['target overall']

        data.append(row)


with open('pro/frontend/static/data/import_json/players.json', 'w') as file:
    json.dump(data, file, indent=2)