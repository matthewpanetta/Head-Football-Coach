const getHtml = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });

  const NavBarLinks = await common.nav_bar_links({
    path: "Amazing Stats",
    group_name: "Almanac",
    db: db,
  });

  let game_stat_categories = [
    {
      display: "Largest margin of victory",
      key: "margin_of_victory",
      th: "Margin",
      games: [],
    },
    {
      display: "Most points scored by single team",
      key: "winning_team_points",
      th: "Points",
      games: [],
    },
    {
      display: "Highest scoring game combined",
      key: "total_game_points",
      th: "Points",
      games: [],
    },
    {
      display: "Lowest scoring game combined",
      key: "total_game_points",
      sort: "asc",
      th: "Points",
      games: [],
    },
    {
      display: "Largest comeback victory",
      key: "losing_team_largest_lead",
      th: "Points",
      games: [],
    },
    {
      display: "Biggest Upset",
      key: "upset_value",
      th: "Upset Points",
      games: [],
    },
    {
      display: "Most Yards Combined",
      key: "total_yards",
      th: "Yards",
      games: [],
    },
    {
      display: "Fewest Yards Combined",
      key: "total_yards",
      sort: "asc",
      th: "Yards",
      games: [],
    },
    {
      display: "Fewest Yards by Winning Team",
      key: "winning_team_yards",
      sort: "asc",
      th: "Yards",
      games: [],
    },
    {
      display: "Most Passing Attempts",
      key: "total_passing_attempts",
      th: "Attempts",
      games: [],
    },
    {
      display: "Fewest Passing Attempts",
      key: "total_passing_attempts",
      sort: "asc",
      th: "Attempts",
      games: [],
    },
    {
      display: "Most Turnovers by Winning Team",
      key: "winning_team_turnovers",
      th: "Turnovers",
      games: [],
    },
    {
      display: "Most Turnovers Combined",
      key: "total_turnovers",
      th: "Turnovers",
      games: [],
    },
    {
      display: "Most Punts Combined",
      key: "total_punts",
      th: "Punts",
      games: [],
    },
    // {
    //   display: "Furthest Distance",
    //   key: "school_distance",
    //   th: "Miles",
    //   games: [],
    // },
    // {
    //   display: "Closest Distance",
    //   key: "school_distance",
    //   sort: "asc",
    //   th: "Miles",
    //   games: [],
    // },
  ];

  //TODO allow for season filtering
  var seasons = await db.league_season.toArray();
  var seasons_by_season = index_group_sync(seasons, "index", "season");
  var weeks = await db.week.toArray();
  weeks = nest_children(weeks, seasons_by_season, "season", "season");
  var weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  var teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = await db.team_season.where("team_id").above(0).toArray();

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var team_games = await db.team_game.toArray();
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  var team_games_by_game_id = index_group_sync(team_games, "group", "game_id");

  var games = await db.game.toArray();
  games = games.filter((g) => g.was_played);
  games = nest_children(games, weeks_by_week_id, "week_id", "week");
  games = nest_children(games, team_games_by_game_id, "game_id", "team_games");

  games.forEach(function (g) {
    for (var tg of g.team_games) {
      if (tg.is_home_team) {
        g.home_team_game = tg;
      } else {
        g.away_team_game = tg;
      }

      if (tg.is_winning_team) {
        g.winning_team_game = tg;
      } else {
        g.losing_team_game = tg;
      }
    }

    g.margin_of_victory =
      (g.outcome.winning_team.points || 0) -
      (g.outcome.losing_team.points || 0);
    g.total_game_points =
      (g.outcome.winning_team.points || 0) +
      (g.outcome.losing_team.points || 0);
    g.winning_team_points = g.outcome.winning_team.points || 0;
    g.losing_team_largest_lead =
      g.losing_team_game.game_stats.team.biggest_lead || 0;
    g.rank_difference =
      g.winning_team_game.national_rank - g.losing_team_game.national_rank;

    g.upset_value = Math.floor(
      (g.winning_team_game.national_rank + 5) ** 2 /
        (g.losing_team_game.national_rank + 5) ** 2 +
        (g.winning_team_game.national_rank - g.losing_team_game.national_rank)
    );

    g.total_yards =
      (g.winning_team_game.total_yards || 0) +
      (g.losing_team_game.total_yards || 0);
    g.winning_team_yards = g.winning_team_game.total_yards || 0;

    g.total_passing_attempts =
      (g.winning_team_game.game_stats.passing.attempts || 0) +
      (g.losing_team_game.game_stats.passing.attempts || 0);

    g.winning_team_turnovers =
      g.winning_team_game.game_stats.team.turnovers || 0;
    g.total_turnovers =
      (g.winning_team_game.game_stats.team.turnovers || 0) +
      (g.losing_team_game.game_stats.team.turnovers || 0);

    g.total_punts =
      (g.winning_team_game.game_stats.punting.punts || 0) +
      (g.losing_team_game.game_stats.punting.punts || 0);

    // g.school_distance = common.distance_between_cities(g.winning_team_game.team_season.team.location, g.losing_team_game.team_season.team.location );

    console.log({ g: g });
    return g;
  });

  console.log({ games: games, game_stat_categories: game_stat_categories });

  for (let game_stat_category of game_stat_categories) {
    let sort_multiplier = 1;
    if ((game_stat_category.sort || "desc") == "asc") {
      sort_multiplier = -1;
    }
    game_stat_category.games = games
      .sort(
        (g_a, g_b) =>
          sort_multiplier *
          (get(g_b, game_stat_category.key) - get(g_a, game_stat_category.key))
      )
      .slice(0, 10);
  }
  console.log({ games: games, game_stat_categories: game_stat_categories });

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Amazing Stats",
    },
    team_list: [],
    world_id: common.params["world_id"],
    teams: teams,
    recent_games: recent_games,
    game_stat_categories: game_stat_categories,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/almanac/amazing_stats/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  const db = common.db;
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions(
    "/World/:world_id/AmazingStats/Season/:season"
  );
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
