'use strict';
import AbstractView from "./AbstractView.js";

export default class extends AbstractView {

    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this.packaged_functions = params['packaged_functions'];
        this.db = params['db'];
    }

    async getHtml() {
      const db = this.db;
      nunjucks.configure({ autoescape: true });
      var query_to_dict = this.packaged_functions.query_to_dict;

      var world_obj = {};

      const NavBarLinks = await this.packaged_functions.nav_bar_links({
        path: 'Rankings',
        group_name: 'World',
        db: db
      });

      var render_content = {team_list: [], page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks}, world_id: this.params['world_id']};
      var teams = await db.team.toArray();
      var conferences = await query_to_dict(await db.conference.toArray(), 'one_to_one','conference_id');
      var conference_seasons = await query_to_dict(await db.conference_season.where({season: 2021}).toArray(), 'one_to_one','conference_season_id');
      var team_seasons = await query_to_dict(await db.team_season.where({season: 2021}).toArray(), 'one_to_one','team_id');
      var distinct_team_seasons = [];

      $.each(teams, async function(ind, team){
        team.team_season =team_seasons[team.team_id]
        team.team_season.conference_season = conference_seasons[team.team_season.conference_season_id];
        team.team_season.conference_season.conference = conferences[team.team_season.conference_season.conference_id];

      });

      teams = teams.filter(team => team.team_season.rankings.national_rank[0] <= 25);

      teams.sort(function(a, b) {
          if (a.team_season.rankings.national_rank[0] < b.team_season.rankings.national_rank[0]) return -1;
          if (a.team_season.rankings.national_rank[0] > b.team_season.rankings.national_rank[0]) return 1;
          return 0;
        });


      render_content['teams'] = teams
      console.log('render_content', render_content)

      var url = '/static/html_templates/rankings.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = this['packaged_functions']['nunjucks_env'].renderString(html, render_content);
      return renderedHtml
    }



    async action() {
      const packaged_functions = this.packaged_functions;
      const db = this.db;

    }


}
