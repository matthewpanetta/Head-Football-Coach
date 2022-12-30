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
        console.log("found key in dict", {
          obj: obj,
          key: key,
          iter_obj: iter_obj,
          key_part: key_part,
          "iter_obj[key_part]": iter_obj[key_part],
        });
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

export function NumberToGrade(number_value, scale) {
  scale = scale || 100;

  let adj_number_value = Math.floor((number_value * 1.0) / (scale / 20));
  let grade_value_map = {
    20: "Elite",
    19: "A++",
    18: "A+",
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
    4: "F-",
    3: "F-",
    2: "F--",
    1: "F--",
  };

  return grade_value_map[adj_number_value] || "Elite";
}

export const ordinal = (num) => {
  var s = ["th", "st", "nd", "rd"],
    v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};
