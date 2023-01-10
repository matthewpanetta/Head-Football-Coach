import {
  headline,
  award,
  player_team_game,
  week,
  phase,
  world,
  team_game,
  team,
  league_season,
  team_season_stats,
  team_season,
  day,
  coach,
  coach_team_season,
  player,
  player_team_season_stats,
  recruit_team_season,
  player_team_season,
  game,
  conference,
  conference_season,
} from "/static/js/schema.js";
import { index_group_sync } from "/common/js/utils.js";
export const clone_method = "shallow-assign";

export const prune_orphaned_databases = async () => {
  const ddb = await driver_db();
  let databases = ddb.world.find();

  for (let world_obj of databases) {
    if (!world_obj.user_team || !world_obj.user_team.team_name) {
      await ddb.world.findAndRemove({ world_id: world_obj.world_id });
    }
  }

  await ddb.saveDatabaseAsync();

  databases = ddb.world.find();
  let database_name_list = databases.map((db) => db.database_name);
  database_name_list.push("driver");

  let hfc_idbAdapter = new LokiIndexedAdapter("hfc");
  //let hfc_idbAdapter = new IncrementalIndexedDBAdapter("hfc");
  let loki_catalog = await hfc_idbAdapter.getDatabaseListAsync();

  console.log({ loki_catalog: loki_catalog, databases: databases });
  for (let db_name of loki_catalog) {
    console.log({ db_name: db_name });
    if (!database_name_list.includes(db_name)) {
      await hfc_idbAdapter.deleteDatabaseAsync(db_name);
    }
  }
};

export const truncate_databases = async () => {
  const ddb = await driver_db();
  let databases = ddb.world.find();

  for (let world_obj of databases) {
    await ddb.world.findAndRemove({ world_id: world_obj.world_id });
  }

  await ddb.saveDatabaseAsync();

  databases = ddb.world.find();
  let database_name_list = databases.map((db) => db.database_name);
  database_name_list.push("driver");

  let hfc_idbAdapter = new LokiIndexedAdapter("hfc");
  let loki_catalog = await hfc_idbAdapter.getDatabaseListAsync();

  console.log({ loki_catalog: loki_catalog, databases: databases });
  for (let db_name of loki_catalog) {
    console.log({ db_name: db_name });
    if (!database_name_list.includes(db_name)) {
      await hfc_idbAdapter.deleteDatabaseAsync(db_name);
    }
  }

  delete window.stored_dbs;
};

export const get_databases_references = async () => {
  const ddb = await driver_db();
  const databases = ddb.world.find();

  var database_list = await Promise.all(
    databases.map(async function (db_obj) {
      return db_obj;
    })
  );

  return database_list;
};

