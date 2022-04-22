const refresh_playoffs = async (common) => {

  const db = common.db;
  const season = common.season;

  const all_league_seasons = await db.league_season.toArray();
  const current_league_season = all_league_seasons[0];

  current_league_season.playoffs = {
  	playoffs_started: false,
  	playoffs_complete: false,
  	number_playoff_rounds: 3,
  	number_playoff_teams: 6,
  	playoff_rounds: [
  		{playoff_round_number: 1, is_current_round: false, is_championship: false, week_name: 'Bowl Week 1', next_week_name: 'Bowl Week 2', round_name: 'National Quarterfinals', playoff_games: [
  			{team_objs: [{seed: 1, team_game_id: null, team_season_id: null}], bye_game: true, seeds_set: true,  game_id: null},
        {team_objs: [{seed: 4, team_game_id: null, team_season_id: null}, {seed: 5, team_game_id: null, team_season_id: null}], bye_game: false, seeds_set: true,  game_id: null},
        {team_objs: [{seed: 2, team_game_id: null, team_season_id: null}], bye_game: true, seeds_set: true,  game_id: null},
        {team_objs: [{seed: 3, team_game_id: null, team_season_id: null}, {seed: 6, team_game_id: null, team_season_id: null}], bye_game: false, seeds_set: true,  game_id: null},
  		]},
  		{playoff_round_number: 2, is_current_round: false, is_championship: false, week_name: 'Bowl Week 2',next_week_name: 'Bowl Week 3',round_name: 'National Semifinals', playoff_games: [
        {team_objs: [], bye_game: false, seeds_set: false,  game_id: null},
        {team_objs: [], bye_game: false, seeds_set: false,  game_id: null},
  		]},
  		{playoff_round_number: 3, is_current_round: false, is_championship: true, week_name: 'Bowl Week 3',next_week_name: null,round_name: 'National Championship', playoff_games: [
  			{team_objs: [], bye_game: false, seeds_set: false,  game_id: null}
  		]}
  	]
  };

  await db.league_season.put(current_league_season)

  await db.game.where('game_id').above(241).delete();
  await db.team_game.where('game_id').above(241).delete();

  const phases = await db.phase.toArray();
  const all_phases_by_phase_id = index_group_sync(phases, 'index', 'phase_id')
  var all_weeks = await db.week.where({season: season}).toArray();
  all_weeks = nest_children(all_weeks, all_phases_by_phase_id, 'phase_id', 'phase')
  await common.schedule_bowl_season(all_weeks, common);
  console.log('done')
}

const refresh_bowls = async (common) => {
  const db = common.db;
  const season = common.season;

//this_week, all_weeks, common
  const current_league_season = await db.league_season.where({season:season}).first();

  await db.game.where('game_id').above(260).delete();
  await db.team_game.where('game_id').above(260).delete();

  var weeks = await db.week.where({season:season}).toArray();
  for (const week of weeks){
    if (week.week_name == 'Bowl Week 1'){
      week.is_current = true;
    }
    else{
      week.is_current = false;
    }
  }

  await db.week.bulkPut(weeks);

  await common.process_bowl_results(common);

}


const reset_bowls = async (common) => {
  const db = common.db;

  await db.game.where('game_id').above(262).delete();
  await db.team_game.where('game_id').above(262).delete();

}

const getHtml = async (common) => {
      const db = common.db;
      const ddb = common.ddb;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      const season = common.season;

      var current_week = await db.week.toArray();
      current_week = current_week.filter(w => w.is_current)[0];

      const NavBarLinks = await common.nav_bar_links({
        path: 'Overview',
        group_name: 'World',
        db: db
      });

      common.stopwatch(common, 'Time before recent_games');
      const recent_games = await common.recent_games(common);
      common.stopwatch(common, 'Time after recent_games');

      var teams = await db.team.where('team_id').above(0).toArray();
      var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray();
      var conferences = await index_group(await db.conference.toArray(), 'index','conference_id');
      var conference_seasons = await index_group(await db.conference_season.where({season: season}).toArray(), 'index','conference_season_id');
      var team_seasons_by_team_season_id = await index_group(team_seasons, 'index','team_season_id');
      var team_seasons_by_team_id = await index_group(team_seasons, 'index','team_id');
      var teams_by_team_id = await index_group(teams, 'index','team_id');
      var distinct_team_seasons = [];
      common.stopwatch(common, 'Time after selecting teams');

      $.each(teams, async function(ind, team){
        team.team_season =team_seasons_by_team_id[team.team_id]
        team.team_season.conference_season = conference_seasons[team.team_season.conference_season_id];
        team.team_season.conference_season.conference = conferences[team.team_season.conference_season.conference_id];

        team.conference_position_display = `${team.team_season.rankings.division_rank[0]} in ${team.team_season.conference_season.conference.conference_abbreviation}`
        if (team.team_season.results.conference_champion){
          team.conference_position_display = `${team.team_season.conference_season.conference.conference_abbreviation} Champions`
        }

      });

      teams = teams.filter(team => team.team_season.rankings.national_rank[0] <= 25);

      teams.sort(function(a, b) {
          if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0]) return -1;
          if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
          return 0;
        });


      var this_week_team_games = await index_group(await db.team_game.where({week_id: current_week.week_id}).toArray(), 'index','team_game_id');;
      var this_week_games =  await db.game.where({week_id: current_week.week_id}).toArray();

      var min_national_rank = 0;
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
      common.stopwatch(common, 'Time after this_week_games');
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

      var url = '/static/html_templates/world/world/template.njk'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

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
  common.startTime = startTime;

  await getHtml(common);
  common.stopwatch(common, 'Time after getHtml');
  await action(common);
  common.stopwatch(common, 'Time after action');
  await common.add_listeners(common);
  common.stopwatch(common, 'Time after listeners');
  await common.initialize_scoreboard();
  common.stopwatch(common, 'Time after scoreboard');

  console.log({common: common});

  //await common.create_recruiting_class(common);

  const db = common.db;

  const weeks = await db.week.where({season: common.season}).toArray();

  common.stopwatch(common, 'Time taken to render HTML');
})
