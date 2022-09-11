

const populate_coach_stats = async (common) => {
  const db = await common.db;
  const coach = common.render_content.coach;
  const current_coach_team_season = coach.current_coach_team_season;

  const weeks = await db.week.where({ season: common.season }).toArray();
  const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  const team_game_ids = coach_team_games.map((ptg) => ptg.team_game_id);
  var team_games = await db.team_game.bulkGet(team_game_ids);

  const game_ids = team_games.map((tg) => tg.game_id);
  var games = await db.game.bulkGet(game_ids);

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  games = nest_children(games, weeks_by_week_id, "week_id", "week");
  const games_by_game_id = index_group_sync(games, "index", "game_id");

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

  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "opponent_team_season_id",
    "opponent_team_season"
  );
  const team_games_by_team_game_id = index_group_sync(
    team_games,
    "index",
    "team_game_id"
  );


  const coach_stats_show = {
    Passing: false,
    Rushing: false,
    Receiving: false,
    Blocking: false,
    Defense: false,
    Kicking: false,
  };

  const coach_stats_show_position_map = {
    QB: "Passing",
    RB: "Rushing",
    FB: "Rushing",
    WR: "Receiving",
    TE: "Receiving",
    OT: "Blocking",
    IOL: "Blocking",
    DL: "Defense",
    EDGE: "Defense",
    LB: "Defense",
    CB: "Defense",
    S: "Defense",
    K: "Kicking",
    P: "Kicking",
  };
  const primary_stat_show = coach_stats_show_position_map[coach.position];
  const coach_season_stat = coach.current_coach_team_season.season_stats;

  for (const coach_team_season of coach.coach_team_seasons) {
    console.log({ coach_team_season: coach_team_season });

    if (coach_team_season.season_stats.passing.attempts > 0)
      coach_stats_show["Passing"] = true;
    if (coach_team_season.season_stats.rushing.carries > 0)
      coach_stats_show["Rushing"] = true;
    if (coach_team_season.season_stats.receiving.targets > 0)
      coach_stats_show["Receiving"] = true;
    if (coach_team_season.season_stats.blocking.blocks > 0)
      coach_stats_show["Blocking"] = true;
    if (
      coach_team_season.season_stats.defense.tackles +
        coach_team_season.season_stats.defense.ints +
        coach_team_season.season_stats.fumbles.forced +
        coach_team_season.season_stats.defense.deflections >
      0
    )
      coach_stats_show["Defense"] = true;
    if (coach_team_season.season_stats.kicking.fga > 0)
      coach_stats_show["Kicking"] = true;
  }

  console.log({ coach_stats_show: coach_stats_show });

  var url =
    "/static/html_templates/coach/coach/coach_stats_recent_games_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    coach_team_season: current_coach_team_season,
    coach_stats_show: coach_stats_show,
    recent_game_stats_data: recent_game_stats_data,
  });

  $("#coach-stats-recent-games-div").empty();
  $("#coach-stats-recent-games-div").html(renderedHtml);

  init_basic_table_sorting(common, "#coach-stats-recent-games-table", 0);

  var url =
    "/static/html_templates/coach/coach/coach_stats_game_log_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    coach_team_season: current_coach_team_season,
    coach_stats_show: coach_stats_show,
  });

  $("#coach-stats-game-log-div").empty();
  $("#coach-stats-game-log-div").html(renderedHtml);

  init_basic_table_sorting(common, "#coach-stats-game-log-div", 0);

  var url =
    "/static/html_templates/coach/coach/coach_stats_season_stats_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: common.page,
    coach_team_season: current_coach_team_season,
    coach_stats_show: coach_stats_show,
    coach_team_seasons: coach.coach_team_seasons,
  });

  $("#coach-stats-season-stat-div").empty();
  $("#coach-stats-season-stat-div").html(renderedHtml);

  $("#coach-stats-season-stat-div table").each(function (ind, table) {
    var id = $(table).attr("id");
    init_basic_table_sorting(common, `#${id}`, 0);
  });

  console.log("coach_stat", {
    "coach.coach_team_seasons": coach.coach_team_seasons,
    coach_stat_group: coach_stat_group,
    "coach_stats_show[coach_stat_group]": coach_stats_show,
  });
  var FullGameStats = undefined;
  $("#nav-game-log-tab").on("click", function () {
    if (!(FullGameStats == undefined)) {
      return false;
    }
  });

  var clicked_season_stats = false;
  $("#nav-stats-tab").on("click", function () {
    if (clicked_season_stats) {
      return false;
    }
  });

  clicked_season_stats = true;

  for (var coach_stat_group in coach_stats_show) {
    if (coach_stats_show[coach_stat_group] == false) {
      continue;
    }
  }
};

const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const coach_id = parseInt(common.params.coach_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = common.season;
  const index_group_sync = common.index_group_sync;

  const NavBarLinks = await common.nav_bar_links({
    path: "coach",
    group_name: "coach",
    db: db,
  });

  const coach = await db.coach.get(coach_id);
  var coach_team_seasons = await db.coach_team_season
    .where({ coach_id: coach_id })
    .toArray();
  var coach_team_season_ids = coach_team_seasons.map(
    (pts) => pts.coach_team_season_id
  );

  console.log({
    coach_team_season_ids: coach_team_season_ids,
    coach_team_seasons: coach_team_seasons,
  });


  coach.coach_team_seasons = coach_team_seasons;
  coach.current_coach_team_season = coach_team_seasons.filter(
    (pts) => pts.season == season
  )[0];

  var team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  var coach_team_ids = team_seasons.map((ts) => ts.team_id);
  var coach_teams = await db.team.bulkGet(coach_team_ids);

  var c = 0;
  $.each(coach_team_seasons, function (ind, pts) {
    pts.team_season = team_seasons[c];
    pts.team_season.team = coach_teams[c];
    c += 1;
  });

  coach.coach_team_seasons = coach_team_seasons;
  coach.current_coach_team_season = coach.coach_team_seasons.filter(
    (pts) => pts.season == season
  )[0];
  var current_team = coach.current_coach_team_season.team_season.team;

  console.log({
    current_team: current_team,
    current_coach_team_season: coach.current_coach_team_season,
    coach_team_seasons: coach.coach_team_seasons,
  });

  if (coach.coach_face == undefined) {
    coach.coach_face = await common.create_coach_face(
      "single",
      coach.coach_id,
      db
    );
  }


  const all_coach_team_seasons_by_coach_team_season_id = index_group_sync(
    await db.coach_team_season.where({ season: season }).toArray(),
    "index",
    "coach_team_season_id"
  );
  const all_team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const coaching_position = coach.current_coach_team_season.coaching_position;


  console.log("all_coach_team_seasons", {
    coach: coach,
    current_team: current_team,
  });

  //var coach_team_games = await db.coach_team_game.where({coach_team_season_id: coach.current_coach_team_season.coach_team_season_id}).toArray()
  common.page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
    NavBarLinks: NavBarLinks,
    page_title: "coach Profile - " + coach.full_name,
    page_icon: current_team.team_logo,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    coach: coach,
    current_team: current_team,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/coach/coach/template.njk";
  var html = await fetch(url);
  html = await html.text();

  console.log({html:html})

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  common.display_player_face(
    common.render_content.coach.coach_face,
    {
      jersey:
        {id:'suit'},
      teamColors:
        common.render_content.coach.current_coach_team_season.team_season.team
          .jersey.teamColors,
    },
    "CoachFace"
  );
  //await populate_coach_stats(common);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Coach/:coach_id/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
