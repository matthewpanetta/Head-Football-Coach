
export const conference_standings = async (conference_season_id, relevant_team_season_ids, common) => {
    const db = common.db;
    var conference_season = db.conference_season.findOne({
      conference_season_id: conference_season_id,
    });
    const season = conference_season.season;
    var conference = await db.conference.get({
      conference_id: conference_season.conference_id,
    });
  
    var team_seasons_in_conference = await db.team_season.find({
      season: season,
      team_id: { $gt: 0 },
      conference_season_id: conference_season_id,
    });
  
    const team_season_stats = await db.team_season_stats.where({ season: season }).toArray();
    const team_season_stats_by_team_season_id = index_group_sync(
      team_season_stats,
      "index",
      "team_season_id"
    );
  
    const teams = await db.team.toArray();
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
  