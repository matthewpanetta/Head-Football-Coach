const init_basic_table_sorting = (common, table_id, initial_sort_index) => {
  var data = [];
  const table = $(table_id);

  console.log({
    th: $(table_id).find("th"),
    aaa: $(table_id).find("tr:not(.football-table-column-groups) th"),
  });

  $(table_id)
    .find("tr:not(.football-table-column-groups) th")
    .on("click", function (event) {
      var clicked_th = $(event.target);
      if (clicked_th.hasClass("no-sort")) {
        return true;
      }

      var sort_direction = clicked_th.attr("sort-order") || "sort-desc";
      if ($(clicked_th).hasClass("sort-desc")) {
        sort_direction = "sort-asc";
      } else if ($(clicked_th).hasClass("sort-asc")) {
        sort_direction = "sort-desc";
      }

      console.log({
        clicked_th: clicked_th,
        so: clicked_th.attr("sort-order"),
        sort_direction: sort_direction,
      });

      var sort_direction_multiplier = -1;
      if (sort_direction == "sort-desc") {
        sort_direction_multiplier = 1;
      }

      $(table_id).find("th").removeClass("sort-asc").removeClass("sort-desc");

      clicked_th.addClass(sort_direction);

      const th_index = clicked_th.index();
      console.log({
        clicked_th: clicked_th,
        sort_direction: sort_direction,
        th_index: th_index,
      });

      var data_rows = $(table_id).find("tbody tr").toArray();
      data = data_rows.map((tr) => ({
        tr: $(tr),
        val: $(tr).find(`td:eq(${th_index})`).attr("value"),
      }));
      data = data.sort(function (elem_a, elem_b) {
        if (
          (Number(elem_b.val) || elem_b.val) <
          (Number(elem_a.val) || elem_a.val)
        ) {
          return -1 * sort_direction_multiplier;
        }
        return 1 * sort_direction_multiplier;
      });

      for (var elem of data) {
        $(table_id).find("tbody").append(elem.tr);
      }
    });
  $(table_id).find(`th:eq(${initial_sort_index})`).click();
};

const get_initial_column_controls = (subject) => {
  if (subject == "player stats" || subject == "world player stats") {
    return {
      Stats: {
        games: { shown: false, display: "Games" },
        passing: { shown: false, display: "Passing" },
        rushing: { shown: false, display: "Rushing" },
        receiving: { shown: false, display: "Receiving" },
        blocking: { shown: false, display: "Blocking" },
        defense: { shown: false, display: "Defense" },
        kicking: { shown: false, display: "Kicking" },
      },
      Ratings: {
        overall: { shown: true, display: "Overall" },
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
      },
    };
  } else if (subject == "world team stats") {
    return {
      Team: {
        games: { shown: false, display: "Games" },
        point_margin: { shown: false, display: "Point Margin" },
      },
      Offense: {
        totals: { shown: false, display: "Totals" },
        passing: { shown: false, display: "Passing" },
        rushing: { shown: false, display: "Rushing" },
        points: { shown: false, display: "Points" },
        downs: { shown: false, display: "Downs" },
      },
      //TODO add defense & ST
      // "Defense": {
      //   totals: {shown: false, display: 'Totals'},
      //   passing: {shown: false, display: 'Passing'},
      //   rushing: {shown: false, display: 'Rushing'},
      //   points: {shown: false, display: 'Points'},
      //   downs: {shown: false, display: 'Downs'},
      // },

      // "ST": {
      //   kicking: {shown: false, display: 'Kicking'},
      //   punting: {shown: false, display: 'Punting'},
      //   returning: {shown: false, display: 'Returning'},
      // },

      Performance: {
        rankings: { shown: true, display: "Rankings" },
        // vs_top_25: {shown: false, display: 'Vs Top 25'},
        // awards: {shown: false, display: 'Awards'},
        // bowls: {shown: false, display: 'Bowls'},
      },
    };
  }
  return {};
};

const get_initial_sorted_columns = (subject) => {
  if (subject == "player stats" || subject == "world player stats") {
    return [
      {
        key: "player_team_season.ratings.overall.overall",
        sort_direction: "sort-desc",
      },
    ];
  } else if (subject == "world team stats") {
    return [
      {
        key: "team.team_season.national_rank",
        sort_direction: "sort-desc",
      },
    ];
  }

  return [];
};

