const getHtml = async (common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var current_week = await db.week.toArray();
      current_week = current_week.filter(w => w.is_current)[0];

      var world_obj = {};

      //TEST
      const all_weeks = await db.week.where({season: 2021}).toArray();

      const all_phases_by_phase_id = await index_group(await db.phase.where({season: 2021}).toArray(), 'index', 'phase_id');
      const current_phase = all_phases_by_phase_id[current_week.phase_id];
      $.each(all_weeks, function(ind, week){
        week.phase = all_phases_by_phase_id[week.phase_id];
        week.phase.season = 2021;
      })

      //common.schedule_bowl_season(all_weeks, common)

      //END TEST

      const NavBarLinks = await common.nav_bar_links({
        path: 'World',
        group_name: 'World',
        db: db
      });

      const recent_games = await common.recent_games(common);

      var teams = await db.team.toArray();
      var conferences = await index_group(await db.conference.toArray(), 'index','conference_id');
      var conference_seasons = await index_group(await db.conference_season.where({season: 2021}).toArray(), 'index','conference_season_id');
      var team_seasons_by_team_season_id = await index_group(await db.team_season.where({season: 2021}).toArray(), 'index','team_season_id');
      var team_seasons_by_team_id = await index_group(await db.team_season.where({season: 2021}).toArray(), 'index','team_id');
      var teams_by_team_id = await index_group(await db.team.toArray(), 'index','team_id');
      var distinct_team_seasons = [];

      $.each(teams, async function(ind, team){
        team.team_season =team_seasons_by_team_id[team.team_id]
        team.team_season.conference_season = conference_seasons[team.team_season.conference_season_id];
        team.team_season.conference_season.conference = conferences[team.team_season.conference_season.conference_id];

        team.conference_position_display = `${team.team_season.rankings.division_rank[0]} in ${team.team_season.conference_season.conference.conference_abbreviation}`
        if (team.team_season.results.conference_champion){
          team.conference_position_display = `${team.team_season.conference_season.conference.conference_abbreviation} Champions`
        }

      });

      console.log('teams', teams)
      teams = teams.filter(team => team.team_season.rankings.national_rank[0] <= 25);

      teams.sort(function(a, b) {
          if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0]) return -1;
          if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
          return 0;
        });


      var this_week_team_games = await index_group(await db.team_game.where({week_id: current_week.week_id}).toArray(), 'index','team_game_id');;
      var this_week_games =  await db.game.where({week_id: current_week.week_id}).toArray();

      var min_national_rank = 0;
      console.log('this_week_games', this_week_games, this_week_team_games)
      $.each(this_week_games, function(ind, game){
        game.game_headline_display = '';
        if (game.bowl != null){
          game.game_headline_display = game.bowl.bowl_name;
        }
        else if (game.rivalry != null) {
          if (game.rivalry.rivalry_name.length > 0){
            game.game_headline_display = game.rivalry.rivalry_name;
          }
          else {
            game.game_headline_display = 'Rivalry Game'
          }
        }

        game.home_team_game = this_week_team_games[game.home_team_game_id]
        game.away_team_game = this_week_team_games[game.away_team_game_id]

        game.home_team_game.team_season = team_seasons_by_team_season_id[game.home_team_game.team_season_id];
        game.away_team_game.team_season = team_seasons_by_team_season_id[game.away_team_game.team_season_id];

        game.home_team_game.team_season.stat_rankings = {offense: Math.floor(Math.random() * 50), defense: Math.floor(Math.random() * 50)}
        game.away_team_game.team_season.stat_rankings = {offense: Math.floor(Math.random() * 50), defense: Math.floor(Math.random() * 50)}

        game.home_team_game.team_season.team = teams_by_team_id[game.home_team_game.team_season.team_id];
        game.away_team_game.team_season.team = teams_by_team_id[game.away_team_game.team_season.team_id];

        game.team_games = [game.away_team_game, game.home_team_game, ]

        min_national_rank = Math.min(game.home_team_game.team_season.national_rank, game.away_team_game.team_season.national_rank)
        game.summed_national_rank = game.home_team_game.team_season.national_rank + game.away_team_game.team_season.national_rank + min_national_rank;

        game.world_page_filter_attributes = 'AllGame=1 '
        console.log({'game.away_team_game.national_rank': game.away_team_game.team_season.national_rank, 'game.home_team_game.national_rank': game.home_team_game.team_season.national_rank})
        if (game.away_team_game.team_season.national_rank <= 25 || game.home_team_game.team_season.national_rank <= 25){
          game.world_page_filter_attributes += 'Top25Game=1 '
        }
        else {
          game.world_page_filter_attributes += 'Top25Game=0 '
        }

      })

      this_week_games = this_week_games.sort(function(a, b) {
          if (a.summed_national_rank < b.summed_national_rank) return -1;
          if (a.summed_national_rank > b.summed_national_rank) return 1;
          return 0;
        });

      console.log('this_week_games', this_week_games)

      const page = {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks}
      var render_content = {
              team_list: [],
              page: page,
              world_id: common.world_id,
              teams: teams,
              this_week_games: this_week_games,
              recent_games: recent_games
          };

      common.render_content = render_content

      console.log('render_content', render_content)

      var url = '/static/html_templates/world/world/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);
      //return renderedHtml

      $('#body').html(renderedHtml)
    }


    const action = async (common) => {
      const packaged_functions = common;
      const db = this.db;

      //Show initial 'new world' modal
      $('#create-world-row').on('click', function(){
        $('#indexCreateWorldModal').css({'display': 'block'});

        //Close modal if clicking outside modal
        $(window).on('click', function(event) {
          if ($(event.target)[0] == $('#indexCreateWorldModal')[0]) {
            $('#indexCreateWorldModal').css({'display': 'none'});
            $(window).unbind();
          }
        });

        //Function to close modal
        $('#indexCreateWorldModalCloseButton').on('click', function(){
          $('#indexCreateWorldModal').css({'display': 'none'});
          $(window).unbind();
        });
      });


      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        const db = await packaged_functions['create_new_db']();
        console.log('Created new db!', db)

        const teams = await packaged_functions['get_teams']({})

        var ba_add = await db.team.bulkAdd(teams);
        console.log('ba_add', ba_add);

      });

      var InitialBoxScore = $('.recent-gameview-tab')[0];

      var SelectedTeamID = $(InitialBoxScore).attr('TeamID');
      $('.upcoming-gameview-tab').on('click', function(event, target) {
        console.log('clicked this', event, target)

          var ClickedTab = $(event.target)
          //console.log('ClickedTab', ClickedTab);
          var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
          var SelectedGameFilterSelection = ClickedTab.attr('GameFilterSelection');

          $.each($('#'+ClickedTabParent+' > .selected-upcoming-gameview-tab'), function(index, tab){
            var TargetTab = $(tab);
            $(TargetTab).removeClass('selected-upcoming-gameview-tab');
            var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


            var UnselectedTeamID = TargetTab.attr('TeamID');
            var UnselectedGameID = TargetTab.attr('GameID');

            $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
          });

          console.log('Trying to filter ' , '.worldUpcomingTable['+SelectedGameFilterSelection+'="1"]', $('.worldUpcomingTable['+SelectedGameFilterSelection+'="1"]'));
          $('.worldUpcomingTable['+SelectedGameFilterSelection+'="1"]').removeClass('w3-hide');
          $('.worldUpcomingTable['+SelectedGameFilterSelection+'="0"]').addClass('w3-hide');

          $(ClickedTab).addClass('selected-upcoming-gameview-tab');
          $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

        });
    }

$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/');

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);
  await common.initialize_scoreboard();

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );
})
