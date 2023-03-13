const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const coach_id = parseInt(common.params.coach_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = common.season;

  const NavBarLinks = await common.nav_bar_links({
    path: "coach",
    group_name: "coach",
    db: db,
  });

  const league_seasons = await db.league_season.toArray();
  const league_seasons_by_season = index_group_sync(league_seasons, 'index', 'season')

  const coach = await db.coach.get(coach_id);
  var coach_team_seasons = await db.coach_team_season
    .where({ coach_id: coach_id })
    .toArray();
  var coach_team_season_ids = coach_team_seasons.map(
    (pts) => pts.coach_team_season_id
  );

  console.log({
    coach_team_season_ids: coach_team_season_ids,
    coach_team_seasons: coach_team_seasons,
  });  


  coach.coach_team_seasons = coach_team_seasons;
  coach.current_coach_team_season = coach_team_seasons.filter(
    (pts) => pts.season == season
  )[0];

  var team_season_ids = coach_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  var team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = await db.team.toArray();
  let teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

  let conferences = await db.conference.toArray();
  let conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');
  let conference_season_ids = team_seasons.map(ts => ts.conference_season_id);
  let conference_seasons = await db.conference_season.bulkGet(conference_season_ids);

  conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')
  let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id')
  
  team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season')
  team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
  team_seasons = nest_children(team_seasons, league_seasons_by_season, 'season', 'league_season')

  const bowl_game_ids = team_seasons.map(function(g){
    if (g.results.bowl){
      return g.results.bowl.game_id
    }
  }).filter(g_id => g_id != undefined);

  const bowl_games = await db.game.bulkGet(bowl_game_ids);
  const bowl_games_by_game_id = index_group_sync(bowl_games, 'index', 'game_id')


  for (const ts of team_seasons){

    ts.final_conference_rank = ts.rankings.division_rank[0];

    ts.final_national_rank = ts.rankings.national_rank[0];
    ts.first_national_rank = ts.rankings.national_rank[ts.rankings.national_rank.length - 1];
    ts.best_national_rank = ts.rankings.national_rank.reduce((acc, val) => Math.min(acc,val), 999);
    ts.worst_national_rank = ts.rankings.national_rank.reduce((acc, val) => Math.max(acc,val), 1);

    if (ts.results.bowl){
      ts.results.bowl.game = bowl_games_by_game_id[ts.results.bowl.game_id];
    }

  }

  let team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id')

  coach_team_seasons = nest_children(coach_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season')

  console.log({teams_by_team_id:teams_by_team_id,'coach.alma_mater_team_id': coach.alma_mater_team_id })
  coach.alma_mater_team = teams_by_team_id[coach.alma_mater_team_id]
  coach.coach_team_seasons = coach_team_seasons;
  console.log({coach:coach})
  coach.current_coach_team_season = coach.coach_team_seasons.find(
    (cts) => cts.season == season
  );
  var current_team = coach.current_coach_team_season.team_season.team;

  let championships = {};
  let head_coaching_record = {};

  let row_span_tracker = [
    {field: 'team_season.team.full_name', row_span_name: 'team_name_row_span', previous_value: null, consecutive_count: 1, previous_value_first_ind: 0},
    {field: 'coaching_position', row_span_name: 'coaching_position_row_span',previous_value: null, consecutive_count: 1, previous_value_first_ind: 0},
    {field: 'team_season.conference_season.conference.conference_name', row_span_name: 'conference_name_row_span',previous_value: null, consecutive_count: 1, previous_value_first_ind: 0},
  ]
  coach.coach_team_seasons.forEach(function(cts, ind){
    row_span_tracker.forEach(function(row_span_obj, rs_ind){
      console.log({row_span_obj:row_span_obj, 'get(cts, row_span_obj.field)': get(cts, row_span_obj.field), 'match': row_span_obj.previous_value == get(cts, row_span_obj.field)})
      if (row_span_obj.previous_value == get(cts, row_span_obj.field)){
        row_span_obj.consecutive_count +=1
        coach.coach_team_seasons[row_span_obj.previous_value_first_ind][row_span_obj.row_span_name] +=1;
        coach.coach_team_seasons[ind][row_span_obj.row_span_name] = 0;
      }
      else {
        coach.coach_team_seasons[row_span_obj.previous_value_first_ind][row_span_obj.row_span_name] = row_span_obj.consecutive_count;

        row_span_obj.previous_value_first_ind = ind;
        row_span_obj.consecutive_count = 1;
        row_span_obj.previous_value = get(cts, row_span_obj.field);
      }
    })
    console.log({cts:cts, ind:ind, row_span_tracker:row_span_tracker})

    if (cts.coaching_position == 'HC'){
      head_coaching_record[cts.team_season.team.team_location_name] = head_coaching_record[cts.team_season.team.team_location_name] || {team: cts.team_season.team, years:0, games_played:0,conference_games_played:0, wins:0, losses:0,conference_wins:0, conference_losses:0, national_championships:0, conference_championships: 0, division_championships: 0};
      head_coaching_record[cts.team_season.team.team_location_name].years += 1;
      head_coaching_record[cts.team_season.team.team_location_name].wins += cts.team_season.record.wins;
      head_coaching_record[cts.team_season.team.team_location_name].losses += cts.team_season.record.losses;
      head_coaching_record[cts.team_season.team.team_location_name].conference_wins += cts.team_season.record.conference_wins;
      head_coaching_record[cts.team_season.team.team_location_name].conference_losses += cts.team_season.record.conference_losses;
      head_coaching_record[cts.team_season.team.team_location_name].games_played += cts.team_season.record.games_played;
      head_coaching_record[cts.team_season.team.team_location_name].conference_games_played += ((cts.team_season.record.conference_wins || 0) + (cts.team_season.record.conference_losses || 0));

      if (head_coaching_record[cts.team_season.team.team_location_name].games_played){
        head_coaching_record[cts.team_season.team.team_location_name].win_percentage = Math.floor(head_coaching_record[cts.team_season.team.team_location_name].wins * 100  / head_coaching_record[cts.team_season.team.team_location_name].games_played)
      }
      if (head_coaching_record[cts.team_season.team.team_location_name].conference_games_played){
        head_coaching_record[cts.team_season.team.team_location_name].conference_win_percentage = Math.floor(head_coaching_record[cts.team_season.team.team_location_name].conference_wins * 100  / head_coaching_record[cts.team_season.team.team_location_name].conference_games_played)
      }

      if (cts.team_season.results.national_champion){
        head_coaching_record[cts.team_season.team.team_location_name].national_championships +=1;
        championships['National Champions'] = championships['National Champions'] || [];
        championships['National Champions'].push(cts.team_season)
      }

      if (cts.team_season.results.conference_champion){
        head_coaching_record[cts.team_season.team.team_location_name].conference_championships +=1;

        let conference_name = cts.team_season.conference_season.conference.conference_abbreviation + ' Champions';
        championships[conference_name] = championships[conference_name] || [];
        championships[conference_name].push(cts.team_season)
      }

      if (cts.team_season.results.division_champion){
        head_coaching_record[cts.team_season.team.team_location_name].division_championships +=1;

        let conference_division_name = cts.team_season.conference_season.conference.conference_abbreviation + ' ' + cts.team_season.division_name + ' Champions';
        championships[conference_division_name] = championships[conference_division_name] || [];
        championships[conference_division_name].push(cts.team_season)
      }
    }

  });

  console.log({
    current_team: current_team,
    current_coach_team_season: coach.current_coach_team_season,
    coach_team_seasons: coach.coach_team_seasons,
    championships:championships
  });

  if (coach.coach_face == undefined) {
    coach.coach_face = await common.create_coach_face(
      "single",
      coach.coach_id,
      db
    );
  }


  const all_coach_team_seasons_by_coach_team_season_id = index_group_sync(
    await db.coach_team_season.where({ season: season }).toArray(),
    "index",
    "coach_team_season_id"
  );
  const all_team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const coaching_position = coach.current_coach_team_season.coaching_position;


  console.log("all_coach_team_seasons", {
    coach: coach,
    current_team: current_team,
  });

  //var coach_team_games = await db.coach_team_game.where({coach_team_season_id: coach.current_coach_team_season.coach_team_season_id}).toArray()
  common.page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
    NavBarLinks: NavBarLinks,
    page_title: "coach Profile - " + coach.full_name,
    page_icon: current_team.team_logo,
  };
  var render_content = {
    page: common.page,
    world_id: common.params.world_id,
    coach: coach,
    current_team: current_team,
    championships:championships,
    head_coaching_record:head_coaching_record
  };

  common.render_content = render_content;

  console.log("render_content", render_content);

  var url = "/static/html_templates/coach/coach/template.njk";
  var html = await fetch(url);
  html = await html.text();

  console.log({html:html})

  var renderedHtml = await common.nunjucks_env.renderString(
    html,
    render_content
  );

  $("#body").html(renderedHtml);
};

const action = async (common) => {
  common.display_player_face(
    common.render_content.coach.coach_face,
    {
      jersey:
        {id:'suit'},
      teamColors:
        common.render_content.coach.current_coach_team_season.team_season.team
          .jersey.teamColors,
    },
    "CoachFace"
  );

  await common.geo_marker_action(common);

  //await populate_coach_stats(common);
};

$(document).ready(async function () {
  var startTime = performance.now();

  const common = await common_functions("/World/:world_id/Coach/:coach_id/");
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});
