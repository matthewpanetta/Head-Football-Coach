const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const game_id = parseInt(common.params.game_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = 1;

  var game = await db.game.get({game_id: game_id});

  game.week = await db.week.get({week_id: game.week_id});

  game.home_team_game = await db.team_game.get({team_game_id: game.home_team_game_id});
  game.away_team_game = await db.team_game.get({team_game_id: game.away_team_game_id});

  game.home_team_game.team_season = await db.team_season.get({team_season_id: game.home_team_game.team_season_id});
  game.away_team_game.team_season = await db.team_season.get({team_season_id: game.away_team_game.team_season_id});

  game.home_team_game.team_season.team = await db.team.get({team_id: game.home_team_game.team_season.team_id});
  game.away_team_game.team_season.team = await db.team.get({team_id: game.away_team_game.team_season.team_id});

  console.log('game', game)

  if (game.was_played) {
    if (game.scoring.final[0] < game.scoring.final[1]) {
      game.home_outcome_letter = 'W';
      game.away_outcome_letter = 'L';
    }
    else {
      game.away_outcome_letter = 'W';
      game.home_outcome_letter = 'L';
    }
  }

  const NavBarLinks = await common.nav_bar_links({
    path: 'Game',
    group_name: 'Game',
    db: db
  });

  common.page = {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        game: game
                      }

  common.render_content = render_content;

  console.log('render_content', render_content)

  var url = '/static/html_templates/game/game/template.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml)

}

    const action = async (common) => {

    }




$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/Game/:game_id/');

  await getHtml(common);
  await action(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
