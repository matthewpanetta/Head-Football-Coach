import Page_Index from "./views/Page_Index.js";
import Page_World from "./views/Page_World.js";
import Page_Team from "./views/Page_Team.js";
import Page_Player from "./views/Page_Player.js";



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

const get_db  = async (world_obj) => {

  var dbname = '';
  if ('database_id' in world_obj){
    dbname = 'headfootballcoach'+ world_obj.world_id;
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
    team: "++team_id",
    player: "++player_id",
    world: ""
  });

  // Open the database
  await db.open().catch(function (e) {
      console.error("Open failed: " + e);
  });

  return db;
}

const create_db  = async (world_id) => {
  return get_db({database_id: world_id});
}


const get_databases_references = async () => {

  const databases = await Dexie.getDatabaseNames();
  console.log('databases', databases)
  var database_map = {};
  $.each(databases, async function(ind, obj){
    database_map[obj] = await get_db({database_name: obj});
  });
  console.log('database_map', database_map)
  return database_map;
};

const resolve_db = async (world_obj) => {

  var dbname = '';
  if ('database_id' in world_obj){
    dbname = 'headfootballcoach'+ world_obj.world_id;
  }
  else if ('database_name' in world_obj) {
    dbname = world_obj.database_name
  }
  else{
    console.error('resolve_db not called correctly. Include either database_name or database_id', world_obj);
    return null;
  }


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
    const routes = [
        { path: "/", view: Page_Index },
        { path: "/World/:world_id/", view: Page_World },
        { path: "/World/:world_id/Team/:team_id", view: Page_Team },
        { path: "/World/:world_id/Player/:player_id", view: Page_Player }
    ];

    // Test each route for potential match
    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: location.pathname.match(pathToRegex(route.path))
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    if (!match) {
        match = {
            route: routes[0],
            result: [location.pathname]
        };
    }


    var params = getParams(match);
    params['db'] = await resolve_db({database_id: params['world_id']});

    if (params['db'] == null){
      params['db_list'] = await get_databases_references();
    }

    const view = new match.route.view(params);

    document.querySelector("#app").innerHTML = await view.getHtml(db);
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


const load_team_table = async (Table_Team) => {
  console.log('Running load_team_table');

  var team_id_counter = 1;

  var TeamsToCreate = [];

  $.each(TeamDimension, function(ind, Obj_Team){
    //Obj_Team['team_id'] = team_id_counter.toString()
    Obj_Team['team_id'] = team_id_counter
    TeamsToCreate.push(Obj_Team);
    team_id_counter += 1;
  });

  const result = await Table_Team.bulkInsert(TeamsToCreate);

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

const init_db = async () => {
  console.log('IN INITDB');

  return 'hello'
};


const router_connect = async () => {
  router();
}
