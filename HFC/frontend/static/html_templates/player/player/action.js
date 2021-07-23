const clean_rating_string = (str) => {
  return str
      .replace(/_/g, ' ')
      .split(' ')
      .map(function(word) {
          return word[0].toUpperCase() + word.substr(1);
      })
      .join(' ');
 }

const combine_starters_for_position = (depth_chart_list, position) => {

  const starters_by_position = {
    'QB': 1,
    'RB': 1,
    'WR': 3,
    'TE': 1,
    'OT': 2,
    'IOL': 2,
    'EDGE': 2,
    'DL': 2,
    'LB': 3,
    'CB': 2,
    'S': 2,
    'K': 1,
    'P': 1,
  }

  const slice_amount = starters_by_position[position]
  var player_team_season_id_list = [];
  for (var team_player_team_season_id_list of depth_chart_list) {
    player_team_season_id_list = player_team_season_id_list.concat(team_player_team_season_id_list.slice(0,slice_amount));
  }

  return player_team_season_id_list;
}


function DrawPlayerSeasonStats(data){

  var columns = [
  ];
  var columns = $.grep(data.Stats, function(n, i){
    return n.DisplayColumn
  });

  var Parent = $('#PlayerSeasonStatTableClone').parent();
  var SeasonStatCard = $('<div></div>').addClass('w3-card').addClass('w3-margin-top');
  var Table = $('#PlayerSeasonStatTableClone').clone().addClass('w3-table-all').removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerSeasonStatTable-'+data.StatGroupName).css('width', '100%');

  if (data.CareerStats.length > 0){
    $.each(columns, function(){
      $(Table).find('tfoot tr').append('<td class="bold"></td>');
    });
  }

  $('<div class="w3-bar team-primary-background-bar">'+data.StatGroupName+' Season Stats</div>').appendTo(SeasonStatCard);
  Table.appendTo(SeasonStatCard);
  var DataTable = $(Table).DataTable( {
    data: data.SeasonStats,
    columns: columns,
    "paging": false,
    'searching': false,
    'info': false,
  });

  var Counter = 0;
  DataTable.columns().every( function () {
      // ... do something with data(), or this.nodes(), etc
      $(this.footer()).html(data.CareerStats[Counter])
      Counter +=1;
  } );

  SeasonStatCard.appendTo(Parent);

  $(Table).find('th').addClass('teamColorBorder');
  $(Table).find('thead tr').addClass('team-secondary-table-row');

}


function DrawPlayerCareerHighs(data){

  var columns = [
  ];
  var columns = $.grep(data.Stats, function(n, i){
    return n.DisplayColumn
  });
  var Parent = $('#PlayerSeasonStatTableClone').parent();

  var CareerHighCard = $('<div></div>').addClass('w3-card').addClass('w3-margin-top');

  var CareerHighTable = $('#PlayerCareerHighTableClone').clone().addClass('w3-table-all').removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerCareerHighTable-'+data.StatGroupName).css('width', '100%');

  if (data.CareerStats.length > 0){
    $.each(columns, function(){
      $(Table).find('tfoot tr').append('<td class="bold"></td>');
    });
  }

  $('<div class="w3-bar team-primary-background-bar">'+data.StatGroupName+' Career Highs</div>').appendTo(CareerHighCard);
  CareerHighTable.appendTo(CareerHighCard);
  var CareerHighDataTable = $(CareerHighTable).DataTable({
    "data": data.CareerHighs,
    'paging': false,
    'searching': false,
    'info': false,
    'ordering': false,
    "columns": [
       {"data": "Field", "sortable": false, 'visible': true, 'className': 'left-text'},
        {"data": "Value", "sortable": false, 'visible': true},
        {"data": "Week", "sortable": false, 'searchable': true, 'className': 'left-text', "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<span>vs. <img class='worldTeamStatLogo padding-right' src='"+DataObject['OpposingTeamLogo']+"'/></span><span><a href='"+DataObject['GameHref']+"'>"+StringValue+"</a></span>");
          //  $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
          //  $(td).addClass('teamTableBorder');
        }},

    ],
  });

  CareerHighCard.appendTo(Parent);
  $(CareerHighTable).find('th').addClass('teamColorBorder');

}


