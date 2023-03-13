import {
  index_group_sync,
  get,
  nest_children,
  increment_parent,
  deep_copy,
  round_decimal,
} from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { init_basic_table_sorting } from "/static/js/football-table/football-table.js";
import { draw_player_faces, player_face_listeners } from "/static/js/faces.js";
import { geo_marker_action } from "/static/js/modals.js";
import { init_json_edit } from "/common/js/json-edit/json-edit.js";

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
    G: 2,
    C: 1,
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
  let player_team_season_ids = player.player_team_seasons.map((pts) => pts.player_team_season_id);

  const all_seasons = player.player_team_seasons
    .filter((pts) => pts.team_season_id > 0)
    .map((pts) => pts.season);

  const weeks = db.week.find({ season: { $in: all_seasons } });
  const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  var player_team_games = db.player_team_game.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
  var team_games = db.team_game.find({ team_game_id: { $in: team_game_ids } });

  const game_ids = team_games.map((tg) => tg.game_id);
  var games = db.game.find({ game_id: { $in: game_ids } });

  var team_seasons = db.team_season.find({ season: { $in: all_seasons }, team_id: { $gt: 0 } });

  const teams = db.team.find({ team_id: { $gt: 0 } });
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
    G: "Blocking",
    C: "Blocking",
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

  player.player_team_seasons = player.player_team_seasons.filter((pts) => pts.season_stats);

  for (const player_team_season of player.player_team_seasons) {
    console.log({ player_team_season: player_team_season });

    if (player_team_season.season_stats.passing.attempts > 0) {
      player_stats_show["Passing"] = true;
    }
    if (player_team_season.season_stats.rushing.carries > 0) {
      player_stats_show["Rushing"] = true;
    }
    if (player_team_season.season_stats.receiving.targets > 0) {
      player_stats_show["Receiving"] = true;
    }
    if (player_team_season.season_stats.blocking.blocks > 0) {
      player_stats_show["Blocking"] = true;
    }
    if (
      (player_team_season.season_stats.defense.tackles || 0) +
        (player_team_season.season_stats.defense.ints || 0) +
        (player_team_season.season_stats.fumbles.forced || 0) +
        (player_team_season.season_stats.defense.deflections || 0) >
      0
    ) {
      player_stats_show["Defense"] = true;
    }
    if (player_team_season.season_stats.kicking.fga > 0) {
      player_stats_show["Kicking"] = true;
    }
  }

  player.career_stats = {};
  for (const pts of player.player_team_seasons) {
    increment_parent(deep_copy(pts.season_stats), player.career_stats);
  }

  console.log({ player_stats_show: player_stats_show, player: player });

  var url = "/static/html_templates/player/player/player_stats_recent_games_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, {
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

  var renderedHtml = nunjucks_env.renderString(html, {
    page: common.page,
    player_team_season: current_player_team_season,
    player_stats_show: player_stats_show,
    player_team_games: player_team_games,
    all_seasons: all_seasons,
  });

  $("#player-stats-game-log-div").empty();
  $("#player-stats-game-log-div").html(renderedHtml);

  init_basic_table_sorting(common, "#player-stats-game-log-div", 0);

  var url = "/static/html_templates/player/player/player_stats_career_high_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  let game_highs = [
    {
      stat_group: "Passing",
      stats: [
        { display: "Yards", stat_key: "game_stats.passing.yards" },
        { display: "Completion %", stat_key: "passing_completion_percentage" },
        { display: "Attempts", stat_key: "game_stats.passing.attempts" },
        { display: "Completions", stat_key: "game_stats.passing.completions" },
        { display: "TDs", stat_key: "game_stats.passing.tds" },
        { display: "INTs", stat_key: "game_stats.passing.ints" },
      ],
    },
    {
      stat_group: "Rushing",
      stats: [
        { display: "Yards", stat_key: "game_stats.rushing.yards" },
        { display: "TDs", stat_key: "game_stats.rushing.tds" },
        { display: "Carries", stat_key: "game_stats.rushing.carries" },
        { display: "YPC", stat_key: "rushing_yards_per_carry" },
      ],
    },
    {
      stat_group: "Receiving",
      stats: [
        { display: "Yards", stat_key: "game_stats.receiving.yards" },
        { display: "TDs", stat_key: "game_stats.receiving.tds" },
        { display: "Receptions", stat_key: "game_stats.receiving.receptions" },
        { display: "YPC", stat_key: "receiving_yards_per_catch" },
      ],
    },
  ];

  game_highs.forEach(function (game_high_stat_group_obj) {
    let stat_group = game_high_stat_group_obj.stat_group;

    game_high_stat_group_obj.stats.forEach(function (stat_obj) {
      stat_obj.player_team_games = player_team_games.filter(
        (ptg) => get(ptg, stat_obj.stat_key) > 0
      );

      stat_obj.top_5_player_team_games = stat_obj.player_team_games.top_sort(
        5,
        function (ptg_a, ptg_b) {
          return (get(ptg_b, stat_obj.stat_key) || 0) - (get(ptg_a, stat_obj.stat_key) || 0);
        }
      );

      if (stat_obj.top_5_player_team_games.length) {
        stat_obj.top_5_vals = stat_obj.top_5_player_team_games.map((ptg) =>
          get(ptg, stat_obj.stat_key)
        );
        stat_obj.player_team_game = stat_obj.top_5_player_team_games[0];
      }
    });

    game_high_stat_group_obj.stats = game_high_stat_group_obj.stats.filter(
      (s) => s.top_5_player_team_games.length
    );
  });

  game_highs = game_highs.filter((sg) => sg.stats.length);

  var renderedHtml = nunjucks_env.renderString(html, {
    page: common.page,
    player_team_season: current_player_team_season,
    player_stats_show: player_stats_show,
    game_highs: game_highs,
  });

  $("#player-stats-career-high-div").empty();
  $("#player-stats-career-high-div").html(renderedHtml);

  var url = "/static/html_templates/player/player/player_stats_season_stats_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, {
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

