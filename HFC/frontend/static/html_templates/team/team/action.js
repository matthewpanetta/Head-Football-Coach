function ResArrowSize() {
  $("#addedStyle").remove();

  var bodyWidth = $(".SelectedGameBox").width();

  var side_length = bodyWidth / 2;

  var team_color = $(".SelectedGameBox").css("background-color");

  //console.log('team_color', team_color, $('.SelectedGameBox'))

  var styleAdd = "";
  styleAdd += `border-left-width: ${side_length}px;`;
  styleAdd += `border-right-width: ${side_length}px;`;
  styleAdd += `border-width: 15px ${side_length}px 0;`;
  styleAdd += `border-top-color: ${team_color};`;

  $(
    '<style id="addedStyle">.SelectedGameBox::after{' + styleAdd + "}</style>"
  ).appendTo("head");
}

function DrawSchedule() {
  const res_arrow = this.ResArrowSize;
  res_arrow();
  $(window).resize(function () {
    res_arrow();
  });

  //this function define the size of the items
}

function AddBoxScoreListeners() {
  var InitialBoxScore = $(".selected-boxscore-tab")[0];

  var SelectedTeamID = $(InitialBoxScore).attr("TeamID");

  $("button.boxscore-tab").on("click", function (event, target) {
    console.log({
      target: $(event.currentTarget),
      event: event,
      SelectedTeamID: SelectedTeamID,
      InitialBoxScore: InitialBoxScore,
    });
    var ClickedTab = $(event.currentTarget);
    var ClickedTabParent = ClickedTab.closest(".boxscore-bar").attr("id");
    var SelectedTeamID = ClickedTab.attr("TeamID");
    var SelectedGameID = ClickedTab.attr("GameID");

    $.each(
      $("#" + ClickedTabParent + " > .selected-boxscore-tab"),
      function (index, tab) {
        var TargetTab = $(tab);
        $(TargetTab).removeClass("selected-boxscore-tab");
        var TargetTabParent = TargetTab.closest(".boxscore-bar").attr("id");

        var UnselectedTeamID = TargetTab.attr("TeamID");
        var UnselectedGameID = TargetTab.attr("GameID");

        $(
          '.team-highlights[TeamID="' +
            UnselectedTeamID +
            '"][GameID="' +
            UnselectedGameID +
            '"]'
        ).addClass("w3-hide");
      }
    );

    $(ClickedTab).addClass("selected-boxscore-tab");
    $('.team-highlights[TeamID="' + SelectedTeamID + '"]').removeClass(
      "w3-hide"
    );
  });
}

function AddScheduleListeners() {
  var InitialGameBox = $(".SelectedGameBox")[0];
  var SelectedGameID = $(InitialGameBox).attr("BoxScoreGameID");
  $(
    '.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' +
      SelectedGameID +
      '"]'
  ).removeClass("w3-hide");

  const res_arrow = this.ResArrowSize;

  $(".teamScheduleGameBox").on("click", function (event, target) {
    var ClickedTab = $(event.target).closest(".teamScheduleGameBox");
    var SelectedGameID = ClickedTab.attr("BoxScoreGameID");
    $.each($(".SelectedGameBox"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).removeClass("SelectedGameBox");

      var UnselectedGameID = TargetTab.attr("BoxScoreGameID");

      $(
        '.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' +
          UnselectedGameID +
          '"]'
      ).addClass("w3-hide");
    });

    $(ClickedTab).addClass("SelectedGameBox");
    res_arrow();
    $(
      '.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="' +
        SelectedGameID +
        '"]'
    ).removeClass("w3-hide");
  });
}

