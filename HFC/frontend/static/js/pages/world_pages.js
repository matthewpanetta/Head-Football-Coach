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
} from "../utils.js";
import {nunjucks_env} from '../modules/nunjucks_tags.js'
import { position_order_map, position_group_map } from "../metadata.js";
import { draw_player_faces } from "../faces.js";

export const page_world = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  console.log({
    common: common,
    db: db,
  });

  var current_week = db.week.find({ season: { $between: [season - 1, season + 1] } });
  current_week = current_week.find((w) => w.is_current);

  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "World",
    db: db,
  });

  common.stopwatch(common, "Time before recent_games");
  const recent_games = common.recent_games(common);
  common.stopwatch(common, "Time after recent_games");

  let teams = db.team.find({ team_id: { $gt: 0 } });
  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  let conferences = db.conference.find();
  let conference_seasons = db.conference_season.find({ season: season });
  let this_week_team_games = db.team_game.find({ week_id: current_week.week_id });
  let this_week_games = db.game.find({ week_id: current_week.week_id });
  let headlines = db.headline.find({ week_id: current_week.week_id - 1 });

  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  var conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
  var team_seasons_by_team_id = index_group_sync(team_seasons, "index", "team_id");
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");
  var distinct_team_seasons = [];
  common.stopwatch(common, "Time after selecting teams");

  $.each(teams, async function (ind, team) {
    team.team_season = team_seasons_by_team_id[team.team_id];
    team.team_season.conference_season =
      conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
    team.team_season.conference_season.conference =
      conferences_by_conference_id[team.team_season.conference_season.conference_id];

    team.conference_position_display = `${team.team_season.rankings.division_rank[0]} in ${team.team_season.conference_season.conference.conference_abbreviation}`;
    if (team.team_season.results.conference_champion) {
      team.conference_position_display = `${team.team_season.conference_season.conference.conference_abbreviation} Champions`;
    }
  });

  teams.sort(function (a, b) {
    if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0])
      return -1;
    if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
    return 0;
  });

  common.stopwatch(common, "Time after sorting team seasons");

  var this_week_team_games_by_team_game_id = index_group_sync(
    this_week_team_games,
    "index",
    "team_game_id"
  );

  common.stopwatch(common, "Time after fetching team games");

  common.stopwatch(common, "Time after fetching games");

  var min_national_rank = 0;
  $.each(this_week_games, function (ind, game) {
    game.game_headline_display = "";
    if (game.bowl != null) {
      game.game_headline_display = game.bowl.bowl_name;
    } else if (game.rivalry != null) {
      if (game.rivalry.rivalry_name.length > 0) {
        game.game_headline_display = game.rivalry.rivalry_name;
      } else {
        game.game_headline_display = "Rivalry Game";
      }
    }

    game.home_team_game = this_week_team_games_by_team_game_id[game.home_team_game_id];
    game.away_team_game = this_week_team_games_by_team_game_id[game.away_team_game_id];

    game.home_team_game.team_season =
      team_seasons_by_team_season_id[game.home_team_game.team_season_id];
    game.away_team_game.team_season =
      team_seasons_by_team_season_id[game.away_team_game.team_season_id];

    game.home_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };
    game.away_team_game.team_season.stat_rankings = {
      offense: Math.floor(Math.random() * 50),
      defense: Math.floor(Math.random() * 50),
    };

    game.home_team_game.team_season.team =
      teams_by_team_id[game.home_team_game.team_season.team_id];
    game.away_team_game.team_season.team =
      teams_by_team_id[game.away_team_game.team_season.team_id];

    game.team_games = [game.away_team_game, game.home_team_game];

    min_national_rank = Math.min(
      game.home_team_game.team_season.national_rank,
      game.away_team_game.team_season.national_rank
    );
    game.summed_national_rank =
      game.home_team_game.team_season.national_rank +
      game.away_team_game.team_season.national_rank +
      min_national_rank;
  });

  this_week_games = this_week_games.sort(function (g_a, g_b) {
    if (g_a.team_games[0].team_season.is_user_team || g_a.team_games[1].team_season.is_user_team)
      return -1;
    if (g_b.team_games[0].team_season.is_user_team || g_b.team_games[1].team_season.is_user_team)
      return 1;
    if (g_a.summed_national_rank < g_b.summed_national_rank) return -1;
    if (g_a.summed_national_rank > g_b.summed_national_rank) return 1;
    return 0;
  });

  let headline_type_map = {
    game: "Last Week Games",
    ranking: "AP Top 25",
    recruiting: "247 Recruiting",
  };
  headlines.forEach(function (h) {
    h.headline_type_display = headline_type_map[h.headline_type];
    h.team_seasons = h.team_season_ids.map((ts_id) => team_seasons_by_team_season_id[ts_id]);
  });
  headlines = headlines.sort((h_a, h_b) => h_b.headline_relevance - h_a.headline_relevance);
  let headlines_by_headline_type = index_group_sync(headlines, "group", "headline_type_display");

  common.stopwatch(common, "Time after this_week_games");
  const page = {
    PrimaryColor: common.primary_color,
    SecondaryColor: common.secondary_color,
    NavBarLinks: NavBarLinks,
    page_title: "Head Football Coach",
  };
  var render_content = {
    team_list: [],
    page: page,
    world_id: common.world_id,
    teams: teams,
    recent_games: recent_games,
    current_week: current_week,
    headlines_by_headline_type: headlines_by_headline_type,
    this_week_games: this_week_games,
  };

  common.render_content = render_content;
  window.common = common;

  console.log("render_content", render_content);
  console.log({ recent_games: recent_games });

  let url = "/static/html_templates/world/world/template.njk";
  let html = await fetch(url);
  html = await html.text();

  let renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").empty();
  $("#body").append(renderedHtml);

  console.log({
    teams: teams,
    this_week_games: this_week_games,
    recent_games: recent_games,
    db:db
  });

  let user_team_overview_data = {
    user_team: teams.find((t) => t.is_user_team),
    this_week_game: this_week_games.find(
      (g) => g.team_games[0].team_season.is_user_team || g.team_games[1].team_season.is_user_team
    ),
    last_week_game: recent_games.find(
      (g) => g.team_games[0].team_season.is_user_team || g.team_games[1].team_season.is_user_team
    ),
  };

  console.log({teams:teams, db:db, user_team_overview_data: user_team_overview_data });

  let preseason_info = {};
  let season_recap = {};
  common.stopwatch(common, "Time before pre-season");
  if (current_week.week_name == "Pre-Season") {
    // TODO filter out backups
    preseason_info.conference_favorites = [];

    let team_seasons = db.team_season.find({
      season: { $between: [common.season - 1, common.season] },
      team_id: { $gt: 0 },
    });
    let all_teams = db.team.find();
    let player_team_seasons = db.player_team_season.find({
      season: { $between: [common.season - 1, common.season] },
    });
    let all_preseason_awards = db.award.find({ week_id: current_week.week_id });

    const teams_by_team_id = index_group_sync(all_teams, "index", "team_id");

    team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

    const team_seasons_by_team_season_id = index_group_sync(
      team_seasons,
      "index",
      "team_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season team_seasons");

    player_team_seasons = player_team_seasons.filter((pts) => pts.team_season_id > 0);
    let player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);

    common.stopwatch(common, "Time after fetching pre season pts");
    const player_ids = distinct(player_team_seasons.map((pts) => pts.player_id));

    let player_team_season_stats = db.player_team_season_stats.find({
      player_team_season_id: { $in: player_team_season_ids },
    });
    let players = db.player.find({ player_id: { $in: player_ids } });
    let conferences = db.conference.find();
    let conference_seasons = db.conference_season.find({ season: season });

    const player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    common.stopwatch(common, "Time after fetching pre season ptss");

    const players_by_player_id = index_group_sync(players, "index", "player_id");

    common.stopwatch(common, "Time after fetching pre season players");

    player_team_seasons = nest_children(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );
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

    let previous_player_team_seasons = player_team_seasons.filter(
      (pts) => pts.season == common.season - 1
    );

    player_team_seasons = player_team_seasons.filter((pts) => pts.season == common.season);
    team_seasons = team_seasons.filter((ts) => ts.season == common.season);

    let previous_player_team_seasons_by_player_id = index_group_sync(
      previous_player_team_seasons,
      "index",
      "player_id"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      previous_player_team_seasons_by_player_id,
      "player_id",
      "previous_player_team_season"
    );
    player_team_seasons.forEach(
      (pts) =>
        (pts.previous_player_team_season = pts.previous_player_team_season || {
          player_award_rating: pts.player_award_rating,
        })
    );

    common.stopwatch(common, "Time after indexing & filtering players & ptss");

    var heisman_race = player_team_seasons.filter((pts) => pts.depth_chart_rank == 1);
    heisman_race = heisman_race.sort(function (pts_a, pts_b) {
      return (
        pts_b.previous_player_team_season.player_award_rating -
        pts_a.previous_player_team_season.player_award_rating
      );
    });
    preseason_info.heisman_hopefuls = heisman_race.slice(0, 5);

    common.stopwatch(common, "Time after sorting pre season pts");

    let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");
    conference_seasons = nest_children(
      conference_seasons,
      conferences_by_conference_id,
      "conference_id",
      "conference"
    );
    const team_seasons_by_conference_season_id = index_group_sync(
      team_seasons,
      "group",
      "conference_season_id"
    );

    common.stopwatch(common, "Time after fetching pre season conferences");

    for (let conference_season of conference_seasons) {
      let team_seasons_for_conference =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];
      team_seasons_for_conference = team_seasons_for_conference.sort(function (ts_a, ts_b) {
        return (
          ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0] ||
          ts_a.national_rank - ts_b.national_rank
        );
      });

      conference_season.team_seasons = team_seasons_for_conference;
    }

    conference_seasons = conference_seasons.sort(
      (cs_a, cs_b) => cs_b.conference.prestige - cs_a.conference.prestige
    );

    preseason_info.conference_favorites = conference_seasons;
    render_content.preseason_info = preseason_info;
    url = "/static/html_templates/world/world/info_col_preseason.njk";

    let player_team_seasons_by_player_team_season_id = index_group_sync(
      player_team_seasons,
      "index",
      "player_team_season_id"
    );
    all_preseason_awards = nest_children(
      all_preseason_awards,
      player_team_seasons_by_player_team_season_id,
      "player_team_season_id",
      "player_team_season"
    );
    console.log({
      all_preseason_awards: all_preseason_awards,
      user_team_overview_data: user_team_overview_data,
    });
    let user_team_preseason_awards = all_preseason_awards.filter(
      (a) => a.player_team_season.team_season.team_id == user_team_overview_data.user_team.team_id
    );

    user_team_overview_data.preseason_all_conference = user_team_preseason_awards.filter(
      (a) => a.award_team_set == "conference"
    );
    user_team_overview_data.preseason_all_american = user_team_preseason_awards.filter(
      (a) => a.award_team_set == "national"
    );
  } else if (current_week.week_name == "Season Recap") {
    team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
    let team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

    const awards = db.award.find({ season: common.season });
    var heisman_award = awards.find((a) => a.award_group_type == "Heisman");
    let conference_season_poty_awards = awards.filter(
      (a) =>
        a.award_group == "individual" &&
        a.award_timeframe == "regular season" &&
        a.award_team_set == "conference"
    );

    let player_team_season_ids = conference_season_poty_awards
      .map((a) => a.player_team_season_id)
      .concat([heisman_award.player_team_season_id]);
    let player_team_seasons = db.player_team_season.find({
      player_team_season_id: { $in: player_team_season_ids },
    });

    let player_ids = player_team_seasons.map((pts) => pts.player_id);

    let players = db.player.find({ player_id: { $in: player_ids } });
    let player_team_season_stats = db.player_team_season_stats.find({
      player_team_season_id: { $in: player_team_season_ids },
    });

    let players_by_player_id = index_group_sync(players, "index", "player_id");
    let player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      player_team_season_stats_by_player_team_season_id,
      "player_team_season_id",
      "season_stats"
    );

    player_team_seasons = nest_children(
      player_team_seasons,
      players_by_player_id,
      "player_id",
      "player"
    );
    player_team_seasons = nest_children(
      player_team_seasons,
      team_seasons_by_team_season_id,
      "team_season_id",
      "team_season"
    );
    let player_team_seasons_by_player_team_season_id = index_group_sync(
      player_team_seasons,
      "index",
      "player_team_season_id"
    );

    heisman_award.player_team_season =
      player_team_seasons_by_player_team_season_id[heisman_award.player_team_season_id];
    conference_season_poty_awards = nest_children(
      conference_season_poty_awards,
      player_team_seasons_by_player_team_season_id,
      "player_team_season_id",
      "player_team_season"
    );

    let conference_winning_team_seasons = team_seasons.filter(
      (ts) => ts.results.conference_champion
    );
    let conference_winning_team_seasons_by_conference_season_id = index_group_sync(
      conference_winning_team_seasons,
      "index",
      "conference_season_id"
    );
    let conference_season_ids = conference_winning_team_seasons.map(
      (ts) => ts.conference_season_id
    );
    let conference_seasons = db.conference_season.find({
      conference_season_id: { $in: conference_season_ids },
    });
    let conference_ids = conference_seasons.map((cs) => cs.conference_id);
    let conferences = db.conference.find({ conference_id: { $in: conference_ids } });
    let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

    let conference_season_poty_awards_by_conference_season_id = index_group_sync(
      conference_season_poty_awards,
      "index",
      "conference_season_id"
    );

    conference_seasons = nest_children(
      conference_seasons,
      conference_season_poty_awards_by_conference_season_id,
      "conference_season_id",
      "poty_award"
    );
    conference_seasons = nest_children(
      conference_seasons,
      conferences_by_conference_id,
      "conference_id",
      "conference"
    );
    // let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')
    conference_seasons = nest_children(
      conference_seasons,
      conference_winning_team_seasons_by_conference_season_id,
      "conference_season_id",
      "team_season"
    );
    conference_seasons = conference_seasons.sort((cs_a, cs_b) =>
      cs_b.conference.conference_name > cs_a.conference.conference_name ? -1 : 1
    );

    let national_champions_team_season = team_seasons.find((ts) => ts.results.national_champion);
    let champion_other_team_seasons = db.team_season
      .find({ team_id: national_champions_team_season.team_id })
      .filter((ts) => ts.results.national_champion);
    national_champions_team_season.national_championship_count = champion_other_team_seasons.length;
    season_recap.national_champions_team_season = national_champions_team_season;
    season_recap.heisman_award = heisman_award;
    season_recap.conference_seasons = conference_seasons;

    render_content.season_recap = season_recap;
    url = "/static/html_templates/world/world/info_col_season_recap.njk";
  } else {
    url = "/static/html_templates/world/world/info_col_season.njk";
  }

  common.render_content = render_content;

  console.log("render_content", render_content);

  html = await fetch(url);
  html = await html.text();

  renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#info-col").html(renderedHtml);

  console.log({ user_team_overview_data: user_team_overview_data, teams: teams });

  let user_team_url = "/static/html_templates/world/world/info_col_user_team.njk";
  let user_team__overview_html = await fetch(user_team_url);
  user_team__overview_html = await user_team__overview_html.text();

  let user_team_rendered_html = nunjucks_env.renderString(user_team__overview_html, {
    world_id: common.world_id,
    user_team_overview_data: user_team_overview_data,
  });
  $("#user-team-overview").html(user_team_rendered_html);
};

