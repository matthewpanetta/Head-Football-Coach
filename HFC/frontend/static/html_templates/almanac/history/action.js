
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;

      // const weeks = await db.week.toArray();
      // const this_week = weeks.filter(w => w.is_current)[0];
      // await choose_all_americans(this_week, common)

      var world_obj = {};

      const weeks = await db.week.where({season: common.season}).toArray();
      const this_week = weeks.filter(w => w.is_current)[0];

      const NavBarLinks = await common.nav_bar_links({
        path: 'History',
        group_name: 'Almanac',
        db: db
      });


      var awards = await db.award.toArray();
      awards = awards.filter(a => a.award_group == 'individual');
      var player_team_season_ids =  awards.map(a => a.player_team_season_id);
      var player_team_seasons = await db.player_team_season.bulkGet(player_team_season_ids);

      var player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);
      var players_by_player_id = index_group_sync(players, 'index', 'player_id')



      var players = await db.team.where('team_id').above(0).toArray();

      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var team_seasons =  await db.team_season.where('team_id').above(0).toArray();

      for (var team_season of team_seasons){
        team_season.results.final_four = false;

        if (team_season.rankings.national_rank[1] <= 4){
          team_season.results.final_four = true;
        }
      }

      await db.team_season.bulkPut(team_seasons);

      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
      var distinct_team_seasons = [];
      var team_seasons_by_season =  index_group_sync(team_seasons, 'group','season');
      var team_seasons_by_team_season_id =  index_group_sync(team_seasons, 'index','team_season_id');


      player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player' );
      player_team_seasons = nest_children(player_team_seasons, team_seasons_by_team_season_id, 'team_season_id', 'team_season' );
      var player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')
      awards = nest_children(awards, player_team_seasons_by_player_team_season_id, 'player_team_season_id', 'player_team_season')
      var awards_by_season = index_group_sync(awards, 'group', 'season')

      console.log({db:db, awards_by_season:awards_by_season})
      var seasons = await db.league_season.toArray();

      var world_id = common.world_id

      for (var season of seasons){

        console.log({season: season})

        season.links = []
        season.links.push({'display': 'Schedule', 'href': `/World/${world_id}/Schedule/${season.season}`});
        season.links.push({'display': 'Standings', 'href': `/World/${world_id}/Standings/${season.season}`});
        season.links.push({'display': 'Player Stats', 'href': `/World/${world_id}/PlayerStats/${season.season}`});
        season.links.push({'display': 'Team Stats', 'href': `/World/${world_id}/TeamStats/${season.season}`});

        var season_team_seasons = team_seasons_by_season[season.season]
        season.preseason_number_1 = season_team_seasons.filter(ts => ts.rankings.national_rank[ts.rankings.national_rank.length - 1] == 1)[0]

        if (season.is_current_season && !(this_week.week_name == 'Season Recap')){
          season.final_four_runner_ups = [null,null,null]
          continue;
        }


        season.awards = awards_by_season[season.season]

        season.heisman_winner = season.awards.filter(a => a.award_group_type == 'Heisman')[0];

        season.national_champion = season_team_seasons.filter(ts => ts.results.national_champion)[0]

        season.final_four_runner_ups = season_team_seasons.filter(ts => ts.results.final_four && !(ts.results.national_champion))

        season.team_seasons = season_team_seasons;


        console.log({season: season})
      }


      // const player_team_seasons = await db.player_team_season.toArray();
      // const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);
      //
      // const player_ids = player_team_seasons.map(pts => pts.player_id);
      // var players = await db.player.bulkGet(player_ids);
      // const players_by_player_id = index_group_sync(players, 'index', 'player_id');

      // const player_team_seasons_by_player_team_season_id = index_group_sync(player_team_seasons, 'index', 'player_team_season_id')





      const recent_games = await common.recent_games(common);

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            teams: teams,
                            recent_games: recent_games,
                            seasons:seasons

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/almanac/history/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;

      draw_faces(common, '')
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

      const common = await common_functions('/World/:world_id/PlayerStats/Season/:season');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
