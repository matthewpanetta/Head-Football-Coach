const getHtml = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;

  var world_obj = {};

  const NavBarLinks = await common.nav_bar_links({
    path: "Team Stats",
    group_name: "Almanac",
    db: db,
  });

  var conferences = await db.conference.toArray();
  let conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

  let conference_seasons = await db.conference_season.where({season: common.season}).toArray();
  conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')
  let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')

  var teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_season_stats = await db.team_season_stats.toArray();
  let team_season_stats_by_team_season_id = index_group_sync(team_season_stats, 'index', 'team_season_id')

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
  team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season')
  team_seasons = nest_children(team_seasons, team_season_stats_by_team_season_id, 'team_season_id', 'stats')


  const recent_games = await recent_games(common);

  common.page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: 'Team Stats'
  };

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
    },
    team_list: [],
    world_id: common.params["world_id"],
    team_seasons: team_seasons,
    recent_games: recent_games,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/html_templates/almanac/team_stats/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await draw_team_stats(common);

  var nav_team_rating_tab_clicked = false;
  $("#nav-team-ratings-tab").on("click", async function () {
    if (nav_team_rating_tab_clicked) {
      return false;
    }
    nav_team_rating_tab_clicked = true;

    await draw_nav_team_rating_table(common);
  });
};

const action = async (common) => {
  const db = common.db;
};

const draw_team_stats = async (common) => {
  var startTime = performance.now();
  var team_seasons = common.render_content.team_seasons;

  var table_config = {
    original_data: team_seasons,
    subject: "world team stats",
    display_team: true,
    templates: {
      table_template_url:
        "/html_templates/common_templates/football-table/team_table_template.njk",
      filter_template_url:
        "/html_templates/common_templates/football-table/player_table_filter_template.njk",
      column_control_template_url:
        "/html_templates/common_templates/football-table/player_table_column_control_template.njk",
    },
    dom: {
      filter_dom_selector: "#team-stats-table-filter",
      column_control_dom_selector: "#team-stats-table-column-control",
      table_dom_selector: "#team-stats-table-container",
    },
  };

  const create_table = await initialize_football_table;
  var football_table = create_table(common, table_config);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions(
    "/World/:world_id/TeamStats/Season/:season"
  );
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