const get_initial_search_filters = (subject) => {
  let search_filters = { search_text: "" };

  if (subject == "player stats" || subject == "world player stats") {
    search_filters.search_filter_fields = [
      "player_team_season.team_season.team.full_name",
      "full_name",
    ];
  } else if (subject == "world team stats") {
    search_filters.search_filter_fields = [
      "player_team_season.team_season.team.full_name",
    ];
  }

  return search_filters;
};

const get_initial_filter_options = (subject, table_config, common) => {
  console.log({ table_config: table_config });
  if (subject == "player stats" || subject == "world player stats") {
    var table_filters = {
      "player_team_season.position_group": {
        count: 0,
        display: "Position Group",
        raw_options: ["Offense", "Defense", "Special Teams"],
      },
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
      "player_team_season.class.class_name": {
        count: 0,
        display: "Class",
        raw_options: ["FR", "SO", "JR", "SR"],
      },
    };

    if (subject == "world player stats") {
      table_filters[
        "player_team_season.team_season.conference_season.conference.conference_abbreviation"
      ] = {
        count: 0,
        display: "Conference",
        raw_options: common.distinct(
          table_config.original_data
            .map((p) =>
              common.get_from_dict(
                p,
                "player_team_season.team_season.conference_season.conference.conference_abbreviation"
              )
            )
            .sort()
        ),
      };

      table_filters["player_team_season.team_season.team.school_name"] = {
        count: 0,
        display: "Team",
        raw_options: common.distinct(
          table_config.original_data
            .map((p) =>
              common.get_from_dict(
                p,
                "player_team_season.team_season.team.school_name"
              )
            )
            .sort()
        ),
      };
    }
  } else if (subject == "world team stats") {
    var table_filters = {
      "conference_season.conference.conference_abbreviation": {
        count: 0,
        display: "Conference",
        raw_options: common.distinct(
          table_config.original_data
            .map((ts) =>
              common.get_from_dict(
                ts,
                "conference_season.conference.conference_abbreviation"
              )
            )
            .sort()
        ),
      },
    };
    console.log({
      table_filters: table_filters,
      original_data: table_config.original_data,
    });
  }

  console.log({ table_filters: table_filters });

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
};

async function create_football_filters(common, table_config) {
  table_config.filters = table_config.filters || {};
  table_config.filters.filter_options =
    table_config.filters.filter_options ||
    get_initial_filter_options(table_config.subject, table_config, common);
  table_config.filters.filtered_columns =
    table_config.filters.filtered_columns || [];
  table_config.filters.search_filters =
    table_config.filters.search_filters ||
    get_initial_search_filters(table_config.subject);

  table_config.templates.filter_template_url =
    table_config.templates.filter_template_url;

  if (!table_config.templates.filter_template_url) {
    return 0;
  }

  var filter_template_html = await fetch(
    table_config.templates.filter_template_url
  );
  var filter_template_html_text = await filter_template_html.text();
  var renderedHtml = await common.nunjucks_env.renderString(
    filter_template_html_text,
    { filter_options: table_config.filters.filter_options }
  );
  table_config.dom.filter_dom_selector =
    table_config.dom.filter_dom_selector || "#player-stats-table-filter";
  $(table_config.dom.filter_dom_selector).empty();
  $(table_config.dom.filter_dom_selector).html(renderedHtml);

  add_filter_listeners(common, table_config);
}

async function create_football_controls(common, table_config) {
  table_config.column_control = table_config.column_control || {};

  table_config.column_control.column_controls =
    table_config.column_control.column_controls ||
    get_initial_column_controls(table_config.subject);

  table_config.templates.column_control_template_url =
    table_config.templates.column_control_template_url;

  if (!table_config.templates.column_control_template_url) {
    return 0;
  }

  var column_control_html = await fetch(
    table_config.templates.column_control_template_url
  );
  column_control_html_text = await column_control_html.text();
  var renderedHtml = await common.nunjucks_env.renderString(
    column_control_html_text,
    { column_controls: table_config.column_control.column_controls }
  );
  table_config.dom.column_control_dom_selector =
    table_config.dom.column_control_dom_selector ||
    "#player-stats-table-column-control";
  $(table_config.dom.column_control_dom_selector).empty();
  $(table_config.dom.column_control_dom_selector).html(renderedHtml);

  add_column_control_listeners(common, table_config);
}

