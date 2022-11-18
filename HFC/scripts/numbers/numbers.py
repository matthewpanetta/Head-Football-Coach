import json
import os

# partial JS statement - let a = []; $('tr.TableBase-bodyTr').toArray().forEach(tr => a.push({num: $(tr).find('td:nth-child(1)').text().trim(), pos: $(tr).find('td:nth-child(3)').text().trim()})); console.log(JSON.stringify(a));
__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))
input_f = open( os.path.join(__location__, 'input.json') , 'r')

input_list = json.load(input_f)

position_transform_map = {
    "LS": "IOL",
    "G": "IOL",
    "C": "IOL",
    "T": "OT",
    "OL": "OT",
    "DB": "CB",
    "NT": "DL",
    "DE": "EDGE",
    "DB": "CB",
}

pos_number_map = {}
for team_obj in input_list:
    for player in team_obj['players']:
        position = player['pos']
        position = position_transform_map.get(player['pos'], player['pos'])

        number = player['num']
        pos_number_map[position] = pos_number_map.get(position, {})
        pos_number_map[position][number] = pos_number_map[position].get(number, 0) + 1

final_pos_number_map = {}
for pos in pos_number_map:
    total_players = sum(pos_number_map[pos].values())
    final_pos_number_map[pos] = sorted([[int(pos_num[0]), pos_num[1]] for pos_num in pos_number_map[pos].items() if pos_num[1] >= (total_players * 0.01)], key=lambda elem: elem[1], reverse=True)

output = json.dumps(final_pos_number_map, indent=2)
print(output)

output_file = open( os.path.join(__location__, 'position_numbers.json'), 'w')
output_file.write(output)