import Page_Index from "./views/Page_Index.js";
import Page_World from "./views/Page_World.js";
import Page_Team from "./views/Page_Team.js";
import Page_Player from "./views/Page_Player.js";


class team {

  build_team_logo(size_obj){
    var folder_prefix = '/static/img/TeamLogos/'
    var size_suffix = ''
    if ('img_size' in size_obj){
      size_suffix = '_' + size_obj['img_size']
    }
    return folder_prefix + this.school_name + '_' + this.team_name + size_suffix + '.png';
  }

    // Prototype property
    get team_logo() {
        return this.build_team_logo({});
    }

    // Prototype property
    get team_logo_50() {
      return this.build_team_logo({img_size: 50});
    }

    // Prototype property
    get team_logo_150() {
      return this.build_team_logo({img_size: 150});
    }
}


const pathToRegex = path => new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$");

const getParams = match => {
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1]);

    console.log('values, keys', values, keys)

    return Object.fromEntries(keys.map((key, i) => {
        return [key, values[i]];
    }));
};

const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const get_teams = async (filters) => {

  var url = '/static/data/import_json/Team.json'
  var data = await fetch(url);
  var TeamDimension = await data.json();

  if ('conference' in filters){
    var conference_list = filters.conference;
    TeamDimension = TeamDimension.map(T => conference_list.includes(T.conference_name));
  }

  return TeamDimension;
}

const driver_db  = async (world_obj) => {

  var dbname = 'driver';

  var db = await new Dexie(dbname);

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


  var db = await new Dexie(dbname);
  console.log('db', db);

  await db.version(1).stores({
    team: "++team_id, school_name, [team_id+team_seasons.season]",
    player: "++player_id",
    world: ""
  });

  // Open the database
  await db.open().catch(function (e) {
      console.error("Open failed: " + e);
  });

  await db.team.mapToClass(team);

  return db;
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

  const ddb = await driver_db();
  var world_res = await ddb.world.add({});
  ddb.world.put({world_id: world_res, database_name: 'headfootballcoach' + world_res, date_created: Date.now() });

  console.log('ddb.world', ddb.world);
  const db = await create_db(world_res);
  return db;
}


const get_databases_references = async () => {

  const ddb = await driver_db();
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

const router = async (db) => {
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

    // Test each route for potential match
    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: pathname.match(pathToRegex(route.path))
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    if (!match) {
        match = {
            route: routes[0],
            result: [pathname]
        };
    }


    var params = getParams(match);
    console.log('params', params)
    params['db'] = await resolve_db({database_id: params['world_id']});

    var nunjucks_env = get_nunjucks_env();

    params['packaged_functions'] = {create_new_db: create_new_db
                                  , get_teams: get_teams
                                  , get_databases_references: get_databases_references
                                  , driver_db: driver_db
                                  , nunjucks_env: nunjucks_env
                                };

    const view = new match.route.view(params);

    document.querySelector("#body").innerHTML = await view.getHtml();
    await view.action();
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