async function create_football_table(common, table_config) {
  table_config.data = table_config.original_data;
  table_config.templates.table_template_url =
    table_config.templates.table_template_url;
  //TODO only fetch if havent fetched before
  var table_template_html = await fetch(
    table_config.templates.table_template_url
  );
  var table_template_html_text = await table_template_html.text();

  table_template_html_text = table_template_html_text.replaceAll("  ", " ");

  table_config.sorted_columns =
    table_config.sorted_columns ||
    get_initial_sorted_columns(table_config.subject);
  table_config.data = await data_filterer(common, table_config);
  table_config.data = await data_sorter(common, table_config);

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
      display_team: table_config.display_team || false,
      pagination: table_config.pagination,
      page: common.page,
      data: table_config.display_data,
    }
  );

  table_config.dom.table_dom_selector =
    table_config.dom.table_dom_selector || "#player-stats-table-container";

  $(table_config.dom.table_dom_selector).empty();
  $(table_config.dom.table_dom_selector).append(renderedHtml);

  let column_counter = 1;
  $(
    table_config.dom.table_dom_selector + " .football-table-column-headers th"
  ).each(function () {
    for (sort_column_obj of table_config.sorted_columns) {
      if ($(this).attr("value-key") == sort_column_obj.key) {
        $(this).addClass(sort_column_obj.sort_direction);

        $(
          table_config.dom.table_dom_selector +
            " .football-table-content col:nth-child(" +
            column_counter +
            ")"
        ).css("background-color", "#efefef");
      }
    }
    column_counter += 1;
  });

  add_table_listeners(common, table_config);
}

async function initialize_football_table(common, table_config) {
  const get_from_dict = common.get_from_dict;

  await create_football_filters(common, table_config);
  await create_football_controls(common, table_config);
  await create_football_table(common, table_config);
}

const refresh_table = async(common, table_config) => {
  table_config.filters.filtered_columns = find_filtered_columns(
    table_config
  );

  table_config.pagination.current_page = 1;

  await create_football_table(common, table_config);
  await adjust_button_text(common, table_config);
}

const add_filter_listeners = async (common, table_config) => {
  $(".football-table-filter-button").on("click", function () {
    let table_filter_content = $(this).next();
    $(table_filter_content).toggleClass("hidden");
  });

  $(".football-table-filter-option").on("click", async function () {
    var clicked_button = $(this);
    $(this).toggleClass("selected");

    await refresh_table(common, table_config)
  });

  $(".football-filter-clear-row").on("click", async function () {
    var clicked_button = $(this);
    $(this)
      .closest(".football-table-filter-option-group")
      .find(".selected")
      .removeClass("selected");

      await refresh_table(common, table_config)

  });

  $(".football-filter-collapse").on("click", async function () {
    $(this)
      .closest(".football-table-filter-option-group")
      .find(".football-filter-option-list")
      .toggleClass("collapse");
    $(this).find("i").toggleClass("fa-angle-up");
    $(this).find("i").toggleClass("fa-angle-down");
  });

  $("#football-table-filter-show-button").on("click", function () {
    $("#football-table-filter-modal").addClass("shown");
    adjust_button_text(common, table_config);
  });

  $('.football-table-search-text-button').on('click', async function(){
    table_config.filters.search_filters.search_text = $('.football-table-search-text').val()
    console.log({'table_config.filters.search_filters.search_text': table_config.filters.search_filters.search_text, "$('.football-table-search-text')": $('.football-table-search-text'), t: $('.football-table-search-text').text()})
    await refresh_table(common, table_config)
  })

  $('.football-table-search-clear-button').on('click', async function(){
    $('.football-table-search-text').val('')
    table_config.filters.search_filters.search_text = '';
    await refresh_table(common, table_config)
  })

  $(window).on("click", function (event) {
    if ($(event.target)[0] == $("#football-table-filter-modal")[0]) {
      $("#football-table-filter-modal").removeClass("shown");
    }
  });
};

