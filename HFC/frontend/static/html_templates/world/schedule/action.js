
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Schedule',
        group_name: 'World',
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      var team_seasons = await db.team_season.where({season: common.season}).and(ts => ts.team_id > 0).toArray();
      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
      const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

      var weeks = await db.week.where({season: common.season}).toArray();
      const week_ids = weeks.map(w => w.week_id);

      var games = await db.game.where('week_id').anyOf(week_ids).toArray();
      const game_ids = games.map(g => g.game_id);

      var team_games = await db.team_game.where('game_id').anyOf(game_ids).toArray();
      team_games = nest_children(team_games, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
      const team_games_by_game_id = index_group_sync(team_games, 'group', 'game_id');

      console.log({team_games:team_games})

      const top_stats = team_games.filter(tg => tg.points != null).map(tg => tg.top_stats).reduce((acc, val) => acc.concat(val), [])
      console.log({top_stats:top_stats})
      const player_team_game_ids = top_stats.map(ts => ts.player_team_game_id);

      var player_team_games = await db.player_team_game.bulkGet(player_team_game_ids);
      const player_team_season_ids = player_team_games.map(ptg => ptg.player_team_season_id);

      var player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);
      player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
      const player_ids = player_team_seasons.map(pts => pts.player_id);

      const players = await db.player.where('player_id').anyOf(player_ids).toArray();
      const players_by_player_id = index_group_sync(players, 'index', 'player_id');
      player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player');
      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');
      player_team_games = nest_children(player_team_games, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
      const player_team_games_by_player_team_game_id = index_group_sync(player_team_games, 'index', 'player_team_game_id');

      console.log({players:players, player_team_seasons:player_team_seasons, player_team_games:player_team_games})

      for (const game of games){
        game.team_games = team_games_by_game_id[game.game_id];
        game.team_games = game.team_games.sort((tg_a, tg_b) => tg_a.is_home_team);

        for (const top_stat of game.team_games[0].top_stats){
          top_stat.player_team_game = player_team_games_by_player_team_game_id[top_stat.player_team_game_id]
        }

        for (const top_stat of game.team_games[1].top_stats){
          top_stat.player_team_game = player_team_games_by_player_team_game_id[top_stat.player_team_game_id]
        }

        game.away_team_game = game.team_games[0];
        game.home_team_game = game.team_games[1];

        var min_national_rank = Math.min(game.team_games[0].team_season.national_rank,  game.team_games[1].team_season.national_rank)
        game.summed_national_rank =  game.team_games[0].team_season.national_rank + game.team_games[1].team_season.national_rank + min_national_rank;

      }

      const games_by_week_id = index_group_sync(games, 'group', 'week_id');

      for (const week of weeks ){
        week.games = games_by_week_id[week.week_id] ?? []

        week.games = week.games.sort((game_a, game_b) => game_a.summed_national_rank - game_b.summed_national_rank);

        week.nav_clicked = false;

        if (week.is_current ){
          week.selected_week = true;
        }
      }

      weeks = weeks.filter(w => w.games.length > 0);

      const weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id')


      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            weeks: weeks,
                            recent_games: recent_games,

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/schedule/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);


      $('.week-schedule').on('click', async function(){
        var week_id = $(this).attr('weekid');
        var week = weeks_by_week_id[week_id]

        console.log({week:week})
        if (week.nav_clicked){
          return false;
        }
        week.nav_clicked = true;

        var url = '/static/html_templates/world/schedule/week_schedule_template.html'
        var html = await fetch(url);
        html = await html.text();

        const renderedHtml = common.nunjucks_env.renderString(html, {week:week});
        console.log({renderedHtml:renderedHtml, week:week, week_id:week_id, this:this})
        $('#nav-tabContent').append(renderedHtml);

        //draw_faces(common)

      });

      $('.selected-tab').click();

    }

    const action = async (common) => {
      const db = common.db;


    }



    const draw_faces = async (common) => {
      const db = common.db;
      const season = common.season;
      const index_group_sync = common.index_group_sync;
      console.log('PlayerFace-Headshot', $('.PlayerFace-Headshot'));

      const player_ids = [];
      const face_div_by_player_id = {};

      $('.PlayerFace-Headshot:empty').each(function(ind, elem){

        console.log('ind, elem', ind, elem)
        player_ids.push(parseInt($(elem).attr('player_id')))
        if (!(parseInt($(elem).attr('player_id')) in face_div_by_player_id)) {
          face_div_by_player_id[parseInt($(elem).attr('player_id'))] = [];
        }

        face_div_by_player_id[parseInt($(elem).attr('player_id'))].push(elem)
      })

      console.log({face_div_by_player_id:face_div_by_player_id})

      const players = await db.player.bulkGet(player_ids);
      var player_team_seasons = await db.player_team_season.where('player_id').anyOf(player_ids).toArray();
      player_team_seasons = player_team_seasons.filter(pts => pts.season == season);
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

      const common = await common_functions('/World/:world_id/Ranking/');

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
