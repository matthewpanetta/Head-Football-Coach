
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

      var teams = await db.team.toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where({season: common.season}).toArray();
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

      var url = '/static/html_templates/almanac/team_stats/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;

    }

    const get_player_stats = (common) => {

      var data = common.render_content.players;
      var PositionSortOrderMap = {
          'QB': '01',
          'RB': '02',
          'FB': '03',
          'WR': '04',
          'TE': '05',
          'OT': '06',
          'OG': '07',
          'OC': '08',
          'EDGE': '09',
          'DL': '10',
          'LB': '12',
          'CB': '13',
          'S': '14',
          'K': '15',
          'P': '16',
      };


        var PositionGroupMap = {
            'QB': 'Offense',
            'RB': 'Offense',
            'FB': 'Offense',
            'WR': 'Offense',
            'TE': 'Offense',
            'OT': 'Offense',
            'OG': 'Offense',
            'OC': 'Offense',
            'EDGE': 'Defense',
            'DL': 'Defense',
            'LB': 'Defense',
            'CB': 'Defense',
            'S': 'Defense',
            'K': 'Special Teams',
            'P': 'Special Teams',
        };
      var ClassSortOrderMap = {
          'FR': 1,
          'FR (RS)': 1.5,
          'SO': 2,
          'SO (RS)': 2.5,
          'JR': 3,
          'JR (RS)': 3.5,
          'SR': 4,
          'SR (RS)': 4.5,
      };

          var col_categories = {
            'Base': 7,
            'PAS <i class="fas fa-list-ol"></i>': 5,
            'RUSH <i class="fas fa-list-ol"></i>': 7,
            'REC <i class="fas fa-list-ol"></i>': 7,
            'DEF <i class="fas fa-list-ol"></i>': 7,
            'PHY <i class="fas fa-chart-line"></i>': 7,
            'PAS <i class="fas fa-chart-line"></i>': 7,
            'RUS <i class="fas fa-chart-line"></i>': 4,
            'REC <i class="fas fa-chart-line"></i>': 4,
            'BLK <i class="fas fa-chart-line"></i>': 3,
            'DEF <i class="fas fa-chart-line"></i>': 7,
            'KCK <i class="fas fa-chart-line"></i>': 2,
            'Expand': 1,
            'Custom': 3
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
              if ((($.inArray( col_num,  show_column_map['Base'])) == -1) && ($.inArray( col_num,  show_column_map['Expand']) == -1) && ($.inArray( col_num,  show_column_map['Custom']) == -1)){
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

          var SearchPaneColumns = [1,3,4].concat(show_column_map['Custom']);
        //  var SearchPaneColumns = [0,2,3].concat(show_column_map['Custom']);


          var button_list = [{
              extend: 'searchPanes',
              config: {
                cascadePanes: true,
                viewTotal: false, //maybe true later - TODO
                columns:SearchPaneColumns,
                collapse: 'Filter Players',
              },

          }]

          $.each(col_categories, function(key, val){
            if (key == 'Base' || key == 'Expand'  || key == 'Custom' ){
              return true;
            }
            var button_obj = {extend: 'colvisGroup',
                              text: key,
                              show: show_column_map[key],
                              hide: hide_column_map[key],
                              action: function( e, dt, node, config){
                                dt.columns(config.show).visible(true);
                                dt.columns(config.hide).visible(false);

                               $(".dt-buttons").find("button").removeClass("active");
                               node.addClass("active");

                         }}
            button_list.push(button_obj)
          });

      var table = $('#PlayerStats').DataTable({
          "dom": 'Brtp',
          "scrollX": true,
        //fixedHeader: true,
        /*
          "serverSide": true,
          'ajax': {
            type: "GET",
            url: DataPath,
            "data": function ( d ) {

              console.log('Going to post... ', d);
              return d;
            },
            "dataSrc": function ( json ) {
                 console.log('json', json);
                 return json['data'];
            }
          },*/
            "deferRender": true,
          "filter": true,
          "ordering": true,
          "lengthChange" : false,
          "pageLength": 25,
          "pagingType": "full_numbers",
          "paginationType": "full_numbers",
          "paging": true,
          "data": data,
           'buttons':button_list,
           'columnDefs': [
             {
              searchPanes: {
                show: true,
                  options:[
                      {
                          label: 'Passing Qualifiers',
                          value: function(rowData, rowIdx){
                              return rowData['TeamGamesPlayed'] > 0 && rowData['PAS_Attempts'] > 10*rowData['TeamGamesPlayed'];
                          }
                      },
                      {
                          label: 'Rushing Qualifiers',
                          value: function(rowData, rowIdx){
                            return rowData['TeamGamesPlayed'] > 0 && rowData['RUS_Carries'] > 10*rowData['TeamGamesPlayed'];
                          }
                      }
                  ],
                  combiner: 'and'
              },
              targets: [68]
            },
            {
             searchPanes: {
               show: true,
                 options:[
                     {
                         label: 'Eligible for Draft',
                         value: function(rowData, rowIdx){
                             return rowData.player_team_season.class.class_name == 'SR' || rowData.player_team_season.class.class_name == 'JR' || (rowData.player_team_season.class.class_name == 'SO' && rowData.player_team_season.class.redshirted == true);
                         }
                     },
                     {
                         label: 'Not Eligible for Draft',
                         value: function(rowData, rowIdx){
                           return !(rowData.player_team_season.class.class_name == 'SR' || rowData.player_team_season.class.class_name == 'JR' || (rowData.player_team_season.class.class_name == 'SO' && rowData.player_team_season.class.redshirted == true));
                         }
                     },
                 ],
             },
             targets: [69]
           },
           {
            searchPanes: {
              show: true,
                options:[
                  {
                      label: 'Offense',
                      value: function(rowData, rowIdx){
                          return PositionGroupMap[rowData['PositionID__PositionAbbreviation']] == 'Offense' ;
                      }
                  },
                  {
                      label: 'Defense',
                      value: function(rowData, rowIdx){
                          return PositionGroupMap[rowData['PositionID__PositionAbbreviation']] == 'Defense' ;
                      }
                  },
                  {
                      label: 'Special Teams',
                      value: function(rowData, rowIdx){
                          return PositionGroupMap[rowData['PositionID__PositionAbbreviation']] == 'Special Teams' ;
                      }
                  },
                    {
                        label: 'Offensive Line',
                        value: function(rowData, rowIdx){
                            return rowData.position  == 'OT' || rowData.position  == 'OG' || rowData.position == 'OC';
                        }
                    },
                      {
                          label: 'Skill Position',
                          value: function(rowData, rowIdx){
                              return rowData.position == 'QB' || rowData.position  == 'RB' || rowData.position  == 'WR' || rowData.position  == 'TE';
                          }
                      },
                      {
                          label: 'Defensive Line',
                          value: function(rowData, rowIdx){
                              return rowData.position  == 'DE' || rowData.position  == 'DT';
                          }
                      },
                ],
            },
            targets: [70]
          },
          ],
          "columns": [
            {"data": "player_team_season.team_season.team.school_name", "sortable": false, 'className': 'column-shrink', 'searchable': true,"fnCreatedCell": function (td, StringValue, player, iRow, iCol) {
                $(td).html(`<a href='${player.player_team_season.team_season.team.team_href}'><img class='worldTeamStatLogo padding-right' src='${player.player_team_season.team_season.team.team_logo}'/></a>`);
                $(td).attr('style', `background-color: #${player.player_team_season.team_season.team.team_color_primary_hex}`);
                $(td).parent().attr('PlayerID', player.player_id);
            }},
              {"data": "player_team_season.team_season.team.school_name", "sortable": true, 'className': 'left-text', 'searchable': true,"fnCreatedCell": function (td, StringValue, player, iRow, iCol) {
                $(td).attr('style', `background-color: #${player.player_team_season.team_season.team.team_color_primary_hex}; color: white;`);
                  $(td).html(`<a href='${player.player_team_season.team_season.team.team_href}'>${player.player_team_season.team_season.team.school_name}</a>`);
              }},
              {"data": "full_name", "searchable": true, 'className': 'left-text', "fnCreatedCell": function (td, full_name, player, iRow, iCol) {
                  $(td).html(`<a href='${player.player_href}'>${full_name}</a>`);
              }},
              {"data": "player_team_season.class.class_name", render: function ( data, type, row ) {
                                    var returnVal = data;
                                    if ( type === 'sort' ) {
                                        returnVal = ClassSortOrderMap[data];
                                    }
                                    return returnVal;
                                },"sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                                    $(td).html(team_season.ClassDisplay);
                                    $(td).append('<span class="player-class"></span>')
                                    if (team_season.playerteamseason__RedshirtedThisSeason) {
                                      console.log('Has redhsirt!', td)
                                      $(td).find('.player-class').append('<i class="fas fa-tshirt w3-tooltip player-class-icon" style="color: red; margin-left: 4px;"><span style="position:absolute;left:0;bottom:18px" class="w3-text">Player Redshirted</span></i>')
                                    }
                                }},
              {"data": "position", render: function ( data, type, row ) {
                                    var returnVal = data;
                                    if ( type === 'sort' ) {
                                        returnVal = PositionSortOrderMap[data];
                                    }
                                    return returnVal;
                                },"sortable": true, 'searchable': true},
              {"data": "player_team_season.ratings.overall.overall", "sortable": true, 'orderSequence':["desc", 'asc']},
              {"data": "player_team_season.season_stats.games.game_score", "sortable": true, 'orderSequence':["desc"], 'className': 'col-group', "fnCreatedCell": function (td, game_score, player, iRow, iCol) {
                  $(td).html(round_decimal(game_score, 0));
              }},
              {"data": "player_team_season.season_stats.passing.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.completion_percentage", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.passing_yards_per_game", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.passing.tds", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.passing.ints", "sortable": true, 'visible': false,'className': 'col-group', 'orderSequence':["desc"]},

              {"data": "player_team_season.season_stats.rushing.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.rushing_yards_per_carry", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.rushing_yards_per_game", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.rushing.tds", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.rushing.lng", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.rushing.over_20", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.fumbles.fumbles", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.season_stats.receiving.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.receiving.receptions", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.receiving_yards_per_catch", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.receiving_yards_per_game", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.receiving.tds", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.receiving.targets", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.receiving.lng", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.season_stats.defense.tackles", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.defense.tackles_for_loss", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.defense.sacks", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.defense.ints", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.defense.deflections", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.fumbles.forced", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.season_stats.fumbles.recovered", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.athleticism.strength", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.athleticism.agility", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.athleticism.speed", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.athleticism.acceleration", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.athleticism.stamina", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.athleticism.jumping", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.overall.awareness", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.passing.throwing_power", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.short_throw_accuracy", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.medium_throw_accuracy", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.deep_throw_accuracy", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.throw_on_run", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.throw_under_pressure", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.passing.play_action", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.rushing.carrying", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.rushing.elusiveness", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.rushing.ball_carrier_vision", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.rushing.break_tackle", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.receiving.catching", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.receiving.catch_in_traffic", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.receiving.route_running", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.receiving.release", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.blocking.pass_block", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.blocking.run_block", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.blocking.impact_block", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.defense.pass_rush", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.block_shedding", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.tackle", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.hit_power", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.man_coverage", "sortable": true, 'visible': false,  'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.zone_coverage", "sortable": true, 'visible': false,  'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.defense.press", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": "player_team_season.ratings.kicking.kick_power", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
              {"data": "player_team_season.ratings.kicking.kick_accuracy", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

              {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},
              {"data": null, 'visible': false,"sortable": false, 'searchable': false,   "defaultContent": ''},
              {"data": null, 'visible': false,"sortable": false, 'searchable': false,  'fnCreatedCell': function(td, StringValue, team_season, iRow, iCol){
                $(td).html(PositionGroupMap[team_season['PositionID__PositionAbbreviation']]);
              }},
              {"data": null, 'visible': false,"sortable": false, 'searchable': false,  'fnCreatedCell': function(td, StringValue, team_season, iRow, iCol){
                $(td).html(PositionGroupMap[team_season['PositionID__PositionAbbreviation']]);
              }},
          ],
          'order': [[ 5, "desc" ]],
      });


        $('#PlayerStats tbody').on('click', '.details-control', function () {
          //console.log('clicked', this, SelectedTeamID);

          var tr = $(this).parent();
          $(tr).addClass('shown');
          var PlayerID = $(tr).attr('PlayerID');
          var row = table.row( tr );

          if ( row.child.isShown() ) {
              // This row is already open - close it
              row.child.hide();
              tr.removeClass('shown');
          }
          else {
              // Open this row
              var data = row.data()
              var formattedContent = DrawPlayerInfo(data, WorldID, PlayerID);
              row.child( formattedContent, 'teamTableBorder' ).show();
              var childrow = row.child();

              var teamcolor = data.playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX;
              childrow.find('td').css('border-left-color', teamcolor)

              tr.addClass('shown');
          }


        });
    }



    const draw_team_stats = async (common) => {

      const db = common.db;

      const team_seasons = await db.team_season.where({season: common.season}).toArray();
      const teams = await db.team.toArray();
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      const conferences = await db.conference.toArray();
      const conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

      const conference_seasons = await db.conference_season.where({season: common.season}).toArray();
      const conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id');

      for (var team_season of team_seasons){
        team_season.team = teams_by_team_id[team_season.team_id];

        team_season.conference_season = conference_seasons_by_conference_season_id[team_season.conference_season_id];
        team_season.conference_season.conference = conferences_by_conference_id[team_season.conference_season.conference_id]
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
        'Base': 6,
        //'Games': 3,
        'Point Margin': 3,
        'Total Offense': 8,
        'Total Defense': 8,
        'Passing - OFF': 12,
        'Rushing - OFF': 6,
        'Receiving - OFF': 6,
        'Downs - OFF': 12,
        'Passing - DEF': 12,
        'Rushing - DEF': 6,
        'Kicking': 11,
        'Punting': 5,
        'Returning': 10,
        'Rank': 3,
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
            {"data": "team.school_name", "sortable": true, 'searchable': true, 'orderSequence': asc_first, "fnCreatedCell": function (td, school_name, team_season, iRow, iCol) {
                $(td).html("<a href='"+team_season.team.team_href+"'><img class='worldTeamStatLogo padding-right' src='"+team_season.team.team_logo+"'/>"+team_season.team.school_name+"</a>");
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color:white;` );
                $(td).parent().attr('TeamID', team_season.team.team_id);
            }},
            {"data": "conference_season.conference.conference_abbreviation", "sortable": true, 'visible': true, 'orderSequence': asc_first},
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
            {"data": "opponent_season_stats.team.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "yards_allowed_per_game", "sortable": true, 'visible': false,'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "opponent_season_stats.passing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "opponent_passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "opponent_season_stats.rushing.yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "opponent_rushing_yards_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':desc_first},
            {"data": "opponent_team_season.team.points", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "points_allowed_per_game", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "season_stats.passing.completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "completion_percentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "passing_yards_per_attempt", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "passing_yards_per_game", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": null, "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.tds", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.ints", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "season_stats.passing.sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "passing_rating", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "RUS_Carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "RUS_Yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
            {"data": "RUS_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "RUS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "RUS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
            {"data": "RUS_TD", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
            {"data": "REC_Receptions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "REC_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "REC_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "REC_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "REC_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "REC_TD", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "FirstDowns", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FirstDowns_Rush", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "FirstDowns_Pass", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "FirstDowns_Penalties", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "ThirdDownConversion", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "ThirdDownAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "ThirdDownPercentage", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "FourthDownConversion", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FourthDownAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FourthDownPercentage", "sortable": true, 'visible': false,'className': 'col-group center-text',  'orderSequence':desc_first},
              {"data": "Penalties", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PenaltyYards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_Completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_Attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_CompletionPercentage", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "Opponent_PAS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_YardsPerAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_PAS_INT", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "Opponent_PAS_Sacks", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "Opponent_PAS_SackYards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':desc_first},
              {"data": "Opponent_PAS_RTG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_Carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Opponent_RUS_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FGM", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FGA", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FGPercent", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':desc_first},
              {"data": "FG_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "FGM_29", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html("<span>"+team_season.FG29+"</span>");
              }},
              {"data": "FGM_39", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html("<span>"+team_season.FG39+"</span>");
              }},
              {"data": "team_season.season_stats.kicking.fg49", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html("<span>"+team_season.season_stats.kicking.FG49+"</span>");
              }},
              {"data": "FGM_50", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html("<span>"+team_season.FG50+"</span>");
              }},
              {"data": "XPM", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "XPA", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "XPPercent", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PNT_Punts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PNT_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PNT_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PNT_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "PNT_NET", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_PNT_ATT", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_PNT_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_PNT_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_PNT_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_PNT_TD", "sortable": true, 'visible': false,'className': 'col-group center-text',  'orderSequence':desc_first},
              {"data": "RET_KCK_ATT", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_KCK_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_KCK_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_KCK_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "RET_KCK_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "WeeksAt1", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "WeeksTop10", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "WeeksTop25", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "Top25_GamesPlayed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Top25_Wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Top25_Losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':asc_first},
              {"data": "Top25_WinPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "Heisman_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Natl_AllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Natl_PreSeasonAllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Natl_POTW_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Conf_AllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Conf_PreSeasonAllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Conf_POTW_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": "NationalChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "ConferenceChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Bowl_GamesPlayed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Bowl_Wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Bowl_Losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},
              {"data": "Bowl_WinPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':desc_first},

              {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},

          ],
          order: [[ 2, "asc" ]],
      });


        $('#TeamStats tbody').on('click', '.details-control', function () {
          //console.log('clicked', this, SelectedTeamID);

          var tr = $(this).parent();
          $(tr).addClass('shown');
          var SelectedTeamID = $(tr).attr('TeamID');
          var row = table.row( tr );

          if ( row.child.isShown() ) {
              // This row is already open - close it
              row.child.hide();
              tr.removeClass('shown');
          }
          else {
              // Open this row
              var data = row.data()
              var formattedContent = DrawTeamInfo(data, WorldID, SelectedTeamID);
              console.log(formattedContent,'formattedContent');
              row.child( formattedContent, 'teamTableBorder' ).show();
              var childrow = row.child();
              console.log(childrow, 'childrow');

              var teamcolor = data.TeamColor_Primary_HEX;
              childrow.find('td').css('border-left-color', teamcolor)

              tr.addClass('shown');
          }


        });


    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/TeamStats/Season/:season');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();
      await draw_team_stats(common)

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
