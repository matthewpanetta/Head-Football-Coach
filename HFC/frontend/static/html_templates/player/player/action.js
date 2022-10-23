const clean_rating_string = (str) => {
  return str
    .replace(/_/g, " ")
    .split(" ")
    .map(function (word) {
      return word[0].toUpperCase() + word.substr(1);
    })
    .join(" ");
};

const combine_starters_for_position = (depth_chart_list, position) => {
  const starters_by_position = {
    QB: 1,
    RB: 1,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 2,
    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,
    K: 1,
    P: 1,
  };

  const slice_amount = starters_by_position[position];
  var player_team_season_id_list = [];
  for (var team_player_team_season_id_list of depth_chart_list) {
    player_team_season_id_list = player_team_season_id_list.concat(
      team_player_team_season_id_list.slice(0, slice_amount)
    );
  }

  return player_team_season_id_list;
};

function DrawPlayerSeasonStats(data) {
  var columns = [];
  var columns = $.grep(data.Stats, function (n, i) {
    return n.DisplayColumn;
  });

  var Parent = $("#PlayerSeasonStatTableClone").parent();
  var SeasonStatCard = $("<div></div>").addClass("card").addClass("w3-margin-top");
  var Table = $("#PlayerSeasonStatTableClone")
    .clone()
    .addClass("table table-striped table-hover")
    .removeClass("w3-hide")
    .removeAttr("id")
    .attr("id", "PlayerSeasonStatTable-" + data.StatGroupName)
    .css("width", "100%");

  if (data.CareerStats.length > 0) {
    $.each(columns, function () {
      $(Table).find("tfoot tr").append('<td class="bold"></td>');
    });
  }

  $(
    '<div class="w3-bar team-primary-background-bar">' + data.StatGroupName + " Season Stats</div>"
  ).appendTo(SeasonStatCard);
  Table.appendTo(SeasonStatCard);
  console.log({ "data.SeasonStats": data.SeasonStats });

  SeasonStatCard.appendTo(Parent);

  $(Table).find("th").addClass("teamColorBorder");
  $(Table).find("thead tr").addClass("team-secondary-table-row");
}

function DrawPlayerCareerHighs(data) {
  var columns = [];
  var columns = $.grep(data.Stats, function (n, i) {
    return n.DisplayColumn;
  });
  var Parent = $("#PlayerSeasonStatTableClone").parent();

  var CareerHighCard = $("<div></div>").addClass("card").addClass("w3-margin-top");

  var CareerHighTable = $("#PlayerCareerHighTableClone")
    .clone()
    .addClass("table table-striped table-hover")
    .removeClass("w3-hide")
    .removeAttr("id")
    .attr("id", "PlayerCareerHighTable-" + data.StatGroupName)
    .css("width", "100%");

  if (data.CareerStats.length > 0) {
    $.each(columns, function () {
      $(Table).find("tfoot tr").append('<td class="bold"></td>');
    });
  }

  $(
    '<div class="w3-bar team-primary-background-bar">' + data.StatGroupName + " Career Highs</div>"
  ).appendTo(CareerHighCard);
  CareerHighTable.appendTo(CareerHighCard);
  console.log({ "data.CareerHighs": data.CareerHighs });

  CareerHighCard.appendTo(Parent);
  $(CareerHighTable).find("th").addClass("teamColorBorder");
}

