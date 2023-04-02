print('hello world')
import sys
import os
import json

new_json = []

with open(os.path.join(sys.path[0], 'names.json'), 'r') as f:
    j = json.load(f)
    for obj in j:

        if '-' in obj['name']:
            print('Found -!', obj)
        elif ' ' in obj['name']:
            print('Found " "', obj)
        elif '.' in obj['name']:
            print('Found .', obj)
        elif "'" in obj['name']:
            print('Found apos', obj)
        elif (obj['is_first_name'] or obj['is_last_name']) and obj['occurance'] > 0:
            new_json.append(obj)

# with open(os.path.join(sys.path[0], 'names.json'), "w") as outfile:
#     json.dump(new_json, outfile, indent=2)

