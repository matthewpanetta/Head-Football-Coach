import { index_group_sync, get, nest_children, increment_parent, deep_copy, round_decimal } from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { init_basic_table_sorting } from "/common/js/football-table/football-table.js";
import { draw_player_faces, player_face_listeners } from "/static/js/faces.js";

export const page_almanac_history = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;

  // const weeks = await db.week.toArray();
  // const this_week = weeks.filter(w => w.is_current)[0];
  // await choose_all_americans(this_week, common)

  var world_obj = {};

  const weeks = db.week.find({ season: common.season });
  const this_week = weeks.filter((w) => w.is_current)[0];

  const NavBarLinks = await common.nav_bar_links({
    path: "History",
    group_name: "Almanac",
    db: db,
  });

  var awards = db.award.find();
  awards = awards.filter((a) => a.award_group == "individual");
  var player_team_season_ids = awards.map((a) => a.player_team_season_id);
  var player_team_seasons = db.player_team_season.find({player_team_season_id: {'$in':player_team_season_ids}});

  var player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({player_id: {'$in': player_ids}});
  var players_by_player_id = index_group_sync(players, "index", "player_id");

  var teams = db.team.find({"team_id": {'$gt': 0}});;
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = db.team_season.find({"team_id": {'$gt': 0}});;

  for (var team_season of team_seasons) {
    team_season.results.final_four = false;

    if (
      team_season.results.bowl &&
      (team_season.results.bowl.bowl_name == "National Semifinals" ||
        team_season.results.bowl.bowl_name == "National Championship")
    ) {
      team_season.results.final_four = true;
    }
  }

 db.team_season.find({team_season_id: {'$in': team_seasons}});

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  var distinct_team_seasons = [];
  var team_seasons_by_season = index_group_sync(team_seasons, "group", "season");
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  var player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );
  awards = nest_children(
    awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  var awards_by_season = index_group_sync(awards, "group", "season");

  console.log({ db: db, awards_by_season: awards_by_season });
  var seasons = db.league_season.find();

  var world_id = common.world_id;

  for (var season of seasons) {
    console.log({ season: season });

    season.links = [];
    season.links.push({
      display: "Schedule",
      href: `/World/${world_id}/Schedule/${season.season}`,
    });
    season.links.push({
      display: "Standings",
      href: `/World/${world_id}/Standings/${season.season}`,
    });
    season.links.push({
      display: "Player Stats",
      href: `/World/${world_id}/PlayerStats/${season.season}`,
    });
    season.links.push({
      display: "Team Stats",
      href: `/World/${world_id}/TeamStats/${season.season}`,
    });

    var season_team_seasons = team_seasons_by_season[season.season];

    if (season.is_current_season && !(this_week.week_name == "Season Recap")) {
      season.season_end_top_five = [null, null, null, null, null];
      continue;
    }

    season.awards = awards_by_season[season.season];

    season.heisman_winner = season.awards.find((a) => a.award_group_type == "Heisman");

    season.national_champion = season_team_seasons.find((ts) => ts.results.national_champion);

    season.season_end_top_five = season_team_seasons
      .filter((ts) => ts.rankings.national_rank[0] <= 5)
      .sort((ts_a, ts_b) => ts_a.rankings.national_rank[0] - ts_b.rankings.national_rank[0]);
    season.season_start_top_five = season_team_seasons
      .filter((ts) => ts.rankings.national_rank[ts.rankings.national_rank.length - 1] <= 5)
      .sort(
        (ts_a, ts_b) =>
          ts_a.rankings.national_rank[ts_a.rankings.national_rank.length - 1] -
          ts_b.rankings.national_rank[ts_b.rankings.national_rank.length - 1]
      );

    season.team_seasons = season_team_seasons;

    console.log({ season: season });
  }

  // const player_team_seasons = await db.player_team_season.toArray();
  // const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);
  //
  // const player_ids = player_team_seasons.map(pts => pts.player_id);
  // var players = await db.player.bulkGet(player_ids);
  // const players_by_player_id = index_group_sync(players, 'index', 'player_id');

  // const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "History",
    },
    team_list: [],
    world_id: common.params["world_id"],
    teams: teams,
    recent_games: recent_games,
    seasons: seasons,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/almanac/history/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await action(common);

};

const action = async (common) => {
  const db = common.db;

  await player_face_listeners(common, "");
};