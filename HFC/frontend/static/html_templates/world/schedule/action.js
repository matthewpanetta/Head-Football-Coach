
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};


      common.stopwatch(common, 'getHtml 1.0')
      const NavBarLinks = await common.nav_bar_links({
        path: 'Schedule',
        group_name: 'World',
        db: db
      });

      common.stopwatch(common, 'getHtml 1.1')
      var teams = await db.team.where('team_id').above(0).toArray();
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      var team_seasons = await db.team_season.where({season: common.season}).and(ts => ts.team_id > 0).toArray();
      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
      const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

      var weeks = await db.week.where({season: common.season}).toArray();
      const week_ids = weeks.map(w => w.week_id);

      var games = await db.game.where('week_id').anyOf(week_ids).toArray();
      const game_ids = games.map(g => g.game_id);

      common.stopwatch(common, 'getHtml 1.2')

      var team_games = await db.team_game.where('game_id').anyOf(game_ids).toArray();
      team_games = nest_children(team_games, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
      const team_games_by_game_id = index_group_sync(team_games, 'group', 'game_id');

      console.log({team_games:team_games})


      common.stopwatch(common, 'getHtml 1.3')
      for (const game of games){
        game.team_games = team_games_by_game_id[game.game_id];
        game.team_games = game.team_games.sort((tg_a, tg_b) => tg_a.is_home_team);

        game.team_games[0].national_rank = game.team_games[0].national_rank || game.team_games[0].team_season.national_rank; 
        game.team_games[1].national_rank = game.team_games[1].national_rank || game.team_games[1].team_season.national_rank; 

        game.away_team_game = game.team_games[0];
        game.home_team_game = game.team_games[1];

        if (game.away_team_game.is_winning_team){
          game.away_team_game.bold = 'bold';
        }
        if (game.home_team_game.is_winning_team){
          game.home_team_game.bold = 'bold';
        }
        
        var min_national_rank = Math.min(game.team_games[0].national_rank,  game.team_games[1].national_rank)
        var max_national_rank = Math.max(game.team_games[0].national_rank,  game.team_games[1].national_rank)
        game.summed_national_rank =  game.team_games[0].national_rank + game.team_games[1].national_rank + max_national_rank;

        if (game.rivalry) {
          game.summed_national_rank -= min_national_rank;
        }

      }
      common.stopwatch(common, 'getHtml 1.4')

      const games_by_week_id = index_group_sync(games, 'group', 'week_id');

      var any_week_selected = false;
      for (const week of weeks ){
        week.games = games_by_week_id[week.week_id] ?? []

        week.games = week.games.sort((game_a, game_b) => game_a.summed_national_rank - game_b.summed_national_rank);

        week.nav_clicked = false;

        if (week.games.length > 0 && week.is_current ){
          week.selected_week = true;
          any_week_selected = true;
        }
      }

      weeks = weeks.filter(w => w.games.length > 0);
      if (!any_week_selected){
        weeks[weeks.length - 1].selected_week = true;
      }
      common.stopwatch(common, 'getHtml 1.4')

      const weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id')

      const recent_games = await common.recent_games(common);
      common.stopwatch(common, 'getHtml 1.5')

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            weeks: weeks,
                            recent_games: recent_games,

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)
      common.stopwatch(common, 'getHtml 1.6')

      var url = '/static/html_templates/world/schedule/template.njk'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);
      common.stopwatch(common, 'getHtml 1.7')

      var url = '/static/html_templates/world/schedule/week_schedule_template.njk'
      var html = await fetch(url);
      var week_html = await html.text();
      $('.week-schedule').on('click', async function(){
        var week_id = $(this).attr('weekid');
        var week = weeks_by_week_id[week_id]

        console.log({week:week})
        if (week.nav_clicked){
          return false;
        }
        week.nav_clicked = true;

        const renderedHtml = common.nunjucks_env.renderString(week_html, {week:week});
        console.log({renderedHtml:renderedHtml, week:week, week_id:week_id, this:this})
        $('#nav-tabContent').append(renderedHtml);

      });

      $('.selected-tab').click();

    }

    const action = async (common) => {
      const db = common.db;


    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Ranking/');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
