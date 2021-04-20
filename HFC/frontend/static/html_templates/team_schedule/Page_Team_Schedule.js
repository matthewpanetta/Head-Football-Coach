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
        path: 'Schedule',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await this.packaged_functions.team_header_links({
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
        game.game_result_letter = ''
        if (game.was_played){
          game.game_display = `${game.home_team_score} - ${game.away_team_score}`;

          if (game.home_team_score > game.away_team_score){
            game.game_result_letter = 'W'
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


      this.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     this.page,
                            world_id: this.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            games: games,
                            teams: teams,
                            conference_standings: team_seasons_in_conference
                          }

      this.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team_schedule.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await this['packaged_functions']['nunjucks_env'].renderString(html, render_content)

      return renderedHtml;
    }


    navbar(){
        const page = this.page;
        $('.nav-tab-button').on('click', function(event, target) {

          if ($(this).attr('id') == 'nav-sidebar-tab'){
            $('#sidebar').addClass('sidebar-open');
            $('.sidebar-fade').addClass('sidebar-fade-open');
            $('.sidebar-fade-open').on('click', function(){
                $(this).removeClass('sidebar-fade-open');
                $('#sidebar').removeClass('sidebar-open');
            });
            return false;
          }

          var ClickedTab = $(event.target)[0];
          $.each($('.selected-tab'), function(index, tab){
            var TargetTab = $(tab);
            $(TargetTab).css('backgroundColor', '');
            $(TargetTab).removeClass('selected-tab');
          });

          $(ClickedTab).addClass('selected-tab');
          $(ClickedTab).css('background-color', '#'+page.SecondaryColor);


          var NewTabContent = $('#' + $(this).attr('id').replace('-tab', ''))[0];

          $.each($('.tab-content'), function(index, OldTabContent){
            $(OldTabContent).css('display', 'none');
          });

          $(NewTabContent).css('display', 'block');
        });
    }

    PopulateTeamSchedule(){
      console.log(' in PopulateTeamSchedule', this.render_content);
      var games = this.render_content.games;

      var ScheduleTable = $('#TeamSchedule').DataTable({
        'searching': false,
        'paging': false,
        'info': false,
        'ordering': false,
        "pageLength": 25,
        "data": games,
         "columns": [
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
             $(td).html(`<span>${game.week.week_name}</span>`)
             $(td).attr('style', 'color: white; width: 70px; background-color: #' + game.opponent_team_game.team_season.team.team_color_primary_hex);
           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html("<span></span> ");
               $(td).append(`<img class='worldTeamLogo' src='${game.opponent_team_game.team_season.team.team_logo}'/>`);
               $(td).attr('style', 'color: white; width: 70px; background-color: #' + game.opponent_team_game.team_season.team.team_color_primary_hex);

           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html("<span></span> ");
               $(td).append(`<span class='font10'>${game.opponent_team_game.team_season.national_rank_display}</span> `); //TODO SWITCH TO CORRECT WEEK RANK
               $(td).append(`<a href='${game.opponent_team_game.team_season.team.team_href}'>${game.opponent_team_game.team_season.team.school_name}</a>`);
               $(td).append(` <span class="font10">${game.opponent_team_game.team_season.record_display}</span>`);

           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span class='${game.game_outcome_letter}'>${game.game_outcome_letter}</span>
                           <span>
                             <a href='${game.game_href}'>${game.score_display}</a>
                             ${game.overtime_display}
                           </span>`);
           }},
           {"data": null, "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, game, iRow, iCol) {
               $(td).html(`<span>${game.team_game.record}</span>`);
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



    async action() {

      const query_to_dict = this.packaged_functions.query_to_dict;
      this.PopulateTeamSchedule();
    }
}