const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = common.params.team_id;
  const db = common.db;
  const season = common.params.season || common.season;
  common.season = season;
  const index_group = common.index_group;
  const index_group_sync = common.index_group_sync;

  weeks_by_week_id = await common.index_group(
    await db.week.where({ season: season }).toArray(),
    "index",
    "week_id"
  );

  common.stopwatch(common, "Time after fetching weeks");

  var teams = await db.team.where("team_id").above(0).toArray();
  teams = teams.sort(function (teamA, teamB) {
    if (teamA.school_name < teamB.school_name) {
      return -1;
    }
    if (teamA.school_name > teamB.school_name) {
      return 1;
    }
    return 0;
  });

  const team = await db.team.get({ team_id: team_id });
  const team_season = await db.team_season.get({
    team_id: team_id,
    season: season,
  });
  const team_season_stats = await db.team_season_stats.get({
    team_season_id: team_season.team_season_id,
  });

  team_season.season_stats = team_season_stats;
  common.current_team_season = team_season;

  common.stopwatch(common, "Time after fetching teams");


  const NavBarLinks = await common.nav_bar_links({
    path: "Overview",
    group_name: "Team",
    db: db,
  });

  const TeamHeaderLinks = await common.team_header_links({
    path: "Overview",
    season: common.params.season,
    db: db,
    team: team
  });

  common.stopwatch(common, "Time after fetching navbar links");


  const conference_seasons_by_conference_season_id = await index_group(
    await db.conference_season.where({ season: season }).toArray(),
    "index",
    "conference_season_id"
  );
  const conference_by_conference_id = await index_group(
    await db.conference.toArray(),
    "index",
    "conference_id"
  );

  common.stopwatch(common, "Time after fetching conferences");


  team.team_season = team_season;
  team.team_season.conference_season =
    conference_seasons_by_conference_season_id[
      team.team_season.conference_season_id
    ];
  team.team_season.conference_season.conference =
    conference_by_conference_id[
      team.team_season.conference_season.conference_id
    ];

  var team_games = await db.team_game
    .where({ team_season_id: team_season.team_season_id })
    .toArray();
  team_games = team_games.sort(function (team_game_a, team_game_b) {
    return team_game_a.week_id - team_game_b.week_id;
  });
  const game_ids = team_games.map((game) => parseInt(game.game_id));

  const games = await db.game.bulkGet(game_ids);

  common.stopwatch(common, "Time after fetching games");

  console.log("team_games", team_games);

  const opponent_team_game_ids = team_games.map(
    (team_game) => team_game.opponent_team_game_id
  );
  //console.log('opponent_team_game_ids', opponent_team_game_ids)
  const opponent_team_games = await db.team_game.bulkGet(
    opponent_team_game_ids
  );

  const opponent_team_season_ids = opponent_team_games.map((team_game) =>
    parseInt(team_game.team_season_id)
  );
  const opponent_team_seasons = await db.team_season.bulkGet(
    opponent_team_season_ids
  );

  const opponent_team_ids = opponent_team_seasons.map((team_season) =>
    parseInt(team_season.team_id)
  );
  const opponent_teams = await db.team.bulkGet(opponent_team_ids);

  const headline_ids = team.team_season.headlines;
  var headlines = await db.headline.bulkGet(headline_ids);
  headlines = nest_children(headlines, weeks_by_week_id, 'week_id', 'week')
  let headlines_by_game_id = index_group_sync(headlines, "group", "game_id");

  headlines = headlines.sort((h_a, h_b) => h_b.week_id - h_a.week_id);

  common.stopwatch(common, "Time after fetching headlines");

  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  var teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  common.stopwatch(common, "Time after fetching opp teams");


  for (var headline of headlines) {
    headline.team_seasons = [];
    for (var team_season_id of headline.team_season_ids) {
      headline.team_seasons.push(
        team_seasons_by_team_season_id[team_season_id]
      );
    }
  }

  console.log('opponent_teams', {opponent_teams:opponent_teams, opponent_team_seasons:opponent_team_seasons, opponent_team_games:opponent_team_games})
  var counter_games = 0;
  var selected_game_chosen = false;
  var selected_game_id = 0;
  var games_played = games.filter((g) => g.was_played == true).length;
  if (games_played == 0) {
    //no games played
    selected_game_chosen = true;
    selected_game_id = games[0].game_id;
  } else if (games_played == games.length) {
    //All games played
    selected_game_chosen = true;
    selected_game_id = games[games.length - 1].game_id;
  }
  //console.log('games_played', games_played, games.length, selected_game_chosen, selected_game_id, games)

  var team_game_ids = opponent_team_game_ids.concat(
    team_games.map((tg) => tg.team_game_id)
  );
  // let player_team_games = await db.player_team_game
  //   .where("team_game_id")
  //   .anyOf(team_game_ids)
  //   .toArray();

    common.stopwatch(common, "Time after fetching player team games");

  // const player_team_season_ids = player_team_games.map(
  //   (ptg) => ptg.player_team_season_id
  // );
  // var player_team_seasons = await db.player_team_season
  //   .where({ season: season })
  //   .toArray();

  common.stopwatch(common, "Time after fetching player team seasons");

  // const player_ids = player_team_seasons.map((pts) => pts.player_id);
  // const players = await db.player.bulkGet(player_ids);
  // const players_by_player_id = index_group_sync(players, "index", "player_id");

  common.stopwatch(common, "Time after fetching players bulkget");

  // player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')

  // var player_team_seasons_by_player_team_season_id = index_group_sync(
  //   player_team_seasons,
  //   "index",
  //   "player_team_season_id"
  // );

  // player_team_games = nest_children(player_team_games, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season')

  // const player_team_game_by_player_team_game_id = index_group_sync(
  //   player_team_games,
  //   "index",
  //   "player_team_game_id"
  // );

  common.stopwatch(common, "Time after fetching players");

  const pop_games = await $.each(games, async function (ind, game) {
    if (!selected_game_chosen && !game.was_played) {
      game.selected_game_box = "SelectedGameBox";
      selected_game_id = game.game_id;
      selected_game_chosen = true;
    } else if (selected_game_chosen && selected_game_id == game.game_id) {
      game.selected_game_box = "SelectedGameBox";
    } else {
      game.selected_game_box = "";
    }

    game.team = team;
    game.team_season = team_season;
    game.team_game = team_games[counter_games];

    game.week = weeks_by_week_id[game.week_id];

    game.week_name = game.week.week_name;
    if (game.week_name == "Conference Championships") {
      game.week_name =
        team.team_season.conference_season.conference.conference_abbreviation +
        " Champ";
    }

    game.opponent_team_game = opponent_team_games[counter_games];
    game.opponent_team = opponent_teams[counter_games];
    game.opponent_team_season = opponent_team_seasons[counter_games];

    game.headlines = headlines_by_game_id[game.game_id];

    // for (var stat_detail of game.opponent_team_game.top_stats.concat(
    //   game.team_game.top_stats
    // )) {
    //   stat_detail.player_team_game =
    //     player_team_game_by_player_team_game_id[
    //       stat_detail.player_team_game_id
    //     ];
    // }

    // for (var stat_detail of game.opponent_team_season.top_stats.concat(
    //   game.team_season.top_stats
    // )) {
    //   stat_detail.player_team_season =
    //     player_team_seasons_by_player_team_season_id[
    //       stat_detail.player_team_season_id
    //     ];
    // }

    game.game_display = "Preview";
    game.game_result_letter = "";
    if (game.was_played) {
      game.game_display = game.score_display;

      if (game.outcome.winning_team.team_id == team.team_id) {
        game.game_result_letter = "W";
      } else {
        game.game_result_letter = "L";
      }
    }

    if (game.home_team_season_id == team.team_season.team_season_id) {
      game.game_location = "home";
      game.game_location_char = "vs.";
      game.home_team = team;
      game.home_team_season = team_season;
      game.home_team_game = game.team_game;
      game.away_team = game.opponent_team;
      game.away_team_season = game.opponent_team_season;
      game.away_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.home_team_winning_game_bold = "bold";
      }
    } else {
      game.game_location = "away";
      game.game_location_char = "@";
      game.away_team = team;
      game.away_team_season = team_season;
      game.away_team_game = game.team_game;
      game.home_team = game.opponent_team;
      game.home_team_season = game.opponent_team_season;
      game.home_team_game = game.opponent_team_game;

      if (game.game_result_letter == "W") {
        game.away_team_winning_game_bold = "bold";
      }
    }

    game.opponent_rank_string = game.opponent_team_season.national_rank_display;
    if (game.opponent_team_game.national_rank != null) {
      game.opponent_rank_string = game.opponent_team_game.national_rank_display;
    }

    console.log({counter_games:counter_games})
    counter_games += 1;
  });

  var signed_player_team_season_ids = []//TODO
  var signed_player_team_seasons = await db.player_team_season.bulkGet(
    signed_player_team_season_ids
  );

  var signed_player_ids = signed_player_team_seasons.map(
    (pts) => pts.player_id
  );
  var signed_players = await db.player.bulkGet(signed_player_ids);

  var signed_players_by_player_id = index_group_sync(
    signed_players,
    "index",
    "player_id"
  );


  let show_season = common.params.season && common.params.season < common.season;
  let season_to_show = common.params.season;
  console.log({ signed_player_team_seasons: signed_player_team_seasons });
  //console.log('games', games)
  common.page = {
    page_title: team.full_name,
    page_icon: team.team_logo,
    PrimaryColor: team.team_color_primary_hex,
    SecondaryColor: team.secondary_color_display,
    OriginalSecondaryColor: team.team_color_secondary_hex,
    NavBarLinks: NavBarLinks,
    TeamHeaderLinks: TeamHeaderLinks,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    team_id: team_id,
    team: team,
    games: games,
    teams: teams,
    all_teams: await common.all_teams(common, ""),
    conference_standings: conference_standings,
    //team_stats: team_stats,
    // player_team_seasons: player_team_seasons,
    headlines: headlines,
    games_played: games_played,
    show_season:show_season, 
    season_to_show:season_to_show
  };

  common.render_content = render_content;
  console.log("render_content", render_content);

  var url = "/static/html_templates/team/team/template.njk";
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);
};

