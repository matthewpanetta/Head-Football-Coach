const getHtml = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;
  const season = common.season;

  var world_obj = {};

  const NavBarLinks = await common.nav_bar_links({
    path: "Recruiting",
    group_name: "World",
    db: db,
  });

  var teams = await db.team.where("team_id").above(0).toArray();
  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  const team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  var team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );

  teams = nest_children(
    teams,
    team_seasons_by_team_id,
    "team_id",
    "team_season"
  );
  teams = teams.sort(
    (t_a, t_b) =>
      t_a.team_season.recruiting.recruiting_class_rank -
      t_b.team_season.recruiting.recruiting_class_rank
  );

  console.log({
    t: teams.map((t) => [
      t.team_name,
      t.team_season.recruiting.class_points,
      t.team_season.recruiting.recruiting_class_rank,
    ]),
  });

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
    },
    world_id: common.params["world_id"],
    teams: teams,
    recent_games: recent_games,
  };
  common.render_content = render_content;
  common.page = render_content.page;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/recruiting/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  const db = common.db;
  const season = common.season;

  const recruiting_team_season_id = -1 * season;

  var class_sort_order_map = {
    FR: 1,
    "FR (RS)": 1.5,
    SO: 2,
    "SO (RS)": 2.5,
    JR: 3,
    "JR (RS)": 3.5,
    SR: 4,
    "SR (RS)": 4.5,
  };

  var position_sort_order_map = {
    QB: "01",
    RB: "02",
    FB: "03",
    WR: "04",
    TE: "05",
    OT: "06",
    IOL: "07",
    EDGE: "09",
    DL: "10",
    LB: "12",
    CB: "13",
    S: "14",
    K: "15",
    P: "16",
  };

  var position_group_map = {
    QB: "Offense",
    RB: "Offense",
    FB: "Offense",
    WR: "Offense",
    TE: "Offense",
    OT: "Offense",
    IOL: "Offense",
    EDGE: "Defense",
    DL: "Defense",
    LB: "Defense",
    CB: "Defense",
    S: "Defense",
    K: "Special Teams",
    P: "Special Teams",
  };

  var teams = await db.team.toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_season_id > 0)
    .toArray();
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  const team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var player_team_seasons = await db.player_team_season
    .where({ season: common.season })
    .and((pts) => pts.team_season_id == recruiting_team_season_id)
    .toArray();
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );

  player_team_seasons.forEach(function(pts){
      pts.class_sort_order = class_sort_order_map[pts.class.class_name];
      pts.position_sort_order = position_sort_order_map[pts.position];
      pts.position_group = position_group_map[pts.position];
  })
  let player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'index', 'player_id');
  var player_ids = player_team_seasons.map((pts) => pts.player_id);

  var players = await db.player.bulkGet(player_ids);
  players = nest_children(players, player_team_seasons_by_player_id, 'player_id', 'player_team_season')

  common.render_content.players = players;

  GetPlayerStats(common);
};

const GetPlayerStats = async (common) => {
  var startTime = performance.now();
  var players = common.render_content.players;

  var table_config = {
    original_data: players,
    subject: "recruiting",
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

  const create_table = await initialize_football_table;
  var football_table = create_table(common, table_config);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Recruiting/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
