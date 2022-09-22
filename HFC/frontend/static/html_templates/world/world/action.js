
const get_all_keys = (obj) => {
  let all_keys = new Set();

  if (Array.isArray(obj)) {
    for (let val of obj) {
      get_all_keys(val).forEach(function (i) {
        if (!i.includes("id") && i.length > 3) {
          all_keys.add(i);
        }
      });
    }
  } else if (typeof obj === "object") {
    for (let [key, val] of Object.entries(obj)) {
      if (!key.includes("id") && key.length > 3) {
        all_keys.add(key);
      }
      // console.log({key:key, val:val, all_keys:all_keys})
      // debugger;
      if (typeof val === "object" && !Array.isArray(val) && !(val === null)) {
        // console.log({all_keys:all_keys, val:val})
        // debugger;
        get_all_keys(val).forEach(function (i) {
          if (!i.includes("id") && i.length > 3) {
            all_keys.add(i);
          }
        });
      }
    }
  }

  return all_keys;
};

const check_db_size = async (common, db) => {
  console.log({ db: db, idbdb: db.idbdb.objectStoreNames });
  let table_lengths = [];
  let all_keys = new Set();
  Object.entries(db.idbdb.objectStoreNames).forEach(async function (l, ind) {
    console.log({
      l: l,
      ind: ind,
      "db.idbdb.objectStoreNames.length": db.idbdb.objectStoreNames.length,
    });
    let table_name = l[1];
    let rows = await db[table_name].toArray();
    let strigified_rows = JSON.stringify(rows);
    let characters_per_row = strigified_rows.length / rows.length;

    if (rows) {
      get_all_keys(rows[0]).forEach((elem) => all_keys.add(elem));
      console.log(JSON.stringify([...all_keys]));
    }

    console.log({
      table_name: table_name,
      row_count: rows.length,
      str_count: strigified_rows.length,
      characters_per_row: characters_per_row,
    });
  });

  console.log({ all_keys: all_keys, table_lengths: table_lengths });
  debugger;
};


