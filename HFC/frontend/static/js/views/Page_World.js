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

      var render_content = {team_list: [], page: {PrimaryColor: 'f2f2f2'}}
      render_content['team_list'] = await this.db.team.toArray();
      console.log('render_content', render_content)

      var url = '/static/html_templates/world.html'
      var html = await fetch(url);
      html = await html.text();

      return this['packaged_functions']['nunjucks_env'].renderString(html, render_content);
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