const populate_player_stats = async (common) => {
  const db = await common.db;
  const player = common.render_content.player;
  const current_player_team_season = player.current_player_team_season;

  const weeks = await db.week.where({ season: common.season }).toArray();
  const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  var player_team_games = await db.player_team_game
    .where({ player_team_season_id: current_player_team_season.player_team_season_id })
    .toArray();
  const team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
  var team_games = await db.team_game.bulkGet(team_game_ids);

  const game_ids = team_games.map((tg) => tg.game_id);
  var games = await db.game.bulkGet(game_ids);

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  games = nest_children(games, weeks_by_week_id, "week_id", "week");
  const games_by_game_id = index_group_sync(games, "index", "game_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "opponent_team_season_id",
    "opponent_team_season"
  );
  const team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  player_team_games = nest_children(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  console.log({ player_team_games: player_team_games });

  player_team_games = player_team_games.sort(
    (ptg_a, ptg_b) => ptg_a.team_game.game.week_id - ptg_b.team_game.game.week_id
  );

  const recent_game_stats_data = player_team_games.slice(-5);

  console.log({
    player: player,
    player_team_games: player_team_games,
    recent_game_stats_data: recent_game_stats_data,
  });

  const player_stats_show = {
    Passing: false,
    Rushing: false,
    Receiving: false,
    Blocking: false,
    Defense: false,
    Kicking: false,
  };

  const player_stats_show_position_map = {
    QB: "Passing",
    RB: "Rushing",
    FB: "Rushing",
    WR: "Receiving",
    TE: "Receiving",
    OT: "Blocking",
    IOL: "Blocking",
    DL: "Defense",
    EDGE: "Defense",
    LB: "Defense",
    CB: "Defense",
    S: "Defense",
    K: "Kicking",
    P: "Kicking",
  };
  const primary_stat_show = player_stats_show_position_map[player.position];
  const player_season_stat = player.current_player_team_season.season_stats;

  player.player_team_seasons = player.player_team_seasons.filter(pts => pts.season_stats);

  for (const player_team_season of player.player_team_seasons) {
    console.log({ player_team_season: player_team_season });

    if (player_team_season.season_stats.passing.attempts > 0) {player_stats_show["Passing"] = true;}
    if (player_team_season.season_stats.rushing.carries > 0) {player_stats_show["Rushing"] = true;}
    if (player_team_season.season_stats.receiving.targets > 0)
      {player_stats_show["Receiving"] = true;}
    if (player_team_season.season_stats.blocking.blocks > 0) {player_stats_show["Blocking"] = true;}
    if (
      (player_team_season.season_stats.defense.tackles || 0) +
        (player_team_season.season_stats.defense.ints || 0) +
        (player_team_season.season_stats.fumbles.forced || 0) +
        (player_team_season.season_stats.defense.deflections || 0) >
      0
    )
      {player_stats_show["Defense"] = true;}
    if (player_team_season.season_stats.kicking.fga > 0) {player_stats_show["Kicking"] = true;}
  }

  player.career_stats = {};
  for (const pts of player.player_team_seasons) {
    increment_parent(deep_copy(pts.season_stats), player.career_stats);
  }

  console.log({ player_stats_show: player_stats_show, player: player });

  var url = "/static/html_templates/player/player/player_stats_recent_games_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    player_team_season: current_player_team_season,
    player_stats_show: player_stats_show,
    recent_game_stats_data: recent_game_stats_data,
  });

  $("#player-stats-recent-games-div").empty();
  $("#player-stats-recent-games-div").html(renderedHtml);

  init_basic_table_sorting(common, "#player-stats-recent-games-table", 0);

  var url = "/static/html_templates/player/player/player_stats_game_log_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    player_team_season: current_player_team_season,
    player_stats_show: player_stats_show,
    player_team_games: player_team_games,
  });

  $("#player-stats-game-log-div").empty();
  $("#player-stats-game-log-div").html(renderedHtml);

  init_basic_table_sorting(common, "#player-stats-game-log-div", 0);

  var url = "/static/html_templates/player/player/player_stats_season_stats_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    player: player,
    player_team_season: current_player_team_season,
    player_stats_show: player_stats_show,
    player_team_seasons: player.player_team_seasons,
  });

  $("#player-stats-season-stat-div").empty();
  $("#player-stats-season-stat-div").html(renderedHtml);

  $("#player-stats-season-stat-div table").each(function (ind, table) {
    var id = $(table).attr("id");
    init_basic_table_sorting(common, `#${id}`, 0);
    console.log({ id: id, table: table });
  });

  console.log("player_stat", {
    "player.player_team_seasons": player.player_team_seasons,
    player_stat_group: player_stat_group,
    "player_stats_show[player_stat_group]": player_stats_show,
  });
  var FullGameStats = undefined;
  $("#nav-game-log-tab").on("click", function () {
    if (!(FullGameStats == undefined)) {
      return false;
    }
  });

  var clicked_season_stats = false;
  $("#nav-stats-tab").on("click", function () {
    if (clicked_season_stats) {
      return false;
    }
  });

  clicked_season_stats = true;

  for (var player_stat_group in player_stats_show) {
    if (player_stats_show[player_stat_group] == false) {
      continue;
    }
  }
};

