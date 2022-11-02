
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

// const regenerate_ranking_headlines = async(common) => {
//   let team_seasons = await db.team_season.where({season: common.season}).and(ts => ts.team_id > 0).toArray();
//   let last_headline = await db.headline.orderBy('headline_id').last();
//   let headline_id_counter = last_headline.headline_id + 1 || 1;
//   let new_headlines = await generate_ranking_headlines(common, team_seasons, this_week, headline_id_counter)

//   await db.headline.where({week_id: this_week.week_id}).delete()
//   await db.headline.bulkPut(new_headlines)
// }

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

    // game.world_page_filter_attributes = "AllGame=1 ";
    // if (
    //   game.away_team_game.team_season.national_rank <= 25 ||
    //   game.home_team_game.team_season.national_rank <= 25
    // ) {
    //   game.world_page_filter_attributes += "Top25Game=1 ";
    // } else {
    //   game.world_page_filter_attributes += "Top25Game=0 ";
    // }

    // if (game.is_primetime_game) {
    //   game.world_page_filter_attributes += "primetimegame=1 ";
    //   game.classes = "";
    // } else {
    //   game.world_page_filter_attributes += "primetimegame=0 ";
    //   game.classes = "w3-hide";
    // }
  });

  this_week_games = this_week_games.sort(function (g_a, g_b) {
    if (g_a.team_games[0].team_season.is_user_team || g_a.team_games[1].team_season.is_user_team) return -1;
    if (g_b.team_games[0].team_season.is_user_team || g_b.team_games[1].team_season.is_user_team) return 1;
    if (g_a.summed_national_rank < g_b.summed_national_rank) return -1;
    if (g_a.summed_national_rank > g_b.summed_national_rank) return 1;
    return 0;
  });

  let headline_type_map = {
    'game': 'Last Week Games',
    'ranking': 'AP Top 25',
    'recruiting': '247 Recruiting'
  }
  let headlines = await db.headline.where({week_id: current_week.week_id - 1}).toArray();
  headlines.forEach(function(h){
    h.headline_type_display = headline_type_map[h.headline_type];
    h.team_seasons = h.team_season_ids.map(ts_id => team_seasons_by_team_season_id[ts_id]);
  });
  headlines = headlines.sort((h_a, h_b) => h_b.headline_relevance - h_a.headline_relevance)
  let headlines_by_headline_type = index_group_sync(headlines, 'group', 'headline_type_display');

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
    recent_games: recent_games,
    current_week: current_week,
    headlines_by_headline_type:headlines_by_headline_type,
    this_week_games:this_week_games
  };

  common.render_content = render_content;
  window.common = common;

  console.log("render_content", render_content);

  let url = "/static/html_templates/world/world/template.njk";
  let html = await fetch(url);
  html = await html.text();

  let renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").append(renderedHtml);
  // $('#body .show.active').css('display', 'block');


  let preseason_info = {};
  let season_recap = {};
  common.stopwatch(common, "Time before pre-season");
  if (current_week.week_name == "Pre-Season") {
    // TODO filter out backups
    preseason_info.conference_favorites = [];

    var team_seasons = await db.team_season
      .where('season').between(common.season - 1, common.season, true, true)
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
      .where('season').between(common.season - 1, common.season, true, true)
      .toArray();
    player_team_seasons = player_team_seasons.filter(
      (pts) => pts.team_season_id > 0
    );
    let player_team_season_ids = player_team_seasons.map(
      (pts) => pts.player_team_season_id
    );

    common.stopwatch(common, "Time after fetching pre season pts");

    const player_team_season_stats = await db.player_team_season_stats.bulkGet(
      player_team_season_ids
    );
    const player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    common.stopwatch(common, "Time after fetching pre season ptss");

    const player_ids = distinct(player_team_seasons.map((pts) => pts.player_id));
    var players = await db.player.bulkGet(player_ids);
    const players_by_player_id = index_group_sync(
      players,
      "index",
      "player_id"
    );

    common.stopwatch(common, "Time after fetching pre season players");

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

    let previous_player_team_seasons = player_team_seasons.filter(pts => pts.season == common.season - 1);

    player_team_seasons = player_team_seasons.filter(pts => pts.season == common.season);
    team_seasons = team_seasons.filter(ts => ts.season == common.season);

    let previous_player_team_seasons_by_player_id = index_group_sync(previous_player_team_seasons, 'index', 'player_id');
    player_team_seasons = nest_children(player_team_seasons, previous_player_team_seasons_by_player_id, 'player_id', 'previous_player_team_season')
    player_team_seasons.forEach(pts => pts.previous_player_team_season = pts.previous_player_team_season || {player_award_rating: pts.player_award_rating})

    common.stopwatch(common, "Time after indexing & filtering players & ptss");

    var heisman_race = player_team_seasons.filter(
      (pts) => pts.depth_chart_rank == 1
    );
    heisman_race = heisman_race.sort(function(pts_a, pts_b){
      return pts_b.previous_player_team_season.player_award_rating - pts_a.previous_player_team_season.player_award_rating
    });
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
    }

    conference_seasons = conference_seasons.sort(
      (cs_a, cs_b) => cs_b.conference.prestige - cs_a.conference.prestige
    );

    preseason_info.conference_favorites = conference_seasons;
    render_content.preseason_info = preseason_info;
    url = "/static/html_templates/world/world/info_col_preseason.njk";
  }
  else if (current_week.week_name == 'Season Recap'){
    team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
    let team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

    const awards = await db.award.where({ season: common.season }).toArray();
    var heisman_award = awards.find((a) => a.award_group_type == "Heisman");
    let conference_season_poty_awards = awards.filter(a => a.award_group == 'individual' && a.award_timeframe == 'regular season' && a.award_team_set == 'conference');

    let player_team_season_ids = conference_season_poty_awards.map(a => a.player_team_season_id).concat([heisman_award.player_team_season_id]);
    let player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);

    let player_ids = player_team_seasons.map(pts => pts.player_id);
    let players = await db.player.bulkGet(player_ids)
    let players_by_player_id = index_group_sync(players, 'index', 'player_id')

    let player_team_season_stats = await db.player_team_season_stats.bulkGet(player_team_season_ids);
    let player_team_season_stats_by_player_team_season_id = index_group_sync(player_team_season_stats, 'index', 'player_team_season_id');
    player_team_seasons = nest_children(player_team_seasons, player_team_season_stats_by_player_team_season_id, 'player_team_season_id', 'season_stats');

    player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player');
    player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
    let player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');

    heisman_award.player_team_season = player_team_seasons_by_player_team_season_id[heisman_award.player_team_season_id];
    conference_season_poty_awards = nest_children(conference_season_poty_awards, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');

    let conference_winning_team_seasons = team_seasons.filter(ts => ts.results.conference_champion);
    let conference_winning_team_seasons_by_conference_season_id = index_group_sync(conference_winning_team_seasons, 'index', 'conference_season_id')
    let conference_season_ids = conference_winning_team_seasons.map(ts => ts.conference_season_id);
    let conference_seasons = await db.conference_season.bulkGet(conference_season_ids);
    let conference_ids = conference_seasons.map(cs => cs.conference_id);
    let conferences = await db.conference.bulkGet(conference_ids);
    let conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

    let conference_season_poty_awards_by_conference_season_id = index_group_sync(conference_season_poty_awards, 'index', 'conference_season_id')
    
    conference_seasons = nest_children(conference_seasons, conference_season_poty_awards_by_conference_season_id, 'conference_season_id', 'poty_award')
    conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')
    // let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')
    conference_seasons = nest_children(conference_seasons, conference_winning_team_seasons_by_conference_season_id, 'conference_season_id', 'team_season')
    conference_seasons = conference_seasons.sort((cs_a, cs_b) => cs_b.conference.conference_name > cs_a.conference.conference_name ? -1 : 1);

    let national_champions_team_season = team_seasons.find(ts => ts.results.national_champion)
    let champion_other_team_seasons = await db.team_season.where({team_id: national_champions_team_season.team_id}).filter(ts => ts.results.national_champion).toArray();
    national_champions_team_season.national_championship_count = champion_other_team_seasons.length;
    season_recap.national_champions_team_season = national_champions_team_season
    season_recap.heisman_award = heisman_award;
    season_recap.conference_seasons = conference_seasons;

    render_content.season_recap = season_recap;
    url = "/static/html_templates/world/world/info_col_season_recap.njk";
  }
  else {
    url = "/static/html_templates/world/world/info_col_season.njk";
  }

  common.render_content = render_content;

  console.log("render_content", render_content);

  html = await fetch(url);
  html = await html.text();

  renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#info-col").html(renderedHtml);
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

  // var SelectedTeamID = $(InitialBoxScore).attr("TeamID");
  // $(".upcoming-gameview-tab").on("click", function (event, target) {
  //   console.log("clicked this", event, target);

  //   $(".upcoming-gameview-tab").removeClass("selected-bar-button");
  //   let clicked_tab = $(event.target);
  //   let clicked_tab_parent = clicked_tab.closest(".boxscore-bar").attr("id");
  //   let selected_game_filter_selection = clicked_tab.attr(
  //     "GameFilterSelection"
  //   );

  //   $(
  //     ".worldUpcomingTable[" + selected_game_filter_selection + '="1"]'
  //   ).removeClass("w3-hide");
  //   $(
  //     ".worldUpcomingTable[" + selected_game_filter_selection + '="0"]'
  //   ).addClass("w3-hide");

  //   $(clicked_tab).addClass("selected-bar-button");
  // });

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
