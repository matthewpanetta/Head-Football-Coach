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
    var par = $("#indexCreateWorldModalCloseButton").parent();
    $(par).empty();
    $(par).append("<div>Creating new world!</div>");
    const new_db = await common.create_new_db();

    var index_group = common.index_group;
    var index_group_sync = common.index_group_sync;

    const db = new_db["db"];
    common.db = await db;

    const new_season_info = new_db["new_season_info"];

    const world_id = new_season_info.world_id;
    const season = new_season_info.current_season;

    var teams_from_json = await common.get_teams();
    const num_teams = teams_from_json.length;

    const divisions_from_json = await common.get_divisions();
    const divisions = await index_group(
      divisions_from_json,
      "group",
      "conference_name"
    );

    // var conferences_from_json = await common.get_conferences('-regional');
    var conferences_from_json = await common.get_conferences('');
    console.log({conferences_from_json:conferences_from_json})

    var school_names_to_include = [];
    const conference_name_by_school_name = {};


    $.each(conferences_from_json, function (ind, conference) {
      conference.world_id = world_id;
      conference.divisions = {};
      school_names_to_include = school_names_to_include.concat(conference.original_teams);

      console.log({'conference.original_teams': conference.original_teams})
          
      for (var school_name of conference.original_teams) {
        conference_name_by_school_name[school_name] = conference.conference_name;
      }

      delete conference.original_teams;

      $.each(divisions[conference.conference_name], function (ind, division) {
        conference.divisions[division.division_name] = division;
      });
    });

    const conferences_added = await db.conference.bulkAdd(
      conferences_from_json
    );
    var conferences = await db.conference.toArray();

    teams_from_json = teams_from_json.filter((t) =>
    school_names_to_include.includes(t.school_name)
    );

    common.season = season;

    const season_data = {
      season: season,
      world_id: world_id,
      captains_per_team: 3,
      players_per_team: 70,
      num_teams: num_teams,
    };
    const new_season = new league_season(season_data, undefined);
    await db.league_season.add(new_season);

    const phases_created = await common.create_phase(season, common);
    await common.create_week(phases_created, common, season);

    const rivalries = await common.get_rivalries(teams_from_json);

    await common.create_conference_seasons({
      common: common,
      conferences: conferences,
      season: season,
      world_id: world_id,
    });
    var conference_seasons = await index_group(
      await db.conference_season.toArray(),
      "index",
      "conference_id"
    );

    conferences = nest_children(
      conferences,
      conference_seasons,
      "conference_id",
      "conference_season"
    );
    const conferences_by_conference_name = index_group_sync(
      conferences,
      "index",
      "conference_name"
    );
    const conferences_by_school_name = {};

    for ([school_name, conference_name] of Object.entries(
      conference_name_by_school_name
    )) {
      conferences_by_school_name[school_name] =
      conferences_by_conference_name[conference_name_by_school_name[school_name]];
      console.log({school_name:school_name, conference_name:conference_name})
      
    }

    console.log({conferences_by_school_name:conferences_by_school_name, conference_name_by_school_name:conference_name_by_school_name})

    var teams = [],
      rivals = [],
      rivals_team_1 = [],
      rivals_team_2 = [];
    var jersey_colors = [],
      jersey_lettering = {};
    const jersey_options = ["football", "football2", "football3", "football4"];

    var team_id_counter = 1;
    $.each(teams_from_json, function (ind, team) {
      if (team.jersey.invert) {
        team.jersey.teamColors = [
          "#FFFFFF",
          `#${team.team_color_primary_hex}`,
          `#${team.team_color_secondary_hex}`,
        ];
      } else {
        team.jersey.teamColors = [
          `#${team.team_color_primary_hex}`,
          `#${team.team_color_secondary_hex}`,
          "#FFFFFF",
        ];
      }

      team.jersey.lettering = { text_color: "#FFFFFF", text: "" };

      if (Math.random() < 0.2) {
        team.jersey.lettering.text = team.team_name;
      } else if (Math.random() < 0.1) {
        team.jersey.lettering.text = team.school_name;
      }

      team.jersey.id =
        team.jersey.id ||
        jersey_options[Math.floor(Math.random() * jersey_options.length)];

      rivals_team_1 = rivalries
        .filter((r) => r.team_name_1 == team.school_name)
        .map(function (r) {
          return {
            opponent_name: r.team_name_2,
            opponent_team_id: null,
            preferred_week_number: r.preferred_week_number,
            rivalry_name: r.rivalry_name,
          };
        });
      rivals_team_2 = rivalries
        .filter((r) => r.team_name_2 == team.school_name)
        .map(function (r) {
          return {
            opponent_name: r.team_name_1,
            opponent_team_id: null,
            preferred_week_number: r.preferred_week_number,
            rivalry_name: r.rivalry_name,
          };
        });

      rivals = rivals_team_1.concat(rivals_team_2);

      console.log({conferences_by_school_name:conferences_by_school_name, team:team})

      teams.push({
        team_id: team_id_counter,
        school_name: team.school_name,
        team_name: team.team_name,
        world_id: world_id,
        team_abbreviation: team.team_abbreviation,
        team_color_primary_hex: team.team_color_primary_hex,
        team_color_secondary_hex: team.team_color_secondary_hex,
        rivals: rivals,
        jersey: team.jersey,
        team_ratings: team.team_ratings,
        location: team.location,
        conference: {
          conference_id:
            conferences_by_school_name[team.school_name].conference_id,
          conference_name:
            conferences_by_school_name[team.school_name].conference_name,
        },
      });

      team_id_counter += 1;
    });

    teams.push({
      team_id: -1,
      school_name: "Available",
      team_name: "Players",
      world_id: world_id,
      team_abbreviation: "AVAIL",
      team_color_primary_hex: "1763B2",
      team_color_secondary_hex: "FFFFFF",
      rivals: [],
      jersey: {
        invert: false,
        id: "football",
        teamColors: ["#1763B2", "#000000", "#FFFFFF"],
        lettering: { text_color: "#FFFFFF", text: "" },
      },
      team_ratings: {},
      location: {
        city: "Washington",
        state: "DC",
      },
      conference: {},
    });

    teams.push({
      team_id: -2,
      school_name: season,
      team_name: "Recruits",
      world_id: world_id,
      team_abbreviation: "RECRUIT",
      team_color_primary_hex: "1763B2",
      team_color_secondary_hex: "FFFFFF",
      rivals: [],
      jersey: {
        invert: false,
        id: "football",
        teamColors: ["#1763B2", "#000000", "#FFFFFF"],
        lettering: { text_color: "#FFFFFF", text: "" },
      },
      team_ratings: {},
      location: {
        city: "Washington",
        state: "DC",
      },
      conference: {},
    });

    const teams_by_team_name = await index_group(teams, "index", "school_name");

    $.each(teams, function (ind, team) {
      $.each(team.rivals, function (ind, rival) {
        rival.opponent_team_id =
          teams_by_team_name[rival.opponent_name].team_id;
      });
    });

    var teams_added = await db.team.bulkAdd(teams);
    $(par).append("<div>Adding Team Seasons</div>");
    $("#modal-progress-parent").removeClass("w3-hide");
    $("#modal-progress").css("width", "0%");

    await common.create_team_season({
      common: common,
      season: season,
      world_id: world_id,
      conferences_by_conference_name: conferences_by_conference_name,
    });

    var team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray();
    const teams_by_team_id = await index_group(
      await db.team.where("team_id").above(0).toArray(),
      "index",
      "team_id"
    );

    $(par).append("<div>Adding Players</div>");
    $("#modal-progress").css("width", "0%");

    await common.create_players({
      common: common,
      team_seasons: team_seasons,
      teams_by_team_id: teams_by_team_id,
      world_id: world_id,
      season: season,
    });

    $(par).append("<div>Assigning players to teams</div>");
    $("#modal-progress").css("width", "0%");
    var players = await db.player.toArray();
    await common.create_player_team_seasons({
      common: common,
      players: players,
      world_id: world_id,
      team_seasons: team_seasons,
      season: season,
    });

    $(par).append("<div>Populating depth charts</div>");
    $("#modal-progress").css("width", "0%");
    common.season = season;
    common.world_id = world_id;
    await common.populate_all_depth_charts(common);

    $(par).append("<div>Evaluating team talent</div>");
    $("#modal-progress").css("width", "0%");
    await common.calculate_team_overalls(common);

    $(par).append("<div>Creating recruiting class</div>");
    $("#modal-progress").css("width", "0%");
    await common.calculate_team_needs(common);
    await common.create_recruiting_class(common);

    $(par).append("<div>Ranking teams</div>");
    $("#modal-progress").css("width", "0%");
    const all_weeks = await db.week.where({ season: season }).toArray();
    const this_week = all_weeks.filter((w) => w.is_current)[0];

    this_week.phase = await db.phase.get({ phase_id: this_week.phase_id });
    this_week.phase.season = season;

    console.log("this_week", this_week, all_weeks, common);

    await common.calculate_national_rankings(this_week, all_weeks, common);
    await common.calculate_conference_rankings(this_week, all_weeks, common);

    $(par).append("<div>Creating season schedule</div>");
    $("#modal-progress").css("width", "0%");
    await common.create_schedule({
      common: common,
      season: season,
      world_id: world_id,
    });

    await choose_preseason_all_americans(common);

    const current_league_season = await db.league_season
      .where({ season: season })
      .first();
    const world = await ddb.world.get({ world_id: world_id });
    const user_team = await db.team.get({
      team_id: current_league_season.user_team_id,
    });

    world.user_team.team_name = user_team.team_name;
    world.user_team.school_name = user_team.school_name;
    world.user_team.team_logo_url = user_team.team_logo;
    world.user_team.team_record = "0-0";
    world.user_team.team_id = user_team.team_id;

    await ddb.world.put(world);

    window.location.href = `/World/${world_id}`;
  });
};

