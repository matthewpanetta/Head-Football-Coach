

let db = undefined;
var ddb = undefined;

class player_stat {


}

class team {

  build_team_logo(size_obj){
    var folder_prefix = '/static/img/TeamLogos/'
    var size_suffix = ''
    if ('img_size' in size_obj){
      size_suffix = '_' + size_obj['img_size']
    }
    var path = folder_prefix + this.school_name + '_' + this.team_name + size_suffix + '.png';
    path = path.toLowerCase().replaceAll(' ', '_').replaceAll('&', '_');

    return path;
  }

  get full_name(){
    return `${this.school_name} ${this.team_name}`
  }

    get team_href() {
        return `/World/${this.world_id}/Team/${this.team_id}`;
    }

    get team_logo() {
        return this.build_team_logo({});
    }

    get team_logo_50() {
      return this.build_team_logo({img_size: 50});
    }

    get team_logo_100() {
      return this.build_team_logo({img_size: 100});
    }

    luma(color){
      var R = color.slice(0,2)
      var G = color.slice(2,4)
      var B = color.slice(4,6)

      const luma = (0.299 * (parseInt(R, 16)**2) + 0.587 * (parseInt(G, 16)**2) + 0.114 * (parseInt(B, 16)**2))**.5;
      return luma;
    }

    get secondary_color_display() {
      if (this.luma(this.team_color_secondary_hex) < 230) {
        return this.team_color_secondary_hex;
      }
      return '000000'
    }
}


class team_season {

    get national_rank_display() {
      if (this.rankings.national_rank[0] <= 25){
        return `(${this.rankings.national_rank[0]})`
      }
        return '';
    }

    get record_display(){
      return `${this.record.wins} - ${this.record.losses} `
    }

    get conference_record_display(){
      return `${this.record.conference_wins} - ${this.record.conference_losses} `
    }

}

class player {

  get full_name(){
    return `${this.name.first} ${this.name.last}`
  }

  get player_href(){
    return `/World/${this.world_id}/Player/${this.player_id}`;
  }

  get hometown_and_state() {
    return `${this.hometown.city}, ${this.hometown.state}`;
  }

  get height_formatted(){
    const feet = parseInt(this.height / 12);
    const inches = this.height % 12;
    return `${feet}'${inches}"`
  }

}

class player_team_season {

  get completion_percentage() {
    if (this.season_stats.passing.attempts == 0){
      return 0
    }
    return this.season_stats.passing.completions / this.season_stats.passing.attempts;
  }

  get passing_yards_per_game(){
    if (this.season_stats.games.games_played == 0){
      return 0
    }
    return this.season_stats.passing.yards / this.season_stats.games.games_played;  }

  get rushing_yards_per_game(){
    if (this.season_stats.games.games_played == 0){
      return 0
    }
    return this.season_stats.rushing.yards / this.season_stats.games.games_played;  }

  get receiving_yards_per_game(){
    if (this.season_stats.games.games_played == 0){
      return 0
    }
    return this.season_stats.receiving.yards / this.season_stats.games.games_played;  }

  get yards_per_carry(){
    if (this.season_stats.rushing.carries == 0){
      return 0
    }
    return this.season_stats.rushing.yards / this.season_stats.rushing.carries;  }


    get yards_per_catch(){
      if (this.season_stats.receiving.receptions == 0){
        return 0
      }
      return this.season_stats.receiving.yards / this.season_stats.receiving.receptions;  }
}

class game {
  get game_href() {
      return `/World/${this.world_id}/Game/${this.game_id}`;
  }
}


class player_team_game {

}

const navbar = async (page) => {

        $('.nav-tab-button').on('click', function(event, target) {

          if ($(this).attr('id') == 'nav-sidebar-tab'){
            $('#sidebar').addClass('sidebar-open');
            $('.sidebar-fade').addClass('sidebar-fade-open');
            $('.sidebar-fade-open').on('click', function(){
                $(this).removeClass('sidebar-fade-open');
                $('#sidebar').removeClass('sidebar-open');
            });
            return false;
          }

          var ClickedTab = $(event.target)[0];
          $.each($('.selected-tab'), function(index, tab){
            var TargetTab = $(tab);
            $(TargetTab).css('backgroundColor', '');
            $(TargetTab).removeClass('selected-tab');
          });

          $(ClickedTab).addClass('selected-tab');
          $(ClickedTab).css('background-color', '#'+page.SecondaryColor);


          var NewTabContent = $('#' + $(this).attr('id').replace('-tab', ''))[0];

          $.each($('.tab-content'), function(index, OldTabContent){
            $(OldTabContent).css('display', 'none');
          });

          $(NewTabContent).css('display', 'block');
        });
    }



