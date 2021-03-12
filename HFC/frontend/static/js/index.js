'use strict';
import Page_Index from "./views/Page_Index.js";
import Page_World from "./views/Page_World.js";
import Page_Team from "./views/Page_Team.js";
import Page_Player from "./views/Page_Player.js";

let db = undefined;
var ddb = undefined;

class team {
  constructor() {
    console.log('in teams constructor', this);
    alert('hey stop');
  }
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

}


const nav_bar_links = async (params) => {

  const path = params.path;
  const group_name = params.group_name;
  const db = params.db;

  const league_seasons = await db.league_season.toArray();
  const current_league_season = league_seasons.filter(ls => ls.is_current_season)[0];
  const season = current_league_season.season;
  const world_id = current_league_season.world_id;

  const weeks = await db.week.toArray();
  const current_week = weeks.filter(week => week.is_current)[0];

  const user_team = await db.team.get({team_id: current_league_season.user_team_id});

  const team_id = user_team.team_id
  const user_team_logo = user_team.team_logo

  const can_sim = true;

  var user_actions = [];

  var sim_action_week = {'LinkDisplay': 'Sim This Week', 'id': 'SimThisWeek', 'Href': '#', 'ClassName': 'sim-action'}
  var sim_action_phase = {'LinkDisplay': 'Sim This Phase', 'id': 'SimThisPhase', 'Href': '#', 'ClassName': 'sim-action'}

  if (current_week != null){
    if (current_week.week_name == 'Preseason'){
      can_sim = True;
      save_ls = True;

      //Check for user team needing to cut players
      if (!(current_league_season.preseason_user_cut_players)){
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
        user_actions.push({'LinkDisplay': 'Set Gameplan', 'Href': `/World/${world_id}/Team/${team_id}/DepthChart`, 'ClassName': ''});
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
    else if (current_week.phase_id.phase_name == 'Season Recap') {
      user_actions.push({'LinkDisplay': 'View Season Awards', 'Href': `/World/${world_id}/Awards`, 'ClassName': ''})
    }
    else if (current_week.phase_id.phase_name == 'Coach Carousel') {
      user_actions.push({'LinkDisplay': 'View Coach Carousel', 'Href': `/World/${world_id}/CoachCarousel`, 'ClassName': ''})
    }
    else if (current_week.phase_id.phase_name == 'Draft Departures') {
      user_actions.push({'LinkDisplay': 'View Player Departures', 'Href': `/World/${world_id}/PlayerDepartures`, 'ClassName': ''})
    }
    else if (current_week.phase_id.phase_name == 'National Signing Day') {
      user_actions.push({'LinkDisplay': 'View Recruiting Board', 'Href': `/World/${world_id}/Recruiting`, 'ClassName': ''})
    }
    else if (current_week.phase_id.phase_name == 'Prepare for Summer Camps') {
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
      if (Link['LinkDisplay'] == path && Group['GroupName'] == GroupName){
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

const navigateTo = url => {
    history.pushState(null, null, url);
    router();
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
  console.log('db', new_db);

  await new_db.version(3).stores({
    league_season: 'season',
    team: "++team_id",
    team_season: "++team_season_id, team_id, season, [team_id+season]",
    player: "++player_id",
    player_team_season: "++player_team_season_id, player_id, team_season_id",
    conference: '++conference_id, conference_name',
    conference_season: '++conference_season_id, conference_id, season, [conference_id+season]',
    phase: '++phase_id, season',
    week: '++current_week, phase_id, season, [phase_id+season]',
    game: 'game_id, current_week',
    award: '++award_id, player_id, current_week, season_id',
    world: ""
  });

  // Open the database
  await new_db.open().catch(function (e) {
      console.error("Open failed: " + e);
  });

  await new_db.team.mapToClass(team);
  await new_db.team_season.mapToClass(team_season);

  console.log('db', new_db);

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

const router = async () => {
  var startTime = performance.now()

    var pathname = location.pathname;
    if (pathname.charAt(pathname.length - 1) != '/') {
      pathname = pathname + '/';
    }

    const routes = [
        { path: "/", view: Page_Index },
        { path: "/World/:world_id/", view: Page_World },
        { path: "/World/:world_id/Team/:team_id/", view: Page_Team },
        { path: "/World/:world_id/Player/:player_id/", view: Page_Player }
    ];

    $.each(routes, function(ind, route){
      console.log('pathToRegex(route.path)', pathToRegex(route.path), route)
    })

    // Test each route for potential match
    const potentialMatches = routes.map(route => {
      return {
        route: route,
        result: pathname.match(pathToRegex(route.path))
      };
    }).reverse();

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    console.log('potentialMatches', potentialMatches, match)
    if (!match) {
      match = {
        route: routes[0],
        result: [
          pathname
        ]
      };
    }

      //let match = route_path(pathname, routes);


    var params = getParams(match);
    console.log('params', params)
    params['db'] = await resolve_db({database_id: params['world_id']});

    var nunjucks_env = get_nunjucks_env();

    params['packaged_functions'] = {create_new_db: create_new_db
                                  , get_teams: get_teams
                                  , get_conferences: get_conferences
                                  , get_divisions: get_divisions
                                  , get_databases_references: get_databases_references
                                  , driver_db: driver_db
                                  , nunjucks_env: nunjucks_env
                                  , query_to_dict: query_to_dict
                                  , create_phase: create_phase
                                  , create_week: create_week
                                  , nav_bar_links: nav_bar_links
                                };

    const view = new match.route.view(params);

    document.querySelector("#body").innerHTML = await view.getHtml();
    await view.action();

    var endTime = performance.now()
    console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    router_connect()
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}


const dbschema_Team = {
    version: 0,
    type: 'object',
    properties: {
        team_id: {
            type: 'number'
        },
        school_name: {
            type: 'string'
        },
        team_name: {
            type: 'string'
        },
        team_abbreviation: {
            type: 'string'
        },
        city: {
            type: 'string'
        },
        state: {
            type: 'string'
        },
        conference_name: {
            type: 'string'
        },
        division_name: {
            type: 'string'
        },
        team_color_primary_hex: {
            type: 'string'
        },
        team_color_secondary_hex: {
            type: 'string'
        },
        team_jersey_invert: {
            type: 'number'
        },
        prestige: {
            type: 'number'
        },
        facilities: {
            type: 'number'
        },
        pro_potential: {
            type: 'number'
        },
        campus_lifestyle: {
            type: 'number'
        },
        academic_prestige: {
            type: 'number'
        },
        television_exposure: {
            type: 'number'
        },
        location: {
            type: 'number'
        },
        championship_contender: {
            type: 'number'
        }
    },
  indexes: [
    'team_id',
    'school_name',
    //['lastName', 'familyName'] // <- this will create a compound-index for these two fields
  ]
};


const dbschema_Player = {
    version: 0,
    type: 'object',
    properties: {
        player_id: {
            type: 'number'
        },
        first_name: {
            type: 'string'
        },
        last_name: {
            type: 'string'
        },
        jersey_number: {
          type: 'integer'
        },
        was_previously_redshirted: {
          type: 'boolean'
        },
        position: {
            type: 'string'
        },
        overall_rating: {
            type: 'number'
        },
        height: {
          type: 'number'
        },
        weight: {
          type: 'number'
        },
        hometown: {
          type: 'object',
          properties: {
            city: {
              type: 'string'
            },
            state: {
              type: 'string'
            },
          }
        },
        face: {
          type: 'object',
          properties: {
            svg_string: {
              type: 'string'
            },
            json_string: {
              type: 'string'
            },
          }
        },
        personality: {
          type: 'object',
          properties: {
            work_ethic: {
              type: 'number'
            },
            loyalty: {
              type: 'number'
            },
            leadership: {
              type: 'number'
            },
            friendly: {
              type: 'number'
            },
            expressive: {
              type: 'number'
            },
          }
        },
        recruiting: {
          type: 'object',
          properties: {
            is_recruit: {
              type: 'boolean'
            },
            recruiting_speed: {
              type: 'number'
            },
            recruiting_points_needed: {
              type: 'number'
            },
            signed: {
              type: 'string'
            },
            stage: {
              type: 'string'
            },
            measurables: {
              type: 'object',
              properties: {
                fourty_yard_dash: {
                  type: 'number'
                },
                bench_press_reps: {
                  type: 'number'
                },
                vertical_jump: {
                  type: 'number'
                },
              }
            },
            rankings: {
              type: 'object',
              properties: {
                national_rank: {
                  type: 'number'
                },
                national_position_rank: {
                  type: 'number'
                },
                state_rank: {
                  type: 'number'
                },
                recruiting_stars: {
                  type: 'number'
                },
              }
            }
          }
        },
        player_team_seasons: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                team_id: {
                  type: 'number'
                },
                season_id: {
                  type: 'number'
                }
              }
            }
        }
    },
  indexes: [
    'player_id',
    'position',
    'player_team_seasons.[].team_id',
    'player_team_seasons.[].season_id'
    //['lastName', 'familyName'] // <- this will create a compound-index for these two fields
  ]
};


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

const router_connect = async () => {
  router();
}
