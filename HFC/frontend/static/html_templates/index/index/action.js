const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  let ddb = await common.driver_db();

  const db_list = await common.get_databases_references();
  let world_list = [];
  console.log({db_list:db_list, ddb:ddb, common:common})
  for (let db of db_list){
    if (db.user_team.team_name == null){
      await Dexie.delete(db.database_name);
      await ddb.world.where({world_id: db.world_id}).delete();
    }
    else {
      world_list.push(db);
    }
  }

  let world_options = [
    {display: 'Full Modern World', description: 'All conferences and teams as of 2022', database_suffix: ''},
    {display: 'Small Modern World', description: 'Conferences and teams as of 2022, including SEC, Pac-12, AAC, MAC, and Independents', database_suffix: '_small'},
    {display: 'Full World - 2024', description: 'All conferences and teams as of 2024, including notable upcoming conference changes', database_suffix: '_2024'},
    {display: 'Full World - 2010', description: 'All conferences and teams, as they existed in 2010', database_suffix: '_2010'},
  ]

  let progress_table_rows = [
    {stage: 'Creating new world', stage_row_id: 'create-world-table-new-world'},
    {stage: 'Create teams', stage_row_id: 'create-world-table-create-teams'},
    {stage: 'Creating coaches', stage_row_id: 'create-world-table-create-coaches'},
    {stage: 'Add coaches to teams', stage_row_id: 'create-world-table-assign-coaches'},
    {stage: 'Creating players', stage_row_id: 'create-world-table-create-players'},
    {stage: 'Add players to teams', stage_row_id: 'create-world-table-assign-players'},
    {stage: 'Populate depth charts', stage_row_id: 'create-world-table-depth-charts'},
    {stage: 'Evaluate team talent', stage_row_id: 'create-world-table-team-talent'},
    {stage: 'Creating recruits', stage_row_id: 'create-world-table-recruiting-class'},
    {stage: 'Creating rankings', stage_row_id: 'create-world-table-rankings'},
    {stage: 'Creating schedule', stage_row_id: 'create-world-table-create-schedule'},
  ]

  var render_content = { world_list: world_list, world_options: world_options, progress_table_rows:progress_table_rows };

  console.log("render_content", render_content);

  var url = "/static/html_templates/index/index/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  const ddb = await common.driver_db();

  $(".idb-export").on("click", async function () {
    console.log("idb export click", $(this).attr("id"));
    var db_name = $(this).attr("id");

    const db = await new Dexie(db_name);

    await db.version(10).stores({
      league_season: "season",
      team: "team_id",
      team_season: "team_season_id, team_id, season",
      player: "player_id",
      player_team_season:
        "player_team_season_id, player_id, team_season_id, season",
      recruit_team_season:
        "++recruit_team_season_id, player_team_season_id, team_season_id",
      conference: "++conference_id, conference_name",
      conference_season:
        "++conference_season_id, conference_id, season, [conference_id+season]",
      phase: "++phase_id, season",
      week: "++week_id, season, [phase_id+season]",
      team_game: "team_game_id, game_id, team_season_id, week_id",
      player_team_game:
        "player_team_game_id, team_game_id, player_team_season_id",
      game: "game_id, week_id",
      award: "++award_id, player_team_season_id, week_id, season",
      headline: "headline_id, week_id",
      world: "",
    });

    console.log("db", db);

    db.open()
      .then(function () {
        const idbDatabase = db.backendDB(); // get native IDBDatabase object from Dexie wrapper

        // export to JSON, clear database, and import from JSON
        exportToJsonString(idbDatabase, function (err, jsonString) {
          if (err) {
            console.error(err);
          } else {
            console.log("Exported as JSON: " + jsonString);
            download(`${db_name}.json`, jsonString);
          }
        });
      })
      .catch(function (e) {
        console.error("Could not connect. " + e);
      });
  });

  $("#truncate-world-row").on("click", async function () {
    const get_databases_references = common.get_databases_references;

    var database_refs = await get_databases_references();
    var db = undefined;
    $.each(database_refs, async function (ind, db_obj) {
      console.log("db", db, db_obj);
      await Dexie.delete(db_obj.database_name);
    });

    const driver_db = await common.driver_db();

    const driver_worlds = await driver_db.world.toArray();
    const world_ids = driver_worlds.map((world) => world.world_id);
    await driver_db.world.bulkDelete(world_ids);

    location.reload();
    return false;
  });

  //Create new db if clicked 'continue'
  $(".create-world-play-button").on("click", async function () {
    let database_suffix = $(this).attr('database-suffix');
    console.log({this: $(this), database_suffix:database_suffix})
    await common.new_world_action(common, database_suffix);
    
  });
};


$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/index/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
