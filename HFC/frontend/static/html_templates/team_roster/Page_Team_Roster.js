import AbstractView from "./AbstractView.js";

export default class extends AbstractView {

    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this.packaged_functions = params['packaged_functions'];
        this.db = params['db'];
    }


    async getHtml() {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(this.params.team_id);
      const db = this.db;
      const query_to_dict = this.packaged_functions.query_to_dict;

      const NavBarLinks = await this.packaged_functions.nav_bar_links({
        path: 'Roster',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await this.packaged_functions.team_header_links({
        path: 'Roster',
        season: undefined,
        db: db
      });

      var teams = await db.team.toArray();
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
      const team_season = await db.team_season.get({team_id: team_id, season: 2021});

      team.team_season = team_season;
      const player_team_seasons = await db.player_team_season.where({team_season_id: team_season.team_season_id}).toArray();
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);

      const player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);

      const player_team_season_games = await query_to_dict(await db.player_team_game.where({player_team_season_id: player_team_season_ids}).toArray(), 'many_to_one', 'player_team_season_id' );
      console.log('player_team_season_games', player_team_season_games)

      console.log('players', players)

      var player_counter = 0;
      $.each(player_team_seasons, function(ind,player_team_season){
        team_season.team = team;
        player_team_season.team_season = team_season;
        player_team_season.player_team_games = player_team_season_games[player_team_season.player_team_season_id];

        players[player_counter].player_team_season = player_team_season;

        player_counter +=1;
      });


      console.log('team.team_season.player_team_seasons', players)

      this.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     this.page,
                            world_id: this.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            players: players,
                            teams: teams,
                          }

      this.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team_roster.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await this['packaged_functions']['nunjucks_env'].renderString(html, render_content)

      return renderedHtml;
    }


        GetPlayerStats(){

          var data = this.render_content.players;
          var PositionSortOrderMap = {
              'QB': '01',
              'RB': '02',
              'FB': '03',
              'WR': '04',
              'TE': '05',
              'OT': '06',
              'OG': '07',
              'OC': '08',
              'DE': '09',
              'DT': '10',
              'OLB': '11',
              'MLB': '12',
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
                'DE': 'Defense',
                'DT': 'Defense',
                'OLB': 'Defense',
                'MLB': 'Defense',
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
                                 return rowData['playerteamseason__ClassID__ClassAbbreviation'] == 'SR' || rowData['playerteamseason__ClassID__ClassAbbreviation'] == 'JR' || rowData['ClassDisplay'] == 'SO (RS)';
                             }
                         },
                         {
                             label: 'Not Eligible for Draft',
                             value: function(rowData, rowIdx){
                               console.log('rowData', rowData)
                                 return !(rowData['playerteamseason__ClassID__ClassAbbreviation'] == 'SR' || rowData['playerteamseason__ClassID__ClassAbbreviation'] == 'JR' || rowData['ClassDisplay'] == 'SO (RS)');
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
                                return rowData['PositionID__PositionAbbreviation'] == 'OT' || rowData['PositionID__PositionAbbreviation'] == 'OG' || rowData['PositionID__PositionAbbreviation'] == 'OC';
                            }
                        },
                          {
                              label: 'Skill Position',
                              value: function(rowData, rowIdx){
                                  return rowData['PositionID__PositionAbbreviation'] == 'QB' || rowData['PositionID__PositionAbbreviation'] == 'RB' || rowData['PositionID__PositionAbbreviation'] == 'WR' || rowData['PositionID__PositionAbbreviation'] == 'TE';
                              }
                          },
                          {
                              label: 'Defensive Line',
                              value: function(rowData, rowIdx){
                                  return rowData['PositionID__PositionAbbreviation'] == 'DE' || rowData['PositionID__PositionAbbreviation'] == 'DT';
                              }
                          },
                    ],
                },
                targets: [69]
              },
              ],
              "columns": [
                {"data": "player_team_season.team_season.team.school_name", "sortable": true, 'className': 'column-shrink', 'searchable': true,"fnCreatedCell": function (td, StringValue, player, iRow, iCol) {
                    $(td).html(`<a href='${player.player_team_season.team_season.team.team_href}'><img class='worldTeamStatLogo padding-right' src='${player.player_team_season.team_season.team.team_logo}'/></a>`);
                    $(td).attr('style', `background-color: #${player.player_team_season.team_season.team.team_color_primary_hex}`);
                    $(td).parent().attr('PlayerID', player.player_id);
                }},
                  {"data": "player_team_season.team_season.team.school_name", "sortable": true, 'className': 'left-text', 'searchable': true,"fnCreatedCell": function (td, StringValue, player, iRow, iCol) {
                      $(td).html(`<a href='${player.player_team_season.team_season.team.team_href}'>${player.player_team_season.team_season.team.school_name}</a>`);
                  }},
                  {"data": "full_name", "searchable": true, 'className': 'left-text', "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
                      $(td).html("<a href='"+DataObject['PlayerHref']+"'>"+StringValue+"</a>");
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
                  {"data": "player_team_season.season_stats.games.game_score", "sortable": true, 'orderSequence':["desc"], 'className': 'col-group'},
                  {"data": "player_team_season.season_stats.passing.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.completion_percentage", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.passing_yards_per_game", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.passing.tds", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.passing.ints", "sortable": true, 'visible': false,'className': 'col-group', 'orderSequence':["desc"]},

                  {"data": "player_team_season.season_stats.rushing.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.yards_per_carry", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.rushing_yards_per_game", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.rushing.tds", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.rushing.lng", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.rushing.over_20", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.fumbles.fumbles", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

                  {"data": "player_team_season.season_stats.receiving.yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.season_stats.receiving.receptions", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
                  {"data": "player_team_season.yards_per_catch", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
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
                  {"data": "player_team_season.ratings.defense.man_coverage", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},
                  {"data": "player_team_season.ratings.defense.zone_coverage", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},
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
        }

    async action() {

      const query_to_dict = this.packaged_functions.query_to_dict;
      const navbar = this.packaged_functions.navbar;
      navbar(this.page);

      this.GetPlayerStats();
    }


    DrawPlayerInfo(data, WorldID, PlayerID){
      var div = $(`
        <div class='w3-row-padding' style='text-align: initial;' id='playerinfo-`+PlayerID+`'>
          <div class='w3-col s3'>
            <img class='playerTeamLogo' src-field='playerteamseason__TeamSeasonID__TeamID__TeamLogoURL'  style='width: 80%; height: inherit; margin-left: 0%;'>
            <div class="PlayerFace" style='width: 166px; height: 250px; margin-left: -60%;'>

            </div>
          </div>
          <div class='w3-col s4 vertical-align-middle'>
            <div class=''>
              <div class='playerHeaderInfo'>
                <span data-field="PlayerFirstName" class='playerFirstName'>
                </span>
                <span data-field="PlayerLastName" class='playerLastName' style='margin-top: 0px; margin-bottom: 0px;'>

                </span>
                <div class='playerOverviewInfo'>
                  <a href-field="PlayerTeamHref"><span data-field="playerteamseason__TeamSeasonID__TeamID__TeamName"></span> <span data-field="playerteamseason__TeamSeasonID__TeamID__TeamNickname"></span></a>
                  | #<span data-field="JerseyNumber"></span> | <span data-field="Position"></span>
                </div>
                <div class='playerOverviewInfo italic player-captain'>
                  <span html-field="TeamCaptainIcon"></span><span data-field="TeamCaptain"></span>
                </div>

              </div>
              <ul class='playerHeaderBio' style='border-color:{{playerTeam.TeamColor_Primary_HEX}}'>
                <li class='playerHeaderClass'>
                  <div class='playerHeaderBioDescription'>CLASS</div>
                  <div class="player-class">
                    <span data-field="playerteamseason__ClassID__ClassName"></span><span  html-field="RedshirtIcon"></span>
                  </div>
                </li>
                <li class='playerHeaderHtWt'>
                  <div class='playerHeaderBioDescription'>HT/WT</div>
                  <div><span data-field="HeightFormatted"></span>, <span data-field="WeightFormatted"></span></div>
                </li>
                <li class='playerHeaderHometown'>
                  <div class='playerHeaderBioDescription'>HOMETOWN</div>
                  <div><span data-field="HometownAndState"></span></div>
                </li>
                <li class='playerHeaderHometown'>
                  <div class='playerHeaderBioDescription'>OVR</div>
                  <div><span data-field="playerteamseason__playerteamseasonskill__OverallRating"></span></div>
                </li>
              </ul>

            </div>
          </div>
          <div class='w3-col s5'>
          <div class="w3-row-padding">
                    <div id='' class="w3-bar w3-row-padding player-highlight-info-selection-bar">
                      <button class='w3-button w3-bar-item highlight-tab selected-highlight-tab highlight-ratings-tab' type="button" name="button" id="highlight-ratings-tab">Ratings</button>
                      <button class='w3-button w3-bar-item w3-hide highlight-tab highlight-stats-tab' type="button" name="button" id="highlight-stats-tab">Stats</button>
                      <button class='w3-button w3-bar-item highlight-tab highlight-awards-tab' type="button" name="button" id="highlight-awards-tab">Awards</button>
                      <button class='w3-button w3-bar-item highlight-tab highlight-recruiting-tab' type="button" name="button" id="highlight-recruiting-tab">Recruiting</button>
                      <button class='w3-button w3-bar-item highlight-tab highlight-actions-tab' type="button" name="button" id="highlight-actions-tab">Actions</button>
                    </div>
                  </div>
                  <div class='w3-row-padding'>
                    <div style="width: 100%;" class='player-highlight-info-content'>
                      <div  class="w3-row-padding highlight-ratings">

                      </div>
                      <div class="w3-container w3-hide highlight-stats">
                        stats here
                      </div>
                      <div class="w3-container w3-hide highlight-awards">
                      </div>
                      <div class="w3-container w3-hide highlight-recruiting">
                        recruting here
                      </div>
                      <div class="w3-container w3-hide highlight-actions w3-row-padding">
                        <table class=' w3-table' style='width: 50%;'>
                        </table>
                      </div>
                    </div>
                  </div>
          </div>

        </div>
        `);

      $.ajax({
        url: '/World/'+WorldID+'/Player/'+PlayerID+'/PlayerCardInfo',
        success: function (data) {
          console.log('Ajax return', data);

          $(div,' div.w3-hide.w3-row-padding').removeClass('w3-hide');

          var overrides = {"teamColors":["#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'],"#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'],"#FFF"]}

          $('[css-field="OverallCss"].player-highlight-pills').removeClass('elite').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])


          $.each(data.Skills, function(SkillGroup, SkillObj){
            var Container = $('<div class=" w3-col s4"></div>').appendTo($(div).find('.highlight-ratings'));
            $('<div class="w3-margin-top bold">'+SkillGroup+'</div>').appendTo(Container);
            $.each(SkillObj, function(key, val){
              //$('<div class="inline-block min-width-75" style="margin: 2px 2px; "><div class="font10 width100">'+key+'  </div>  <div class="font20 width100">'+val+'</div></div>').appendTo(Container);
              $(`<div>`+key+`</div>
                <div class="w3-grey w3-round-xlarge statBar inline-block" style='width: 80%;'>
                  <div class="w3-container  w3-round-xlarge   `+NumberToGradeClass(val)+`-Fill" style="width:`+val+`%; height: 8px;"></div>
                </div>
                <span>`+val+`</span>`).appendTo(Container);
            });
          });


          console.log('Awards', data.Awards)

          if (Object.keys(data.Awards).length > 0){
            $('#highlight-awards-tab').removeClass('w3-hide');
            $('<div class=""></div>').appendTo($(div).find( '.highlight-awards'));
            var Container = $('<ul class="w3-ul w3-small"></ul>').appendTo($(div).find('.highlight-awards > div'));
          }
          else {
            console.log('hiding awards tab', $(div).find('.highlight-awards-tab'));
            $(div).find('.highlight-awards-tab').addClass('w3-hide');
            if ($(div).find( '.highlight-awards-tab').hasClass('selected-highlight-tab')){
              $(div).find('.highlight-ratings-tab').click()
            }
          }

          $.each(data.Awards, function(AwardName, AwardCount){
            console.log('AwardName, AwardCount', AwardName, AwardCount, Container)
            $('<li>'+AwardCount+'x '+AwardName+' </li>').appendTo(Container);

          });

          if (Object.keys(data.Stats).length > 0){
            $(div).find('.highlight-stats-tab').removeClass('w3-hide');
          }
          else {
            $(div).find('.highlight-stats-tab').addClass('w3-hide');
            if ($(div).find('.highlight-stats-tab').hasClass('selected-highlight-tab')){
              $(div).find('.highlight-ratings-tab').click()
            }
          }


          if (Object.keys(data.Actions).length > 0){
            $(div).find('.highlight-actions-tab').removeClass('w3-hide');
            var Container = $(div).find('.highlight-actions table')
          }
          else {
            $(div).find('.highlight-actions-tab').addClass('w3-hide');
            if ($(div).find('.highlight-actions-tab').hasClass('selected-highlight-tab')){
              $(div).find('.highlight-ratings-tab').click()
            }
          }

          $.each(data.Actions, function(ActionCount, Action){
            console.log('ActionName, Action', ActionCount, Action, Container)

            $(`<tr>
                <td style='width:10%;'>`+Action.Icon+`</td>
                <td confirm-info='`+Action.ConfirmInfo+`' response-type='refresh' background-ajax='`+Action.AjaxLink+`' class="w3-button `+Action.Class+` text-left"> `+Action.Display+` </td>
              </tr>`).appendTo(Container);
          });


          $.each(data.Stats, function(StatGroup, StatObj){
            var Container = $('<div class=""></div>').appendTo($(div).find('.highlight-stats'));
            $('<div class="w3-margin-top">'+StatGroup+'</div>').appendTo(Container);
            $('<div class="width100" style="width: 100%;"><table class="tiny highlight-stat-statgroup-'+StatGroup+'" style="width: 100%;"></table> </div>').appendTo(Container);

            var columnNames = Object.keys(StatObj[0]);
            var columns = [];
            for (var i in columnNames) {
              columns.push({data: columnNames[i],
                            title: columnNames[i]});
            }

            console.log("$(div).find('.highlight-stat-statgroup-'+StatGroup)", $(div).find('.highlight-stat-statgroup-'+StatGroup))
            var table = $(div).find('.highlight-stat-statgroup-'+StatGroup).DataTable({
              data: StatObj,
              columns: columns,
              dom: 't',

            });

            $('.highlight-tab').on('click', function(){
              table.columns.adjust().draw();
            })
          });

          $.each(data, function(key, val){

            if (key == 'PlayerFaceSVG'){
              var elem = $(div).find('.PlayerFace');
              elem = elem[0];
              $(elem).empty();
              $(elem).html(data['PlayerFaceSVG'])
            }
            else {
              $(div).find('[html-field="'+key+'"]').html(val);
              $(div).find('[data-field="'+key+'"]').text(val);
              $(div).find('[src-field="'+key+'"]').attr('src', val);
              $(div).find('[href-field="'+key+'"]').attr('href',val);
              $(div).find('[width-field="'+key+'"]').css('width', val + '%');
              $(div).find('[class-grade-field="'+key+'"]').addClass( NumberToGradeClass(val) + '-Fill');

            }
          });

          $(div).find('.highlight-tab').on('click', function(event, target) {

            var ClickedTab = $(event.target)
            var ClickedTabContent = ClickedTab.attr('id').replace('-tab', '');
            var ClickedTabParent = ClickedTab.closest('.player-highlight-info-selection-bar');

            $.each($(ClickedTabParent).find(' .selected-highlight-tab'), function(index, tab){
              var TargetTab = $(tab);
              $(TargetTab).removeClass('selected-highlight-tab');
              var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
              $(div).find('.'+TargetTabContent).addClass('w3-hide');

            });

            $(ClickedTab).addClass('selected-highlight-tab');
            $(div).find( '.'+ClickedTabContent).removeClass('w3-hide')

          });
        }
      });



      return div;
    }

}
