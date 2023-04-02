import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { set } from "/common/js/utils.js";

export const init_json_edit = async (common, data, dom_id = "", schema = {}) => {
  let template_url = "/html_templates/common_templates/json_edit/json_edit_template.njk";
  let template_html = await fetch(template_url);

  var template = await template_html.text();

  await populate_object(common, data, dom_id, template, schema);

  $(`#edit-player-modal-save`).on("click", async function () {
    await write_player_data(common, dom_id, data);
  });

  refresh_icon_listeners();
};

const refresh_icon_listeners = () => {
  $("i.fa-caret-down").unbind();
  $("i.fa-caret-up").unbind();

  $("i.fa-caret-down").on("click", function () {
    $(this).closest("li").find("ul,ol").addClass("hidden");
    $(this).removeClass("fa-caret-down");
    $(this).addClass("fa-caret-up");
    refresh_icon_listeners()
  });

  $("i.fa-caret-up").on("click", function () {
    $(this).closest("li").find("ul,ol").removeClass("hidden");
    $(this).removeClass("fa-caret-up");
    $(this).addClass("fa-caret-down");
    refresh_icon_listeners()
  });
};

const populate_object = async (common, obj, dom_id, template, schema = {}) => {
  let renderedHtml = nunjucks_env.renderString(template, {
    obj: obj,
    disabled_keys: [
      "team_games_played",
      "games_played",
      "depth_chart_rank",
      "world_id",
      "season",
      "post_season_movement",
      "is_recruit",
      "player_id",
      "player_team_season_id",
    ],
  });

  $("#" + dom_id).append(renderedHtml);
};

function cast_to_correct_type(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(value)) return parseFloat(value);
  return value;
}

function isEqual(obj1, obj2) {
  // Get the keys of each object
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // If the objects have a different number of keys, they cannot be equal
  if (keys1.length !== keys2.length) {
    return false;
  }

  // Sort the keys of each object
  keys1.sort();
  keys2.sort();

  // Compare the sorted keys of each object
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      return false;
    }
  }

  // If the keys are equal, compare the values of each key
  for (let key in obj1) {
    // If the value is an object or an array, recursively compare the objects
    if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
      if (!isEqual(obj1[key], obj2[key])) {
        return false;
      }
    } else if (obj1[key] !== obj2[key]) {
      // If the value is not an object or an array, compare the values directly
      return false;
    }
  }

  // If the keys and values are all equal, the objects are equal
  return true;
}

const write_player_data = async (common, dom_id, original_player) => {
  $("body,html,*").css("cursor", "progress");

  const db = common.db;

  let data = {};
  let data_list = [];

  $("#" + dom_id + " input").each(function () {
    let val = $(this).val();
    let parents = $(this)
      .parents("[key]")
      .toArray()
      .map((e) => $(e).attr("key"));

    let joined_key = parents.reverse().join(".");

    if (joined_key.length > 0) {
      data_list.push({
        key: joined_key,
        val: cast_to_correct_type(val),
        key_len: parents.length,
      });
    }
  });

  data_list = data_list.sort((d_a, d_b) => d_a.key_len - d_b.key_len);

  for (let obj of data_list) {
    data = set(data, obj.key, obj.val);
  }

  let player_edited = data;
  let pts_edited = player_edited.player_team_season;

  delete player_edited.player_team_season;

  db.player.update(player_edited);
  db.player_team_season.update(pts_edited);

  let has_rating_change = false;

  if (
    player_edited.position != original_player.position ||
    pts_edited.position != original_player.player_team_season.position ||
    pts_edited.class.class_name != original_player.player_team_season.class.class_name ||
    !isEqual(pts_edited.ratings, original_player.player_team_season.ratings)
  ) {
    has_rating_change = true;
  }

  if (has_rating_change) {
    await generate_player_ratings(common, common.world_id, common.season);
    await populate_all_depth_charts(common, [pts_edited.team_season_id]);
    await calculate_team_overalls(common);
    await calculate_team_needs(common, [pts_edited.team_season_id]);
  }

  location.href = "";
};
