import json
with open('frontend/static/data/import_json/Team.json', 'r') as file:
    team_json = json.load(file)

# print(json.dumps(team_json, indent=2))

teams = [
     (team['school_name'], {"color": f'#{team["team_color_primary_hex"]}'})
    for team in team_json
]
# print(json.dumps(teams, indent=2))


with open('frontend/static/data/import_json/Rivalries.json', 'r') as file:
    rival_json = json.load(file)

# print(json.dumps(rival_json, indent=2))

rivals = [(rivalry['team_name_1'], rivalry['team_name_2'], {"weight":rivalry['rivalry_relevance']}) for rivalry in rival_json]
# print(json.dumps(rivals, indent=2))

import networkx as nx
import matplotlib.pyplot as plt
G = nx.Graph()

G.add_nodes_from(teams)

G.add_edges_from(rivals)

nx.draw(G, with_labels=True, font_weight='bold')
plt.show()
