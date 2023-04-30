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
} from "/common/js/utils.js";

export const conference_standings = async (
  conference_season_id,
  relevant_team_season_ids,
  common
) => {
  const db = common.db;
  var conference_season = db.conference_season.findOne({
    conference_season_id: conference_season_id,
  });
  const season = conference_season.season;
  var conference = db.conference.findOne({
    conference_id: conference_season.conference_id,
  });

  var team_seasons_in_conference = db.team_season.find({
    season: season,
    team_id: { $gt: 0 },
    conference_season_id: conference_season_id,
  });

  const team_season_stats = db.team_season_stats.find({ season: season });
  const team_season_stats_by_team_season_id = index_group_sync(
    team_season_stats,
    "index",
    "team_season_id"
  );

  const teams = db.team.find();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons_in_conference = nest_children(
    team_seasons_in_conference,
    team_season_stats_by_team_season_id,
    "team_season_id",
    "season_stats"
  );
  team_seasons_in_conference = nest_children(
    team_seasons_in_conference,
    teams_by_team_id,
    "team_id",
    "team"
  );

  team_seasons_in_conference.forEach(function (ts) {
    if (relevant_team_season_ids.includes(ts.team_season_id)) {
      ts.bold = "bold";
    }
  });

  for (const division of conference_season.divisions) {
    division.division_standings = team_seasons_in_conference
      .filter((ts) => ts.division_name == division.division_name)
      .sort(function (teamA, teamB) {
        return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
      });
    console.log({ division: division, team_seasons_in_conference: team_seasons_in_conference });
  }
  conference_season.conference = conference;
  console.log({ conference: conference, conference_season: conference_season });
  return conference_season;
};

export const team_header_links = (params) => {
  const path = params.path;
  const season = params.season;
  const db = params.db;
  const team = params.team;

  const all_paths = [
    { href_extension: "", Display: "Overview" },
    { href_extension: "Roster", Display: "Roster" },
    { href_extension: "Gameplan", Display: "Gameplan" },
    { href_extension: "Schedule", Display: "Schedule" },
    { href_extension: "History", Display: "History" },
  ];

  const link_paths = all_paths.filter((link) => link.Display != path);

  for (let path_obj of all_paths) {
    if (path_obj.Display == "History") {
      path_obj.href = team.team_href + "/" + path_obj.href_extension;
    } else if (path_obj.Display == "Overview") {
      if (season) {
        path_obj.href = team.team_href + `/Season/${season}/`;
      } else {
        path_obj.href = team.team_href;
      }
    } else {
      if (season) {
        path_obj.href = team.team_href + "/" + path_obj.href_extension + `/Season/${season}/`;
      } else {
        path_obj.href = team.team_href + "/" + path_obj.href_extension;
      }
    }
  }

  let path_obj = all_paths.find((link) => link.Display == path);

  var seasons = db.league_season.find();
  if (season != undefined) {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href: team.team_href + "/" + path_obj.href_extension + `/Season/${ls.season}/`,
    }));
  } else {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href: `Season/${ls.season}/`,
    }));
  }

  var return_links = all_paths[0];
  for (let path_obj of all_paths) {
    if (path_obj.Display == path) {
      return_links = {
        link_paths: link_paths,
        external_paths: path_obj,
        seasons: seasons,
      };
    }
  }

  return return_links;
};

export const recent_games = (common) => {
  const season = common.season;
  const db = common.db;
  const all_periods = db.period.find({ season: season });
  const all_periods_by_period_id = index_group_sync(all_periods, "index", "period_id");
  
  const current_day = db.day.findOne({ season: season, is_current: true });
  const current_period = all_periods.find((p) => { return p.period_id === current_day.period_id });
  const previous_period = all_periods_by_period_id[current_period.period_id - 1];

  if (previous_period == undefined) {
    return null;
  }

  var games_in_period = db.game.find({ period_id: previous_period.period_id });

  const team_seasons_b = db.team_season.find({ season: season });
  const team_seasons = team_seasons_b.filter((ts) => ts.team_id > 0);
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  const team_games = db.team_game.find({ period_id: previous_period.period_id });
  for (var team_game of team_games) {
    team_game.team_season = team_seasons_by_team_season_id[team_game.team_season_id];
    team_game.team_season.team = teams_by_team_id[team_game.team_season.team_id];
  }

  const team_games_by_game_id = index_group_sync(team_games, "group", "game_id");
  var min_power_rank = 0;
  for (var game of games_in_period) {
    game.team_games = team_games_by_game_id[game.game_id];

    let max_power_rank = 0;

    if (game.team_games[0].is_winning_team) {
      max_power_rank = team_seasons_by_team_season_id[game.team_games[1].team_season_id].power_rank;
    } else {
      max_power_rank = team_seasons_by_team_season_id[game.team_games[0].team_season_id].power_rank;
    }

    game.has_user_team = game.team_games.some((tg) => tg.team_season.is_user_team);

    game.summed_power_rank =
      team_seasons_by_team_season_id[game.team_games[0].team_season_id].power_rank +
      team_seasons_by_team_season_id[game.team_games[1].team_season_id].power_rank +
      max_power_rank;
  }

  games_in_period = games_in_period.sort(function (g_a, g_b) {
    if (g_a.has_user_team) return -1;
    if (g_b.has_user_team) return 1;
    if (g_a.summed_power_rank < g_b.summed_power_rank) return -1;
    if (g_a.summed_power_rank > g_b.summed_power_rank) return 1;
    return 0;
  });

  return games_in_period;
};

export const all_teams = async (common, link_suffix) => {
  const db = await common.db;
  var team_list = db.team.find({ team_id: { $gt: 0 } });
  team_list = team_list.sort(function (team_a, team_b) {
    if (team_a.team_location_name < team_b.team_location_name) return -1;
    if (team_a.team_location_name > team_b.team_location_name) return 1;
    return 0;
  });
  team_list = team_list.map((t) => Object.assign(t, { conference_id: t.conference.conference_id }));

  var conferences = db.conference.find();
  var conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  team_list = nest_children(team_list, conferences_by_conference_id, "conference_id", "conference");
  team_list = team_list.map((t) =>
    Object.assign(t, { adjusted_team_href: t.team_href + link_suffix })
  );

  var team_return_obj = { all_teams: team_list, conferences: conferences };
  return team_return_obj;
};