export const resolve_db = async (world_obj) => {
  var dbname = "";
  if ("database_id" in world_obj && world_obj["database_id"]) {
    dbname = "headfootballcoach" + world_obj.database_id;
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "resolve_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  return get_db({ database_name: dbname });
};

export const initialize_db = async (db) => {
  db_collection_list.forEach(function (col_obj) {
    col_obj.options.clone = true;
    col_obj.options.cloneMethod = clone_method;
    col_obj.options.lazyLoad = false;
    db[col_obj.collection_name] =
      db.getCollection(col_obj.collection_name) ||
      db.addCollection(col_obj.collection_name, col_obj.options);
  });

  await db.saveDatabaseAsync();
};

export const get_db = async (world_obj) => {
  var dbname = "";
  if ("database_id" in world_obj) {
    dbname = "headfootballcoach" + world_obj.database_id.toString();
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "get_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  window.stored_dbs = window.stored_dbs || {};
  let db = window.stored_dbs[dbname];

  if (db) {
    console.log("Found db. returning", {
      db: db,
      "window.stored_dbs": window.stored_dbs,
      dbname: dbname,
    });
    return db;
  }
  console.log("Did not find db in stored", {
    db: db,
    "window.stored_dbs": window.stored_dbs,
    dbname: dbname,
  });

  let cloneMethod = "shallow-assign";

  let schema_options = {};

  db_collection_list.forEach(function (coll) {
    schema_options[coll.collection_name] = {
      proto: coll.options.proto.prototype,
    };
  });

  let idbAdapter = new LokiIndexedAdapter("hfc");
  //let idbAdapter = new IncrementalIndexedDBAdapter("hfc", {
  //lazyCollections: db_collection_list.map(coll => coll.collection_name)
  //});
  // let parAdapter = new loki.LokiPartitioningAdapter(idbAdapter, {
  //   pageSize: 20 * 1024 * 1024,
  //   paging: true,
  // });
  db = new loki(dbname, {
    verbose: true,
    env: "BROWSER",
    // autosave: true,
    // autosaveInterval: 10000,
    autosave: false,
    adapter: idbAdapter,
    persistenceAdapter: idbAdapter,
    persistenceMethod: "adapter",
    clone: true,
    cloneMethod: cloneMethod,
  });

  db.schema_options = schema_options;

  await db.loadDatabaseAsync(schema_options);
  await initialize_db(db);

  window.stored_dbs[dbname] = db;
  return db;
};

export const create_db = async (world_id) => {
  return get_db({ database_id: world_id });
};

export const create_new_db = async () => {
  ddb = await driver_db();
  let world_id = ddb.world.nextId("world_id");

  const new_season_info = {
    world_id: world_id,
    database_name: "headfootballcoach" + world_id,
    date_created: Date.now(),
    date_last_updated: Date.now(),
    user_team: {
      team_name: null,
      school_name: null,
      team_logo_url: null,
      team_record: null,
    },
    current_season: 2022,
    current_week: "Week 1",
  };
  console.log({
    new_season_info: new_season_info,
  });
  ddb.world.insert(new_season_info);
  await ddb.saveDatabaseAsync();

  let db = await create_db(world_id);
  return { db: db, new_season_info: new_season_info };
};

export const driver_collection_list = [
  {
    collection_name: "world",
    options: {
      proto: world,
      unique: ["world_id"],
      clone: true,
      cloneMethod: clone_method,
      lazyLoad: true,
    },
  },
  {
    collection_name: "first_names",
    options: { unique: ["name"], clone: true, cloneMethod: clone_method, lazyLoad: true },
  },
  {
    collection_name: "last_names",
    options: { unique: ["name"], clone: true, cloneMethod: clone_method, lazyLoad: true },
  },
  {
    collection_name: "cities",
    options: {
      unique: ["city_state"],
      indices: ["city", "state"],
      clone: true,
      cloneMethod: clone_method,
      lazyLoad: true,
    },
  },
];

export const db_collection_list = [
  {
    collection_name: "league_season",
    options: { proto: league_season, unique: ["season"], indices: [] },
  },
  { collection_name: "team", options: { proto: team, unique: ["team_id"], indices: [] } },
  { collection_name: "day", options: { proto: day, unique: ["date_display"], indices: [] } },
  {
    collection_name: "team_season",
    options: { proto: team_season, unique: ["team_season_id"], indices: ["team_id", "season"] },
  },
  {
    collection_name: "team_season_stats",
    options: { proto: team_season_stats, unique: ["team_season_id"] },
  },
  { collection_name: "coach", options: { proto: coach, unique: ["coach_id"], indices: [] } },
  {
    collection_name: "coach_team_season",
    options: {
      proto: coach_team_season,
      unique: ["coach_team_season_id"],
      indices: ["coach_id", "team_season_id", "season"],
    },
  },
  { collection_name: "player", options: { proto: player, unique: ["player_id"], indices: [] } },
  {
    collection_name: "player_team_season",
    options: {
      proto: player_team_season,
      unique: ["player_team_season_id"],
      indices: ["player_id", "team_season_id", "season"],
    },
  },
  {
    collection_name: "player_team_season_stats",
    options: { proto: player_team_season_stats, unique: ["player_team_season_id"], indices: [] },
  },
  {
    collection_name: "recruit_team_season",
    options: {
      proto: recruit_team_season,
      unique: ["recruit_team_season_id"],
      indices: ["player_team_season_id", "team_season_id"],
    },
  },
  {
    collection_name: "conference",
    options: { proto: conference, unique: ["conference_id"], indices: [] },
  },
  {
    collection_name: "conference_season",
    options: {
      proto: conference_season,
      unique: ["conference_season_id"],
      indices: ["conference_id", "season"],
    },
  },
  {
    collection_name: "phase",
    options: { proto: phase, unique: ["phase_id"], indices: ["season"] },
  },
  { collection_name: "week", options: { proto: week, unique: ["week_id"], indices: ["season"] } },
  {
    collection_name: "team_game",
    options: {
      proto: team_game,
      unique: ["team_game_id"],
      indices: ["game_id", "team_season_id", "week_id"],
    },
  },
  {
    collection_name: "player_team_game",
    options: {
      proto: player_team_game,
      unique: ["player_team_game_id"],
      indices: ["team_game_id", "player_team_season_id"],
    },
  },
  { collection_name: "game", options: { proto: game, unique: ["game_id"], indices: ["week_id"] } },
  {
    collection_name: "award",
    options: {
      proto: award,
      unique: ["award_id"],
      indices: ["player_team_season_id", "week_id", "season"],
    },
  },
  {
    collection_name: "headline",
    options: { proto: headline, unique: ["headline_id"], indices: ["week_id"] },
  },
];

export const initialize_driver_db = async (ddb) => {
  console.log({
    ddb: ddb,
    driver_collection_list: driver_collection_list,
  });

  driver_collection_list.forEach(async function (col_obj) {
    ddb[col_obj.collection_name] =
      ddb.getCollection(col_obj.collection_name) ||
      ddb.addCollection(col_obj.collection_name, col_obj.options);

    console.log({
      col_obj: col_obj,
      "ddb[col_obj.collection_name]": ddb[col_obj.collection_name],
    });

    return ddb[col_obj.collection_name];
  });

  console.log({
    ddb: ddb,
    driver_collection_list: driver_collection_list,
  });
  // debugger;

  await ddb.saveDatabaseAsync();
  await populate_driver(ddb);
  await ddb.saveDatabaseAsync();
};

export const driver_db = async () => {
  console.log("Fetching window ddb", {
    "window.ddb": window.ddb,
  });

  if (window.ddb) {
    return window.ddb;
  }

  var dbname = "driver";
  let cloneMethod = "shallow-assign";

  let idbAdapter = new LokiIndexedAdapter("driver");
  // let idbAdapter = new IncrementalIndexedDBAdapter("driver",{
  //   lazyCollections: driver_collection_list.map(coll => coll.collection_name)
  // });

  // let parAdapter = new loki.LokiPartitioningAdapter(idbAdapter, {
  //   pageSize: 20 * 1024 * 1024,
  //   paging: true,
  // });
  let ddb = new loki(dbname, {
    verbose: true,
    env: "BROWSER",
    // autosave: true,
    // autosaveInterval: 10000,
    autosave: false,
    adapter: idbAdapter,
    persistenceadapter: idbAdapter,
    persistenceMethod: "adapter",
    clone: true,
    cloneMethod: cloneMethod,
  });

  await ddb.loadDatabaseAsync({});
  await initialize_driver_db(ddb);

  window.ddb = ddb;
  return ddb;
};

const populate_driver = async (ddb) => {
  console.log("populate_driver", {
    ddb: ddb,
  });

  const first_name_count = ddb.first_names.count();
  const last_name_count = ddb.last_names.count();
  const city_count = ddb.cities.count();

  if (first_name_count == 0 || last_name_count == 0) {
    await populate_names(ddb);
  }

  if (city_count == 0) {
    await populate_cities(ddb);
  }
};

const populate_names = async (ddb) => {
  console.log("in populate_names");
  var url = "/static/data/import_json/names.json";
  var data = await fetch(url);
  var name_dimension = await data.json();

  ddb.first_names.removeDataOnly();
  ddb.last_names.removeDataOnly();

  var first_names_to_add = [],
    last_names_to_add = [],
    first_name_start = 0,
    last_name_start = 0;

  $.each(name_dimension, function (ind, name_obj) {
    if (name_obj.is_first_name) {
      first_names_to_add.push({
        stop: first_name_start + name_obj.occurance - 1,
        name: name_obj.name,
      });
      first_name_start += name_obj.occurance;
    } else if (name_obj.is_last_name) {
      last_names_to_add.push({
        stop: last_name_start + name_obj.occurance - 1,
        name: name_obj.name,
      });
      last_name_start += name_obj.occurance;
    }
  });

  ddb.last_names.insert(last_names_to_add);
  ddb.first_names.insert(first_names_to_add);

  await ddb.saveDatabaseAsync();

  console.log({
    ddb: ddb,
  });
};

const populate_cities = async (ddb) => {
  var url = "/static/data/import_json/cities.json";
  var data = await fetch(url);
  const city_dimension = await data.json();

  city_dimension.forEach((c) => (c.city_state = c.city + ", " + c.state));
  ddb.cities.insert(city_dimension);
  await ddb.saveDatabaseAsync();
};
