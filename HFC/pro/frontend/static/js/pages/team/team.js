import {
  index_group_sync,
  get,
  set,
  distinct,
  sum,
  nest_children,
  intersect,
  set_intersect,
  union,
  set_union,
  except,
  set_except,
  get_from_dict,
  deep_copy,
  elem_in,
} from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { draw_player_faces, player_face_listeners, draw_coach_faces } from "/static/js/faces.js";
import { conference_standings, team_header_links } from "/static/js/widgets.js";

function ResArrowSize() {
  $("#addedStyle").remove();

  var bodyWidth = $(".SelectedGameBox").width();

  var side_length = bodyWidth / 2;

  var team_color = $(".SelectedGameBox").css("background-color");

  var styleAdd = "";
  styleAdd += `border-left-width: ${side_length}px;`;
  styleAdd += `border-right-width: ${side_length}px;`;
  styleAdd += `border-width: 15px ${side_length}px 0;`;
  styleAdd += `border-top-color: ${team_color};`;

  $('<style id="addedStyle">.SelectedGameBox::after{' + styleAdd + "}</style>").appendTo("head");
}

function DrawSchedule() {
  $(window).off("resize");
  ResArrowSize();
  $(window).resize(function () {
    ResArrowSize();
  });
}

function AddBoxScoreListeners() {
  var InitialBoxScore = $(".selected-boxscore-tab")[0];

  var SelectedTeamID = $(InitialBoxScore).attr("TeamID");

  $("button.boxscore-tab").on("click", function (event, target) {
    var ClickedTab = $(event.currentTarget);
    var ClickedTabParent = ClickedTab.closest(".boxscore-bar").attr("id");
    var SelectedTeamID = ClickedTab.attr("TeamID");
    var SelectedGameID = ClickedTab.attr("GameID");

    $.each($("#" + ClickedTabParent + " > .selected-boxscore-tab"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).removeClass("selected-boxscore-tab");
      var TargetTabParent = TargetTab.closest(".boxscore-bar").attr("id");

      var UnselectedTeamID = TargetTab.attr("TeamID");
      var UnselectedGameID = TargetTab.attr("GameID");

      $(
        '.team-highlights[TeamID="' + UnselectedTeamID + '"][GameID="' + UnselectedGameID + '"]'
      ).addClass("w3-hide");
    });

    $(ClickedTab).addClass("selected-boxscore-tab");
    $('.team-highlights[TeamID="' + SelectedTeamID + '"]').removeClass("w3-hide");
  });
}

function AddScheduleListeners() {
  var InitialGameBox = $(".SelectedGameBox")[0];
  var SelectedGameID = $(InitialGameBox).attr("BoxScoreGameID");
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + SelectedGameID + '"]').removeClass(
    "w3-hide"
  );

  $(".teamScheduleGameBox").on("click", function (event, target) {
    var ClickedTab = $(event.target).closest(".teamScheduleGameBox");
    var SelectedGameID = ClickedTab.attr("BoxScoreGameID");
    $.each($(".SelectedGameBox"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).removeClass("SelectedGameBox");

      var UnselectedGameID = TargetTab.attr("BoxScoreGameID");

      $(
        '.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + UnselectedGameID + '"]'
      ).addClass("w3-hide");
    });

    $(ClickedTab).addClass("SelectedGameBox");
    ResArrowSize();
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + SelectedGameID + '"]').removeClass(
      "w3-hide"
    );
  });
}

