import { index_group_sync } from "./utils.js";

export const draw_player_faces = async (common) => {
  const db = common.db;
  const season = common.season;

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
  const player_team_seasons_by_player_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_id"
  );

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

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

export const draw_coach_faces = async (common) => {
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
  const coach_team_seasons_by_coach_id = index_group_sync(coach_team_seasons, "index", "coach_id");

  const team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

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
