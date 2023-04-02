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