export const page_world_standings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const conference_id = common.params.conference_id;
  console.log("conference_id", conference_id, common);

  var world_obj = {};

  const NavBarLinks = await common.nav_bar_links({
    path: "Standings",
    group_name: "World",
    db: db,
  });

  const weeks = db.week.find({ season: season });
  const week_ids = weeks.map((week) => week.week_id);

  let teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");
  let conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");
  var conference_seasons = db.conference_season.find({ season: season });
  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  var distinct_team_seasons = [];

  let games = db.game.find({ week_id: { $in: week_ids } });
  var games_by_game_id = index_group_sync(games, "index", "game_id");
  var team_games = db.team_game.find({ week_id: { $in: week_ids } });
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");

  team_games = team_games.filter((tg) => tg.game.was_played == true);
  var team_games_by_team_season_id = index_group_sync(team_games, "group", "team_season_id");
  var team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  console.log({
    team_games_by_team_game_id: team_games_by_team_game_id,
    team_games_by_team_season_id: team_games_by_team_season_id,
    team_games: team_games,
    games_by_game_id: games_by_game_id,
    week_ids: week_ids,
    "db.team_game": db.team_game,
  });

  for (let ts of team_seasons){
    ts.team = teams_by_team_id[ts.team_id];

    ts.team_games = team_games_by_team_season_id[ts.team_season_id] || [];
    ts.conference_outcomes = {
      record: ts.conference_record_display,
      gb: ts.record.conference_gb,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };
    ts.overall_outcomes = {
      record: ts.record_display,
      points_for: 0,
      points_against: 0,
      games_played: 0,
    };

    ts.first_conference_rank =
    ts.rankings.division_rank[ts.rankings.division_rank.length - 1];
    ts.final_conference_rank = ts.rankings.division_rank[0];
    ts.delta_conference_rank =
    ts.final_conference_rank - ts.first_conference_rank;
    ts.delta_conference_rank_abs = Math.abs(ts.delta_conference_rank);

    for (tg of ts.team_games) {
      tg.opponent_team_game = team_games_by_team_game_id[tg.opponent_team_game_id];
      ts.overall_outcomes.games_played += 1;
      ts.overall_outcomes.points_for += tg.points;
      ts.overall_outcomes.points_against += tg.opponent_team_game.points;

      if (tg.game.is_conference_game) {
        ts.conference_outcomes.games_played += 1;
        ts.conference_outcomes.points_for += tg.points;
        ts.conference_outcomes.points_against += tg.opponent_team_game.points;
      }
    }

    if (ts.overall_outcomes.games_played > 0) {
      ts.overall_outcomes.ppg = common.round_decimal(
        ts.overall_outcomes.points_for / ts.overall_outcomes.games_played,
        1
      );
      ts.overall_outcomes.papg = common.round_decimal(
        ts.overall_outcomes.points_against / ts.overall_outcomes.games_played,
        1
      );
      ts.overall_outcomes.mov = common.round_decimal(
        ts.overall_outcomes.ppg - ts.overall_outcomes.papg,
        1
      );

      if (ts.overall_outcomes.mov > 0) {
        ts.overall_outcomes.color = "W";
      } else if (ts.overall_outcomes.mov < 0) {
        ts.overall_outcomes.color = "L";
      }
    }

    if (ts.conference_outcomes.games_played > 0) {
      ts.conference_outcomes.ppg = common.round_decimal(
        ts.conference_outcomes.points_for / ts.conference_outcomes.games_played,
        1
      );
      ts.conference_outcomes.papg = common.round_decimal(
        ts.conference_outcomes.points_against /
        ts.conference_outcomes.games_played,
        1
      );
      ts.conference_outcomes.mov = common.round_decimal(
        ts.conference_outcomes.ppg - ts.conference_outcomes.papg,
        1
      );

      if (ts.conference_outcomes.mov > 0) {
        ts.conference_outcomes.color = "W";
      } else if (ts.conference_outcomes.mov < 0) {
        ts.conference_outcomes.color = "L";
      }
    } else {
      ts.conference_outcomes.ppg = "-";
      ts.conference_outcomes.papg = "-";
      ts.conference_outcomes.mov = "-";
    }
  }

  var team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  for (var conference_season of conference_seasons) {
    conference_season.conference = conferences_by_conference_id[conference_season.conference_id];

    for (let division of conference_season.divisions) {
      division.team_seasons =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];

      division.team_seasons = division.team_seasons.filter(
        (ts) => ts.division_name == division.division_name
      );
      division.team_seasons = division.team_seasons.sort(function (a, b) {
        if (a.rankings.division_rank[0] < b.rankings.division_rank[0]) return -1;
        if (a.rankings.division_rank[0] > b.rankings.division_rank[0]) return 1;
        return 0;
      });
    }
  }

  console.log({ conference_seasons: conference_seasons });
  conference_seasons = conference_seasons.sort(function (conference_season_a, conference_season_b) {
    if (conference_season_a.conference.conference_id == conference_id) return -1;
    if (conference_season_b.conference.conference_id == conference_id) return 1;
    if (conference_season_a.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return -1;
    if (conference_season_b.divisions.some((d) => d.team_seasons.some((ts) => ts.is_user_team)))
      return 1;
    if (
      conference_season_a.conference.conference_name <
      conference_season_b.conference.conference_name
    )
      return -1;
    return 1;
  });

  const recent_games = await common.recent_games(common);

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Conference Standings",
    },
    world_id: common.params["world_id"],
    team_list: [],
    recent_games: recent_games,
    conference_seasons: conference_seasons,
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/world/standings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  const conference_seasons_by_conference_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_id"
  );
  var clicked_tabs = [];
  var margin = { top: 10, right: 30, bottom: 30, left: 120 },
    height = 400 - margin.top - margin.bottom;

  $(`#nav-${conference_seasons[0].conference_id}-tab`).click();
};

