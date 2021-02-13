from math import ceil, floor
import json
import itertools

def TierPlacement(Tiers = 5, PopulationSize = 100, Distribution = 'Normal', RankPlace = 1):
    TierList = range(1,Tiers+1)
    TierDict = {Tier: {'Start': None, 'Stop': None, 'SegmentSize': None, 'SegmentRatio': None, 'PopulationCount': None} for Tier in TierList}

    MiddleTier = int(Tiers / 2) + 1
    TotalSegmentSize = 0
    Placement = 1

    PreviousStop = 0

    if Distribution == 'Normal':
        for Tier in TierDict:
            TierObj = TierDict[Tier]
            TierObj['SegmentSize'] = MiddleTier - abs(MiddleTier - Tier)
            TotalSegmentSize += MiddleTier - abs(MiddleTier - Tier)

            TierObj['SegmentSize']

    elif Distibution == 'Uniform':
        for Tier in TierDict:
            print(Tier)


    for Tier in TierDict:
        TierObj = TierDict[Tier]
        TierObj['SegmentRatio'] = TierObj['SegmentSize']*1.0 / TotalSegmentSize
        TierObj['PopulationCount'] = floor(TierObj['SegmentRatio']* PopulationSize)

        TierObj['Start'] = PreviousStop + 1
        TierObj['Stop'] = TierObj['Start']  + TierObj['PopulationCount']
        PreviousStop = TierObj['Stop']

        if RankPlace >= TierObj['Start'] and RankPlace <= TierObj['Stop']:
            Placement = Tier

    print(f'RankPlace {RankPlace} Placement {Placement}', json.dumps(TierDict, indent=2))
    #print(f'RankPlace {RankPlace} Placement {Placement}')

    return int(Placement)


