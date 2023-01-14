
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Team Records',
        group_name: 'Almanac',
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where('team_id').above(0).toArray();
      var distinct_team_seasons = [];

      for (const team_season of team_seasons){
        team_season.team = teams_by_team_id[team_season.team_id];
      }

      const team_leader_categories = [
        {category_name: 'Passing Yards', category_abbr: 'YRD', stat: 'timeframe.passing.yards'},
        {category_name: 'Passing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.passing.tds'},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'passer_rating'},
        {category_name: 'Rushing Yards', category_abbr: 'YRD', stat: 'timeframe.rushing.yards'},
        {category_name: 'Rushing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.rushing.tds'},
        {category_name: 'Rushing Yards Per Carry', category_abbr: 'YPC', stat: 'rushing_yards_per_carry_qualified'},

        {category_name: 'Points Scored', category_abbr: 'Points', stat: 'timeframe.games.points'},
        {category_name: 'Yards From Scrimmage', category_abbr: 'YRD', stat: 'yards'},
        {category_name: 'Games Played', category_abbr: 'GP', stat: 'timeframe.games.games_played'},
        {category_name: 'Tackles', category_abbr: 'Tackles', stat: 'timeframe.defense.tackles'},
        {category_name: 'Sacks', category_abbr: 'Sacks', stat: 'timeframe.defense.sacks'},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'timeframe.defense.ints'},

        //Season only
        {category_name: 'Wins', category_abbr: 'Wins', stat: 'record.wins', timeframe: 'season'},
        {category_name: 'Losses', category_abbr: 'Losses', stat: 'record.losses', timeframe: 'season'},
        {category_name: 'Win Streak', category_abbr: 'Streak', stat: 'record.win_streak', timeframe: 'season'},

        {category_name: 'Weeks Ranked #1', category_abbr: '#1', stat: 'weeks_ranked_1', timeframe: 'season'},
        {category_name: 'Weeks Ranked Top 10', category_abbr: 'Top 10', stat: 'weeks_ranked_top_10', timeframe: 'season'},
        {category_name: 'Weeks Ranked Top 25', category_abbr: 'Top 25', stat: 'weeks_ranked_top_25', timeframe: 'season'},

      ]

      for (const team_leader_category of team_leader_categories){

        if (team_leader_category.timeframe == 'game'){
          continue;
        }

        team_leader_category.team_seasons = []

        var original_team_leader_category_stat = team_leader_category.stat

        team_leader_category.stat = original_team_leader_category_stat.replace('timeframe', 'season_stats')

        console.log({team_leader_category:team_leader_category})
        var team_season_leaders = team_seasons.filter(ts => get(ts, team_leader_category.stat) > 0).sort((ts_a, ts_b) => get(ts_b, team_leader_category.stat) - get(ts_a, team_leader_category.stat));

        for (const team_season of team_season_leaders.slice(0,5)){
          let team_season_obj = {team_season: team_season, value: get(team_season, team_leader_category.stat)}
          team_leader_category.team_seasons.push(team_season_obj)
        }

        console.log('team_leader_category', {team_leader_category: team_leader_category, team_season_leaders: team_season_leaders})
      }

      const recent_games = await recent_games(common);

      var render_content = {page: {PrimaryColor: common.primary_color, SecondaryColor: common.secondary_color, NavBarLinks: NavBarLinks, page_title: 'Team Records'},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            team_leader_categories: team_leader_categories

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/team_records/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

      var draw_game_records = false;
      $('#nav-game-records-tab').on('click', async function(){

        if (draw_game_records == true){
          return false;
        }
        draw_game_records = true;

        const team_games = await db.team_game.toArray();
        const team_games_by_team_game_id = index_group_sync(team_games, 'index', 'team_game_id');

        const games = await db.game.toArray();
        const games_by_game_id = index_group_sync(games, 'index', 'game_id');

        const weeks = await db.week.toArray();
        const weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id');

        var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');

        for (const team_game of team_games){
          team_game.team_season = team_seasons_by_team_season_id[team_game.team_season_id]
          team_game.game = games_by_game_id[team_game.game_id];
          team_game.game.week = weeks_by_week_id[team_game.game.week_id]

          team_game.opponent_team_season = team_seasons_by_team_season_id[team_game.opponent_team_season_id]
        }

        for (const team_leader_category of team_leader_categories){

          console.log({team_leader_category:team_leader_category})

          if (team_leader_category.timeframe == 'season'){
            continue;
          }

          var original_team_leader_category_stat = team_leader_category.stat

          team_leader_category.stat = original_team_leader_category_stat.replace('season_stats', 'game_stats')
          team_leader_category.team_games = []

          console.log({team_leader_category:team_leader_category, team_games:team_games})

          var team_game_leaders = team_games.filter(tg => get(tg, team_leader_category.stat) > 0).sort((tg_a, tg_b) => get(tg_b, team_leader_category.stat) - get(tg_a, team_leader_category.stat));

          for (const team_game of team_game_leaders.slice(0,5)){
            let team_game_obj = {team_game: team_game, value: get(team_game, team_leader_category.stat)}
            team_leader_category.team_games.push(team_game_obj)
          }

          console.log('team_leader_category', {team_leader_category: team_leader_category, team_season_leaders: team_season_leaders})
        }


        common.render_content.team_leader_categories = team_leader_categories;

        console.log({'common.render_content': common.render_content})
        var url = '/static/html_templates/almanac/team_records/game_records.njk'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = common.nunjucks_env.renderString(html, common.render_content);

        $('#nav-game-records').html(renderedHtml);

      })

    }

    const action = async (common) => {
      const db = common.db;
    }

    const draw_faces = async (common) => {
      const db = common.db;
      const season = common.season;

      const player_ids = [];
      const face_div_by_player_id = {};

      $('.PlayerFace-Headshot').each(function(ind, elem){
        if ($(elem).find('svg').length > 0){
          return true;
        }
        player_ids.push(parseInt($(elem).attr('player_id')))
        if (!(parseInt($(elem).attr('player_id')) in face_div_by_player_id)) {
          face_div_by_player_id[parseInt($(elem).attr('player_id'))] = [];
        }

        face_div_by_player_id[parseInt($(elem).attr('player_id'))].push(elem)
      })


      const team_seasons = await db.team_season.where({season: common.season}).and(ts=>ts.team_id>0).toArray();
      const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id')


      const team_ids = team_seasons.map(ts => ts.team_id);
      const teams = await db.team.bulkGet(team_ids);
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/PlayerStats/Season/:season');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await draw_faces(common);
      console.log('nav-game-records', $('#nav-game-records'))
      await $('#nav-game-records').css('display', 'none');

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
