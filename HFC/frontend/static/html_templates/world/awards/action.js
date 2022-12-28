

const action = async (common) => {
  const db = common.db;

  $(".player-profile-popup-icon").on("click", async function () {
    await common.populate_player_modal(common, this);
  });
};

const last_action = async (common) => {
  const db = common.db;

  face_in_view();
  $(window).scroll(face_in_view);

  $("#nav-weekly-tab").on("click", function () {
    face_in_view();
  });
  $("#nav-preseason-tab").on("click", function () {
    face_in_view();
  });
  $("#nav-all-americans-tab").on("click", function () {
    face_in_view();
  });

  function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop;

    return (
      $(elem).is(":visible") &&
      elemBottom <= docViewBottom &&
      elemTop >= docViewTop
    );
  }

  function face_in_view() {
    $('.PlayerFace-Headshot[face_drawn="false"]:visible').each(function () {
      if (isScrolledIntoView($(this))) {
        draw_faces(common, "#" + $(this).parent().attr("id"));
        $(this).attr("face_drawn", "true");
      }
    });
  }
};

const draw_faces = async (common, parent_div) => {
  const db = common.db;
  const season = common.season;

  const player_ids = [];
  const face_div_by_player_id = {};

  $(parent_div + " .PlayerFace-Headshot").each(function (ind, elem) {
    if ($(elem).find("svg").length > 0) {
      return true;
    }

    if (!(parseInt($(elem).attr("player_id")) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr("player_id"))] = [];

      player_ids.push(parseInt($(elem).attr("player_id")));
    }

    face_div_by_player_id[parseInt($(elem).attr("player_id"))].push(elem);
  });

  const players = await db.player.bulkGet(player_ids);
  var player_team_seasons = await db.player_team_season
    .where("player_id")
    .anyOf(player_ids)
    .toArray();
  player_team_seasons = player_team_seasons.filter(
    (pts) => pts.season == season
  );
  const player_team_seasons_by_player_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_id"
  );

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

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Ranking/");
  common.startTime = startTime;

  // const db = common.db;
  // await db.award.where({week_id: 22}).delete();
  // await db.award.where({week_id: 23}).delete();

  // const this_week = await db.week.filter(w => w.is_current).first();
  // await common.choose_all_americans(this_week, common)

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);
  await last_action(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
