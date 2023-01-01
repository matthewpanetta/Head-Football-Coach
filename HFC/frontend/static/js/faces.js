import {
  index_group_sync,
  get,
  set,
  distinct,
  sum,
  nest_children,
  normal_trunc,
  weighted_random_choice,
  intersect,
  round_decimal,
  set_intersect,
  union,
  set_union,
  except,
  set_except,
  get_from_dict,
  deep_copy,
  isScrolledIntoView,
} from "/static/js/utils.js";

export const draw_player_faces = (common, dom_id = "") => {
  console.log("in draw_player_faces", dom_id, common);
  const db = common.db;
  const season = common.season;

  const player_ids = [];
  const face_div_by_player_id = {};

  $(".PlayerFace-Headshot:not([face_drawn='true']):visible").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0 || !isScrolledIntoView(elem)) {
      return true;
    }
    player_ids.push(parseInt($(elem).attr("player_id")));
    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
    $(elem).attr("face_drawn", "true");
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
      player.player_face = create_player_face("single", player.player_id, db);
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

  console.log('Drew players', players)

  return players;
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

  const coaches = db.coach.find({ coach_id: { $in: coach_ids } });
  var coach_team_seasons = db.coach_team_season.find({ coach_id: { $in: coach_ids } });
  coach_team_seasons = coach_team_seasons.filter((pts) => pts.season == season);
  const coach_team_seasons_by_coach_id = index_group_sync(coach_team_seasons, "index", "coach_id");

  const team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  for (var coach of coaches) {
    var elems = face_div_by_coach_id[coach.coach_id];
    coach.coach_team_season = coach_team_seasons_by_coach_id[coach.coach_id];
    coach.team_season = team_seasons_by_team_season_id[coach.coach_team_season.team_season_id];
    coach.team = teams_by_team_id[coach.team_season.team_id];

    if (coach.coach_face == undefined) {
      coach.coach_face = await create_coach_face("single", coach.coach_id, db);
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

export const display_player_face = async (face, overrides, dom_id) => {
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

export const create_player_face = (many_or_single, player_ids, db) => {
  if (many_or_single == "many") {
    const players = db.player.find({ player_id: { $in: player_ids } });

    for (const player of players) {
      player.player_face = generate_face(player.ethnicity, player.body.weight);
    }

    db.player.update(players);
    // await db.saveDatabaseAsync();

    return players;
  } else {
    const player_id = player_ids;

    const player = db.player.findOne({ player_id: player_id });

    player.player_face = generate_face(player.ethnicity, player.body.weight);

    db.player.update(player, player.player_id);

    return player.player_face;
  }
};

export const create_coach_face = async (many_or_single, coach_ids, db) => {
  if (many_or_single == "many") {
    const coaches = db.coach.find({ coach_id: { $in: coach_ids } });

    for (const coach of coaches) {
      coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);
    }

    await db.coach.update(coaches);

    return coaches;
  } else {
    const coach_id = coach_ids;

    const coach = db.coach.findOne({ coach_id: coach_id });

    coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);

    db.coach.update(coach, coach.coach_id);

    return coach.coach_face;
  }
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
    fatness: round_decimal(normal_trunc((weight - 180) / 180, 0.2, 0, 1), 2),
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
      size: round_decimal(0.5 + Math.random(), 2),
    },
    head: {
      id: random_facial_feature("head"),
      shave: `rgba(0,0,0,${Math.random() < 0.25 ? round_decimal(Math.random() / 5, 2) : 0})`,
    },
    eyeLine: {
      id: random_facial_feature("eyeLine"),
    },
    smileLine: {
      id: random_facial_feature("smileLine"),
      size: round_decimal(0.25 + 2 * Math.random(), 2),
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
      size: round_decimal(0.5 + Math.random() * 0.75, 2),
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

export const player_face_listeners = (common) => {
  draw_player_faces(common);

  // $(window).scroll(async function () {
  //   draw_player_faces(common);
  // });

  let previousScrollPosition = 0;

  $(window).on("scroll", function () {
    const currentScrollPosition = $(this).scrollTop();
    console.log("scrolling", {
      currentScrollPosition: currentScrollPosition,
      previousScrollPosition: previousScrollPosition,
      m: currentScrollPosition != previousScrollPosition,
    });
    if (currentScrollPosition != previousScrollPosition) {
      draw_player_faces(common);
    }
    previousScrollPosition = currentScrollPosition;
  });

  // $("").on("stylechange", async function (event) {
  //   console.log("style change to ", event);
  //   debugger;
  //   if (event.originalEvent.propertyName === "display") {
  //     draw_player_faces(common);
  //   }
  // });
};
