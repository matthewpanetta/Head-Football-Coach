import json

CollegeList = [
{'Common Name':'Auburn','Nickname':'Tigers','City':'Auburn','State':'Alabama','Classification':'State',},
{'Common Name':'Little Rock','Nickname':'Trojans','City':'Little Rock','State':'Arkansas','Classification':'State',},
{'Common Name':'Albany','Nickname':'Great Danes','City':'Albany','State':'New York','Classification':'State',},
{'Common Name':'Binghamton','Nickname':'Bearcats','City':'Vestal','State':'New York','Classification':'State',},
{'Common Name':'Buffalo','Nickname':'Bulls','City':'Buffalo','State':'New York','Classification':'State',},
{'Common Name':'Akron','Nickname':'Zips','City':'Akron','State':'Ohio','Classification':'State',},
{'Common Name':'Bowling Green','Nickname':'Falcons','City':'Bowling Green','State':'Ohio','Classification':'State',},
{'Common Name':'Cincinnati','Nickname':'Bearcats','City':'Cincinnati','State':'Ohio','Classification':'State',},
{'Common Name':'Clemson','Nickname':'Tigers','City':'Clemson','State':'South Carolina','Classification':'State',},
{'Common Name':'Abilene Christian','Nickname':'Wildcats','City':'Abilene','State':'Texas','Classification':'Private/Churches of Christ',},
{'Common Name':'Boston College','Nickname':'Eagles','City':'Boston','State':'Massachusetts','Classification':'Private/Catholic',},
{'Common Name':'Charleston Southern','Nickname':'Buccaneers','City':'North Charleston','State':'South Carolina','Classification':'Private/Baptist',},
{'Common Name':'Fresno State','Nickname':'Bulldogs','City':'Fresno','State':'California','Classification':'State',},
{'Common Name':'Long Beach State','Nickname':'The Beach','City':'Long Beach','State':'California','Classification':'State',},
{'Common Name':'Sacramento State','Nickname':'Hornets','City':'Sacramento','State':'California','Classification':'State',},
{'Common Name':'Boise State','Nickname':'Broncos','City':'Boise','State':'Idaho','Classification':'State',},
{'Common Name':'Chicago State','Nickname':'Cougars','City':'Chicago','State':'Illinois','Classification':'State',},
{'Common Name':'Cleveland State','Nickname':'Vikings','City':'Cleveland','State':'Ohio','Classification':'State',},
{'Common Name':'Boston University','Nickname':'Terriers','City':'Boston','State':'Massachusetts','Classification':'Private/Non-sectarian',},
{'Common Name':'College of Charleston','Nickname':'Cougars','City':'Charleston','State':'South Carolina','Classification':'State',},
{'Common Name':'American','Nickname':'Eagles','City':'Washington','State':'District of Columbia','Classification':'Private/Methodist',},
{'Common Name':'Central Arkansas','Nickname':'Bears','City':'Conway','State':'Arkansas','Classification':'State',},
{'Common Name':'Central Connecticut','Nickname':'Blue Devils','City':'New Britain','State':'Connecticut','Classification':'State',},
{'Common Name':'Central Michigan','Nickname':'Chippewas','City':'Mount Pleasant','State':'Michigan','Classification':'State',},
{'Common Name':'Coastal Carolina','Nickname':'Chanticleers','City':'Conway','State':'South Carolina','Classification':'State',},
{'Common Name':'Campbell','Nickname':'Fighting Camels','City':'Buies Creek','State':'North Carolina','Classification':'Private/Baptist',},
{'Common Name':'Baylor','Nickname':'Bears','City':'Waco','State':'Texas','Classification':'Private/Baptist',},
{'Common Name':'BYU','Nickname':'Cougars','City':'Provo','State':'Utah','Classification':'Private/Latter-Day Saints',},
{'Common Name':'Bradley','Nickname':'Braves','City':'Peoria','State':'Illinois','Classification':'Private/Non-Sectarian',},
{'Common Name':'Butler','Nickname':'Bulldogs','City':'Indianapolis','State':'Indiana','Classification':'Private/Non-Sectarian',},
{'Common Name':'Bucknell','Nickname':'Bison','City':'Lewisburg','State':'Pennsylvania','Classification':'Private/Non-Sectarian',},
{'Common Name':'Brown','Nickname':'Bears','City':'Providence','State':'Rhode Island','Classification':'Private/Non-Sectarian',},
{'Common Name':'Bryant','Nickname':'Bulldogs','City':'Smithfield','State':'Rhode Island','Classification':'Private/Non-Sectarian',},
{'Common Name':'Austin Peay','Nickname':'Governors','City':'Clarksville','State':'Tennessee','Classification':'State',},
{'Common Name':'Bethune–Cookman','Nickname':'Wildcats','City':'Daytona Beach','State':'Florida','Classification':'Private/Methodist',},
{'Common Name':'Ball State','Nickname':'Cardinals','City':'Muncie','State':'Indiana','Classification':'State',},
{'Common Name':'Appalachian State','Nickname':'Mountaineers','City':'Boone','State':'North Carolina','Classification':'State',},
{'Common Name':'Canisius','Nickname':'Golden Griffins','City':'Buffalo','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Alabama','Nickname':'Crimson Tide','City':'Tuscaloosa','State':'Alabama','Classification':'State',},
{'Common Name':'Arizona','Nickname':'Wildcats','City':'Tucson','State':'Arizona','Classification':'State',},
{'Common Name':'Arkansas','Nickname':'Razorbacks','City':'Fayetteville','State':'Arkansas','Classification':'State',},
{'Common Name':'California','Nickname':'Golden Bears','City':'Berkeley','State':'California','Classification':'State',},
{'Common Name':'Alabama A&M','Nickname':'Bulldogs','City':'Huntsville','State':'Alabama','Classification':'State',},
{'Common Name':'Arkansas–Pine Bluff','Nickname':'Golden Lions','City':'Pine Bluff','State':'Arkansas','Classification':'State',},
{'Common Name':'Alabama State','Nickname':'Hornets','City':'Montgomery','State':'Alabama','Classification':'State',},
{'Common Name':'Arizona State','Nickname':'Sun Devils','City':'Tempe','State':'Arizona','Classification':'State',},
{'Common Name':'Arkansas State','Nickname':'Red Wolves','City':'Jonesboro','State':'Arkansas','Classification':'State',},
{'Common Name':'Cal Poly','Nickname':'Mustangs','City':'San Luis Obispo','State':'California','Classification':'State',},
{'Common Name':'Cal State Bakersfield','Nickname':'Roadrunners','City':'Bakersfield','State':'California','Classification':'State',},
{'Common Name':'Cal State Fullerton','Nickname':'Titans','City':'Fullerton','State':'California','Classification':'State',},
{'Common Name':'Cal State Northridge','Nickname':'Matadors','City':'Northridge','State':'California','Classification':'State',},
{'Common Name':'UAB','Nickname':'Blazers','City':'Birmingham','State':'Alabama','Classification':'State',},
{'Common Name':'UCF','Nickname':'Knights','City':'Orlando','State':'Florida','Classification':'State',},
{'Common Name':'UCLA','Nickname':'Bruins','City':'Los Angeles','State':'California','Classification':'State',},
{'Common Name':'UC Davis','Nickname':'Aggies','City':'Davis','State':'California','Classification':'State',},
{'Common Name':'UC Irvine','Nickname':'Anteaters','City':'Irvine','State':'California','Classification':'State',},
{'Common Name':'UC Riverside','Nickname':'Highlanders','City':'Riverside','State':'California','Classification':'State',},
{'Common Name':'UC Santa Barbara','Nickname':'Gauchos','City':'Santa Barbara','State':'California','Classification':'State',},
{'Common Name':'Belmont','Nickname':'Bruins','City':'Nashville','State':'Tennessee','Classification':'Private/Christian',},
{'Common Name':'Alcorn State','Nickname':'Braves','City':'Lorman','State':'Mississippi','Classification':'State',},
{'Common Name':'Air Force','Nickname':'Falcons','City':'Colorado Springs','State':'Colorado','Classification':'Federal academy',},
{'Common Name':'Navy','Nickname':'Midshipmen','City':'Annapolis','State':'Maryland','Classification':'Federal academy',},
{'Common Name':'Army','Nickname':'Black Knights','City':'West Point','State':'New York','Classification':'Federal academy',},
{'Common Name':'Delaware','Nickname':'Fightin Blue Hens','City':'Newark','State':'Delaware','Classification':'Private-state hybrid',},
{'Common Name':'Samford','Nickname':'Bulldogs','City':'Homewood','State':'Alabama','Classification':'Private/Baptist',},
{'Common Name':'Gardner–Webb','Nickname':'Runnin Bulldogs','City':'Boiling Springs','State':'North Carolina','Classification':'Private/Baptist',},
{'Common Name':'Houston Baptist','Nickname':'Huskies','City':'Houston','State':'Texas','Classification':'Private/Baptist',},
{'Common Name':'Loyola Marymount','Nickname':'Lions','City':'Los Angeles','State':'California','Classification':'Private/Catholic',},
{'Common Name':'Saint Mary\'s','Nickname':'Gaels','City':'Moraga','State':'California','Classification':'Private/Catholic',},
{'Common Name':'San Diego','Nickname':'Toreros','City':'San Diego','State':'California','Classification':'Private/Catholic',},
{'Common Name':'San Francisco','Nickname':'Dons','City':'San Francisco','State':'California','Classification':'Private/Catholic',},
{'Common Name':'Santa Clara','Nickname':'Broncos','City':'Santa Clara','State':'California','Classification':'Private/Catholic',},
{'Common Name':'Fairfield','Nickname':'Stags','City':'Fairfield','State':'Connecticut','Classification':'Private/Catholic',},
{'Common Name':'Sacred Heart','Nickname':'Pioneers','City':'Fairfield','State':'Connecticut','Classification':'Private/Catholic',},
{'Common Name':'Georgetown','Nickname':'Hoyas','City':'Washington','State':'District of Columbia','Classification':'Private/Catholic',},
{'Common Name':'DePaul','Nickname':'Blue Demons','City':'Chicago','State':'Illinois','Classification':'Private/Catholic',},
{'Common Name':'Loyola–Chicago','Nickname':'Ramblers','City':'Chicago','State':'Illinois','Classification':'Private/Catholic',},
{'Common Name':'Notre Dame','Nickname':'Fighting Irish','City':'South Bend','State':'Indiana','Classification':'Private/Catholic',},
{'Common Name':'Loyola (MD)','Nickname':'Greyhounds','City':'Baltimore','State':'Maryland','Classification':'Private/Catholic',},
{'Common Name':'Mount St. Mary\'s','Nickname':'Mountaineers','City':'Emmitsburg','State':'Maryland','Classification':'Private/Catholic',},
{'Common Name':'Holy Cross','Nickname':'Crusaders','City':'Worcester','State':'Massachusetts','Classification':'Private/Catholic',},
{'Common Name':'Detroit','Nickname':'Titans','City':'Detroit','State':'Michigan','Classification':'Private/Catholic',},
{'Common Name':'Saint Louis','Nickname':'Billikens','City':'St. Louis','State':'Missouri','Classification':'Private/Catholic',},
{'Common Name':'Creighton','Nickname':'Bluejays','City':'Omaha','State':'Nebraska','Classification':'Private/Catholic',},
{'Common Name':'Saint Peter\'s','Nickname':'Peacocks','City':'Jersey City','State':'New Jersey','Classification':'Private/Catholic',},
{'Common Name':'Seton Hall','Nickname':'Pirates','City':'South Orange','State':'New Jersey','Classification':'Private/Catholic',},
{'Common Name':'Fordham','Nickname':'Rams','City':'Bronx','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Iona','Nickname':'Gaels','City':'New Rochelle','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Manhattan','Nickname':'Jaspers','City':'Riverdale','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Marist','Nickname':'Red Foxes','City':'Poughkeepsie','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Niagara','Nickname':'Purple Eagles','City':'Lewiston','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Siena','Nickname':'Saints','City':'Loudonville','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'St. Bonaventure','Nickname':'Bonnies','City':'St. Bonaventure','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'St. Francis Brooklyn','Nickname':'Terriers','City':'Brooklyn','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'St. John\'s','Nickname':'Red Storm','City':'Jamaica','State':'New York','Classification':'Private/Catholic',},
{'Common Name':'Dayton','Nickname':'Flyers','City':'Dayton','State':'Ohio','Classification':'Private/Catholic',},
{'Common Name':'Xavier','Nickname':'Musketeers','City':'Cincinnati','State':'Ohio','Classification':'Private/Catholic',},
{'Common Name':'Portland','Nickname':'Pilots','City':'Portland','State':'Oregon','Classification':'Private/Catholic',},
{'Common Name':'Duequesne','Nickname':'Dukes','City':'Pittsburgh','State':'Pennsylvania','Classification':'Private/Catholic',},
{'Common Name':'La Salle','Nickname':'Explorers','City':'Philadelphia','State':'Pennsylvania','Classification':'Private/Catholic',},
{'Common Name':'Saint Francis (PA)','Nickname':'Red Flash','City':'Loretto','State':'Pennsylvania','Classification':'Private/Catholic',},
{'Common Name':'Saint Joseph\'s','Nickname':'Hawks','City':'Philadelphia','State':'Pennsylvania','Classification':'Private/Catholic',},
{'Common Name':'Villanova','Nickname':'Wildcats','City':'Radnor Township','State':'Pennsylvania','Classification':'Private/Catholic',},
{'Common Name':'Providence','Nickname':'Friars','City':'Providence','State':'Rhode Island','Classification':'Private/Catholic',},
{'Common Name':'Incarnate Word','Nickname':'Cardinals','City':'San Antonio','State':'Texas','Classification':'Private/Catholic',},
{'Common Name':'Gonzaga','Nickname':'Bulldogs','City':'Spokane','State':'Washington','Classification':'Private/Catholic',},
{'Common Name':'Seattle','Nickname':'Redhawks','City':'Seattle','State':'Washington','Classification':'Private/Catholic',},
{'Common Name':'Marquette','Nickname':'Golden Eagles','City':'Milwaukee','State':'Wisconsin','Classification':'Private/Catholic',},
{'Common Name':'Grand Canyon','Nickname':'Antelopes','City':'Phoenix','State':'Arizona','Classification':'Private/Christian',},
{'Common Name':'Oral Roberts','Nickname':'Golden Eagles','City':'Tulsa','State':'Oklahoma','Classification':'Private/Christian',},
{'Common Name':'Liberty','Nickname':'Flames','City':'Lynchburg','State':'Virginia','Classification':'Private/Christian',},
{'Common Name':'Pepperdine','Nickname':'Waves','City':'Malibu','State':'California','Classification':'Private/Churches of Christ',},
{'Common Name':'Lipscomb','Nickname':'Bisons','City':'Nashville','State':'Tennessee','Classification':'Private/Churches of Christ',},
{'Common Name':'TCU','Nickname':'Horned Frogs','City':'Fort Worth','State':'Texas','Classification':'Private/Disciples of Christ',},
{'Common Name':'Valpo','Nickname':'Crusaders','City':'Valparaiso','State':'Indiana','Classification':'Private/Lutheran',},
{'Common Name':'Wagner','Nickname':'Seahawks','City':'Staten Island','State':'New York','Classification':'Private/Lutheran',},
{'Common Name':'Pacific','Nickname':'Tigers','City':'Stockton','State':'California','Classification':'Private/Methodist',},
{'Common Name':'Evansville','Nickname':'Purple Aces','City':'Evansville','State':'Indiana','Classification':'Private/Methodist',},
{'Common Name':'High Point','Nickname':'Panthers','City':'High Point','State':'North Carolina','Classification':'Private/Methodist',},
{'Common Name':'Wofford','Nickname':'Terriers','City':'Spartanburg','State':'South Carolina','Classification':'Private/Methodist',},
{'Common Name':'SMU','Nickname':'Mustangs','City':'University Park','State':'Texas','Classification':'Private/Methodist',},
{'Common Name':'Stanford','Nickname':'Cardinal','City':'Palo Alto','State':'California','Classification':'Private/Non-Sectarian',},
{'Common Name':'USC','Nickname':'Trojans','City':'Los Angeles','State':'California','Classification':'Private/Non-Sectarian',},
{'Common Name':'Denver','Nickname':'Pioneers','City':'Denver','State':'Colorado','Classification':'Private/Non-sectarian',},
{'Common Name':'Hartford','Nickname':'Hawks','City':'West Hartford','State':'Connecticut','Classification':'Private/Non-sectarian',},
{'Common Name':'Quinnipiac','Nickname':'Bobcats','City':'Hamden','State':'Connecticut','Classification':'Private/Non-Sectarian',},
{'Common Name':'Yale','Nickname':'Bulldogs','City':'New Haven','State':'Connecticut','Classification':'Private/Non-Sectarian',},
{'Common Name':'George Washington','Nickname':'Colonials','City':'Washington','State':'District of Columbia','Classification':'Private/Non-sectarian',},
{'Common Name':'Howard','Nickname':'Bison','City':'Washington','State':'District of Columbia','Classification':'Private/Non-sectarian',},
{'Common Name':'Jacksonville','Nickname':'Dolphins','City':'Jacksonville','State':'Florida','Classification':'Private/Non-Sectarian',},
{'Common Name':'Miami','Nickname':'Hurricanes','City':'Coral Gables','State':'Florida','Classification':'Private/Non-Sectarian',},
{'Common Name':'Stetson','Nickname':'Hatters','City':'DeLand','State':'Florida','Classification':'Private/Non-Sectarian',},
{'Common Name':'Mercer','Nickname':'Bears','City':'Macon','State':'Georgia','Classification':'Private/Non-Sectarian',},
{'Common Name':'Northwestern','Nickname':'Wildcats','City':'Evanston','State':'Illinois','Classification':'Private/Non-Sectarian',},
{'Common Name':'Drake','Nickname':'Bulldogs','City':'Des Moines','State':'Iowa','Classification':'Private/Non-sectarian',},
{'Common Name':'Tulane','Nickname':'Green Wave','City':'New Orleans','State':'Louisiana','Classification':'Private/Non-Sectarian',},
{'Common Name':'Harvard','Nickname':'Crimson','City':'Cambridge','State':'Massachusetts','Classification':'Private/Non-sectarian',},
{'Common Name':'Northeastern','Nickname':'Huskies','City':'Boston','State':'Massachusetts','Classification':'Private/Non-Sectarian',},
{'Common Name':'Dartmouth','Nickname':'Big Green','City':'Hanover','State':'New Hampshire','Classification':'Private/Non-sectarian',},
{'Common Name':'Fairleigh Dickinson','Nickname':'Knights','City':'Hackensack','State':'New Jersey','Classification':'Private/Non-sectarian',},
{'Common Name':'Monmouth','Nickname':'Hawks','City':'West Long Branch','State':'New Jersey','Classification':'Private/Non-Sectarian',},
{'Common Name':'Princeton','Nickname':'Tigers','City':'Princeton','State':'New Jersey','Classification':'Private/Non-Sectarian',},
{'Common Name':'Rider','Nickname':'Broncs','City':'Lawrenceville','State':'New Jersey','Classification':'Private/Non-Sectarian',},
{'Common Name':'Colgate','Nickname':'Raiders','City':'Hamilton','State':'New York','Classification':'Private/Non-sectarian',},
{'Common Name':'Columbia','Nickname':'Lions','City':'Manhattan','State':'New York','Classification':'Private/Non-sectarian',},
{'Common Name':'Hofstra','Nickname':'Pride','City':'Hempstead','State':'New York','Classification':'Private/Non-sectarian',},
{'Common Name':'LIU','Nickname':'Sharks','City':'Brooklyn','State':'New York','Classification':'Private/Non-Sectarian',},
{'Common Name':'Syracuse','Nickname':'Orange','City':'Syracuse','State':'New York','Classification':'Private/Non-Sectarian',},
{'Common Name':'Duke','Nickname':'Blue Devils','City':'Durham','State':'North Carolina','Classification':'Private/Non-sectarian',},
{'Common Name':'Elon','Nickname':'Phoenix','City':'Elon','State':'North Carolina','Classification':'Private/Non-sectarian',},
{'Common Name':'Wake Forest','Nickname':'Demon Deacons','City':'Winston-Salem','State':'North Carolina','Classification':'Private/Non-Sectarian',},
{'Common Name':'Drexel','Nickname':'Dragons','City':'Philadelphia','State':'Pennsylvania','Classification':'Private/Non-sectarian',},
{'Common Name':'Lehigh','Nickname':'Mountain Hawks','City':'Bethlehem','State':'Pennsylvania','Classification':'Private/Non-Sectarian',},
{'Common Name':'Penn','Nickname':'Quakers','City':'Philadelphia','State':'Pennsylvania','Classification':'Private/Non-Sectarian',},
{'Common Name':'Robert Morris','Nickname':'Colonials','City':'Moon Township','State':'Pennsylvania','Classification':'Private/Non-Sectarian',},
{'Common Name':'Furman','Nickname':'Paladins and Lady Paladins','City':'Greenville','State':'South Carolina','Classification':'Private/Non-sectarian',},
{'Common Name':'Vanderbilt','Nickname':'Commodores','City':'Nashville','State':'Tennessee','Classification':'Private/Non-Sectarian',},
{'Common Name':'Rice','Nickname':'Owls','City':'Houston','State':'Texas','Classification':'Private/Non-Sectarian',},
{'Common Name':'Hampton','Nickname':'Pirates and Lady Pirates','City':'Hampton','State':'Virginia','Classification':'Private/Non-sectarian',},
{'Common Name':'Richmond','Nickname':'Spiders','City':'Richmond','State':'Virginia','Classification':'Private/Non-Sectarian',},
{'Common Name':'Davidson','Nickname':'Wildcats','City':'Davidson','State':'North Carolina','Classification':'Private/Presbyterian',},
{'Common Name':'Tulsa','Nickname':'Golden Hurricane','City':'Tulsa','State':'Oklahoma','Classification':'Private/Presbyterian',},
{'Common Name':'Lafayette','Nickname':'Leopards','City':'Easton','State':'Pennsylvania','Classification':'Private/Presbyterian',},
{'Common Name':'Presbyterian','Nickname':'Blue Hose','City':'Clinton','State':'South Carolina','Classification':'Private/Presbyterian',},
{'Common Name':'Cornell','Nickname':'Big Red','City':'Ithaca','State':'New York','Classification':'Private/Statutory state',},
{'Common Name':'Jacksonville State','Nickname':'Gamecocks','City':'Jacksonville','State':'Alabama','Classification':'State',},
{'Common Name':'South Alabama','Nickname':'Jaguars','City':'Mobile','State':'Alabama','Classification':'State',},
{'Common Name':'Troy','Nickname':'Trojans','City':'Troy','State':'Alabama','Classification':'State',},
{'Common Name':'Northern Arizona','Nickname':'Lumberjacks','City':'Flagstaff','State':'Arizona','Classification':'State',},
{'Common Name':'San Diego State','Nickname':'Aztecs','City':'San Diego','State':'California','Classification':'State',},
{'Common Name':'San Jose State','Nickname':'Spartans','City':'San Jose','State':'California','Classification':'State',},
{'Common Name':'Colorado','Nickname':'Buffaloes','City':'Boulder','State':'Colorado','Classification':'State',},
{'Common Name':'Colorado State','Nickname':'Rams','City':'Fort Collins','State':'Colorado','Classification':'State',},
{'Common Name':'Northern Colorado','Nickname':'Bears','City':'Greeley','State':'Colorado','Classification':'State',},
{'Common Name':'UConn','Nickname':'Huskies','City':'Storrs','State':'Connecticut','Classification':'State',},
{'Common Name':'Delaware State','Nickname':'Hornets and Lady Hornets','City':'Dover','State':'Delaware','Classification':'State',},
{'Common Name':'FGCU','Nickname':'Eagles','City':'Fort Myers','State':'Florida','Classification':'State',},
{'Common Name':'FIU','Nickname':'Panthers','City':'Miami','State':'Florida','Classification':'State',},
{'Common Name':'Florida','Nickname':'Gators','City':'Gainesville','State':'Florida','Classification':'State',},
{'Common Name':'Florida A&M','Nickname':'Rattlers and Lady Rattlers','City':'Tallahassee','State':'Florida','Classification':'State',},
{'Common Name':'Florida Atlantic','Nickname':'Owls','City':'Boca Raton','State':'Florida','Classification':'State',},
{'Common Name':'Florida State','Nickname':'Seminoles','City':'Tallahassee','State':'Florida','Classification':'State',},
{'Common Name':'North Florida','Nickname':'Ospreys and Lady Ospreys','City':'Jacksonville','State':'Florida','Classification':'State',},
{'Common Name':'South Florida','Nickname':'Bulls','City':'Tampa','State':'Florida','Classification':'State',},
{'Common Name':'Georgia','Nickname':'Bulldogs and Lady Bulldogs','City':'Athens','State':'Georgia','Classification':'State',},
{'Common Name':'Georgia Southern','Nickname':'Eagles and Lady Eagles','City':'Statesboro','State':'Georgia','Classification':'State',},
{'Common Name':'Georgia State','Nickname':'Panthers','City':'Atlanta','State':'Georgia','Classification':'State',},
{'Common Name':'Georgia Tech','Nickname':'Yellow Jackets','City':'Atlanta','State':'Georgia','Classification':'State',},
{'Common Name':'Kennesaw State','Nickname':'Owls and Lady Owls','City':'Kennesaw','State':'Georgia','Classification':'State',},
{'Common Name':'Hawaii','Nickname':'Rainbow Warriors and Rainbow Wahine','City':'Honolulu','State':'Hawaii','Classification':'State',},
{'Common Name':'Idaho','Nickname':'Vandals','City':'Moscow','State':'Idaho','Classification':'State',},
{'Common Name':'Idaho State','Nickname':'Bengals','City':'Pocatello','State':'Idaho','Classification':'State',},
{'Common Name':'Eastern Illinois','Nickname':'Panthers','City':'Charleston','State':'Illinois','Classification':'State',},
{'Common Name':'Illinois','Nickname':'Fighting Illini','City':'Urbana–Champaign','State':'Illinois','Classification':'State',},
{'Common Name':'Illinois State','Nickname':'Redbirds','City':'Normal','State':'Illinois','Classification':'State',},
{'Common Name':'Northern Illinois','Nickname':'Huskies','City':'DeKalb','State':'Illinois','Classification':'State',},
{'Common Name':'SIU Edwardsville','Nickname':'Cougars','City':'Edwardsville','State':'Illinois','Classification':'State',},
{'Common Name':'Southern Illinois','Nickname':'Salukis','City':'Carbondale','State':'Illinois','Classification':'State',},
{'Common Name':'UIC','Nickname':'Flames','City':'Chicago','State':'Illinois','Classification':'State',},
{'Common Name':'Western Illinois','Nickname':'Leathernecks','City':'Macomb','State':'Illinois','Classification':'State',},
{'Common Name':'Indiana','Nickname':'Hoosiers','City':'Bloomington','State':'Indiana','Classification':'State',},
{'Common Name':'Indiana State','Nickname':'Sycamores','City':'Terre Haute','State':'Indiana','Classification':'State',},
{'Common Name':'IUPUI','Nickname':'Jaguars','City':'Indianapolis','State':'Indiana','Classification':'State',},
{'Common Name':'Purdue','Nickname':'Boilermakers','City':'West Lafayette','State':'Indiana','Classification':'State',},
{'Common Name':'Purdue Fort Wayne','Nickname':'Mastodons','City':'Fort Wayne','State':'Indiana','Classification':'State',},
{'Common Name':'Iowa','Nickname':'Hawkeyes','City':'Iowa City','State':'Iowa','Classification':'State',},
{'Common Name':'Iowa State','Nickname':'Cyclones','City':'Ames','State':'Iowa','Classification':'State',},
{'Common Name':'Northern Iowa','Nickname':'Panthers','City':'Cedar Falls','State':'Iowa','Classification':'State',},
{'Common Name':'Kansas','Nickname':'Jayhawks','City':'Lawrence','State':'Kansas','Classification':'State',},
{'Common Name':'Kansas State','Nickname':'Wildcats','City':'Manhattan','State':'Kansas','Classification':'State',},
{'Common Name':'Wichita State','Nickname':'Shockers','City':'Wichita','State':'Kansas','Classification':'State',},
{'Common Name':'Eastern Kentucky','Nickname':'Colonels','City':'Richmond','State':'Kentucky','Classification':'State',},
{'Common Name':'Kentucky','Nickname':'Wildcats','City':'Lexington','State':'Kentucky','Classification':'State',},
{'Common Name':'Louisville','Nickname':'Cardinals','City':'Louisville','State':'Kentucky','Classification':'State',},
{'Common Name':'Morehead State','Nickname':'Eagles','City':'Morehead','State':'Kentucky','Classification':'State',},
{'Common Name':'Murray State','Nickname':'Racers','City':'Murray','State':'Kentucky','Classification':'State',},
{'Common Name':'Northern Kentucky','Nickname':'Norse','City':'Highland Heights','State':'Kentucky','Classification':'State',},
{'Common Name':'Western Kentucky','Nickname':'Hilltoppers and Lady Toppers','City':'Bowling Green','State':'Kentucky','Classification':'State',},
{'Common Name':'Grambling','Nickname':'Tigers and Lady Tigers','City':'Grambling','State':'Louisiana','Classification':'State',},
{'Common Name':'Louisiana Tech','Nickname':'Bulldogs and Lady Techsters','City':'Ruston','State':'Louisiana','Classification':'State',},
{'Common Name':'Louisiana–Monroe','Nickname':'Warhawks','City':'Monroe','State':'Louisiana','Classification':'State',},
{'Common Name':'Louisiana','Nickname':'Ragin Cajuns','City':'Lafayette','State':'Louisiana','Classification':'State',},
{'Common Name':'LSU','Nickname':'Tigers and Lady Tigers','City':'Baton Rouge','State':'Louisiana','Classification':'State',},
{'Common Name':'McNeese State','Nickname':'Cowboys and Cowgirls','City':'Lake Charles','State':'Louisiana','Classification':'State',},
{'Common Name':'New Orleans','Nickname':'Privateers','City':'New Orleans','State':'Louisiana','Classification':'State',},
{'Common Name':'Nicholls','Nickname':'Colonels','City':'Thibodaux','State':'Louisiana','Classification':'State',},
{'Common Name':'Northwestern State','Nickname':'Demons and Lady Demons','City':'Natchitoches','State':'Louisiana','Classification':'State',},
{'Common Name':'Southeastern Louisiana','Nickname':'Lions and Lady Lions','City':'Hammond','State':'Louisiana','Classification':'State',},
{'Common Name':'Southern','Nickname':'Jaguars and Lady Jaguars','City':'Baton Rouge','State':'Louisiana','Classification':'State',},
{'Common Name':'Maine','Nickname':'Black Bears','City':'Orono','State':'Maine','Classification':'State',},
{'Common Name':'Coppin State','Nickname':'Eagles','City':'Baltimore','State':'Maryland','Classification':'State',},
{'Common Name':'Maryland','Nickname':'Terrapins','City':'College Park','State':'Maryland','Classification':'State',},
{'Common Name':'Maryland Eastern Shore','Nickname':'Hawks and Lady Hawks','City':'Princess Anne','State':'Maryland','Classification':'State',},
{'Common Name':'Morgan State','Nickname':'Bears and Lady Bears','City':'Baltimore','State':'Maryland','Classification':'State',},
{'Common Name':'Towson','Nickname':'Tigers','City':'Towson','State':'Maryland','Classification':'State',},
{'Common Name':'UMBC','Nickname':'Retrievers','City':'Baltimore County','State':'Maryland','Classification':'State',},
{'Common Name':'UMass Lowell','Nickname':'River Hawks','City':'Lowell','State':'Massachusetts','Classification':'State',},
{'Common Name':'UMass','Nickname':'Minutemen and Minutewomen','City':'Amherst','State':'Massachusetts','Classification':'State',},
{'Common Name':'Eastern Michigan','Nickname':'Eagles','City':'Ypsilanti','State':'Michigan','Classification':'State',},
{'Common Name':'Michigan','Nickname':'Wolverines','City':'Ann Arbor','State':'Michigan','Classification':'State',},
{'Common Name':'Michigan State','Nickname':'Spartans','City':'East Lansing','State':'Michigan','Classification':'State',},
{'Common Name':'Oakland','Nickname':'Golden Grizzlies','City':'Rochester','State':'Michigan','Classification':'State',},
{'Common Name':'Western Michigan','Nickname':'Broncos','City':'Kalamazoo','State':'Michigan','Classification':'State',},
{'Common Name':'Minnesota','Nickname':'Golden Gophers','City':'Minneapolis–Saint Paul','State':'Minnesota','Classification':'State',},
{'Common Name':'Jackson State','Nickname':'Tigers and Lady Tigers','City':'Jackson','State':'Mississippi','Classification':'State',},
{'Common Name':'Mississippi State','Nickname':'Bulldogs','City':'Starkville','State':'Mississippi','Classification':'State',},
{'Common Name':'Mississippi Valley State','Nickname':'Delta Devils and Devilettes','City':'Itta Bena','State':'Mississippi','Classification':'State',},
{'Common Name':'Ole Miss','Nickname':'Rebels','City':'Oxford','State':'Mississippi','Classification':'State',},
{'Common Name':'Southern Miss','Nickname':'Golden Eagles and Lady Eagles','City':'Hattiesburg','State':'Mississippi','Classification':'State',},
{'Common Name':'Kansas City','Nickname':'Roos','City':'Kansas City','State':'Missouri','Classification':'State',},
{'Common Name':'Missouri','Nickname':'Tigers','City':'Columbia','State':'Missouri','Classification':'State',},
{'Common Name':'Missouri State','Nickname':'Bears and Lady Bears','City':'Springfield','State':'Missouri','Classification':'State',},
{'Common Name':'Southeast Missouri','Nickname':'Redhawks','City':'Cape Girardeau','State':'Missouri','Classification':'State',},
{'Common Name':'Montana','Nickname':'Grizzlies','City':'Missoula','State':'Montana','Classification':'State',},
{'Common Name':'Montana State','Nickname':'Bobcats','City':'Bozeman','State':'Montana','Classification':'State',},
{'Common Name':'Nebraska','Nickname':'Cornhuskers','City':'Lincoln','State':'Nebraska','Classification':'State',},
{'Common Name':'Omaha','Nickname':'Mavericks','City':'Omaha','State':'Nebraska','Classification':'State',},
{'Common Name':'Nevada','Nickname':'Wolf Pack','City':'Reno','State':'Nevada','Classification':'State',},
{'Common Name':'UNLV','Nickname':'Rebels','City':'Las Vegas','State':'Nevada','Classification':'State',},
{'Common Name':'New Hampshire','Nickname':'Wildcats','City':'Durham','State':'New Hampshire','Classification':'State',},
{'Common Name':'NJIT','Nickname':'Highlanders','City':'Newark','State':'New Jersey','Classification':'State',},
{'Common Name':'New Mexico','Nickname':'Lobos','City':'Albuquerque','State':'New Mexico','Classification':'State',},
{'Common Name':'New Mexico State','Nickname':'Aggies','City':'Las Cruces','State':'New Mexico','Classification':'State',},
{'Common Name':'Stony Brook','Nickname':'Seawolves','City':'Stony Brook','State':'New York','Classification':'State',},
{'Common Name':'Charlotte','Nickname':'49ers','City':'Charlotte','State':'North Carolina','Classification':'State',},
{'Common Name':'East Carolina','Nickname':'Pirates and Lady Pirates','City':'Greenville','State':'North Carolina','Classification':'State',},
{'Common Name':'NC State','Nickname':'Wolfpack','City':'Raleigh','State':'North Carolina','Classification':'State',},
{'Common Name':'North Carolina','Nickname':'Tar Heels','City':'Chapel Hill','State':'North Carolina','Classification':'State',},
{'Common Name':'North Carolina A&T','Nickname':'Aggies','City':'Greensboro','State':'North Carolina','Classification':'State',},
{'Common Name':'North Carolina Central','Nickname':'Eagles','City':'Durham','State':'North Carolina','Classification':'State',},
{'Common Name':'UNC Asheville','Nickname':'Bulldogs','City':'Asheville','State':'North Carolina','Classification':'State',},
{'Common Name':'UNC Greensboro','Nickname':'Spartans','City':'Greensboro','State':'North Carolina','Classification':'State',},
{'Common Name':'UNC Wilmington','Nickname':'Seahawks','City':'Wilmington','State':'North Carolina','Classification':'State',},
{'Common Name':'Western Carolina','Nickname':'Catamounts','City':'Cullowhee','State':'North Carolina','Classification':'State',},
{'Common Name':'North Dakota','Nickname':'Fighting Hawks','City':'Grand Forks','State':'North Dakota','Classification':'State',},
{'Common Name':'North Dakota State','Nickname':'Bison','City':'Fargo','State':'North Dakota','Classification':'State',},
{'Common Name':'Kent State','Nickname':'Golden Flashes','City':'Kent','State':'Ohio','Classification':'State',},
{'Common Name':'Miami (OH)','Nickname':'Redhawks','City':'Oxford','State':'Ohio','Classification':'State',},
{'Common Name':'Ohio','Nickname':'Bobcats','City':'Athens','State':'Ohio','Classification':'State',},
{'Common Name':'Ohio State','Nickname':'Buckeyes','City':'Columbus','State':'Ohio','Classification':'State',},
{'Common Name':'Toledo','Nickname':'Rockets','City':'Toledo','State':'Ohio','Classification':'State',},
{'Common Name':'Wright State','Nickname':'Raiders','City':'Fairborn','State':'Ohio','Classification':'State',},
{'Common Name':'Youngstown State','Nickname':'Penguins','City':'Youngstown','State':'Ohio','Classification':'State',},
{'Common Name':'Oklahoma','Nickname':'Sooners','City':'Norman','State':'Oklahoma','Classification':'State',},
{'Common Name':'Oklahoma State','Nickname':'Cowboys and Cowgirls','City':'Stillwater','State':'Oklahoma','Classification':'State',},
{'Common Name':'Oregon','Nickname':'Ducks','City':'Eugene','State':'Oregon','Classification':'State',},
{'Common Name':'Oregon State','Nickname':'Beavers','City':'Corvallis','State':'Oregon','Classification':'State',},
{'Common Name':'Portland State','Nickname':'Vikings','City':'Portland','State':'Oregon','Classification':'State',},
{'Common Name':'Rhode Island','Nickname':'Rams','City':'Kingston','State':'Rhode Island','Classification':'State',},
{'Common Name':'South Carolina','Nickname':'Gamecocks','City':'Columbia','State':'South Carolina','Classification':'State',},
{'Common Name':'South Carolina State','Nickname':'Bulldogs and Lady Bulldogs','City':'Orangeburg','State':'South Carolina','Classification':'State',},
{'Common Name':'The Citadel','Nickname':'Bulldogs','City':'Charleston','State':'South Carolina','Classification':'State',},
{'Common Name':'USC Upstate','Nickname':'Spartans','City':'Spartanburg','State':'South Carolina','Classification':'State',},
{'Common Name':'Winthrop','Nickname':'Eagles','City':'Rock Hill','State':'South Carolina','Classification':'State',},
{'Common Name':'South Dakota','Nickname':'Coyotes','City':'Vermillion','State':'South Dakota','Classification':'State',},
{'Common Name':'South Dakota State','Nickname':'Jackrabbits','City':'Brookings','State':'South Dakota','Classification':'State',},
{'Common Name':'Chattanooga','Nickname':'Mocs','City':'Chattanooga','State':'Tennessee','Classification':'State',},
{'Common Name':'East Tennessee State','Nickname':'Buccaneers and Lady Buccaneers','City':'Johnson City','State':'Tennessee','Classification':'State',},
{'Common Name':'Memphis','Nickname':'Tigers','City':'Memphis','State':'Tennessee','Classification':'State',},
{'Common Name':'Middle Tennessee','Nickname':'Blue Raiders','City':'Murfreesboro','State':'Tennessee','Classification':'State',},
{'Common Name':'Tennessee','Nickname':'Volunteers and Lady Vols','City':'Knoxville','State':'Tennessee','Classification':'State',},
{'Common Name':'Tennessee State','Nickname':'Tigers and Lady Tigers','City':'Nashville','State':'Tennessee','Classification':'State',},
{'Common Name':'Tennessee Tech','Nickname':'Golden Eagles','City':'Cookeville','State':'Tennessee','Classification':'State',},
{'Common Name':'UT Martin','Nickname':'Skyhawks','City':'Martin','State':'Tennessee','Classification':'State',},
{'Common Name':'Houston','Nickname':'Cougars','City':'Houston','State':'Texas','Classification':'State',},
{'Common Name':'Lamar','Nickname':'Cardinals and Lady Cardinals','City':'Beaumont','State':'Texas','Classification':'State',},
{'Common Name':'North Texas','Nickname':'Mean Green','City':'Denton','State':'Texas','Classification':'State',},
{'Common Name':'Prairie View A&M','Nickname':'Panthers and Lady Panthers','City':'Prairie View','State':'Texas','Classification':'State',},
{'Common Name':'Sam Houston State','Nickname':'Bearkats','City':'Huntsville','State':'Texas','Classification':'State',},
{'Common Name':'Stephen F. Austin','Nickname':'Lumberjacks and Ladyjacks','City':'Nacogdoches','State':'Texas','Classification':'State',},
{'Common Name':'Texas','Nickname':'Longhorns','City':'Austin','State':'Texas','Classification':'State',},
{'Common Name':'Texas A&M','Nickname':'Aggies','City':'College Station','State':'Texas','Classification':'State',},
{'Common Name':'Texas A&M–Corpus Christi','Nickname':'Islanders','City':'Corpus Christi','State':'Texas','Classification':'State',},
{'Common Name':'Texas Southern','Nickname':'Tigers and Lady Tigers','City':'Houston','State':'Texas','Classification':'State',},
{'Common Name':'Texas State','Nickname':'Bobcats','City':'San Marcos','State':'Texas','Classification':'State',},
{'Common Name':'Texas Tech','Nickname':'Red Raiders','City':'Lubbock','State':'Texas','Classification':'State',},
{'Common Name':'Texas–Arlington','Nickname':'Mavericks','City':'Arlington','State':'Texas','Classification':'State',},
{'Common Name':'UTEP','Nickname':'Miners','City':'El Paso','State':'Texas','Classification':'State',},
{'Common Name':'UTRGV','Nickname':'Vaqueros','City':'Edinburg','State':'Texas','Classification':'State',},
{'Common Name':'UTSA','Nickname':'Roadrunners','City':'San Antonio','State':'Texas','Classification':'State',},
{'Common Name':'Southern Utah','Nickname':'Thunderbirds','City':'Cedar City','State':'Utah','Classification':'State',},
{'Common Name':'Utah','Nickname':'Utes','City':'Salt Lake City','State':'Utah','Classification':'State',},
{'Common Name':'Utah State','Nickname':'Aggies','City':'Logan','State':'Utah','Classification':'State',},
{'Common Name':'Utah Valley','Nickname':'Wolverines','City':'Orem','State':'Utah','Classification':'State',},
{'Common Name':'Weber State','Nickname':'Wildcats','City':'Ogden','State':'Utah','Classification':'State',},
{'Common Name':'Vermont','Nickname':'Catamounts','City':'Burlington','State':'Vermont','Classification':'State',},
{'Common Name':'George Mason','Nickname':'Patriots','City':'Fairfax','State':'Virginia','Classification':'State',},
{'Common Name':'James Madison','Nickname':'Dukes','City':'Harrisonburg','State':'Virginia','Classification':'State',},
{'Common Name':'Longwood','Nickname':'Lancers','City':'Farmville','State':'Virginia','Classification':'State',},
{'Common Name':'Norfolk State','Nickname':'Spartans','City':'Norfolk','State':'Virginia','Classification':'State',},
{'Common Name':'Old Dominion','Nickname':'Monarchs and Lady Monarchs','City':'Norfolk','State':'Virginia','Classification':'State',},
{'Common Name':'Radford','Nickname':'Highlanders','City':'Radford','State':'Virginia','Classification':'State',},
{'Common Name':'VCU','Nickname':'Rams','City':'Richmond','State':'Virginia','Classification':'State',},
{'Common Name':'Virginia','Nickname':'Cavaliers','City':'Charlottesville','State':'Virginia','Classification':'State',},
{'Common Name':'Virginia Tech','Nickname':'Hokies','City':'Blacksburg','State':'Virginia','Classification':'State',},
{'Common Name':'VMI','Nickname':'Keydets','City':'Lexington','State':'Virginia','Classification':'State',},
{'Common Name':'William & Mary','Nickname':'Tribe','City':'Williamsburg','State':'Virginia','Classification':'State',},
{'Common Name':'Eastern Washington','Nickname':'Eagles','City':'Cheney','State':'Washington','Classification':'State',},
{'Common Name':'Washington','Nickname':'Huskies','City':'Seattle','State':'Washington','Classification':'State',},
{'Common Name':'Washington State','Nickname':'Cougars','City':'Pullman','State':'Washington','Classification':'State',},
{'Common Name':'Marshall','Nickname':'Thundering Herd','City':'Huntington','State':'West Virginia','Classification':'State',},
{'Common Name':'West Virginia','Nickname':'Mountaineers','City':'Morgantown','State':'West Virginia','Classification':'State',},
{'Common Name':'Green Bay','Nickname':'Phoenix','City':'Green Bay','State':'Wisconsin','Classification':'State',},
{'Common Name':'Milwaukee','Nickname':'Panthers','City':'Milwaukee','State':'Wisconsin','Classification':'State',},
{'Common Name':'Wisconsin','Nickname':'Badgers','City':'Madison','State':'Wisconsin','Classification':'State',},
{'Common Name':'Wyoming','Nickname':'Cowboys and Cowgirls','City':'Laramie','State':'Wyoming','Classification':'State',},
{'Common Name':'Rutgers','Nickname':'Scarlet Knights','City':'New Brunswick','State':'New Jersey','Classification':'State-private hybrid',},
{'Common Name':'Penn State','Nickname':'Nittany Lions','City':'State College','State':'Pennsylvania','Classification':'State-related',},
{'Common Name':'Pittsburgh','Nickname':'Panthers','City':'Pittsburgh','State':'Pennsylvania','Classification':'State-related',},
{'Common Name':'Temple','Nickname':'Owls','City':'Philadelphia','State':'Pennsylvania','Classification':'State-related',},]



