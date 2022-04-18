function ResArrowSize() {

    $('#addedStyle').remove();

    var bodyWidth = $('.SelectedGameBox').width();

    var side_length = bodyWidth / 2;

    var team_color = $('.SelectedGameBox').css('background-color');

    //console.log('team_color', team_color, $('.SelectedGameBox'))

    var styleAdd = '';
    styleAdd += `border-left-width: ${side_length}px;`
    styleAdd += `border-right-width: ${side_length}px;`
    styleAdd += `border-width: 15px ${side_length}px 0;`
    styleAdd += `border-top-color: ${team_color};`

    $('<style id="addedStyle">.SelectedGameBox::after{'+styleAdd+'}</style>').appendTo('head');

}

function DrawSchedule(){

  const res_arrow = this.ResArrowSize;
  res_arrow();
  $(window).resize(function () {
      res_arrow();
  });

  //this function define the size of the items

}



function AddBoxScoreListeners(){
  var InitialBoxScore = $('.selected-boxscore-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');


  $('.boxscore-tab').on('click', function(event, target) {


    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedTeamID = ClickedTab.attr('TeamID');
    var SelectedGameID = ClickedTab.attr('GameID');

    $.each($('#'+ClickedTabParent+' > .selected-boxscore-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-boxscore-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');

      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('selected-boxscore-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

  });
}


function AddScheduleListeners(){
  var InitialGameBox = $('.SelectedGameBox')[0];
  var SelectedGameID = $(InitialGameBox).attr('BoxScoreGameID');
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide');

  const res_arrow = this.ResArrowSize;

  $('.teamScheduleGameBox').on('click', function(event, target) {
    var ClickedTab = $(event.target).closest('.teamScheduleGameBox');
    var SelectedGameID = ClickedTab.attr('BoxScoreGameID');
    $.each($('.SelectedGameBox'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('SelectedGameBox');

      var UnselectedGameID = TargetTab.attr('BoxScoreGameID');

      $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('SelectedGameBox');
    res_arrow()
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide')
  });
}

const getHtml = async (common) => {

  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = common.params.team_id;
  const db = common.db;
  const season = common.params.season ?? common.season;
  const index_group = common.index_group;
  const index_group_sync = common.index_group_sync;

  weeks_by_week_id = await common.index_group(await db.week.where({season: season}).toArray(), 'index', 'week_id')

  const NavBarLinks = await common.nav_bar_links({
    path: 'Overview',
    group_name: 'Team',
    db: db
  });

  const TeamHeaderLinks = await common.team_header_links({
    path: 'Overview',
    season: common.params.season,
    db: db
  });

  var teams = await db.team.where('team_id').above(0).toArray();
  teams = teams.sort(function(teamA, teamB) {
    if ( teamA.school_name < teamB.school_name ){
      return -1;
    }
    if ( teamA.school_name > teamB.school_name ){
      return 1;
    }
    return 0;
  });

  const team = await db.team.get({team_id: team_id})
  const team_season = await db.team_season.get({team_id: team_id, season: season});

  const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index', 'conference_season_id');
  const conference_by_conference_id = await index_group(await db.conference.toArray(), 'index', 'conference_id');

  team.team_season = team_season;
  team.team_season.conference_season = conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
  team.team_season.conference_season.conference = conference_by_conference_id[team.team_season.conference_season.conference_id];

  var team_games = await db.team_game.where({team_season_id: team_season.team_season_id}).toArray();
  team_games = team_games.sort(function(team_game_a,team_game_b){
    return team_game_a.week_id - team_game_b.week_id;
  });
  const game_ids = team_games.map(game => parseInt(game.game_id));

  const games = await db.game.bulkGet(game_ids);

  //console.log('team_games', team_games)

  const opponent_team_game_ids = team_games.map(team_game => team_game.opponent_team_game_id);
  //console.log('opponent_team_game_ids', opponent_team_game_ids)
  const opponent_team_games = await db.team_game.bulkGet(opponent_team_game_ids);

  const opponent_team_season_ids = opponent_team_games.map(team_game => parseInt(team_game.team_season_id));
  const opponent_team_seasons = await db.team_season.bulkGet(opponent_team_season_ids);

  const opponent_team_ids = opponent_team_seasons.map(team_season => parseInt(team_season.team_id));
  const opponent_teams = await db.team.bulkGet(opponent_team_ids);

  const headline_ids = team.team_season.headlines;
  var headlines = await db.headline.bulkGet(headline_ids);

  headlines = headlines.sort((h_a, h_b) => h_b.week_id - h_a.week_id);

  var team_seasons = await db.team_season.where({season:season}).and(ts=>ts.team_id>0).toArray();

  var teams = await db.team.where('team_id').above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

  for (var team_season_iter of team_seasons){
    team_season_iter.team = teams_by_team_id[team_season_iter.team_id];
  }
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

  for (var headline of headlines){
    headline.team_seasons = [];
    for (var team_season_id of headline.team_season_ids){
      headline.team_seasons.push(team_seasons_by_team_season_id[team_season_id])
    }
  }

  //console.log('opponent_teams', opponent_teams, opponent_team_seasons, opponent_team_games)
  var counter_games = 0;
  var selected_game_chosen = false;
  var selected_game_id = 0;
  var games_played = games.filter(g => g.was_played == true).length;
  if (games_played == 0) {
    //no games played
    selected_game_chosen = true;
    selected_game_id = games[0].game_id;
  }
  else if (games_played == games.length) {
    //All games played
    selected_game_chosen = true;
    selected_game_id = games[games.length - 1].game_id;
  }
  //console.log('games_played', games_played, games.length, selected_game_chosen, selected_game_id, games)

  var team_game_ids = opponent_team_game_ids.concat(team_games.map(tg => tg.team_game_id));
  const player_team_games = await db.player_team_game.where('team_game_id').anyOf(team_game_ids).toArray();

  const player_team_season_ids = player_team_games.map(ptg => ptg.player_team_season_id);
  var player_team_seasons = await db.player_team_season.where({season:season}).toArray();

  const player_ids = player_team_seasons.map(pts => pts.player_id);
  const players = await db.player.bulkGet(player_ids);
  const players_by_player_id = index_group_sync(players, 'index', 'player_id')

  for (var player_team_season of player_team_seasons){
    player_team_season.player = players_by_player_id[player_team_season.player_id]
  }

  var player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')

  for (var player_team_game of player_team_games){
    player_team_game.player_team_season = player_team_seasons_by_player_team_season_id[player_team_game.player_team_season_id]
  }

  const player_team_game_by_player_team_game_id = index_group_sync(player_team_games, 'index', 'player_team_game_id')

  const pop_games = await $.each(games, async function(ind, game){

    if (!(selected_game_chosen) && !(game.was_played)){
      game.selected_game_box = 'SelectedGameBox'
      selected_game_id = game.game_id;
      selected_game_chosen = true;
    }
    else if ((selected_game_chosen) && (selected_game_id == game.game_id)) {
      game.selected_game_box = 'SelectedGameBox'
    }
    else {
      game.selected_game_box = '';
    }

    game.team = team;
    game.team_season = team_season;
    game.team_game = team_games[counter_games];

    game.week = weeks_by_week_id[game.week_id];

    game.game_headline = game.week.week_name;
    if (game.week.week_name == 'Conference Championships'){
      game.game_headline = team.team_season.conference_season.conference.conference_abbreviation + ' Champ'
    }

    game.opponent_team_game = opponent_team_games[counter_games];
    game.opponent_team = opponent_teams[counter_games];
    game.opponent_team_season = opponent_team_seasons[counter_games];

    for (var stat_detail of game.opponent_team_game.top_stats.concat(game.team_game.top_stats)) {
      stat_detail.player_team_game = player_team_game_by_player_team_game_id[stat_detail.player_team_game_id];
    }

    for (var stat_detail of game.opponent_team_season.top_stats.concat(game.team_season.top_stats)) {
      stat_detail.player_team_season = player_team_seasons_by_player_team_season_id[stat_detail.player_team_season_id];
    }

    game.game_display = 'Preview'
    game.game_result_letter = ''
    if (game.was_played){
      game.game_display = game.score_display;

      if (game.outcome.winning_team.team_id == team.team_id){
        game.game_result_letter = 'W'
      }
      else {
        game.game_result_letter = 'L'
      }
    }

    if (game.home_team_season_id == team.team_season.team_season_id){
      game.game_location = 'home'
      game.game_location_char = 'vs.'
      game.home_team = team;
      game.home_team_season = team_season;
      game.away_team = game.opponent_team;
      game.away_team_season = game.opponent_team_season;

      if (game.game_result_letter == 'W'){
        game.home_team_winning_game_bold = 'bold'
      }

    }
    else {
      game.game_location = 'away';
      game.game_location_char = '@'
      game.away_team = team;
      game.away_team_season = team_season;
      game.home_team = game.opponent_team;
      game.home_team_season = game.opponent_team_season;

      if (game.game_result_letter == 'W'){
        game.away_team_winning_game_bold = 'bold'
      }
    }

    game.opponent_rank_string = game.opponent_team_season.national_rank_display;
    if (game.opponent_team_game.national_rank != null){
      game.opponent_rank_string = game.opponent_team_game.national_rank_display;
    }

    counter_games +=1;
  });


  var signed_player_team_season_recruitings = await db.player_team_season_recruiting.filter(ptsr => ptsr.signed).filter(ptsr => ptsr.signed_team_season_id == team.team_season.team_season_id).toArray();
  console.log({signed_player_team_season_recruitings:signed_player_team_season_recruitings, team:team})
  const signed_player_team_season_recruitings_by_player_team_season_id = index_group_sync(signed_player_team_season_recruitings, 'index', 'player_team_season_id')
  var signed_player_team_season_ids = signed_player_team_season_recruitings.map(ptsr => ptsr.player_team_season_id);
  var signed_player_team_seasons = await db.player_team_season.bulkGet(signed_player_team_season_ids);

  var signed_player_ids = signed_player_team_seasons.map(pts => pts.player_id);
  var signed_players = await db.player.bulkGet(signed_player_ids);

  var signed_players_by_player_id = index_group_sync(signed_players, 'index', 'player_id');
  signed_player_team_seasons = nest_children(signed_player_team_seasons, signed_players_by_player_id, 'player_id', 'player');
  signed_player_team_seasons = nest_children(signed_player_team_seasons, signed_player_team_season_recruitings_by_player_team_season_id, 'player_team_season_id', 'recruiting')

  signed_player_team_seasons = signed_player_team_seasons.sort((pts_a, pts_b) => pts_a.recruiting.rank.national - pts_b.recruiting.rank.national )
  console.log({signed_player_team_seasons:signed_player_team_seasons})
  //console.log('games', games)
  common.page = {page_title: team.full_name, page_icon: team.team_logo_50, PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        team_id:  team_id,
                        team: team,
                        games: games,
                        teams: teams,
                        all_teams: await common.all_teams(common, ''),
                        conference_standings: conference_standings,
                        signed_player_team_seasons:signed_player_team_seasons,
                        //team_leaders: team_leaders,
                        //team_stats: team_stats,
                        player_team_seasons:player_team_seasons,
                        headlines: headlines
                      }


  common.render_content = render_content;
  console.log('render_content', render_content)

  var url = '/static/html_templates/team/team/template.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml)
}


const draw_faces = async (common) => {
  const db = common.db;
  const season = common.season;
  const index_group_sync = common.index_group_sync;
  //console.log('PlayerFace-Headshot', $('.PlayerFace-Headshot'));

  const player_ids = [];
  const face_div_by_player_id = {};

  $('.PlayerFace-Headshot').each(function(ind, elem){
    if ($(elem).find('svg').length > 0){
      return true;
    }
    //console.log('ind, elem', ind, elem)
    player_ids.push(parseInt($(elem).attr('player_id')))
    if (!(parseInt($(elem).attr('player_id')) in face_div_by_player_id)) {
      face_div_by_player_id[parseInt($(elem).attr('player_id'))] = [];
    }

    face_div_by_player_id[parseInt($(elem).attr('player_id'))].push(elem)
  })

  const players = await db.player.bulkGet(player_ids);
  var player_team_seasons = await db.player_team_season.where('player_id').anyOf(player_ids).toArray();
  player_team_seasons = player_team_seasons.filter(pts => pts.season == season);
  const player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'index', 'player_id')

  const team_season_ids = player_team_seasons.map(pts => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id')

  const team_ids = team_seasons.map(ts => ts.team_id);
  const teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

  //console.log('player_ids', player_ids, 'players', players, 'player_team_seasons_by_player_id', player_team_seasons_by_player_id, 'team_seasons_by_team_season_id', team_seasons_by_team_season_id, 'teams_by_team_id', teams_by_team_id)

  for (var player of players){
    var elems = face_div_by_player_id[player.player_id];
    player.player_team_season = player_team_seasons_by_player_id[player.player_id];
    player.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id]
    player.team = teams_by_team_id[player.team_season.team_id]

    if (player.player_face == undefined){
      player.player_face = await common.create_player_face('single', player.player_id, db);
    }

    //console.log( $(elem).attr('id'))

    for (var elem of elems){
      common.display_player_face(player.player_face, {jersey: player.team.jersey, teamColors: player.team.jersey.teamColors}, $(elem).attr('id'));
    }

  }

}


const action = async (common) => {

  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawSchedule();

  initialize_headlines();


    var stats_first_click = false;
    $('#nav-team-stats-tab').on('click', async function(){
      //console.log({stats_first_click:stats_first_click})
      if ((stats_first_click)){
        return false;
      }
      stats_first_click = true;

      var team = common.render_content.team;
      var player_team_seasons = common.render_content.player_team_seasons;
      var db = common.db;
      var season = common.season;

        const conference_standings = await common.conference_standings(team.team_season.conference_season_id, [team.team_season.team_season_id],common);

        player_team_seasons = player_team_seasons.filter(pts => pts.team_season_id == team.team_season.team_season_id);
        const team_leaders = []
        const team_leaders_raw = [
          {stat_group: 'passing', stat: 'yards', display: 'Leading Passer'},
          {stat_group: 'rushing', stat: 'yards', display: 'Leading Rusher'},
          {stat_group: 'receiving', stat: 'yards', display: 'Leading Receiver'},
          {stat_group: 'defense', stat: 'sacks', display: 'Leading Pass Rusher'},
          {stat_group: 'defense', stat: 'tackles', display: 'Leading Tackler'},
          {stat_group: 'defense', stat: 'ints', display: 'Leading Pass Defender'},
        ]
        for (var stat_detail of team_leaders_raw){
          player_team_seasons = player_team_seasons.sort(function(pts_a, pts_b){
            return pts_b.season_stats[stat_detail.stat_group][stat_detail.stat] - pts_a.season_stats[stat_detail.stat_group][stat_detail.stat];
          });

          //console.log('stat_detail', stat_detail, player_team_seasons[0])

          if (player_team_seasons[0].season_stats[stat_detail.stat_group][stat_detail.stat] > 0){
            stat_detail.player_team_season = player_team_seasons[0]
            team_leaders.push(stat_detail)
          }
        }

        //console.log('team_leaders', team_leaders)

        const team_stats = [
          {display: 'Points Per Game', stats: {
            OFFENSE: {stat: 'points_per_game', sort: 'desc'},
            DEFENSE: {stat: 'points_allowed_per_game', sort: 'asc'},
            DIFF: {stat: 'point_differential_per_game', sort: 'desc'}
            },
          },
          {display: 'Yards Per Game', stats: {
            OFFENSE: {stat: 'yards_per_game', sort: 'desc'},
            DEFENSE: {stat: 'yards_allowed_per_game', sort: 'asc'},
            DIFF: {stat: 'yards_per_game_diff', sort: 'desc'}
            },
          },
          {display: 'Third Down Efficiency', stats: {
            OFFENSE: {stat: 'third_down_conversion_percentage', sort: 'desc'},
            DEFENSE: {stat: 'defensive_third_down_conversion_percentage', sort: 'asc'},
            DIFF: {stat: 'third_down_conversion_percentage_diff', sort: 'desc'}
            },
          },
          {display: 'Takeaways', stats: {
            "Take aways": {stat: 'takeaways', sort: 'desc'},
            "Give aways": {stat: 'turnovers', sort: 'asc'},
            "+/-": {stat: 'turnover_diff', sort: 'desc'}
            },
          },
        ]

        var all_team_seasons = await db.team_season.where({season:season}).and(ts=>ts.team_id>0).toArray();

        var tier_map = {
          1: 'elite',
          2: 'great',
          3: 'good',
          4: 'average',
          5: 'poor',
          6: 'bad',
          7: 'terrible',
        }

        //console.log('team_stats', team_stats)
        for (var stat_group of team_stats){
          //console.log('stat_group', stat_group)
          for (var stat_detail_key in  stat_group.stats){
            var stat_detail = stat_group.stats[stat_detail_key];
            //console.log({stat_detail:stat_detail, stat_detail_key:stat_detail_key, stat_group:stat_group,team_stats:team_stats })
            stat_detail.team_value = team.team_season[stat_detail.stat];

            all_team_season_stat_value = all_team_seasons.map(ts => ts[stat_detail.stat]).sort(function(value_a, value_b){
              if (stat_detail.sort == 'desc'){
                return value_b - value_a;
              }
              else {
                return value_a - value_b;
              }
              return 0;
            });

            stat_detail.team_rank = all_team_season_stat_value.indexOf(team.team_season[stat_detail.stat]) + 1
            stat_detail.total_teams = all_team_seasons.length;
            //console.log({all_team_seasons:all_team_seasons, stat_detail:stat_detail, all_team_season_stat_value:all_team_season_stat_value})
            stat_detail.tier = tier_map[common.tier_placement(7, all_team_seasons.length, 'Normal', stat_detail.team_rank)]
          }
        }

        var url = '/static/html_templates/team/team/conference_standings_tbody_template.html'
        var html = await fetch(url);
        html = await html.text();

        console.log({conference_standings:conference_standings})

        var renderedHtml = await common.nunjucks_env.renderString(html, {conference_standings:conference_standings})
        console.log({renderedHtml:renderedHtml})

        $('#conference_standings_tbody').append(renderedHtml);


        var url = '/static/html_templates/team/team/team_leaders_div_template.html'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = await common.nunjucks_env.renderString(html, {page:common.render_content.page, team_leaders:team_leaders})
        console.log({renderedHtml:renderedHtml})

        $('#team_leaders').append(renderedHtml);

        await draw_faces(common);


        var url = '/static/html_templates/team/team/team_stats_div_template.html'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = await common.nunjucks_env.renderString(html, {team_stats:team_stats})
        console.log({renderedHtml:renderedHtml})

        $('#team_stats').append(renderedHtml);

        await draw_faces(common);


        if (team_leaders.length > 0){
          conference_bar_chart(conference_standings.conference_standings, common);
          rankings_trend_chart(team, common)
        }
        

    })

    var info_first_click = false;
    $('#nav-info-tab').on('click', async function(){
      //console.log({info_first_click:info_first_click})
      if ((info_first_click)){
        return false;
      }
      info_first_click = true;

      var team = common.render_content.team;
      var db = common.db;
      var season = common.season;
      var all_teams = await db.team.where('team_id').above(0).toArray();

      var rating_display_map = {
        brand: 'Brand',
        facilities: 'Facilities',
        location: 'Location',
        pro_pipeline: 'Pro Pipeline',
        program_history: 'Program History',
        fan_support: 'Fan Support',
        brand: 'Brand',
        team_competitiveness: 'Team Competitiveness',
        academic_quality: 'Academic Quality'
      };


      console.log({'common.render_content': common.render_content, team:team, all_teams:all_teams})

      for (const rating in team.team_ratings){
        //console.log({rating:rating})
        all_teams = all_teams.sort((t_a, t_b) => get(t_b, 'team_ratings.'+rating) - get(t_a, 'team_ratings.'+rating));
        var attribute_map = all_teams.map(t => get(t, 'team_ratings.'+rating))

        team.team_ratings[rating] = {value: team.team_ratings[rating], rank: 0};
        team.team_ratings[rating].rank = attribute_map.indexOf(team.team_ratings[rating].value) + 1;

        team.team_ratings[rating].display = rating_display_map[rating]
      }

      //console.log({team:team})

      var url = '/static/html_templates/team/team/team_info_div_template.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, {team:team})
      console.log({renderedHtml:renderedHtml})

      $('#nav-info').append(renderedHtml);
    })
}

function rankings_trend_chart(team, common){
  console.log({team:team, common:common});

  let rank_trends = [];
  let rank_count = team.team_season.rankings.division_rank.length

  for (var week_counter = 1; week_counter < rank_count; week_counter++){
    rank_trends.push({
      week: week_counter,
      ranks: {
        conference_rank: team.team_season.rankings.division_rank[rank_count - week_counter],
        national_rank: team.team_season.rankings.national_rank[rank_count - week_counter],
      }
    })
  }

  var team_ranking_trend_chart_div = document.getElementById("team_ranking_trend_chart");

  console.log({rank_trends:rank_trends, team_ranking_trend_chart_div:team_ranking_trend_chart_div})


  var height =  300
    , width = team_ranking_trend_chart_div.clientWidth * .75
    , margin = ({
      top: 20,
      right: 20,
      bottom: 30,
      left: 50
  });

  // append the svg object to the body of the page
  var svg = d3.select(team_ranking_trend_chart_div)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
      .domain(d3.extent(rank_trends, function(d) { return d.week; }))
      .range([ 0, width ]);

    const xAxisTicks = x.ticks()
      .filter(tick => Number.isInteger(tick));

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));
      
    // Add Y axis
    var y_left_conference = d3.scaleLinear()
      .domain([Math.max(10,d3.max(rank_trends, function(d) { return d.ranks.conference_rank; })), 1])
      .range([ height, 0 ]);
    svg.append("g")
      .call(d3.axisLeft(y_left_conference));

    // Add Y axis
    var y_right_national = d3.scaleLinear()
      .domain([ Math.max(25, d3.max(rank_trends, function(d) { return d.ranks.national_rank; })), 1])
      .range([ height, 0 ]);
    svg.append("g")
      .attr("transform", "translate(" + width + " ,0)")	
      .call(d3.axisRight(y_right_national));

    // Add the line
    svg.append("path")
      .datum(rank_trends)
      .attr("fill", "none")
      .attr("stroke", '#'+common.page.PrimaryColor)
      .attr("stroke-width", 3.5)
      .attr("d", d3.line()
        .x(function(d) { return x(d.week) })
        .y(function(d) { return y_left_conference(d.ranks.conference_rank) })
        )

    // Add the line
    svg.append("path")
      .datum(rank_trends)
      .attr("fill", "none")
      .attr("stroke", '#'+common.page.SecondaryColor)
      .attr("stroke-width", 3.5)
      .attr("d", d3.line()
        .x(function(d) { return x(d.week) })
        .y(function(d) { return y_right_national(d.ranks.national_rank) })
        )
  }


function conference_bar_chart(raw_data, common) {

  console.log(common.render_content)

    var data_type = "team", team_id = common.render_content.team_id, player_slug = null, league_slug = null, college = null, selector_data, all_teams, all_players;

    var original_team_id = common.render_content.team_id;

    var columns = ['points_per_game', 'passing_yards_per_game', 'rushing_yards_per_game', 'wins']
    var selected_field = columns[0]

    build_selector(columns);

    var data, current_stat, vertical = false, animation_duration = 200;

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
                    value: +team_season[selected_field],
                    highlight: team_season.team_id === team_id,
                    color: "#" + team_season.team.team_color_primary_hex,
                    team_id: team_season.team_id,
                    logo: team_season.team.team_logo_50
                });
            }
        } else if (data_type === "player") {
            current_stat = selected_field;
            if (team_id === original_team_id) {
                raw_data_filtered = raw_data.filter(function(player) {
                    return player.team_id === team_id || player.slug === player_slug;
                })
            } else {
                current_player = raw_data.filter(function(player) {
                    return player.slug === player_slug;
                })
                raw_data_filtered = raw_data.filter(function(player) {
                    return player.team_id === team_id;
                })

                var dupe_player = false;
                for (var i = 0; i < raw_data_filtered.length; i++) {
                    var cp = raw_data_filtered[i];
                    if (current_player[0] && current_player[0].player_id === cp.player_id) {
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
                    player_page_url: current_player_teams[p.slug]
                });
            }
        }

        if (selected_field === "opponent_passing_yards" || selected_field === "opponent_rushing_yards") {
            data.sort(function(a, b) {
                    return (a.value > b.value) ? 1 : -1
                })
        } else {
            data.sort(function(a, b) {
                    return (a.value < b.value) ? 1 : -1
                })
        }

        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            row.rank = i + 1
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

    var height =  300
      , width = chartDiv.clientWidth
      , margin = ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
    });

    svg.attr("width", width).attr("height", height);

    var highlighted_rank = 0
      , hovered_rank = 0
      , current_y_value = 0
      , hover_y_value = 0;

    // Used to push highlighted values to left and down
    var value_offset = 39
      , value_y_offset = 4
      , value_padding = 10;

    var bar_grey = "#ddd";

    function select_bar(highlight, hover, color, rank, team_id, value, click) {

        if (click) {
            hide_all_icons();
            grey_all_bars();

            hover_y_value = value;
            //else hover_y_value = 0;

            hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

            hover_value.attr("x", 0 + value_padding).attr("y", y(hover_y_value) + value_y_offset).text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value).attr("opacity", 1);

            hover_rect.attr("x", 0).attr("y", y(hover_y_value) - value_y_offset - 6).attr("width", x(minimumX) - 0).attr("opacity", 1);

            hovered_rank = rank;

            show_icon(hover, rank, team_id, click);
            hide_ranks(rank);

            return click ? color : (hover ? color : bar_grey);
        }

        if (highlight) {
            current_y_value = value;
            highlighted_rank = rank;
        }

        if (hover) {
            if (!highlight) {
                hover_y_value = value;
                //else hover_y_value = 0;


                hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 1);

                hover_value.attr("x", 0 + value_padding).attr("y", y(hover_y_value) + value_y_offset).text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(hover_y_value) : hover_y_value).attr("opacity", 1);

                hover_rect.attr("x", 0).attr("y", y(hover_y_value) - value_y_offset - 6).attr("width", x(minimumX) - 0).attr("opacity", 1);

                hovered_rank = rank;
            }
            show_icon(hover, rank, team_id, highlight);
        } else {
            show_icon(highlight, rank, team_id, false);
            hover_y_value = 0;

            if (hover_line) {
                setTimeout(function() {
                    if (hover_y_value === 0) {
                        hover_line.attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 0);

                        hover_value.attr("x", x(maximumX) + x.bandwidth()).attr("y", y(hover_y_value) + value_y_offset).text("").attr("opacity", 0);

                        hover_rect.attr("y", y(hover_y_value) - value_y_offset - 6).attr("width", hover_y_value.toString().length * 12).attr("opacity", 0);
                    }
                }, 500);

            }
        }
        return highlight ? color : (hover ? color : bar_grey);
    }
    ;

    var image_width = 25;
    var minimumY, maximumY, yMinScale, yMaxScale, x, y, xAxis, yAxis, hover_line, highlight_line, highlight_value, hover_value, player_name, chart_lines;

    function initialize_conference_bar_chart() {
        minimumY = d3.min(data, function(d) {
            return d.value
        }),
        maximumY = d3.max(data, function(d) {
            return d.value
        }),
        minimumX = d3.min(data, function(d) {
            return d.rank
        }),
        maximumX = d3.max(data, function(d) {
            return d.rank
        }),
        yMinScale = minimumY - minimumY * .05,
        yMaxScale = maximumY + maximumY * .25,
        highlighted_rank = 0,
        hovered_rank = 0,
        current_y_value = 0,
        hover_y_value = 0,
        highlighted_rank = 0,
        hovered_rank = 0,
        current_y_value = 0,
        hover_y_value = 0,
        value_offset = 39,
        value_y_offset = 4,
        value_padding = 12;

        var yFormat = d3.format(",")
          , yFont = "font-14"
          , ticks = 6;

        // Deal with different scales/length numbers
        if (minimumY > 1000 || maximumY > 1000) {
            yFormat = d3.format(".2s");
            yFont = "font-12";
            ticks = 4;
        } else if (minimumY > 0 && maximumY < 1) {
            yFormat = d3.format(".3f")
            yFont = "font-12";
            value_padding = 8;
        } else if (minimumY > 0 && maximumY >= 10 && maximumY < 100) {
            value_padding = 20;
        }

        stats_pad_ten = ["field_goals_percentage", "two_pointers_percentage", "effective_field_goal_percentage", "three_pointers_percentage", "free_throws_percentage", "shot_percentage", "save_percentage", "shots_on_goal_for_per_game", "shots_on_goal_against_per_game", "blocks_per_game", "hits_per_game", "passing_attempts_per_game", "passing_completions_per_game", "personal_fouls_per_game", "turnovers_per_game", "steals_per_game", "assists_per_game", "total_rebounds_per_game", "offensive_rebounds_per_game", "defensive_rebounds_per_game"];

        stats_pad_five = ["ip", "passing_yards_per_game", "total_yards_per_game", "rushing_yards_per_game", "passing_yards_per_game", "opponent_passing_yards_per_game", "opponent_rushing_yards_per_game", "points_per_game"];
        // Stat specific fixes
        if (current_stat === "era") {
            yFormat = d3.format(".2f")
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


        x = d3.scaleBand().domain(data.map(function(d) {
            return d.rank
        })).range([margin.left, width - margin.right]).padding(0.1)

        y = d3.scaleLinear().domain([yMinScale, yMaxScale]).range([height - margin.bottom, margin.top])

        xAxis = function(g) {
            return g.attr("transform", 'translate(0,' + (height - margin.bottom) + ')').attr("color", "#9A9A9A").call(d3.axisBottom(x).tickSizeOuter(0).tickSize(0)).call(function(g) {
                return g.selectAll(".tick text").attr("opacity", 0)
            });
        }

        yAxis = function(g) {
            return g.attr("transform", 'translate(' + (margin.left - 10) + ',0)').attr("color", "#9A9A9A").call(d3.axisLeft(y).tickSize(0).tickFormat(yFormat).ticks(ticks)).call(function(g) {
                return g.select(".domain").remove()
            })
        }

        svg.append("g").attr("class", "x axis carbon font-14").call(xAxis);

        svg.append("g").attr("class", "y axis carbon " + yFont).call(yAxis);

        chart_lines = svg.append("g").selectAll("rect").data(data).join("rect").attr("fill", function(d) {
            return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value)
        }).attr("x", function(d) {
            return x(d.rank)
        }).attr("y", function(d) {
            return y(yMinScale)
        }).attr("height", 0).attr("width", x.bandwidth() - bandwidth_offset).attr("class", "chart_line").on("mousedown", click_bar(true)).on("mouseover", highlight_bar(true)).on("mouseout", highlight_bar(false))

        highlight_line = svg.append("g").append("line").attr("stroke", "#020E24").attr("strokeWidth", "1px").style("stroke-dasharray", "2 3").attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth()).attr("y1", y(current_y_value)).attr("y2", y(current_y_value))

        highlight_rect = svg.append("g").append("rect").attr("fill", "#020E24").attr("x", x(minimumX) - value_offset).attr("y", y(current_y_value) + value_y_offset).attr("height", 20).attr("width", 20);

        highlight_value = svg.append("g").append("text").attr("fill", "white").attr("class", "carbon bold " + yFont).attr("rx", 5).attr("x", 0 + value_padding).attr("y", y(current_y_value) + value_y_offset).text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

        hover_line = svg.append("g").append("line").attr("stroke", "grey").attr("strokeWidth", "1px").style("stroke-dasharray", "2 3").attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth()).attr("y1", y(hover_y_value)).attr("y2", y(hover_y_value)).attr("opacity", 0);

        hover_rect = svg.append("g").append("rect").attr("fill", "grey").attr("x", 0).attr("y", y(hover_y_value) + value_y_offset).attr("height", 20).attr("width", 20).attr("opacity", 0);

        hover_value = svg.append("g").append("text").attr("fill", "white").attr("class", "carbon bold " + yFont).attr("x", x(minimumX) - value_offset).attr("y", y(hover_y_value) + value_y_offset).text(hover_y_value).attr("opacity", 0);

        image_icons = svg.append("g").selectAll("image").data(data).join('image').attr('xlink:href', function(d) {
              //console.log(d);
              return d.logo;
        }).attr('width', image_width).attr('height', image_width).attr("id", function(d) {
            return "logo-" + d.team_id
        }).attr("x", function(d) {
            return x(d.rank)
        }).attr("y", function(d) {
            return y(d.value) - image_width - 10
        }).attr("opacity", 0).attr("class", "shadowed");

    }

    function update_conference_bar_chart() {


        height = 300;
        width = chartDiv.clientWidth;

        svg.attr("width", width).attr("height", height);

        x.domain(data.map(function(d) {
            return d.rank
        })).range([margin.left, width - margin.right])

        svg.select(".x.axis").call(xAxis);

        svg.select(".y.axis").call(yAxis);

        //var chart_lines = svg.selectAll(".chart_line rect");

        chart_lines.transition().duration(animation_duration).each(function(d) {
            return show_icon(false, d.rank, d.team_id, d.highlight)
        }).attr("x", function(d) {
            return x(d.rank)
        }).attr("y", function(d) {
            return y(d.value)
        }).attr("width", x.bandwidth() - bandwidth_offset).attr("height", function(d) {
            return y(yMinScale) - y(d.value)
        });
        //.attr("width", x.bandwidth()+1);

        highlight_line.attr("y1", y(current_y_value)).attr("y2", y(current_y_value)).attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth());

        hover_line.attr("x1", x(minimumX) - value_offset).attr("x2", x(maximumX) + x.bandwidth());

        highlight_rect.attr("x", 0).attr("y", y(current_y_value) - value_y_offset - 6).attr("width", x(minimumX) - 0);

        highlight_value.attr("x", 0 + value_padding).attr("y", y(current_y_value) + value_y_offset).text(minimumY > 0 && maximumY < 1 ? remove_leading_zero(current_y_value) : current_y_value);

        image_icons.attr("x", function(d) {
            return x(d.rank) - ((image_width - x.bandwidth()) / 2)
        });

        // Assign ticks ranking ids
        var ticks = d3.selectAll(".x .tick text");

        ticks.attr("transform", 'translate(0,5)')
        ticks.attr("id", function(d) {
            return "rank-" + d3.select(this).text();
        });

        // Remove leading zeros for baseball percentages
        if (minimumY > 0 && maximumY < 1) {
            var y_ticks = d3.selectAll(".y .tick text");
            y_ticks.text(function(d) {
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
        return function() {
            d3.select(this).attr("fill", function(d) {
                return select_bar(d.highlight, highlight, d.color, d.rank, d.team_id, d.value)
            });
        }
    }

    function click_bar(click) {
        return function() {
            d3.select(this).attr("fill", function(d) {
                return select_bar(d.highlight, false, d.color, d.rank, d.team_id, d.value, click)
            });
        }
    }

    function show_icon(hover, rank, team_id, highlight) {
        var show_logic = rank === 1 || rank === data.length || hover || highlight;

        if (show_logic) {
            d3.select("#logo-" + team_id).attr("opacity", 1);
            d3.select("#rank-" + rank).attr("opacity", 1);
            if (hover) {
                grey_all_bars();
                d3.select("#player-bar-" + rank).attr("fill", function(d) {
                    return d.color
                });
                d3.select("#player-name-" + rank).attr("fill", function(d) {
                    return "#000000"
                });
                d3.select("#player-stat-" + rank).attr("fill", function(d) {
                    return "#000000"
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
        image_icons.attr("opacity", function(d) {
            if (d.rank === 1 || d.rank === data.length || d.highlight) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    function grey_all_bars() {
        if (chart_lines) {
            chart_lines.attr("fill", function(d) {
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

        d3.selectAll(".y .tick").remove()

        initialize_conference_bar_chart();
        update_conference_bar_chart();
        d3.select("#rank-1").attr("opacity", 1);
        d3.select("#rank-" + data.length).attr("opacity", 1);
        d3.select("#rank-" + highlighted_rank).attr("opacity", 1);
    }

    function build_selector(columns) {
        var html = "<select id='stat_select' onChange='new_conference_bar_chart(this.value)' class='calibre w3-select font-16 form-control select-container'>";

        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            html += '<option value="' + col + '">' + col.replace(/_/g, ' ').replace(/per game/g, '(Per Game)').replace(/per attempt/g, '(Per Attempt)').replace(/per reception/g, '(Per Reception)').replace(/\w\S*/g, function(txt) {
                if (txt === "rbi" || txt === "hr" || txt === "obp" || txt === "slg" || txt === "ops" || txt === "ip" || txt === "era" || txt === "bb") {
                    return txt.toUpperCase();
                } else {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                }
            }) + '</option>';
        }
        html += "</select>"

        //console.log('columns, html', columns, html)

        document.getElementById("selector").innerHTML = html;

        $('#stat_select').on('change', function(a,b,c){
          new_conference_bar_chart(this.value)
        });
    }

    function switch_teams(id) {
        team_id = id;
        var c_field = document.getElementById("stat_select").value;
        new_conference_bar_chart(c_field);
    }

    // Utilites
    function inches_to_feet(inches) {
        let inch_in_foot = 12
          , feet = Math.floor(inches / inch_in_foot)
          , leftover_inches = inches - (feet * inch_in_foot);

        return feet + "' " + leftover_inches + '"';
    }

    function remove_leading_zero(text) {
        var split_text = text.toString().split(".")
          , trailing_zero = "";
        if (split_text[1].toString().length === 2)
            trailing_zero = "0";
        else if (split_text[1].toString().length === 1)
            trailing_zero = "00"

        return "." + split_text[1] + trailing_zero;
    }

    function set_iframe_height() {

    }

}

$(document).ready(async function(){
  var startTime = performance.now()

  if ( location.pathname.includes('/Season/')){
    var common = await common_functions('/World/:world_id/Team/:team_id/Season/:season/');
  }
  else {
    var common = await common_functions('/World/:world_id/Team/:team_id/');
  }
  common.startTime = startTime;

  await getHtml(common);
  var endTime = performance.now()
  console.log(`Time taken to first HTML draw: ${parseInt(endTime - startTime)} ms` );
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