export const page_team = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = common.params.team_id;
  const db = common.db;
  const season = common.params.season || common.season;
  common.season = season;

  let weeks = db.week.find({ season: season });
  let weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  common.stopwatch(common, "Time after fetching weeks");

  var teams = db.team.find({ team_id: { $gt: 0 } });
  teams = teams.sort(function (teamA, teamB) {
    if (teamA.school_name < teamB.school_name) {
      return -1;
    }
    if (teamA.school_name > teamB.school_name) {
      return 1;
    }
    return 0;
  });

  const team = db.team.findOne({ team_id: team_id });
  const team_season = db.team_season.findOne({
    team_id: team_id,
    season: season,
  });
  const team_season_stats = db.team_season_stats.findOne({
    team_season_id: team_season.team_season_id,
  });

  team_season.season_stats = team_season_stats;
  common.current_team_season = team_season;

  common.stopwatch(common, "Time after fetching teams");

  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = team_header_links({
    path: "Overview",
    season: common.params.season,
    db: db,
    team: team,
  });

  common.stopwatch(common, "Time after fetching navbar links");

  let conference_seasons = db.conference_season.find({ season: season });
  const conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  let conferences = db.conference.find();
  const conference_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  common.stopwatch(common, "Time after fetching conferences");

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
  team.team_season.conference_season.conference =
    conference_by_conference_id[team.team_season.conference_season.conference_id];

  var team_games = db.team_game.find({ team_season_id: team_season.team_season_id });
  team_games.forEach(tg => tg.team_season = team_season);
  team_games.forEach(tg => tg.team_season.team = team);
  let team_games_by_game_id = index_group_sync(team_games, "index", "game_id");

  const game_ids = team_games.map((game) => parseInt(game.game_id));

  let games = db.game.find({ game_id: { $in: game_ids } });
  games = nest_children(games, team_games_by_game_id, "game_id", "team_game");

  common.stopwatch(common, "Time after fetching games");

  const opponent_team_game_ids = team_games.map((team_game) => team_game.opponent_team_game_id);
  let opponent_team_games = db.team_game.find({ team_game_id: { $in: opponent_team_game_ids } });

  const opponent_team_season_ids = opponent_team_games.map((team_game) =>
    parseInt(team_game.team_season_id)
  );
  let opponent_team_seasons = db.team_season.find({
    team_season_id: { $in: opponent_team_season_ids },
  });

  const opponent_team_ids = opponent_team_seasons.map((team_season) =>
    parseInt(team_season.team_id)
  );
  const opponent_teams = db.team.find({ team_id: { $in: opponent_team_ids } });

  let opponent_teams_by_team_id = index_group_sync(opponent_teams, "index", "team_id");
  opponent_team_seasons = nest_children(
    opponent_team_seasons,
    opponent_teams_by_team_id,
    "team_id",
    "team"
  );

  let opponent_team_seasons_by_team_season_id = index_group_sync(
    opponent_team_seasons,
    "index",
    "team_season_id"
  );
  opponent_team_games = nest_children(
    opponent_team_games,
    opponent_team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  let opponent_team_games_by_game_id = index_group_sync(opponent_team_games, "index", "game_id");

  games = nest_children(games, team_games_by_game_id, "game_id", "team_game");
  games = nest_children(games, opponent_team_games_by_game_id, "game_id", "opponent_team_game");
  games = nest_children(games, weeks_by_week_id, "week_id", "week");

  const headline_ids = team.team_season.headlines;
  var headlines = db.headline.find({ headline_id: { $in: headline_ids } });
  headlines = nest_children(headlines, weeks_by_week_id, "week_id", "week");
  let headlines_by_game_id = index_group_sync(headlines, "group", "game_id");

  headlines = headlines.sort((h_a, h_b) => h_b.week_id - h_a.week_id);

  common.stopwatch(common, "Time after fetching headlines");

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  common.stopwatch(common, "Time after fetching opp teams");

  for (var headline of headlines) {
    headline.team_seasons = [];
    for (var team_season_id of headline.team_season_ids) {
      headline.team_seasons.push(team_seasons_by_team_season_id[team_season_id]);
    }
  }

  console.log({
    headlines: headlines,
    headline_ids: headline_ids,
    headlines_by_game_id: headlines_by_game_id,
  });

  games = games.sort((g_a, g_b) => g_a.week_id - g_b.week_id);

  var counter_games = 0;
  var selected_game_chosen = false;
  var selected_game_id = 0;
  var games_played = games.filter((g) => g.was_played == true).length;
  if (games_played == 0) {
    //no games played
    selected_game_chosen = true;
    selected_game_id = games[0].game_id;
  } else if (games_played == games.length) {
    //All games played
    selected_game_chosen = true;
    selected_game_id = games[games.length - 1].game_id;
  }

  var team_game_ids = opponent_team_game_ids.concat(team_games.map((tg) => tg.team_game_id));

  common.stopwatch(common, "Time after fetching players");

  console.log({
    games: games,
  });

  for (let game of games) {
    if (!selected_game_chosen && !game.was_played) {
      game.selected_game_box = "SelectedGameBox";
      selected_game_id = game.game_id;
      selected_game_chosen = true;
    } else if (selected_game_chosen && selected_game_id == game.game_id) {
      game.selected_game_box = "SelectedGameBox";
    } else {
      game.selected_game_box = "";
    }

    game.week_name = game.week.week_name;
    if (game.week_name == "Conference Championships") {
      game.week_name =
        team.team_season.conference_season.conference.conference_abbreviation + " Champ";
    }

    game.headlines = headlines_by_game_id[game.game_id];

    game.game_display = "Preview";
    game.game_result_letter = "";
    if (game.was_played) {
      game.game_display = game.score_display;

      if (game.outcome.winning_team.team_id == team.team_id) {
        game.game_result_letter = "W";
      } else {
        game.game_result_letter = "L";
      }
    }

    if (game.home_team_season_id == team.team_season.team_season_id) {
      game.game_location = "home";
      game.game_location_char = "vs.";
      game.home_team = team;
      game.home_team_season = team_season;
      game.home_team_game = game.team_game;
      game.away_team = game.opponent_team_game.team_season.team;
      game.away_team_season = game.opponent_team_game.team_season;
      game.away_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.home_team_winning_game_bold = "bold";
      }
    } else {
      game.game_location = "away";
      game.game_location_char = "@";
      game.away_team = team;
      game.away_team_season = team_season;
      game.away_team_game = game.team_game;
      game.home_team = game.opponent_team_game.team_season.team;
      game.home_team_season = game.opponent_team_game.team_season;
      game.home_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.away_team_winning_game_bold = "bold";
      }
    }

    game.opponent_rank_string = game.opponent_team_game.team_season.national_rank_display;
    if (game.opponent_team_game.national_rank != null) {
      game.opponent_rank_string = game.opponent_team_game.national_rank_display;
    }

    counter_games += 1;
  }

  let current_week = weeks.find(w => w.is_current);
  let this_week_game = games.find(g => g.week.week_id == current_week.week_id);
  let last_week_game = games.find(g => g.week.week_id == current_week.week_id - 1);

  var signed_player_team_season_ids = []; //TODO
  var signed_player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: signed_player_team_season_ids },
  });

  var signed_player_ids = signed_player_team_seasons.map((pts) => pts.player_id);
  var signed_players = db.player.find({ player_id: { $in: signed_player_ids } });

  var signed_players_by_player_id = index_group_sync(signed_players, "index", "player_id");

  let show_season = common.params.season && common.params.season < common.season;
  let season_to_show = common.params.season;
  common.page = {
    page_title: team.full_name,
    page_icon: team.team_logo,
    PrimaryColor: team.team_color_primary_hex,
    SecondaryColor: team.secondary_color_display,
    OriginalSecondaryColor: team.team_color_secondary_hex,
    NavBarLinks: NavBarLinks,
    TeamHeaderLinks: TeamHeaderLinks,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    team_id: team_id,
    team: team,
    games: games,
    this_week_game:this_week_game,
    last_week_game:last_week_game,
    teams: teams,
    all_teams: await common.all_teams(common, ""),
    conference_standings: conference_standings,
    headlines: headlines,
    games_played: games_played,
    show_season: show_season,
    season_to_show: season_to_show,
  };

  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/team/team/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await team_action(common);
};

const draw_helmet = async (common) => {
  let divs = $('.helmet-div').toArray();
  let db = common.db;

  var helmet_url = "/static/img/svg/helmet.svg";
  var helmet_html = await fetch(helmet_url);
  let helmet_svg = await helmet_html.text();

  divs.forEach(function(div){
    let team_id = parseInt($(div).attr('team-id'));
    let team = db.team.findOne({team_id: team_id});

    var renderedHtml = nunjucks_env.renderString(helmet_svg, {team: team});

    $(div).append(renderedHtml);

    console.log({
      team:team, team_id:team_id, renderedHtml:renderedHtml, helmet_svg:helmet_svg, div:div
    })
  })
} 