# Objs = []
# groups={}
# for u in range(101):
#     Objs.append({'Key': u, 'G': int(u/10)})
#
#
# key_func = lambda x: x['G']
# for k, g in itertools.groupby(Objs, key_func):
#     groups[k] = list(g)
#
# print(json.dumps(groups, indent=2))
# 
# WordMap = {}
#
# GenericTerms = {
#     'TeamName': ['Florida State', 'Florida St', 'Miami', 'Michigan State', 'Michigan St', 'San Diego State','San Diego St', 'BYU', 'Coastal Carolina', 'Auburn', 'Clemson', 'LSU', 'Alabama', 'BAMA', 'Georgia', 'UGA', 'Texas Tech', 'Texas A&M', 'A&M', 'UT', 'Texas', 'Oklahoma State', 'Oklahoma St', 'Oklahoma'],
#     'PlayerPosition': ['QB', 'RB', 'WR', 'OL', 'DL', 'DT', 'DE', 'CB'],
# }
#
#
# def ReplaceWithGenericTerms(str):
#     for Term, PossibleTerms in GenericTerms.items():
#         for PossibleTerm in PossibleTerms:
#             str=str.replace(PossibleTerm, Term)
#
#     return str
#
# def StripSpecialCharacters(str):
#     return str.replace(':', '').replace(',', '').replace('.', '').replace('\'', '').replace('"', '').replace('?', '')
#
# HeadlineList = []
# HeadlineJquery = "$.map( $('.headlineStack li a'),function(element) { return $(element).text(); });"
#
# HeadlineHistory = {
#     20201206: ["BYU stopped at 1 as Coastal Carolina pulls upset", "Day on OSU's week: Hopeful worst is behind us", "Satterfield 'listens' to S.C., not leaving L'ville", "Book accounts for 5 TDs; is ND's winningest QB", "Led by backup QB, Indiana beats No. 16 Badgers", "La. coach defends intentional safety late in win", "Re-ranking 2019 recruiting class", "BYU stopped at 1 as Coastal Carolina pulls upset", "Day on OSU's week: Hopeful worst is behind us", "Satterfield 'listens' to S.C., not leaving L'ville", "Book accounts for 5 TDs; is ND's winningest QB", "Led by backup QB, Indiana beats No. 16 Badgers", "La. coach defends intentional safety late in win", "Re-ranking 2019 recruiting class"],
#     20201129: ["Week 13 college football schedule", "Saban lauds Bama staff, but 'did yell at the TV'", "Lawrence: Love of Clemson makes leaving tough", "Vandy's Sarah Fuller makes history with kickoff", "Buffalo RB Patterson ties FBS mark with 8 TDs", "Contact sports ban leaves 49ers, others in limbo", "FBS plans ensure final CFP rankings on Dec. 20", "Syracuse coach: 4th-and-goal spike 'unfortunate'", "2021 recruiting class rankings", "Saban lauds Bama staff, but 'did yell at the TV'", "Lawrence: Love of Clemson makes leaving tough", "Vandy's Sarah Fuller makes history with kickoff", "Buffalo RB Patterson ties FBS mark with 8 TDs", "Contact sports ban leaves 49ers, others in limbo", "FBS plans ensure final CFP rankings on Dec. 20", "Syracuse coach: 4th-and-goal spike 'unfortunate'", "2021 recruiting class rankings"],
#     20201122: ["'Fighting Rece Davises' label fires up Wildcats", "No. 3 Ohio State holds off Indiana comeback bid", "Bama's Smith sets SEC all-time TD record for WR", "PSU's Freiermuth to have surgery; season over", "No. 4 Clemson at Florida State game postponed", "Freeze currently 'won't entertain' S.C. opening", "Inside Quinn Ewers' OSU commitment", "'Fighting Rece Davises' label fires up Wildcats", "No. 3 Ohio State holds off Indiana comeback bid", "Bama's Smith sets SEC all-time TD record for WR", "PSU's Freiermuth to have surgery; season over", "No. 4 Clemson at Florida State game postponed", "Freeze currently 'won't entertain' S.C. opening", "Inside Quinn Ewers' OSU commitment"],
#     20201108: ["Georgia WR carted off after injuring leg on TD", "Even at 1-2, Harbaugh feels Michigan is 'close'", "Stanford QB Mills out due to COVID-19 protocols", "USC rides two late TDs for win in Pac-12 opener", "51-yard FG gives Liberty win over Virginia Tech", "LSU lands S Davis Jr., No. 26 overall prospect", "Andersen out as Utah State coach after 0-3 start", "Stanford Steve and Bear: Top bets", "A rare cancer, a risky transplant and how David Shaw saved his sibling's life", "Even at 1-2, Harbaugh feels Michigan is 'close'", "Stanford QB Mills out due to COVID-19 protocols", "USC rides two late TDs for win in Pac-12 opener", "51-yard FG gives Liberty win over Virginia Tech", "LSU lands S Davis Jr., No. 26 overall prospect", "Andersen out as Utah State coach after 0-3 start", "Stanford Steve and Bear: Top bets"],
#     20201101: ["Clemson's Lawrence to miss Notre Dame game", "Freshman QB Uiagalelei rallies No. 1 Clemson", "Spartans rock Michigan behind Lombardi's 3 TDs", "Boise State QB Bachmeier out vs. Air Force", "Clemson's Etienne sets rushing yards, TD records", "Illinois QB Peters among 2 to test positive", "Where will the No. 1 CFB recruit land?", "Clemson's Lawrence to miss Notre Dame game", "Freshman QB Uiagalelei rallies No. 1 Clemson", "Spartans rock Michigan behind Lombardi's 3 TDs", "Boise State QB Bachmeier out vs. Air Force", "Clemson's Etienne sets rushing yards, TD records", "Illinois QB Peters among 2 to test positive", "Where will the No. 1 CFB recruit land?"],
#     20201025: ["Defensive Dabo: Am I at right press conference?", "Day sorry for not kneeling as OSU rolls Nebraska", "UT players on field for 'Eyes of Texas' after win", "Indiana finds way to win in wild finish vs. PSU", "Tide WR Waddle (ankle) expected out for season", "Kiffin irked by officiating in Rebels' loss to Auburn", "Oregon cancels practice after 5 test positive", "Recruiting: Who does most with least?", "Full scoreboard", "QB Mertz rewrites Badgers' record book in debut", "Defensive Dabo: Am I at right press conference?", "Day sorry for not kneeling as OSU rolls Nebraska", "UT players on field for 'Eyes of Texas' after win", "Indiana finds way to win in wild finish vs. PSU", "Tide WR Waddle (ankle) expected out for season", "Kiffin irked by officiating in Rebels' loss to Auburn", "Oregon cancels practice after 5 test positive", "Recruiting: Who does most with least?"],
#     20201018: ["Gators coach Mullen tests positive for COVID-19", "Saban gets 3rd negative test, can coach vs. UGA", "NC State QB Leary carted off with leg in air cast", "Tigers' Lawrence has huge day, misses INT mark", "Vols 'undecided' at QB after Guarantano benched", "Source: Pitt QB Pickett out for Miami game", "'Stanford Steve' and 'The Bear': Picks", "What are the chances Alabama and Georgia both make the College Football Playoff?", "Gators coach Mullen tests positive for COVID-19", "Saban gets 3rd negative test, can coach vs. UGA", "NC State QB Leary carted off with leg in air cast", "Tigers' Lawrence has huge day, misses INT mark", "Vols 'undecided' at QB after Guarantano benched", "Source: Pitt QB Pickett out for Miami game", "'Stanford Steve' and 'The Bear': Picks"],
#     20201011: ["Saban wonders if Ole Miss knew Tide D's signals", "Leach: Roster may need 'purge' of 'malcontents'", "Texas' Herman, Ehlinger lament mistakes in loss", "Smart chides WR for squirting water on Vols QB", "Auburn wins after officials rule Nix didn't fumble", "Mullen wants to see 'The Swamp' packed vs. LSU", "Orgeron: 'We couldn't stop anybody' at Missouri", "Reranking CFB's 2018 recruiting class", "College football Power Rankings for Week 6", "Full Week 6 college football schedule", "Saban wonders if Ole Miss knew Tide D's signals", "Leach: Roster may need 'purge' of 'malcontents'", "Texas' Herman, Ehlinger lament mistakes in loss", "Smart chides WR for squirting water on Vols QB", "Auburn wins after officials rule Nix didn't fumble", "Mullen wants to see 'The Swamp' packed vs. LSU", "Orgeron: 'We couldn't stop anybody' at Missouri", "Reranking CFB's 2018 recruiting class"],
#     20201004: ["Iowa St. gets 1st home win vs. Sooners since '60", "Upset again, Ehlinger says Texas 'deserves better'", "SMU student section ejected over virus violations", "Arkansas tops Miss. St. to  end 20-game SEC skid", "Ole Miss edges Kentucky in OT for Kiffin's 1st win", "Injured Kansas State QB Thompson exits after hit", "PFF: 20 best QB-receiver combos", "Who is Trey Lance? Meet the NFL draft darling playing only once this fall", "Iowa St. gets 1st home win vs. Sooners since '60", "Upset again, Ehlinger says Texas 'deserves better'", "SMU student section ejected over virus violations", "Arkansas tops Miss. St. to  end 20-game SEC skid", "Ole Miss edges Kentucky in OT for Kiffin's 1st win", "Injured Kansas State QB Thompson exits after hit", "PFF: 20 best QB-receiver combos"],
#     20200927: ["Georgia facing QB questions after uneven opener", "FSU's Norvell takes blame for loss to Hurricanes", "Ehlinger rallies No. 8 Texas past Texas Tech in OT", "Miss. St.'s Costello sets passing mark as LSU falls", "Short-handed K-State stuns No. 3 Oklahoma late", "Va. Tech wins despite 23 players out due to virus", "NC St. safety suffers hip injury in loss at Va. Tech", "Top 10 freshmen of 2020 so far", "Social media reacts to Mike Leach, K.J. Costello and Mississippi State upsetting LSU", "Florida, Ole Miss jointly take knee about injustice", "Georgia facing QB questions after uneven opener", "FSU's Norvell takes blame for loss to Hurricanes", "Ehlinger rallies No. 8 Texas past Texas Tech in OT", "Miss. St.'s Costello sets passing mark as LSU falls", "Short-handed K-State stuns No. 3 Oklahoma late", "Va. Tech wins despite 23 players out due to virus", "NC St. safety suffers hip injury in loss at Va. Tech", "Top 10 freshmen of 2020 so far"],
#     20200920: ["Book, No. 7 Notre Dame cruise by South Florida", "FSU coach Norvell tests positive for coronavirus", "Memphis cancels 2nd straight game due to virus", "Miami QB Martell opts out of playing '20 season", "Ohio St. faces Nebraska as part of Big Ten start", "Exonerated Kelley, 25, will play for E. Michigan", "Players who can replace opt-outs", "2020 standings", "Big Ten 2020 schedule", "Timeline: The events leading up to the decision to play this fall", "Book, No. 7 Notre Dame cruise by South Florida", "FSU coach Norvell tests positive for coronavirus", "Memphis cancels 2nd straight game due to virus", "Miami QB Martell opts out of playing '20 season", "Ohio St. faces Nebraska as part of Big Ten start", "Exonerated Kelley, 25, will play for E. Michigan", "Players who can replace opt-outs"],
#     20200913: ["Sources: Big Ten revote on football possibly Sun.", "ACC needs 8 football teams to continue season", "OU's Riley: COVID-19 cases threatened game", "Pitt, Austin Peay play shorter 2nd half in blowout", "Houston vs. Memphis AAC opener postponed", "5 Auburn starters have missed practice for virus", "BYU postpones Army game after positive tests", "2021 recruiting class rankings", "Clemson, Bama top updated national title odds", "Replay: Underdog Louisiana shocks No. 23 Iowa State", "Full Week 2 schedule", "Ragin' Cajuns' returns topple No. 23 Iowa State", "Sources: Big Ten revote on football possibly Sun.", "ACC needs 8 football teams to continue season", "OU's Riley: COVID-19 cases threatened game", "Pitt, Austin Peay play shorter 2nd half in blowout", "Houston vs. Memphis AAC opener postponed", "5 Auburn starters have missed practice for virus", "BYU postpones Army game after positive tests", "2021 recruiting class rankings"],
#     20191201: ["Best of Rivalry Week: Scores, schedule, highlights, playoff analysis and more", "'Unfair' final penalty among Saban's ref gripes", "LSU's Burrow hits SEC pass yards, TD records", "Swinney's CFP rant: 'They don't want us there'", "Fields' return a 'magical moment' for Buckeyes", "Harbaugh testy after another loss to Ohio State", "UGA WR Pickens ejected, will sit 1st half vs. LSU", "Where nation's top prospects might sign", "College football coaching carousel: Openings, firings, hot seats", "Catch up on this season of 'Miles To Go', 'Unfair' final penalty among Saban's ref gripes", "LSU's Burrow hits SEC pass yards, TD records", "Swinney's CFP rant: 'They don't want us there'", "Fields' return a 'magical moment' for Buckeyes", "Harbaugh testy after another loss to Ohio State", "UGA WR Pickens ejected, will sit 1st half vs. LSU", "Where nation's top prospects might sign"],
#     20191124: ["Arizona State holds on to upset No. 6 Oregon", "Arizona State holds on to stun No. 6 Oregon", "FIU shocks Miami as 'homecoming' goes bad", "Badgers' Taylor has record 12th 200-yard game", "Day gets Buckeyes off mat after PSU lands blows", "Slovis first Trojans QB to surpass 500 yards", "Baylor earns Big 12 title game spot for first time", "Harvard-Yale delayed by climate change protest", "Where nation's top prospects might sign", "College Football Playoff picks after Week 13", "Arizona State holds on to stun No. 6 Oregon", "FIU shocks Miami as 'homecoming' goes bad", "Badgers' Taylor has record 12th 200-yard game", "Day gets Buckeyes off mat after PSU lands blows", "Slovis first Trojans QB to surpass 500 yards", "Baylor earns Big 12 title game spot for first time", "Harvard-Yale delayed by climate change protest", "Where nation's top prospects might sign"],
#     20191117: ["Iowa dims Minnesota's CFP hopes with 1st loss", "Michigan safety waves MSU bye after chippy win", "No. 4 Georgia tops Auburn, clinches SEC East", "Photog hit at UGA-Auburn game sent to hospital", "Frost, 8-14 at Nebraska, gets two-year extension", "Gamecocks AD: 'Muschamp is our football coach'", "Best bets for Week 12 CFB games", "Iowa dims Minnesota's CFP hopes with 1st loss", "Michigan safety waves MSU bye after chippy win", "No. 4 Georgia tops Auburn, clinches SEC East", "Photog hit at UGA-Auburn game sent to hospital", "Frost, 8-14 at Nebraska, gets two-year extension", "Gamecocks AD: 'Muschamp is our football coach'", "Best bets for Week 12 CFB games"],
#     20191110: ["Burrow shines as LSU holds off Bama in thriller", "Trump soaks in Deep South cheers at LSU-Bama", "Fleck on beating Penn State: 'That was the vision'", "Sources: Ohio St. expects 4-game ban for Young", "Richt returns to work following heart attack", "Illini shock Spartans to become bowl eligible", "Who could take over as coach of Noles?", "Best of Week 11: Scores, Top 25 analysis and a party in Minnesota", "LSU-Alabama: Burrow and LSU shine, takeaways, CFP implications", "Projected 2020 draft order: Who has the No. 1 pick?", "Burrow shines as LSU holds off Bama in thriller", "Trump soaks in Deep South cheers at LSU-Bama", "Fleck on beating Penn State: 'That was the vision'", "Sources: Ohio St. expects 4-game ban for Young", "Richt returns to work following heart attack", "Illini shock Spartans to become bowl eligible", "Who could take over as coach of Noles?"],
#     20191103: ["White, Gibson help Memphis hand SMU first loss", "Taggart: Sloppy FSU loss to Miami 'unacceptable'", "Fromm lifts Dawgs past Gators in 'Cocktail Party'", "Irish score in final minute to rally by Virginia Tech", "Irish OT Hainsey likely fractured ankle, Kelly says", "Sources: Oklahoma St. WR Wallace has torn ACL", "How recruiting shaped college football's surprise teams", "White, Gibson help Memphis hand SMU first loss", "Taggart: Sloppy FSU loss to Miami 'unacceptable'", "Fromm lifts Dawgs past Gators in 'Cocktail Party'", "Irish score in final minute to rally by Virginia Tech", "Irish OT Hainsey likely fractured ankle, Kelly says", "Sources: Oklahoma St. WR Wallace has torn ACL", "How recruiting shaped college football's surprise teams"],
#     20191027: ["Best of Week 8: How to watch the top 25 games, picks, news and betting tips", "Champaign's poppin: Illini shock No. 6 Badgers", "Sooner Schooner tips over on field, ejects riders", "Clemson's Booth punches Cards player, ejected", "Hurts' 5-TD day helps OU crush West Virginia", "Auburn sets PAT record; streak ends on next kick", "Wisconsin's Taylor 3rd to 5,000 yards as junior", "Reranking the 2017 college football class", "Biggest questions for Ohio State, Alabama and every playoff contender", "Can Michigan find answers for Penn State's defense?", "Champaign's poppin: Illini shock No. 6 Badgers", "Sooner Schooner tips over on field, ejects riders", "Clemson's Booth punches Cards player, ejected", "Hurts' 5-TD day helps OU crush West Virginia", "Auburn sets PAT record; streak ends on next kick", "Wisconsin's Taylor 3rd to 5,000 yards as junior", "Reranking the 2017 college football class"],
#     20191013: ["Penn St. takes players' shirts backing teammate", "Ref was hit 'couple times' during OU-Texas fray", "Burrow's 3 TDs lift No. 5 LSU over No. 7 Florida", "Riley: OU 'just getting started' with Red River win", "Tua record cues 'rat poison' callback from Saban", "Memphis 'robbed' by key replay in loss, DB says", "Why Florida is better than you think", "Trash talk, LeBron tweets and an LSU-Florida showdown: The battle for DBU", "Best of Week 7: Top 25 games, Texas-Oklahoma (and fair food) on the menu", "Penn St. takes players' shirts backing teammate", "Ref was hit 'couple times' during OU-Texas fray", "Burrow's 3 TDs lift No. 5 LSU over No. 7 Florida", "Riley: OU 'just getting started' with Red River win", "Tua record cues 'rat poison' callback from Saban", "Memphis 'robbed' by key replay in loss, DB says", "Why Florida is better than you think"],
#     20191006: ["Week 6 Live: Top 25 games, picks and tips", "Scarlet Knights' starting QB, RB plan to redshirt", "Vols dismiss LB Banks after new video emerges", "UF QB Trask plays through 'light' MCL sprain", "Perine, defense lift No. 10 Fla. past No. 7 Auburn", "Burrow first LSU QB to hit 300 yards in 4 straight", "ESPN's GameDay heading to Dublin for ND-Navy", "Best bets for Week 6", "Where FPI sees a Week 6 edge vs. the spread", "Scarlet Knights' starting QB, RB plan to redshirt", "Vols dismiss LB Banks after new video emerges", "UF QB Trask plays through 'light' MCL sprain", "Perine, defense lift No. 10 Fla. past No. 7 Auburn", "Burrow first LSU QB to hit 300 yards in 4 straight", "ESPN's GameDay heading to Dublin for ND-Navy", "Best bets for Week 6"],
#     20190930: ["No. 1 Clemson stuffs 2-point try to escape UNC", "Tua, WR Smith smash Alabama records in rout", "Oklahoma, Notre Dame (again) earn 900th wins", "Bully gets hit: Miss St. bulldog fine after collision", "Terps WR Turner held out Fri. due to DUI charge", "Hurts enjoys big day with 4 total TDs to lead OU", "Best bets for CFB Week 5", "How Auburn, Gus Malzahn got their offensive groove back", "How Oklahoma State's attack could slow down Kansas State", "No. 1 Clemson stuffs 2-point try to escape UNC", "Tua, WR Smith smash Alabama records in rout", "Oklahoma, Notre Dame (again) earn 900th wins", "Bully gets hit: Miss St. bulldog fine after collision", "Terps WR Turner held out Fri. due to DUI charge", "Hurts enjoys big day with 4 total TDs to lead OU", "Best bets for CFB Week 5"],
#     20190908: ["LSU LB gives Ehlinger his due: 'Proved me wrong'", "Bearcats' McDonald collapses on field, carted off", "Kentucky QB Wilson to have MRI on left knee", "Florida WR Toney injured in win, to be reassessed", "Ex-NFL LB Trotter's son commits to Clemson", "San Diego St. gets first win over UCLA in 23 tries", "Predicting where top prospects will sign", "College football recruiting: Predicting where the nation's top prospects will sign", "Looks like the SEC is ready to dominate the playoff again", "Stream more episodes of 'Miles To Go'", "LSU LB gives Ehlinger his due: 'Proved me wrong'", "Bearcats' McDonald collapses on field, carted off", "Kentucky QB Wilson to have MRI on left knee", "Florida WR Toney injured in win, to be reassessed", "Ex-NFL LB Trotter's son commits to Clemson", "San Diego St. gets first win over UCLA in 23 tries", "Predicting where top prospects will sign"],
# }
#
#
# for week, headlines in HeadlineHistory.items():
#     for headline in headlines:
#         #print(headline)
#         if headline not in HeadlineList:
#             HeadlineList.append(headline)
#
#         for word in StripSpecialCharacters(ReplaceWithGenericTerms(headline)).split(' '):
#             #print(word)
#             if word not in WordMap:
#                 WordMap[word] = 0
#
#             WordMap[word] +=1
#
# for h in HeadlineList:
#     print(h)
#print(json.dumps(dict(sorted(WordMap.items(), key=lambda item: item[1], reverse=True)), indent=2))