const populate_player_stats = async (common) => {

    const db = await common.db;
    const player = common.render_content.player;
    const current_player_team_season = player.current_player_team_season;

    const weeks = await db.week.where({season: common.season}).toArray();
    const weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id');

    var player_team_games = await db.player_team_game.where({player_team_season_id: current_player_team_season.player_team_season_id}).toArray();
    const team_game_ids = player_team_games.map(ptg => ptg.team_game_id);
    const team_games = await db.team_game.bulkGet(team_game_ids);

    const game_ids = team_games.map(tg => tg.game_id);
    const games = await db.game.bulkGet(game_ids);

    const team_games_by_team_game_id = index_group_sync(team_games, 'index', 'team_game_id');
    const games_by_game_id = index_group_sync(games, 'index', 'game_id');

    const team_seasons = await db.team_season.where({season: common.season}).toArray();
    const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

    const teams = await db.team.toArray();
    const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

    for (var player_team_game of player_team_games){
      player_team_game.team_game = team_games_by_team_game_id[player_team_game.team_game_id];
      player_team_game.team_game.game = games_by_game_id[player_team_game.team_game.game_id];

      player_team_game.team_game.game.week = weeks_by_week_id[player_team_game.team_game.game.week_id];

      player_team_game.team_game.team_season = team_seasons_by_team_season_id[player_team_game.team_game.team_season_id];
      player_team_game.team_game.opponent_team_season = team_seasons_by_team_season_id[player_team_game.team_game.opponent_team_season_id];

      player_team_game.team_game.team_season.team = teams_by_team_id[player_team_game.team_game.team_season.team_id];
      player_team_game.team_game.opponent_team_season.team = teams_by_team_id[player_team_game.team_game.opponent_team_season.team_id];
    }

    player_team_games = player_team_games.sort((ptg_a, ptg_b) => ptg_a.team_game.game.week_id - ptg_b.team_game.game.week_id);

    const recent_game_stats_data = player_team_games.slice(-5);

    console.log('populate_player_stats', {player:player, player_team_games:player_team_games, recent_game_stats_data:recent_game_stats_data})

    const player_stats_show = {'Passing': false,
                      'Rushing': false,
                      'Receiving': false,
                      'Blocking': false,
                      'Defense': false,
                      'Kicking': false,}

    const player_stats_show_position_map = {
                'QB': 'Passing',
                'RB': 'Rushing',
                'FB': 'Rushing',
                'WR': 'Receiving',
                'TE': 'Receiving',
                'OT': 'Blocking',
                'IOL': 'Blocking',
                'DE': 'Defense',
                'DT': 'Defense',
                'OLB': 'Defense',
                'MLB': 'Defense',
                'CB': 'Defense',
                'S': 'Defense',
                'K': 'Kicking',
                'P': 'Kicking'
                      }
    const primary_stat_show = player_stats_show_position_map[player.position]
    const player_season_stat = player.current_player_team_season.season_stats;

    console.log('player_season_stat.defense.tackles + player_season_stat.defense.interceptions + player_season_stat.fumbles.forced + player_season_stat.defense.deflections', player_season_stat.defense.tackles , player_season_stat.defense.ints , player_season_stat.fumbles.forced , player_season_stat.defense.deflections, player_season_stat.defense.tackles + player_season_stat.defense.ints + player_season_stat.fumbles.forced + player_season_stat.defense.deflections)

    for (const player_team_season of player.player_team_seasons){
      if (player_team_season.season_stats.passing.attempts > 0)
          player_stats_show['Passing'] = true
      if ( player_team_season.season_stats.rushing.carries > 0)
          player_stats_show['Rushing'] = true
      if (player_team_season.season_stats.receiving.targets > 0)
          player_stats_show['Receiving'] = true
      if (player_team_season.season_stats.blocking.blocks > 0)
          player_stats_show['Blocking'] = true
      if ((player_team_season.season_stats.defense.tackles + player_season_stat.defense.ints + player_season_stat.fumbles.forced + player_season_stat.defense.deflections) > 0)
          player_stats_show['Defense'] = true
      if (player_team_season.season_stats.kicking.fga > 0)
          player_stats_show['Kicking'] = true
    }



  console.log('GameStatDate, RecentGameStatData', {player_season_stat:player_season_stat, player_stats_show:player_stats_show});
  var desc_first = ["desc", 'asc'];


    var col_categories = {
      'Base': 3,
      'Passing': 8,
      'Rushing': 7,
      'Receiving': 6,
      'Blocking': 2,
      'Defense': 7,
      'Kicking': 4,
    }

    var show_column_map = {}
    var col_counter = 0;
    $.each(col_categories, function(key, val){
      show_column_map[key] = []
      for(var i = col_counter; i < col_counter+val; i++){
        show_column_map[key].push(i);
      }
      col_counter = col_counter + val;
    })

    var full_column_list = [];
    var hide_column_map = {}
    $.each(show_column_map, function(key, col_list){
      $.each(col_list, function(ind, col_num){
        if ((($.inArray( col_num,  show_column_map['Base'])) == -1)){
          full_column_list.push(col_num);
        }
      })
    });


    $.each(show_column_map, function(key, col_list){
       var cols = $.grep( full_column_list, function( val, ind ) {
          return $.inArray( val,  col_list) == -1
        });
        hide_column_map[key] = cols;
    });

    console.log({full_column_list: full_column_list, show_column_map:show_column_map, hide_column_map:hide_column_map})
    var button_list = []

    var initial_button_to_click = undefined;
    $.each(col_categories, function(key, val){
      if (key == 'Base'){
        return true;
      }

      if (player_stats_show[key] == false){
        return true;
      }

      var button_obj = {extend: 'colvisGroup',
                        text: key,
                        show: show_column_map[key],
                        hide: hide_column_map[key],
                        className: 'stats-button-'+key,
                        action: function( e, dt, node, config){
                          console.log('config', e, dt, node, config)
                          dt.columns(config.show).visible(true);
                          dt.columns(config.hide).visible(false);

                          $(node).parent().find('button').removeClass("active");

                         //$(".dt-buttons").find("button").removeClass("active");
                         node.addClass("active");

                   }}
      button_list.push(button_obj)
    });

    console.log('button_list', button_list);

//playerteamseasonid='{{Player.PlayerTeamSeasonID}}' position='{{Player.PositionID__PositionAbbreviation}}'
  var recent_game_stats = $('#RecentGameStats').DataTable({
      dom: 'Brt',
      'buttons':button_list,
      'ordering': true,
      'sorting': false,
      "filter": true,
      'paging': false,
      //scrollX: true,
      'data': recent_game_stats_data,
      autoWidth: true,
      columns: [
        {"data": "team_game.game.week.week_name", "sortable": true, 'className': 'left-text width15','visible': true, 'orderSequence':desc_first,"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
            $(td).html(player_team_game.team_game.game.week.week_name);
            //$(td).addClass('bold');
            $(td).attr('style', `color: white; background-color: #${player_team_game.team_game.opponent_team_season.team.team_color_primary_hex}`);
        }},
        {"data": "team_game.opponent_team_season.team.full_name", "sortable": true, 'searchable': true, 'className': 'column-shrink left-text',"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
            $(td).html(`<a href='${player_team_game.team_game.opponent_team_season.team.team_href}'><img class='worldTeamStatLogo' src='${player_team_game.team_game.opponent_team_season.team.team_logo}'/></a>`);
            $(td).attr('style', `background-color: #${player_team_game.team_game.opponent_team_season.team.team_color_primary_hex}`);
            $(td).parent().attr('PlayerID', player.player_id);
        }},
        {"data": "team_game.game_outcome_letter", "sortable": true, 'visible': true, 'className': 'column-med col-group left-text', 'orderSequence':desc_first,"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
            $(td).html(`<span class='W-L-Badge ${player_team_game.team_game.game_outcome_letter}'> ${player_team_game.team_game.game_outcome_letter} </span><span><a href='${player_team_game.team_game.game.game_href}'> ${player_team_game.team_game.game.score_display}</a></span>`);
        }},
        {"data": "game_stats.passing.completions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.passing.attempts", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "completion_percentage", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.passing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "passing_yards_per_attempt", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.passing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.passing.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.passing.sacks", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        {"data": "game_stats.rushing.carries", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.rushing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "rushing_yards_per_carry_qualified", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.rushing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.fumbles.fumbles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.rushing.over_20", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.rushing.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        {"data": "game_stats.receiving.targets", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.receiving.receptions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.receiving.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "receiving_yards_per_catch", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.receiving.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.receiving.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        {"data": "game_stats.blocking.pancakes", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.blocking.sacks_allowed", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        {"data": "game_stats.defense.tackles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.defense.tackles_for_loss", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.defense.sacks", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.defense.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.defense.deflections", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.fumbles.forced", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.fumbles.recovered", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        {"data": "game_stats.kicking.fgm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.kicking.fga", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.kicking.xpm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
        {"data": "game_stats.kicking.xpa", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

      ],
      'info': false,
      //'order': [[ 1, "asc" ]],
      'initComplete': function(){
        $('.stats-button-'+primary_stat_show).click();
      }
  });

  var FullGameStats = undefined;
  $('#nav-game-log-tab').on('click', function(){
    if (!(FullGameStats == undefined)){
      return false;
    }

    FullGameStats = $('#FullGameStats').DataTable({
        dom: 'Brt',
        'buttons':button_list,
        'ordering': true,
        'sorting': false,
        "filter": true,
        'paging': false,
        //scrollX: true,
        'data': player_team_games,
        autoWidth: true,
        columns: [
          {"data": "team_game.game.week.week_name", "sortable": true, 'className': 'left-text width15','visible': true, 'orderSequence':desc_first,"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
              $(td).html(player_team_game.team_game.game.week.week_name);
              //$(td).addClass('bold');
              $(td).attr('style', `color: white; background-color: #${player_team_game.team_game.opponent_team_season.team.team_color_primary_hex}`);
          }},
          {"data": "team_game.opponent_team_season.team.full_name", "sortable": true, 'searchable': true, 'className': 'column-shrink left-text',"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
              $(td).html(`<a href='${player_team_game.team_game.opponent_team_season.team.team_href}'><img class='worldTeamStatLogo' src='${player_team_game.team_game.opponent_team_season.team.team_logo}'/></a>`);
              $(td).attr('style', `background-color: #${player_team_game.team_game.opponent_team_season.team.team_color_primary_hex}`);
              $(td).parent().attr('PlayerID', player.player_id);
          }},
          {"data": "team_game.game_outcome_letter", "sortable": true, 'visible': true, 'className': 'column-med col-group left-text', 'orderSequence':desc_first,"fnCreatedCell": function (td, StringValue, player_team_game, iRow, iCol) {
              $(td).html(`<span class='W-L-Badge ${player_team_game.team_game.game_outcome_letter}'> ${player_team_game.team_game.game_outcome_letter} </span><span><a href='${player_team_game.team_game.game.game_href}'> ${player_team_game.team_game.game.score_display}</a></span>`);
          }},
          {"data": "game_stats.passing.completions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.passing.attempts", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "completion_percentage", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.passing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "passing_yards_per_attempt", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.passing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.passing.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.passing.sacks", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

          {"data": "game_stats.rushing.carries", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.rushing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "rushing_yards_per_carry_qualified", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.rushing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.fumbles.fumbles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.rushing.over_20", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.rushing.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

          {"data": "game_stats.receiving.targets", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.receiving.receptions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.receiving.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "receiving_yards_per_catch", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.receiving.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.receiving.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

          {"data": "game_stats.blocking.pancakes", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.blocking.sacks_allowed", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

          {"data": "game_stats.defense.tackles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.defense.tackles_for_loss", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.defense.sacks", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.defense.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.defense.deflections", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.fumbles.forced", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.fumbles.recovered", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

          {"data": "game_stats.kicking.fgm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.kicking.fga", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.kicking.xpm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
          {"data": "game_stats.kicking.xpa", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

        ],
        'info': false,
        //'order': [[ 1, "asc" ]],
        'initComplete': function(){
          $('.stats-button-'+primary_stat_show).click();
        }
    });
  })



    var clicked_season_stats = false;
    $('#nav-stats-tab').on('click', function(){
      if ((clicked_season_stats)){
        return false;
      }

      clicked_season_stats = true;

      for (var player_stat_group in player_stats_show){
        if (player_stats_show[player_stat_group] == false) {
          continue;
        }
        console.log('player_stat', {'player.player_team_seasons': player.player_team_seasons, player_stat_group: player_stat_group, 'player_stats_show[player_stat_group]': player_stats_show[player_stat_group]});

        var div_clone = $('#PlayerSeasonStatDivClone').clone().removeClass('w3-hide');
        $(div_clone).appendTo($('#PlayerSeasonStatDivClone').parent())
        var season_stats_table = $(div_clone).find('table').first();
        $(div_clone).find('.w3-bar').text(player_stat_group + ' Stats')
        $(season_stats_table).removeClass('w3-hide').attr('id', '')

        console.log('season_stats_table', season_stats_table)

        var season_stats = $(season_stats_table).DataTable({
            dom: 't',
            data: player.player_team_seasons,
            columns: [
              {"data": "season", "sortable": true, 'className': 'left-text column-shrink ','visible': true, 'orderSequence':desc_first,"fnCreatedCell": function (td, StringValue, player_team_season, iRow, iCol) {
                  $(td).html(StringValue);
                  //$(td).addClass('bold');
                  $(td).attr('style', `color: white; background-color: #${player_team_season.team_season.team.team_color_primary_hex}`);
              }},
              {"data": "team_season.team.full_name", "sortable": true, 'searchable': true, 'className': 'column-shrink left-text',"fnCreatedCell": function (td, StringValue, player_team_season, iRow, iCol) {
                  $(td).html(`<a href='${player_team_season.team_season.team.team_href}'><img class='worldTeamStatLogo' src='${player_team_season.team_season.team.team_logo}'/></a>`);
                  $(td).attr('style', `background-color: #${player_team_season.team_season.team.team_color_primary_hex}`);
                  $(td).parent().attr('PlayerID', player.player_id);
              }},

              {"data": "class.class_name", "sortable": false, 'visible': true, 'orderSequence':desc_first},
              {"data": "season_stats.passing.completions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.passing.attempts", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "completion_percentage", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.passing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "passing_yards_per_attempt", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.passing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.passing.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.passing.sacks", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.rushing.carries", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.rushing.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "rushing_yards_per_carry_qualified", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.rushing.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.fumbles.fumbles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.rushing.over_20", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.rushing.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.receiving.targets", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.receiving.receptions", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.receiving.yards", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "receiving_yards_per_catch", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.receiving.tds", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.receiving.lng", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.blocking.pancakes", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.blocking.sacks_allowed", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.defense.tackles", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.defense.tackles_for_loss", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.defense.sacks", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.defense.ints", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.defense.deflections", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.fumbles.forced", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.fumbles.recovered", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.kicking.fgm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.kicking.fga", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.kicking.xpm", "sortable": false, 'visible': false, 'orderSequence':desc_first},
              {"data": "season_stats.kicking.xpa", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

            ],
            //'order': [[ 1, "asc" ]],
            'initComplete': function(settings, json){
              var api = this.api();
              for (var column_index of show_column_map[player_stat_group]){
                console.log('column_index', column_index);
                api.columns(column_index).visible(true);
              }
              console.log('show_column_map', {settings:settings, 'this': this, show_column_map:show_column_map, player_stat_group:player_stat_group,'show_column_map[player_stat_group]':show_column_map[player_stat_group]});


            }
        });

        console.log('season_stats', season_stats)

      }




    })


}

const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const player_id = parseInt(common.params.player_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = common.season;

  const NavBarLinks = await common.nav_bar_links({
    path: 'Player',
    group_name: 'Player',
    db: db
  });

  const player = await db.player.get(player_id);
  const player_team_seasons = await db.player_team_season.where({player_id: player_id}).toArray();

  if (player.player_face == undefined){
    player.player_face = await common.create_player_face('single', player.player_id, db);
  }

  const team_season_ids = player_team_seasons.map(pts => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);

  const player_team_ids = team_seasons.map(ts => ts.team_id);
  const player_teams = await db.team.bulkGet(player_team_ids);

  var c = 0;
  $.each(player_team_seasons, function(ind, pts){
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c+=1;
  });

  console.log({player_team_seasons:player_team_seasons})

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter(pts => pts.season == season)[0];



      const position_skill_set_map ={'QB': ['overall','athleticism', 'passing', 'rushing'],
                           'RB': ['overall','athleticism', 'rushing'],
                           'FB': ['overall','athleticism', 'rushing', 'Blocking'],
                           'WR': ['overall','athleticism', 'receiving'],
                           'TE': ['overall','athleticism', 'receiving', 'blocking'],
                           'OT': ['overall','athleticism', 'blocking'],
                           'IOL': ['overall','athleticism', 'blocking'],
                           'EDGE': ['overall','athleticism', 'defense'],
                           'DL': ['overall','athleticism', 'defense'],
                           'LB': ['overall','athleticism', 'defense'],
                           'CB': ['overall','athleticism', 'defense'],
                           'S': ['overall','athleticism', 'defense'],
                           'K': ['overall','kicking'],
                           'P': ['overall','kicking'],
      }

      const all_rating_groups = {
        'overall': 'Overall',
        'athleticism': 'Athleticism',
        'passing': 'Passing',
        'rushing': 'Running',
        'receiving': 'Receiving',
        'blocking': 'Blocking',
        'defense': 'Defense',
        'kicking': 'Kicking',
      }


      const season_stat_groupings = [
          {
              'StatGroupName': 'Passing',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': true, 'DisplayOrder': 2.5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': false, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_YardsPerGame', 'DisplayName': 'Pass YPG', 'DisplayColumn': true, 'DisplayOrder': 4.5, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TD', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': true, 'DisplayOrder': 6, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_SacksAndYards', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': true, 'DisplayOrder': 7, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': false, 'DisplayOrder': 998, 'SeasonAggregateValue': false, 'SmallDisplay': false}
              ]
          },
          {
              'StatGroupName': 'Rushing',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'RUS_YardsPerGame', 'DisplayName': 'Rush YPG', 'DisplayColumn': true, 'DisplayOrder': 3.2, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'YPC', 'DisplayColumn': true, 'DisplayOrder': 3.5, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
              ],
          },
          {
              'StatGroupName': 'Receiving',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_YardsPerGame', 'DisplayName': 'Rec YPG', 'DisplayColumn': true, 'DisplayOrder': 3.2, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'REC_YardsPerCatch', 'DisplayName': 'YPC', 'DisplayColumn': true, 'DisplayOrder': 3.5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_Targets', 'DisplayName': 'Targets', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
              ],
          },
          {
              'StatGroupName': 'Defense',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'DisplayColumn': true, 'DisplayOrder': 6, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'FUM_Recovered', 'DisplayName': 'FR', 'DisplayColumn': true, 'DisplayOrder': 7, 'SeasonAggregateValue': false, 'SmallDisplay': false},
              ],
          },
      ]

      const all_player_team_seasons_by_player_team_season_id = index_group_sync(await db.player_team_season.where({season: season}).toArray(), 'index', 'player_team_season_id');
      const all_team_seasons = await db.team_season.where({season: season}).toArray();
      const all_team_seasons_in_conference = all_team_seasons.filter(ts => ts.conference_season_id == player.current_player_team_season.team_season.conference_season_id);
      const player_position = player.current_player_team_season.position;

      const all_player_team_season_ids_starters_at_position = combine_starters_for_position(all_team_seasons.map(ts => ts.depth_chart[player_position]), player.current_player_team_season.position)
      const all_conference_player_team_season_ids_starters_at_position = combine_starters_for_position(all_team_seasons_in_conference.map(ts => ts.depth_chart[player_position]), player.current_player_team_season.position)

      const all_player_team_season_starters_at_position = all_player_team_season_ids_starters_at_position.map(pts_id => all_player_team_seasons_by_player_team_season_id[pts_id]);
      const all_conference_player_team_season_starters_at_position = all_conference_player_team_season_ids_starters_at_position.map(pts_id => all_player_team_seasons_by_player_team_season_id[pts_id]);


      const skills = []
      for (var rating_group in all_rating_groups) {

        var rating_group_obj = {rating_group: all_rating_groups[rating_group], ratings: []}

        if (position_skill_set_map[player_position].includes(rating_group)){
          rating_group_obj.top_show = true;
        }

        for (var rating in player.current_player_team_season.ratings[rating_group]){
          var rating_obj = {rating: clean_rating_string(rating), player_value: player.current_player_team_season.ratings[rating_group][rating], all_players: {value_sum: 0, value_count: 0, value: 0}, conference_players: {value_sum: 0, value_count: 0, value: 0}}

          if (rating_obj.rating == 'Overall'){
            rating_obj.bar_width = rating_obj.player_value;
          }
          else {
            rating_obj.bar_width = rating_obj.player_value;
          }

          for (const player_team_season of all_player_team_season_starters_at_position){
            rating_obj.all_players.value_count +=1;
            rating_obj.all_players.value_sum += player_team_season.ratings[rating_group][rating];
          }

          for (const player_team_season of all_conference_player_team_season_starters_at_position){
            rating_obj.conference_players.value_count +=1;
            rating_obj.conference_players.value_sum += player_team_season.ratings[rating_group][rating];
          }

          rating_obj.all_players.value = round_decimal(rating_obj.all_players.value_sum / rating_obj.all_players.value_count, 1);
          rating_obj.conference_players.value = round_decimal(rating_obj.conference_players.value_sum / rating_obj.conference_players.value_count, 1);

          rating_group_obj.ratings.push(rating_obj) ;
        }

        if (rating_group_obj.rating_group_obj == 'overall'){
          skills.unshift(rating_group_obj)
        }
        else {
          skills.push(rating_group_obj)
        }
      }


      console.log('all_player_team_seasons', {skills:skills, all_conference_player_team_season_starters_at_position:all_conference_player_team_season_starters_at_position, all_player_team_season_starters_at_position:all_player_team_season_starters_at_position, all_team_seasons:all_team_seasons, all_conference_player_team_season_ids_starters_at_position: all_conference_player_team_season_ids_starters_at_position, 'all_player_team_season_ids_starters_at_position': all_player_team_season_ids_starters_at_position, 'player.current_player_team_season.team_season': player.current_player_team_season.team_season, all_team_seasons_in_conference: all_team_seasons_in_conference, player_position:player_position, all_player_team_season_ids_starters_at_position:all_player_team_season_ids_starters_at_position})


  var all_teams = await db.team.toArray();
  all_teams = all_teams.sort(function(teamA, teamB) {
    if ( teamA.school_name < teamB.school_name ){
      return -1;
    }
    if ( teamA.school_name > teamB.school_name ){
      return 1;
    }
    return 0;
  });

  const player_team_games = await db.player_team_game.where({player_team_season_id: player.current_player_team_season.player_team_season_id}).toArray()

  const current_team = player.current_player_team_season.team_season.team;
  common.page = {PrimaryColor: current_team.team_color_primary_hex, SecondaryColor: current_team.secondary_color_display, NavBarLinks: NavBarLinks, page_title: player.full_name};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        all_teams: all_teams,
                        player: player,
                        current_team: current_team,
                        skills: skills,
                        player_team_games: player_team_games

                      }

  common.render_content = render_content;

  console.log('render_content', render_content)

  var url = '/static/html_templates/player/player/template.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml)

}

    const action = async (common) => {

      common.display_player_face(common.render_content.player.player_face, {jersey: common.render_content.player.current_player_team_season.team_season.team.jersey, teamColors: common.render_content.player.current_player_team_season.team_season.team.jersey.teamColors}, 'PlayerFace');
      await populate_player_stats(common)



    }




$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/Player/:player_id/');

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