export const page_world_rankings = async (common) => {
  const db = common.db;
  nunjucks.configure({ autoescape: true });
  const season = common.season;

  const current_league_season = db.league_season.findOne({ season: season });

  var world_obj = {};

  const NavBarLinks = await common.nav_bar_links({
    path: "Rankings",
    group_name: "World",
    db: db,
  });

  var teams = db.team.find({ team_id: { $gt: 0 } });
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  var conference_seasons = db.conference_season.find({ season: season });
  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  var conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const games = db.game
    .find()
    .filter((g) => g.season == season && g.bowl != null && g.bowl.is_playoff == true);
  const games_by_game_id = index_group_sync(games, "index", "game_id");
  const game_ids = games.map((g) => g.game_id);

  const team_games = db.team_game.find({ game_id: { $in: game_ids } });
  const team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  console.log({
    team_seasons: team_seasons,
    team_seasons_by_team_season_id: team_seasons_by_team_season_id,
    teams_by_team_id: teams_by_team_id,
  });

  var distinct_team_seasons = [];

  let dropped_teams = team_seasons.filter(
    (ts) => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[1] <= 25
  );
  let bubble_teams = team_seasons.filter(
    (ts) => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[0] < 29
  );

  team_seasons = team_seasons.filter((ts) => ts.rankings.national_rank[0] <= 25);

  team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.rankings.national_rank[0] < ts_b.rankings.national_rank[0]) return -1;
    if (ts_a.rankings.national_rank[0] > ts_b.rankings.national_rank[0]) return 1;
    return 0;
  });

  const recent_games = await common.recent_games(common);

  const playoffs = current_league_season.playoffs;

  if (playoffs.playoffs_started) {
    for (const playoff_round of playoffs.playoff_rounds) {
      for (const playoff_game of playoff_round.playoff_games) {
        console.log({ playoff_game: playoff_game });
        playoff_game.game = games_by_game_id[playoff_game.game_id];
        playoff_game.team_objs = nest_children(
          playoff_game.team_objs,
          team_seasons_by_team_season_id,
          "team_season_id",
          "team_season"
        );
        playoff_game.team_objs = nest_children(
          playoff_game.team_objs,
          team_games_by_team_game_id,
          "team_game_id",
          "team_game"
        );
      }
    }
  } else {
    var projected_playoff_teams = team_seasons.slice(0, playoffs.number_playoff_teams);
    console.log({
      playoffs: playoffs,
      projected_playoff_teams: projected_playoff_teams,
      number_playoff_teams: playoffs.number_playoff_teams,
    });
    for (var playoff_round of playoffs.playoff_rounds) {
      console.log({ playoff_round: playoff_round });
      playoff_round.round_of = 2 * playoff_round.playoff_games.length;
      for (var playoff_game of playoff_round.playoff_games) {
        for (var team_obj of playoff_game.team_objs) {
          team_obj.team_season = projected_playoff_teams[team_obj.seed - 1];
          console.log({
            team_obj: team_obj,
            playoff_game: playoff_game,
            playoff_round: playoff_round,
          });
        }
      }
    }
  }

  var render_content = {
    page: {
      PrimaryColor: common.primary_color,
      SecondaryColor: common.secondary_color,
      NavBarLinks: NavBarLinks,
      page_title: "Top 25",
    },
    team_list: [],
    world_id: common.params["world_id"],
    team_seasons: team_seasons,
    recent_games: recent_games,
    dropped_teams: dropped_teams,
    bubble_teams: bubble_teams,
    playoffs: playoffs,
  };
  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/world/rankings/template.njk";
  var html = await fetch(url);
  html = await html.text();

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $("#body").html(renderedHtml);

  await PopulateTop25(common);
};