const add_column_control_listeners = async (common, table_config) => {
  $(".football-table-column-control-button").on("click", function () {
    let table_column_control_content = $(this).next();
    $(table_column_control_content).toggleClass("hidden");
  });

  $(".football-table-column-control-option").on("click", async function () {
    var clicked_button = $(this);
    $(this).toggleClass("selected");

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

const add_table_listeners = async (common, table_config) => {
  let football_table_body = $(".football-table-body").eq(0);
  let football_table_rows_map = {};
  $(table_config.dom.table_dom_selector + ".football-table-row").each(function (
    ind,
    row
  ) {
    football_table_rows_map[$(row).attr("player_id")] = row;
  });

  $(
    table_config.dom.table_dom_selector + " .football-table-column-headers th"
  ).on("click", function (e) {
    table_config.pagination.current_page = 1;
    let target_new_class = $(e.target).attr("sort-order") || "sort-desc";
    if ($(e.target).hasClass("sort-desc")) {
      target_new_class = "sort-asc";
    } else if ($(e.target).hasClass("sort-asc")) {
      target_new_class = "sort-desc";
    }

    if (!e.shiftKey) {
      table_config.sorted_columns = [];
      $(
        table_config.dom.table_dom_selector +
          " .football-table-column-headers th"
      ).removeClass("sort-desc");
      $(
        table_config.dom.table_dom_selector +
          " .football-table-column-headers th"
      ).removeClass("sort-asc");
    }

    let sort_direction = target_new_class;
    $(e.target).addClass(sort_direction);
    table_config.sorted_columns.push({
      key: $(e.target).attr("value-key"),
      sort_direction: sort_direction,
    });

    create_football_table(common, table_config);
  });

  $(
    table_config.dom.table_dom_selector + " .football-table-pagination button"
  ).on("click", function () {
    var page_destination = $(this).attr("pagination-action");
    table_config.pagination.current_page = parseInt(page_destination);
    create_football_table(common, table_config);
  });

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const adjust_button_text = async (common, table_config) => {
  //$(".football-table-filter-option");

  for (table_filter_field in table_config.filters.filter_options) {
    var table_filter_obj =
      table_config.filters.filter_options[table_filter_field];

    var filter_group_count = 0;
    for (filter_option of table_filter_obj.raw_options) {
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
  }
};

const find_filtered_columns = (table_config) => {
  let filtered_columns = [];
  let all_children = [];
  let values = [];

  let total_selected_options = 0;

  $(".football-table-filter-option-group").each(function (ind, option_group) {
    let selected_options = $(option_group)
      .find(".football-table-filter-option.selected")
      .toArray();
    var filter_option = $(option_group).attr("filter_option");

    total_selected_options += selected_options.length;

    if (selected_options.length > 0) {
      values = selected_options.map((so) => $(so).attr("filter_value"));
      filtered_columns.push({ field: filter_option, values: values });

      $(option_group)
        .find(".football-filter-clear-row")
        .removeClass("disabled");
    } else {
      $(option_group).find(".football-filter-clear-row").addClass("disabled");
    }
  });

  $(".football-table-filters-active-count").text(total_selected_options);

  return filtered_columns;
};

const find_column_controls = (common, clicked_button, table_config) => {
  var column_controls = table_config.column_control.column_controls;

  $(
    table_config.dom.column_control_dom_selector +
      " .football-table-column-control-row"
  ).each(function (ind, row) {
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

  return column_controls;
};

const data_filterer = (common, table_config) => {
  console.log({ table_config: table_config });
  var data = table_config.original_data;
  for (var filtered_column of table_config.filters.filtered_columns) {
    data = data.filter((elem) =>
      filtered_column.values.includes(
        get_from_dict(elem, filtered_column.field)
      )
    );
  }

  if (table_config.filters.search_filters.search_text.length > 0) {
    data = data.filter(function (elem) {
      return table_config.filters.search_filters.search_filter_fields.some(function (
        field
      ) {
        return get_from_dict(elem, field).toLowerCase().includes(
          table_config.filters.search_filters.search_text.toLowerCase()
        );
      });
    });
  }

  return data;
};

const data_sorter = (common, table_config) => {
  console.log({ table_config: table_config });
  var data = table_config.data;

  if (table_config.sorted_columns.length == 0) {
    return data;
  }

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

  console.log({ data: data });

  return data;
};
