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
  ordinal,
} from "/common/js/utils.js";
import { init_basic_table_sorting } from "/common/js/football-table/football-table.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { recent_games } from "/static/js/widgets.js";

export const page_world_rankings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const current_league_season = db.league_season.findOne({ season: season });

  var world_obj = {};

  const NavBarLinks = common.nav_bar_links;

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  var conference_seasons = db.conference_season.find({ season: season });
  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  var conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const games = db.game
    .find()
    .filter((g) => g.season == season && g.bowl != null && g.bowl.is_playoff == true);
  const games_by_game_id = index_group_sync(games, "index", "game_id");
  const game_ids = games.map((g) => g.game_id);

  const team_games = db.team_game.find({ game_id: { $in: game_ids } });
  const team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  console.log({
    team_seasons: team_seasons,
    team_seasons_by_team_season_id: team_seasons_by_team_season_id,
    teams_by_team_id: teams_by_team_id,
  });

  var distinct_team_seasons = [];

  let dropped_teams = team_seasons.filter(
    (ts) => ts.rankings.power_rank[0] > 25 && ts.rankings.power_rank[1] <= 25
  );
  let bubble_teams = team_seasons.filter(
    (ts) => ts.rankings.power_rank[0] > 25 && ts.rankings.power_rank[0] < 29
  );

  team_seasons = team_seasons.filter((ts) => ts.rankings.power_rank[0] <= 25);

  team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.rankings.power_rank[0] < ts_b.rankings.power_rank[0]) return -1;
    if (ts_a.rankings.power_rank[0] > ts_b.rankings.power_rank[0]) return 1;
    return 0;
  });

  const playoffs = current_league_season.playoffs;

  if (playoffs.playoffs_started) {
    for (const playoff_round of playoffs.playoff_rounds) {
      for (const playoff_game of playoff_round.playoff_games) {
        console.log({ playoff_game: playoff_game });
        playoff_game.game = games_by_game_id[playoff_game.game_id];
        playoff_game.team_objs = nest_children(
          playoff_game.team_objs,
          team_seasons_by_team_season_id,
          "team_season_id",
          "team_season"
        );
        playoff_game.team_objs = nest_children(
          playoff_game.team_objs,
          team_games_by_team_game_id,
          "team_game_id",
          "team_game"
        );
      }
    }
  } else {
    var projected_playoff_teams = team_seasons.slice(0, playoffs.number_playoff_teams);
    console.log({
      playoffs: playoffs,
      projected_playoff_teams: projected_playoff_teams,
      number_playoff_teams: playoffs.number_playoff_teams,
    });
    // for (var playoff_round of playoffs.playoff_rounds) {
    //   console.log({ playoff_round: playoff_round });
    //   playoff_round.round_of = 2 * playoff_round.playoff_games.length;
    //   for (var playoff_game of playoff_round.playoff_games) {
    //     for (var team_obj of playoff_game.team_objs) {
    //       team_obj.team_season = projected_playoff_teams[team_obj.seed - 1];
    //       console.log({
    //         team_obj: team_obj,
    //         playoff_game: playoff_game,
    //         playoff_round: playoff_round,
    //       });
    //     }
    //   }
    // }
  }

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Top 25",
    },
    team_list: [],
    world_id: common.params["world_id"],
    team_seasons: team_seasons,
    recent_games: await recent_games(common),
    dropped_teams: dropped_teams,
    bubble_teams: bubble_teams,
    playoffs: playoffs,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/rankings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await PopulateTop25(common);
};

const PopulateTop25 = async (common) => {
  const db = common.db;
  const index_group = common.index_group;
  const season = common.season;

  var this_week = db.week.find({ season: season });
  console.log("this_week", this_week);
  this_week = this_week.filter((week) => week.is_current)[0];
  const this_week_id = this_week.week_id;
  const last_week_id = this_week_id - 1;

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = team_seasons.sort(function (a, b) {
    if (a.rankings.power_rank[0] < b.rankings.power_rank[0]) return -1;
    if (a.rankings.power_rank[0] > b.rankings.power_rank[0]) return 1;
    return 0;
  });
  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = db.team.find({ team_id: { $in: team_ids } });

  let this_week_team_games = db.team_game.find({ week_id: this_week_id });
  let last_week_team_games = db.team_game.find({ week_id: last_week_id });

  const total_team_games = Object.values(this_week_team_games).concat(
    Object.values(last_week_team_games)
  );
  const total_team_game_ids = total_team_games.map((team_game) => team_game.game_id);

  let games = db.game.find({ game_id: { $in: total_team_game_ids } });
  const games_by_game_id = index_group_sync(games, "index", "game_id");

  let all_teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(all_teams, "index", "team_id");
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  last_week_team_games = nest_children(last_week_team_games, games_by_game_id, "game_id", "game");
  this_week_team_games = nest_children(this_week_team_games, games_by_game_id, "game_id", "game");

  last_week_team_games = nest_children(
    last_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  this_week_team_games = nest_children(
    this_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  const last_week_team_games_by_team_season_id = index_group_sync(
    last_week_team_games,
    "index",
    "team_season_id"
  );
  const this_week_team_games_by_team_season_id = index_group_sync(
    this_week_team_games,
    "index",
    "team_season_id"
  );

  let all_team_games = db.team_game.find({ week_id: { $in: [this_week_id, last_week_id] } });
  const all_team_games_by_team_game_id = index_group_sync(all_team_games, "index", "team_game_id");

  let conference_seasons = db.conference_season.find({ season: season });
  let conferences = db.conference.find();

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

  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children(
    team_seasons,
    last_week_team_games_by_team_season_id,
    "team_season_id",
    "last_week_team_game"
  );
  team_seasons = nest_children(
    team_seasons,
    this_week_team_games_by_team_season_id,
    "team_season_id",
    "this_week_team_game"
  );

  let top_25_team_seasons = team_seasons.slice(0, 25);

  console.log("In PopulateTopTeams!", top_25_team_seasons);

  let table_template_url = "/static/html_templates/world/rankings/ranking_table_template.njk";
  let table_html = await fetch(table_template_url);
  let table_html_text = await table_html.text();

  var renderedHtml = nunjucks_env.renderString(table_html_text, {
    top_25_team_seasons: top_25_team_seasons,
  });
  console.log({ renderedHtml: renderedHtml, top_25_team_seasons: top_25_team_seasons });
  $("#Top25Table-body").empty();
  $("#Top25Table-body").append(renderedHtml);

  init_basic_table_sorting(common, "#Top25Table", null);
};
