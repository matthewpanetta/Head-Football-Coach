import os
import json
import sys
import zipfile

def serialize_play(play):

    if play['down'] == 'NA':
        return None

    quarter_seconds_remaining_desc = ''
    play['quarter_seconds_remaining'] = int(play['quarter_seconds_remaining'])
    if play['qtr'] == '1':
        quarter_seconds_remaining_desc = 'any_time'
    elif play['qtr'] == '2':
        if play['quarter_seconds_remaining'] <= 60:
            quarter_seconds_remaining_desc = 'last_min'
        elif play['quarter_seconds_remaining'] <= 180:
            quarter_seconds_remaining_desc = 'last_3_mins'
        else:
            quarter_seconds_remaining_desc = 'more_than_3_mins'
    elif play['qtr'] == '3':
        if play['quarter_seconds_remaining'] <= 360:
            quarter_seconds_remaining_desc = 'last_6_mins'
        else:
            quarter_seconds_remaining_desc = 'more_than_6_mins'

    elif play['quarter_seconds_remaining'] <= 60:
        quarter_seconds_remaining_desc = 'last_min'
    elif play['quarter_seconds_remaining'] <= 120:
        quarter_seconds_remaining_desc = 'last_2_mins'
    elif play['quarter_seconds_remaining'] <= 300:
        quarter_seconds_remaining_desc = 'last_5_mins'
    elif play['quarter_seconds_remaining'] <= 600:
        quarter_seconds_remaining_desc = 'between_5_10_mins'
    else:
        quarter_seconds_remaining_desc = 'between_10_15_mins'

    score_diff_desc = ''
    if play['score_differential'] == 'NA':
        score_diff_desc = 'NA'
    elif int(play['score_differential']) >= 25:
        score_diff_desc = 'leading_4_score'
    elif int(play['score_differential']) >= 17:
        score_diff_desc = 'leading_3_score'
    elif int(play['score_differential']) >= 9:
        score_diff_desc = 'leading_2_score'
    elif int(play['score_differential']) > 0:
        score_diff_desc = 'leading_1_score'
    elif int(play['score_differential']) <= -25:
        score_diff_desc = 'trailing_4_score'
    elif int(play['score_differential']) <= -17:
        score_diff_desc = 'trailing_3_score'
    elif int(play['score_differential']) <= -9:
        score_diff_desc = 'trailing_2_score'
    elif int(play['score_differential']) < 0:
        score_diff_desc = 'trailing_1_score'
    else:
        score_diff_desc = 'tie'

    yard_desc = ''
    if int(play['yardline_100']) <= 5:
        yard_desc = 'inside_5'
    elif int(play['yardline_100']) <= 10:
        yard_desc = 'inside_10'
    elif int(play['yardline_100']) <= 20:
        yard_desc = 'inside_20'
    elif int(play['yardline_100']) <= 30:
        yard_desc = 'inside_30'
    elif int(play['yardline_100']) <= 40:
        yard_desc = 'inside_40'
    elif int(play['yardline_100']) <= 50:
        yard_desc = 'inside_50'
    elif int(play['yardline_100']) <= 60:
        yard_desc = 'own_40'
    elif int(play['yardline_100']) <= 70:
        yard_desc = 'own_30'
    elif int(play['yardline_100']) <= 80:
        yard_desc = 'own_20'
    elif int(play['yardline_100']) <= 90:
        yard_desc = 'own_10'
    elif int(play['yardline_100']) <= 100:
        yard_desc = 'own_goalline'
    else:
        yard_desc = 'NA'

    yards_to_go_desc = ''
    if int(play['ydstogo']) <= 2:
        yards_to_go_desc = '1_or_2'
    elif int(play['ydstogo']) <= 5:
        yards_to_go_desc = '3_to_5'
    elif int(play['ydstogo']) <= 9:
        yards_to_go_desc = '6_to_9'
    elif int(play['ydstogo']) <= 14:
        yards_to_go_desc = '10_to_13'
    else:
        yards_to_go_desc = 'long'

    qtr_desc = 'OT' if int(play['qtr']) > 4 else 'q'+play['qtr']

    return '|'.join([
        qtr_desc, quarter_seconds_remaining_desc, 'd'+play['down'], yards_to_go_desc, yard_desc, score_diff_desc
    ])


def group_data(plays):
    grouped_data = {}
    for play in plays:
        serial_play = serialize_play(play)
        if serial_play is None:
            continue
        if serial_play not in grouped_data:
            grouped_data[serial_play] = {'total':0}

        if play['play_type'] not in grouped_data[serial_play]:
            grouped_data[serial_play][play['play_type']] = 0

        grouped_data[serial_play][play['play_type']] += 1
        grouped_data[serial_play]['total'] += 1

    grouped_data = {k: v for k, v in sorted(grouped_data.items(), key=lambda item: (
        #item[1].get('run', 0) + item[1].get('pass', 0) + item[1].get('kickoff', 0) + item[1].get('punt', 0),
        #Comment above line to sort just by play situation
        item[0]), reverse=True)}

    for serial_key, play_count_obj in grouped_data.items():
        for play_type, play_count in  play_count_obj.items():
            if play_type == 'total':
                continue
            grouped_data[serial_key][play_type] = round(100.0 * grouped_data[serial_key][play_type] / grouped_data[serial_key]['total'], 1)

        # del play_count_obj['total']
        #Comment above line to keep 'total' field in output

    w = open(os.path.join(os.path.dirname(
        sys.argv[0]), 'play_results.json'), 'w')
    w.write(json.dumps(grouped_data, indent=2))
    w.close()
    print(json.dumps(grouped_data, indent=2))
    print(len(grouped_data), 'groups', len(json.dumps(grouped_data, indent=0)),
          'characters, from', len(plays), 'different plays')


with  zipfile.ZipFile(os.path.join(os.path.dirname(sys.argv[0]), 'raw_plays.json.zip')) as zf:    
    with zf.open('raw_plays.json') as r:
        data = json.load(r)
        r.close()
        group_data(data)
