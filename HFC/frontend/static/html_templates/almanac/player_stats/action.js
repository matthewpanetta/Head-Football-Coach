
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      var season = common.params.season;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Player Stats',
        group_name: 'Almanac',
        db: db
      });

      var teams = await db.team.toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where({season: season}).toArray();
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');
      var distinct_team_seasons = [];

      const player_team_seasons = await db.player_team_season.where({season: season}).toArray();
      const player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'index', 'player_id')
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);

      const player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);

      var player_counter = 0;
      $.each(players, function(ind,player){
        player.player_team_season = player_team_seasons_by_player_id[player.player_id];
        player.player_team_season.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id];
        player.player_team_season.team_season.team = teams_by_team_id[player.player_team_season.team_season.team_id];
      });

      const player_leader_categories = [
        {category_name: 'Passing Yards Per Game', category_abbr: 'YPG', stat: 'passing_yards_per_game', players: []},
        {category_name: 'Passing Touchdowns', category_abbr: 'TDs', stat: 'season_stats.passing.tds', players: []},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'passer_rating', players: []},

        {category_name: 'Passing Completions', category_abbr: 'COMP', stat: 'season_stats.passing.completions', players: []},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'passer_rating', players: []},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'passer_rating', players: []},



        {category_name: 'Rushing Yards Per Game', category_abbr: 'YPG', stat: 'rushing_yards_per_game', players: []},
        {category_name: 'Rushing Touchdowns', category_abbr: 'TDs', stat: 'season_stats.rushing.tds', players: []},
        {category_name: 'Rushing Yards Per Carry', category_abbr: 'YPC', stat: 'rushing_yards_per_carry_qualified', players: []},
        {category_name: 'Receiving Yards Per Game', category_abbr: 'YPG', stat: 'receiving_yards_per_game', players: []},
        {category_name: 'Receiving Touchdowns', category_abbr: 'TDs', stat: 'season_stats.receiving.tds', players: []},
        {category_name: 'Receptions', category_abbr: 'RECs', stat: 'season_stats.receiving.receptions', players: []},
        {category_name: 'Tackles', category_abbr: 'Tackles', stat: 'season_stats.defense.tackles', players: []},
        {category_name: 'Sacks', category_abbr: 'Sacks', stat: 'season_stats.defense.sacks', players: []},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'season_stats.defense.ints', players: []},
      ]

      for (const player_leader_category of player_leader_categories){

        var player_leaders = players.filter(p => get(p.player_team_season, player_leader_category.stat) > 0).sort((p_a, p_b) => get(p_b.player_team_season, player_leader_category.stat) - get(p_a.player_team_season, player_leader_category.stat));

        for (const player of player_leaders.slice(0,5)){

          let player_obj = {player: player, value: null}

          player_obj.value = get(player.player_team_season, player_leader_category.stat)

          player_leader_category.players.push(player_obj)
        }
      }

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            players: players,
                            player_leader_categories: player_leader_categories

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/player_stats/template.html'
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

      $('#nav-all-players-tab').on('click', function(){


      var PositionSortOrderMap = {
          'QB': '01',
          'RB': '02',
          'FB': '03',
          'WR': '04',
          'TE': '05',
          'OT': '06',
          'IOL': '07',
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
            'IOL': 'Offense',
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

          var ColCategories = {
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

          var ShowColumnMap = {}
          var ColCounter = 0;
          $.each(ColCategories, function(key, val){
            ShowColumnMap[key] = []
            for(var i = ColCounter; i < ColCounter+val; i++){
              ShowColumnMap[key].push(i);
            }
            ColCounter = ColCounter + val;
          })

          var FullColumnList = [];
          var HideColumnMap = {}
          $.each(ShowColumnMap, function(key, ColList){
            $.each(ColList, function(ind, ColNum){
              if ((($.inArray( ColNum,  ShowColumnMap['Base'])) == -1) && ($.inArray( ColNum,  ShowColumnMap['Expand']) == -1) && ($.inArray( ColNum,  ShowColumnMap['Custom']) == -1)){
                FullColumnList.push(ColNum);
              }
            })
          });

          $.each(ShowColumnMap, function(key, ColList){
             var cols = $.grep( FullColumnList, function( val, ind ) {
                return $.inArray( val,  ColList) == -1
              });
              HideColumnMap[key] = cols;
          });

          var SearchPaneColumns = [1,3,4].concat(ShowColumnMap['Custom']);
        //  var SearchPaneColumns = [0,2,3].concat(ShowColumnMap['Custom']);


          var ButtonList = [{
              extend: 'searchPanes',
              config: {
                cascadePanes: true,
                viewTotal: false, //maybe true later - TODO
                columns:SearchPaneColumns,
                collapse: 'Filter Players',
              },

          }]

          $.each(ColCategories, function(key, val){
            if (key == 'Base' || key == 'Expand'  || key == 'Custom' ){
              return true;
            }
            var ButtonObj = {extend: 'colvisGroup',
                              text: key,
                              show: ShowColumnMap[key],
                              hide: HideColumnMap[key],
                              action: function( e, dt, node, config){
                                dt.columns(config.show).visible(true);
                                dt.columns(config.hide).visible(false);

                                dt.column(config.show[0]).order('desc').draw();

                               $(".dt-buttons").find("button").removeClass("active");
                               node.addClass("active");

                         }}
            ButtonList.push(ButtonObj)
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
           'buttons':ButtonList,
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
                            return rowData.position  == 'OT' || rowData.position  == 'IOL';
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
                                },"sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
                                    $(td).html(DataObject.ClassDisplay);
                                    $(td).append('<span class="player-class"></span>')
                                    if (DataObject.playerteamseason__RedshirtedThisSeason) {
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
              {"data": "player_team_season.rushing_yards_per_carry_qualified", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
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
              {"data": null, 'visible': false,"sortable": false, 'searchable': false,  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
                $(td).html(PositionGroupMap[DataObject['PositionID__PositionAbbreviation']]);
              }},
              {"data": null, 'visible': false,"sortable": false, 'searchable': false,  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
                $(td).html(PositionGroupMap[DataObject['PositionID__PositionAbbreviation']]);
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
      })
        //end here
    }


    const draw_faces = async (common) => {
      const db = common.db;
      const season = common.params.season;
      const index_group_sync = common.index_group_sync;
      console.log('PlayerFace-Headshot', $('.PlayerFace-Headshot'));

      const player_ids = [];
      const face_div_by_player_id = {};

      $('.PlayerFace-Headshot').each(function(ind, elem){
        console.log('ind, elem', ind, elem)
        player_ids.push(parseInt($(elem).attr('player_id')))
        if (!(parseInt($(elem).attr('player_id')) in face_div_by_player_id)) {
          face_div_by_player_id[parseInt($(elem).attr('player_id'))] = [];
        }

        face_div_by_player_id[parseInt($(elem).attr('player_id'))].push(elem)
      })

      console.log({player_ids:player_ids})

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

      console.log('player_ids', player_ids, 'players', players, 'player_team_seasons_by_player_id', player_team_seasons_by_player_id, 'team_seasons_by_team_season_id', team_seasons_by_team_season_id, 'teams_by_team_id', teams_by_team_id)

      for (var player of players){
        var elems = face_div_by_player_id[player.player_id];
        player.player_team_season = player_team_seasons_by_player_id[player.player_id];
        player.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id]
        player.team = teams_by_team_id[player.team_season.team_id]

        if (player.player_face == undefined){
          player.player_face = await common.create_player_face('single', player.player_id, db);
        }

        console.log( $(elem).attr('id'))

        for (var elem of elems){
          common.display_player_face(player.player_face, {jersey: player.team.jersey, teamColors: player.team.jersey.teamColors}, $(elem).attr('id'));
        }

      }
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/PlayerStats/Season/:season');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();
      await get_player_stats(common)
      await draw_faces(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