const team_action = async (common) => {
  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawSchedule();
  await draw_helmet(common);

  initialize_headlines();
  await common.geo_marker_action(common);

  var stats_first_click = false;
  $("#nav-team-stats-tab").on("click", async function () {
    if (stats_first_click) {
      return false;
    }
    stats_first_click = true;

    var db = common.db;
    var season = common.season;

    var team = common.render_content.team;
    var player_team_seasons = db.player_team_season.find({
      team_season_id: common.current_team_season.team_season_id,
    });

    const player_ids = player_team_seasons.map((pts) => pts.player_id);
    const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
    let player_team_season_stats = db.player_team_season_stats.find({
      player_team_season_id: { $in: player_team_season_ids },
    });
    let players = db.player.find({ player_id: { $in: player_ids } });

    const player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );

    const players_by_player_id = index_group_sync(players, "index", "player_id");

    player_team_seasons = nest_children(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );
    common.current_team_season.team = common.render_content.team;
    player_team_seasons.forEach((pts) => (pts.team_season = common.current_team_season));

    var conf_standings = await conference_standings(
      team.team_season.conference_season_id,
      [team.team_season.team_season_id],
      common
    );

    player_team_seasons = player_team_seasons.filter(
      (pts) => pts.team_season_id == team.team_season.team_season_id
    );

    const team_leaders = [];
    const team_leaders_raw = [
      { stat_group: "passing", stat: "yards", display: "Leading Passer" },
      { stat_group: "rushing", stat: "yards", display: "Leading Rusher" },
      { stat_group: "receiving", stat: "yards", display: "Leading Receiver" },
      { stat_group: "defense", stat: "sacks", display: "Leading Pass Rusher" },
      { stat_group: "defense", stat: "tackles", display: "Leading Tackler" },
      { stat_group: "defense", stat: "ints", display: "Leading Pass Defender" },
    ];
    for (var stat_detail of team_leaders_raw) {
      player_team_seasons = player_team_seasons.sort(function (pts_a, pts_b) {
        return (
          (pts_b.season_stats[stat_detail.stat_group][stat_detail.stat] || 0) -
          (pts_a.season_stats[stat_detail.stat_group][stat_detail.stat] || 0)
        );
      });

      if (player_team_seasons[0].season_stats[stat_detail.stat_group][stat_detail.stat] > 0) {
        stat_detail.player_team_season = player_team_seasons[0];
        team_leaders.push(stat_detail);
      }
    }

    const team_stats = [
      {
        display: "Points Per Game",
        stats: {
          OFFENSE: { stat: "points_per_game", sort: "desc" },
          DEFENSE: { stat: "points_allowed_per_game", sort: "asc" },
          DIFF: { stat: "point_differential_per_game", sort: "desc" },
        },
      },
      {
        display: "Yards Per Game",
        stats: {
          OFFENSE: { stat: "yards_per_game", sort: "desc" },
          DEFENSE: { stat: "yards_allowed_per_game", sort: "asc" },
          DIFF: { stat: "yards_per_game_diff", sort: "desc" },
        },
      },
      {
        display: "Third Down Efficiency",
        stats: {
          OFFENSE: { stat: "third_down_conversion_percentage", sort: "desc" },
          DEFENSE: {
            stat: "defensive_third_down_conversion_percentage",
            sort: "asc",
          },
          DIFF: { stat: "third_down_conversion_percentage_diff", sort: "desc" },
        },
      },
      {
        display: "Takeaways",
        stats: {
          "Take aways": { stat: "takeaways", sort: "desc" },
          "Give aways": { stat: "turnovers", sort: "asc" },
          "+/-": { stat: "turnover_diff", sort: "desc" },
        },
      },
    ];

    var all_team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
    const team_season_ids = all_team_seasons.map((ts) => ts.team_season_id);
    const team_season_stats = db.team_season_stats.find({
      team_season_id: { $in: team_season_ids },
    });
    const team_season_stats_by_team_season_id = index_group_sync(
      team_season_stats,
      "index",
      "team_season_id"
    );

    all_team_seasons = nest_children(
      all_team_seasons,
      team_season_stats_by_team_season_id,
      "team_season_id",
      "stats"
    );

    var tier_map = {
      1: "elite",
      2: "great",
      3: "good",
      4: "average",
      5: "poor",
      6: "bad",
      7: "terrible",
    };

    console.log("team_stats", {
      team_stats: team_stats,
      all_team_seasons: all_team_seasons,
    });
    all_team_seasons = all_team_seasons.filter(
      (ts) => ts.stats.season_stats.games.games_played > 0
    );

    for (var stat_group of team_stats) {
      console.log("stat_group", stat_group);
      for (var stat_detail_key in stat_group.stats) {
        var stat_detail = stat_group.stats[stat_detail_key];
        console.log({
          team: team,
          "team.team_season.season_stats": team.team_season.season_stats,
          stat_detail: stat_detail,
          stat_detail_key: stat_detail_key,
          stat_group: stat_group,
          team_stats: team_stats,
        });
        stat_detail.team_value = team.team_season.season_stats[stat_detail.stat];

        console.log({
          all_team_seasons: all_team_seasons,
          stat_detail: stat_detail,
        });
        let all_team_season_stat_value = all_team_seasons
          .map((ts) => ts.stats[stat_detail.stat])
          .sort(function (value_a, value_b) {
            if (stat_detail.sort == "desc") {
              return value_b - value_a;
            } else {
              return value_a - value_b;
            }
            return 0;
          });

        stat_detail.team_rank =
          all_team_season_stat_value.indexOf(team.team_season.season_stats[stat_detail.stat]) + 1;
        stat_detail.total_teams = all_team_seasons.length;
        //console.log({all_team_seasons:all_team_seasons, stat_detail:stat_detail, all_team_season_stat_value:all_team_season_stat_value})
        stat_detail.tier =
          tier_map[
            common.tier_placement(7, all_team_seasons.length, "Normal", stat_detail.team_rank)
          ];
      }
    }

    var url = "/static/html_templates/team/team/conference_standings_tbody_template.njk";
    var html = await fetch(url);
    html = await html.text();

    console.log({ conf_standings: conf_standings });

    var renderedHtml = nunjucks_env.renderString(html, {
      conference_standings: conf_standings,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#conference_standings_div").append(renderedHtml);

    var url = "/static/html_templates/team/team/team_leaders_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = nunjucks_env.renderString(html, {
      page: common.render_content.page,
      team_leaders: team_leaders,
    });
    console.log({ team_leaders: team_leaders, renderedHtml: renderedHtml });

    $("#team_leaders").append(renderedHtml);

    var url = "/static/html_templates/team/team/team_stats_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = nunjucks_env.renderString(html, {
      team_stats: team_stats,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#team_stats").append(renderedHtml);

    await player_face_listeners(common);

    console.log({
      "conference_standings.conference_standings,": conf_standings.conference_standings,
    });

    if (team_leaders.length > 0) {
      // conference_bar_chart(conf_standings.conference_standings, common);
      rankings_trend_chart(team, common);
      // TODO fix these
    }
  });

  var info_first_click = false;
  $("#nav-info-tab").on("click", async function () {
    //console.log({info_first_click:info_first_click})
    if (info_first_click) {
      return false;
    }
    info_first_click = true;

    var team = common.render_content.team;
    var db = common.db;
    var season = common.season;
    var all_teams = db.team.find({ team_id: { $gt: 0 } });

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
    };

    console.log({
      "common.render_content": common.render_content,
      team: team,
      all_teams: all_teams,
    });

    for (const rating in team.team_ratings) {
      //console.log({rating:rating})
      all_teams = all_teams.sort(
        (t_a, t_b) => get(t_b, "team_ratings." + rating) - get(t_a, "team_ratings." + rating)
      );
      var attribute_map = all_teams.map((t) => get(t, "team_ratings." + rating));

      team.team_ratings[rating] = { value: team.team_ratings[rating], rank: 0 };
      team.team_ratings[rating].rank = attribute_map.indexOf(team.team_ratings[rating].value) + 1;

      team.team_ratings[rating].display = rating_display_map[rating];
    }

    //console.log({team:team})

    var url = "/static/html_templates/team/team/team_info_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = nunjucks_env.renderString(html, {
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-info").append(renderedHtml);
    await draw_map(common);
  });

  var coaches_first_click = false;
  $("#nav-coaches-tab").on("click", async function () {
    if (coaches_first_click) {
      return false;
    }
    coaches_first_click = true;

    let coaching_position_info = {
      HC: { coaching_position: "HC", order: 1, full_name: "Head Coach" },
      OC: { coaching_position: "OC", order: 2, full_name: "Offensive Coordinator" },
      DC: { coaching_position: "DC", order: 3, full_name: "Defensive Coordinator" },
      ST: { coaching_position: "ST", order: 4, full_name: "Special Teams Coordinator" },
    };

    let team = common.render_content.team;
    let team_season = team.team_season;
    let db = common.db;
    let season = common.season;

    let coach_team_seasons = db.coach_team_season.find({
      team_season_id: team_season.team_season_id,
    });
    let coach_ids = coach_team_seasons.map((cts) => cts.coach_id);
    let coaches = db.coach.find({ coach_id: { $in: coach_ids } });
    let coaches_by_coach_id = index_group_sync(coaches, "index", "coach_id");

    coach_team_seasons = nest_children(
      coach_team_seasons,
      coaches_by_coach_id,
      "coach_id",
      "coach"
    );
    coach_team_seasons = nest_children(
      coach_team_seasons,
      coaching_position_info,
      "coaching_position",
      "coaching_position_info"
    );
    coach_team_seasons = coach_team_seasons.sort(
      (cts_a, cts_b) => cts_a.coaching_position_info.order - cts_b.coaching_position_info.order
    );

    let render_content = {
      team: team,
      coach_team_seasons: coach_team_seasons,
      page: common.render_content.page,
    };

    var url = "/static/html_templates/team/team/team_coaches_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = nunjucks_env.renderString(html, render_content);
    console.log({ renderedHtml: renderedHtml, render_content: render_content });

    $("#nav-coaches").append(renderedHtml);
    await draw_coach_faces(common);
  });

  var rivals_first_click = false;
  $("#nav-rivals-tab").on("click", async function () {
    if (rivals_first_click) {
      return false;
    }
    rivals_first_click = true;

    var db = common.db;
    var season = common.season;

    var team = common.render_content.team;
    let rivals = team.rivals;
    let rival_team_ids = new Set(rivals.map((r) => r.opponent_team_id));

    let team_seasons = db.team_season.find({ team_id: team.team_id });
    let team_season_ids = team_seasons.map((ts) => ts.team_season_id);
    // team_season_ids = new Set(team_season_ids);

    var rival_teams = db.team.find({ team_id: { $inSet: rival_team_ids } });
    let rival_teams_by_team_id = index_group_sync(rival_teams, "index", "team_id");

    let rival_team_seasons = db.team_season.find({ team_id: { $inSet: rival_team_ids } });

    let rival_team_seasons_by_team_id = index_group_sync(rival_team_seasons, "group", "team_id");

    let rival_team_season_ids = rival_team_seasons.map((ts) => ts.team_season_id);

    let weeks = db.week.find();
    let weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

    let all_team_season_ids = Array.from(team_season_ids).concat(Array.from(rival_team_season_ids));
    let all_team_season_id_set = new Set(all_team_season_ids);

    let team_games = db.team_game
      .find({ team_season_id: { $in: all_team_season_ids } })
      .filter(
        (tg) =>
          elem_in(tg.team_season_id, all_team_season_id_set) &&
          elem_in(tg.opponent_team_season_id, all_team_season_id_set)
      );
    let team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

    let game_ids = team_games.map((tg) => tg.game_id);

    let all_games = db.game.find({ game_id: { $in: game_ids } });
    all_games = nest_children(all_games, weeks_by_week_id, "week_id", "week");
    let all_games_by_game_id = index_group_sync(all_games, "index", "game_id");

    console.log({
      all_games_by_game_id: all_games_by_game_id,
      all_games: all_games,
      team_games_by_team_game_id: team_games_by_team_game_id,
      team_games: team_games,
      rival_teams_by_team_id: rival_teams_by_team_id,
      rival_team_seasons: rival_team_seasons,
      rivals: rivals,
      all_team_season_ids: all_team_season_ids,
      team_season_ids: team_season_ids,
      team_seasons: team_seasons,
    });

    for (let rivalry of rivals) {
      rivalry.team = rival_teams_by_team_id[rivalry.opponent_team_id];
      rivalry.team_seasons = rival_team_seasons_by_team_id[rivalry.opponent_team_id] || [];

      rivalry.team_season_ids = new Set(rivalry.team_seasons.map((ts) => ts.team_season_id));

      rivalry.team_games = team_games.filter(
        (tg) =>
          elem_in(tg.team_season_id, rivalry.team_season_ids) &&
          elem_in(tg.opponent_team_season_id, team_season_ids)
      );

      rivalry.team_games = nest_children(
        rivalry.team_games,
        all_games_by_game_id,
        "game_id",
        "game"
      );
      rivalry.team_games.forEach(function (tg) {
        tg.opponent_team_game = team_games_by_team_game_id[tg.opponent_team_game_id];

        if (tg.game.was_played) {
          if (tg.is_winning_team) {
            tg.game.winning_team = rivalry.team;
          } else {
            tg.game.winning_team = team;
          }

          // tg.game.score_display = `${tg.game.outcome.winning_team.points} - ${tg.game.outcome.losing_team.points}`;
        }
      });

      rivalry.team_games = rivalry.team_games.sort((tg_a, tg_b) => tg_a.week_id - tg_b.week_id);

      rivalry.played_team_games = rivalry.team_games.filter((tg) => tg.game.was_played);

      rivalry.first_team_game = rivalry.played_team_games[0];
      rivalry.last_team_game = rivalry.played_team_games[rivalry.played_team_games.length - 1];

      rivalry.record = {
        wins: 0,
        losses: 0,
        games_played: 0,
        scheduled_games: 0,
        points_scored: 0,
        points_allowed: 0,
      };

      let streak_list = [];
      rivalry.team_games.forEach(function (tg) {
        if (tg.game.was_played) {
          rivalry.record.games_played += 1;
          rivalry.record.points_scored += tg.points;
          rivalry.record.points_allowed += tg.opponent_team_game.points;
          if (tg.is_winning_team) {
            rivalry.record.wins += 1;
          } else {
            rivalry.record.losses += 1;
          }
        } else {
          rivalry.record.scheduled_games += 1;
        }

        if (tg.game.was_played) {
          if (streak_list.length == 0) {
            streak_list.push({
              team: tg.game.winning_team,
              count: 1,
              first_season: tg.game.week.season,
              last_season: tg.game.week.season,
            });
          } else {
            let latest_streak_obj = streak_list[streak_list.length - 1];
            if (tg.game.winning_team.team_id == latest_streak_obj.team.team_id) {
              latest_streak_obj.count += 1;
              latest_streak_obj.last_season = tg.game.week.season;
            } else {
              streak_list.push({
                team: tg.game.winning_team,
                count: 1,
                first_season: tg.game.week.season,
                last_season: tg.game.week.season,
              });
            }
          }
        }
      });

      rivalry.latest_streak = streak_list[streak_list.length - 1];
      streak_list = streak_list.sort((str_a, str_b) => str_b.count - str_a.count);
      rivalry.longest_streak = streak_list[0];

      let all_time_series = {
        leader: null,
        wins: rivalry.record.wins,
        losses: rivalry.record.losses,
      };
      if (rivalry.record.wins > rivalry.record.losses) {
        all_time_series = {
          leader: rivalry.team,
          wins: rivalry.record.wins,
          losses: rivalry.record.losses,
        };
      } else if (rivalry.record.wins < rivalry.record.losses) {
        all_time_series = {
          leader: team,
          wins: rivalry.record.losses,
          losses: rivalry.record.wins,
        };
      }

      let all_time_points = {
        leader: null,
        points_for: rivalry.record.points_scored,
        points_allowed: rivalry.record.points_allowed,
      };
      if (rivalry.record.points_scored > rivalry.record.points_allowed) {
        all_time_points = {
          leader: rivalry.team,
          points_for: rivalry.record.points_scored,
          points_allowed: rivalry.record.points_allowed,
        };
      } else if (rivalry.record.points_scored < rivalry.record.points_allowed) {
        all_time_points = {
          leader: team,
          points_for: rivalry.record.points_allowed,
          points_allowed: rivalry.record.points_scored,
        };
      }

      rivalry.all_time_series = all_time_series;
      rivalry.all_time_points = all_time_points;
    }

    rivals = rivals.sort(
      (r_a, r_b) =>
        r_b.record.games_played - r_a.record.games_played ||
        r_b.record.scheduled_games - r_a.record.scheduled_games
    );

    var url = "/static/html_templates/team/team/team_rivals_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = nunjucks_env.renderString(html, {
      rivals: rivals,
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-rivals").append(renderedHtml);
    let mason = $(".grid").masonry({
      // options
      itemSelector: ".grid-item",
      columnWidth: ".grid-sizer",
      percentPosition: true,
      gutter: ".gutter-sizer",
    });
  });
};

