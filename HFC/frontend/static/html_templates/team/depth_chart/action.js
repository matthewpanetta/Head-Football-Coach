const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.season;
  const db = common.db;
  const query_to_dict = common.query_to_dict;

  const NavBarLinks = await common.nav_bar_links({
    path: "Depth Chart",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = await common.team_header_links({
    path: "Depth Chart",
    season: common.params.season,
    db: db,
  });

  var position_list = {
    QB: 1,
    RB: 1,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 3,
    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,
    P: 1,
    K: 1,
  };

  let all_pos_stat_list = [
    "player_team_season.season_stats.games.games_played",
    "player_team_season.season_stats.games.games_started",
    "player_team_season.season_stats.games.plays_on_field",
    "player_team_season.season_stats.games.weighted_game_score",
  ];
  let all_pos_rating_list = [
    { display: "Spd", key: "ratings.athleticism.speed" },
    { display: "Acc", key: "ratings.athleticism.acceleration" },
    { display: "Agi", key: "ratings.athleticism.agility" },
    { display: "Jump", key: "ratings.athleticism.jumping" },
    { display: "Str", key: "ratings.athleticism.strength" },
    { display: "Stam", key: "ratings.athleticism.stamina" },
  ];

  let position_depth_chart = [
    {
      position: "QB",
      player_team_seasons: [],
      starter_count: 1,
      stat_list: [
        { display: "Yards", key: "season_stats.passing.yards" },
        { display: "Cmp", key: "season_stats.passing.completions" },
        { display: "Att", key: "season_stats.passing.attempts" },
        { display: "Cmp%", key: "season_stats.passing_completion_percentage" },
        { display: "TDs", key: "season_stats.passing.tds" },
        { display: "Ints", key: "season_stats.passing.ints" },
      ],
      rating_list: [
        { display: "Thr Pw", key: "ratings.passing.throwing_power" },
        { display: "S Acc", key: "ratings.passing.short_throw_accuracy" },
        { display: "M Acc", key: "ratings.passing.medium_throw_accuracy" },
        { display: "D Acc", key: "ratings.passing.deep_throw_accuracy" },
        { display: "Pres.", key: "ratings.passing.throw_under_pressure" },
        { display: "Thr Run", key: "ratings.passing.throw_on_run" },
        { display: "PA", key: "ratings.passing.play_action" },
      ],
    },
    {
      position: "RB",
      player_team_seasons: [],
      starter_count: 1,
      stat_list: [
        { display: "Yards", key: "season_stats.rushing.yards" },
        { display: "Car", key: "season_stats.rushing.carries" },
        { display: "YPC", key: "season_stats.rushing_yards_per_carry" },
        { display: "TDs", key: "season_stats.rushing.tds" },
        { display: "Brkn Tck", key: "season_stats.rushing.broken_tackles" },
      ],
      rating_list: [
        { display: "Car", key: "ratings.rushing.carrying" },
        { display: "Elu", key: "ratings.rushing.elusiveness" },
        { display: "Brk Tck", key: "ratings.rushing.break_tackle" },
        { display: "BCV", key: "ratings.rushing.ball_carrier_vision" },
      ],
    },
    {
      position: "WR",
      player_team_seasons: [],
      starter_count: 3,
      stat_list: [
        { display: "Yards", key: "season_stats.receiving.yards" },
        { display: "Rec", key: "season_stats.receiving.receptions" },
        { display: "YPC", key: "season_stats.receiving_yards_per_catch" },
        { display: "Targ", key: "season_stats.receiving.targets" },
        { display: "TDs", key: "season_stats.receiving.tds" },
      ],
      rating_list: [
        { display: "Catch", key: "ratings.receiving.catching" },
        { display: "Route", key: "ratings.receiving.route_running" },
        { display: "CiT", key: "ratings.receiving.catch_in_traffic" },
        { display: "Rel", key: "ratings.receiving.release" },
      ],
    },
    {
      position: "TE",
      player_team_seasons: [],
      starter_count: 1,
      stat_list: [
        { display: "Yards", key: "season_stats.receiving.yards" },
        { display: "Rec", key: "season_stats.receiving.receptions" },
        { display: "YPC", key: "season_stats.receiving_yards_per_catch" },
        { display: "Targ", key: "season_stats.receiving.targets" },
        { display: "TDs", key: "season_stats.receiving.tds" },
      ],
      rating_list: [
        { display: "Catch", key: "ratings.receiving.catching" },
        { display: "Route", key: "ratings.receiving.route_running" },
        { display: "CiT", key: "ratings.receiving.catch_in_traffic" },
        { display: "Rel", key: "ratings.receiving.release" },
        { display: "P Blc", key: "ratings.blocking.pass_block" },
        { display: "R Blc", key: "ratings.blocking.run_block" },
        { display: "Imp Blc", key: "ratings.blocking.impact_block" },
      ],
    },
    {
      position: "OT",
      player_team_seasons: [],
      starter_count: 2,
      stat_list: [
        { display: "Pan", key: "season_stats.blocking.pancakes" },
        { display: "Sack Allowed", key: "season_stats.blocking.sacks_allowed" },
      ],
      rating_list: [
        { display: "P Blc", key: "ratings.blocking.pass_block" },
        { display: "R Blc", key: "ratings.blocking.run_block" },
        { display: "Imp Blc", key: "ratings.blocking.impact_block" },
      ],
    },
    {
      position: "IOL",
      player_team_seasons: [],
      starter_count: 3,
      stat_list: [
        { display: "Pan", key: "season_stats.blocking.pancakes" },
        { display: "Sack Allowed", key: "season_stats.blocking.sacks_allowed" },
      ],
      rating_list: [
        { display: "P Blc", key: "ratings.blocking.pass_block" },
        { display: "R Blc", key: "ratings.blocking.run_block" },
        { display: "Imp Blc", key: "ratings.blocking.impact_block" },
      ],
    },
    {
      position: "DL",
      player_team_seasons: [],
      starter_count: 2,
      stat_list: [
        { display: "Tck", key: "season_stats.defense.tackles" },
        { display: "TFL", key: "season_stats.defense.tackles_for_loss" },
        { display: "Sacks", key: "season_stats.defense.sacks" },
      ],
      rating_list: [
        { display: "Tckl", key: "ratings.defense.tackle" },
        { display: "Hit Pow", key: "ratings.defense.hit_power" },
        { display: "B Shed", key: "ratings.defense.block_shedding" },
        { display: "Purs", key: "ratings.defense.pursuit" },
        { display: "Play rec", key: "ratings.defense.play_recognition" },
        { display: "Pass Rush", key: "ratings.defense.pass_rush" },
      ],
    },
    {
      position: "EDGE",
      player_team_seasons: [],
      starter_count: 2,
      stat_list: [
        { display: "Tck", key: "season_stats.defense.tackles" },
        { display: "TFL", key: "season_stats.defense.tackles_for_loss" },
        { display: "Sacks", key: "season_stats.defense.sacks" },
      ],
      rating_list: [
        { display: "Tckl", key: "ratings.defense.tackle" },
        { display: "Hit Pow", key: "ratings.defense.hit_power" },
        { display: "B Shed", key: "ratings.defense.block_shedding" },
        { display: "Purs", key: "ratings.defense.pursuit" },
        { display: "Play rec", key: "ratings.defense.play_recognition" },
        { display: "Pass Rush", key: "ratings.defense.pass_rush" },
      ],
    },
    {
      position: "LB",
      player_team_seasons: [],
      starter_count: 3,
      stat_list: [
        { display: "Tck", key: "season_stats.defense.tackles" },
        { display: "TFL", key: "season_stats.defense.tackles_for_loss" },
        { display: "Sacks", key: "season_stats.defense.sacks" },
        { display: "Ints", key: "season_stats.defense.ints" },
        { display: "Defl", key: "season_stats.defense.deflections" },
      ],
      rating_list: [
        { display: "Tckl", key: "ratings.defense.tackle" },
        { display: "Hit Pow", key: "ratings.defense.hit_power" },
        { display: "B Shed", key: "ratings.defense.block_shedding" },
        { display: "Purs", key: "ratings.defense.pursuit" },
        { display: "Play rec", key: "ratings.defense.play_recognition" },
        { display: "Pass Rush", key: "ratings.defense.pass_rush" },
        { display: "M Cov", key: "ratings.defense.man_coverage" },
        { display: "Z Cov", key: "ratings.defense.zone_coverage" },
      ],
    },
    {
      position: "CB",
      player_team_seasons: [],
      starter_count: 2,
      stat_list: [
        { display: "Tck", key: "season_stats.defense.tackles" },
        { display: "Ints", key: "season_stats.defense.ints" },
        { display: "Defl", key: "season_stats.defense.deflections" },
      ],
      rating_list: [
        { display: "Tckl", key: "ratings.defense.tackle" },
        { display: "B Shed", key: "ratings.defense.block_shedding" },
        { display: "Purs", key: "ratings.defense.pursuit" },
        { display: "Play rec", key: "ratings.defense.play_recognition" },
        { display: "M Cov", key: "ratings.defense.man_coverage" },
        { display: "Z Cov", key: "ratings.defense.zone_coverage" },
        { display: "Press", key: "ratings.defense.press" },
      ],
    },
    {
      position: "S",
      player_team_seasons: [],
      starter_count: 2,
      stat_list: [
        { display: "Tck", key: "season_stats.defense.tackles" },
        { display: "Ints", key: "season_stats.defense.ints" },
        { display: "Defl", key: "season_stats.defense.deflections" },
      ],
      rating_list: [
        { display: "Tckl", key: "ratings.defense.tackle" },
        { display: "Hit Pow", key: "ratings.defense.hit_power" },
        { display: "B Shed", key: "ratings.defense.block_shedding" },
        { display: "Purs", key: "ratings.defense.pursuit" },
        { display: "Play rec", key: "ratings.defense.play_recognition" },
        { display: "M Cov", key: "ratings.defense.man_coverage" },
        { display: "Z Cov", key: "ratings.defense.zone_coverage" },
        { display: "Press", key: "ratings.defense.press" },
      ],
    },
    {
      position: "K",
      player_team_seasons: [],
      starter_count: 1,
      stat_list: [
        { display: "FGM", key: "season_stats.kicking.fgm" },
        { display: "FGA", key: "season_stats.kicking.fga" },
      ],
      rating_list: [
        { display: "Kick Pow", key: "ratings.kicking.kick_power" },
        { display: "Kick Acc", key: "ratings.kicking.kick_accuracy" },
      ],
    },
    {
      position: "P",
      player_team_seasons: [],
      starter_count: 1,
      stat_list: [
        { display: "Punts", key: "season_stats.punting.punts" },
        { display: "Within 20", key: "season_stats.punting.within_20" },
      ],
      rating_list: [
        { display: "Kick Pow", key: "ratings.kicking.kick_power" },
        { display: "Kick Acc", key: "ratings.kicking.kick_accuracy" },
      ],
    },
  ];

  const league_seasons = await db.league_season.toArray();
  const league_seasons_by_season = index_group_sync(
    league_seasons,
    "index",
    "season"
  );

  const conferences = await db.conference.toArray();
  const conferences_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  var conference_seasons = await db.conference_season.toArray();
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

  const team = await db.team.get(team_id);
  var team_season = await db.team_season.get({
    team_id: team_id,
    season: season,
  });

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[
      team.team_season.conference_season_id
    ];
  team.team_season.conference_season.conference =
    conferences_by_conference_id[
      team.team_season.conference_season.conference_id
    ];

  let player_team_seasons = await db.player_team_season
    .where({ team_season_id: team_season.team_season_id })
    .toArray();
  let player_ids = player_team_seasons.map((pts) => pts.player_id);
  let player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );

  let player_team_season_stats = await db.player_team_season_stats
    .where("player_team_season_id")
    .anyOf(player_team_season_ids)
    .toArray();
  let player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  let players = await db.player.where("player_id").anyOf(player_ids).toArray();
  let players_by_player_id = index_group_sync(players, "index", "player_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  let player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  team.team_season.pts_depth_chart = {};
  position_depth_chart.forEach(function (pos_obj) {
    let pos = pos_obj.position;
    pos_obj.player_team_seasons = team.team_season.depth_chart[pos].map(
      (pts_id) => player_team_seasons_by_player_team_season_id[pts_id]
    );
  });

  console.log({
    TeamHeaderLinks: TeamHeaderLinks,
    team: team,
    position_depth_chart: position_depth_chart,
  });
  common.page = {
    PrimaryColor: team.team_color_primary_hex,
    SecondaryColor: team.secondary_color_display,
    NavBarLinks: NavBarLinks,
    TeamHeaderLinks: TeamHeaderLinks,
  };
  var render_content = {
    page: common.page,
    world_id: common.params["world_id"],
    team_id: team_id,
    team: team,
    season: common.season,
    all_teams: await common.all_teams(common, "/DepthChart/"),
    position_depth_chart: position_depth_chart,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/team/depth_chart/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  await common.geo_marker_action(common);

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions(
    "/World/:world_id/Team/:team_id/DepthChart/"
  );
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
