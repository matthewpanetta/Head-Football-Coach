
    const getHtml = async(common) => {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(common.params.team_id);
      const season = common.season;
      const db = common.db;
      const query_to_dict = common.query_to_dict;

      const NavBarLinks = await common.nav_bar_links({
        path: 'History',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await common.team_header_links({
        path: 'History',
        season: common.params.season,
        db: db
      });

      const league_seasons = await db.league_season.toArray();
      const league_seasons_by_season = index_group_sync(league_seasons, 'index', 'season')

      const conferences = await db.conference.toArray();
      const conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

      var conference_seasons = await db.conference_season.toArray();
      conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')

      const conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id');


      const team = await db.team.get(team_id);
      var team_season = await db.team_season.get({team_id: team_id, season: season});
      var team_seasons = await db.team_season.where({team_id: team_id}).toArray()

      team.team_season = team_season;
      team.team_season.conference_season = conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
      team.team_season.conference_season.conference = conferences_by_conference_id[team.team_season.conference_season.conference_id];

      team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season')
      team_seasons = nest_children(team_seasons, league_seasons_by_season, 'season', 'league_season')

      const bowl_game_ids = team_seasons.map(function(g){
        if (g.results.bowl){
          return g.results.bowl.game_id
        }
        return undefined
      }).filter(g_id => g_id != undefined);

      const bowl_games = await db.game.bulkGet(bowl_game_ids);
      const bowl_games_by_game_id = index_group_sync(bowl_games, 'index', 'game_id')

      var ts_index = 0;
      var ts_cs_list = []
      var previous_conference_id = -1;
      for (const team_season of team_seasons){

        team_season.final_conference_rank = team_season.rankings.division_rank[0];

        team_season.final_national_rank = team_season.rankings.national_rank[0];
        team_season.first_national_rank = team_season.rankings.national_rank[team_season.rankings.national_rank.length - 1];
        team_season.best_national_rank = team_season.rankings.national_rank.reduce((acc, val) => Math.min(acc,val), 999);
        team_season.worst_national_rank = team_season.rankings.national_rank.reduce((acc, val) => Math.max(acc,val), 1);

        if (team_season.conference_season.conference.conference_id != previous_conference_id){
          ts_cs_list.push(ts_index)
          previous_conference_id = team_season.conference_season.conference.conference_id;
        }

        ts_index +=1;

        if (team_season.results.bowl){
          team_season.results.bowl.game = bowl_games_by_game_id[team_season.results.bowl.game_id];
        }

      }

      for (var i = 0; i < ts_cs_list.length; i++){
        ts_index = ts_cs_list[i];

        var team_season = team_seasons[ts_index]
        team_season.conference_row_span = (ts_cs_list[i+1] ?? team_seasons.length) - ts_cs_list[i];
      }

      for (const team_season of team_seasons){
        if (team_season.conference_row_span == undefined){
          team_season.conference_row_span = 0
        }
      }

      console.log({TeamHeaderLinks:TeamHeaderLinks})
      common.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     common.page,
                            world_id: common.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            team_seasons: team_seasons,
                            season: common.season,
                            all_teams: await common.all_teams(common, '/History/'),
                          }

      common.render_content = render_content;

      console.log('render_content', render_content)

      var url = '/static/html_templates/team/history/template.njk'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

      $('#body').html(renderedHtml);
    }


    const action = async (common) => {
      await common.geo_marker_action(common);

    }



    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Team/:team_id/Schedule/');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
