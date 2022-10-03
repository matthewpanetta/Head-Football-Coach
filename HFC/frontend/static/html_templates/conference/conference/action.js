const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const conference_id = parseInt(common.params.conference_id);
  const db = common.db;
  const season = common.season;
  const query_to_dict = common.query_to_dict;
  const index_group = common.index_group;

  let all_conferences = await db.conference.toArray();
  all_conferences = all_conferences.sort((c_a, c_b) => c_a.conference_name > c_b.conference_name ? 1 : -1);
  let conference = all_conferences.find(c => c.conference_id == conference_id);
  let conference_seasons = await db.conference_season
    .where({ conference_id: conference_id })
    .toArray();
  let conference_season_id_set = new Set(
    conference_seasons.map((cs) => cs.conference_season_id)
  );

  let team_seasons = await db.team_season
    .filter((ts) => conference_season_id_set.has(ts.conference_season_id))
    .toArray();
  let team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "group",
    "team_id"
  );

  let all_team_ids = common.distinct(team_seasons.map((ts) => ts.team_id));
  let all_teams = await db.team.bulkGet(all_team_ids);
  console.log({ all_teams: all_teams, all_team_ids: all_team_ids });
  let teams_by_team_id = index_group_sync(all_teams, "index", "team_id");
  all_teams = nest_children(
    all_teams,
    team_seasons_by_team_id,
    "team_id",
    "team_seasons"
  );
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );

  let team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  let team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );
  conference_seasons = nest_children(
    conference_seasons,
    team_seasons_by_conference_season_id,
    "conference_season_id",
    "team_seasons"
  );

  const awards = await db.award.filter(a => conference_season_id_set.has(a.conference_season_id)).toArray();
  let conference_season_poty_awards = awards.filter(a => a.award_group == 'individual' && a.award_timeframe == 'regular season' && a.award_team_set == 'conference');

  let player_team_season_ids = conference_season_poty_awards.map(a => a.player_team_season_id);
  let player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);
  console.log({
    player_team_seasons:player_team_seasons, player_team_season_ids:player_team_season_ids, conference_season_poty_awards:conference_season_poty_awards
  })
  let player_ids = player_team_seasons.map(pts => pts.player_id);
  let players = await db.player.bulkGet(player_ids)
  let players_by_player_id = index_group_sync(players, 'index', 'player_id')

  player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player');
  player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
  let player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');
  conference_season_poty_awards = nest_children(conference_season_poty_awards, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
  let conference_season_poty_awards_by_conference_season_id = index_group_sync(conference_season_poty_awards, 'index', 'conference_season_id')
    
  conference_seasons = nest_children(conference_seasons, conference_season_poty_awards_by_conference_season_id, 'conference_season_id', 'poty_award')

  conference_seasons.forEach(function (cs) {
    cs.record = {};
    cs.record.wins = 0;
    cs.record.losses = 0;
    cs.record.conference_wins = 0;
    cs.record.conference_losses = 0;
    cs.record.playoff_teams = 0;
    cs.record.top_25_teams = 0;

    cs.team_seasons.forEach(function (ts) {
      cs.record.wins += ts.record.wins;
      cs.record.losses += ts.record.losses;
      cs.record.conference_wins += ts.record.conference_wins;
      cs.record.conference_losses += ts.record.conference_losses;
      cs.record.playoff_teams += ts.playoff.seed ? 1 : 0;
      cs.record.top_25_teams += ts.national_rank <= 25 ? 1 : 0;
    });


    cs.conference_champion = cs.team_seasons.find(ts => ts.results.conference_champion)
    if (cs.conference_champion){
      cs.runner_up = cs.team_seasons.find(ts => !ts.results.conference_champion && ts.results.division_champion)
    }

    if (cs.conference_champion && !cs.runner_up){
      let conference_game_list = cs.team_seasons.map(ts => ts.record.conference_wins + ts.record.conference_losses);
      let max_conf_games = Math.max(...conference_game_list)
      cs.runner_up = cs.team_seasons.find(ts => !ts.results.conference_champion && (ts.record.conference_wins + ts.record.conference_losses) == max_conf_games);
   
      console.log({
        'cs.runner_up': cs.runner_up, max_conf_games:max_conf_games, cs:cs, conference_game_list:conference_game_list
      })
      debugger;
    }

    cs.record.out_of_conference_wins =
      cs.record.wins - cs.record.conference_wins;
    cs.record.out_of_conference_losses =
      cs.record.losses - cs.record.conference_losses;

    cs.record.games_played = cs.record.wins + cs.record.losses;
    cs.record.conference_games_played =
      cs.record.conference_wins + cs.record.conference_losses;
    cs.record.out_of_conference_games_played =
      cs.record.out_of_conference_wins + cs.record.out_of_conference_losses;

    if (cs.record.games_played > 0) {
      cs.record.winning_percentage = round_decimal(
        (cs.record.wins * 100.0) / cs.record.games_played,
        0
      );
    }
    else {
      cs.record.winning_percentage = 0;
    }

    if (cs.record.out_of_conference_games_played > 0) {
      cs.record.out_of_conference_winning_percentage = round_decimal(
        (cs.record.out_of_conference_wins * 100.0) /
          cs.record.out_of_conference_games_played,
        0
      );
    }
    else {
      cs.record.out_of_conference_winning_percentage = 0;
    }
  });

  all_teams.forEach(function (t) {
    t.first_season = Math.min(...t.team_seasons.map((ts) => ts.season));
    t.last_season = Math.max(...t.team_seasons.map((ts) => ts.season));
    t.season_count = t.team_seasons.length;

    t.record = {
      wins: 0,
      losses: 0,
      conference_wins: 0,
      conference_losses: 0,
      games_played: 0,
      conference_games_played: 0,
    };
    t.playoff_appearance_count = t.team_seasons.filter(ts => ts.playoff.seed).length || 0;
    t.division_championship_count = t.team_seasons.filter(ts => ts.results.division_champion).length || 0;
    t.conference_championship_count = t.team_seasons.filter(ts => ts.results.conference_champion).length || 0;
    t.national_championship_count = t.team_seasons.filter(ts => ts.results.national_champion).length || 0;
    t.team_seasons.forEach(function (ts) {
      t.record.wins += ts.record.wins;
      t.record.losses += ts.record.losses;
      t.record.conference_wins += ts.record.conference_wins;
      t.record.conference_losses += ts.record.conference_losses;

      t.record.games_played += ts.record.wins;
      t.record.games_played += ts.record.losses;
      t.record.conference_games_played += ts.record.conference_wins;
      t.record.conference_games_played += ts.record.conference_losses;
    });

    if (t.record.games_played > 0) {
      t.record.win_percentage = round_decimal(
        (t.record.wins * 100.0) / t.record.games_played,
        0
      );
    }
    else {
      t.record.win_percentage = 0;
    }

    if (t.record.conference_games_played > 0) {
      t.record.conference_win_percentage = round_decimal(
        (t.record.conference_wins * 100.0) / t.record.conference_games_played,
        0
      );
    }
    else {
      t.record.conference_win_percentage = 0;
    }
  });

  conference.conference_seasons = conference_seasons;
  conference.current_conference_season = conference_seasons.find(
    (cs) => cs.season == season
  );
  conference.all_teams = all_teams;

  const conference_standings = await common.conference_standings(
    conference.current_conference_season.conference_season_id,
    [],
    common
  );

  console.log({
    team_seasons: team_seasons,
    conference_season_id_set: conference_season_id_set,
    conference: conference,
  });

  const NavBarLinks = await common.nav_bar_links({
    path: "Conference",
    group_name: "Conference",
    db: db,
  });

  common.page = {
    PrimaryColor: conference.conference_color_primary_hex,
    SecondaryColor: conference.secondary_color_display,
    NavBarLinks: NavBarLinks,
    page_title: `Conference name TODO`,
  };
  var render_content = {
    season: season,
    page: common.page,
    world_id: common.params.world_id,
    common: common,
    conference: conference,
    conference_standings: conference_standings,
    all_conferences:all_conferences
  };

  common.render_content = render_content;
  console.log(render_content);

  var url = "/static/html_templates/conference/conference/template.njk";
  var html = await fetch(url);
  html = await html.text();

  console.log({ html: html });

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  console.log({ renderedHtml: renderedHtml });

  $("#body").html(renderedHtml);
};

