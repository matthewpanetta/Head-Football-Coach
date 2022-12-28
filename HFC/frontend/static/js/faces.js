export const draw_player_faces = async (common) => {
    const db = common.db;
    const season = common.season;
    const index_group_sync = common.index_group_sync;
  
    const player_ids = [];
    const face_div_by_player_id = {};
  
    $(".PlayerFace-Headshot").each(function (ind, elem) {
      if ($(elem).find("svg").length > 0) {
        return true;
      }
      player_ids.push(parseInt($(elem).attr("player_id")));
      if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
        face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];
      }
  
      face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
    });
  
    const players = await db.player.bulkGet(player_ids);
    var player_team_seasons = await db.player_team_season
      .where("player_id")
      .anyOf(player_ids)
      .toArray();
    // player_team_seasons = player_team_seasons.filter(
    //   (pts) => pts.season == season
    // );
    const player_team_seasons_by_player_id = index_group_sync(
      player_team_seasons,
      "index",
      "player_id"
    );
  
    const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
    const team_seasons = await db.team_season.bulkGet(team_season_ids);
    const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
  
    const team_ids = team_seasons.map((ts) => ts.team_id);
    const teams = await db.team.bulkGet(team_ids);
    const teams_by_team_id = index_group_sync(teams, "index", "team_id");
  
    for (var player of players) {
      var elems = face_div_by_player_id[player.player_id];
      player.player_team_season = player_team_seasons_by_player_id[player.player_id];
      player.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id];
      player.team = teams_by_team_id[player.team_season.team_id];
  
      if (player.player_face == undefined) {
        player.player_face = await common.create_player_face("single", player.player_id, db);
      }
  
      for (var elem of elems) {
        common.display_player_face(
          player.player_face,
          {
            jersey: player.team.jersey,
            teamColors: player.team.jersey.teamColors,
          },
          $(elem).attr("id")
        );
      }
    }
  };
  
  export const draw_coach_faces = async (common) => {
    const db = common.db;
    const season = common.season;
    const index_group_sync = common.index_group_sync;
  
    const coach_ids = [];
    const face_div_by_coach_id = {};
  
    $(".PlayerFace-Headshot").each(function (ind, elem) {
      if ($(elem).find("svg").length > 0) {
        return true;
      }
      coach_ids.push(parseInt($(elem).attr("coach_id")));
      if (!(parseInt($(elem).attr("coach_id")) in face_div_by_coach_id)) {
        face_div_by_coach_id[parseInt($(elem).attr("coach_id"))] = [];
      }
  
      face_div_by_coach_id[parseInt($(elem).attr("coach_id"))].push(elem);
    });
  
    const coaches = await db.coach.bulkGet(coach_ids);
    var coach_team_seasons = await db.coach_team_season.where("coach_id").anyOf(coach_ids).toArray();
    coach_team_seasons = coach_team_seasons.filter((pts) => pts.season == season);
    const coach_team_seasons_by_coach_id = index_group_sync(coach_team_seasons, "index", "coach_id");
  
    const team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
    const team_seasons = await db.team_season.bulkGet(team_season_ids);
    const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
  
    const team_ids = team_seasons.map((ts) => ts.team_id);
    const teams = await db.team.bulkGet(team_ids);
    const teams_by_team_id = index_group_sync(teams, "index", "team_id");
  
    for (var coach of coaches) {
      var elems = face_div_by_coach_id[coach.coach_id];
      coach.coach_team_season = coach_team_seasons_by_coach_id[coach.coach_id];
      coach.team_season = team_seasons_by_team_season_id[coach.coach_team_season.team_season_id];
      coach.team = teams_by_team_id[coach.team_season.team_id];
  
      if (coach.coach_face == undefined) {
        coach.coach_face = await common.create_coach_face("single", coach.coach_id, db);
      }
  
      for (var elem of elems) {
        common.display_player_face(
          coach.coach_face,
          {
            jersey: { id: "suit" },
            teamColors: coach.team.jersey.teamColors,
          },
          $(elem).attr("id")
        );
      }
    }
  };