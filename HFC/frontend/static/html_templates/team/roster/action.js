const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.season;
  const db = common.db;
  const query_to_dict = common.query_to_dict;

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

  const NavBarLinks = await common.nav_bar_links({
    path: "Roster",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = await common.team_header_links({
    path: "Roster",
    season: common.params.season,
    db: db,
  });

  var teams = await db.team.where("team_id").above(0).toArray();
  teams = teams.sort(function (teamA, teamB) {
    if (teamA.school_name < teamB.school_name) {
      return -1;
    }
    if (teamA.school_name > teamB.school_name) {
      return 1;
    }
    return 0;
  });

  const team = await db.team.get({ team_id: team_id });
  const team_season = await db.team_season.get({
    team_id: team_id,
    season: season,
  });

  const conference_seasons = await db.conference_season
    .where({ season: season })
    .toArray();
  const conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  const conferences = await db.conference.toArray();
  const conference_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[
      team.team_season.conference_season_id
    ];
  team.team_season.conference_season.conference =
    conference_by_conference_id[
      team.team_season.conference_season.conference_id
    ];

  const player_team_seasons = await db.player_team_season
    .where({ team_season_id: team_season.team_season_id })
    .toArray();
  // const player_team_seasons = await db.player_team_season.toArray();
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );

  let player_team_season_stats = await db.player_team_season_stats.bulkGet(
    player_team_season_ids
  );
  console.log({ player_team_season_stats: player_team_season_stats });
  player_team_season_stats = player_team_season_stats.filter(
    (pts) => pts != undefined
  );
  const player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.bulkGet(player_ids);

  const player_team_season_games = await query_to_dict(
    await db.player_team_game
      .where({ player_team_season_id: player_team_season_ids })
      .toArray(),
    "many_to_one",
    "player_team_season_id"
  );

  var player_counter = 0;
  $.each(player_team_seasons, function (ind, player_team_season) {
    team_season.team = team;
    player_team_season.team_season = team_season;
    player_team_season.season_stats =
      player_team_season_stats_by_player_team_season_id[
        player_team_season.player_team_season_id
      ];
    player_team_season.player_team_games =
      player_team_season_games[player_team_season.player_team_season_id];

    player_team_season.class_sort_order =
      class_sort_order_map[player_team_season.class.class_name];
    player_team_season.position_sort_order =
      position_sort_order_map[player_team_season.position];
    player_team_season.position_group =
      position_group_map[player_team_season.position];

    players[player_counter].player_team_season = player_team_season;

    player_counter += 1;
  });

  console.log({ player_team_seasons: player_team_seasons });

  let classes = ["All", "SR", "JR", "SO", "FR"];
  let position_groups = ["All", "Offense", "Defense", "Special Teams"];

  let roster_summary = {};
  for (player_class of classes) {
    roster_summary[player_class] = {};
    for (position_group of position_groups) {
      roster_summary[player_class][position_group] = {
        players: player_team_seasons.filter(
          (pts) =>
            (pts.class.class_name == player_class || player_class == "ALL") &&
            (pts.position_group == position_group || position_group == "ALL")
        ).length,
        starters: 0,
      };
      console.log({
        player_team_seasons: player_team_seasons,
        player_class: player_class,
        position_group: position_group,
        summary: roster_summary[player_class][position_group],
      });
    }
  }

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
    players: players,
    all_teams: await common.all_teams(common, "/Roster/"),
    teams: teams,
    roster_summary: roster_summary,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/team/roster/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);
};

const GetPlayerStats = async (common) => {
  var startTime = performance.now();
  var players = common.render_content.players;


  var table_config = {
    original_data: players,
    subject: 'player stats',
    templates: {
      table_template_url: '/static/html_templates/common_templates/football-table/player_table_template.njk',
      filter_template_url: '/static/html_templates/common_templates/football-table/player_table_filter_template.njk',
      column_control_template_url: '/static/html_templates/common_templates/football-table/player_table_column_control_template.njk'
    },
    dom: {
      filter_dom_selector:  "#player-stats-table-filter",
      column_control_dom_selector:  "#player-stats-table-column-control",
      table_dom_selector:  "#player-stats-table-container",
    }
  };

  const create_table = await initialize_football_table;
  var football_table = create_table(common, table_config);
};

const action = async (common) => {
  await GetPlayerStats(common);
};

$(async function () {
  var startTime = performance.now();

  const common = await common_functions(
    "/World/:world_id/Team/:team_id/Roster/"
  );
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