const getHtml = async (common) => {
  const db = common.db;
  const ddb = common.ddb;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;
  const season = common.season;

  var current_week = await db.week.where('season').between(season-1, season+1).toArray();
  current_week = current_week.find((w) => w.is_current);

  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "World",
    db: db,
  });

  common.stopwatch(common, "Time before recent_games");
  const recent_games = await common.recent_games(common);
  common.stopwatch(common, "Time after recent_games");

  var teams = await db.team.where("team_id").above(0).toArray();
  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  let conferences = await db.conference.toArray();
  var conferences_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  let conference_seasons = await db.conference_season
    .where({ season: season })
    .toArray();
  var conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );
  var team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");
  var distinct_team_seasons = [];
  common.stopwatch(common, "Time after selecting teams");

  console.log({
    team_seasons: team_seasons,
    teams: teams,
    conference_seasons: conference_seasons,
  });
  // debugger;

  $.each(teams, async function (ind, team) {
    team.team_season = team_seasons_by_team_id[team.team_id];
    team.team_season.conference_season =
      conference_seasons_by_conference_season_id[
        team.team_season.conference_season_id
      ];
    team.team_season.conference_season.conference =
      conferences_by_conference_id[
        team.team_season.conference_season.conference_id
      ];

    team.conference_position_display = `${team.team_season.rankings.division_rank[0]} in ${team.team_season.conference_season.conference.conference_abbreviation}`;
    if (team.team_season.results.conference_champion) {
      team.conference_position_display = `${team.team_season.conference_season.conference.conference_abbreviation} Champions`;
    }
  });

  teams = teams.filter(
    (team) => team.team_season.rankings.national_rank[0] <= 25
  );

  teams.sort(function (a, b) {
    if (
      a.team_season.rankings.national_rank[0] <
      b.team_season.rankings.national_rank[0]
    )
      return -1;
    if (
      a.team_season.rankings.national_rank[0] >
      b.team_season.rankings.national_rank[0]
    )
      return 1;
    return 0;
  });

  common.stopwatch(common, "Time after sorting team seasons");

  let this_week_team_games = await db.team_game
    .where({ week_id: current_week.week_id })
    .toArray();
  var this_week_team_games_by_team_game_id = index_group_sync(
    this_week_team_games,
    "index",
    "team_game_id"
  );

  common.stopwatch(common, "Time after fetching team games");

  var this_week_games = await db.game
    .where({ week_id: current_week.week_id })
    .toArray();

  common.stopwatch(common, "Time after fetching games");

  var min_national_rank = 0;
  $.each(this_week_games, function (ind, game) {
    game.game_headline_display = "";
    if (game.bowl != null) {
      game.game_headline_display = game.bowl.bowl_name;
    } else if (game.rivalry != null) {
      if (game.rivalry.rivalry_name.length > 0) {
        game.game_headline_display = game.rivalry.rivalry_name;
      } else {
        game.game_headline_display = "Rivalry Game";
      }
    }

    game.home_team_game =
      this_week_team_games_by_team_game_id[game.home_team_game_id];
    game.away_team_game =
      this_week_team_games_by_team_game_id[game.away_team_game_id];

    game.home_team_game.team_season =
      team_seasons_by_team_season_id[game.home_team_game.team_season_id];
    game.away_team_game.team_season =
      team_seasons_by_team_season_id[game.away_team_game.team_season_id];

    game.home_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };
    game.away_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };

    game.home_team_game.team_season.team =
      teams_by_team_id[game.home_team_game.team_season.team_id];
    game.away_team_game.team_season.team =
      teams_by_team_id[game.away_team_game.team_season.team_id];

    game.team_games = [game.away_team_game, game.home_team_game];

    min_national_rank = Math.min(
      game.home_team_game.team_season.national_rank,
      game.away_team_game.team_season.national_rank
    );
    game.summed_national_rank =
      game.home_team_game.team_season.national_rank +
      game.away_team_game.team_season.national_rank +
      min_national_rank;

    game.world_page_filter_attributes = "AllGame=1 ";
    if (
      game.away_team_game.team_season.national_rank <= 25 ||
      game.home_team_game.team_season.national_rank <= 25
    ) {
      game.world_page_filter_attributes += "Top25Game=1 ";
    } else {
      game.world_page_filter_attributes += "Top25Game=0 ";
    }

    if (game.is_primetime_game) {
      game.world_page_filter_attributes += "primetimegame=1 ";
      game.classes = "";
    } else {
      game.world_page_filter_attributes += "primetimegame=0 ";
      game.classes = "w3-hide";
    }
  });

  this_week_games = this_week_games.sort(function (a, b) {
    if (a.summed_national_rank < b.summed_national_rank) return -1;
    if (a.summed_national_rank > b.summed_national_rank) return 1;
    return 0;
  });

  let preseason_info = {};
  common.stopwatch(common, "Time before pre-season");
  if (current_week.week_name == "Pre-Season") {
    // TODO filter out backups
    preseason_info.conference_favorites = [];

    var team_seasons = await db.team_season
      .where({ season: common.season })
      .and((ts) => ts.team_id > 0)
      .toArray();
    var all_teams = await db.team.toArray();
    const teams_by_team_id = index_group_sync(all_teams, "index", "team_id");

    team_seasons = nest_children(
      team_seasons,
      teams_by_team_id,
      "team_id",
      "team"
    );

    const team_seasons_by_team_season_id = index_group_sync(
      team_seasons,
      "index",
      "team_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season team_seasons");

    var player_team_seasons = await db.player_team_season
      .where({ season: common.season })
      .toArray();
    player_team_seasons = player_team_seasons.filter(
      (pts) => pts.team_season_id > 0
    );
    let player_team_season_ids = player_team_seasons.map(
      (pts) => pts.player_team_season_id
    );

    console.log({
      player_team_seasons: player_team_seasons,
      len: player_team_seasons.length,
    });
    common.stopwatch(common, "Time after fetching pre season pts");

    const player_team_season_stats = await db.player_team_season_stats.bulkGet(
      player_team_season_ids
    );
    const player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    console.log({
      player_team_season_stats: player_team_season_stats,
      len: player_team_season_stats.length,
    });
    common.stopwatch(common, "Time after fetching pre season ptss");

    const player_ids = player_team_seasons.map((pts) => pts.player_id);
    var players = await db.player.bulkGet(player_ids);
    const players_by_player_id = index_group_sync(
      players,
      "index",
      "player_id"
    );

    player_team_seasons = nest_children(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      team_seasons_by_team_season_id,
      "team_season_id",
      "team_season"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );

    common.stopwatch(common, "Time after fetching pre season players");

    var heisman_race = player_team_seasons.filter(
      (pts) => pts.depth_chart_rank == 1
    );
    heisman_race = heisman_race.sort(
      (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
    );
    preseason_info.heisman_hopefuls = heisman_race.slice(0, 5);

    common.stopwatch(common, "Time after sorting pre season pts");

    let conferences = await db.conference.toArray();
    let conferences_by_conference_id = index_group_sync(
      conferences,
      "index",
      "conference_id"
    );
    let conference_seasons = await db.conference_season
      .where({ season: season })
      .toArray();
    conference_seasons = nest_children(
      conference_seasons,
      conferences_by_conference_id,
      "conference_id",
      "conference"
    );
    const team_seasons_by_conference_season_id = index_group_sync(
      team_seasons,
      "group",
      "conference_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season conferences");

    for (let conference_season of conference_seasons) {
      let team_seasons_for_conference =
        team_seasons_by_conference_season_id[
          conference_season.conference_season_id
        ];
      team_seasons_for_conference = team_seasons_for_conference.sort(function (
        ts_a,
        ts_b
      ) {
        return (
          ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0] ||
          ts_a.national_rank - ts_b.national_rank
        );
      });

      conference_season.team_seasons = team_seasons_for_conference;

      // console.log({conference_season:conference_season, team_seasons_for_conference:team_seasons_for_conference})
    }

    conference_seasons = conference_seasons.sort(
      (cs_a, cs_b) => cs_b.conference.prestige - cs_a.conference.prestige
    );

    preseason_info.conference_favorites = conference_seasons;
  }

  let headlines = await db.headline.where({week_id: current_week.week_id - 1}).toArray();
  headlines = headlines.sort((h_a, h_b) => h_b.headline_relevance - h_a.headline_relevance)
  headlines = headlines.slice(0, 20);

  common.stopwatch(common, "Time after this_week_games");
  const page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
  };
  var render_content = {
    team_list: [],
    page: page,
    world_id: common.world_id,
    teams: teams,
    this_week_games: this_week_games,
    recent_games: recent_games,
    current_week: current_week,
    preseason_info: preseason_info,
    headlines:headlines
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/world/world/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").append(renderedHtml);
  // $('#body .show.active').css('display', 'block');
};

