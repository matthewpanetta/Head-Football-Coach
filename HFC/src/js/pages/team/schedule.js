import { init_basic_table_sorting } from "/static/js/football-table/football-table.js";
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
} from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { draw_player_faces, draw_coach_faces } from "/static/js/faces.js";
import { conference_standings, team_header_links, all_teams } from "/static/js/widgets.js";

const action = async (common) => {
  const query_to_dict = common.query_to_dict;
  await PopulateTeamSchedule(common);
  await common.geo_marker_action(common);
};

const PopulateTeamSchedule = async (common) => {
  var games = common.render_content.games;

  games = games.sort((g_a, g_b) => g_a.week_id - g_b.week_id)
  console.log({games:games})

  var table_config = {
    original_data: games,
    subject: "team schedule",
    templates: {
      table_template_url: "/static/html_templates/team/schedule/team_schedule_table_template.njk",
    },
    dom: {
      table_dom_selector: "#team-schedule-container",
    },
  };

  var url = "/static/html_templates/team/schedule/team_schedule_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, {
    page: common.page,
    data: games,
  });

  $("#team-schedule-container").empty();
  $("#team-schedule-container").html(renderedHtml);

  init_basic_table_sorting(common, "#team-schedule-container", null);
};

export const page_team_schedule = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.params.season ?? common.season;
  const db = common.db;
  const query_to_dict = common.query_to_dict;

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var team_seasons = db.team_season.find({ team_id: { $gt: 0 }, season: season });
  teams = teams.sort((team_a, team_b) => team_a.team_location_name - team_b.team_location_name);

  const weeks = db.week.find({ season: season });
  const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  const team = db.team.findOne({ team_id: team_id });
  const team_season = db.team_season.findOne({ team_id: team_id, season: season });

  let teams_by_team_id = index_group_sync(teams, 'index', 'team_id');
  team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')

  const conference_seasons = db.conference_season.find({ season: season });
  const conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  const conferences = db.conference.find();
  const conference_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
  team.team_season.conference_season.conference =
    conference_by_conference_id[team.team_season.conference_season.conference_id];

  var team_games = db.team_game.find({ team_season_id: team_season.team_season_id });
  var team_game_ids = team_games.map((tg) => tg.team_game_id);
  team_games = team_games.sort((tg_a, tg_b) => tg_a.week_id - tg_b.week_id);
  const game_ids = team_games.map((game) => parseInt(game.game_id));

  let team_seasons_by_team_season_ids = index_group_sync(team_seasons, 'index', 'team_season_id');

  team_games = nest_children( team_games,team_seasons_by_team_season_ids , 'team_season_id', 'team_season')
  let team_games_by_game_id = index_group_sync(team_games, 'index', 'game_id')

  var games = db.game.find({ game_id: { $in: game_ids } });
  games = nest_children(games, weeks_by_week_id, "week_id", "week");
  games = nest_children(games, team_games_by_game_id, "game_id", "team_game");

  const opponent_team_game_ids = team_games.map((team_game) => team_game.opponent_team_game_id);

  const all_team_game_ids = opponent_team_game_ids.concat(team_game_ids);
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
  let opponent_teams = db.team.find({ team_id: { $in: opponent_team_ids } });
  let opponent_teams_by_team_id = index_group_sync(opponent_teams, 'index', 'team_id');
  opponent_team_seasons = nest_children(opponent_team_seasons, opponent_teams_by_team_id, 'team_id', 'team');
  let opponent_teams_seasons_by_team_season_id = index_group_sync(opponent_team_seasons, 'index', 'team_season_id')
  opponent_team_games = nest_children(opponent_team_games, opponent_teams_seasons_by_team_season_id, 'team_season_id', 'team_season')
  let opponent_team_games_by_game_id = index_group_sync(opponent_team_games, 'index', 'game_id')

  games = nest_children(games, opponent_team_games_by_game_id, "game_id", "opponent_team_game");


  var player_team_games = db.player_team_game.find({ team_game_id: { $in: all_team_game_ids } });

  const player_team_season_ids = player_team_games.map((ptg) => ptg.player_team_season_id);

  var player_team_seasons = db.player_team_season.find({
    team_season_id: { $in: player_team_season_ids },
  });
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  const player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  player_team_games = nest_children(
    player_team_games,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  const player_team_games_by_player_team_game_id = index_group_sync(
    player_team_games,
    "index",
    "player_team_game_id"
  );

  var counter_games = 0;
  console.log({
    games:games,
    team_games:team_games,
    team_games_by_game_id:team_games_by_game_id
  })
  for(let g of games){
    console.log({
      g:g
    })

    g.game_display = "Preview";
    g.game_outcome_letter = "";
    g.overtime_display = "";
    if (g.was_played) {
      g.game_display = g.score_display;

      if (g.home_team_score > g.away_team_score) {
        g.game_outcome_letter = "W";
      }

      for (var top_stat of g.team_game.top_stats) {
        top_stat.player_team_game =
          player_team_games_by_player_team_game_id[top_stat.player_team_game_id];
      }
      for (var top_stat of g.opponent_team_game.top_stats) {
        top_stat.player_team_game =
          player_team_games_by_player_team_game_id[top_stat.player_team_game_id];
      }
    }

    if (g.home_team_season_id == team.team_season.team_season_id) {
      g.game_location = "home";
      g.game_location_char = "vs.";
      g.home_team_game = g.team_game;
      g.away_team_game = g.opponent_team_game;
    } else {
      g.game_location = "away";
      g.game_location_char = "@";
      g.away_team_game = g.team_game;
      g.home_team_game = g.opponent_team_game;
    }

    g.selected_game_box = "";
    if (counter_games == 0) {
      g.selected_game_box = "SelectedGameBox";
    }

    counter_games += 1;
  }

  var conference_season = db.conference_season.findOne({
    conference_season_id: team.team_season.conference_season_id,
  });
  var conference = db.conference.findOne({ conference_id: conference_season.conference_id });

  var team_seasons_in_conference = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons_in_conference = team_seasons_in_conference
    .filter(
      (team_season) => team_season.conference_season_id == team.team_season.conference_season_id
    )
    .sort(function (teamA, teamB) {
      return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
    });

  var team_ids = team_seasons_in_conference.map((team_season) => team_season.team_id);
  var teams = db.team.find({ team_id: { $in: team_ids } });
  var team_counter = 0;
  $.each(team_seasons_in_conference, function (ind, team_season) {
    team_season.team = teams[team_counter];
    team_counter += 1;
  });

  const NavBarLinks = common.nav_bar_links;


  const TeamHeaderLinks = await team_header_links({
    path: "Schedule",
    season: common.params.season,
    db: db,
    team: team,
  });

  let show_season = common.params.season && common.params.season < common.season;
  let season_to_show = common.params.season;
  common.page = {
    PrimaryColor: team.team_color_primary_hex,
    SecondaryColor: team.secondary_color_display,
    OriginalSecondaryColor: team.team_color_secondary_hex,
    NavBarLinks: NavBarLinks,
    TeamHeaderLinks: TeamHeaderLinks,
  };
  var render_content = {
    page: common.page,
    world_id: common.params["world_id"],
    team_id: team_id,
    team: team,
    games: games,
    teams: teams,
    season: season,
    all_teams: await all_teams(common, "/Schedule/"),
    conference_standings: team_seasons_in_conference,
    show_season: show_season,
    season_to_show: season_to_show,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/team/schedule/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await action(common);
};
