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
    return g;
  });

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

  let map_tab_clicked = false;
  $("#nav-maps-tab").on("click", async function () {
    console.log("in nav maps table", { map_tab_clicked: map_tab_clicked });
    if (map_tab_clicked) {
      return false;
    }
    map_tab_clicked = true;

    await draw_maps(common);
  });
};

function setStyle_srs(feature) {
  return setStyle(feature.properties.closest_srs_team_color || "FFF");
}
function setStyle_base(feature) {
  return setStyle(feature.properties.closest_team_color || "FFF");
}
function setStyle_imperial(feature) {
  let color_entries = Object.entries(feature.properties.colors_by_week_id);
  let color = color_entries[color_entries.length - 1][1];
  return setStyle(color || "FFF");
}

function setStyle(color) {
  return {
    opacity: 0.8,
    weight: 1,
    color: "#" + color,
    fillColor: "#" + color,
    fillOpacity: 0.8,
  };
}

const draw_maps = async (common) => {
  const db = common.db;
  const ddb = await common.driver_db();
  console.log({
    db: db,
    ddb: ddb,
  });
  let weeks = await db.week.where({ season: common.season }).toArray();
  let week_ids = weeks.map((w) => w.week_id);
  let current_week = weeks.find((w) => w.is_current);

  weeks = weeks.filter((w) => w.week_id < current_week.week_id);

  let teams = await db.team.where("team_id").above(0).toArray();
  let team_seasons = await db.team_season
    .where({ season: common.season }).filter(ts => ts.team_id > 0)
    .toArray();
  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);


  console.log({ teams: teams });
  let team_city_states = teams.map((t) => [t.location.city, t.location.state]);
  // let cities = await ddb.cities.bulkGet(team_city_states);
  let cities = await ddb.cities
    .where("[city+state]")
    .anyOf(team_city_states)
    .toArray();
  let cities_by_city_state = {};
  cities.forEach(function (c) {
    cities_by_city_state[c.city + "," + c.state] = c;
  });

  teams.forEach(function (t) {
    t.city = cities_by_city_state[t.location.city + "," + t.location.state];
  });

  let team_games = await db.team_game
    .where("team_season_id")
    .anyOf(team_season_ids)
    .toArray();

  let games = await db.game.where("week_id").anyOf(week_ids).toArray();
  games = games.filter(g => g.was_played);
  let games_by_week_id = index_group_sync(games, "group", "week_id");
  weeks = nest_children(weeks, games_by_week_id, "week_id", "games");

  let games_by_game_id = index_group_sync(games, "index", "game_id");
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  team_games = team_games.filter((tg) => tg.game && tg.game.was_played);
  let team_games_by_week_ids = index_group_sync(team_games, "group", "week_id");

  weeks = nest_children(weeks, team_games_by_week_ids, "week_id", "team_games");
  weeks.forEach(function (w) {
    w.team_games_by_team_season_id = index_group_sync(
      w.team_games,
      "index",
      "team_season_id"
    );
  });

  console.log({
    games_by_week_id:games_by_week_id, weeks:weeks, games:games
  })
  debugger;

  let teams_by_team_id = index_group_sync(teams, "index", "team_id");
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );

  console.log({
    weeks: weeks,
    team_games: team_games,
    team_games_by_week_ids: team_games_by_week_ids,
    games_by_game_id: games_by_game_id,
    team_seasons:team_seasons
  });
  team_seasons.forEach((ts) => (ts.captured_cities = [ts.team.city]));


  let team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );
  let team_seasons_by_team_id = index_group_sync(
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

  teams.forEach(function (t) {
    t.county_middle_points = [];
    t.county_srs_middle_points = [];
    t.srs = t.team_season.rankings.srs_ratings[0] ** 1.5;
    t.conquered_team_ids = [t.team_id];
  });

  console.log({
    teams: teams,
    team_city_states: team_city_states,
    cities: cities,
  });

  common.stopwatch(common, "In Drawmaps");
  let json_url = "/static/data/import_json/counties_lowres.json";
  let fetched_json = await fetch(json_url);
  common.stopwatch(common, "Fetches json");
  let json_raw = await fetched_json.text();
  let counties = JSON.parse(json_raw);
  common.stopwatch(common, "Parsed JSON");

  console.log({ counties: counties });

  for (let county of counties.features) {
    let county_properties = county.properties;
    let county_geometry = county.geometry;
    let all_coords = county_geometry.coordinates[0];
    county.properties.team_season_id_by_week_id = {};
    county.properties.colors_by_week_id = {};
    if (Array.isArray(all_coords[0][0])) {
      all_coords = all_coords[0];
    }

    let all_lats = all_coords.map((c) => c[1]);
    let all_longs = all_coords.map((c) => c[0]);
    let middle_lat = (Math.min(...all_lats) + Math.max(...all_lats)) / 2;
    let middle_long = (Math.min(...all_longs) + Math.max(...all_longs)) / 2;

    if (isNaN(middle_lat)) {
      console.log("Didnt work", {
        middle_long: middle_long,
        middle_lat: middle_lat,
        all_longs: all_longs,
        all_lats: all_lats,
        all_coords: all_coords,
        county_geometry: county_geometry,
      });
    }
    // else {
    //   console.log('Worked', {
    //     middle_long:middle_long, middle_lat:middle_lat, all_longs:all_longs, all_lats:all_lats, all_coords:all_coords, county_geometry:county_geometry
    //   })
    // }
    county.properties.middle_point_coordinates = [middle_lat, middle_long];

    let closest_distance = 1000000;
    let closest_distance_srs = 1000000;
    let closest_team = null;
    let closest_team_srs = null;
    for (let team of teams) {
      let team_distance = common.distance_between_coordinates(
        [team.city.lat, team.city.long],
        [middle_lat, middle_long]
      );
      let team_distance_srs = team_distance / team.srs;
      closest_distance = Math.min(team_distance, closest_distance);
      closest_distance_srs = Math.min(team_distance_srs, closest_distance_srs);
      if (closest_distance == team_distance) {
        county.properties.closest_team_color = team.team_color_primary_hex;
        closest_team = team;
      }

      if (closest_distance_srs == team_distance_srs) {
        county.properties.closest_srs_team_color = team.team_color_primary_hex;
        closest_team_srs = team;
      }
    }

    if (closest_team) {
      closest_team.county_middle_points.push([middle_lat, middle_long]);
      closest_team_srs.county_srs_middle_points.push([middle_lat, middle_long]);
    }

    weeks.forEach(function (w, ind) {

      if (ind == 0) {
        county.properties.team_season_id_by_week_id[w.week_id] =
          closest_team.team_season.team_season_id;
      } else if (
        
        county.properties.team_season_id_by_week_id[w.week_id - 1] in
        w.team_games_by_team_season_id
      ) {
        let team_season_id = county.properties.team_season_id_by_week_id[w.week_id - 1];

        if (w.team_games_by_team_season_id[team_season_id].is_winning_team) {
          county.properties.team_season_id_by_week_id[w.week_id] = county.properties.team_season_id_by_week_id[w.week_id - 1]
        } else {

          county.properties.team_season_id_by_week_id[w.week_id] = w.team_games_by_team_season_id[team_season_id].opponent_team_season_id;
        }
      } else {
        county.properties.team_season_id_by_week_id[w.week_id] =
          county.properties.team_season_id_by_week_id[w.week_id - 1];
      }

      county.properties.colors_by_week_id[w.week_id] =
        team_seasons_by_team_season_id[
          county.properties.team_season_id_by_week_id[w.week_id]
        ].team.team_color_primary_hex;
    });
  }

  console.log({ weeks: weeks , counties:counties});

  weeks.forEach(function (w, ind) {
    console.log(w)

    if (!w.games){
      return true;
    }

    w.games.forEach(function(g){
      let winning_team_season_id = g.outcome.winning_team.team_season_id;
      let losing_team_season_id = g.outcome.losing_team.team_season_id;

      let winning_team_season = team_seasons_by_team_season_id[winning_team_season_id];
      let losing_team_season = team_seasons_by_team_season_id[losing_team_season_id];

      losing_team_season.captured_cities.forEach(function(c){
        c.movement = c.movement || []
        c.movement.push({week_id: w.week_id, from: losing_team_season_id, to: winning_team_season_id});
      })

      winning_team_season.captured_cities = winning_team_season.captured_cities.concat(losing_team_season.captured_cities)
      losing_team_season.captured_cities = []
    });
  });

  console.log({weeks:weeks, teams:teams, team_seasons_by_team_season_id:team_seasons_by_team_season_id})
  debugger;

  teams.forEach(function (t) {
    let all_lats = t.county_middle_points.map((c) => c[1]);
    let all_longs = t.county_middle_points.map((c) => c[0]);
    t.middle_lat = (Math.min(...all_lats) + Math.max(...all_lats)) / 2;
    t.middle_long = (Math.min(...all_longs) + Math.max(...all_longs)) / 2;

    let srs_all_lats = t.county_srs_middle_points.map((c) => c[1]);
    let srs_all_longs = t.county_srs_middle_points.map((c) => c[0]);
    t.srs_middle_lat =
      (Math.min(...srs_all_lats) + Math.max(...srs_all_lats)) / 2;
    t.srs_middle_long =
      (Math.min(...srs_all_longs) + Math.max(...srs_all_longs)) / 2;
  });

  console.log({ teams: teams, counties: counties });

  common.stopwatch(common, "Enhanced JSON");

  let map = L.map("closest-map").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  common.stopwatch(common, "Added map");

  let icon_html_template = `<img class='logo logo-20 team-logo-marker' src="{{team.team_logo}}"/>`;

  let marker_list = [];
  teams.forEach(async function (team) {
    if (!team.middle_lat || !team.middle_long) {
      console.log("skipping", team);
      return false;
    }
    let icon_html = await common.nunjucks_env.renderString(icon_html_template, {
      team: team,
    });
    let school_icon = L.divIcon({
      html: icon_html,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    let marker = L.marker([team.city.lat, team.city.long], {
      icon: school_icon,
    });
    marker_list.push(marker);
    marker.addTo(map);
  });

  // markers
  //   .addLayer(marker)
  //   .addTo(map);
  // console.log({marker:marker, markers:markers})

  // var group = new L.featureGroup(marker_list);
  // map.fitBounds(group.getBounds().pad(0.05));

  L.geoJson(counties, {
    style: setStyle_base,
  }).addTo(map);

  console.log({ counties: counties, teams: teams });

  console.log({
    memphis_counties: counties.features.filter(
      (c) => c.properties.NAME == "Shelby" && c.properties.STATE == "47"
    ),
  });

  common.stopwatch(common, "Done drawing map");

  map.on("zoomend", function () {
    var newzoom = "" + 5 * map.getZoom() + "px";
    console.log({
      newzoom: newzoom,
      zoom: map.getZoom(),
    });
    $("#closest-map .team-logo-marker").css({
      width: newzoom,
      height: newzoom,
    });
  });

  let srs_map = L.map("srs-map").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(srs_map);

  common.stopwatch(common, "Added map");

  let srs_marker_list = [];
  teams.forEach(async function (team) {
    if (!team.srs_middle_lat || !team.srs_middle_long) {
      console.log("skipping", team);
      return false;
    }
    let icon_html = await common.nunjucks_env.renderString(icon_html_template, {
      team: team,
    });
    let school_icon = L.divIcon({
      html: icon_html,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    let marker = L.marker([team.city.lat, team.city.long], {
      icon: school_icon,
    });
    srs_marker_list.push(marker);
    marker.addTo(srs_map);
  });

  // markers
  //   .addLayer(marker)
  //   .addTo(map);
  // console.log({marker:marker, markers:markers})

  // var group = new L.featureGroup(marker_list);
  // map.fitBounds(group.getBounds().pad(0.05));

  L.geoJson(counties, {
    style: setStyle_srs,
  }).addTo(srs_map);

  console.log({ counties: counties, teams: teams });

  common.stopwatch(common, "Done drawing map");

  srs_map.on("zoomend", function () {
    var newzoom = "" + 5 * srs_map.getZoom() + "px";
    console.log({
      newzoom: newzoom,
      zoom: srs_map.getZoom(),
    });
    $("#srs-map .team-logo-marker").css({ width: newzoom, height: newzoom });
  });

  let imperial_map = L.map("imperial-map").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(imperial_map);

  common.stopwatch(common, "Added map");

  let imperial_marker_list = [];
  teams.forEach(async function (team) {

    let captured_cities = team_seasons_by_team_season_id[team.team_season.team_season_id].captured_cities;
    let icon_html = await common.nunjucks_env.renderString(icon_html_template, {
      team: team,
    });
    let school_icon = L.divIcon({
      html: icon_html,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    for (let city of captured_cities){
      let marker = L.marker([city.lat, city.long], {
        icon: school_icon,
      });
      imperial_marker_list.push(marker);
      marker.addTo(imperial_map);
    }
  });

  // markers
  //   .addLayer(marker)
  //   .addTo(map);
  // console.log({marker:marker, markers:markers})

  // var group = new L.featureGroup(marker_list);
  // map.fitBounds(group.getBounds().pad(0.05));

  L.geoJson(counties, {
    style: setStyle_imperial,
  }).addTo(imperial_map);

  console.log({ counties: counties, teams: teams });

  common.stopwatch(common, "Done drawing map");

  imperial_map.on("zoomend", function () {
    var newzoom = "" + 5 * imperial_map.getZoom() + "px";
    console.log({
      newzoom: newzoom,
      zoom: imperial_map.getZoom(),
    });
    $("#imperial-map .team-logo-marker").css({
      width: newzoom,
      height: newzoom,
    });
  });
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
