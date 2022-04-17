const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const index_group = common.index_group;

  var search_keyword = decodeURI(common.params.search_keyword);

  var search_keywords = search_keyword.split(' ')


  const NavBarLinks = await common.nav_bar_links({
    path: 'Search',
    group_name: 'Search',
    db: db
  });

  var teams = await db.team.where('team_id').aboveOrEqual(0).toArray();
  var team_seasons = await db.team_season.where('team_id').aboveOrEqual(0).toArray();

  team_seasons = nest_children(team_seasons, teams, 'team_id', 'team')

  var player_results = await db.player.toArray();
  var team_results = teams.filter(t => t.team_id > 0);

  for (const search_keyword of search_keywords){
    player_results = player_results.filter(p => p.name.last.toLowerCase().includes(search_keyword.toLowerCase()) || p.name.first.toLowerCase().includes(search_keyword.toLowerCase()))
    team_results = team_results.filter(t =>  t.school_name.toLowerCase().includes(search_keyword.toLowerCase()) || t.team_name.toLowerCase().includes(search_keyword.toLowerCase()));
  }

  var player_ids = player_results.map(p => p.player_id);
  var player_team_seasons = await db.player_team_season.where('player_id').anyOf(player_ids).toArray();

  player_team_seasons = nest_children(player_team_seasons, team_seasons, 'team_season_id', 'team_season')

  var player_team_seasons_by_player_id = index_group_sync(player_team_seasons, 'group', 'player_id');

  player_results = nest_children(player_results, player_team_seasons_by_player_id, 'player_id', 'player_team_seasons');
  console.log({player_results:player_results})
  for (const player of player_results){
    player.player_team_seasons = player_team_seasons_by_player_id[player.player_id] ?? [];
    player.player_team_season = player.player_team_seasons.at(-1)
  }

  console.log({player_results:player_results})


  var search_results = {
    Players: player_results,
    Teams: team_results
  }

  common.page = {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        game: game,
                        search_keywords:search_keywords,
                        search_results:search_results,
                        total_results: search_results.Players.length + search_results.Teams.length
                      }

  common.render_content = render_content;

  await console.log('render_content', render_content)

  var url = '/static/html_templates/search/search/template.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml);

}

    const action = async (common) => {

      var player_table = $('#player-search-table').DataTable({
          "filter": false,
          "ordering": true,
          "lengthChange" : false,
          "pageLength": 10,
          "pagingType": "full_numbers",
          "paginationType": "full_numbers",
          "paging": true,
          'order': [[ 5, "desc" ], [ 6, "desc" ]],
      })

      var team_table = $('#team-search-table').DataTable({
          "filter": false,
          "ordering": true,
          "lengthChange" : false,
          "pageLength": 10,
          "pagingType": "full_numbers",
          "paginationType": "full_numbers",
          "paging": true,
          'order': [[ 1, "asc" ]],
      })

    }


$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/Search/:search_keyword/');
  common.startTime = startTime;

  await getHtml(common);
  await action(common);
  await common.add_listeners(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
