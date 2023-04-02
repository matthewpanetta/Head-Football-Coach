export const populate_player_modal = async (common, target) => {
  var db = common.db;
  var player_id = parseInt($(target).closest("*[player_id]").attr("player_id"));
  console.log({
    player_id: player_id,
    target: target,
    p: $(target).closest("*[player_id]"),
  });
  var season = common.season;

  var player = db.player.findOne({ player_id: player_id });
  var player_team_seasons = db.player_team_season.find({ player_id: player_id });
  var player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter((pts) => pts.season == season)[0];

  var team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });

  var player_team_ids = team_seasons.map((ts) => ts.team_id);
  var player_teams = db.team.find({ team_id: { $in: player_team_ids } });

  var c = 0;
  $.each(player_team_seasons, function (ind, pts) {
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c += 1;
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player.player_team_seasons.find(
    (pts) => pts.season == season
  );
  var current_team = player.current_player_team_season.team_season.team;

  var modal_page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
  };
  console.log({ player: player, target: target, player_id: player_id });

  var modal_url = "/html_templates/common_templates/player_info_modal_template.njk";
  var html = await fetch(modal_url);
  html = await html.text();
  var renderedHtml = nunjucks_env.renderString(html, {
    page: modal_page,
    player: player,
  });
  console.log({ renderedHtml: renderedHtml });
  $("#player-info-modal").html(renderedHtml);
  $("#player-info-modal").addClass("shown");

  $(window).on("click", async function (event) {
    if ($(event.target)[0] == $("#player-info-modal")[0]) {
      $("#player-info-modal").removeClass("shown");
      $(window).unbind();
      await player_face_listeners(common);
    }
  });

  await draw_player_faces(common);
};

export const geo_marker_action = async (common) => {
  console.log("Adding geo_marker_action");
  const ddb = common.ddb;
  $(".geo-marker").on("click", async function () {
    let city = $(this).attr("city");
    let state = $(this).attr("state");

    let location = ddb.cities.findOne({ city: city, state: state });

    let modal_config = common.page;

    if (!modal_config) {
      modal_config = {
        PrimaryColor: $(this).closest("tr").attr("primary-color"),
        SecondaryColor: $(this).closest("tr").attr("secondary-color"),
      };
    }

    const icon = L.divIcon({
      html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: ${modal_config.PrimaryColor};"></i>`,
      iconSize: [40, 40],
      iconAnchor: [15, 40],
    });

    var modal_url = "/html_templates/common_templates/geography_modal_template.njk";
    var html = await fetch(modal_url);
    html = await html.text();
    var renderedHtml = nunjucks_env.renderString(html, {
      page: modal_config,
      location: location,
    });
    console.log({ renderedHtml: renderedHtml });
    $("#geography-modal").html(renderedHtml);
    $("#geography-modal").addClass("shown");

    let map = L.map("map-body").setView([location.lat, location.long], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    let marker = L.marker([location.lat, location.long], { icon: icon }).addTo(map);

    $(window).on("click", async function (event) {
      if ($(event.target)[0] == $("#geography-modal")[0]) {
        $("#geography-modal").removeClass("shown");
        $(window).unbind();
        await player_face_listeners(common);
      }
    });
  });
};
