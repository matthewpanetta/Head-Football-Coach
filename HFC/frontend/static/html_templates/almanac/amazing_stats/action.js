
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });

      const NavBarLinks = await common.nav_bar_links({
        path: 'Amazing Stats',
        group_name: 'Almanac',
        db: db
      });


      let game_stat_categories = {
        "Largest margin of victory": [],
        "Most points scored by single team": [],
        "Highest scoring game combined": [],
        "Lowest scoring game combined": [],
        "Largest comeback victory": [],
        "Biggest Upset": [],
      }

      var seasons = await db.league_season.toArray();
      var seasons_by_season_id = index_group_sync(seasons, 'index', 'season_id')
      var weeks = await db.week.toArray()
      weeks = nest_children(weeks, seasons_by_season_id, 'season_id', 'season');
      var weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id')

      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where('team_id').above(0).toArray();

      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');

      var team_games = await db.team_game.toArray();
      team_games = nest_children(team_games, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
      var team_games_by_game_id = index_group_sync(team_games, 'group', 'game_id')

      var games = await db.game.toArray();
      games = games.filter(g => g.was_played);
      games = nest_children(games, weeks_by_week_id, 'week_id', 'week')
      games = nest_children(games, team_games_by_game_id, 'game_id', 'team_games')

      games.forEach(function(g){
        for (var tg of g.team_games){
          if (tg.is_home_team){
            g.home_team_game = tg;
          }
          else {
            g.away_team_game = tg;
          }

          if (tg.is_winning_team){
            g.winning_team_game = tg;
          }
          else {
            g.losing_team_game = tg;
          }
        }

        g.margin_of_victory = g.outcome.winning_team.points -  g.outcome.losing_team.points;
        g.total_game_points = g.outcome.winning_team.points +  g.outcome.losing_team.points;
        g.winning_team_points = g.outcome.winning_team.points;
        g.losing_team_largest_lead = g.losing_team_game.game_stats.team.biggest_lead;
        g.rank_difference = g.winning_team_game.national_rank - g.losing_team_game.national_rank;

        return g;
      });

      console.log({games:games, game_stat_categories:game_stat_categories})

      game_stat_categories["Largest margin of victory"] = games.sort((g_a, g_b) => g_b.margin_of_victory - g_a.margin_of_victory).slice(0,10);
      game_stat_categories["Most points scored by single team"] = games.sort((g_a, g_b) => g_b.winning_team_points - g_a.winning_team_points).slice(0,10);
      game_stat_categories["Highest scoring game combined"] = games.sort((g_a, g_b) => g_b.total_game_points - g_a.total_game_points).slice(0,10);
      game_stat_categories["Lowest scoring game combined"] = games.sort((g_a, g_b) => g_a.total_game_points - g_b.total_game_points).slice(0,10);
      game_stat_categories["Largest comeback victory"] = games.sort((g_a, g_b) => g_b.losing_team_largest_lead - g_a.losing_team_largest_lead).slice(0,10);
      game_stat_categories["Biggest Upset"] = games.sort((g_a, g_b) => g_b.rank_difference - g_a.rank_difference).slice(0,10);
      
      
      
      console.log({games:games, game_stat_categories:game_stat_categories})

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks, page_title: 'Amazing Stats'},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            game_stat_categories:game_stat_categories

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/amazing_stats/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;
    }



    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/AmazingStats/Season/:season');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
