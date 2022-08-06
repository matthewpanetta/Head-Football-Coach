
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      const season = common.season;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Recruiting',
        group_name: 'World',
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray();
      const team_season_ids = team_seasons.map(ts => ts.team_season_id);
      const team_season_recruitings = await db.team_season_recruiting.bulkGet(team_season_ids);
      const team_season_recruitings_by_team_season_id = index_group_sync(team_season_recruitings, 'index', 'team_season_id');

      team_seasons = nest_children(team_seasons, team_season_recruitings_by_team_season_id, 'team_season_id', 'recruiting')

      var team_seasons_by_team_id = index_group_sync(team_seasons, 'index', 'team_id');

      teams = nest_children(teams, team_seasons_by_team_id, 'team_id', 'team_season');
      teams = teams.sort((t_a, t_b) => t_a.team_season.recruiting.recruiting_class_rank - t_b.team_season.recruiting.recruiting_class_rank)

      console.log({t: teams.map(t => [t.team_name, t.team_season.recruiting.class_points, t.team_season.recruiting.recruiting_class_rank])})

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: common.primary_color, SecondaryColor: common.secondary_color, NavBarLinks: NavBarLinks},
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/recruiting/template.njk'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;
      const season = common.season;

      const recruiting_team_season_id = (-1 * season);

      var teams = await db.team.toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_season_id > 0).toArray();
      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
      const team_season_ids = team_seasons.map(ts => ts.team_season_id);
      const team_season_recruitings = await db.team_season_recruiting.bulkGet(team_season_ids);
      const team_season_recruitings_by_team_season_id = index_group_sync(team_season_recruitings, 'index', 'team_season_id');

      team_seasons = nest_children(team_seasons, team_season_recruitings_by_team_season_id, 'team_season_id', 'recruiting')
      var team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id')

      var player_team_seasons = await db.player_team_season.where({season: common.season}).and(pts => pts.team_season_id == recruiting_team_season_id).toArray();
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);
      const player_team_season_recruitings = await db.player_team_season_recruiting.bulkGet(player_team_season_ids);
      const player_team_season_recruitings_by_player_team_season_id = index_group_sync(player_team_season_recruitings, 'index', 'player_team_season_id');

      player_team_seasons = nest_children(player_team_seasons, player_team_season_recruitings_by_player_team_season_id, 'player_team_season_id', 'recruiting')
      var player_ids = player_team_seasons.map(pts => pts.player_id);

      var players = await db.player.bulkGet(player_ids);
      var players_by_player_id = index_group_sync(players, 'index', 'player_id');

      player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')

      player_team_seasons = player_team_seasons.map(function(pts){
        var sorted_match_rating = Object.values(pts.recruiting.recruit_team_seasons).map(pts => pts.match_rating).sort((mr_a, mr_b) => mr_b - mr_a);
        var max_match_rating = sorted_match_rating[0];
        var second_match_rating = sorted_match_rating[1]

        return Object.assign(pts, {max_match_rating: max_match_rating, second_match_rating_ratio: second_match_rating/max_match_rating});
      })

      console.log({recruiting_team_season_id:recruiting_team_season_id, player_team_seasons:player_team_seasons})
      draw_recruiting_table(player_team_seasons, team_seasons_by_team_season_id);

    }


    function draw_recruiting_table(player_team_seasons, team_seasons_by_team_season_id) {


      var desc_first = ["desc", "asc"];
      var asc_first = ["asc", "desc"];

      var position_sort_order = {
        'QB': 1,
        'RB': 2,
        'FB': 3,
        'WR': 4,
        'TE': 5,
        'OT': 6,
        'IOL': 7,
        'DL': 8,
        'EDGE': 9,
        'LB': 10,
        'CB': 11,
        'S': 12,
        'K': 13,
        'P': 14,
      }

      var col_categories = {
        'Base': 7,
        'STATUS <i class="hide-small fas fa-handshake"></i>': 5,
        'INT <i class="hide-small fas fa-ruler"></i>': 4,
        'MEAS <i class="hide-small fas fa-ruler"></i>': 5,
        'PHY <i class="hide-small fas fa-chart-line"></i>': 7,
        'PAS <i class="hide-small fas fa-chart-line"></i>': 7,
        'RUS <i class="hide-small fas fa-chart-line"></i>': 4,
        'REC <i class="hide-small fas fa-chart-line"></i>': 4,
        'BLK <i class="hide-small fas fa-chart-line"></i>': 3,
        'DEF <i class="hide-small fas fa-chart-line"></i>': 7,
        'KCK <i class="hide-small fas fa-chart-line"></i>': 2,
        'Expand': 1,
        'Custom': 4
      }



      var show_column_map = {}
      var col_counter = 0;
      $.each(col_categories, function(key, val) {
        show_column_map[key] = []
        for (var i = col_counter; i < col_counter + val; i++) {
          show_column_map[key].push(i);
        }
        col_counter = col_counter + val;
      })

      var full_column_list = [];
      var hide_column_map = {}
      $.each(show_column_map, function(key, col_list) {
        $.each(col_list, function(ind, col_num) {
          if ((($.inArray(col_num, show_column_map['Base'])) == -1) && ($.inArray(col_num, show_column_map['Expand']) == -1) && ($.inArray(col_num, show_column_map['Custom']) == -1)) {
            full_column_list.push(col_num);
          }
        })
      });

      $.each(show_column_map, function(key, col_list) {
        var cols = $.grep(full_column_list, function(val, ind) {
          return $.inArray(val, col_list) == -1
        });
        hide_column_map[key] = cols;
      });

      var search_pane_columns = [1, 3, 11].concat(show_column_map['Custom']);


      var button_list = [{
        extend: 'searchPanes',
        config: {
          cascadePanes: true,
          viewTotal: false, //maybe true later - TODO
          columns: search_pane_columns,
          collapse: 'Filter Players',
        },

      }]

      $.each(col_categories, function(key, val) {
        if (key == 'Base' || key == 'Expand' || key == 'Custom') {
          return true;
        }
        var button_obj = {
          extend: 'colvisGroup',
          text: key,
          show: show_column_map[key],
          hide: hide_column_map[key],
          action: function(e, dt, node, config) {
            console.log('config', e, dt, node, config)
            dt.columns(config.show).visible(true);
            dt.columns(config.hide).visible(false);

            $(".dt-buttons").find("button").removeClass("active");
            node.addClass("active");

          }
        }
        button_list.push(button_obj)
      });

      console.log({'button_list': button_list, player_team_seasons:player_team_seasons});

      var star_groups_map = {
        1: [1],
        2: [2],
        3: [3],
        4: [2, 2],
        5: [3, 2]
      }


      var recruit_table = $('#recruitingMainTable').DataTable({
        "dom": 'Brtp',
        'searching': true,
        'info': false,
        "filter": true,
        "pageLength": 25,
        'data': player_team_seasons,
        'buttons': button_list,
        "ordering": true,
        "lengthChange": false,
        "pagingType": "full_numbers",
        "paginationType": "full_numbers",
        "paging": true,
        'columnDefs': [{
          searchPanes: {
            show: true,
            options: [{
                label: 'Signed',
                value: function(rowData, rowIdx) {
                  return rowData['RecruitingPointsPercent'] >= 100;
                }
              },
              {
                label: 'Closing Stage (< 100%)',
                value: function(rowData, rowIdx) {
                  return rowData['RecruitingPointsPercent'] > 75 && rowData['RecruitingPointsPercent'] < 100;
                }
              },
              {
                label: 'Narrowing Down Teams (< 75%)',
                value: function(rowData, rowIdx) {
                  return rowData['RecruitingPointsPercent'] > 50 && rowData['RecruitingPointsPercent'] <= 75;
                }
              },
              {
                label: 'Progressing (< 50%)',
                value: function(rowData, rowIdx) {
                  return rowData['RecruitingPointsPercent'] > 25 && rowData['RecruitingPointsPercent'] <= 50;
                }
              },
              {
                label: 'Available (< 25%)',
                value: function(rowData, rowIdx) {
                  return rowData['RecruitingPointsPercent'] <= 25;
                }
              }
            ],
            combiner: 'or'
          },
          targets: [53]
        },{
          searchPanes: {
            show: true,
            options: [{
                label: 'On Recruiting Board',
                value: function(rowData, rowIdx) {
                  return rowData['playerteamseason__recruitteamseason__IsActivelyRecruiting'] && !rowData['RecruitSigned'];
                }
              },
              {
                label: 'All Players',
                value: function(rowData, rowIdx) {
                  return true;
                }
              },
              {
                label: 'Committed',
                value: function(rowData, rowIdx) {
                  return rowData['playerteamseason__recruitteamseason__Signed'];
                }
              },
            ],
            combiner: 'or'
          },
          targets: [54]
        },{
          searchPanes: {
            show: true,
            options: [{
                label: 'Pipeline State',
                value: function(rowData, rowIdx) {
                  return rowData['playerteamseason__recruitteamseason__TeamSeasonStateID__IsPipelineState'] ;
                }
              },
              {
                label: 'Connected State',
                value: function(rowData, rowIdx) {
                  return rowData['playerteamseason__recruitteamseason__TeamSeasonStateID__IsConnectedState'] ;
                }
              },
            ],
            combiner: 'or'
          },
          targets: [55]
        }, ],
        "columns": [

          {
            "data": "recruiting.rank.national",
            "sortable": true,
            'searchable': true,
            'className': 'recruiting-player-rank',
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).html(`<div class="">
                            <span>` + string_val + `</span>
                        </div>
                        <div class="recruiting-player-city font10">
                          <span>Pos ` + player_team_season.recruiting.rank.position_rank + `</span>
                        </div>
                        <div class="recruiting-player-city font10">
                          <span>State ` + player_team_season.recruiting.rank.state + `</span>
                        </div>`);

              $(td).closest('tr').attr('PlayerID', player_team_season.player_id)
            }
          },
          {
            "data": "recruiting.stars",
            "sortable": true,
            'searchable': true,
            'className': 'recruiting-player-rank font14',
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).empty();
              var StarGroups = star_groups_map[string_val];
              $.each(StarGroups, function(ind, obj) {
                var StarGroup = $('<div></div>');

                for (var i = 1; i <= obj; i++) {
                  $(StarGroup).append('<i class="fas fa-star  w3-text-amber"></i>');
                }

                $(td).append(StarGroup)
              })

            }
          },
          {
            "data": "player.full_name",
            "visible": true,
            "sortable": true,
            'searchable': true,
            'className': 'text-left',
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {

              $(td).html(`<div class="recruiting-player-name font14">
                              <a  href="${player_team_season.player.player_href}"> ${string_val} </a>
                          </div>
                          <div class="recruiting-player-city font10">
                            ${player_team_season.player.hometown.city}, ${player_team_season.player.hometown.state}
                          </div>`)
            }
          },
          {
            "data": "position",
            "sortable": true,
            'searchable': true,
            'orderSequence': ["desc", "asc"],
            render: function(data, type, row) {
              var returnVal = data;
              if (type === 'sort') {
                returnVal = position_sort_order[row.position];
              }
              return returnVal;
            }
            /* 'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol){

                       $(td).html(`<div class="section font16">
                                     <span>`+string_val+`</span>
                                   </div>
                                   <div class="font10">
                                     <span>`+'Style'+`</span>
                                   </div>`)
                     }*/
          },
          {
            "data": "ratings.overall.overall",
            "sortable": true,
            'visible': true,
            'orderSequence': ["desc", "asc"],
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).html(string_val)
            }
          },
          {
            "data": 'max_match_rating',
            "sortable": true,
            'visible': true,
            'className': '',
            'orderSequence': desc_first,
            "defaultContent": ''
          }, //% Scouted
          {
            "data": "recruiting.stage",
            "sortable": true,
            'visible': true,
            'orderSequence': ["desc", "asc"],
            'className': 'col-group',
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              //return '';
              var container = $('<div class="equal-sized-item-container"></div>');
              var max_interest_level = player_team_season.max_match_rating;
              var opacity = 100;
              var is_leader = false;
              var trailing = 0;
              var recruit_team_seasons = Object.values(player_team_season.recruiting.recruit_team_seasons);
              recruit_team_seasons = recruit_team_seasons.sort((rts_a, rts_b) => rts_b.match_rating - rts_a.match_rating);
              recruit_team_seasons = recruit_team_seasons.slice(0,3)
              recruit_team_seasons = nest_children(recruit_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season')
              $.each(recruit_team_seasons, function(i, rts) {
                is_leader = false;
                if (rts.match_rating >= max_interest_level) {
                  max_interest_level = rts.match_rating;
                  is_leader = true;
                } else {
                  trailing = max_interest_level - rts.match_rating;
                }

                opacity = Math.max(100 * ((rts.match_rating / max_interest_level) ** 3), 50);

                if (rts.signed == true) {
                  var subtext = 'Signed';
                } else if (is_leader == true) {
                  var subtext = '1st';
                } else {
                  var subtext = '-' + trailing;
                }
                container.append($(`<div class="equal-sized-item"><div class="section font16">
                               <a href=` + rts.team_season.team.team_href + `><img class='recruitingLeadingTeamLogo' style='opacity: ` + opacity + `%;' src=` + rts.team_season.team.team_logo  + `  /></a>
                             </div>
                             <div class="font10">
                               <span>` + subtext + `</span>
                             </div></div>`));

                if (rts.signed == true) {
                  return false;
                }
              })
              $(td).html('');
              $(td).append(container)
            }
          },

          {
            "data": null,//'playerteamseason__recruitteamseason__IsActivelyRecruiting',
            "sortable": true,
            'visible': false,
            'className': '',
            'orderSequence': desc_first,
            "defaultContent": '',
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).html('No');
              if (string_val){
                $(td).html('Yes')
              }
            },
            'render': function(data, type, row) {
              if (data){
                return 'Yes';
              }
              return 'No';
            }

          }, // % Lock

          {
            "data": null,//'RecruitingPointsPercent',
            "sortable": true,
            'visible': false,
            'className': '',
            'orderSequence': desc_first,
            "defaultContent": ''
          }, // % Lock
          {
            "data": null,//'playerteamseason__recruitteamseason__InterestLevel',
            "sortable": true,
            'visible': false,
            'className': '',
            'orderSequence': desc_first,
            "defaultContent": ''
          }, // Interest in Team

          {
            "data": null,//"TimeLeftThisWeek",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"],
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).html(seconds_to_time(string_val))
            }
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__OfferMade",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc", "asc"],
            'fnCreatedCell': function(td, string_val, player_team_season, iRow, iCol) {
              $(td).html('No');
              if (string_val){
                $(td).html('Yes')
              }
            },
            'render': function(data, type, row) {
              if (data){
                return 'Yes';
              }
              return 'No';
            }
          },

          {
            "data": null,
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"]
          },
          {
            "data": null,
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"]
          },
          {
            "data": null,
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"]
          },
          {
            "data": null,
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"]
          },

          {
            "data": "player.body.height",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"]
          },
          {
            "data": "player.body.weight",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc", "asc"],
          },
          {
            "data": 'recruiting.measurables.fourty_yard_dash',
            "sortable": true,
            'visible': false,
            'orderSequence': asc_first,
            'className': ''
          },
          {
            "data": 'recruiting.measurables.bench_press_reps',
            "sortable": true,
            'visible': false,
            'orderSequence': desc_first,
            'className': ''
          },
          {
            "data": 'recruiting.measurables.vertical_jump',
            "sortable": true,
            'visible': false,
            'orderSequence': desc_first,
            'className': ' col-group'
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Strength_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Agility_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Speed_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Acceleration_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Stamina_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Jumping_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Awareness_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ThrowPower_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ShortThrowAccuracy_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_MediumThrowAccuracy_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_DeepThrowAccuracy_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ThrowOnRun_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ThrowUnderPressure_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_PlayAction_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Carrying_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Elusiveness_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_BallCarrierVision_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_BreakTackle_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Catching_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_CatchInTraffic_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_RouteRunning_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Release_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_PassBlock_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_RunBlock_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ImpactBlock_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_PassRush_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_BlockShedding_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Tackle_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_HitPower_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ManCoverage_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_ZoneCoverage_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_Press_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_KickPower_Rating",
            "sortable": true,
            'visible': false,
            'orderSequence': ["desc"]
          },
          {
            "data": null,//"playerteamseason__recruitteamseason__Scouted_KickAccuracy_Rating",
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

          {
            "data": null,
            "sortable": false,
            'visible': true,
            'className': 'details-control',
            "defaultContent": ''
          },
          {
            "data": 'player.hometown.state',
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },
          {
            "data": 'player.hometown.state',
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },
          {
            "data": 'player.hometown.state',
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },
          {
            "data": 'player.hometown.state',
            "sortable": true,
            'visible': false,
            'className': 'col-group',
            'orderSequence': ["desc"]
          },

        ],
      });


      $('#recruitingMainTable tbody').on('click', '.details-control', function() {
        //console.log('clicked', this, SelectedTeamID);

        var tr = $(this).parent();
        $(tr).addClass('shown');
        var PlayerID = $(tr).attr('PlayerID');
        var row = recruit_table.row(tr);

        var SourceTable = 'Main';

        if (row.child.isShown()) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
        } else {
          // Open this row
          var data = row.data()
          var formattedContent = DrawPlayerInfo(data, WorldID, PlayerID, SourceTable);
          row.child(formattedContent, 'teamTableBorder').show();
          var childrow = row.child();

          var teamcolor = 'blue';
          childrow.find('td').css('border-left-color', teamcolor)

          tr.addClass('shown');
        }


      });


      //RecruitingAction(WorldID, recruit_table);
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Recruiting/');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