const team_header_links = async (params) => {
  const path = params.path;
  const season = params.season;
  const db = params.db;

  const all_paths = [
            {'href_extension': '', 'Display': 'Overview'},
            {'href_extension': 'Roster', 'Display': 'Roster'},
            {'href_extension': 'DepthChart', 'Display': 'Depth Chart'},
            {'href_extension': 'Gameplan', 'Display': 'Gameplan'},
            {'href_extension': 'Schedule', 'Display': 'Schedule'},
            {'href_extension': 'History', 'Display': 'History'}
          ];

    const link_paths = all_paths.filter(link => link.Display != path);

    $.each(all_paths, function(ind, path_obj){
      if (path_obj.Display == 'History'){
        return 0;
      }
      else if (season != undefined) {
        if (path_obj.display == 'Overview'){
          path_obj.href_extension += `Season/${season}`;
        }
        else {
          path_obj.href_extension += `/Season/${season}`;
        }
      }
    });

    var seasons = await db.league_season.toArray();
    if (season != undefined) {
      seasons = seasons.map(season => `../${season}`);
    }
    else {
      seasons = seasons.map(season => `./Season/${season}`)
    }

    var return_links = all_paths[0];
    $.each(all_paths, function(ind, path_obj){
      if (path_obj.Display == path){
        return_links = {link_paths: link_paths, external_paths: path_obj, seasons: seasons};
      }
    });

    return return_links;

}