export const page_player = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const player_id = parseInt(common.params.player_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = common.season;

  const NavBarLinks = common.nav_bar_links;

  const player = db.player.findOne({ player_id: player_id });
  var player_team_seasons = db.player_team_season.find({ player_id: player_id });
  var player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);

  console.log({
    player_team_season_ids: player_team_season_ids,
    player_team_seasons: player_team_seasons,
    player: player,
    player_id: player_id,
  });

  let recruit_team_seasons = db.recruit_team_season.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const recruit_team_seasons_by_player_team_season_id = index_group_sync(
    recruit_team_seasons,
    "group",
    "player_team_season_id"
  );

  const player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
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
  player.current_player_team_season = player_team_seasons[player_team_seasons.length - 1];

  let all_seasons = player.player_team_seasons
    .filter((pts) => pts.team_season_id >= 0)
    .map((pts) => pts.season);

  var team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });

  var player_team_ids = team_seasons.map((ts) => ts.team_id);
  var player_teams = db.team.find({ team_id: { $in: player_team_ids } });
  let player_teams_by_team_id = index_group_sync(player_teams, "index", "team_id");

  console.log({
    player_teams_by_team_id: player_teams_by_team_id,
    player_teams: player_teams,
  });

  team_seasons = nest_children(team_seasons, player_teams_by_team_id, "team_id", "team");
  let player_team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  console.log({
    team_seasons: team_seasons,
    player_team_seasons_by_team_season_id: player_team_seasons_by_team_season_id,
  });

  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  console.log({
    team_seasons: team_seasons,
    team_season_ids: team_season_ids,
    player_team_seasons: player_team_seasons,
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season =
    player.player_team_seasons[player.player_team_seasons.length - 1];
  var current_team = player.current_player_team_season.team_season.team;

  if (player.current_player_team_season.is_recruit) {
    var team_season = null;

    var team_seasons = db.team_season.find({ season: { $in: all_seasons }, team_id: { $gt: 0 } });
    var teams = db.team.find({ team_id: { $gt: 0 } });
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
    console.log("in else");
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

    var all_teams = db.team.find({ team_id: { $gt: 0 } });
    all_teams = all_teams.sort(function (teamA, teamB) {
      if (teamA.team_location_name < teamB.team_location_name) {
        return -1;
      }
      if (teamA.team_location_name > teamB.team_location_name) {
        return 1;
      }
      return 0;
    });

    const player_team_season_ids = player.player_team_seasons.map(
      (pts) => pts.player_team_season_id
    );
    const team_season_ids = player.player_team_seasons.map((pts) => pts.team_season_id);
    const seasons = player.player_team_seasons.map((pts) => pts.season);
    var player_awards = db.award.find({ player_team_season_id: { $in: player_team_season_ids } });
    var award_set = {};

    var player_team_games = db.player_team_game.find({
      player_team_season_id: { $in: player_team_season_ids },
    });
    var team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
    var team_games = db.team_game.find({ team_game_id: { $in: team_game_ids } });

    var game_ids = team_games.map((tg) => tg.game_id);
    var games = db.game.find({ game_id: { $in: game_ids } });

    var games_by_game_id = index_group_sync(games, "index", "game_id");

    var teams = db.team.find({ team_id: { $gt: 0 } });
    var teams_by_team_id = index_group_sync(teams, "index", "team_id");

    var team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
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

    const weeks = db.week.find({ season: { $in: seasons } });
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
      var conference_seasons = db.conference_season.find({
        conference_season_id: { $in: conference_season_ids },
      });
      const conference_ids = conference_seasons.map((cs) => cs.conference_id);
      const conferences = db.conference.find({ conference_id: { $in: conference_ids } });

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
    G: ["overall", "athleticism", "blocking"],
    C: ["overall", "athleticism", "blocking"],
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
    db.player_team_season.find({ season: season }),
    "index",
    "player_team_season_id"
  );
  const all_team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

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

      rating_obj.bar_width = rating_obj.player_value;
      // if (rating_obj.rating == "Overall") {
      //   rating_obj.bar_width = rating_obj.player_value;
      // } else {
      //   rating_obj.bar_width = rating_obj.player_value * 5;
      // }

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
    G: 7,
    C: 7.1,
    DL: 8,
    EDGE: 9,
    LB: 10,
    CB: 11,
    S: 12,
    K: 13,
    P: 14,
  };

  let current_team_season = player.current_player_team_season.team_season;
  let all_player_team_seasons = db.player_team_season.find({
    team_season_id: current_team_season.team_season_id,
  });
  let player_team_seasons_by_player_id = index_group_sync(
    all_player_team_seasons,
    "index",
    "player_id"
  );
  let player_ids = all_player_team_seasons.map((pts) => pts.player_id);
  let players = db.player.find({ player_id: { $in: player_ids } });

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

  common.page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
    OriginalSecondaryColor: current_team.team_color_secondary_hex,
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

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  draw_player_faces(common);

  await populate_player_stats(common);
  await geo_marker_action(common);

  $(".edit-player-button").on("click", async function () {
    console.log("Clicked edit players");
    $("#edit-player-modal").addClass("shown");
    $("#edit-player-modal").removeClass("hidden");

    let player_to_edit = db.player.findOne({ player_id: common.render_content.player.player_id });
    let pts_to_edit = db.player_team_season.findOne({
      player_id: common.render_content.player.player_id,
      season: common.season,
    });
    player_to_edit.player_team_season = pts_to_edit;
    // let edit_string = JSON.stringify(player_to_edit, null, 2);

    await init_json_edit(common, player_to_edit, "edit-player-body");

    console.log({
      player_to_edit: player_to_edit,
      // edit_string:edit_string
    });

    // $("#edit-player-body").html(edit_string);

    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#edit-player-modal")[0]) {
        $("#edit-player-modal").removeClass("shown");
        $("#edit-player-modal").addClass("hidden");
        $(window).unbind();
      }
    });
  });
};
