
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      const season = common.season;

      const conference_id = common.params.conference_id;
      console.log('conference_id', conference_id, common)

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Standings',
        group_name: 'World',
        db: db
      });

      const weeks = await db.week.where({season:season}).toArray();
      const week_ids = weeks.map(week => week.week_id);

      var teams_by_team_id = await index_group(await db.team.toArray(), 'index','team_id');
      var conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index','conference_id');
      var conference_seasons =  await db.conference_season.where({season: season}).toArray();
      var team_seasons = await db.team_season.where({season: season}).toArray();
      var distinct_team_seasons = [];

      var games_by_game_id = await index_group(await db.game.where('week_id').anyOf(week_ids).toArray(), 'index', 'game_id');
      var team_games = await db.team_game.where('week_id').anyOf(week_ids).toArray();

      $.each(team_games, function(ind, team_game){
          team_game.game = games_by_game_id[team_game.game_id];
      });

      team_games = team_games.filter(tg => tg.game.was_played == true);
      var team_games_by_team_season_id = await index_group(team_games, 'group','team_season_id');
      var team_games_by_team_game_id = await index_group(team_games, 'index','team_game_id');


      $.each(team_seasons, async function(ind, team_season){
        team_season.team =teams_by_team_id[team_season.team_id];

        team_season.team_games = team_games_by_team_season_id[team_season.team_season_id];
        team_season.conference_outcomes = {'record': team_season.conference_record_display, gb: team_season.record.conference_gb, points_for: 0, points_against: 0, games_played: 0}
        team_season.overall_outcomes = {'record': team_season.record_display, points_for: 0, points_against: 0, games_played: 0}

        $.each(team_season.team_games, function(ind, team_game){
          team_game.opponent_team_game = team_games_by_team_game_id[team_game.opponent_team_game_id]
          team_season.overall_outcomes.games_played += 1;
          team_season.overall_outcomes.points_for += team_game.points;
          team_season.overall_outcomes.points_against += team_game.opponent_team_game.points;

          if (team_game.game.is_conference_game){
            team_season.conference_outcomes.games_played += 1;
            team_season.conference_outcomes.points_for += team_game.points;
            team_season.conference_outcomes.points_against += team_game.opponent_team_game.points;
          }
        });

        if (team_season.overall_outcomes.games_played > 0){
          team_season.overall_outcomes.ppg = common.round_decimal(team_season.overall_outcomes.points_for / team_season.overall_outcomes.games_played, 1)
          team_season.overall_outcomes.papg = common.round_decimal(team_season.overall_outcomes.points_against / team_season.overall_outcomes.games_played, 1)
          team_season.overall_outcomes.mov = common.round_decimal(team_season.overall_outcomes.ppg - team_season.overall_outcomes.papg, 1);

          if (team_season.overall_outcomes.mov > 0) {
            team_season.overall_outcomes.color = 'W';
          }
          else if (team_season.overall_outcomes.mov < 0) {
            team_season.overall_outcomes.color = 'L';
          }
        }

        if (team_season.conference_outcomes.games_played > 0){
          team_season.conference_outcomes.ppg = common.round_decimal(team_season.conference_outcomes.points_for / team_season.conference_outcomes.games_played, 1)
          team_season.conference_outcomes.papg = common.round_decimal(team_season.conference_outcomes.points_against / team_season.conference_outcomes.games_played, 1)
          team_season.conference_outcomes.mov = common.round_decimal(team_season.conference_outcomes.ppg - team_season.conference_outcomes.papg, 1);

          if (team_season.conference_outcomes.mov > 0) {
            team_season.conference_outcomes.color = 'W';
          }
          else if (team_season.conference_outcomes.mov < 0) {
            team_season.conference_outcomes.color = 'L';
          }
        }
        else {
          team_season.conference_outcomes.ppg = '-'
          team_season.conference_outcomes.papg = '-'
          team_season.conference_outcomes.mov = '-';
        }
      });

      var team_seasons_by_conference_season_id = await index_group(team_seasons, 'group','conference_season_id');

      $.each(conference_seasons, function(ind, conference_season){
        conference_season.conference = conferences_by_conference_id[conference_season.conference_id];
        conference_season.team_seasons = team_seasons_by_conference_season_id[conference_season.conference_id];

        conference_season.team_seasons = conference_season.team_seasons.sort(function(a, b) {
            if (a.rankings.division_rank[0] < b.rankings.division_rank[0]) return -1;
            if (a.rankings.division_rank[0] > b.rankings.division_rank[0]) return 1;
            return 0;
          });

      })

      conference_seasons = conference_seasons.sort(function(conference_season_a, conference_season_b) {
          if (conference_season_a.conference.conference_id == conference_id) return -1;
          if (conference_season_b.conference.conference_id == conference_id) return 1;
          if (conference_season_a.conference.conference_name < conference_season_b.conference.conference_name) return -1;
          return 1;
        })


      const recent_games = await common.recent_games(common);


      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            world_id: common.params['world_id'],
                            team_list: [],
                            recent_games: recent_games,
                            conference_seasons: conference_seasons,
                          };

      common.render_content = render_content;


      console.log('render_content', render_content)

      var url = '/static/html_templates/world/standings/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);

    }

    const action = async (common) => {
      const db = common.db;
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      var common = await common_functions('/World/:world_id/Standings');
      if ( location.pathname.includes('/Conference/')){
        common = await common_functions('/World/:world_id/Standings/Conference/:conference_id');
      }

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
