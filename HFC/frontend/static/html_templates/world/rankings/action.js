
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Rankings',
        group_name: 'World',
        db: db
      });

      var teams = await db.team.toArray();
      var conferences = await index_group(await db.conference.toArray(), 'one_to_one','conference_id');
      var conference_seasons = await index_group(await db.conference_season.where({season: 2021}).toArray(), 'one_to_one','conference_season_id');
      var team_seasons = await index_group(await db.team_season.where({season: 2021}).toArray(), 'one_to_one','team_id');
      var distinct_team_seasons = [];

      $.each(teams, async function(ind, team){
        team.team_season =team_seasons[team.team_id]
        team.team_season.conference_season = conference_seasons[team.team_season.conference_season_id];
        team.team_season.conference_season.conference = conferences[team.team_season.conference_season.conference_id];

      });

      dropped_teams = teams.filter(team => team.team_season.rankings.national_rank[0] > 25 && team.team_season.rankings.national_rank[1] <= 25);
      bubble_teams = teams.filter(team => team.team_season.rankings.national_rank[0] > 25 && team.team_season.rankings.national_rank[0] < 29);

      teams = teams.filter(team => team.team_season.rankings.national_rank[0] <= 25);

      teams.sort(function(a, b) {
          if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0]) return -1;
          if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
          return 0;
        });

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            dropped_teams: dropped_teams,
                            bubble_teams: bubble_teams

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/rankings/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;

      PopulateTop25(common);
