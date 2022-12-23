export const index_group_sync = (query_list, query_type, key) => {
  var dict = {};
  if (query_type == "many_to_one" || query_type == "group") {
    query_list.forEach(function (elem) {
      dict[get(elem, key)] = dict[get(elem, key)] || [];
      dict[get(elem, key)].push(elem);
    });
  } else if (query_type == "one_to_one" || query_type == "index") {
    query_list.forEach((elem) => (dict[get(elem, key)] = elem));
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
    console.log({
      new_key: new_key,
      drill_obj: drill_obj,
      keys: keys,
      i: i,
      obj: obj,
      val: val,
      key: key,
    });
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
  
  export  const intersect = (a, b) => {
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
  