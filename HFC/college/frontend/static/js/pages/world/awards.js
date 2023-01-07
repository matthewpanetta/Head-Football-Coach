import {
  index_group_sync,
  get,
  set,
  distinct,
  nest_children,
  intersect,
  set_intersect,
  union,
  sum,
  set_union,
  except,
  set_except,
  get_from_dict,
  deep_copy,
  ordinal,
  isScrolledIntoView,
} from "/static/js/utils.js";
import { nunjucks_env } from "/static/js/modules/nunjucks_tags.js";
import { position_order_map, position_group_map } from "/static/js/metadata.js";
import { draw_player_faces, player_face_listeners } from "/static/js/faces.js";

export const page_world_awards = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });

  common.stopwatch(common, "awards - start of gethtml");

  const NavBarLinks = await common.nav_bar_links({
    path: "Awards & Races",
    group_name: "World",
    db: db,
  });
  var player_team_season_ids = [];
  common.stopwatch(common, "awards - after navbarlinks");

  const awards = db.award.find({ season: common.season });
  common.stopwatch(common, "awards - after award fetch");

  var weekly_awards = awards.filter(
    (a) => a.award_timeframe == "week" && a.player_team_game_id != null
  );
  var preseason_awards = awards.filter((a) => a.award_timeframe == "pre-season");
  var regular_season_first_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "First" &&
      a.award_group == "position"
  );
  var regular_season_second_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "Second" &&
      a.award_group == "position"
  );
  var regular_season_freshman_team_all_american_awards = awards.filter(
    (a) =>
      a.award_timeframe == "regular season" &&
      a.award_team == "Freshman" &&
      a.award_group == "position"
  );
  var trophies = awards.filter(
    (a) => a.award_group == "individual" && a.award_team_set == "national"
  );

  player_team_season_ids = player_team_season_ids.concat(
    weekly_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    preseason_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_first_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_second_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  player_team_season_ids = player_team_season_ids.concat(
    regular_season_freshman_team_all_american_awards.map((a) => a.player_team_season_id)
  );
  if (trophies.length > 0) {
    player_team_season_ids.concat(trophies.map((a) => a.player_team_season_id));
  }

  const player_team_game_ids = weekly_awards.map((a) => a.player_team_game_id);

  var conference_seasons = db.conference_season.find({ season: common.season });

  const conference_ids = conference_seasons.map((cs) => cs.conference_id);
  var conferences = db.conference.find({ conference_id: { $in: conference_ids } });
  const conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");
  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  common.stopwatch(common, "awards - after cinferences");

  var weeks = db.week.find({ season: common.season });
  const weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  weekly_awards = nest_children(weekly_awards, weeks_by_week_id, "week_id", "week");
  weekly_awards = weekly_awards.sort((w_a, w_b) => w_a.week_id - w_b.week_id);

  common.stopwatch(common, "awards - weeks");

  var player_team_games = db.player_team_game.find({
    player_team_game_id: { $in: player_team_game_ids },
  });
  var team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
  team_game_ids = distinct(team_game_ids);
  var team_games = db.team_game.find({ team_game_id: { $in: team_game_ids } });

  common.stopwatch(common, "awards - after player team games");

  var game_ids = team_games.map((tg) => tg.game_id);
  game_ids = distinct(game_ids);
  const games = db.game.find({ game_id: { $in: game_ids } });
  const games_by_game_id = index_group_sync(games, "index", "game_id");
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");

  common.stopwatch(common, "awards - after games");

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  team_games.forEach(function (tg) {
    tg.opponent_team_season = team_seasons_by_team_season_id[tg.opponent_team_season_id];
  });

  common.stopwatch(common, "awards - after teamgames");

  let team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");
  player_team_games = nest_children(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  player_team_season_ids = distinct(player_team_season_ids);
  var player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  var previous_player_team_seasons = db.player_team_season.find({ season: common.season - 1 });

  common.stopwatch(common, "awards - after pts");

  const player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );

  common.stopwatch(common, "awards - after pts_stat");

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync(players, "index", "player_id");
  const previous_player_team_seasons_by_player_id = index_group_sync(
    previous_player_team_seasons,
    "index",
    "player_id"
  );

  common.stopwatch(common, "awards - after player fetch");

  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );

  common.stopwatch(common, "awards - after nest");

  const player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );
  player_team_games = nest_children(
    player_team_games,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  player_team_games = nest_children(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );
  const player_team_games_by_player_team_game_id = index_group_sync(
    player_team_games,
    "index",
    "player_team_game_id"
  );

  common.stopwatch(common, "awards - after pts index");

  weekly_awards = nest_children(
    weekly_awards,
    player_team_games_by_player_team_game_id,
    "player_team_game_id",
    "player_team_game"
  );

  weekly_awards = index_group_sync(weekly_awards, "group", "conference_season_id");

  preseason_awards = nest_children(
    preseason_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let preseason_awards_by_conference_season_id = index_group_sync(
    preseason_awards,
    "group",
    "conference_season_id"
  );

  regular_season_first_team_all_american_awards = nest_children(
    regular_season_first_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_first_team_all_american_awards_by_conference_season_id = index_group_sync(
    regular_season_first_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  regular_season_second_team_all_american_awards = nest_children(
    regular_season_second_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_second_team_all_american_awards_by_conference_season_id = index_group_sync(
    regular_season_second_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  regular_season_freshman_team_all_american_awards = nest_children(
    regular_season_freshman_team_all_american_awards,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );
  let regular_season_freshman_team_all_american_awards_by_conference_season_id = index_group_sync(
    regular_season_freshman_team_all_american_awards,
    "group",
    "conference_season_id"
  );

  // console.log({player_team_seasons:player_team_seasons, player_team_seasons_by_player_team_season_id:player_team_seasons_by_player_team_season_id, regular_season_all_american_awards:regular_season_all_american_awards, preseason_awards:preseason_awards, weekly_awards:weekly_awards})

  trophies = nest_children(
    trophies,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );

  console.log({
    weekly_awards: weekly_awards,
    conference_seasons: conference_seasons,
    preseason_awards: preseason_awards,
  });

  conference_seasons.unshift({
    conference_season_id: null,
    conference: { conference_name: "National" },
  });

  conference_seasons = nest_children(
    conference_seasons,
    weekly_awards,
    "conference_season_id",
    "weekly_awards"
  );

  conference_seasons = conference_seasons.map(function (conference_season) {
    let award_weeks = deep_copy(weeks);

    conference_season.weekly_awards = index_group_sync(
      conference_season.weekly_awards,
      "group",
      "week_id"
    );
    conference_season.weekly_awards = nest_children(
      award_weeks,
      conference_season.weekly_awards,
      "week_id",
      "awards"
    );

    conference_season.weekly_awards = conference_season.weekly_awards.filter(
      (w) => w.awards != undefined && w.awards.length > 0
    );

    conference_season.weekly_awards = conference_season.weekly_awards.sort(
      (w_a, w_b) => w_a.week_id - w_b.week_id
    );

    conference_season.weekly_awards.forEach(function (wa) {
      wa.awards = wa.awards.sort(
        (award_a, award_b) =>
          position_order_map[award_a.award_group_type] -
          position_order_map[award_b.award_group_type]
      );
    });

    console.log({ conference_season: conference_season });

    var this_conference_preseason_awards = preseason_awards_by_conference_season_id[
      conference_season.conference_season_id
    ].sort(
      (award_a, award_b) =>
        position_order_map[award_a.award_group_type] - position_order_map[award_b.award_group_type]
    );
    console.log({
      this_conference_preseason_awards: this_conference_preseason_awards,
    });
    this_conference_preseason_awards.forEach(function (award) {
      award.position_group = position_group_map[award.player_team_season.position];
    });
    var this_conference_preseason_awards_by_position_group = index_group_sync(
      this_conference_preseason_awards,
      "group",
      "position_group"
    );

    conference_season.preseason_awards = [];

    for (var i = 0; i < this_conference_preseason_awards_by_position_group.Offense.length; i++) {
      conference_season.preseason_awards.push({
        Offense: this_conference_preseason_awards_by_position_group.Offense[i],
        Defense: this_conference_preseason_awards_by_position_group.Defense[i],
      });
    }

    conference_season.regular_season_first_team_all_american_awards = [];
    conference_season.regular_season_other_team_all_american_awards = [];
    if (
      conference_season.conference_season_id in
      regular_season_first_team_all_american_awards_by_conference_season_id
    ) {
      var this_conference_regular_season_first_team_all_american_awards =
        regular_season_first_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ].sort(
          (award_a, award_b) =>
            position_order_map[award_a.award_group_type] -
            position_order_map[award_b.award_group_type]
        );
      this_conference_regular_season_first_team_all_american_awards.forEach(function (award) {
        award.position_group = position_group_map[award.player_team_season.position];
      });
      var this_conference_regular_season_first_team_all_american_awards_by_position_group =
        index_group_sync(
          this_conference_regular_season_first_team_all_american_awards,
          "group",
          "position_group"
        );

      for (
        var i = 0;
        i <
        this_conference_regular_season_first_team_all_american_awards_by_position_group.Offense
          .length;
        i++
      ) {
        conference_season.regular_season_first_team_all_american_awards.push({
          Offense:
            this_conference_regular_season_first_team_all_american_awards_by_position_group.Offense[
              i
            ],
          Defense:
            this_conference_regular_season_first_team_all_american_awards_by_position_group.Defense[
              i
            ],
        });
      }

      var this_conference_regular_season_second_team_all_american_awards =
        regular_season_second_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ].sort(
          (award_a, award_b) =>
            position_order_map[award_a.award_group_type] -
            position_order_map[award_b.award_group_type]
        );

      console.log({
        regular_season_freshman_team_all_american_awards_by_conference_season_id:
          regular_season_freshman_team_all_american_awards_by_conference_season_id,
        conference_season: conference_season,
        regular_season_freshman_team_all_american_awards:
          regular_season_freshman_team_all_american_awards,
        awards: awards,
      });
      var this_conference_regular_season_freshman_team_all_american_awards = (
        regular_season_freshman_team_all_american_awards_by_conference_season_id[
          conference_season.conference_season_id
        ] || []
      ).sort(
        (award_a, award_b) =>
          position_order_map[award_a.award_group_type] -
          position_order_map[award_b.award_group_type]
      );

      for (
        var i = 0;
        i < this_conference_regular_season_second_team_all_american_awards.length;
        i++
      ) {
        conference_season.regular_season_other_team_all_american_awards.push({
          Second: this_conference_regular_season_second_team_all_american_awards[i],
          Freshman: this_conference_regular_season_freshman_team_all_american_awards[i],
        });
      }
    }

    console.log({ conference_season: conference_season });
    return conference_season;
  });

  console.log({
    weekly_awards: weekly_awards,
    conference_seasons: conference_seasons,
    trophies: trophies,
  });

  var heisman_race = player_team_seasons.sort(
    (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
  );

  heisman_race = heisman_race.slice(0, 10);

  const recent_games = await common.recent_games(common);

  var page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: "Player Awards",
  };

  var display_options = {
    preseason: { display: "none" },
    trophies: { display: "none" },
    heisman_race: { display: "none" },
    potw: { display: "none" },
    season: { display: "none" },
  };
  var display_items = [];
  //Preseason & week 1
  if (Object.keys(weekly_awards).length == 0) {
    //pre-season AA first
    //heisman race
    display_items = [
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "heisman-race",
        display: "Heisman Race",
        classes: "",
        other_attrs: "",
      },
    ];

    display_options.preseason.display = "block";
  } else if (trophies.length > 0) {
    display_items = [
      {
        div_id: "trophies",
        display: "Award Winners",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "all-americans",
        display: "All Americans",
        classes: "",
        other_attrs: "",
      },
      { div_id: "weekly", display: "POTW", classes: "", other_attrs: "" },
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: "",
        other_attrs: ``,
      },
    ];

    display_options.trophies.display = "block";
  } else {
    display_items = [
      {
        div_id: "weekly",
        display: "POTW",
        classes: " selected-tab",
        other_attrs: `style='background-color: #${page.SecondaryColor}'`,
      },
      {
        div_id: "heisman-race",
        display: "Heisman Race",
        classes: "",
        other_attrs: ``,
      },
      {
        div_id: "preseason",
        display: "Preseason AAs",
        classes: "",
        other_attrs: ``,
      },
    ];

    display_options.potw.display = "block";
  }

  var render_content = {
    page: page,
    team_list: [],
    world_id: common.params["world_id"],
    recent_games: recent_games,
    conference_seasons: conference_seasons,
    heisman_race: heisman_race,
    trophies: trophies,
    display_items: display_items,
    display_options: display_options,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/awards/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  $("#nav-heisman-race-tab").on("click", async function () {
    var url = "/static/html_templates/world/awards/heisman_race_table_template.njk";
    var html = await fetch(url);
    html = await html.text();

    const renderedHtml = nunjucks_env.renderString(html, render_content);
    console.log({ this: this, renderedHtml: renderedHtml });
    $("#nav-heisman-race").html(renderedHtml);

    $("#nav-heisman-race .player-profile-popup-icon").on("click", async function () {
      await common.populate_player_modal(common, this);
    });
  });

  await last_action(common);

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const last_action = async (common) => {
  const db = common.db;

  await player_face_listeners(common);
};