/*
        LastWeekGameDict = {}
        LastWeekGameList = TeamGame.objects.filter(WorldID = WorldID).filter(GameID__WeekID = LastWeek).values('Points', 'TeamSeasonID__TeamID').annotate(
            OpponentPoints = Subquery(TeamGame.objects.filter(GameID =OuterRef('GameID')).exclude(TeamGameID=OuterRef('pk')).values('TeamGameID').annotate(OpponentPoints=Max('Points')).values('OpponentPoints')),
            WinLossLetter = Case(
                When(IsWinningTeam = True, then=Value('W')),
                default=Value('L'),
                output_field=CharField()
            ),
            VsAtLetter = Case(
                When(IsHomeTeam = True, then=Value('vs.')),
                default=Value('@'),
                output_field=CharField()
            ),
            OpponentTeamName = F('OpposingTeamSeasonID__TeamID__TeamName'),
            Text = Value('', output_field=CharField()),
            OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('OpposingTeamSeasonID__TeamID'), output_field=CharField()),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
            OpponentNationalRank = Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID =OuterRef('OpposingTeamSeasonID')).filter(WeekID=TwoWeeksAgo).values('NationalRank')),
            OpponentNationalRankDisplay =  Case(
                When(OpponentNationalRank__gt = 25, then=Value('')),
                default=(Concat(Value('(') , F('OpponentNationalRank'), Value(')'), output_field=CharField())),
                output_field = CharField()
            ),
        )
        for TG in LastWeekGameList:
            LastWeekGameDict[TG['TeamSeasonID__TeamID']] = TG

        ThisWeekGameDict = {}
        ThisWeekGameList = TeamGame.objects.filter(WorldID = WorldID).filter(GameID__WeekID = CurrentWeek).values('Points', 'TeamSeasonID__TeamID').annotate(
            OpponentPoints = Subquery(TeamGame.objects.filter(GameID =OuterRef('GameID')).exclude(TeamGameID=OuterRef('pk')).values('TeamGameID').annotate(OpponentPoints=Max('Points')).values('OpponentPoints')),
            WinLossLetter = Case(
                When(IsWinningTeam = True, then=Value('W')),
                default=Value('L'),
                output_field=CharField()
            ),
            VsAtLetter = Case(
                When(IsHomeTeam = True, then=Value('vs.')),
                default=Value('@'),
                output_field=CharField()
            ),
            OpponentTeamName = F('OpposingTeamSeasonID__TeamID__TeamName'),
            Text = Value('', output_field=CharField()),
            OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('OpposingTeamSeasonID__TeamID'), output_field=CharField()),
            GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('GameID'), output_field=CharField()),
            OpponentNationalRank = Subquery(TeamSeasonWeekRank.objects.filter(TeamSeasonID =OuterRef('OpposingTeamSeasonID')).filter(WeekID=LastWeek).values('NationalRank')),
            OpponentNationalRankDisplay =  Case(
                When(OpponentNationalRank__gt = 25, then=Value('')),
                default=(Concat(Value('(') , F('OpponentNationalRank'), Value(')'), output_field=CharField())),
                output_field = CharField()
            ),
        )
        for TG in ThisWeekGameList:
            ThisWeekGameDict[TG['TeamSeasonID__TeamID']] = TG


        for T in TopTeams:
            LWG = None
            TWG = None
            TeamID = T['TeamSeasonID__TeamID']

            if TeamID in ThisWeekGameDict:
                TWG = ThisWeekGameDict[TeamID]
            if TeamID in LastWeekGameDict:
                LWG = LastWeekGameDict[TeamID]


            if LWG is None:
                T['LastWeekGame'] = 'BYE'
            else:
                T['LastWeekGame'] = LWG

            if TWG is None:
                T['ThisWeekGame'] = 'BYE'
            else:
                T['ThisWeekGame'] = TWG

                */

    }


    const DrawTeamInfo = async (data, WorldID, SelectedTeamID) => {
      var div = $(`
        <div class="w3-row-padding">
          <div class='w3-col s3'>
            <img src="" src-field='TeamLogoURL' alt="" class='width100'>
          </div>
          <div class="w3-col s9 column-flex" >
            <div class="w3-row-padding" >

                <div class='w3-col s7 vertical-align-middle'>
                  <div>
                    <span class='thin-font font32 margin-right-4' data-field="NationalRankDisplay"></span>
                    <span class='minor-bold font32 margin-right-4' data-field='TeamName'></span>
                    <span class=' font32' data-field='TeamNickname' ></span>
                  </div>
                  <div>
                    <span class='font12' data-field='CityAndState'></span> | <span class='font12' data-field='DivisionSeasonID__ConferenceSeasonID__ConferenceID__ConferenceName'></span>
                  </div>
                </div>
                <div class='w3-col s5 hide-medium vertical-align-middle'>
                  <div class="w3-row-padding center-text">
                    <div class='w3-col s4'>
                      <div class=' font32' data-field="TeamOverallRating_Grade">
                      </div>
                      <div class=' font16'>
                        Overall
                      </div>
                    </div>
                    <div class='w3-col s4'>
                      <div class=' font32' data-field="TeamOffenseRating_Grade">
                      </div>
                      <div class=' font16'>
                        Offense
                      </div>
                    </div>
                    <div class='w3-col s4'>
                      <div class=' font32' data-field="TeamDefenseRating_Grade">
                      </div>
                      <div class=' font16'>
                        Defense
                      </div>
                    </div>
                  </div>

                </div>

            </div>
            <div class="w3-row-padding hide-medium">
              <div class="w3-col s6 w3-row-padding  ">
                <table class='width80'>
                  <tbody>
                    <tr>
                      <th colspan="3" class='center-text font24'>Offense</th>
                    </tr>
                    <tr>
                      <td rowspan="3" class='font32 center-text team-highlight-stat-padding bold font-black'  ordinal-field="PPG_Rank">12th</td>
                      <td data-field="PPG" class='right-text team-highlight-stat-padding'>42</td>
                      <td>PPG</td>
                    </tr>
                    <tr>
                      <td data-field="PassYPG" class='right-text team-highlight-stat-padding'>120</td>
                      <td>Pass YPG</td>
                    </tr>
                    <tr>
                      <td data-field="RushYPG" class='right-text team-highlight-stat-padding'>110</td>
                      <td>Rush YPG</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="w3-col s6 w3-row-padding ">
                <table class='width80 '>
                  <tbody>
                    <tr>
                      <th colspan="3" class='center-text font24'>Defense</th>
                    </tr>
                    <tr>
                      <td rowspan="3" class='font32 center-text team-highlight-stat-padding bold font-black'  ordinal-field="PAPG_Rank">12th</td>
                      <td data-field="PAPG" class='right-text team-highlight-stat-padding'>42</td>
                      <td>PPG</td>
                    </tr>
                    <tr>
                      <td data-field="OpponentPassYPG" class='right-text team-highlight-stat-padding'>120</td>
                      <td>Pass YPG</td>
                    </tr>
                    <tr>
                      <td data-field="OpponentRushYPG" class='right-text team-highlight-stat-padding'>110</td>
                      <td>Rush YPG</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
        `);

      $.ajax({
        url: '/World/'+WorldID+'/Team/'+SelectedTeamID+'/TeamCardInfo',
        success: function (data) {
          console.log('Ajax return', data);

          $(div).find('div.w3-hide').removeClass('w3-hide');

          $.each(data, function(key, val){

            $(div).find('[data-field="'+key+'"]').text(val);
            $(div).find('[ordinal-field="'+key+'"]').text(ordinal_suffix_of(val));
            $(div).find('[src-field="'+key+'"]').attr('src', val);

          });
        }
      });

      return div;
    }


    const PopulateTop25 = async (common) => {

      const db = common.db;
      const index_group = common.index_group;

      var this_week = await db.week.where({season: 2021}).toArray();
      console.log('this_week', this_week)
      this_week = this_week.filter(week => week.is_current)[0];
      const this_week_id = this_week.week_id;
      const last_week_id = this_week_id-1;

      var top_25_team_seasons = await db.team_season.where({season:2021}).toArray();
      console.log('top_25_team_seasons', top_25_team_seasons)
      top_25_team_seasons = top_25_team_seasons.filter(ts => ts.rankings.national_rank[0] <= 25).sort(function(a, b) {
          if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;
          if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
          return 0;
        });;
      const team_ids = top_25_team_seasons.map(ts => ts.team_id);
      const teams = await db.team.bulkGet(team_ids);

      const this_week_team_games = await index_group(await db.team_game.where({week_id: this_week_id}).toArray(), 'one_to_one','team_season_id');
      const last_week_team_games = await index_group(await db.team_game.where({week_id: last_week_id}).toArray(), 'one_to_one','team_season_id');

      const total_team_games = Object.values(this_week_team_games).concat(Object.values(last_week_team_games));
      const total_team_game_ids = total_team_games.map(team_game => team_game.game_id);

      const games = await index_group(await db.game.bulkGet(total_team_game_ids), 'one_to_one','game_id');

      const all_teams = await index_group(await db.team.toArray(), 'index','team_id');
      const all_team_games = await index_group(await db.team_game.where('week_id').anyOf([this_week_id, last_week_id]).toArray(), 'index','team_game_id');
      const all_team_seasons = await index_group(await db.team_season.where({season: 2021}).toArray(), 'index','team_season_id');

      const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: 2021}).toArray(), 'index','conference_season_id');
      const conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index','conference_id');

      var team_counter = 0;
      $.each(top_25_team_seasons, function(ind, team_season){
        team_season.team = teams[team_counter];
        team_season.national_rank = team_season.rankings.national_rank[0];

        team_season.conference_season = conference_seasons_by_conference_season_id[team_season.conference_season_id]
        team_season.conference = conferences_by_conference_id[team_season.conference_season.conference_id]

        team_counter +=1;
        if (team_season.team_season_id in this_week_team_games) {
          team_season.this_week_team_game = this_week_team_games[team_season.team_season_id];
          team_season.this_week_team_game.game = games[team_season.this_week_team_game.game_id];

          team_season.this_week_team_game.opponent_team_season = all_team_seasons[team_season.this_week_team_game.opponent_team_season_id];
          team_season.this_week_team_game.opponent_team_game = all_team_games[team_season.this_week_team_game.opponent_team_game_id];
          team_season.this_week_team_game.opponent_team = all_teams[team_season.this_week_team_game.opponent_team_season.team_id];

          if (team_season.this_week_team_game.is_home_team == true){
            team_season.this_week_team_game.game_location = 'home'
            team_season.this_week_team_game.game_location_char = 'vs.'
          }
          else {
            team_season.this_week_team_game.game_location = 'home'
            team_season.this_week_team_game.game_location_char = 'vs.'
          }
        }
        else {
          team_season.this_week_team_game = null;
        }


        if (team_season.team_season_id in last_week_team_games) {
          team_season.last_week_team_game = last_week_team_games[team_season.team_season_id];
          team_season.last_week_team_game.game = games[team_season.last_week_team_game.game_id];

          team_season.last_week_team_game.opponent_team_season = all_team_seasons[team_season.last_week_team_game.opponent_team_season_id];
          team_season.last_week_team_game.opponent_team_game = all_team_games[team_season.last_week_team_game.opponent_team_game_id];
          team_season.last_week_team_game.opponent_team = all_teams[team_season.last_week_team_game.opponent_team_season.team_id];

          if (team_season.last_week_team_game.is_home_team == true){
            team_season.last_week_team_game.game_location = 'home'
            team_season.last_week_team_game.game_location_char = 'vs.'
          }
          else {
            team_season.last_week_team_game.game_location = 'home'
            team_season.last_week_team_game.game_location_char = 'vs.'
          }
        }
        else {
          team_season.last_week_team_game = null;
        }
      });

      console.log('In PopulateTopTeams!', top_25_team_seasons)


      var table = $('#Top25Table').DataTable({
          "dom": 'rt',
          fixedHeader: true,
          //"serverSide": true,
          "filter": false,
          "ordering": true,
          "pageLength": 25,
          "lengthChange" : false,
          "pagingType": "full_numbers",
          "paginationType": "full_numbers",
          "data": top_25_team_seasons,
          "columns": [
            {"data": 'national_rank', "sortable": true, 'className': 'center-text ', 'searchable': true,"fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
              //console.log('teamseason', team_season.rankings.national_rank[0], team_season);
                $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color: white; width: 3px;` );
                $(td).addClass(' Top25RankNumber ').addClass('center-text')
                $(td).html('<div>'+team_season.rankings.national_rank[0]+'</div>')
            }},
            {"data": 'team.full_name', "searchable": false, "sortable": false,"fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
              $(td).attr('style', `background-color: #${team_season.team.team_color_primary_hex}; color: white; width: 70px;` );
              $(td).html(`<a href='${team_season.team.team_href}'><img class='worldTeamLogo' src='${team_season.team.team_logo}'/></a>`);
            }},

            {"data": 'team.full_name', "searchable": true, "className": 'column-med', "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
              //$(td).html(`<a style='width: 100%;' href='${team_season.team.team_href}'>${team_season.team.full_name}</a>`)
                $(td).parent().attr('TeamID', team_season.team_id);

                $(td).html(`<ul class='no-list-style'>
                  <li>
                    <a  class='font14' href="${ team_season.team.team_href }">
                      <span>${ team_season.team.school_name } <span class='hide-small'>${ team_season.team.team_name }</span></span>
                    </a>
                  </li>
                  <li class='font10'>${team_season.rankings.division_rank[0]} in ${team_season.conference.conference_abbreviation}</li>
                </ul>`)
              }},
              {"data": "rankings.national_rank_delta", "sortable": true, 'className': 'center-text hide-small', 'orderSequence':["desc", 'asc'], "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {

                if (team_season.rankings.national_rank_delta > 0){
                  $(td).html(`
                    <div class="font14 W">
                      <span><i class="fas fa-angle-up"></i></span>
                      ${team_season.rankings.national_rank_delta_abs}
                    </div>
                    <div class='font10'>Prev: <span class='bold'>${team_season.rankings.national_rank[1]}</span></div>
                    `);
                }
                else if (team_season.rankings.national_rank_delta < 0) {
                  $(td).html(`
                    <div class="font14 L">
                      <span><i class="fas fa-angle-down"></i></span>
                      ${team_season.rankings.national_rank_delta_abs}
                    </div>
                    <div class='font10'>Prev: <span class='bold'>${team_season.rankings.national_rank[1]}</span></div>`);
                  }
                  else {
                    $(td).html('-')
                  }
              }},
              {"data": "record.wins", "sortable": true, 'className': 'center-text hide-small', 'orderSequence':["desc", "asc"], "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                  $(td).html(`<div class="font14">${team_season.record_display}</div>`)
              }},
              {"data": null, "sortable": false, "className": 'column-med', 'searchable': true, "fnCreatedCell": function (td, StringValue, team_season, iRow, iCol) {
                if (team_season.last_week_team_game == null){
                  $(td).html('BYE')
                }
                else{
                  $(td).html('<div></div>');
                  $(td).find('div').append(`<a href="${team_season.last_week_team_game.game.game_href}">${team_season.last_week_team_game.points} - ${team_season.last_week_team_game.opponent_team_game.points}</a>`)
                  $(td).find('div').append(`<span class="W-L-badge ${team_season.last_week_team_game.game_outcome_letter}">${team_season.last_week_team_game.game_outcome_letter}</span>`);
                  $(td).find('div').append(`<span class="hide-small"> ${team_season.last_week_team_game.game_location_char} </span><a class="hide-small" href="${team_season.last_week_team_game.opponent_team.team_href}">${team_season.last_week_team_game.opponent_team_game.national_rank_display} ${team_season.last_week_team_game.opponent_team.school_name}</a>`);
                }
              }},
              {"data": null, "sortable": false, 'searchable': true, 'className': 'hide-small column-med', "fnCreatedCell": function (td, ThisWeekObject, team_season, iRow, iCol) {
                if (team_season.this_week_team_game == null){
                  $(td).html('BYE')
                }
                else{
                  $(td).html(`<span class="hide-small"> ${team_season.this_week_team_game.game_location_char} </span><a class="hide-small" href="${team_season.this_week_team_game.opponent_team.team_href}">${team_season.this_week_team_game.opponent_team_season.national_rank_display} ${team_season.this_week_team_game.opponent_team.school_name}</a>`);
                }
              }},
              {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},

          ],
        //  'order': [[ 0, "asc" ]],
      });


      $('#Top25Table tbody').on('click', '.details-control', function () {
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

            var teamcolor = data.TeamSeasonID__TeamID__TeamColor_Primary_HEX;
            childrow.find('td').css('border-left-color', teamcolor)
            //childrow.css('background-color', '#'+teamcolor+'33');

            tr.addClass('shown');
        }


      })

      $(function() {
        var $sidebar   = $("#teamHighlight"),
            $window    = $(window),
            offset     = $sidebar.offset(),
            topPadding = 15;

        $window.scroll(function() {
            if ($window.scrollTop() > offset.top) {
                $sidebar.stop().animate({
                    marginTop: $window.scrollTop() - offset.top + topPadding
                });
            } else {
                $sidebar.stop().animate({
                    marginTop: 0
                });
            }
        });

    });


        $('.highlight-tab').on('click', function(event, target) {

          var ClickedTab = $(event.target)
          var ClickedTabContent = ClickedTab.attr('id').replace('-tab', '');
          var ClickedTabParent = ClickedTab.closest('#player-highlight-info-selection-bar').attr('id');

          $.each($('#'+ClickedTabParent+' > .selected-highlight-tab'), function(index, tab){
            var TargetTab = $(tab);
            $(TargetTab).removeClass('selected-highlight-tab');
            var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
            $('#'+TargetTabContent).addClass('w3-hide');
            var TargetTabParent = TargetTab.closest('#player-highlight-info-selection-bar').attr('id');

          });

          $(ClickedTab).addClass('selected-highlight-tab');
          $('#'+ClickedTabContent).removeClass('w3-hide')

        });
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Ranking/');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
