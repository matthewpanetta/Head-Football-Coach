import { index_group_sync, nest_children } from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { conference_standings, team_header_links, all_teams } from "/js/widgets.js";

export const page_team_history = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.season;
  const db = common.db;
  const query_to_dict = common.query_to_dict;

  const league_seasons = db.league_season.find();
  const league_seasons_by_season = index_group_sync(league_seasons, "index", "season");

  const conferences = db.conference.find();
  const conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  var conference_seasons = db.conference_season.find();
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

  const team = db.team.findOne({ team_id: team_id });
  var team_season = db.team_season.findOne({ team_id: team_id, season: season });
  var team_seasons = db.team_season.find({ team_id: team_id });

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
  team.team_season.conference_season.conference =
    conferences_by_conference_id[team.team_season.conference_season.conference_id];

  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children(team_seasons, league_seasons_by_season, "season", "league_season");

  const bowl_game_ids = team_seasons
    .map(function (g) {
      if (g.results.bowl) {
        return g.results.bowl.game_id;
      }
      return undefined;
    })
    .filter((g_id) => g_id != undefined);

  const bowl_games = db.game.find({ game_id: { $in: bowl_game_ids } });
  const bowl_games_by_game_id = index_group_sync(bowl_games, "index", "game_id");

  var ts_index = 0;
  var ts_cs_list = [];
  var previous_conference_id = -1;
  for (const team_season of team_seasons) {
    team_season.final_conference_rank = team_season.rankings.division_rank[0];

    team_season.final_power_rank = team_season.rankings.power_rank[0];
    team_season.first_power_rank =
      team_season.rankings.power_rank[team_season.rankings.power_rank.length - 1];
    team_season.best_power_rank = team_season.rankings.power_rank.reduce(
      (acc, val) => Math.min(acc, val),
      999
    );
    team_season.worst_power_rank = team_season.rankings.power_rank.reduce(
      (acc, val) => Math.max(acc, val),
      1
    );

    if (team_season.conference_season.conference.conference_id != previous_conference_id) {
      ts_cs_list.push(ts_index);
      previous_conference_id = team_season.conference_season.conference.conference_id;
    }

    ts_index += 1;

    if (team_season.results.bowl) {
      team_season.results.bowl.game = bowl_games_by_game_id[team_season.results.bowl.game_id];
    }
  }

  for (var i = 0; i < ts_cs_list.length; i++) {
    ts_index = ts_cs_list[i];

    var team_season = team_seasons[ts_index];
    team_season.conference_row_span = (ts_cs_list[i + 1] ?? team_seasons.length) - ts_cs_list[i];
  }

  for (const team_season of team_seasons) {
    if (team_season.conference_row_span == undefined) {
      team_season.conference_row_span = 0;
    }
  }

  const NavBarLinks = common.nav_bar_links;


  const TeamHeaderLinks = team_header_links({
    path: "History",
    season: common.params.season,
    db: db,
    team: team,
  });

  let show_season = common.params.season && common.params.season < common.season;
  let season_to_show = common.params.season;

  console.log({ TeamHeaderLinks: TeamHeaderLinks });
  common.page = {
    page_icon: team.team_logo,
    page_title: `HFC - ${team.team_location_name} History`,
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
    team_seasons: team_seasons,
    season: common.season,
    all_teams: await all_teams(common, "/History/"),
    show_season: show_season,
    season_to_show: season_to_show,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/html_templates/team/history/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await common.geo_marker_action(common);
};
