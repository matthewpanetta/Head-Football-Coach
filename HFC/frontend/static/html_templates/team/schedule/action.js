
    const getHtml = async(common) => {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(common.params.team_id);
      const season = common.params.season ?? common.season;
      const db = common.db;
      const query_to_dict = common.query_to_dict;

      const NavBarLinks = await common.nav_bar_links({
        path: 'Schedule',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await common.team_header_links({
        path: 'Schedule',
        season: common.params.season,
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      teams = teams.sort((team_a, team_b) => team_a.school_name - team_b.school_name);

      const weeks = await db.week.where({season: season}).toArray();
      const weeks_by_week_id = index_group_sync(weeks, 'index','week_id');

      const team = await db.team.get({team_id: team_id})
      const team_season = await db.team_season.get({team_id: team_id, season: season});

      const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index', 'conference_season_id');
      const conference_by_conference_id = await index_group(await db.conference.toArray(), 'index', 'conference_id');

      team.team_season = team_season;
      team.team_season.conference_season = conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
      team.team_season.conference_season.conference = conference_by_conference_id[team.team_season.conference_season.conference_id];



      var team_games = await db.team_game.where({team_season_id: team_season.team_season_id}).toArray();
      var team_game_ids = team_games.map(tg => tg.team_game_id);
      team_games = team_games.sort((tg_a, tg_b) => tg_a.week_id - tg_b.week_id);
      const game_ids = team_games.map(game => parseInt(game.game_id));

      var games = await db.game.bulkGet(game_ids);
      games = nest_children(games, weeks_by_week_id, 'week_id', 'week')

      const opponent_team_game_ids = team_games.map(team_game => team_game.opponent_team_game_id);

      const all_team_game_ids = opponent_team_game_ids.concat(team_game_ids);
      const opponent_team_games = await db.team_game.bulkGet(opponent_team_game_ids);

      const opponent_team_season_ids = opponent_team_games.map(team_game => parseInt(team_game.team_season_id));
      const opponent_team_seasons = await db.team_season.bulkGet(opponent_team_season_ids);

      const opponent_team_ids = opponent_team_seasons.map(team_season => parseInt(team_season.team_id));
      const opponent_teams = await db.team.bulkGet(opponent_team_ids);

      var player_team_games = await db.player_team_game.where('team_game_id').anyOf(all_team_game_ids).toArray();

      const player_team_season_ids = player_team_games.map(ptg => ptg.player_team_season_id);

      var player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);
      const player_ids = player_team_seasons.map(pts => pts.player_id);

      const players = await db.player.bulkGet(player_ids);
      const players_by_player_id = index_group_sync(players, 'index', 'player_id');

      player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')
      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');

      player_team_games = nest_children(player_team_games, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season')
      const player_team_games_by_player_team_game_id = index_group_sync(player_team_games, 'index', 'player_team_game_id')

      var counter_games = 0;
      const pop_games = await $.each(games, async function(ind, game){

        game.team_game = team_games[counter_games];
        game.team_game.team_season = team.team_season;
        game.team_game.team_season.team = team;
        game.opponent_team_game = opponent_team_games[counter_games];
        game.opponent_team_game.team_season = opponent_team_seasons[counter_games];
        game.opponent_team_game.team_season.team = opponent_teams[counter_games];


        game.game_display = 'Preview'
        game.game_outcome_letter = ''
        game.overtime_display = ''
        if (game.was_played){
          game.game_display = game.score_display;

          if (game.home_team_score > game.away_team_score){
            game.game_outcome_letter = 'W'
          }

          for (var top_stat of game.team_game.top_stats){
            top_stat.player_team_game = player_team_games_by_player_team_game_id[top_stat.player_team_game_id]
          }
          for (var top_stat of game.opponent_team_game.top_stats){
            top_stat.player_team_game = player_team_games_by_player_team_game_id[top_stat.player_team_game_id]
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

      var team_seasons_in_conference = await db.team_season.where({season: season}).and(ts=>ts.team_id>0).toArray();
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

      var all_teams = await common.all_teams(common, '/Schedule/');


      common.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     common.page,
                            world_id: common.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            games: games,
                            teams: teams,
                            season: season,
                            all_teams: all_teams,
                            conference_standings: team_seasons_in_conference
                          }

      common.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team/schedule/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

      $('#body').html(renderedHtml);
    }

    const PopulateTeamSchedule = async (common) => {
      var games = common.render_content.games;

      var table_config = {
        original_data: games,
        subject: 'team schedule',
        templates: {
          table_template_url: '/static/html_templates/team/schedule/team_schedule_table_template.njk',
        },
        dom: {
          table_dom_selector:  "#TeamSchedule",
        }
      };

      var url = '/static/html_templates/team/schedule/team_schedule_table_template.njk'
      var html = await fetch(url);
      html = await html.text();
    
      var renderedHtml = await common.nunjucks_env.renderString(html, {page: common.page,data: games})
    
      $('#TeamSchedule').empty()
      $('#TeamSchedule').html(renderedHtml)

      init_basic_table_sorting(common, '#TeamSchedule', 0)
    
    }



    const action = async (common) => {

      const query_to_dict = common.query_to_dict;
      await PopulateTeamSchedule(common);
    }



    $(document).ready(async function(){
      var startTime = performance.now()


      if ( location.pathname.includes('/Season/')){
        var common = await common_functions('/World/:world_id/Team/:team_id/Schedule/Season/:season/');
      }
      else {
        var common = await common_functions('/World/:world_id/Team/:team_id/Schedule/');
      }
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
