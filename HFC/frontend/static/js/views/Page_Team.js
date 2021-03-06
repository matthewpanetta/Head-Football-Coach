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

      const team = await this.db.team.get({team_id: team_id})

      var render_content = {
                            page:     {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display},
                            world_id: this.params['world_id'],
                            team_id:  team_id,
                            team: team
                          }
      console.log('render_content', render_content)

      var url = '/static/html_templates/team.html'
      var html = await fetch(url);
      html = await html.text();

      return this['packaged_functions']['nunjucks_env'].renderString(html, render_content);
    }



    async action() {
      return null;
    }
}
