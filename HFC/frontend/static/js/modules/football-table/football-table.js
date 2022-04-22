const get_initial_column_controls = (subject) => {
  if (subject == "player stats") {
    return {
      Stats: {
        games: { shown: true, display: "Games" },
        passing: { shown: false, display: "Passing" },
        rushing: { shown: false, display: "Rushing" },
        receiving: { shown: false, display: "Receiving" },
        blocking: { shown: false, display: "Blocking" },
        defense: { shown: false, display: "Defense" },
        kicking: { shown: false, display: "Kicking" },
      },
      Ratings: {
        athleticism: { shown: false, display: "Athleticsm" },
        passing: { shown: false, display: "Throwing" },
        rushing: { shown: false, display: "Running" },
        receiving: { shown: false, display: "Receiving" },
        blocking: { shown: false, display: "Blocking" },
        defense: { shown: false, display: "Defense" },
        kicking: { shown: false, display: "Kicking" },
      },
      Personal: {
        personal: { shown: false, display: "Personal" },
        awards: { shown: false, display: "Awards" },
      },
    };
  }
  return {};
};

const get_initial_sorted_columns = (subject) => {
  if (subject == "player stats") {
    return [{ key: "player_id", sort_direction: "sort-asc" }];
  }

  return [];
};

const get_initial_filter_options = (subject) => {
  if (subject == "player stats") {
    var table_filters = {
      "player_team_season.position": {
        count: 0,
        display: "Position",
        raw_options: [
          "QB",
          "RB",
          "FB",
          "WR",
          "TE",
          "OT",
          "IOL",
          "DL",
          "EDGE",
          "LB",
          "CB",
          "S",
          "K",
          "P",
        ],
      },
      "player_team_season.position_group": {
        count: 0,
        display: "Position Group",
        raw_options: ["Offense", "Defense", "Special Teams"],
      },
      "player_team_season.class.class_name": {
        count: 0,
        display: "Class",
        raw_options: ["FR", "SO", "JR", "SR"],
      },
    };

    for (table_filter_key in table_filters) {
      table_filters[table_filter_key].options = [];
      for (table_filter_option of table_filters[table_filter_key].raw_options) {
        table_filters[table_filter_key].options.push({
          display: table_filter_option,
          count: 0,
        });
      }
    }
    return table_filters;
  }

  return [];
};

async function create_football_filters(common, table_config) {
  table_config.filters = table_config.filters || {};
  table_config.filters.filter_options =
    table_config.filters.filter_options ||
    get_initial_filter_options(table_config.subject);
  table_config.filters.filtered_columns =
    table_config.filters.filtered_columns || [];

  table_config.filters.filter_url =
    table_config.filters.filter_url ||
    "/static/html_templates/common_templates/football-table/player_table_filter_template.njk";
  var filter_template_html = await fetch(table_config.filters.filter_url);
  var filter_template_html_text = await filter_template_html.text();
  var renderedHtml = await common.nunjucks_env.renderString(
    filter_template_html_text,
    { filter_options: table_config.filters.filter_options }
  );
  table_config.filters.filter_dom_selector =
    table_config.filters.filter_dom_selector || "#player-stats-table-filter";
  $(table_config.filters.filter_dom_selector).empty();
  $(table_config.filters.filter_dom_selector).html(renderedHtml);

  console.log({ renderedHtml: renderedHtml, table_config: table_config });

  add_filter_listeners(common, table_config);
}

async function create_football_controls(common, table_config) {
  table_config.column_control = table_config.column_control || {};

  table_config.column_control.column_controls =
    table_config.column_control.column_controls ||
    get_initial_column_controls(table_config.subject);

  table_config.column_control.column_control_url =
    table_config.column_control.column_control_url ||
    "/static/html_templates/common_templates/football-table/player_table_column_control_template.njk";
  var column_control_html = await fetch(
    table_config.column_control.column_control_url
  );
  column_control_html_text = await column_control_html.text();
  console.log({ "common.render_content": common.render_content });
  var renderedHtml = await common.nunjucks_env.renderString(
    column_control_html_text,
    { column_controls: table_config.column_control.column_controls }
  );
  table_config.column_control.column_control_dom_selector =
    table_config.column_control.column_control_dom_selector ||
    "#player-stats-table-column-control";
  $(table_config.column_control.column_control_dom_selector).empty();
  $(table_config.column_control.column_control_dom_selector).html(renderedHtml);

  add_column_control_listeners(common, table_config);
}

