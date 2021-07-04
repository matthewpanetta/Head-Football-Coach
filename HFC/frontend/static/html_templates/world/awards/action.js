
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Awards & Races',
        group_name: 'World',
        db: db
      });

      const awards = await db.award.where({season: common.season}).toArray();

      var weekly_awards = awards.filter(a => a.award_timeframe == 'week' && a.player_team_game_id != null);

      const player_team_game_ids = weekly_awards.map(a => a.player_team_game_id);

    	var conference_seasons = await db.conference_season.where({season: common.season}).toArray();

    	const conference_ids = conference_seasons.map(cs => cs.conference_id);
    	var conferences = await db.conference.bulkGet(conference_ids);
      const conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id')
      conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference');

      var weeks = await db.week.where({season: common.season}).toArray();
      const weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id');

      weekly_awards = nest_children(weekly_awards, weeks_by_week_id, 'week_id', 'week')

      var player_team_games = await db.player_team_game.bulkGet(player_team_game_ids);
      const team_game_ids = player_team_games.map(ptg => ptg.team_game_id)
      var team_games = await db.team_game.bulkGet(team_game_ids);
      const game_ids = team_games.map(tg => tg.game_id);
      const games = await db.game.bulkGet(game_ids);
      console.log({games:games, game_ids:game_ids, team_games:team_games, team_game_ids:team_game_ids, player_team_games:player_team_games})
      const games_by_game_id = index_group_sync(games, 'index', 'game_id')
      team_games = nest_children(team_games, games_by_game_id, 'game_id', 'game');

      var team_seasons = await db.team_season.where({season: common.season}).toArray();

    	const team_ids = team_seasons.map(ts => ts.team_id);
    	var teams = await db.team.bulkGet(team_ids);
    	const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');
    	const team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

      team_games = team_games.map(function(team_game){
        team_game.opponent_team_season = team_seasons_by_team_season_id[team_game.opponent_team_season_id];
        return team_game;
      })

      team_games_by_team_game_id = index_group_sync(team_games, 'index', 'team_game_id')
      player_team_games = nest_children(player_team_games, team_games_by_team_game_id, 'team_game_id', 'team_game');

    	var player_team_seasons = await db.player_team_season.where({season: common.season}).toArray();

    	const player_ids = player_team_seasons.map(pts => pts.player_id);
    	var players = await db.player.bulkGet(player_ids);
    	const players_by_player_id = index_group_sync(players, 'index', 'player_id');


    	player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
    	player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')

      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');
    	player_team_games = nest_children(player_team_games, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
      player_team_games = nest_children(player_team_games, team_games_by_team_game_id, 'team_game_id', 'team_game');
      const player_team_games_by_player_team_game_id = index_group_sync(player_team_games, 'index', 'player_team_game_id')

      weekly_awards = nest_children(weekly_awards, player_team_games_by_player_team_game_id, 'player_team_game_id', 'player_team_game' )

      weekly_awards = index_group_sync(weekly_awards, 'group', 'conference_season_id');

      console.log({weekly_awards:weekly_awards, conference_seasons:conference_seasons});

      conference_seasons.unshift({conference_season_id: null, conference: {conference_name: 'National'}})

      conference_seasons = nest_children(conference_seasons, weekly_awards, 'conference_season_id', 'weekly_awards')

      conference_seasons = conference_seasons.map(function(conference_season){
        award_weeks = deep_copy(weeks);

        conference_season.weekly_awards = index_group_sync(conference_season.weekly_awards, 'group', 'week_id');
        conference_season.weekly_awards = nest_children(award_weeks, conference_season.weekly_awards, 'week_id', 'awards')

        conference_season.weekly_awards = conference_season.weekly_awards.filter(w => w.awards != undefined && w.awards.length > 0);
        return conference_season;
      });

      console.log({weekly_awards:weekly_awards, conference_seasons:conference_seasons})

      player_team_seasons = player_team_seasons.sort((pts_a, pts_b) => pts_b.season_stats.games.weighted_game_score - pts_a.season_stats.games.weighted_game_score);

      player_team_seasons = player_team_seasons.slice(0,10)

      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            recent_games: recent_games,
                            conference_seasons: conference_seasons,
                            player_team_seasons: player_team_seasons

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/awards/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);


      $('#nav-heisman-tab').on('click', async function(){

        var url = '/static/html_templates/world/awards/heisman_table_template.html'
        var html = await fetch(url);
        html = await html.text();

        const renderedHtml = common.nunjucks_env.renderString(html, render_content);

        $('#nav-heisman').html(renderedHtml);

        draw_faces(common, '#nav-heisman')
      })

    }

    const action = async (common) => {
      const db = common.db;

    }

    const last_action = async (common) => {
      const db = common.db;

      face_in_view()
      $(window).scroll(face_in_view);


    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop;

        //console.log({elem:elem,'$(window).height()': $(window).height(), 'return': (elemBottom <= docViewBottom) && (elemTop >= docViewTop), elemTop: elemTop, elemBottom:elemBottom, docViewTop:docViewTop, docViewBottom:docViewBottom})

        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    function face_in_view() {

        $('.PlayerFace-Headshot[face_drawn="false"]').each( function(){
          //console.log($(this), isScrolledIntoView($(this)));
          if (isScrolledIntoView($(this))){
            draw_faces(common, '#'+$(this).parent().attr('id'))
            $(this).attr('face_drawn', 'true')
          }
        })

    }


    }



    const draw_faces = async (common, parent_div) => {
      const db = common.db;
      const season = common.season;
      const index_group_sync = common.index_group_sync;

      const player_ids = [];
      const face_div_by_player_id = {};

      console.log($(parent_div+' .PlayerFace-Headshot'));

      $(parent_div+' .PlayerFace-Headshot').each(function(ind, elem){
        if ($(elem).find('svg').length > 0){
          return true;
        }


        if (!(parseInt($(elem).attr('player_id')) in face_div_by_player_id)) {
          face_div_by_player_id[parseInt($(elem).attr('player_id'))] = [];

          player_ids.push(parseInt($(elem).attr('player_id')))
        }

        face_div_by_player_id[parseInt($(elem).attr('player_id'))].push(elem)
      })

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
      await last_action(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
