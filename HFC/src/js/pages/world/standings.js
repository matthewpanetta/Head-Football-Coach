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
  set_except,round_decimal,
  get_from_dict,
  deep_copy,
  ordinal,
} from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { recent_games} from "/js/widgets.js";

export const page_world_standings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const conference_id = common.params.conference_id;
  console.log("conference_id", conference_id, common);

  var world_obj = {};

  const NavBarLinks = common.nav_bar_links;

  const periods = db.period.find({ season: season });
  const week_ids = periods.map(p => p.period_id);

  let teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");
  let conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");
  var conference_seasons = db.conference_season.find({ season: season });
  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  var distinct_team_seasons = [];

  let games = db.game.find({ week_id: { $in: week_ids } });
  var games_by_game_id = index_group_sync(games, "index", "game_id");
  var team_games = db.team_game.find({ week_id: { $in: week_ids } });
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");

  team_games = team_games.filter((tg) => tg.game.was_played == true);
  var team_games_by_team_season_id = index_group_sync(team_games, "group", "team_season_id");
  var team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  console.log({
    team_games_by_team_game_id: team_games_by_team_game_id,
    team_games_by_team_season_id: team_games_by_team_season_id,
    team_games: team_games,
    games_by_game_id: games_by_game_id,
    week_ids: week_ids,
    "db.team_game": db.team_game,
  });

  for (let ts of team_seasons) {
    ts.team = teams_by_team_id[ts.team_id];

    ts.team_games = team_games_by_team_season_id[ts.team_season_id] || [];
    ts.conference_outcomes = {
      record: ts.conference_record_display,
      gb: ts.record.conference_gb,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };
    ts.overall_outcomes = {
      record: ts.record_display,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };

    ts.first_conference_rank = ts.rankings.division_rank[ts.rankings.division_rank.length - 1];
    ts.final_conference_rank = ts.rankings.division_rank[0];
    ts.delta_conference_rank = ts.final_conference_rank - ts.first_conference_rank;
    ts.delta_conference_rank_abs = Math.abs(ts.delta_conference_rank);

    for (let tg of ts.team_games) {
      tg.opponent_team_game = team_games_by_team_game_id[tg.opponent_team_game_id];
      ts.overall_outcomes.games_played += 1;
      ts.overall_outcomes.points_for += tg.points;
      ts.overall_outcomes.points_against += tg.opponent_team_game.points;

      if (tg.game.is_conference_game) {
        ts.conference_outcomes.games_played += 1;
        ts.conference_outcomes.points_for += tg.points;
        ts.conference_outcomes.points_against += tg.opponent_team_game.points;
      }
    }

    if (ts.overall_outcomes.games_played > 0) {
      ts.overall_outcomes.ppg = round_decimal(
        ts.overall_outcomes.points_for / ts.overall_outcomes.games_played,
        1
      );
      ts.overall_outcomes.papg = round_decimal(
        ts.overall_outcomes.points_against / ts.overall_outcomes.games_played,
        1
      );
      ts.overall_outcomes.mov = round_decimal(
        ts.overall_outcomes.ppg - ts.overall_outcomes.papg,
        1
      );

      if (ts.overall_outcomes.mov > 0) {
        ts.overall_outcomes.color = "W";
      } else if (ts.overall_outcomes.mov < 0) {
        ts.overall_outcomes.color = "L";
      }
    }

    if (ts.conference_outcomes.games_played > 0) {
      ts.conference_outcomes.ppg = round_decimal(
        ts.conference_outcomes.points_for / ts.conference_outcomes.games_played,
        1
      );
      ts.conference_outcomes.papg = round_decimal(
        ts.conference_outcomes.points_against / ts.conference_outcomes.games_played,
        1
      );
      ts.conference_outcomes.mov = round_decimal(
        ts.conference_outcomes.ppg - ts.conference_outcomes.papg,
        1
      );

      if (ts.conference_outcomes.mov > 0) {
        ts.conference_outcomes.color = "W";
      } else if (ts.conference_outcomes.mov < 0) {
        ts.conference_outcomes.color = "L";
      }
    } else {
      ts.conference_outcomes.ppg = "-";
      ts.conference_outcomes.papg = "-";
      ts.conference_outcomes.mov = "-";
    }
  }

  var team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  for (var conference_season of conference_seasons) {
    conference_season.conference = conferences_by_conference_id[conference_season.conference_id];

    for (let division of conference_season.divisions) {
      division.team_seasons =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];

      division.team_seasons = division.team_seasons.filter(
        (ts) => ts.division_name == division.division_name
      );
      division.team_seasons = division.team_seasons.sort(function (a, b) {
        if (a.rankings.division_rank[0] < b.rankings.division_rank[0]) return -1;
        if (a.rankings.division_rank[0] > b.rankings.division_rank[0]) return 1;
        return 0;
      });
    }
  }

  console.log({ conference_seasons: conference_seasons });
  conference_seasons = conference_seasons.sort(function (conference_season_a, conference_season_b) {
    if (conference_season_a.conference.conference_id == conference_id) return -1;
    if (conference_season_b.conference.conference_id == conference_id) return 1;
    if (conference_season_a.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return -1;
    if (conference_season_b.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return 1;
    if (
      conference_season_a.conference.conference_name <
      conference_season_b.conference.conference_name
    )
      return -1;
    return 1;
  });

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Conference Standings",
    },
    world_id: common.params["world_id"],
    team_list: [],
    recent_games: await recent_games(common),
    conference_seasons: conference_seasons,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/html_templates/world/standings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  const conference_seasons_by_conference_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_id"
  );
  var clicked_tabs = [];
  var margin = { top: 10, right: 30, bottom: 30, left: 120 },
    height = 400 - margin.top - margin.bottom;

  $(`#nav-${conference_seasons[0].conference_id}-tab`).click();
};