function rankings_trend_chart(team, common) {
  console.log({ team: team, common: common });

  let rank_trends = [];
  let rank_count = team.team_season.rankings.division_rank.length;

  for (var week_counter = 1; week_counter < rank_count; week_counter++) {
    rank_trends.push({
      week: week_counter,
      ranks: {
        conference_rank: team.team_season.rankings.division_rank[rank_count - week_counter],
        national_rank: team.team_season.rankings.national_rank[rank_count - week_counter],
      },
    });
  }

  console.log({ rank_trends: rank_trends });

  var team_ranking_trend_chart_div = document.getElementById("team_ranking_trend_chart");

  var height = 300,
    width = team_ranking_trend_chart_div.clientWidth * 0.75,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  /* Set the ranges */
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);

  /* Define the line */
  var valueline = d3
    .line()
    .x(function (d) {
      console.log({ d: d, v: d.week });
      return x(d.week);
    })
    .y(function (d) {
      console.log({ d: d, v: d.ranks.national_rank });
      return y(d.ranks.national_rank);
    });

  /* Add the SVG element */
  var svg = d3
    .select("#team_ranking_trend_chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  /* Set the color of the line */
  var lineColor = "#" + team.team_color_primary_hex;

  svg
    .append("path")
    .datum(rank_trends)
    .attr("class", "line")
    .style("stroke", lineColor)
    .style("stroke-width", "2px")
    .style("stroke-linecap", "round")
    // .attr("d", valueline)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.week);
        })
        .y(function (d) {
          return y(d.ranks.national_rank);
        })
    );

  /* Scale the range of the data */
  x.domain(
    d3.extent(rank_trends, function (d) {
      return d.week;
    })
  );
  y.domain([Math.max(...rank_trends.map((r) => r.ranks.national_rank)) + 5, 1]);

  /* Add the valueline path */

  console.log({
    svg: svg,
    valueline: valueline,
    rank_trends: rank_trends,
    lineColor: lineColor,
  });

  /* Add the X Axis */
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  /* Add the Y Axis */
  svg.append("g").call(d3.axisLeft(y));

  /* Update the graph on window resize */
  window.addEventListener("resize", function () {
    /* Get the new window dimensions */
    width = parseInt(d3.select("body").style("width"), 10);
    width = width - margin.left - margin.right;
    height = parseInt(d3.select("body").style("height"), 10);
    height = height - margin.top - margin.bottom;

    /* Update the ranges and the line function */
    x.range([0, width]);
    y.range([height, 0]);
    valueline.x(function (d) {
      console.log({ d: d, v: d.week });
      return x(d.week);
    });
    valueline.y(function (d) {
      console.log({ d: d, v: d.ranks.national_rank });
      return y(d.ranks.national_rank);
    });
  });
}

