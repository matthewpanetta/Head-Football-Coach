const getHtml = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;
  const season = common.season;

  const week_short_name = common.params.short_name;
  console.log("week_short_name", week_short_name, common);

  var world_obj = {};

  const NavBarLinks = await common.nav_bar_links({
    path: "Week",
    group_name: "World",
    db: db,
  });

  const weeks = await db.week.where({ season: season }).toArray();
  const this_week = weeks.find((w) => w.short_name == week_short_name);

  let teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");
  let conferences = await db.conference.toArray();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");
  var conference_seasons = await db.conference_season.where({ season: season }).toArray();
  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  var distinct_team_seasons = [];

  let user_team_season = team_seasons.find(ts => ts.is_user_team);
  let user_team_season_id = user_team_season.team_season_id;

  let games = await db.game.where({ week_id: this_week.week_id }).toArray();
  // var games_by_game_id = index_group_sync(games, "index", "game_id");
  var team_games = await db.team_game.where({ week_id: this_week.week_id }).toArray();
  // team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  let team_games_by_game_id = index_group_sync(team_games, 'group', 'game_id')

  games = nest_children(games,team_games_by_game_id, 'game_id', 'team_games' )

  let user_game = games.find(function(g){
    return g.team_games.some(tg => tg.team_season_id == user_team_season_id);
  })

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
    },
    world_id: common.params["world_id"],
    team_list: [],
    recent_games: recent_games,
    games:games,
    conference_seasons: conference_seasons,
    weeks:weeks,
    this_week:this_week,
    user_game:user_game
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/world/week/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  const db = common.db;
};

$(document).ready(async function () {
  var startTime = performance.now();

  var common = await common_functions("/World/:world_id/Week/:short_name");

  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
