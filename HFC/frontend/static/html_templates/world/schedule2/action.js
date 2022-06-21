const getHtml = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  var index_group = common.index_group;
  let distinct = common.distinct;

  var world_obj = {};

  common.stopwatch(common, "getHtml 1.0");
  const NavBarLinks = await common.nav_bar_links({
    path: "Schedule",
    group_name: "World",
    db: db,
  });

  common.stopwatch(common, "getHtml 1.1");
  var teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );

  let conferences = await db.conference.toArray();
  let conference_seasons_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  let conference_seasons = await db.conference_season
    .where({ season: common.season })
    .toArray();
  conference_seasons = nest_children(
    conference_seasons,
    conference_seasons_by_conference_id,
    "conference_id",
    "conference"
  );
  conference_seasons = conference_seasons.sort(
    (cs_a, cs_b) =>
      cs_b.conference.conference_name - cs_a.conference.conference_name
  );
  let conference_seasons_by_conference_season_id = index_group_sync(
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

  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var weeks = await db.week.where({ season: common.season }).toArray();
  const week_ids = weeks.map((w) => w.week_id);

  var games = await db.game.where("week_id").anyOf(week_ids).toArray();
  const game_ids = games.map((g) => g.game_id);

  common.stopwatch(common, "getHtml 1.2");

  var team_games = await db.team_game
    .where("game_id")
    .anyOf(game_ids)
    .toArray();
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  const team_games_by_game_id = index_group_sync(
    team_games,
    "group",
    "game_id"
  );

  console.log({ team_games: team_games });

  common.stopwatch(common, "getHtml 1.3");
  let weeks_by_week_id = index_group_sync(weeks, "index", "week_id");
  for (const game of games) {
    game.week = weeks_by_week_id[game.week_id];

    game.team_games = team_games_by_game_id[game.game_id];
    game.team_games = game.team_games.sort((tg_a, tg_b) => tg_a.is_home_team);

    game.team_games[0].national_rank =
      game.team_games[0].national_rank ||
      game.team_games[0].team_season.national_rank;
    game.team_games[1].national_rank =
      game.team_games[1].national_rank ||
      game.team_games[1].team_season.national_rank;

    game.away_team_game = game.team_games[0];
    game.home_team_game = game.team_games[1];

    if (game.away_team_game.is_winning_team) {
      game.away_team_game.bold = "bold";
    }
    if (game.home_team_game.is_winning_team) {
      game.home_team_game.bold = "bold";
    }

    var min_national_rank = Math.min(
      game.team_games[0].national_rank,
      game.team_games[1].national_rank
    );
    var max_national_rank = Math.max(
      game.team_games[0].national_rank,
      game.team_games[1].national_rank
    );
    game.summed_national_rank =
      game.team_games[0].national_rank +
      game.team_games[1].national_rank +
      max_national_rank;

    if (game.rivalry) {
      game.summed_national_rank -= min_national_rank;
    }
  }
  games = games.sort((g_a, g_b) => g_a.week_id - g_b.week_id || g_a.summed_national_rank - g_b.summed_national_rank)
  common.stopwatch(common, "getHtml 1.4");

  const games_by_week_id = index_group_sync(games, "group", "week_id");

  var any_week_selected = false;
  for (const week of weeks) {
    week.games = games_by_week_id[week.week_id] ?? [];

    week.games = week.games.sort(
      (game_a, game_b) =>
        game_a.summed_national_rank - game_b.summed_national_rank
    );

    week.nav_clicked = false;

    if (week.games.length > 0 && week.is_current) {
      week.selected_week = true;
      any_week_selected = true;
    }
  }

  weeks = weeks.filter((w) => w.games.length > 0);
  if (!any_week_selected) {
    weeks[weeks.length - 1].selected_week = true;
  }

  let filter_groups = {
    Week: weeks,
    Conference: conference_seasons,
  };

  console.log({ filter_groups: filter_groups });

  common.stopwatch(common, "getHtml 1.4");

  weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  const recent_games = await common.recent_games(common);
  common.stopwatch(common, "getHtml 1.5");

  var render_content = {
    page: {
      PrimaryColor: "1763B2",
      SecondaryColor: "000000",
      NavBarLinks: NavBarLinks,
    },
    team_list: [],
    world_id: common.params["world_id"],
    weeks: weeks,
    recent_games: recent_games,
    filter_groups: filter_groups,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);
  common.stopwatch(common, "getHtml 1.6");
  common.games = games;

  var url = "/static/html_templates/world/schedule2/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
  common.stopwatch(common, "getHtml 1.7");

  var url = "/static/html_templates/world/schedule2/week_schedule_template.njk";
  var html = await fetch(url);
  var week_html = await html.text();
  $(".week-schedule").on("click", async function () {
    var week_id = $(this).attr("weekid");
    var week = weeks_by_week_id[week_id];

    console.log({ week: week });
    if (week.nav_clicked) {
      return false;
    }
    week.nav_clicked = true;

    const renderedHtml = common.nunjucks_env.renderString(week_html, {
      week: week,
    });
    console.log({
      renderedHtml: renderedHtml,
      week: week,
      week_id: week_id,
      this: this,
    });
    $("#nav-tabContent").append(renderedHtml);
  });

  $(".selected-tab").click();

  var game_template_url =
    "/static/html_templates/world/schedule2/game_box_score_template.njk";
  var game_template_html = await fetch(game_template_url);
  var game_template_html_text = await game_template_html.text();
  common.game_template_html_text = game_template_html_text;

  await draw_box_scores(common);
  $(".schedule-select").on("change", async function () {
    await draw_box_scores(common);
  });
};

