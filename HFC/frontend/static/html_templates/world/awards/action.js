
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      var world_obj = {};

      var position_order_map = {
        'QB': 1,
        'RB': 2,
        'FB': 3,
        'WR': 4,
        'TE': 5,
        'OT': 6,
        'IOL': 7,
        'EDGE': 8,
        'DL': 9,
        'LB': 10,
        'CB': 11,
        'S': 12,
        'K': 13,
        'P': 14,
      }

      const position_group_map = {
        'QB': 'Offense',
        'RB': 'Offense',
        'FB': 'Offense',
        'WR': 'Offense',
        'TE': 'Offense',
        'OT': 'Offense',
        'IOL': 'Offense',

        'EDGE': 'Defense',
        'DL': 'Defense',
        'LB': 'Defense',
        'CB': 'Defense',
        'S': 'Defense',

        'K': 'Offense',
        'P': 'Defense',
      }

      const NavBarLinks = await common.nav_bar_links({
        path: 'Awards & Races',
        group_name: 'World',
        db: db
      });

      const awards = await db.award.where({season: common.season}).toArray();

      var weekly_awards = awards.filter(a => a.award_timeframe == 'week' && a.player_team_game_id != null);
      var preseason_awards = awards.filter(a => a.award_timeframe == 'pre-season');
      var regular_season_all_american_awards = awards.filter(a => a.award_timeframe == 'regular season' &&  a.award_group == 'position');
      var heisman_winner = awards.filter(a => a.award_group_type == 'Heisman')[0];

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
      var previous_player_team_seasons = await db.player_team_season.where({season: common.season - 1}).toArray();

    	const player_ids = player_team_seasons.map(pts => pts.player_id);
    	var players = await db.player.bulkGet(player_ids);
    	const players_by_player_id = index_group_sync(players, 'index', 'player_id');
      const previous_player_team_seasons_by_player_id = index_group_sync(previous_player_team_seasons, 'index', 'player_id');

    	player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season');
    	player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player')
      player_team_seasons = nest_children(player_team_seasons, previous_player_team_seasons_by_player_id, 'player_id', 'previous_player_team_season')

      const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id');
    	player_team_games = nest_children(player_team_games, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
      player_team_games = nest_children(player_team_games, team_games_by_team_game_id, 'team_game_id', 'team_game');
      const player_team_games_by_player_team_game_id = index_group_sync(player_team_games, 'index', 'player_team_game_id')

      weekly_awards = nest_children(weekly_awards, player_team_games_by_player_team_game_id, 'player_team_game_id', 'player_team_game' )

      weekly_awards = index_group_sync(weekly_awards, 'group', 'conference_season_id');

      preseason_awards = nest_children(preseason_awards, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
      preseason_awards_by_conference_season_id = index_group_sync(preseason_awards, 'group', 'conference_season_id');

      regular_season_all_american_awards = nest_children(regular_season_all_american_awards, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season');
      regular_season_all_american_awards_by_conference_season_id = index_group_sync(regular_season_all_american_awards, 'group', 'conference_season_id');

      if (heisman_winner != undefined){
        heisman_winner.player_team_season = player_team_seasons_by_player_team_season_id[heisman_winner.player_team_season_id];
      }

      console.log({weekly_awards:weekly_awards, conference_seasons:conference_seasons, preseason_awards:preseason_awards});

      conference_seasons.unshift({conference_season_id: null, conference: {conference_name: 'National'}})

      conference_seasons = nest_children(conference_seasons, weekly_awards, 'conference_season_id', 'weekly_awards')

      conference_seasons = conference_seasons.map(function(conference_season){
        award_weeks = deep_copy(weeks);

        conference_season.weekly_awards = index_group_sync(conference_season.weekly_awards, 'group', 'week_id');
        conference_season.weekly_awards = nest_children(award_weeks, conference_season.weekly_awards, 'week_id', 'awards')

        conference_season.weekly_awards = conference_season.weekly_awards.filter(w => w.awards != undefined && w.awards.length > 0);

        var this_conference_preseason_awards = preseason_awards_by_conference_season_id[conference_season.conference_season_id].sort((award_a, award_b) => position_order_map[award_a.award_group_type] - position_order_map[award_b.award_group_type])
        this_conference_preseason_awards = this_conference_preseason_awards.map(function(award){
          award.position_group = position_group_map[award.player_team_season.position]
          return award;
        });
        var this_conference_preseason_awards_by_position_group = index_group_sync(this_conference_preseason_awards, 'group', 'position_group');


        conference_season.preseason_awards = []

        for (var i = 0; i < this_conference_preseason_awards_by_position_group.Offense.length; i++){
          conference_season.preseason_awards.push({
            Offense: this_conference_preseason_awards_by_position_group.Offense[i],
            Defense: this_conference_preseason_awards_by_position_group.Defense[i],
          })
        }

        conference_season.regular_season_all_american_awards = []
        if (conference_season.conference_season_id in regular_season_all_american_awards_by_conference_season_id){
          var this_conference_regular_season_all_american_awards = regular_season_all_american_awards_by_conference_season_id[conference_season.conference_season_id].sort((award_a, award_b) => position_order_map[award_a.award_group_type] - position_order_map[award_b.award_group_type])
          this_conference_regular_season_all_american_awards = this_conference_regular_season_all_american_awards.map(function(award){
            award.position_group = position_group_map[award.player_team_season.position]
            return award;
          });
          var this_conference_regular_season_all_american_awards_by_position_group = index_group_sync(this_conference_regular_season_all_american_awards, 'group', 'position_group');




          for (var i = 0; i < this_conference_regular_season_all_american_awards_by_position_group.Offense.length; i++){
            conference_season.regular_season_all_american_awards.push({
              Offense: this_conference_regular_season_all_american_awards_by_position_group.Offense[i],
              Defense: this_conference_regular_season_all_american_awards_by_position_group.Defense[i],
            })
          }
        }


        return conference_season;
      });

      console.log({weekly_awards:weekly_awards, conference_seasons:conference_seasons})

      var heisman_race = player_team_seasons.sort((pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating);

      heisman_race = heisman_race.slice(0,10)

      const recent_games = await common.recent_games(common);

      var page = {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks}

      var display_options = {
        preseason: {display: 'none'},
        heisman: {display: 'none'},
        heisman_race: {display: 'none'},
        potw: {display: 'none'},
        season: {display: 'none'},
      }
      var display_items = []
      //Preseason & week 1
      if (Object.keys(weekly_awards).length == 0){
          //pre-season AA first
          //heisman race
          display_items = [
            {div_id: 'preseason', display: 'Preseason AAs', classes: ' selected-tab', other_attrs: `style='background-color: #${page.SecondaryColor}'`},
            {div_id: 'heisman-race', display: 'Heisman Race', classes: '', other_attrs: ''},
        ]

        display_options.preseason.display = 'block';
      }
      else if (heisman_winner != undefined) {
        display_items = [
          {div_id: 'heisman-winner', display: 'Heisman Winner', classes: ' selected-tab', other_attrs: `style='background-color: #${page.SecondaryColor}'`},
          {div_id: 'all-americans', display: 'All Americans', classes: '', other_attrs: ''},
          {div_id: 'weekly', display: 'POTW', classes: '', other_attrs: ''},
          {div_id: 'preseason', display: 'Preseason AAs', classes: '', other_attrs: ``},
        ]

        display_options.heisman.display = 'block';
      }
      else {
        display_items = [
          {div_id: 'weekly', display: 'POTW', classes: ' selected-tab', other_attrs: `style='background-color: #${page.SecondaryColor}'`},
          {div_id: 'heisman-race', display: 'Heisman Race', classes: '', other_attrs: ``},
          {div_id: 'preseason', display: 'Preseason AAs', classes: '', other_attrs: ``},
        ]

        display_options.potw.display = 'block';
      }
      // weekly awards - only if greater than 0
      // pre season awards
      // all americans
      // heisman winner
      // heisman race

      var render_content = {page:page,
                            team_list: [],
                            world_id: common.params['world_id'],
                            recent_games: recent_games,
                            conference_seasons: conference_seasons,
                            heisman_race: heisman_race,
                            heisman_winner:heisman_winner,
                            display_items:display_items,
                            display_options:display_options

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/awards/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);


      $('#nav-heisman-race-tab').on('click', async function(){


        var url = '/static/html_templates/world/awards/heisman_race_table_template.html'
        var html = await fetch(url);
        html = await html.text();

        const renderedHtml = common.nunjucks_env.renderString(html, render_content);
        console.log({this:this, renderedHtml:renderedHtml})
        $('#nav-heisman-race').html(renderedHtml);

        draw_faces(common, '#nav-heisman-race')
      })

    }

    const action = async (common) => {
      const db = common.db;

    }

    const last_action = async (common) => {
      const db = common.db;

      face_in_view()
      $(window).scroll(face_in_view);

      $('#nav-weekly-tab').on('click', function(){
        face_in_view()
      })
      $('#nav-preseason-tab').on('click', function(){
        face_in_view()
      })
      $('#nav-all-americans-tab').on('click', function(){
        face_in_view()
      })


    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop;

        return (($(elem).is(":visible")) && (elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    function face_in_view() {

        $('.PlayerFace-Headshot[face_drawn="false"]:visible').each( function(){
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
