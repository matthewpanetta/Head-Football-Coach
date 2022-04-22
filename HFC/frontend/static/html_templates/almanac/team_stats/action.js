
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Team Stats',
        group_name: 'Almanac',
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where({season: common.season}).and(ts=>ts.team_id>0).toArray();
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');
      var distinct_team_seasons = [];



      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/team_stats/template.njk'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

      var nav_team_rating_tab_clicked = false;
      $('#nav-team-ratings-tab').on('click', async function(){
        if (nav_team_rating_tab_clicked){
          return false;
        }
        nav_team_rating_tab_clicked = true;

        await draw_nav_team_rating_table(common);
      })

    }

    const action = async (common) => {
      const db = common.db;

    }

    const draw_nav_team_rating_table = async (common) => {

      const db = common.db;
      var desc_first = ['desc', 'asc'];
      var asc_first = [ 'asc', 'desc'];

      var team_seasons = await db.team_season.where({season: common.season}).and(ts=>ts.team_id>0).toArray();
      const teams = await db.team.where('team_id').above(0).toArray();
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');


      const conferences = await db.conference.toArray();
      const conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

      var conference_seasons = await db.conference_season.where({season: common.season}).toArray();
      conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')

      const conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id');

      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
      team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season');

      var ratings_categories = [
        {field: 'rating.overall'},

        {field: 'rating.by_position_group.Offense'},
        {field: 'rating.by_position_group.Defense'},

        {field: 'rating.by_position_unit.QB'},
        {field: 'rating.by_position_unit.RB'},
        {field: 'rating.by_position.WR'},
        {field: 'rating.by_position_unit.OL'},
        {field: 'rating.by_position_unit.DL'},
        {field: 'rating.by_position_unit.LB'},
        {field: 'rating.by_position_unit.DB'},
        {field: 'rating.by_position_unit.ST'}
      ]

      for (const rating_category of ratings_categories){
        var field_values = team_seasons.map(ts => get(ts, rating_category.field));
        field_values = field_values.sort((a,b) => b - a);

        team_seasons = team_seasons.map(ts => (set(ts, rating_category.field + '_rank', field_values.indexOf(get(ts, rating_category.field)))));

      }

      var col_categories = {
        'Base': 4,
        //'Games': 3,
        'Ratings': 11,
        'School': 8
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

      console.log('show_column_map', show_column_map);


      var full_column_list = [];
      var hide_column_map = {}
      $.each(show_column_map, function(key, col_list){
        $.each(col_list, function(ind, col_num){
          if ((($.inArray( col_num,  show_column_map['Base'])) == -1) && ($.inArray( col_num,  show_column_map['Expand']) == -1)){
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

      var search_pane_columns = [2];

      var button_list = [{
          extend: 'searchPanes',
          config: {
            cascadePanes: true,
            viewTotal: false, //maybe true later - TODO
            columns:search_pane_columns,
            collapse: 'Filter Team',
          },
      }]



      $.each(col_categories, function(key, val){
        if (key == 'Base' || key == 'Expand' ){
          return true;
        }
        var button_obj = {extend: 'colvisGroup',
                          text: key,
                          show: show_column_map[key],
                          hide: hide_column_map[key],
                          action: function( e, dt, node, config){
                            //console.log('cntrlIsPressed', cntrlIsPressed, 'e, dt, node, config', e, dt, node, config)
                            $('#team-ratings').DataTable().columns(config.show).visible(true);
                            $('#team-ratings').DataTable().columns(config.hide).visible(false);

                           $(".dt-buttons").find("button").removeClass("active");
                           node.addClass("active");

                     }}
        button_list.push(button_obj)
      });

      console.log({common: common, team_seasons:team_seasons})

      var ratings_table = $('#team-ratings').DataTable({
          //"serverSide": true,
          dom: 'Brtp',
          ordering: true,
          lengthChange : false,
          pageLength: 150,
          pagingType: "full_numbers",
          paginationType: "full_numbers",
          paging: false,
          data: team_seasons,
          buttons:button_list,
          columns: [
            {"data": "team.school_name", "sortable": true, 'searchable': true, 'className': 'column-shrink', 'orderSequence': asc_first, "fnCreatedCell": function (td, school_name, team_season, iRow, iCol) {
              //console.log({td:td, school_name:school_name, team_season:team_season, iRow:iRow, iCol:iCol})
              $(td).html("<a href='"+team_season.team.team_href+"'><img class='worldTeamStatLogo padding-right' src='"+team_season.team.team_logo+"'/></a>");
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color:white;` );
                $(td).parent().attr('TeamID', team_season.team.team_id);
            }},
            {"data": "team.school_name", "sortable": true, 'searchable': true, 'className': 'font14','orderSequence': asc_first, "fnCreatedCell": function (td, school_name, team_season, iRow, iCol) {
              //console.log({td:td, school_name:school_name, team_season:team_season, iRow:iRow, iCol:iCol, this: this})
              $(td).html("<a href='"+team_season.team.team_href+"'>"+team_season.team.school_name+"</a>");
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color:white;` );
            }},
            {"data": "conference_season.conference.conference_abbreviation",'className': 'center-text', "sortable": true, 'visible': true, 'orderSequence': asc_first,  "fnCreatedCell": function (td, conference_abbreviation, team_season, iRow, iCol) {
                $(td).html(`<a href='${team_season.conference_season.conference.conference_href}'>${team_season.conference_season.conference.conference_abbreviation}</a>`);
            }},
            {"data": "national_rank", "sortable": true, 'visible': true, 'className': 'center-text col-group','orderSequence':asc_first},

              {"data": "rating.overall", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_group.Offense", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_group.Defense", "sortable": true, 'visible': false, 'className': 'center-text col-group', 'orderSequence':desc_first},

              {"data": "rating.by_position_unit.QB", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.RB", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position.WR", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.OL", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.DL", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.LB", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.DB", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "rating.by_position_unit.ST", "sortable": true, 'visible': false, 'className': 'center-text col-group','orderSequence':desc_first},

              {"data": "team.team_ratings.brand", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.facilities", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.location", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.pro_pipeline", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.program_history", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.fan_support", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.team_competitiveness", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "team.team_ratings.academic_quality", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first}


          ],
          order: [[ 3, "asc" ]],
      });


    }

    const draw_team_stats = async (common) => {

      const db = common.db;

      let team_seasons = await db.team_season.where({season: common.season}).and(ts=>ts.team_id>0).toArray();
      const team_season_ids = team_seasons.map(ts => ts.team_season_id);
      const teams = await db.team.where('team_id').above(0).toArray();
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      const team_season_stats = await db.team_season_stats.bulkGet(team_season_ids);
      const team_season_stats_by_team_season_id = index_group_sync(team_season_stats, 'index', 'team_season_id');

      team_seasons = nest_children(team_seasons, team_season_stats_by_team_season_id, 'team_season_id', 'stats')

      const conferences = await db.conference.toArray();
      const conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

      const conference_seasons = await db.conference_season.where({season: common.season}).toArray();
      const conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id');

      var team_games = await db.team_game.where('team_season_id').anyOf(team_season_ids).toArray();
      team_games = team_games.filter(tg => tg.points != null);
      const team_games_by_team_game_id = index_group_sync(team_games, 'index', 'team_game_id');
      const team_games_by_team_season_id = index_group_sync(team_games, 'group', 'team_season_id');

      console.log({team_seasons:team_seasons, team_season_ids:team_season_ids, team_games:team_games, team_games_by_team_game_id:team_games_by_team_game_id, team_games_by_team_season_id:team_games_by_team_season_id})

      for (var team_season of team_seasons){
        team_season.team = teams_by_team_id[team_season.team_id];

        team_season.conference_season = conference_seasons_by_conference_season_id[team_season.conference_season_id];
        team_season.conference_season.conference = conferences_by_conference_id[team_season.conference_season.conference_id]

        team_season.team_games = [];
        if (team_season.team_season_id in team_games_by_team_season_id){
          team_season.team_games = team_games_by_team_season_id[team_season.team_season_id]
        }

        team_season.top_25_games_played = 0;
        team_season.top_25_wins = 0;
        team_season.top_25_losses = 0;

        team_season.top_25_win_percentage = 0;

        team_season.heisman_count = 0;
        team_season.national_all_americans_count = 0;
        team_season.national_preseason_all_americans_count = 0;
        team_season.national_players_of_the_week_count = 0;
        team_season.conference_all_americans_count = 0;
        team_season.conference_players_of_the_week_count = 0;
        team_season.conference_preseason_all_americans_count = 0;


        for (const team_game of team_season.team_games){
          team_game.opponent_team_game = team_games_by_team_game_id[team_game.opponent_team_game_id];

          if (team_game.opponent_team_game.national_rank <= 25){
            team_season.top_25_games_played += 1;

            if (team_game.is_winning_team){
              team_season.top_25_wins += 1;
            }
            else {
              team_season.top_25_losses += 1;
            }
          }
        }

        if (team_season.top_25_games_played > 0){
          team_season.top_25_win_percentage = round_decimal(team_season.top_25_wins * 100 / team_season.top_25_games_played, 1);
        }

      }

      console.log('in draw team stats', {team_seasons:team_seasons})


      $(document).keydown(function(event){
          if(event.which=="17")
              cntrlIsPressed = true;
      });

      $(document).keyup(function(){
          cntrlIsPressed = false;
      });

      var cntrlIsPressed = false;

      var col_categories = {
        'Base': 7,
        //'Games': 3,
        'Point Margin': 3,
        'Total Offense': 8,
        'Total Defense': 8,
        'Passing - OFF': 11,
        'Rushing - OFF': 6,
        'Receiving - OFF': 6,
        'Downs - OFF': 12,
        'Passing - DEF': 11,
        'Rushing - DEF': 6,
        'Kicking': 11,
        'Punting': 5,
        'Returning': 10,
        'Rank': 4,
        'Top 25': 4,
        'Awards': 7,
        'Bowls': 6,
        'Expand': 1
        /*'Rank': 1,
        'Top 25': 1,
        'Rivals': 1,
        'Champ': 1,*/
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

      console.log('show_column_map', show_column_map);

      /*
      var show_column_map = {
        'Passing-Stats': [6,7,8,9,10],
        'Rushing-Stats': [11,12,13,14,15, 16,17],
        'Receiving-Stats': [18,19,20,21,22,23,24],
        'Defense-Stats': [25,26,27,28,29,30],

      };
      */

      var full_column_list = [];
      var hide_column_map = {}
      $.each(show_column_map, function(key, col_list){
        $.each(col_list, function(ind, col_num){
          if ((($.inArray( col_num,  show_column_map['Base'])) == -1) && ($.inArray( col_num,  show_column_map['Expand']) == -1)){
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


      var button_list = [{
          extend: 'searchPanes',
          config: {
            cascadePanes: true,
            viewTotal: false, //maybe true later - TODO
            columns:[1],
            collapse: 'Filter Team',
          },
      }]

      $.each(col_categories, function(key, val){
        if (key == 'Base' || key == 'Expand' ){
          return true;
        }
        var button_obj = {extend: 'colvisGroup',
                          text: key,
                          show: show_column_map[key],
                          hide: hide_column_map[key],
                          action: function( e, dt, node, config){
                            console.log('cntrlIsPressed', cntrlIsPressed, 'e, dt, node, config', e, dt, node, config)
                            $('#TeamStats').DataTable().columns(config.show).visible(true);
                            $('#TeamStats').DataTable().columns(config.hide).visible(false);

                           $(".dt-buttons").find("button").removeClass("active");
                           node.addClass("active");

                     }}
        button_list.push(button_obj)
      });

      var desc_first = ['desc', 'asc'];
      var asc_first = ['asc', 'desc'];

      console.log("$('#TeamStats')", $('#TeamStats'))
      var table = $('#TeamStats').DataTable({
          dom: 'Brtp',
          scrollX: true,
          fixedHeader: true,
          //"serverSide": true,
          filter: true,
          ordering: true,
          lengthChange : false,
          pageLength: 150,
          pagingType: "full_numbers",
          paginationType: "full_numbers",
          paging: false,
          data: team_seasons,
           buttons:button_list,
          columns: [
            {"data": "team.school_name", "sortable": true, 'searchable': true, 'className': 'column-shrink', 'orderSequence': asc_first, "fnCreatedCell": function (td, school_name, team_season, iRow, iCol) {
              $(td).html("<a href='"+team_season.team.team_href+"'><img class='worldTeamStatLogo padding-right' src='"+team_season.team.team_logo+"'/></a>");
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color:white;` );
                $(td).parent().attr('TeamID', team_season.team.team_id);
            }},
            {"data": "team.school_name", "sortable": true, 'searchable': true, 'className': 'font14','orderSequence': asc_first, "fnCreatedCell": function (td, school_name, team_season, iRow, iCol) {
              $(td).html("<a href='"+team_season.team.team_href+"'>"+team_season.team.school_name+"</a>");
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color:white;` );
            }},
            {"data": "conference_season.conference.conference_abbreviation",'className': 'center-text', "sortable": true, 'visible': true, 'orderSequence': asc_first,  "fnCreatedCell": function (td, conference_abbreviation, team_season, iRow, iCol) {
                $(td).html(`<a href='${team_season.conference_season.conference.conference_href}'>${team_season.conference_season.conference.conference_abbreviation}</a>`);
            }},
            {"data": "national_rank", "sortable": true, 'visible': true, 'className': 'center-text col-group','orderSequence':asc_first},
            //NationalRank
            {"data": "record.games_played", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':desc_first},
            {"data": "record.wins", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':desc_first},
            {"data": "record.losses", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "points_per_game", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':["desc", 'asc']},
            {"data": "points_allowed_per_game", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':["asc", 'desc']},
            {"data": "point_differential_per_game", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':["desc", 'asc']},
            {"data": "yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "season_stats.rushing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "rushing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "season_stats.team.points", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "points_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

            {"data": "yards_allowed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "yards_allowed_per_game", "sortable": true, 'visible': false,'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "opponent_season_stats.passing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "opponent_passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "opponent_season_stats.rushing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "opponent_rushing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "opponent_season_stats.team.points", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "points_allowed_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

            {"data": "season_stats.passing.completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "completion_percentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "passing_yards_per_attempt", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.tds", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.ints", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "passer_rating", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},


            {"data": "season_stats.rushing.carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.rushing.yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "rushing_yards_per_carry_qualified", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "rushing_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.rushing.lng", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.rushing.tds", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

            {"data": "season_stats.receiving.receptions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.receiving.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "receiving_yards_per_catch", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "receiving_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.receiving.lng", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.receiving.tds", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.team.downs.first_downs.total", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.team.downs.first_downs.rushing", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "season_stats.team.downs.first_downs.passing", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "season_stats.team.downs.first_downs.penalty", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "season_stats.team.downs.third_downs.conversions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.team.downs.third_downs.attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "third_down_conversion_percentage", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "season_stats.team.downs.fourth_downs.conversions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.team.downs.fourth_downs.attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "fourth_down_conversion_percentage", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "opponent_season_stats.passing.completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_completion_percentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "opponent_passing_yards_per_attempt", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "opponent_passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.tds", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.ints", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_passer_rating", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "opponent_season_stats.rushing.carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.rushing.yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "opponent_rushing_yards_per_carry", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_rushing_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.rushing.lng", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "opponent_season_stats.rushing.tds", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},

              {"data": "season_stats.kicking.fgm", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.kicking.fga", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "kicking_field_goal_percentage", "sortable": true, 'visible': false, 'className': 'center-text', 'orderSequence':desc_first},
              {"data": "season_stats.kicking.lng", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.kicking.fgm_29", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html(`<span>${team_season.stats.season_stats.kicking.fgm_29}/${team_season.stats.season_stats.kicking.fga_29}</span>`);
              }},
              {"data": "season_stats.kicking.fgm_39", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                $(td).html(`<span>${team_season.stats.season_stats.kicking.fgm_39}/${team_season.stats.season_stats.kicking.fga_39}</span>`);
              }},
              {"data": "season_stats.kicking.fgm_49", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                $(td).html(`<span>${team_season.stats.season_stats.kicking.fgm_49}/${team_season.stats.season_stats.kicking.fga_49}</span>`);
              }},
              {"data": "season_stats.kicking.fgm_50", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                $(td).html(`<span>${team_season.stats.season_stats.kicking.fgm_50}/${team_season.stats.season_stats.kicking.fga_50}</span>`);
              }},
              {"data": "season_stats.kicking.xpm", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.kicking.xpa", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "kicking_extra_point_percentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "season_stats.punting.punts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.punting.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "season_stats.punting.lng", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "punting_average_yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "weeks_ranked_1", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "weeks_ranked_top_5", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "weeks_ranked_top_10", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "weeks_ranked_top_25", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "top_25_games_played", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "top_25_wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "top_25_losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "top_25_win_percentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "heisman_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "national_all_americans_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "national_preseason_all_americans_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "national_players_of_the_week_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "conference_all_americans_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "conference_preseason_all_americans_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "conference_players_of_the_week_count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              // {"data": "NationalChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              // {"data": "ConferenceChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              // {"data": "Bowl_GamesPlayed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              // {"data": "Bowl_Wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              // {"data": "Bowl_Losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              // {"data": "Bowl_WinPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},

          ],
          order: [[ 3, "asc" ]],
      });


    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/TeamStats/Season/:season');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();
      await draw_team_stats(common)

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