const draw_faces = async (common) => {
  const db = common.db;
  const season = common.season;
  const index_group_sync = common.index_group_sync;
  //console.log('PlayerFace-Headshot', $('.PlayerFace-Headshot'));

  const player_ids = [];
  const face_div_by_player_id = {};

  $(".PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }
    //console.log('ind, elem', ind, elem)
    player_ids.push(parseInt($(elem).attr("player_id")));
    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
  });

  console.log({ face_div_by_player_id: face_div_by_player_id });

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

  console.log({
    player_team_seasons_by_player_id: player_team_seasons_by_player_id,
  });

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  //console.log('player_ids', player_ids, 'players', players, 'player_team_seasons_by_player_id', player_team_seasons_by_player_id, 'team_seasons_by_team_season_id', team_seasons_by_team_season_id, 'teams_by_team_id', teams_by_team_id)

  for (var player of players) {
    var elems = face_div_by_player_id[player.player_id];
    player.player_team_season =
      player_team_seasons_by_player_id[player.player_id];
    player.team_season =
      team_seasons_by_team_season_id[player.player_team_season.team_season_id];
    player.team = teams_by_team_id[player.team_season.team_id];

    if (player.player_face == undefined) {
      player.player_face = await common.create_player_face(
        "single",
        player.player_id,
        db
      );
    }

    //console.log( $(elem).attr('id'))

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


const draw_coach_faces = async (common) => {
  const db = common.db;
  const season = common.season;
  const index_group_sync = common.index_group_sync;
  //console.log('coachFace-Headshot', $('.coachFace-Headshot'));

  const coach_ids = [];
  const face_div_by_coach_id = {};

  $(".PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }
    //console.log('ind, elem', ind, elem)
    coach_ids.push(parseInt($(elem).attr("coach_id")));
    if (!(parseInt($(elem).attr("coach_id")) in face_div_by_coach_id)) {
      face_div_by_coach_id[parseInt($(elem).attr("coach_id"))] = [];
    }

    face_div_by_coach_id[parseInt($(elem).attr("coach_id"))].push(elem);
  });

  console.log({ face_div_by_coach_id: face_div_by_coach_id });

  const coaches = await db.coach.bulkGet(coach_ids);
  var coach_team_seasons = await db.coach_team_season
    .where("coach_id")
    .anyOf(coach_ids)
    .toArray();
  coach_team_seasons = coach_team_seasons.filter(
    (pts) => pts.season == season
  );
  const coach_team_seasons_by_coach_id = index_group_sync(
    coach_team_seasons,
    "index",
    "coach_id"
  );

  console.log({
    coach_team_seasons_by_coach_id: coach_team_seasons_by_coach_id,
  });

  const team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const team_ids = team_seasons.map((ts) => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  //console.log('coach_ids', coach_ids, 'coaches', coaches, 'coach_team_seasons_by_coach_id', coach_team_seasons_by_coach_id, 'team_seasons_by_team_season_id', team_seasons_by_team_season_id, 'teams_by_team_id', teams_by_team_id)

  for (var coach of coaches) {
    var elems = face_div_by_coach_id[coach.coach_id];
    coach.coach_team_season =
      coach_team_seasons_by_coach_id[coach.coach_id];
    coach.team_season =
      team_seasons_by_team_season_id[coach.coach_team_season.team_season_id];
    coach.team = teams_by_team_id[coach.team_season.team_id];

    if (coach.coach_face == undefined) {
      coach.coach_face = await common.create_coach_face(
        "single",
        coach.coach_id,
        db
      );
    }

    //console.log( $(elem).attr('id'))

    for (var elem of elems) {
      common.display_player_face(
        coach.coach_face,
        {
          jersey: {id:'suit'},
          teamColors: coach.team.jersey.teamColors,
        },
        $(elem).attr("id")
      );
    }
  }
};


const action = async (common) => {
  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawSchedule();

  initialize_headlines();
  await common.geo_marker_action(common);

  var stats_first_click = false;
  $("#nav-team-stats-tab").on("click", async function () {
    //console.log({stats_first_click:stats_first_click})
    if (stats_first_click) {
      return false;
    }
    stats_first_click = true;

    var db = common.db;
    var season = common.season;
    var index_group_sync = common.index_group_sync;
    var current_team_season = common.current_team_season;

    console.log({
      common: common,
      season: season,
      player_team_season: player_team_season,
    });

    var team = common.render_content.team;
    var player_team_seasons = await db.player_team_season
      .where({ team_season_id: common.current_team_season.team_season_id })
      .toArray();

    const player_ids = player_team_seasons.map((pts) => pts.player_id);
    const player_team_season_ids = player_team_seasons.map(
      (pts) => pts.player_team_season_id
    );
    let player_team_season_stats = await db.player_team_season_stats.bulkGet(
      player_team_season_ids
    );
    let players = await db.player.bulkGet(player_ids);

    const player_team_season_stats_by_player_team_season_id = index_group_sync(
      player_team_season_stats,
      "index",
      "player_team_season_id"
    );

    const players_by_player_id = index_group_sync(
      players,
      "index",
      "player_id"
    );

    console.log({
      player_team_season_stats: player_team_season_stats,
      player_team_seasons: player_team_seasons,
      current_team_season: current_team_season,
      player_team_season_stats_by_player_team_season_id:
        player_team_season_stats_by_player_team_season_id,
    });

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
    common.current_team_season.team = common.render_content.team
    player_team_seasons.forEach(pts => pts.team_season = common.current_team_season)

    const conference_standings = await common.conference_standings(
      team.team_season.conference_season_id,
      [team.team_season.team_season_id],
      common
    );

    player_team_seasons = player_team_seasons.filter(
      (pts) => pts.team_season_id == team.team_season.team_season_id
    );
    console.log({player_team_seasons:player_team_seasons})
    const team_leaders = [];
    const team_leaders_raw = [
      { stat_group: "passing", stat: "yards", display: "Leading Passer" },
      { stat_group: "rushing", stat: "yards", display: "Leading Rusher" },
      { stat_group: "receiving", stat: "yards", display: "Leading Receiver" },
      { stat_group: "defense", stat: "sacks", display: "Leading Pass Rusher" },
      { stat_group: "defense", stat: "tackles", display: "Leading Tackler" },
      { stat_group: "defense", stat: "ints", display: "Leading Pass Defender" },
    ];
    for (var stat_detail of team_leaders_raw) {
      player_team_seasons = player_team_seasons.sort(function (pts_a, pts_b) {
        return (
          (pts_b.season_stats[stat_detail.stat_group][stat_detail.stat] || 0) -
          (pts_a.season_stats[stat_detail.stat_group][stat_detail.stat] || 0)
        );
      });

      console.log({
        'player_team_seasons[0]': player_team_seasons[0],
        stat_detail:stat_detail, 'player_team_seasons[0].season_stats[stat_detail.stat_group][stat_detail.stat]': player_team_seasons[0].season_stats[stat_detail.stat_group][stat_detail.stat]
      })

      if (
        player_team_seasons[0].season_stats[stat_detail.stat_group][
          stat_detail.stat
        ] > 0
      ) {
        stat_detail.player_team_season = player_team_seasons[0];
        team_leaders.push(stat_detail);
      }
    }

    const team_stats = [
      {
        display: "Points Per Game",
        stats: {
          OFFENSE: { stat: "points_per_game", sort: "desc" },
          DEFENSE: { stat: "points_allowed_per_game", sort: "asc" },
          DIFF: { stat: "point_differential_per_game", sort: "desc" },
        },
      },
      {
        display: "Yards Per Game",
        stats: {
          OFFENSE: { stat: "yards_per_game", sort: "desc" },
          DEFENSE: { stat: "yards_allowed_per_game", sort: "asc" },
          DIFF: { stat: "yards_per_game_diff", sort: "desc" },
        },
      },
      {
        display: "Third Down Efficiency",
        stats: {
          OFFENSE: { stat: "third_down_conversion_percentage", sort: "desc" },
          DEFENSE: {
            stat: "defensive_third_down_conversion_percentage",
            sort: "asc",
          },
          DIFF: { stat: "third_down_conversion_percentage_diff", sort: "desc" },
        },
      },
      {
        display: "Takeaways",
        stats: {
          "Take aways": { stat: "takeaways", sort: "desc" },
          "Give aways": { stat: "turnovers", sort: "asc" },
          "+/-": { stat: "turnover_diff", sort: "desc" },
        },
      },
    ];

    var all_team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray();
    const team_season_ids = all_team_seasons.map((ts) => ts.team_season_id);
    const team_season_stats = await db.team_season_stats.bulkGet(
      team_season_ids
    );
    const team_season_stats_by_team_season_id = index_group_sync(
      team_season_stats,
      "index",
      "team_season_id"
    );

    all_team_seasons = nest_children(
      all_team_seasons,
      team_season_stats_by_team_season_id,
      "team_season_id",
      "stats"
    );

    var tier_map = {
      1: "elite",
      2: "great",
      3: "good",
      4: "average",
      5: "poor",
      6: "bad",
      7: "terrible",
    };

    console.log("team_stats", {
      team_stats: team_stats,
      all_team_seasons: all_team_seasons,
    });
    all_team_seasons = all_team_seasons.filter(
      (ts) => ts.stats.season_stats.games.games_played > 0
    );

    for (var stat_group of team_stats) {
      console.log("stat_group", stat_group);
      for (var stat_detail_key in stat_group.stats) {
        var stat_detail = stat_group.stats[stat_detail_key];
        console.log({
          team: team,
          "team.team_season.season_stats": team.team_season.season_stats,
          stat_detail: stat_detail,
          stat_detail_key: stat_detail_key,
          stat_group: stat_group,
          team_stats: team_stats,
        });
        stat_detail.team_value =
          team.team_season.season_stats[stat_detail.stat];

        console.log({
          all_team_seasons: all_team_seasons,
          stat_detail: stat_detail,
        });
        all_team_season_stat_value = all_team_seasons
          .map((ts) => ts.stats[stat_detail.stat])
          .sort(function (value_a, value_b) {
            if (stat_detail.sort == "desc") {
              return value_b - value_a;
            } else {
              return value_a - value_b;
            }
            return 0;
          });

        stat_detail.team_rank =
          all_team_season_stat_value.indexOf(
            team.team_season.season_stats[stat_detail.stat]
          ) + 1;
        stat_detail.total_teams = all_team_seasons.length;
        //console.log({all_team_seasons:all_team_seasons, stat_detail:stat_detail, all_team_season_stat_value:all_team_season_stat_value})
        stat_detail.tier =
          tier_map[
            common.tier_placement(
              7,
              all_team_seasons.length,
              "Normal",
              stat_detail.team_rank
            )
          ];
      }
    }

    var url =
      "/static/html_templates/team/team/conference_standings_tbody_template.njk";
    var html = await fetch(url);
    html = await html.text();

    console.log({ conference_standings: conference_standings });

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      conference_standings: conference_standings,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#conference_standings_div").append(renderedHtml);

    var url = "/static/html_templates/team/team/team_leaders_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      page: common.render_content.page,
      team_leaders: team_leaders,
    });
    console.log({ team_leaders:team_leaders, renderedHtml: renderedHtml });

    $("#team_leaders").append(renderedHtml);

    await draw_faces(common);

    var url = "/static/html_templates/team/team/team_stats_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      team_stats: team_stats,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#team_stats").append(renderedHtml);

    await draw_faces(common);

    console.log({
      "conference_standings.conference_standings,":
        conference_standings.conference_standings,
    });

    if (team_leaders.length > 0) {
      conference_bar_chart(conference_standings.conference_standings, common);
      rankings_trend_chart(team, common);
    }
  });

  var info_first_click = false;
  $("#nav-info-tab").on("click", async function () {
    //console.log({info_first_click:info_first_click})
    if (info_first_click) {
      return false;
    }
    info_first_click = true;

    var team = common.render_content.team;
    var db = common.db;
    var season = common.season;
    var all_teams = await db.team.where("team_id").above(0).toArray();

    var rating_display_map = {
      brand: "Brand",
      facilities: "Facilities",
      location: "Location",
      pro_pipeline: "Pro Pipeline",
      program_history: "Program History",
      fan_support: "Fan Support",
      brand: "Brand",
      team_competitiveness: "Team Competitiveness",
      academic_quality: "Academic Quality",
    };

    console.log({
      "common.render_content": common.render_content,
      team: team,
      all_teams: all_teams,
    });

    for (const rating in team.team_ratings) {
      //console.log({rating:rating})
      all_teams = all_teams.sort(
        (t_a, t_b) =>
          get(t_b, "team_ratings." + rating) -
          get(t_a, "team_ratings." + rating)
      );
      var attribute_map = all_teams.map((t) =>
        get(t, "team_ratings." + rating)
      );

      team.team_ratings[rating] = { value: team.team_ratings[rating], rank: 0 };
      team.team_ratings[rating].rank =
        attribute_map.indexOf(team.team_ratings[rating].value) + 1;

      team.team_ratings[rating].display = rating_display_map[rating];
    }

    //console.log({team:team})

    var url = "/static/html_templates/team/team/team_info_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-info").append(renderedHtml);
    await draw_map(common);
  });


  var coaches_first_click = false;
  $("#nav-coaches-tab").on("click", async function () {
    if (coaches_first_click) {
      return false;
    }
    coaches_first_click = true;

    let coaching_position_info = {
      HC: {coaching_position: 'HC', order:1, full_name: 'Head Coach'},
      OC: {coaching_position: 'OC', order:2, full_name: 'Offensive Coordinator'},
      DC: {coaching_position: 'DC', order:3, full_name: 'Defensive Coordinator'},
      ST: {coaching_position: 'ST', order:4, full_name: 'Special Teams Coordinator'},
    }

    let team = common.render_content.team;
    let team_season = team.team_season;
    let db = common.db;
    let season = common.season;

    let coach_team_seasons = await db.coach_team_season.where({team_season_id:team_season.team_season_id}).toArray();
    let coach_ids = coach_team_seasons.map(cts => cts.coach_id);
    let coaches = await db.coach.bulkGet(coach_ids);
    let coaches_by_coach_id = index_group_sync(coaches, 'index', 'coach_id');

    coach_team_seasons = nest_children(coach_team_seasons, coaches_by_coach_id, 'coach_id', 'coach')
    coach_team_seasons = nest_children(coach_team_seasons, coaching_position_info, 'coaching_position', 'coaching_position_info')
    coach_team_seasons = coach_team_seasons.sort((cts_a, cts_b) => cts_a.coaching_position_info.order - cts_b.coaching_position_info.order)

    let render_content = {team:team, coach_team_seasons:coach_team_seasons, page: common.render_content.page}

    var url = "/static/html_templates/team/team/team_coaches_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, render_content);
    console.log({ renderedHtml: renderedHtml, render_content:render_content });

    $("#nav-coaches").append(renderedHtml);
    await draw_coach_faces(common);
  });

  var rivals_first_click = false;
  $("#nav-rivals-tab").on("click", async function () {
    if (rivals_first_click) {
      return false;
    }
    rivals_first_click = true;

    var db = common.db;
    var season = common.season;

    var team = common.render_content.team;
    let rivals = team.rivals;
    let rival_team_ids = new Set(rivals.map((r) => r.opponent_team_id));

    console.log({rivals:rivals, rival_team_ids:rival_team_ids})
    debugger;

    let team_seasons = await db.team_season
      .where({ team_id: team.team_id })
      .toArray();
    let team_season_ids = team_seasons.map((ts) => ts.team_season_id);
    team_season_ids = new Set(team_season_ids);

    var rival_teams = await db.team.where("team_id").above(0).toArray();
    let rival_teams_by_team_id = index_group_sync(
      rival_teams,
      "index",
      "team_id"
    );

    let rival_team_seasons = await db.team_season
      .where("team_id")
      .anyOf(rival_team_ids)
      .toArray();

    let rival_team_seasons_by_team_id = index_group_sync(
      rival_team_seasons,
      "group",
      "team_id"
    );

    let rival_team_season_ids = new Set(
      rival_team_seasons.map((ts) => ts.team_season_id)
    );

    let weeks = await db.week.toArray();
    let weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

    let all_team_season_ids = Array.from(team_season_ids).concat(
      Array.from(rival_team_season_ids)
    );

    let all_team_season_id_set = new Set(all_team_season_ids);

    let team_games = await db.team_game
      .where("team_season_id")
      .anyOf(all_team_season_ids)
      .filter(
        (tg) =>
          all_team_season_id_set.has(tg.team_season_id) &&
          all_team_season_id_set.has(tg.opponent_team_season_id)
      )
      .toArray();
    let team_games_by_team_game_id = index_group_sync(
      team_games,
      "index",
      "team_game_id"
    );

    let game_ids = team_games.map((tg) => tg.game_id);

    let all_games = await db.game.bulkGet(game_ids);
    all_games = nest_children(all_games, weeks_by_week_id, "week_id", "week");
    let all_games_by_game_id = index_group_sync(all_games, "index", "game_id");

    for (let rivalry of rivals) {
      rivalry.team = rival_teams_by_team_id[rivalry.opponent_team_id];
      rivalry.team_seasons =
        rival_team_seasons_by_team_id[rivalry.opponent_team_id];

      rivalry.team_season_ids = new Set(
        rivalry.team_seasons.map((ts) => ts.team_season_id)
      );

      rivalry.team_games = team_games.filter(
        (tg) =>
          rivalry.team_season_ids.has(tg.team_season_id) &&
          team_season_ids.has(tg.opponent_team_season_id)
      );

      rivalry.team_games = nest_children(
        rivalry.team_games,
        all_games_by_game_id,
        "game_id",
        "game"
      );
      rivalry.team_games.forEach(function (tg) {
        tg.opponent_team_game =
          team_games_by_team_game_id[tg.opponent_team_game_id];

        if (tg.game.was_played) {
          if (tg.is_winning_team) {
            tg.game.winning_team = rivalry.team;
          } else {
            tg.game.winning_team = team;
          }

          tg.game.score_display = `${tg.game.outcome.winning_team.points} - ${tg.game.outcome.losing_team.points}`;
        }
      });

      rivalry.team_games = rivalry.team_games.sort(
        (tg_a, tg_b) => tg_a.week_id - tg_b.week_id
      );

      rivalry.played_team_games = rivalry.team_games.filter(
        (tg) => tg.game.was_played
      );

      rivalry.first_team_game = rivalry.played_team_games[0];
      rivalry.last_team_game =
        rivalry.played_team_games[rivalry.played_team_games.length - 1];

      rivalry.record = {
        wins: 0,
        losses: 0,
        games_played: 0,
        scheduled_games: 0,
        points_scored: 0,
        points_allowed: 0,
      };

      let streak_list = [];
      rivalry.team_games.forEach(function (tg) {
        console.log({ tg: tg });
        if (tg.game.was_played) {
          rivalry.record.games_played += 1;
          rivalry.record.points_scored += tg.points;
          rivalry.record.points_allowed += tg.opponent_team_game.points;
          if (tg.is_winning_team) {
            rivalry.record.wins += 1;
          } else {
            rivalry.record.losses += 1;
          }
        } else {
          rivalry.record.scheduled_games += 1;
        }

        if (tg.game.was_played) {
          if (streak_list.length == 0) {
            streak_list.push({
              team: tg.game.winning_team,
              count: 1,
              first_season: tg.game.week.season,
              last_season: tg.game.week.season,
            });
          } else {
            let latest_streak_obj = streak_list[streak_list.length - 1];
            if (
              tg.game.winning_team.team_id == latest_streak_obj.team.team_id
            ) {
              latest_streak_obj.count += 1;
              latest_streak_obj.last_season = tg.game.week.season;
            } else {
              streak_list.push({
                team: tg.game.winning_team,
                count: 1,
                first_season: tg.game.week.season,
                last_season: tg.game.week.season,
              });
            }
          }
        }
      });

      rivalry.latest_streak = streak_list[streak_list.length - 1];
      streak_list = streak_list.sort(
        (str_a, str_b) => str_b.count - str_a.count
      );
      rivalry.longest_streak = streak_list[0];

      let all_time_series = {
        leader: null,
        wins: rivalry.record.wins,
        losses: rivalry.record.losses,
      };
      if (rivalry.record.wins > rivalry.record.losses) {
        all_time_series = {
          leader: rivalry.team,
          wins: rivalry.record.wins,
          losses: rivalry.record.losses,
        };
      } else if (rivalry.record.wins < rivalry.record.losses) {
        all_time_series = {
          leader: team,
          wins: rivalry.record.losses,
          losses: rivalry.record.wins,
        };
      }

      let all_time_points = {
        leader: null,
        points_for: rivalry.record.points_scored,
        points_allowed: rivalry.record.points_allowed,
      };
      if (rivalry.record.points_scored > rivalry.record.points_allowed) {
        all_time_points = {
          leader: rivalry.team,
          points_for: rivalry.record.points_scored,
          points_allowed: rivalry.record.points_allowed,
        };
      } else if (rivalry.record.points_scored < rivalry.record.points_allowed) {
        all_time_points = {
          leader: team,
          points_for: rivalry.record.points_allowed,
          points_allowed: rivalry.record.points_scored,
        };
      }

      rivalry.all_time_series = all_time_series;
      rivalry.all_time_points = all_time_points;
    }

    rivals = rivals.sort(
      (r_a, r_b) =>
        r_b.record.games_played - r_a.record.games_played ||
        r_b.record.scheduled_games - r_a.record.scheduled_games
    );

    var url = "/static/html_templates/team/team/team_rivals_div_template.njk";
    var html = await fetch(url);
    html = await html.text();

    var renderedHtml = await common.nunjucks_env.renderString(html, {
      rivals: rivals,
      team: team,
    });
    console.log({ renderedHtml: renderedHtml });

    $("#nav-rivals").append(renderedHtml);
    let mason = $(".grid").masonry({
      // options
      itemSelector: ".grid-item",
      columnWidth: ".grid-sizer",
      percentPosition: true,
      gutter: '.gutter-sizer',
    });
    console.log({ mason: mason });
  });
};