const PopulateTop25 = async (common) => {
  const db = common.db;
  const index_group = common.index_group;
  const season = common.season;

  var this_week = db.week.find({ season: season });
  console.log("this_week", this_week);
  this_week = this_week.filter((week) => week.is_current)[0];
  const this_week_id = this_week.week_id;
  const last_week_id = this_week_id - 1;

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  team_seasons = team_seasons.sort(function (a, b) {
    if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;
    if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
    return 0;
  });
  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = db.team.find({ team_id: { $in: team_ids } });

  let this_week_team_games = db.team_game.find({ week_id: this_week_id });
  let last_week_team_games = db.team_game.find({ week_id: last_week_id });

  const total_team_games = Object.values(this_week_team_games).concat(
    Object.values(last_week_team_games)
  );
  const total_team_game_ids = total_team_games.map((team_game) => team_game.game_id);

  let games = db.game.find({ game_id: { $in: total_team_game_ids } });
  const games_by_game_id = index_group_sync(games, "index", "game_id");

  let all_teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(all_teams, "index", "team_id");
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  last_week_team_games = nest_children(last_week_team_games, games_by_game_id, "game_id", "game");
  this_week_team_games = nest_children(this_week_team_games, games_by_game_id, "game_id", "game");

  last_week_team_games = nest_children(
    last_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  this_week_team_games = nest_children(
    this_week_team_games,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  const last_week_team_games_by_team_season_id = index_group_sync(
    last_week_team_games,
    "index",
    "team_season_id"
  );
  const this_week_team_games_by_team_season_id = index_group_sync(
    this_week_team_games,
    "index",
    "team_season_id"
  );

  let all_team_games = db.team_game.find({ week_id: { $in: [this_week_id, last_week_id] } });
  const all_team_games_by_team_game_id = index_group_sync(all_team_games, "index", "team_game_id");

  let conference_seasons = db.conference_season.find({ season: season });
  let conferences = db.conference.find();

  const conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  const conference_seasons_by_conference_season_id = index_group_sync(
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
  team_seasons = nest_children(
    team_seasons,
    last_week_team_games_by_team_season_id,
    "team_season_id",
    "last_week_team_game"
  );
  team_seasons = nest_children(
    team_seasons,
    this_week_team_games_by_team_season_id,
    "team_season_id",
    "this_week_team_game"
  );

  let top_25_team_seasons = team_seasons.slice(0, 25);

  console.log("In PopulateTopTeams!", top_25_team_seasons);

  let table_template_url = "/static/html_templates/world/rankings/ranking_table_template.njk";
  let table_html = await fetch(table_template_url);
  let table_html_text = await table_html.text();

  var renderedHtml = nunjucks_env.renderString(table_html_text, {
    top_25_team_seasons: top_25_team_seasons,
  });
  console.log({ renderedHtml: renderedHtml, top_25_team_seasons: top_25_team_seasons });
  $("#Top25Table-body").empty();
  $("#Top25Table-body").append(renderedHtml);

  init_basic_table_sorting(common, "#Top25Table", null);
};

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

  common.stopwatch(common, "awards - weeks");

  var player_team_games = db.player_team_game.find({
    player_team_game_id: { $in: player_team_game_ids },
  });
  var team_game_ids = player_team_games.map((ptg) => ptg.team_game_id);
  team_game_ids = common.distinct(team_game_ids);
  var team_games = db.team_game.find({ team_game_id: { $in: team_game_ids } });

  common.stopwatch(common, "awards - after player team games");

  var game_ids = team_games.map((tg) => tg.game_id);
  game_ids = common.distinct(game_ids);
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

  player_team_season_ids = common.distinct(player_team_season_ids);
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

  await draw_player_faces(common, "#body");

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

    await draw_player_faces(common, "#nav-heisman-race");
  });
};
