import json
import os
import sys

QUERY_CONFIG = {
    'filters': {
        'quarter': ['q1'],
        'time_remaining': [],
        'down': [],
        'yards_to_go': [],
        'field_pos': [],
        'score_diff': ['trailing_4_score'],
        'playcalling': [],
    },
    'sorting': ['quarter', 'time_remaining', 'down']
}

for filter_name, filter_list in QUERY_CONFIG['filters'].items():
    QUERY_CONFIG['filters'][filter_name] = set(filter_list)

def de_serialize_play(serial, playcall_obj = {}):

    serial_split = serial.split('|')
    return {
        'quarter': serial_split[0],
        'time_remaining': serial_split[1],
        'down': serial_split[2],
        'yards_to_go': serial_split[3],
        'field_pos': serial_split[4],
        'score_diff': serial_split[5],
        'serial_str': serial,
        'playcalling': playcall_obj
    }

with open(os.path.join(os.path.dirname(sys.argv[0]), 'play_results.json'), 'r') as r:
    data = json.load(r)
    r.close()

    verbose_data = [de_serialize_play(key, val) for key, val in data.items()]

    for filter_name, filter_list in QUERY_CONFIG['filters'].items():
        if len(filter_list) == 0:
            continue

        verbose_data = [row for row in verbose_data if row.get(filter_name) in filter_list]

    if (len(QUERY_CONFIG['sorting']) > 0):
        verbose_data = sorted(verbose_data, key=lambda row: [row[sort_key] for sort_key in QUERY_CONFIG['sorting']])

    
    w = open(os.path.join(os.path.dirname(
        sys.argv[0]), 'query_results.json'), 'w')
    w.write(json.dumps(verbose_data, indent=2))
    w.close()


