import AbstractView from "./AbstractView.js";

export default class extends AbstractView {

    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this.packaged_functions = params['packaged_functions'];
        this.db = params['db'];
    }

    async getHtml() {
      console.log('this', this)
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(this.params.team_id);
      const db = this.db;

      const team = await db.team.get({team_id: team_id})
      const team_season = await db.team_season.get({team_id: team_id, season: 2021});

      team.team_season = team_season;

      const game_ids = team.team_season.games.map(game => parseInt(game.game_id));
      const games = await db.game.bulkGet(game_ids);

      const opponent_team_season_ids = team.team_season.games.map(game => parseInt(game.opponent_team_season_id));
      const opponent_team_seasons = await db.team_season.bulkGet(opponent_team_season_ids);

      const opponent_team_ids = opponent_team_seasons.map(team_season => parseInt(team_season.team_id));
      const opponent_teams = await db.team.bulkGet(opponent_team_ids);


      var counter_games = 0;
      const pop_games = await $.each(games, async function(ind, game){
        game.opponent_team = opponent_teams[counter_games];
        game.opponent_team_season = opponent_team_seasons[counter_games];

        counter_games +=1;
      });


      var render_content = {
                            page:     {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display},
                            world_id: this.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            games: games
                          }

      console.log('render_content', render_content)

      var url = '/static/html_templates/team.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await this['packaged_functions']['nunjucks_env'].renderString(html, render_content)

      return renderedHtml;
    }



    async action() {
      return null;
    }
}
