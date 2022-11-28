const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = parseInt(common.params.team_id);
  const season = common.season;
  const db = common.db;

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

  let [NavBarLinks] = await Promise.all([
    common.nav_bar_links({ path: "Player Stats", group_name: "Almanac",db: db}),
  ])

  
  common.page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: 'Player Stats'
  };

  var render_content = {
    page: common.page,
    world_id: common.params["world_id"],
    team_id: team_id,
    // players: players,
    // teams: teams,
    // roster_summary: roster_summary,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/almanac/player_stats/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);


  let [teams, conference_seasons, conferences, team_seasons, player_team_seasons] = await Promise.all([
    db.team.where("team_id").above(0).toArray(),
    db.conference_season.where({ season: season }).toArray(),
    db.conference.toArray(),
    db.team_season.where({ season: season }).toArray(),
    db.player_team_season.where({ season: season }).and((pts) => pts.team_season_id > 0).toArray()
  ])


  teams = teams.sort(function (teamA, teamB) {
    if (teamA.school_name < teamB.school_name) {
      return -1;
    }
    if (teamA.school_name > teamB.school_name) {
      return 1;
    }
    return 0;
  });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');
  conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference');
  var conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
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

  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );

  let player_team_season_stats = await db.player_team_season_stats.bulkGet(
    player_team_season_ids
  );
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

  const player_team_games = await db.player_team_game
    .where({ player_team_season_id: player_team_season_ids })
    .toArray();
  const player_team_games_by_player_team_season_id = index_group_sync(
    player_team_games,
    "group",
    "player_team_season_id"
  );

  var player_counter = 0;
  $.each(player_team_seasons, function (ind, player_team_season) {
    player_team_season.team_season =
      team_seasons_by_team_season_id[player_team_season.team_season_id];
    player_team_season.season_stats =
      player_team_season_stats_by_player_team_season_id[
        player_team_season.player_team_season_id
      ];
    player_team_season.player_team_games =
      player_team_games_by_player_team_season_id[
        player_team_season.player_team_season_id
      ];

    player_team_season.class_sort_order =
      class_sort_order_map[player_team_season.class_name];
    player_team_season.position_sort_order =
      position_sort_order_map[player_team_season.position];
    player_team_season.position_group =
      position_group_map[player_team_season.position];

    players[player_counter].player_team_season = player_team_season;

    player_counter += 1;
  });

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
    }
  }


  common.render_content.players = players;
  common.render_content.teams = teams;
  common.render_content.roster_summary = roster_summary;
};

const GetPlayerStats = async (common) => {
  var startTime = performance.now();
  var players = common.render_content.players;

  var table_config = {
    original_data: players,
    subject: "world player stats",
    display_team: true,
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

  var leader_tab_clicked = false;
  $('#nav-leaders-tab').on('click', function(event){
    if (!(leader_tab_clicked)){
      draw_player_leaders(common, players);
    }

    leader_tab_clicked = true;
  })
};

const draw_player_leaders = async (common, players) => {
  const db = common.db; 
  const get_from_dict = common.get_from_dict;

    var stat_categories = [
      {category_name: 'Passing Yards', field: 'player_team_season.season_stats.passing.yards'},
      {category_name: 'Passing TDs', field: 'player_team_season.season_stats.passing.tds'},
      {category_name: 'Completion %', field: 'player_team_season.season_stats.completion_percentage_qualified'},

      {category_name: 'Rushing Yards', field: 'player_team_season.season_stats.rushing.yards'},
      {category_name: 'Rushing TDs', field: 'player_team_season.season_stats.rushing.tds'},
      {category_name: 'Rushing YPC', field: 'player_team_season.season_stats.rushing_yards_per_carry_qualified'},
      
      {category_name: 'Receiving Yards', field: 'player_team_season.season_stats.receiving.yards'},
      {category_name: 'Receiving TDs', field: 'player_team_season.season_stats.receiving.tds'},
      {category_name: 'Receptions', field: 'player_team_season.season_stats.receiving.receptions'},
      
      {category_name: 'Tackles', field: 'player_team_season.season_stats.defense.tackles'},
      {category_name: 'Sacks', field: 'player_team_season.season_stats.defense.sacks'},
      {category_name: 'INTs', field: 'player_team_season.season_stats.defense.ints'},
    ]

    var url = "/static/html_templates/almanac/player_stats/player_stat_leader_template.njk";
    var html_template = await fetch(url);
    html_template = await html_template.text();

    var stat_category_index = 0;
    for (var stat_category of stat_categories){
      var stat_category_players = players;
      stat_category_players = stat_category_players.filter(p => get_from_dict(p, stat_category.field) > 0);
      stat_category_players = stat_category_players.sort((p_a, p_b) => get_from_dict(p_b, stat_category.field) - get_from_dict(p_a, stat_category.field))
      stat_category_players = stat_category_players.slice(0,5);

      stat_category.stat_category_index = stat_category_index;
      stat_category.players = stat_category_players.map(p => ({player: p, value: get_from_dict(p, stat_category.field)}));
      stat_category.players = stat_category.players.map((p_obj, ind) => Object.assign(p_obj, {value_rank: ind + 1}));

      var renderedHtml = await common.nunjucks_env.renderString(
        html_template,
        {stat_category:stat_category}
      );
    
      $("#player-stat-leader-container").append(renderedHtml);

      var player_to_draw = stat_category.players[0].player;
      if (player_to_draw.player_face == undefined){
        player_to_draw.player_face = await common.create_player_face('single', player_to_draw.player_id, db);
      }

      common.display_player_face(player_to_draw.player_face, {jersey: player_to_draw.player_team_season.team_season.team.jersey, teamColors: player_to_draw.player_team_season.team_season.team.jersey.teamColors}, `player-stat-leaders-face-${player_to_draw.player_id}-${stat_category_index}-1`);
      stat_category_index +=1;
    }

    $(".player-profile-popup-icon").on("click", async function () {
      await common.populate_player_modal(common, this);
    });
}

const action = async (common) => {
  await GetPlayerStats(common);
};

$(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/PlayerStats/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
