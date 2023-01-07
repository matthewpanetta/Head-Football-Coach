import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { get_from_dict, distinct, index_group_sync } from "../utils.js";

export const init_basic_table_sorting = (common, table_id, initial_sort_index) => {
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

      // console.log({
      //   clicked_th: clicked_th,
      //   so: clicked_th.attr("sort-order"),
      //   sort_direction: sort_direction,
      // });

      var sort_direction_multiplier = -1;
      if (sort_direction == "sort-desc") {
        sort_direction_multiplier = 1;
      }

      $(table_id).find("th").removeClass("sort-asc").removeClass("sort-desc");

      clicked_th.addClass(sort_direction);

      const th_index = clicked_th.index();

      var data_rows = $(table_id).find("tbody tr").toArray();
      data = data_rows.map((tr) => ({
        tr: $(tr),
        val: $(tr).find(`td:eq(${th_index})`).attr("value"),
      }));
      data = data.sort(function (elem_a, elem_b) {
        if ((Number(elem_b.val) || elem_b.val) < (Number(elem_a.val) || elem_a.val)) {
          return -1 * sort_direction_multiplier;
        }
        return 1 * sort_direction_multiplier;
      });

      for (var elem of data) {
        $(table_id).find("tbody").append(elem.tr);
      }
    });
  console.log({
    table_id: table_id,
    "$(table_id).find(`tr:not(.football-table-column-groups) th:eq(${initial_sort_index})`)": $(
      table_id
    ).find(`tr:not(.football-table-column-groups) th:eq(${initial_sort_index})`),
    initial_sort_index: initial_sort_index,
    "tr:not(.football-table-column-groups) th:eq(${initial_sort_index})": `tr:not(.football-table-column-groups) th:eq(${initial_sort_index})`,
  });
  $(table_id).find(`tr:not(.football-table-column-groups) th:eq(${initial_sort_index})`).click();
};

