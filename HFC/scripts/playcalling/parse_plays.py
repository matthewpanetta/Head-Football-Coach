import os
import json
import sys
import csv
import zipfile
from io import TextIOWrapper

play_types = set(['run', 'pass', 'qb_kneel', 'qb_spike',
                 'punt', 'kickoff', 'extra_point', 'field_goal'])

keep_keys = set(['yardline_100', 'quarter_seconds_remaining', 'qtr', 'down', 'ydstogo', 'play_type', 'no_huddle',
                'pass_length', 'posteam_timeouts_remaining', 'defteam_timeouts_remaining', 'score_differential'])


def zipped_data(header_row, line_data, raw_line):

    data_obj = {}
    for ind, key in enumerate(header_row):
        if key in keep_keys:
            data_obj[key] = line_data[ind]

    if data_obj['play_type'] in play_types:
        return data_obj

counter = 0
header_row = []
data = []
with  zipfile.ZipFile(os.path.join(os.path.dirname(sys.argv[0]), 'NFL Play by Play 2009-2018 (v5).csv.zip')) as zf:    
    with zf.open('NFL Play by Play 2009-2018 (v5).csv') as f:
        print(f)
        csvreader = csv.reader(TextIOWrapper(f, 'utf-8'), delimiter=',', quotechar='"')
        for line in csvreader:
            if counter == 0:
                header_row = line
            else:
                zipped_record = zipped_data(header_row, line, None)
                if zipped_record is not None:
                    data.append(zipped_record)

            counter += 1
            if counter % 1000 == 0:
                print('Reading line', counter)
            # if counter > 10000:
            #     break

w = open(os.path.join(os.path.dirname(
        sys.argv[0]), 'raw_plays.json'), 'w')
w.write(json.dumps(data, indent=0))
w.close()
