
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Player Stats',
        group_name: 'Almanac',
        db: db
      });

      var teams = await db.team.toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.toArray();
      var distinct_team_seasons = [];

      const player_team_seasons = await db.player_team_season.toArray();
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);

      const player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);
      const players_by_player_id = index_group_sync(players, 'index', 'player_id');

      for (const team_season of team_seasons){
        team_season.team = teams_by_team_id[team_season.team_id];
      }
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');

      var player_counter = 0;
      for (const player_team_season of player_team_seasons){
        player_team_season.player = players_by_player_id[player_team_season.player_id];
        player_team_season.team_season = team_seasons_by_team_season_id[player_team_season.team_season_id];
      }
      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')

      const player_leader_categories = [
        {category_name: 'Passing Yards', category_abbr: 'YRD', stat: 'timeframe.passing.yards'},
        {category_name: 'Passing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.passing.tds'},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'passer_rating'},
        {category_name: 'Rushing Yards', category_abbr: 'YRD', stat: 'timeframe.rushing.yards'},
        {category_name: 'Rushing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.rushing.tds'},
        {category_name: 'Rushing Yards Per Carry', category_abbr: 'YPC', stat: 'rushing_yards_per_carry'},
        {category_name: 'Receiving Yards', category_abbr: 'YRD', stat: 'timeframe.receiving.yards'},
        {category_name: 'Receiving Touchdowns', category_abbr: 'TDs', stat: 'timeframe.receiving.tds'},
        {category_name: 'Receptions', category_abbr: 'RECs', stat: 'timeframe.receiving.receptions'},
        {category_name: 'Points Scored', category_abbr: 'Points', stat: 'timeframe.games.points'},
        {category_name: 'Yards From Scrimmage', category_abbr: 'YRD', stat: 'yards_from_scrimmage'},
        {category_name: 'Games Played', category_abbr: 'GP', stat: 'timeframe.games.games_played'},
        {category_name: 'Tackles', category_abbr: 'Tackles', stat: 'timeframe.defense.tackles'},
        {category_name: 'Sacks', category_abbr: 'Sacks', stat: 'timeframe.defense.sacks'},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'timeframe.defense.ints'},
      ]

      for (const player_leader_category of player_leader_categories){

        player_leader_category.player_team_seasons = []

        var original_player_leader_category_stat = player_leader_category.stat

        player_leader_category.stat = original_player_leader_category_stat.replace('timeframe', 'season_stats')

        var player_team_season_leaders = player_team_seasons.filter(pts => get(pts, player_leader_category.stat) > 0).sort((pts_a, pts_b) => get(pts_b, player_leader_category.stat) - get(pts_a, player_leader_category.stat));

        for (const player_team_season of player_team_season_leaders.slice(0,5)){
          let player_team_season_obj = {player_team_season: player_team_season, value: get(player_team_season, player_leader_category.stat)}
          player_leader_category.player_team_seasons.push(player_team_season_obj)
        }

        console.log('player_leader_category', {player_leader_category: player_leader_category, player_team_season_leaders: player_team_season_leaders})
      }

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            players: players,
                            player_leader_categories: player_leader_categories

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/player_records/template.html'
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

        let player_team_games = await db.player_team_game.where('player_team_season_id').anyOf(player_team_season_ids).toArray();
        player_team_games = player_team_games.filter(ptg => ptg.game_stats.games.games_played > 0);

        for (const player_team_game of player_team_games){
          player_team_game.player_team_season = player_team_seasons_by_player_team_season_id[player_team_game.player_team_season_id]
          player_team_game.team_game = team_games_by_team_game_id[player_team_game.team_game_id];
          player_team_game.team_game.game = games_by_game_id[player_team_game.team_game.game_id];
          player_team_game.team_game.game.week = weeks_by_week_id[player_team_game.team_game.game.week_id]

          player_team_game.team_game.opponent_team_season = team_seasons_by_team_season_id[player_team_game.team_game.opponent_team_season_id]
        }

        for (const player_leader_category of player_leader_categories){

          var original_player_leader_category_stat = player_leader_category.stat

          player_leader_category.stat = original_player_leader_category_stat.replace('season_stats', 'game_stats')
          player_leader_category.player_team_games = []

          console.log({player_leader_category:player_leader_category, player_team_games:player_team_games})

          var player_team_game_leaders = player_team_games.filter(ptg => get(ptg, player_leader_category.stat) > 0).sort((ptg_a, ptg_b) => get(ptg_b, player_leader_category.stat) - get(ptg_a, player_leader_category.stat));

          for (const player_team_game of player_team_game_leaders.slice(0,5)){
            let player_team_game_obj = {player_team_game: player_team_game, value: get(player_team_game, player_leader_category.stat)}
            player_leader_category.player_team_games.push(player_team_game_obj)
          }

          console.log('player_leader_category', {player_leader_category: player_leader_category, player_team_season_leaders: player_team_season_leaders})
        }


        console.log('CLICKED ON tab')
        var url = '/static/html_templates/almanac/player_records/game_records.html'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = common.nunjucks_env.renderString(html, common.render_content);

        $('#nav-game-records').html(renderedHtml);

        draw_faces(common)
      })

    }

    const action = async (common) => {
      const db = common.db;
    }

    const draw_faces = async (common) => {
      const db = common.db;
      const season = common.season;
      const index_group_sync = common.index_group_sync;

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


      const players = await db.player.bulkGet(player_ids);
      var player_team_seasons = await db.player_team_season.where('player_id').anyOf(player_ids).toArray();
      const player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'index', 'player_id')


      const team_season_ids = player_team_seasons.map(pts => pts.team_season_id);
      const team_seasons = await db.team_season.bulkGet(team_season_ids);
      const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id')


      const team_ids = team_seasons.map(ts => ts.team_id);
      const teams = await db.team.bulkGet(team_ids);
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id')


      for (var player of players){
        var elems = face_div_by_player_id[player.player_id];
        player.player_team_season = player_team_seasons_by_player_id[player.player_id];
        player.team_season = team_seasons_by_team_season_id[player.player_team_season.team_season_id]
        player.team = teams_by_team_id[player.team_season.team_id]

        if (player.player_face == undefined){
          player.player_face = await common.create_player_face('single', player.player_id, db);
        }

        for (var elem of elems){
          common.display_player_face(player.player_face, {jersey: player.team.jersey, teamColors: player.team.jersey.teamColors}, $(elem).attr('id'));
        }

      }
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/PlayerStats/Season/:season');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();
      await draw_faces(common);
      console.log('nav-game-records', $('#nav-game-records'))
      await $('#nav-game-records').css('display', 'none');

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
