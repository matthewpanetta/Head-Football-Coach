import {
  index_group_sync,
  get,
  set,
  distinct,
  sum,
  nest_children,
  intersect,
  set_intersect,
  union,
  set_union,
  except,
  set_except,
  get_from_dict,
  deep_copy,
  ordinal,
} from "/common/js/utils.js";
import { nunjucks_env } from "/common/js/nunjucks_tags.js";
import { recent_games } from "/js/widgets.js";

export const page_world_schedule = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });

  var world_obj = {};

  common.stopwatch(common, "getHtml 1.0");
  const NavBarLinks = common.nav_bar_links;


  common.stopwatch(common, "getHtml 1.1");
  var teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

  let conferences = db.conference.find();
  let conference_seasons_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  let conference_seasons = db.conference_season.find({ season: common.season });
  conference_seasons = nest_children(
    conference_seasons,
    conference_seasons_by_conference_id,
    "conference_id",
    "conference"
  );
  conference_seasons = conference_seasons.sort(
    (cs_a, cs_b) => cs_b.conference.conference_name - cs_a.conference.conference_name
  );
  let conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );

  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  var weeks = db.period.find({ season: common.season });
  weeks = weeks.sort((w_a, w_b) => w_a.period_id - w_b.period_id);
  let current_week = weeks.find((w) => w.is_current);
  const week_ids = weeks.map((w) => w.period_id);

  var games = db.game.find({ week_id: { $in: week_ids } });
  games = games.sort(game_sorter);
  const game_ids = games.map((g) => g.game_id);

  common.stopwatch(common, "getHtml 1.2");

  var team_games = db.team_game.find({ game_id: { $in: game_ids } });
  team_games = nest_children(
    team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  const team_games_by_game_id = index_group_sync(team_games, "group", "game_id");

  console.log({ team_games: team_games });

  common.stopwatch(common, "getHtml 1.3");
  let weeks_by_week_id = index_group_sync(weeks, "index", "period_id");
  for (const game of games) {
    game.week = weeks_by_week_id[game.week_id];

    game.team_games = team_games_by_game_id[game.game_id];
    game.team_games = game.team_games.sort((tg_a, tg_b) => tg_a.is_home_team);

    game.team_games[0].national_rank =
      game.team_games[0].national_rank || game.team_games[0].team_season.national_rank;
    game.team_games[1].national_rank =
      game.team_games[1].national_rank || game.team_games[1].team_season.national_rank;

    game.away_team_game = game.team_games[0];
    game.home_team_game = game.team_games[1];

    if (game.away_team_game.is_winning_team) {
      game.away_team_game.bold = "bold";
    }
    if (game.home_team_game.is_winning_team) {
      game.home_team_game.bold = "bold";
    }

    var min_national_rank = Math.min(
      game.team_games[0].national_rank,
      game.team_games[1].national_rank
    );
    var max_national_rank = Math.max(
      game.team_games[0].national_rank,
      game.team_games[1].national_rank
    );
    game.summed_national_rank =
      game.team_games[0].national_rank + game.team_games[1].national_rank + max_national_rank;

    if (game.rivalry) {
      game.summed_national_rank -= min_national_rank;
    }

    game.has_user_team = game.team_games.some((tg) => tg.team_season.is_user_team);
  }
  games = games.sort(game_sorter);
  common.stopwatch(common, "getHtml 1.4");

  const games_by_week_id = index_group_sync(games, "group", "week_id");

  for (const week of weeks) {
    week.games = games_by_week_id[week.period_id] || [];

    week.games = week.games.sort(game_sorter);

    week.nav_clicked = false;

    if (week.games.length > 0 && week.is_current) {
      week.selected_week = true;
      week.selected = "selected";
    }
  }

  let priority_options = [{ priority_name: "Top 25" }, { priority_name: "National TV" }];

  let filters = [];
  let conference_obj_list = [];
  let team_seasons_by_conference_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season.conference.conference_id"
  );
  console.log({
    conferences: conferences,
    team_seasons_by_conference_id: team_seasons_by_conference_id,
  });
  Object.entries(team_seasons_by_conference_id).forEach(function (conference_iter) {
    let conference_id = conference_iter[0];
    let conference_team_seasons = conference_iter[1];
    let conference_obj = {
      display: conference_team_seasons[0].conference_season.conference.conference_name,
      options: [],
    };
    console.log({ conference_obj: conference_obj });

    let conference_teams = distinct(
      conference_team_seasons.map((ts) => ts.team.team_location_name)
    ).sort();
    console.log({ conference_teams: conference_teams });

    conference_obj.options = conference_team_seasons.map((ts) => ({
      display: ts.team.team_location_name,
      logo_url: ts.team.team_logo,
    }));
    console.log({ conference_obj: conference_obj });

    conference_obj_list.push(conference_obj);
    console.log({ conference_obj: conference_obj });
  });

  filters.unshift({
    display: "Team",
    options: conference_obj_list,
  });

  let week_list = [];
  let any_week_selected = false;
  weeks.forEach(function (w) {
    let week_obj = {
      display: w.period_name,
      week_id: w.period_id,
      selected: w.is_current,
    };

    if (games_by_week_id[w.period_id] && games_by_week_id[w.period_id].length) {
      any_week_selected = any_week_selected || w.is_current;
      week_list.push(week_obj);
    }
  });

  console.log({ any_week_selected: any_week_selected });
  if (!any_week_selected) {
    if (current_week.period_id <= week_list[0].period_id) {
      week_list[0].selected = true;
    } else {
      // week_list[week_list.length - 1].selected = true;
    }
  }

  let selected_week = week_list.find((w) => w.selected);

  filters.push({
    display: "Week",
    options: week_list,
  });

  filters.push({
    display: "Priority",
    options: [{ display: "Top 25" }, { display: "In-Conference" }],
  });

  common.stopwatch(common, "getHtml 1.4");

  weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: `${common.season} Schedule`,
    },
    team_list: [],
    world_id: common.params["world_id"],
    weeks: weeks,
    recent_games: await recent_games(common),
    filters: filters,
    current_week: current_week,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);
  common.stopwatch(common, "getHtml 1.6");
  common.games = games;

  var url = "/html_templates/world/schedule/template2.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);
  common.stopwatch(common, "getHtml 1.7");

  var url = "/html_templates/world/schedule/week_schedule_template.njk";
  var html = await fetch(url);
  var week_html = await html.text();
  $(".week-schedule").on("click", async function () {
    var week_id = $(this).attr("weekid");
    var week = weeks_by_week_id[week_id];

    console.log({ week: week });
    if (week.nav_clicked) {
      return false;
    }
    week.nav_clicked = true;

    const renderedHtml = nunjucks_env.renderString(week_html, {
      week: week,
    });
    console.log({
      renderedHtml: renderedHtml,
      week: week,
      week_id: week_id,
      this: this,
    });
    $("#nav-tabContent").append(renderedHtml);
  });

  $(".selected-tab").click();

  var game_template_url = "/html_templates/world/schedule/game_box_score_template.njk";
  var game_template_html = await fetch(game_template_url);
  var game_template_html_text = await game_template_html.text();
  common.game_template_html_text = game_template_html_text;

  await draw_box_scores(common);
  $(".schedule-select").on("change", async function () {
    await draw_box_scores(common);
  });

  $(".football-table-filter-button").on("click", function () {
    let table_filter_content = $(this).next();
    $(table_filter_content).toggleClass("hidden");
  });

  $("#filter-dropdown-button").on("click", async function () {
    $(this).find("i").toggleClass("fa-angle-down");
    $(this).find("i").toggleClass("fa-angle-up");
    $(this).toggleClass("shown");

    $("#football-table-filter-table").toggleClass("hidden");
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

    await draw_box_scores(common);
  });

  $(".football-table-clear-filters").on("click", async function () {
    $(`.football-table-filter-option.selected`).removeClass("selected");
    $(".filter-badge:not(.hidden)").remove();
    await draw_box_scores(common);
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

    $(this).remove();

    await draw_box_scores(common);
  });
};