function rankings_trend_chart(team, common) {
  console.log({ team: team, common: common });

  let rank_trends = [];
  let rank_count = team.team_season.rankings.division_rank.length;

  for (var week_counter = 1; week_counter < rank_count; week_counter++) {
    rank_trends.push({
      week: week_counter,
      ranks: {
        conference_rank:
          team.team_season.rankings.division_rank[rank_count - week_counter],
        national_rank:
          team.team_season.rankings.national_rank[rank_count - week_counter],
      },
    });
  }

  var team_ranking_trend_chart_div = document.getElementById(
    "team_ranking_trend_chart"
  );

  console.log({
    rank_trends: rank_trends,
    team_ranking_trend_chart_div: team_ranking_trend_chart_div,
  });

  var height = 300,
    width = team_ranking_trend_chart_div.clientWidth * 0.75,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  // append the svg object to the body of the page
  var svg = d3
    .select(team_ranking_trend_chart_div)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleLinear()
    .domain(
      d3.extent(rank_trends, function (d) {
        return d.week;
      })
    )
    .range([0, width]);

  const xAxisTicks = x.ticks().filter((tick) => Number.isInteger(tick));

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y_left_conference = d3
    .scaleLinear()
    .domain([
      Math.max(
        10,
        d3.max(rank_trends, function (d) {
          return d.ranks.conference_rank;
        })
      ),
      1,
    ])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y_left_conference));

  // Add Y axis
  var y_right_national = d3
    .scaleLinear()
    .domain([
      Math.max(
        25,
        d3.max(rank_trends, function (d) {
          return d.ranks.national_rank;
        })
      ),
      1,
    ])
    .range([height, 0]);
  svg
    .append("g")
    .attr("transform", "translate(" + width + " ,0)")
    .call(d3.axisRight(y_right_national));

  // Add the line
  svg
    .append("path")
    .datum(rank_trends)
    .attr("fill", "none")
    .attr("stroke", "#" + common.page.PrimaryColor)
    .attr("stroke-width", 3.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.week);
        })
        .y(function (d) {
          return y_left_conference(d.ranks.conference_rank);
        })
    );

  // Add the line
  svg
    .append("path")
    .datum(rank_trends)
    .attr("fill", "none")
    .attr("stroke", "#" + common.page.SecondaryColor)
    .attr("stroke-width", 3.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.week);
        })
        .y(function (d) {
          return y_right_national(d.ranks.national_rank);
        })
    );
}

