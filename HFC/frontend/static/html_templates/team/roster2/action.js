
    const getHtml = async (common) => {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(common.params.team_id);
      const season = common.season;
      const db = common.db;
      const query_to_dict = common.query_to_dict;

      var class_sort_order_map = {
          'FR': 1,
          'FR (RS)': 1.5,
          'SO': 2,
          'SO (RS)': 2.5,
          'JR': 3,
          'JR (RS)': 3.5,
          'SR': 4,
          'SR (RS)': 4.5,
        };

        var position_sort_order_map = {
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

      const NavBarLinks = await common.nav_bar_links({
        path: 'Roster',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await common.team_header_links({
        path: 'Roster2',
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

      const player_team_seasons = await db.player_team_season.where({team_season_id: team_season.team_season_id}).toArray();
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);

      const player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);

      const player_team_season_games = await query_to_dict(await db.player_team_game.where({player_team_season_id: player_team_season_ids}).toArray(), 'many_to_one', 'player_team_season_id' );

      var player_counter = 0;
      $.each(player_team_seasons, function(ind,player_team_season){
        team_season.team = team;
        player_team_season.team_season = team_season;
        player_team_season.player_team_games = player_team_season_games[player_team_season.player_team_season_id];

        player_team_season.class_sort_order = class_sort_order_map[player_team_season.class.class_name]
        player_team_season.position_sort_order = position_sort_order_map[player_team_season.position]

        players[player_counter].player_team_season = player_team_season;

        player_counter +=1;

      });


      common.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     common.page,
                            world_id: common.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            players: players,
                            all_teams: await common.all_teams(common, '/Roster2/'),
                            teams: teams,
                          }

      common.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team/roster2/template.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

      $('#body').html(renderedHtml)

    }

      const player_sorter = (common, players, sorted_columns) => {
        players = players.map(p => Object.assign(p, {sort_value: common.get_from_dict(p, sort_column_obj.key)}))
        for(player of players){
            player.sort_vals = {};
            for (sort_column_obj of sorted_columns ){
              player.sort_vals[sort_column_obj.key] = common.get_from_dict(player, sort_column_obj.key);
            }
          }  


        return players.sort(function(p_a, p_b) {
          for (sort_column_obj of sorted_columns){
            if (p_b.sort_vals[sort_column_obj.key] != p_a.sort_vals[sort_column_obj.key]){
              if (sort_column_obj.sort_direction == 'sort-asc'){
                return (p_b.sort_vals[sort_column_obj.key] < p_a.sort_vals[sort_column_obj.key]) ? 1 : -1;
              }
              else {
                return (p_b.sort_vals[sort_column_obj.key] > p_a.sort_vals[sort_column_obj.key]) ? 1 : -1;
              }
            }
          }
          return 0;
        });
      }

        const GetPlayerStats = async (common) => {

          var url = '/static/html_templates/team/roster2/player_table_template.html'
          if (common.GetPlayerStats_html_text == undefined){
            common.GetPlayerStats_html = await fetch(url);
            common.GetPlayerStats_html_text = await common.GetPlayerStats_html.text();
          }

          var sorted_columns = common.sorted_columns || [];

          sorted_columns.push({key: 'player_id', sort_direction: 'sort-asc'});

          var players = common.render_content.players;
          var players_by_player_id = index_group_sync(players, 'index', 'player_id');

          players = players.sort((p_a, p_b) => p_a.player_id - p_b.player_id);
          

          var renderedHtml = await common.nunjucks_env.renderString(common.GetPlayerStats_html_text, {players:players, page:common.page})

          $('#player-stats-table-container').empty();
          $('#player-stats-table-container').append(renderedHtml);

          let football_table_body = $('.football-table-body').eq(0);
          let football_table_rows_map = {};
          $('.football-table-row').each(function(ind, row){
            
            football_table_rows_map[$(row).attr('player_id')] = row;

            console.log({row:row, id: $(row).attr('player_id'), val: football_table_rows_map[$(row).attr('player_id')]})
          })

          let column_counter = 1;
          $('.football-table-column-headers th').each(function(){
            for (sort_column_obj of sorted_columns){
              if ($(this).attr('value-key') == sort_column_obj.key){
                $(this).addClass(sort_column_obj.sort_direction);

                $('.football-table-content col:nth-child('+column_counter+')').css('background-color', '#efefef')
              }
            }
            column_counter +=1;
          })

          $('.football-table-column-headers th').on('click', function(e){
            let target_new_class = $(e.target).attr('sort-order') || 'sort-desc';
            if ($(e.target).hasClass('sort-desc')){
              target_new_class = 'sort-asc';
            }
            else if ($(e.target).hasClass('sort-asc')){
              target_new_class = 'sort-desc';
            }

            if (!(e.shiftKey)){
              sorted_columns = [];
              $('.football-table-column-headers th').removeClass('sort-desc');
              $('.football-table-column-headers th').removeClass('sort-asc');
            }

            let sort_direction = target_new_class;

            $(e.target).addClass(sort_direction);
            sorted_columns.push({key: $(e.target).attr('value-key'), sort_direction: sort_direction})
 

            var sorted_players = player_sorter(common, players, sorted_columns);

            var player_rows = sorted_players.map(p => football_table_rows_map[p.player_id]);

            console.log({player_rows:player_rows, e:e, index: $(this).index(), football_table_rows_map:football_table_rows_map, football_table_body:football_table_body, sorted_players:sorted_players})

            for (var i = 0; i < player_rows.length; i++){football_table_body.append(player_rows[i])}

           
          })





          //   var PositionGroupMap = {
          //       'QB': 'Offense',
          //       'RB': 'Offense',
          //       'FB': 'Offense',
          //       'WR': 'Offense',
          //       'TE': 'Offense',
          //       'OT': 'Offense',
          //       'IOL': 'Offense',
          //       'EDGE': 'Defense',
          //       'DL': 'Defense',
          //       'LB': 'Defense',
          //       'CB': 'Defense',
          //       'S': 'Defense',
          //       'K': 'Special Teams',
          //       'P': 'Special Teams',
          //   };


        }

    const action = async (common) => {

      GetPlayerStats(common);
    }


    const DrawPlayerInfo = (data, WorldID, PlayerID) => {
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


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Team/:team_id/Roster2/');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