const draw_box_scores = async (common) => {
  const db = common.db;

  let games = common.games;

  let filter_values = {};
  $(".football-table-filter-option-group").each(function () {
    let filter_category = $(this).attr("filter_option");
    console.log({ this: this, filter_category: filter_category });
    filter_values[filter_category] = $(this)
      .find(".selected")
      .toArray()
      .map(function (elem) {
        return $(elem).attr("filter-value");
      });
  });
  console.log({ filter_values: filter_values, games: games });

  //Filter by week id
  games = games.filter(function (g) {
    if (filter_values["Week"].length > 0) {
      return filter_values["Week"].includes(g.week.period_name);
    }
    return true;
  });
  console.log({ filter_values: filter_values, games: games });

  //Filter by conference ID (either team is in conference)
  games = games.filter(function (g) {
    if (filter_values["Team"].length > 0) {
      return (
        filter_values["Team"].includes(g.team_games[0].team_season.team.team_location_name) ||
        filter_values["Team"].includes(g.team_games[1].team_season.team.team_location_name)
      );
    }
    return true;
  });
  console.log({ filter_values: filter_values, games: games });

  games = games.filter(function (g) {
    if (filter_values["Priority"].length > 0) {
      if (filter_values["Priority"].includes("Top 25")) {
        return (
          (g.team_games[0].national_rank ||
            g.team_games[0].team_season.rankings.national_rank[0]) <= 25 ||
          (g.team_games[1].national_rank ||
            g.team_games[1].team_season.rankings.national_rank[0]) <= 25
        );
      }

      if (filter_values["Priority"].includes("In-Conference")) {
        return (
          g.team_games[0].team_season.conference_season_id ==
          g.team_games[1].team_season.conference_season_id
        );
      }
    }
    return true;
  });

  games = games.sort(game_sorter);

  console.log({
    filter_values: filter_values,
    games: games,
    "common.game_template_html_text": common.game_template_html_text,
  });

  const renderedHtml = nunjucks_env.renderString(common.game_template_html_text, {
    games: games,
  });

  console.log({ renderedHtml: renderedHtml });

  $("#schedule-box-score-container").empty();
  $("#schedule-box-score-container").append(renderedHtml);
};

const game_sorter = (g_a, g_b) =>
  g_a.week_id - g_b.week_id ||
  (g_a.has_user_team ? -1 : 0) ||
  (g_b.has_user_team ? 1 : 0) ||
  g_a.summed_national_rank - g_b.summed_national_rank;
