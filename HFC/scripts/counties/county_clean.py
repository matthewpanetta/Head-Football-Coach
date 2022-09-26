import os
import sys
import json

def depth_of_list(l):

    depth_count = 1
    x = l[0]
    while type(x) is list:
        x = x[0]
        depth_count +=1

    return depth_count


def get_coords(coords):
    depth = depth_of_list(coords)
    if depth == 2:
        return coords
    elif depth == 4:
        return coords[0][0]
    else:
        return coords[0]


new_counties = []
with open(os.path.join(os.path.dirname(sys.argv[0]), 'counties_lowres.json'), 'r', encoding="ISO-8859-1") as r:
    counties = json.load(r)
    print(counties['features'][:5])

    county_count = 0
    for county in counties['features']:
        new_county_obj = {
            "state": county['properties']['STATE'],
            "county": county['properties']['NAME'],
            "coordinates": get_coords(county['geometry']['coordinates'])
        }
        for coordinates in new_county_obj['coordinates']:
            coordinates[0] = round(coordinates[0], 2)
            coordinates[1] = round(coordinates[1], 2)
        new_counties.append(new_county_obj)

        if county_count % 1000 == 0:
            print('looping county', county_count)

        county_count += 1
         

print(new_counties[:2])
w = open(os.path.join(os.path.dirname(
    sys.argv[0]), 'counties_lowres_v2.json'), 'w')
w.write(json.dumps(new_counties))
w.close()