function conference_bar_chart(raw_data, common) {
  console.log(common.render_content);

  const get_from_dict = common.get_from_dict;

  var data_type = "team",
    team_id = common.render_content.team_id,
    player_slug = null,
    league_slug = null,
    college = null,
    selector_data,
    all_teams,
    all_players;

  var original_team_id = common.render_content.team_id;

  var columns = [
    "season_stats.points_per_game",
    "season_stats.passing_yards_per_game",
    "season_stats.rushing_yards_per_game",
    "wins",
  ];
  var selected_field = columns[0];

  build_selector(columns);

  var data,
    current_stat,
    vertical = false,
    animation_duration = 200;

  var bandwidth_offset = 2;

  var current_player_teams = {};

  function setup_data(selected_field) {
    data = [];

    data.y = selected_field;

    if (data_type === "team") {
      current_stat = selected_field;
      for (var team_season of raw_data) {
        data.push({
          name: team_season.team.school_name,
          value: +get_from_dict(team_season, selected_field),
          highlight: team_season.team_id === team_id,
          color: "#" + team_season.team.team_color_primary_hex,
          team_id: team_season.team_id,
          logo: team_season.team.team_logo,
        });
      }
    } else if (data_type === "player") {
      current_stat = selected_field;
      if (team_id === original_team_id) {
        raw_data_filtered = raw_data.filter(function (player) {
          return player.team_id === team_id || player.slug === player_slug;
        });
      } else {
        current_player = raw_data.filter(function (player) {
          return player.slug === player_slug;
        });
        raw_data_filtered = raw_data.filter(function (player) {
          return player.team_id === team_id;
        });

        var dupe_player = false;
        for (var i = 0; i < raw_data_filtered.length; i++) {
          var cp = raw_data_filtered[i];
          if (
            current_player[0] &&
            current_player[0].player_id === cp.player_id
          ) {
            dupe_player = true;
          }
        }

        if (!dupe_player) {
          raw_data_filtered = raw_data_filtered.concat(current_player);
        }
      }

      for (var player in raw_data_filtered) {
        var p = raw_data_filtered[player];
        data.push({
          name: p.name,
          value: +p[selected_field],
          highlight: p.slug === player_slug,
          color: "#" + p.color_primary,
          team_id: p.slug,
          fd_photo_url: p.fd_photo_url,
          player_page_url: current_player_teams[p.slug],
        });
      }
    }

    if (
      selected_field === "opponent_passing_yards" ||
      selected_field === "opponent_rushing_yards"
    ) {
      data.sort(function (a, b) {
        return a.value > b.value ? 1 : -1;
      });
    } else {
      data.sort(function (a, b) {
        return a.value < b.value ? 1 : -1;
      });
    }

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      row.rank = i + 1;
    }
  }

  setup_data(selected_field);

  var chartDiv = document.getElementById("bar_chart");
  var svg = d3.select(chartDiv).append("svg").style("overflow", "hidden");
  var data_height, height_offset;

  function return_data_height(data_points) {
    if (data_points > 10) {
      height_offset = 50;
      return raw_data_filtered.length * height_offset;
    } else if (data_points > 2) {
      height_offset = 60;
      return raw_data_filtered.length * height_offset;
    } else {
      height_offset = 70;
      return raw_data_filtered.length * height_offset;
    }
  }

  var height = 300,
    width = chartDiv.clientWidth,
    margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50,
    };

  svg.attr("width", width).attr("height", height);

  var highlighted_rank = 0,
    hovered_rank = 0,
    current_y_value = 0,
    hover_y_value = 0;

  // Used to push highlighted values to left and down
  var value_offset = 39,
    value_y_offset = 4,
    value_padding = 10;

  var bar_grey = "#ddd";

  function select_bar(highlight, hover, color, rank, team_id, value, click) {
    if (click) {
      hide_all_icons();
      grey_all_bars();

      hover_y_value = value;
      //else hover_y_value = 0;

      hover_line
        .attr("y1", y(hover_y_value))
        .attr("y2", y(hover_y_value))
        .attr("opacity", 1);

      hover_value
        .attr("x", 0 + value_padding)
        .attr("y", y(hover_y_value) + value_y_offset)
        .text(
          minimumY > 0 && maximumY < 1
            ? remove_leading_zero(hover_y_value)
            : hover_y_value
        )
        .attr("opacity", 1);

      hover_rect
        .attr("x", 0)
        .attr("y", y(hover_y_value) - value_y_offset - 6)
        .attr("width", x(minimumX) - 0)
        .attr("opacity", 1);

      hovered_rank = rank;

      show_icon(hover, rank, team_id, click);
      hide_ranks(rank);

      return click ? color : hover ? color : bar_grey;
    }

    if (highlight) {
      current_y_value = value;
      highlighted_rank = rank;
    }

    if (hover) {
      if (!highlight) {
        hover_y_value = value;
        //else hover_y_value = 0;

        hover_line
          .attr("y1", y(hover_y_value))
          .attr("y2", y(hover_y_value))
          .attr("opacity", 1);

        hover_value
          .attr("x", 0 + value_padding)
          .attr("y", y(hover_y_value) + value_y_offset)
          .text(
            minimumY > 0 && maximumY < 1
              ? remove_leading_zero(hover_y_value)
              : hover_y_value
          )
          .attr("opacity", 1);

        hover_rect
          .attr("x", 0)
          .attr("y", y(hover_y_value) - value_y_offset - 6)
          .attr("width", x(minimumX) - 0)
          .attr("opacity", 1);

        hovered_rank = rank;
      }
      show_icon(hover, rank, team_id, highlight);
    } else {
      show_icon(highlight, rank, team_id, false);
      hover_y_value = 0;

      if (hover_line) {
        setTimeout(function () {
          if (hover_y_value === 0) {
            hover_line
              .attr("y1", y(hover_y_value))
              .attr("y2", y(hover_y_value))
              .attr("opacity", 0);

            hover_value
              .attr("x", x(maximumX) + x.bandwidth())
              .attr("y", y(hover_y_value) + value_y_offset)
              .text("")
              .attr("opacity", 0);

            hover_rect
              .attr("y", y(hover_y_value) - value_y_offset - 6)
              .attr("width", hover_y_value.toString().length * 12)
              .attr("opacity", 0);
          }
        }, 500);
      }
    }
    return highlight ? color : hover ? color : bar_grey;
  }
  var image_width = 25;
  var minimumY,
    maximumY,
    yMinScale,
    yMaxScale,
    x,
    y,
    xAxis,
    yAxis,
    hover_line,
    highlight_line,
    highlight_value,
    hover_value,
    player_name,
    chart_lines;

  function initialize_conference_bar_chart() {
    (minimumY = d3.min(data, function (d) {
      return d.value;
    })),
      (maximumY = d3.max(data, function (d) {
        return d.value;
      })),
      (minimumX = d3.min(data, function (d) {
        return d.rank;
      })),
      (maximumX = d3.max(data, function (d) {
        return d.rank;
      })),
      (yMinScale = minimumY - minimumY * 0.05),
      (yMaxScale = maximumY + maximumY * 0.25),
      (highlighted_rank = 0),
      (hovered_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (highlighted_rank = 0),
      (hovered_rank = 0),
      (current_y_value = 0),
      (hover_y_value = 0),
      (value_offset = 39),
      (value_y_offset = 4),
      (value_padding = 12);

    var yFormat = d3.format(","),
      yFont = "font-14",
      ticks = 6;

    // Deal with different scales/length numbers
    if (minimumY > 1000 || maximumY > 1000) {
      yFormat = d3.format(".2s");
      yFont = "font-12";
      ticks = 4;
    } else if (minimumY > 0 && maximumY < 1) {
      yFormat = d3.format(".3f");
      yFont = "font-12";
      value_padding = 8;
    } else if (minimumY > 0 && maximumY >= 10 && maximumY < 100) {
      value_padding = 20;
    }

    stats_pad_ten = [
      "field_goals_percentage",
      "two_pointers_percentage",
      "effective_field_goal_percentage",
      "three_pointers_percentage",
      "free_throws_percentage",
      "shot_percentage",
      "save_percentage",
      "shots_on_goal_for_per_game",
      "shots_on_goal_against_per_game",
      "blocks_per_game",
      "hits_per_game",
      "passing_attempts_per_game",
      "passing_completions_per_game",
      "personal_fouls_per_game",
      "turnovers_per_game",
      "steals_per_game",
      "assists_per_game",
      "total_rebounds_per_game",
      "offensive_rebounds_per_game",
      "defensive_rebounds_per_game",
    ];

    stats_pad_five = [
      "ip",
      "passing_yards_per_game",
      "total_yards_per_game",
      "rushing_yards_per_game",
      "passing_yards_per_game",
      "opponent_passing_yards_per_game",
      "opponent_rushing_yards_per_game",
      "points_per_game",
    ];
    // Stat specific fixes
    if (current_stat === "era") {
      yFormat = d3.format(".2f");
      yFont = "font-12";
      value_padding = 7;
    } else if (stats_pad_five.indexOf(current_stat) !== -1) {
      value_padding = 5;
    } else if (current_stat === "whip") {
      value_padding = 5;
      yFont = "font-12";
    } else if (stats_pad_ten.indexOf(current_stat) !== -1) {
      value_padding = 10;
    }

    x = d3
      .scaleBand()
      .domain(
        data.map(function (d) {
          return d.rank;
        })
      )
      .range([margin.left, width - margin.right])
      .padding(0.1);

    y = d3
      .scaleLinear()
      .domain([yMinScale, yMaxScale])
      .range([height - margin.bottom, margin.top]);

    xAxis = function (g) {
      return g
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .attr("color", "#9A9A9A")
        .call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0))
        .call(function (g) {
          return g.selectAll(".tick text").attr("opacity", 0);
        });
    };

    yAxis = function (g) {
      return g
        .attr("transform", "translate(" + (margin.left - 10) + ",0)")
        .attr("color", "#9A9A9A")
        .call(d3.axisLeft(y).tickSize(0).tickFormat(yFormat).ticks(ticks))
        .call(function (g) {
          return g.select(".domain").remove();
        });
    };

    svg.append("g").attr("class", "x axis carbon font-14").call(xAxis);

    svg
      .append("g")
      .attr("class", "y axis carbon " + yFont)
      .call(yAxis);

    chart_lines = svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("fill", function (d) {
        return select_bar(
          d.highlight,
          false,
          d.color,
          d.rank,
          d.team_id,
          d.value
        );
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(yMinScale);
      })
      .attr("height", 0)
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("class", "chart_line")
      .on("mousedown", click_bar(true))
      .on("mouseover", highlight_bar(true))
      .on("mouseout", highlight_bar(false));

    highlight_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "#020E24")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value));

    highlight_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "#020E24")
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(current_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20);

    highlight_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("rx", 5)
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(
        minimumY > 0 && maximumY < 1
          ? remove_leading_zero(current_y_value)
          : current_y_value
      );

    hover_line = svg
      .append("g")
      .append("line")
      .attr("stroke", "grey")
      .attr("strokeWidth", "1px")
      .style("stroke-dasharray", "2 3")
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth())
      .attr("y1", y(hover_y_value))
      .attr("y2", y(hover_y_value))
      .attr("opacity", 0);

    hover_rect = svg
      .append("g")
      .append("rect")
      .attr("fill", "grey")
      .attr("x", 0)
      .attr("y", y(hover_y_value) + value_y_offset)
      .attr("height", 20)
      .attr("width", 20)
      .attr("opacity", 0);

    hover_value = svg
      .append("g")
      .append("text")
      .attr("fill", "white")
      .attr("class", "carbon bold " + yFont)
      .attr("x", x(minimumX) - value_offset)
      .attr("y", y(hover_y_value) + value_y_offset)
      .text(hover_y_value)
      .attr("opacity", 0);

    image_icons = svg
      .append("g")
      .selectAll("image")
      .data(data)
      .join("image")
      .attr("xlink:href", function (d) {
        //console.log(d);
        return d.logo;
      })
      .attr("width", image_width)
      .attr("height", image_width)
      .attr("id", function (d) {
        return "logo-" + d.team_id;
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value) - image_width - 10;
      })
      .attr("opacity", 0)
      .attr("class", "shadowed");
  }

  function update_conference_bar_chart() {
    height = 300;
    width = chartDiv.clientWidth;

    svg.attr("width", width).attr("height", height);

    x.domain(
      data.map(function (d) {
        return d.rank;
      })
    ).range([margin.left, width - margin.right]);

    svg.select(".x.axis").call(xAxis);

    svg.select(".y.axis").call(yAxis);

    //var chart_lines = svg.selectAll(".chart_line rect");

    chart_lines
      .transition()
      .duration(animation_duration)
      .each(function (d) {
        return show_icon(false, d.rank, d.team_id, d.highlight);
      })
      .attr("x", function (d) {
        return x(d.rank);
      })
      .attr("y", function (d) {
        return y(d.value);
      })
      .attr("width", x.bandwidth() - bandwidth_offset)
      .attr("height", function (d) {
        return y(yMinScale) - y(d.value);
      });
    //.attr("width", x.bandwidth()+1);

    highlight_line
      .attr("y1", y(current_y_value))
      .attr("y2", y(current_y_value))
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth());

    hover_line
      .attr("x1", x(minimumX) - value_offset)
      .attr("x2", x(maximumX) + x.bandwidth());

    highlight_rect
      .attr("x", 0)
      .attr("y", y(current_y_value) - value_y_offset - 6)
      .attr("width", x(minimumX) - 0);

    highlight_value
      .attr("x", 0 + value_padding)
      .attr("y", y(current_y_value) + value_y_offset)
      .text(
        minimumY > 0 && maximumY < 1
          ? remove_leading_zero(current_y_value)
          : current_y_value
      );

    image_icons.attr("x", function (d) {
      return x(d.rank) - (image_width - x.bandwidth()) / 2;
    });

    // Assign ticks ranking ids
    var ticks = d3.selectAll(".x .tick text");

    ticks.attr("transform", "translate(0,5)");
    ticks.attr("id", function (d) {
      return "rank-" + d3.select(this).text();
    });

    // Remove leading zeros for baseball percentages
    if (minimumY > 0 && maximumY < 1) {
      var y_ticks = d3.selectAll(".y .tick text");
      y_ticks.text(function (d) {
        return remove_leading_zero(d3.select(this).text());
      });
    }

    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  initialize_conference_bar_chart();
  update_conference_bar_chart();
  window.addEventListener("resize", update_conference_bar_chart);

  function highlight_bar(highlight) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(
          d.highlight,
          highlight,
          d.color,
          d.rank,
          d.team_id,
          d.value
        );
      });
    };
  }

  function click_bar(click) {
    return function () {
      d3.select(this).attr("fill", function (d) {
        return select_bar(
          d.highlight,
          false,
          d.color,
          d.rank,
          d.team_id,
          d.value,
          click
        );
      });
    };
  }

  function show_icon(hover, rank, team_id, highlight) {
    var show_logic = rank === 1 || rank === data.length || hover || highlight;

    if (show_logic) {
      d3.select("#logo-" + team_id).attr("opacity", 1);
      d3.select("#rank-" + rank).attr("opacity", 1);
      if (hover) {
        grey_all_bars();
        d3.select("#player-bar-" + rank).attr("fill", function (d) {
          return d.color;
        });
        d3.select("#player-name-" + rank).attr("fill", function (d) {
          return "#000000";
        });
        d3.select("#player-stat-" + rank).attr("fill", function (d) {
          return "#000000";
        });
      }
    } else {
      d3.select("#logo-" + team_id).attr("opacity", 0);
      d3.select("#rank-" + rank).attr("opacity", 0);
      d3.select("#player-bar-" + rank).attr("fill", bar_grey);
      d3.select("#player-name-" + rank).attr("fill", "#828282");
      d3.select("#player-stat-" + rank).attr("fill", "#828282");
    }
  }

  function hide_all_icons() {
    image_icons.attr("opacity", function (d) {
      if (d.rank === 1 || d.rank === data.length || d.highlight) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  function grey_all_bars() {
    if (chart_lines) {
      chart_lines.attr("fill", function (d) {
        return d.highlight ? d.color : bar_grey;
      });
    }
  }

  function hide_ranks(rank) {
    d3.selectAll(".x .tick text").attr("opacity", 0);
    d3.select("#rank-" + rank).attr("opacity", 1);
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function new_conference_bar_chart(selected_field) {
    //console.log(selected_field)
    current_stat = selected_field;
    setup_data(selected_field);
    svg.selectAll("rect").remove();
    svg.selectAll("image").remove();

    highlight_line.remove();
    hover_line.remove();
    highlight_value.remove();
    hover_value.remove();

    svg.selectAll(".x.axis").remove();
    svg.selectAll(".y.axis").remove();
    svg.selectAll("image").remove();

    d3.selectAll(".y .tick").remove();

    initialize_conference_bar_chart();
    update_conference_bar_chart();
    d3.select("#rank-1").attr("opacity", 1);
    d3.select("#rank-" + data.length).attr("opacity", 1);
    d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
  }

  function build_selector(columns) {
    var html =
      "<select id='stat_select' onChange='new_conference_bar_chart(this.value)' class='calibre w3-select font-16 form-control select-container'>";

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      // TODO this is janky as fuck
      html +=
        '<option value="' +
        col +
        '">' +
        col
          .replace("season_stats.", "")
          .replace(/_/g, " ")
          .replace(/per game/g, "(Per Game)")
          .replace(/per attempt/g, "(Per Attempt)")
          .replace(/per reception/g, "(Per Reception)")
          .replace(/\w\S*/g, function (txt) {
            if (
              txt === "rbi" ||
              txt === "hr" ||
              txt === "obp" ||
              txt === "slg" ||
              txt === "ops" ||
              txt === "ip" ||
              txt === "era" ||
              txt === "bb"
            ) {
              return txt.toUpperCase();
            } else {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
          }) +
        "</option>";
    }
    html += "</select>";

    //console.log('columns, html', columns, html)

    document.getElementById("selector").innerHTML = html;

    $("#stat_select").on("change", function (a, b, c) {
      new_conference_bar_chart(this.value);
    });
  }

  function switch_teams(id) {
    team_id = id;
    var c_field = document.getElementById("stat_select").value;
    new_conference_bar_chart(c_field);
  }

  // Utilites
  function inches_to_feet(inches) {
    let inch_in_foot = 12,
      feet = Math.floor(inches / inch_in_foot),
      leftover_inches = inches - feet * inch_in_foot;

    return feet + "' " + leftover_inches + '"';
  }

  function remove_leading_zero(text) {
    var split_text = text.toString().split("."),
      trailing_zero = "";
    if (split_text[1].toString().length === 2) trailing_zero = "0";
    else if (split_text[1].toString().length === 1) trailing_zero = "00";

    return "." + split_text[1] + trailing_zero;
  }

  function set_iframe_height() {}
}

const draw_map = async (common) => {
  const db = common.db;
  const ddb = common.ddb;

  const season = common.season;
  const team = await db.team.get(common.render_content.team_id);
  const team_id = team.team_id;

  const team_season = await db.team_season
    .where({ team_id: team_id, season: season })
    .first();
  const team_season_id = team_season.team_season_id;

  const player_team_seasons = await db.player_team_season
    .where({ team_season_id: team_season_id })
    .toArray();
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = await db.player
    .where("player_id")
    .anyOf(player_ids)
    .toArray();
  console.log({ players: players });
  players.forEach(
    (p) => (p.city_state = `${p.hometown.city}, ${p.hometown.state}`)
  );
  let players_by_city_state = index_group_sync(players, "group", "city_state");
  const city_states = players.map((p) => [p.hometown.city, p.hometown.state]);

  let cities = await ddb.cities
    .where("[city+state]")
    .anyOf(city_states)
    .toArray();

  cities.forEach((c) => (c.city_state = `${c.city}, ${c.state}`));
  cities = nest_children(
    cities,
    players_by_city_state,
    "city_state",
    "players"
  );

  const school_location = await ddb.cities
    .where({ city: team.location.city, state: team.location.state })
    .first();

  const school_icon = L.divIcon({
    html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [40, 40],
    iconAnchor: [15, 40],
  });
  const player_icon = L.divIcon({
    html: `<i class="fa fa-circle" data-bs-toggle="tooltip" data-bs-title="Default tooltip" style="font-size: 8px; color: #${common.page.PrimaryColor};"></i>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });

  //if (map != undefined) { map.remove(); }
  let map = L.map("map-body").setView([40.8098, -96.6802], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let marker = L.marker([school_location.lat, school_location.long], {
    icon: school_icon,
  }).addTo(map);

  var markers = L.markerClusterGroup();

  let tooltip_template = `
    <div>{{city.city_state}}</div>
    <div>
    {% for player in city.players%}
      <div class='padding-left-8'>
      {{player.full_name}}, {{player.position}}
      </div>
    {%endfor%}
    </div>
  `;

  cities.forEach(async function (city) {
    var renderedHtml = await common.nunjucks_env.renderString(
      tooltip_template,
      { city: city }
    );
    renderedHtml = renderedHtml.replace("\n", "");
    let marker = L.marker([city.lat, city.long], { icon: player_icon })
      .bindTooltip(renderedHtml)
      .openTooltip();
    markers.addLayer(marker).addTo(map);
    console.log({ marker: marker, markers: markers });
  });

  console.log({ cities: cities, map: map, school_location: school_location });
};

$(document).ready(async function () {
  var startTime = performance.now();

  if (location.pathname.includes("/Season/")) {
    var common = await common_functions(
      "/World/:world_id/Team/:team_id/Season/:season/"
    );
  } else {
    var common = await common_functions("/World/:world_id/Team/:team_id/");
  }
  common.startTime = startTime;

  await getHtml(common);
  var endTime = performance.now();
  console.log(
    `Time taken to first HTML draw: ${parseInt(endTime - startTime)} ms`
  );
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