async function create_football_table(common, table_config) {
    console.log({ table_config: table_config });

    table_config.data = table_config.original_data;
    //table_config.data = common.deep_copy(table_config.original_data);
  console.log("Drawing table???");
  console.log({ table_config: table_config });
  table_config.table_template_url =
    table_config.table_template_url ||
    "/static/html_templates/common_templates/football-table/player_table_template.njk";
  //TODO only fetch if havent fetched before
  var table_template_html = await fetch(table_config.table_template_url);
  var table_template_html_text = await table_template_html.text();

  table_template_html_text = table_template_html_text.replaceAll('  ', ' ')

  console.log({ table_template_html_text: table_template_html_text });

  table_config.sorted_columns =
    table_config.sorted_columns ||
    get_initial_sorted_columns(table_config.subject);
  console.log({ table_config: table_config });
  table_config.data = await data_filterer(common, table_config);
  console.log({ table_config: table_config });
  table_config.data = await data_sorter(common, table_config);
  console.log({ table_config: table_config });

  table_config.pagination = table_config.pagination || {};
  table_config.pagination.page_size = table_config.pagination.page_size || 75;
  table_config.pagination.current_page =
    table_config.pagination.current_page || 1;

  table_config.pagination.max_pages = Math.ceil(
    table_config.data.length / table_config.pagination.page_size
  );
  table_config.pagination.pagination_index_start =
    table_config.pagination.page_size *
    (table_config.pagination.current_page - 1);
  table_config.pagination.pagination_index_end =
    table_config.pagination.pagination_index_start +
    table_config.pagination.page_size;
  table_config.pagination.available_page_navigation = [
    table_config.pagination.current_page,
  ];

  for (var step = 1; step <= 4; step++) {
    if (table_config.pagination.available_page_navigation.length < 5) {
      if (table_config.pagination.current_page - step > 0) {
        table_config.pagination.available_page_navigation.push(
          table_config.pagination.current_page - step
        );
      }
      if (
        table_config.pagination.current_page + step <=
        table_config.pagination.max_pages
      ) {
        table_config.pagination.available_page_navigation.push(
          table_config.pagination.current_page + step
        );
      }
    }
  }

  table_config.pagination.available_page_navigation =
    table_config.pagination.available_page_navigation.sort((a, b) => a - b);

  table_config.display_data = table_config.data.slice(
    table_config.pagination.pagination_index_start,
    table_config.pagination.pagination_index_end
  );

  var renderedHtml = await common.nunjucks_env.renderString(
    table_template_html_text,
    {
      column_controls: table_config.column_control.column_controls,
      pagination: table_config.pagination,
      page: common.page,
      data: table_config.display_data,
    }
  );

  console.log({renderedHtml: renderedHtml.length})

  $("#player-stats-table-container").empty();
  $("#player-stats-table-container").append(renderedHtml);

  let column_counter = 1;
  $(".football-table-column-headers th").each(function () {
    for (sort_column_obj of table_config.sorted_columns) {
      if ($(this).attr("value-key") == sort_column_obj.key) {
        $(this).addClass(sort_column_obj.sort_direction);

        $(".football-table-content col:nth-child(" + column_counter + ")").css(
          "background-color",
          "#efefef"
        );
      }
    }
    column_counter += 1;
  });

  add_table_listeners(common);
}

async function initialize_football_table(common, table_config) {
  const get_from_dict = common.get_from_dict;

  await create_football_filters(common, table_config);
  await create_football_controls(common, table_config);
  await create_football_table(common, table_config);
}

const add_filter_listeners = async (common, table_config) => {
  console.log({ add_filter_listeners: "here", table_config: table_config });
  $(".football-table-filter-button").on("click", function () {
    let table_filter_content = $(this).next();
    $(table_filter_content).toggleClass("hidden");
  });

  $(".football-table-filter-option").on("click", async function () {
    console.log({ this: $(this), table_config: table_config });
    var clicked_button = $(this);
    $(this).toggleClass("selected");
    table_config.filters.filtered_columns = find_filtered_columns(
      clicked_button,
      table_config
    );

    table_config.pagination.current_page = 1;

    console.log({ table_config: table_config });

    await create_football_table(common, table_config);
    await adjust_button_text(common, table_config);
  });

  $("#filter-dropdown-button").on("click", async function () {
    console.log({ clicked: $(this) });
    $(this).find("i").toggleClass("fa-angle-down");
    $(this).find("i").toggleClass("fa-angle-up");
    $(this).toggleClass("shown");

    $("#football-table-filter-table").toggleClass("hidden");
    await adjust_button_text(common, table_config);
  });
};

