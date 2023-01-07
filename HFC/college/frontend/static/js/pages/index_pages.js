import { world_options } from "/static/js/metadata.js";
import {nunjucks_env} from '/common/js/nunjucks_tags.js'
import { get_databases_references, create_new_db, prune_orphaned_databases, truncate_databases } from "/static/js/database.js";

export const page_index_action = async (common) => {
  const ddb = await common.ddb;

  $(".idb-export").on("click", async function () {
    console.log("idb export click", $(this).attr("id"));
    var db_name = $(this).attr("id");

    const db = await new Dexie(db_name);

    await db.version(20).stores({
      league_season: "season",
      team: "team_id",
      team_season: "team_season_id, team_id, season",
      team_season_stats: "team_season_id, team_id, season",
      coach: "coach_id",
      coach_team_season: "coach_team_season_id, coach_id, team_season_id, season",
      player: "player_id",
      player_team_season: "player_team_season_id, player_id, team_season_id, season",
      player_team_season_stats: "player_team_season_id",
      recruit_team_season: "recruit_team_season_id, player_team_season_id, team_season_id",
      conference: "conference_id",
      conference_season: "conference_season_id, conference_id, season, [conference_id+season]",
      phase: "phase_id, season",
      week: "week_id, season, [phase_id+season]",
      team_game: "team_game_id, game_id, team_season_id, week_id",
      player_team_game: "player_team_game_id, team_game_id, player_team_season_id",
      game: "game_id, week_id",
      award: "award_id, player_team_season_id, week_id, season",
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
    await truncate_databases();
    location.reload();
  });

  $("#import-world-row").on("click", async function () {
    $("#file-input-button").click();
  });

  $("#file-input-button").on("change", async function (event) {
    console.log({
      event_target: event.target,
      event: event,
      files: event.target.files,
    });

    const curFiles = event.target.files;
    console.log({ curFiles: curFiles, t: $(event.target).first() });
    for (const file of curFiles) {
      let url = URL.createObjectURL(file);

      var json_response = await fetch(url);
      let json_text = await json_response.text();
      let world_obj = JSON.parse(json_text);

      const new_db = await create_new_db();
      const db = await new_db["db"];
      const ddb = await common.ddb;

      for (let [table, rows] of Object.entries(world_obj)) {
        rows.forEach((r) => (r.world_id = new_db.new_season_info.world_id));
        await db[table].bulkPut(rows);
      }

      let world = await ddb.world
        .filter((w) => w.database_name == new_db.new_season_info.database_name)
        .first();

      const user_team = await db.team.filter((t) => t.is_user_team).first();

      //TODO - test this with world with multiple years
      //  I *THINK* this will sort by pk, being team_season_id, which is what I want. Need to confirm that.
      const user_team_season = await db.team_season
        .where({
          team_id: user_team.team_id,
        })
        .last();

      world.user_team.team_name = user_team.team_name;
      world.user_team.school_name = user_team.school_name;
      world.user_team.team_logo_url = user_team.team_logo;
      world.user_team.team_record = user_team_season.record_display;
      world.user_team.team_id = user_team.team_id;

      await ddb.world.put(world);
      location.reload();
    }
  });

  //Create new db if clicked 'continue'
  $(".create-world-play-button").on("click", async function () {
    let database_suffix = $(this).attr("database-suffix");
    console.log({ this: $(this), database_suffix: database_suffix });
    await common.new_world_action(common, database_suffix);
  });
};

export const page_index = async (common) => {
  nunjucks.configure({ autoescape: true });

  let ddb = await common.ddb;

  await prune_orphaned_databases();
  const db_list = await get_databases_references();

  let progress_table_rows = [
    {
      stage: "Creating new world",
      stage_row_id: "create-world-table-new-world",
    },
    { stage: "Create teams", stage_row_id: "create-world-table-create-teams" },
    {
      stage: "Creating coaches",
      stage_row_id: "create-world-table-create-coaches",
    },
    {
      stage: "Add coaches to teams",
      stage_row_id: "create-world-table-assign-coaches",
    },
    {
      stage: "Creating players",
      stage_row_id: "create-world-table-create-players",
    },
    {
      stage: "Generate player ratings",
      stage_row_id: "create-world-table-player-ratings",
    },
    {
      stage: "Add players to teams",
      stage_row_id: "create-world-table-assign-players",
    },
    {
      stage: "Populate depth charts",
      stage_row_id: "create-world-table-depth-charts",
    },
    {
      stage: "Evaluate team talent",
      stage_row_id: "create-world-table-team-talent",
    },
    {
      stage: "Creating recruits",
      stage_row_id: "create-world-table-recruiting-class",
    },
    { stage: "Creating rankings", stage_row_id: "create-world-table-rankings" },
    {
      stage: "Creating schedule",
      stage_row_id: "create-world-table-create-schedule",
    },
  ];

  var render_content = {
    world_list: db_list,
    world_options: world_options,
    progress_table_rows: progress_table_rows,
    page: {
      PrimaryColor: "1763B2",
      SecondaryColor: "333333",
    },
  };

  console.log("render_content", render_content);

  var url = "/static/html_templates/index/index/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await page_index_action(common);
};