const action = async (common) => {
  const packaged_functions = common;
  const db = common.db;

  //await check_db_size(common, db);
  // await test_srs(common);

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

  //Create new db if clicked 'continue'
  $("#indexCreateWorldModalContinueButton").on("click", async function () {
    const db = await packaged_functions["create_new_db"]();
    console.log("Created new db!", db);

    const teams = await packaged_functions["get_teams"]({});

    var ba_add = await db.team.bulkAdd(teams);
    console.log("ba_add", ba_add);
  });

  var InitialBoxScore = $(".recent-gameview-tab")[0];

  var SelectedTeamID = $(InitialBoxScore).attr("TeamID");
  $(".upcoming-gameview-tab").on("click", function (event, target) {
    console.log("clicked this", event, target);

    $(".upcoming-gameview-tab").removeClass("selected-bar-button");
    let clicked_tab = $(event.target);
    let clicked_tab_parent = clicked_tab.closest(".boxscore-bar").attr("id");
    let selected_game_filter_selection = clicked_tab.attr(
      "GameFilterSelection"
    );

    $(
      ".worldUpcomingTable[" + selected_game_filter_selection + '="1"]'
    ).removeClass("w3-hide");
    $(
      ".worldUpcomingTable[" + selected_game_filter_selection + '="0"]'
    ).addClass("w3-hide");

    $(clicked_tab).addClass("selected-bar-button");
  });

  await draw_faces(common);
  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const draw_faces = async (common) => {
  const db = common.db;
  const season = common.season;
  const index_group_sync = common.index_group_sync;

  const player_ids = [];
  const face_div_by_player_id = {};

  $(".PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }

    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];

      player_ids.push(parseInt($(elem).attr("player_id")));
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
  });

  const players = await db.player.bulkGet(player_ids);
  var player_team_seasons = await db.player_team_season
    .where("player_id")
    .anyOf(player_ids)
    .toArray();
  player_team_seasons = player_team_seasons.filter(
    (pts) => pts.season == season
  );
  const player_team_seasons_by_player_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_id"
  );

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  for (var player of players) {
    var elems = face_div_by_player_id[player.player_id];
    player.player_team_season =
      player_team_seasons_by_player_id[player.player_id];
    player.team_season =
      team_seasons_by_team_season_id[player.player_team_season.team_season_id];
    player.team = teams_by_team_id[player.team_season.team_id];

    if (player.player_face == undefined) {
      player.player_face = await common.create_player_face(
        "single",
        player.player_id,
        db
      );
    }

    for (var elem of elems) {
      common.display_player_face(
        player.player_face,
        {
          jersey: player.team.jersey,
          teamColors: player.team.jersey.teamColors,
        },
        $(elem).attr("id")
      );
    }
  }
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/");
  common.startTime = startTime;

  await getHtml(common);
  common.stopwatch(common, "Time after getHtml");
  await action(common);
  common.stopwatch(common, "Time after action");
  await common.add_listeners(common);
  common.stopwatch(common, "Time after listeners");

  console.log({ common: common });

  //await common.create_recruiting_class(common);

  const db = common.db;

  const weeks = await db.week.where({ season: common.season }).toArray();

  common.stopwatch(common, "Time taken to render HTML");
});