const add_column_control_listeners = async (common, table_config) => {
  $(".football-table-column-control-button").on("click", function () {
    console.log("clicked", this, $(this).next());
    let table_column_control_content = $(this).next();
    $(table_column_control_content).toggleClass("hidden");
  });

  $(".football-table-column-control-option").on("click", async function () {
    var clicked_button = $(this);
    $(this).toggleClass("selected");
    console.log({
      common: common,
      clicked_button: clicked_button,
      table_config: table_config,
    });
    table_config.column_controls = find_column_controls(
      common,
      clicked_button,
      table_config
    );

    await create_football_table(common, table_config);
  });

  $("#column-control-dropdown-button").on("click", function () {
    $(this).find("i").toggleClass("fa-angle-down");
    $(this).find("i").toggleClass("fa-angle-up");
    $(this).toggleClass("shown");

    $("#football-table-column-control-table").toggleClass("hidden");
  });
};

const add_table_listeners = async (common) => {
  let football_table_body = $(".football-table-body").eq(0);
  let football_table_rows_map = {};
  $(".football-table-row").each(function (ind, row) {
    football_table_rows_map[$(row).attr("player_id")] = row;
  });

  $(".football-table-column-headers th").on("click", function (e) {
    table_config.pagination.current_page = 1;
    let target_new_class = $(e.target).attr("sort-order") || "sort-desc";
    if ($(e.target).hasClass("sort-desc")) {
      target_new_class = "sort-asc";
    } else if ($(e.target).hasClass("sort-asc")) {
      target_new_class = "sort-desc";
    }

    if (!e.shiftKey) {
      table_config.sorted_columns = [];
      $(".football-table-column-headers th").removeClass("sort-desc");
      $(".football-table-column-headers th").removeClass("sort-asc");
    }

    let sort_direction = target_new_class;
    $(e.target).addClass(sort_direction);
    table_config.sorted_columns.push({
      key: $(e.target).attr("value-key"),
      sort_direction: sort_direction,
    });
    GetPlayerStats(common);
  });

  $("#football-table-pagination button").on("click", function () {
    var page_destination = $(this).attr("pagination-action");
    table_config.pagination.current_page = parseInt(page_destination);
    GetPlayerStats(common);
  });

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const adjust_button_text = async (common, table_config) => {
  console.log({ table_config: table_config });
  //$(".football-table-filter-option");

  $('.football-table-filter-option[filter_value="All"]').attr('count_value', 0)
  $('.football-table-filter-option[filter_value="All"] .football-table-filter-option-value').text(0)

  for (table_filter_field in table_config.filters.filter_options) {
    var table_filter_obj =
      table_config.filters.filter_options[table_filter_field];

      var filter_group_count = 0;
    for (filter_option of table_filter_obj.raw_options) {
        console.log({table_filter_field:table_filter_field, filter_option:filter_option})
      var count_value = table_config.data.filter(
        (elem) => get_from_dict(elem, table_filter_field) == filter_option
      ).length;
      filter_group_count += count_value;
      $(
        '.football-table-filter-option[filter_value="' + filter_option + '"]'
      ).attr("count_value", count_value);
      $(
        '.football-table-filter-option[filter_value="' +
          filter_option +
          '"] .football-table-filter-option-value'
      ).text(count_value);

    }

    console.log({filter_group_count:filter_group_count, table_filter_field:table_filter_field, t: '[filter_option="'+table_filter_field+'"] [filter_value="All"]', All: $('[filter_option="'+table_filter_field+'"] [filter_value="All"]')})

    $('[filter_option="'+table_filter_field+'"] [filter_value="All"]').attr("count_value", filter_group_count);
    $('[filter_option="'+table_filter_field+'"] [filter_value="All"] .football-table-filter-option-value').text(filter_group_count);

  }
};

const find_filtered_columns = (clicked_button, table_config) => {
  var filtered_columns = [];
  $("#player-stats-table-filter .football-table-filter-row").each(function () {
    var all_named_button = $(this)
      .find('.football-table-filter-option[filter_value="All"]')
      .first();

    if ($(clicked_button).is(all_named_button)) {
      $(this)
        .find(
          '.football-table-filter-option.selected:not([filter_value="All"])'
        )
        .toggleClass("selected");
    }

    var filter_option = $(this).attr("filter_option");
    var all_children = $(this)
      .find('.football-table-filter-option:not([filter_value="All"])')
      .toArray();
    var selected_options = $(this)
      .find('.football-table-filter-option.selected:not([filter_value="All"])')
      .toArray();

    if (
      all_children.length != selected_options.length &&
      selected_options.length > 0
    ) {
      var values = selected_options.map((so) => $(so).attr("filter_value"));
      filtered_columns.push({ field: filter_option, values: values });

      $(this)
        .find('.football-table-filter-option[filter_value="All"]')
        .removeClass("selected");
    } else {
      $(this)
        .find('.football-table-filter-option[filter_value="All"]')
        .addClass("selected");
    }
  });

  return filtered_columns;
};

const find_column_controls = (common, clicked_button, table_config) => {
  var column_controls = table_config.column_control.column_controls;
  console.log({
    column_controls: column_controls,
    clicked_button: clicked_button,
  });

  $(
    "#player-stats-table-column-control .football-table-column-control-row"
  ).each(function (ind, row) {
    console.log({ row: row });
    var all_named_button = $(row)
      .find('.football-table-column-control-option[column_control_group="All"]')
      .first();

    var all_children = $(row)
      .find(
        '.football-table-column-control-option:not([column_control_group="All"])'
      )
      .toArray();
    var selected_options = $(row)
      .find(
        '.football-table-column-control-option.selected:not([column_control_group="All"])'
      )
      .toArray();

    if ($(clicked_button).is(all_named_button)) {
      if (all_children.length == selected_options.length) {
        $(row)
          .find(
            '.football-table-column-control-option.selected:not([column_control_group="All"])'
          )
          .removeClass("selected");
      } else {
        $(row)
          .find(
            '.football-table-column-control-option:not([column_control_group="All"])'
          )
          .addClass("selected");
      }
    } else {
      if (all_children.length == selected_options.length) {
        $(all_named_button).addClass("selected");
      } else {
        $(all_named_button).removeClass("selected");
      }
    }

    var selected_options = $(row)
      .find(
        '.football-table-column-control-option.selected:not([column_control_group="All"])'
      )
      .toArray();
    console.log({
      all_children: all_children,
      selected_options: selected_options,
      column_controls: column_controls,
    });

    $.each(all_children, function (ind, button) {
      var column_control_group = $(button).attr("column_control_group");
      common.get_from_dict(column_controls, column_control_group).shown =
        $(button).hasClass("selected");
    });

    if (selected_options.length > 0) {
    } else {
      $(row)
        .find(
          '.football-table-column-control-option[column_control_group="All"]'
        )
        .removeClass("selected");
    }
  });

  console.log({ column_controls: column_controls });
  return column_controls;
};

const data_filterer = (common, table_config) => {
  console.log({ table_config: table_config });
  var data = table_config.original_data
  for (var filtered_column of table_config.filters.filtered_columns) {
    data = data.filter((elem) =>
      filtered_column.values.includes(
        get_from_dict(elem, filtered_column.field)
      )
    );
  }

  console.log({data:data})
  return data;
};

const data_sorter = (common, table_config) => {
  console.log({ table_config: table_config });

  var data = table_config.data;

  data = data.map((elem) =>
    Object.assign(elem, {
      sort_value: common.get_from_dict(
        elem,
        table_config.sorted_columns[0].key
      ),
    })
  );
  for (elem of data) {
    elem.sort_vals = {};
    for (sort_column_obj of table_config.sorted_columns) {
      elem.sort_vals[sort_column_obj.key] = common.get_from_dict(
        elem,
        sort_column_obj.key
      );
    }
  }

  data = data.sort(function (elem_a, elem_b) {
    for (sort_column_obj of table_config.sorted_columns) {
      if (
        elem_b.sort_vals[sort_column_obj.key] !=
        elem_a.sort_vals[sort_column_obj.key]
      ) {
        if (sort_column_obj.sort_direction == "sort-asc") {
          return elem_b.sort_vals[sort_column_obj.key] <
            elem_a.sort_vals[sort_column_obj.key]
            ? 1
            : -1;
        } else {
          return elem_b.sort_vals[sort_column_obj.key] >
            elem_a.sort_vals[sort_column_obj.key]
            ? 1
            : -1;
        }
      }
    }
    return 0;
  });

  console.log({data:data})

  return data;
};
