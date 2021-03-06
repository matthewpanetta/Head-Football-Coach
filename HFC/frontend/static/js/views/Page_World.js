import AbstractView from "./AbstractView.js";

export default class extends AbstractView {

    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this.packaged_functions = params['packaged_functions'];
        this.db = params['db'];
    }

    async getHtml() {
      var startTime = performance.now()
      console.log('this', this)
      const db = this.db;
      nunjucks.configure({ autoescape: true });
      var query_to_dict = this.packaged_functions.query_to_dict;

      var world_obj = {};

      var render_content = {team_list: [], page: {PrimaryColor: '1763B2', SecondaryColor: '000000'}, world_id: this.params['world_id']};
      var teams = await db.team.toArray();
      var distinct_team_seasons = [];

      // $.each(teams, async function(ind, team){
      //   team['team_season'] = await team.team_season_for_year(db, 2021);
      // });

      $.each(teams,  function(ind, team){
        console.log(typeof team);
        console.log('team', team)
        console.log('team.team_season', team['team_season'])
        console.log('team.team_season.rankings', team.team_season.rankings)

      });
      teams = teams.filter(team => team.team_season.rankings.national_rank[0] <= 25);

      teams.sort(function(a, b) {
          if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0]) return -1;
          if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
          return 0;
        });

      render_content['allTeams'] = teams;

      const player_team_seasons = await query_to_dict(await db.player_team_season.toArray(), 'many_to_one', 'team_season_id');
      const players = await query_to_dict(await db.player.toArray(), 'one_to_one','player_id');

      $.each(player_team_seasons, function(team_season_id, player_team_season){
        player_team_season['player'] = players[player_team_season.player_id];
      });
      console.log('player_team_seasons', player_team_seasons);

      $.each(render_content['allTeams'], function(ind, team){
        team.team_season = team_seasons[team.team_id][0];
        team.players = player_team_seasons[team.team_season.team_season_id];

      });
      console.log('render_content', render_content)

      var url = '/static/html_templates/world.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = this['packaged_functions']['nunjucks_env'].renderString(html, render_content);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

      return renderedHtml
    }



    async action() {
      //Show initial 'new world' modal
      $('#create-world-row').on('click', function(){
        $('#indexCreateWorldModal').css({'display': 'block'});

        //Close modal if clicking outside modal
        $(window).on('click', function(event) {
          if ($(event.target)[0] == $('#indexCreateWorldModal')[0]) {
            $('#indexCreateWorldModal').css({'display': 'none'});
            $(window).unbind();
          }
        });

        //Function to close modal
        $('#indexCreateWorldModalCloseButton').on('click', function(){
          $('#indexCreateWorldModal').css({'display': 'none'});
          $(window).unbind();
        });
      });


      const packaged_functions = this.packaged_functions;
      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        const db = await packaged_functions['create_new_db']();
        console.log('Created new db!', db)

        const teams = await packaged_functions['get_teams']({})

        var ba_add = await db.team.bulkAdd(teams);
        console.log('ba_add', ba_add);



      });
    }
}
