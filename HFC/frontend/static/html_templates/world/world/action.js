const refresh_playoffs = async (common) => {
  const db = common.db;
  const season = common.season;

  const all_league_seasons = await db.league_season.toArray();
  const current_league_season = all_league_seasons[0];

  current_league_season.playoffs = {
    playoffs_started: false,
    playoffs_complete: false,
    number_playoff_rounds: 3,
    number_playoff_teams: 6,
    playoff_rounds: [
      {
        playoff_round_number: 1,
        is_current_round: false,
        is_championship: false,
        week_name: "Bowl Week 1",
        next_week_name: "Bowl Week 2",
        round_name: "National Quarterfinals",
        playoff_games: [
          {
            team_objs: [{ seed: 1, team_game_id: null, team_season_id: null }],
            bye_game: true,
            seeds_set: true,
            game_id: null,
          },
          {
            team_objs: [
              { seed: 4, team_game_id: null, team_season_id: null },
              { seed: 5, team_game_id: null, team_season_id: null },
            ],
            bye_game: false,
            seeds_set: true,
            game_id: null,
          },
          {
            team_objs: [{ seed: 2, team_game_id: null, team_season_id: null }],
            bye_game: true,
            seeds_set: true,
            game_id: null,
          },
          {
            team_objs: [
              { seed: 3, team_game_id: null, team_season_id: null },
              { seed: 6, team_game_id: null, team_season_id: null },
            ],
            bye_game: false,
            seeds_set: true,
            game_id: null,
          },
        ],
      },
      {
        playoff_round_number: 2,
        is_current_round: false,
        is_championship: false,
        week_name: "Bowl Week 2",
        next_week_name: "Bowl Week 3",
        round_name: "National Semifinals",
        playoff_games: [
          { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
          { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
        ],
      },
      {
        playoff_round_number: 3,
        is_current_round: false,
        is_championship: true,
        week_name: "Bowl Week 3",
        next_week_name: null,
        round_name: "National Championship",
        playoff_games: [
          { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
        ],
      },
    ],
  };

  await db.league_season.put(current_league_season);

  await db.game.where("game_id").above(241).delete();
  await db.team_game.where("game_id").above(241).delete();

  const phases = await db.phase.toArray();
  const all_phases_by_phase_id = index_group_sync(phases, "index", "phase_id");
  var all_weeks = await db.week.where({ season: season }).toArray();
  all_weeks = nest_children(
    all_weeks,
    all_phases_by_phase_id,
    "phase_id",
    "phase"
  );
  await common.schedule_bowl_season(all_weeks, common);
  console.log("done");
};

const test_srs = async (common) => {
  const db = common.db;

  let teams = await db.team.toArray();
  let team_seasons = await db.team_season
    .where({ season: common.season })
    .toArray();
  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  let weeks = await db.week.where({season: common.season}).toArray();
  let weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id');

  console.log(weeks)

  let team_games = await db.team_game
    .where("team_season_id")
    .anyOf(team_season_ids)
    .toArray();
  let game_ids = team_games.map((tg) => tg.game_id);
  let games = await db.game.bulkGet(game_ids);
  games = nest_children(games, weeks_by_week_id, 'week_id', 'week')

  let games_by_game_id = index_group_sync(games, "index", "game_id");

  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  team_games = team_games.filter((tg) => tg.game.was_played);
  // team_games = team_games.filter((tg) => (tg.game.week.schedule_week_number || 2000) <= 1999);
  let team_games_by_team_season_id = index_group_sync(
    team_games,
    "group",
    "team_season_id"
  );

  let teams_by_team_id = index_group_sync(teams, "index", "team_id");
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  team_seasons = nest_children(
    team_seasons,
    team_games_by_team_season_id,
    "team_season_id",
    "team_games"
  );
  team_seasons = team_seasons.filter((ts) => ts.team_id > 0);
  console.log({ team_seasons: team_seasons });

  let overall_power_modifier = 2;
  let max_overall = Math.max(...team_seasons.map(ts => ts.rating.overall));
  let overall_list = team_seasons.map(ts => (ts.rating.overall ** overall_power_modifier) / (max_overall ** (overall_power_modifier - 1)));
  overall_list = overall_list.map(ovr => Math.ceil((ovr )))
  let average_overall = Math.ceil(average(overall_list))

  for (let ts of team_seasons) {
    ts.srs = {
      loops: 0,
      rating: Math.ceil((ts.rating.overall ** overall_power_modifier)  / (max_overall ** (overall_power_modifier - 1))),
      wins:0,
      losses:0,
      games_played:0
    };

    for (let tg of ts.team_games) {
      ts.srs.wins += (tg.is_winning_team ? 1 : 0);
      ts.srs.losses += (tg.is_winning_team ? 0 : 1);
      ts.srs.games_played += 1
    }

    ts.srs.net_win_count = ts.srs.wins - ts.srs.losses;
  }


  let team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  console.log({ team_seasons: team_seasons, average_overall:average_overall, overall_list:overall_list });

  for (let iter_ind = 0; iter_ind <= 500; iter_ind++) {
    for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
      let total_opponent_rating = 0;
      for (let tg of ts.team_games) {
        total_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating;
      }
      ts.srs.schedule_factor = Math.round(
        (total_opponent_rating + ((ts.srs.net_win_count * average_overall)) + ts.srs.net_win_count) / (ts.srs.games_played || 1)
      );
    }

    for (let ts of team_seasons) {
      ts.srs.rating = ts.srs.schedule_factor;
    }
  }

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) => ts_b.srs.rating - ts_a.srs.rating || ts_b.srs.net_win_count - ts_a.srs.net_win_count
  );
  console.log({ team_seasons: team_seasons.map(ts => ({team: ts.team.school_name, record: `${ts.srs.wins}-${ts.srs.losses}`, srs: ts.srs.rating})) });

  // def rateTeams(self, array, dict):

  //   for i in range(self.ITERATION_CONSTANT):

  //       for team in range(len(array)):
  //           performance = array[team].head.getPerformance()
  //           scheduleFactor = array[team].head.getScheduleFactor()
  //           newRating = performance + scheduleFactor
  //           array[team].head.setRating(newRating)

  //   return array
};

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

const refresh_bowls = async (common) => {
  const db = common.db;
  const season = common.season;

  //this_week, all_weeks, common
  const current_league_season = await db.league_season
    .where({ season: season })
    .first();

  await db.game.where("game_id").above(260).delete();
  await db.team_game.where("game_id").above(260).delete();

  var weeks = await db.week.where({ season: season }).toArray();
  for (const week of weeks) {
    if (week.week_name == "Bowl Week 1") {
      week.is_current = true;
    } else {
      week.is_current = false;
    }
  }

  await db.week.bulkPut(weeks);

  await common.process_bowl_results(common);
};

const reset_bowls = async (common) => {
  const db = common.db;

  await db.game.where("game_id").above(262).delete();
  await db.team_game.where("game_id").above(262).delete();
};

const getHtml = async (common) => {
  const db = common.db;
  const ddb = common.ddb;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;
  const season = common.season;

  var current_week = await db.week.toArray();
  current_week = current_week.filter((w) => w.is_current)[0];

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