const get_initial_column_controls = (subject) => {
  if (subject == "college player stats" || subject == "college world player stats" || subject == "pro player stats" || subject == "pro world player stats") {
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
        athleticism: { shown: false, display: "Athleticism" },
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
  } else if (subject == "recruiting") {
    return {
      Ratings: {
        overall: { shown: true, display: "Overall" },
        athleticism: { shown: false, display: "Athleticism" },
        passing: { shown: false, display: "Throwing" },
        rushing: { shown: false, display: "Running" },
        receiving: { shown: false, display: "Receiving" },
        blocking: { shown: false, display: "Blocking" },
        defense: { shown: false, display: "Defense" },
        kicking: { shown: false, display: "Kicking" },
      },
      Personal: {
        recruiting: { shown: true, display: "Recruiting" },
        personal: { shown: true, display: "Personal" },
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
  } else if (subject == "recruiting") {
    return [
      {
        key: "player_team_season.recruiting.national_rank",
        sort_direction: "sort-asc",
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

  if (subject == "college player stats" || subject == "college world player stats" || subject == "pro player stats" || subject == "pro world player stats") {
    search_filters.search_filter_fields = [
      "player_team_season.team_season.team.full_name",
      // "hometown_and_state",
      "full_name",
    ];
  } else if (subject == "recruiting") {
    search_filters.search_filter_fields = ["full_name"];
  } else if (subject == "world team stats") {
    search_filters.search_filter_fields = ["player_team_season.team_season.team.full_name"];
  }

  return search_filters;
};

const get_initial_filter_options = (subject, table_config, common) => {
  console.log({ table_config: table_config });
  if (subject == "college player stats" || subject == "college world player stats" || subject == "pro player stats" || subject == "pro world player stats") {
    var table_filters = [
      {
        count: 0,
        display: "Position",
        options: [
          {
            display: "Offense",
            field: "player_team_season.position_group",
            options: [
              { display: "QB", field: "player_team_season.position" },
              { display: "RB", field: "player_team_season.position" },
              { display: "FB", field: "player_team_season.position" },
              { display: "WR", field: "player_team_season.position" },
              { display: "TE", field: "player_team_season.position" },
              { display: "OT", field: "player_team_season.position" },
              { display: "IOL", field: "player_team_season.position" },
            ],
          },
          {
            display: "Defense",
            field: "player_team_season.position_group",
            options: [
              { display: "DL", field: "player_team_season.position" },
              { display: "EDGE", field: "player_team_season.position" },
              { display: "LB", field: "player_team_season.position" },
              { display: "CB", field: "player_team_season.position" },
              { display: "S", field: "player_team_season.position" },
            ],
          },
          {
            display: "Special Teams",
            field: "player_team_season.position_group",
            options: [
              { display: "K", field: "player_team_season.position" },
              { display: "P", field: "player_team_season.position" },
            ],
          },
        ],
      },
      ,
    ];

    if (subject == "college player stats" || subject == "college world player stats"){
      table_filters.unshift({
        count: 0,
        display: "Class",
        options: [
          { display: "FR", field: "player_team_season.class.class_name" },
          { display: "SO", field: "player_team_season.class.class_name" },
          { display: "JR", field: "player_team_season.class.class_name" },
          { display: "SR", field: "player_team_season.class.class_name" },
        ],
      });
    }

    if (subject == "world player stats") {
      let teams = distinct(
        table_config.original_data.map((p) => p.player_team_season.team_season.team)
      );
      let teams_by_team_name = index_group_sync(teams, "index", "school_name");

      console.log({
        teams: teams,
        teams_by_team_name: teams_by_team_name,
        od: table_config.original_data,
      });

      let conference_obj_list = [];
      let conferences = distinct(
        table_config.original_data
          .map((p) =>
            get_from_dict(
              p,
              "player_team_season.team_season.conference_season.conference.conference_abbreviation"
            )
          )
          .sort()
      );
      conferences.forEach(function (conference) {
        let conference_obj = {
          display: conference,
          field:
            "player_team_season.team_season.conference_season.conference.conference_abbreviation",
          options: [],
        };

        let conference_teams = distinct(
          table_config.original_data
            .filter(
              (p) =>
                p.player_team_season.team_season.conference_season.conference
                  .conference_abbreviation == conference
            )
            .map((p) => get_from_dict(p, "player_team_season.team_season.team.school_name"))
        ).sort();

        conference_obj.options = conference_teams.map((ct) => ({
          display: ct,
          field: "player_team_season.team_season.team.school_name",
          logo_url: teams_by_team_name[ct].team_logo,
        }));
        conference_obj_list.push(conference_obj);
        console.log({ conference_obj: conference_obj });
      });

      table_filters.unshift({
        count: 0,
        display: "Team",
        options: conference_obj_list,
      });
    }
  } else if (subject == "recruiting") {
    let states = distinct(table_config.original_data.map((p) => p.hometown.state)).sort();
    var table_filters = [
      {
        count: 0,
        display: "Position",
        options: [
          {
            display: "Offense",
            field: "player_team_season.position_group",
            options: [
              { display: "QB", field: "player_team_season.position" },
              { display: "RB", field: "player_team_season.position" },
              { display: "FB", field: "player_team_season.position" },
              { display: "WR", field: "player_team_season.position" },
              { display: "TE", field: "player_team_season.position" },
              { display: "OT", field: "player_team_season.position" },
              { display: "IOL", field: "player_team_season.position" },
            ],
          },
          {
            display: "Defense",
            field: "player_team_season.position_group",
            options: [
              { display: "DL", field: "player_team_season.position" },
              { display: "EDGE", field: "player_team_season.position" },
              { display: "LB", field: "player_team_season.position" },
              { display: "CB", field: "player_team_season.position" },
              { display: "S", field: "player_team_season.position" },
            ],
          },
          {
            display: "Special Teams",
            field: "player_team_season.position_group",
            options: [
              { display: "K", field: "player_team_season.position" },
              { display: "P", field: "player_team_season.position" },
            ],
          },
        ],
      },
      {
        count: 0,
        display: "Class",
        options: [
          { display: "HS JR", field: "player_team_season.class.class_name" },
          { display: "HS SR", field: "player_team_season.class.class_name" },
          { display: "JUCO", field: "player_team_season.class.class_name" },
          { display: "FR", field: "player_team_season.class.class_name" },
          { display: "SO", field: "player_team_season.class.class_name" },
          { display: "JR", field: "player_team_season.class.class_name" },
          { display: "SR", field: "player_team_season.class.class_name" },
        ],
      },
      {
        count: 0,
        display: "State",
        options: states.map((s) => ({ display: s, field: "hometown.state" })),
      },
    ];
  } else if (subject == "world team stats") {
    var table_filters = {
      "conference_season.conference.conference_abbreviation": {
        count: 0,
        display: "Conference",
        options: distinct(
          table_config.original_data
            .map((ts) => get_from_dict(ts, "conference_season.conference.conference_abbreviation"))
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

  return table_filters;
};

async function create_football_filters(common, table_config) {
  table_config.filters = table_config.filters || {};
  table_config.filters.filter_options =
    table_config.filters.filter_options ||
    get_initial_filter_options(table_config.subject, table_config, common);
  table_config.filters.filtered_columns = table_config.filters.filtered_columns || [];
  table_config.filters.search_filters =
    table_config.filters.search_filters || get_initial_search_filters(table_config.subject);

  table_config.templates.filter_template_url = table_config.templates.filter_template_url;

  table_config.column_control = table_config.column_control || {};

  table_config.column_control.column_controls =
    table_config.column_control.column_controls ||
    get_initial_column_controls(table_config.subject);

  if (!table_config.templates.filter_template_url) {
    return 0;
  }

  let render_content = {
    filter_options: table_config.filters.filter_options,
    column_controls: table_config.column_control.column_controls,
  };
  console.log("filter_render_content", render_content);

  var filter_template_html = await fetch(table_config.templates.filter_template_url);
  var filter_template_html_text = await filter_template_html.text();
  var renderedHtml = nunjucks_env.renderString(filter_template_html_text, render_content);
  table_config.dom.filter_dom_selector =
    table_config.dom.filter_dom_selector || "#player-stats-table-filter";
  $(table_config.dom.filter_dom_selector).empty();
  $(table_config.dom.filter_dom_selector).html(renderedHtml);

  await add_filter_listeners(common, table_config);
}

async function create_football_table(common, table_config) {
  table_config.data = table_config.original_data;
  table_config.templates.table_template_url = table_config.templates.table_template_url;
  //TODO only fetch if havent fetched before
  var table_template_html = await fetch(table_config.templates.table_template_url);
  var table_template_html_text = await table_template_html.text();

  table_template_html_text = table_template_html_text.replaceAll("  ", " ");

  table_config.sorted_columns =
    table_config.sorted_columns || get_initial_sorted_columns(table_config.subject);
  table_config.data = await data_filterer(common, table_config);
  table_config.data = await data_sorter(common, table_config);

  table_config.pagination = table_config.pagination || {};
  table_config.pagination.page_size = table_config.pagination.page_size || 75;
  table_config.pagination.current_page = table_config.pagination.current_page || 1;

  table_config.pagination.max_pages = Math.ceil(
    table_config.data.length / table_config.pagination.page_size
  );
  table_config.pagination.pagination_index_start =
    table_config.pagination.page_size * (table_config.pagination.current_page - 1);
  table_config.pagination.pagination_index_end =
    table_config.pagination.pagination_index_start + table_config.pagination.page_size;
  table_config.pagination.available_page_navigation = [table_config.pagination.current_page];

  // The ideal pagination button display is to always display 5 buttons, the current button in the middle, with the preceding 2 and trailing 2 behind.
  // For Page 1, it would be [*1*, 2, 3, 4, 5] , with stars indicating selected page
  // For Page 2, [1, *2*, 3, 4, 5]
  // For Page 3, [1, 2, *3*, 4, 5]
  // For Page N-1, [N-4, N-3, N-2, *N-1*, N]
  // For Page N, [N-4, N-3, N-2, N-1, *N*]
  // This for loop + following sort & slice functions walks through surrounding numbers, identifies valid surrounding values, and picks which should be included
  for (var step = 1; step <= 4; step++) {
    if (table_config.pagination.available_page_navigation.length < 5) {
      if (table_config.pagination.current_page - step > 0) {
        table_config.pagination.available_page_navigation.push(
          table_config.pagination.current_page - step
        );
      }
      if (table_config.pagination.current_page + step <= table_config.pagination.max_pages) {
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

  var renderedHtml = nunjucks_env.renderString(table_template_html_text, {
    column_controls: table_config.column_control.column_controls,
    display_team: table_config.display_team || false,
    pagination: table_config.pagination,
    page: common.page,
    data: table_config.display_data,
  });

  table_config.dom.table_dom_selector =
    table_config.dom.table_dom_selector || "#player-stats-table-container";

  $(table_config.dom.table_dom_selector).empty();
  $(table_config.dom.table_dom_selector).append(renderedHtml);

  let column_counter = 1;
  $(table_config.dom.table_dom_selector + " .football-table-column-headers th").each(function () {
    for (let sort_column_obj of table_config.sorted_columns) {
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

  // $(table_config.dom.table_dom_selector + " .football-table-column-groups th:last-child").append(
  //   '<span class="float-right"><i class="fa fa-chart-line football-chart-icon"></i></span>'
  // )

  await add_table_listeners(common, table_config);
}

export const initialize_football_table = async (common, table_config) => {
  await create_football_filters(common, table_config);
  // await create_football_controls(common, table_config);
  await create_football_table(common, table_config);
};

const refresh_table = async (common, table_config) => {
  table_config.filters.filtered_columns = find_filtered_columns(table_config);

  table_config.pagination.current_page = 1;

  await create_football_table(common, table_config);
  // await adjust_button_text(common, table_config);
};

const add_filter_listeners = async (common, table_config) => {
  $(".football-table-filter-button").on("click", function () {
    let table_filter_content = $(this).next();
    $(table_filter_content).toggleClass("hidden");
  });

  $(".football-table-filter-option").on("click", async function () {
    var clicked_button = $(this);

    let added_filters = [];
    let removed_filters = [];

    let filter_value = $(this).attr("filter-value");
    let parent_filter_value = $(this).attr("parent-filter-value");

    if (!$(this).hasClass("selected")) {
      console.log("ADDING SELECTED");
      added_filters = added_filters.concat([this]);
      added_filters = added_filters.concat(
        $(
          `.football-table-filter-option[parent-filter-value="${filter_value}"]:not(.selected)`
        ).toArray()
      );

      $(this).addClass("selected");
      $(`.football-table-filter-option[parent-filter-value="${filter_value}"]`).addClass(
        "selected"
      );
    } else {
      removed_filters = removed_filters.concat([this]);
      removed_filters = removed_filters.concat(
        $(`.football-table-filter-option[parent-filter-value="${filter_value}"].selected`).toArray()
      );
      // removed_filters.concat($( `.football-table-filter-option[filter-value="${parent_filter_value}"]`))
      $(this).removeClass("selected");
      $(`.football-table-filter-option[parent-filter-value="${filter_value}"]`).removeClass(
        "selected"
      );

      $(`.football-table-filter-option[filter-value="${parent_filter_value}"]`).removeClass(
        "selected"
      );
    }

    for (let add_elem of added_filters) {
      if (parseInt($(add_elem).attr("include-in-filter"))) {
        let filter_badge = $("#filter-badge-template").clone();
        filter_badge.removeClass("hidden");
        filter_badge.attr("id", "");
        filter_badge.attr("filter-value", $(add_elem).attr("filter-value"));
        filter_badge.attr("filter-field", $(add_elem).attr("filter-field"));
        filter_badge.find(".filter-value").text($(add_elem).attr("filter-value"));
        $("#filter-badge-template").parent().append(filter_badge);
        console.log({ add_elem: add_elem, filter_badge: filter_badge });
      }
    }

    for (let remove_elem of removed_filters) {
      let filter_value = $(remove_elem).attr("filter-value");
      $('.filter-badge[filter-value="' + filter_value + '"]').remove();
    }

    console.log({
      added_filters: added_filters,
      removed_filters: removed_filters,
      t: $(this),
    });

    await refresh_table(common, table_config);
  });

  $(".football-table-clear-filters").on("click", async function () {
    $(`.football-table-filter-option.selected`).removeClass("selected");
    $(".filter-badge:not(.hidden)").remove();
    $(".football-table-search-text").val("");
    table_config.filters.search_filters.search_text = "";

    await refresh_table(common, table_config);
  });

  $(".badge-container").on("click", ".filter-badge", async function () {
    let filter_value = $(this).attr("filter-value");
    $('.football-table-filter-option.selected[filter-value="' + filter_value + '"]').removeClass(
      "selected"
    );
    $('.football-table-filter-option[filter-value="' + filter_value + '"]').each(function (
      ind,
      elem
    ) {
      let parent_filter_value = $(elem).attr("parent-filter-value");
      $('.football-table-filter-option[filter-value="' + parent_filter_value + '"]').removeClass(
        "selected"
      );
    });

    if ($(this).attr("filter-field") == "name-search") {
      $(".football-table-search-text").val("");
      table_config.filters.search_filters.search_text = "";
    }

    $(this).remove();

    console.log({ this: this, filter_value: filter_value });

    await refresh_table(common, table_config);
  });

  $(".football-filter-clear-row").on("click", async function () {
    var clicked_button = $(this);
    $(this)
      .closest(".football-table-filter-option-group")
      .find(".selected")
      .removeClass("selected");

    await refresh_table(common, table_config);
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
    // adjust_button_text(common, table_config);

    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#football-table-filter-modal")[0]) {
        $("#football-table-filter-modal").removeClass("shown");
      }
    });
  });

  $("#football-table-column-show-button").on("click", function () {
    $("#football-table-column-modal").addClass("shown");

    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#football-table-column-modal")[0]) {
        $("#football-table-column-modal").removeClass("shown");
      }
    });
  });

  $(".football-table-search-text-button").on("click", async function () {
    table_config.filters.search_filters.search_text = $(".football-table-search-text").val();

    $('.filter-badge[filter-field="name-search"]').remove();

    let filter_badge = $("#filter-badge-template").clone();
    filter_badge.removeClass("hidden");
    filter_badge.attr("id", "");
    filter_badge.attr("filter-value", table_config.filters.search_filters.search_text);
    filter_badge.attr("filter-field", "name-search");
    filter_badge
      .find(".filter-value")
      .text("Name: " + table_config.filters.search_filters.search_text);
    $("#filter-badge-template").parent().append(filter_badge);

    await refresh_table(common, table_config);
  });

  $(".football-table-search-text").on("keypress", async function (e) {
    if (e.which === 13) {
      table_config.filters.search_filters.search_text = $(".football-table-search-text").val();
      $('.filter-badge[filter-field="name-search"]').remove();

      let filter_badge = $("#filter-badge-template").clone();
      filter_badge.removeClass("hidden");
      filter_badge.attr("id", "");
      filter_badge.attr("filter-value", table_config.filters.search_filters.search_text);
      filter_badge.attr("filter-field", "name-search");
      filter_badge
        .find(".filter-value")
        .text("Name: " + table_config.filters.search_filters.search_text);
      $("#filter-badge-template").parent().append(filter_badge);

      await refresh_table(common, table_config);
    }
  });

  $(".football-table-search-clear-button").on("click", async function () {
    $(".football-table-search-text").val("");
    table_config.filters.search_filters.search_text = "";
    await refresh_table(common, table_config);
  });

  $(".football-table-column-control-option").on("click", async function () {
    var clicked_button = $(this);
    // $(this).toggleClass("selected");

    let filter_value = $(this).attr("table_columnn_control_option");
    let parent_filter_value = $(this).attr("parent_table_columnn_control_option");

    if (!$(this).hasClass("selected")) {
      $(this).addClass("selected");
      $(
        `.football-table-column-control-option[parent_table_columnn_control_option="${filter_value}"]`
      ).addClass("selected");
    } else {
      $(this).removeClass("selected");
      $(
        `.football-table-column-control-option[parent_table_columnn_control_option="${filter_value}"]`
      ).removeClass("selected");

      $(
        `.football-table-column-control-option[table_columnn_control_option="${parent_filter_value}"]`
      ).removeClass("selected");
    }

    table_config.column_control.column_controls = find_column_controls(
      common,
      clicked_button,
      table_config
    );

    await create_football_table(common, table_config);
  });

  $(".football-column-clear-row").on("click", async function () {
    var clicked_button = $(this);
    $(this)
      .closest(".football-table-column-option-group")
      .find(".selected")
      .removeClass("selected");

    await refresh_table(common, table_config);
  });

  $(".football-column-collapse").on("click", async function () {
    $(this)
      .closest(".football-table-column-option-group")
      .find(".football-column-option-list")
      .toggleClass("collapse");
    $(this).find("i").toggleClass("fa-angle-up");
    $(this).find("i").toggleClass("fa-angle-down");
  });
};

const add_table_listeners = async (common, table_config) => {
  let football_table_body = $(".football-table-body").eq(0);
  let football_table_rows_map = {};
  $(table_config.dom.table_dom_selector + ".football-table-row").each(function (ind, row) {
    football_table_rows_map[$(row).attr("player_id")] = row;
  });

  $(table_config.dom.table_dom_selector + " .football-table-column-headers th").on(
    "click",
    async function (e) {
      table_config.pagination.current_page = 1;
      let target_new_class = $(e.target).attr("sort-order") || "sort-desc";
      if ($(e.target).hasClass("sort-desc")) {
        target_new_class = "sort-asc";
      } else if ($(e.target).hasClass("sort-asc")) {
        target_new_class = "sort-desc";
      }

      if (!e.shiftKey) {
        table_config.sorted_columns = [];
        $(table_config.dom.table_dom_selector + " .football-table-column-headers th").removeClass(
          "sort-desc"
        );
        $(table_config.dom.table_dom_selector + " .football-table-column-headers th").removeClass(
          "sort-asc"
        );
      }

      let sort_direction = target_new_class;
      $(e.target).addClass(sort_direction);
      table_config.sorted_columns.push({
        key: $(e.target).attr("value-key"),
        sort_direction: sort_direction,
      });

      await create_football_table(common, table_config);
    }
  );

  await common.geo_marker_action(common);

  $(table_config.dom.table_dom_selector + " .football-table-pagination button").on(
    "click",
    async function () {
      var page_destination = $(this).attr("pagination-action");
      table_config.pagination.current_page = parseInt(page_destination);
      await create_football_table(common, table_config);
    }
  );

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const adjust_button_text = async (common, table_config) => {
  //$(".football-table-filter-option");

  console.log({
    table_config: table_config,
    "table_config.filters.filter_options": table_config.filters.filter_options,
  });

  for (let table_filter_obj of table_config.filters.filter_options) {
    // var table_filter_obj = table_config.filters.filter_options[table_filter_field];
    console.log({
      table_filter_field: table_filter_field,
      "table_config.filters.filter_options": table_config.filters.filter_options,
      table_filter_obj: table_filter_obj,
      "table_filter_obj.options": table_filter_obj.options,
    });

    var filter_group_count = 0;
    for (let filter_option of table_filter_obj.options) {
      var count_value = table_config.data.filter(
        (elem) => get_from_dict(elem, table_filter_field) == filter_option
      ).length;
      filter_group_count += count_value;
      $('.football-table-filter-option[filter_value="' + filter_option + '"]').attr(
        "count_value",
        count_value
      );
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
  let value_map = [];

  let total_selected_options = 0;

  $(".football-table-filter-option.selected").each(function (ind, filter_option) {
    let filter_field = $(filter_option).attr("filter-field");
    let filter_value = $(filter_option).attr("filter-value");

    if (parseInt($(filter_option).attr("include-in-filter"))) {
      values.push({ field: filter_field, value: filter_value });
    }
  });

  $(".filter-button-count-span").text("");

  let filtered_columns_obj = index_group_sync(values, "group", "field");
  for (let filter_field in filtered_columns_obj) {
    filtered_columns.push({
      field: filter_field,
      values: filtered_columns_obj[filter_field].map((elem) => elem.value),
    });

    $('[field="' + filter_field + '"] .filter-button-count-span').text(
      filtered_columns_obj[filter_field].length
    );

    // console.log("showing filter count", {
    //   filtered_columns: filtered_columns,
    //   "filtered_columns.length": filtered_columns.length,
    //   filter_field: filter_field,
    //   a: $('[field="' + filter_field + '"] .filter-button-count-span'),
    //   q: '[field="' + filter_field + '"] .filter-button-count-span',
    // });
  }

  // console.log({
  //   filtered_columns_obj: filtered_columns_obj,
  //   filtered_columns: filtered_columns,
  //   values: values,
  // });

  // $(".football-table-filters-active-count").text(total_selected_options);

  return filtered_columns;
};

const find_column_controls = (common, clicked_button, table_config) => {
  var column_controls = table_config.column_control.column_controls;

  // console.log({
  //   "table_config.dom.column_control_dom_selector": table_config.dom.column_control_dom_selector,
  //   s: $(".football-table-column-control-option"),
  // });
  $(".football-table-column-control-option").each(function (ind, column_option) {
    // console.log({
    //   b: $(column_option),
    //   a: $(column_option).attr("table_columnn_control_option"),
    //   column_controls: column_controls,
    //   gd: get_from_dict(column_controls, $(column_option).attr("table_columnn_control_option")),
    // });
    get_from_dict(
      // column_controls[column_control_group],
      column_controls,
      $(column_option).attr("table_columnn_control_option")
    ).shown = $(column_option).hasClass("selected");
  });

  // console.log({
  //   column_controls: column_controls,
  //   clicked_button: clicked_button,
  //   table_config: table_config,
  // });

  return column_controls;
};

const data_filterer = (common, table_config) => {
  var data = table_config.original_data;
  for (var filtered_column of table_config.filters.filtered_columns) {
    data = data.filter((elem) =>
      filtered_column.values.includes(get_from_dict(elem, filtered_column.field))
    );
  }

  if (table_config.filters.search_filters.search_text.length > 0) {
    data = data.filter(function (elem) {
      return table_config.filters.search_filters.search_filter_fields.some(function (field) {
        return get_from_dict(elem, field)
          .toLowerCase()
          .includes(table_config.filters.search_filters.search_text.toLowerCase());
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
      sort_value: get_from_dict(elem, table_config.sorted_columns[0].key),
    })
  );
  for (let elem of data) {
    elem.sort_vals = {};
    for (let sort_column_obj of table_config.sorted_columns) {
      elem.sort_vals[sort_column_obj.key] = get_from_dict(elem, sort_column_obj.key);
    }
  }

  data = data.sort(function (elem_a, elem_b) {
    for (let sort_column_obj of table_config.sorted_columns) {
      if (elem_b.sort_vals[sort_column_obj.key] != elem_a.sort_vals[sort_column_obj.key]) {
        let sort_mult = sort_column_obj.sort_direction == "sort-asc" ? 1 : -1;
        return (
          sort_mult *
          (elem_b.sort_vals[sort_column_obj.key] < elem_a.sort_vals[sort_column_obj.key] ? 1 : -1)
        );
      }
    }
    return 0;
  });

  console.log("Sorted data", {
    data: data,
    "table_config.sorted_columns": table_config.sorted_columns,
  });

  return data;
};