const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const player_id = parseInt(common.params.player_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = common.season;
  const index_group_sync = common.index_group_sync;

  const NavBarLinks = await common.nav_bar_links({
    path: "Player",
    group_name: "Player",
    db: db,
  });

  const player = await db.player.get(player_id);
  var player_team_seasons = await db.player_team_season.where({ player_id: player_id }).toArray();
  var player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);

  console.log({
    player_team_season_ids: player_team_season_ids,
    player_team_seasons: player_team_seasons,
  });

  let recruit_team_seasons = await db.recruit_team_season
    .where("player_team_season_id")
    .anyOf(player_team_season_ids)
    .toArray();
  const recruit_team_seasons_by_player_team_season_id = index_group_sync(
    recruit_team_seasons,
    "group",
    "player_team_season_id"
  );

  const player_team_season_stats = await db.player_team_season_stats
    .where("player_team_season_id")
    .anyOf(player_team_season_ids)
    .toArray();
  console.log({
    player_team_season_stats: player_team_season_stats,
  });
  const player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    recruit_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "recruit_team_seasons"
  );

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter((pts) => pts.season == season)[0];

  var team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  var player_team_ids = team_seasons.map((ts) => ts.team_id);
  var player_teams = await db.team.bulkGet(player_team_ids);

  var c = 0;
  $.each(player_team_seasons, function (ind, pts) {
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c += 1;
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player.player_team_seasons.filter(
    (pts) => pts.season == season
  )[0];
  var current_team = player.current_player_team_season.team_season.team;

  console.log({
    current_team: current_team,
    current_player_team_season: player.current_player_team_season,
    player_team_seasons: player.player_team_seasons,
  });

  if (player.player_face == undefined) {
    player.player_face = await common.create_player_face("single", player.player_id, db);
  }

  if (player.current_player_team_season.is_recruit) {
    var team_season = null;

    var team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray();

    var teams = await db.team.where("team_id").above(0).toArray();
    var teams_by_team_id = index_group_sync(teams, "index", "team_id");

    team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
    var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

    console.log({
      "player.current_player_team_season.recruit_team_seasons":
        player.current_player_team_season.recruit_team_seasons,
    });
    if (player.current_player_team_season.recruit_team_seasons) {
      let player_recruit_team_seasons = nest_children(
        player.current_player_team_season.recruit_team_seasons,
        team_seasons_by_team_season_id,
        "team_season_id",
        "team_season"
      );
    }

    var player_interest_entries = Object.entries(
      player.current_player_team_season.recruiting.interests
    );
    player_interest_entries = player_interest_entries.sort(
      (interest_obj_a, interest_obj_b) => interest_obj_b[1] - interest_obj_a[1]
    );
    var top_player_interest_entries = player_interest_entries.filter((i) => i[1] > 3).slice(0, 5);

    var rating_display_map = {
      brand: "Brand",
      facilities: "Facilities",
      location: "Location",
      pro_pipeline: "Pro Pipeline",
      program_history: "Program History",
      fan_support: "Fan Support",
      brand: "Brand",
      team_competitiveness: "Team Competitiveness",
      academic_quality: "Academic Quality",

      close_to_home: "Close to Home",
      playing_time: "Playing Time",
      program_stability: "Program Stability",
    };

    player.current_player_team_season.recruiting.top_player_interest_entries =
      top_player_interest_entries.map((i) => ({
        field_name: i[0],
        display: rating_display_map[i[0]],
      }));

    recruit_team_seasons = recruit_team_seasons.map(function (rts) {
      var rts_interest_entries =
        player.current_player_team_season.recruiting.top_player_interest_entries.map(
          (i) => rts.match_ratings[i.field_name].team
        );
      return Object.assign(rts, { player_interest_entries: rts_interest_entries });
    });

    recruit_team_seasons = recruit_team_seasons.sort(
      (rts_a, rts_b) => rts_b.match_rating - rts_a.match_rating
    );
  } else {
    const season_stat_groupings = [
      {
        StatGroupName: "Passing",
        Stats: [
          {
            FieldName: "GamesPlayed",
            DisplayName: "Games",
            DisplayColumn: true,
            DisplayOrder: 1,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_CompletionsAndAttempts",
            DisplayName: "C/ATT",
            DisplayColumn: true,
            DisplayOrder: 2,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_CompletionPercentage",
            DisplayName: "Pass %",
            DisplayColumn: true,
            DisplayOrder: 2,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "PAS_YardsPerAttempt",
            DisplayName: "YPA",
            DisplayColumn: true,
            DisplayOrder: 2.5,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_Attempts",
            DisplayName: "A",
            DisplayColumn: false,
            DisplayOrder: 3,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_Yards",
            DisplayName: "Pass Yards",
            DisplayColumn: true,
            DisplayOrder: 4,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "PAS_YardsPerGame",
            DisplayName: "Pass YPG",
            DisplayColumn: true,
            DisplayOrder: 4.5,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_TD",
            DisplayName: "Pass TD",
            DisplayColumn: true,
            DisplayOrder: 5,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "PAS_INT",
            DisplayName: "INT",
            DisplayColumn: true,
            DisplayOrder: 6,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_SacksAndYards",
            DisplayName: "Sck/Yrd",
            DisplayColumn: true,
            DisplayOrder: 7,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "PAS_SackYards",
            DisplayName: "Sack Yards",
            DisplayColumn: false,
            DisplayOrder: 998,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
        ],
      },
      {
        StatGroupName: "Rushing",
        Stats: [
          {
            FieldName: "GamesPlayed",
            DisplayName: "Games",
            DisplayColumn: true,
            DisplayOrder: 1,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "RUS_Carries",
            DisplayName: "Car",
            DisplayColumn: true,
            DisplayOrder: 2,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "RUS_Yards",
            DisplayName: "Rush Yards",
            DisplayColumn: true,
            DisplayOrder: 3,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "RUS_YardsPerGame",
            DisplayName: "Rush YPG",
            DisplayColumn: true,
            DisplayOrder: 3.2,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "RUS_YardsPerCarry",
            DisplayName: "YPC",
            DisplayColumn: true,
            DisplayOrder: 3.5,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "RUS_TD",
            DisplayName: "Rush TDs",
            DisplayColumn: true,
            DisplayOrder: 4,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
        ],
      },
      {
        StatGroupName: "Receiving",
        Stats: [
          {
            FieldName: "GamesPlayed",
            DisplayName: "Games",
            DisplayColumn: true,
            DisplayOrder: 1,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "REC_Receptions",
            DisplayName: "Rec",
            DisplayColumn: true,
            DisplayOrder: 2,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "REC_Yards",
            DisplayName: "Rec Yards",
            DisplayColumn: true,
            DisplayOrder: 3,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "REC_YardsPerGame",
            DisplayName: "Rec YPG",
            DisplayColumn: true,
            DisplayOrder: 3.2,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "REC_YardsPerCatch",
            DisplayName: "YPC",
            DisplayColumn: true,
            DisplayOrder: 3.5,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "REC_TD",
            DisplayName: "Rec TDs",
            DisplayColumn: true,
            DisplayOrder: 4,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "REC_Targets",
            DisplayName: "Targets",
            DisplayColumn: true,
            DisplayOrder: 5,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
        ],
      },
      {
        StatGroupName: "Defense",
        Stats: [
          {
            FieldName: "GamesPlayed",
            DisplayName: "Games",
            DisplayColumn: true,
            DisplayOrder: 1,
            SeasonAggregateValue: true,
            SmallDisplay: false,
          },
          {
            FieldName: "DEF_Tackles",
            DisplayName: "Tckl",
            DisplayColumn: true,
            DisplayOrder: 2,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "DEF_Sacks",
            DisplayName: "Sacks",
            DisplayColumn: true,
            DisplayOrder: 3,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "DEF_INT",
            DisplayName: "INTs",
            DisplayColumn: true,
            DisplayOrder: 4,
            SeasonAggregateValue: false,
            SmallDisplay: true,
          },
          {
            FieldName: "DEF_TacklesForLoss",
            DisplayName: "TFL",
            DisplayColumn: true,
            DisplayOrder: 5,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "FUM_Forced",
            DisplayName: "FF",
            DisplayColumn: true,
            DisplayOrder: 6,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
          {
            FieldName: "FUM_Recovered",
            DisplayName: "FR",
            DisplayColumn: true,
            DisplayOrder: 7,
            SeasonAggregateValue: false,
            SmallDisplay: false,
          },
        ],
      },
    ];

    var all_teams = await db.team.where("team_id").above(0).toArray();
    all_teams = all_teams.sort(function (teamA, teamB) {
      if (teamA.school_name < teamB.school_name) {
        return -1;
      }
      if (teamA.school_name > teamB.school_name) {
        return 1;
      }
      return 0;
    });

    const player_team_season_ids = player.player_team_seasons.map(
      (pts) => pts.player_team_season_id
    );
    const team_season_ids = player.player_team_seasons.map((pts) => pts.team_season_id);
    const seasons = player.player_team_seasons.map((pts) => pts.season);
    var player_awards = await db.award
      .where("player_team_season_id")
      .anyOf(player_team_season_ids)
      .toArray();
    var award_set = {};

    var player_team_games = await db.player_team_game
      .where("player_team_season_id")
      .anyOf(player_team_season_ids)
      .toArray();
    var team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
    var team_games = await db.team_game.bulkGet(team_game_ids);

    var game_ids = team_games.map((tg) => tg.game_id);
    var games = await db.game.bulkGet(game_ids);

    var games_by_game_id = index_group_sync(games, "index", "game_id");

    var teams = await db.team.where("team_id").above(0).toArray();
    var teams_by_team_id = index_group_sync(teams, "index", "team_id");

    var team_seasons = await db.team_season.bulkGet(team_season_ids);
    team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

    var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

    team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
    team_games = nest_children(
      team_games,
      team_seasons_by_team_season_id,
      "team_season_id",
      "team_season"
    );
    team_games = nest_children(
      team_games,
      team_seasons_by_team_season_id,
      "team_season_id",
      "opponent_team_season"
    );

    var team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

    player_team_games = nest_children(
      player_team_games,
      team_games_by_team_game_id,
      "team_game_id",
      "team_game"
    );

    var player_team_games_by_player_team_game_id = index_group_sync(
      player_team_games,
      "index",
      "player_team_game_id"
    );

    const weeks = await db.week.where("season").anyOf(seasons).toArray();
    const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

    if (player_awards.length > 0) {
      player_awards = nest_children(player_awards, weeks_by_week_id, "week_id", "week");
      player_awards = nest_children(
        player_awards,
        player_team_games_by_player_team_game_id,
        "player_team_game_id",
        "player_team_game"
      );

      const conference_season_ids = player_awards
        .map((a) => a.conference_season_id)
        .filter((cs_id) => cs_id != null)
        .map((cs_id) => parseInt(cs_id));
      var conference_seasons = await db.conference_season
        .where("conference_season_id")
        .anyOf(conference_season_ids)
        .toArray();

      const conference_ids = conference_seasons.map((cs) => cs.conference_id);
      const conferences = await db.conference
        .where("conference_id")
        .anyOf(conference_ids)
        .toArray();
      const conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

      conference_seasons = nest_children(
        conference_seasons,
        conferences_by_conference_id,
        "conference_id",
        "conference"
      );
      const conference_seasons_by_conference_season_id = index_group_sync(
        conference_seasons,
        "index",
        "conference_season_id"
      );
      player_awards = nest_children(
        player_awards,
        conference_seasons_by_conference_season_id,
        "conference_season_id",
        "conference_season"
      );

      for (const award of player_awards) {
        console.log({ award: award });
        if (!(award.award_group_name in award_set)) {
          award_set[award.award_group_name] = [];
        }
        award_set[award.award_group_name].push(award);
      }
    }
  }

  var award_list = [];
  if (award_set) {
    for (const [award_key, awards] of Object.entries(award_set)) {
      award_list.push({ award_key: award_key, awards: awards });
    }

    award_list = award_list.sort(function (award_obj_a, award_obj_b) {
      return award_obj_a.awards[0].award_id - award_obj_b.awards[0].award_id;
    });
  }

  const position_skill_set_map = {
    QB: ["overall", "athleticism", "passing", "rushing"],
    RB: ["overall", "athleticism", "rushing"],
    FB: ["overall", "athleticism", "rushing", "Blocking"],
    WR: ["overall", "athleticism", "receiving"],
    TE: ["overall", "athleticism", "receiving", "blocking"],
    OT: ["overall", "athleticism", "blocking"],
    IOL: ["overall", "athleticism", "blocking"],
    EDGE: ["overall", "athleticism", "defense"],
    DL: ["overall", "athleticism", "defense"],
    LB: ["overall", "athleticism", "defense"],
    CB: ["overall", "athleticism", "defense"],
    S: ["overall", "athleticism", "defense"],
    K: ["overall", "kicking"],
    P: ["overall", "kicking"],
  };

  const all_rating_groups = {
    overall: "Overall",
    athleticism: "Athleticism",
    passing: "Passing",
    rushing: "Running",
    receiving: "Receiving",
    blocking: "Blocking",
    defense: "Defense",
    kicking: "Kicking",
  };

  const all_player_team_seasons_by_player_team_season_id = index_group_sync(
    await db.player_team_season.where({ season: season }).toArray(),
    "index",
    "player_team_season_id"
  );
  const all_team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  const all_team_seasons_in_conference = all_team_seasons.filter(function (ts) {
    if (player.current_player_team_season.is_recruit) return false;
    return (
      ts.conference_season_id == player.current_player_team_season.team_season.conference_season_id
    );
  });
  const player_position = player.current_player_team_season.position;

  const all_player_team_season_ids_starters_at_position = combine_starters_for_position(
    all_team_seasons.map((ts) => ts.depth_chart[player_position]),
    player.current_player_team_season.position
  );
  const all_conference_player_team_season_ids_starters_at_position = combine_starters_for_position(
    all_team_seasons_in_conference.map((ts) => ts.depth_chart[player_position]),
    player.current_player_team_season.position
  );

  const all_player_team_season_starters_at_position =
    all_player_team_season_ids_starters_at_position.map(
      (pts_id) => all_player_team_seasons_by_player_team_season_id[pts_id]
    );
  const all_conference_player_team_season_starters_at_position =
    all_conference_player_team_season_ids_starters_at_position.map(
      (pts_id) => all_player_team_seasons_by_player_team_season_id[pts_id]
    );

  const skills = [];
  for (var rating_group in all_rating_groups) {
    var rating_group_obj = { rating_group: all_rating_groups[rating_group], ratings: [] };

    if (position_skill_set_map[player_position].includes(rating_group)) {
      rating_group_obj.top_show = true;
    }

    for (var rating in player.current_player_team_season.ratings[rating_group]) {
      var rating_obj = {
        rating: clean_rating_string(rating),
        player_value: player.current_player_team_season.ratings[rating_group][rating],
        all_players: { value_sum: 0, value_count: 0, value: 0 },
        conference_players: { value_sum: 0, value_count: 0, value: 0 },
      };

      if (rating_obj.rating == "Overall") {
        rating_obj.bar_width = rating_obj.player_value;
      } else {
        rating_obj.bar_width = rating_obj.player_value * 5;
      }

      for (const player_team_season of all_player_team_season_starters_at_position) {
        rating_obj.all_players.value_count += 1;
        rating_obj.all_players.value_sum += player_team_season.ratings[rating_group][rating];
      }

      for (const player_team_season of all_conference_player_team_season_starters_at_position) {
        rating_obj.conference_players.value_count += 1;
        rating_obj.conference_players.value_sum += player_team_season.ratings[rating_group][rating];
      }

      rating_obj.all_players.value = round_decimal(
        rating_obj.all_players.value_sum / rating_obj.all_players.value_count,
        1
      );
      rating_obj.conference_players.value = round_decimal(
        rating_obj.conference_players.value_sum / rating_obj.conference_players.value_count,
        1
      );

      rating_group_obj.ratings.push(rating_obj);
    }

    if (rating_group_obj.rating_group_obj == "overall") {
      skills.unshift(rating_group_obj);
    } else {
      skills.push(rating_group_obj);
    }
  }

  let position_sort_map = {
    QB: 1,
    RB: 2,
    FB: 3,
    WR: 4,
    TE: 5,
    OT: 6,
    IOL: 7,
    DL: 8,
    EDGE: 9,
    LB: 10,
    CB: 11,
    S: 12,
    K: 13,
    P: 14,
  };

  let current_team_season = player.current_player_team_season.team_season;
  let all_player_team_seasons = await db.player_team_season
    .where({ team_season_id: current_team_season.team_season_id })
    .toArray();
  let player_team_seasons_by_player_id = index_group_sync(
    all_player_team_seasons,
    "index",
    "player_id"
  );
  let player_ids = all_player_team_seasons.map((pts) => pts.player_id);
  let players = await db.player.bulkGet(player_ids);

  players = nest_children(
    players,
    player_team_seasons_by_player_id,
    "player_id",
    "player_team_season"
  );
  players = players.sort(function (player_a, player_b) {
    return (
      position_sort_map[player_a.player_team_season.position] -
        position_sort_map[player_b.player_team_season.position] ||
      player_b.player_team_season.ratings.overall.overall -
        player_a.player_team_season.ratings.overall.overall
    );
  });

  console.log("all_player_team_seasons", {
    player: player,
    current_team: current_team,
    skills: skills,
    all_conference_player_team_season_starters_at_position:
      all_conference_player_team_season_starters_at_position,
    all_player_team_season_starters_at_position: all_player_team_season_starters_at_position,
    all_team_seasons: all_team_seasons,
    all_conference_player_team_season_ids_starters_at_position:
      all_conference_player_team_season_ids_starters_at_position,
    all_player_team_season_ids_starters_at_position:
      all_player_team_season_ids_starters_at_position,
    "player.current_player_team_season.team_season": player.current_player_team_season.team_season,
    all_team_seasons_in_conference: all_team_seasons_in_conference,
    player_position: player_position,
    all_player_team_season_ids_starters_at_position:
      all_player_team_season_ids_starters_at_position,
  });

  //var player_team_games = await db.player_team_game.where({player_team_season_id: player.current_player_team_season.player_team_season_id}).toArray()
  common.page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
    NavBarLinks: NavBarLinks,
    page_title: "Player Profile - " + player.full_name,
    page_icon: current_team.team_logo,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    all_teams: all_teams,
    player: player,
    current_team: current_team,
    skills: skills,
    player_team_games: player_team_games,
    player_awards: player_awards,
    award_list: award_list,
    recruit_team_seasons: recruit_team_seasons,
    players: players,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/player/player/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  common.display_player_face(
    common.render_content.player.player_face,
    {
      jersey: common.render_content.player.current_player_team_season.team_season.team.jersey,
      teamColors:
        common.render_content.player.current_player_team_season.team_season.team.jersey.teamColors,
    },
    "PlayerFace"
  );
  await populate_player_stats(common);
  await common.geo_marker_action(common);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Player/:player_id/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
