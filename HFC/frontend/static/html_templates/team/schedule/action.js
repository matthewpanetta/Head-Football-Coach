
    const getHtml = async(common) => {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(common.params.team_id);
      const db = common.db;
      const query_to_dict = common.query_to_dict;

      const NavBarLinks = await common.nav_bar_links({
        path: 'Schedule',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await common.team_header_links({
        path: 'Schedule',
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

      const weeks = await query_to_dict(await db.week.where({season: 2021}).toArray(), 'one_to_one','week_id');
      console.log('weeks', weeks)

      const team = await db.team.get({team_id: team_id})
      const team_season = await db.team_season.get({team_id: team_id, season: 2021});

      team.team_season = team_season;

      var team_games = await db.team_game.where({team_season_id: team_season.team_season_id}).toArray();
      team_games = team_games.sort(function(team_game_a,team_game_b){
        return team_game_a.week_id - team_game_b.week_id;
      });
      const game_ids = team_games.map(game => parseInt(game.game_id));

      const games = await db.game.bulkGet(game_ids);

      console.log('team_games', team_games)

      const opponent_team_game_ids = team_games.map(team_game => team_game.opponent_team_game_id);
      console.log('opponent_team_game_ids', opponent_team_game_ids)
      const opponent_team_games = await db.team_game.bulkGet(opponent_team_game_ids);

      const opponent_team_season_ids = opponent_team_games.map(team_game => parseInt(team_game.team_season_id));
      const opponent_team_seasons = await db.team_season.bulkGet(opponent_team_season_ids);

      const opponent_team_ids = opponent_team_seasons.map(team_season => parseInt(team_season.team_id));
      const opponent_teams = await db.team.bulkGet(opponent_team_ids);

      console.log('opponent_teams', opponent_teams, opponent_team_seasons, opponent_team_games)
      var counter_games = 0;
      const pop_games = await $.each(games, async function(ind, game){
        game.week = weeks[game.week_id]

        game.team_game = team_games[counter_games];
        game.opponent_team_game = opponent_team_games[counter_games];
        game.opponent_team_game.team_season = opponent_team_seasons[counter_games];
        game.opponent_team_game.team_season.team = opponent_teams[counter_games];


        game.game_display = 'Preview'
        game.game_outcome_letter = ''
        game.overtime_display = ''
        if (game.was_played){
          game.game_display = `${game.home_team_score} - ${game.away_team_score}`;

          if (game.home_team_score > game.away_team_score){
            game.game_outcome_letter = 'W'
          }
        }

        if (game.home_team_season_id == team.team_season.team_season_id){
          game.game_location = 'home'
          game.game_location_char = 'vs.'
          game.home_team_game = game.team_game;
          game.away_team_game = game.opponent_team_game;

        }
        else {
          game.game_location = 'away';
          game.game_location_char = '@'
          game.away_team_game = game.team_game;
          game.home_team_game = game.opponent_team_game;
        }

        game.selected_game_box = '';
        if (counter_games == 0){
          game.selected_game_box = 'SelectedGameBox';
        }

        game.opponent_rank_string = game.opponent_team_game.team_season.national_rank_display;

        counter_games +=1;
        console.log('game', game)

      });


      var conference_season = await db.conference_season.get({conference_season_id: team.team_season.conference_season_id})  ;
      var conference = await db.conference.get({conference_id: conference_season.conference_id})  ;

      var team_seasons_in_conference = await db.team_season.where({season: 2021}).toArray();
      team_seasons_in_conference = team_seasons_in_conference.filter(team_season => team_season.conference_season_id == team.team_season.conference_season_id).sort(function(teamA,teamB){
        return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
      });

      var team_ids = team_seasons_in_conference.map(team_season => team_season.team_id);
      var teams = await db.team.bulkGet(team_ids);
      var team_counter = 0;
      $.each(team_seasons_in_conference, function(ind, team_season){
        team_season.team = teams[team_counter];
        team_counter +=1;
      })


      common.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     common.page,
                            world_id: common.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            games: games,
                            teams: teams,
                            conference_standings: team_seasons_in_conference
                          }

      common.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team/schedule/template.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

      $('#body').html(renderedHtml);
    }

    const PopulateTeamSchedule = (common) => {
      console.log(' in PopulateTeamSchedule', common.render_content);
      var games = common.render_content.games;

      var ScheduleTable = $('#TeamSchedule').DataTable({
        'searching': false,
        'paging': false,
        'info': false,
        'ordering': false,
        "pageLength": 25,
        "data": games,
         "columns": [
           {"data": null, "sortable": true, 'className': 'center-text','visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
             $(td).html(`<span>${game.week.week_name}</span>`)
             $(td).attr('style', 'color: white; width: 70px; background-color: #' + game.opponent_team_game.team_season.team.team_color_primary_hex);
           }},
           {"data": null, "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(" ");
               $(td).append(`<img class='worldTeamLogo' src='${game.opponent_team_game.team_season.team.team_logo}'/>`);
               $(td).attr('style', 'color: white; width: 10px; background-color: #' + game.opponent_team_game.team_season.team.team_color_primary_hex);

           }},
           {"data": null, "sortable": true, 'visible': true,'className': 'column-med', 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html("<span></span> ");
               $(td).append(`<span class='font10'>${game.opponent_team_game.team_season.national_rank_display}</span> `); //TODO SWITCH TO CORRECT WEEK RANK
               $(td).append(`<a href='${game.opponent_team_game.team_season.team.team_href}'>${game.opponent_team_game.team_season.team.school_name}</a>`);
               $(td).append(` <span class="font10">${game.opponent_team_game.team_season.record_display}</span>`);

           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span class='${game.game_outcome_letter}'>${game.game_outcome_letter}</span>
                           <span>
                             <a href='${game.game_href}'>${game.game_display}</a>
                             ${game.overtime_display}
                           </span>`);
           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span>${game.team_game.record.wins} - ${game.team_game.record.losses} (${game.team_game.record.conference_wins} - ${game.team_game.record.conference_losses})</span>`);
           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span></span>`);
           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span></span>`);
           }},

           // TODO add player stats
           // {"data": "TopPlayerStats", "sortable": true, 'className': 'hide-small','visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
           //   if (TopPlayerStats.length > 0){
           //     $(td).html(`
           //        <span>`+TopPlayerStats[0].PlayerPosition+`</span>
           //        <a href='`+TopPlayerStats[0].PlayerHref+`'>`+TopPlayerStats[0].PlayerName+`</a>
           //        <span>`+TopPlayerStats[0].PlayerTeam+`</span>
           //        <ul class='no-list-style'>
           //          <li>`+TopPlayerStats[0].PlayerStats[0]+`</li>
           //          <li>`+TopPlayerStats[0].PlayerStats[1]+`</li>
           //        </ul>
           //      `);
           //    }
           // }},
           // {"data": "TopPlayerStats", "sortable": true, 'className': 'hide-medium','visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
           //   if (TopPlayerStats.length > 0 ){
           //     $(td).html(`
           //        <span>`+TopPlayerStats[1].PlayerPosition+`</span>
           //        <a href='`+TopPlayerStats[1].PlayerHref+`'>`+TopPlayerStats[1].PlayerName+`</a>
           //        <span>`+TopPlayerStats[1].PlayerTeam+`</span>
           //        <ul class='no-list-style'>
           //          <li>`+TopPlayerStats[1].PlayerStats[0]+`</li>
           //          <li>`+TopPlayerStats[1].PlayerStats[1]+`</li>
           //        </ul>
           //      `);
           //    }
           // }},
         ],
      });
    }



    const action = async (common) => {

      const query_to_dict = common.query_to_dict;
      PopulateTeamSchedule(common);
    }



    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Team/:team_id/Schedule/');

      await getHtml(common);
      await action(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
