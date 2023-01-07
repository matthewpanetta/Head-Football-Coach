import { index_group_sync, nest_children } from "/static/js/utils.js";
import { nunjucks_env } from "/static/js/modules/nunjucks_tags.js";
import { draw_player_faces, draw_coach_faces } from "/static/js/faces.js";
import { conference_standings, team_header_links } from "/static/js/widgets.js";
import { initialize_football_table } from "/static/js/modules/football-table/football-table.js";
import {
  class_order_map,
  position_order_map,
  position_group_map,
  classes,
  position_groups,
} from "/static/js/metadata.js";

export const page_team_roster = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.params.season || common.season;
  const db = common.db;
  const query_to_dict = common.query_to_dict;

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

  const player_team_seasons = db.player_team_season.find({
    team_season_id: team_season.team_season_id,
  });
  const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);

  let player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  console.log({ player_team_season_stats: player_team_season_stats });
  player_team_season_stats = player_team_season_stats.filter((pts) => pts != undefined);
  const player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({ player_id: { $in: player_ids } });

  const player_team_games = db.player_team_game.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_games_by_player_team_season_id = index_group_sync(
    player_team_games,
    "group",
    "player_team_season_id"
  );

  for (let pts of player_team_seasons) {
    team_season.team = team;
    pts.team_season = team_season;
    pts.season_stats = player_team_season_stats_by_player_team_season_id[pts.player_team_season_id];
    pts.player_team_games = player_team_games_by_player_team_season_id[pts.player_team_season_id];

    pts.class_sort_order = class_order_map[pts.class_name];
    pts.position_sort_order = position_order_map[pts.position];
    pts.position_group = position_group_map[pts.position];

  }

  console.log({ player_team_seasons: player_team_seasons });

  let player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'index', 'player_id')
  players = nest_children(players, player_team_seasons_by_player_id, 'player_id', 'player_team_season')

  let roster_summary = {};
  for (let player_class of classes) {
    roster_summary[player_class] = {};
    for (let position_group of position_groups) {
      roster_summary[player_class][position_group] = {
        players: player_team_seasons.filter(
          (pts) =>
            (pts.class.class_name == player_class || player_class == "All") &&
            (pts.position_group == position_group || position_group == "All")
        ).length,
        starters: 0,
      };
      console.log({
        player_team_seasons: player_team_seasons,
        player_class: player_class,
        position_group: position_group,
        summary: roster_summary[player_class][position_group],
      });
    }
  }

  const NavBarLinks = await common.nav_bar_links({
    path: "Roster",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = await team_header_links({
    path: "Roster",
    season: season,
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
    players: players,
    all_teams: await common.all_teams(common, "/Roster/"),
    teams: teams,
    roster_summary: roster_summary,
    show_season: show_season,
    season_to_show: season_to_show,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/team/roster/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await action(common);
};

const GetPlayerStats = async (common) => {
  var startTime = performance.now();
  var players = common.render_content.players;

  var table_config = {
    original_data: players,
    subject: "player stats",
    templates: {
      table_template_url:
        "/static/html_templates/common_templates/football-table/player_table_template.njk",
      filter_template_url:
        "/static/html_templates/common_templates/football-table/player_table_filter_template.njk",
      column_control_template_url:
        "/static/html_templates/common_templates/football-table/player_table_column_control_template.njk",
    },
    dom: {
      filter_dom_selector: "#player-stats-table-filter",
      column_control_dom_selector: "#football-table-column-control",
      table_dom_selector: "#player-stats-table-container",
    },
  };

  const create_table = await initialize_football_table(common, table_config);
};

const action = async (common) => {
  await GetPlayerStats(common);
  await common.geo_marker_action(common);
};