const nav_bar_links = async (params) => {

  const path = params.path;
  const group_name = params.group_name;
  const db = params.db;

  const league_seasons = await db.league_season.toArray();
  const current_league_season = league_seasons.filter(ls => ls.is_current_season)[0];
  const season = current_league_season.season;
  const world_id = current_league_season.world_id;

  const phases = await query_to_dict(await db.phase.where({season: 2021}).toArray(), 'one_to_one', 'phase_id');

  const weeks = await db.week.toArray();
  const current_week = weeks.filter(week => week.is_current)[0];
  current_week.phase = phases[current_week.phase_id];
  current_week.league_season = current_league_season;

  console.log('current_week',current_week, phases)

  const user_team = await db.team.get({team_id: current_league_season.user_team_id});

  const team_id = user_team.team_id
  const user_team_logo = user_team.team_logo

  var can_sim = true, save_ls=true;

  var user_actions = [];

  var sim_action_week = {'LinkDisplay': 'Sim This Week', 'id': 'SimThisWeek', 'Href': '#', 'ClassName': 'sim-action'}
  var sim_action_phase = {'LinkDisplay': 'Sim This Phase', 'id': 'SimThisPhase', 'Href': '#', 'ClassName': 'sim-action'}

  if (current_week != null){
    console.log('current week isnt null!')
    if (current_week.phase.phase_name == 'Pre-Season'){
      console.log('its preseason! set the navbar!')
      can_sim = true;
      save_ls = true;

      //Check for user team needing to cut players
      if (!(current_league_season.preseason_tasks.user_cut_players)){
        if (user_team.player_count > current_league_season.players_per_team) {
          user_actions.push({'LinkDisplay': 'Cut Players', 'Href': `/World/${world_id}/Team/${team_id}/Roster`, 'ClassName': ''});
          can_sim = false;
        }
        else {
          current_league_season.preseason_tasks.user_cut_players = true;
          save_ls = true;
        }
      }

      //Check for user team needing captains
      if (user_team.captain_count < current_league_season.captains_per_team) {
        user_actions.push({'LinkDisplay': 'Set Captains', 'Href': `/World/${world_id}/Team/${team_id}/Roster`, 'ClassName': ''});
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!(current_league_season.preseason_tasks.user_set_gameplan)) {
        user_actions.push({'LinkDisplay': 'Set Gameplan', 'Href': `/World/${world_id}/Team/${team_id}/Gameplan`, 'ClassName': ''});
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!(current_league_season.preseason_tasks.user_set_depth_chart)) {
        user_actions.push({'LinkDisplay': 'Set Depth Chart', 'Href': `/World/${world_id}/Team/${team_id}/DepthChart`, 'ClassName': ''});
        can_sim = false;
      }

      if (!(can_sim)){
        sim_action_week.ClassName += ' w3-disabled'
        sim_action_phase.ClassName += ' w3-disabled'
      }

      if (save_ls){
        db.league_season.put(current_league_season);
      }

    }
    else if (current_week.phase.phase_name == 'Season Recap') {
      user_actions.push({'LinkDisplay': 'View Season Awards', 'Href': `/World/${world_id}/Awards`, 'ClassName': ''})
    }
    else if (current_week.phase.phase_name == 'Coach Carousel') {
      user_actions.push({'LinkDisplay': 'View Coach Carousel', 'Href': `/World/${world_id}/CoachCarousel`, 'ClassName': ''})
    }
    else if (current_week.phase.phase_name == 'Draft Departures') {
      user_actions.push({'LinkDisplay': 'View Player Departures', 'Href': `/World/${world_id}/PlayerDepartures`, 'ClassName': ''})
    }
    else if (current_week.phase.phase_name == 'National Signing Day') {
      user_actions.push({'LinkDisplay': 'View Recruiting Board', 'Href': `/World/${world_id}/Recruiting`, 'ClassName': ''})
    }
    else if (current_week.phase.phase_name == 'Prepare for Summer Camps') {
      user_actions.push({'LinkDisplay': 'Set Player Development', 'Href': `/World/${world_id}/PlayerDevelopment`, 'ClassName': ''})
    }

    sim_action_phase.LinkDisplay = 'Sim to ' + current_week.phase_id.next_phase_name;
    user_actions.unshift(sim_action_phase)

    if (current_week.user_recruiting_points_left_this_week > 0){
      user_actions.push({'LinkDisplay': `Weekly Recruiting ${current_week.user_recruiting_points_left_this_week}`, 'Href': `/World/${world_id}/Recruiting`, 'ClassName': ''})
    }

    if (!(current_week.last_week_in_phase)){
      user_actions.unshift(sim_action_week)
    }

    const week_updates = current_week.week_updates;
    if (week_updates.length > 0){
      user_actions.push({'LinkDisplay': `Updates this week ${week_updates.length}`, 'id': 'WeekUpdates', 'Href': '#', 'ClassName': 'week-updates'})
    }

    const season_start_year = season
  }

  const sim_action_status = {'CanSim': can_sim, 'LinkGroups': []};
  const LinkGroups = [
      {'GroupName': 'Action', 'GroupDisplay': `${current_week.week_name}, ${season} TASKS`, 'GroupLinks': user_actions},
      {'GroupName': 'World', 'GroupDisplay': '<img src="/static/img/TeamLogos/ncaa-text.png" class="" alt="">', 'GroupLinks':[
          {'LinkDisplay': 'Overview', 'id': '', 'Href': `/World/${world_id}`, 'ClassName': ''},
          {'LinkDisplay': 'Standings', 'id': '', 'Href': `/World/${world_id}/Conferences`, 'ClassName': ''},
          {'LinkDisplay': 'Rankings', 'id': '', 'Href': `/World/${world_id}/Rankings`, 'ClassName': ''},
          {'LinkDisplay': 'Schedule', 'id': '', 'Href': `/World/${world_id}/Schedule`, 'ClassName': ''},
          {'LinkDisplay': 'Headline', 'id': '', 'Href': `/World/${world_id}/Headlines`, 'ClassName': ''},
          {'LinkDisplay': 'Awards & Races', 'id': '', 'Href': `/World/${world_id}/Awards`, 'ClassName': ''}
      ]},
      {'GroupName': 'Team', 'GroupDisplay': `<img src="${user_team_logo}" class="" alt="">`, 'GroupLinks':[
          {'LinkDisplay': 'Overview', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}`, 'ClassName': ''},
          {'LinkDisplay': 'Schedule', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}/Schedule`, 'ClassName': ''},
          {'LinkDisplay': 'Roster', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}/Roster`, 'ClassName': ''},
          {'LinkDisplay': 'Depth Chart', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}/DepthChart`, 'ClassName': ''},
          {'LinkDisplay': 'Gameplan', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}/Gameplan`, 'ClassName': ''},
          {'LinkDisplay': 'Coaches', 'id': '', 'Href': `/World/${world_id}/Coaches/Team/${team_id}`, 'ClassName': ''},
          {'LinkDisplay': 'Recruiting', 'id': '', 'Href': `/World/${world_id}/Recruiting`, 'ClassName': ''},
          {'LinkDisplay': 'Player Development', 'id': '', 'Href': `/World/${world_id}/PlayerDevelopment/Team/${team_id}`, 'ClassName': ''},
          {'LinkDisplay': 'History', 'id': '', 'Href': `/World/${world_id}/Team/${team_id}/History`, 'ClassName': ''}
      ]},
      {'GroupName': 'Almanac', 'GroupDisplay': 'Almanac', 'GroupLinks':[
          {'LinkDisplay': 'Player Stats', 'id': '', 'Href': `/World/${world_id}/PlayerStats/Season/${season}`, 'ClassName': ''},
          {'LinkDisplay': 'Player Records', 'id': '', 'Href': `/World/${world_id}/PlayerRecords`, 'ClassName': ''},
          {'LinkDisplay': 'Team Stats', 'id': '', 'Href': `/World/${world_id}/TeamStats/Season/${season}`, 'ClassName': ''},
          {'LinkDisplay': 'Team Records', 'id': '', 'Href': `/World/${world_id}/TeamRecords`, 'ClassName': ''},
          {'LinkDisplay': 'Hall of Fame', 'id': '', 'Href': `/World/${world_id}/HallOfFame`, 'ClassName': ''},
          {'LinkDisplay': 'Coach Stats', 'id': '', 'Href': `/World/${world_id}/Coaches`, 'ClassName': ''}
      ]},
      {'GroupName': 'Game', 'GroupDisplay': 'Game', 'GroupLinks':[
          {'LinkDisplay': 'Home Page', 'id': '', 'Href': '/', 'ClassName': ''},
          {'LinkDisplay': 'Admin', 'id': '', 'Href': '/admin', 'ClassName': ''},
          {'LinkDisplay': 'Audit', 'id': '', 'Href': '/audit', 'ClassName': ''},
          {'LinkDisplay': 'Credits', 'id': '', 'Href': '/Credits', 'ClassName': ''},
          {'LinkDisplay': 'Acheivements', 'id': '', 'Href': '/Acheivements', 'ClassName': ''}
      ]},
  ]

  $.each(LinkGroups, function(ind, Group){
    $.each(Group.GroupLinks, function(ind, Link){
      if (Link['LinkDisplay'] == path && Group['GroupName'] == group_name){
        Link['ClassName'] = 'Selected';
      }
    });
  });

  var SimActionStatus = {'CanSim': can_sim, 'LinkGroups': []}
  SimActionStatus['LinkGroups'] = LinkGroups
  return SimActionStatus

};







const pathToRegex = path => new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$");

  const getParams = match => {
    console.log('match', match)
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1]);

    console.log('keys, values', keys, values)
    return Object.fromEntries(
      keys.map((key, i) => {
        return [
          key,
          values[i]
        ];
      })
    );
  };



const create_phase = async (season) => {
  const phases_to_create = [{season: season, phase_name: 'Pre-Season', is_current:true},
                          {season: season, phase_name: 'Regular Season', is_current:false},
                          {season: season, phase_name: 'Bowl Season', is_current:false},
                          {season: season, phase_name: 'Off-Season', is_current:false},
                         ];
  const phases_to_create_added = await db.phase.bulkAdd(phases_to_create);
  const phases = await query_to_dict(await db.phase.toArray(), 'one_to_one', 'phase_name');
  return phases;

}

const create_week = async (phases) => {
  var weeks_to_create = [
                          {week_name:'Summer', is_current: true, phase_id: phases['Pre-Season']['phase_id']},
                          {week_name:'Week 1', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 2', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 3', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 4', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 5', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 6', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 7', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 8', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 9', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 10', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 11', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 12', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 13', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 14', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Week 15', is_current: false, phase_id: phases['Regular Season']['phase_id']},
                          {week_name:'Bowl Week 1', is_current: false, phase_id: phases['Bowl Season']['phase_id']},
                          {week_name:'Bowl Week 2', is_current: false, phase_id: phases['Bowl Season']['phase_id']},
                          {week_name:'Bowl Week 3', is_current: false, phase_id: phases['Bowl Season']['phase_id']},
                          {week_name:'Season Recap', is_current: false, phase_id: phases['Off-Season']['phase_id']},
  ]
  $.each(weeks_to_create, function(ind, week){
    week.week_updates = [];
    week.season = 2021;
  });
  var weeks_to_create_added = await db.week.bulkAdd(weeks_to_create);
  return await db.week.toArray();
}

const get_teams = async (filters) => {

  var url = '/static/data/import_json/Team.json'
  var data = await fetch(url);
  var TeamDimension = await data.json();

  if ('conference' in filters){
    var conference_list = filters.conference;
    TeamDimension = TeamDimension.filter(T => conference_list.includes(T.conference_name));
  }

  return TeamDimension;
}

const get_conferences = async (filters) => {

  var url = '/static/data/import_json/Conference.json'
  var data = await fetch(url);
  var ConferenceDimension = await data.json();

  if ('conference' in filters){
    var conference_list = filters.conference;
    ConferenceDimension = ConferenceDimension.filter(C => conference_list.includes(C.conference_name));
  }

  return ConferenceDimension;
}

const get_divisions = async (filters) => {

  var url = '/static/data/import_json/Division.json'
  var data = await fetch(url);
  var DivisionDimension = await data.json();

  if ('conference' in filters){
    var conference_list = filters.conference;
    DivisionDimension = DivisionDimension.filter(D => conference_list.includes(D.conference_name));
  }

  return DivisionDimension;
}

const query_to_dict  = async (query_list, query_type, key) => {
  var dict = {}
  if (query_type == 'many_to_one'){
    $.each(query_list, function(ind, obj){
      if (!(obj[key] in dict)){
        dict[obj[key]] = [];
      }
      dict[obj[key]].push(obj) ;
    });
  }
  else if (query_type == 'one_to_one') {
    $.each(query_list, function(ind, obj){
      dict[obj[key]] = obj;
    });
  }


  return dict;
}



const driver_db  = async (world_obj) => {

  var dbname = 'driver';

  db = await new Dexie(dbname);

  await db.version(1).stores({
    world: "++world_id",
    setting: ""
  });

  // Open the database
  await db.open().catch(function (e) {
      console.error("Open failed: " + e);
  });

  return db;
}

const get_db  = async (world_obj) => {

  var dbname = '';
  if ('database_id' in world_obj){
    dbname = 'headfootballcoach'+ world_obj.database_id.toString();
  }
  else if ('database_name' in world_obj) {
    dbname = world_obj.database_name
  }
  else{
    console.error('get_db not called correctly. Include either database_name or database_id', world_obj);
    return null;
  }


  var new_db = await new Dexie(dbname);

  await new_db.version(4).stores({
    league_season: 'season',
    team: "++team_id",
    team_season: "++team_season_id, team_id, season, [team_id+season]",
    player: "++player_id",
    player_team_season: "++player_team_season_id, player_id, team_season_id",
    conference: '++conference_id, conference_name',
    conference_season: '++conference_season_id, conference_id, season, [conference_id+season]',
    phase: '++phase_id, season',
    week: '++week_id, phase_id, season, [phase_id+season]',
    team_game: 'team_game_id, game_id, team_season_id, week_id',
    player_team_game: '++player_team_game_id, team_game_id, player_team_season_id',
    game: 'game_id, week_id',
    award: '++award_id, player_id, week_id, season_id',
    world: ""
  });

  // Open the database
  await new_db.open().catch(function (e) {
      console.error("Open failed: " + e);
  });

  await new_db.team.mapToClass(team);
  await new_db.team_season.mapToClass(team_season);
  await new_db.player_team_season.mapToClass(player_team_season);
  await new_db.player.mapToClass(player);
  await new_db.player_team_game.mapToClass(player_team_game);
  await new_db.game.mapToClass(game);

  return new_db;
}

const create_db  = async (world_id) => {
  return get_db({database_id: world_id});
}

const create_new_db  = async () => {
  // const databases = await Dexie.getDatabaseNames();
  // var database_ids = databases.map(db => parseInt(db.replace('headfootballcoach', '')));
  // var new_world_id = database_ids.reduce(function(a, b) {
  //     return Math.max(a, b);
  // }) + 1;

  ddb = await driver_db();
  var world_res = await ddb.world.add({});
  const new_season_info = {world_id: world_res, database_name: 'headfootballcoach' + world_res, date_created: Date.now(), current_season: 2021 }
  ddb.world.put(new_season_info);

  db = await create_db(world_res);
  return {db: db, new_season_info: new_season_info};
}


const get_databases_references = async () => {

  ddb = await driver_db();
  //const databases = await Dexie.getDatabaseNames();
  const databases = await ddb.world.toArray();
  var database_list = [];
  var db_obj = {};
  var world_id = 0;
  $.each(databases, function(ind, obj){
    db_obj = obj;
    db_obj['db'] = get_db({database_name: obj});
    database_list.push(db_obj)
  });
  return database_list;
};

const resolve_db = async (world_obj) => {

  var dbname = '';
  if ('database_id' in world_obj){
    dbname = 'headfootballcoach'+ world_obj.database_id;
  }
  else if ('database_name' in world_obj) {
    dbname = world_obj.database_name
  }
  else{
    console.error('resolve_db not called correctly. Include either database_name or database_id', world_obj);
    return null;
  }

  console.log('dbname', dbname, world_obj)


  const databases = await Dexie.getDatabaseNames();

  if (databases.includes(dbname)){
    return get_db({database_name: dbname});
  }
  else {
    console.error('No database under this name', dbname);
    return null;
  }
};

const route_path = async (pathname, routes) => {
  console.log('pathname, routes', pathname, routes);
  var possible_matches = [];
  var vars, keys, part_count;

  var split_path = pathname.split('/').filter(str => str.length > 0);

  $.each(routes, function(ind, route){
    route.split_path = route.path.split('/').filter(str => str.length > 0);
    route.vars = [];
    route.keys = [];

    route.possible_match = true;

    part_count = 0;
    $.each(route.split_path , function(ind, str){

      if (str[0] == ':'){
        route.vars.push(str);
      }
      else if (str[0] != '/') {
        route.keys.push(str);
      }

      part_count +=1;
    });

    $.each(split_path, function(ind, str){

    });
  });

  console.log('post routes',routes)

}

const resolve_route_parameters = async(route_pattern) => {
  var pathname = location.pathname;

  const route_pattern_split = route_pattern.split('/').filter(str => str.length > 0);
  const route_params = pathname.split('/').filter(str => str.length > 0);

  var params = {}
  var key = '';
  $.each(route_pattern_split, function(ind, val){
    if (val.includes(':')) {
      key = val.replace(':', '');
      params[key] = parseInt(route_params[ind]);
    }
  })

  return params;

}

const common_functions = async (route_pattern) => {

  const params = await resolve_route_parameters(route_pattern);
  console.log('params',params)
  const world_id = params.world_id;

  var world_object = {};
  if (world_id != undefined){
    const ddb = await driver_db();
    world_object = await ddb.world.get({world_id: world_id});
  }

  console.log('world_id', world_id)


    return {  create_new_db: create_new_db
            , get_teams: get_teams
            , get_conferences: get_conferences
            , get_divisions: get_divisions
            , get_databases_references: get_databases_references
            , driver_db: driver_db
            , nunjucks_env: get_nunjucks_env()
            , query_to_dict: query_to_dict
            , create_phase: create_phase
            , create_week: create_week
            , nav_bar_links: nav_bar_links
            , navbar: navbar
            , team_header_links: team_header_links
            , db: await resolve_db({database_id: world_id})
            , world_id: world_id
            , world_object: world_object
            , params: params
            , season: world_object.current_season
            , create_player_face: create_player_face
            , weighted_random_choice: weighted_random_choice
            , generate_face: generate_face
            , display_player_face: display_player_face
          };
};



function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


const load_player_table = async (Table_Team, Table_Player) => {

  const PlayerPositions = ['Off', 'Def'];
  const PlayerOveralls = [];

  const TeamList = await Table_Team.find().exec();
  var player_id_counter = 1;

  console.log('Creating players for ', TeamList);

  var PlayersToCreate = [];
  var Obj_Player = {};

  $.each(TeamList, function(index, Obj_Team){
    for (var i = 1; i < 46; i++) {
      Obj_Player = {
          player_id: player_id_counter,
          first_name: 'Player Name',
          last_name: 'Player Last Name',
          position: PlayerPositions[i%2],
          overall_rating: getRandomInt(100)
      }
      PlayersToCreate.push(Obj_Player);

      player_id_counter +=1;
    }
  });

  const result = await Table_Player.bulkInsert(PlayersToCreate);

}

const weighted_random_choice =  (options) => {
  var total = 0;
  $.each(options, function(value, odds){
    total += odds;
  })
  var r = Math.floor(Math.random() * total);

  var chosen_val = undefined;
  $.each(options, function(value, odds){
    r -= odds;
    if (r < 0) {
      chosen_val = value;
      return false;
    }
  });

  return chosen_val;
}

const random_facial_feature = (feature) => {

  const features = {
    'eye': {'eye1': .75, 'eye2': 1, 'eye3': 1, 'eye4': 1, 'eye5': 1, 'eye6': 1, 'eye7': 1, 'eye8': 1, 'eye9': 1, 'eye10': 1, 'eye11': 1, 'eye12': .1, 'eye13': 1, 'eye14': 1, 'eye15': 1, 'eye16': 1, 'eye17': 1, 'eye18': 1, 'eye19': 1, },
    'body': {'body': 1, 'body2': 1, 'body3': 1, 'body4': 1, 'body5': 1, },
    'ear': {'ear1': 1, 'ear2': 1, 'ear3': 1, },
    'head': {'head1': 1, 'head2': 1, 'head3': 1, 'head4': 1, 'head5': 1, 'head6': 1, 'head7': 1, 'head8': 1, 'head9': 1, 'head10': 1, 'head12': 1, 'head12': 1, 'head13': 1, 'head14': 1, 'head15': 1, 'head16': 1, 'head17': 1, 'head18': .1, },
    'mouth': {'straight': 1, 'angry': 1, 'closed': 1, 'mouth': 1, 'mouth2': 1, 'mouth3': 1, 'mouth4': 1, 'mouth5': 1, 'mouth6': 1, 'mouth7': 1, 'mouth8': 1, 'smile-closed': 1, 'smile': 1, 'smile2': 1, 'smile3': 1, },
    'nose': {'nose1': 1, 'nose2': .65, 'nose3': 1, 'nose4': 2, 'nose5': 1, 'nose6': .3, 'nose7': .2, 'nose8': .2, 'nose9': 2, 'nose10': 1, 'nose11': 1, 'nose12': 1, 'nose13': 1, 'nose14': 1, 'honker': 1, 'pinocchio': .1, },
    'eyebrow': {'eyebrow1': 1, 'eyebrow2': 1, 'eyebrow3': 1, 'eyebrow4': 1, 'eyebrow5': 1, 'eyebrow6': 1, 'eyebrow7': 1, 'eyebrow8': 1, 'eyebrow9': 1, 'eyebrow10': 1, 'eyebrow11': 1, 'eyebrow12': 1, 'eyebrow13': 1, 'eyebrow14': 1, 'eyebrow15': 1, 'eyebrow16': 1, 'eyebrow17': 1, 'eyebrow18': 1, 'eyebrow19': 1, 'eyebrow20': 1, },
    'hair': {'afro': 5, 'afro2': 15, 'bald': 10, 'blowoutFade': 15, 'cornrows': 7, 'cropfade': 13, 'cropfade2': 10,  'crop': 7, 'curly': 10,'curly2': 13, 'curly3': 15, 'curlyFade1': 7,'curlyFade2': 7, 'dreads': 12, 'emo': 1, 'faux-hawk': 5, 'fauxhawk-fade': 7, 'hair': 3, 'high': 10, 'juice': 15, 'messy-short': 15, 'messy': 15,  'middle-part': 12, 'parted': 10, 'shaggy1': 3, 'crop': 7, 'short-fade': 20, 'crop': 7, 'short3': 25, 'crop': 7, 'spike2': 10, 'spike4': 10, 'tall-fade': 20,  },
    'accessories': {'none': 80, 'headband': 10,  'headband-high': 10},
    'glasses': {'none': 95, 'glasses1-primary': 7,  'glasses1-secondary': 3},
    'eyeLine': {'none': 80, 'line1': 15, 'line2': 5},
    'smileLine': {'none': 85, 'line1': 5, 'line4': 10, },
    'miscLine': {'none': 85, 'chin2': 3, 'forehead2': 3, 'forehead3': 3,'forehead4': 3,'freckles1': 1, 'freckles2': 1, },
    'facialHair': {'none': 60, 'beard-point': 2, 'beard1': 2, 'beard2': 2, 'beard3': 1, 'beard4': 1, 'beard5': 1, 'beard6': 1 , 'chin-strap': 2, 'chin-strapStache': 3, 'fullgoatee': .5 , 'fullgoatee2': .5 , 'fullgoatee3': .5 , 'fullgoatee4': .5 , 'fullgoatee5': .5 , 'fullgoatee6': .5 , 'goatee1-stache':3, 'goatee1': .1, 'goatee2': .1, 'goatee3': .1, 'goatee4': .1, 'goatee5': .1, 'goatee6': .1, 'goatee7': .1, 'goatee8': .1, 'goatee9': .1, 'goatee10': .1, 'goatee11': .1, 'goatee12': .1, 'goatee13': .1, 'goatee14': .1, 'goatee15': .1, 'goatee16': .1, 'goatee17': .1, 'goatee18': .1, 'goatee19': .1, 'honest-abe': 3, 'honest-abe-stache': 1, 'mustache1': 4, 'mustache-thin': 3, 'soul': 5},
  }

  return weighted_random_choice(features[feature]);
}

const roundTwoDecimals = (val) => {
  return Math.round(val * 100) / 100;
}

const generate_face = (ethnicity) => {
  console.log('in gen face', ethnicity)
  const colors = {
    white: {
      skin: ["#f2d6cb", "#ddb7a0"],
      hair: [
        "#272421",
        "#3D2314",
        "#5A3825",
        "#CC9966",
        "#2C1608",
        "#B55239",
        "#e9c67b",
        "#D7BF91",
      ],
    },
    asian: {
      skin: ["#f5dbad"],
      hair: ["#272421", "#0f0902"],
    },
    hispanic: {
      skin: ["#bb876f", "#aa816f", "#a67358"],
      hair: ["#272421", "#1c1008"],
    },
    black: { skin: ["#ad6453", "#74453d", "#5c3937"], hair: ["#272421"] },
  };

  const defaultTeamColors = ["#89bfd3", "#7a1319", "#07364f"];

  const eyeAngle = Math.round(Math.random() * 25 - 10);

  const palette = colors[ethnicity];
  const skinColor =
    palette.skin[Math.floor(Math.random() * palette.skin.length)];
  const hairColor =
    palette.hair[Math.floor(Math.random() * palette.hair.length)];
  const isFlipped = Math.random() < 0.5;

  const face = {
    fatness: roundTwoDecimals(Math.random()),
    teamColors: defaultTeamColors,
    body: {
      id: random_facial_feature("body"),
      color: skinColor,
    },
    jersey: {
      id: random_facial_feature("jersey"),
    },
    ear: {
      id: random_facial_feature("ear"),
      size: roundTwoDecimals(0.5 + Math.random()),
    },
    head: {
      id: random_facial_feature("head"),
      shave: `rgba(0,0,0,${
        Math.random() < 0.25 ? roundTwoDecimals(Math.random() / 5) : 0
      })`,
    },
    eyeLine: {
      id: random_facial_feature('eyeLine'),
    },
    smileLine: {
      id: random_facial_feature('smileLine'),
      size: roundTwoDecimals(0.25 + 2 * Math.random()),
    },
    miscLine: {
      id: random_facial_feature('miscLine'),
    },
    facialHair: {
      id: random_facial_feature('facialHair'),
    },
    eye: { id: random_facial_feature("eye"), angle: eyeAngle },
    eyebrow: {
      id: random_facial_feature("eyebrow"),
      angle: Math.round(Math.random() * 35 - 15),
    },
    hair: {
      id: random_facial_feature("hair"),
      color: hairColor,
      flip: isFlipped,
    },
    mouth: {
      id: random_facial_feature("mouth"),
      flip: isFlipped,
    },
    nose: {
      id: random_facial_feature("nose"),
      flip: isFlipped,
      size: roundTwoDecimals(0.5 + Math.random() * 0.75),
    },
    glasses: {
      id: random_facial_feature("glasses"),
    },
    accessories: {
      id: random_facial_feature('accessories'),
    },
  };

  return face;
}


const create_player_face = async (many_or_single, player_ids, db) => {
  if (many_or_single == 'many') {
    return '';
  }
  else {
    const player_id = player_ids;

    const player = await db.player.get({player_id: player_id});

    player.player_face = generate_face(player.ethnicity);

    await db.player.put(player, player.player_id);

    return player.player_face;
  }
}


const addWrapper = (svgString)=>{return `<g>${svgString}</g>`};

const addTransform = (element, newTransform) => {
  const oldTransform = $(element).attr("transform");
  element.setAttribute(
    "transform",
    `${oldTransform ? `${oldTransform} ` : ""}${newTransform}`
  );
};

const rotateCentered = (element, angle) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  addTransform(element, `rotate(${angle} ${cx} ${cy})`);
};

const scaleStrokeWidthAndChildren = (
  element,
  factor
) => {
  const strokeWidth = $(element).attr("stroke-width");
  if (strokeWidth) {
    element.setAttribute(
      "stroke-width",
      String(parseFloat(strokeWidth) / factor)
    );
  }
  const children = (element.childNodes);
  for (let i = 0; i < children.length; i++) {
    scaleStrokeWidthAndChildren(children[i], factor);
  }
};

// Scale relative to the center of bounding box of element e, like in Raphael.
// Set x and y to 1 and this does nothing. Higher = bigger, lower = smaller.
const scaleCentered = (element, x, y) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const tx = (cx * (1 - x)) / x;
  const ty = (cy * (1 - y)) / y;

  addTransform(element, `scale(${x} ${y}) translate(${tx} ${ty})`);

  // Keep apparent stroke width constant, similar to how Raphael does it (I think)
  if (
    Math.abs(x) !== 1 ||
    Math.abs(y) !== 1 ||
    Math.abs(x) + Math.abs(y) !== 2
  ) {
    const factor = (Math.abs(x) + Math.abs(y)) / 2;
    scaleStrokeWidthAndChildren(element, factor);
  }
};

// Translate element such that its center is at (x, y). Specifying xAlign and yAlign can instead make (x, y) the left/right and top/bottom.
const translate = (
  element,
  x,
  y,
  xAlign = "center",
  yAlign = "center"
) => {
  const bbox = element.getBBox();
  let cx;
  let cy;
  if (xAlign === "left") {
    cx = bbox.x;
  } else if (xAlign === "right") {
    cx = bbox.x + bbox.width;
  } else {
    cx = bbox.x + bbox.width / 2;
  }
  if (yAlign === "top") {
    cy = bbox.y;
  } else if (yAlign === "bottom") {
    cy = bbox.y + bbox.height;
  } else {
    cy = bbox.y + bbox.height / 2;
  }

  addTransform(element, `translate(${x - cx} ${y - cy})`);
};

// Defines the range of fat/skinny, relative to the original width of the default head.
const fatScale = (fatness) => 0.8 + 0.2 * fatness;


const drawFeature = async (svg, face, info) => {
  const feature = face[info.name];
  if (!feature) {
    return;
  }

  // @ts-ignore
  var url = `/static/facesjs/${info.name}/${feature.id}.svg`;
  var html = await fetch(url);
  let featureSVGString = await html.text();

  if (!featureSVGString) {
    return;
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[faceShave]", feature.shave);
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[headShave]", feature.shave);
  }

  featureSVGString = featureSVGString.replace("$[skinColor]", face.body.color);
  featureSVGString = featureSVGString.replace(
    /\$\[hairColor\]/g,
    face.hair.color
  );
  featureSVGString = featureSVGString.replace(
    /\$\[primary\]/g,
    face.teamColors[0]
  );
  featureSVGString = featureSVGString.replace(
    /\$\[secondary\]/g,
    face.teamColors[1]
  );
  featureSVGString = featureSVGString.replace(
    /\$\[accent\]/g,
    face.teamColors[2]
  );

  //console.log('featureSVGString', info, feature, featureSVGString)

  for (let i = 0; i < info.positions.length; i++) {
    svg.insertAdjacentHTML("beforeend", addWrapper(featureSVGString));

    const position = info.positions[i];

    if (position !== null) {
      // Special case, for the pinocchio nose it should not be centered but should stick out to the left or right
      let xAlign;
      if (feature.id === "nose4" || feature.id === "pinocchio") {
        // @ts-ignore
        xAlign = feature.flip ? "right" : "left";
      } else {
        xAlign = "center";
      }

      translate(
        svg.lastChild,
        position[0],
        position[1],
        xAlign
      );
    }

    if (feature.hasOwnProperty("angle")) {
      // @ts-ignore
      rotateCentered(svg.lastChild, (i === 0 ? 1 : -1) * feature.angle);
    }

    // Flip if feature.flip is specified or if this is the second position (for eyes and eyebrows). Scale if feature.size is specified.
    // @ts-ignore
    const scale = feature.hasOwnProperty("size") ? feature.size : 1;
    // @ts-ignore
    if (feature.flip || i === 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, -scale, scale);
    } else if (scale !== 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, scale, scale);
    }

    if (info.scaleFatness && info.positions[0] !== null) {
      // Scale individual feature relative to the edge of the head. If fatness is 1, then there are 47 pixels on each side. If fatness is 0, then there are 78 pixels on each side.
      const distance = (78 - 47) * (1 - face.fatness);
      // @ts-ignore
      translate(svg.lastChild, distance, 0, "left", "top");
    }
  }

  if (
    info.scaleFatness &&
    info.positions.length === 1 &&
    info.positions[0] === null
  ) {
    // @ts-ignore
    scaleCentered(svg.lastChild, fatScale(face.fatness), 1);
  }
};

const override = (face, overrides) => {

  $.each(overrides, function(key, val){
    face[key] = val;
    console.log('face.val', face.val, key, val)
  });

  return face;
};

const display_player_face = (face, overrides, dom_id) => {
  console.log('face, overrides', face, overrides)
  face = override(face, overrides);
  console.log('face', face)

  const container_element = $('#'+dom_id);

  $(container_element).html('');

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("version", "1.2");
  svg.setAttribute("baseProfile", "tiny");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 400 600");
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

  // Needs to be in the DOM here so getBBox will work
  $(container_element).append(svg);

  const featureInfos = [
    {
      name: "hairBg",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "body",
      positions: [null],
    },
    {
      name: "jersey",
      positions: [null],
    },
    {
      name: "ear",
      positions: [
        [55, 325],
        [345, 325],
      ],
      scaleFatness: true,
    },
    {
      name: "head",
      positions: [null], // Meaning it just gets placed into the SVG with no translation
      scaleFatness: true,
    },
    {
      name: "eyeLine",
      positions: [null],
    },
    {
      name: "smileLine",
      positions: [
        [150, 435],
        [250, 435],
      ],
    },
    {
      name: "miscLine",
      positions: [null],
    },
    {
      name: "facialHair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "eye",
      positions: [
        [140, 310],
        [260, 310],
      ],
    },
    {
      name: "eyebrow",
      positions: [
        [140, 270],
        [260, 270],
      ],
    },
    {
      name: "mouth",
      positions: [[200, 440]],
    },
    {
      name: "nose",
      positions: [[200, 370]],
    },
    {
      name: "hair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "glasses",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "accessories",
      positions: [null],
      scaleFatness: true,
    },
  ];

  $.each(featureInfos, async function(ind, info){
    await drawFeature(svg, face, info);
  })


};
