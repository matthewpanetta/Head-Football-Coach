
i = open('./college/frontend/static/img/team_logos/missouri_tigers.png', 'r')

import networkx as nx
import matplotlib.pyplot as plt
from matplotlib import image as mpimg

# Define the mapping and logos
mapping = {
    "Missouri": ["Oklahoma", "Arkansas", 'Vanderbilt'],
    "Arkansas": ["Missouri", "Texas", 'Ole Miss'],
    "Texas A&M": ["LSU", "Texas", 'Mississippi State'],
    "Texas": ["Oklahoma", "Texas A&M", 'Arkansas'],
    "Oklahoma": ["Texas", "Missouri", 'Florida'],
    "LSU": ["Ole Miss", "Texas A&M", 'Alabama'],
    "Ole Miss": ["Mississippi State", "LSU", 'Arkansas'],
    "Mississippi State": ["Ole Miss", "Kentucky", 'Texas A&M'],
    "Alabama": ["Auburn", "Tennessee", 'LSU'],
    "Auburn": ["Alabama", "Georgia", 'Vanderbilt'],
    "Vanderbilt": ["Tennessee", "Auburn", 'Missouri'],
    "Tennessee": ["Vanderbilt", "Alabama", 'South Carolina'],
    "Kentucky": ["Mississippi State", "South Carolina", 'Georgia'],
    "Georgia": ["Auburn", "Florida", 'Kentucky'],
    "Florida": ["Georgia", "South Carolina", 'Oklahoma'],
    "South Carolina": ["Florida", "Tennessee", 'Kentucky'],
}

logos = {
    "Missouri": "./college/frontend/static/img/team_logos/missouri_tigers.png",
    "Arkansas": "./college/frontend/static/img/team_logos/arkansas_razorbacks.png",
    "Texas A&M": "./college/frontend/static/img/team_logos/texas_a_m_aggies.png",
    "Texas": "./college/frontend/static/img/team_logos/texas_longhorns.png",
    "Oklahoma": "./college/frontend/static/img/team_logos/oklahoma_sooners.png",
    "LSU": "./college/frontend/static/img/team_logos/lsu_tigers.png",
    "Ole Miss": "./college/frontend/static/img/team_logos/ole_miss_rebels.png",
    "Mississippi State": "./college/frontend/static/img/team_logos/mississippi_state_bulldogs.png",
    "Alabama": "./college/frontend/static/img/team_logos/alabama_crimson_tide.png",
    "Auburn": "./college/frontend/static/img/team_logos/auburn_tigers.png",
    "Vanderbilt": "./college/frontend/static/img/team_logos/vanderbilt_commodores.png",
    "Tennessee": "./college/frontend/static/img/team_logos/tennessee_volunteers.png",
    "Kentucky": "./college/frontend/static/img/team_logos/kentucky_wildcats.png",
    "Georgia": "./college/frontend/static/img/team_logos/georgia_bulldogs.png",
    "Florida": "./college/frontend/static/img/team_logos/florida_gators.png",
    "South Carolina": "./college/frontend/static/img/team_logos/south_carolina_gamecocks.png",
}
G = nx.Graph()

# Add nodes to the graph
G.add_nodes_from(mapping.keys())

# Add edges to the graph
for node, edges in mapping.items():
    for edge in edges:
        G.add_edge(node, edge)

# Set the figure size
plt.figure(figsize=(8, 8))

# Draw the graph with logos
pos = nx.spring_layout(G)
for node in G.nodes():
    img = mpimg.imread(logos[node])
    plt.imshow(img, extent=[pos[node][0]-1, pos[node][0]+1, pos[node][1]-1, pos[node][1]+1])
nx.draw_networkx_labels(G, pos, font_size=16)

# Show the graph
plt.axis('off')
plt.show()