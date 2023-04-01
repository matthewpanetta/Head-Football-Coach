export const index_group_sync = (data, group_type, key) => {
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

export const get = (obj, key) => {
  return get_from_dict(obj, key);
};

export const set = (obj, key, val) => {
  const keys = key.split(".");
  var drill_obj = obj;

  for (var i = 0; i < keys.length; i++) {
    var new_key = keys[i];
    if (!(new_key in drill_obj)) {
      if (i == keys.length - 1) {
        drill_obj[new_key] = null;
        break;
      }
      drill_obj[new_key] = {};
    }
    drill_obj = drill_obj[new_key];
  }

  drill_obj[new_key] = val;
  return obj;
};

export const distinct = (arr) => {
  return [...new Set(arr)];
};

export const sum = (arr) => {
  return arr.reduce((a, b) => a + b, 0);
};

export const nest_children = (parent_array, child_dict, join_key, store_key) => {
  if (Array.isArray(child_dict)) {
    console.log("********POTENTIAL BUG************");
    console.log("Array being passed to nest_children!!!!!!!");
  }

  for (const parent of parent_array) {
    parent[store_key] = child_dict[parent[join_key]];
  }

  return parent_array;
};

export const deep_copy = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (obj.constructor === RegExp) {
    return obj;
  }

  const return_value = new obj.constructor();

  for (const key of Object.keys(obj)) {
    return_value[key] = deep_copy(obj[key]);
  }

  return return_value;
};

