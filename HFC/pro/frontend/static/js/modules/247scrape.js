
      /*
      $('li.rankings-page__list-item').each(function(ind, elem){
          players.push({position: $(elem).find('.position').text(), high_school: $(elem).find('.meta').first().text(), class: $(elem).find('.meta').last().text(), signed_to: $(elem).find('.status [title]').attr('title') })
      });


      $.each(players, function(ind, player){
    //player.class = parseInt(player.class.replace('Class of ','').replace('(Signed)', '').replace('(Enrolled)', '').trim());
    player.position = player.position.trim().replace('PRO', 'QB').replace('WDE', 'DE').replace('SDE', 'DE').replace('DUAL', 'QB').replace('APB', 'RB');
    player.high_school_new = player.high_school.trim().match(/, [A-Z]+/g)

    if (player.high_school_new.length > 0){
        player.high_school_new = player.high_school_new[0].replace(', ', '')
    }
})

"[{\"position\":\"DE\",\"high_school\":\" South Pointe (Rock Hill, SC)  \",\"class\":2011,\"signed_to\":\"South Carolina\",\"high_school_new\":\"SC\"},{\"position\":\"DE\",\"high_school\":\" Grayson (Loganville, GA)  \",\"class\":2013,\"signed_to\":\"Ole Miss\",\"high_school_new\":\"GA\"},{\"position\":\"DT\",\"high_school\":\" Paramus Catholic (Paramus, NJ)  \",\"class\":2016,\"signed_to\":\"Michigan\",\"high_school_new\":\"NJ\"},{\"position\":\"QB\",\"high_school\":\" Madison (Houston, TX)  \",\"class\":2002,\"signed_to\":\"Texas\",\"high_school_new\":\"TX\"},{\"position\":\"ILB\",\"high_school\":\" North Florida Christian (Tallahassee, FL)  \",\"class\":2003,\"signed_to\":\"Florida State\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" Rancho Verde (Moreno Valley, CA)  \",\"class\":2010,\"signed_to\":\"Florida\",\"high_school_new\":\"CA\"},{\"position\":\"QB\",\"high_school\":\" Cartersville (Cartersville, GA)  \",\"class\":2018,\"signed_to\":\"Clemson\",\"high_school_new\":\"GA\"},{\"position\":\"WR\",\"high_school\":\" Hillcrest (Springfield, MO)  \",\"class\":2012,\"signed_to\":\"Missouri\",\"high_school_new\":\"MO\"},{\"position\":\"QB\",\"high_school\":\" Harrison (Kennesaw, GA)  \",\"class\":2018,\"signed_to\":\"Georgia\",\"high_school_new\":\"GA\"},{\"position\":\"ILB\",\"high_school\":\" De La Salle (Concord, CA)  \",\"class\":2000,\"signed_to\":\"Miami\",\"high_school_new\":\"CA\"},{\"position\":\"QB\",\"high_school\":\" Evangel Christian Academy (Shreveport, LA)  \",\"class\":2000,\"signed_to\":\"Florida\",\"high_school_new\":\"LA\"},{\"position\":\"DE\",\"high_school\":\" Bamberg-Ehrhardt (Bamberg, SC)  \",\"class\":2008,\"signed_to\":\"Clemson\",\"high_school_new\":\"SC\"},{\"position\":\"QB\",\"high_school\":\" Jeannette (Jeannette, PA)  \",\"class\":2008,\"signed_to\":\"Ohio State\",\"high_school_new\":\"PA\"},{\"position\":\"RB\",\"high_school\":\" John Curtis (New Orleans, LA)  \",\"class\":2007,\"signed_to\":\"USC\",\"high_school_new\":\"LA\"},{\"position\":\"DE\",\"high_school\":\" Centennial (Corona, CA)  \",\"class\":2021,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"RB\",\"high_school\":\" St. Augustine (New Orleans, LA)  \",\"class\":2014,\"signed_to\":\"LSU\",\"high_school_new\":\"LA\"},{\"position\":\"RB\",\"high_school\":\" Palestine (Palestine, TX)  \",\"class\":2004,\"signed_to\":\"Oklahoma\",\"high_school_new\":\"TX\"},{\"position\":\"DT\",\"high_school\":\" Ryan (Denton, TX)  \",\"class\":2012,\"signed_to\":\"Florida State\",\"high_school_new\":\"TX\"},{\"position\":\"DT\",\"high_school\":\" Damascus (Damascus, MD)  \",\"class\":2020,\"signed_to\":\"Clemson\",\"high_school_new\":\"MD\"},{\"position\":\"OT\",\"high_school\":\" DeMatha Catholic (Hyattsville, MD)  \",\"class\":2011,\"signed_to\":\"Alabama\",\"high_school_new\":\"MD\"},{\"position\":\"OG\",\"high_school\":\" Huffman (Birmingham, AL)  \",\"class\":2006,\"signed_to\":\"Alabama\",\"high_school_new\":\"AL\"},{\"position\":\"QB\",\"high_school\":\" Mater Dei (Santa Ana, CA)  \",\"class\":2020,\"signed_to\":\"Alabama\",\"high_school_new\":\"CA\"},{\"position\":\"DE\",\"high_school\":\" IMG Academy (Bradenton, FL)  \",\"class\":2019,\"signed_to\":\"Georgia\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" Martin (Arlington, TX)  \",\"class\":2014,\"signed_to\":\"Texas A&M\",\"high_school_new\":\"TX\"},{\"position\":\"QB\",\"high_school\":\" Mater Dei (Newport Beach, CA)  \",\"class\":2009,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"DT\",\"high_school\":\" Eastside Catholic (Sammamish, WA)  \",\"class\":2021,\"high_school_new\":\"WA\"},{\"position\":\"DT\",\"high_school\":\" Westover (Albany, GA)  \",\"class\":2015,\"signed_to\":\"Georgia\",\"high_school_new\":\"GA\"},{\"position\":\"ATH\",\"high_school\":\" Paramus Catholic (Paramus, NJ)  \",\"class\":2014,\"signed_to\":\"Michigan\",\"high_school_new\":\"NJ\"},{\"position\":\"DT\",\"high_school\":\" Wake Forest (Wake Forest, NC)  \",\"class\":2016,\"signed_to\":\"Clemson\",\"high_school_new\":\"NC\"},{\"position\":\"WR\",\"high_school\":\" Foley  (Foley, AL)  \",\"class\":2008,\"signed_to\":\"Alabama\",\"high_school_new\":\"AL\"},{\"position\":\"RB\",\"high_school\":\" East (Wichita, KS)  \",\"class\":2009,\"signed_to\":\"Tennessee\",\"high_school_new\":\"KS\"},{\"position\":\"OT\",\"high_school\":\" Plainfield (Plainfield, NJ)  \",\"class\":2005,\"signed_to\":\"Virginia\",\"high_school_new\":\"NJ\"},{\"position\":\"WR\",\"high_school\":\" Goodpasture Christian School (Madison, TN)  \",\"class\":2005,\"signed_to\":\"USC\",\"high_school_new\":\"TN\"},{\"position\":\"RB\",\"high_school\":\" Cardinal O'Hara (Springfield, PA)  \",\"class\":2001,\"signed_to\":\"Virginia Tech\",\"high_school_new\":\"PA\"},{\"position\":\"CB\",\"high_school\":\" Glenville (Cleveland, OH)  \",\"class\":2004,\"signed_to\":\"Ohio State\",\"high_school_new\":\"OH\"},{\"position\":\"RB\",\"high_school\":\" St. Bonaventure (Ventura, CA)  \",\"class\":2002,\"signed_to\":\"Florida State\",\"high_school_new\":\"CA\"},{\"position\":\"OT\",\"high_school\":\" Apopka (Apopka, FL)  \",\"class\":2015,\"signed_to\":\"Florida\",\"high_school_new\":\"FL\"},{\"position\":\"OT\",\"high_school\":\" Allen (Allen, TX)  \",\"class\":2016,\"signed_to\":\"Ole Miss\",\"high_school_new\":\"TX\"},{\"position\":\"WR\",\"high_school\":\" Landstown (Virginia Beach, VA)  \",\"class\":2006,\"signed_to\":\"Florida\",\"high_school_new\":\"VA\"},{\"position\":\"WR\",\"high_school\":\" St. Bonaventure (Ventura, CA)  \",\"class\":2003,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"DE\",\"high_school\":\" Redlands East Valley (Redlands, CA)  \",\"class\":2017,\"signed_to\":\"UCLA\",\"high_school_new\":\"CA\"},{\"position\":\"OT\",\"high_school\":\" Cretin Derham Hall (Saint Paul, MN)  \",\"class\":2010,\"signed_to\":\"Miami\",\"high_school_new\":\"MN\"},{\"position\":\"QB\",\"high_school\":\" Oaks Christian (Thousand Oaks, CA)  \",\"class\":2007,\"signed_to\":\"Notre Dame\",\"high_school_new\":\"CA\"},{\"position\":\"DE\",\"high_school\":\" IMG Academy (Bradenton, FL)  \",\"class\":2018,\"signed_to\":\"Clemson\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" Pickerington North (Pickerington, OH)  \",\"class\":2021,\"signed_to\":\"Ohio State\",\"high_school_new\":\"OH\"},{\"position\":\"OLB\",\"high_school\":\" Miami Carol City (Opa Locka, FL)  \",\"class\":2004,\"signed_to\":\"Miami\",\"high_school_new\":\"FL\"},{\"position\":\"QB\",\"high_school\":\" Agape Academy (Mission Viejo, CA)  \",\"class\":2005,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"WR\",\"high_school\":\" Saginaw (Saginaw, MI)  \",\"class\":2000,\"signed_to\":\"Michigan State\",\"high_school_new\":\"MI\"},{\"position\":\"OLB\",\"high_school\":\" Bishop Luers (Fort Wayne, IN)  \",\"class\":2013,\"signed_to\":\"Notre Dame\",\"high_school_new\":\"IN\"},{\"position\":\"ATH\",\"high_school\":\" Junipero Serra (Gardena, CA)  \",\"class\":2010,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"DE\",\"high_school\":\" Armwood (Seffner, FL)  \",\"class\":2015,\"signed_to\":\"Auburn\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" St. Frances Academy (Baltimore, MD)  \",\"class\":2018,\"signed_to\":\"Alabama\",\"high_school_new\":\"MD\"},{\"position\":\"DE\",\"high_school\":\" Oaks Christian (Thousand Oaks, CA)  \",\"class\":2019,\"signed_to\":\"Oregon\",\"high_school_new\":\"CA\"},{\"position\":\"CB\",\"high_school\":\" Long Beach Poly (Long Beach, CA)  \",\"class\":2015,\"signed_to\":\"USC\",\"high_school_new\":\"CA\"},{\"position\":\"QB\",\"high_school\":\" Cy Ridge (Houston, TX)  \",\"class\":2009,\"signed_to\":\"LSU\",\"high_school_new\":\"TX\"},{\"position\":\"CB\",\"high_school\":\" Creekside (Fairburn, GA)  \",\"class\":2007,\"signed_to\":\"Tennessee\",\"high_school_new\":\"GA\"},{\"position\":\"WR\",\"high_school\":\" Eleanor Roosevelt (Greenbelt, MD)  \",\"class\":2005,\"signed_to\":\"Penn State\",\"high_school_new\":\"MD\"},{\"position\":\"QB\",\"high_school\":\" Westbrook Christian School (Rainbow City, AL)  \",\"class\":2001,\"signed_to\":\"Alabama\",\"high_school_new\":\"AL\"},{\"position\":\"WR\",\"high_school\":\" Dr. Phillips (Orlando, FL)  \",\"class\":2002,\"signed_to\":\"Miami\",\"high_school_new\":\"FL\"},{\"position\":\"RB\",\"high_school\":\" Antioch (Antioch, CA)  \",\"class\":2017,\"signed_to\":\"Alabama\",\"high_school_new\":\"CA\"},{\"position\":\"RB\",\"high_school\":\" Clinton (Clinton, MS)  \",\"class\":2017,\"signed_to\":\"Florida State\",\"high_school_new\":\"MS\"},{\"position\":\"WR\",\"high_school\":\" Hargrave Military Academy (HS) (Chatham, VA)  \",\"class\":2006,\"signed_to\":\"USC\",\"high_school_new\":\"VA\"},{\"position\":\"QB\",\"high_school\":\" Monte Vista (Danville, CA)  \",\"class\":2003,\"signed_to\":\"Miami\",\"high_school_new\":\"CA\"},{\"position\":\"S\",\"high_school\":\" Haines City Senior (Auburndale, FL)  \",\"class\":2015,\"signed_to\":\"Florida State\",\"high_school_new\":\"FL\"},{\"position\":\"QB\",\"high_school\":\" IMG Academy (Bradenton, FL)  \",\"class\":2016,\"signed_to\":\"Ole Miss\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" Harrisburg (Harrisburg, PA)  \",\"class\":2018,\"signed_to\":\"Penn State\",\"high_school_new\":\"PA\"},{\"position\":\"DE\",\"high_school\":\" Notre Dame (Sherman Oaks, CA)  \",\"class\":2000,\"signed_to\":\"Florida State\",\"high_school_new\":\"CA\"},{\"position\":\"QB\",\"high_school\":\" Grand Prairie (Grand Prairie, TX)  \",\"class\":2004,\"signed_to\":\"Oklahoma\",\"high_school_new\":\"TX\"},{\"position\":\"OT\",\"high_school\":\" Booker T. Washington (Pensacola, FL)  \",\"class\":2017,\"signed_to\":\"Alabama\",\"high_school_new\":\"FL\"},{\"position\":\"ILB\",\"high_school\":\" Woodrow Wilson (Dallas, TX)  \",\"class\":2006,\"signed_to\":\"Texas\",\"high_school_new\":\"TX\"},{\"position\":\"OT\",\"high_school\":\" West Monroe (West Monroe, LA)  \",\"class\":2014,\"signed_to\":\"Alabama\",\"high_school_new\":\"LA\"},{\"position\":\"CB\",\"high_school\":\" Wharton (Tampa, FL)  \",\"class\":2013,\"signed_to\":\"Florida\",\"high_school_new\":\"FL\"},{\"position\":\"OT\",\"high_school\":\" Mallard Creek (Charlotte, NC)  \",\"class\":2012,\"signed_to\":\"Florida\",\"high_school_new\":\"NC\"},{\"position\":\"RB\",\"high_school\":\" St. Bonaventure (Ventura, CA)  \",\"class\":2008,\"signed_to\":\"Colorado\",\"high_school_new\":\"CA\"},{\"position\":\"CB\",\"high_school\":\" Dunham School (Baton Rouge, LA)  \",\"class\":2019,\"signed_to\":\"LSU\",\"high_school_new\":\"LA\"},{\"position\":\"QB\",\"high_school\":\" Hillcrest Christian School (Thousand Oaks, CA)  \",\"class\":2002,\"signed_to\":\"BYU\",\"high_school_new\":\"CA\"},{\"position\":\"RB\",\"high_school\":\" Thomas Jefferson (Denver, CO)  \",\"class\":2000,\"signed_to\":\"Colorado\",\"high_school_new\":\"CO\"},{\"position\":\"ATH\",\"high_school\":\" St. Petersburg (Saint Petersburg, FL)  \",\"class\":2002,\"signed_to\":\"Florida State\",\"high_school_new\":\"FL\"},{\"position\":\"WR\",\"high_school\":\" Lincoln (Tallahassee, FL)  \",\"class\":2005,\"signed_to\":\"Florida State\",\"high_school_new\":\"FL\"},{\"position\":\"WR\",\"high_school\":\" St. Martinville Senior (Saint Martinville, LA)  \",\"class\":2004,\"signed_to\":\"LSU\",\"high_school_new\":\"LA\"},{\"position\":\"DE\",\"high_school\":\" Miller County (Coolidge, GA)  \",\"class\":2004,\"signed_to\":\"Georgia\",\"high_school_new\":\"GA\"},{\"position\":\"DE\",\"high_school\":\" Woodbridge (Woodbridge, VA)  \",\"class\":2014,\"signed_to\":\"Alabama\",\"high_school_new\":\"VA\"},{\"position\":\"S\",\"high_school\":\" St. Peters Prep (Jersey City, NJ)  \",\"class\":2008,\"signed_to\":\"Florida\",\"high_school_new\":\"NJ\"},{\"position\":\"DT\",\"high_school\":\" Ballou (Washington, DC)  \",\"class\":2007,\"signed_to\":\"North Carolina\",\"high_school_new\":\"DC\"},{\"position\":\"WR\",\"high_school\":\" Southern Columbia (Catawissa, PA)  \",\"class\":2020,\"signed_to\":\"Ohio State\",\"high_school_new\":\"PA\"},{\"position\":\"OT\",\"high_school\":\" All Saints Episcopal (Fort Worth, TX)  \",\"class\":2021,\"signed_to\":\"Alabama\",\"high_school_new\":\"TX\"},{\"position\":\"DT\",\"high_school\":\" Curtis (Staten Island, NY)  \",\"class\":2010,\"signed_to\":\"Florida\",\"high_school_new\":\"NY\"},{\"position\":\"S\",\"high_school\":\" Grant Union (Sacramento, CA)  \",\"class\":2012,\"signed_to\":\"Washington\",\"high_school_new\":\"CA\"},{\"position\":\"QB\",\"high_school\":\" Texas High (Texarkana, TX)  \",\"class\":2007,\"signed_to\":\"Michigan\",\"high_school_new\":\"TX\"},{\"position\":\"WR\",\"high_school\":\" Union (Union, SC)  \",\"class\":2001,\"signed_to\":\"Clemson\",\"high_school_new\":\"SC\"},{\"position\":\"OT\",\"high_school\":\" Newark (Newark, DE)  \",\"class\":2000,\"signed_to\":\"Stanford\",\"high_school_new\":\"DE\"},{\"position\":\"OT\",\"high_school\":\" Redemptorist (Baton Rouge, LA)  \",\"class\":2011,\"signed_to\":\"LSU\",\"high_school_new\":\"LA\"},{\"position\":\"S\",\"high_school\":\" Ridge Community (Davenport, FL)  \",\"class\":2011,\"signed_to\":\"Florida State\",\"high_school_new\":\"FL\"},{\"position\":\"S\",\"high_school\":\" Hun School  (Princeton, NJ)  \",\"class\":2006,\"signed_to\":\"Florida State\",\"high_school_new\":\"NJ\"},{\"position\":\"ILB\",\"high_school\":\" Punahou (Honolulu, HI)  \",\"class\":2009,\"signed_to\":\"Notre Dame\",\"high_school_new\":\"HI\"},{\"position\":\"CB\",\"high_school\":\" Blanche Ely (Pompano Beach, FL)  \",\"class\":2008,\"signed_to\":\"LSU\",\"high_school_new\":\"FL\"},{\"position\":\"OT\",\"high_school\":\" Columbia (Lake City, FL)  \",\"class\":2013,\"signed_to\":\"Ole Miss\",\"high_school_new\":\"FL\"},{\"position\":\"DE\",\"high_school\":\" Plano West (Plano, TX)  \",\"class\":2010,\"signed_to\":\"Texas\",\"high_school_new\":\"TX\"},{\"position\":\"CB\",\"high_school\":\" Saguaro (Scottsdale, AZ)  \",\"class\":2020,\"signed_to\":\"Georgia\",\"high_school_new\":\"AZ\"},{\"position\":\"WR\",\"high_school\":\" South Grand Prairie (Grand Prairie, TX)  \",\"class\":2000,\"signed_to\":\"Texas\",\"high_school_new\":\"TX\"},{\"position\":\"\",\"high_school\":\"\",\"class\":null,\"high_school_new\":null}]"
      */
