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
            quarter_seconds_remaining_desc = '<1m'
        elif play['quarter_seconds_remaining'] <= 180:
            quarter_seconds_remaining_desc = '<3m'
        else:
            quarter_seconds_remaining_desc = '+3m'
    elif play['qtr'] == '3':
        if play['quarter_seconds_remaining'] <= 360:
            quarter_seconds_remaining_desc = '<6m'
        else:
            quarter_seconds_remaining_desc = '+6m'

    elif play['quarter_seconds_remaining'] <= 60:
        quarter_seconds_remaining_desc = '<1m'
    elif play['quarter_seconds_remaining'] <= 120:
        quarter_seconds_remaining_desc = '<2m'
    elif play['quarter_seconds_remaining'] <= 300:
        quarter_seconds_remaining_desc = '<5m'
    elif play['quarter_seconds_remaining'] <= 600:
        quarter_seconds_remaining_desc = '5-10m'
    else:
        quarter_seconds_remaining_desc = '10-15m'

    score_diff_desc = ''
    if play['score_differential'] == 'NA':
        score_diff_desc = 'NA'
    elif int(play['score_differential']) >= 25:
        score_diff_desc = '+4sc'
    elif int(play['score_differential']) >= 17:
        score_diff_desc = '+3sc'
    elif int(play['score_differential']) >= 12:
        score_diff_desc = '+2td'
    elif int(play['score_differential']) >= 9:
        score_diff_desc = '+2sc'
    elif int(play['score_differential']) >= 4:
        score_diff_desc = '+1td'
    elif int(play['score_differential']) > 0:
        score_diff_desc = '+1sc'
    elif int(play['score_differential']) <= -25:
        score_diff_desc = '-4sc'
    elif int(play['score_differential']) <= -17:
        score_diff_desc = '-3sc'
    elif int(play['score_differential']) <= -12:
        score_diff_desc = '-2td'
    elif int(play['score_differential']) <= -9:
        score_diff_desc = '-2sc'
    elif int(play['score_differential']) <= -4:
        score_diff_desc = '-1td'
    elif int(play['score_differential']) < 0:
        score_diff_desc = '-1sc'
    else:
        score_diff_desc = 'tie'

    yard_desc = ''
    if int(play['yardline_100']) <= 5:
        yard_desc = '<5'
    elif int(play['yardline_100']) <= 10:
        yard_desc = '<10'
    elif int(play['yardline_100']) <= 20:
        yard_desc = '<20'
    elif int(play['yardline_100']) <= 30:
        yard_desc = '<30'
    elif int(play['yardline_100']) <= 40:
        yard_desc = '<40'
    elif int(play['yardline_100']) <= 50:
        yard_desc = '<50'
    elif int(play['yardline_100']) <= 60:
        yard_desc = '<60'
    elif int(play['yardline_100']) <= 70:
        yard_desc = '<70'
    elif int(play['yardline_100']) <= 80:
        yard_desc = '<80'
    elif int(play['yardline_100']) <= 100:
        yard_desc = '<100'
    else:
        yard_desc = 'NA'

    yards_to_go_desc = ''
    if int(play['ydstogo']) <= 2:
        yards_to_go_desc = '1-2'
    elif int(play['ydstogo']) <= 5:
        yards_to_go_desc = '3-5'
    elif int(play['ydstogo']) <= 9:
        yards_to_go_desc = '6-9'
    elif int(play['ydstogo']) <= 14:
        yards_to_go_desc = '10-13'
    else:
        yards_to_go_desc = '13+'

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
            grouped_data[serial_key][play_type] = int(100.0 * grouped_data[serial_key][play_type] / grouped_data[serial_key]['total'])
        
        del  grouped_data[serial_key]['total']

        # del play_count_obj['total']
        #Comment above line to keep 'total' field in output

    # w = open(os.path.join(os.path.dirname(
    #     sys.argv[0]), 'play_results.json'), 'w')
    w = open('frontend/static/data/import_json/playcall.json', 'w')
    w.write(json.dumps(grouped_data, indent=0))
    w.close()
    print(json.dumps(grouped_data, indent=2))
    print(len(grouped_data), 'groups', len(json.dumps(grouped_data, indent=0)),
          'characters, from', len(plays), 'different plays')


with  zipfile.ZipFile(os.path.join(os.path.dirname(sys.argv[0]), 'raw_plays.json.zip')) as zf:    
    with zf.open('raw_plays.json') as r:
        data = json.load(r)
        r.close()
        group_data(data)