const reformat_teams = async (common) => {
  const driver_db = await common.driver_db();
  console.log({ driver_db: driver_db });
  var cities = await driver_db.cities.toArray();
  var states = {};

  for (const city_obj of cities) {
    if (!(city_obj.state in states)) {
      states[city_obj.state] = {};
    }

    states[city_obj.state][city_obj.city] = deep_copy(city_obj);
  }

  console.log({ states: states });

  for (const team of teams) {
    if (states[team.state][team.city] == undefined) {
      console.log({
        team: team,
        state: team.state,
        city: team.city,
        state_obj: states[team.state],
        city_obj: states[team.state][team.city],
      });
    }
    team.location = states[team.state][team.city];
    delete team.city;
    delete team.state;
  }

  console.log(JSON.stringify(teams));
};

const test_nums = (common) => {
  const round_decimal = common.round_decimal;
  const normal_trunc = common.normal_trunc;
  const normal_trunc_bounce = common.normal_trunc_bounce;

  var nums = [];
  var num_map = {};

  for (var i = 0; i < 10000; i++) {
    var n = round_decimal(normal_trunc_bounce(2, 4, 1, 7), 0);

    nums.push(n);

    if (!(n in num_map)) {
      num_map[n] = 0;
    }
    num_map[n] += 1;
  }

  console.log({ nums: nums, num_map: num_map });
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