function conference_bar_chart(raw_data, common) {
  console.log(common.render_content);

  var data_type = "team",
    team_id = common.render_content.team_id,
    player_slug = null,
    league_slug = null,
    college = null,
    selector_data,
    all_teams,
    all_players;

  var original_team_id = common.render_content.team_id;

  var columns = [
    "season_stats.points_per_game",
    "season_stats.passing_yards_per_game",
    "season_stats.rushing_yards_per_game",
    "wins",
  ];
  var selected_field = columns[0];

  build_selector(columns);

  var data,
    current_stat,
    vertical = false,
    animation_duration = 200;

  var bandwidth_offset = 2;

  var current_player_teams = {};

  function setup_data(selected_field) {
    data = [];

    data.y = selected_field;

    if (data_type === "team") {
      current_stat = selected_field;
      for (var team_season of raw_data) {
        data.push({
          name: team_season.team.school_name,
          value: +get_from_dict(team_season, selected_field),
          highlight: team_season.team_id === team_id,
          color: "#" + team_season.team.team_color_primary_hex,
          team_id: team_season.team_id,
          logo: team_season.team.team_logo,
        });
      }
    } else if (data_type === "player") {
      current_stat = selected_field;
      if (team_id === original_team_id) {
        raw_data_filtered = raw_data.filter(function (player) {
          return player.team_id === team_id || player.slug === player_slug;
        });
      } else {
        current_player = raw_data.filter(function (player) {
          return player.slug === player_slug;
        });
        raw_data_filtered = raw_data.filter(function (player) {
          return player.team_id === team_id;
        });

        var dupe_player = false;
        for (var i = 0; i < raw_data_filtered.length; i++) {
          var cp = raw_data_filtered[i];
          if (current_player[0] && current_player[0].player_id === cp.player_id) {
            dupe_player = true;
          }
        }

        if (!dupe_player) {
          raw_data_filtered = raw_data_filtered.concat(current_player);
        }
      }

      for (var player in raw_data_filtered) {
        var p = raw_data_filtered[player];
        data.push({
          name: p.name,
          value: +p[selected_field],
          highlight: p.slug === player_slug,
          color: "#" + p.color_primary,
          team_id: p.slug,
          fd_photo_url: p.fd_photo_url,
          player_page_url: current_player_teams[p.slug],
        });
      }
    }

    if (
      selected_field === "opponent_passing_yards" ||
      selected_field === "opponent_rushing_yards"
    ) {
      data.sort(function (a, b) {
        return a.value > b.value ? 1 : -1;
      });
    } else {
      data.sort(function (a, b) {
        return a.value < b.value ? 1 : -1;
      });
    }

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      row.rank = i + 1;
    }
  }

  setup_data(selected_field);

  var chartDiv = document.getElementById("bar_chart");
  var svg = d3.select(chartDiv).append("svg").style("overflow", "hidden");
  var data_height, height_offset;

  function return_data_height(data_points) {
    if (data_points > 10) {
      height_offset = 50;
      return raw_data_filtered.length * height_offset;
    } else if (data_points > 2) {
      height_offset = 60;
      return raw_data_filtered.length * height_offset;
    } else {
      height_offset = 70;
      return raw_data_filtered.length * height_offset;
    }
  }

  var height = 300,
    width = chartDiv.clientWidth,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  svg.attr("width", width).attr("height", height);

  var highlighted_rank = 0,
    hovered_rank = 0,
    current_y_value = 0,
    hover_y_value = 0;

  // Used to push highlighted values to left and down
  var value_offset = 39,
    value_y_offset = 4,
    value_padding = 10;

  var bar_grey = "#ddd";

  function select_bar(highlight, hover, color, rank, team_id, value, click) {
    if (click) {
      hide_all_icons();
      grey_all_bars();

      hover_y_value = value;
      //else hover_y_value = 0;

      hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

      hover_value
        .attr("x", 0 + value_padding)
        .attr("y", y(hover_y_value) + value_y_offset)
        .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value)
        .attr("opacity", 1);

      hover_rect
        .attr("x", 0)
        .attr("y", y(hover_y_value) - value_y_offset - 6)
        .attr("width", x(minimumX) - 0)
        .attr("opacity", 1);

      hovered_rank = rank;

      show_icon(hover, rank, team_id, click);
      hide_ranks(rank);

      return click ? color : hover ? color : bar_grey;
    }

    if (highlight) {
      current_y_value = value;
      highlighted_rank = rank;
    }

    if (hover) {
      if (!highlight) {
        hover_y_value = value;
        //else hover_y_value = 0;

        hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

        hover_value
          .attr("x", 0 + value_padding)
          .attr("y", y(hover_y_value) + value_y_offset)
          .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value)
          .attr("opacity", 1);

        hover_rect
          .attr("x", 0)
          .attr("y", y(hover_y_value) - value_y_offset - 6)
          .attr("width", x(minimumX) - 0)
          .attr("opacity", 1);

        hovered_rank = rank;
      }
      show_icon(hover, rank, team_id, highlight);
    } else {
      show_icon(highlight, rank, team_id, false);
      hover_y_value = 0;

      if (hover_line) {
        setTimeout(function () {
          if (hover_y_value === 0) {
            hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 0);

            hover_value
              .attr("x", x(maximumX) + x.bandwidth())
              .attr("y", y(hover_y_value) + value_y_offset)
              .text("")
              .attr("opacity", 0);

            hover_rect
              .attr("y", y(hover_y_value) - value_y_offset - 6)
              .attr("width", hover_y_value.toString().length * 12)
              .attr("opacity", 0);
          }
        }, 500);
      }
    }
    return highlight ? color : hover ? color : bar_grey;
  }
  var image_width = 25;
  var minimumY,
    maximumY,
    yMinScale,
    yMaxScale,
    x,
    y,
    xAxis,
    yAxis,
    hover_line,
    highlight_line,
    highlight_value,
    hover_value,
    player_name,
    chart_lines;

  function initialize_conference_bar_chart() {
    (minimumY = d3.min(data, function (d) {
      return d.value;
    })),
      (maximumY = d3.max(data, function (d) {
        return d.value;
      })),
      (minimumX = d3.min(data, function (d) {
        return d.rank;
      })),
      (maximumX = d3.max(data, function (d) {
        return d.rank;
      })),
      (yMinScale = minimumY - minimumY * 0.05),
      (yMaxScale = maximumY + maximumY * 0.25),
      (highlighted_rank = 0),
      (hovered_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (highlighted_rank = 0),
      (hovered_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (value_offset = 39),
      (value_y_offset = 4),
      (value_padding = 12);

    var yFormat = d3.format(","),
      yFont = "font-14",
      ticks = 6;

    // Deal with different scales/length numbers
    if (minimumY > 1000 || maximumY > 1000) {
      yFormat = d3.format(".2s");
      yFont = "font-12";
      ticks = 4;
    } else if (minimumY > 0 && maximumY < 1) {
      yFormat = d3.format(".3f");
      yFont = "font-12";
      value_padding = 8;
    } else if (minimumY > 0 && maximumY >= 10 && maximumY < 100) {
      value_padding = 20;
    }

    stats_pad_ten = [
      "field_goals_percentage",
      "two_pointers_percentage",
      "effective_field_goal_percentage",
      "three_pointers_percentage",
      "free_throws_percentage",
      "shot_percentage",
      "save_percentage",
      "shots_on_goal_for_per_game",
      "shots_on_goal_against_per_game",
      "blocks_per_game",
      "hits_per_game",
      "passing_attempts_per_game",
      "passing_completions_per_game",
      "personal_fouls_per_game",
      "turnovers_per_game",
      "steals_per_game",
      "assists_per_game",
      "total_rebounds_per_game",
      "offensive_rebounds_per_game",
      "defensive_rebounds_per_game",
    ];

    stats_pad_five = [
      "ip",
      "passing_yards_per_game",
      "total_yards_per_game",
      "rushing_yards_per_game",
      "passing_yards_per_game",
      "opponent_passing_yards_per_game",
      "opponent_rushing_yards_per_game",
      "points_per_game",
    ];
    // Stat specific fixes
    if (current_stat === "era") {
      yFormat = d3.format(".2f");
      yFont = "font-12";
      value_padding = 7;
    } else if (stats_pad_five.indexOf(current_stat) !== -1) {
      value_padding = 5;
    } else if (current_stat === "whip") {
      value_padding = 5;
      yFont = "font-12";
    } else if (stats_pad_ten.indexOf(current_stat) !== -1) {
      value_padding = 10;
    }

    x = d3
      .scaleBand()
      .domain(
        data.map(function (d) {
          return d.rank;
        })
      )
      .range([margin.left, width - margin.right])
      .padding(0.1);

    y = d3
      .scaleLinear()
      .domain([yMinScale, yMaxScale])
      .range([height - margin.bottom, margin.top]);

    xAxis = function (g) {
      return g
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .attr("color", "#9A9A9A")
        .call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0))
        .call(function (g) {
          return g.selectAll(".tick text").attr("opacity", 0);
        });
    };

    yAxis = function (g) {
      return g
        .attr("transform", "translate(" + (margin.left - 10) + ",0)")
        .attr("color", "#9A9A9A")
        .call(d3.axisLeft(y).tickSize(0).tickFormat(yFormat).ticks(ticks))
        .call(function (g) {
          return g.select(".domain").remove();
        });
    };

    svg.append("g").attr("class", "x axis carbon font-14").call(xAxis);

    svg
      .append("g")
      .attr("class", "y axis carbon " + yFont)
      .call(yAxis);

    chart_lines = svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("fill", function (d) {
        return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value);
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(yMinScale);
      })
      .attr("height", 0)
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("class", "chart_line")
      .on("mousedown", click_bar(true))
      .on("mouseover", highlight_bar(true))
      .on("mouseout", highlight_bar(false));

    highlight_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "#020E24")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value));

    highlight_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "#020E24")
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(current_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20);

    highlight_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("rx", 5)
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

    hover_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "grey")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(hover_y_value))
      .attr("y2", y(hover_y_value))
      .attr("opacity", 0);

    hover_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "grey")
      .attr("x", 0)
      .attr("y", y(hover_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20)
      .attr("opacity", 0);

    hover_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(hover_y_value) + value_y_offset)
      .text(hover_y_value)
      .attr("opacity", 0);

    image_icons = svg
      .append("g")
      .selectAll("image")
      .data(data)
      .join("image")
      .attr("xlink:href", function (d) {
        return d.logo;
      })
      .attr("width", image_width)
      .attr("height", image_width)
      .attr("id", function (d) {
        return "logo-" + d.team_id;
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value) - image_width - 10;
      })
      .attr("opacity", 0)
      .attr("class", "shadowed");
  }

  function update_conference_bar_chart() {
    height = 300;
    width = chartDiv.clientWidth;

    svg.attr("width", width).attr("height", height);

    x.domain(
      data.map(function (d) {
        return d.rank;
      })
    ).range([margin.left, width - margin.right]);

    svg.select(".x.axis").call(xAxis);

    svg.select(".y.axis").call(yAxis);

    //var chart_lines = svg.selectAll(".chart_line rect");

    chart_lines
      .transition()
      .duration(animation_duration)
      .each(function (d) {
        return show_icon(false, d.rank, d.team_id, d.highlight);
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value);
      })
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("height", function (d) {
        return y(yMinScale) - y(d.value);
      });
    //.attr("width", x.bandwidth()+1);

    highlight_line
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value))
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth());

    hover_line.attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth());

    highlight_rect
      .attr("x", 0)
      .attr("y", y(current_y_value) - value_y_offset - 6)
      .attr("width", x(minimumX) - 0);

    highlight_value
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

    image_icons.attr("x", function (d) {
      return x(d.rank) - (image_width - x.bandwidth()) / 2;
    });

    // Assign ticks ranking ids
    var ticks = d3.selectAll(".x .tick text");

    ticks.attr("transform", "translate(0,5)");
    ticks.attr("id", function (d) {
      return "rank-" + d3.select(this).text();
    });

    // Remove leading zeros for baseball percentages
    if (minimumY > 0 && maximumY < 1) {
      var y_ticks = d3.selectAll(".y .tick text");
      y_ticks.text(function (d) {
        return remove_leading_zero(d3.select(this).text());
      });
    }

    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  initialize_conference_bar_chart();
  update_conference_bar_chart();
  window.addEventListener("resize", update_conference_bar_chart);

  function highlight_bar(highlight) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(d.highlight, highlight, d.color, d.rank, d.team_id, d.value);
      });
    };
  }

  function click_bar(click) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value, click);
      });
    };
  }

  function show_icon(hover, rank, team_id, highlight) {
    var show_logic = rank === 1 || rank === data.length || hover || highlight;

    if (show_logic) {
      d3.select("#logo-" + team_id).attr("opacity", 1);
      d3.select("#rank-" + rank).attr("opacity", 1);
      if (hover) {
        grey_all_bars();
        d3.select("#player-bar-" + rank).attr("fill", function (d) {
          return d.color;
        });
        d3.select("#player-name-" + rank).attr("fill", function (d) {
          return "#000000";
        });
        d3.select("#player-stat-" + rank).attr("fill", function (d) {
          return "#000000";
        });
      }
    } else {
      d3.select("#logo-" + team_id).attr("opacity", 0);
      d3.select("#rank-" + rank).attr("opacity", 0);
      d3.select("#player-bar-" + rank).attr("fill", bar_grey);
      d3.select("#player-name-" + rank).attr("fill", "#828282");
      d3.select("#player-stat-" + rank).attr("fill", "#828282");
    }
  }

  function hide_all_icons() {
    image_icons.attr("opacity", function (d) {
      if (d.rank === 1 || d.rank === data.length || d.highlight) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  function grey_all_bars() {
    if (chart_lines) {
      chart_lines.attr("fill", function (d) {
        return d.highlight ? d.color : bar_grey;
      });
    }
  }

  function hide_ranks(rank) {
    d3.selectAll(".x .tick text").attr("opacity", 0);
    d3.select("#rank-" + rank).attr("opacity", 1);
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function new_conference_bar_chart(selected_field) {
    //console.log(selected_field)
    current_stat = selected_field;
    setup_data(selected_field);
    svg.selectAll("rect").remove();
    svg.selectAll("image").remove();

    highlight_line.remove();
    hover_line.remove();
    highlight_value.remove();
    hover_value.remove();

    svg.selectAll(".x.axis").remove();
    svg.selectAll(".y.axis").remove();
    svg.selectAll("image").remove();

    d3.selectAll(".y .tick").remove();

    initialize_conference_bar_chart();
    update_conference_bar_chart();
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function build_selector(columns) {
    var html =
      "<select id='stat_select' onChange='new_conference_bar_chart(this.value)' class='calibre w3-select font-16 form-control select-container'>";

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      // TODO this is janky as fuck
      html +=
        '<option value="' +
        col +
        '">' +
        col
          .replace("season_stats.", "")
          .replace(/_/g, " ")
          .replace(/per game/g, "(Per Game)")
          .replace(/per attempt/g, "(Per Attempt)")
          .replace(/per reception/g, "(Per Reception)")
          .replace(/\w\S*/g, function (txt) {
            if (
              txt === "rbi" ||
              txt === "hr" ||
              txt === "obp" ||
              txt === "slg" ||
              txt === "ops" ||
              txt === "ip" ||
              txt === "era" ||
              txt === "bb"
            ) {
              return txt.toUpperCase();
            } else {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
          }) +
        "</option>";
    }
    html += "</select>";

    document.getElementById("selector").innerHTML = html;

    $("#stat_select").on("change", function (a, b, c) {
      new_conference_bar_chart(this.value);
    });
  }

  function switch_teams(id) {
    team_id = id;
    var c_field = document.getElementById("stat_select").value;
    new_conference_bar_chart(c_field);
  }

  // Utilites
  function inches_to_feet(inches) {
    let inch_in_foot = 12,
      feet = Math.floor(inches / inch_in_foot),
      leftover_inches = inches - feet * inch_in_foot;

    return feet + "' " + leftover_inches + '"';
  }

  function remove_leading_zero(text) {
    var split_text = text.toString().split("."),
      trailing_zero = "";
    if (split_text[1].toString().length === 2) trailing_zero = "0";
    else if (split_text[1].toString().length === 1) trailing_zero = "00";

    return "." + split_text[1] + trailing_zero;
  }

  function set_iframe_height() {}
}

const draw_map = async (common) => {
  const db = common.db;
  const ddb = common.ddb;

  const season = common.season;
  const team = db.team.findOne(common.render_content.team_id);
  const team_id = team.team_id;

  const team_season = db.team_season.findOne({ team_id: team_id, season: season });
  const team_season_id = team_season.team_season_id;

  const player_team_seasons = db.player_team_season.find({ team_season_id: team_season_id });
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = db.player.find({ player_id: { $in: player_ids } });
  players.forEach((p) => (p.city_state = `${p.hometown.city}, ${p.hometown.state}`));
  let players_by_city_state = index_group_sync(players, "group", "city_state");
  const city_states = players.map((p) => [p.hometown.city, p.hometown.state]);

  let cities = ddb.cities.find({ city_state: { $in: city_states } });

  cities.forEach((c) => (c.city_state = `${c.city}, ${c.state}`));
  cities = nest_children(cities, players_by_city_state, "city_state", "players");

  const school_location = ddb.cities.findOne({
    city: team.location.city,
    state: team.location.state,
  });

  const school_icon = L.divIcon({
    html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [40, 40],
    iconAnchor: [15, 40],
  });
  const player_icon = L.divIcon({
    html: `<i class="fa fa-circle" data-bs-toggle="tooltip" data-bs-title="Default tooltip" style="font-size: 8px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });

  //if (map != undefined) { map.remove(); }
  let map = L.map("map-body").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let marker = L.marker([school_location.lat, school_location.long], {
    icon: school_icon,
  }).addTo(map);

  var markers = L.markerClusterGroup();

  let tooltip_template = `
        <div>{{city.city_state}}</div>
        <div>
        {% for player in city.players%}
          <div class='padding-left-8'>
          {{player.full_name}}, {{player.position}}
          </div>
        {%endfor%}
        </div>
      `;

  cities.forEach(async function (city) {
    var renderedHtml = nunjucks_env.renderString(tooltip_template, { city: city });
    renderedHtml = renderedHtml.replace("\n", "");
    let marker = L.marker([city.lat, city.long], { icon: player_icon })
      .bindTooltip(renderedHtml)
      .openTooltip();
    markers.addLayer(marker).addTo(map);
  });
};

const initialize_headlines = () => {
  if ($(".MultiCarousel-inner").children().length == 0) {
    $(".headline-slideshow").remove();
    return 0;
  }
  var itemsMainDiv = ".MultiCarousel";
  var itemsDiv = ".MultiCarousel-inner";
  var itemWidth = "";
  var initialOffset = 20;
  $(".leftLst, .rightLst").click(function () {
    var condition = $(this).hasClass("leftLst");
    if (condition) click(0, this);
    else click(1, this);
  });

  ResCarouselSize();

  $(window).resize(function () {
    ResCarouselSize();
  });

  //this function define the size of the items
  function ResCarouselSize() {
    var incno = 0;
    var dataItems = "data-items";
    var itemClass = ".headline-carousel-item";
    var id = 0;
    var btnParentSb = "";
    var itemsSplit = "";
    var sampwidth = $(itemsMainDiv).width();
    var bodyWidth = $("body").width();
    $(itemsDiv).each(function () {
      id = id + 1;
      var itemNumbers = $(this).find(itemClass).length;
      btnParentSb = $(this).parent().attr(dataItems);
      itemsSplit = btnParentSb.split(",");
      $(this)
        .parent()
        .attr("id", "MultiCarousel" + id);

      incno = 5;
      itemWidth = sampwidth / incno;
      if (bodyWidth >= 1200) {
        incno = itemsSplit[3];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 992) {
        incno = itemsSplit[2];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 768) {
        incno = itemsSplit[1];
        itemWidth = sampwidth / incno;
      } else {
        incno = itemsSplit[0];
        itemWidth = sampwidth / incno;
      }
      incno = 4;
      itemWidth = sampwidth / incno;
      console.log({
        this: this,
        itemClass: itemClass,
        width: itemWidth * itemNumbers,
        itemWidth: itemWidth,
        itemNumbers: itemNumbers,
        bodyWidth: bodyWidth,
        incno: incno,
        sampwidth: sampwidth,
        itemsMainDiv: $(itemsMainDiv),
        "$(itemsMainDiv).width()": $(itemsMainDiv).width(),
      });
      $(this).css({
        transform: "translateX(" + initialOffset + "px)",
        width: itemWidth * (itemNumbers + 1),
      });
      $(this)
        .find(itemClass)
        .each(function () {
          $(this).outerWidth(itemWidth);
          $(this).height(itemWidth * 2 * 0.67 + 0);
        });

      $(this)
        .find(`${itemClass}:first`)
        .each(function () {
          $(this).outerWidth(itemWidth * 2);
          $(this).height(itemWidth * 2 * 0.67 + 10);
        });

      $(".leftLst").addClass("over");
      $(".rightLst").removeClass("over");
    });
  }

  //this function used to move the items
  function ResCarousel(e, el, s) {
    var leftBtn = ".leftLst";
    var rightBtn = ".rightLst";
    var translateXval = "";
    var divStyle = $(el + " " + itemsDiv).css("transform");
    var values = divStyle.match(/-?[\d\.]+/g);
    var xds = Math.abs(values[4]);
    if (e == 0) {
      translateXval = parseInt(xds) - parseInt(itemWidth * s);
      $(el + " " + rightBtn).removeClass("over");

      if (translateXval <= itemWidth / 2) {
        translateXval = -1 * initialOffset;
        $(el + " " + leftBtn).addClass("over");
      }
    } else if (e == 1) {
      var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
      translateXval = parseInt(xds) + parseInt(itemWidth * s);
      $(el + " " + leftBtn).removeClass("over");

      if (translateXval >= itemsCondition - itemWidth / 2) {
        translateXval = itemsCondition + initialOffset;
        $(el + " " + rightBtn).addClass("over");
      }
    }
    $(el + " " + itemsDiv).css("transform", "translateX(" + -translateXval + "px)");
  }

  //It is used to get some elements from btn
  function click(ell, ee) {
    var Parent = "#" + $(ee).parent().attr("id");
    var slide = $(Parent).attr("data-slide");
    ResCarousel(ell, Parent, slide);
  }

  $(".headline-carousel-item.w3-hide").each(function (ind, obj) {
    $(obj).removeClass("w3-hide");
  });
};