def PrintJson(DictToPrint, SortKey = None, indent=2, SortDesc = True):

    D = sorted(DictToPrint, reverse=SortDesc)
    print(json.dumps(DictToPrint, indent=indent))

NicknameDictionary = {}

NamePatternDictionary = {}

Directionals = sorted(['East', 'Eastern', 'South', 'Southern', 'Central', 'North', 'Northern', 'West', 'Western', 'Northeastern', 'Northwestern', 'Southeastern', 'Southeast'], key=lambda s: len(s), reverse=True)
Religions = sorted(['Baptist', 'Christian', 'Methodist', 'Wesleyan', 'Presbyterian'], key=lambda s: len(s), reverse=True)
Attributes = sorted(['Atlantic', 'Coastal', 'Gulf Coast', 'International'], key=lambda s: len(s), reverse=True)

StateShortMap = {
    'Pennsylvania': 'Penn',
    'Connecticut': 'Conn',
    'California': 'Cal',
    'Massachusetts': 'Mass'
}

for College in CollegeList:
    if College['Nickname'] not in NicknameDictionary:
        NicknameDictionary[College['Nickname']] = 0

    NicknameDictionary[College['Nickname']] +=1

    College['Naming Pattern'] = ''

    CommonName = College['Common Name'].replace('–', ' ')
    StateName = College['State']
    SplitStateName_Init = StateName.split(' ')
    CityName = College['City']


    NamingPatternMatchString = CommonName.replace(StateName, 'StateName').replace( CityName, 'CityName')


    StateInitials = ''.join([W[0] for W in SplitStateName_Init])
    CityInitials = ''.join([W[0] for W in CityName.split(' ')])

    if len(SplitStateName_Init) > 1:
        SplitStateName = []
        for StateNamePart in SplitStateName_Init:
            if StateNamePart not in Directionals:
                SplitStateName.append(StateNamePart)
        SplitStateName = ' '.join(SplitStateName)


        NamingPatternMatchString = NamingPatternMatchString.replace(SplitStateName, 'StateName')


    for Directional in Directionals:
        NamingPatternMatchString = NamingPatternMatchString.replace(Directional, 'Directional')

    for Religion in Religions:
        NamingPatternMatchString = NamingPatternMatchString.replace(Religion, 'Religion')

    for Attribute in Attributes:
        NamingPatternMatchString = NamingPatternMatchString.replace(Attribute, 'Attribute')


    if StateName in StateShortMap:
        StateShort = StateShortMap[StateName]
        NamingPatternMatchString = NamingPatternMatchString.replace(StateShort, 'StateShort')


    if len(StateInitials) > 1:
        NamingPatternMatchString = NamingPatternMatchString.replace(StateInitials, 'StateInitials')
    else:
        NamingPatternMatchString = NamingPatternMatchString.replace('U'+StateInitials, 'UStateInitials')

    if len(CityInitials) > 1:
        NamingPatternMatchString = NamingPatternMatchString.replace(CityInitials, 'CityInitials')
    else:
        if CityInitials == NamingPatternMatchString[:-1 * len(CityInitials)]:
            NamingPatternMatchString = NamingPatternMatchString.replace(CityInitials, 'CityInitials')



    College['Naming Pattern'] = NamingPatternMatchString



    if College['Naming Pattern'] not in NamePatternDictionary:
        NamePatternDictionary[College['Naming Pattern']] = []

    NamePatternDictionary[College['Naming Pattern']].append(CommonName)


for Pattern in sorted(NamePatternDictionary, key=lambda P: len(NamePatternDictionary[P]), reverse=True):
    print(Pattern, NamePatternDictionary[Pattern], '\n')