const draw_box_scores = async (common) => {
  const db = common.db;

  let games = common.games;

  let filter_values = {};
  $(".schedule-select").each(function () {
    let filter_category = $(this).attr("filter");
    filter_values[filter_category] = $(this).val();
  });
  console.log({ filter_values: filter_values, games: games });

  //Filter by week id
  games = games.filter(function (g) {
    if (filter_values["week"] == "all") {
      return true;
    } else {
      return g.week.week_name == filter_values["week"];
    }
  });
  //Filter by conference ID (either team is in conference)
  games = games.filter(function (g) {
    if (filter_values["conference"] == "all") {
      return true;
    } else {
      return (
        g.team_games[0].team_season.conference_season_id ==
          filter_values["conference"] ||
        g.team_games[1].team_season.conference_season_id ==
          filter_values["conference"]
      );
    }
  });

  games = games.filter(function (g) {
    if (filter_values["scope"] == "all") {
      return true;
    } else if (filter_values["scope"] == "in conference") {
      return (
        g.team_games[0].team_season.conference_season_id ==
        g.team_games[1].team_season.conference_season_id
      );
    } else {
      return !(
        g.team_games[0].team_season.conference_season_id ==
        g.team_games[1].team_season.conference_season_id
      );
    }
  });
  games = games.filter(function (g) {
    if (filter_values["priority"] == "all") {
      return true;
    } else if (filter_values["priority"] == "top 25") {
      return (
        ((g.team_games[0].national_rank || g.team_games[0].team_season.rankings.national_rank[0]) <= 25) ||
        ((g.team_games[1].national_rank || g.team_games[1].team_season.rankings.national_rank[0]) <= 25)
      );
    }
  });
  console.log({
    filter_values: filter_values,
    games: games,
    "common.game_template_html_text": common.game_template_html_text,
  });

  const renderedHtml = common.nunjucks_env.renderString(
    common.game_template_html_text,
    {
      games: games,
    }
  );

  console.log({ renderedHtml: renderedHtml });

  $("#schedule-box-score-container").empty();
  $("#schedule-box-score-container").append(renderedHtml);
};

const action = async (common) => {
  const db = common.db;
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Ranking/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
