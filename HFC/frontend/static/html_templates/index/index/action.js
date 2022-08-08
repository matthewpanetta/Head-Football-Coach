const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  var db = null;
  var world_obj = {};
  const db_list = await common.get_databases_references();
  var render_content = { world_list: [] };

  $.each(db_list, function (ind, db) {
    world_obj = db;
    render_content["world_list"].push(world_obj);
  });

  console.log("render_content", render_content);

  var url = "/static/html_templates/index/index/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  const ddb = await common.driver_db();

  //Show initial 'new world' modal
  $("#create-world-row").on("click", function () {
    $("#indexCreateWorldModal").css({ display: "block" });

    //Close modal if clicking outside modal
    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#indexCreateWorldModal")[0]) {
        $("#indexCreateWorldModal").css({ display: "none" });
        $(window).unbind();
      }
    });

    //Function to close modal
    $("#indexCreateWorldModalCloseButton").on("click", function () {
      $("#indexCreateWorldModal").css({ display: "none" });
      $(window).unbind();
    });
  });

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
  $("#indexCreateWorldModalContinueButton").on("click", async function () {

    await common.new_world_action(common);
    
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
