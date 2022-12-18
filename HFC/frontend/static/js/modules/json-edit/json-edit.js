const init_json_edit = async (common, data, dom_id = "", schema = {}) => {
  let template_url = "/static/html_templates/common_templates/json_edit/json_edit_template.njk";
  let template_html = await fetch(template_url);

  var template = await template_html.text();

  await populate_object(common, data, dom_id, template, schema);

  $(`#edit-player-modal-save`).on("click", async function () {
    await write_player_data(common, dom_id);
  });
};

const populate_object = async (common, obj, dom_id, template, schema = {}) => {
  let renderedHtml = await common.nunjucks_env.renderString(template, {
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

const write_player_data = async (common, dom_id) => {
  const db = common.db;
  let data_ul = $("#" + dom_id + ">  ul").first();

  let data = {};
  let data_list = [];

  $("input").each(function () {
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

  await db.player.put(player_edited);
  await db.player_team_season.put(pts_edited);

  location.href = "";
};
