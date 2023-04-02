
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Player Records',
        group_name: 'Almanac',
        db: db
      });
      const player_leader_categories = [
        {category_name: 'Passing Yards', category_abbr: 'YRD', stat: 'timeframe.passing.yards'},
        {category_name: 'Passing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.passing.tds'},
        {category_name: 'Interceptions Thrown', category_abbr: 'INT', stat: 'timeframe.passing.ints'},

        {category_name: 'Passing Completions', category_abbr: 'COMP', stat: 'timeframe.passing.completions'},
        {category_name: 'Passing Attempts', category_abbr: 'ATT', stat: 'timeframe.passing.attempts'},
        {category_name: 'Passing Yards Per Attempt', category_abbr: 'YPA', stat: 'timeframe.passing_yards_per_attempt', additional_filter:'timeframe.is_qualified_passer'},

        {category_name: 'Passing Completion Percentage', category_abbr: 'CMP%', stat: 'timeframe.completion_percentage', additional_filter:'timeframe.is_qualified_passer'},
        {category_name: 'Passer Rating', category_abbr: 'RAT', stat: 'timeframe.passer_rating', additional_filter:'timeframe.is_qualified_passer'},
        {category_name: 'Passing Yards Per Game', category_abbr: 'YPG', stat: 'timeframe.passing_yards_per_game'},

        {category_name: 'Rushing Yards', category_abbr: 'YRD', stat: 'timeframe.rushing.yards'},
        {category_name: 'Rushing Touchdowns', category_abbr: 'TDs', stat: 'timeframe.rushing.tds'},
        {category_name: 'Rushing Yards Per Carry', category_abbr: 'YPC', stat: 'timeframe.rushing_yards_per_carry_qualified'},

        {category_name: 'Rushing Carries', category_abbr: 'CAR', stat: 'timeframe.rushing.carries'},
        {category_name: 'Rushing Yards Per Game', category_abbr: 'YPG', stat: 'timeframe.rushing_yards_per_game'},
        {category_name: 'Rushes for 20+ Yards', category_abbr: '20+', stat: 'timeframe.rushing.over_20'},

        {category_name: 'Receiving Yards', category_abbr: 'YRD', stat: 'timeframe.receiving.yards'},
        {category_name: 'Receiving Touchdowns', category_abbr: 'TDs', stat: 'timeframe.receiving.tds'},
        {category_name: 'Receptions', category_abbr: 'RECs', stat: 'timeframe.receiving.receptions'},

        {category_name: 'Receiving Yards Per Catch', category_abbr: 'YPC', stat: 'timeframe.receiving_yards_per_catch_qualified'},
        {category_name: 'Receiving Yards Per Game', category_abbr: 'YPG', stat: 'timeframe.receiving_yards_per_game'},
        {category_name: 'Receiving Targets', category_abbr: 'TARG', stat: 'timeframe.receiving.targets'},

        {category_name: 'Points Scored', category_abbr: 'Points', stat: 'timeframe.games.points'},
        {category_name: 'Yards From Scrimmage', category_abbr: 'YRD', stat: 'timeframe.yards_from_scrimmage'},
        {category_name: 'Games Played', category_abbr: 'GP', stat: 'timeframe.games.games_played'},

        {category_name: 'Tackles', category_abbr: 'Tackles', stat: 'timeframe.defense.tackles'},
        {category_name: 'Tackles for Loss', category_abbr: 'TFLs', stat: 'timeframe.defense.tackles_for_loss'},
        {category_name: 'Sacks', category_abbr: 'Sacks', stat: 'timeframe.defense.sacks'},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'timeframe.defense.ints'},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'timeframe.defense.ints'},
        {category_name: 'Interceptions', category_abbr: 'Ints', stat: 'timeframe.defense.ints'},

        {category_name: 'Field Goals Made', category_abbr: 'FGM', stat: 'timeframe.kicking.fgm'},
        {category_name: 'Field Goals Attempted', category_abbr: 'FGA', stat: 'timeframe.kicking.fga'},
        {category_name: 'Extra Points Made', category_abbr: 'XPM', stat: 'timeframe.kicking.xpm'},
      ]

      

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: common.primary_color, SecondaryColor: common.secondary_color, NavBarLinks: NavBarLinks, page_title: 'Player Records'},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            players: players,
                            player_leader_categories: player_leader_categories,
                            sum_career: true
                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/html_templates/almanac/player_records/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);


      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where('team_id').above(0).toArray();
      var distinct_team_seasons = [];
      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');

      var sum_career = true;
      if (team_seasons.length > teams.length){
        sum_career = true;
      }

      let player_team_seasons = await db.player_team_season.toArray();

      const player_team_season_stats = await db.player_team_season_stats.toArray();
      let player_team_season_stats_by_player_team_season_id = index_group_sync(player_team_season_stats, 'index', 'player_team_season_id')

      var players = await db.player.toArray();
      const players_by_player_id = index_group_sync(players, 'index', 'player_id');

      player_team_seasons = nest_children(player_team_seasons, player_team_season_stats_by_player_team_season_id, 'player_team_season_id', 'season_stats')
      player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')
      player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season')

      player_team_seasons = player_team_seasons.filter(pts => pts.season_stats)

      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')


      var season_url = '/html_templates/almanac/player_records/season_records.njk'
      var season_html = await fetch(season_url);
      season_html = await season_html.text();

      for (const player_leader_category of player_leader_categories){

        player_leader_category.player_team_seasons = []

        var original_player_leader_category_stat = player_leader_category.stat

        player_leader_category.stat = original_player_leader_category_stat.replace('timeframe', 'season_stats')

        var player_team_season_leaders = player_team_seasons.filter(pts => get(pts, player_leader_category.stat) > 0)
        if (player_leader_category.additional_filter){
          player_team_season_leaders = player_team_season_leaders.filter(pts => get(pts, player_leader_category.additional_filter.replace('timeframe', 'season_stats')))
        }        
        player_team_season_leaders = player_team_season_leaders.top_sort(5, (pts_a, pts_b) => get(pts_b, player_leader_category.stat) - get(pts_a, player_leader_category.stat));

        for (const player_team_season of player_team_season_leaders){
          let player_team_season_obj = {player_team_season: player_team_season, value: get(player_team_season, player_leader_category.stat)}
          player_leader_category.player_team_seasons.push(player_team_season_obj)
        }

        var record_card = await common.nunjucks_env.renderString(season_html, {stat_category:player_leader_category});
        $('#nav-season-records').append(record_card);
      }

      $('.loading-card').remove();

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

        let player_team_games = await db.player_team_game.toArray();
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

          var player_team_game_leaders = player_team_games.filter(ptg => get(ptg, player_leader_category.stat) > 0).top_sort(5, (ptg_a, ptg_b) => get(ptg_b, player_leader_category.stat) - get(ptg_a, player_leader_category.stat));

          for (const player_team_game of player_team_game_leaders){
            let player_team_game_obj = {player_team_game: player_team_game, value: get(player_team_game, player_leader_category.stat)}
            player_leader_category.player_team_games.push(player_team_game_obj)
          }

          console.log('player_leader_category', {player_leader_category: player_leader_category, player_team_season_leaders: player_team_season_leaders})
        }


        console.log({player_leader_categories:player_leader_categories})

        console.log('CLICKED ON tab')
        var url = '/html_templates/almanac/player_records/game_records.njk'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = common.nunjucks_env.renderString(html, common.render_content);

        $('#nav-game-records').html(renderedHtml);

        draw_faces(common)
        $(".player-profile-popup-icon").on("click", async function () {
          await common.populate_player_modal(common, this);
        });
      })


      var draw_career_records = false;
      $('#nav-career-records-tab').on('click', async function(){

        if (draw_career_records == true){
          return false;
        }
        draw_career_records = true;
        console.log({players:players})
        const player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'group', 'player_id');
        players = nest_children(players, player_team_seasons_by_player_id, 'player_id', 'player_team_seasons');
        console.log({players:players})

        players = players.map(p => Object.assign(p, {career_stats: {}}))

        for (const player of players){
          var this_player_player_team_seasons = player.player_team_seasons || [];
          for (const player_team_season of this_player_player_team_seasons){
            increment_parent(deep_copy(player_team_season.season_stats), player.career_stats)
          }
        }

        console.log({players:players})

        for (const player_leader_category of player_leader_categories){

          var original_player_leader_category_stat = player_leader_category.stat

          player_leader_category.season_stat = original_player_leader_category_stat.replace('game_stats', 'season_stats')
          player_leader_category.stat = original_player_leader_category_stat.replace('season_stats', 'career_stats').replace('game_stats', 'career_stats')
          player_leader_category.players = []
          player_leader_category.player_team_seasons = []

          var player_leaders = players.filter(p => get(p, player_leader_category.stat) > 0).top_sort(5, (p_a, p_b) => get(p_b, player_leader_category.stat) - get(p_a, player_leader_category.stat));

          console.log({'player_leader_category.stat':player_leader_category.stat, player_leader_category:player_leader_category, players:players, player_leaders:player_leaders})
          for (const player of player_leaders){
            let player_obj = {player: player, value: get(player, player_leader_category.stat)}
            player_leader_category.players.push(player_obj)
          }

          console.log('player_leader_category', {player_leader_category: player_leader_category, player_leaders: player_leaders})
        }

        console.log({players:players})

        var url = '/html_templates/almanac/player_records/career_records.njk'
        var html = await fetch(url);
        html = await html.text();

        var renderedHtml = common.nunjucks_env.renderString(html, {players:players, player_leader_categories:player_leader_categories});

        console.log({renderedHtml:renderedHtml, html:html, "$('#nav-career-records')": $('#nav-career-records')})

        $('#nav-career-records').html(renderedHtml);

        draw_faces(common)
        $(".player-profile-popup-icon").on("click", async function () {
          await common.populate_player_modal(common, this);
        });
      })

    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/PlayerStats/Season/:season');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await draw_faces(common);
      $(".player-profile-popup-icon").on("click", async function () {
        await common.populate_player_modal(common, this);
      });

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
