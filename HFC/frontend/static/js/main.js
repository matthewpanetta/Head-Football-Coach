'use strict';

const index_group_sync$1 = (data, group_type, key) => {
  var dict = {};
  data = data || [];
  if (group_type == "group") {
    data.forEach(function (elem) {
      dict[get(elem, key)] = dict[get(elem, key)] || [];
      dict[get(elem, key)].push(elem);
    });
  } else if (group_type == "index") {
    data.forEach((elem) => (dict[get(elem, key)] = elem));
  }

  return dict;
};

const get = (obj, key) => {
  return get_from_dict(obj, key);
};

const distinct = (arr) => {
  return [...new Set(arr)];
};

const sum$1 = (arr) => {
  return arr.reduce((a, b) => a + b, 0);
};

const nest_children$1 = (parent_array, child_dict, join_key, store_key) => {
  if (Array.isArray(child_dict)) {
    console.log("********POTENTIAL BUG************");
    console.log("Array being passed to nest_children!!!!!!!");
  }

  for (const parent of parent_array) {
    parent[store_key] = child_dict[parent[join_key]];
  }

  return parent_array;
};

const deep_copy$1 = (obj) => {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
  
    if (obj.constructor === RegExp) {
      return obj;
    }
  
    const return_value = new obj.constructor();
  
    for (const key of Object.keys(obj)) {
      return_value[key] = deep_copy$1(obj[key]);
    }
  
    return return_value;
  };
  
  const get_from_dict = (obj, key) => {
    let key_parts = key.split(".");
    let iter_obj = obj;
    let loop_count = 0;
    let max_loop = key_parts.length;
    for (let key_part of key_parts) {
      loop_count += 1;
      if (loop_count == max_loop) {
        if (key_part in iter_obj) {
          return iter_obj[key_part];
        }
        return null;
      }
      if (typeof iter_obj === "object") {
        if (key_part in iter_obj) {
          iter_obj = iter_obj[key_part];
          continue;
        } else {
          return null;
        }
      }
    }
  };

const position_order_map = {
  QB: 1,
  RB: 2,
  FB: 3,
  WR: 4,
  TE: 5,
  OT: 6,
  IOL: 7,

  EDGE: 8,
  DL: 9,
  LB: 10,
  CB: 11,
  S: 12,

  K: 13,
  P: 14,
};

const position_group_map = {
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

  K: "Offense",
  P: "Defense",
};

const world_options = [
  {
    display: "Full Modern World",
    description: "All conferences and teams as of 2022",
    database_suffix: "",
  },
  {
    display: "Small Modern World",
    description:
      "Conferences and teams as of 2022, including SEC, Pac-12, AAC, MAC, and Independents",
    database_suffix: "_small",
  },
  {
    display: "Super Small Modern World",
    description: "Conferences and teams as of 2022, including SEC, B10",
    database_suffix: "_super_small",
  },
  {
    display: "Full World - 2024",
    description:
      "All conferences and teams as of 2024, including notable upcoming conference changes",
    database_suffix: "_2024",
  },
  {
    display: "Full World - 2010",
    description: "All conferences and teams, as they existed in 2010",
    database_suffix: "_2010",
  },
];

const draw_player_faces = async (common) => {
  const db = common.db;
  common.season;

  const player_ids = [];
  const face_div_by_player_id = {};

  $(".PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }
    player_ids.push(parseInt($(elem).attr("player_id")));
    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
  });

  const players = db.player.find({ player_id: { $in: player_ids } });
  var player_team_seasons = db.player_team_season.find({ player_id: { $in: player_ids } });
  const player_team_seasons_by_player_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_id"
  );

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  for (var player of players) {
    var elems = face_div_by_player_id[player.player_id];
    player.player_team_season = player_team_seasons_by_player_id[player.player_id];
    player.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id];
    player.team = teams_by_team_id[player.team_season.team_id];

    if (player.player_face == undefined) {
      player.player_face = await common.create_player_face("single", player.player_id, db);
    }

    for (var elem of elems) {
      display_player_face(
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

const draw_coach_faces = async (common) => {
  const db = common.db;
  const season = common.season;

  const coach_ids = [];
  const face_div_by_coach_id = {};

  $(".PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }
    coach_ids.push(parseInt($(elem).attr("coach_id")));
    if (!(parseInt($(elem).attr("coach_id")) in face_div_by_coach_id)) {
      face_div_by_coach_id[parseInt($(elem).attr("coach_id"))] = [];
    }

    face_div_by_coach_id[parseInt($(elem).attr("coach_id"))].push(elem);
  });

  const coaches = await db.coach.bulkGet(coach_ids);
  var coach_team_seasons = await db.coach_team_season.where("coach_id").anyOf(coach_ids).toArray();
  coach_team_seasons = coach_team_seasons.filter((pts) => pts.season == season);
  const coach_team_seasons_by_coach_id = index_group_sync$1(coach_team_seasons, "index", "coach_id");

  const team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  for (var coach of coaches) {
    var elems = face_div_by_coach_id[coach.coach_id];
    coach.coach_team_season = coach_team_seasons_by_coach_id[coach.coach_id];
    coach.team_season = team_seasons_by_team_season_id[coach.coach_team_season.team_season_id];
    coach.team = teams_by_team_id[coach.team_season.team_id];

    if (coach.coach_face == undefined) {
      coach.coach_face = await common.create_coach_face("single", coach.coach_id, db);
    }

    for (var elem of elems) {
      display_player_face(
        coach.coach_face,
        {
          jersey: { id: "suit" },
          teamColors: coach.team.jersey.teamColors,
        },
        $(elem).attr("id")
      );
    }
  }
};

const display_player_face = async (face, overrides, dom_id) => {
  if ("jersey" in overrides && overrides.jersey.id == "suit") {
    overrides["accessories"] = { id: "none" };
    face.glasses.id = "none";
  }

  face = override(face, overrides);

  const container_element = $("#" + dom_id);

  $(container_element).html("");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("version", "1.2");
  svg.setAttribute("baseProfile", "tiny");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 400 600");
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

  // Needs to be in the DOM here so getBBox will work
  $(container_element).append(svg);

  const featureInfos = [
    {
      name: "hairBg",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "body",
      positions: [null],
    },
    {
      name: "jersey",
      positions: [null],
    },
    {
      name: "ear",
      positions: [
        [55, 325],
        [345, 325],
      ],
      scaleFatness: true,
    },
    {
      name: "head",
      positions: [null], // Meaning it just gets placed into the SVG with no translation
      scaleFatness: true,
    },
    {
      name: "eyeLine",
      positions: [null],
    },
    {
      name: "smileLine",
      positions: [
        [150, 435],
        [250, 435],
      ],
    },
    {
      name: "miscLine",
      positions: [null],
    },
    {
      name: "facialHair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "eye",
      positions: [
        [140, 310],
        [260, 310],
      ],
    },
    {
      name: "eyebrow",
      positions: [
        [140, 270],
        [260, 270],
      ],
    },
    {
      name: "mouth",
      positions: [[200, 440]],
    },
    {
      name: "nose",
      positions: [[200, 370]],
    },
    {
      name: "hair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "glasses",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "accessories",
      positions: [null],
      scaleFatness: true,
    },
  ];

  if (!window.svgs) {
    var url = `/static/data/import_json/svgs.json`;
    var html = await fetch(url);
    window.svgs = await html.json();
  }

  featureInfos.forEach(function (info) {
    drawFeature(svg, face, info);
  });
};

const override = (face, overrides) => {
  $.each(overrides, function (key, val) {
    face[key] = val;
  });

  return face;
};

const addWrapper = (svgString) => {
  return `<g>${svgString}</g>`;
};

const addTransform = (element, newTransform) => {
  const oldTransform = $(element).attr("transform");
  element.setAttribute("transform", `${oldTransform ? `${oldTransform} ` : ""}${newTransform}`);
};

const rotateCentered = (element, angle) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  addTransform(element, `rotate(${angle} ${cx} ${cy})`);
};

const scaleStrokeWidthAndChildren = (element, factor) => {
  const strokeWidth = $(element).attr("stroke-width");
  if (strokeWidth) {
    element.setAttribute("stroke-width", String(parseFloat(strokeWidth) / factor));
  }
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    scaleStrokeWidthAndChildren(children[i], factor);
  }
};

// Scale relative to the center of bounding box of element e, like in Raphael.
// Set x and y to 1 and this does nothing. Higher = bigger, lower = smaller.
const scaleCentered = (element, x, y) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const tx = (cx * (1 - x)) / x;
  const ty = (cy * (1 - y)) / y;

  addTransform(element, `scale(${x} ${y}) translate(${tx} ${ty})`);

  // Keep apparent stroke width constant, similar to how Raphael does it (I think)
  if (Math.abs(x) !== 1 || Math.abs(y) !== 1 || Math.abs(x) + Math.abs(y) !== 2) {
    const factor = (Math.abs(x) + Math.abs(y)) / 2;
    scaleStrokeWidthAndChildren(element, factor);
  }
};

// Translate element such that its center is at (x, y). Specifying xAlign and yAlign can instead make (x, y) the left/right and top/bottom.
const translate = (element, x, y, xAlign = "center", yAlign = "center") => {
  const bbox = element.getBBox();
  var cx;
  var cy;
  if (xAlign === "left") {
    cx = bbox.x;
  } else if (xAlign === "right") {
    cx = bbox.x + bbox.width;
  } else {
    cx = bbox.x + bbox.width / 2;
  }
  if (yAlign === "top") {
    cy = bbox.y;
  } else if (yAlign === "bottom") {
    cy = bbox.y + bbox.height;
  } else {
    cy = bbox.y + bbox.height / 2;
  }

  addTransform(element, `translate(${x - cx} ${y - cy})`);
};

// Defines the range of fat/skinny, relative to the original width of the default head.
const fatScale = (fatness) => 0.8 + 0.2 * fatness;

const drawFeature = async (svg, face, info) => {
  const feature = face[info.name];
  if (!feature) {
    return;
  }

  var featureSVGString = window.svgs[info.name][feature.id];

  if (!featureSVGString) {
    return;
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[faceShave]", feature.shave);
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[headShave]", feature.shave);
  }

  const player_id = $(svg).parent().attr("player_id") || $(svg).parent().attr("coach_id");

  featureSVGString = featureSVGString.replaceAll("$[player_id]", `${player_id}-${info.name}`);
  featureSVGString = featureSVGString.replace("$[skinColor]", face.body.color);
  featureSVGString = featureSVGString.replace(/\$\[hairColor\]/g, face.hair.color);
  featureSVGString = featureSVGString.replace(/\$\[primary\]/g, face.teamColors[0]);
  featureSVGString = featureSVGString.replace(/\$\[secondary\]/g, face.teamColors[1]);
  featureSVGString = featureSVGString.replace(/\$\[accent\]/g, face.teamColors[2]);
  featureSVGString = featureSVGString.replace(
    /\$\[jersey-lettering-text\]/g,
    face.jersey.lettering || ""
  );
  featureSVGString = featureSVGString.replace(
    /\$\[jersey-lettering-color\]/g,
    face.jersey.lettering_color
  );
  if (face.jersey.lettering) {
    let font_size = Math.floor(80 - 5 * face.jersey.lettering.length);
    featureSVGString = featureSVGString.replace(/\$\[font-size\]/g, font_size);

    let font_y_pos = Math.floor(645 - 5 * face.jersey.lettering.length);
    featureSVGString = featureSVGString.replace(/\$\[font-y-pos\]/g, font_y_pos);
  } else {
    featureSVGString = featureSVGString.replace(/\$\[font-y-pos\]/g, 0);
  }

  for (let i = 0; i < info.positions.length; i++) {
    svg.insertAdjacentHTML("beforeend", addWrapper(featureSVGString));

    const position = info.positions[i];

    if (position !== null) {
      // Special case, for the pinocchio nose it should not be centered but should stick out to the left or right
      var xAlign;
      if (feature.id === "nose4" || feature.id === "pinocchio") {
        // @ts-ignore
        xAlign = feature.flip ? "right" : "left";
      } else {
        xAlign = "center";
      }

      translate(svg.lastChild, position[0], position[1], xAlign);
    }

    if (feature.hasOwnProperty("angle")) {
      // @ts-ignore
      rotateCentered(svg.lastChild, (i === 0 ? 1 : -1) * feature.angle);
    }

    // Flip if feature.flip is specified or if this is the second position (for eyes and eyebrows). Scale if feature.size is specified.
    // @ts-ignore
    const scale = feature.hasOwnProperty("size") ? feature.size : 1;
    // @ts-ignore
    if (feature.flip || i === 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, -scale, scale);
    } else if (scale !== 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, scale, scale);
    }

    if (info.scaleFatness && info.positions[0] !== null) {
      // Scale individual feature relative to the edge of the head. If fatness is 1, then there are 47 pixels on each side. If fatness is 0, then there are 78 pixels on each side.
      const distance = (78 - 47) * (1 - face.fatness);
      // @ts-ignore
      translate(svg.lastChild, distance, 0, "left", "top");
    }
  }

  if (info.scaleFatness && info.positions.length === 1 && info.positions[0] === null) {
    // @ts-ignore
    scaleCentered(svg.lastChild, fatScale(face.fatness), 1);
  }
};

const page_world = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  console.log({
    common: common,
    db: db,
  });

  var current_week = db.week.find({ season: { $between: [season - 1, season + 1] } });
  current_week = current_week.find((w) => w.is_current);

  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "World",
    db: db,
  });

  common.stopwatch(common, "Time before recent_games");
  const recent_games = common.recent_games(common);
  common.stopwatch(common, "Time after recent_games");

  let teams = db.team.find({ team_id: { $gt: 0 } });
  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  let conferences = db.conference.find();
  let conference_seasons = db.conference_season.find({ season: season });
  let this_week_team_games = db.team_game.find({ week_id: current_week.week_id });
  let this_week_games = db.game.find({ week_id: current_week.week_id });
  let headlines = db.headline.find({ week_id: current_week.week_id - 1 });

  var conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  var conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");
  var team_seasons_by_team_id = index_group_sync$1(team_seasons, "index", "team_id");
  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");
  common.stopwatch(common, "Time after selecting teams");

  $.each(teams, async function (ind, team) {
    team.team_season = team_seasons_by_team_id[team.team_id];
    team.team_season.conference_season =
      conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
    team.team_season.conference_season.conference =
      conferences_by_conference_id[team.team_season.conference_season.conference_id];

    team.conference_position_display = `${team.team_season.rankings.division_rank[0]} in ${team.team_season.conference_season.conference.conference_abbreviation}`;
    if (team.team_season.results.conference_champion) {
      team.conference_position_display = `${team.team_season.conference_season.conference.conference_abbreviation} Champions`;
    }
  });

  teams.sort(function (a, b) {
    if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0])
      return -1;
    if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
    return 0;
  });

  common.stopwatch(common, "Time after sorting team seasons");

  var this_week_team_games_by_team_game_id = index_group_sync$1(
    this_week_team_games,
    "index",
    "team_game_id"
  );

  common.stopwatch(common, "Time after fetching team games");

  common.stopwatch(common, "Time after fetching games");

  var min_national_rank = 0;
  $.each(this_week_games, function (ind, game) {
    game.game_headline_display = "";
    if (game.bowl != null) {
      game.game_headline_display = game.bowl.bowl_name;
    } else if (game.rivalry != null) {
      if (game.rivalry.rivalry_name.length > 0) {
        game.game_headline_display = game.rivalry.rivalry_name;
      } else {
        game.game_headline_display = "Rivalry Game";
      }
    }

    game.home_team_game = this_week_team_games_by_team_game_id[game.home_team_game_id];
    game.away_team_game = this_week_team_games_by_team_game_id[game.away_team_game_id];

    game.home_team_game.team_season =
      team_seasons_by_team_season_id[game.home_team_game.team_season_id];
    game.away_team_game.team_season =
      team_seasons_by_team_season_id[game.away_team_game.team_season_id];

    game.home_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };
    game.away_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };

    game.home_team_game.team_season.team =
      teams_by_team_id[game.home_team_game.team_season.team_id];
    game.away_team_game.team_season.team =
      teams_by_team_id[game.away_team_game.team_season.team_id];

    game.team_games = [game.away_team_game, game.home_team_game];

    min_national_rank = Math.min(
      game.home_team_game.team_season.national_rank,
      game.away_team_game.team_season.national_rank
    );
    game.summed_national_rank =
      game.home_team_game.team_season.national_rank +
      game.away_team_game.team_season.national_rank +
      min_national_rank;
  });

  this_week_games = this_week_games.sort(function (g_a, g_b) {
    if (g_a.team_games[0].team_season.is_user_team || g_a.team_games[1].team_season.is_user_team)
      return -1;
    if (g_b.team_games[0].team_season.is_user_team || g_b.team_games[1].team_season.is_user_team)
      return 1;
    if (g_a.summed_national_rank < g_b.summed_national_rank) return -1;
    if (g_a.summed_national_rank > g_b.summed_national_rank) return 1;
    return 0;
  });

  let headline_type_map = {
    game: "Last Week Games",
    ranking: "AP Top 25",
    recruiting: "247 Recruiting",
  };
  headlines.forEach(function (h) {
    h.headline_type_display = headline_type_map[h.headline_type];
    h.team_seasons = h.team_season_ids.map((ts_id) => team_seasons_by_team_season_id[ts_id]);
  });
  headlines = headlines.sort((h_a, h_b) => h_b.headline_relevance - h_a.headline_relevance);
  let headlines_by_headline_type = index_group_sync$1(headlines, "group", "headline_type_display");

  common.stopwatch(common, "Time after this_week_games");
  const page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: "Head Football Coach",
  };
  var render_content = {
    team_list: [],
    page: page,
    world_id: common.world_id,
    teams: teams,
    recent_games: recent_games,
    current_week: current_week,
    headlines_by_headline_type: headlines_by_headline_type,
    this_week_games: this_week_games,
  };

  common.render_content = render_content;
  window.common = common;

  console.log("render_content", render_content);
  console.log({ recent_games: recent_games });

  let url = "/static/html_templates/world/world/template.njk";
  let html = await fetch(url);
  html = await html.text();

  let renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").empty();
  $("#body").append(renderedHtml);

  console.log({
    teams: teams,
    this_week_games: this_week_games,
    recent_games: recent_games,
  });

  let user_team_overview_data = {
    user_team: teams.find((t) => t.is_user_team),
    this_week_game: this_week_games.find(
      (g) => g.team_games[0].team_season.is_user_team || g.team_games[1].team_season.is_user_team
    ),
    last_week_game: recent_games.find(
      (g) => g.team_games[0].team_season.is_user_team || g.team_games[1].team_season.is_user_team
    ),
  };

  console.log({ user_team_overview_data: user_team_overview_data });

  let preseason_info = {};
  let season_recap = {};
  common.stopwatch(common, "Time before pre-season");
  if (current_week.week_name == "Pre-Season") {
    // TODO filter out backups
    preseason_info.conference_favorites = [];

    let team_seasons = db.team_season.find({
      season: { $between: [common.season - 1, common.season] },
      team_id: { $gt: 0 },
    });
    let all_teams = db.team.find();
    let player_team_seasons = db.player_team_season.find({
      season: { $between: [common.season - 1, common.season] },
    });
    let all_preseason_awards = db.award.find({ week_id: current_week.week_id });

    const teams_by_team_id = index_group_sync$1(all_teams, "index", "team_id");

    team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");

    const team_seasons_by_team_season_id = index_group_sync$1(
      team_seasons,
      "index",
      "team_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season team_seasons");

    player_team_seasons = player_team_seasons.filter((pts) => pts.team_season_id > 0);
    let player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);

    common.stopwatch(common, "Time after fetching pre season pts");
    const player_ids = distinct(player_team_seasons.map((pts) => pts.player_id));

    let player_team_season_stats = db.player_team_season_stats.find({
      player_team_season_id: { $in: player_team_season_ids },
    });
    let players = db.player.find({ player_id: { $in: player_ids } });
    let conferences = db.conference.find();
    let conference_seasons = db.conference_season.find({ season: season });

    const player_team_season_stats_by_player_team_season_id = index_group_sync$1(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    common.stopwatch(common, "Time after fetching pre season ptss");

    const players_by_player_id = index_group_sync$1(players, "index", "player_id");

    common.stopwatch(common, "Time after fetching pre season players");

    player_team_seasons = nest_children$1(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      team_seasons_by_team_season_id,
      "team_season_id",
      "team_season"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );

    let previous_player_team_seasons = player_team_seasons.filter(
      (pts) => pts.season == common.season - 1
    );

    player_team_seasons = player_team_seasons.filter((pts) => pts.season == common.season);
    team_seasons = team_seasons.filter((ts) => ts.season == common.season);

    let previous_player_team_seasons_by_player_id = index_group_sync$1(
      previous_player_team_seasons,
      "index",
      "player_id"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      previous_player_team_seasons_by_player_id,
      "player_id",
      "previous_player_team_season"
    );
    player_team_seasons.forEach(
      (pts) =>
        (pts.previous_player_team_season = pts.previous_player_team_season || {
          player_award_rating: pts.player_award_rating,
        })
    );

    common.stopwatch(common, "Time after indexing & filtering players & ptss");

    var heisman_race = player_team_seasons.filter((pts) => pts.depth_chart_rank == 1);
    heisman_race = heisman_race.sort(function (pts_a, pts_b) {
      return (
        pts_b.previous_player_team_season.player_award_rating -
        pts_a.previous_player_team_season.player_award_rating
      );
    });
    preseason_info.heisman_hopefuls = heisman_race.slice(0, 5);

    common.stopwatch(common, "Time after sorting pre season pts");

    let conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");
    conference_seasons = nest_children$1(
      conference_seasons,
      conferences_by_conference_id,
      "conference_id",
      "conference"
    );
    const team_seasons_by_conference_season_id = index_group_sync$1(
      team_seasons,
      "group",
      "conference_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season conferences");

    for (let conference_season of conference_seasons) {
      let team_seasons_for_conference =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];
      team_seasons_for_conference = team_seasons_for_conference.sort(function (ts_a, ts_b) {
        return (
          ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0] ||
          ts_a.national_rank - ts_b.national_rank
        );
      });

      conference_season.team_seasons = team_seasons_for_conference;
    }

    conference_seasons = conference_seasons.sort(
      (cs_a, cs_b) => cs_b.conference.prestige - cs_a.conference.prestige
    );

    preseason_info.conference_favorites = conference_seasons;
    render_content.preseason_info = preseason_info;
    url = "/static/html_templates/world/world/info_col_preseason.njk";

    let player_team_seasons_by_player_team_season_id = index_group_sync$1(
      player_team_seasons,
      "index",
      "player_team_season_id"
    );
    all_preseason_awards = nest_children$1(
      all_preseason_awards,
      player_team_seasons_by_player_team_season_id,
      "player_team_season_id",
      "player_team_season"
    );
    console.log({
      all_preseason_awards: all_preseason_awards,
      user_team_overview_data: user_team_overview_data,
    });
    let user_team_preseason_awards = all_preseason_awards.filter(
      (a) => a.player_team_season.team_season.team_id == user_team_overview_data.user_team.team_id
    );

    user_team_overview_data.preseason_all_conference = user_team_preseason_awards.filter(
      (a) => a.award_team_set == "conference"
    );
    user_team_overview_data.preseason_all_american = user_team_preseason_awards.filter(
      (a) => a.award_team_set == "national"
    );
  } else if (current_week.week_name == "Season Recap") {
    team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
    let team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

    const awards = db.award.find({ season: common.season });
    var heisman_award = awards.find((a) => a.award_group_type == "Heisman");
    let conference_season_poty_awards = awards.filter(
      (a) =>
        a.award_group == "individual" &&
        a.award_timeframe == "regular season" &&
        a.award_team_set == "conference"
    );

    let player_team_season_ids = conference_season_poty_awards
      .map((a) => a.player_team_season_id)
      .concat([heisman_award.player_team_season_id]);
    let player_team_seasons = db.player_team_season.find({
      player_team_season_id: { $in: player_team_season_ids },
    });

    let player_ids = player_team_seasons.map((pts) => pts.player_id);

    let players = db.player.find({ player_id: { $in: player_ids } });
    let player_team_season_stats = db.player_team_season_stats.find({
      player_team_season_id: { $in: player_team_season_ids },
    });

    let players_by_player_id = index_group_sync$1(players, "index", "player_id");
    let player_team_season_stats_by_player_team_season_id = index_group_sync$1(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );

    player_team_seasons = nest_children$1(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      team_seasons_by_team_season_id,
      "team_season_id",
      "team_season"
    );
    let player_team_seasons_by_player_team_season_id = index_group_sync$1(
      player_team_seasons,
      "index",
      "player_team_season_id"
    );

    heisman_award.player_team_season =
      player_team_seasons_by_player_team_season_id[heisman_award.player_team_season_id];
    conference_season_poty_awards = nest_children$1(
      conference_season_poty_awards,
      player_team_seasons_by_player_team_season_id,
      "player_team_season_id",
      "player_team_season"
    );

    let conference_winning_team_seasons = team_seasons.filter(
      (ts) => ts.results.conference_champion
    );
    let conference_winning_team_seasons_by_conference_season_id = index_group_sync$1(
      conference_winning_team_seasons,
      "index",
      "conference_season_id"
    );
    let conference_season_ids = conference_winning_team_seasons.map(
      (ts) => ts.conference_season_id
    );
    let conference_seasons = db.conference_season.find({
      conference_season_id: { $in: conference_season_ids },
    });
    let conference_ids = conference_seasons.map((cs) => cs.conference_id);
    let conferences = db.conference.find({ conference_id: { $in: conference_ids } });
    let conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

    let conference_season_poty_awards_by_conference_season_id = index_group_sync$1(
      conference_season_poty_awards,
      "index",
      "conference_season_id"
    );

    conference_seasons = nest_children$1(
      conference_seasons,
      conference_season_poty_awards_by_conference_season_id,
      "conference_season_id",
      "poty_award"
    );
    conference_seasons = nest_children$1(
      conference_seasons,
      conferences_by_conference_id,
      "conference_id",
      "conference"
    );
    // let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')
    conference_seasons = nest_children$1(
      conference_seasons,
      conference_winning_team_seasons_by_conference_season_id,
      "conference_season_id",
      "team_season"
    );
    conference_seasons = conference_seasons.sort((cs_a, cs_b) =>
      cs_b.conference.conference_name > cs_a.conference.conference_name ? -1 : 1
    );

    let national_champions_team_season = team_seasons.find((ts) => ts.results.national_champion);
    let champion_other_team_seasons = db.team_season
      .find({ team_id: national_champions_team_season.team_id })
      .filter((ts) => ts.results.national_champion);
    national_champions_team_season.national_championship_count = champion_other_team_seasons.length;
    season_recap.national_champions_team_season = national_champions_team_season;
    season_recap.heisman_award = heisman_award;
    season_recap.conference_seasons = conference_seasons;

    render_content.season_recap = season_recap;
    url = "/static/html_templates/world/world/info_col_season_recap.njk";
  } else {
    url = "/static/html_templates/world/world/info_col_season.njk";
  }

  common.render_content = render_content;

  console.log("render_content", render_content);

  html = await fetch(url);
  html = await html.text();

  renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#info-col").html(renderedHtml);

  console.log({ user_team_overview_data: user_team_overview_data, teams: teams });

  let user_team_url = "/static/html_templates/world/world/info_col_user_team.njk";
  let user_team__overview_html = await fetch(user_team_url);
  user_team__overview_html = await user_team__overview_html.text();

  let user_team_rendered_html = common.nunjucks_env.renderString(user_team__overview_html, {
    world_id: common.world_id,
    user_team_overview_data: user_team_overview_data,
  });
  $("#user-team-overview").html(user_team_rendered_html);
};

const page_world_standings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const conference_id = common.params.conference_id;
  console.log("conference_id", conference_id, common);

  const NavBarLinks = await common.nav_bar_links({
    path: "Standings",
    group_name: "World",
    db: db,
  });

  const weeks = db.week.find({ season: season });
  const week_ids = weeks.map((week) => week.week_id);

  let teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");
  let conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");
  var conference_seasons = db.conference_season.find({ season: season });
  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  let games = db.game.find({ week_id: { $in: week_ids } });
  var games_by_game_id = index_group_sync$1(games, "index", "game_id");
  var team_games = db.team_game.find({ week_id: { $in: week_ids } });
  team_games = nest_children$1(team_games, games_by_game_id, "game_id", "game");

  team_games = team_games.filter((tg) => tg.game.was_played == true);
  var team_games_by_team_season_id = index_group_sync$1(team_games, "group", "team_season_id");
  var team_games_by_team_game_id = index_group_sync$1(team_games, "index", "team_game_id");

  console.log({
    team_games_by_team_game_id: team_games_by_team_game_id,
    team_games_by_team_season_id: team_games_by_team_season_id,
    team_games: team_games,
    games_by_game_id: games_by_game_id,
    week_ids: week_ids,
    "db.team_game": db.team_game,
  });

  $.each(team_seasons, async function (ind, team_season) {
    team_season.team = teams_by_team_id[team_season.team_id];

    team_season.team_games = team_games_by_team_season_id[team_season.team_season_id];
    team_season.conference_outcomes = {
      record: team_season.conference_record_display,
      gb: team_season.record.conference_gb,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };
    team_season.overall_outcomes = {
      record: team_season.record_display,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };

    team_season.first_conference_rank =
      team_season.rankings.division_rank[team_season.rankings.division_rank.length - 1];
    team_season.final_conference_rank = team_season.rankings.division_rank[0];
    team_season.delta_conference_rank =
      team_season.final_conference_rank - team_season.first_conference_rank;
    team_season.delta_conference_rank_abs = Math.abs(team_season.delta_conference_rank);

    for (tg of team_season.team_games) {
      tg.opponent_team_game = team_games_by_team_game_id[tg.opponent_team_game_id];
      team_season.overall_outcomes.games_played += 1;
      team_season.overall_outcomes.points_for += tg.points;
      team_season.overall_outcomes.points_against += tg.opponent_team_game.points;

      if (tg.game.is_conference_game) {
        team_season.conference_outcomes.games_played += 1;
        team_season.conference_outcomes.points_for += tg.points;
        team_season.conference_outcomes.points_against += tg.opponent_team_game.points;
      }
    }

    if (team_season.overall_outcomes.games_played > 0) {
      team_season.overall_outcomes.ppg = common.round_decimal(
        team_season.overall_outcomes.points_for / team_season.overall_outcomes.games_played,
        1
      );
      team_season.overall_outcomes.papg = common.round_decimal(
        team_season.overall_outcomes.points_against / team_season.overall_outcomes.games_played,
        1
      );
      team_season.overall_outcomes.mov = common.round_decimal(
        team_season.overall_outcomes.ppg - team_season.overall_outcomes.papg,
        1
      );

      if (team_season.overall_outcomes.mov > 0) {
        team_season.overall_outcomes.color = "W";
      } else if (team_season.overall_outcomes.mov < 0) {
        team_season.overall_outcomes.color = "L";
      }
    }

    if (team_season.conference_outcomes.games_played > 0) {
      team_season.conference_outcomes.ppg = common.round_decimal(
        team_season.conference_outcomes.points_for / team_season.conference_outcomes.games_played,
        1
      );
      team_season.conference_outcomes.papg = common.round_decimal(
        team_season.conference_outcomes.points_against /
          team_season.conference_outcomes.games_played,
        1
      );
      team_season.conference_outcomes.mov = common.round_decimal(
        team_season.conference_outcomes.ppg - team_season.conference_outcomes.papg,
        1
      );

      if (team_season.conference_outcomes.mov > 0) {
        team_season.conference_outcomes.color = "W";
      } else if (team_season.conference_outcomes.mov < 0) {
        team_season.conference_outcomes.color = "L";
      }
    } else {
      team_season.conference_outcomes.ppg = "-";
      team_season.conference_outcomes.papg = "-";
      team_season.conference_outcomes.mov = "-";
    }
  });

  var team_seasons_by_conference_season_id = index_group_sync$1(
    team_seasons,
    "group",
    "conference_season_id"
  );

  for (var conference_season of conference_seasons) {
    conference_season.conference = conferences_by_conference_id[conference_season.conference_id];

    for (let division of conference_season.divisions) {
      division.team_seasons =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];

      division.team_seasons = division.team_seasons.filter(
        (ts) => ts.division_name == division.division_name
      );
      division.team_seasons = division.team_seasons.sort(function (a, b) {
        if (a.rankings.division_rank[0] < b.rankings.division_rank[0]) return -1;
        if (a.rankings.division_rank[0] > b.rankings.division_rank[0]) return 1;
        return 0;
      });
    }
  }

  console.log({ conference_seasons: conference_seasons });
  conference_seasons = conference_seasons.sort(function (conference_season_a, conference_season_b) {
    if (conference_season_a.conference.conference_id == conference_id) return -1;
    if (conference_season_b.conference.conference_id == conference_id) return 1;
    if (conference_season_a.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return -1;
    if (conference_season_b.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return 1;
    if (
      conference_season_a.conference.conference_name <
      conference_season_b.conference.conference_name
    )
      return -1;
    return 1;
  });

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Conference Standings",
    },
    world_id: common.params["world_id"],
    team_list: [],
    recent_games: recent_games,
    conference_seasons: conference_seasons,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/world/standings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  index_group_sync$1(
    conference_seasons,
    "index",
    "conference_id"
  );

  $(`#nav-${conference_seasons[0].conference_id}-tab`).click();
};

const page_world_rankings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const current_league_season = db.league_season.findOne({ season: season });

  const NavBarLinks = await common.nav_bar_links({
    path: "Rankings",
    group_name: "World",
    db: db,
  });

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  var conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  var conference_seasons = db.conference_season.find({ season: season });
  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  var conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = nest_children$1(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  const games = db.game
    .find()
    .filter((g) => g.season == season && g.bowl != null && g.bowl.is_playoff == true);
  const games_by_game_id = index_group_sync$1(games, "index", "game_id");
  const game_ids = games.map((g) => g.game_id);

  const team_games = db.team_game.find({ game_id: { $in: game_ids } });
  const team_games_by_team_game_id = index_group_sync$1(team_games, "index", "team_game_id");

  console.log({
    team_seasons: team_seasons,
    team_seasons_by_team_season_id: team_seasons_by_team_season_id,
    teams_by_team_id: teams_by_team_id,
  });

  let dropped_teams = team_seasons.filter(
    (ts) => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[1] <= 25
  );
  let bubble_teams = team_seasons.filter(
    (ts) => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[0] < 29
  );

  team_seasons = team_seasons.filter((ts) => ts.rankings.national_rank[0] <= 25);

  team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.rankings.national_rank[0] < ts_b.rankings.national_rank[0]) return -1;
    if (ts_a.rankings.national_rank[0] > ts_b.rankings.national_rank[0]) return 1;
    return 0;
  });

  const recent_games = await common.recent_games(common);

  const playoffs = current_league_season.playoffs;

  if (playoffs.playoffs_started) {
    for (const playoff_round of playoffs.playoff_rounds) {
      for (const playoff_game of playoff_round.playoff_games) {
        console.log({ playoff_game: playoff_game });
        playoff_game.game = games_by_game_id[playoff_game.game_id];
        playoff_game.team_objs = nest_children$1(
          playoff_game.team_objs,
          team_seasons_by_team_season_id,
          "team_season_id",
          "team_season"
        );
        playoff_game.team_objs = nest_children$1(
          playoff_game.team_objs,
          team_games_by_team_game_id,
          "team_game_id",
          "team_game"
        );
      }
    }
  } else {
    var projected_playoff_teams = team_seasons.slice(0, playoffs.number_playoff_teams);
    console.log({
      playoffs: playoffs,
      projected_playoff_teams: projected_playoff_teams,
      number_playoff_teams: playoffs.number_playoff_teams,
    });
    for (var playoff_round of playoffs.playoff_rounds) {
      console.log({ playoff_round: playoff_round });
      playoff_round.round_of = 2 * playoff_round.playoff_games.length;
      for (var playoff_game of playoff_round.playoff_games) {
        for (var team_obj of playoff_game.team_objs) {
          team_obj.team_season = projected_playoff_teams[team_obj.seed - 1];
          console.log({
            team_obj: team_obj,
            playoff_game: playoff_game,
            playoff_round: playoff_round,
          });
        }
      }
    }
  }

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Top 25",
    },
    team_list: [],
    world_id: common.params["world_id"],
    team_seasons: team_seasons,
    recent_games: recent_games,
    dropped_teams: dropped_teams,
    bubble_teams: bubble_teams,
    playoffs: playoffs,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/rankings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await PopulateTop25(common);
};

const PopulateTop25 = async (common) => {
  const db = common.db;
  common.index_group;
  const season = common.season;

  common.ordinal;

  var this_week = db.week.find({ season: season });
  console.log("this_week", this_week);
  this_week = this_week.filter((week) => week.is_current)[0];
  const this_week_id = this_week.week_id;
  const last_week_id = this_week_id - 1;

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = team_seasons.sort(function (a, b) {
    if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;
    if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
    return 0;
  });
  const team_ids = team_seasons.map((ts) => ts.team_id);
  db.team.find({ team_id: { $in: team_ids } });

  let this_week_team_games = db.team_game.find({ week_id: this_week_id });
  let last_week_team_games = db.team_game.find({ week_id: last_week_id });

  const total_team_games = Object.values(this_week_team_games).concat(
    Object.values(last_week_team_games)
  );
  const total_team_game_ids = total_team_games.map((team_game) => team_game.game_id);

  let games = db.game.find({ game_id: { $in: total_team_game_ids } });
  const games_by_game_id = index_group_sync$1(games, "index", "game_id");

  let all_teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(all_teams, "index", "team_id");
  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");

  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  last_week_team_games = nest_children$1(last_week_team_games, games_by_game_id, "game_id", "game");
  this_week_team_games = nest_children$1(this_week_team_games, games_by_game_id, "game_id", "game");

  last_week_team_games = nest_children$1(
    last_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  this_week_team_games = nest_children$1(
    this_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  const last_week_team_games_by_team_season_id = index_group_sync$1(
    last_week_team_games,
    "index",
    "team_season_id"
  );
  const this_week_team_games_by_team_season_id = index_group_sync$1(
    this_week_team_games,
    "index",
    "team_season_id"
  );

  let all_team_games = db.team_game.find({ week_id: { $in: [this_week_id, last_week_id] } });
  index_group_sync$1(all_team_games, "index", "team_game_id");

  let conference_seasons = db.conference_season.find({ season: season });
  let conferences = db.conference.find();

  const conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  const conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  team_seasons = nest_children$1(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children$1(
    team_seasons,
    last_week_team_games_by_team_season_id,
    "team_season_id",
    "last_week_team_game"
  );
  team_seasons = nest_children$1(
    team_seasons,
    this_week_team_games_by_team_season_id,
    "team_season_id",
    "this_week_team_game"
  );

  let top_25_team_seasons = team_seasons.slice(0, 25);

  console.log("In PopulateTopTeams!", top_25_team_seasons);

  let table_template_url = "/static/html_templates/world/rankings/ranking_table_template.njk";
  let table_html = await fetch(table_template_url);
  let table_html_text = await table_html.text();

  var renderedHtml = await common.nunjucks_env.renderString(table_html_text, {
    top_25_team_seasons: top_25_team_seasons,
  });
  console.log({ renderedHtml: renderedHtml, top_25_team_seasons: top_25_team_seasons });
  $("#Top25Table-body").empty();
  $("#Top25Table-body").append(renderedHtml);

  init_basic_table_sorting(common, "#Top25Table", null);
};

const page_world_awards = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });

  common.stopwatch(common, "awards - start of gethtml");

  const NavBarLinks = await common.nav_bar_links({
    path: "Awards & Races",
    group_name: "World",
    db: db,
  });
  var player_team_season_ids = [];
  common.stopwatch(common, "awards - after navbarlinks");

  const awards = db.award.find({ season: common.season });
  common.stopwatch(common, "awards - after award fetch");

  var weekly_awards = awards.filter(
    (a) => a.award_timeframe == "week" && a.player_team_game_id != null
  );
  var preseason_awards = awards.filter((a) => a.award_timeframe == "pre-season");
  var regular_season_first_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "First" &&
      a.award_group == "position"
  );
  var regular_season_second_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "Second" &&
      a.award_group == "position"
  );
  var regular_season_freshman_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "Freshman" &&
      a.award_group == "position"
  );
  var trophies = awards.filter(
    (a) => a.award_group == "individual" && a.award_team_set == "national"
  );

  player_team_season_ids = player_team_season_ids.concat(
    weekly_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    preseason_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_first_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_second_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_freshman_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  if (trophies.length > 0) {
    player_team_season_ids.concat(trophies.map((a) => a.player_team_season_id));
  }

  const player_team_game_ids = weekly_awards.map((a) => a.player_team_game_id);

  var conference_seasons = db.conference_season.find({ season: common.season });

  const conference_ids = conference_seasons.map((cs) => cs.conference_id);
  var conferences = db.conference.find({conference_id:{'$in': conference_ids}});
  const conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");
  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  common.stopwatch(common, "awards - after cinferences");

  var weeks = db.week.find({ season: common.season });
  const weeks_by_week_id = index_group_sync$1(weeks, "index", "week_id");

  weekly_awards = nest_children$1(weekly_awards, weeks_by_week_id, "week_id", "week");

  common.stopwatch(common, "awards - weeks");

  var player_team_games = db.player_team_game.find({player_team_game_id: {'$in': player_team_game_ids}});
  var team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
  team_game_ids = common.distinct(team_game_ids);
  var team_games = db.team_game.find({team_game_id: {'$in': team_game_ids}});

  common.stopwatch(common, "awards - after player team games");

  var game_ids = team_games.map((tg) => tg.game_id);
  game_ids = common.distinct(game_ids);
  const games = db.game.find({game_id: {'$in': game_ids}});
  const games_by_game_id = index_group_sync$1(games, "index", "game_id");
  team_games = nest_children$1(team_games, games_by_game_id, "game_id", "game");

  common.stopwatch(common, "awards - after games");

  var team_seasons = db.team_season.find({season: common.season, team_id: {'$gt': 0}});

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = db.team.find({team_id: {'$in': team_ids}});
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  team_games.forEach(function (tg) {
    tg.opponent_team_season =
      team_seasons_by_team_season_id[tg.opponent_team_season_id];
  });

  common.stopwatch(common, "awards - after teamgames");

  let team_games_by_team_game_id = index_group_sync$1(team_games, "index", "team_game_id");
  player_team_games = nest_children$1(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  player_team_season_ids = common.distinct(player_team_season_ids);
  var player_team_seasons = db.player_team_season.find({player_team_season_id: {'$in': player_team_season_ids}});
  var previous_player_team_seasons = db.player_team_season
    .find({ season: common.season - 1 });

  common.stopwatch(common, "awards - after pts");

  const player_team_season_stats = db.player_team_season_stats.find(
    {player_team_season_id: {'$in': player_team_season_ids}}
  );
  const player_team_season_stats_by_player_team_season_id = index_group_sync$1(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  common.stopwatch(common, "awards - after pts_stat");

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({player_id: {'$in': player_ids}});
  const players_by_player_id = index_group_sync$1(players, "index", "player_id");
  const previous_player_team_seasons_by_player_id = index_group_sync$1(
    previous_player_team_seasons,
    "index",
    "player_id"
  );

  common.stopwatch(common, "awards - after player fetch");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );

  common.stopwatch(common, "awards - after nest");

  const player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );
  player_team_games = nest_children$1(
    player_team_games,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  player_team_games = nest_children$1(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );
  const player_team_games_by_player_team_game_id = index_group_sync$1(
    player_team_games,
    "index",
    "player_team_game_id"
  );

  common.stopwatch(common, "awards - after pts index");

  weekly_awards = nest_children$1(
    weekly_awards,
    player_team_games_by_player_team_game_id,
    "player_team_game_id",
    "player_team_game"
  );

  weekly_awards = index_group_sync$1(weekly_awards, "group", "conference_season_id");

  preseason_awards = nest_children$1(
    preseason_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let preseason_awards_by_conference_season_id = index_group_sync$1(
    preseason_awards,
    "group",
    "conference_season_id"
  );

  regular_season_first_team_all_american_awards = nest_children$1(
    regular_season_first_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_first_team_all_american_awards_by_conference_season_id = index_group_sync$1(
    regular_season_first_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  regular_season_second_team_all_american_awards = nest_children$1(
    regular_season_second_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_second_team_all_american_awards_by_conference_season_id = index_group_sync$1(
    regular_season_second_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  regular_season_freshman_team_all_american_awards = nest_children$1(
    regular_season_freshman_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_freshman_team_all_american_awards_by_conference_season_id = index_group_sync$1(
    regular_season_freshman_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  // console.log({player_team_seasons:player_team_seasons, player_team_seasons_by_player_team_season_id:player_team_seasons_by_player_team_season_id, regular_season_all_american_awards:regular_season_all_american_awards, preseason_awards:preseason_awards, weekly_awards:weekly_awards})

  trophies = nest_children$1(
    trophies,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );

  console.log({
    weekly_awards: weekly_awards,
    conference_seasons: conference_seasons,
    preseason_awards: preseason_awards,
  });

  conference_seasons.unshift({
    conference_season_id: null,
    conference: { conference_name: "National" },
  });

  conference_seasons = nest_children$1(
    conference_seasons,
    weekly_awards,
    "conference_season_id",
    "weekly_awards"
  );

  conference_seasons = conference_seasons.map(function (conference_season) {
    let award_weeks = deep_copy$1(weeks);

    conference_season.weekly_awards = index_group_sync$1(
      conference_season.weekly_awards,
      "group",
      "week_id"
    );
    conference_season.weekly_awards = nest_children$1(
      award_weeks,
      conference_season.weekly_awards,
      "week_id",
      "awards"
    );

    conference_season.weekly_awards = conference_season.weekly_awards.filter(
      (w) => w.awards != undefined && w.awards.length > 0
    );

    var this_conference_preseason_awards = preseason_awards_by_conference_season_id[
      conference_season.conference_season_id
    ].sort(
      (award_a, award_b) =>
        position_order_map[award_a.award_group_type] - position_order_map[award_b.award_group_type]
    );
    console.log({
      this_conference_preseason_awards: this_conference_preseason_awards,
    });
    this_conference_preseason_awards.forEach(function (award) {
      award.position_group = position_group_map[award.player_team_season.position];
    });
    var this_conference_preseason_awards_by_position_group = index_group_sync$1(
      this_conference_preseason_awards,
      "group",
      "position_group"
    );

    conference_season.preseason_awards = [];

    for (var i = 0; i < this_conference_preseason_awards_by_position_group.Offense.length; i++) {
      conference_season.preseason_awards.push({
        Offense: this_conference_preseason_awards_by_position_group.Offense[i],
        Defense: this_conference_preseason_awards_by_position_group.Defense[i],
      });
    }

    conference_season.regular_season_first_team_all_american_awards = [];
    conference_season.regular_season_other_team_all_american_awards = [];
    if (
      conference_season.conference_season_id in
      regular_season_first_team_all_american_awards_by_conference_season_id
    ) {
      var this_conference_regular_season_first_team_all_american_awards =
        regular_season_first_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ].sort(
          (award_a, award_b) =>
            position_order_map[award_a.award_group_type] -
            position_order_map[award_b.award_group_type]
        );
      this_conference_regular_season_first_team_all_american_awards.forEach(function (award) {
          award.position_group = position_group_map[award.player_team_season.position];
        });
      var this_conference_regular_season_first_team_all_american_awards_by_position_group =
        index_group_sync$1(
          this_conference_regular_season_first_team_all_american_awards,
          "group",
          "position_group"
        );

      for (
        var i = 0;
        i <
        this_conference_regular_season_first_team_all_american_awards_by_position_group.Offense
          .length;
        i++
      ) {
        conference_season.regular_season_first_team_all_american_awards.push({
          Offense:
            this_conference_regular_season_first_team_all_american_awards_by_position_group.Offense[
              i
            ],
          Defense:
            this_conference_regular_season_first_team_all_american_awards_by_position_group.Defense[
              i
            ],
        });
      }

      var this_conference_regular_season_second_team_all_american_awards =
        regular_season_second_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ].sort(
          (award_a, award_b) =>
            position_order_map[award_a.award_group_type] -
            position_order_map[award_b.award_group_type]
        );

      console.log({
        regular_season_freshman_team_all_american_awards_by_conference_season_id:
          regular_season_freshman_team_all_american_awards_by_conference_season_id,
        conference_season: conference_season,
        regular_season_freshman_team_all_american_awards:
          regular_season_freshman_team_all_american_awards,
        awards: awards,
      });
      var this_conference_regular_season_freshman_team_all_american_awards = (
        regular_season_freshman_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ] || []
      ).sort(
        (award_a, award_b) =>
          position_order_map[award_a.award_group_type] -
          position_order_map[award_b.award_group_type]
      );

      for (
        var i = 0;
        i < this_conference_regular_season_second_team_all_american_awards.length;
        i++
      ) {
        conference_season.regular_season_other_team_all_american_awards.push({
          Second: this_conference_regular_season_second_team_all_american_awards[i],
          Freshman: this_conference_regular_season_freshman_team_all_american_awards[i],
        });
      }
    }

    console.log({ conference_season: conference_season });
    return conference_season;
  });

  console.log({
    weekly_awards: weekly_awards,
    conference_seasons: conference_seasons,
    trophies: trophies,
  });

  var heisman_race = player_team_seasons.sort(
    (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
  );

  heisman_race = heisman_race.slice(0, 10);

  const recent_games = await common.recent_games(common);

  var page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: "Player Awards",
  };

  var display_options = {
    preseason: { display: "none" },
    trophies: { display: "none" },
    heisman_race: { display: "none" },
    potw: { display: "none" },
    season: { display: "none" },
  };
  var display_items = [];
  //Preseason & week 1
  if (Object.keys(weekly_awards).length == 0) {
    //pre-season AA first
    //heisman race
    display_items = [
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "heisman-race",
        display: "Heisman Race",
        classes: "",
        other_attrs: "",
      },
    ];

    display_options.preseason.display = "block";
  } else if (trophies.length > 0) {
    display_items = [
      {
        div_id: "trophies",
        display: "Award Winners",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "all-americans",
        display: "All Americans",
        classes: "",
        other_attrs: "",
      },
      { div_id: "weekly", display: "POTW", classes: "", other_attrs: "" },
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: "",
        other_attrs: ``,
      },
    ];

    display_options.trophies.display = "block";
  } else {
    display_items = [
      {
        div_id: "weekly",
        display: "POTW",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "heisman-race",
        display: "Heisman Race",
        classes: "",
        other_attrs: ``,
      },
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: "",
        other_attrs: ``,
      },
    ];

    display_options.potw.display = "block";
  }

  var render_content = {
    page: page,
    team_list: [],
    world_id: common.params["world_id"],
    recent_games: recent_games,
    conference_seasons: conference_seasons,
    heisman_race: heisman_race,
    trophies: trophies,
    display_items: display_items,
    display_options: display_options,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/awards/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await draw_player_faces(common);

  $("#nav-heisman-race-tab").on("click", async function () {
    var url = "/static/html_templates/world/awards/heisman_race_table_template.njk";
    var html = await fetch(url);
    html = await html.text();

    const renderedHtml = common.nunjucks_env.renderString(html, render_content);
    console.log({ this: this, renderedHtml: renderedHtml });
    $("#nav-heisman-race").html(renderedHtml);

    $("#nav-heisman-race .player-profile-popup-icon").on("click", async function () {
      await common.populate_player_modal(common, this);
    });

    await draw_player_faces(common);
  });
};

const conference_standings = async (conference_season_id, relevant_team_season_ids, common) => {
    const db = common.db;
    var conference_season = db.conference_season.findOne({
      conference_season_id: conference_season_id,
    });
    const season = conference_season.season;
    var conference = await db.conference.get({
      conference_id: conference_season.conference_id,
    });
  
    var team_seasons_in_conference = await db.team_season.find({
      season: season,
      team_id: { $gt: 0 },
      conference_season_id: conference_season_id,
    });
  
    const team_season_stats = await db.team_season_stats.where({ season: season }).toArray();
    const team_season_stats_by_team_season_id = index_group_sync(
      team_season_stats,
      "index",
      "team_season_id"
    );
  
    const teams = await db.team.toArray();
    const teams_by_team_id = index_group_sync(teams, "index", "team_id");
  
    team_seasons_in_conference = nest_children(
      team_seasons_in_conference,
      team_season_stats_by_team_season_id,
      "team_season_id",
      "season_stats"
    );
    team_seasons_in_conference = nest_children(
      team_seasons_in_conference,
      teams_by_team_id,
      "team_id",
      "team"
    );
  
    team_seasons_in_conference.forEach(function (ts) {
      if (relevant_team_season_ids.includes(ts.team_season_id)) {
        ts.bold = "bold";
      }
    });
  
    for (const division of conference_season.divisions) {
      division.division_standings = team_seasons_in_conference
        .filter((ts) => ts.division_name == division.division_name)
        .sort(function (teamA, teamB) {
          return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
        });
      console.log({ division: division, team_seasons_in_conference: team_seasons_in_conference });
    }
    conference_season.conference = conference;
    console.log({ conference: conference, conference_season: conference_season });
    return conference_season;
  };

function ResArrowSize() {
  $("#addedStyle").remove();

  var bodyWidth = $(".SelectedGameBox").width();

  var side_length = bodyWidth / 2;

  var team_color = $(".SelectedGameBox").css("background-color");

  var styleAdd = "";
  styleAdd += `border-left-width: ${side_length}px;`;
  styleAdd += `border-right-width: ${side_length}px;`;
  styleAdd += `border-width: 15px ${side_length}px 0;`;
  styleAdd += `border-top-color: ${team_color};`;

  $('<style id="addedStyle">.SelectedGameBox::after{' + styleAdd + "}</style>").appendTo("head");
}

function DrawSchedule() {
    $(window).off('resize');
  ResArrowSize();
  $(window).resize(function () {
    ResArrowSize();
  });
}

function AddBoxScoreListeners() {
  var InitialBoxScore = $(".selected-boxscore-tab")[0];

  $(InitialBoxScore).attr("TeamID");

  $("button.boxscore-tab").on("click", function (event, target) {
    var ClickedTab = $(event.currentTarget);
    var ClickedTabParent = ClickedTab.closest(".boxscore-bar").attr("id");
    var SelectedTeamID = ClickedTab.attr("TeamID");
    ClickedTab.attr("GameID");

    $.each($("#" + ClickedTabParent + " > .selected-boxscore-tab"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).removeClass("selected-boxscore-tab");
      TargetTab.closest(".boxscore-bar").attr("id");

      var UnselectedTeamID = TargetTab.attr("TeamID");
      var UnselectedGameID = TargetTab.attr("GameID");

      $(
        '.team-highlights[TeamID="' + UnselectedTeamID + '"][GameID="' + UnselectedGameID + '"]'
      ).addClass("w3-hide");
    });

    $(ClickedTab).addClass("selected-boxscore-tab");
    $('.team-highlights[TeamID="' + SelectedTeamID + '"]').removeClass("w3-hide");
  });
}

function AddScheduleListeners() {
  var InitialGameBox = $(".SelectedGameBox")[0];
  var SelectedGameID = $(InitialGameBox).attr("BoxScoreGameID");
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + SelectedGameID + '"]').removeClass(
    "w3-hide"
  );

  $(".teamScheduleGameBox").on("click", function (event, target) {
    var ClickedTab = $(event.target).closest(".teamScheduleGameBox");
    var SelectedGameID = ClickedTab.attr("BoxScoreGameID");
    $.each($(".SelectedGameBox"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).removeClass("SelectedGameBox");

      var UnselectedGameID = TargetTab.attr("BoxScoreGameID");

      $(
        '.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + UnselectedGameID + '"]'
      ).addClass("w3-hide");
    });

    $(ClickedTab).addClass("SelectedGameBox");
    ResArrowSize();
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' + SelectedGameID + '"]').removeClass(
      "w3-hide"
    );
  });
}

const page_team = async (common) => {
  nunjucks.configure({ autoescape: true });
  const team_id = common.params.team_id;
  const db = common.db;
  const season = common.params.season || common.season;
  common.season = season;

  let weeks = db.week.find({ season: season });
  let weeks_by_week_id = index_group_sync$1(weeks, "index", "week_id");

  common.stopwatch(common, "Time after fetching weeks");

  var teams = await db.team.find({ team_id: { $gt: 0 } });
  teams = teams.sort(function (teamA, teamB) {
    if (teamA.school_name < teamB.school_name) {
      return -1;
    }
    if (teamA.school_name > teamB.school_name) {
      return 1;
    }
    return 0;
  });

  const team = await db.team.findOne({ team_id: team_id });
  const team_season = await db.team_season.findOne({
    team_id: team_id,
    season: season,
  });
  const team_season_stats = await db.team_season_stats.findOne({
    team_season_id: team_season.team_season_id,
  });

  team_season.season_stats = team_season_stats;
  common.current_team_season = team_season;

  common.stopwatch(common, "Time after fetching teams");

  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = team_header_links({
    path: "Overview",
    season: common.params.season,
    db: db,
    team: team,
  });

  common.stopwatch(common, "Time after fetching navbar links");

  let conference_seasons = db.conference_season.find({ season: season });
  const conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  let conferences = db.conference.find();
  const conference_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  common.stopwatch(common, "Time after fetching conferences");

  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
  team.team_season.conference_season.conference =
    conference_by_conference_id[team.team_season.conference_season.conference_id];

  var team_games = db.team_game.find({ team_season_id: team_season.team_season_id });
  let team_games_by_game_id = index_group_sync$1(team_games, 'index', 'game_id');

  const game_ids = team_games.map((game) => parseInt(game.game_id));

  let games = db.game.find({ game_id: { $in: game_ids } });
  games = nest_children$1(games, team_games_by_game_id, 'game_id', 'team_game');

  common.stopwatch(common, "Time after fetching games");

  const opponent_team_game_ids = team_games.map((team_game) => team_game.opponent_team_game_id);
  let opponent_team_games = db.team_game.find({ team_game_id: { $in: opponent_team_game_ids } });

  const opponent_team_season_ids = opponent_team_games.map((team_game) =>
    parseInt(team_game.team_season_id)
  );
  let opponent_team_seasons = db.team_season.find({
    team_season_id: { $in: opponent_team_season_ids },
  });

  const opponent_team_ids = opponent_team_seasons.map((team_season) =>
    parseInt(team_season.team_id)
  );
  const opponent_teams = db.team.find({ team_id: { $in: opponent_team_ids } });

  let opponent_teams_by_team_id = index_group_sync$1(opponent_teams, 'index', 'team_id');
  opponent_team_seasons = nest_children$1(opponent_team_seasons, opponent_teams_by_team_id, 'team_id', 'team');

  let opponent_team_seasons_by_team_season_id = index_group_sync$1(opponent_team_seasons, 'index', 'team_season_id');
  opponent_team_games = nest_children$1(opponent_team_games, opponent_team_seasons_by_team_season_id, 'team_season_id', 'team_season');

  let opponent_team_games_by_game_id = index_group_sync$1(opponent_team_games, 'index', 'game_id');

  games = nest_children$1(games, opponent_team_games_by_game_id, 'game_id', 'opponent_team_game');
  games = nest_children$1(games, weeks_by_week_id, 'week_id', 'week');

  const headline_ids = team.team_season.headlines;
  var headlines = db.headline.find({ headline_id: { $in: headline_ids } });
  headlines = nest_children$1(headlines, weeks_by_week_id, "week_id", "week");
  let headlines_by_game_id = index_group_sync$1(headlines, "group", "game_id");

  headlines = headlines.sort((h_a, h_b) => h_b.week_id - h_a.week_id);

  common.stopwatch(common, "Time after fetching headlines");

  var team_seasons = db.team_season.find({ season: season, tean_id: { $gt: 0 } });

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  common.stopwatch(common, "Time after fetching opp teams");

  for (var headline of headlines) {
    headline.team_seasons = [];
    for (var team_season_id of headline.team_season_ids) {
      headline.team_seasons.push(team_seasons_by_team_season_id[team_season_id]);
    }
  }
  var selected_game_chosen = false;
  var selected_game_id = 0;
  var games_played = games.filter((g) => g.was_played == true).length;
  if (games_played == 0) {
    //no games played
    selected_game_chosen = true;
    selected_game_id = games[0].game_id;
  } else if (games_played == games.length) {
    //All games played
    selected_game_chosen = true;
    selected_game_id = games[games.length - 1].game_id;
  }

  opponent_team_game_ids.concat(team_games.map((tg) => tg.team_game_id));

  common.stopwatch(common, "Time after fetching players");

  games = games.sort((g_a, g_b) => g_a.week_id - g_b.week_id );

  console.log({
    games:games
  });

  for (let game of games) {
    if (!selected_game_chosen && !game.was_played) {
      game.selected_game_box = "SelectedGameBox";
      selected_game_id = game.game_id;
      selected_game_chosen = true;
    } else if (selected_game_chosen && selected_game_id == game.game_id) {
      game.selected_game_box = "SelectedGameBox";
    } else {
      game.selected_game_box = "";
    }

    game.week_name = game.week.week_name;
    if (game.week_name == "Conference Championships") {
      game.week_name =
        team.team_season.conference_season.conference.conference_abbreviation + " Champ";
    }

    game.headlines = headlines_by_game_id[game.game_id];

    game.game_display = "Preview";
    game.game_result_letter = "";
    if (game.was_played) {
      game.game_display = game.score_display;

      if (game.outcome.winning_team.team_id == team.team_id) {
        game.game_result_letter = "W";
      } else {
        game.game_result_letter = "L";
      }
    }

    if (game.home_team_season_id == team.team_season.team_season_id) {
      game.game_location = "home";
      game.game_location_char = "vs.";
      game.home_team = team;
      game.home_team_season = team_season;
      game.home_team_game = game.team_game;
      game.away_team = game.opponent_team_game.team_season.team;
      game.away_team_season = game.opponent_team_game.team_season;
      game.away_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.home_team_winning_game_bold = "bold";
      }
    } else {
      game.game_location = "away";
      game.game_location_char = "@";
      game.away_team = team;
      game.away_team_season = team_season;
      game.away_team_game = game.team_game;
      game.home_team = game.opponent_team_game.team_season.team;
      game.home_team_season = game.opponent_team_game.team_season;
      game.home_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.away_team_winning_game_bold = "bold";
      }
    }

    game.opponent_rank_string = game.opponent_team_game.team_season.national_rank_display;
    if (game.opponent_team_game.national_rank != null) {
      game.opponent_rank_string = game.opponent_team_game.national_rank_display;
    }
  }

  var signed_player_team_season_ids = []; //TODO
  var signed_player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: signed_player_team_season_ids },
  });

  var signed_player_ids = signed_player_team_seasons.map((pts) => pts.player_id);
  var signed_players = db.player.find({ player_id: { $in: signed_player_ids } });

  index_group_sync$1(signed_players, "index", "player_id");

  let show_season = common.params.season && common.params.season < common.season;
  let season_to_show = common.params.season;
  common.page = {
    page_title: team.full_name,
    page_icon: team.team_logo,
    PrimaryColor: team.team_color_primary_hex,
    SecondaryColor: team.secondary_color_display,
    OriginalSecondaryColor: team.team_color_secondary_hex,
    NavBarLinks: NavBarLinks,
    TeamHeaderLinks: TeamHeaderLinks,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    team_id: team_id,
    team: team,
    games: games,
    teams: teams,
    all_teams: await common.all_teams(common, ""),
    conference_standings: conference_standings,
    headlines: headlines,
    games_played: games_played,
    show_season: show_season,
    season_to_show: season_to_show,
  };

  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/team/team/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await team_action(common);
};

const team_header_links = (params) => {
  const path = params.path;
  const season = params.season;
  const db = params.db;
  const team = params.team;

  const all_paths = [
    { href_extension: "", Display: "Overview" },
    { href_extension: "Roster", Display: "Roster" },
    { href_extension: "Gameplan", Display: "Gameplan" },
    { href_extension: "Schedule", Display: "Schedule" },
    { href_extension: "History", Display: "History" },
  ];

  const link_paths = all_paths.filter((link) => link.Display != path);

  for (let path_obj of all_paths) {
    if (path_obj.Display == "History") {
      path_obj.href = team.team_href + "/" + path_obj.href_extension;
    } else if (path_obj.Display == "Overview") {
      if (season) {
        path_obj.href = team.team_href + `/Season/${season}/`;
      } else {
        path_obj.href = team.team_href;
      }
    } else {
      if (season) {
        path_obj.href = team.team_href + "/" + path_obj.href_extension + `/Season/${season}/`;
      } else {
        path_obj.href = team.team_href + "/" + path_obj.href_extension;
      }
    }
  }

  let path_obj = all_paths.find((link) => link.Display == path);

  var seasons = db.league_season.find();
  if (season != undefined) {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href: team.team_href + "/" + path_obj.href_extension + `/Season/${ls.season}/`,
    }));
  } else {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href: `Season/${ls.season}/`,
    }));
  }

  var return_links = all_paths[0];
  for (let path_obj of all_paths) {
    if (path_obj.Display == path) {
      return_links = {
        link_paths: link_paths,
        external_paths: path_obj,
        seasons: seasons,
      };
    }
  }

  return return_links;
};

const team_action = async (common) => {
  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawSchedule();

  initialize_headlines();
  await common.geo_marker_action(common);

  var stats_first_click = false;
  $("#nav-team-stats-tab").on("click", async function () {
    if (stats_first_click) {
      return false;
    }
    stats_first_click = true;

    var db = common.db;
    var season = common.season;

    var team = common.render_content.team;
    var player_team_seasons = await db.player_team_season
      .where({ team_season_id: common.current_team_season.team_season_id })
      .toArray();

    const player_ids = player_team_seasons.map((pts) => pts.player_id);
    const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
    let player_team_season_stats = await db.player_team_season_stats.bulkGet(
      player_team_season_ids
    );
    let players = await db.player.bulkGet(player_ids);

    const player_team_season_stats_by_player_team_season_id = index_group_sync$1(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );

    const players_by_player_id = index_group_sync$1(players, "index", "player_id");

    player_team_seasons = nest_children$1(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );
    player_team_seasons = nest_children$1(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );
    common.current_team_season.team = common.render_content.team;
    player_team_seasons.forEach((pts) => (pts.team_season = common.current_team_season));

    const conference_standings = await common.conference_standings(
      team.team_season.conference_season_id,
      [team.team_season.team_season_id],
      common
    );

    player_team_seasons = player_team_seasons.filter(
      (pts) => pts.team_season_id == team.team_season.team_season_id
    );

    const team_leaders = [];
    const team_leaders_raw = [
      { stat_group: "passing", stat: "yards", display: "Leading Passer" },
      { stat_group: "rushing", stat: "yards", display: "Leading Rusher" },
      { stat_group: "receiving", stat: "yards", display: "Leading Receiver" },
      { stat_group: "defense", stat: "sacks", display: "Leading Pass Rusher" },
      { stat_group: "defense", stat: "tackles", display: "Leading Tackler" },
      { stat_group: "defense", stat: "ints", display: "Leading Pass Defender" },
    ];
    for (var stat_detail of team_leaders_raw) {
      player_team_seasons = player_team_seasons.sort(function (pts_a, pts_b) {
        return (
          (pts_b.season_stats[stat_detail.stat_group][stat_detail.stat] || 0) -
          (pts_a.season_stats[stat_detail.stat_group][stat_detail.stat] || 0)
        );
      });

      if (player_team_seasons[0].season_stats[stat_detail.stat_group][stat_detail.stat] > 0) {
        stat_detail.player_team_season = player_team_seasons[0];
        team_leaders.push(stat_detail);
      }
    }

    const team_stats = [
      {
        display: "Points Per Game",
        stats: {
          OFFENSE: { stat: "points_per_game", sort: "desc" },
          DEFENSE: { stat: "points_allowed_per_game", sort: "asc" },
          DIFF: { stat: "point_differential_per_game", sort: "desc" },
        },
      },
      {
        display: "Yards Per Game",
        stats: {
          OFFENSE: { stat: "yards_per_game", sort: "desc" },
          DEFENSE: { stat: "yards_allowed_per_game", sort: "asc" },
          DIFF: { stat: "yards_per_game_diff", sort: "desc" },
        },
      },
      {
        display: "Third Down Efficiency",
        stats: {
          OFFENSE: { stat: "third_down_conversion_percentage", sort: "desc" },
          DEFENSE: {
            stat: "defensive_third_down_conversion_percentage",
            sort: "asc",
          },
          DIFF: { stat: "third_down_conversion_percentage_diff", sort: "desc" },
        },
      },
      {
        display: "Takeaways",
        stats: {
          "Take aways": { stat: "takeaways", sort: "desc" },
          "Give aways": { stat: "turnovers", sort: "asc" },
          "+/-": { stat: "turnover_diff", sort: "desc" },
        },
      },
    ];

    var all_team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray();
    const team_season_ids = all_team_seasons.map((ts) => ts.team_season_id);
    const team_season_stats = await db.team_season_stats.bulkGet(team_season_ids);
    const team_season_stats_by_team_season_id = index_group_sync$1(
      team_season_stats,
      "index",
      "team_season_id"
    );

    all_team_seasons = nest_children$1(
      all_team_seasons,
      team_season_stats_by_team_season_id,
      "team_season_id",
      "stats"
    );

    var tier_map = {
      1: "elite",
      2: "great",
      3: "good",
      4: "average",
      5: "poor",
      6: "bad",
      7: "terrible",
    };

    console.log("team_stats", {
      team_stats: team_stats,
      all_team_seasons: all_team_seasons,
    });
    all_team_seasons = all_team_seasons.filter(
      (ts) => ts.stats.season_stats.games.games_played > 0
    );

    for (var stat_group of team_stats) {
      console.log("stat_group", stat_group);
      for (var stat_detail_key in stat_group.stats) {
        var stat_detail = stat_group.stats[stat_detail_key];
        console.log({
          team: team,
          "team.team_season.season_stats": team.team_season.season_stats,
          stat_detail: stat_detail,
          stat_detail_key: stat_detail_key,
          stat_group: stat_group,
          team_stats: team_stats,
        });
        stat_detail.team_value = team.team_season.season_stats[stat_detail.stat];

        console.log({
          all_team_seasons: all_team_seasons,
          stat_detail: stat_detail,
        });
        all_team_season_stat_value = all_team_seasons
          .map((ts) => ts.stats[stat_detail.stat])
          .sort(function (value_a, value_b) {
            if (stat_detail.sort == "desc") {
              return value_b - value_a;
            } else {
              return value_a - value_b;
            }
          });

        stat_detail.team_rank =
          all_team_season_stat_value.indexOf(team.team_season.season_stats[stat_detail.stat]) + 1;
        stat_detail.total_teams = all_team_seasons.length;
        //console.log({all_team_seasons:all_team_seasons, stat_detail:stat_detail, all_team_season_stat_value:all_team_season_stat_value})
        stat_detail.tier =
          tier_map[
            common.tier_placement(7, all_team_seasons.length, "Normal", stat_detail.team_rank)
          ];
      }
    }

    var url = "/static/html_templates/team/team/conference_standings_tbody_template.njk";
    var html = await fetch(url);
    html = await html.text();

    console.log({ conference_standings: conference_standings });

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      conference_standings: conference_standings,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#conference_standings_div").append(renderedHtml);

    var url = "/static/html_templates/team/team/team_leaders_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      page: common.render_content.page,
      team_leaders: team_leaders,
    });
    console.log({ team_leaders: team_leaders, renderedHtml: renderedHtml });

    $("#team_leaders").append(renderedHtml);

    await draw_faces(common);

    var url = "/static/html_templates/team/team/team_stats_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      team_stats: team_stats,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#team_stats").append(renderedHtml);

    await draw_faces(common);

    console.log({
      "conference_standings.conference_standings,": conference_standings.conference_standings,
    });

    if (team_leaders.length > 0) {
      conference_bar_chart(conference_standings.conference_standings, common);
      rankings_trend_chart(team, common);
    }
  });

  var info_first_click = false;
  $("#nav-info-tab").on("click", async function () {
    //console.log({info_first_click:info_first_click})
    if (info_first_click) {
      return false;
    }
    info_first_click = true;

    var team = common.render_content.team;
    var db = common.db;
    common.season;
    var all_teams = await db.team.where("team_id").above(0).toArray();

    var rating_display_map = {
      brand: "Brand",
      facilities: "Facilities",
      location: "Location",
      pro_pipeline: "Pro Pipeline",
      program_history: "Program History",
      fan_support: "Fan Support",
      brand: "Brand",
      team_competitiveness: "Team Competitiveness",
      academic_quality: "Academic Quality",
    };

    console.log({
      "common.render_content": common.render_content,
      team: team,
      all_teams: all_teams,
    });

    for (const rating in team.team_ratings) {
      //console.log({rating:rating})
      all_teams = all_teams.sort(
        (t_a, t_b) => get(t_b, "team_ratings." + rating) - get(t_a, "team_ratings." + rating)
      );
      var attribute_map = all_teams.map((t) => get(t, "team_ratings." + rating));

      team.team_ratings[rating] = { value: team.team_ratings[rating], rank: 0 };
      team.team_ratings[rating].rank = attribute_map.indexOf(team.team_ratings[rating].value) + 1;

      team.team_ratings[rating].display = rating_display_map[rating];
    }

    //console.log({team:team})

    var url = "/static/html_templates/team/team/team_info_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-info").append(renderedHtml);
    await draw_map(common);
  });

  var coaches_first_click = false;
  $("#nav-coaches-tab").on("click", async function () {
    if (coaches_first_click) {
      return false;
    }
    coaches_first_click = true;

    let coaching_position_info = {
      HC: { coaching_position: "HC", order: 1, full_name: "Head Coach" },
      OC: { coaching_position: "OC", order: 2, full_name: "Offensive Coordinator" },
      DC: { coaching_position: "DC", order: 3, full_name: "Defensive Coordinator" },
      ST: { coaching_position: "ST", order: 4, full_name: "Special Teams Coordinator" },
    };

    let team = common.render_content.team;
    let team_season = team.team_season;
    let db = common.db;
    common.season;

    let coach_team_seasons = await db.coach_team_season
      .where({ team_season_id: team_season.team_season_id })
      .toArray();
    let coach_ids = coach_team_seasons.map((cts) => cts.coach_id);
    let coaches = await db.coach.bulkGet(coach_ids);
    let coaches_by_coach_id = index_group_sync$1(coaches, "index", "coach_id");

    coach_team_seasons = nest_children$1(
      coach_team_seasons,
      coaches_by_coach_id,
      "coach_id",
      "coach"
    );
    coach_team_seasons = nest_children$1(
      coach_team_seasons,
      coaching_position_info,
      "coaching_position",
      "coaching_position_info"
    );
    coach_team_seasons = coach_team_seasons.sort(
      (cts_a, cts_b) => cts_a.coaching_position_info.order - cts_b.coaching_position_info.order
    );

    let render_content = {
      team: team,
      coach_team_seasons: coach_team_seasons,
      page: common.render_content.page,
    };

    var url = "/static/html_templates/team/team/team_coaches_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, render_content);
    console.log({ renderedHtml: renderedHtml, render_content: render_content });

    $("#nav-coaches").append(renderedHtml);
    await draw_coach_faces(common);
  });

  var rivals_first_click = false;
  $("#nav-rivals-tab").on("click", async function () {
    if (rivals_first_click) {
      return false;
    }
    rivals_first_click = true;

    var db = common.db;
    common.season;

    var team = common.render_content.team;
    let rivals = team.rivals;
    let rival_team_ids = new Set(rivals.map((r) => r.opponent_team_id));

    let team_seasons = await db.team_season.where({ team_id: team.team_id }).toArray();
    let team_season_ids = team_seasons.map((ts) => ts.team_season_id);
    team_season_ids = new Set(team_season_ids);

    var rival_teams = await db.team.where("team_id").above(0).toArray();
    let rival_teams_by_team_id = index_group_sync$1(rival_teams, "index", "team_id");

    let rival_team_seasons = await db.team_season.where("team_id").anyOf(rival_team_ids).toArray();

    let rival_team_seasons_by_team_id = index_group_sync$1(rival_team_seasons, "group", "team_id");

    let rival_team_season_ids = new Set(rival_team_seasons.map((ts) => ts.team_season_id));

    let weeks = await db.week.toArray();
    let weeks_by_week_id = index_group_sync$1(weeks, "index", "week_id");

    let all_team_season_ids = Array.from(team_season_ids).concat(Array.from(rival_team_season_ids));

    let all_team_season_id_set = new Set(all_team_season_ids);

    let team_games = await db.team_game
      .where("team_season_id")
      .anyOf(all_team_season_ids)
      .filter(
        (tg) =>
          all_team_season_id_set.has(tg.team_season_id) &&
          all_team_season_id_set.has(tg.opponent_team_season_id)
      )
      .toArray();
    let team_games_by_team_game_id = index_group_sync$1(team_games, "index", "team_game_id");

    let game_ids = team_games.map((tg) => tg.game_id);

    let all_games = await db.game.bulkGet(game_ids);
    all_games = nest_children$1(all_games, weeks_by_week_id, "week_id", "week");
    let all_games_by_game_id = index_group_sync$1(all_games, "index", "game_id");

    for (let rivalry of rivals) {
      rivalry.team = rival_teams_by_team_id[rivalry.opponent_team_id];
      rivalry.team_seasons = rival_team_seasons_by_team_id[rivalry.opponent_team_id];

      rivalry.team_season_ids = new Set(rivalry.team_seasons.map((ts) => ts.team_season_id));

      rivalry.team_games = team_games.filter(
        (tg) =>
          rivalry.team_season_ids.has(tg.team_season_id) &&
          team_season_ids.has(tg.opponent_team_season_id)
      );

      rivalry.team_games = nest_children$1(
        rivalry.team_games,
        all_games_by_game_id,
        "game_id",
        "game"
      );
      rivalry.team_games.forEach(function (tg) {
        tg.opponent_team_game = team_games_by_team_game_id[tg.opponent_team_game_id];

        if (tg.game.was_played) {
          if (tg.is_winning_team) {
            tg.game.winning_team = rivalry.team;
          } else {
            tg.game.winning_team = team;
          }

          tg.game.score_display = `${tg.game.outcome.winning_team.points} - ${tg.game.outcome.losing_team.points}`;
        }
      });

      rivalry.team_games = rivalry.team_games.sort((tg_a, tg_b) => tg_a.week_id - tg_b.week_id);

      rivalry.played_team_games = rivalry.team_games.filter((tg) => tg.game.was_played);

      rivalry.first_team_game = rivalry.played_team_games[0];
      rivalry.last_team_game = rivalry.played_team_games[rivalry.played_team_games.length - 1];

      rivalry.record = {
        wins: 0,
        losses: 0,
        games_played: 0,
        scheduled_games: 0,
        points_scored: 0,
        points_allowed: 0,
      };

      let streak_list = [];
      rivalry.team_games.forEach(function (tg) {
        if (tg.game.was_played) {
          rivalry.record.games_played += 1;
          rivalry.record.points_scored += tg.points;
          rivalry.record.points_allowed += tg.opponent_team_game.points;
          if (tg.is_winning_team) {
            rivalry.record.wins += 1;
          } else {
            rivalry.record.losses += 1;
          }
        } else {
          rivalry.record.scheduled_games += 1;
        }

        if (tg.game.was_played) {
          if (streak_list.length == 0) {
            streak_list.push({
              team: tg.game.winning_team,
              count: 1,
              first_season: tg.game.week.season,
              last_season: tg.game.week.season,
            });
          } else {
            let latest_streak_obj = streak_list[streak_list.length - 1];
            if (tg.game.winning_team.team_id == latest_streak_obj.team.team_id) {
              latest_streak_obj.count += 1;
              latest_streak_obj.last_season = tg.game.week.season;
            } else {
              streak_list.push({
                team: tg.game.winning_team,
                count: 1,
                first_season: tg.game.week.season,
                last_season: tg.game.week.season,
              });
            }
          }
        }
      });

      rivalry.latest_streak = streak_list[streak_list.length - 1];
      streak_list = streak_list.sort((str_a, str_b) => str_b.count - str_a.count);
      rivalry.longest_streak = streak_list[0];

      let all_time_series = {
        leader: null,
        wins: rivalry.record.wins,
        losses: rivalry.record.losses,
      };
      if (rivalry.record.wins > rivalry.record.losses) {
        all_time_series = {
          leader: rivalry.team,
          wins: rivalry.record.wins,
          losses: rivalry.record.losses,
        };
      } else if (rivalry.record.wins < rivalry.record.losses) {
        all_time_series = {
          leader: team,
          wins: rivalry.record.losses,
          losses: rivalry.record.wins,
        };
      }

      let all_time_points = {
        leader: null,
        points_for: rivalry.record.points_scored,
        points_allowed: rivalry.record.points_allowed,
      };
      if (rivalry.record.points_scored > rivalry.record.points_allowed) {
        all_time_points = {
          leader: rivalry.team,
          points_for: rivalry.record.points_scored,
          points_allowed: rivalry.record.points_allowed,
        };
      } else if (rivalry.record.points_scored < rivalry.record.points_allowed) {
        all_time_points = {
          leader: team,
          points_for: rivalry.record.points_allowed,
          points_allowed: rivalry.record.points_scored,
        };
      }

      rivalry.all_time_series = all_time_series;
      rivalry.all_time_points = all_time_points;
    }

    rivals = rivals.sort(
      (r_a, r_b) =>
        r_b.record.games_played - r_a.record.games_played ||
        r_b.record.scheduled_games - r_a.record.scheduled_games
    );

    var url = "/static/html_templates/team/team/team_rivals_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      rivals: rivals,
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-rivals").append(renderedHtml);
    $(".grid").masonry({
      // options
      itemSelector: ".grid-item",
      columnWidth: ".grid-sizer",
      percentPosition: true,
      gutter: ".gutter-sizer",
    });
  });
};

function rankings_trend_chart(team, common) {
  console.log({ team: team, common: common });

  let rank_trends = [];
  let rank_count = team.team_season.rankings.division_rank.length;

  for (var week_counter = 1; week_counter < rank_count; week_counter++) {
    rank_trends.push({
      week: week_counter,
      ranks: {
        conference_rank: team.team_season.rankings.division_rank[rank_count - week_counter],
        national_rank: team.team_season.rankings.national_rank[rank_count - week_counter],
      },
    });
  }

  var team_ranking_trend_chart_div = document.getElementById("team_ranking_trend_chart");

  var height = 300,
    width = team_ranking_trend_chart_div.clientWidth * 0.75,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  // append the svg object to the body of the page
  var svg = d3
    .select(team_ranking_trend_chart_div)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleLinear()
    .domain(
      d3.extent(rank_trends, function (d) {
        return d.week;
      })
    )
    .range([0, width]);

  x.ticks().filter((tick) => Number.isInteger(tick));

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y_left_conference = d3
    .scaleLinear()
    .domain([
      Math.max(
        10,
        d3.max(rank_trends, function (d) {
          return d.ranks.conference_rank;
        })
      ),
      1,
    ])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y_left_conference));

  // Add Y axis
  var y_right_national = d3
    .scaleLinear()
    .domain([
      Math.max(
        25,
        d3.max(rank_trends, function (d) {
          return d.ranks.national_rank;
        })
      ),
      1,
    ])
    .range([height, 0]);
  svg
    .append("g")
    .attr("transform", "translate(" + width + " ,0)")
    .call(d3.axisRight(y_right_national));

  // Add the line
  svg
    .append("path")
    .datum(rank_trends)
    .attr("fill", "none")
    .attr("stroke", "#" + common.page.PrimaryColor)
    .attr("stroke-width", 3.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.week);
        })
        .y(function (d) {
          return y_left_conference(d.ranks.conference_rank);
        })
    );

  // Add the line
  svg
    .append("path")
    .datum(rank_trends)
    .attr("fill", "none")
    .attr("stroke", "#" + common.page.SecondaryColor)
    .attr("stroke-width", 3.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.week);
        })
        .y(function (d) {
          return y_right_national(d.ranks.national_rank);
        })
    );
}

function conference_bar_chart(raw_data, common) {
  console.log(common.render_content);

  const get_from_dict = common.get_from_dict;

  var team_id = common.render_content.team_id;

  common.render_content.team_id;

  var columns = [
    "season_stats.points_per_game",
    "season_stats.passing_yards_per_game",
    "season_stats.rushing_yards_per_game",
    "wins",
  ];
  var selected_field = columns[0];

  build_selector(columns);

  var data,
    current_stat,
    animation_duration = 200;

  var bandwidth_offset = 2;

  function setup_data(selected_field) {
    data = [];

    data.y = selected_field;

    var i; {
      current_stat = selected_field;
      for (var team_season of raw_data) {
        data.push({
          name: team_season.team.school_name,
          value: +get_from_dict(team_season, selected_field),
          highlight: team_season.team_id === team_id,
          color: "#" + team_season.team.team_color_primary_hex,
          team_id: team_season.team_id,
          logo: team_season.team.team_logo,
        });
      }
    }

    if (
      selected_field === "opponent_passing_yards" ||
      selected_field === "opponent_rushing_yards"
    ) {
      data.sort(function (a, b) {
        return a.value > b.value ? 1 : -1;
      });
    } else {
      data.sort(function (a, b) {
        return a.value < b.value ? 1 : -1;
      });
    }

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      row.rank = i + 1;
    }
  }

  setup_data(selected_field);

  var chartDiv = document.getElementById("bar_chart");
  var svg = d3.select(chartDiv).append("svg").style("overflow", "hidden");

  var height = 300,
    width = chartDiv.clientWidth,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  svg.attr("width", width).attr("height", height);

  var highlighted_rank = 0,
    current_y_value = 0,
    hover_y_value = 0;

  // Used to push highlighted values to left and down
  var value_offset = 39,
    value_y_offset = 4,
    value_padding = 10;

  var bar_grey = "#ddd";

  function select_bar(highlight, hover, color, rank, team_id, value, click) {
    if (click) {
      hide_all_icons();
      grey_all_bars();

      hover_y_value = value;
      //else hover_y_value = 0;

      hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

      hover_value
        .attr("x", 0 + value_padding)
        .attr("y", y(hover_y_value) + value_y_offset)
        .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value)
        .attr("opacity", 1);

      hover_rect
        .attr("x", 0)
        .attr("y", y(hover_y_value) - value_y_offset - 6)
        .attr("width", x(minimumX) - 0)
        .attr("opacity", 1);

      show_icon(hover, rank, team_id, click);
      hide_ranks(rank);

      return click ? color : hover ? color : bar_grey;
    }

    if (highlight) {
      current_y_value = value;
      highlighted_rank = rank;
    }

    if (hover) {
      if (!highlight) {
        hover_y_value = value;
        //else hover_y_value = 0;

        hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

        hover_value
          .attr("x", 0 + value_padding)
          .attr("y", y(hover_y_value) + value_y_offset)
          .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value)
          .attr("opacity", 1);

        hover_rect
          .attr("x", 0)
          .attr("y", y(hover_y_value) - value_y_offset - 6)
          .attr("width", x(minimumX) - 0)
          .attr("opacity", 1);
      }
      show_icon(hover, rank, team_id, highlight);
    } else {
      show_icon(highlight, rank, team_id, false);
      hover_y_value = 0;

      if (hover_line) {
        setTimeout(function () {
          if (hover_y_value === 0) {
            hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 0);

            hover_value
              .attr("x", x(maximumX) + x.bandwidth())
              .attr("y", y(hover_y_value) + value_y_offset)
              .text("")
              .attr("opacity", 0);

            hover_rect
              .attr("y", y(hover_y_value) - value_y_offset - 6)
              .attr("width", hover_y_value.toString().length * 12)
              .attr("opacity", 0);
          }
        }, 500);
      }
    }
    return highlight ? color : hover ? color : bar_grey;
  }
  var image_width = 25;
  var minimumY,
    maximumY,
    yMinScale,
    yMaxScale,
    x,
    y,
    xAxis,
    yAxis,
    hover_line,
    highlight_line,
    highlight_value,
    hover_value,
    chart_lines;

  function initialize_conference_bar_chart() {
    (minimumY = d3.min(data, function (d) {
      return d.value;
    })),
      (maximumY = d3.max(data, function (d) {
        return d.value;
      })),
      (minimumX = d3.min(data, function (d) {
        return d.rank;
      })),
      (maximumX = d3.max(data, function (d) {
        return d.rank;
      })),
      (yMinScale = minimumY - minimumY * 0.05),
      (yMaxScale = maximumY + maximumY * 0.25),
      (highlighted_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (highlighted_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (value_offset = 39),
      (value_y_offset = 4),
      (value_padding = 12);

    var yFormat = d3.format(","),
      yFont = "font-14",
      ticks = 6;

    // Deal with different scales/length numbers
    if (minimumY > 1000 || maximumY > 1000) {
      yFormat = d3.format(".2s");
      yFont = "font-12";
      ticks = 4;
    } else if (minimumY > 0 && maximumY < 1) {
      yFormat = d3.format(".3f");
      yFont = "font-12";
      value_padding = 8;
    } else if (minimumY > 0 && maximumY >= 10 && maximumY < 100) {
      value_padding = 20;
    }

    stats_pad_ten = [
      "field_goals_percentage",
      "two_pointers_percentage",
      "effective_field_goal_percentage",
      "three_pointers_percentage",
      "free_throws_percentage",
      "shot_percentage",
      "save_percentage",
      "shots_on_goal_for_per_game",
      "shots_on_goal_against_per_game",
      "blocks_per_game",
      "hits_per_game",
      "passing_attempts_per_game",
      "passing_completions_per_game",
      "personal_fouls_per_game",
      "turnovers_per_game",
      "steals_per_game",
      "assists_per_game",
      "total_rebounds_per_game",
      "offensive_rebounds_per_game",
      "defensive_rebounds_per_game",
    ];

    stats_pad_five = [
      "ip",
      "passing_yards_per_game",
      "total_yards_per_game",
      "rushing_yards_per_game",
      "passing_yards_per_game",
      "opponent_passing_yards_per_game",
      "opponent_rushing_yards_per_game",
      "points_per_game",
    ];
    // Stat specific fixes
    if (current_stat === "era") {
      yFormat = d3.format(".2f");
      yFont = "font-12";
      value_padding = 7;
    } else if (stats_pad_five.indexOf(current_stat) !== -1) {
      value_padding = 5;
    } else if (current_stat === "whip") {
      value_padding = 5;
      yFont = "font-12";
    } else if (stats_pad_ten.indexOf(current_stat) !== -1) {
      value_padding = 10;
    }

    x = d3
      .scaleBand()
      .domain(
        data.map(function (d) {
          return d.rank;
        })
      )
      .range([margin.left, width - margin.right])
      .padding(0.1);

    y = d3
      .scaleLinear()
      .domain([yMinScale, yMaxScale])
      .range([height - margin.bottom, margin.top]);

    xAxis = function (g) {
      return g
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .attr("color", "#9A9A9A")
        .call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0))
        .call(function (g) {
          return g.selectAll(".tick text").attr("opacity", 0);
        });
    };

    yAxis = function (g) {
      return g
        .attr("transform", "translate(" + (margin.left - 10) + ",0)")
        .attr("color", "#9A9A9A")
        .call(d3.axisLeft(y).tickSize(0).tickFormat(yFormat).ticks(ticks))
        .call(function (g) {
          return g.select(".domain").remove();
        });
    };

    svg.append("g").attr("class", "x axis carbon font-14").call(xAxis);

    svg
      .append("g")
      .attr("class", "y axis carbon " + yFont)
      .call(yAxis);

    chart_lines = svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("fill", function (d) {
        return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value);
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(yMinScale);
      })
      .attr("height", 0)
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("class", "chart_line")
      .on("mousedown", click_bar(true))
      .on("mouseover", highlight_bar(true))
      .on("mouseout", highlight_bar(false));

    highlight_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "#020E24")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value));

    highlight_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "#020E24")
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(current_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20);

    highlight_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("rx", 5)
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

    hover_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "grey")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(hover_y_value))
      .attr("y2", y(hover_y_value))
      .attr("opacity", 0);

    hover_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "grey")
      .attr("x", 0)
      .attr("y", y(hover_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20)
      .attr("opacity", 0);

    hover_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(hover_y_value) + value_y_offset)
      .text(hover_y_value)
      .attr("opacity", 0);

    image_icons = svg
      .append("g")
      .selectAll("image")
      .data(data)
      .join("image")
      .attr("xlink:href", function (d) {
        return d.logo;
      })
      .attr("width", image_width)
      .attr("height", image_width)
      .attr("id", function (d) {
        return "logo-" + d.team_id;
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value) - image_width - 10;
      })
      .attr("opacity", 0)
      .attr("class", "shadowed");
  }

  function update_conference_bar_chart() {
    height = 300;
    width = chartDiv.clientWidth;

    svg.attr("width", width).attr("height", height);

    x.domain(
      data.map(function (d) {
        return d.rank;
      })
    ).range([margin.left, width - margin.right]);

    svg.select(".x.axis").call(xAxis);

    svg.select(".y.axis").call(yAxis);

    //var chart_lines = svg.selectAll(".chart_line rect");

    chart_lines
      .transition()
      .duration(animation_duration)
      .each(function (d) {
        return show_icon(false, d.rank, d.team_id, d.highlight);
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value);
      })
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("height", function (d) {
        return y(yMinScale) - y(d.value);
      });
    //.attr("width", x.bandwidth()+1);

    highlight_line
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value))
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth());

    hover_line.attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth());

    highlight_rect
      .attr("x", 0)
      .attr("y", y(current_y_value) - value_y_offset - 6)
      .attr("width", x(minimumX) - 0);

    highlight_value
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

    image_icons.attr("x", function (d) {
      return x(d.rank) - (image_width - x.bandwidth()) / 2;
    });

    // Assign ticks ranking ids
    var ticks = d3.selectAll(".x .tick text");

    ticks.attr("transform", "translate(0,5)");
    ticks.attr("id", function (d) {
      return "rank-" + d3.select(this).text();
    });

    // Remove leading zeros for baseball percentages
    if (minimumY > 0 && maximumY < 1) {
      var y_ticks = d3.selectAll(".y .tick text");
      y_ticks.text(function (d) {
        return remove_leading_zero(d3.select(this).text());
      });
    }

    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  initialize_conference_bar_chart();
  update_conference_bar_chart();
  window.addEventListener("resize", update_conference_bar_chart);

  function highlight_bar(highlight) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(d.highlight, highlight, d.color, d.rank, d.team_id, d.value);
      });
    };
  }

  function click_bar(click) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value, click);
      });
    };
  }

  function show_icon(hover, rank, team_id, highlight) {
    var show_logic = rank === 1 || rank === data.length || hover || highlight;

    if (show_logic) {
      d3.select("#logo-" + team_id).attr("opacity", 1);
      d3.select("#rank-" + rank).attr("opacity", 1);
      if (hover) {
        grey_all_bars();
        d3.select("#player-bar-" + rank).attr("fill", function (d) {
          return d.color;
        });
        d3.select("#player-name-" + rank).attr("fill", function (d) {
          return "#000000";
        });
        d3.select("#player-stat-" + rank).attr("fill", function (d) {
          return "#000000";
        });
      }
    } else {
      d3.select("#logo-" + team_id).attr("opacity", 0);
      d3.select("#rank-" + rank).attr("opacity", 0);
      d3.select("#player-bar-" + rank).attr("fill", bar_grey);
      d3.select("#player-name-" + rank).attr("fill", "#828282");
      d3.select("#player-stat-" + rank).attr("fill", "#828282");
    }
  }

  function hide_all_icons() {
    image_icons.attr("opacity", function (d) {
      if (d.rank === 1 || d.rank === data.length || d.highlight) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  function grey_all_bars() {
    if (chart_lines) {
      chart_lines.attr("fill", function (d) {
        return d.highlight ? d.color : bar_grey;
      });
    }
  }

  function hide_ranks(rank) {
    d3.selectAll(".x .tick text").attr("opacity", 0);
    d3.select("#rank-" + rank).attr("opacity", 1);
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function new_conference_bar_chart(selected_field) {
    //console.log(selected_field)
    current_stat = selected_field;
    setup_data(selected_field);
    svg.selectAll("rect").remove();
    svg.selectAll("image").remove();

    highlight_line.remove();
    hover_line.remove();
    highlight_value.remove();
    hover_value.remove();

    svg.selectAll(".x.axis").remove();
    svg.selectAll(".y.axis").remove();
    svg.selectAll("image").remove();

    d3.selectAll(".y .tick").remove();

    initialize_conference_bar_chart();
    update_conference_bar_chart();
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function build_selector(columns) {
    var html =
      "<select id='stat_select' onChange='new_conference_bar_chart(this.value)' class='calibre w3-select font-16 form-control select-container'>";

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      // TODO this is janky as fuck
      html +=
        '<option value="' +
        col +
        '">' +
        col
          .replace("season_stats.", "")
          .replace(/_/g, " ")
          .replace(/per game/g, "(Per Game)")
          .replace(/per attempt/g, "(Per Attempt)")
          .replace(/per reception/g, "(Per Reception)")
          .replace(/\w\S*/g, function (txt) {
            if (
              txt === "rbi" ||
              txt === "hr" ||
              txt === "obp" ||
              txt === "slg" ||
              txt === "ops" ||
              txt === "ip" ||
              txt === "era" ||
              txt === "bb"
            ) {
              return txt.toUpperCase();
            } else {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
          }) +
        "</option>";
    }
    html += "</select>";

    document.getElementById("selector").innerHTML = html;

    $("#stat_select").on("change", function (a, b, c) {
      new_conference_bar_chart(this.value);
    });
  }

  function remove_leading_zero(text) {
    var split_text = text.toString().split("."),
      trailing_zero = "";
    if (split_text[1].toString().length === 2) trailing_zero = "0";
    else if (split_text[1].toString().length === 1) trailing_zero = "00";

    return "." + split_text[1] + trailing_zero;
  }
}

const draw_map = async (common) => {
  const db = common.db;
  const ddb = common.ddb;

  const season = common.season;
  const team = await db.team.get(common.render_content.team_id);
  const team_id = team.team_id;

  const team_season = await db.team_season.where({ team_id: team_id, season: season }).first();
  const team_season_id = team_season.team_season_id;

  const player_team_seasons = await db.player_team_season
    .where({ team_season_id: team_season_id })
    .toArray();
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = await db.player.where("player_id").anyOf(player_ids).toArray();
  players.forEach((p) => (p.city_state = `${p.hometown.city}, ${p.hometown.state}`));
  let players_by_city_state = index_group_sync$1(players, "group", "city_state");
  const city_states = players.map((p) => [p.hometown.city, p.hometown.state]);

  let cities = await ddb.cities.where("[city+state]").anyOf(city_states).toArray();

  cities.forEach((c) => (c.city_state = `${c.city}, ${c.state}`));
  cities = nest_children$1(cities, players_by_city_state, "city_state", "players");

  const school_location = await ddb.cities
    .where({ city: team.location.city, state: team.location.state })
    .first();

  const school_icon = L.divIcon({
    html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [40, 40],
    iconAnchor: [15, 40],
  });
  const player_icon = L.divIcon({
    html: `<i class="fa fa-circle" data-bs-toggle="tooltip" data-bs-title="Default tooltip" style="font-size: 8px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });

  //if (map != undefined) { map.remove(); }
  let map = L.map("map-body").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  L.marker([school_location.lat, school_location.long], {
    icon: school_icon,
  }).addTo(map);

  var markers = L.markerClusterGroup();

  let tooltip_template = `
      <div>{{city.city_state}}</div>
      <div>
      {% for player in city.players%}
        <div class='padding-left-8'>
        {{player.full_name}}, {{player.position}}
        </div>
      {%endfor%}
      </div>
    `;

  cities.forEach(async function (city) {
    var renderedHtml = await common.nunjucks_env.renderString(tooltip_template, { city: city });
    renderedHtml = renderedHtml.replace("\n", "");
    let marker = L.marker([city.lat, city.long], { icon: player_icon })
      .bindTooltip(renderedHtml)
      .openTooltip();
    markers.addLayer(marker).addTo(map);
  });
};

const initialize_headlines = () => {
  if ($(".MultiCarousel-inner").children().length == 0) {
    $(".headline-slideshow").remove();
    return 0;
  }
  var itemsMainDiv = ".MultiCarousel";
  var itemsDiv = ".MultiCarousel-inner";
  var itemWidth = "";
  var initialOffset = 20;
  $(".leftLst, .rightLst").click(function () {
    var condition = $(this).hasClass("leftLst");
    if (condition) click(0, this);
    else click(1, this);
  });

  ResCarouselSize();

  $(window).resize(function () {
    ResCarouselSize();
  });

  //this function define the size of the items
  function ResCarouselSize() {
    var incno = 0;
    var dataItems = "data-items";
    var itemClass = ".headline-carousel-item";
    var id = 0;
    var btnParentSb = "";
    var itemsSplit = "";
    var sampwidth = $(itemsMainDiv).width();
    var bodyWidth = $("body").width();
    $(itemsDiv).each(function () {
      id = id + 1;
      var itemNumbers = $(this).find(itemClass).length;
      btnParentSb = $(this).parent().attr(dataItems);
      itemsSplit = btnParentSb.split(",");
      $(this)
        .parent()
        .attr("id", "MultiCarousel" + id);

      incno = 5;
      itemWidth = sampwidth / incno;
      if (bodyWidth >= 1200) {
        incno = itemsSplit[3];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 992) {
        incno = itemsSplit[2];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 768) {
        incno = itemsSplit[1];
        itemWidth = sampwidth / incno;
      } else {
        incno = itemsSplit[0];
        itemWidth = sampwidth / incno;
      }
      incno = 4;
      itemWidth = sampwidth / incno;
      console.log({
        this: this,
        itemClass: itemClass,
        width: itemWidth * itemNumbers,
        itemWidth: itemWidth,
        itemNumbers: itemNumbers,
        bodyWidth: bodyWidth,
        incno: incno,
        sampwidth: sampwidth,
        itemsMainDiv: $(itemsMainDiv),
        "$(itemsMainDiv).width()": $(itemsMainDiv).width(),
      });
      $(this).css({
        transform: "translateX(" + initialOffset + "px)",
        width: itemWidth * (itemNumbers + 1),
      });
      $(this)
        .find(itemClass)
        .each(function () {
          $(this).outerWidth(itemWidth);
          $(this).height(itemWidth * 2 * 0.67 + 0);
        });

      $(this)
        .find(`${itemClass}:first`)
        .each(function () {
          $(this).outerWidth(itemWidth * 2);
          $(this).height(itemWidth * 2 * 0.67 + 10);
        });

      $(".leftLst").addClass("over");
      $(".rightLst").removeClass("over");
    });
  }

  //this function used to move the items
  function ResCarousel(e, el, s) {
    var leftBtn = ".leftLst";
    var rightBtn = ".rightLst";
    var translateXval = "";
    var divStyle = $(el + " " + itemsDiv).css("transform");
    var values = divStyle.match(/-?[\d\.]+/g);
    var xds = Math.abs(values[4]);
    if (e == 0) {
      translateXval = parseInt(xds) - parseInt(itemWidth * s);
      $(el + " " + rightBtn).removeClass("over");

      if (translateXval <= itemWidth / 2) {
        translateXval = -1 * initialOffset;
        $(el + " " + leftBtn).addClass("over");
      }
    } else if (e == 1) {
      var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
      translateXval = parseInt(xds) + parseInt(itemWidth * s);
      $(el + " " + leftBtn).removeClass("over");

      if (translateXval >= itemsCondition - itemWidth / 2) {
        translateXval = itemsCondition + initialOffset;
        $(el + " " + rightBtn).addClass("over");
      }
    }
    $(el + " " + itemsDiv).css("transform", "translateX(" + -translateXval + "px)");
  }

  //It is used to get some elements from btn
  function click(ell, ee) {
    var Parent = "#" + $(ee).parent().attr("id");
    var slide = $(Parent).attr("data-slide");
    ResCarousel(ell, Parent, slide);
  }

  $(".headline-carousel-item.w3-hide").each(function (ind, obj) {
    $(obj).removeClass("w3-hide");
  });
};

class headline {
  constructor(headline_id, week_id, headline_text, headline_type, headline_relevance) {
    this.headline_id = headline_id;
    this.week_id = week_id;
    this.headline_text = headline_text;
    this.headline_type = headline_type;
    this.headline_relevance = headline_relevance;
  }
}

class award {
  constructor(
    award_id,
    player_team_season_id,
    player_team_game_id,
    week_id,
    season,
    award_group,
    award_group_type,
    award_team_set,
    award_timeframe,
    conference_season_id,
    award_team
  ) {
    this.award_id = award_id;
    this.week_id = week_id;
    this.player_team_season_id = player_team_season_id;
    this.player_team_game_id = player_team_game_id;
    this.season = season;
    this.award_group = award_group; //individual, position, position group
    this.award_team_set = award_team_set; //conference, national
    this.conference_season_id = conference_season_id;
    this.award_group_type = award_group_type; //offense, defense, QB, RB, etc
    this.award_timeframe = award_timeframe; // Week, Season, Preseason, Playoffs
    this.award_team = award_team; //First, Second, National
  }

  get award_name() {
    var award_name = "";
    if (this.award_team_set == "conference") {
      if (this.award_timeframe == "week") {
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        award_name = `${this.season}`;
      } else if (this.award_timeframe == "pre-season") {
        award_name = `${this.season}`;
      }
    } else {
      if (this.award_timeframe == "week") {
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == "individual") {
          award_name = `${this.season} ${this.award_group_type} Trophy`;
        } else {
          award_name = `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_name = `${this.season}`;
      }
    }

    return award_name;
  }

  get award_group_name() {
    console.log({ this: this });
    var award_group_name = "";
    if (this.award_team_set == "conference") {
      if (this.award_timeframe == "week") {
        award_group_name = `${this.conference_season.conference.conference_abbreviation} ${this.award_group_type} Player of the Week`;
        `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == "individual") {
          award_group_name = `${this.conference_season.conference.conference_abbreviation} POTY`;
          `${this.season}`;
        } else {
          award_group_name = `${this.award_team} Team ${this.conference_season.conference.conference_abbreviation} All-Conference ${this.award_group_type}`;
          `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_group_name = `${this.conference_season.conference.conference_abbreviation} Preseason All-Conference ${this.award_group_type}`;
        `${this.season}`;
      }
    } else {
      if (this.award_timeframe == "week") {
        award_group_name = `National ${this.award_group_type} Player of the Week`;
        `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == "position") {
          if (this.award_team == "First") {
            award_group_name = `All-American ${this.award_group_type}`;
          } else {
            award_group_name = `${this.award_team} Team All-American ${this.award_group_type}`;
          }
          `${this.season}`;
        } else {
          award_group_name = this.award_group_type + " Trophy";
          `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_group_name = `Preseason All-American ${this.award_group_type}`;
      }
    }
    console.log({ award_group_name: award_group_name, this: this });
    return award_group_name;
  }

  get award_href() {
    if (this.player_team_game) {
      return this.player_team_game.team_game.game.game_href;
    }
    return "";
  }
}

class player_team_game {
  constructor(player_team_game_id, team_game_id, player_team_season_id) {
    this.player_team_game_id = player_team_game_id;
    this.team_game_id = team_game_id;
    this.player_team_season_id = player_team_season_id;
    this.top_stats = [];
    this.game_stats = {
      games: {
        game_score: 0,
        weighted_game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 1,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };
  }

  get passer_rating() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (8.4 * this.game_stats.passing.yards +
          330 * this.game_stats.passing.tds +
          100 * this.game_stats.passing.completions -
          200 * this.game_stats.passing.ints) /
          this.game_stats.passing.attempts,
        1
      );
    }

    return 0;
  }

  get passing_yards_per_game() {
    return this.game_stats.passing.yards;
  }
  get rushing_yards_per_game() {
    return this.game_stats.rushing.yards;
  }

  get completion_percentage() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (this.game_stats.passing.completions * 100) / this.game_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (this.game_stats.passing.completions * 100) / this.game_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get is_qualified_passer() {
    if (
      this.game_stats.games.games_played &&
      this.game_stats.passing.attempts / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get completion_percentage_qualified() {
    if (this.is_qualified_passer) {
      return this.completion_percentage;
    }

    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(this.game_stats.passing.yards / this.game_stats.passing.attempts, 1);
    }

    return 0;
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(this.game_stats.rushing.yards / this.game_stats.rushing.carries, 1);
    }

    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.game_stats.games.games_played > 0 &&
      this.game_stats.rushing.carries / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.game_stats.receiving.receptions) {
      return round_decimal(
        this.game_stats.receiving.yards / this.game_stats.receiving.receptions,
        1
      );
    }

    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.game_stats.receiving.receptions >= 5) {
      return round_decimal(
        this.game_stats.receiving.yards / this.game_stats.receiving.receptions,
        1
      );
    }

    return 0;
  }

  get defense_action_count() {
    return (
      (this.game_stats.defense.tackles || 0) +
      (this.game_stats.defense.deflections || 0) +
      (this.game_stats.defense.ints || 0) +
      (this.game_stats.defense.sacks || 0)
    );
  }

  get yards_from_scrimmage() {
    return this.game_stats.receiving.yards + this.game_stats.rushing.yards;
  }
}

class week {
  constructor() {}

  get world_href() {
    return `/World/${this.world_id}/`;
  }

  get week_href() {
    return `/World/${this.world_id}/Week/${this.short_name}`;
  }
}

class phase {
  constructor() {}
}

class world {
  constructor() {}

  get world_href() {
    return `/World/${this.world_id}/`;
  }
}

class team_game {
  constructor(team_game_options) {
    //this = team_game_options;
    for (var key in team_game_options) {
      this[key] = team_game_options[key];
    }
    this.points = null;
    this.is_winning_team = null;
    this.record = {
      wins: 0,
      losses: 0,
      conference_wins: 0,
      conference_losses: 0,
    };
    this.national_rank = null;
    this.top_stats = [];

    this.game_stats = {
      team: {
        points: 0,
        time_of_possession: 0,
        possessions: 0,
        turnovers: 0,
        biggest_lead: 0,
        down_efficiency: {
          all: { success: 0, total: 0 },
          1: { success: 0, total: 0 },
          2: { success: 0, total: 0 },
          3: { success: 0, total: 0 },
        },
        field_position: {
          total_drives: 0,
          total_start_yard: 0,
        },
        drive_efficiency: {
          20: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
          40: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
        },
        downs: {
          first_downs: {
            total: 0,
            passing: 0,
            rushing: 0,
            penalty: 0,
          },
          third_downs: {
            attempts: 0,
            conversions: 0,
          },
          fourth_downs: {
            attempts: 0,
            conversions: 0,
          },
          two_points: {
            attempts: 0,
            conversions: 0,
          },
        },
      },
      games: {
        game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 1,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };

    this.opponent_game_stats = deep_copy(this.game_stats);
  }

  get game_href() {
    return `World/${this.world_id}/Game/${this.game_id}`
  }

  get game_location(){
    return this.is_home_team ? 'home' : 'away';
  }

  get game_location_char(){
    return this.is_home_team ? 'vs.' : '@';
  }

  get game_outcome_letter() {
    if (this.is_winning_team) {
      return "W";
    } else if (this.is_winning_team == false) {
      return "L";
    }
    return "";
  }

  get record_display() {
    return `${this.record.wins} - ${this.record.losses}`;
  }

  get time_of_possession_formatted() {
    let minutes = Math.floor(this.game_stats.team.time_of_possession / 60);
    let seconds = Math.floor(this.game_stats.team.time_of_possession % 60);
    let seconds_display = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}:${seconds_display}`;
  }

  get total_yards() {
    return this.game_stats.passing.yards + this.game_stats.rushing.yards;
  }

  get third_down_conversion_percentage() {
    if (this.game_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.game_stats.team.downs.third_downs.conversions * 100) /
        this.game_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get fourth_down_conversion_percentage() {
    if (this.game_stats.team.downs.fourth_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.game_stats.team.downs.fourth_downs.conversions * 100) /
        this.game_stats.team.downs.fourth_downs.attempts,
      1
    );
  }

  get national_rank_display() {
    if (this.national_rank == null) {
      return null;
    }
    if (this.national_rank <= 25) {
      return `(${this.national_rank})`;
    }
    return "";
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(this.game_stats.rushing.yards / this.game_stats.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.game_stats.games.games_played > 0 &&
      this.game_stats.rushing.carries / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get plays() {
    return this.game_stats.passing.attempts + this.game_stats.rushing.carries;
  }

  get yards_per_play() {
    if (this.plays == 0) {
      return 0;
    }
    return round_decimal(this.total_yards / this.plays, 1);
  }

  get passer_rating() {
    if (this.game_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.game_stats.passing.yards +
        330 * this.game_stats.passing.tds +
        100 * this.game_stats.passing.completions -
        200 * this.game_stats.passing.ints) /
        this.game_stats.passing.attempts,
      1
    );
  }
}

class team {
  build_team_logo(size_obj) {
    var folder_prefix = "/static/img/team_logos/";
    var size_suffix = "";
    if ("img_size" in size_obj) {
      size_suffix = "_" + size_obj["img_size"];
    }

    if (this.team_id < 0) {
      var path = folder_prefix + "ncaa.png";
    } else {
      var path = folder_prefix + this.school_name + "_" + this.team_name + size_suffix + ".png";
    }

    path = path
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("&", "_")
      .replaceAll("'", "")
      .replaceAll("-", "_");

    return path;
  }

  get team_field_a_text() {
    if (this.school_name.length > 12) {
      if (this.team_name.length > 10) {
        return this.team_abbreviation;
      }
      return this.team_name;
    }
    return this.school_name;
  }

  get team_field_b_text() {
    if (this.team_name.length > 12) {
      if (this.school_name.length > 10) {
        return this.team_abbreviation;
      }
      return this.school_name;
    }
    return this.team_name;
  }

  get full_name() {
    return `${this.school_name} ${this.team_name}`;
  }

  get team_href() {
    if (this.team_id == -2) {
      return `/World/${this.world_id}/Recruiting`;
    }
    return `/World/${this.world_id}/Team/${this.team_id}`;
  }

  get team_logo() {
    {
      var folder_prefix = "/static/img/team_logos/";
      var size_suffix = "";

      if (this.team_id < 0) {
        var path = folder_prefix + "ncaa.png";
      } else {
        var path = folder_prefix + this.school_name + "_" + this.team_name + size_suffix;
      }

      path = path
        .toLowerCase()
        .replaceAll(" ", "_")
        .replaceAll("&", "_")
        .replaceAll("'", "")
        .replaceAll(".", "")
        .replaceAll("-", "_");

      path = path + ".png";

      return path;
    }
  }

  luma(color) {
    var R = color.slice(0, 2);
    var G = color.slice(2, 4);
    var B = color.slice(4, 6);

    const luma =
      (0.299 * parseInt(R, 16) ** 2 +
        0.587 * parseInt(G, 16) ** 2 +
        0.114 * parseInt(B, 16) ** 2) **
      0.5;
    return luma;
  }

  get secondary_color_display() {
    if (this.luma(this.team_color_secondary_hex) < 230) {
      return this.team_color_secondary_hex;
    }
    return "000000";
  }
}

class league_season {
  constructor(init_obj, previous_season) {
    this.season = init_obj.season;
    this.world_id = init_obj.world_id;
    this.is_season_complete = false;

    this.playoffs = {
      playoffs_started: false,
      playoffs_complete: false,
      number_playoff_rounds: 4,
      number_playoff_teams: 12,
      playoff_rounds: [
        {
          playoff_round_number: 1,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 1",
          next_week_name: "Bowl Week 2",
          round_name: "National Quarterfinals",
          playoff_games: [
            {
              team_objs: [{ seed: 1, team_game_id: null, team_season_id: null }],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 8, team_game_id: null, team_season_id: null },
                { seed: 9, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [{ seed: 4, team_game_id: null, team_season_id: null }],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 5, team_game_id: null, team_season_id: null },
                { seed: 12, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [{ seed: 2, team_game_id: null, team_season_id: null }],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 7, team_game_id: null, team_season_id: null },
                { seed: 10, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [{ seed: 3, team_game_id: null, team_season_id: null }],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 6, team_game_id: null, team_season_id: null },
                { seed: 11, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
          ],
        },
        {
          playoff_round_number: 2,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 2",
          next_week_name: "Bowl Week 3",
          round_name: "National Quarterfinals",
          playoff_games: [
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
          ],
        },
        {
          playoff_round_number: 3,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 3",
          next_week_name: "Bowl Week 4",
          round_name: "National Semifinals",
          playoff_games: [
            { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
            { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
          ],
        },
        {
          playoff_round_number: 4,
          is_current_round: false,
          is_championship: true,
          week_name: "Bowl Week 4",
          next_week_name: null,
          round_name: "National Championship",
          playoff_games: [{ team_objs: [], bye_game: false, seeds_set: false, game_id: null }],
        },
      ],
    };

    this.preseason_tasks = {
      user_cut_players: false,
      user_set_gameplan: false,
      user_set_depth_chart: false,
    };

    if (previous_season == undefined) {
      this.is_current_season = true;
      this.captains_per_team = init_obj.captains_per_team;
      this.players_per_team = init_obj.players_per_team;
      this.user_team_id = Math.ceil(Math.random() * init_obj.num_teams);
    } else {
      this.is_current_season = false;
      this.captains_per_team = previous_season.captains_per_team;
      this.players_per_team = previous_season.players_per_team;
      this.user_team_id = previous_season.user_team_id;
    }
  }
}

class team_season_stats {
  constructor(team_season_id) {
    this.team_season_id = team_season_id;
    this.season_stats = {
      team: {
        points: 0,
        time_of_possession: 0,
        possessions: 0,
        turnovers: 0,
        biggest_lead: 0,
        down_efficiency: {
          all: { success: 0, total: 0 },
          1: { success: 0, total: 0 },
          2: { success: 0, total: 0 },
          3: { success: 0, total: 0 },
        },
        field_position: {
          total_drives: 0,
          total_start_yard: 0,
        },
        drive_efficiency: {
          20: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
          40: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
        },
        downs: {
          first_downs: {
            total: 0,
            passing: 0,
            rushing: 0,
            penalty: 0,
          },
          third_downs: {
            attempts: 0,
            conversions: 0,
          },
          fourth_downs: {
            attempts: 0,
            conversions: 0,
          },
          two_points: {
            attempts: 0,
            conversions: 0,
          },
        },
      },
      games: {
        game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 0,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };
    this.opponent_season_stats = deep_copy(this.season_stats);
  }

  get points_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.season_stats.team.points / this.season_stats.games.games_played, 1);
  }

  get kicking_field_goal_percentage() {
    if (this.season_stats.kicking.fga == 0) {
      return 0;
    }
    return round_decimal((this.season_stats.kicking.fgm * 100) / this.season_stats.kicking.fga, 1);
  }

  get kicking_extra_point_percentage() {
    if (this.season_stats.kicking.xpa == 0) {
      return 0;
    }
    return round_decimal((this.season_stats.kicking.xpm * 100) / this.season_stats.kicking.xpa, 1);
  }

  get punting_average_yards() {
    if (this.season_stats.punting.punts == 0) {
      return 0;
    }
    return round_decimal(this.season_stats.punting.yards / this.season_stats.punting.punts, 1);
  }

  get completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) / this.season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) / this.season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get opponent_completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.opponent_season_stats.passing.completions * 100) /
          this.opponent_season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(this.season_stats.passing.yards / this.season_stats.passing.attempts, 1);
  }

  get passing_yards_per_completion() {
    if (this.season_stats.passing.completions == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.passing.yards / this.season_stats.passing.completions,
      1
    );
  }

  get opponent_passing_yards_per_attempt() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(
      this.opponent_season_stats.passing.yards / this.opponent_season_stats.passing.attempts,
      1
    );
  }

  get points_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.team.points / this.season_stats.games.games_played,
      1
    );
  }

  get point_differential_per_game() {
    return round_decimal(this.points_per_game - this.points_allowed_per_game, 1);
  }

  get passer_rating() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.season_stats.passing.yards +
        330 * this.season_stats.passing.tds +
        100 * this.season_stats.passing.completions -
        200 * this.season_stats.passing.ints) /
        this.season_stats.passing.attempts,
      1
    );
  }

  get opponent_passer_rating() {
    if (this.opponent_season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.opponent_season_stats.passing.yards +
        330 * this.opponent_season_stats.passing.tds +
        100 * this.opponent_season_stats.passing.completions -
        200 * this.opponent_season_stats.passing.ints) /
        this.opponent_season_stats.passing.attempts,
      1
    );
  }

  get sack_dropback_percent() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.passing.sacks * 100) / this.season_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.season_stats.passing.yards / this.season_stats.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.season_stats.rushing.yards / this.season_stats.games.games_played, 1);
  }

  get rushing_carries_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.rushing.carries / this.season_stats.games.games_played,
      1
    );
  }

  get play_call_percent_rush() {
    if (this.plays == 0) {
      return 0;
    }

    return round_decimal((this.season_stats.rushing.carries * 100) / this.plays, 1);
  }

  get play_call_percent_pass() {
    if (this.plays == 0) {
      return 0;
    }

    return round_decimal((this.season_stats.passing.attempts * 100) / this.plays, 1);
  }

  get receiving_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.receiving.yards / this.season_stats.games.games_played,
      1
    );
  }

  get receiving_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.receiving.yards / this.season_stats.games.games_played,
      1
    );
  }

  get receiving_yards_per_catch() {
    if (this.season_stats.receiving.receptions) {
      return round_decimal(
        this.season_stats.receiving.yards / this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.season_stats.receiving.receptions > 10) {
      return round_decimal(
        this.season_stats.receiving.yards / this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get rushing_yards_per_carry() {
    if (this.season_stats.rushing.carries) {
      return round_decimal(this.season_stats.rushing.yards / this.season_stats.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.season_stats.rushing.carries > 0 &&
      this.season_stats.rushing.carries / this.season_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get opponent_rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.rushing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get opponent_receiving_yards_per_game() {
    if (this.opponent_season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.opponent_season_stats.receiving.yards / this.opponent_season_stats.games.games_played,
      1
    );
  }

  get opponent_receiving_yards_per_catch() {
    if (this.opponent_season_stats.receiving.receptions) {
      return round_decimal(
        this.opponent_season_stats.receiving.yards /
          this.opponent_season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get opponent_rushing_yards_per_carry() {
    if (this.opponent_season_stats.rushing.carries) {
      return round_decimal(
        this.opponent_season_stats.rushing.yards / this.opponent_season_stats.rushing.carries,
        1
      );
    }
    return 0;
  }

  get yards() {
    return this.season_stats.passing.yards + this.season_stats.rushing.yards;
  }

  get plays() {
    return this.season_stats.passing.attempts + this.season_stats.rushing.carries;
  }

  get yards_per_play() {
    if (this.plays == 0) {
      return 0;
    }
    return round_decimal(this.yards / this.plays, 1);
  }

  get yards_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(this.yards / this.season_stats.team.field_position.total_drives, 1);
  }

  get points_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.team.points / this.season_stats.team.field_position.total_drives,
      1
    );
  }

  get drive_turnover_percent() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(
      (this.turnovers * 100) / this.season_stats.team.field_position.total_drives,
      1
    );
  }

  get yards_per_game() {
    return round_decimal(this.passing_yards_per_game + this.rushing_yards_per_game, 1);
  }

  get yards_allowed() {
    return this.opponent_season_stats.passing.yards + this.opponent_season_stats.rushing.yards;
  }

  get yards_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.yards_allowed / this.season_stats.games.games_played, 1);
  }

  get yards_per_game_diff() {
    return round_decimal(this.yards_per_game - this.yards_allowed_per_game, 1);
  }

  get third_down_conversion_percentage() {
    if (this.season_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.downs.third_downs.conversions * 100) /
        this.season_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get fourth_down_conversion_percentage() {
    if (this.season_stats.team.downs.fourth_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.downs.fourth_downs.conversions * 100) /
        this.season_stats.team.downs.fourth_downs.attempts,
      1
    );
  }

  get defensive_third_down_conversion_percentage() {
    if (this.opponent_season_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.opponent_season_stats.team.downs.third_downs.conversions * 100) /
        this.opponent_season_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get third_down_conversion_percentage_diff() {
    return round_decimal(
      this.third_down_conversion_percentage - this.defensive_third_down_conversion_percentage,
      1
    );
  }

  get takeaways() {
    return this.opponent_season_stats.team.turnovers;
  }
  get turnovers() {
    return this.season_stats.team.turnovers;
  }
  get turnover_diff() {
    return this.takeaways - this.turnovers;
  }

  get opponent_passing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.passing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get opponent_rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.rushing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get points_per_drive_within_40() {
    if (this.season_stats.team.drive_efficiency[40].total_trips == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[40].total_points /
        this.season_stats.team.drive_efficiency[40].total_trips,
      1
    );
  }

  get drives_within_40_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[40].total_trips /
        this.season_stats.games.games_played,
      1
    );
  }

  get drives_within_20_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[20].total_trips /
        this.season_stats.games.games_played,
      1
    );
  }

  get points_per_drive_within_20() {
    if (this.season_stats.team.drive_efficiency[20].total_trips == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[20].total_points /
        this.season_stats.team.drive_efficiency[20].total_trips,
      1
    );
  }

  get down_efficiency() {
    if (this.season_stats.team.down_efficiency.all.total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency.all.success * 100) /
        this.season_stats.team.down_efficiency.all.total,
      1
    );
  }

  get down_efficiency_3rd() {
    if (this.season_stats.team.down_efficiency[3].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[3].success * 100) /
        this.season_stats.team.down_efficiency[3].total,
      1
    );
  }

  get down_efficiency_2nd() {
    if (this.season_stats.team.down_efficiency[2].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[2].success * 100) /
        this.season_stats.team.down_efficiency[2].total,
      1
    );
  }

  get down_efficiency_1st() {
    if (this.season_stats.team.down_efficiency[1].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[1].success * 100) /
        this.season_stats.team.down_efficiency[1].total,
      1
    );
  }

  get average_field_position() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.field_position.total_start_yard /
        this.season_stats.team.field_position.total_drives,
      1
    );
  }
}

class team_season {
  constructor(init_obj) {
    if (init_obj.team_id > 0) {
      this.record = {
        wins: 0,
        losses: 0,
        conference_wins: 0,
        conference_losses: 0,
        conference_net_wins: 0,
        games_played: 0,
        conference_gb: 0,
        win_streak: 0,
        defeated_teams: [],
      };
      this.rankings = {
        division_rank: [],
        national_rank: [],
        srs_ratings: [],
        national_rank_delta: 0,
        national_rank_delta_abs: 0,
        stat_rankings: { offense: [], defense: [], overall: [] },
      };
      this.games = [];
      this.playoff = {};
      this.broadcast = {
        national_broadcast: 0,
        regional_broadcast: 0,
      };
      this.results = {
        conference_champion: false,
        national_champion: false,
        final_four: false,
        bowl: null,
      };
      this.recruiting = {
        scholarships_to_offer: 25,
        recruiting_class_rank: 1,
        points_per_week: 100,
        class_points: 0,
        signed_player_stars: {
          stars_1: 0,
          stars_2: 0,
          stars_3: 0,
          stars_4: 0,
          stars_5: 0,
        },
        signed_player_team_season_ids: [],
      };
      this.headlines = [];
      this.top_stats = [];
    }

    for (const key in init_obj) {
      this[key] = init_obj[key];
    }
  }

  get team_season_href() {
    return `/World/${this.world_id}/Team/${this.team_id}/Season/${this.season}`;
  }

  get best_rank() {
    return Math.min(...this.rankings.national_rank);
  }

  get worst_rank() {
    return Math.max(...this.rankings.national_rank);
  }

  get first_rank() {
    return this.rankings.national_rank[this.rankings.national_rank.length - 1];
  }

  get weeks_ranked_1() {
    return this.rankings.national_rank.filter((rank) => rank == 1).length;
  }

  get weeks_ranked_top_5() {
    return this.rankings.national_rank.filter((rank) => rank <= 5).length;
  }

  get weeks_ranked_top_10() {
    return this.rankings.national_rank.filter((rank) => rank <= 10).length;
  }

  get weeks_ranked_top_25() {
    return this.rankings.national_rank.filter((rank) => rank <= 25).length;
  }

  get national_rank() {
    return this.rankings.national_rank[0];
  }

  get national_rank_display() {
    if (this.rankings.national_rank[0] <= 25) {
      return `(${this.rankings.national_rank[0]})`;
    }
    return "";
  }

  get record_display() {
    return `${this.record.wins} - ${this.record.losses}`;
  }

  get net_wins() {
    return this.record.wins - this.record.losses;
  }

  get conference_record_display() {
    return `${this.record.conference_wins} - ${this.record.conference_losses} `;
  }

  get win_streak_string() {
    if (this.record.win_streak > 0) {
      return `W${this.record.win_streak}`;
    } else if (this.record.win_streak < 0) {
      return `L${Math.abs(this.record.win_streak)}`;
    }
    return "-";
  }

  get win_streak_color() {
    if (this.record.win_streak > 0) {
      return `W`;
    } else if (this.record.win_streak < 0) {
      return `L`;
    }
    return "-";
  }

  get wins() {
    return this.record.wins;
  }
}

class coach {
  constructor(init_data) {
    this.coach_id = init_data.coach_id;
    this.player_id = init_data.player_id;
    this.name = init_data.name;
    this.world_id = init_data.world_id;
    this.hometown = init_data.hometown;
    this.coaching_position = init_data.coaching_position;
    this.ethnicity = init_data.ethnicity;
    this.body = init_data.body;
    this.team_id = init_data.team_id;
    this.alma_mater_team_id = init_data.alma_mater_team_id;

    let pass_tendency = round_decimal(normal_trunc(50, 50, 1, 100), 0);
    this.tendencies = {
      pass: pass_tendency,
      run: 100 - pass_tendency,
      playclock_urgency: round_decimal(normal_trunc(4, 2, 1, 7), 0),
    };

    this.personality = {
      leadership: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      work_ethic: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      desire_for_winner: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      loyalty: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      desire_for_playtime: round_decimal(normal_trunc(10, 3, 1, 100), 0),
    };
  }

  get hometown_and_state() {
    return `${this.hometown.city}, ${this.hometown.state}`;
  }

  get full_name() {
    return `${this.name.first} ${this.name.last}`;
  }

  get coach_href() {
    return `/World/${this.world_id}/Coach/${this.coach_id}`;
  }
}

class coach_team_season {
  constructor(init_data) {
    this.coach_id = init_data.coach_id;
    this.coach_team_season_id = init_data.coach_team_season_id;
    this.post_season_movement = null; //[quit, retired, fired, new job]
    this.ratings = init_data.ratings;
    this.age = init_data.age;

    this.team_season_id = init_data.team_season_id;
    this.season = init_data.season;
    this.world_id = init_data.world_id;
    this.coaching_position = init_data.coaching_position;
  }
}

class player {
  constructor(init_data) {
    this.player_id = init_data.player_id;
    this.name = init_data.name;
    this.world_id = init_data.world_id;
    this.hometown = init_data.hometown;
    this.position = init_data.position;
    this.ethnicity = init_data.ethnicity;
    this.body = init_data.body;
    this.team_id = init_data.team_id;

    this.redshirt = { previous: false, current: false };
    this.jersey_number = null;

    this.personality = {
      leadership: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      work_ethic: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      desire_for_winner: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      loyalty: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      desire_for_playtime: round_decimal(normal_trunc(50, 15, 1, 100), 0),
    };
  }

  get full_name() {
    return `${this.name.first} ${this.name.last}`;
  }

  get player_href() {
    return `/World/${this.world_id}/Player/${this.player_id}`;
  }

  get hometown_and_state() {
    return `${this.hometown.city}, ${this.hometown.state}`;
  }

  get height_formatted() {
    const feet = parseInt(this.height / 12);
    const inches = this.height % 12;
    return `${feet}'${inches}"`;
  }

  get bmi() {
    return (703.0 * this.weight) / this.height ** 2;
  }

  get passer_rating() {
    if (this.career_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.career_stats.passing.yards +
        330 * this.career_stats.passing.tds +
        100 * this.career_stats.passing.completions -
        200 * this.career_stats.passing.ints) /
        this.career_stats.passing.attempts,
      1
    );
  }

  get rushing_yards_per_carry() {
    console.log({
      "this.career_stats": this.career_stats,
      "this.career_stats.rushing.carries": this.career_stats.rushing.carries,
    });
    if (this.career_stats.rushing.carries) {
      return round_decimal(this.career_stats.rushing.yards / this.career_stats.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.career_stats.games.games_played > 0 &&
      this.career_stats.rushing.carries / this.career_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get yards_from_scrimmage() {
    return this.career_stats.receiving.yards + this.career_stats.rushing.yards;
  }

  get completion_percentage() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      (this.career_stats.passing.completions * 100) / this.career_stats.passing.attempts,
      1
    );
  }

  get passing_completion_percentage() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      (this.career_stats.passing.completions * 100) / this.career_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_attempt() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(this.career_stats.passing.yards / this.career_stats.passing.attempts, 1);
  }

  get passing_yards_per_completion() {
    if (this.career_stats.passing.completions < 50) {
      return 0;
    }
    return round_decimal(
      this.career_stats.passing.yards / this.career_stats.passing.completions,
      1
    );
  }

  get passing_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.career_stats.passing.yards / this.career_stats.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.career_stats.rushing.yards / this.career_stats.games.games_played, 1);
  }

  get receiving_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.career_stats.receiving.yards / this.career_stats.games.games_played,
      1
    );
  }

  get is_qualified_rusher() {
    if (
      this.career_stats.games.games_played > 0 &&
      this.career_stats.rushing.carries / this.career_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.career_stats.receiving.receptions > 10) {
      return round_decimal(
        this.career_stats.receiving.yards / this.career_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }
}

class player_team_season_stats {
  constructor(player_team_season_id) {
    this.player_team_season_id = player_team_season_id;
    this.games = {
      game_score: 0,
      weighted_game_score: 0,
      games_played: 0,
      games_started: 0,
      plays_on_field: 0,
      team_games_played: 0,
      points: 0,
    };
    this.top_stats = [];
    this.top_12_weighted_game_scores = [];
    this.passing = {
      completions: 0,
      attempts: 0,
      yards: 0,
      tds: 0,
      ints: 0,
      sacks: 0,
      sack_yards: 0,
    };
    this.rushing = {
      carries: 0,
      yards: 0,
      tds: 0,
      over_20: 0,
      lng: 0,
      broken_tackles: 0,
      yards_after_contact: 0,
    };

    this.receiving = {
      yards: 0,
      targets: 0,
      receptions: 0,
      tds: 0,
      yards_after_catch: 0,
      drops: 0,
      lng: 0,
      yards: 0,
    };
    this.blocking = {
      sacks_allowed: 0,
      pancakes: 0,
      blocks: 0,
    };
    this.defense = {
      tackles: 0,
      solo_tackles: 0,
      sacks: 0,
      tackles_for_loss: 0,
      deflections: 0,
      qb_hits: 0,
      tds: 0,
      ints: 0,
      int_yards: 0,
      int_tds: 0,
      safeties: 0,
    };
    this.fumbles = {
      fumbles: 0,
      lost: 0,
      recovered: 0,
      forced: 0,
      return_yards: 0,
      return_tds: 0,
    };
    this.kicking = {
      fga: 0,
      fgm: 0,
      fga_29: 0,
      fgm_29: 0,
      fga_39: 0,
      fgm_39: 0,
      fga_49: 0,
      fgm_49: 0,
      fga_50: 0,
      fgm_50: 0,
      lng: 0,
      xpa: 0,
      xpm: 0,
      kickoffs: 0,
      touchbacks: 0,
    };
    this.punting = {
      punts: 0,
      yards: 0,
      touchbacks: 0,
      within_20: 0,
    };
    this.returning = {
      kr_returns: 0,
      kr_yards: 0,
      kr_tds: 0,
      kr_lng: 0,
      pr_returns: 0,
      pr_yards: 0,
      pr_tds: 0,
      pr_lng: 0,
    };
  }

  get completion_percentage() {
    if (this.passing.attempts) {
      return round_decimal((this.passing.completions * 100) / this.passing.attempts, 1);
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.passing.attempts) {
      return round_decimal((this.passing.completions * 100) / this.passing.attempts, 1);
    }
    return 0;
  }

  get passer_rating() {
    if (this.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.passing.yards +
        330 * this.passing.tds +
        100 * this.passing.completions -
        200 * this.passing.ints) /
        this.passing.attempts,
      1
    );
  }

  get is_qualified_passer() {
    if (
      this.games.games_played > 0 &&
      (this.passing.attempts * 1.0) / this.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get completion_percentage_qualified() {
    if (this.is_qualified_passer) {
      return this.completion_percentage;
    }
    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(this.passing.yards / this.passing.attempts, 1);
  }

  get passing_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.passing.yards / this.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.rushing.yards / this.games.games_played, 1);
  }

  get receiving_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.receiving.yards / this.games.games_played, 1);
  }

  get rushing_yards_per_carry() {
    if (this.rushing.carries) {
      return round_decimal(this.rushing.yards / this.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (this.games.games_played > 0 && this.rushing.carries / this.games.games_played > 10) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.receiving.receptions) {
      return round_decimal(this.receiving.yards / this.receiving.receptions, 1);
    }
    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.receiving.receptions > 10) {
      return this.receiving_yards_per_catch;
    }
    return 0;
  }

  get yards_from_scrimmage() {
    return this.receiving.yards + this.rushing.yards;
  }

  get average_weighted_game_score() {
    if (!this.games || this.top_12_weighted_game_scores.length == 0) {
      return 0;
    }
    return round_decimal(
      sum(this.top_12_weighted_game_scores.slice(0, 12)) /
        this.top_12_weighted_game_scores.slice(0, 12).length,
      1
    );
  }
}

class recruit_team_season {
  constructor(init_data) {
    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }
}

class player_team_season {
  constructor(init_data) {
    this.player_id = init_data.player_id;
    this.player_team_season_id = init_data.player_team_season_id;
    this.is_recruit = false;
    this.post_season_movement = null; //[quit, graduate, draft, transfer]
    this.is_captain = false;
    this.ratings = init_data.ratings;

    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }

  get class_name() {
    if (this.class.redshirted) {
      return this.class.class_name + ` (RS)`;
    }
    return this.class.class_name;
  }

  get player_award_rating() {
    let position_overall_map = {
      QB: 0,
      RB: -0.05,
      FB: -0.5,
      WR: -0.1,
      TE: -0.2,
      OT: -0.3,
      IOL: -0.3,
      EDGE: -0.2,
      DL: -0.2,
      LB: -0.25,
      CB: -0.25,
      S: -0.25,
      K: -0.5,
      P: -0.5,
    };
    return (
      (10 * this.season_stats.average_weighted_game_score +
        1 * this.ratings.overall.overall +
        0.5 * this.team_season.team.team_ratings.brand) *
      (1 / this.team_season.national_rank) ** 0.03 *
      (1 / (this.team_season_average_weighted_game_score_rank || 1)) ** 0.05 *
      (1 / (this.team_season_overall_rank || 1)) ** 0.03 *
      (1 + position_overall_map[this.position])
    );
  }
}

class game {
  get game_href() {
    return `/World/${this.world_id}/Game/${this.game_id}`;
  }

  get score_display() {
    var points = `${this.outcome.winning_team.points} - ${this.outcome.losing_team.points}`;
    return points;
  }
}

class conference_season {}

class conference {
  get conference_href() {
    return `/World/${this.world_id}/Conference/${this.conference_id}`;
  }

  get conference_logo() {
    var folder_prefix = "/static/img/conference_logos/";

    if (this.conference_id < 0) {
      var path = folder_prefix + "ncaa.png";
    } else {
      var path = folder_prefix + this.conference_name + ".png";
    }

    path = path
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("&", "_")
      .replaceAll("'", "")
      .replaceAll("-", "_");

    return path;
  }

  luma(color) {
    var R = color.slice(0, 2);
    var G = color.slice(2, 4);
    var B = color.slice(4, 6);

    const luma =
      (0.299 * parseInt(R, 16) ** 2 +
        0.587 * parseInt(G, 16) ** 2 +
        0.114 * parseInt(B, 16) ** 2) **
      0.5;
    return luma;
  }

  get secondary_color_display() {
    console.log({
      this: this,
      conference_color_secondary_hex: this.conference_color_secondary_hex,
    });
    if (this.luma(this.conference_color_secondary_hex) < 230) {
      return this.conference_color_secondary_hex;
    }
    return "000000";
  }
}

const prune_orphaned_databases = async () => {
  const ddb = await driver_db();
  let databases = ddb.world.find();

  for (let world_obj of databases) {
    if (!world_obj.user_team || !world_obj.user_team.team_name) {
      await ddb.world.findAndRemove({ world_id: world_obj.world_id });
    }
  }

  await ddb.saveDatabaseAsync();

  databases = ddb.world.find();
  let database_name_list = databases.map((db) => db.database_name);
  database_name_list.push("driver");

  let hfc_idbAdapter = new LokiIndexedAdapter("hfc");
  let loki_catalog = await hfc_idbAdapter.getDatabaseListAsync();

  console.log({ loki_catalog: loki_catalog, databases: databases });
  for (let db_name of loki_catalog) {
    console.log({ db_name: db_name });
    if (!database_name_list.includes(db_name)) {
      await hfc_idbAdapter.deleteDatabaseAsync(db_name);
    }
  }
};

const get_databases_references = async () => {
  const ddb = await driver_db();
  const databases = ddb.world.find();

  var database_list = await Promise.all(
    databases.map(async function (db_obj) {
      return db_obj;
    })
  );

  return database_list;
};

const resolve_db = async (world_obj) => {
  var dbname = "";
  if ("database_id" in world_obj && world_obj["database_id"]) {
    dbname = "headfootballcoach" + world_obj.database_id;
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "resolve_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  return get_db({ database_name: dbname });
};

const initialize_db = async (db) => {
  db_collection_list.forEach(function (col_obj) {
    col_obj.options.clone = true;
    col_obj.options.cloneMethod = clone_method;
    db[col_obj.collection_name] =
      db.getCollection(col_obj.collection_name) ||
      db.addCollection(col_obj.collection_name, col_obj.options);
  });

  await db.saveDatabaseAsync();
};

const get_db = async (world_obj) => {
  var dbname = "";
  if ("database_id" in world_obj) {
    dbname = "headfootballcoach" + world_obj.database_id.toString();
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "get_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  let cloneMethod = "shallow-assign";

  let idbAdapter = new LokiIndexedAdapter("hfc");
  let db = new loki(dbname, {
    verbose: true,
    env: "BROWSER",
    autosave: true,
    adapter: idbAdapter,
    persistenceAdapter: idbAdapter,
    persistenceMethod: "adapter",
    clone: true,
    cloneMethod: cloneMethod,
  });

  let schema_options = {};

  db_collection_list.forEach(function (coll) {
    schema_options[coll.collection_name] = {
      proto: coll.options.proto.prototype,
    };
  });

  await db.loadDatabaseAsync(schema_options);
  await initialize_db(db);

  return db;
};

const create_db = async (world_id) => {
  return get_db({ database_id: world_id });
};

const create_new_db = async () => {
  ddb = await driver_db();
  let world_id = ddb.world.nextId("world_id");

  const new_season_info = {
    world_id: world_id,
    database_name: "headfootballcoach" + world_id,
    date_created: Date.now(),
    date_last_updated: Date.now(),
    user_team: {
      team_name: null,
      school_name: null,
      team_logo_url: null,
      team_record: null,
    },
    current_season: 2022,
    current_week: "Week 1",
  };
  console.log({
    new_season_info: new_season_info,
  });
  ddb.world.insert(new_season_info);

  let db = await create_db(world_id);
  return { db: db, new_season_info: new_season_info };
};

const clone_method = "shallow-assign";
const driver_collection_list = [
  {
    collection_name: "world",
    options: { proto: world, unique: ["world_id"], clone: true, cloneMethod: clone_method },
  },
  {
    collection_name: "first_names",
    options: { unique: ["name"], clone: true, cloneMethod: clone_method },
  },
  {
    collection_name: "last_names",
    options: { unique: ["name"], clone: true, cloneMethod: clone_method },
  },
  {
    collection_name: "cities",
    options: {
      unique: ["city_state"],
      indices: ["city", "state"],
      clone: true,
      cloneMethod: clone_method,
    },
  },
];

const db_collection_list = [
  {
    collection_name: "league_season",
    options: { proto: league_season, unique: ["season"], indices: [] },
  },
  { collection_name: "team", options: { proto: team, unique: ["team_id"], indices: [] } },
  {
    collection_name: "team_season",
    options: { proto: team_season, unique: ["team_season_id"], indices: ["team_id", "season"] },
  },
  {
    collection_name: "team_season_stats",
    options: { proto: team_season_stats, unique: ["team_season_id"] },
  },
  { collection_name: "coach", options: { proto: coach, unique: ["coach_id"], indices: [] } },
  {
    collection_name: "coach_team_season",
    options: {
      proto: coach_team_season,
      unique: ["coach_team_season_id"],
      indices: ["coach_id", "team_season_id", "season"],
    },
  },
  { collection_name: "player", options: { proto: player, unique: ["player_id"], indices: [] } },
  {
    collection_name: "player_team_season",
    options: {
      proto: player_team_season,
      unique: ["player_team_season_id"],
      indices: ["player_id", "team_season_id", "season"],
    },
  },
  {
    collection_name: "player_team_season_stats",
    options: { proto: player_team_season_stats, unique: ["player_team_season_id"], indices: [] },
  },
  {
    collection_name: "recruit_team_season",
    options: {
      proto: recruit_team_season,
      unique: ["recruit_team_season_id"],
      indices: ["player_team_season_id", "team_season_id"],
    },
  },
  {
    collection_name: "conference",
    options: { proto: conference, unique: ["conference_id"], indices: [] },
  },
  {
    collection_name: "conference_season",
    options: {
      proto: conference_season,
      unique: ["conference_season_id"],
      indices: ["conference_id", "season"],
    },
  },
  {
    collection_name: "phase",
    options: { proto: phase, unique: ["phase_id"], indices: ["season"] },
  },
  { collection_name: "week", options: { proto: week, unique: ["week_id"], indices: ["season"] } },
  {
    collection_name: "team_game",
    options: {
      proto: team_game,
      unique: ["team_game_id"],
      indices: ["game_id", "team_season_id", "week_id"],
    },
  },
  {
    collection_name: "player_team_game",
    options: {
      proto: player_team_game,
      unique: ["player_team_game_id"],
      indices: ["team_game_id", "player_team_season_id"],
    },
  },
  { collection_name: "game", options: { proto: game, unique: ["game_id"], indices: ["week_id"] } },
  {
    collection_name: "award",
    options: {
      proto: award,
      unique: ["award_id"],
      indices: ["player_team_season_id", "week_id", "season"],
    },
  },
  {
    collection_name: "headline",
    options: { proto: headline, unique: ["headline_id"], indices: ["week_id"] },
  },
];

const initialize_driver_db = async (ddb) => {
  driver_collection_list.forEach(function (col_obj) {
    ddb[col_obj.collection_name] =
      ddb.getCollection(col_obj.collection_name) ||
      ddb.addCollection(col_obj.collection_name, col_obj.options);
  });

  await populate_driver(ddb);
  await ddb.saveDatabaseAsync();
};

const driver_db = async () => {
  console.log("Fetching window ddb", {
    "window.ddb": window.ddb,
  });

  if (window.ddb) {
    return window.ddb;
  }

  var dbname = "driver";
  let cloneMethod = "shallow-assign";

  let idbAdapter = new LokiIndexedAdapter("driver");
  // var paAdapter = new loki.LokiPartitioningAdapter(idbAdapter, { paging: true});

  let ddb = new loki(dbname, {
    verbose: true,
    env: "BROWSER",
    autosave: true,
    adapter: idbAdapter,
    persistenceAdapter: idbAdapter,
    persistenceMethod: "adapter",
    clone: true,
    cloneMethod: cloneMethod,
  });

  await ddb.loadDatabaseAsync({});
  await initialize_driver_db(ddb);

  window.ddb = ddb;
  return ddb;
};

const populate_driver = async (ddb) => {
  console.log("populate_driver", {
    ddb: ddb,
  });

  const first_name_count = ddb.first_names.count();
  const last_name_count = ddb.last_names.count();
  const city_count = ddb.cities.count();

  if (first_name_count == 0 || last_name_count == 0) {
    await populate_names(ddb);
  }

  if (city_count == 0) {
    await populate_cities(ddb);
  }
};

const page_index_action = async (common) => {
  const ddb = await common.ddb;

  $(".idb-export").on("click", async function () {
    console.log("idb export click", $(this).attr("id"));
    var db_name = $(this).attr("id");

    const db = await new Dexie(db_name);

    await db.version(20).stores({
      league_season: "season",
      team: "team_id",
      team_season: "team_season_id, team_id, season",
      team_season_stats: "team_season_id, team_id, season",
      coach: "coach_id",
      coach_team_season: "coach_team_season_id, coach_id, team_season_id, season",
      player: "player_id",
      player_team_season: "player_team_season_id, player_id, team_season_id, season",
      player_team_season_stats: "player_team_season_id",
      recruit_team_season: "recruit_team_season_id, player_team_season_id, team_season_id",
      conference: "conference_id",
      conference_season: "conference_season_id, conference_id, season, [conference_id+season]",
      phase: "phase_id, season",
      week: "week_id, season, [phase_id+season]",
      team_game: "team_game_id, game_id, team_season_id, week_id",
      player_team_game: "player_team_game_id, team_game_id, player_team_season_id",
      game: "game_id, week_id",
      award: "award_id, player_team_season_id, week_id, season",
      headline: "headline_id, week_id",
      world: "",
    });

    console.log("db", db);

    db.open()
      .then(function () {
        const idbDatabase = db.backendDB(); // get native IDBDatabase object from Dexie wrapper

        // export to JSON, clear database, and import from JSON
        exportToJsonString(idbDatabase, function (err, jsonString) {
          if (err) {
            console.error(err);
          } else {
            console.log("Exported as JSON: " + jsonString);
            download(`${db_name}.json`, jsonString);
          }
        });
      })
      .catch(function (e) {
        console.error("Could not connect. " + e);
      });
  });

  $("#truncate-world-row").on("click", async function () {

    var database_refs = await get_databases_references();
    var db = undefined;
    $.each(database_refs, async function (ind, db_obj) {
      console.log("db", db, db_obj);
      await Dexie.delete(db_obj.database_name);
    });

    const driver_worlds = await ddb.world.toArray();
    const world_ids = driver_worlds.map((world) => world.world_id);
    await ddb.world.bulkDelete(world_ids);

    location.reload();
    return false;
  });

  $("#import-world-row").on("click", async function () {
    $("#file-input-button").click();
  });

  $("#file-input-button").on("change", async function (event) {
    console.log({
      event_target: event.target,
      event: event,
      files: event.target.files,
    });

    const curFiles = event.target.files;
    console.log({ curFiles: curFiles, t: $(event.target).first() });
    for (const file of curFiles) {
      let url = URL.createObjectURL(file);

      var json_response = await fetch(url);
      let json_text = await json_response.text();
      let world_obj = JSON.parse(json_text);

      const new_db = await create_new_db();
      const db = await new_db["db"];
      const ddb = await common.ddb;

      for (let [table, rows] of Object.entries(world_obj)) {
        rows.forEach((r) => (r.world_id = new_db.new_season_info.world_id));
        await db[table].bulkPut(rows);
      }

      let world = await ddb.world
        .filter((w) => w.database_name == new_db.new_season_info.database_name)
        .first();

      const user_team = await db.team.filter((t) => t.is_user_team).first();

      //TODO - test this with world with multiple years
      //  I *THINK* this will sort by pk, being team_season_id, which is what I want. Need to confirm that.
      const user_team_season = await db.team_season
        .where({
          team_id: user_team.team_id,
        })
        .last();

      world.user_team.team_name = user_team.team_name;
      world.user_team.school_name = user_team.school_name;
      world.user_team.team_logo_url = user_team.team_logo;
      world.user_team.team_record = user_team_season.record_display;
      world.user_team.team_id = user_team.team_id;

      await ddb.world.put(world);
      location.reload();
    }
  });

  //Create new db if clicked 'continue'
  $(".create-world-play-button").on("click", async function () {
    let database_suffix = $(this).attr("database-suffix");
    console.log({ this: $(this), database_suffix: database_suffix });
    await common.new_world_action(common, database_suffix);
  });
};

const page_index = async (common) => {
  nunjucks.configure({ autoescape: true });
  const nunjucks_env = await get_nunjucks_env();

  await common.ddb;

  await prune_orphaned_databases();
  const db_list = await get_databases_references();

  let progress_table_rows = [
    {
      stage: "Creating new world",
      stage_row_id: "create-world-table-new-world",
    },
    { stage: "Create teams", stage_row_id: "create-world-table-create-teams" },
    {
      stage: "Creating coaches",
      stage_row_id: "create-world-table-create-coaches",
    },
    {
      stage: "Add coaches to teams",
      stage_row_id: "create-world-table-assign-coaches",
    },
    {
      stage: "Creating players",
      stage_row_id: "create-world-table-create-players",
    },
    {
      stage: "Generate player ratings",
      stage_row_id: "create-world-table-player-ratings",
    },
    {
      stage: "Add players to teams",
      stage_row_id: "create-world-table-assign-players",
    },
    {
      stage: "Populate depth charts",
      stage_row_id: "create-world-table-depth-charts",
    },
    {
      stage: "Evaluate team talent",
      stage_row_id: "create-world-table-team-talent",
    },
    {
      stage: "Creating recruits",
      stage_row_id: "create-world-table-recruiting-class",
    },
    { stage: "Creating rankings", stage_row_id: "create-world-table-rankings" },
    {
      stage: "Creating schedule",
      stage_row_id: "create-world-table-create-schedule",
    },
  ];

  var render_content = {
    world_list: db_list,
    world_options: world_options,
    progress_table_rows: progress_table_rows,
    page: {
      PrimaryColor: "1763B2",
      SecondaryColor: "333333",
    },
  };

  console.log("render_content", render_content);

  var url = "/static/html_templates/index/index/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await page_index_action(common);
};

const nav_bar_links = async (params) => {
  const path = params.path;
  const group_name = params.group_name;
  const db = params.db;

  const league_seasons = db.league_season.find();
  const current_league_season = league_seasons.find((ls) => ls.is_current_season);
  console.log({
    db: db,
    league_seasons: league_seasons,
    current_league_season: current_league_season,
  });
  const season = current_league_season.season;
  const world_id = current_league_season.world_id;

  let phases = db.phase.find({ season: season });
  let weeks = db.week.find({ season: season });
  let user_team = db.team.findOne({ team_id: current_league_season.user_team_id });

  const phases_by_phase_id = index_group_sync$1(phases, "index", "phase_id");

  const current_week = weeks.filter((week) => week.is_current)[0];
  console.log({
    weeks: weeks,
    current_week: current_week,
    season: season,
    phases_by_phase_id: phases_by_phase_id,
  });
  current_week.phase = phases_by_phase_id[current_week.phase_id];
  current_week.league_season = current_league_season;

  const team_id = user_team.team_id;
  const user_team_logo = user_team.team_logo;

  var can_sim = true,
    save_ls = true;

  var user_actions = [];

  var sim_action_week = {
    LinkDisplay: "Sim This Week",
    id: "SimThisWeek",
    Href: "#",
    ClassName: "sim-action",
  };
  var sim_action_phase = {
    LinkDisplay: "Sim This Phase",
    id: "SimThisPhase",
    Href: "#",
    ClassName: "sim-action",
  };

  if (current_week != null) {
    if (current_week.phase.phase_name == "Pre-Season") {
      can_sim = true;
      save_ls = true;

      //Check for user team needing to cut players
      if (!current_league_season.preseason_tasks.user_cut_players) {
        if (user_team.player_count > current_league_season.players_per_team) {
          user_actions.push({
            LinkDisplay: "Cut Players",
            Href: `/World/${world_id}/Team/${team_id}/Roster`,
            ClassName: "",
          });
          can_sim = false;
        } else {
          current_league_season.preseason_tasks.user_cut_players = true;
          save_ls = true;
        }
      }

      //Check for user team needing captains
      if (user_team.captain_count < current_league_season.captains_per_team) {
        user_actions.push({
          LinkDisplay: "Set Captains",
          Href: `/World/${world_id}/Team/${team_id}/Roster`,
          ClassName: "",
        });
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!current_league_season.preseason_tasks.user_set_gameplan) {
        user_actions.push({
          LinkDisplay: "Set Gameplan",
          Href: `/World/${world_id}/Team/${team_id}/Gameplan`,
          ClassName: "",
        });
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!current_league_season.preseason_tasks.user_set_depth_chart) {
        user_actions.push({
          LinkDisplay: "Set Depth Chart",
          Href: `/World/${world_id}/Team/${team_id}/DepthChart`,
          ClassName: "",
        });
        can_sim = false;
      }

      can_sim = true; //TODO - change back!
      if (!can_sim) {
        sim_action_week.ClassName += " w3-disabled";
        sim_action_phase.ClassName += " w3-disabled";
      }

      if (save_ls) {
        db.league_season.update(current_league_season);
      }
    } else if (current_week.phase.phase_name == "Season Recap") {
      user_actions.push({
        LinkDisplay: "View Season Awards",
        Href: `/World/${world_id}/Awards`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Coach Carousel") {
      user_actions.push({
        LinkDisplay: "View Coach Carousel",
        Href: `/World/${world_id}/CoachCarousel`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Draft Departures") {
      user_actions.push({
        LinkDisplay: "View Player Departures",
        Href: `/World/${world_id}/PlayerDepartures`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "National Signing Day") {
      user_actions.push({
        LinkDisplay: "View Recruiting Board",
        Href: `/World/${world_id}/Recruiting`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Prepare for Summer Camps") {
      user_actions.push({
        LinkDisplay: "Set Player Development",
        Href: `/World/${world_id}/PlayerDevelopment`,
        ClassName: "",
      });
    }

    sim_action_phase.LinkDisplay = "Sim to end of " + current_week.phase.phase_name;
    user_actions.unshift(sim_action_phase);

    if (current_week.user_recruiting_points_left_this_week > 0) {
      user_actions.push({
        LinkDisplay: `Weekly Recruiting ${current_week.user_recruiting_points_left_this_week}`,
        Href: `/World/${world_id}/Recruiting`,
        ClassName: "",
      });
    }

    if (!current_week.last_week_in_phase) {
      user_actions.unshift(sim_action_week);
    }

    const week_updates = current_week.week_updates;
    if (week_updates.length > 0) {
      user_actions.push({
        LinkDisplay: `Updates this week ${week_updates.length}`,
        id: "WeekUpdates",
        Href: "#",
        ClassName: "week-updates",
      });
    }
  }

  can_sim = true; //TODO - Change back!!
  const LinkGroups = [
    {
      GroupName: "Action",
      GroupDisplay: `${current_week.week_name}, ${season}`,
      GroupLinks: user_actions,
    },
    {
      GroupName: "World",
      GroupDisplay: '<img src="/static/img/team_logos/ncaa-text.png" class="" alt="">',
      GroupLinks: [
        {
          LinkDisplay: "Overview",
          id: "",
          Href: `/World/${world_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Standings",
          id: "",
          Href: `/World/${world_id}/Standings`,
          ClassName: "",
        },
        {
          LinkDisplay: "Rankings",
          id: "",
          Href: `/World/${world_id}/Rankings`,
          ClassName: "",
        },
        {
          LinkDisplay: "Schedule",
          id: "",
          Href: `/World/${world_id}/Schedule`,
          ClassName: "",
        },
        {
          LinkDisplay: "Headline",
          id: "",
          Href: `/World/${world_id}/Headlines`,
          ClassName: "",
        },
        {
          LinkDisplay: "Recruiting",
          id: "",
          Href: `/World/${world_id}/Recruiting`,
          ClassName: "",
        },
        {
          LinkDisplay: "Awards & Races",
          id: "",
          Href: `/World/${world_id}/Awards`,
          ClassName: "",
        },
      ],
    },
    {
      GroupName: "Team",
      GroupDisplay: `<img src="${user_team_logo}" class="" alt="">`,
      GroupLinks: [
        {
          LinkDisplay: "Overview",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Schedule",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Schedule`,
          ClassName: "",
        },
        {
          LinkDisplay: "Roster",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Roster`,
          ClassName: "",
        },
        {
          LinkDisplay: "Depth Chart",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/DepthChart`,
          ClassName: "",
        },
        {
          LinkDisplay: "Gameplan",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Gameplan`,
          ClassName: "",
        },
        {
          LinkDisplay: "Coaches",
          id: "",
          Href: `/World/${world_id}/Coaches/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Development",
          id: "",
          Href: `/World/${world_id}/PlayerDevelopment/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "History",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/History`,
          ClassName: "",
        },
      ],
    },
    {
      GroupName: "Almanac",
      GroupDisplay: "Almanac",
      GroupLinks: [
        {
          LinkDisplay: "History",
          id: "",
          Href: `/World/${world_id}/History`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Stats",
          id: "",
          Href: `/World/${world_id}/PlayerStats/Season/${season}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Records",
          id: "",
          Href: `/World/${world_id}/PlayerRecords`,
          ClassName: "",
        },
        {
          LinkDisplay: "Team Stats",
          id: "",
          Href: `/World/${world_id}/TeamStats/Season/${season}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Team Records",
          id: "",
          Href: `/World/${world_id}/TeamRecords`,
          ClassName: "",
        },
        {
          LinkDisplay: "Hall of Fame",
          id: "",
          Href: `/World/${world_id}/HallOfFame`,
          ClassName: "",
        },
        {
          LinkDisplay: "Amazing Stats",
          id: "",
          Href: `/World/${world_id}/AmazingStats`,
          ClassName: "",
        },
        {
          LinkDisplay: "Coach Stats",
          id: "",
          Href: `/World/${world_id}/Coaches`,
          ClassName: "",
        },
        {
          LinkDisplay: "Shortlists",
          id: "",
          Href: `/World/${world_id}/Shortlists`,
          ClassName: "",
        },
        {
          LinkDisplay: "Search",
          id: "nav-search",
          Href: "#",
          ClassName: "w3-input",
          world_id: world_id,
        },
      ],
    },
    {
      GroupName: "Game",
      GroupDisplay: "Game",
      GroupLinks: [
        { LinkDisplay: "Home Page", id: "", Href: "/", ClassName: "" },
        { LinkDisplay: "Admin", id: "", Href: "/admin", ClassName: "" },
        { LinkDisplay: "Audit", id: "", Href: "/audit", ClassName: "" },
        { LinkDisplay: "Credits", id: "", Href: "/Credits", ClassName: "" },
        {
          LinkDisplay: "Acheivements",
          id: "",
          Href: "/Acheivements",
          ClassName: "",
        },
      ],
    },
  ];

  $.each(LinkGroups, function (ind, Group) {
    $.each(Group.GroupLinks, function (ind, Link) {
      if (Link["LinkDisplay"] == path && Group["GroupName"] == group_name) {
        Link["ClassName"] = "Selected";
      }
    });
  });

  can_sim = true; //TODO - Change back!!
  var SimActionStatus = { CanSim: can_sim, LinkGroups: [] };
  SimActionStatus["LinkGroups"] = LinkGroups;
  return SimActionStatus;
};

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const distance_between_cities = (city_a, city_b, distance_tracking_map = {}) => {
  let city_a_str = `${Math.round(city_a.lat, 1)},${Math.round(city_a.long, 1)}`;
  let city_b_str = `${Math.round(city_b.lat, 1)},${Math.round(city_b.long, 1)}`;
  let city_arr = [city_a_str, city_b_str].sort();

  // Serialize the locations and short-circuit if we've already calculated the disance.
  if (distance_tracking_map[city_arr[0]] && distance_tracking_map[city_arr[0]][city_arr[1]]) {
    return distance_tracking_map[city_arr[0]][city_arr[1]];
  }

  var earth_radius = 6371; // Radius of the earth in km
  var dLat = deg2rad(city_a.lat - city_b.lat); // deg2rad below
  var dLon = deg2rad(city_a.long - city_b.long);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(city_a.lat)) *
      Math.cos(deg2rad(city_b.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = earth_radius * c; // Distance in km
  d = d / 1.609344;

  if (!distance_tracking_map[city_arr[0]]) {
    distance_tracking_map[city_arr[0]] = {};
  }
  distance_tracking_map[city_arr[0]][city_arr[1]] = d;

  if (!distance_tracking_map[city_arr[1]]) {
    distance_tracking_map[city_arr[1]] = {};
  }
  distance_tracking_map[city_arr[1]][city_arr[0]] = d;

  return d;
};

const distance_between_coordinates = (coord_a, coord_b) => {
  var earth_radius = 6371; // Radius of the earth in km
  var dLat = deg2rad(coord_a[0] - coord_b[0]); // deg2rad below
  var dLon = deg2rad(coord_a[1] - coord_b[1]);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord_a[0])) *
      Math.cos(deg2rad(coord_b[0])) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = earth_radius * c; // Distance in km
  d = d / 1.609344;
  return d;
};

const initialize_new_season = async (this_week, common) => {
  const db = common.db;
  const current_season = this_week.season;
  var current_league_season = await db.league_season.get({ season: current_season });

  const new_season = current_season + 1;

  stopwatch(common, "Init New Season - Starting");

  await db.team_season.where({ season: new_season }).delete();
  await db.league_season.where({ season: new_season }).delete();
  await db.conference_season.where({ season: new_season }).delete();
  await db.player_team_season.where({ season: new_season }).delete();
  await db.league_season.delete(new_season);
  await db.phase.where({ season: new_season }).delete();
  await db.week.where({ season: new_season }).delete();
  await db.team_season.where({ season: new_season }).delete();
  await db.player_team_season.where({ season: new_season }).delete();
  // await db.recruit_team_season.where({season: new_season}).delete();

  stopwatch(common, "Init New Season - Deleted existing data");

  common.season = new_season;
  const world_id = common.world_id;

  const teams = await db.team.where("team_id").above(0).toArray();

  const num_teams = teams.length;

  const new_season_data = {
    season: new_season,
    world_id: world_id,
    captains_per_team: 3,
    players_per_team: 75,
    num_teams: num_teams,
    league_style: "traditional", // traditional, regional
  };
  const new_season_obj = new league_season(new_season_data, current_league_season);

  stopwatch(common, "Init New Season - New season info");

  console.log({ new_season_obj: new_season_obj });
  await db.league_season.insert(new_season_obj);
  // current_league_season.is_current_season = false;
  // await db.league_season.put(current_league_season);

  const phases_created = await create_phase(new_season, common);
  await create_week(phases_created, common, world_id, new_season);

  stopwatch(common, "Init New Season - Created phases & weeks");

  var conferences = db.conference.find();
  await common.create_conference_seasons({
    common: common,
    conferences: conferences,
    season: new_season,
    world_id: world_id,
  });
  var conference_seasons = index_group_sync$1(
    await db.conference_season.where({ season: new_season }).toArray(),
    "index",
    "conference_id"
  );

  conferences = nest_children$1(
    conferences,
    conference_seasons,
    "conference_id",
    "conference_season"
  );
  var conference_by_conference_name = index_group_sync$1(conferences, "index", "conference_name");

  await create_team_season({
    common: common,
    season: new_season,
    world_id: world_id,
    conferences_by_conference_name: conference_by_conference_name,
  });

  stopwatch(common, "Init New Season - Created conferences");

  const all_weeks = db.week.find({ season: new_season });
  const next_week = all_weeks[0];

  next_week.phase = db.phase.findOne({ phase_id: this_week.phase_id });
  next_week.phase.season = new_season;

  console.log("this_week", next_week, all_weeks, common);

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(
    db.team.find({ team_id: { $gt: 0 } }),
    "index",
    "team_id"
  );

  stopwatch(common, "Init New Season - Fetched TSs");

  let [players, previous_team_seasons, previous_player_team_seasons] = await Promise.all([
    db.player.find(),
    db.team_season.find({ season: current_season, team_id: { $gt: 0 } }),
    db.player_team_season.find({ season: current_season }),
  ]);
  previous_team_seasons = nest_children$1(previous_team_seasons, teams_by_team_id, "team_id", "team");
  let previous_team_seasons_by_team_season_id = index_group_sync$1(
    previous_team_seasons,
    "index",
    "team_season_id"
  );

  let previous_player_team_season_ids = previous_player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  const previous_player_team_season_stats = await db.player_team_season_stats
    .where("player_team_season_id")
    .anyOf(previous_player_team_season_ids)
    .toArray();

  let previous_player_team_season_stats_by_player_team_season_id = index_group_sync$1(
    previous_player_team_season_stats,
    "index",
    "player_team_season_id"
  );
  previous_player_team_seasons = nest_children$1(
    previous_player_team_seasons,
    previous_player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  previous_player_team_seasons = nest_children$1(
    previous_player_team_seasons,
    previous_team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  const previous_player_team_seasons_by_player_id = index_group_sync$1(
    previous_player_team_seasons,
    "index",
    "player_id"
  );
  players = nest_children$1(
    players,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  players = players.filter((p) => p.previous_player_team_season != undefined);

  stopwatch(common, "Init New Season - Fetched Players");

  await advance_player_team_seasons({
    common: common,
    players: players,
    previous_team_seasons: previous_team_seasons,
    team_seasons: team_seasons,
    world_id: world_id,
    season: new_season,
  });

  stopwatch(common, "Init New Season - Created PTSs");

  await assign_player_jersey_numbers(common, new_season);

  stopwatch(common, "Init New Season - Assigned Jersey Numbers");

  await create_new_players_and_player_team_seasons(common, world_id, new_season, team_seasons, [
    "HS SR",
  ]);

  stopwatch(common, "Init New Season - Created New High Schoolers");

  await generate_player_ratings(common, world_id, new_season);

  stopwatch(common, "Init New Season - Updated PTS ratings");

  let coaches = db.coach.find(); //TODO - I'll regret this once players graduate & start fresh

  let previous_coach_team_seasons = db.coach_team_season.find({ season: current_season });
  previous_coach_team_seasons.map(
    (cts) => cts.coach_team_season_id
  );

  previous_coach_team_seasons = nest_children$1(
    previous_coach_team_seasons,
    previous_team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  const previous_coach_team_seasons_by_player_id = index_group_sync$1(
    previous_coach_team_seasons,
    "index",
    "coach_id"
  );
  coaches = nest_children$1(
    coaches,
    previous_coach_team_seasons_by_player_id,
    "coach_id",
    "previous_coach_team_season"
  );
  coaches = coaches.filter(
    (c) =>
      c.previous_coach_team_season != undefined && c.previous_coach_team_season.team_season_id > 0
  );

  await create_new_coach_team_seasons({
    common: common,
    coaches: coaches,
    previous_team_seasons: previous_team_seasons,
    team_seasons: team_seasons,
    world_id: world_id,
    season: new_season,
  });

  stopwatch(common, "Init New Season - Created coaches");

  await populate_all_depth_charts(common);

  stopwatch(common, "Init New Season - Created Depth Charts");

  await calculate_team_overalls(common);
  await calculate_national_rankings(next_week, all_weeks, common);
  await calculate_conference_rankings(next_week, all_weeks, common);
  await calculate_primetime_games(next_week, all_weeks, common);
  await calculate_team_needs(common);
  await choose_preseason_all_americans(common);

  stopwatch(common, "Init New Season - Created other info");

  await create_schedule({
    common: common,
    season: new_season,
    world_id: world_id,
  });

  stopwatch(common, "Init New Season - Created Schedule - DONE");
};

const create_team_season = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = common.season;

  db.league_season.findOne({ season: season });

  let teams = db.team.find();
  let previous_team_seasons = db.team_season.find({ season: season - 1 });

  var team_seasons_tocreate = [];
  var team_season_stats_tocreate = [];

  let previous_team_seasons_by_team_id = index_group_sync$1(
    previous_team_seasons,
    "index",
    "team_id"
  );

  var last_team_season_id = db.team_season.nextId("team_season_id");
  $.each(teams, function (ind, team) {
    var team_season_id = last_team_season_id;
    if (team.team_id < 0) {
      if (team.team_id == -1) {
        team_season_id = -1;
      } else {
        team_season_id = -1 * season;
      }
      var new_team_season = new team_season({
        team_season_id: team_season_id,
        team_id: team.team_id,
        world_id: data.world_id,
        season: data.season,
        conference_name: null,
        conference_season_id: null,
        is_user_team: false,
      });

      team_seasons_tocreate.push(new_team_season);
    } else {
      let division_name = data.conferences_by_conference_name[
        team.conference.conference_name
      ].conference_season.divisions.find((d) => d.teams.includes(team.school_name)).division_name;

      let previous_team_season = previous_team_seasons_by_team_id[team.team_id] || {};

      let gameplan = team.starting_tendencies ||
        previous_team_season.gameplan || {
          offense: {
            playbook: "Spread",
            pass_tendency: 51,
            playcall_aggressiveness: 4,
            playclock_urgency: 4,
          },
          defense: {
            playbook: "4-3",
            blitz_tendency: 5,
            man_coverage_tendency: 5,
          },
        };

      var new_team_season = new team_season({
        team_season_id: team_season_id,
        team_id: team.team_id,
        world_id: data.world_id,
        season: data.season,
        conference_name: team.conference_name,
        conference_season_id:
          data.conferences_by_conference_name[team.conference.conference_name].conference_season
            .conference_season_id,
        division_name: division_name,
        is_user_team: team.is_user_team || false,
        gameplan: gameplan,
      });

      var new_team_season_stats = new team_season_stats(team_season_id);
      last_team_season_id += 1;

      team_seasons_tocreate.push(new_team_season);
      team_season_stats_tocreate.push(new_team_season_stats);
    }
  });

  console.log({
    team_seasons_tocreate: team_seasons_tocreate,
    team_season_stats_tocreate: team_season_stats_tocreate,
  });

  await Promise.all([
    db.team_season.insert(team_seasons_tocreate),
    db.team_season_stats.insert(team_season_stats_tocreate),
  ]);
};

const populate_all_depth_charts = async (common, team_season_ids) => {
  const db = common.db;
  const season = common.season;

  let adjacent_positions = {
    QB: ["RB", "S", "WR", "LB"],
    RB: ["FB", "WR", "LB"],
    FB: ["TE", "RB"],
    WR: ["TE", "RB", "CB"],
    TE: ["WR", "FB", "OT"],
    OT: ["IOL", "TE", "DL", "EDGE"],
    IOL: ["OT", "DL", "EDGE"],
    DL: ["EDGE", "LB", "IOL"],
    EDGE: ["DL", "LB"],
    LB: ["EDGE", "S"],
    CB: ["S", "LB", "WR"],
    S: ["CB", "LB", "RB", "TE"],
    K: ["P", "IOL", "CB", "S", "DL", "EDGE", "QB", "RB", "WR", "TE", "OT", "LB"],
    P: ["K", "IOL", "CB", "S", "DL", "EDGE", "QB", "RB", "WR", "TE", "OT", "LB"],
  };

  let position_minimum_count = {
    QB: 4,
    RB: 5,
    FB: 2,
    WR: 8,
    TE: 5,
    OT: 6,
    IOL: 6,
    DL: 6,
    EDGE: 6,
    LB: 6,
    CB: 6,
    S: 6,
    K: 2,
    P: 2,
  };

  let position_starter_count = {
    QB: 1,
    RB: 1,
    FB: 1,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 2,
    DL: 2,
    EDGE: 2,
    LB: 3,
    CB: 2,
    S: 2,
    K: 1,
    P: 1,
  };

  console.log({ team_season_ids });
  if (team_season_ids) {
    team_season_ids = new Set(team_season_ids);

    var team_seasons = db.team_season.find({
      season: season,
      team_season_id: { $in: team_season_ids },
    });
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");
    var player_team_seasons = db.player_team_season.find({
      season: season,
      team_season_id: { $in: team_season_ids },
    });
    var player_team_seasons_by_team_season_id = index_group_sync$1(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  } else {
    var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");
    var player_team_seasons = db.player_team_season.find({
      season: season,
      team_season_id: { $gt: 0 },
    });
    var player_team_seasons_by_team_season_id = index_group_sync$1(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  }

  console.log({
    season: season,
    db: db,
    player_team_seasons: player_team_seasons,
    team_seasons: team_seasons,
  });

  //TODO fix this shit
  var signed_recruit_team_seasons = []; //await db.recruit_team_season.filter(rts => rts.signed).toArray();
  var signed_recruits_player_team_season_ids = signed_recruit_team_seasons.map(
    (rts) => rts.player_team_season_id
  );
  var signed_recruits_player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: signed_recruits_player_team_season_ids },
  });

  var signed_recruit_team_seasons_by_player_team_season_id = index_group_sync$1(
    signed_recruit_team_seasons,
    "index",
    "player_team_season_id"
  );

  signed_recruits_player_team_seasons = nest_children$1(
    signed_recruits_player_team_seasons,
    signed_recruit_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "recruit_team_season"
  );

  signed_recruits_player_team_seasons = signed_recruits_player_team_seasons.map((pts) =>
    Object.assign(pts, {
      team_season_id: pts.recruit_team_season.team_season_id,
    })
  );

  var player_team_seasons_with_recruits = player_team_seasons.concat(
    signed_recruits_player_team_seasons
  );
  var player_team_seasons_with_recruits_by_team_season_id = index_group_sync$1(
    player_team_seasons_with_recruits,
    "group",
    "team_season_id"
  );

  var team_season = null;
  let player_team_seasons_to_update = [];

  for (var team_season_id in player_team_seasons_by_team_season_id) {
    let starter_player_team_season_ids = new Set();

    var player_team_season_list = player_team_seasons_by_team_season_id[team_season_id];
    team_season = team_seasons_by_team_season_id[team_season_id];

    var player_team_season_list_with_recruits =
      player_team_seasons_with_recruits_by_team_season_id[team_season_id];

    player_team_season_list = player_team_season_list.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );

    player_team_season_list_with_recruits = player_team_season_list_with_recruits.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );

    team_season.depth_chart = {};
    team_season.depth_chart_with_recruits = {};

    var position_player_team_season_obj = index_group_sync$1(
      player_team_season_list,
      "group",
      "position"
    );
    var position_player_team_season_with_recruits_obj = index_group_sync$1(
      player_team_season_list_with_recruits,
      "group",
      "position"
    );

    Object.keys(position_minimum_count).forEach(function (pos) {
      if (!(pos in position_player_team_season_obj)) {
        position_player_team_season_obj[pos] = [];
      }
      if (!(pos in position_player_team_season_with_recruits_obj)) {
        position_player_team_season_with_recruits_obj[pos] = [];
      }
    });

    //TODO what if this is empty
    for (var position in position_player_team_season_obj) {
      var position_player_team_season_list = position_player_team_season_obj[position];

      if (position_player_team_season_list.length < position_minimum_count[position]) {
        let potential_players_to_add = [];
        adjacent_positions[position].forEach(function (pos) {
          potential_players_to_add = potential_players_to_add.concat(
            position_player_team_season_obj[pos].slice(
              0,
              position_starter_count[pos] +
                position_minimum_count[position] -
                position_player_team_season_list.length +
                1
            )
          );
        });
        potential_players_to_add = potential_players_to_add.filter(
          (pts) => !starter_player_team_season_ids.has(pts.player_team_season_id)
        );

        position_player_team_season_list =
          position_player_team_season_list.concat(potential_players_to_add);
        position_player_team_season_list = position_player_team_season_list.slice(
          0,
          position_minimum_count[position]
        );
      }

      for (
        let ind = 0;
        ind < position_starter_count[position] && ind < position_player_team_season_list.length;
        ind++
      ) {
        starter_player_team_season_ids.add(
          position_player_team_season_list[ind].player_team_season_id
        );
      }

      position_player_team_season_list.forEach(
        (pts, ind) => (pts.depth_chart_rank = Math.min(pts.depth_chart_rank || 10000, ind + 1))
      );
      player_team_seasons_to_update = player_team_seasons_to_update.concat(
        position_player_team_season_list
      );
      team_season.depth_chart[position] = position_player_team_season_list.map(
        (pts) => pts.player_team_season_id
      );
    }

    for (var position in position_player_team_season_with_recruits_obj) {
      var position_player_team_season_list =
        position_player_team_season_with_recruits_obj[position];
      team_season.depth_chart_with_recruits[position] = position_player_team_season_list.map(
        (pts) => pts.player_team_season_id
      );
    }

    team_seasons_to_update.push(team_season);
  }

  await Promise.all([
    db.team_season.update(team_seasons_to_update),
    db.player_team_season.update(player_team_seasons_to_update),
  ]);
};

const create_conference_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  let conference_season_id = db.conference_season.nextId("conference_season_id");

  var conference_seasons_to_create = [];

  for (const conference of data.conferences) {
    conference_season_id = conference_season_id + 1;
    var new_conference_season = {
      world_id: world_id,
      conference_id: conference.conference_id,
      conference_season_id: conference_season_id,
      season: season,
      divisions: conference.divisions,
      conference_champion_team_season_id: null,
    };

    conference_seasons_to_create.push(new_conference_season);
  }

  console.log("conference_seasons_to_create", {
    conference_seasons_to_create: conference_seasons_to_create,
  });

  await db.conference_season.insert(conference_seasons_to_create);
};

const zip = (a, b) => {
  var zipped = a.map((elem, ind) => [elem, b[ind]]);
  return zipped.filter((zip_set) => zip_set[0] && zip_set[1]);
};

const create_schedule = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  var games_to_create = [],
    team_games_to_create = [],
    team_games_to_create_ids = [];
  var team_season_schedule_tracker = {};
  const games_per_team = 12;

  let cities = ddb.cities.find();
  console.log({ cities: cities });
  cities.forEach((c) => (c.city_state = c.city + ", " + c.state));
  let cities_by_city_state = index_group_sync$1(cities, "index", "city_state");
  console.log({ cities_by_city_state: cities_by_city_state });

  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  const team_seasons_by_team_id = index_group_sync$1(team_seasons, "index", "team_id");
  const team_rivalries_by_team_season_id = index_group_sync$1(
    team_seasons.map(function (ts) {
      return {
        team_season_id: ts.team_season_id,
        rivals: teams_by_team_id[ts.team_id].rivals,
      };
    }),
    "index",
    "team_season_id"
  );
  const conferences_by_conference_id = index_group_sync$1(
    db.conference.find(),
    "index",
    "conference_id"
  );
  const conference_seasons_by_conference_season_id = index_group_sync$1(
    db.conference_season.find({ season: season }),
    "index",
    "conference_season_id"
  );

  const phases = index_group_sync$1(db.phase.find({ season: season }), "index", "phase_id");
  var weeks = db.week.find({ season: season });
  $.each(weeks, function (ind, week) {
    week.phase = phases[week.phase_id];
  });
  weeks = weeks.filter((week) => week.phase.phase_name == "Regular Season");
  all_week_ids = new Set(weeks.map((w) => w.week_id));
  all_weeks_by_week_id = index_group_sync$1(weeks, "index", "week_id");

  const weeks_by_week_name = index_group_sync$1(weeks, "index", "week_name");

  let num_teams = team_seasons.length;
  let team_quadrant_cutoffs = [1, 2, 3, 4].map((num) => ({
    quadrant: num,
    max_national_rank: Math.floor((num * num_teams) / 4.0),
  }));
  if (num_teams >= 100) {
    team_quadrant_cutoffs = [
      { quadrant: 1, max_national_rank: 25 },
      { quadrant: 2, max_national_rank: 50 },
      { quadrant: 3, max_national_rank: 75 },
      { quadrant: 4, max_national_rank: num_teams },
    ];
  }

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) =>
      team_rivalries_by_team_season_id[ts_b.team_season_id].rivals.length -
      team_rivalries_by_team_season_id[ts_a.team_season_id].rivals.length
  );
  for (let team_season of team_seasons) {
    team_season_rivals = team_rivalries_by_team_season_id[team_season.team_season_id].rivals;
    for (let rival_obj of team_season_rivals) {
      rival_obj.preferred_week_id = undefined;
      if (rival_obj.preferred_week_number != null) {
        rival_obj.preferred_week_id =
          weeks_by_week_name["Week " + rival_obj.preferred_week_number].week_id;
      }

      console.log("rivals", {
        rival_obj: rival_obj,
        "rival_obj.preferred_week_id": rival_obj.preferred_week_id,
        "rival_obj.preferred_week_number": rival_obj.preferred_week_number,
        weeks_by_week_name: weeks_by_week_name,
      });

      rival_obj.opponent_team_season_id =
        team_seasons_by_team_id[rival_obj.opponent_team_id.toString()].team_season_id;
    }
    team_conference =
      conferences_by_conference_id[
        conference_seasons_by_conference_season_id[team_season.conference_season_id].conference_id
      ];

    console.log({
      team_quadrant_cutoffs: team_quadrant_cutoffs,
      "team_season.national_rank": team_season.national_rank,
    });

    team_season_schedule_tracker[team_season.team_season_id] = {
      conference: {
        games_to_schedule: team_conference.schedule_format.number_conference_games,
        games_scheduled: 0,
        home_games: 0,
        away_games: 0,
        net_home_games: 0,
      },
      non_conference: {
        games_to_schedule:
          (team_conference.schedule_format.number_games || games_per_team) -
          team_conference.schedule_format.number_conference_games,
        games_scheduled: 0,
        home_games: 0,
        away_games: 0,
        net_home_games: 0,
        max_ooc_travel_distance: team_conference.schedule_format.max_ooc_travel_distance || 1000000,
      },
      weeks_scheduled: new Set(),
      available_week_ids: new Set(all_week_ids),
      opponents_scheduled: new Set(),
      conference_season_id: team_season.conference_season_id,
      division_name: team_season.division_name,
      rivals: team_season_rivals,
      team: teams_by_team_id[team_season.team_id],
      city: cities_by_city_state[
        teams_by_team_id[team_season.team_id].location.city +
          ", " +
          teams_by_team_id[team_season.team_id].location.state
      ],
      team_quadrant: team_quadrant_cutoffs.find(
        (quadrant) => team_season.national_rank <= quadrant.max_national_rank
      ).quadrant,
    };

    if (
      !team_season_schedule_tracker[team_season.team_season_id].city ||
      !team_season_schedule_tracker[team_season.team_season_id].city.lat ||
      !team_season_schedule_tracker[team_season.team_season_id].city.long
    ) {
      console.log("BLANK CITY", {
        "team_season_schedule_tracker[team_season.team_season_id]":
          team_season_schedule_tracker[team_season.team_season_id],
      });
    }

    let games_per_quadrant = Math.ceil(
      team_season_schedule_tracker[team_season.team_season_id].non_conference.games_to_schedule /
        4.0
    );

    team_season_schedule_tracker[
      team_season.team_season_id
    ].non_conference.schedule_team_quadrants = {
      1: games_per_quadrant,
      2: games_per_quadrant,
      3: games_per_quadrant,
      4: games_per_quadrant,
    };

    console.log({
      team_season: team_season,
      team_season_schedule_tracker: team_season_schedule_tracker,
      team_quadrant_cutoffs: team_quadrant_cutoffs,
    });
  }

  var scheduling_teams = true;
  var team_season_id_list = [];
  var team_set_a = [],
    team_set_b = [],
    zipped_set = [],
    games_to_create_ids = [];

  var game_type = "";

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  team_seasons = index_group_sync$1(
    db.team_season.find({ season: season, team_id: { $gt: 0 } }),
    "index",
    "team_id"
  );
  team_seasons_by_conference_season_id = index_group_sync$1(
    db.team_season.find({ season: season, team_id: { $gt: 0 } }),
    "group",
    "conference_season_id"
  );

  var scheduling_dict = {
    team_season_schedule_tracker: team_season_schedule_tracker,
    all_week_ids: all_week_ids,
    all_weeks_by_week_id: all_weeks_by_week_id,
    world_id: world_id,
    season: season,
    next_team_game_id: next_team_game_id,
    next_game_id: next_game_id,
    team_games_to_create_ids: team_games_to_create_ids,
    team_games_to_create: team_games_to_create,
    games_to_create_ids: games_to_create_ids,
    games_to_create: games_to_create,
  };

  var attempt_counter = 0;
  //Schedule rival games
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);

    zipped_set = [];
    $.each(team_season_id_list, function (ind, team_season_id) {
      rival_list = team_season_schedule_tracker[team_season_id].rivals;
      $.each(rival_list, function (ind, rival_obj) {
        zipped_set.push([
          team_season_id,
          team_seasons_by_team_id[rival_obj.opponent_team_id.toString()].team_season_id.toString(),
          rival_obj,
        ]);
      });
    });

    console.log("zipped_set", zipped_set);
    zipped_set = zipped_set.sort(function (set_a, set_b) {
      if (set_a[2].preferred_week_id != undefined) {
        return -1;
      } else if (set_b[2].preferred_week_id != undefined) {
        return 1;
      }
      return 1;
    });

    $.each(zipped_set, function (ind, team_set) {
      //check if confernece, pass to next
      [team_a, team_b, rival_obj] = team_set;
      game_type = "non_conference";
      if (
        team_season_schedule_tracker[team_a].conference_season_id ==
        team_season_schedule_tracker[team_b].conference_season_id
      ) {
        game_type = "conference";
      }
      schedule_game(common, scheduling_dict, team_set, game_type, rival_obj);
    });

    scheduling_teams = false;
  }

  attempt_counter = 0;
  scheduling_teams = true;
  //Schedule conference games
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);
    team_season_id_list = new Set(
      team_season_id_list.filter(
        (team_id) => team_season_schedule_tracker[team_id].conference.games_to_schedule > 0
      )
    );

    $.each(team_seasons_by_conference_season_id, function (conference_season_id, team_seasons) {
      conference_team_season_id_list = team_seasons.map((ts) => ts.team_season_id.toString());
      conference_team_season_id_list = conference_team_season_id_list.filter((ts) =>
        team_season_id_list.has(ts)
      );
      conference_team_season_id_list = common.shuffle(conference_team_season_id_list);

      for (var team_id of conference_team_season_id_list) {
        team_season_schedule_tracker[team_id].first_available_week_id = Math.min(
          ...team_season_schedule_tracker[team_id].available_week_ids
        );
      }

      if (attempt_counter % 5 == 4) {
        //Just random shuffle
        conference_team_season_id_list = common.shuffle(conference_team_season_id_list);
      } else if (attempt_counter % 5 < 4) {
        //Sort by number of conference games needed
        conference_team_season_id_list = conference_team_season_id_list.sort(
          (team_a, team_b) =>
            team_season_schedule_tracker[team_a].conference.games_to_schedule -
              team_season_schedule_tracker[team_b].conference.games_to_schedule ||
            team_season_schedule_tracker[team_a].first_available_week_id -
              team_season_schedule_tracker[team_b].first_available_week_id ||
            Math.random() > 0.5
        );
      }

      const half = Math.floor(conference_team_season_id_list.length / 2);
      team_set_a = conference_team_season_id_list.splice(0, half);
      team_set_b = conference_team_season_id_list.splice(-half);
      team_set_b = team_set_b.reverse();
      // if (attempt_counter % 2 == 0){
      // 	team_set_b = team_set_b.reverse();
      // }

      zipped_set = zip(team_set_a, team_set_b);
      //console.log('zipped_set', zipped_set)
      $.each(zipped_set, function (ind, team_set) {
        schedule_game(common, scheduling_dict, team_set, "conference", null, attempt_counter);
      });
    });

    team_season_id_list = [...team_season_id_list].filter(
      (team_id) => team_season_schedule_tracker[team_id].conference.games_to_schedule > 0
    );

    scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 800;

    attempt_counter += 1;
    team_set_a = [];
    team_set_b = [];
  }

  $.each(team_season_schedule_tracker, function (team_id, team_obj) {
    if (team_obj.conference.games_to_schedule > 0) {
      console.log("Left over games", {
        "team_obj.conference.games_to_schedule": team_obj.conference.games_to_schedule,
        team_obj: team_obj,
      });
    }
    team_obj.non_conference.games_to_schedule += team_obj.conference.games_to_schedule;
  });

  let quadrant_pairings = [
    [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ],
    [
      [1, 3],
      [2, 4],
    ],
    [
      [1, 4],
      [2, 3],
    ],
    [
      [1, 2],
      [3, 4],
    ],
  ];
  let team_season_ids_by_quadrant = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  Object.entries(team_season_schedule_tracker).forEach(function ([team_season_id, tracker_obj]) {
    team_season_ids_by_quadrant[tracker_obj.team_quadrant].push(team_season_id);
    console.log({
      tracker_obj: tracker_obj,
      team_season_id: team_season_id,
      team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    });
  });

  console.log({
    team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    team_season_schedule_tracker: team_season_schedule_tracker,
  });

  //scheduling quadrants
  for (let quadrant_pairing of quadrant_pairings) {
    // team_season_id_list = Object.keys(team_season_schedule_tracker);
    // team_season_id_list = team_season_id_list.filter(
    //   (team_id) =>
    //     team_season_schedule_tracker[team_id].non_conference.games_to_schedule >
    //     0
    // );
    // var max_games_to_schedule =
    //   Math.max(
    //     ...team_season_id_list.map(
    //       (team_id) =>
    //         team_season_schedule_tracker[team_id].non_conference
    //           .games_to_schedule
    //     )
    //   ) - Math.floor(attempt_counter / 5);

    // max_games_to_schedule = Math.max(0, max_games_to_schedule);

    console.log({
      quadrant_pairing: quadrant_pairing,
      max_games_to_schedule: max_games_to_schedule,
      team_season_id_list: team_season_id_list,
    });

    for (let pair of quadrant_pairing) {
      for (let iter_ind = 0; iter_ind <= 100; iter_ind++) {
        let quadrant_a = pair[0];
        let quadrant_b = pair[1];
        console.log({
          pair: pair,
          quadrant_a: quadrant_a,
          quadrant_b: quadrant_b,
        });

        if (quadrant_a != quadrant_b) {
          var quadrant_a_teams = team_season_ids_by_quadrant[quadrant_a];
          var quadrant_b_teams = team_season_ids_by_quadrant[quadrant_b];

          quadrant_a_teams = quadrant_a_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference.schedule_team_quadrants[
                quadrant_b
              ] > 0 &&
              (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) ||
                iter_ind > 3)
          );
          quadrant_b_teams = quadrant_b_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference.schedule_team_quadrants[
                quadrant_a
              ] > 0 &&
              (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) ||
                iter_ind > 3)
          );

          quadrant_a_teams = common.shuffle(quadrant_a_teams);
          quadrant_b_teams = common.shuffle(quadrant_b_teams);
          console.log({
            quadrant_a_teams: quadrant_a_teams,
            quadrant_b_teams: quadrant_b_teams,
          });
        } else {
          let quadrant_all_teams = team_season_ids_by_quadrant[quadrant_a];
          quadrant_all_teams = common.shuffle(quadrant_all_teams);
          quadrant_all_teams = quadrant_all_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference.schedule_team_quadrants[
                quadrant_a
              ] > 0 //&& (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) || iter_ind > 3)
          );

          console.log({ quadrant_all_teams: quadrant_all_teams });
          var middle_index = Math.floor(quadrant_all_teams.length / 2);
          var quadrant_a_teams = quadrant_all_teams.slice(0, middle_index);
          var quadrant_b_teams = quadrant_all_teams.slice(middle_index);
        }

        console.log({
          quadrant_a_teams: quadrant_a_teams,
          quadrant_b_teams: quadrant_b_teams,
        });

        zipped_set = zip(quadrant_a_teams, quadrant_b_teams);
        console.log("zipped_set", zipped_set);

        $.each(zipped_set, function (ind, team_set) {
          schedule_game(common, scheduling_dict, team_set, "non_conference", null, iter_ind);
        });
      }
    }
  }

  scheduling_teams = true;
  attempt_counter = 1;
  //Scheduling non_conference
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);
    team_season_id_list = team_season_id_list.filter(
      (team_id) => team_season_schedule_tracker[team_id].non_conference.games_to_schedule > 0
    );
    var max_games_to_schedule =
      Math.max(
        ...team_season_id_list.map(
          (team_id) => team_season_schedule_tracker[team_id].non_conference.games_to_schedule
        )
      ) - Math.floor(attempt_counter / 5);

    max_games_to_schedule = Math.max(0, max_games_to_schedule);

    for (var team_id of team_season_id_list) {
      team_season_schedule_tracker[team_id].first_available_week_id = Math.min(
        ...team_season_schedule_tracker[team_id].available_week_ids
      );
    }

    //One out of ten times, or any attempt past #50, just go wild & full random
    if (attempt_counter % 10 == 9 || attempt_counter > 50) {
      team_season_id_list = common.shuffle(team_season_id_list);
      $.each(team_season_id_list, function (ind, obj) {
        if (ind % 2 == 0) {
          team_set_a.push(obj);
        } else {
          team_set_b.push(obj);
        }
      });
    } else if (attempt_counter % 10 >= 7) {
      // 3 out of 10 times, sort by # of opps needed, but flip second half. Sort of a non-perfect match scenario
      team_season_id_list = team_season_id_list.sort(function (team_id_a, team_id_b) {
        return (
          team_season_schedule_tracker[team_id_a].opponents_scheduled.size -
            team_season_schedule_tracker[team_id_b].opponents_scheduled.size || Math.random() - 0.5
        );
      });

      var middle_index = Math.floor(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);
      team_set_b = team_set_b.reverse();
    } else if (attempt_counter % 10 >= 5) {
      // 2 out of 10 times, sort by max week scheduled?
      team_season_id_list = team_season_id_list.sort(function (team_id_a, team_id_b) {
        return (
          Math.max(...team_season_schedule_tracker[team_id_a].weeks_scheduled) -
            Math.max(...team_season_schedule_tracker[team_id_b].weeks_scheduled) ||
          Math.random() - 0.5
        );
      });

      var middle_index = Math.floor(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);
      team_set_b = team_set_b.reverse();
    } else {
      for (var team_id of team_season_id_list) {
        team_season_schedule_tracker[team_id].opponent_avg_team_competitiveness =
          sum$1(
            [...team_season_schedule_tracker[team_id].opponents_scheduled].map(
              (team_id) =>
                team_season_schedule_tracker[team_id].team.team_ratings.team_competitiveness
            )
          ) / team_season_schedule_tracker[team_id].opponents_scheduled.size;
      }

      team_season_id_list = team_season_id_list.sort(function (team_id_a, team_id_b) {
        return (
          team_season_schedule_tracker[team_id_a].opponent_avg_team_competitiveness -
            team_season_schedule_tracker[team_id_b].opponent_avg_team_competitiveness ||
          Math.random() - 0.5
        );
      });

      var middle_index = Math.ceil(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);

      if (attempt_counter % 2 == 0) {
        team_set_b = team_set_b.reverse();
      }
    }

    console.log({ team_set_a: team_set_a, team_set_b: team_set_b });

    zipped_set = zip(team_set_a, team_set_b);
    console.log("zipped_set", zipped_set);
    $.each(zipped_set, function (ind, team_set) {
      if (
        team_season_schedule_tracker[team_set[0]].non_conference.games_to_schedule <
          max_games_to_schedule &&
        team_season_schedule_tracker[team_set[1]].non_conference.games_to_schedule <
          max_games_to_schedule
      ) {
        console.log("throwing out game", {
          team_set: team_set,
          "team_season_schedule_tracker[team_set[0]].non_conference.games_to_schedule":
            team_season_schedule_tracker[team_set[0]].non_conference.games_to_schedule,
          "team_season_schedule_tracker[team_set[1]].non_conference.games_to_schedule":
            team_season_schedule_tracker[team_set[1]].non_conference.games_to_schedule,
          max_games_to_schedule: max_games_to_schedule,
        });
        return true;
      }
      schedule_game(common, scheduling_dict, team_set, "non_conference", null);
    });

    team_season_id_list = Object.keys(team_season_schedule_tracker).filter(
      (team_id) => team_season_schedule_tracker[team_id].non_conference.games_to_schedule > 0
    );

    scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 500;

    attempt_counter += 1;
    team_set_a = [];
    team_set_b = [];
  }

  console.log({
    scheduling_dict: scheduling_dict,
    team_season_schedule_tracker: team_season_schedule_tracker,
    games_to_create: games_to_create,
    team_games_to_create: team_games_to_create,
  });

  for (var team_season_obj of Object.values(team_season_schedule_tracker)) {
    if (team_season_obj.non_conference.games_to_schedule > 0) {
      console.log("couldnt schedule", { team_season_obj: team_season_obj });
    }
  }

  team_seasons_to_update = Object.values(team_seasons);

  db.game.insert(games_to_create);
  db.team_game.insert(team_games_to_create);
};

const advance_player_team_seasons = async (data) => {
  console.log({ data: data });

  const common = data.common;
  const db = common.db;

  const team_seasons = data.team_seasons;
  data.players;

  const team_seasons_by_team_id = index_group_sync$1(team_seasons, "index", "team_id");
  index_group_sync$1(team_seasons, "index", "team_season_id");

  const previous_team_seasons_by_team_season_id = index_group_sync$1(
    data.previous_team_seasons,
    "index",
    "team_season_id"
  );

  var player_team_season_id_counter = db.player_team_season.nextId("player_team_season_id");
  var player_team_seasons_tocreate = [];
  var player_team_season_stats_tocreate = [];

  const next_class_map = {
    "HS JR": "HS SR",
    "HS SR": "FR",
    FR: "SO",
    SO: "JR",
    JR: "SR",
  };

  let position_minimum_count = {
    QB: 4,
    RB: 5,
    FB: 2,
    WR: 8,
    TE: 5,
    OT: 6,
    IOL: 6,
    DL: 6,
    EDGE: 6,
    LB: 6,
    CB: 6,
    S: 6,
    K: 2,
    P: 2,
    All: 100,
  };

  let team_season_position_count_map = {};
  team_seasons.forEach(function (ts) {
    team_season_position_count_map[ts.team_season_id] = deep_copy$1(position_minimum_count);
  });

  for (const player of data.players) {
    if (player.previous_player_team_season.class.class_name in next_class_map) {
      let previous_team_season_id = player.previous_player_team_season.team_season_id;

      let team_season_id = 0;
      if (previous_team_season_id > 0) {
        team_season_id =
          team_seasons_by_team_id[
            previous_team_seasons_by_team_season_id[previous_team_season_id].team_id
          ].team_season_id;
      }

      let next_class_name = next_class_map[player.previous_player_team_season.class.class_name];
      let redshirted = false;
      if (
        player.previous_player_team_season.season_stats &&
        (player.previous_player_team_season.season_stats.games.games_played || 0) <= 4 &&
        !player.previous_player_team_season.class.redshirted
      ) {
        redshirted = true;
        next_class_name = player.previous_player_team_season.class.class_name;
      }

      let new_pts = new player_team_season({
        player_id: player.player_id,
        player_team_season_id: player_team_season_id_counter,
        team_season_id: team_season_id,
        season: data.season,
        world_id: data.world_id,
        position: player.position,
        class: {
          class_name: next_class_name,
          redshirted: redshirted,
        },
        ratings: deep_copy$1(player.previous_player_team_season.ratings),
      });

      for (const rating_group_key in new_pts.ratings) {
        var rating_group = new_pts.ratings[rating_group_key];

        for (const rating_key in rating_group) {
          var rating_value = new_pts.ratings[rating_group_key][rating_key];

          let aged_in_rating_value = age_in_rating(rating_group_key, rating_key, rating_value);

          new_pts.ratings[rating_group_key][rating_key] = aged_in_rating_value;
        }
      }

      var new_player_team_season_stats = new player_team_season_stats(
        new_pts.player_team_season_id
      );

      if (team_season_id > 0) {
        team_season_position_count_map[team_season_id][player.position] -= 1;
        team_season_position_count_map[team_season_id]["All"] -= 1;
      }

      player_team_seasons_tocreate.push(new_pts);
      player_team_season_stats_tocreate.push(new_player_team_season_stats);
      player_team_season_id_counter += 1;
    }
  }

  let position_team_season_count_map = {};
  Object.keys(position_minimum_count).forEach(function (pos) {
    position_team_season_count_map[pos] = {};
    Object.entries(team_season_position_count_map).forEach(function (ts_map) {
      let team_season_id = ts_map[0];
      let position_need = ts_map[1][pos];
      if (position_need > 0) {
        position_team_season_count_map[pos][team_season_id] = position_need;
      }
      console.log({
        team_season_id: team_season_id,
        position_need: position_need,
        "position_team_season_count_map[pos][team_season_id]":
          position_team_season_count_map[pos][team_season_id],
      });
    });
  });

  console.log({
    position_team_season_count_map: position_team_season_count_map,
    team_season_position_count_map: team_season_position_count_map,
  });

  player_team_seasons_tocreate
    .filter((pts) => !pts.team_season_id)
    .forEach(function (pts) {
      let position = pts.position;
      let position_team_season_needs = position_team_season_count_map[position];
      let team_season_id = parseInt(weighted_random_choice(position_team_season_needs, 0));
      pts.team_season_id = team_season_id;

      position_team_season_count_map[position][team_season_id] -= 1;
      position_team_season_count_map["All"][team_season_id] -= 1;
      if (position_team_season_count_map[position][team_season_id] <= 0) {
        delete position_team_season_count_map[position][team_season_id];
      }
      if (position_team_season_count_map["All"][team_season_id] <= 0) {
        delete position_team_season_count_map["All"][team_season_id];
      }
    });

  player_team_seasons_tocreate
    .filter((pts) => !pts.team_season_id)
    .forEach(function (pts) {
      let position_team_season_needs = position_team_season_count_map["All"];
      let team_season_id = parseInt(weighted_random_choice(position_team_season_needs) || 0);
      pts.team_season_id = team_season_id;

      position_team_season_count_map["All"][team_season_id] -= 1;
      if (position_team_season_count_map["All"][team_season_id] <= 0) {
        delete position_team_season_count_map["All"][team_season_id];
      }
    });

  console.log("checking player_team_seasons_tocreate 1", {
    player_team_seasons_tocreate: player_team_seasons_tocreate,
    player_team_seasons_tocreate_f: player_team_seasons_tocreate.filter(
      (pts) => !pts.team_season_id
    ),
  });

  player_team_seasons_tocreate
    .filter((pts) => !pts.team_season_id)
    .forEach(function (pts) {
      pts.team_season_id = -1;
    });

  console.log({
    last_player_team_season: last_player_team_season,
    player_team_seasons_tocreate: player_team_seasons_tocreate,
    player_team_season_stats_tocreate: player_team_season_stats_tocreate,
  });

  await Promise.all([
    db.player_team_season.update(player_team_seasons_tocreate),
    db.player_team_season_stats.update(player_team_season_stats_tocreate),
  ]);
};

const create_new_coach_team_seasons = async (data) => {
  console.log({ data: data });

  const common = data.common;
  const db = common.db;

  const team_seasons = data.team_seasons;
  data.coaches;

  const team_seasons_by_team_id = index_group_sync$1(team_seasons, "index", "team_id");
  index_group_sync$1(team_seasons, "index", "team_season_id");

  const previous_team_seasons_by_team_season_id = index_group_sync$1(
    data.previous_team_seasons,
    "index",
    "team_season_id"
  );

  var coach_team_season_id_counter = db.coach_team_season.nextId("coach_team_season_id");
  var coach_team_seasons_tocreate = [];

  for (const coach of data.coaches) {
    var previous_team_season_id = coach.previous_coach_team_season.team_season_id;
    var team_season_id =
      team_seasons_by_team_id[
        previous_team_seasons_by_team_season_id[previous_team_season_id].team_id
      ].team_season_id;

    var init_data = {
      coach_id: coach.coach_id,
      coach_team_season_id: coach_team_season_id_counter,
      team_season_id: team_season_id,
      season: data.season,
      world_id: data.world_id,
      coaching_position: coach.previous_coach_team_season.coaching_position,
      age: coach.previous_coach_team_season.age + 1,
    };

    var new_cts = new coach_team_season(init_data);

    coach_team_seasons_tocreate.push(new_cts);
    coach_team_season_id_counter += 1;
  }

  await db.coach_team_season.update(
    coach_team_seasons_tocreate
  );
};

const age_in_rating = (rating_group, rating, value) => {
  let rating_change_probability = 0.1;

  if (rating_group == "athleticism") {
    rating_change_probability = 0.05;
  } else if (rating_group == "passing") {
    rating_change_probability = 0.7;
  } else if (rating_group == "rushing") {
    rating_change_probability = 0.2;
  } else if (rating_group == "receiving") {
    rating_change_probability = 0.3;
  } else if (rating_group == "defense") {
    rating_change_probability = 0.45;
  } else if (rating_group == "blocking") {
    rating_change_probability = 0.6;
  } else {
    rating_change_probability = 0.1;
  }

  var severe_rating_change_probability = rating_change_probability / 5;

  var rand = Math.random();
  if (rand < severe_rating_change_probability) {
    value += 8;
  } else if (rand < rating_change_probability) {
    value += 4;
  }

  if (value > 100) {
    return 100;
  }

  return round_decimal$1(value, 0);
};

const age_out_rating = (rating_group, rating, value, class_name) => {
  let class_age_out_map = {
    SR: 0,
    JR: 1,
    SO: 2,
    FR: 3,
    "HS SR": 4,
    "HS JR": 5,
  };
  var age_out_years = class_age_out_map[class_name];

  let rating_change_probability = 0.1;

  if (rating_group == "athleticism") {
    rating_change_probability = 0.05;
  } else if (rating_group == "passing") {
    rating_change_probability = 0.7;
  } else if (rating_group == "rushing") {
    rating_change_probability = 0.2;
  } else if (rating_group == "receiving") {
    rating_change_probability = 0.3;
  } else if (rating_group == "defense") {
    rating_change_probability = 0.45;
  } else if (rating_group == "blocking") {
    rating_change_probability = 0.6;
  } else {
    rating_change_probability = 0.1;
  }

  var severe_rating_change_probability = rating_change_probability / 5;

  for (var i = 0; i < age_out_years; i++) {
    var rand = Math.random();
    if (rand < severe_rating_change_probability) {
      value -= 8;
    } else if (rand < rating_change_probability) {
      value -= 4;
    }
  }

  if (value < 1) {
    return 1;
  }

  return round_decimal$1(value, 0);
};

const recruiting_pitch_value = (player_value, team_value) => {
  return Math.ceil((player_value ** 1.425 * (team_value - 4)) / 2.56);
};

const create_recruiting_class = async (common) => {
  console.log("In create recruiting_class", common);
  const db = common.db;
  common.season;
  const recruiting_team_season_id = -1 * common.season;

  stopwatch(common, "Stopwatch RTS - Starting creating recruiting class");

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });

  team_seasons.map((ts) => ts.team_season_id);

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");

  //const team_seasons_by_team_id = index_group_sync(team_seasons, 'index', 'team_id')
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  stopwatch(common, "Stopwatch RTS - Fetched all team info");

  var player_team_seasons = db.player_team_season.find({
    team_season_id: recruiting_team_season_id,
  });
  player_team_seasons.map((pts) => pts.player_team_season_id);
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync$1(players, "index", "player_id");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  stopwatch(common, "Stopwatch RTS - Fetched all player info");

  var position_star_weight_map = {
    QB: 0,
    RB: -1,
    FB: -10,
    WR: -1,
    TE: -4,
    OT: -1,
    IOL: -4,
    DL: 0,
    EDGE: 0,
    LB: -2,
    CB: -1,
    S: -5,
    K: -10,
    P: -10,
  };

  // TODO make the rankings fuzzy
  player_team_seasons = player_team_seasons.sort(
    (pts_a, pts_b) =>
      pts_b.ratings.overall.overall +
      position_star_weight_map[pts_b.position] -
      (pts_a.ratings.overall.overall + position_star_weight_map[pts_a.position])
  );

  stopwatch(common, "Stopwatch RTS - Sorted players");

  let recruit_team_season_id = db.recruit_team_season.nextId("recruit_team_season_id");

  stopwatch(common, "Stopwatch RTS - First RTS");

  var players_to_update = [];

  console.log({ player_team_seasons: player_team_seasons });

  var player_count = 1;
  var total_players = player_team_seasons.length;
  var player_star_map = [
    { stars: 5, percent: 0.01 },
    { stars: 4, percent: 0.1 },
    { stars: 3, percent: 0.3 },
    { stars: 2, percent: 0.45 },
    { stars: 1, percent: 0.14 },
  ];
  var player_interest_cutoffs = [[6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1]];

  var player_star_tracker = 0;
  for (const star_obj of player_star_map) {
    star_obj.players_in_bucket = Math.ceil(total_players * star_obj.percent);
    player_star_tracker += star_obj.players_in_bucket;
    star_obj.players_in_bucket_cumulative = player_star_tracker;
  }

  var position_rank_map = {};
  var state_rank_map = {};

  var recruit_team_seasons_to_add_by_team_season_id = {};
  for (const team_season of team_seasons) {
    recruit_team_seasons_to_add_by_team_season_id[team_season.team_season_id] = [];
  }

  console.log({
    team_seasons: team_seasons,
    position_needs: team_seasons.map((ts) => ts.recruiting.position_needs),
    player_team_seasons: player_team_seasons,
  });

  var player_call_tracker = {};

  let recruit_team_seasons_by_team_season_id = {};
  team_seasons.forEach((ts) => (recruit_team_seasons_by_team_season_id[ts.team_season_id] = []));

  stopwatch(common, "Stopwatch RTS - Prepped all vars");

  for (const player_team_season of player_team_seasons) {
    var player = players_by_player_id[player_team_season.player_id];
    console.log({
      player_team_season: player_team_season,
      player: player,
    });

    player_team_season.recruiting.stars = null;
    player_team_season.recruiting.stage = "Early";

    player_team_season.recruiting.player_interest_cutoff = deep_copy$1(
      player_interest_cutoffs[Math.floor(Math.random() * player_interest_cutoffs.length)]
    );
    player_call_tracker[player_team_season.player_team_season_id] =
      player_team_season.recruiting.player_interest_cutoff;

    var player_state = player.hometown.state;
    var player_position = player.position;

    if (!(player_state in state_rank_map)) {
      state_rank_map[player_state] = 0;
    }
    state_rank_map[player_state] += 1;

    if (!(player_position in position_rank_map)) {
      position_rank_map[player_position] = 0;
    }
    position_rank_map[player_position] += 1;

    player_team_season.recruiting.rank.national = player_count;
    player_team_season.recruiting.rank.position_rank = position_rank_map[player_position];
    player_team_season.recruiting.rank.state = state_rank_map[player_state];

    player_team_season.recruiting.stars = player_star_map.find(
      (star_obj) => player_count <= star_obj.players_in_bucket_cumulative
    ).stars;
    // for (const star_obj of player_star_map) {
    //   if (
    //     player_team_season.recruiting.stars == null &&
    //     player_count <= star_obj.players_in_bucket_cumulative
    //   ) {
    //     player_team_season.recruiting.stars = star_obj.stars;
    //   }
    // }

    for (const team_season of team_seasons) {
      // let close_to_home_rating = distance_from_home(
      //                               player.hometown,
      //                               team_season.team.location,
      //                               location_tracker_map
      //                             )
      let close_to_home_rating = 100; // TODO change back!!!

      recruit_team_season_id += 1;
      let rts = new recruit_team_season({
        recruit_team_season_id: recruit_team_season_id,
        team_season_id: team_season.team_season_id,
        player_team_season_id: player_team_season.player_team_season_id,
        // scouted_ratings: deep_copy(player_team_season.ratings),
        scouted_ratings: player_team_season.ratings,
        //, distance: distance_between_cities(player.hometown, team_season.team.location)
        match_rating: 0,
        match_ratings: {
          location: {
            topic: "location",
            team: team_season.team.team_ratings.location,
            team_known: false,
          },
          fan_support: {
            topic: "fan_support",
            team: team_season.team.team_ratings.fan_support,
            team_known: false,
          },
          academic_quality: {
            topic: "academic_quality",
            team: team_season.team.team_ratings.academic_quality,
            team_known: false,
          },
          facilities: {
            topic: "facilities",
            team: team_season.team.team_ratings.facilities,
            team_known: false,
          },
          program_history: {
            topic: "program_history",
            team: team_season.team.team_ratings.program_history,
            team_known: false,
          },
          team_competitiveness: {
            topic: "team_competitiveness",
            team: team_season.team.team_ratings.team_competitiveness,
            team_known: false,
          },
          brand: {
            topic: "brand",
            team: team_season.team.team_ratings.brand,
            team_known: false,
          },
          pro_pipeline: {
            topic: "pro_pipeline",
            team: team_season.team.team_ratings.pro_pipeline,
            team_known: false,
          },

          program_stability: {
            topic: "program_stability",
            team: 10,
            team_known: false,
          },
          playing_time: { topic: "playing_time", team: 10, team_known: false },
          close_to_home: {
            topic: "close_to_home",
            team: close_to_home_rating,
            team_known: false,
          },
        },
      });

      // console.log({
      //   team_season:team_season,
      //   rts:rts,
      //   player_team_season:player_team_season,
      //   'player_team_season.position': player_team_season.position,
      //   'team_season.recruiting.position_needs[player_team_season.position]':team_season.recruiting.position_needs[player_team_season.position],
      //   'rts.scouted_ratings.overall.overall': rts.scouted_ratings.overall.overall
      // })

      rts.match_ratings.playing_time.team = team_season.recruiting.position_needs[
        player_team_season.position
      ].find((ovr_obj) => ovr_obj.overall <= rts.scouted_ratings.overall.overall).playing_time_val;

      rts.team_top_level_interest =
        Math.ceil((rts.scouted_ratings.overall.overall - 60) / 5) +
        rts.match_ratings.playing_time.team +
        (rts.match_ratings.close_to_home.team * 4) / rts.match_ratings.brand.team;

      console.log({
        player_team_season: player_team_season,
        "player_team_season.recruiting.team_season_buckets":
          player_team_season.recruiting.team_season_buckets,
        "player_team_season.recruiting.team_season_buckets.dream":
          player_team_season.recruiting.team_season_buckets.dream,
      });
      // player_team_season.recruiting.team_season_buckets.dream.add(1);
      //TODO bring back
      recruit_team_seasons_by_team_season_id[team_season.team_season_id].push(rts);
    }

    player_count += 1;
  }

  stopwatch(common, `Stopwatch RTS - Processed ${players_to_update.length} players`);

  var team_season_calls_tracker = {};
  var team_seasons_call_order_prep = [];
  var team_seasons_call_order = [];

  for (const team_season_id in team_seasons_by_team_season_id) {
    var team_season = team_seasons_by_team_season_id[team_season_id];
    var prep_obj = {
      team_season_id: team_season_id,
      order_tracker: [],
      brand_odds: team_season.team.team_ratings.brand ** 3,
    };
    prep_obj.recruit_calls_remaining = Math.ceil(team_season.team.team_ratings.brand + 10);

    var players_to_call = recruit_team_seasons_by_team_season_id[team_season_id];
    players_to_call = players_to_call.sort(
      (rts_a, rts_b) => rts_b.team_top_level_interest - rts_a.team_top_level_interest
    );
    team_season_calls_tracker[team_season_id] = {
      called_players: [],
      players_to_call: players_to_call,
    };
    team_seasons_call_order_prep.push(prep_obj);
  }

  stopwatch(common, `Stopwatch RTS - Prepped ${team_seasons_call_order_prep.length} teams`);

  var teams_waiting_to_call = team_seasons_call_order_prep.filter(
    (t_o) => t_o.recruit_calls_remaining > 0
  ).length;
  var loop_count = 0;
  // PERFTODO P * (N**2)
  // Find a way to change weighted_random_choice for this
  // Remove filter statements
  while (teams_waiting_to_call > 0) {
    var team_list = team_seasons_call_order_prep
      .filter((t_o) => t_o.recruit_calls_remaining > 0)
      .map((t_o) => [t_o.team_season_id, t_o.brand_odds + t_o.recruit_calls_remaining]);
    var chosen_team_season_id = weighted_random_choice(team_list);
    var chosen_team_obj = team_seasons_call_order_prep.find(
      (t_o) => t_o.team_season_id == chosen_team_season_id
    );

    chosen_team_obj.order_tracker.push(loop_count);
    loop_count += 1;

    chosen_team_obj.recruit_calls_remaining -= 1;
    team_seasons_call_order.push(parseInt(chosen_team_season_id));

    teams_waiting_to_call = team_seasons_call_order_prep.filter(
      (t_o) => t_o.recruit_calls_remaining > 0
    ).length;
  }

  stopwatch(common, `Stopwatch RTS - Teams did first calls`);

  var player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  let recruit_team_seasons_to_save = [];

  for (const team_season_id of team_seasons_call_order) {
    let team_season_call_obj = team_season_calls_tracker[team_season_id];
    var team_season = team_seasons_by_team_season_id[team_season_id];

    let team_season_recruit_team_seasons_by_player_team_season_id = index_group_sync$1(
      recruit_team_seasons_by_team_season_id[team_season_id],
      "index",
      "player_team_season_id"
    );

    var player_called = null;
    while (player_called == null) {
      player_called = team_season_call_obj.players_to_call.shift();
      if (player_called == undefined) {
        break;
      }

      var player_called_player_team_season =
        player_team_seasons_by_player_team_season_id[player_called.player_team_season_id];
      var player_called_player_team_season_id =
        player_called_player_team_season.player_team_season_id;
      player_call_options = player_call_tracker[player_called_player_team_season_id];

      // console.log({
      //   player_called_player_team_season_id:
      //     player_called_player_team_season_id,
      //   player_called_player_team_season: player_called_player_team_season,
      //   player_called: player_called,
      //   player_call_options: player_call_options,
      // });

      if (player_call_options.length == 0) {
        player_called = null;
      } else {
        var call_time = player_call_tracker[player_called_player_team_season_id].shift();

        var sorted_call_topics = Object.values(player_called.match_ratings).sort(
          (mv_a, mv_b) => mv_b.team - mv_a.team
        );

        if (!(call_time > 0)) {
          console.log({
            sorted_call_topics: sorted_call_topics,
            call_time: call_time,
            player_call_tracker: player_call_tracker[player_called_player_team_season_id],
            "team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id]":
              team_season_recruit_team_seasons_by_player_team_season_id[
                player_called_player_team_season.player_team_season_id
              ],
            team_season_recruit_team_seasons_by_player_team_season_id:
              team_season_recruit_team_seasons_by_player_team_season_id,
            recruit_team_seasons_by_team_season_id: recruit_team_seasons_by_team_season_id,
          });
        }

        for (const call_topic of sorted_call_topics.slice(0, call_time)) {
          let val = recruiting_pitch_value(
            player_called_player_team_season.recruiting.interests[call_topic.topic],
            call_topic.team
          );
          console.log({
            val: val,
            "team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id]":
              team_season_recruit_team_seasons_by_player_team_season_id[
                player_called_player_team_season.player_team_season_id
              ],
            "team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id].match_rating":
              team_season_recruit_team_seasons_by_player_team_season_id[
                player_called_player_team_season.player_team_season_id
              ].match_rating,
          });
          team_season_recruit_team_seasons_by_player_team_season_id[
            player_called_player_team_season.player_team_season_id
          ].match_rating += val;
        }
      }
    }

    team_season_call_obj.players_to_call.slice(0, 1).forEach(function (player_called) {
      var player_called_player_team_season =
        player_team_seasons_by_player_team_season_id[player_called.player_team_season_id];
      recruit_team_seasons_to_save.push(
        team_season_recruit_team_seasons_by_player_team_season_id[
          player_called_player_team_season.player_team_season_id
        ]
      );
    });
  }

  if (recruit_team_seasons_to_save.filter((rts) => rts.match_rating > 0).length == 0) {
    console.log("no match ratings", {
      recruit_team_seasons_to_save: recruit_team_seasons_to_save,
      recruit_team_seasons_by_team_season_id: recruit_team_seasons_by_team_season_id,
    });
  }

  stopwatch(common, `Stopwatch RTS - Teams did other? first calls`);

  console.log({ team_seasons: team_seasons });
  for (team_season of team_seasons) {
    delete team_season.team;
    delete team_season.stats;
    delete team_season.team_games;
  }

  console.log({
    player_team_seasons: player_team_seasons,
    team_seasons: team_seasons,
    recruit_team_seasons_to_save: recruit_team_seasons_to_save,
  });

  stopwatch(common, `Stopwatch RTS - Cleaning up data before saving`);

  db.player_team_season.update(player_team_seasons);
  db.team_season.update(team_seasons);
  db.recruit_team_season.insert(recruit_team_seasons_to_save);
  stopwatch(common, `Stopwatch RTS - Saved all RTSs WITH PROMISE`);
};

const class_is_in_college = (class_name) => {
  let class_map = {
    "HS JR": false,
    "HS SR": false,
    FR: true,
    SO: true,
    JR: true,
    SR: true,
    GR: false,
  };

  return class_map[class_name] || false;
};

const assign_player_jersey_numbers = async (common, season) => {
  const db = common.db;

  common.stopwatch(common, "Assigning jersey numbers - starting");
  let player_team_seasons = db.player_team_season.find({ season: season });
  let player_team_seasons_by_team_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  common.stopwatch(common, "Assigning jersey numbers - fetched PTSs");

  let player_ids = player_team_seasons.map((pts) => pts.player_id);
  let players = db.player.find({ player_id: { $in: player_ids } });
  let players_by_player_id = index_group_sync$1(players, "index", "player_id");

  common.stopwatch(common, "Assigning jersey numbers - Fetched Players");

  let player_team_seasons_to_save = [];
  let players_to_save = [];

  var url = "/static/data/import_json/position_numbers.json";
  var json_data = await fetch(url);
  var all_position_numbers = await json_data.json();

  common.stopwatch(common, "Assigning jersey numbers - Fetched default jersey nums");

  for (let [team_season_id, team_player_team_seasons] of Object.entries(
    player_team_seasons_by_team_season_id
  )) {
    let chosen_numbers = new Set(
      team_player_team_seasons
        .map((pts) => players_by_player_id[pts.player_id].jersey_number)
        .filter((num) => num)
    );
    let available_numbers = new Set(
      Array(99)
        .fill(1)
        .map((x, y) => x + y)
    );
    chosen_numbers.forEach(function (num) {
      available_numbers.delete(num);
    });

    console.log({
      chosen_numbers: chosen_numbers,
      available_numbers: available_numbers,
    });

    team_player_team_seasons = team_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );
    team_player_team_seasons.forEach(function (pts) {
      let this_player = players_by_player_id[pts.player_id];

      let chosen_number = this_player.jersey_number;
      let loop_count = 0;
      while (chosen_number == null && loop_count < 100) {
        let try_chosen_number = -1;
        if (loop_count > 50) {
          try_chosen_number = weighted_random_choice(available_numbers, null);
        } else {
          try_chosen_number = weighted_random_choice(all_position_numbers[pts.position], null);
        }

        if (try_chosen_number && available_numbers.has(try_chosen_number)) {
          chosen_number = try_chosen_number;
        }

        loop_count += 1;
      }

      pts.jersey_number = chosen_number;
      this_player.jersey_number = chosen_number;

      player_team_seasons_to_save.push(pts);
      players_to_save.push(this_player);

      chosen_numbers.add(chosen_number);
      available_numbers.delete(chosen_number);
    });
  }

  common.stopwatch(common, "Assigning jersey numbers - Assigned all numbers");

  db.player_team_season.update(player_team_seasons_to_save);
  db.player.update(players_to_save);

  common.stopwatch(common, "Assigning jersey numbers - Saved & done");
};

const assign_players_to_teams = async (common, world_id, season, team_seasons) => {
  const db = common.db;

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  let player_team_seasons = db.player_team_season
    .find({ season: season, team_season_id: 0 })
    .filter((pts) => class_is_in_college(pts.class.class_name));

  let player_ids = player_team_seasons.map((pts) => pts.player_id);

  let players = db.player.find({ player_id: { $in: player_ids } });
  let players_by_player_id = index_group_sync$1(players, "index", "player_id");
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");

  index_group_sync$1(team_seasons, "index", "team_id");
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  var team_position_options = [
    {
      QB: 6,
      RB: 5,
      FB: 1,
      WR: 8,
      TE: 4,
      OT: 5,
      IOL: 8,
      EDGE: 6,
      DL: 7,
      LB: 7,
      CB: 7,
      S: 4,
      K: 1,
      P: 2,
    },
    {
      QB: 4,
      RB: 5,
      FB: 1,
      WR: 8,
      TE: 4,
      OT: 4,
      IOL: 8,
      EDGE: 6,
      DL: 5,
      LB: 12,
      CB: 6,
      S: 5,
      K: 1,
      P: 2,
    },
    {
      QB: 4,
      RB: 5,
      FB: 1,
      WR: 9,
      TE: 3,
      OT: 5,
      IOL: 7,
      EDGE: 7,
      DL: 5,
      LB: 11,
      CB: 7,
      S: 4,
      K: 2,
      P: 1,
    },
    {
      QB: 3,
      RB: 8,
      FB: 1,
      WR: 7,
      TE: 5,
      OT: 5,
      IOL: 8,
      EDGE: 5,
      DL: 5,
      LB: 9,
      CB: 8,
      S: 4,
      K: 2,
      P: 1,
    },
    {
      QB: 5,
      RB: 6,
      FB: 1,
      WR: 10,
      TE: 4,
      OT: 4,
      IOL: 8,
      EDGE: 7,
      DL: 5,
      LB: 8,
      CB: 5,
      S: 5,
      K: 1,
      P: 2,
    },
  ];

  let max_prestige = 1;

  for (const team_season of team_seasons) {
    team_season.team_position_option = deep_copy$1(
      team_position_options[Math.floor(Math.random() * team_position_options.length)]
    );

    team_season.team_prestige =
      (3 * team_season.team.team_ratings.program_history +
        3 * team_season.team.team_ratings.brand +
        3 * team_season.team.team_ratings.team_competitiveness +
        3 * team_season.team.team_ratings.pro_pipeline +
        team_season.team.team_ratings.location) /
      13;
    max_prestige = Math.max(max_prestige, team_season.team_prestige);
  }

  let distance_tracking_map = {};
  player_team_seasons.forEach(function (pts) {
    pts.team_distances = {};
    team_seasons.forEach(function (ts) {
      pts.team_distances[ts.team_season_id] = distance_between_cities(
        ts.team.location,
        pts.player.hometown,
        distance_tracking_map
      );
    });
  });

  max_prestige += 3;

  for (const team_season of team_seasons) {
    team_season.prestige_lower_slice_ratio =
      1 - team_season.team_prestige ** 0.15 / max_prestige ** 0.15;
    team_season.prestige_upper_slice_ratio =
      1 - team_season.team_prestige ** 2.5 / max_prestige ** 2.5;
  }

  const player_team_seasons_by_position = index_group_sync$1(
    player_team_seasons,
    "group",
    "position"
  );
  console.log("player_team_seasons", {
    player_team_seasons_by_position: player_team_seasons_by_position,
    player_team_seasons: player_team_seasons,
  });

  let player_team_seasons_tocreate = [];

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.potential - pts_a.ratings.overall.potential
    );

    position_team_season_ids = team_seasons
      .map((ts) => Array(ts.team_position_option[position]).fill([ts.team_season_id]).flat())
      .flat();

    if (position == "P" || position == "K") {
      position_team_season_ids = shuffle(team_seasons.map((ts) => ts.team_season_id));
      position_team_season_ids = position_team_season_ids.concat(
        shuffle(team_seasons.map((ts) => ts.team_season_id))
      );
    } else {
      position_team_season_ids = shuffle(position_team_season_ids);
    }

    console.log({
      position_team_season_ids: position_team_season_ids,
      position_player_team_seasons: position_player_team_seasons,
    });

    for (const team_season_id of position_team_season_ids) {
      var team_season = team_seasons_by_team_season_id[team_season_id];

      var prestige_slice_lower_bound = Math.floor(
        position_player_team_seasons.length * team_season.prestige_lower_slice_ratio
      );
      var prestige_slice_upper_bound = Math.ceil(
        position_player_team_seasons.length * team_season.prestige_upper_slice_ratio
      );

      var prestige_slice_gap = prestige_slice_upper_bound - prestige_slice_lower_bound;
      // var r = Math.random();
      // var player_team_season_index = Math.floor(
      //   prestige_slice_lower_bound + (r * prestige_slice_gap)
      // );

      // var chosen_player_team_season = position_player_team_seasons.splice(
      //   player_team_season_index,
      //   1
      // );

      console.log({
        team_season: team_season,
        position_player_team_seasons: position_player_team_seasons,
        "team_season.prestige_upper_slice_ratio": team_season.prestige_upper_slice_ratio,
        "team_season.prestige_lower_slice_ratio": team_season.prestige_lower_slice_ratio,
        prestige_slice_gap: prestige_slice_gap,
        prestige_slice_upper_bound: prestige_slice_upper_bound,
        prestige_slice_lower_bound: prestige_slice_lower_bound,
      });
      let available_position_player_team_seasons = position_player_team_seasons.slice(
        prestige_slice_lower_bound,
        prestige_slice_upper_bound
      );
      let available_position_player_team_seasons_tuples =
        available_position_player_team_seasons.map(function (pts) {
          let dist_val = 800 - pts.team_distances[team_season_id];
          if (!(dist_val > 0)) {
            dist_val = 1;
          }
          return [pts, dist_val ** 2];
        });
      let chosen_player_team_season = weighted_random_choice(
        available_position_player_team_seasons_tuples
      );
      // console.log({available_position_player_team_seasons_tuples:available_position_player_team_seasons_tuples, chosen_player_team_season:chosen_player_team_season})

      if (chosen_player_team_season) {
        chosen_player_team_season.team_season_id = team_season_id;
        player_team_seasons_tocreate.push(chosen_player_team_season);
      } else {
        console.log("Didnt match player");
      }

      position_player_team_seasons = position_player_team_seasons.filter(
        (pts) => pts != chosen_player_team_season
      );
    }

    console.log({
      position: position,
      position_team_season_ids: position_team_season_ids,
      player_team_seasons: player_team_seasons,
      player_team_seasons_tocreate: player_team_seasons_tocreate,
    });
  }

  player_team_seasons_tocreate.forEach(function (pts) {
    delete pts.player;
    delete pts.team_distances;
  });

  console.log({ player_team_seasons_tocreate: player_team_seasons_tocreate });
  await db.player_team_season.update(player_team_seasons_tocreate);
};

const create_coaches = async (data) => {
  const common = data.common;
  const db = common.db;
  var coaches_tocreate = [];
  var ethnicity_map = { white: 25, black: 25, hispanic: 25, asian: 25 };

  const positions = ["HC", "OC", "DC", "ST"];

  const num_coaches_to_create = positions.length * data.team_seasons.length;

  const coach_names = await common.random_name(ddb, num_coaches_to_create);
  const coach_cities = await common.random_city(ddb, num_coaches_to_create);

  var coach_counter = 0;

  let teams = db.team.find({ team_id: { $gt: 0 } });
  let team_brand_weights = teams.map((t) => [
    t.team_id,
    Math.floor(t.team_ratings.program_history ** 0.5),
  ]);

  var coach_id_counter = db.coach.nextId("coach_id");

  for (let team_season of data.team_seasons) {
    for (const coaching_position of positions) {
      body = common.body_from_position("coach");
      ethnicity = common.weighted_random_choice(ethnicity_map);
      let alma_mater_team_id = common.weighted_random_choice(team_brand_weights);
      var coach_obj = {
        coach_id: coach_id_counter,
        name: coach_names[coach_counter],
        world_id: data.world_id,
        coaching_position: coaching_position,
        hometown: coach_cities[coach_counter],
        ethnicity: ethnicity,
        body: body,
        alma_mater_team_id: parseInt(alma_mater_team_id),
      };

      coaches_tocreate.push(new coach(coach_obj));

      coach_counter += 1;
      coach_id_counter += 1;
    }
  }
  console.log({ coaches_tocreate: coaches_tocreate });
  db.coach.insert(coaches_tocreate);
};

const create_coach_team_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  common.season;

  const team_seasons = data.team_seasons;

  var coach_team_seasons_tocreate = [];
  let coach_team_season_id_counter = db.coach_team_season.nextId("coach_team_season_id");

  for (const coach of data.coaches) {
    var init_data = {
      coach_id: coach.coach_id,
      coach_team_season_id: coach_team_season_id_counter,
      team_season_id: -1,
      season: data.season,
      world_id: data.world_id,
      coaching_position: coach.coaching_position,
      age: Math.floor(Math.random() * 30) + 30,
    };

    var new_cts = new coach_team_season(init_data);

    coach_team_seasons_tocreate.push(new_cts);
    coach_team_season_id_counter += 1;
  }

  const coach_team_seasons_by_position = index_group_sync$1(
    coach_team_seasons_tocreate,
    "group",
    "coaching_position"
  );
  console.log({
    coach_team_seasons_tocreate: coach_team_seasons_tocreate,
    coach_team_seasons_by_position: coach_team_seasons_by_position,
  });
  coach_team_seasons_tocreate = [];

  for (const position in coach_team_seasons_by_position) {
    var coach_team_seasons = coach_team_seasons_by_position[position];

    let ind = 0;
    for (const team_season of team_seasons) {
      let chosen_coach_team_season = coach_team_seasons[ind];
      chosen_coach_team_season.team_season_id = team_season.team_season_id;

      chosen_coach_team_season.contract = {
        overall_years: 5,
        years_remaining: Math.floor(Math.random() * 5) + 1,
        compensation: 1_000_000,
        goals: {
          wins_per_season: { value: 6, importance: 10 },
          final_rank: { value: 25, importance: 8 },
        },
      };

      coach_team_seasons_tocreate.push(chosen_coach_team_season);

      ind += 1;
    }
  }

  await db.coach_team_season.insert(coach_team_seasons_tocreate);
};

const generate_player_ratings = async (common, world_id, season) => {
  const db = common.db;

  let player_team_seasons = db.player_team_season.find({ season: season });

  var url = "/static/data/import_json/player_archetype.json";
  var json_data = await fetch(url);
  var position_archetypes = await json_data.json();
  console.log({
    url: url,
    player_team_seasons: player_team_seasons,
    position_archetypes: position_archetypes,
  });

  var position_overall_max = {};
  var position_overall_min = {};

  player_team_seasons
    .filter((pts) => pts.ratings)
    .forEach(function (pts) {
      pts.potential_ratings = deep_copy$1(pts.ratings);
    });
  for (let pts of player_team_seasons.filter((pts) => !pts.ratings)) {
    let position_archetype = deep_copy$1(position_archetypes[pts.position]["Balanced"]);
    pts.ratings = pts.ratings || {};
    pts.potential_ratings = {};
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];

      pts.ratings[rating_group_key] = pts.ratings[rating_group_key] || {};
      pts.potential_ratings[rating_group_key] = {};
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        var rating_mean = rating_obj.rating_mean;

        var rating_value =
          pts.ratings[rating_group_key][rating_key] ||
          round_decimal$1(normal_trunc$1(rating_mean, rating_mean / 6.0, 1, 100), 0);

        pts.potential_ratings[rating_group_key][rating_key] = rating_value;

        let aged_out_rating_value = age_out_rating(
          rating_group_key,
          rating_key,
          rating_value,
          pts.class.class_name
        );

        // if (aged_out_rating_value < rating_value){
        //   console.log({
        //     rating_value:rating_value, aged_out_rating_value:aged_out_rating_value,rating_group_key:rating_group_key, rating_key:rating_key, 'pts.class.class_name': pts.class.class_name
        //   })
        //
        // }

        pts.ratings[rating_group_key][rating_key] = aged_out_rating_value;
      }
    }
  }

  for (let pts of player_team_seasons) {
    let overall_impact = 0;
    let potential_impact = 0;
    let position_archetype = deep_copy$1(position_archetypes[pts.position]["Balanced"]);
    // console.log({pts:pts})
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        var rating_mean = rating_obj.rating_mean;
        var rating_overall_impact = rating_obj.overall_impact;

        overall_impact +=
          (pts.ratings[rating_group_key][rating_key] - rating_mean) * rating_overall_impact;

        potential_impact +=
          (pts.potential_ratings[rating_group_key][rating_key] - rating_mean) *
          rating_overall_impact;
      }
    }

    pts.ratings.overall.overall = overall_impact;
    pts.ratings.overall.potential = potential_impact;
    // if (pts.ratings.overall.overall != pts.ratings.overall.potential && pts.class.class_name == 'FR'){
    //   console.log({
    //     'pts.ratings.overall.potential':pts.ratings.overall.potential,
    //     'pts.ratings.overall.overall': pts.ratings.overall.overall,
    //     potential_impact:potential_impact,
    //     overall_impact:overall_impact,
    //     pts:pts
    //   })
    // }

    if (!(pts.position in position_overall_max)) {
      position_overall_max[pts.position] = pts.ratings.overall.overall;
      position_overall_min[pts.position] = pts.ratings.overall.overall;
    }

    position_overall_max[pts.position] = Math.max(
      position_overall_max[pts.position],
      pts.ratings.overall.overall
    );
    position_overall_min[pts.position] = Math.min(
      position_overall_min[pts.position],
      pts.ratings.overall.overall
    );
  }

  var goal_overall_max = 99;
  var goal_overall_min = 40;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const pts of player_team_seasons) {
    let original_overall = pts.ratings.overall.overall;
    let original_potential = pts.ratings.overall.potential;

    pts.ratings.overall.overall = Math.floor(
      ((pts.ratings.overall.overall - position_overall_min[pts.position]) /
        (position_overall_max[pts.position] - position_overall_min[pts.position])) **
        1.5 *
        goal_overall_range +
        goal_overall_min
    );

    pts.ratings.overall.potential = Math.floor(
      ((pts.ratings.overall.potential - position_overall_min[pts.position]) /
        (position_overall_max[pts.position] - position_overall_min[pts.position])) **
        1.5 *
        goal_overall_range +
        goal_overall_min
    );

    if (!pts.ratings.overall.potential || !pts.ratings.overall.overall) {
      console.log("broken overall", {
        pts: pts,
        "pts.ratings.overall.potential ": pts.ratings.overall.potential,
        "pts.ratings.overall.overall": pts.ratings.overall.overall,
        goal_overall_range: goal_overall_range,
        "pts.position": pts.position,
        goal_overall_min: goal_overall_min,
        "position_overall_min[pts.position]": position_overall_min[pts.position],
        " position_overall_max[pts.position]": position_overall_max[pts.position],
        original_overall: original_overall,
        original_potential: original_potential,
      });
    }

    delete pts.potential_ratings;
  }

  console.log("setting ratings", { player_team_seasons: player_team_seasons });
  //
  db.player_team_season.update(player_team_seasons);
};

const create_new_players_and_player_team_seasons = async (
  common,
  world_id,
  season,
  team_seasons,
  classes
) => {
  const db = common.db;

  let players_tocreate = [];
  let player_team_seasons_tocreate = [];
  let player_team_season_stats_tocreate = [];

  const position_ethnicity =
    //numbers normalized from https://theundefeated.com/features/the-nfls-racial-divide/
    {
      QB: { white: 65, black: 25, hispanic: 5, asian: 5 },
      RB: { white: 25, black: 65, hispanic: 10, asian: 5 },
      FB: { white: 50, black: 50, hispanic: 15, asian: 2 },
      WR: { white: 25, black: 65, hispanic: 5, asian: 5 },
      TE: { white: 50, black: 50, hispanic: 15, asian: 2 },
      OT: { white: 45, black: 55, hispanic: 15, asian: 1 },
      IOL: { white: 40, black: 50, hispanic: 15, asian: 1 },
      EDGE: { white: 20, black: 80, hispanic: 10, asian: 1 },
      DL: { white: 10, black: 80, hispanic: 10, asian: 1 },
      LB: { white: 25, black: 75, hispanic: 10, asian: 1 },
      CB: { white: 10, black: 100, hispanic: 10, asian: 2 },
      S: { white: 15, black: 80, hispanic: 10, asian: 5 },
      K: { white: 70, black: 10, hispanic: 25, asian: 25 },
      P: { white: 70, black: 10, hispanic: 25, asian: 25 },
    };

  var team_position_counts = {
    QB: 1.25,
    RB: 1.5,
    FB: 0.5,
    WR: 2,
    TE: 1.25,
    OT: 1.25,
    IOL: 1.5,
    EDGE: 1.5,
    DL: 1.5,
    LB: 1.5,
    CB: 2,
    S: 1.25,
    K: 0.5,
    P: 0.5,
  };

  const num_players_per_team = sum$1(Object.values(team_position_counts));
  const num_players_to_create =
    Math.ceil(num_players_per_team) * team_seasons.length * classes.length;

  const player_names = await common.random_name(ddb, num_players_to_create);
  const player_cities = await common.random_city(ddb, num_players_to_create);

  var player_counter = 0;

  var player_id_counter = db.player.nextId("player_id");
  var player_team_season_id_counter = db.player_team_season.nextId("player_team_season_id");

  for (let position in team_position_counts) {
    let players_for_position = Math.floor(
      team_position_counts[position] * classes.length * team_seasons.length
    );

    for (let position_count = 0; position_count < players_for_position; position_count++) {
      let body = common.body_from_position(position);
      let ethnicity = common.weighted_random_choice(position_ethnicity[position]);
      let player_class = classes[Math.floor(Math.random() * classes.length)];

      if (player_counter > player_names.length || player_counter > player_cities.length) {
        console.log("something weird with names?", {
          player_names: player_names,
          player_cities: player_cities,
          player_counter: player_counter,
        });
      }

      var player_obj = new player({
        player_id: player_id_counter,
        name: player_names[player_counter],
        world_id: world_id,
        hometown: player_cities[player_counter],
        ethnicity: ethnicity,
        body: body,
        world_id: world_id,
        position: position,
      });

      let player_team_season_obj = new player_team_season({
        world_id: world_id,
        player_id: player_id_counter,
        player_team_season_id: player_team_season_id_counter,
        season: season,
        class: {
          class_name: player_class,
          redshirted: false,
        },
        team_season_id: 0,
        position: position,
      });

      if (player_class == "HS SR") {
        player_team_season_obj.team_season_id = -1 * season;
        player_team_season_obj.is_recruit = true;
        player_team_season_obj.recruiting = {
          speed: 1,
          stars: 4,
          signed: false,
          signed_team_season_id: null,
          stage: null,
          rank: {
            national: null,
            position_rank: null,
            state: null,
          },
          weeks: {},
          team_season_buckets: {
            dream: new Set(),
            favor: new Set(),
            indifferent: new Set(),
            hate: new Set(),
          },
          interests: {
            location: round_decimal$1(normal_trunc$1(3, 1.5, 1, 7), 0),
            fan_support: round_decimal$1(normal_trunc$1(3, 1.5, 1, 7), 0),
            academic_quality: round_decimal$1(normal_trunc_bounce(2, 10, 1, 7), 0),
            facilities: round_decimal$1(normal_trunc$1(3, 1.5, 1, 7), 0),
            program_history: round_decimal$1(normal_trunc$1(2.5, 1.5, 1, 7), 0),
            team_competitiveness: round_decimal$1(normal_trunc$1(3.5, 1.5, 1, 7), 0),
            brand: round_decimal$1(normal_trunc$1(3, 1.5, 1, 7), 0),
            pro_pipeline: round_decimal$1(normal_trunc$1(4, 1.5, 1, 7), 0),

            program_stability: round_decimal$1(normal_trunc$1(1.75, 0.1, 1, 7), 0),
            playing_time: round_decimal$1(normal_trunc$1(1.5, 0.1, 1, 7), 0),
            close_to_home: round_decimal$1(normal_trunc_bounce(4.5, 3, 1, 7), 0),
          },
        };
      } else {
        var new_player_team_season_stats = new player_team_season_stats(
          player_team_season_id_counter
        );
        player_team_season_stats_tocreate.push(new_player_team_season_stats);
      }

      players_tocreate.push(player_obj);
      player_team_seasons_tocreate.push(player_team_season_obj);

      player_counter += 1;
      player_id_counter += 1;
      player_team_season_id_counter += 1;
    }
  }

  console.log({
    players_tocreate: players_tocreate,
    player_team_seasons_tocreate: player_team_seasons_tocreate,
  });
  await Promise.all([
    db.player.insert(players_tocreate),
    db.player_team_season.insert(player_team_seasons_tocreate),
    db.player_team_season_stats.insert(player_team_season_stats_tocreate),
  ]);
};

const create_phase = async (season, common) => {
  const db = common.db;
  const phases_to_create = [
    { season: season, phase_name: "Pre-Season", is_current: true },
    { season: season, phase_name: "Regular Season", is_current: false },
    { season: season, phase_name: "End of Regular Season", is_current: false },
    { season: season, phase_name: "Bowl Season", is_current: false },
    { season: season, phase_name: "Season Recap", is_current: false },
    { season: season, phase_name: "Departures", is_current: false },
    { season: season, phase_name: "Off-Season Recruiting", is_current: false },
    { season: season, phase_name: "Summer Camp", is_current: false },
  ];

  let phase_id = db.phase.nextId("phase_id");
  for (let phase of phases_to_create) {
    phase.phase_id = phase_id;
    phase_id += 1;
  }
  const phases_to_create_added = db.phase.insert(phases_to_create);
  let phases = db.phase.find({ season: season });
  const phases_by_phase_name = index_group_sync$1(phases, "index", "phase_name");
  console.log({
    phases_by_phase_name: phases_by_phase_name,
    phases: phases,
    phases_to_create_added: phases_to_create_added,
    phase_id: phase_id,
  });
  return phases_by_phase_name;
};

const create_week = async (phases, common, world_id, season) => {
  const db = common.db;

  var weeks_to_create = [
    // {week_name:'Summer Week 1', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 2', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 3', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 4', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    {
      week_name: "Plan for Season",
      short_name: "summer-plan",
      is_current: false,
      phase_id: phases["Summer Camp"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Pre-Season",
      short_name: "pre-season",
      is_current: false,
      phase_id: phases["Pre-Season"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Week 1",
      short_name: "week-01",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 1,
    },
    {
      week_name: "Week 2",
      short_name: "week-02",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 2,
    },
    {
      week_name: "Week 3",
      short_name: "week-03",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 3,
    },
    {
      week_name: "Week 4",
      short_name: "week-04",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 4,
    },
    {
      week_name: "Week 5",
      short_name: "week-05",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 5,
    },
    {
      week_name: "Week 6",
      short_name: "week-06",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 6,
    },
    {
      week_name: "Week 7",
      short_name: "week-07",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 7,
    },
    {
      week_name: "Week 8",
      short_name: "week-08",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 8,
    },
    {
      week_name: "Week 9",
      short_name: "week-09",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 9,
    },
    {
      week_name: "Week 10",
      short_name: "week-10",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 10,
    },
    {
      week_name: "Week 11",
      short_name: "week-11",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 11,
    },
    {
      week_name: "Week 12",
      short_name: "week-12",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 12,
    },
    {
      week_name: "Week 13",
      short_name: "week-13",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 13,
    },
    {
      week_name: "Week 14",
      short_name: "week-14",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 14,
    },
    {
      week_name: "Week 15",
      short_name: "week-15",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 15,
    },

    {
      week_name: "Conference Championships",
      short_name: "conference-championships",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Early Signing Day",
      short_name: "early-signing-day",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Prep",
      short_name: "bowl-prep",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 1",
      short_name: "bowl-week-01",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 2",
      short_name: "bowl-week-02",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 3",
      short_name: "bowl-week-03",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 4",
      short_name: "bowl-week-04",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Season Recap",
      short_name: "season-recap",
      is_current: false,
      phase_id: phases["Season Recap"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Team Departures",
      short_name: "departures",
      is_current: false,
      phase_id: phases["Departures"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Recruiting Week 1",
      short_name: "recruiting-week-01",
      is_current: false,
      phase_id: phases["Off-Season Recruiting"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Recruiting Week 2",
      short_name: "recruiting-week-02",
      is_current: false,
      phase_id: phases["Off-Season Recruiting"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Recruiting Week 3",
      short_name: "recruiting-week-03",
      is_current: false,
      phase_id: phases["Off-Season Recruiting"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Recruiting Week 4",
      short_name: "recruiting-week-04",
      is_current: false,
      phase_id: phases["Off-Season Recruiting"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "National Signing Day",
      short_name: "signing-day",
      is_current: false,
      phase_id: phases["Off-Season Recruiting"]["phase_id"],
      schedule_week_number: null,
    },
  ];

  let week_id = db.week.nextId("week_id");

  for (let week of weeks_to_create) {
    week.week_updates = [];
    week.season = season;
    week.week_id = week_id;
    week.user_actions = {
      recruiting_actions_used: 0,
    };
    week.world_id = world_id;
    week.short_name = week.season + "-" + week.short_name;

    week_id += 1;
  }

  if (season == 2022) {
    weeks_to_create[1].is_current = true;
  }

  db.week.insert(weeks_to_create);
  return weeks_to_create;
};

const get_rivalries = async (teams) => {
  const team_names = teams.map((t) => t.school_name);

  var url = "/static/data/import_json/rivalries.json";
  var data = await fetch(url);
  var rival_dimension = await data.json();

  rival_dimension = rival_dimension.filter(
    (r) => team_names.includes(r.team_name_1) && team_names.includes(r.team_name_2)
  );

  rival_dimension = shuffle(rival_dimension);
  rival_dimension = rival_dimension.sort(function (a, b) {
    if (a.preferred_week_id == undefined) return 1;
    if (b.preferred_week_id == undefined) return 0;
    if (a.preferred_week_id < b.preferred_week_id) return -1;
    if (a.preferred_week_id > b.preferred_week_id) return 1;
    return 0;
  });

  return rival_dimension;
};

const get_teams = async () => {
  var url = "/static/data/import_json/team.json";
  var data = await fetch(url);
  var teams = await data.json();

  teams.forEach(function (t) {
    t.team_color_primary_hex = t.team_color_primary_hex.replace("#", "");
    t.team_color_secondary_hex = t.team_color_secondary_hex.replace("#", "");

    if (t.jersey.lettering_color) {
      t.jersey.lettering_color = t.jersey.lettering_color.replace("#", "");
    }

    t.field = t.field || {
      endzones: {
        style: "text",
        endzone_color: "407A21",
        text: t.school_name,
        text_color: t.team_color_primary_hex,
        text_border_color: "FFFFFF",
      },
    };
  });

  return teams;
};

const get_conferences = async (conference_version) => {
  conference_version = conference_version || "";

  var url = `/static/data/import_json/conference${conference_version}.json`;
  console.log({ url: url });
  var data = await fetch(url);
  var conferences = await data.json();
  console.log({ conferences: conferences });

  return conferences;
};

const random_name = async (ddb, num_names) => {
  var name_list = [];

  const first_name_list = ddb.first_names.find();
  const last_name_list = ddb.last_names.find();

  final_first_name_obj = first_name_list[first_name_list.length - 1];
  final_last_name_obj = last_name_list[last_name_list.length - 1];

  for (var i = 0; i <= num_names; i++) {
    const r_first = Math.floor(Math.random() * final_first_name_obj.stop);
    const r_last = Math.floor(Math.random() * final_last_name_obj.stop);

    const chosen_first = first_name_list.find((name_obj) => name_obj.stop > r_first);
    const chosen_last = last_name_list.find((name_obj) => name_obj.stop > r_last);

    name_list.push({ first: chosen_first.name, last: chosen_last.name });
  }
  return name_list;
};

const random_city = async (ddb, num_cities) => {
  let city_list = ddb.cities.find();
  let chosen_city_list = [];

  let total_occurance = sum$1(city_list.map((c) => c.occurance));

  for (var i = 0; i <= num_cities; i++) {
    let r_city = Math.floor(Math.random() * total_occurance);
    let chosen_city = city_list.find(function (city_obj) {
      r_city -= city_obj.occurance;
      return r_city <= 0;
    });
    chosen_city_list.push(chosen_city);
  }
  return chosen_city_list;
};

function hashCode(s) {
  let h;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;

  return h;
}
window.table_key_map = null;
window.reverse_table_key_map = null;

const resolve_route_parameters = async (pathname) => {
  let routes = [
    { route: "/", f: page_index },

    { route: "/admin", path: "admin/admin/base.html" },
    { route: "/admin/Database/:database", path: "admin/database/base.html" },
    { route: "/admin/Database/:database/Table/:table", path: "admin/table/base.html" },

    { route: "/World/:world_id/", f: page_world },
    // { route: "/World/:world_id/Week/:short_name/", f: page_world_week },
    { route: "/World/:world_id/Rankings/", f: page_world_rankings },
    { route: "/World/:world_id/Standings/", f: page_world_standings },
    {
      route: "/World/:world_id/Standings/Conference/:conference_id",
      path: "world/standings/base.html",
    },
    { route: "/World/:world_id/Schedule/", path: "world/schedule/base.html" },
    { route: "/World/:world_id/Awards/", f: page_world_awards },

    {
      route: "/World/:world_id/Conference/:conference_id",
      path: "conference/conference/base.html",
    },

    { route: "/World/:world_id/Recruiting/", path: "world/recruiting/base.html" },

    {
      route: "/World/:world_id/PlayerStats/Season/:season",
      path: "almanac/player_stats/base.html",
    },
    { route: "/World/:world_id/TeamStats/Season/:season", path: "almanac/team_stats/base.html" },

    { route: "/World/:world_id/History", path: "almanac/history/base.html" },
    { route: "/World/:world_id/PlayerRecords", path: "almanac/player_records/base.html" },
    { route: "/World/:world_id/TeamRecords", path: "almanac/team_records/base.html" },
    { route: "/World/:world_id/CoachStats", path: "almanac/coach_stats/base.html" },
    { route: "/World/:world_id/Shortlists", path: "almanac/shortlists/base.html" },
    { route: "/World/:world_id/AmazingStats", path: "almanac/amazing_stats/base.html" },
    {
      route: "/World/:world_id/AmazingStats/Season/:season/",
      path: "almanac/amazing_stats/base.html",
    },

    { route: "/World/:world_id/Team/:team_id/", f: page_team },
    { route: "/World/:world_id/Team/:team_id/Season/:season/", path: "team/team/base.html" },
    { route: "/World/:world_id/Team/:team_id/Schedule", path: "team/schedule/base.html" },
    {
      route: "/World/:world_id/Team/:team_id/Schedule/Season/:season/",
      path: "team/schedule/base.html",
    },
    { route: "/World/:world_id/Team/:team_id/Roster", path: "team/roster/base.html" },
    {
      route: "/World/:world_id/Team/:team_id/Roster/Season/:season",
      path: "team/roster/base.html",
    },
    { route: "/World/:world_id/Team/:team_id/Gameplan", path: "team/gameplan/base.html" },
    {
      route: "/World/:world_id/Team/:team_id/Gameplan/Season/:season",
      path: "team/gameplan/base.html",
    },
    { route: "/World/:world_id/Team/:team_id/History", path: "team/history/base.html" },

    { route: "/World/:world_id/Player/:player_id/", path: "player/player/base.html" },
    { route: "/World/:world_id/Coach/:coach_id/", path: "coach/coach/base.html" },

    { route: "/World/:world_id/Game/:game_id/", path: "game/game/base.html" },

    { route: "/World/:world_id/Search/:search_keyword/", path: "search/search/base.html" },

    { route: "/static", path: "static" },
    { route: "*html_templates*", path: "url" },
    { route: "*js/modules*", path: "url" },
    { route: "/*", path: "url" },
  ];

  const route_pattern_split = pathname.split("/").filter((str) => str.length > 0);
  const route_params = pathname.split("/").filter((str) => str.length > 0);

  routes.forEach(function (route) {
    route.route_parts = route.route.split("/").filter((str) => str.length > 0);
  });

  routes = routes.filter((route) => route.route_parts.length == route_params.length);
  routes = routes.filter(function (route) {
    route.params = {};
    for (let ind = 0; ind < route.route_parts.length; ind++) {
      if (route.route_parts[ind] != route_params[ind] && !route.route_parts[ind].includes(":")) {
        return false;
      } else if (route.route_parts[ind].includes(":")) {
        let key = route.route_parts[ind];
        key = key.replace(":", "");
        let val = route_params[ind];

        route.params[key] = val;
        if (/^\d+$/.test(val)) {
          route.params[key] = parseInt(val);
        }
      }
    }
    return true;
  });

  let winning_route = routes[0];

  console.log({
    routes: routes,
    winning_route: winning_route,
    route_params: route_params,
    route_pattern_split: route_pattern_split,
  });
  return winning_route;
};

const all_teams = async (common, link_suffix) => {
  const db = await common.db;
  var team_list = db.team.find({ team_id: { $gt: 0 } });
  team_list = team_list.sort(function (team_a, team_b) {
    if (team_a.school_name < team_b.school_name) return -1;
    if (team_a.school_name > team_b.school_name) return 1;
    return 0;
  });
  team_list = team_list.map((t) => Object.assign(t, { conference_id: t.conference.conference_id }));

  var conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  team_list = nest_children$1(team_list, conferences_by_conference_id, "conference_id", "conference");
  team_list = team_list.map((t) =>
    Object.assign(t, { adjusted_team_href: t.team_href + link_suffix })
  );

  var team_return_obj = { all_teams: team_list, conferences: conferences };
  return team_return_obj;
};

const all_seasons = async (common, link) => {
  const db = await common.db;
  var season_list = await db.league_season.toArray();

  season_list = season_list.map((s) => Object.assign(s, { href: link + s.season }));
  console.log({ link: link, season_list: season_list });
  return season_list;
};

const common_functions = async (path) => {
  let winning_route = await resolve_route_parameters(path);
  const params = winning_route.params;
  const world_id = params.world_id;

  console.log({
    world_id: world_id,
    params: params,
    env: get_nunjucks_env(),
  });

  var world_object = {};
  const ddb = await driver_db();
  if (world_id != undefined) {
    world_object = ddb.world.findOne({ world_id: world_id });
  }

  console.log({
    world_object: world_object,
    params: params,
    env: get_nunjucks_env(),
  });

  let db = null;
  if (world_id){
    db = await resolve_db({ database_id: world_id });
    window.db = db;
  }

  return {
    winning_route: winning_route,
    get_teams: get_teams,
    get_rivalries: get_rivalries,
    get_conferences: get_conferences,
    new_world_action: new_world_action,
    nunjucks_env: get_nunjucks_env(),
    create_phase: create_phase,
    hashCode: hashCode,
    create_week: create_week,
    create_coaches: create_coaches,
    populate_all_depth_charts: populate_all_depth_charts,
    choose_preseason_all_americans: choose_preseason_all_americans,
    create_schedule: create_schedule,
    create_conference_seasons: create_conference_seasons,
    calculate_team_overalls: calculate_team_overalls,
    nav_bar_links: nav_bar_links,
    db: db,
    ddb: ddb,
    world_id: world_id,
    world_object: world_object,
    params: params,
    season: world_object.current_season,
    create_player_face: create_player_face,
    create_coach_face: create_coach_face,
    weighted_random_choice: weighted_random_choice,
    uniform_random_choice: uniform_random_choice,
    shuffle: shuffle,
    normal_trunc: normal_trunc$1,
    normal_trunc_bounce: normal_trunc_bounce,
    random_name: random_name,
    random_city: random_city,
    body_from_position: body_from_position,
    generate_face: generate_face,
    recent_games: recent_games,
    all_teams: all_teams,
    all_seasons: all_seasons,
    initialize_scoreboard: initialize_scoreboard,
    round_decimal: round_decimal$1,
    distance_between_cities: distance_between_cities,
    distance_between_coordinates: distance_between_coordinates,
    calculate_national_rankings: calculate_national_rankings,
    calculate_conference_rankings: calculate_conference_rankings,
    schedule_bowl_season: schedule_bowl_season,
    process_bowl_results: process_bowl_results,
    weekly_recruiting: weekly_recruiting,
    calculate_team_needs: calculate_team_needs,
    populate_player_modal: populate_player_modal,
    geo_marker_action: geo_marker_action,
    team_season: team_season,
    tier_placement: tier_placement,

    stopwatch: stopwatch,
    ordinal: ordinal,
    choose_all_americans: choose_all_americans,
    primary_color: "1763B2",
    secondary_color: "333333",
  };
};

const stopwatch = async (common, message) => {
  var currentTime = performance.now();
  window.lastStopwatch = window.lastStopwatch || common.startTime;
  console.log(
    `${message}- total time: ${parseInt(currentTime - common.startTime)} ms, since last: ${parseInt(
      currentTime - window.lastStopwatch
    )} ms`
  );
  window.lastStopwatch = currentTime;
};

const recent_games = (common) => {
  const season = common.season;
  const db = common.db;
  const all_weeks = db.week.find({ season: season });
  const current_week = all_weeks.filter((w) => w.is_current)[0];

  const all_weeks_by_week_id = index_group_sync$1(all_weeks, "index", "week_id");

  const previous_week = all_weeks_by_week_id[current_week.week_id - 1];

  if (previous_week == undefined) {
    return null;
  }

  var games_in_week = db.game.find({ week_id: previous_week.week_id });

  const team_seasons_b = db.team_season.find({ season: season });
  const team_seasons = team_seasons_b.filter((ts) => ts.team_id > 0);
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  const team_games = db.team_game.find({ week_id: previous_week.week_id });
  for (var team_game of team_games) {
    team_game.team_season = team_seasons_by_team_season_id[team_game.team_season_id];
    team_game.team_season.team = teams_by_team_id[team_game.team_season.team_id];
  }

  const team_games_by_game_id = index_group_sync$1(team_games, "group", "game_id");
  for (var game of games_in_week) {
    game.team_games = team_games_by_game_id[game.game_id];

    let max_national_rank = 0;

    if (game.team_games[0].is_winning_team) {
      max_national_rank =
        team_seasons_by_team_season_id[game.team_games[1].team_season_id].national_rank;
    } else {
      max_national_rank =
        team_seasons_by_team_season_id[game.team_games[0].team_season_id].national_rank;
    }

    game.has_user_team = game.team_games.some((tg) => tg.team_season.is_user_team);

    game.summed_national_rank =
      team_seasons_by_team_season_id[game.team_games[0].team_season_id].national_rank +
      team_seasons_by_team_season_id[game.team_games[1].team_season_id].national_rank +
      max_national_rank;
  }

  games_in_week = games_in_week.sort(function (g_a, g_b) {
    if (g_a.has_user_team) return -1;
    if (g_b.has_user_team) return 1;
    if (g_a.summed_national_rank < g_b.summed_national_rank) return -1;
    if (g_a.summed_national_rank > g_b.summed_national_rank) return 1;
    return 0;
  });

  return games_in_week;
};

const pick_players_on_field = (
  depth_chart,
  player_team_seasons,
  players,
  player_team_games,
  side_of_ball,
  period,
  seconds_left_in_period,
  point_differential
) => {
  var player_list = { all_players: [], by_position: {}, bench_players: [] };
  let players_on_field_set = new Set();

  let abs_point_differential = Math.abs(point_differential);
  if (point_differential < -8) {
    abs_point_differential = Math.abs(point_differential + 10);
  }

  let depth_chart_skip = 0;
  if (abs_point_differential >= 45) {
    depth_chart_skip = 2;
  } else if (abs_point_differential >= 37) {
    depth_chart_skip = 1;
    if (period == 4) {
      depth_chart_skip = 2;
    }
  } else if (abs_point_differential >= 29) {
    // if(period == 4){
    //   depth_chart_skip = 2;
    // }
    // if (period == 3){
    depth_chart_skip = 1;
    // }
  } else if (period == 4 && abs_point_differential >= 24 && seconds_left_in_period < 5 * 60) {
    depth_chart_skip = 1;
  }

  if (point_differential < 0) {
    depth_chart_skip = Math.min(1, depth_chart_skip);
  }

  if (side_of_ball == "offense") {
    var position_list = {
      QB: 1,
      RB: 1,
      WR: 3,
      TE: 1,
      OT: 2,
      IOL: 3,
      K: 1,
      P: 1,
    };
  } else if (side_of_ball == "defense") {
    var position_list = { EDGE: 2, DL: 2, LB: 3, CB: 2, S: 2 };
  } else if (side_of_ball == "kickoff kicking") {
    var position_list = { K: 1, TE: 2, LB: 4, CB: 2, S: 2 };
  } else if (side_of_ball == "kickoff receiving") {
    var position_list = { KR: 2, TE: 4, S: 2, LB: 3 };
  } else if (side_of_ball == "punt kicking") {
    var position_list = { P: 1, OT: 2, IOL: 3, TE: 2, CB: 2, LB: 1 };
  } else if (side_of_ball == "punt receiving") {
    var position_list = { KR: 1, S: 2, CB: 2, TE: 2, EDGE: 2, DL: 2 };
  } else {
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
  }

  // console.log({
  //   position_list:position_list,
  //   depth_chart:depth_chart,
  //   player_team_seasons:player_team_seasons,
  //   players:players,
  //   player_team_games:player_team_games,
  //   side_of_ball:side_of_ball,
  //   period:period,
  //   seconds_left_in_period:seconds_left_in_period,
  //   point_differential:point_differential
  // })

  var player_obj = {};
  for (let pos of shuffle(Object.keys(position_list))) {
    let count = position_list[pos];
    player_list.by_position[pos] = [];
    let ind = 0;
    let pos_depth_chart_skip = depth_chart_skip;
    if (depth_chart[pos].length > pos_depth_chart_skip) {
      ind = pos_depth_chart_skip;
    }

    let energy_threshold = 0.7 - 0.15 * pos_depth_chart_skip;
    let loop_count = 0;
    while (player_list.by_position[pos].length < count) {
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][ind];
      // console.log({'player_obj.player_team_season_id':player_obj.player_team_season_id, player_obj:player_obj, ind:ind, depth_chart:depth_chart, pos:pos})
      player_obj.player_team_season = player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game = player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      ind += 1;
      loop_count += 1;

      if (!players_on_field_set.has(player_obj.player_team_season.player_id)) {
        if (player_obj.player_team_game.game_attrs.energy >= energy_threshold) {
          player_list.all_players.push(player_obj);
          player_list.by_position[pos].push(player_obj);

          players_on_field_set.insert(player_obj.player_team_season.player_id);
        } else {
          energy_threshold -= 0.15;
        }
      }

      if (ind >= depth_chart[pos].length && player_list.by_position[pos].length < count) {
        energy_threshold -= 0.1;
        pos_depth_chart_skip -= 1;
        pos_depth_chart_skip = Math.max(0, pos_depth_chart_skip);
        ind = pos_depth_chart_skip;
      }

      if (loop_count > 20) {
        console.log("might be stuck in picking players", {
          energy_threshold: energy_threshold,
          pos_depth_chart_skip: pos_depth_chart_skip,
          ind: ind,
          loop_count: loop_count,
          player_list: player_list,
          pos: pos,
          "player_list.by_position[pos]": player_list.by_position[pos],
          "depth_chart[pos].": depth_chart[pos],
        });
        return pick_players_on_field(
          depth_chart,
          player_team_seasons,
          players,
          player_team_games,
          side_of_ball,
          period,
          seconds_left_in_period,
          point_differential
        );
      }
    }
  }

  for (let pos in depth_chart) {
    for (var i = 0; i < depth_chart[pos].length; i++) {
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][i];
      player_obj.player_team_season = player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game = player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      if (!players_on_field_set.has(player_obj.player_team_season.player_id)) {
        player_list.bench_players.push(player_obj);
      }
    }
  }

  return player_list;
};

const average = (arr) => {
  if (arr.length == 0) {
    return 0;
  }
  return sum$1(arr) / arr.length;
};

const calculate_game_score = (
  player_team_game,
  player_team_season,
  team_game,
  team_season,
  opponent_team_game
) => {
  var game_score_map = [
    {
      stat_group: "rushing",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 10,
      display: " rush yards",
    },
    {
      stat_group: "rushing",
      stat: "carries",
      point_to_stat_ratio: -1.0 / 10,
      display: " carries",
    },
    {
      stat_group: "rushing",
      stat: "tds",
      point_to_stat_ratio: 6.0 / 1,
      display: " rush TDs",
    },

    {
      stat_group: "passing",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 15,
      display: " pass yards",
    },
    {
      stat_group: "passing",
      stat: "tds",
      point_to_stat_ratio: 4.0 / 1,
      display: " pass TDs",
    },
    {
      stat_group: "passing",
      stat: "completions",
      point_to_stat_ratio: 0.0 / 10,
      display: " comp",
    },
    {
      stat_group: "passing",
      stat: "attempts",
      point_to_stat_ratio: -1.0 / 5,
      display: " att",
    },
    {
      stat_group: "passing",
      stat: "ints",
      point_to_stat_ratio: -10.0 / 1,
      display: " picks",
    },
    {
      stat_group: "passing",
      stat: "sacks",
      point_to_stat_ratio: -1.0 / 5.0,
      display: " sacked",
    },

    {
      stat_group: "receiving",
      stat: "receptions",
      point_to_stat_ratio: 1.0 / 2,
      display: " rec.",
    },
    {
      stat_group: "receiving",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 15,
      display: " rec. yards",
    },
    {
      stat_group: "receiving",
      stat: "tds",
      point_to_stat_ratio: 5.0 / 1,
      display: " rec. TDs",
    },

    {
      stat_group: "defense",
      stat: "sacks",
      point_to_stat_ratio: 4.5 / 1.0,
      display: " sacks",
    },
    {
      stat_group: "defense",
      stat: "tackles",
      point_to_stat_ratio: 1.0 / 2.0,
      display: " tackles",
    },
    {
      stat_group: "defense",
      stat: "tackles_for_loss",
      point_to_stat_ratio: 2.0 / 1.0,
      display: " TFLs",
    },
    {
      stat_group: "defense",
      stat: "deflections",
      point_to_stat_ratio: 2.5 / 1.0,
      display: " defl",
    },
    {
      stat_group: "defense",
      stat: "ints",
      point_to_stat_ratio: 6.0 / 1,
      display: " INTS",
    },
    {
      stat_group: "defense",
      stat: "tds",
      point_to_stat_ratio: 6.0 / 1,
      display: " def TDs",
    },

    {
      stat_group: "fumbles",
      stat: "fumbles",
      point_to_stat_ratio: -3.0 / 1,
      display: " fumbles",
    },
    {
      stat_group: "fumbles",
      stat: "forced",
      point_to_stat_ratio: 6.0 / 1,
      display: " fumb frcd",
    },
    {
      stat_group: "fumbles",
      stat: "recovered",
      point_to_stat_ratio: 1.0 / 1,
      display: " fumb rec.",
    },

    {
      stat_group: "blocking",
      stat: "sacks_allowed",
      point_to_stat_ratio: -3.0 / 1,
      display: " sacks alwd.",
    },
    {
      stat_group: "blocking",
      stat: "blocks",
      point_to_stat_ratio: 1.0 / 10,
      display: " blocks",
    },

    {
      stat_group: "kicking",
      stat: "fga",
      point_to_stat_ratio: -2.0 / 1,
      display: " FGA",
    },
    {
      stat_group: "kicking",
      stat: "fgm",
      point_to_stat_ratio: 5.0 / 1,
      display: " FGM",
    },
  ];

  var game_score_value = 0;
  var season_score_value = 0;
  player_team_season.season_stats.top_stats = [];

  for (var stat_detail of game_score_map) {
    game_score_value = 0;
    season_score_value = 0;
    if (!player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat]) ; else {
      game_score_value = round_decimal$1(
        player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat] *
          stat_detail.point_to_stat_ratio,
        1
      );

      player_team_game.game_stats.games.game_score = round_decimal$1(
        player_team_game.game_stats.games.game_score + game_score_value,
        0
      );
      player_team_game.top_stats.push({
        display:
          player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat].toLocaleString(
            "en-US"
          ) + stat_detail.display,
        game_score_value: game_score_value,
        abs_game_score_value: Math.abs(game_score_value),
      });
    }

    if (!player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat]) ; else {
      season_score_value = round_decimal$1(
        player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat] *
          stat_detail.point_to_stat_ratio,
        1
      );

      player_team_season.season_stats.games.game_score = round_decimal$1(
        (player_team_season.season_stats.games.game_score || 0) + (game_score_value || 0),
        0
      );
      player_team_season.season_stats.top_stats.push({
        display:
          player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat].toLocaleString(
            "en-US"
          ) + stat_detail.display,
        season_score_value: season_score_value,
        abs_season_score_value: Math.abs(season_score_value),
      });
      // console.log('player_team_season.top_stats', {
      //   player_team_season:player_team_season, 'player_team_season.top_stats': player_team_season.top_stats,
      //   season_score_value: season_score_value,
      //   abs_season_score_value: Math.abs(season_score_value), 'stat_detail.display': stat_detail.display,
      //   'stat_detail.stat_group': stat_detail.stat_group, 'stat_detail.stat': stat_detail.stat, 'player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat]': player_team_season.season_stats[stat_detail.stat_group][
      //     stat_detail.stat
      //   ]
      // })
      //
    }
  }

  player_team_game.game_stats.games.weighted_game_score =
    player_team_game.game_stats.games.game_score;
  if (team_game.is_winning_team) {
    if (opponent_team_game.national_rank <= 5) {
      player_team_game.game_stats.games.weighted_game_score *= 1.45;
    } else if (opponent_team_game.national_rank <= 10) {
      player_team_game.game_stats.games.weighted_game_score *= 1.325;
    } else if (opponent_team_game.national_rank <= 15) {
      player_team_game.game_stats.games.weighted_game_score *= 1.25;
    } else if (opponent_team_game.national_rank <= 20) {
      player_team_game.game_stats.games.weighted_game_score *= 1.2;
    } else if (opponent_team_game.national_rank <= 30) {
      player_team_game.game_stats.games.weighted_game_score *= 1.15;
    } else if (opponent_team_game.national_rank <= 40) {
      player_team_game.game_stats.games.weighted_game_score *= 1.01;
    } else if (opponent_team_game.national_rank <= 50) {
      player_team_game.game_stats.games.weighted_game_score *= 1.075;
    } else if (opponent_team_game.national_rank <= 65) {
      player_team_game.game_stats.games.weighted_game_score *= 1.05;
    } else if (opponent_team_game.national_rank <= 85) {
      player_team_game.game_stats.games.weighted_game_score *= 1.025;
    } else if (opponent_team_game.national_rank <= 105) {
      player_team_game.game_stats.games.weighted_game_score *= 1.01;
    }
  } else {
    if (opponent_team_game.national_rank <= 5) {
      player_team_game.game_stats.games.weighted_game_score *= 1.1;
    } else if (opponent_team_game.national_rank <= 15) {
      player_team_game.game_stats.games.weighted_game_score *= 1;
    } else if (opponent_team_game.national_rank <= 25) {
      player_team_game.game_stats.games.weighted_game_score *= 0.95;
    } else if (opponent_team_game.national_rank <= 40) {
      player_team_game.game_stats.games.weighted_game_score *= 0.9;
    } else if (opponent_team_game.national_rank <= 65) {
      player_team_game.game_stats.games.weighted_game_score *= 0.75;
    } else {
      player_team_game.game_stats.games.weighted_game_score *= 0.6;
    }
  }

  player_team_season.season_stats.games.weighted_game_score +=
    player_team_game.game_stats.games.weighted_game_score || 0;
  player_team_season.season_stats.top_12_weighted_game_scores.push(
    player_team_game.game_stats.games.weighted_game_score
  );
  player_team_season.season_stats.top_12_weighted_game_scores =
    player_team_season.season_stats.top_12_weighted_game_scores
      .sort((wgs_a, wgs_b) => wgs_b - wgs_a)
      .slice(0, 12);

  player_team_game.top_stats = player_team_game.top_stats
    .filter((s) => s.abs_game_score_value != 0)
    .sort(function (stat_a, stat_b) {
      return stat_b.abs_game_score_value - stat_a.abs_game_score_value;
    })
    .slice(0, 4);

  player_team_season.season_stats.top_stats = player_team_season.season_stats.top_stats.filter(
    (s) => s.abs_game_score_value != 0
  );
  player_team_season.season_stats.top_stats = player_team_season.season_stats.top_stats.sort(
    (stat_a, stat_b) => stat_b.abs_season_score_value - stat_a.abs_season_score_value
  );

  player_team_season.season_stats.top_stats = player_team_season.season_stats.top_stats.slice(0, 4);
  player_team_season.season_stats.top_stats = player_team_season.season_stats.top_stats.sort(
    (stat_a, stat_b) => stat_b.season_score_value - stat_a.season_score_value
  );

  // player_team_season.top_stats.forEach(function(ts){
  //   delete ts.abs_season_score_value;
  //   delete ts.season_score_value;
  // })

  // player_team_game.top_stats.forEach(function(ts){
  //   delete ts.abs_game_score_value;
  //   delete ts.game_score_value;
  // })

  team_game.top_stats.push({
    player_team_game_id: player_team_game.player_team_game_id,
    game_score: player_team_game.game_stats.games.game_score,
    top_stats: player_team_game.top_stats,
  });
  team_game.top_stats = team_game.top_stats
    .sort(function (player_team_game_a, player_team_game_b) {
      return player_team_game_b.game_score - player_team_game_a.game_score;
    })
    .slice(0, 4);

  team_season.top_stats.push({
    player_team_season_id: player_team_season.player_team_season_id,
    game_score: player_team_season.season_stats.games.game_score,
    top_stats: player_team_season.top_stats,
  });
  team_season.top_stats = team_season.top_stats
    .sort(function (player_team_season_a, player_team_season_b) {
      return player_team_season_b.game_score - player_team_season_a.game_score;
    })
    .slice(0, 4);
};

const generate_ranking_headlines = async (common, team_seasons, this_week, headline_id_counter) => {
  let ranking_headlines = [];
  let conference_sums = {};
  for (let ts of team_seasons) {
    console.log({ ts: ts, team_seasons: team_seasons });

    conference_sums[ts.conference_season.conference.conference_abbreviation] = conference_sums[
      ts.conference_season.conference.conference_abbreviation
    ] || { top_5: 0, top_10: 0, top_15: 0, conference_season: ts.conference_season };

    if (ts.rankings.national_rank[0] < 15) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_15 += 1;
    }
    if (ts.rankings.national_rank[0] < 10) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_10 += 1;
    }
    if (ts.rankings.national_rank[0] < 5) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_5 += 1;
    }

    let ts_headline_options = [];
    if (ts.rankings.national_rank[0] == 1 && ts.rankings.national_rank[1] == 1) {
      ts_headline_options.push({
        headline_relevance: 3,
        text: "{{team_season.team.school_name}} remains at #1",
      });
    }

    if (ts.rankings.national_rank[0] == 1 && ts.rankings.national_rank[1] > 1) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} moves into #1 spot",
      });
    }

    if (ts.rankings.national_rank[0] <= 25 && ts.rankings.national_rank[1] > 25) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} cracks top 25",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -6) {
      ts_headline_options.push({
        headline_relevance: 3,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -12) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -18) {
      ts_headline_options.push({
        headline_relevance: 5,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts_headline_options.length) {
      let max_headline_relevance = Math.max(
        ...ts_headline_options.map((h) => h.headline_relevance)
      );
      ts_headline_options = ts_headline_options.filter(
        (h) => h.headline_relevance == max_headline_relevance
      );
      let ts_headline = ts_headline_options[Math.floor(Math.random() * ts_headline_options.length)];

      var headline_text = common.nunjucks_env.renderString(ts_headline.text, {
        team_season: ts,
      });

      const headline_obj = new headline(
        headline_id_counter,
        this_week.week_id,
        headline_text,
        "ranking",
        ts_headline.headline_relevance
      );

      headline_obj.href = ts.team.team_href;
      headline_obj.team_season_ids = [ts.team_season_id];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  }

  Object.entries(conference_sums).forEach(function (conf_obj) {
    conf_obj[0];
    let conference_obj = conf_obj[1];
    let headline_options = [];

    if (conference_obj.top_5 >= 3) {
      headline_options.push({
        headline_relevance: 6,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_5}} of top 5 teams nationally",
      });
    } else if (conference_obj.top_10 >= 5) {
      headline_options.push({
        headline_relevance: 5,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_10}} of top 10 teams nationally",
      });
    } else if (conference_obj.top_15 >= 8) {
      headline_options.push({
        headline_relevance: 5,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_15}} of top 15 teams nationally",
      });
    }

    if (headline_options.length) {
      let max_headline_relevance = Math.max(...headline_options.map((h) => h.headline_relevance));
      headline_options = headline_options.filter(
        (h) => h.headline_relevance == max_headline_relevance
      );
      let conf_headline = headline_options[Math.floor(Math.random() * headline_options.length)];

      var headline_text = common.nunjucks_env.renderString(conf_headline.text, {
        conference_obj: conference_obj,
      });

      const headline_obj = new headline(
        headline_id_counter,
        this_week.week_id,
        headline_text,
        "ranking",
        conf_headline.headline_relevance
      );

      headline_obj.href = conference_obj.conference_season.conference.conference_href;
      headline_obj.team_season_ids = [];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  });

  return ranking_headlines;
};

const generate_headlines = (game_dict, common) => {
  game_headlines = [];

  let score_difference = Math.abs(
    game_dict.game.scoring.final[0] - game_dict.game.scoring.final[1]
  );

  game_dict.winning_team = game_dict.teams[game_dict.winning_team_index];
  game_dict.losing_team = game_dict.teams[game_dict.losing_team_index];

  game_dict.winning_team_game = game_dict.team_games[game_dict.winning_team_index];
  game_dict.losing_team_game = game_dict.team_games[game_dict.losing_team_index];

  game_dict.winning_team_season = game_dict.team_seasons[game_dict.winning_team_index];
  game_dict.losing_team_season = game_dict.team_seasons[game_dict.losing_team_index];

  let base_headline_relevance = 0;
  if (game_dict.losing_team_season.national_rank < 10) {
    base_headline_relevance = 10;
  } else if (game_dict.losing_team_season.national_rank < 20) {
    base_headline_relevance = 8;
  } else if (game_dict.losing_team_season.national_rank < 40) {
    base_headline_relevance = 6;
  } else if (game_dict.losing_team_season.national_rank < 80) {
    base_headline_relevance = 4;
  }

  if (score_difference <= 4) {
    game_headlines = game_headlines.concat([
      {
        text: "Time runs out for {{losing_team.school_name}}, falling to {{winning_team.school_name}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} sneaks by {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  } else if (score_difference > 19) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} blasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} OBLITERATES {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} cold clocks {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} banishes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} hammers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} brutalizes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} outmatches {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  } else {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} overcomes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} beats {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} outlasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} overpowers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (game_dict.losing_team.location.unique_city_name && game_dict.losing_team_game.is_home_team) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} wins in {{losing_team.location.city}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} leaves {{losing_team.location.city}} with a win, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (game_dict.losing_team_game.is_home_team) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} beats {{losing_team.school_name}} at home, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (
    (game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank >
      25 &&
      game_dict.losing_team_season.national_rank <= 10) ||
    (game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank >
      50 &&
      game_dict.losing_team_season.national_rank <= 20)
  ) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} upset {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
      {
        text: "{{winning_team.school_name}} pull off the upset over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
      {
        text: "{{winning_team.team_name}} upset {{losing_team.team_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
    ]);
  }

  if (game_dict.game.bowl) {
    if (game_dict.game.bowl.bowl_name == "National Championship") {
      game_headlines = [
        { text: "{{winning_team.school_name}} crowned champions", headline_relevance: 20 },
        {
          text: "{{winning_team.school_name}} claim {{winning_team_season.season}} championship",
          headline_relevance: 20,
        },
      ];
    } else if (game_dict.game.bowl.bowl_name == "National Semifinal") {
      if (game_dict.winning_team_season.playoff.seed >= 9) {
        game_headlines = [
          {
            text: "Cinderella {{winning_team_season.national_rank_display}} {{winning_team.team_name}} to play for a shot at the title next week",
            headline_relevance: 10,
          },
        ];
      } else {
        game_headlines = [
          {
            text: "{{winning_team.school_name}} advance to National Championship",
            headline_relevance: 9,
          },
          {
            text: "{{winning_team.school_name}} takes down {{losing_team.school_name}} to play for championship",
            headline_relevance: 9,
          },
        ];
      }
    }
  }

  let max_headline_relevance = Math.max(...game_headlines.map((h) => h.headline_relevance));
  game_headlines = game_headlines.filter((h) => h.headline_relevance == max_headline_relevance);
  game_headline = game_headlines[Math.floor(Math.random() * game_headlines.length)];

  var headline_text = common.nunjucks_env.renderString(game_headline.text, game_dict);

  const headline_obj = new headline(
    common.headline_id_counter,
    game_dict.game.week_id,
    headline_text,
    "game",
    game_headline.headline_relevance
  );

  headline_obj.href = game_dict.game.game_href;
  headline_obj.game_id = game_dict.game.game_id;
  headline_obj.team_season_ids = [
    game_dict.winning_team_season.team_season_id,
    game_dict.losing_team_season.team_season_id,
  ];

  game_dict.team_seasons[0].headlines.push(common.headline_id_counter);
  game_dict.team_seasons[1].headlines.push(common.headline_id_counter);

  common.headline_id_counter += 1;
  game_dict.headlines.push(headline_obj);
};

const seconds_to_time = (seconds) => {
  var seconds_left = `${seconds % 60}`;
  if (seconds_left.length < 2) {
    seconds_left = "0" + seconds_left;
  }
  return `${Math.floor(seconds / 60)}:${seconds_left}`;
};

const play_call_serialize = (play) => {
  let quarter_seconds_remaining_desc = "";

  if (play.period == 1) {
    quarter_seconds_remaining_desc = "any_time";
  } else if (play.period == 2) {
    if (play.seconds_left_in_period <= 60) {
      quarter_seconds_remaining_desc = "<1m";
    } else if (play.seconds_left_in_period <= 180) {
      quarter_seconds_remaining_desc = "<3m";
    } else if (play.seconds_left_in_period <= 180) {
      quarter_seconds_remaining_desc = "+3m";
    }
  } else if (play.period == 3) {
    if (play.seconds_left_in_period <= 360) {
      quarter_seconds_remaining_desc = "<6m";
    } else {
      quarter_seconds_remaining_desc = "+6m";
    }
  } else if (play.seconds_left_in_period <= 60) {
    quarter_seconds_remaining_desc = "<1m";
  } else if (play.seconds_left_in_period <= 120) {
    quarter_seconds_remaining_desc = "<2m";
  } else if (play.seconds_left_in_period <= 300) {
    quarter_seconds_remaining_desc = "<5m";
  } else if (play.seconds_left_in_period <= 600) {
    quarter_seconds_remaining_desc = "<10m";
  } else {
    quarter_seconds_remaining_desc = "10-15m";
  }

  let score_diff_desc = "";
  if (play.offensive_point_differential == "NA") {
    score_diff_desc = "NA";
  } else if (play.offensive_point_differential >= 25) {
    score_diff_desc = "+4sc";
  } else if (play.offensive_point_differential >= 17) {
    score_diff_desc = "+3sc";
  } else if (play.offensive_point_differential >= 12) {
    score_diff_desc = "+2td";
  } else if (play.offensive_point_differential >= 9) {
    score_diff_desc = "+2sc";
  } else if (play.offensive_point_differential >= 4) {
    score_diff_desc = "+1td";
  } else if (play.offensive_point_differential >= 0) {
    score_diff_desc = "+1sc";
  } else if (play.offensive_point_differential <= -25) {
    score_diff_desc = "-4sc";
  } else if (play.offensive_point_differential <= -17) {
    score_diff_desc = "-3sc";
  } else if (play.offensive_point_differential <= -12) {
    score_diff_desc = "-2td";
  } else if (play.offensive_point_differential <= -9) {
    score_diff_desc = "-2sc";
  } else if (play.offensive_point_differential <= -4) {
    score_diff_desc = "-1td";
  } else if (play.offensive_point_differential < 0) {
    score_diff_desc = "-1sc";
  } else {
    score_diff_desc = "tie";
  }

  let yards_to_goal_line = 100 - play.ball_spot;
  let yard_desc = "";
  if (yards_to_goal_line <= 5) {
    yard_desc = "<5";
  } else if (yards_to_goal_line <= 10) {
    yard_desc = "<10";
  } else if (yards_to_goal_line <= 20) {
    yard_desc = "<20";
  } else if (yards_to_goal_line <= 30) {
    yard_desc = "<30";
  } else if (yards_to_goal_line <= 40) {
    yard_desc = "<40";
  } else if (yards_to_goal_line <= 50) {
    yard_desc = "<50";
  } else if (yards_to_goal_line <= 60) {
    yard_desc = "<60";
  } else if (yards_to_goal_line <= 70) {
    yard_desc = "<70";
  } else if (yards_to_goal_line <= 80) {
    yard_desc = "<80";
  } else if (yards_to_goal_line <= 100) {
    yard_desc = "<100";
  } else {
    yard_desc = "NA";
  }

  let yards_to_go_desc = "";
  if (play.yards_to_go <= 2) {
    yards_to_go_desc = "1-2";
  } else if (play.yards_to_go <= 5) {
    yards_to_go_desc = "3-5";
  } else if (play.yards_to_go <= 9) {
    yards_to_go_desc = "6-9";
  } else if (play.yards_to_go <= 14) {
    yards_to_go_desc = "10-13";
  } else {
    yards_to_go_desc = "13+";
  }

  let qtr_desc = "";
  if (play.period > 4) {
    qtr_desc = "OT";
  } else {
    qtr_desc = "q" + play.period;
  }

  return [
    qtr_desc,
    quarter_seconds_remaining_desc,
    "d" + play["down"],
    yards_to_go_desc,
    yard_desc,
    score_diff_desc,
  ].join("|");
};

const game_sim_play_call_options = (
  down,
  yards_to_go,
  ball_spot,
  period,
  offensive_point_differential,
  seconds_left_in_period,
  is_close_game,
  is_late_game,
  half_end_period,
  final_period
) => {
  let default_play_choice_options = { run: 50, pass: 50, punt: 0, field_goal: 0 };

  let play = {
    yards_to_go: yards_to_go,
    down: down,
    ball_spot: ball_spot,
    period: period,
    offensive_point_differential: offensive_point_differential,
    seconds_left_in_period: seconds_left_in_period,
  };

  let playcall_str = play_call_serialize(play);

  let play_choice_options = window.playcall[playcall_str];

  if (!window.playcall[playcall_str]) {
    let playcall_iteration_options = [
      { field: "down", option_set: [1, 2, 3, 4] },
      { field: "seconds_left_in_period", option_set: [30, 90, 150, 450, 600, 900] },
      { field: "period", option_set: [1, 2, 3, 4, 5] },
      { field: "ball_spot", option_set: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95] },
      {
        field: "offensive_point_differential",
        option_set: [1, 0, -1, 6, -6, 9, -9, 17, -17, 25, -25],
      },
      { field: "yards_to_go", option_set: [1, 4, 7, 10, 15] },
    ];

    playcall_iteration_options.forEach(function (opt) {
      opt.option_set = opt.option_set.sort(
        (val_a, val_b) =>
          Math.abs(val_a - play[opt.field]) - Math.abs(val_b - play[opt.field]) ||
          Math.abs(val_a) - Math.abs(val_b)
      );
    });

    for (let radix = 2; radix < 6; radix++) {
      if (window.playcall[playcall_str]) {
        continue;
      }
      for (let i = 0; i < radix ** playcall_iteration_options.length; i++) {
        let b = i.toString(radix);
        b = b.padStart(6, "0");
        let s = b.split("");
        let adjusted_play = {};
        s.forEach(function (ch, ind) {
          adjusted_play[playcall_iteration_options[ind].field] =
            playcall_iteration_options[ind].option_set[parseInt(ch)];
        });

        playcall_str = play_call_serialize(adjusted_play);
      }
    }

    play_choice_options = window.playcall[playcall_str] || play_choice_options;
  }

  let playclock_urgency = 4;
  if (period == 2) {
    if (seconds_left_in_period < 120) {
      playclock_urgency = 6;
    }
  } else if (
    (period == 3 && seconds_left_in_period < 360) ||
    (period == 4 && seconds_left_in_period > 360)
  ) {
    if (offensive_point_differential <= -12) {
      playclock_urgency = 5;
    } else if (offensive_point_differential >= 12) {
      playclock_urgency = 3;
    } else if (offensive_point_differential >= 17) {
      playclock_urgency = 2;
    } else if (offensive_point_differential >= 25) {
      playclock_urgency = 1;
    }
  } else if (period == 4 && seconds_left_in_period < 360) {
    if (offensive_point_differential < 0) {
      playclock_urgency = 7;
    } else {
      playclock_urgency = 1;
    }
  }

  return {
    playclock_urgency: playclock_urgency,
    play_choice_options: play_choice_options || default_play_choice_options,
  };
};

const update_player_energy = (
  game_dict,
  players_on_field,
  bench_players,
  plays_since_last_sub,
  is_home_team
) => {
  let position_fatigue_rate_map = {
    QB: 0.005,
    RB: 0.015,
    FB: 0.025,
    WR: 0.015,
    TE: 0.015,
    OT: 0.005,
    IOL: 0.005,
    DL: 0.015,
    EDGE: 0.02,
    LB: 0.015,
    CB: 0.01,
    S: 0.01,
    K: 0.001,
    P: 0.001,
  };

  let home_field_advantage_modifier = game_dict.home_field_advantage_modifier;

  if (!is_home_team) {
    home_field_advantage_modifier = 1 / home_field_advantage_modifier;
  }

  for (let player_obj of players_on_field) {
    player_obj.player_team_game.game_attrs.energy -=
      position_fatigue_rate_map[player_obj.player.position] * plays_since_last_sub;
    player_obj.player_team_game.game_attrs.energy = Math.max(
      player_obj.player_team_game.game_attrs.energy,
      0.0
    );
  }
  for (let player_obj of bench_players) {
    player_obj.player_team_game.game_attrs.energy += 0.01 * plays_since_last_sub;
    player_obj.player_team_game.game_attrs.energy = Math.min(
      player_obj.player_team_game.game_attrs.energy,
      1.0
    );
  }

  players_on_field.forEach(
    (player_obj) =>
      (player_obj.player_team_game.game_attrs.adjusted_overall =
        player_obj.player_team_game.game_attrs.energy ** 0.25 *
        home_field_advantage_modifier *
        player_obj.player_team_season.ratings.overall.overall)
  );
  bench_players.forEach(
    (player_obj) =>
      (player_obj.player_team_game.game_attrs.adjusted_overall =
        player_obj.player_team_game.game_attrs.energy ** 0.25 *
        home_field_advantage_modifier *
        player_obj.player_team_season.ratings.overall.overall)
  );

  // console.log({bench_players:bench_players, players_on_field:players_on_field})
};

const sim_game = (game_dict, common) => {
  common.stopwatch(common, `Stopwatch game ${game_dict.game.game_id}`);
  //   console.log('Simming game', game_dict)
  game_dict.game.team_games;

  if (game_dict.game.was_played) {
    return 0;
  }

  var scores = {},
    team_game_info = {};
  var game_info = [];
  $.each(game_dict.team_games, function (ind, team_game) {
    team_game_info = {};
    team_game_info.depth_chart = game_dict.team_seasons[ind].depth_chart;
    team_game_info.coaches = {};
    team_game_info.player_team_seasons = {};

    scores[team_game.team_game_id] = 0;

    game_info.push(team_game_info);
  });
  var scoring = {
    periods: [],
    final: [0, 0],
    drives: [],
  };

  var down_efficiency_map = {
    1: 0.5,
    2: 0.7,
    3: 1.0,
  };

  var offensive_team_index = 0,
    defensive_team_index = 1,
    points_this_drive = 0,
    scoring_period = {};

  game_dict.home_field_advantage_modifier = game_dict.game.is_neutral_site_game ? 1.0 : 1.03;
  if (game_dict.teams[1].school_name == "SMU" || game_dict.teams[0].school_name == "TCU") {
    game_dict.home_field_advantage_modifier = 1.03;
  } else if (game_dict.teams[0].school_name == "SMU" || game_dict.teams[1].school_name == "TCU") {
    game_dict.home_field_advantage_modifier = 0.97;
  }

  var drive_within_20 = false;
  var drive_within_40 = false;

  var seconds_per_period = 15 * 60;
  var seconds_left_in_period = seconds_per_period;
  var periods = [1, 2, 3, 4];
  var seconds_this_play = 60 * 3;
  var offense_point_differential = 0;
  var plays_since_last_sub = 0;
  var field_position = 20,
    first_down = true,
    drive_end = false,
    seconds_this_drive = 0,
    plays_this_drive = 0,
    yards_this_drive = 0,
    punt_distance = 0;
  var drive_summary = {
    drive_end: {
      period: null,
      seconds_in_to_game: null,
      home_team_points: null,
      away_team_points: null,
    },
    plays: [],
  };

  Object.entries(game_dict.player_team_games).forEach(
    ([player_team_season_id, ptg]) => (ptg.game_attrs = { energy: 1.0 })
  );

  home_team_players = pick_players_on_field(
    game_info[offensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,
    60 * 15,
    0
  );
  away_team_players = pick_players_on_field(
    game_info[defensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,
    60 * 15,
    0
  );

  var all_players_both_teams = home_team_players.all_players.concat(away_team_players.all_players);
  for (var player_obj of all_players_both_teams) {
    player_obj.player_team_game.game_stats.games.games_started = 1;
  }

  for (const period of periods) {
    scoring_period = { period_number: period, points: [0, 0] };

    // if (period == 1) {
    //   scoring_period.drives.push({
    //     drive_end: {
    //       play_type: "KICK",
    //       is_scoring_drive: false,
    //       drive_event_class: "DriveEndingEvent-All w3-hide",
    //       display_team_id: game_dict.teams[offensive_team_index].team_id,
    //       period: 1,
    //       seconds_in_to_game: 0,
    //       home_team_points: 0,
    //       away_team_points: 0,
    //     },
    //     plays: [],
    //   });
    // }

    seconds_left_in_period = seconds_per_period;

    while (seconds_left_in_period > 0) {
      if (first_down) {
        yards_to_go = 10;
        down = 1;

        offense_point_differential =
          scoring.final[offensive_team_index] - scoring.final[defensive_team_index];

        offensive_team_players = pick_players_on_field(
          game_info[offensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "offense",
          period,
          seconds_left_in_period,
          offense_point_differential
        );
        defensive_team_players = pick_players_on_field(
          game_info[defensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "defense",
          period,
          seconds_left_in_period,
          -1 * offense_point_differential
        );

        all_players_both_teams = offensive_team_players.all_players.concat(
          defensive_team_players.all_players
        );
        for (var player_obj of all_players_both_teams) {
          player_obj.player_team_game.game_stats.games.games_played = 1;
        }

        update_player_energy(
          game_dict,
          offensive_team_players.all_players,
          offensive_team_players.bench_players,
          plays_since_last_sub,
          offensive_team_index
        );
        update_player_energy(
          game_dict,
          defensive_team_players.all_players,
          defensive_team_players.bench_players,
          plays_since_last_sub,
          defensive_team_index
        );

        let qb_ovrs_to_add = [];
        for (let i = 0; i <= 4; i++) {
          qb_ovrs_to_add.push(
            offensive_team_players.by_position.QB[0].player_team_game.game_attrs.adjusted_overall
          );
        }
        let offense_players_ovrs = offensive_team_players.all_players
          .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
          .concat(qb_ovrs_to_add);

        offensive_player_average_overall = average(offense_players_ovrs);

        defensive_player_average_overall = average(
          defensive_team_players.all_players.map(
            (player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall
          )
        );

        offensive_player_average_overall_difference = Math.floor(
          offensive_player_average_overall - defensive_player_average_overall
        );

        plays_since_last_sub = 0;
      }

      first_down = false;
      clock_running = true;
      yards_this_play = 0;
      points_this_drive = 0;
      plays_since_last_sub += 1;
      play_details = { yards: null, description: null };
      playcall_obj = game_sim_play_call_options(
        down,
        yards_to_go,
        field_position,
        period,
        offense_point_differential,
        seconds_left_in_period);

      play_choice_options = playcall_obj.play_choice_options;
      play_choice_options.pass = parseInt(
        (play_choice_options.pass || 0) *
          (game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency / 50.0)
      );
      play_choice_options.run = parseInt(
        (play_choice_options.run || 0) *
          ((100 - game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency) /
            50.0)
      );
      playclock_urgency = playcall_obj.playclock_urgency;
      play_choice = weighted_random_choice(play_choice_options);
      if (play_choice == "qb_kneel") {
        play_choice = "run";
      }

      play_details.play_choice = play_choice;

      if (play_choice == "pass") {
        chosen_qb_index = 0;

        chosen_players = {
          QB: offensive_team_players.by_position["QB"][0],
          OT_List: offensive_team_players.by_position["OT"].concat(
            offensive_team_players.by_position["IOL"]
          ),
        };

        var valid_pass_catchers = offensive_team_players.by_position["WR"]
          .concat(offensive_team_players.by_position["TE"])
          .concat(offensive_team_players.by_position["RB"]);
        var valid_pass_catchers_weights = valid_pass_catchers.map(function (player_obj) {
          var odds = player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
          if (player_obj.player_team_season.position == "TE") {
            odds *= 0.9;
          } else if (player_obj.player_team_season.position != "WR") {
            odds *= 0.4;
          }
          return [player_obj, odds];
        });
        chosen_players.Pass_Catcher = weighted_random_choice(valid_pass_catchers_weights);

        for (var PTS of chosen_players.OT_List) {
          PTS.player_team_game.game_stats.blocking.blocks += 1;
        }

        var r = -1;
        while (r < 0 || r > 1) {
          r =
            Math.random() /
            (offensive_player_average_overall / defensive_player_average_overall) ** 1.1;
        }

        if (r < 0.6) {
          //completion
          yards_this_play = Math.min(Math.floor(Math.random() * 23), 100 - field_position);

          if (r < 0.03) {
            yards_this_play = 100 - field_position;
          }

          chosen_players.QB.player_team_game.game_stats.passing.attempts += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.targets += 1;

          chosen_players.QB.player_team_game.game_stats.passing.completions += 1;
          chosen_players.QB.player_team_game.game_stats.passing.yards += yards_this_play;

          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.receptions += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.yards +=
            yards_this_play;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.lng = Math.max(
            chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.lng,
            yards_this_play
          );
        } else if (r < 0.9) {
          //incomplete
          // console.log({chosen_players:chosen_players, valid_pass_catchers:valid_pass_catchers, valid_pass_catchers_weights: valid_pass_catchers_weights, offensive_team_players:offensive_team_players})
          chosen_players.QB.player_team_game.game_stats.passing.attempts += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.targets += 1;

          yards_this_play = 0;
          clock_running = false;
        } else if (r < 0.96) {
          //sack
          chosen_players.QB.player_team_game.game_stats.passing.sacks += 1;

          chosen_players.OL_Sack_Allowed =
            chosen_players.OT_List[Math.floor(Math.random() * chosen_players.OT_List.length)];
          chosen_players.OL_Sack_Allowed.player_team_game.game_stats.blocking.sacks_allowed += 1;

          yards_this_play = Math.floor(Math.random() * 7) - 8;
        } else {
          //interception
          chosen_players.QB.player_team_game.game_stats.passing.ints += 1;

          var valid_interceptor = defensive_team_players.by_position["CB"]
            .concat(defensive_team_players.by_position["S"])
            .concat(defensive_team_players.by_position["LB"]);
          var valid_interceptor_weights = valid_interceptor.map(function (player_obj) {
            var odds = player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
            if (player_obj.player_team_season.position == "S") {
              odds *= 0.8;
            } else if (player_obj.player_team_season.position != "CB") {
              odds *= 0.4;
            }
            return [player_obj, odds];
          });
          chosen_players.Interceptor = weighted_random_choice(valid_interceptor_weights);

          chosen_players.Interceptor.player_team_game.game_stats.defense.ints += 1;

          game_dict.team_games[offensive_team_index].game_stats.team.turnovers += 1;

          play_details.yards = 0;
          play_details.play_player_ids = [
            chosen_players.QB.player.player_id,
            chosen_players.Interceptor.player.player_id,
          ];
          //play_details.description = `<a href="${chosen_players.QB.player.player_href}">${chosen_players.QB.player.full_name}</a> intercepted by <a href="${chosen_players.Interceptor.player.player_href}">${chosen_players.Interceptor.player.full_name}</a>`;

          drive_summary.drive_end.play_type = "INT";
          drive_summary.drive_end.play_description = `{player_0} intercepted by {player_1}`;
          drive_summary.drive_end.play_player_ids = [
            chosen_players.QB.player.player_id,
            chosen_players.Interceptor.player.player_id,
          ];

          drive_end = true;
          yards_this_play = 0;
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [
          chosen_players.QB.player.player_id,
          chosen_players.Pass_Catcher.player.player_id,
        ];
        play_details.description = `{player_0} ${yards_this_play} yard pass to {player_1}`;
      } else if (play_choice == "run") {
        offensive_front_7_average_overall = average(
          offensive_team_players.by_position["OT"]
            .concat(offensive_team_players.by_position["IOL"])
            .concat(offensive_team_players.by_position["RB"])
            .concat(offensive_team_players.by_position["TE"])
            .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
        );
        defensive_front_7_average_overall = average(
          defensive_team_players.by_position["DL"]
            .concat(defensive_team_players.by_position["EDGE"])
            .concat(defensive_team_players.by_position["LB"])
            .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
        );

        yards_this_play = Math.min(
          Math.floor(
            Math.random() *
              (12.5 *
                (offensive_front_7_average_overall / defensive_front_7_average_overall) ** 1.4)
          ) - 2,
          100 - field_position
        );

        let runner_random = Math.random();

        if (runner_random < 0.92) {
          chosen_players = {
            Runner: offensive_team_players.by_position["RB"][0],
          };
        } else if (runner_random < 0.97) {
          chosen_players = {
            Runner: offensive_team_players.by_position["QB"][0],
          };
        } else {
          chosen_wr_index = Math.floor(
            Math.random() * offensive_team_players.by_position["WR"].length
          );
          chosen_players = {
            Runner: offensive_team_players.by_position["WR"][chosen_wr_index],
          };
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [chosen_players.Runner.player.player_id];
        play_details.description = `{player_0} ${yards_this_play} yard run`;

        chosen_players.Runner.player_team_game.game_attrs.energy -= 0.01;

        chosen_players.Runner.player_team_game.game_stats.rushing.carries += 1;
        chosen_players.Runner.player_team_game.game_stats.rushing.yards += yards_this_play;
        //console.log('Lng run', {'chosen_players.Runner.player_team_game.game_stats.rushing.lng': chosen_players.Runner.player_team_game.game_stats.rushing.lng, 'yards_this_play': yards_this_play, 'Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)': Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)})
        chosen_players.Runner.player_team_game.game_stats.rushing.lng = Math.max(
          chosen_players.Runner.player_team_game.game_stats.rushing.lng,
          yards_this_play
        );
      } else if (play_choice == "field_goal") {
        drive_end = true;
        kick_distance = 117 - field_position;
        chosen_players = {
          K: offensive_team_players.by_position["K"][0],
        };

        var distance_key = "";

        if (kick_distance > 50) {
          distance_key = "50";
        } else if (kick_distance > 39) {
          distance_key = "49";
        } else if (kick_distance > 29) {
          distance_key = "39";
        } else {
          distance_key = "29";
        }

        kick_odds = 0.9;
        if (kick_distance > 60) {
          kick_odds -= 0.899;
        } else if (kick_distance > 55) {
          kick_odds -= 0.875;
        } else if (kick_distance > 45) {
          kick_odds -= 0.65;
        } else if (kick_distance > 35) {
          kick_odds -= 0.325;
        } else if (kick_distance > 25) {
          kick_odds -= 0.1;
        }

        chosen_players.K.player_team_game.game_stats.kicking.fga += 1;
        chosen_players.K.player_team_game.game_stats.kicking[`fga_${distance_key}`] += 1;

        play_details.yards = 0;
        play_details.description = `${kick_distance} yard field goal MISSED`;

        drive_summary.drive_end.play_type = "FG MISS";
        drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
        drive_summary.drive_end.play_description = `{player_0} MISSED ${kick_distance} yard field goal`;

        kick_made = false;
        if (Math.random() < kick_odds) {
          kick_made = true;
          points_this_drive = 3;

          play_details.description = `${kick_distance} yard field goal MADE`;

          drive_summary.drive_end.play_type = "FG MADE";
          drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
          drive_summary.drive_end.play_description = `{player_0} MADE ${kick_distance} yard field goal`;

          chosen_players.K.player_team_game.game_stats.kicking.fgm += 1;
          chosen_players.K.player_team_game.game_stats.kicking[`fgm_${distance_key}`] += 1;
          chosen_players.K.player_team_game.game_stats.kicking.lng = Math.max(
            chosen_players.K.player_team_game.game_stats.kicking.lng,
            kick_distance
          );
          chosen_players.K.player_team_game.game_stats.games.points += 3;
        }
      } else if (play_choice == "punt") {
        drive_end = true;
        yards_this_play = 0;

        punt_distance = Math.min(Math.floor(Math.random() * 40) + 20, 99 - field_position);
        chosen_players = {
          P: offensive_team_players.by_position["P"][0],
        };

        chosen_players.P.player_team_game.game_stats.punting.punts += 1;
        chosen_players.P.player_team_game.game_stats.punting.yards += punt_distance;
        chosen_players.P.player_team_game.game_stats.punting.lng = Math.max(
          chosen_players.P.player_team_game.game_stats.punting.lng,
          punt_distance
        );

        play_details.yards = 0;
        play_details.description = `${punt_distance} yard punt`;

        drive_summary.drive_end.play_type = "PUNT";
        drive_summary.drive_end.play_player_ids = [chosen_players.P.player.player_id];
        drive_summary.drive_end.play_description = `{player_0} ${punt_distance} yard punt`;
      }

      if (down <= 3) {
        game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency[down].total += 1;
        game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency.all.total += 1;
        if (yards_this_play >= down_efficiency_map[down] * yards_to_go) {
          game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency[
            down
          ].success += 1;
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.down_efficiency.all.success += 1;
        }
      }

      field_position += yards_this_play;
      yards_this_drive += yards_this_play;
      yards_to_go -= yards_this_play;
      plays_this_drive += 1;

      if (field_position >= 60) {
        drive_within_40 = true;
        if (field_position >= 80) {
          drive_within_20 = true;
        }
      }

      if (yards_to_go <= 0) {
        first_down = true;

        game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.total += 1;

        if (play_choice == "pass") {
          game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.passing += 1;
        } else if (play_choice == "run") {
          game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.rushing += 1;
        }
      }

      if (field_position >= 100) {
        drive_end = true;
        points_this_drive = 7;

        chosen_players.K = offensive_team_players.by_position["K"][0];
        chosen_players.K.player_team_game.game_stats.games.points += 1;
        chosen_players.K.player_team_game.game_stats.kicking.xpa += 1;
        chosen_players.K.player_team_game.game_stats.kicking.xpm += 1;

        if (play_choice == "pass") {
          chosen_players.QB.player_team_game.game_stats.passing.tds += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.tds += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.games.points += 6;
        } else if (play_choice == "run") {
          chosen_players.Runner.player_team_game.game_stats.rushing.tds += 1;
          chosen_players.Runner.player_team_game.game_stats.games.points += 6;
        }
      } else {
        if (play_choice == "pass" || play_choice == "run") {
          var chosen_tackler_player_team_season =
            defensive_team_players.all_players[
              Math.floor(Math.random() * defensive_team_players.all_players.length)
            ];

          chosen_players = {
            Tackler: {
              player: game_dict.players[chosen_tackler_player_team_season.player_id],
              player_team_game:
                game_dict.player_team_games[
                  chosen_tackler_player_team_season.player_team_season_id
                ],
              player_team_season: chosen_tackler_player_team_season,
            },
          };

          chosen_players.Tackler.player_team_game.game_stats.defense.tackles += 1;

          if (yards_this_play < 0) {
            chosen_players.Tackler.player_team_game.game_stats.defense.tackles_for_loss += 1;

            if (play_choice == "pass") {
              chosen_players.Tackler.player_team_game.game_stats.defense.sacks += 1;
            }
          }
        }
      }

      if (down == 3) {
        game_dict.team_games[offensive_team_index].game_stats.team.downs.third_downs.attempts += 1;
        if (first_down) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.third_downs.conversions += 1;
        }
      } else if (down == 4 && ("pass" == play_choice || "run" == play_choice)) {
        game_dict.team_games[offensive_team_index].game_stats.team.downs.fourth_downs.attempts += 1;
        if (first_down) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.fourth_downs.conversions += 1;
        }
      }

      play_details.down = down;
      down += 1;

      if (down > 4 && !first_down) {
        drive_end = true;

        if ("pass" == play_choice || "run" == play_choice) {
          drive_summary.drive_end.play_type = "TO-D";
          drive_summary.drive_end.drive_description = "Turnover on downs";

          drive_summary.drive_end.play_description = "Turnover on downs";
        }
      }

      if (clock_running) {
        seconds_this_play = Math.floor(Math.random() * 10) + (33 - playclock_urgency * 4);
      } else {
        seconds_this_play = Math.floor(Math.random() * 4) + 1;
      }

      seconds_this_play = Math.min(seconds_this_play, seconds_left_in_period);

      seconds_left_in_period = seconds_left_in_period - seconds_this_play;
      seconds_this_drive += seconds_this_play;
      game_dict.team_games[offensive_team_index].game_stats.team.time_of_possession +=
        seconds_this_play;

      //drive_summary.plays.push(play_details);

      if (drive_end) {
        scoring_period.points[offensive_team_index] += points_this_drive;
        scoring.final[offensive_team_index] += points_this_drive;
        seconds_in_to_game =
          (period - 1) * seconds_per_period + (seconds_per_period - seconds_left_in_period);

        if (points_this_drive > 0) {
          drive_summary.drive_end.is_scoring_drive = true;

          if (offensive_team_index == 0) {
            drive_summary.drive_end.away_team_bold = "bold";
          } else {
            drive_summary.drive_end.home_team_bold = "bold";
          }

          drive_summary.drive_end.drive_description = `${plays_this_drive} plays, ${yards_this_drive} yards, ${seconds_to_time(
            seconds_this_drive
          )}`;

          if (points_this_drive == 3) {
            drive_summary.drive_end.play_type = "FG";
            drive_summary.drive_end.play_description = `{player_0} makes ${kick_distance} yard field goal`;
            drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
          } else {
            drive_summary.drive_end.play_type = "TD";
            drive_summary.drive_end.drive_description += " - Extra point good";
            drive_summary.drive_end.play_description = play_details.description + " for a TD";
            drive_summary.drive_end.play_player_ids = play_details.play_player_ids;
          }

          field_position = 20;
        } else {
          drive_summary.drive_end.is_scoring_drive = false;

          drive_summary.drive_end.drive_description = `${plays_this_drive} plays, ${yards_this_drive} yards, ${seconds_to_time(
            seconds_this_drive
          )}`;

          if (play_choice == "punt") {
            field_position += punt_distance;

            if (field_position >= 98) {
              field_position = 90;
            }
          }
          field_position = 100 - field_position;
        }

        drive_summary.drive_end.period = period;
        drive_summary.drive_end.seconds_in_to_game = seconds_in_to_game;
        drive_summary.drive_end.home_team_points = scoring.final[1];
        drive_summary.drive_end.away_team_points = scoring.final[0];
        drive_summary.drive_end.display_team_id = game_dict.teams[offensive_team_index].team_id;

        game_dict.team_games[offensive_team_index].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[offensive_team_index].game_stats.team.biggest_lead,
          scoring.final[offensive_team_index] - scoring.final[defensive_team_index]
        );
        game_dict.team_games[defensive_team_index].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[defensive_team_index].game_stats.team.biggest_lead,
          scoring.final[defensive_team_index] - scoring.final[offensive_team_index]
        );

        //scoring_period.drives.push(drive_summary);
        scoring.drives.push(drive_summary);

        game_dict.team_games[offensive_team_index].game_stats.team.possessions += 1;
        game_dict.team_games[offensive_team_index].game_stats.team.points =
          scoring.final[offensive_team_index];

        if (drive_end && points_this_drive > 0 && period > 4) {
          seconds_left_in_period = 0;
        }

        if (drive_within_20) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.drive_efficiency[20].total_trips += 1;
          if (points_this_drive > 0) {
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[20].scores += 1;
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[20].total_points += points_this_drive;
          }
        }
        if (drive_within_40) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.drive_efficiency[40].total_trips += 1;
          if (points_this_drive > 0) {
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[40].scores += 1;
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[40].total_points += points_this_drive;
          }
        }

        offensive_team_index = (offensive_team_index + 1) % 2;
        defensive_team_index = (defensive_team_index + 1) % 2;

        game_dict.team_games[offensive_team_index].game_stats.team.field_position.total_drives += 1;
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.field_position.total_start_yard += field_position;

        first_down = true;

        points_this_drive = 0;
        yards_this_drive = 0;
        seconds_this_drive = 0;
        plays_this_drive = 0;
        drive_end = false;
        drive_within_20 = false;
        drive_within_40 = false;

        drive_summary = { drive_end: {} };
      }
    }

    if (period == Math.max(...periods) && scoring.final[0] == scoring.final[1]) {
      periods.push(period + 1);
    } else if (period == Math.max(...periods)) {
      var drive = {
        drive_end: {
          play_type: "FINAL",
          drive_description: "Game Over",
          is_scoring_drive: false,
          display_team_id: game_dict.teams[offensive_team_index].team_id,
          period: period,
          seconds_in_to_game: period * seconds_per_period,
          home_team_points: scoring.final[1],
          away_team_points: scoring.final[0],
        },
        plays: [],
      };
      //scoring_period.drives.push(drive);
      scoring.drives.push(drive);
    }

    scoring.periods.push(scoring_period);
  }

  //   console.log('Done simming!',scoring, `${game_dict.teams[offensive_team_index].school_name} vs ${game_dict.teams[defensive_team_index].school_name}`)

  game_dict.game.was_played = true;
  game_dict.game.scoring = scoring;

  game_dict.team_games[0].points = scoring.final[0];
  game_dict.team_games[1].points = scoring.final[1];

  game_dict.team_games[0].national_rank = game_dict.team_seasons[0].rankings.national_rank[0];
  game_dict.team_games[1].national_rank = game_dict.team_seasons[1].rankings.national_rank[0];

  const is_conference_game =
    game_dict.team_seasons[0].conference_season_id ==
    game_dict.team_seasons[1].conference_season_id;

  var winning_team_index = -1,
    losing_team_index = -1;
  if (scoring.final[0] > scoring.final[1]) {
    winning_team_index = 0;
    losing_team_index = 1;
  } else {
    winning_team_index = 1;
    losing_team_index = 0;
  }

  game_dict.winning_team_index = winning_team_index;
  game_dict.losing_team_index = losing_team_index;

  generate_headlines(game_dict, common);

  game_dict.team_games[winning_team_index].is_winning_team = true;
  game_dict.team_games[losing_team_index].is_winning_team = false;

  game_dict.team_games[winning_team_index].game_outcome_letter = "W";
  game_dict.team_games[losing_team_index].game_outcome_letter = "L";

  game_dict.team_seasons[winning_team_index].record.wins += 1;
  game_dict.team_seasons[losing_team_index].record.losses += 1;

  if (game_dict.team_seasons[winning_team_index].record.win_streak >= 0) {
    game_dict.team_seasons[winning_team_index].record.win_streak += 1;
  } else {
    game_dict.team_seasons[winning_team_index].record.win_streak = 1;
  }

  if (game_dict.team_seasons[losing_team_index].record.win_streak > 0) {
    game_dict.team_seasons[losing_team_index].record.win_streak = -1;
  } else {
    game_dict.team_seasons[losing_team_index].record.win_streak -= 1;
  }

  game_dict.team_seasons[winning_team_index].record.defeated_teams.push(
    game_dict.team_seasons[losing_team_index].team_season_id
  );

  if (is_conference_game) {
    game_dict.team_seasons[winning_team_index].record.conference_wins += 1;
    game_dict.team_seasons[losing_team_index].record.conference_losses += 1;
  }

  game_dict.game.outcome = {
    winning_team: {
      team_id: game_dict.teams[winning_team_index].team_id,
      team_season_id: game_dict.team_seasons[winning_team_index].team_season_id,
      team_game_id: game_dict.team_games[winning_team_index].team_game_id,
      points: scoring.final[winning_team_index],
    },
    losing_team: {
      team_id: game_dict.teams[losing_team_index].team_id,
      team_season_id: game_dict.team_seasons[losing_team_index].team_season_id,
      team_game_id: game_dict.team_games[losing_team_index].team_game_id,
      points: scoring.final[losing_team_index],
    },
  };

  game_dict.team_seasons[0].record.conference_net_wins =
    game_dict.team_seasons[0].record.conference_wins -
    game_dict.team_seasons[0].record.conference_losses;
  game_dict.team_seasons[1].record.conference_net_wins =
    game_dict.team_seasons[1].record.conference_wins -
    game_dict.team_seasons[1].record.conference_losses;

  game_dict.team_seasons[0].record.net_wins =
    game_dict.team_seasons[0].record.wins - game_dict.team_seasons[0].record.losses;
  game_dict.team_seasons[1].record.net_wins =
    game_dict.team_seasons[1].record.wins - game_dict.team_seasons[1].record.losses;

  game_dict.team_seasons[0].record.games_played += 1;
  game_dict.team_seasons[1].record.games_played += 1;

  game_dict.team_games[0].record = game_dict.team_seasons[0].record;
  game_dict.team_games[1].record = game_dict.team_seasons[1].record;

  game_dict.team_seasons[0].top_stats = [];
  game_dict.team_seasons[1].top_stats = [];

  for (var player_team_season_id in game_dict.player_team_games) {
    let pts = game_dict.player_team_seasons[player_team_season_id];
    let ptg = game_dict.player_team_games[player_team_season_id];

    let player_team_index = 1;
    if (pts.team_season_id == game_dict.team_seasons[0].team_season_id) {
      player_team_index = 0;
    }

    let ts = game_dict.team_seasons[player_team_index];
    let tg = game_dict.team_games[player_team_index];
    let opponent_team_game = game_dict.team_games[(player_team_index + 1) % 2];

    for (var stat_group in ptg.game_stats) {
      if (stat_group == "top_stats") {
        continue;
      }

      for (var stat in ptg.game_stats[stat_group]) {
        var stat_value = ptg.game_stats[stat_group][stat];
        if (stat_value != 0) {
          if (stat == "lng") {
            tg.game_stats[stat_group][stat] = Math.max(tg.game_stats[stat_group][stat], stat_value);
            pts.season_stats[stat_group][stat] = Math.max(
              pts.season_stats[stat_group][stat],
              stat_value
            );
          } else {
            tg.game_stats[stat_group][stat] =
              (tg.game_stats[stat_group][stat] || 0) + (stat_value || 0);
            pts.season_stats[stat_group][stat] =
              (pts.season_stats[stat_group][stat] || 0) + (stat_value || 0);
          }
        }
      }
    }

    calculate_game_score(ptg, pts, tg, ts, opponent_team_game);
  }

  for (const team_index of [0, 1]) {
    var team_game = game_dict.team_games[team_index];
    var team_season = game_dict.team_seasons[team_index];

    var opponent_team_index = (team_index + 1) % 2;
    opponent_team_game = game_dict.team_games[opponent_team_index];
    opponent_team_season = game_dict.team_seasons[opponent_team_index];

    opponent_team_game.opponent_game_stats = deep_copy$1(team_game.game_stats);

    // console.log({'team_game': team_game, 'team_season': team_season})
    // console.log({'team_game.game_stats': team_game.game_stats, 'team_season.stats.season_stats': team_season.stats.season_stats})
    increment_parent(team_game.game_stats, team_season.stats.season_stats);
    increment_parent(team_game.game_stats, opponent_team_season.stats.opponent_season_stats);
  }

  game_dict.team_seasons[0].top_stats = game_dict.team_seasons[0].top_stats.slice(0, 4);
  game_dict.team_seasons[1].top_stats = game_dict.team_seasons[1].top_stats.slice(0, 4);

  game_dict.team_games[0].top_stats = game_dict.team_games[0].top_stats.slice(0, 4);
  game_dict.team_games[1].top_stats = game_dict.team_games[1].top_stats.slice(0, 4);

  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-final-span`).text(
    "Final"
  );
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-home-score`).text(
    scoring.final[1]
  );
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-away-score`).text(
    scoring.final[0]
  );

  let modal_winning_team_suffix = game_dict.team_games[winning_team_index].is_home_team
    ? "home"
    : "away";

  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-team-name`
  ).addClass("bold");
  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-score`
  ).prepend(
    `<i class="fas fa-caret-right" style="padding-right: .25rem; color:#${game_dict.teams[winning_team_index].team_color_primary_hex};"></i>`
  );
  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-score`
  ).addClass("bold");

  return game_dict;
};

const sim_week_games = async (this_week, common) => {
  $(".modal-body").empty();
  $(".modal-body").append(
    `<div class='width100 left-text'>Simulating <span class=''>${this_week.week_name}</span></div>`
  );

  var url = "/static/html_templates/common_templates/sim_game_modal_result_table.njk";
  var html = await fetch(url);
  html = await html.text();

  if (!window.playcall) {
    var playcall_url = "/static/data/import_json/playcall.json";
    var playcall_html = await fetch(playcall_url);
    window.playcall = await playcall_html.json();
  }

  const db = await common.db;
  var startTime = performance.now();
  common.startTime = startTime;

  var team_games_this_week = await db.team_game.where({ week_id: this_week.week_id }).toArray();
  team_games_by_game_id = index_group_sync$1(team_games_this_week, "group", "game_id");

  var team_season_ids_playing_this_week = team_games_this_week.map((tg) => tg.team_season_id);

  let [team_seasons, team_season_stats] = await Promise.all([
    db.team_season.bulkGet(team_season_ids_playing_this_week),
    db.team_season_stats.bulkGet(team_season_ids_playing_this_week),
  ]);

  const team_season_stats_by_team_season_id = index_group_sync$1(
    team_season_stats,
    "index",
    "team_season_id"
  );
  team_seasons = nest_children$1(
    team_seasons,
    team_season_stats_by_team_season_id,
    "team_season_id",
    "stats"
  );

  let user_team_season = team_seasons.find((ts) => ts.is_user_team);
  let user_team_season_id = user_team_season ? user_team_season.team_season_id : 0;

  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  let [teams, player_team_seasons] = await Promise.all([
    db.team.where("team_id").above(0).toArray(),
    db.player_team_season
      .where("team_season_id")
      .anyOf(team_season_ids_playing_this_week)
      .toArray(),
  ]);

  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");
  var player_team_seasons_by_team_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  var player_ids = new Set(player_team_seasons.map((pts) => pts.player_id));
  var player_team_season_ids = new Set(player_team_seasons.map((pts) => pts.player_team_season_id));

  const player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_ids: { $in: player_team_season_ids },
  });
  const player_team_season_stats_by_player_team_season_id = index_group_sync$1(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  player_team_seasons = nest_children$1(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );

  let player_team_game_id_counter = db.player_team_game.nextId("player_team_game_id");
  let headline_id_counter = db.headline.nextId("headline_id");
  let players = db.player.find({ player_id: { $in: player_ids } });
  let games_this_week = db.game.find({ week_id: this_week.week_id });

  const players_by_player_id = index_group_sync$1(players, "index", "player_id");

  games_this_week = games_this_week.filter((g) => g.was_played == false);
  games_this_week = games_this_week.sort(function (g_a, g_b) {
    if (
      g_a.home_team_season_id == user_team_season_id ||
      g_a.away_team_season_id == user_team_season_id
    ) {
      return -1;
    } else if (
      g_b.home_team_season_id == user_team_season_id ||
      g_b.away_team_season_id == user_team_season_id
    ) {
      return 1;
    } else {
      return g_a.summed_national_rank - g_b.summed_national_rank;
    }
  });

  var game_dicts_this_week = [];
  common.headline_id_counter = headline_id_counter;

  games_this_week.forEach(function (game) {
    game_dict = { game: game };
    let team_games = team_games_by_game_id[game.game_id].sort(function (a, b) {
      if (a.is_home_team) return 1;
      if (b.is_home_team) return -1;
      return 0;
    });

    team_seasons = [];
    teams = [];

    for (let tg of team_games) {
      team_seasons.push(team_seasons_by_team_season_id[tg.team_season_id]);
    }

    for (let ts of team_seasons) {
      teams.push(teams_by_team_id[ts.team_id]);
    }

    game_dict.team_games = team_games;
    game_dict.team_seasons = team_seasons;
    game_dict.teams = teams;

    game_dicts_this_week.push(game_dict);

    console.log({ game_dict: game_dict });

    let renderedHtml = common.nunjucks_env.renderString(html, game_dict);
    $(".modal-body").append(renderedHtml);
  });

  for (const game_dict of game_dicts_this_week) {
    var ind = 0;
    player_team_seasons = [];
    players = [];
    players_list = [];
    player_team_games = {};

    for (let team_season of game_dict.team_seasons) {
      var player_team_seasons_to_add = index_group_sync$1(
        player_team_seasons_by_team_season_id[team_season.team_season_id],
        "index",
        "player_team_season_id"
      );
      player_team_seasons = {
        ...player_team_seasons,
        ...player_team_seasons_to_add,
      };

      for (let player_team_season_id in player_team_seasons_to_add) {
        pts = player_team_seasons_to_add[player_team_season_id];
        pts.games_played += 1;
        pts.team_games_played += 1;
        let new_player_team_game = new player_team_game(
          player_team_game_id_counter,
          game_dict.team_games[ind].team_game_id,
          pts.player_team_season_id
        );

        player_team_games[player_team_season_id] = new_player_team_game;

        player_team_game_id_counter += 1;
      }

      players_list = player_team_seasons_by_team_season_id[team_season.team_season_id].map(
        (pts) => players_by_player_id[pts.player_id]
      );

      var players_to_add = index_group_sync$1(players_list, "index", "player_id");
      players = { ...players, ...players_to_add };
      ind += 1;
    }

    game_dict.player_team_seasons = player_team_seasons;
    game_dict.players = players;
    game_dict.player_team_games = player_team_games;
    game_dict.headlines = [];
  }

  var completed_games = [],
    completed_game = undefined;

  for (const game_dict of game_dicts_this_week) {
    console.log({ game_dict: game_dict });
    completed_game = sim_game(game_dict, common);
    completed_games.push(completed_game);
  }

  common.stopwatch(common, "Done simming games");

  var game_ids_to_save = [];
  var games_to_save = [];

  var team_game_ids_to_save = [];
  var team_games_to_save = [];

  var team_seasons_to_save = [];
  var team_season_stats_to_save = [];
  var player_team_games_to_save = [];
  var player_team_seasons_to_save = [];
  var player_team_season_stats_to_save = [];
  var headlines_to_save = [];

  for (completed_game of completed_games) {
    game_ids_to_save.push(completed_game.game_id);

    delete completed_game.game.home_team_season;
    delete completed_game.game.away_team_season;

    games_to_save.push(completed_game.game);

    for (let tg of completed_game.team_games) {
      team_game_ids_to_save.push(tg.team_game_id);
      for (let [game_stat_group_name, game_stat_group] of Object.entries(tg.game_stats)) {
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)) {
          if (!stat_value) {
            delete tg.game_stats[game_stat_group_name][stat_name];
          }
        }
      }
      for (let [game_stat_group_name, game_stat_group] of Object.entries(tg.opponent_game_stats)) {
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)) {
          if (!stat_value) {
            delete tg.opponent_game_stats[game_stat_group_name][stat_name];
          }
        }
      }
      team_games_to_save.push(tg);
    }

    for (let ts of completed_game.team_seasons) {
      team_season_stats_to_save.push(ts.stats);
      delete ts.stats;
      delete ts.team_games;
      team_seasons_to_save.push(ts);
    }

    for ([player_team_game_id, ptg] of Object.entries(completed_game.player_team_games)) {
      if (ptg.game_stats.games.games_played > 0) {
        delete ptg.game_attrs;
        for (let [game_stat_group_name, game_stat_group] of Object.entries(ptg.game_stats)) {
          for (let [stat_name, stat_value] of Object.entries(game_stat_group)) {
            if (!stat_value) {
              // console.log({
              //   game_stat_group_name:game_stat_group_name, stat_name:stat_name, ptg:ptg, 'ptg.game_stats': ptg.game_stats
              // })
              delete ptg.game_stats[game_stat_group_name][stat_name];
            }
          }
        }
        player_team_games_to_save.push(ptg);
      }
    }

    for ([player_team_season_id, pts] of Object.entries(completed_game.player_team_seasons)) {
      for (let [game_stat_group_name, game_stat_group] of Object.entries(pts.season_stats)) {
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)) {
          if (!stat_value) {
            delete pts.season_stats[game_stat_group_name][stat_name];
          }
        }
      }

      player_team_season_stats_to_save.push(pts.season_stats);
      delete pts.season_stats;
      player_team_seasons_to_save.push(pts);
    }

    for (hdl of completed_game.headlines) {
      headlines_to_save.push(hdl);
    }
  }

  common.stopwatch(common, "Done compiling stats");

  await Promise.all([
    db.game.update(games_to_save),
    db.team_game.update(team_games_to_save),
    db.team_season.update(team_seasons_to_save),
    db.team_season_stats.update(team_season_stats_to_save),
    db.player_team_season_stats.update(player_team_season_stats_to_save),
    db.player_team_season.update(player_team_seasons_to_save),
    db.player_team_game.insert(player_team_games_to_save),
    db.headline.insert(headlines_to_save),
  ]);

  common.stopwatch(common, "Done compiling stats");

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
};

const calculate_team_needs = async (common, team_season_ids = null) => {
  var startTime = performance.now();

  const db = await common.db;
  const season = common.season;

  let team_seasons = [];

  if (!team_season_ids) {
    team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
    team_season_ids = team_seasons.map((ts) => ts.team_season_id);
  } else {
    team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
  }

  const player_team_seasons = db.player_team_season.find({
    team_season_id: { $in: team_season_ids },
  });
  const player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  const position_starters_map = {
    QB: [1, 0.05],
    RB: [1, 0.4],
    FB: [0.2],
    WR: [1, 1, 0.75, 0.25, 0.1],
    TE: [1, 0.5],
    OT: [1, 1, 0.2],
    IOL: [1, 1, 1, 0.2],
    EDGE: [1, 1, 0.5, 0.25],
    DL: [1, 0.9, 0.4, 0.25],
    LB: [1, 1, 1, 0.75, 0.25],
    CB: [1, 1, 0.6, 0.25],
    S: [1, 1, 0.4],
    K: [1],
    P: [1],
  };

  const overall_list = [99, 95, 90, 85, 80, 75, 70, 65, 60, 55, 45, 30, 0];

  const class_map = {
    SR: 0,
    "SR (RS)": 0,
    JR: 1,
    "JR (RS)": 1,
    SO: 2,
    "SO (RS)": 2,
    FR: 3,
    "FR (RS)": 3,
    "HS SR": 4,
  };

  for (const team_season of team_seasons) {
    team_season.recruiting.position_needs = {};
    for (const [position, player_team_season_ids] of Object.entries(
      team_season.depth_chart_with_recruits
    )) {
      team_season.recruiting.position_needs[position] = [];
      let position_player_overalls = player_team_season_ids.map((pts_id) => ({
        class_val: class_map[player_team_seasons_by_player_team_season_id[pts_id].class.class_name],
        class: player_team_seasons_by_player_team_season_id[pts_id].class.class_name,
        overall: player_team_seasons_by_player_team_season_id[pts_id].ratings.overall.overall,
      }));
      position_player_overalls = position_player_overalls.filter(
        (pts_obj) => pts_obj.class_val > 0
      );

      for (const overall of overall_list) {
        let overall_obj = { overall: overall, playing_time_val: 0 };
        for (const class_val of [1, 2, 3, 4]) {
          let year_position_player_overalls = position_player_overalls.filter(
            (pts_obj) => pts_obj.class_val >= class_val
          );
          let overall_index = year_position_player_overalls.findIndex(
            (pts_obj) => pts_obj.overall < overall
          );
          if (overall_index == -1) {
            overall_index = year_position_player_overalls.length;
          }
          let overall_playtime_modifier = position_starters_map[position][overall_index] || 0;
          overall_obj.playing_time_val += overall_playtime_modifier;
        }
        overall_obj.playing_time_val = Math.ceil(overall_obj.playing_time_val * 5);
        team_season.recruiting.position_needs[position].push(overall_obj);
      }
    }
  }

  // team_seasons.forEach((ts) => delete ts.recruiting);

  db.team_season.update(team_seasons);

  var endTime = performance.now();
  console.log(`Time taken to calculate_team_needs: ${parseInt(endTime - startTime)} ms`);
};

const calculate_team_overalls = async (common) => {
  const db = await common.db;
  const season = common.season;
  const team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  const position_map = {
    QB: { group: "Offense", unit: "QB", typical_starters: 1 },
    RB: { group: "Offense", unit: "RB", typical_starters: 1 },
    FB: { group: "Offense", unit: "FB", typical_starters: 1 },
    WR: { group: "Offense", unit: "REC", typical_starters: 2 },
    TE: { group: "Offense", unit: "REC", typical_starters: 1 },
    OT: { group: "Offense", unit: "OL", typical_starters: 2 },
    IOL: { group: "Offense", unit: "OL", typical_starters: 3 },

    EDGE: { group: "Defense", unit: "DL", typical_starters: 2 },
    DL: { group: "Defense", unit: "DL", typical_starters: 2 },
    LB: { group: "Defense", unit: "LB", typical_starters: 3 },
    CB: { group: "Defense", unit: "DB", typical_starters: 2 },
    S: { group: "Defense", unit: "DB", typical_starters: 2 },

    K: { group: "Special Teams", unit: "ST", typical_starters: 1 },
    P: { group: "Special Teams", unit: "ST", typical_starters: 1 },
  };

  var rating_min_max = {
    overall: { min: 100, max: 0 },
    by_position_group: {},
    by_position_unit: {},
    by_position: {},
  };

  for (const position in position_map) {
    var position_obj = position_map[position];
    if (!(position in rating_min_max.by_position)) {
      rating_min_max.by_position[position] = { min: 100, max: 0 };
    }
    if (!(position_obj.group in rating_min_max.by_position_group)) {
      rating_min_max.by_position_group[position_obj.group] = {
        min: 100,
        max: 0,
      };
    }
    if (!(position_obj.unit in rating_min_max.by_position_unit)) {
      rating_min_max.by_position_unit[position_obj.unit] = { min: 100, max: 0 };
    }
  }

  console.log({ team_seasons: team_seasons });
  var player_team_season_ids = team_seasons
    .map((ts) =>
      Object.entries(ts.depth_chart)
        .map((pos_obj) => pos_obj[1].slice(0, position_map[pos_obj[0]].typical_starters))
        .flat()
    )
    .flat();
  const player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  for (const team_season of team_seasons) {
    team_season.rating = {
      overall: { sum: 0, count: 0 },
      by_position: {},
      by_position_group: {},
      by_position_unit: {},
    };

    for (const position in position_map) {
      var position_obj = position_map[position];
      var position_unit = position_obj.unit;
      var position_group = position_obj.group;

      if (!(position in team_season.rating.by_position)) {
        team_season.rating.by_position[position] = { sum: 0, count: 0 };
      }
      if (!(position_group in team_season.rating.by_position_group)) {
        team_season.rating.by_position_group[position_group] = {
          sum: 0,
          count: 0,
        };
      }
      if (!(position_unit in team_season.rating.by_position_unit)) {
        team_season.rating.by_position_unit[position_unit] = {
          sum: 0,
          count: 0,
        };
      }

      var player_team_season_ids = team_season.depth_chart[position].slice(
        0,
        position_map[position].typical_starters
      );

      var overall_sum = player_team_season_ids
        .map(
          (pts_id) => player_team_seasons_by_player_team_season_id[pts_id].ratings.overall.overall
        )
        .reduce((acc, val) => acc + val, 0);

      team_season.rating.overall.count += position_map[position].typical_starters;
      team_season.rating.by_position[position].count += position_map[position].typical_starters;
      team_season.rating.by_position_group[position_group].count +=
        position_map[position].typical_starters;
      team_season.rating.by_position_unit[position_unit].count +=
        position_map[position].typical_starters;

      team_season.rating.overall.sum += overall_sum;
      team_season.rating.by_position[position].sum += overall_sum;
      team_season.rating.by_position_group[position_group].sum += overall_sum;
      team_season.rating.by_position_unit[position_unit].sum += overall_sum;
    }

    team_season.rating.overall = round_decimal$1(
      team_season.rating.overall.sum / team_season.rating.overall.count,
      1
    );

    rating_min_max.overall.max = Math.max(rating_min_max.overall.max, team_season.rating.overall);
    rating_min_max.overall.min = Math.min(rating_min_max.overall.min, team_season.rating.overall);

    for (const position in team_season.rating.by_position) {
      team_season.rating.by_position[position] = round_decimal$1(
        team_season.rating.by_position[position].sum /
          team_season.rating.by_position[position].count,
        1
      );

      rating_min_max.by_position[position].max = Math.max(
        rating_min_max.by_position[position].max,
        team_season.rating.by_position[position]
      );
      rating_min_max.by_position[position].min = Math.min(
        rating_min_max.by_position[position].min,
        team_season.rating.by_position[position]
      );
    }
    for (const position_group in team_season.rating.by_position_group) {
      team_season.rating.by_position_group[position_group] = round_decimal$1(
        team_season.rating.by_position_group[position_group].sum /
          team_season.rating.by_position_group[position_group].count,
        1
      );

      //	console.log({rating_min_max:rating_min_max, position_group:position_group, 'team_season.rating.by_position_group': team_season.rating.by_position_group})

      rating_min_max.by_position_group[position_group].max = Math.max(
        rating_min_max.by_position_group[position_group].max,
        team_season.rating.by_position_group[position_group]
      );
      rating_min_max.by_position_group[position_group].min = Math.min(
        rating_min_max.by_position_group[position_group].min,
        team_season.rating.by_position_group[position_group]
      );
    }
    for (const position_unit in team_season.rating.by_position_unit) {
      team_season.rating.by_position_unit[position_unit] = round_decimal$1(
        team_season.rating.by_position_unit[position_unit].sum /
          team_season.rating.by_position_unit[position_unit].count,
        1
      );

      rating_min_max.by_position_unit[position_unit].max = Math.max(
        rating_min_max.by_position_unit[position_unit].max,
        team_season.rating.by_position_unit[position_unit]
      );
      rating_min_max.by_position_unit[position_unit].min = Math.min(
        rating_min_max.by_position_unit[position_unit].min,
        team_season.rating.by_position_unit[position_unit]
      );
    }
  }

  var goal_overall_max = 99;
  var goal_overall_min = 40;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const team_season of team_seasons) {
    team_season.rating.overall = Math.floor(
      ((team_season.rating.overall - rating_min_max.overall.min) * goal_overall_range) /
        (rating_min_max.overall.max - rating_min_max.overall.min) +
        goal_overall_min
    );

    for (const position in team_season.rating.by_position) {
      team_season.rating.by_position[position] = Math.floor(
        ((team_season.rating.by_position[position] - rating_min_max.by_position[position].min) *
          goal_overall_range) /
          (rating_min_max.by_position[position].max - rating_min_max.by_position[position].min) +
          goal_overall_min
      );
    }
    for (const position_group in team_season.rating.by_position_group) {
      team_season.rating.by_position_group[position_group] = Math.floor(
        ((team_season.rating.by_position_group[position_group] -
          rating_min_max.by_position_group[position_group].min) *
          goal_overall_range) /
          (rating_min_max.by_position_group[position_group].max -
            rating_min_max.by_position_group[position_group].min) +
          goal_overall_min
      );
    }
    for (const position_unit in team_season.rating.by_position_unit) {
      team_season.rating.by_position_unit[position_unit] = Math.floor(
        ((team_season.rating.by_position_unit[position_unit] -
          rating_min_max.by_position_unit[position_unit].min) *
          goal_overall_range) /
          (rating_min_max.by_position_unit[position_unit].max -
            rating_min_max.by_position_unit[position_unit].min) +
          goal_overall_min
      );
    }
  }

  db.team_season.update(team_seasons);
};

const calculate_primetime_games = async (this_week, all_weeks, common) => {
  const db = common.db;
  const season = common.season;

  let next_week = db.week.findOne({ week_id: this_week.week_id + 1 });

  if (!next_week) {
    return null;
  }

  let games = db.game.find({ week_id: next_week.week_id });

  let teams = db.team.find();
  let teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  let team_seasons = db.team_season.find({ season: season });
  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");

  let team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  games
    .filter((g) => g.home_team_season_id > 0)
    .forEach(function (g) {
      g.home_team_season = team_seasons_by_team_season_id[g.home_team_season_id];
      g.away_team_season = team_seasons_by_team_season_id[g.away_team_season_id];

      let min_national_rank = Math.min(
        g.home_team_season.national_rank,
        g.away_team_season.national_rank
      );
      g.summed_national_rank = g.home_team_season.national_rank + g.away_team_season.national_rank;

      g.summed_national_rank -= Math.floor(g.home_team_season.team.team_ratings.brand / 4);
      g.summed_national_rank -= Math.floor(g.away_team_season.team.team_ratings.brand / 4);

      if (g.home_team_season.conference_season_id == g.away_team_season.conference_season_id) {
        if (next_week.schedule_week_number >= 13) {
          if (
            g.home_team_season.record.conference_gb <= 0.5 &&
            g.away_team_season.record.conference_gb <= 0.5
          ) {
            g.summed_national_rank -= 14;
          } else if (
            g.home_team_season.record.conference_gb <= 1.5 &&
            g.away_team_season.record.conference_gb <= 1.5
          ) {
            g.summed_national_rank -= 7;
          }
        } else if (next_week.schedule_week_number >= 8) {
          if (
            g.home_team_season.record.conference_gb <= 0.5 &&
            g.away_team_season.record.conference_gb <= 0.5
          ) {
            g.summed_national_rank -= 7;
          } else if (
            g.home_team_season.record.conference_gb <= 1.5 &&
            g.away_team_season.record.conference_gb <= 1.5
          ) {
            g.summed_national_rank -= 3;
          }
        }

        delete g.home_team_season;
        delete g.away_team_season;
      }

      if (g.rivalry_game) {
        g.summed_national_rank -= min_national_rank;
      }
    });

  games = games.sort((g_a, g_b) => g_a.summed_national_rank - g_b.summed_national_rank);
  let primetime_games = games.slice(0, 5);

  console.log({ games: games, primetime_games: primetime_games });
  if (primetime_games.length) {
    console.log({ "primetime_games[0]": primetime_games[0] });
    primetime_games.forEach((g) => (g.is_primetime_game = true));
    primetime_games[0].is_game_of_the_week = true;
  }

  db.game.update(games);
};

const calculate_national_rankings = async (this_week, all_weeks, common) => {
  const db = common.db;

  let ls = db.league_season.findOne({ season: common.season });
  let teams = db.team.find();
  let team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  let conference_seasons = db.conference_season.find({ season: common.season });
  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  let conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  team_seasons = nest_children$1(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );

  let weeks = db.week.find({ season: { $between: [common.season - 1, common.season + 1] } });
  let weeks_by_week_id = index_group_sync$1(weeks, "index", "week_id");
  let current_week = weeks.find((w) => w.is_current);

  console.log({ weeks: weeks, current_week: current_week });

  let team_season_stats = db.team_season_stats.find({ team_season_id: { $in: team_season_ids } });
  const team_season_stats_by_team_season_id = index_group_sync$1(
    team_season_stats,
    "index",
    "team_season_id"
  );
  team_seasons = nest_children$1(
    team_seasons,
    team_season_stats_by_team_season_id,
    "team_season_id",
    "stats"
  );

  let team_games = db.team_game.find({ team_season_id: { $in: team_season_ids } });
  let game_ids = team_games.map((tg) => tg.game_id);
  let games = db.game.find({ game_id: { $in: game_ids } });
  games = nest_children$1(games, weeks_by_week_id, "week_id", "week");

  let games_by_game_id = index_group_sync$1(games, "index", "game_id");

  team_games = nest_children$1(team_games, games_by_game_id, "game_id", "game");
  //team_games = team_games.filter((tg) => tg.game.was_played);
  // team_games = team_games.filter((tg) => (tg.game.week.schedule_week_number || 2000) <= 1999);
  let team_games_by_team_season_id = index_group_sync$1(team_games, "group", "team_season_id");

  let teams_by_team_id = index_group_sync$1(teams, "index", "team_id");
  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  team_seasons = nest_children$1(
    team_seasons,
    team_games_by_team_season_id,
    "team_season_id",
    "team_games"
  );
  team_seasons = team_seasons.filter((ts) => ts.team_id > 0);
  console.log({ team_seasons: team_seasons });

  let overall_power_modifier = 1;
  if (current_week.week_name == "Pre-Season") {
    overall_power_modifier = 5;
  }
  if (current_week.schedule_week_number) {
    overall_power_modifier = 3 - current_week.schedule_week_number * 0.15;
  }

  for (let ts of team_seasons) {
    ts.srs = {
      loops: 0,
      overall_rating: Math.ceil(
        ts.rating.overall ** overall_power_modifier / 99 ** (overall_power_modifier - 1)
      ),
      brand: Math.ceil(
        ts.team.team_ratings.brand ** overall_power_modifier / 20 ** (overall_power_modifier - 1)
      ),
      wins: 0,
      losses: 0,
      games_played: 0,
      fractional_wins: 0,
      fractional_losses: 0,
      fractional_games_played: 0,
    };

    ts.team_games = ts.team_games || [];

    ts.srs.all_team_season_ids = ts.team_games.map((tg) => tg.opponent_team_season_id);
    ts.srs.played_team_season_ids = ts.team_games
      .filter((tg) => tg.game.was_played)
      .map((tg) => tg.opponent_team_season_id);
    ts.srs.unplayed_team_season_ids = ts.team_games
      .filter((tg) => !tg.game.was_played)
      .map((tg) => tg.opponent_team_season_id);

    ts.played_team_games = ts.team_games
      .filter((tg) => tg.game.was_played)
      .sort((tg_a, tg_b) => tg_a.game.week_id - tg_b.game.week_id);
    ts.srs.games_played = ts.played_team_games.length;

    let game_index = 0;
    for (let tg of ts.played_team_games) {
      ts.srs.wins += tg.is_winning_team ? 1 : 0;
      ts.srs.losses += tg.is_winning_team ? 0 : 1;

      tg.game_fractional_share = (1.0 / (ts.srs.games_played - game_index)) ** 0.2;

      ts.srs.fractional_wins += (tg.is_winning_team ? 1.0 : 0) * tg.game_fractional_share;
      ts.srs.fractional_losses += (tg.is_winning_team ? 0 : 1.0) * tg.game_fractional_share;

      ts.srs.fractional_games_played += tg.game_fractional_share;
      game_index += 1;
    }
    ts.srs.net_win_count = ts.srs.wins - ts.srs.losses;
    ts.srs.fractional_net_win_count = ts.srs.fractional_wins - ts.srs.fractional_losses;
    ts.srs.rating = ts.srs.overall_rating + ts.srs.brand + ts.srs.fractional_net_win_count;
    ts.srs.original_rating = ts.srs.rating;
    ts.srs.rating_list = [ts.srs.rating];
  }

  let overall_list = team_seasons.map((ts) => ts.srs.rating);
  let average_overall = Math.ceil(average(overall_list));

  let team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  console.log({
    team_seasons: team_seasons,
    average_overall: average_overall,
    overall_list: overall_list,
  });

  for (let iter_ind = 1; iter_ind <= 3; iter_ind++) {
    for (let ts of Object.values(team_seasons_by_team_season_id)) {
      let total_opponent_rating = 0;
      let fractional_opponent_rating = 0;
      for (let tg of ts.played_team_games) {
        total_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating;
        fractional_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating *
          tg.game_fractional_share;
      }
      ts.srs.schedule_factor = Math.round(
        (fractional_opponent_rating + ts.srs.fractional_net_win_count * average_overall) /
          (ts.srs.fractional_games_played || 1)
      );
    }

    for (let ts of Object.values(team_seasons_by_team_season_id)) {
      // ts.srs.rating = (ts.srs.original_rating + ts.srs.schedule_factor) / 2;
      ts.srs.rating = (ts.srs.rating * iter_ind + ts.srs.schedule_factor) / (iter_ind + 1);
      ts.srs.rating_list.unshift(ts.srs.rating);
    }
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    // ts.srs.rating = Math.round(((ts.srs.rating * 1) + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
    if (ts.srs.games_played <= 2) {
      ts.srs.rating *= ts.srs.games_played;
      ts.srs.rating += (2 - ts.srs.games_played) * ts.srs.original_rating;
      ts.srs.rating /= 2;
    }
    ts.srs.rating = Math.round(
      (ts.srs.rating * 9 + (ts.rankings.srs_ratings[0] || ts.srs.rating) * 1) / 10
    );
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    ts.srs.sos = ts.srs.sos || {};
    let count = 0;
    let summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.all_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_all_opponents = summed_srs / count;
    } else {
      ts.srs.sos.all_opponents = 0;
    }

    count = 0;
    summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.played_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_played_opponents = summed_srs / count;
    } else {
      ts.srs.sos.played_opponents = 0;
    }

    count = 0;
    summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.unplayed_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_unplayed_opponents = (summed_srs * 1.0) / count;
    } else {
      ts.srs.sos.unplayed_opponents = 0;
    }

    console.log({
      summed_srs: summed_srs,
      count: count,
      "ts.srs.unplayed_team_season_ids": ts.srs.unplayed_team_season_ids,
      "ts.srs.sos.sos_unplayed_opponents": ts.srs.sos.sos_unplayed_opponents,
      ts: ts,
    });
  }

  console.log({ team_seasons_by_team_season_id: team_seasons_by_team_season_id });

  team_seasons = team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;
    return 0;
  });

  // for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
  //   ts.srs.rating = Math.round((ts.srs.rating + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
  // }

  console.log({
    ls: ls,
    team_seasons: team_seasons,
  });

  let sorted_team_seasons = team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.results.national_champion) return -1;
    if (ts_b.results.national_champion) return 1;

    if (ls.playoffs.playoffs_started && !ls.playoffs.playoffs_complete) {
      if ((ts_a.playoff.seed || 200) < (ts_b.playoff.seed || 200)) return -1;
      if ((ts_a.playoff.seed || 200) > (ts_b.playoff.seed || 200)) return 1;
    }

    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;

    if (
      ts_a.record.defeated_teams.includes(ts_b.team_season_id) &&
      !ts_b.record.defeated_teams.includes(ts_a.team_season_id)
    )
      return -1;
    if (ts_b.record.defeated_teams.includes(ts_a.team_season_id)) return 1;

    if (ts_a.record.losses < ts_b.record.losses) return -1;
    if (ts_a.record.losses > ts_b.record.losses) return 1;

    if (ts_a.record.net_wins > ts_b.record.net_wins) return -1;
    if (ts_a.record.net_wins < ts_b.record.net_wins) return 1;

    if (ts_a.team.team_ratings.program_history > ts_b.team.team_ratings.program_history) return -1;
    if (ts_b.team.team_ratings.program_history < ts_a.team.team_ratings.program_history) return 1;

    return 0;
  });

  rank_counter = 1;

  for (var team_season of sorted_team_seasons) {
    team_season.rankings.national_rank.unshift(rank_counter);
    team_season.rankings.srs_ratings.unshift(team_season.srs.rating);
    team_season.rankings.sos = team_season.rankings.sos || {
      all_opponents_sos: [],
      played_opponents_sos: [],
      unplayed_opponents_sos: [],
      all_opponents_sos_ranking: [],
      played_opponents_sos_ranking: [],
      unplayed_opponents_sos_ranking: [],
    };
    team_season.rankings.sos.all_opponents_sos.unshift(team_season.srs.sos.sos_all_opponents);
    team_season.rankings.sos.played_opponents_sos.unshift(team_season.srs.sos.sos_played_opponents);
    team_season.rankings.sos.unplayed_opponents_sos.unshift(
      team_season.srs.sos.sos_unplayed_opponents
    );
    rank_counter += 1;

    if (team_season.rankings.national_rank.length > 1) {
      team_season.rankings.national_rank_delta =
        team_season.rankings.national_rank[1] - team_season.rankings.national_rank[0];
      team_season.rankings.national_rank_delta_abs = Math.abs(
        team_season.rankings.national_rank_delta
      );
    } else {
      team_season.rankings.national_rank_delta = 0;
      team_season.rankings.national_rank_delta_abs = 0;
    }
  }

  console.log({ sorted_team_seasons: sorted_team_seasons });
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.stats.points_per_game - ts_a.stats.points_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.offense.unshift(rank_counter);
    rank_counter += 1;
  }

  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_a.stats.points_allowed_per_game - ts_b.stats.points_allowed_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.defense.unshift(rank_counter);
    rank_counter += 1;
  }

  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.stats.point_differential_per_game - ts_a.stats.point_differential_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.overall.unshift(rank_counter);
    rank_counter += 1;
  }

  //ALL SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.rankings.sos.all_opponents_sos[0] - ts_a.rankings.sos.all_opponents_sos[0];
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.all_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  //PLAYED SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.rankings.sos.played_opponents_sos[0] - ts_a.rankings.sos.played_opponents_sos[0];
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.played_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  //UNPLAYED SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return (
      ts_b.rankings.sos.unplayed_opponents_sos[0] - ts_a.rankings.sos.unplayed_opponents_sos[0]
    );
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.unplayed_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  let headline_id = db.headline.nextId("headline_id");
  let ranking_headlines = await generate_ranking_headlines(
    common,
    sorted_team_seasons,
    current_week,
    headline_id
  );

  console.log({ sorted_team_seasons: sorted_team_seasons, ranking_headlines: ranking_headlines });
  for (team_season of sorted_team_seasons) {
    delete team_season.team;
    delete team_season.season_stats;
    delete team_season.team_games;
    delete team_season.srs;
    delete team_season.conference_season;
  }

  db.team_season.update(sorted_team_seasons);
  db.headline.insert(ranking_headlines);
};

const calculate_conference_rankings = async (this_week, all_weeks, common) => {
  const db = await common.db;
  const all_weeks_by_week_id = index_group_sync$1(all_weeks, "index", "week_id");

  next_week = all_weeks_by_week_id[this_week.week_id + 1];
  const conference_seasons = db.conference_season.find({ season: common.season });

  const team_seasons = db.team_season.find({ season: this_week.phase.season, team_id: { $gt: 0 } });

  const team_seasons_by_conference_season_id = index_group_sync$1(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var rank_counter = 0,
    sorted_team_seasons = [],
    team_seasons_to_save = [];

  for (var conference_season of conference_seasons) {
    var conference_team_seasons =
      team_seasons_by_conference_season_id[conference_season.conference_season_id];

    console.log({
      conference_seasons: conference_seasons,
      conference_season: conference_season,
      team_seasons_by_conference_season_id: team_seasons_by_conference_season_id,
    });

    for (let division of conference_season.divisions) {
      let division_team_seasons = conference_team_seasons.filter(
        (ts) => ts.division_name == division.division_name
      );

      sorted_team_seasons = division_team_seasons.sort(function (a, b) {
        if (a.results.conference_champion) return -1;
        if (b.results.conference_champion) return 1;

        if (a.record.conference_net_wins > b.record.conference_net_wins) return -1;
        if (a.record.conference_net_wins < b.record.conference_net_wins) return 1;

        if (a.record.defeated_teams.includes(b.team_season_id)) return -1;
        if (b.record.defeated_teams.includes(a.team_season_id)) return 1;

        if (a.record.conference_losses > b.record.conference_losses) return 1;
        if (a.record.conference_losses < b.record.conference_losses) return -1;

        if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
        if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;

        return 0;
      });

      rank_counter = 1;
      top_conference_net_wins = sorted_team_seasons[0].record.conference_net_wins;
      for (var team_season of sorted_team_seasons) {
        team_season.record.conference_gb =
          (top_conference_net_wins - team_season.record.conference_net_wins) / 2;
        team_season.rankings.division_rank.unshift(rank_counter);
        rank_counter += 1;

        team_seasons_to_save.push(team_season);
      }
    }
  }

  db.team_season.update(team_seasons_to_save);
};

const weekly_recruiting = async (common) => {
  var startTime = performance.now();

  const db = common.db;
  const season = common.season;
  const this_week = await db.week
    .where({ season: season })
    .and((w) => w.is_current)
    .first();

  console.log({ this_week: this_week, season: season, db: db });

  var this_week_id = this_week.week_id;

  const teams = await db.team.where("team_id").above(0).toArray();
  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  const team_season_ids = team_seasons.map((ts) => ts.team_season_id);
  const team_season_recruitings = await db.team_season_recruiting.bulkGet(team_season_ids);
  const team_season_recruitings_by_team_season_id = index_group_sync$1(
    team_season_recruitings,
    "index",
    "team_season_id"
  );

  var teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  team_seasons = nest_children$1(
    team_seasons,
    team_season_recruitings_by_team_season_id,
    "team_season_id",
    "recruiting"
  );

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) => ts_b.team.team_ratings.brand - ts_a.team.team_ratings.brand
  );

  for (const team_season of team_seasons) {
    if (!("weeks" in team_season.recruiting)) {
      team_season.recruiting.weeks = {};
    }
    team_season.recruiting.weeks[this_week_id] = [];
  }

  var player_team_seasons = await db.player_team_season
    .where({ season: season })
    .and((pts) => pts.team_season_id < -1)
    .toArray();
  const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
  const player_team_season_recruitings = await db.player_team_season_recruiting.bulkGet(
    player_team_season_ids
  );
  const player_team_season_recruitings_by_player_team_season_id = index_group_sync$1(
    player_team_season_recruitings,
    "index",
    "player_team_season_id"
  );

  var player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.where("player_id").anyOf(player_ids).toArray();
  var players_by_player_id = index_group_sync$1(players, "index", "player_id");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    player_team_season_recruitings_by_player_team_season_id,
    "player_team_season_id",
    "recruiting"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = player_team_seasons.filter((pts) => !(pts.recruiting.signed == true));

  var player_tracker = {};

  for (const player_team_season of player_team_seasons) {
    if (!("weeks" in player_team_season.recruiting)) {
      player_team_season.recruiting.weeks = {};
    }
    player_team_season.recruiting.weeks[this_week_id] = [];
    player_tracker[player_team_season.player_team_season_id] = {
      recruit_calls_remaining: [6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1],
    };
  }

  var player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  console.log({
    team_seasons: team_seasons,
    player_tracker: player_tracker,
    player_team_seasons: player_team_seasons,
  });

  var team_season_calls_tracker = {};
  var team_seasons_call_order_prep = [];
  var team_seasons_call_order = [];

  for (const team_season of team_seasons) {
    var team_season_id = team_season.team_season_id;
    var prep_obj = {
      team_season_id: team_season_id,
      order_tracker: [],
      brand_odds: team_season.team.team_ratings.brand ** 3,
    };
    prep_obj.recruit_calls_remaining = Math.ceil(team_season.team.team_ratings.brand + 20);

    var players_to_call = Object.values(team_season.recruiting.recruit_team_seasons);
    players_to_call = players_to_call.sort(
      (rts_a, rts_b) => rts_b.team_top_level_interest - rts_a.team_top_level_interest
    );
    team_season_calls_tracker[team_season_id] = {
      called_players: [],
      time_remaining: 60,
      players_to_call: players_to_call,
    };
    team_seasons_call_order_prep.push(prep_obj);
  }

  var teams_waiting_to_call = team_seasons_call_order_prep.filter(
    (t_o) => t_o.recruit_calls_remaining > 0
  ).length;
  var loop_count = 0;
  while (teams_waiting_to_call > 0) {
    var team_list = team_seasons_call_order_prep
      .filter((t_o) => t_o.recruit_calls_remaining > 0)
      .map((t_o) => [t_o.team_season_id, t_o.brand_odds + t_o.recruit_calls_remaining]);
    var chosen_team_season_id = weighted_random_choice(team_list);
    var chosen_team_obj = team_seasons_call_order_prep.find(
      (t_o) => t_o.team_season_id == chosen_team_season_id
    );

    chosen_team_obj.order_tracker.push(loop_count);
    loop_count += 1;

    chosen_team_obj.recruit_calls_remaining -= 1;
    team_seasons_call_order.push(parseInt(chosen_team_season_id));

    teams_waiting_to_call = team_seasons_call_order_prep.filter(
      (t_o) => t_o.recruit_calls_remaining > 0
    ).length;
  }

  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  console.log({
    team_season_calls_tracker: team_season_calls_tracker,
    player_tracker: player_tracker,
    teams_waiting_to_call: teams_waiting_to_call,
    team_seasons_call_order: team_seasons_call_order,
    team_seasons_call_order_prep: team_seasons_call_order_prep,
  });

  for (const team_season_id of team_seasons_call_order) {
    var team_season_tracker = team_season_calls_tracker[team_season_id];
    var team_season = team_seasons_by_team_season_id[team_season_id];
    var recruit_team_seasons_for_team = team_season_tracker.players_to_call;

    var time_remaining = team_season_tracker.time_remaining;

    // console.log({team_season_id:team_season_id, recruit_team_seasons_for_team:recruit_team_seasons_for_team, team_season:team_season, team_season_tracker:team_season_tracker, time_remaining:time_remaining})

    var loop_count = 0;
    var waiting_for_player = true;
    while (waiting_for_player) {
      if (time_remaining == 0 || recruit_team_seasons_for_team.length == 0) {
        waiting_for_player = false;
        continue;
      }

      var potential_player = recruit_team_seasons_for_team.shift();
      console.log({
        potential_player: potential_player,
        time_remaining: time_remaining,
        team_season: team_season,
        recruit_team_seasons_for_team: recruit_team_seasons_for_team,
        player_tracker: player_tracker,
        "player_tracker[potential_player.player_team_season_id]":
          player_tracker[potential_player.player_team_season_id],
      });
      if (
        potential_player == undefined ||
        !(potential_player.player_team_season_id in player_tracker)
      ) {
        waiting_for_player = true;
      } else if (
        player_tracker[potential_player.player_team_season_id].recruit_calls_remaining.length > 0
      ) {
        waiting_for_player = false;
        //calls player

        var call_time =
          player_tracker[potential_player.player_team_season_id].recruit_calls_remaining.shift();

        call_time = Math.min(call_time, time_remaining);

        team_season_tracker.time_remaining = team_season_tracker.time_remaining - call_time;

        // console.log({team_season_id:team_season_id, 'team_season_tracker.time_remaining ': team_season_tracker.time_remaining ,call_time:call_time,  player_tracker:player_tracker, 'player_tracker[potential_player.player_team_season_id]': player_tracker[potential_player.player_team_season_id]})

        //TODO - make this smarter. base off if team knows or not
        var sorted_call_topics = Object.values(potential_player.match_ratings).sort(
          (mv_a, mv_b) => mv_b.team - mv_a.team
        );

        var added_match_rating = 0;
        var added_team_top_level_interest = 0;
        for (const call_topic of sorted_call_topics.slice(0, call_time)) {
          added_match_rating += recruiting_pitch_value(
            player_team_seasons_by_player_team_season_id[potential_player.player_team_season_id]
              .recruiting.interests[call_topic.topic],
            call_topic.team
          );
          console.log({
            "player_team_seasons_by_player_team_season_id[potential_player.player_team_season_id]":
              player_team_seasons_by_player_team_season_id[potential_player.player_team_season_id],
            call_topic: call_topic,
            added_match_rating: added_match_rating,
            "call_topic.player": call_topic.player,
            "call_topic.team": call_topic.team,
          });
          added_team_top_level_interest += 1;
        }

        console.log({
          added_team_top_level_interest: added_team_top_level_interest,
          added_team_top_level_interest: added_team_top_level_interest,
        });

        player_team_seasons_by_player_team_season_id[
          potential_player.player_team_season_id
        ].recruiting.recruit_team_seasons[potential_player.team_season_id].match_rating +=
          added_match_rating;
        team_seasons_by_team_season_id[
          potential_player.team_season_id
        ].recruiting.recruit_team_seasons[
          potential_player.player_team_season_id
        ].team_top_level_interest += added_team_top_level_interest;

        player_team_seasons_by_player_team_season_id[
          potential_player.player_team_season_id
        ].recruiting.weeks[this_week_id].push({
          team_season_id: potential_player.team_season_id,
          call_time: call_time,
          added_match_rating: added_match_rating,
        });
        team_seasons_by_team_season_id[potential_player.team_season_id].recruiting.weeks[
          this_week_id
        ].push({
          player_team_season_id: potential_player.player_team_season_id,
          team_season_id: potential_player.team_season_id,
          call_time: call_time,
          added_match_rating: added_match_rating,
        });
      }

      loop_count += 1;
    }
  }

  // console.log({recruit_team_seasons_by_recruit_team_season_id:recruit_team_seasons_by_recruit_team_season_id, all_recruit_team_seasons:all_recruit_team_seasons, recruit_team_seasons_by_player_team_season_id:recruit_team_seasons_by_player_team_season_id})
  //GROUP RTSs BY PLAYER

  for (const player_team_season_id in player_team_seasons_by_player_team_season_id) {
    var player_team_season = player_team_seasons_by_player_team_season_id[player_team_season_id];
    var recruit_team_seasons = Object.values(player_team_season.recruiting.recruit_team_seasons);
    console.log({
      recruit_team_seasons: recruit_team_seasons,
      player_team_season: player_team_season,
      player_team_season_id: player_team_season_id,
      player_team_seasons_by_player_team_season_id: player_team_seasons_by_player_team_season_id,
    });
    recruit_team_seasons = recruit_team_seasons.sort(
      (rts_a, rts_b) => rts_b.match_rating - rts_a.match_rating
    );

    var cutoff = 1;
    if (this_week.week_name == "Early Signing Day" && recruit_team_seasons[0].match_rating > 100) {
      cutoff = recruit_team_seasons[0].match_rating * 0.99;
    } else if (recruit_team_seasons[0].match_rating > 1750) {
      cutoff = recruit_team_seasons[0].match_rating * 0.95;
    } else if (recruit_team_seasons[0].match_rating > 2000) {
      cutoff = recruit_team_seasons[0].match_rating * 0.85;
    } else if (recruit_team_seasons[0].match_rating > 1500) {
      cutoff = recruit_team_seasons[0].match_rating * 0.66;
    } else if (recruit_team_seasons[0].match_rating > 1000) {
      cutoff = recruit_team_seasons[0].match_rating * 0.5;
    } else if (recruit_team_seasons[0].match_rating > 300 && this_week.schedule_week_number >= 12) {
      cutoff = recruit_team_seasons[0].match_rating * 0.75;
    } else if (recruit_team_seasons[0].match_rating > 500 && this_week.schedule_week_number >= 10) {
      cutoff = recruit_team_seasons[0].match_rating * 0.5;
    }

    var recruit_team_seasons_below_cutoff = recruit_team_seasons.filter(
      (rts) => rts.match_rating < cutoff
    );
    recruit_team_seasons.filter(
      (rts) => rts.match_rating >= cutoff
    );

    if (
      recruit_team_seasons[1].match_rating < cutoff &&
      (recruit_team_seasons[0].match_rating > 300 ||
        (recruit_team_seasons[0].match_rating > 100 && this_week.schedule_week_number >= 12))
    ) {
      var signed_recruit_team_season = recruit_team_seasons[0];
      var signed_team_season =
        team_seasons_by_team_season_id[signed_recruit_team_season.team_season_id];

      if (signed_team_season.recruiting.scholarships_to_offer > 0) {
        player_team_season.recruiting.signed = true;
        player_team_season.recruiting.signed_team_season_id =
          signed_recruit_team_season.team_season_id;
        player_team_season.recruiting.stage = "Signed";

        var player_stars = player_team_season.recruiting.stars;

        signed_team_season.recruiting.scholarships_to_offer -= 1;

        signed_team_season.recruiting.signed_player_stars["stars_" + player_stars] += 1;

        for (const team_season_id of recruit_team_seasons_below_cutoff) {
          team_seasons_by_team_season_id[
            signed_recruit_team_season.team_season_id
          ].recruiting.recruit_team_seasons[player_team_season_id].team_top_level_interest = -1;
        }
      } else {
        signed_team_season.recruiting.recruit_team_seasons[
          player_team_season_id
        ].team_top_level_interest = 0;
      }
    } else {
      //TODO fix this
      console.log("something here");
      // for (const recruit_team_season of recruit_team_seasons_below_cutoff){
      // 	recruit_team_season.team_top_level_interest = recruit_team_season.team_top_level_interest / 2;
      // 	updated_recruit_team_seasons.push(recruit_team_season);
      // }
      // for (const recruit_team_season of recruit_team_seasons_above_cutoff){
      // 	recruit_team_season.team_top_level_interest += parseInt(recruit_team_seasons_below_cutoff.length / 10);
      // 	updated_recruit_team_seasons.push(recruit_team_season);
      // }
    }
  }

  var team_seasons = Object.values(team_seasons_by_team_season_id);

  team_seasons = team_seasons.map(function (ts) {
    ts.recruiting.signed_player_stars["total"] =
      ts.recruiting.signed_player_stars["stars_5"] +
      ts.recruiting.signed_player_stars["stars_4"] +
      ts.recruiting.signed_player_stars["stars_3"] +
      ts.recruiting.signed_player_stars["stars_2"] +
      ts.recruiting.signed_player_stars["stars_1"];
    ts.recruiting.class_points =
      5 * ts.recruiting.signed_player_stars["stars_5"] +
      4 * ts.recruiting.signed_player_stars["stars_4"] +
      3 * ts.recruiting.signed_player_stars["stars_3"] +
      2 * ts.recruiting.signed_player_stars["stars_2"] +
      1 * ts.recruiting.signed_player_stars["stars_1"];
    return ts;
  });

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) => ts_b.recruiting.class_points - ts_a.recruiting.class_points
  );

  var loop_count = 1;
  for (const team_season of team_seasons) {
    team_season.recruiting.recruiting_class_rank = loop_count;
    loop_count += 1;
  }

  player_team_seasons = Object.values(player_team_seasons_by_player_team_season_id);

  const player_team_season_recruitings_to_put = player_team_seasons.map((pts) => pts.recruiting);
  player_team_seasons.forEach((pts) => delete pts.recruiting);
  player_team_seasons.forEach((pts) => delete pts.player);

  const team_season_recruitings_to_put = team_seasons.map((ts) => ts.recruiting);
  for (team_season of team_seasons) {
    delete team_season.team;
    delete team_season.stats;
    delete team_season.team_games;
    delete team_season.recruiting;
  }

  console.log({
    team_season_recruitings_to_put: team_season_recruitings_to_put,
  });

  await Promise.all([
    db.player_team_season.update(player_team_seasons),
    db.player_team_season_recruiting.update(player_team_season_recruitings_to_put),
    db.team_season.update(team_seasons),
    db.team_season_recruiting.update(team_season_recruitings_to_put),
  ]);

  console.log("Done putting on 5789");

  var endTime = performance.now();
  console.log(`Time taken to do weekly recruiting: ${parseInt(endTime - startTime)} ms`);
};

const choose_players_of_the_week = async (this_week, common) => {
  const db = common.db;

  const position_group_map = {
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

  const games = await db.game.where({ week_id: this_week.week_id }).toArray();
  const game_ids = games.map((g) => g.game_id);
  const games_by_game_id = index_group_sync$1(games, "index", "game_id");

  var team_games = await db.team_game.where("game_id").anyOf(game_ids).toArray();
  const team_game_ids = team_games.map((tg) => tg.team_game_id);
  team_games = nest_children$1(team_games, games_by_game_id, "game_id", "game");
  const team_games_by_team_game_id = index_group_sync$1(team_games, "index", "team_game_id");

  var player_team_games = await db.player_team_game
    .where("team_game_id")
    .anyOf(team_game_ids)
    .toArray();

  const player_team_season_ids = player_team_games.map((ptg) => ptg.player_team_season_id);
  var player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);

  player_team_seasons = player_team_seasons.map(function (pts) {
    pts.position_group = position_group_map[pts.position];
    return pts;
  });

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.bulkGet(player_ids);
  console.log({
    players: players,
    player_ids: player_ids,
    player_team_seasons: player_team_seasons,
    player_team_season_ids: player_team_season_ids,
    player_team_games: player_team_games,
  });
  const players_by_player_id = index_group_sync$1(players, "index", "player_id");

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  const player_team_seasons_by_player_team_season_id = index_group_sync$1(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );
  player_team_games = nest_children$1(
    player_team_games,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );

  player_team_games = player_team_games.filter(
    (ptg) => ptg.game_stats.games.weighted_game_score > 0
  );
  player_team_games = player_team_games.sort(
    (ptg_a, ptg_b) =>
      ptg_b.game_stats.games.weighted_game_score - ptg_a.game_stats.games.weighted_game_score
  );
  player_team_games = nest_children$1(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  console.log({ player_team_games: player_team_games });
  player_team_games.map((ptg) =>
    get(ptg, "player_team_season.team_season.conference_season_id")
  );

  const player_team_games_by_conference_season_id = index_group_sync$1(
    player_team_games,
    "group",
    "player_team_season.team_season.conference_season_id"
  );
  var player_team_games_by_position_group = index_group_sync$1(
    player_team_games,
    "group",
    "player_team_season.position_group"
  );

  var awards_to_save = [];

  let award_id = db.award.nextId("award_id");

  for (const position_group in player_team_games_by_position_group) {
    var position_group_player_team_games = player_team_games_by_position_group[position_group];
    var ptg = position_group_player_team_games[0];
    var a = new award(
      award_id,
      ptg.player_team_season_id,
      ptg.player_team_game_id,
      this_week.week_id,
      this_week.season,
      "position_group",
      position_group,
      "national",
      "week",
      null
    );
    awards_to_save.push(a);
    award_id += 1;
  }

  for (const conference_season_id in player_team_games_by_conference_season_id) {
    player_team_games = player_team_games_by_conference_season_id[conference_season_id];

    var player_team_games_by_position_group = index_group_sync$1(
      player_team_games,
      "group",
      "player_team_season.position_group"
    );

    for (const position_group in player_team_games_by_position_group) {
      position_group_player_team_games = player_team_games_by_position_group[position_group];
      var ptg = position_group_player_team_games[0];
      var a = new award(
        award_id,
        ptg.player_team_season_id,
        ptg.player_team_game_id,
        this_week.week_id,
        this_week.season,
        "position_group",
        position_group,
        "conference",
        "week",
        conference_season_id
      );
      awards_to_save.push(a);
      award_id += 1;
    }
  }

  await db.award.insert(awards_to_save);

  console.log({
    player_team_games: player_team_games,
    player_team_games_by_conference_season_id: player_team_games_by_conference_season_id,
    player_team_games_by_position_group: player_team_games_by_position_group,
  });
};

const close_out_season = async (this_week, common) => {
  const db = common.db;

  const league_season = await db.league_season.get(this_week.season);

  league_season.is_season_complete = true;

  await db.league_season.put(league_season);
};

const choose_preseason_all_americans = async (common) => {
  const db = common.db;
  const all_weeks = db.week.find();
  const this_week = all_weeks.filter((w) => w.is_current)[0];
  console.log({ this_week: this_week });

  const position_count_map = {
    QB: 1,
    RB: 2,
    FB: 0,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 3,

    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,

    K: 1,
    P: 1,
  };

  let team_seasons = db.team_season.find({ season: common.season });
  let previous_team_seasons = db.team_season.find({ season: common.season - 1 });

  let teams = db.team.find();
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  previous_team_seasons = nest_children$1(previous_team_seasons, teams_by_team_id, "team_id", "team");

  let previous_team_seasons_by_team_season_id = index_group_sync$1(
    previous_team_seasons,
    "index",
    "team_season_id"
  );

  let player_team_seasons = db.player_team_season.find({
    season: common.season,
    team_season_id: { $gt: 0 },
  });
  let previous_player_team_seasons = db.player_team_season.find({
    season: common.season - 1,
    team_season_id: { $gt: 0 },
  });

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  let players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync$1(players, "index", "player_id");

  let previous_player_team_season_ids = previous_player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  const previous_player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: previous_player_team_season_ids },
  });

  let previous_player_team_season_stats_by_player_team_season_id = index_group_sync$1(
    previous_player_team_season_stats,
    "index",
    "player_team_season_id"
  );
  previous_player_team_seasons = nest_children$1(
    previous_player_team_seasons,
    previous_player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  previous_player_team_seasons = nest_children$1(
    previous_player_team_seasons,
    previous_team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  var previous_player_team_seasons_by_player_id = index_group_sync$1(
    previous_player_team_seasons,
    "index",
    "player_id"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  //player_team_seasons = player_team_seasons.sort((pts_a, pts_b) => pts_b.games.weighted_game_score - pts_a.games.weighted_game_score)

  let award_id = db.award.nextId("award_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  player_team_seasons.map((pts) =>
    get(pts, "team_season.conference_season_id")
  );

  const player_team_seasons_by_conference_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season.conference_season_id"
  );
  var player_team_seasons_by_position = index_group_sync$1(player_team_seasons, "group", "position");

  let player_team_seasons_by_team_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  for (let [team_season_id, ts_player_team_seasons] of Object.entries(
    player_team_seasons_by_team_season_id
  )) {
    ts_player_team_seasons = ts_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.average_weighted_game_score - pts_a.average_weighted_game_score
    );
    ts_player_team_seasons.forEach(
      (pts, ind) => (pts.team_season_average_weighted_game_score_rank = ind + 1)
    );

    ts_player_team_seasons = ts_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.ratings.overall - pts_a.ratings.overall
    );
    ts_player_team_seasons.forEach((pts, ind) => (pts.team_season_overall_rank = ind + 1));
  }

  var awards_to_save = [];

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );
    position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
      Object.assign(pts, { overall_rating_rank: ind })
    );

    position_player_team_seasons = position_player_team_seasons.sort(function (pts_a, pts_b) {
      if (
        pts_b.previous_player_team_season == undefined &&
        pts_a.previous_player_team_season == undefined
      ) {
        return 0;
      } else if (pts_b.previous_player_team_season == undefined) {
        return 100000 - pts_a.previous_player_team_season.player_award_rating;
      } else if (pts_a.previous_player_team_season == undefined) {
        return pts_b.previous_player_team_season.player_award_rating - 100000;
      }
      return (
        pts_b.previous_player_team_season.player_award_rating -
        pts_a.previous_player_team_season.player_award_rating
      );
    });
    position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
      Object.assign(pts, { previous_game_score_rank: ind })
    );

    position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
      Object.assign(pts, {
        award_rank: pts.overall_rating_rank + 3 * pts.previous_game_score_rank,
      })
    );

    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) => pts_a.award_rank - pts_b.award_rank
    );

    for (var i = 0; i < position_count_map[position]; i++) {
      let pts = position_player_team_seasons[i];
      var a = new award(
        award_id,
        pts.player_team_season_id,
        null,
        this_week.week_id,
        common.season,
        "position",
        position,
        "national",
        "pre-season",
        null,
        "First"
      );
      awards_to_save.push(a);
      award_id += 1;
    }
  }

  for (const conference_season_id in player_team_seasons_by_conference_season_id) {
    player_team_seasons = player_team_seasons_by_conference_season_id[conference_season_id];

    var player_team_seasons_by_position = index_group_sync$1(
      player_team_seasons,
      "group",
      "position"
    );

    for (const position in player_team_seasons_by_position) {
      var position_player_team_seasons = player_team_seasons_by_position[position];

      position_player_team_seasons = position_player_team_seasons.sort(
        (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
      );
      position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
        Object.assign(pts, { overall_rating_rank: ind })
      );

      position_player_team_seasons = position_player_team_seasons.sort(function (pts_a, pts_b) {
        if (
          pts_b.previous_player_team_season == undefined &&
          pts_a.previous_player_team_season == undefined
        ) {
          return 0;
        } else if (pts_b.previous_player_team_season == undefined) {
          return 100000 - pts_a.previous_player_team_season.player_award_rating;
        } else if (pts_a.previous_player_team_season == undefined) {
          return pts_b.previous_player_team_season.player_award_rating - 100000;
        }
        return (
          pts_b.previous_player_team_season.player_award_rating -
          pts_a.previous_player_team_season.player_award_rating
        );
      });
      position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
        Object.assign(pts, { previous_game_score_rank: ind })
      );

      position_player_team_seasons = position_player_team_seasons.map((pts, ind) =>
        Object.assign(pts, {
          award_rank: pts.overall_rating_rank + 4 * pts.previous_game_score_rank,
        })
      );

      position_player_team_seasons = position_player_team_seasons.sort(
        (pts_a, pts_b) => pts_a.award_rank - pts_b.award_rank
      );

      for (var i = 0; i < position_count_map[position]; i++) {
        let pts = position_player_team_seasons[i];
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_week.week_id,
          common.season,
          "position",
          position,
          "conference",
          "pre-season",
          parseInt(conference_season_id),
          "First"
        );

        awards_to_save.push(a);
        award_id += 1;
      }
    }
  }

  db.award.insert(awards_to_save);
};

const choose_all_americans = async (this_week, common) => {
  const db = common.db;

  stopwatch(common, "Starting choose_all_americans");

  const position_count_map = {
    QB: 1,
    RB: 2,
    FB: 0,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 3,

    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,

    K: 1,
    P: 1,
  };

  var player_team_seasons = db.player_team_season.find({
    season: common.season,
    team_season_id: { $gt: 0 },
  });
  const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
  const player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_season_stats_by_player_team_season_id = index_group_sync$1(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  //player_team_seasons = player_team_seasons.filter(pts => pts.season_stats.games.weighted_game_score > 0);
  stopwatch(common, "Fetched PTSs");

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync$1(players, "index", "player_id");

  stopwatch(common, "Fetched Players");

  const team_season_ids = distinct(player_team_seasons.map((pts) => pts.team_season_id));
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  stopwatch(common, "Fetched TSs and Teams");

  let award_id = db.award.nextId("award_id");

  team_seasons = nest_children$1(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children$1(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children$1(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  let player_team_seasons_by_team_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  stopwatch(common, "Fetched Indexed data");

  for (let [team_season_id, ts_player_team_seasons] of Object.entries(
    player_team_seasons_by_team_season_id
  )) {
    ts_player_team_seasons = ts_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.average_weighted_game_score - pts_a.average_weighted_game_score
    );
    ts_player_team_seasons.forEach(
      (pts, ind) => (pts.team_season_average_weighted_game_score_rank = ind + 1)
    );
  }

  player_team_seasons = player_team_seasons.sort(
    (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
  );
  console.log({ player_team_seasons: player_team_seasons });
  player_team_seasons.map((pts) =>
    get(pts, "team_season.conference_season_id")
  );

  const player_team_seasons_by_conference_season_id = index_group_sync$1(
    player_team_seasons,
    "group",
    "team_season.conference_season_id"
  );
  var player_team_seasons_by_position = index_group_sync$1(player_team_seasons, "group", "position");

  var awards_to_save = [];

  stopwatch(common, "Sorted data");

  const heisman_player_team_season = player_team_seasons[0];
  var a = new award(
    award_id,
    heisman_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Heisman",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  var maxwell_player_team_season_index = 0;
  if (r > 0.25) {
    maxwell_player_team_season_index = 0;
  } else if (r > 0.1) {
    maxwell_player_team_season_index = 2;
  } else {
    maxwell_player_team_season_index = 3;
  }
  const maxwell_player_team_season = player_team_seasons[maxwell_player_team_season_index];
  var a = new award(
    award_id,
    maxwell_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Maxwell",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const camp_player_team_season_index = Math.floor(5 * r);
  const camp_player_team_season = player_team_seasons[camp_player_team_season_index];
  var a = new award(
    award_id,
    camp_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Camp",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const rimington_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "IOL");
  const rimington_player_team_season = rimington_player_team_seasons[0];
  var a = new award(
    award_id,
    rimington_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Rimington",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const outland_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "IOL" || pts.position == "DL"
  );
  const outland_player_team_season = outland_player_team_seasons[0];
  var a = new award(
    award_id,
    outland_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Outland",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const thorpe_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "CB" || pts.position == "S"
  );
  const thorpe_player_team_season = thorpe_player_team_seasons[0];
  var a = new award(
    award_id,
    thorpe_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Thorpe",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  //TODO  - include punters
  // const guy_player_team_seasons = player_team_seasons.filter(pts => pts.position == 'P');
  // const guy_player_team_season = guy_player_team_seasons[0];
  // var a = new award(guy_player_team_season.player_team_season_id, null, this_week.week_id, this_week.season, 'individual', 'Ray Guy', 'national', 'regular season', null, 'National');
  // awards_to_save.push(a)

  const groza_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "K");
  const groza_player_team_season = groza_player_team_seasons[0];
  var a = new award(
    award_id,
    groza_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Lou Groza",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const mackey_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "TE");
  const mackey_player_team_season = mackey_player_team_seasons[0];
  var a = new award(
    award_id,
    mackey_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Mackey",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const biletnikoff_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "WR");
  const biletnikoff_player_team_season = biletnikoff_player_team_seasons[0];
  var a = new award(
    award_id,
    biletnikoff_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Biletnikoff",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const walker_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "RB");
  const walker_player_team_season = walker_player_team_seasons[0];
  var a = new award(
    award_id,
    walker_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Doak Walker",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const butkus_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "LB");
  const butkus_player_team_season = butkus_player_team_seasons[0];
  var a = new award(
    award_id,
    butkus_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Butkus",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const obrien_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "QB");
  const obrien_player_team_season = obrien_player_team_seasons[0];
  var a = new award(
    award_id,
    obrien_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "O'Brien",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const nagurski_player_team_seasons = player_team_seasons.filter(
    (pts) =>
      pts.position == "EDGE" ||
      pts.position == "DL" ||
      pts.position == "LB" ||
      pts.position == "CB" ||
      pts.position == "S"
  );
  const nagurski_player_team_season = nagurski_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    nagurski_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Nagurski",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const bednarik_player_team_seasons = player_team_seasons.filter(
    (pts) =>
      pts.position == "EDGE" ||
      pts.position == "DL" ||
      pts.position == "LB" ||
      pts.position == "CB" ||
      pts.position == "S"
  );
  const bednarik_player_team_season = bednarik_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    bednarik_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Bednarik",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  stopwatch(common, "Top Individual awards chosen");

  //AWARDS TODO:
  //  Burlsworth Trophy - former walk-on
  //  Wuerffel Trophy  - high character
  //  Campbell Trophy  - academics + on-field
  //  Paul Hornung Award - Versatility
  // Patrick Mannelly Award - Long snapper
  // Jon Cornish Trophy - best canadian player

  //  George Munger Award - Coach of the year
  //  Broyles Award - best assistant coach

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    for (var i = 0; i < position_count_map[position]; i++) {
      let pts = position_player_team_seasons[i];
      var a = new award(
        award_id,
        pts.player_team_season_id,
        null,
        this_week.week_id,
        this_week.season,
        "position",
        position,
        "national",
        "regular season",
        null,
        "First"
      );
      awards_to_save.push(a);
      award_id += 1;
    }

    for (var i = position_count_map[position]; i < position_count_map[position] * 2; i++) {
      let pts = position_player_team_seasons[i];
      var a = new award(
        award_id,
        pts.player_team_season_id,
        null,
        this_week.week_id,
        this_week.season,
        "position",
        position,
        "national",
        "regular season",
        null,
        "Second"
      );
      awards_to_save.push(a);
      award_id += 1;
    }

    position_player_team_seasons = position_player_team_seasons.filter(
      (pts) => pts.class.class_name == "FR"
    );
    for (var i = 0; i < position_count_map[position]; i++) {
      let pts = position_player_team_seasons[i];
      if (pts) {
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
          "position",
          position,
          "national",
          "regular season",
          null,
          "Freshman"
        );
        awards_to_save.push(a);
        award_id += 1;
      }
    }
  }

  stopwatch(common, "Position awards chosed");

  for (const conference_season_id in player_team_seasons_by_conference_season_id) {
    player_team_seasons = player_team_seasons_by_conference_season_id[conference_season_id];

    let conference_player_team_season_of_the_year = player_team_seasons[0];

    var a = new award(
      award_id,
      conference_player_team_season_of_the_year.player_team_season_id,
      null,
      this_week.week_id,
      this_week.season,
      "individual",
      "Conference POTY",
      "conference",
      "regular season",
      parseInt(conference_season_id),
      "Conference"
    );

    awards_to_save.push(a);
    award_id += 1;

    var player_team_seasons_by_position = index_group_sync$1(
      player_team_seasons,
      "group",
      "position"
    );

    for (const position in player_team_seasons_by_position) {
      var position_player_team_seasons = player_team_seasons_by_position[position];
      for (var i = 0; i < position_count_map[position]; i++) {
        let pts = position_player_team_seasons[i];
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
          "position",
          position,
          "conference",
          "regular season",
          parseInt(conference_season_id),
          "First"
        );

        awards_to_save.push(a);
        award_id += 1;
      }

      for (var i = position_count_map[position]; i < position_count_map[position] * 2; i++) {
        let pts = position_player_team_seasons[i];
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
          "position",
          position,
          "conference",
          "regular season",
          parseInt(conference_season_id),
          "Second"
        );

        awards_to_save.push(a);
        award_id += 1;
      }

      position_player_team_seasons = position_player_team_seasons.filter(
        (pts) => pts.class.class_name == "FR"
      );
      for (var i = 0; i < position_count_map[position]; i++) {
        let pts = position_player_team_seasons[i];
        console.log({
          position: position,
          position_player_team_seasons: position_player_team_seasons,
          i: i,
          pts: pts,
          conference_season_id: conference_season_id,
        });
        if (pts) {
          var a = new award(
            award_id,
            pts.player_team_season_id,
            null,
            this_week.week_id,
            this_week.season,
            "position",
            position,
            "conference",
            "regular season",
            parseInt(conference_season_id),
            "Freshman"
          );

          awards_to_save.push(a);
          award_id += 1;
        }
      }
    }
  }

  stopwatch(common, "Conference awards chosed");

  await db.award.insert(awards_to_save);

  console.log({
    awards_to_save: awards_to_save,
    player_team_seasons: player_team_seasons,
    player_team_seasons_by_conference_season_id: player_team_seasons_by_conference_season_id,
    player_team_seasons_by_position: player_team_seasons_by_position,
  });
};

const advance_to_next_week = async (this_week, common) => {
  const db = await common.db;
  const ddb = await driver_db();
  const world = await ddb.world.get({ world_id: common.world_id });
  const all_weeks = await db.week.where("season").aboveOrEqual(common.season).toArray();
  const all_weeks_by_week_id = index_group_sync$1(all_weeks, "index", "week_id");

  console.log({ all_weeks: all_weeks });

  next_week = all_weeks_by_week_id[this_week.week_id + 1];

  this_week.is_current = false;
  next_week.is_current = true;

  if (this_week.season != next_week.season) {
    const league_seasons = await db.league_season.toArray();

    const current_league_season = league_seasons.find((ls) => ls.season == this_week.season);
    const next_league_season = league_seasons.find((ls) => ls.season == next_week.season);

    current_league_season.is_current_season = false;
    next_league_season.is_current_season = true;

    await db.league_season.put(current_league_season);
    await db.league_season.put(next_league_season);

    world.current_season = next_week.season;
  } else {
    console.log("did not find different seasons");
  }

  await db.week.update([this_week, next_week]);

  const current_team_season = await db.team_season.get({
    team_id: world.user_team.team_id,
    season: common.season,
  });
  world.current_week = next_week.week_name;
  world.user_team.team_record = current_team_season.record_display;

  await ddb.world.put(world);

  return next_week;
};

const refresh_page = async (next_week) => {
  window.onbeforeunload = function () {};
  location.href = next_week.world_href;
};

const sim_action = async (duration, common) => {
  window.onbeforeunload = function () {
    return "Week is currently simming. Realoading may PERMANENTLY corrupt your save. Are you sure?";
  };

  const db = common.db;

  const season = common.world_object.current_season;
  common.world_id;
  common.world_object;

  const all_weeks = await db.week.where("season").aboveOrEqual(season).toArray();

  const all_phases_by_phase_id = index_group_sync$1(
    await db.phase.where("season").aboveOrEqual(season).toArray(),
    "index",
    "phase_id"
  );
  console.log({
    all_phases_by_phase_id: all_phases_by_phase_id,
    all_weeks: all_weeks,
    season: season,
  });
  $.each(all_weeks, function (ind, week) {
    week.phase = all_phases_by_phase_id[week.phase_id];
    week.phase.season = season;
  });

  const current_week = all_weeks.find((w) => w.is_current);

  var sim_week_list = [];

  if (duration == "SimWeek") {
    sim_week_list = [current_week];
  } else if (duration == "SimPhase") {
    sim_week_list = all_weeks.filter(
      (w) => w.week_id >= current_week.week_id && w.phase_id == current_week.phase_id
    );
  } else {
    sim_week_list = [current_week];
  }
  for (var this_week of sim_week_list) {
    console.log({ team_game: team_game });
    await sim_week_games(this_week, common);

    console.log({ team_game: team_game });

    if (this_week.week_name == "Conference Championships") {
      await assign_conference_champions(this_week, common);
      await choose_all_americans(this_week, common);
    }

    if (this_week.phase.phase_name == "Bowl Season") {
      await process_bowl_results(common);
    }

    await calculate_conference_rankings(this_week, all_weeks, common);

    if (
      this_week.week_name != "Bowl Week 1" &&
      this_week.week_name != "Bowl Week 2" &&
      this_week.week_name != "Bowl Week 3"
    ) {
      await calculate_national_rankings(this_week, all_weeks, common);
    }

    if (this_week.week_name == "Bowl Week 4") {
      await close_out_season(this_week, common);
    }

    if (this_week.week_name == "Week 15") {
      await schedule_conference_championships(this_week, common);
    }

    if (this_week.week_name == "Early Signing Day") {
      await schedule_bowl_season(all_weeks, common);
    }

    if (this_week.week_name == "National Signing Day") {
      await initialize_new_season(this_week, common);
    }

    // if (this_week.week_name == "Season Recap") {
    //   await initialize_new_season(this_week, common);
    // }

    await choose_players_of_the_week(this_week, common);
    await calculate_primetime_games(this_week, all_weeks, common);
    //await weekly_recruiting(common);
    //await populate_all_depth_charts(common);
    //await calculate_team_needs(common);

    await advance_to_next_week(this_week, common);
    console.log("Ready to refresh_page");
  }

  await ddb.saveDatabaseAsync();
  await db.saveDatabaseAsync();
  await refresh_page(next_week);
};

const search_input_action = () => {
  var val = $("#nav-search-input").val();
  val = val.trim();
  if (val.length > 0) {
    var world_id = $("#nav-search-input").attr("worldid");
    window.location = `/World/${world_id}/Search/${val}`;
  }
};

const populate_player_modal = async (common, target) => {
  var db = common.db;
  var player_id = parseInt($(target).closest("*[player_id]").attr("player_id"));
  console.log({
    player_id: player_id,
    target: target,
    p: $(target).closest("*[player_id]"),
  });
  var season = common.season;

  var player = await db.player.get({ player_id: player_id });
  var player_team_seasons = await db.player_team_season.where({ player_id: player_id }).toArray();
  player_team_seasons.map((pts) => pts.player_team_season_id);
  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter((pts) => pts.season == season)[0];

  var team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  var player_team_ids = team_seasons.map((ts) => ts.team_id);
  var player_teams = await db.team.bulkGet(player_team_ids);

  var c = 0;
  $.each(player_team_seasons, function (ind, pts) {
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c += 1;
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player.player_team_seasons.filter(
    (pts) => pts.season == season
  )[0];
  var current_team = player.current_player_team_season.team_season.team;

  page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
  };
  console.log({ player: player, target: target, player_id: player_id });

  var modal_url = "/static/html_templates/common_templates/player_info_modal_template.njk";
  var html = await fetch(modal_url);
  html = await html.text();
  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: page,
    player: player,
  });
  console.log({ renderedHtml: renderedHtml });
  $("#player-info-modal").html(renderedHtml);
  $("#player-info-modal").addClass("shown");

  $(window).on("click", function (event) {
    if ($(event.target)[0] == $("#player-info-modal")[0]) {
      $("#player-info-modal").removeClass("shown");
      $(window).unbind();
    }
  });

  if (player.player_face == undefined) {
    player.player_face = await common.create_player_face("single", player.player_id, db);
  }

  common.display_player_face(
    player.player_face,
    {
      jersey: player.current_player_team_season.team_season.team.jersey,
      teamColors: player.current_player_team_season.team_season.team.jersey.teamColors,
    },
    "player-modal-player-face"
  );
};

const add_listeners = async (common) => {
  $("#nav-search").on("click", function () {
    search_input_action();
  });

  $("#nav-search-input").on("keyup", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
      search_input_action();
      // Do something
    }
  });

  var SimMap = {
    SimThisWeek: "SimWeek",
    SimThisPhase: "SimPhase",
  };

  $(".sim-action:not(.w3-disabled)").click(async function (e) {
    $("#SimDayModal").css({ display: "block" });

    var sim_duration = SimMap[$(this).attr("id")];

    await sim_action(sim_duration, common);

    //TODO add notifications
    // $.notify(
    //   res.status,
    //   { globalPosition:"right bottom", className: 'error' }
    // );
  });

  $(".nav-tab-button").on("click", function (event, target) {
    if ($(this).attr("id") == "nav-sidebar-tab") {
      $("#sidebar").addClass("sidebar-open");
      $(".sidebar-fade").addClass("sidebar-fade-open");

      $(".sidebar-fade-open").on("click", function () {
        $(this).removeClass("sidebar-fade-open");
        $("#sidebar").removeClass("sidebar-open");
      });
      return false;
    }

    var ClickedTab = $(event.target)[0];
    $.each($(".selected-tab"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).css("backgroundColor", "");
      $(TargetTab).removeClass("selected-tab");
    });

    $(ClickedTab).addClass("selected-tab");
    console.log({ "common.render_content.page": common.render_content.page });
    $(ClickedTab).css("background-color", "#" + common.render_content.page.SecondaryColor);

    var NewTabContent = $("#" + $(this).attr("id").replace("-tab", ""))[0];

    $.each($(".tab-content"), function (index, OldTabContent) {
      $(OldTabContent).css("display", "none");
    });

    $(NewTabContent).css("display", "block");
  });

  $("#nav-team-dropdown-container .conference-button").on("click", function (event, target) {
    var conference_selected = $(event.currentTarget).attr("conference-button-val");

    if (conference_selected == "All") {
      $("#nav-team-dropdown-container .team-link").removeClass("w3-hide");
    } else {
      $("#nav-team-dropdown-container .team-link").addClass("w3-hide");
      $(
        '#nav-team-dropdown-container .team-link[conference-button-val="' +
          conference_selected +
          '"]'
      ).removeClass("w3-hide");
    }
  });
};

const assign_conference_champions = async (this_week, common) => {
  const db = await common.db;
  const season = common.season;

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  let conference_seasons = db.conference_season.find({ season: season });

  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  const conference_seasons_by_conference_season_id = index_group_sync$1(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  const team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");
  const team_games_this_week = db.team_game.find({ week_id: this_week.week_id });

  const winning_team_seasons = team_games_this_week
    .filter((tg) => tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);

  const losing_team_seasons = team_games_this_week
    .filter((tg) => !tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);
  //winning_team_seasons = winning_team_seasons;

  let conference_seasons_to_put = [];
  winning_team_seasons.forEach(function (ts) {
    ts.results.conference_champion = true;

    let conference_season = conference_seasons_by_conference_season_id[ts.conference_season_id];
    conference_season.conference_champion_team_season_id = ts.team_season_id;

    conference_seasons_to_put.push(conference_season);

    if (conference_season.conference.divisions.length == 2) {
      ts.results.division_champion = true;
    } else if (
      conference_season.conference.divisions.length == 1 &&
      ts.rankings.division_rank[0] == 1
    ) {
      ts.results.division_champion = true;
    }
  });

  losing_team_seasons.forEach(function (ts) {
    let conference_season = conference_seasons_by_conference_season_id[ts.conference_season_id];
    // conference_season.conference_champion_team_season_id = ts.team_season_id;

    if (conference_season.conference.divisions.length == 2) {
      ts.results.division_champion = true;
    }
  });

  let championship_gameless_team_season_champs = [];
  let conference_seasons_without_championship_game = conference_seasons.filter(
    (cs) =>
      !cs.conference.schedule_format.hold_conference_championship_game &&
      !cs.conference.is_independent
  );
  conference_seasons_without_championship_game.forEach(function (cs) {
    let cs_team_seasons = team_seasons.filter(
      (ts) => ts.conference_season_id == cs.conference_season_id
    );
    let champ_ts = cs_team_seasons.find((ts) => ts.rankings.division_rank[0] == 1);

    champ_ts.results.conference_champion = true;
    championship_gameless_team_season_champs.push(champ_ts);

    cs.conference_champion_team_season_id = champ_ts.team_season_id;
    conference_seasons_to_put.push(cs);
  });

  conference_seasons_to_put.forEach((cs) => delete cs.conference);

  console.log("conference_seasons_to_put", {
    conference_seasons_to_put: conference_seasons_to_put,
  });

  db.team_season.update(winning_team_seasons);
  db.team_season.update(losing_team_seasons);
  db.team_season.update(championship_gameless_team_season_champs);
  db.conference_season.update(conference_seasons_to_put);
};

const schedule_conference_championships = async (this_week, common) => {
  console.log({ team_game: team_game });
  const db = await common.db;

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync$1(conferences, "index", "conference_id");

  let next_week = db.week.findOne({ week_id: this_week.week_id + 1 });

  var conference_seasons = db.conference_season.find({ season: this_week.phase.season });

  conference_seasons = nest_children$1(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  conference_seasons = conference_seasons.filter(
    (cs) => cs.conference.schedule_format.hold_conference_championship_game
  );

  var team_seasons = db.team_season.find({ season: this_week.phase.season, team_id: { $gt: 0 } });
  team_seasons = team_seasons.filter((ts) => ts.rankings.division_rank[0] <= 2);
  var team_seasons_by_conference_season_id = index_group_sync$1(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [];

  $.each(conference_seasons, function (ind, conference_season) {
    var championship_teams =
      team_seasons_by_conference_season_id[conference_season.conference_season_id];

    if (
      conference_season.conference.schedule_format.conference_championship_selection_method ==
      "top 2"
    ) {
      championship_teams = championship_teams.sort(
        (ts_a, ts_b) => ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0]
      );
      championship_teams = championship_teams.slice(0, 2);
    } else if (
      conference_season.conference.schedule_format.conference_championship_selection_method ==
      "division winners"
    ) {
      championship_teams = championship_teams.filter((ts) => ts.rankings.division_rank[0] == 1);
    }

    championship_teams = championship_teams.map((ts) => ts.team_season_id);
    [team_a, team_b] = championship_teams;
    console.log({
      team_game: team_game,
      championship_teams: championship_teams,
      conference_season: conference_season,
    });

    var team_game_a = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: next_team_game_id + 1,
      week_id: next_week.week_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_a),
      opponent_team_season_id: parseInt(team_b),
    });
    var team_game_b = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id + 1,
      is_home_team: false,
      opponent_team_game_id: next_team_game_id,
      week_id: next_week.week_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_b),
      opponent_team_season_id: parseInt(team_a),
    });

    team_games_to_create.push(team_game_a);
    team_games_to_create.push(team_game_b);

    games_to_create.push({
      game_id: next_game_id,
      season: common.season,
      home_team_season_id: parseInt(team_a),
      away_team_season_id: parseInt(team_b),
      home_team_game_id: next_team_game_id,
      away_team_game_id: next_team_game_id + 1,
      week_id: next_week.week_id,
      game_time: "7:05PM",
      was_played: false,
      outcome: {
        home_team_score: null,
        away_team_score: null,
        winning_team_season_id: null,
        losing_team_season_id: null,
      },
      rivalry: null,
      bowl: null,
      is_neutral_site_game: true,
      broadcast: { regional_broadcast: false, national_broadcast: false },
      world_id: common.world_id,
    });

    next_game_id += 1;
    next_team_game_id += 2;
  });

  db.game.insert(games_to_create);
  db.team_game.insert(team_games_to_create);
};

const process_bowl_results = async (common) => {
  const db = common.db;
  const season = common.season;

  var phases = db.phase.find({ season: season });
  var phases_by_phase_id = index_group_sync$1(phases, "index", "phase_id");
  var weeks = db.week.find({ season: season });
  weeks = nest_children$1(weeks, phases_by_phase_id, "phase_id", "phase");

  console.log({ weeks: weeks });

  var this_week = weeks.find((w) => w.is_current);

  var bowl_weeks = index_group_sync$1(
    weeks.filter((w) => w.phase.phase_name == "Bowl Season"),
    "index",
    "week_name"
  );

  var current_league_season = db.league_season.findOne({ season: season });

  var current_playoff_round_index = current_league_season.playoffs.playoff_rounds.findIndex(
    (pr) => pr.week_name == this_week.week_name
  );

  var teams = db.team.find({ team_id: { $gt: 0 } });
  index_group_sync$1(teams, "index", "team_id");

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  var team_seasons_by_team_season_id = index_group_sync$1(team_seasons, "index", "team_season_id");

  var games_this_week = await db.game.where({ week_id: this_week.week_id }).toArray();
  var team_games_by_game_id = index_group_sync$1(
    await db.team_game.where({ week_id: this_week.week_id }).toArray(),
    "group",
    "game_id"
  );

  var team_seasons_to_save = [];

  $.each(games_this_week, function (ind, game) {
    let winning_team_season =
      team_seasons_by_team_season_id[game.outcome.winning_team.team_season_id];
    let losing_team_season =
      team_seasons_by_team_season_id[game.outcome.losing_team.team_season_id];

    winning_team_season.results.bowl = deep_copy$1(game.bowl);
    winning_team_season.results.bowl.is_winning_team = true;

    losing_team_season.results.bowl = deep_copy$1(game.bowl);
    losing_team_season.results.bowl.is_winning_team = false;

    winning_team_season.results.bowl.game_id = game.game_id;
    losing_team_season.results.bowl.game_id = game.game_id;

    winning_team_season.results.bowl.opposing_team_season_id = losing_team_season.team_season_id;
    losing_team_season.results.bowl.opposing_team_season_id = winning_team_season.team_season_id;

    if (game.bowl.bowl_name == "National Championship") {
      winning_team_season.results.national_champion = true;
      current_league_season.playoffs.playoffs_complete = true;
    }

    team_seasons_to_save.push(winning_team_season);
    team_seasons_to_save.push(losing_team_season);
    console.log({
      winning_team_season: winning_team_season,
      losing_team_season: losing_team_season,
      team_seasons_to_save: team_seasons_to_save,
      game: game,
      bowl: game.bowl,
    });
  });

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [];

  console.log({
    current_playoff_round_index: current_playoff_round_index,
    "current_league_season.playoffs": current_league_season.playoffs,
  });

  if (
    current_playoff_round_index >= 0 &&
    current_playoff_round_index < current_league_season.playoffs.playoff_rounds.length - 1
  ) {
    var current_playoff_round =
      current_league_season.playoffs.playoff_rounds[current_playoff_round_index];
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index
    ].is_current_round = false;
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index + 1
    ].is_current_round = true;
    var next_playoff_round =
      current_league_season.playoffs.playoff_rounds[current_playoff_round_index + 1];
    var next_playoff_round_week = bowl_weeks[next_playoff_round.week_name];

    var team_seasons_advancing = [];

    for (const playoff_game of current_playoff_round.playoff_games) {
      if (playoff_game.bye_game) {
        team_seasons_advancing.push({
          seed: playoff_game.team_objs[0].seed,
          team_season: team_seasons_by_team_season_id[playoff_game.team_objs[0].team_season_id],
        });
      } else {
        var playoff_team_games = team_games_by_game_id[playoff_game.game_id];
        var winning_team_game = playoff_team_games.find((tg) => tg.is_winning_team);
        var winning_team_season_id = winning_team_game.team_season_id;

        team_seasons_advancing.push({
          seed: playoff_game.team_objs.find((to) => to.team_season_id == winning_team_season_id)
            .seed,
          team_season: team_seasons_by_team_season_id[winning_team_season_id],
        });
      }
    }

    team_seasons_advancing = team_seasons_advancing.sort(
      (ts_a, ts_b) => ts_b.team_season.playoff.seed - ts_a.team_season.playoff.seed
    );

    console.log({ team_seasons_advancing: team_seasons_advancing });

    if (team_seasons_advancing.length > 0) {
      var next_game_id = db.game.nextId("game_id");
      var next_team_game_id = db.team_game.nextId("team_game_id");

      var week_id = next_playoff_round_week.week_id;
      var counter = 0;

      while (team_seasons_advancing.length > 0) {
        var team_season_a = team_seasons_advancing.pop();
        team_seasons_advancing = team_seasons_advancing.reverse();
        var team_season_b = team_seasons_advancing.pop();
        team_seasons_advancing = team_seasons_advancing.reverse();

        var team_a = team_season_a.team_season.team_season_id;
        var team_b = team_season_b.team_season.team_season_id;

        var team_game_a = new team_game({
          world_id: common.world_id,
          season: common.season,
          team_game_id: next_team_game_id,
          is_home_team: true,
          opponent_team_game_id: next_team_game_id + 1,
          week_id: week_id,
          game_id: next_game_id,
          team_season_id: parseInt(team_a),
          opponent_team_season_id: parseInt(team_b),
        });
        var team_game_b = new team_game({
          world_id: common.world_id,
          season: common.season,
          team_game_id: next_team_game_id + 1,
          is_home_team: false,
          opponent_team_game_id: next_team_game_id,
          week_id: week_id,
          game_id: next_game_id,
          team_season_id: parseInt(team_b),
          opponent_team_season_id: parseInt(team_a),
        });

        team_games_to_create.push(team_game_a);
        team_games_to_create.push(team_game_b);

        games_to_create.push({
          game_id: next_game_id,
          season: common.season,
          home_team_season_id: parseInt(team_a),
          away_team_season_id: parseInt(team_b),
          home_team_game_id: next_team_game_id,
          away_team_game_id: next_team_game_id + 1,
          week_id: week_id,
          game_time: "7:05PM",
          was_played: false,
          outcome: {
            home_team_score: null,
            away_team_score: null,
            winning_team_season_id: null,
            losing_team_season_id: null,
          },
          rivalry: null,
          bowl: { bowl_name: next_playoff_round.round_name, is_playoff: true },
          broadcast: { regional_broadcast: false, national_broadcast: false },
          world_id: common.world_id,
        });

        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs = [];
        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs.push({
          seed: team_season_a.seed,
          team_season_id: team_a,
          team_game_id: next_team_game_id,
        });
        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs.push({
          seed: team_season_b.seed,
          team_season_id: team_b,
          team_game_id: next_team_game_id + 1,
        });

        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].game_id = next_game_id;

        counter += 1;
        next_team_game_id = next_team_game_id + 2;
        next_game_id = next_game_id + 1;
      }
    }
  }

  await Promise.all([
    db.game.insert(games_to_create),
    db.team_game.insert(team_games_to_create),
    db.team_season.update(team_seasons_to_save),
    db.league_season.put(current_league_season),
  ]);
};

const schedule_bowl_season = async (all_weeks, common) => {
  let bowl_url = `/static/data/import_json/bowls.json`;
  let bowl_json = await fetch(bowl_url);
  let bowls = await bowl_json.json();

  const db = await common.db;

  var current_league_season = await db.league_season.where({ season: common.season }).toArray();
  current_league_season = current_league_season[0];

  var number_playoff_teams = current_league_season.playoffs.number_playoff_teams;

  var team_seasons = await db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  index_group_sync$1(
    await db.team.where("team_id").above(0).toArray(),
    "index",
    "team_id"
  );

  var num_teams = await db.team.where("team_id").above(0).count();

  var max_bowl_bound_teams = num_teams - number_playoff_teams;
  var max_bowls = Math.floor(max_bowl_bound_teams / 2);

  bowls = bowls.slice(0, max_bowls);

  team_seasons = team_seasons.sort(function (team_season_a, team_season_b) {
    if (team_season_a.rankings.national_rank[0] < team_season_b.rankings.national_rank[0])
      return -1;
    if (team_season_a.rankings.national_rank[0] > team_season_b.rankings.national_rank[0]) return 1;
    return 0;
  });

  let number_guaranteed_conference_champions_in_playoff = 6;
  let top_playoff_seeds_saved_for_conference_champions = 4;
  let conference_champions_in_playoff = team_seasons
    .filter((ts) => ts.results.conference_champion)
    .slice(0, number_guaranteed_conference_champions_in_playoff);
  let top_seeded_conference_champions_in_playoff = conference_champions_in_playoff.slice(
    0,
    top_playoff_seeds_saved_for_conference_champions
  );

  let playoff_team_season_ids = new Set(
    conference_champions_in_playoff.map((ts) => ts.team_season_id)
  );
  let top_seeded_playoff_team_season_ids = new Set(
    top_seeded_conference_champions_in_playoff.map((ts) => ts.team_season_id)
  );

  let ts_ind = 0;
  while (playoff_team_season_ids.size < number_playoff_teams) {
    let ts = team_seasons[ts_ind];
    if (!playoff_team_season_ids.has(ts.team_season_id)) {
      playoff_team_season_ids.insert(ts.team_season_id);
    }
    ts_ind += 1;
  }

  var playoff_bound_team_seasons = top_seeded_conference_champions_in_playoff.concat(
    team_seasons.filter(
      (ts) =>
        !top_seeded_playoff_team_season_ids.has(ts.team_season_id) &&
        playoff_team_season_ids.has(ts.team_season_id)
    )
  );
  playoff_bound_team_seasons.forEach((ts, ind) => (ts.playoff.seed = ind + 1));

  console.log({ playoff_bound_team_seasons: playoff_bound_team_seasons });

  var bowl_bound_team_seasons = team_seasons.filter(
    (ts) =>
      !playoff_team_season_ids.has(ts.team_season_id) &&
      ts.rankings.national_rank[0] <= bowls.length * 2 + number_playoff_teams
  );

  var bowl_weeks = index_group_sync$1(
    all_weeks.filter((w) => w.phase.phase_name == "Bowl Season"),
    "index",
    "week_name"
  );

  var taken_team_season_ids = [],
    possible_team_seasons = [],
    chosen_team_season = null;

  $.each(bowls, function (ind, bowl) {
    possible_team_seasons = bowl_bound_team_seasons
      .filter((ts) => !taken_team_season_ids.includes(ts.team_season_id))
      .slice(0, 5);
    bowl.teams = [];
    chosen_team_season =
      possible_team_seasons[Math.floor(Math.random() * possible_team_seasons.length)];
    bowl.teams.push(chosen_team_season);

    taken_team_season_ids.push(chosen_team_season.team_season_id);

    (chosen_team_season = null), (loop_count = 0);
    possible_team_seasons = possible_team_seasons.filter(
      (ts) => !taken_team_season_ids.includes(ts.team_season_id)
    );

    while (
      (chosen_team_season == null ||
        chosen_team_season.conference_season_id == bowl.teams[0].conference_season_id ||
        chosen_team_season.record.defeated_teams.includes(bowl.teams[0].team_season_id) ||
        bowl.teams[0].record.defeated_teams.includes(chosen_team_season.team_season_id)) &&
      loop_count < 100
    ) {
      chosen_team_season =
        possible_team_seasons[Math.floor(Math.random() * possible_team_seasons.length)];
      loop_count += 1;
    }

    if (chosen_team_season != undefined) {
      bowl.teams.push(chosen_team_season);
      taken_team_season_ids.push(chosen_team_season.team_season_id);
    }
  });

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  if (!(last_team_game === undefined)) {
    next_team_game_id = last_team_game.team_game_id + 1;
  }

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [],
    team_ids = [];

  const playoff_round = current_league_season.playoffs.playoff_rounds[0];
  const playoff_week_id = bowl_weeks[playoff_round.week_name].week_id;

  for (const playoff_game of playoff_round.playoff_games) {
    team_ids = [];
    for (const team_obj of playoff_game.team_objs) {
      team_obj.team_season_id = playoff_bound_team_seasons[team_obj.seed - 1].team_season_id;
    }

    console.log({ playoff_game: playoff_game });

    if (playoff_game.bye_game) {
      playoff_game.game_id = null;
    } else {
      [team_season_id_a, team_season_id_b] = playoff_game.team_objs.map((to) => to.team_season_id);

      var team_game_a = new team_game({
        world_id: common.world_id,
        season: common.season,
        team_game_id: next_team_game_id,
        is_home_team: true,
        opponent_team_game_id: next_team_game_id + 1,
        week_id: playoff_week_id,
        game_id: next_game_id,
        team_season_id: parseInt(team_season_id_a),
        opponent_team_season_id: parseInt(team_season_id_b),
      });
      var team_game_b = new team_game({
        world_id: common.world_id,
        season: common.season,
        team_game_id: next_team_game_id + 1,
        is_home_team: false,
        opponent_team_game_id: next_team_game_id,
        week_id: playoff_week_id,
        game_id: next_game_id,
        team_season_id: parseInt(team_season_id_b),
        opponent_team_season_id: parseInt(team_season_id_a),
      });

      team_games_to_create.push(team_game_a);
      team_games_to_create.push(team_game_b);

      games_to_create.push({
        game_id: next_game_id,
        season: common.season,
        home_team_season_id: parseInt(team_a),
        away_team_season_id: parseInt(team_b),
        home_team_game_id: next_team_game_id,
        away_team_game_id: next_team_game_id + 1,
        week_id: playoff_week_id,
        game_time: "7:05PM",
        was_played: false,
        outcome: {
          home_team_score: null,
          away_team_score: null,
          winning_team_season_id: null,
          losing_team_season_id: null,
        },
        rivalry: null,
        is_neutral_site_game: true,
        bowl: { bowl_name: playoff_round.round_name, is_playoff: true },
        broadcast: { regional_broadcast: false, national_broadcast: false },
        world_id: common.world_id,
      });

      playoff_game.game_id = next_game_id;

      playoff_game.team_objs[0].team_game_id = next_team_game_id;
      playoff_game.team_objs[1].team_game_id = next_team_game_id + 1;

      next_game_id += 1;
      next_team_game_id += 2;
    }
  }

  playoff_round.is_current_round = true;
  current_league_season.playoffs.playoffs_started = true;
  current_league_season.playoffs.playoff_rounds[0] = playoff_round;

  $.each(bowls, function (ind, bowl) {
    team_ids = bowl.teams.map((ts) => ts.team_season_id);
    [team_a, team_b] = team_ids;

    week_id = bowl_weeks[bowl.bowl_week_name].week_id;

    var team_game_a = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: next_team_game_id + 1,
      week_id: week_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_a),
      opponent_team_season_id: parseInt(team_b),
    });
    var team_game_b = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id + 1,
      is_home_team: false,
      opponent_team_game_id: next_team_game_id,
      week_id: week_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_b),
      opponent_team_season_id: parseInt(team_a),
    });

    team_games_to_create.push(team_game_a);
    team_games_to_create.push(team_game_b);

    games_to_create.push({
      game_id: next_game_id,
      season: common.season,
      home_team_season_id: parseInt(team_a),
      away_team_season_id: parseInt(team_b),
      home_team_game_id: next_team_game_id,
      away_team_game_id: next_team_game_id + 1,
      week_id: week_id,
      game_time: "7:05PM",
      was_played: false,
      outcome: {
        home_team_score: null,
        away_team_score: null,
        winning_team_season_id: null,
        losing_team_season_id: null,
      },
      rivalry: null,
      bowl: { bowl_name: bowl.bowl_name, is_playoff: false },
      broadcast: { regional_broadcast: false, national_broadcast: false },
      world_id: common.world_id,
    });

    next_game_id += 1;
    next_team_game_id += 2;
  });

  await Promise.all([
    db.game.insert(games_to_create),
    db.team_game.insert(team_games_to_create),
    db.league_season.put(current_league_season),
    db.team_season.update(playoff_bound_team_seasons),
  ]);
};

const schedule_game = (common, scheduling_dict, team_set, game_type, rival_obj, loop_count = 0) => {
  var team_a = team_set[0],
    team_b = team_set[1];
  if (team_b == undefined) {
    return "No team b";
  }

  if (Math.random() < 0.5) {
    [team_a, team_b] = [team_b, team_a];
  }

  var is_conference_game =
    scheduling_dict.team_season_schedule_tracker[team_a].conference_season_id ==
    scheduling_dict.team_season_schedule_tracker[team_b].conference_season_id;

  var keep_game =
    !scheduling_dict.team_season_schedule_tracker[team_b].opponents_scheduled.has(team_a);

  var schedule_trend_modifier = 1;
  if (game_type == "conference") {
    is_conference_game = true;
    keep_game = keep_game && is_conference_game;
  } else if (game_type == "non_conference") {
    keep_game = keep_game && !is_conference_game;
    schedule_trend_modifier = -16;
  } else {
    alert("some fuck up in scheduling");
  }

  if (
    keep_game &&
    is_conference_game &&
    scheduling_dict.team_season_schedule_tracker[team_a]["conference"].games_to_schedule > 0 &&
    scheduling_dict.team_season_schedule_tracker[team_b]["conference"].games_to_schedule > 0
  ) {
    keep_game = true;
  } else if (
    keep_game &&
    !is_conference_game &&
    scheduling_dict.team_season_schedule_tracker[team_a]["non_conference"].games_to_schedule > 0 &&
    scheduling_dict.team_season_schedule_tracker[team_b]["non_conference"].games_to_schedule > 0
  ) {
    keep_game = true;
  } else {
    keep_game = false;
  }

  window.distance_tracking_map = window.distance_tracking_map || {};
  if (keep_game && !is_conference_game) {
    let distance_between_schools = distance_between_cities(
      scheduling_dict.team_season_schedule_tracker[team_a].city,
      scheduling_dict.team_season_schedule_tracker[team_b].city,
      window.distance_tracking_map
    );
    if (
      distance_between_schools >
        scheduling_dict.team_season_schedule_tracker[team_a].non_conference
          .max_ooc_travel_distance +
          loop_count * 2 ||
      distance_between_schools >
        scheduling_dict.team_season_schedule_tracker[team_b].non_conference
          .max_ooc_travel_distance +
          loop_count * 2
    ) {
      keep_game = false;
    }
  }

  if (keep_game) {
    var available_weeks = common.set_intersect(
      scheduling_dict.team_season_schedule_tracker[team_a].available_week_ids,
      scheduling_dict.team_season_schedule_tracker[team_b].available_week_ids
    );
    available_weeks = [...available_weeks];
    if (available_weeks.length > 0) {
      if (is_conference_game) {
        if (
          scheduling_dict.team_season_schedule_tracker[team_b]["conference"].net_home_games <
          scheduling_dict.team_season_schedule_tracker[team_a]["conference"].net_home_games
        ) {
          [team_a, team_b] = [team_b, team_a];
        }
      } else {
        dict_for_random = [team_a, team_b].map(function (team_id) {
          return [
            team_id,
            scheduling_dict.team_season_schedule_tracker[team_id].team.team_ratings
              .program_history ** 2,
          ];
        });
        dict_for_random = Object.fromEntries(dict_for_random);
        chosen_home_team = common.weighted_random_choice(dict_for_random);
        chosen_away_team = [team_a, team_b].find((team_id) => team_id != chosen_home_team);

        team_a = chosen_home_team;
        team_b = chosen_away_team;
      }

      available_weeks = available_weeks.map(function (week_id) {
        // console.log({
        //   week_id:week_id,
        //   team_a:team_a,
        //   team_b:team_b,
        //   scheduling_dict:scheduling_dict,
        //   'scheduling_dict.team_season_schedule_tracker[team_ind]': scheduling_dict.team_season_schedule_tracker[team_a],
        //   'scheduling_dict.team_season_schedule_tracker[team_b]': scheduling_dict.team_season_schedule_tracker[team_b],
        // })
        let additional_modifier = 1;
        for (let team_ind of [team_a, team_b]) {
          for (let adj_ind of [-1, 1]) {
            if (
              scheduling_dict.team_season_schedule_tracker[team_ind].available_week_ids.has(
                week_id + adj_ind
              ) ||
              week_id == scheduling_dict.all_week_ids[0] ||
              week_id == scheduling_dict.all_week_ids[scheduling_dict.all_week_ids.length - 1]
            ) {
              additional_modifier += 1;
            }
          }
        }

        return [
          week_id,
          Math.abs(
            (scheduling_dict.all_weeks_by_week_id[week_id].schedule_week_number +
              schedule_trend_modifier) **
              (1 * additional_modifier)
          ),
        ];
      });
      available_weeks = Object.fromEntries(available_weeks);
      var chosen_week_id = parseInt(common.weighted_random_choice(available_weeks));

      if (rival_obj != null) {
        if (rival_obj.preferred_week_id != undefined) {
          if (rival_obj.preferred_week_id in available_weeks) {
            chosen_week_id = rival_obj.preferred_week_id;
          }
        }
      }

      scheduling_dict.team_season_schedule_tracker[team_a][game_type].games_to_schedule -= 1;
      scheduling_dict.team_season_schedule_tracker[team_a][game_type].games_scheduled += 1;
      scheduling_dict.team_season_schedule_tracker[team_a][game_type].home_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_a][game_type].net_home_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_a].weeks_scheduled.add(chosen_week_id);
      scheduling_dict.team_season_schedule_tracker[team_a].available_week_ids.delete(
        chosen_week_id
      );
      scheduling_dict.team_season_schedule_tracker[team_a].opponents_scheduled.add(team_b);

      scheduling_dict.team_season_schedule_tracker[team_b][game_type].games_to_schedule -= 1;
      scheduling_dict.team_season_schedule_tracker[team_b][game_type].games_scheduled += 1;
      scheduling_dict.team_season_schedule_tracker[team_b][game_type].away_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_b][game_type].net_home_games -= 1;
      scheduling_dict.team_season_schedule_tracker[team_b].weeks_scheduled.add(chosen_week_id);
      scheduling_dict.team_season_schedule_tracker[team_b].available_week_ids.delete(
        chosen_week_id
      );
      scheduling_dict.team_season_schedule_tracker[team_b].opponents_scheduled.add(team_a);

      if (!is_conference_game) {
        for (let team_combos of [
          [team_a, team_b],
          [team_b, team_a],
        ]) {
          let team_ind = team_combos[0];
          let other_team_ind = team_combos[1];
          let other_team_quadrant =
            scheduling_dict.team_season_schedule_tracker[other_team_ind].team_quadrant;
          let team_schedule_obj = scheduling_dict.team_season_schedule_tracker[team_ind];

          other_team_quadrant =
            other_team_quadrant +
            ([0, -1].find(
              (m) =>
                team_schedule_obj.non_conference.schedule_team_quadrants[other_team_quadrant + m] >
                0
            ) || 0);

          team_schedule_obj.non_conference.schedule_team_quadrants[other_team_quadrant] -= 1;
        }
        // console.log({scheduling_dict:scheduling_dict, team_a:team_a, team_b:team_b, 'scheduling_dict.team_season_schedule_tracker[team_b]': scheduling_dict.team_season_schedule_tracker[team_b]})
      }

      // console.log({scheduling_dict:scheduling_dict, team_a:team_a, team_b:team_b, 'scheduling_dict.team_season_schedule_tracker[team_b]': scheduling_dict.team_season_schedule_tracker[team_b]})

      var team_game_a = new team_game({
        world_id: scheduling_dict.world_id,
        season: scheduling_dict.season,
        team_game_id: scheduling_dict.next_team_game_id,
        is_home_team: true,
        opponent_team_game_id: scheduling_dict.next_team_game_id + 1,
        week_id: chosen_week_id,
        game_id: scheduling_dict.next_game_id,
        is_conference_game: is_conference_game,
        team_season_id: parseInt(team_a),
        opponent_team_season_id: parseInt(team_b),
      });
      var team_game_b = new team_game({
        world_id: scheduling_dict.world_id,
        season: scheduling_dict.season,
        team_game_id: scheduling_dict.next_team_game_id + 1,
        is_home_team: false,
        opponent_team_game_id: scheduling_dict.next_team_game_id,
        week_id: chosen_week_id,
        game_id: scheduling_dict.next_game_id,
        is_conference_game: is_conference_game,
        team_season_id: parseInt(team_b),
        opponent_team_season_id: parseInt(team_a),
      });

      scheduling_dict.team_games_to_create.push(team_game_a);
      scheduling_dict.team_games_to_create.push(team_game_b);

      scheduling_dict.team_games_to_create_ids.push(scheduling_dict.next_team_game_id);
      scheduling_dict.team_games_to_create_ids.push(scheduling_dict.next_team_game_id + 1);

      scheduling_dict.games_to_create.push({
        game_id: scheduling_dict.next_game_id,
        season: scheduling_dict.season,
        home_team_season_id: parseInt(team_a),
        away_team_season_id: parseInt(team_b),
        home_team_game_id: scheduling_dict.next_team_game_id,
        away_team_game_id: scheduling_dict.next_team_game_id + 1,
        week_id: chosen_week_id,
        game_time: "7:05PM",
        was_played: false,
        outcome: {
          home_team_score: null,
          away_team_score: null,
          winning_team_season_id: null,
          losing_team_season_id: null,
        },
        rivalry: rival_obj,
        bowl: null,
        broadcast: { regional_broadcast: false, national_broadcast: false },
        world_id: scheduling_dict.world_id,
        is_conference_game: is_conference_game,
      });

      scheduling_dict.games_to_create_ids.push(scheduling_dict.next_game_id);

      scheduling_dict.next_game_id += 1;
      scheduling_dict.next_team_game_id += 2;

      return "Scheduled";
    } else {
      return "No available weeks";
    }
  } else {
    console.log("Issue with teams already playing", {
      scheduling_dict: scheduling_dict,
      team_set: team_set,
      game_type: game_type,
      rival_obj: rival_obj,
    });
    return "Issue with teams already playing";
  }
};

const shuffle = (a) => {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};

const uniform_random_choice = (options) => {
  return options[Math.floor(Math.random() * options.length)];
};

const weighted_random_choice = (options, default_val, choice_count = 1) => {
  var total = 0;

  if (!options) {
    return default_val;
  }

  if (!Array.isArray(options)) {
    options = Object.entries(options);
  }

  let data = options;

  data = data.filter((opt) => opt[1] > 0);
  if (data.length == 0) {
    return default_val;
  }

  data.forEach(function (opt) {
    total += opt[1];
    opt.push(total);
  });

  let chosen_value_list = [];
  while (choice_count > 0) {
    let r = Math.floor(Math.random() * total);
    let chosen_obj = data.find((opt) => opt[2] >= r) || [default_val];
    let chosen_value = chosen_obj[0];
    chosen_value_list.push(chosen_value);

    choice_count -= 1;
  }

  if (chosen_value_list.length == 1) {
    return chosen_value_list[0];
  }

  return chosen_value;
};

const random_facial_feature = (feature) => {
  const features = {
    eye: {
      eye1: 0.75,
      eye2: 1,
      eye3: 1,
      eye4: 1,
      eye5: 1,
      eye6: 1,
      eye7: 1,
      eye8: 1,
      eye9: 1,
      eye10: 1,
      eye11: 1,
      eye12: 0.1,
      eye13: 1,
      eye14: 1,
      eye15: 1,
      eye16: 1,
      eye17: 1,
      eye18: 1,
      eye19: 1,
    },
    body: { body: 1 },
    ear: { ear1: 1, ear2: 1, ear3: 1 },
    head: {
      head1: 1,
      head2: 1,
      head3: 1,
      head4: 1,
      head5: 1,
      head6: 1,
      head7: 1,
      head8: 1,
      head9: 1,
      head10: 1,
      head12: 1,
      head12: 1,
      head13: 1,
      head14: 1,
      head15: 1,
      head16: 1,
      head17: 1,
      head18: 0.1,
    },
    mouth: {
      straight: 1,
      angry: 1,
      closed: 1,
      mouth: 1,
      mouth2: 1,
      mouth3: 1,
      mouth4: 1,
      mouth5: 1,
      mouth6: 1,
      mouth7: 1,
      mouth8: 1,
      "smile-closed": 1,
      smile: 1,
      smile2: 1,
      smile3: 1,
    },
    nose: {
      nose1: 1,
      nose2: 0.65,
      nose3: 1,
      nose4: 2,
      nose5: 1,
      nose6: 0.3,
      nose7: 0.2,
      nose8: 0.2,
      nose9: 2,
      nose10: 1,
      nose11: 1,
      nose12: 1,
      nose13: 1,
      nose14: 1,
      honker: 1,
      pinocchio: 0.1,
    },
    eyebrow: {
      eyebrow1: 1,
      eyebrow2: 1,
      eyebrow3: 1,
      eyebrow4: 1,
      eyebrow5: 1,
      eyebrow6: 1,
      eyebrow7: 1,
      eyebrow8: 1,
      eyebrow9: 1,
      eyebrow10: 1,
      eyebrow11: 1,
      eyebrow12: 1,
      eyebrow13: 1,
      eyebrow14: 1,
      eyebrow15: 1,
      eyebrow16: 1,
      eyebrow17: 1,
      eyebrow18: 1,
      eyebrow19: 1,
      eyebrow20: 1,
    },
    hair: {
      afro: 5,
      afro2: 15,
      bald: 10,
      blowoutFade: 15,
      cornrows: 7,
      cropfade: 13,
      cropfade2: 10,
      crop: 7,
      curly: 10,
      curly2: 13,
      curly3: 15,
      curlyFade1: 7,
      curlyFade2: 7,
      dreads: 12,
      emo: 1,
      "faux-hawk": 5,
      "fauxhawk-fade": 7,
      hair: 3,
      high: 10,
      juice: 15,
      "messy-short": 15,
      messy: 15,
      "middle-part": 12,
      parted: 10,
      shaggy1: 3,
      crop: 7,
      "short-fade": 20,
      crop: 7,
      short3: 25,
      crop: 7,
      spike2: 10,
      spike4: 10,
      "tall-fade": 20,
    },
    accessories: { none: 80, headband: 10, "headband-high": 10 },
    glasses: { none: 95, "glasses1-primary": 7, "glasses1-secondary": 3 },
    eyeLine: { none: 80, line1: 15, line2: 5 },
    smileLine: { none: 85, line1: 5, line4: 10 },
    miscLine: {
      none: 85,
      chin2: 3,
      forehead2: 3,
      forehead3: 3,
      forehead4: 3,
      freckles1: 1,
      freckles2: 1,
    },
    facialHair: {
      none: 60,
      "beard-point": 2,
      beard1: 2,
      beard2: 2,
      beard3: 1,
      beard4: 1,
      beard5: 1,
      beard6: 1,
      "chin-strap": 2,
      "chin-strapStache": 3,
      fullgoatee: 0.5,
      fullgoatee2: 0.5,
      fullgoatee3: 0.5,
      fullgoatee4: 0.5,
      fullgoatee5: 0.5,
      fullgoatee6: 0.5,
      "goatee1-stache": 3,
      goatee1: 0.1,
      goatee2: 0.1,
      goatee3: 0.1,
      goatee4: 0.1,
      goatee5: 0.1,
      goatee6: 0.1,
      goatee7: 0.1,
      goatee8: 0.1,
      goatee9: 0.1,
      goatee10: 0.1,
      goatee11: 0.1,
      goatee12: 0.1,
      goatee13: 0.1,
      goatee14: 0.1,
      goatee15: 0.1,
      goatee16: 0.1,
      goatee17: 0.1,
      goatee18: 0.1,
      goatee19: 0.1,
      "honest-abe": 3,
      "honest-abe-stache": 1,
      mustache1: 4,
      "mustache-thin": 3,
      soul: 5,
    },
  };

  return weighted_random_choice(features[feature]);
};

const round_decimal$1 = (val, places) => {
  var factor = 10 ** places;
  return Math.round(val * 1.0 * factor) / factor;
};

const generate_face = (ethnicity, weight) => {
  const colors = {
    white: {
      skin: ["#f2d6cb", "#ddb7a0"],
      hair: [
        "#272421",
        "#3D2314",
        "#5A3825",
        "#CC9966",
        "#2C1608",
        "#B55239",
        "#e9c67b",
        "#D7BF91",
      ],
    },
    asian: {
      skin: ["#f5dbad"],
      hair: ["#272421", "#0f0902"],
    },
    hispanic: {
      skin: ["#bb876f", "#aa816f", "#a67358"],
      hair: ["#272421", "#1c1008"],
    },
    black: { skin: ["#ad6453", "#74453d", "#5c3937"], hair: ["#272421"] },
  };

  const defaultTeamColors = ["#89bfd3", "#7a1319", "#07364f"];

  const eyeAngle = Math.round(Math.random() * 25 - 10);

  const palette = colors[ethnicity];
  const skinColor = palette.skin[Math.floor(Math.random() * palette.skin.length)];
  const hairColor = palette.hair[Math.floor(Math.random() * palette.hair.length)];
  const isFlipped = Math.random() < 0.5;

  const face = {
    fatness: round_decimal$1(normal_trunc$1((weight - 180) / 180, 0.2, 0, 1), 2),
    teamColors: defaultTeamColors,
    body: {
      id: random_facial_feature("body"),
      color: skinColor,
    },
    jersey: {
      id: random_facial_feature("jersey"),
    },
    ear: {
      id: random_facial_feature("ear"),
      size: round_decimal$1(0.5 + Math.random(), 2),
    },
    head: {
      id: random_facial_feature("head"),
      shave: `rgba(0,0,0,${Math.random() < 0.25 ? round_decimal$1(Math.random() / 5, 2) : 0})`,
    },
    eyeLine: {
      id: random_facial_feature("eyeLine"),
    },
    smileLine: {
      id: random_facial_feature("smileLine"),
      size: round_decimal$1(0.25 + 2 * Math.random(), 2),
    },
    miscLine: {
      id: random_facial_feature("miscLine"),
    },
    facialHair: {
      id: random_facial_feature("facialHair"),
    },
    eye: { id: random_facial_feature("eye"), angle: eyeAngle },
    eyebrow: {
      id: random_facial_feature("eyebrow"),
      angle: Math.round(Math.random() * 35 - 15),
    },
    hair: {
      id: random_facial_feature("hair"),
      color: hairColor,
      flip: isFlipped,
    },
    mouth: {
      id: random_facial_feature("mouth"),
      flip: isFlipped,
    },
    nose: {
      id: random_facial_feature("nose"),
      flip: isFlipped,
      size: round_decimal$1(0.5 + Math.random() * 0.75, 2),
    },
    glasses: {
      id: random_facial_feature("glasses"),
    },
    accessories: {
      id: random_facial_feature("accessories"),
    },
  };

  return face;
};

const create_player_face = async (many_or_single, player_ids, db) => {
  if (many_or_single == "many") {
    const players = db.player.find({ player_id: { $in: player_ids } });

    for (const player of players) {
      player.player_face = generate_face(player.ethnicity, player.body.weight);
    }

    db.player.update(players);
    await db.saveDatabaseAsync();

    return players;
  } else {
    const player_id = player_ids;

    const player = db.player.findOne({ player_id: player_id });

    player.player_face = generate_face(player.ethnicity, player.body.weight);

    db.player.update(player, player.player_id);

    return player.player_face;
  }
};

const create_coach_face = async (many_or_single, coach_ids, db) => {
  if (many_or_single == "many") {
    const coaches = await db.coach.bulkGet(coach_ids);

    for (const coach of coaches) {
      coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);
    }

    await db.coach.update(coaches);

    return coaches;
  } else {
    const coach_id = coach_ids;

    const coach = await db.coach.get({ coach_id: coach_id });

    coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);

    await db.coach.put(coach, coach.coach_id);

    return coach.coach_face;
  }
};

const real_gauss = (mean, sigma) => {
  let radius = 0;
  let z1;
  let z2;

  do {
    z1 = 2 * Math.random() - 1;
    z2 = 2 * Math.random() - 1;
    radius = z1 * z1 + z2 * z2;
  } while (radius >= 1 || radius === 0); // only use inside the unit circle

  const marsaglia = Math.sqrt((-2 * Math.log(radius)) / radius);
  return z1 * marsaglia * sigma + mean;
};

const normal_trunc$1 = (mean, sigma, min, max) => {
  var r = min;
  var loop_count = 0;
  while ((r <= min || r >= max) && loop_count < 100) {
    r = real_gauss(mean, sigma);
    loop_count += 1;
  }

  if (loop_count >= 100) {
    r = mean;
    if (r > max) {
      r = max;
    } else if (r < min) {
      r = min;
    }
  }

  return r;
};

const normal_trunc_bounce = (mean, sigma, min, max) => {
  var r = real_gauss(mean, sigma);

  if (r > max) {
    r = max;
  } else if (r < min) {
    r = min;
  }

  return r;
};

const inches_to_height = (all_inches) => {
  var feet = Math.floor(all_inches / 12);
  var inches = Math.floor(all_inches % 12);

  return `${feet}'${inches}"`;
};

const body_from_position = (position) => {
  const position_measurables = {
    coach: {
      height_avg: 72,
      height_std: 1,
      weight_avg: 230,
      weight_std: 25,
    },
    QB: {
      height_avg: 74.91,
      height_std: 1.79,
      weight_avg: 212.94,
      weight_std: 10.64,
    },
    RB: {
      height_avg: 70.24,
      height_std: 1.83,
      weight_avg: 212.94,
      weight_std: 13.65,
    },
    FB: { height_avg: 70, height_std: 2, weight_avg: 220, weight_std: 13.65 },
    WR: {
      height_avg: 72.7,
      height_std: 2.36,
      weight_avg: 202.91,
      weight_std: 15.36,
    },
    TE: {
      height_avg: 76.2,
      height_std: 1.34,
      weight_avg: 251.48,
      weight_std: 8.7,
    },
    OT: {
      height_avg: 77.61,
      height_std: 1.12,
      weight_avg: 313.74,
      weight_std: 10.95,
    },
    IOL: {
      height_avg: 76.07,
      height_std: 1.16,
      weight_avg: 314.75,
      weight_std: 11.76,
    },
    EDGE: {
      height_avg: 75.83,
      height_std: 1.44,
      weight_avg: 260,
      weight_std: 14.81,
    },
    DL: {
      height_avg: 74.92,
      height_std: 1.43,
      weight_avg: 307.49,
      weight_std: 15.8,
    },
    LB: {
      height_avg: 73.22,
      height_std: 1.27,
      weight_avg: 240.96,
      weight_std: 6.6,
    },
    CB: {
      height_avg: 71.35,
      height_std: 1.59,
      weight_avg: 193.42,
      weight_std: 8.76,
    },
    S: {
      height_avg: 72.15,
      height_std: 1.5,
      weight_avg: 206.38,
      weight_std: 9.08,
    },
    K: { height_avg: 71.89, height_std: 2, weight_avg: 195, weight_std: 17 },
    P: {
      height_avg: 74.31,
      height_std: 1.89,
      weight_avg: 213,
      weight_std: 14.6,
    },
  };

  var height_inches = Math.floor(
    normal_trunc$1(
      position_measurables[position]["height_avg"],
      position_measurables[position]["height_std"],
      66,
      81
    )
  );
  var body = { height_inches: height_inches };

  var height_variations = 0; //(height_inches - position_measurables[position]['height_avg']) / position_measurables[position]['height_std'];
  var weight = Math.floor(
    normal_trunc$1(
      position_measurables[position]["weight_avg"] * (1 + height_variations / 4),
      position_measurables[position]["weight_std"] * 0.8,
      150,
      390
    )
  );

  body.weight = weight;
  body.height = inches_to_height(body.height_inches);

  return body;
};

const initialize_scoreboard = () => {
  if ($(".MultiCarousel-inner").children().length == 0) {
    $(".scoreboard-slideshow").remove();
    return 0;
  }
  var itemsMainDiv = ".MultiCarousel";
  var itemsDiv = ".MultiCarousel-inner";
  var itemWidth = "";
  var initialOffset = 20;
  $(".leftLst, .rightLst").click(function () {
    var condition = $(this).hasClass("leftLst");
    if (condition) click(0, this);
    else click(1, this);
  });

  ResCarouselSize();

  $(window).resize(function () {
    ResCarouselSize();
  });

  //this function define the size of the items
  function ResCarouselSize() {
    var incno = 0;
    var dataItems = "data-items";
    var itemClass = ".scoreboard-carousel-item";
    var id = 0;
    var btnParentSb = "";
    var itemsSplit = "";
    var sampwidth = $(itemsMainDiv).width();
    var bodyWidth = $("body").width();
    $(itemsDiv).each(function () {
      id = id + 1;
      var itemNumbers = $(this).find(itemClass).length;
      btnParentSb = $(this).parent().attr(dataItems);
      console.log({});
      itemsSplit = btnParentSb.split(",");
      $(this)
        .parent()
        .attr("id", "MultiCarousel" + id);

      if (bodyWidth >= 1200) {
        incno = itemsSplit[3];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 992) {
        incno = itemsSplit[2];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 768) {
        incno = itemsSplit[1];
        itemWidth = sampwidth / incno;
      } else {
        incno = itemsSplit[0];
        itemWidth = sampwidth / incno;
      }
      $(this).css({
        transform: "translateX(" + initialOffset + "px)",
        width: itemWidth * itemNumbers,
      });
      $(this)
        .find(itemClass)
        .each(function () {
          $(this).outerWidth(itemWidth);
        });

      $(".leftLst").addClass("over");
      $(".rightLst").removeClass("over");
    });
  }

  //this function used to move the items
  function ResCarousel(e, el, s) {
    var leftBtn = ".leftLst";
    var rightBtn = ".rightLst";
    var translateXval = "";
    var divStyle = $(el + " " + itemsDiv).css("transform");
    var values = divStyle.match(/-?[\d\.]+/g);
    var xds = Math.abs(values[4]);
    if (e == 0) {
      translateXval = parseInt(xds) - parseInt(itemWidth * s);
      $(el + " " + rightBtn).removeClass("over");

      if (translateXval <= itemWidth / 2) {
        translateXval = -1 * initialOffset;
        $(el + " " + leftBtn).addClass("over");
      }
    } else if (e == 1) {
      var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
      translateXval = parseInt(xds) + parseInt(itemWidth * s);
      $(el + " " + leftBtn).removeClass("over");

      if (translateXval >= itemsCondition - itemWidth / 2) {
        translateXval = itemsCondition + initialOffset;
        $(el + " " + rightBtn).addClass("over");
      }
    }
    $(el + " " + itemsDiv).css("transform", "translateX(" + -translateXval + "px)");
  }

  //It is used to get some elements from btn
  function click(ell, ee) {
    var Parent = "#" + $(ee).parent().attr("id");
    var slide = $(Parent).attr("data-slide");
    ResCarousel(ell, Parent, slide);
  }

  $(".scoreboard-carousel-item.w3-hide").each(function (ind, obj) {
    $(obj).removeClass("w3-hide");
  });
};

const tier_placement = (tiers, population_size, distribution, rank_place) => {
  console.log({
    tiers: tiers,
    population_size: population_size,
    distribution: distribution,
    rank_place: rank_place,
  });
  Array(tiers)
    .fill(1)
    .map((x, y) => x + y);
  var tier_dict = {};
  for (var i = 1; i <= tiers; i++) {
    tier_dict[i] = {
      start: null,
      stop: null,
      segment_size: 0,
      segment_ratio: 0,
      population_count: 0,
    };
  }

  var middle_tier = Math.floor(tiers / 2) + 1;
  var total_segment_size = 0;

  var previous_stop = 0;
  var placement = 0;

  if (distribution == "Normal") {
    for (var tier in tier_dict) {
      var tier_obj = tier_dict[tier];
      tier_obj.segment_size = middle_tier - Math.abs(middle_tier - tier);
      total_segment_size += tier_obj.segment_size;
    }
  } else if (distirbution == "Uniform") {
    console.log("tier", tier);
  }

  for (var tier in tier_dict) {
    var tier_obj = tier_dict[tier];
    tier_obj.segment_ratio = tier_obj.segment_size / total_segment_size;
    tier_obj.population_count = Math.ceil(tier_obj.segment_ratio * population_size);

    tier_obj.start = previous_stop + 1;
    tier_obj.stop = tier_obj.start + tier_obj.population_count;
    previous_stop = tier_obj.stop;

    if (rank_place >= tier_obj.start && rank_place <= tier_obj.stop) {
      placement = tier;
    }
  }

  console.log({ placement: placement });

  return placement;
};

const ordinal = (num) => {
  var s = ["th", "st", "nd", "rd"],
    v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

const geo_marker_action = async (common) => {
  console.log("Adding geo_marker_action");
  common.ddb;
  $(".geo-marker").on("click", async function () {
    let city = $(this).attr("city");
    let state = $(this).attr("state");

    let location = await ddb.cities.get({ city: city, state: state });
    console.log({
      common: common,
      this: $(this),
      t: this,
    });

    let modal_config = common.page;

    if (!modal_config) {
      modal_config = {
        PrimaryColor: $(this).closest("tr").attr("primary-color"),
        SecondaryColor: $(this).closest("tr").attr("secondary-color"),
      };
    }

    const icon = L.divIcon({
      html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: ${modal_config.PrimaryColor};"></i>`,
      iconSize: [40, 40],
      iconAnchor: [15, 40],
    });

    var modal_url = "/static/html_templates/common_templates/geography_modal_template.njk";
    var html = await fetch(modal_url);
    html = await html.text();
    var renderedHtml = await common.nunjucks_env.renderString(html, {
      page: modal_config,
      location: location,
    });
    console.log({ renderedHtml: renderedHtml });
    $("#geography-modal").html(renderedHtml);
    $("#geography-modal").addClass("shown");

    let map = L.map("map-body").setView([location.lat, location.long], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    L.marker([location.lat, location.long], { icon: icon }).addTo(map);

    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#geography-modal")[0]) {
        $("#geography-modal").removeClass("shown");
        $(window).unbind();
      }
    });
  });
};

const update_create_world_modal = async (completed_stage_id, started_stage_id) => {
  $("#" + completed_stage_id).html(
    '<i class="fa fa-check-circle" style="color:green; font-size: 20px;"></i>'
  );
  $("#" + started_stage_id).html(
    '<div class="spinner-border spinner-border-sm" role="status"></div>'
  );
};

const new_world_action = async (common, database_suffix) => {
  $(".conference-select-table").addClass("w3-hide");
  $(".create-progress-table").removeClass("w3-hide");

  await update_create_world_modal(null, "create-world-table-new-world");

  const new_db = await create_new_db();

  const db = await new_db["db"];

  const new_season_info = new_db["new_season_info"];

  const world_id = new_season_info.world_id;
  const season = new_season_info.current_season;

  common.db = db;
  common.season = season;

  var teams_from_json = await get_teams();

  var conferences_from_json = await get_conferences(database_suffix);
  console.log({ conferences_from_json: conferences_from_json });

  var school_names_to_include = [];
  const conference_name_by_school_name = {};

  $.each(conferences_from_json, function (ind, conference) {
    conference.world_id = world_id;
    conference.conference_id = ind + 1;

    let school_names = conference.divisions.map((d) => d.teams);
    school_names = school_names.flat();
    school_names_to_include = school_names_to_include.concat(school_names);

    for (var school_name of school_names) {
      conference_name_by_school_name[school_name] = conference.conference_name;
    }
  });

  console.log("adding", { db: db, "db.conference": db.conference, conferences_from_json });
  db.conference.insert(conferences_from_json);
  var conferences = db.conference.find();

  teams_from_json = teams_from_json.filter((t) => school_names_to_include.includes(t.school_name));
  const num_teams = teams_from_json.length;

  const season_data = {
    season: season,
    world_id: world_id,
    captains_per_team: 3,
    players_per_team: 70,
    num_teams: num_teams,
  };
  const new_season = new league_season(season_data, undefined);
  console.log({ new_season: new_season });
  db.league_season.insert(new_season);

  console.log({ season: season, common: common, db: db, new_season_info: new_season_info });
  const phases_created = await create_phase(season, common);
  await create_week(phases_created, common, world_id, season);

  const rivalries = await get_rivalries(teams_from_json);

  await create_conference_seasons({
    common: common,
    conferences: conferences,
    season: season,
    world_id: world_id,
  });
  var conference_seasons = index_group_sync$1(db.conference_season.find(), "index", "conference_id");

  conferences = nest_children$1(
    conferences,
    conference_seasons,
    "conference_id",
    "conference_season"
  );
  const conferences_by_conference_name = index_group_sync$1(conferences, "index", "conference_name");
  const conferences_by_school_name = {};

  console.log({
    conference_name_by_school_name: conference_name_by_school_name,
  });

  for (let [school_name, conference_name] of Object.entries(conference_name_by_school_name)) {
    conferences_by_school_name[school_name] =
      conferences_by_conference_name[conference_name_by_school_name[school_name]];
    console.log({
      school_name: school_name,
      conference_name: conference_name,
    });
  }

  console.log({
    conferences_by_school_name: conferences_by_school_name,
    conference_name_by_school_name: conference_name_by_school_name,
    conferences_by_conference_name: conferences_by_conference_name,
  });

  var teams = [],
    rivals = [],
    rivals_team_1 = [],
    rivals_team_2 = [];
  const jersey_options = [
    "football-standard",
    "football-ponies",
    "football-sparta",
    "football-three-stripe",
    "football-two-stripe",
  ];

  let cities = ddb.cities.find();
  console.log({ cities: cities });
  let cities_by_city_state = index_group_sync$1(cities, "index", "city_state");

  teams_from_json = teams_from_json.sort((t_a, t_b) =>
    t_a.school_name > t_b.school_name ? 1 : -1
  );

  var team_id_counter = 1;
  for (let team of teams_from_json) {
    if (team.jersey.invert) {
      team.jersey.teamColors = [
        "#FFFFFF",
        `#${team.team_color_primary_hex}`,
        `#${team.team_color_secondary_hex}`,
      ];
    } else if (team.jersey.flip_primaries) {
      team.jersey.teamColors = [
        `#${team.team_color_secondary_hex}`,
        `#${team.team_color_primary_hex}`,
        "#FFFFFF",
      ];
    } else {
      team.jersey.teamColors = [
        `#${team.team_color_primary_hex}`,
        `#${team.team_color_secondary_hex}`,
        "#FFFFFF",
      ];
    }

    if (team.jersey.lettering) {
      team.jersey.lettering_color = team.jersey.lettering_color || "FFFFFF";
    }

    team.jersey.id =
      team.jersey.id || jersey_options[Math.floor(Math.random() * jersey_options.length)];

    rivals_team_1 = rivalries
      .filter((r) => r.team_name_1 == team.school_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_2,
          opponent_team_id: null,
          preferred_week_number: r.preferred_week_number,
          rivalry_name: r.rivalry_name,
        };
      });
    rivals_team_2 = rivalries
      .filter((r) => r.team_name_2 == team.school_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_1,
          opponent_team_id: null,
          preferred_week_number: r.preferred_week_number,
          rivalry_name: r.rivalry_name,
        };
      });

    rivals = rivals_team_1.concat(rivals_team_2);

    console.log({
      conferences_by_school_name: conferences_by_school_name,
      team: team,
    });

    team.location.lat = cities_by_city_state[team.location.city + ", " + team.location.state].lat;
    team.location.long = cities_by_city_state[team.location.city + ", " + team.location.state].long;

    teams.push({
      team_id: team_id_counter,
      school_name: team.school_name,
      team_name: team.team_name,
      world_id: world_id,
      team_logo_url: team.team_logo_url,
      team_abbreviation: team.team_abbreviation,
      team_color_primary_hex: team.team_color_primary_hex,
      team_color_secondary_hex: team.team_color_secondary_hex,
      rivals: rivals,
      jersey: team.jersey,
      field: team.field,
      team_ratings: team.team_ratings,
      location: team.location,
      starting_tendencies: team.starting_tendencies,
      conference: {
        conference_id: conferences_by_school_name[team.school_name].conference_id,
        conference_name: conferences_by_school_name[team.school_name].conference_name,
      },
    });

    team_id_counter += 1;
  }

  teams.push({
    team_id: -1,
    school_name: "Available",
    team_name: "Players",
    world_id: world_id,
    team_abbreviation: "AVAIL",
    team_color_primary_hex: "1763B2",
    team_color_secondary_hex: "FFFFFF",
    rivals: [],
    jersey: {
      invert: false,
      id: "football-standard",
      teamColors: ["#1763B2", "#000000", "#FFFFFF"],
    },
    team_ratings: {},
    location: {
      city: "Washington",
      state: "DC",
    },
    conference: {},
  });

  teams.push({
    team_id: -2,
    school_name: season,
    team_name: "Recruits",
    world_id: world_id,
    team_abbreviation: "RECRUIT",
    team_color_primary_hex: "1763B2",
    team_color_secondary_hex: "FFFFFF",
    rivals: [],
    jersey: {
      invert: false,
      id: "football-standard",
      teamColors: ["#1763B2", "#000000", "#FFFFFF"],
    },
    team_ratings: {},
    location: {
      city: "Washington",
      state: "DC",
    },
    conference: {},
  });

  const teams_by_team_name = index_group_sync$1(teams, "index", "school_name");

  let city_names = {};
  $.each(teams, function (ind, team) {
    $.each(team.rivals, function (ind, rival) {
      rival.opponent_team_id = teams_by_team_name[rival.opponent_name].team_id;
    });

    city_names[team.location.city] = (city_names[team.location.city] || 0) + 1;
  });

  for (let team of teams) {
    team.location.unique_city_name = city_names[team.location.city] == 1;
  }

  console.log({ teams: teams, city_names: city_names });
  await db.team.insert(teams);

  await update_create_world_modal(
    "create-world-table-new-world",
    "create-world-table-create-teams"
  );

  await create_team_season({
    common: common,
    season: season,
    world_id: world_id,
    conferences_by_conference_name: conferences_by_conference_name,
  });

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  teams = db.team.find({ team_id: { $gt: 0 } });
  // teams.forEach(t => delete t.starting_tendencies);
  // await db.team.update(teams);

  const teams_by_team_id = index_group_sync$1(teams, "index", "team_id");

  await update_create_world_modal(
    "create-world-table-create-teams",
    "create-world-table-create-coaches"
  );

  await create_coaches({
    common: common,
    team_seasons: team_seasons,
    teams_by_team_id: teams_by_team_id,
    world_id: world_id,
    season: season,
  });

  await update_create_world_modal(
    "create-world-table-create-coaches",
    "create-world-table-assign-coaches"
  );

  var coaches = db.coach.find();
  await create_coach_team_seasons({
    common: common,
    coaches: coaches,
    world_id: world_id,
    team_seasons: team_seasons,
    season: season,
  });

  await update_create_world_modal(
    "create-world-table-assign-coaches",
    "create-world-table-create-players"
  );

  await create_new_players_and_player_team_seasons(common, world_id, season, team_seasons, [
    "HS SR",
    "FR",
    "SO",
    "JR",
    "SR",
  ]);

  await update_create_world_modal(
    "create-world-table-create-players",
    "create-world-table-player-ratings"
  );

  await generate_player_ratings(common, world_id, season);

  await update_create_world_modal(
    "create-world-table-player-ratings",
    "create-world-table-assign-players"
  );

  await assign_players_to_teams(common, world_id, season, team_seasons);

  await assign_player_jersey_numbers(common, season);

  await update_create_world_modal(
    "create-world-table-assign-players",
    "create-world-table-depth-charts"
  );
  await populate_all_depth_charts(common);

  await update_create_world_modal(
    "create-world-table-depth-charts",
    "create-world-table-team-talent"
  );
  await calculate_team_overalls(common);

  await update_create_world_modal(
    "create-world-table-team-talent",
    "create-world-table-recruiting-class"
  );
  await calculate_team_needs(common);
  await create_recruiting_class(common);

  await update_create_world_modal(
    "create-world-table-recruiting-class",
    "create-world-table-rankings"
  );
  const all_weeks = db.week.find({ season: season });
  const this_week = all_weeks.filter((w) => w.is_current)[0];

  this_week.phase = db.phase.findOne({ phase_id: this_week.phase_id });
  this_week.phase.season = season;

  console.log("this_week", this_week, all_weeks, common);

  await calculate_national_rankings(this_week, all_weeks, common);
  await calculate_conference_rankings(this_week, all_weeks, common);

  await update_create_world_modal(
    "create-world-table-rankings",
    "create-world-table-create-schedule"
  );
  await create_schedule({
    common: common,
    season: season,
    world_id: world_id,
  });

  await choose_preseason_all_americans(common);

  await update_create_world_modal("create-world-table-create-schedule", null);

  conferences = db.conference.find();
  teams = db.team.find({ team_id: { $gt: 0 } });
  console.log({ teams: teams });
  teams.sort(function (t_a, t_b) {
    if (t_b.conference.conference_name > t_a.conference.conference_name) {
      return -1;
    } else if (t_b.conference.conference_name < t_a.conference.conference_name) {
      return 1;
    } else {
      if (t_b.school_name > t_a.school_name) {
        return -1;
      } else if (t_b.school_name < t_a.school_name) {
        return 1;
      }
    }
    return 0;
  });
  console.log({ teams: teams });
  var url = "/static/html_templates/index/index/choose_team_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  let render_content = {
    teams: teams,
  };

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $(".choose-team-table").html(renderedHtml);
  $(".create-progress-table").addClass("w3-hide");
  $(".choose-team-table").removeClass("w3-hide");

  geo_marker_action(common);
  init_basic_table_sorting(common, "#choose-team-table", 0);
  $(".modal-dialog").css("max-width", "85%");
  $(".modal-dialog").css("width", "85%");

  console.log({
    db: db,
    ddb: ddb,
    world_id: world_id,
    season: season,
  });
  const current_league_season = db.league_season.findOne({ season: season });
  const world = ddb.world.findOne({ world_id: world_id });
  world.current_league_season = current_league_season;

  $(".choose-team-table button").on("click", async function () {
    let team_id = parseInt($(this).closest("[team-id]").attr("team-id"));
    const user_team = db.team.findOne({ team_id: team_id });

    const user_team_season = db.team_season.findOne({
      team_id: team_id,
      season: current_league_season.season,
    });

    console.log({
      user_team: user_team,
      user_team_season: user_team_season,
      current_league_season: current_league_season,
      team_id: team_id,
      teams: teams,
      this: $(this),
    });

    current_league_season.user_team_id = team_id;
    user_team_season.is_user_team = true;
    user_team.is_user_team = true;

    world.user_team = {};
    world.user_team.team_name = user_team.team_name;
    world.user_team.school_name = user_team.school_name;
    world.user_team.team_logo_url = user_team.team_logo;
    world.user_team.team_record = "0-0";
    world.user_team.team_id = user_team.team_id;

    ddb.world.update(world);
    db.league_season.update(current_league_season);
    db.team_season.update(user_team_season);
    db.team.update(user_team);

    // console.log({
    //   db:db, ddb:ddb
    // })
    // debugger;

    await ddb.saveDatabaseAsync();
    await db.saveDatabaseAsync();

    window.location.href = `/World/${world_id}`;
  });
};

Array.prototype.add_element_sorted_list = function (elem, compare_func) {
  if (this.length == 0) {
    this.push(elem);
  } else {
    let insert_index = this.findIndex((e) => compare_func(e, elem) >= 0);

    if (insert_index == -1) {
      this.push(elem);
    } else {
      this.splice(insert_index, 0, elem);
    }
  }
};

Array.prototype.top_sort = function (top_n, compare_func) {
  if (this.length == 0) {
    return [];
  }

  let top_list = [];
  this.forEach(function (elem) {
    if (top_list.length < top_n || compare_func(elem, top_list[top_list.length - 1])) {
      top_list.add_element_sorted_list(elem, compare_func);

      if (top_list.length > top_n) {
        top_list.pop();
      }
    }
  });

  return top_list;
};

$(document).ready(async function () {
  var startTime = performance.now();

  $(document).on("click", async function (event) {
    const target = $(event.target);
    const parent_link = $(target).closest("[href]");
    const href = parent_link.attr("href");

    if (href) {
      event.preventDefault();
      history.pushState({ path: href }, "", href);
      await page(href);
    }

    $(".item").removeClass("active");
    target.addClass("active");
  });

  window.onpopstate = async function () {
    await page(location.pathname);
  };

  // await action(common);

  await page(location.pathname);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});

const page = async (path) => {
  const common = await common_functions(path);
  var startTime = performance.now();
  common.startTime = startTime;

  console.log({
    common: common,
    winning_route: common.winning_route,
    "common.winning_route.f": common.winning_route.f,
  });

  await common.winning_route.f(common);

  await add_listeners(common);
  var endTime = performance.now();
  console.log(`Time taken to render ${path}: ${parseInt(endTime - startTime)} ms`);
};
