
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      const season = common.season;

      const current_league_season = await db.league_season.where({season:season}).first();

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Rankings',
        group_name: 'World',
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      var teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

      var conferences = await db.conference.toArray();
      var conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id')

      var conference_seasons = await db.conference_season.where({season: season}).toArray();
      conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')

      var conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index','conference_season_id');

      var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray();
      team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season')
      team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
      var team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index','team_season_id');

      const games = await db.game.filter(g => g.season == season && g.bowl != null && g.bowl.is_playoff == true).toArray();
      const games_by_game_id = index_group_sync(games, 'index', 'game_id')
      const game_ids = games.map(g => g.game_id);

      const team_games = await db.team_game.where('game_id').anyOf(game_ids).toArray();
      const team_games_by_team_game_id = index_group_sync(team_games, 'index', 'team_game_id')

      console.log({team_seasons:team_seasons, team_seasons_by_team_season_id:team_seasons_by_team_season_id, teams_by_team_id:teams_by_team_id})

      var distinct_team_seasons = [];

      dropped_teams = team_seasons.filter(ts => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[1] <= 25);
      bubble_teams = team_seasons.filter(ts => ts.rankings.national_rank[0] > 25 && ts.rankings.national_rank[0] < 29);

      team_seasons = team_seasons.filter(ts => ts.rankings.national_rank[0] <= 25);

      team_seasons.sort(function(ts_a, ts_b) {
          if (ts_a.rankings.national_rank[0] < ts_b.rankings.national_rank[0]) return -1;
          if (ts_a.rankings.national_rank[0] > ts_b.rankings.national_rank[0]) return 1;
          return 0;
        });

      const recent_games = await common.recent_games(common);

      const playoffs = current_league_season.playoffs;

      if (playoffs.playoffs_started){
        for (const playoff_round of playoffs.playoff_rounds){
          for (const playoff_game of playoff_round.playoff_games){
            console.log({playoff_game:playoff_game})
            playoff_game.game = games_by_game_id[playoff_game.game_id];
            playoff_game.team_objs = nest_children(playoff_game.team_objs, team_seasons_by_team_season_id, 'team_season_id', 'team_season')
            playoff_game.team_objs = nest_children(playoff_game.team_objs, team_games_by_team_game_id, 'team_game_id', 'team_game')

          }
        }
      }
      else {
        var projected_playoff_teams = team_seasons.slice(0, playoffs.number_playoff_teams);
        console.log({playoffs:playoffs, projected_playoff_teams:projected_playoff_teams, number_playoff_teams:playoffs.number_playoff_teams})
        for (var playoff_round of playoffs.playoff_rounds){
          console.log({playoff_round:playoff_round})
          playoff_round.round_of = 2 * playoff_round.playoff_games.length;
          for (var playoff_game of playoff_round.playoff_games){
            for (var team_obj of playoff_game.team_objs){
              team_obj.team_season = projected_playoff_teams[team_obj.seed - 1];
              console.log({team_obj:team_obj, playoff_game:playoff_game,playoff_round:playoff_round })
            }
          }
        }
      }

      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            team_list: [],
                            world_id: common.params['world_id'],
                            team_seasons: team_seasons,
                            recent_games: recent_games,
                            dropped_teams: dropped_teams,
                            bubble_teams: bubble_teams,
                            playoffs: playoffs

                          };
      common.render_content = render_content;
      console.log('render_content', render_content)

      var url = '/static/html_templates/world/rankings/template.njk'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;

      PopulateTop25(common);

    }

    const PopulateTop25 = async (common) => {

      const db = common.db;
      const index_group = common.index_group;
      const season = common.season;

      const ordinal = common.ordinal;

      var this_week = await db.week.where({season: season}).toArray();
      console.log('this_week', this_week)
      this_week = this_week.filter(week => week.is_current)[0];
      const this_week_id = this_week.week_id;
      const last_week_id = this_week_id-1;

      var top_25_team_seasons = await db.team_season.where({season:season}).and(ts => ts.team_id > 0).toArray();
      console.log('top_25_team_seasons', top_25_team_seasons)
      top_25_team_seasons = top_25_team_seasons.filter(ts => ts.rankings.national_rank[0] <= 25).sort(function(a, b) {
          if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;
          if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
          return 0;
        });;
      const team_ids = top_25_team_seasons.map(ts => ts.team_id);
      const teams = await db.team.bulkGet(team_ids);

      const this_week_team_games = await index_group(await db.team_game.where({week_id: this_week_id}).toArray(), 'one_to_one','team_season_id');
      const last_week_team_games = await index_group(await db.team_game.where({week_id: last_week_id}).toArray(), 'one_to_one','team_season_id');

      const total_team_games = Object.values(this_week_team_games).concat(Object.values(last_week_team_games));
      const total_team_game_ids = total_team_games.map(team_game => team_game.game_id);

      const games = await index_group(await db.game.bulkGet(total_team_game_ids), 'one_to_one','game_id');

      const all_teams = await index_group(await db.team.where('team_id').above(0).toArray(), 'index','team_id');
      const all_team_games = await index_group(await db.team_game.where('week_id').anyOf([this_week_id, last_week_id]).toArray(), 'index','team_game_id');
      const all_team_seasons = await index_group(await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray(), 'index','team_season_id');

      const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index','conference_season_id');
      const conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index','conference_id');

      var team_counter = 0;
      $.each(top_25_team_seasons, function(ind, team_season){
        team_season.team = teams[team_counter];
        team_season.national_rank = team_season.rankings.national_rank[0];

        team_season.conference_season = conference_seasons_by_conference_season_id[team_season.conference_season_id]
        team_season.conference = conferences_by_conference_id[team_season.conference_season.conference_id]

        team_counter +=1;
        if (team_season.team_season_id in this_week_team_games) {
          team_season.this_week_team_game = this_week_team_games[team_season.team_season_id];
          team_season.this_week_team_game.game = games[team_season.this_week_team_game.game_id];

          team_season.this_week_team_game.opponent_team_season = all_team_seasons[team_season.this_week_team_game.opponent_team_season_id];
          team_season.this_week_team_game.opponent_team_game = all_team_games[team_season.this_week_team_game.opponent_team_game_id];
          team_season.this_week_team_game.opponent_team = all_teams[team_season.this_week_team_game.opponent_team_season.team_id];

          if (team_season.this_week_team_game.is_home_team == true){
            team_season.this_week_team_game.game_location = 'home'
            team_season.this_week_team_game.game_location_char = 'vs.'
          }
          else {
            team_season.this_week_team_game.game_location = 'home'
            team_season.this_week_team_game.game_location_char = 'vs.'
          }
        }
        else {
          team_season.this_week_team_game = null;
        }


        if (team_season.team_season_id in last_week_team_games) {
          team_season.last_week_team_game = last_week_team_games[team_season.team_season_id];
          team_season.last_week_team_game.game = games[team_season.last_week_team_game.game_id];

          team_season.last_week_team_game.opponent_team_season = all_team_seasons[team_season.last_week_team_game.opponent_team_season_id];
          team_season.last_week_team_game.opponent_team_game = all_team_games[team_season.last_week_team_game.opponent_team_game_id];
          team_season.last_week_team_game.opponent_team = all_teams[team_season.last_week_team_game.opponent_team_season.team_id];

          if (team_season.last_week_team_game.is_home_team == true){
            team_season.last_week_team_game.game_location = 'home'
            team_season.last_week_team_game.game_location_char = 'vs.'
          }
          else {
            team_season.last_week_team_game.game_location = 'home'
            team_season.last_week_team_game.game_location_char = 'vs.'
          }
        }
        else {
          team_season.last_week_team_game = null;
        }
      });

      console.log('In PopulateTopTeams!', top_25_team_seasons)


      let table_template_url = '/static/html_templates/world/rankings/ranking_table_template.njk'
      let table_html = await fetch(table_template_url);
      let table_html_text = await table_html.text();

      var renderedHtml = await common.nunjucks_env.renderString(table_html_text, {top_25_team_seasons:top_25_team_seasons})
      console.log({renderedHtml:renderedHtml, top_25_team_seasons:top_25_team_seasons})
      $('#Top25Table-body').empty();
      $('#Top25Table-body').append(renderedHtml);

      init_basic_table_sorting(common, '#Top25Table', null)


    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Ranking/');
      common.startTime = startTime;

      await getHtml(common);
      common.stopwatch(common, 'Done getHtml');
      await action(common);
      common.stopwatch(common, 'Done action');
      await common.add_listeners(common);
      common.stopwatch(common, 'Done listeners');
      await common.initialize_scoreboard();
      common.stopwatch(common, 'Done scoreboard');

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