export const get_from_dict = (obj, key) => {
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

export const increment_parent = (child, parent) => {
  for (const key of Object.keys(child)) {
    if (!(key in parent)) {
      parent[key] = deep_copy(child[key]);
      continue;
    }

    if (typeof child[key] == "object") {
      increment_parent(child[key], parent[key]);
    } else {
      if (key == "lng") {
        parent[key] = Math.max(parent[key] || 0, child[key] || 0);
      } else if (key == "games_played" || key == "team_games_played") {
        parent[key] = (parent[key] || 0) + 1;
      } else {
        parent[key] = (parent[key] || 0) + (child[key] || 0);
      }
    }
  }
};

export const intersect = (a, b) => {
  var c = a.filter((a_val) => b.includes(a_val));
  return c;
};

export const set_intersect = (a, b) => {
  return new Set([...a].filter((elem) => b.has(elem)));
};

export const union = (a, b) => {
  var c = a.concat(b.filter((item) => a.indexOf(item) < 0));
  return c;
};

export const set_union = (a, b) => {
  return new Set([...a, ...b]);
};

export const except = (a, b) => {
  var c = a.filter((x) => !b.includes(x));
  return c;
};

export const set_except = (a, b) => {
  return new Set([...a].filter((x) => !b.has(x)));
};

export const round_decimal = (val, places) => {
  var factor = 10 ** places;
  return Math.round(val * 1.0 * factor) / factor;
};

export const real_gauss = (mean, sigma) => {
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

export const normal_trunc = (mean, sigma, min, max) => {
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

export const normal_trunc_bounce = (mean, sigma, min, max) => {
  var r = real_gauss(mean, sigma);

  if (r > max) {
    r = max;
  } else if (r < min) {
    r = min;
  }

  return r;
};

export const shuffle = (a) => {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};

export const uniform_random_choice = (options) => {
  return options[Math.floor(Math.random() * options.length)];
};

export const weighted_random_choice = (options, default_val, choice_count = 1) => {
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
  let chosen_value = null;
  while (choice_count > 0) {
    let r = Math.floor(Math.random() * total);
    let chosen_obj = data.find((opt) => opt[2] >= r) || [default_val];
    chosen_value = chosen_obj[0];
    chosen_value_list.push(chosen_value);

    choice_count -= 1;
  }

  if (chosen_value_list.length == 1) {
    return chosen_value_list[0];
  }
  else {
    console.log({chosen_value:chosen_value, options:options, choice_count:choice_count})
    return chosen_value_list;
  }

  
};

export function NumberToGrade(number_value, scale) {
  scale = scale || 100;

  if (scale == 20){
    let adj_number_value = Math.floor((number_value * 1.0) / (scale / 20));
    let grade_value_map = {
      20: "A++",
      19: "A+",
      18: "A",
      17: "A",
      16: "A-",
      15: "B+",
      14: "B",
      13: "B-",
      12: "B-",
      11: "C+",
      10: "C",
      9: "C-",
      8: "D+",
      7: "D",
      6: "D-",
      5: "F",
      4: "F",
      3: "F-",
      2: "F-",
      1: "F-",
      0: "F--",
    };

    let letter_grade =  grade_value_map[adj_number_value]
    return letter_grade || "Elite";
  }
  else {
    const grade_value_map = [
      { letter_grade: "Elt", lower_bound: 99, upper_bound: 1000 },
      { letter_grade: "A+", lower_bound: 96, upper_bound: 98 },
      { letter_grade: "A", lower_bound: 93, upper_bound: 95 },
      { letter_grade: "A-", lower_bound: 90, upper_bound: 92 },
      { letter_grade: "B+", lower_bound: 87, upper_bound: 89 },
      { letter_grade: "B", lower_bound: 83, upper_bound: 86 },
      { letter_grade: "B-", lower_bound: 80, upper_bound: 82 },
      { letter_grade: "C+", lower_bound: 77, upper_bound: 79 },
      { letter_grade: "C", lower_bound: 73, upper_bound: 76 },
      { letter_grade: "C-", lower_bound: 70, upper_bound: 72 },
      { letter_grade: "D+", lower_bound: 67, upper_bound: 69 },
      { letter_grade: "D", lower_bound: 63, upper_bound: 66 },
      { letter_grade: "D-", lower_bound: 60, upper_bound: 62 },
      { letter_grade: "F", lower_bound: 50, upper_bound: 59 },
      { letter_grade: "F-", lower_bound: 35, upper_bound: 49 },
      { letter_grade: "F--", lower_bound: -1000, upper_bound: 49 },
    ];
    let letter_grade = get(grade_value_map.find(
      (grade) => grade.lower_bound <= number_value && grade.upper_bound >= number_value
    ) || {letter_grade: 'Unk'}, 'letter_grade');

    return letter_grade || "Unk";
  }

  return "Unk";
}

export const ordinal = (num) => {
  var s = ["th", "st", "nd", "rd"],
    v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const quarter_seconds_to_time = (seconds) => {
  var seconds_in_quarter = 60 * 15;
  return seconds_to_time(seconds_in_quarter - (seconds % seconds_in_quarter));
};

export const seconds_to_time = (seconds) => {
  var seconds_left = `${seconds % 60}`;
  if (seconds_left.length < 2) {
    seconds_left = "0" + seconds_left;
  }
  return `${Math.floor(seconds / 60)}:${seconds_left}`;
};

export const average = (arr) => {
  if (arr.length == 0) {
    return 0;
  }
  return sum(arr) / arr.length;
};

export const calculate_game_score = (
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
  var weighted_game_score_value = 0;
  player_team_season.season_stats.top_stats = [];

  for (var stat_detail of game_score_map) {
    game_score_value = 0;
    season_score_value = 0;
    if (!player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat]) {
    } else {
      game_score_value = round_decimal(
        player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat] *
          stat_detail.point_to_stat_ratio,
        1
      );

      player_team_game.game_stats.games.game_score = round_decimal(
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

    if (!player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat]) {
    } else {
      season_score_value = round_decimal(
        player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat] *
          stat_detail.point_to_stat_ratio,
        1
      );

      player_team_season.season_stats.games.game_score = round_decimal(
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

export const elem_in = (elem, list) => {
  if (list instanceof Set) {
    return list.has(elem);
  } else if (Array.isArray(list)) {
    return list.includes(elem);
  }

  return false;
};

export function isScrolledIntoView(elem) {
  var docViewTop = $(window).scrollTop();
  var docViewBottom = docViewTop + document.body.clientHeight;

  var elemTop = $(elem).offset().top;
  var elemBottom = elemTop + $(elem).outerHeight();

  // console.log({
  //   t: $(elem),
  //   elemTop:elemTop, 
  //   elemBottom:elemBottom, 
  //   docViewTop:docViewTop,
  //   docViewBottom:docViewBottom,
  //   v: $(elem).is(":visible"), 
  //   r: $(elem).is(":visible") && elemTop <= docViewBottom && elemBottom >= docViewTop
  // })

  return $(elem).is(":visible") && elemTop <= docViewBottom && elemBottom >= docViewTop;
}

export const distance_between_cities = (city_a, city_b, distance_tracking_map = {}) => {
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

export const distance_between_coordinates = (coord_a, coord_b) => {
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

export const add_season_to_date = (season, date) => {
  if (date.length < 6){
    date = season + '-' + date;
  }
  return date;
}