const draw_map = async (common) => {
  let teams = common.render_content.conference.all_teams;
  teams.forEach(
    (t) => (t.city_state = `${t.location.city}, ${t.location.state}`)
  );
  let teams_by_city_state = index_group_sync(teams, "group", "city_state");
  const city_states = teams.map((t) => [t.location.city, t.location.state]);

  let cities = await ddb.cities
    .where("[city+state]")
    .anyOf(city_states)
    .toArray();

  cities.forEach((c) => (c.city_state = `${c.city}, ${c.state}`));
  cities = nest_children(cities, teams_by_city_state, "city_state", "teams");

  let map = L.map("conference-map").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let icon_html_template = `<a href="{{team.team_href}}"><img class='logo logo-30' src="{{team.team_logo}}"/></a>`;

  let marker_list = [];
  await cities.forEach(async function (city) {
    for (let team of city.teams) {
      let icon_html = await common.nunjucks_env.renderString(
        icon_html_template,
        { team: team }
      );
      let school_icon = L.divIcon({
        html: icon_html,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      let marker = L.marker([city.lat, city.long], { icon: school_icon });
      marker_list.push(marker);
      marker.addTo(map);
    }
  });

  var group = new L.featureGroup(marker_list);
  map.fitBounds(group.getBounds().pad(0.05));
};

const table_action = async (common) => {

  init_basic_table_sorting(common, '#conference-team-history', 8);
}

const action = async (common) => {
  await draw_map(common);
  await table_action(common);

  let clicked_history_tab = false;
  $('#nav-history-tab').on('click', async function(){
    if (clicked_history_tab){
      return true;
    }
    clicked_history_tab = true;
    await draw_faces(common, 'body');
  })

  $('#team-results-football-chart-icon').on('click', function(){
    let data = common.render_content.conference.all_teams;
    let field_list = [
      {display: 'Overall Wins', field: 'record.wins'},
      {display: 'Win %', field: 'record.win_percentage', max_value: 100},
      {display: 'Conf Wins', field: 'record.conference_wins'},
      {display: 'Conf Win %', field: 'record.conference_win_percentage', max_value: 100},
      {display: 'National Championships', field: 'national_championship_count'},
      {display: 'Conference Championships', field: 'conference_championship_count'},
      {display: 'Division Championships', field: 'division_championship_count'},
      {display: 'Playoff Appearances', field: 'playoff_appearance_count'},
    ]
    let display_name_field = 'school_name';
    let display_src_field = 'team_logo';
    let display_href_field = 'team_href';
    let display_color_field = 'team_color_primary_hex';
    let chart_title = common.render_content.conference.conference_abbreviation + ' Team History'
    initialize_football_chart(common, data, field_list, display_name_field, display_src_field, display_href_field, display_color_field, chart_title)
  })

  $('#yearly-results-football-chart-icon').on('click', function(){
    let data = common.render_content.conference.conference_seasons;
    data.forEach(d => d.conference_color_primary_hex = common.render_content.conference.conference_color_primary_hex);
    let field_list = [
      {display: 'Overall Wins', field: 'record.wins', sort: 'none'},
      {display: 'Win %', field: 'record.winning_percentage', sort: 'none', max_value: 100},
      {display: 'OOC Wins', field: 'record.out_of_conference_wins', sort: 'none'},
      {display: 'OOC Win %', field: 'record.out_of_conference_winning_percentage', sort: 'none', max_value: 100},
      {display: 'Top 25 Teams', field: 'record.top_25_teams', sort: 'none'},
      {display: 'Playoff Teams', field: 'record.playoff_teams', sort: 'none'},
    ]
    let display_name_field = 'season';
    let display_src_field = '';
    let display_href_field = '';
    let display_color_field = 'conference_color_primary_hex';
    let chart_title = common.render_content.conference.conference_abbreviation + ' Yearly History'
    initialize_football_chart(common, data, field_list, display_name_field, display_src_field, display_href_field, display_color_field, chart_title)
  })
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions(
    "/World/:world_id/Conference/:conference_id/"
  );
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});

const draw_faces = async (common, parent_div) => {
  const db = common.db;
  const season = common.season;
  const index_group_sync = common.index_group_sync;

  const player_ids = [];
  const face_div_by_player_id = {};

  $(parent_div + " .PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }

    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];

      player_ids.push(parseInt($(elem).attr("player_id")));
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
  });

  const players = await db.player.bulkGet(player_ids);
  var player_team_seasons = await db.player_team_season
    .where("player_id")
    .anyOf(player_ids)
    .toArray();
  player_team_seasons = player_team_seasons.filter(
    (pts) => pts.season == season
  );
  const player_team_seasons_by_player_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_id"
  );

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  for (var player of players) {
    var elems = face_div_by_player_id[player.player_id];
    player.player_team_season =
      player_team_seasons_by_player_id[player.player_id];
    player.team_season =
      team_seasons_by_team_season_id[player.player_team_season.team_season_id];
    player.team = teams_by_team_id[player.team_season.team_id];

    if (player.player_face == undefined) {
      player.player_face = await common.create_player_face(
        "single",
        player.player_id,
        db
      );
    }

    for (var elem of elems) {
      common.display_player_face(
        player.player_face,
        {
          jersey: player.team.jersey,
          teamColors: player.team.jersey.teamColors,
        },
        $(elem).attr("id")
      );
    }
  }
};
