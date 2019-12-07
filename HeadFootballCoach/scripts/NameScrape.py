from lxml import html
import requests
from lxml.cssselect import CSSSelector
import json

letters = 'abcdefghifklmnopqrstuvwxyz'

NameDict = {'FirstNames': {}, 'LastNames': {}}

for l in letters:
    print(l)
    url = 'https://www.sports-reference.com/cbb/players/'+l+'-index.html'

    page = requests.get(url)
    tree = html.fromstring(page.content)

    s = tree.cssselect('#content > div > p > a')

    for u in s:
        #print(html.tostring(u))
        Name = u.text_content()
        NameSplit = Name.split(' ')
        FirstName = NameSplit[0]
        LastName = ' '.join(NameSplit[1:])


        if FirstName not in NameDict['FirstNames']:
            NameDict['FirstNames'][FirstName] = 1
        else:
            NameDict['FirstNames'][FirstName] += 1

        if LastName not in NameDict['LastNames']:
            NameDict['LastNames'][LastName] = 1
        else:
            NameDict['LastNames'][LastName] += 1



print(NameDict)
with open('Names.json', 'w') as outfile:
    json.dump(NameDict, outfile)
