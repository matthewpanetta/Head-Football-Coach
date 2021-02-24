import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this.packaged_functions = params['packaged_functions'];
    }

    async getHtml() {
      console.log('this', this)
      nunjucks.configure({ autoescape: true });

      var db = null;
      var world_obj = {};
      const db_list = await this['packaged_functions']['get_databases_references']();
      console.log('this.db_list', db_list)
      var render_content = {world_list: []}

      $.each(db_list, function(ind, db){

        world_obj = db;
        console.log('world_obj', world_obj, db)
        //world_obj['world_id'] = parseInt(db['database_name'].replace('headfootballcoach', ''));
        render_content['world_list'].push(world_obj)
      });


      console.log('render_content', render_content)

      var url = '/static/html_templates/index.html'
      var html = await fetch(url);
      html = await html.text();

      return nunjucks.renderString(html, render_content);
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

        const teams = await packaged_functions['get_teams']({});

        $.each(teams, function(ind, Obj_Team){
          Obj_Team['team_seasons'] = [{'season': 2021, 'team_games': [{'week': 1, 'game_id': 1}, {'week': 3, 'game_id': 2}]}];
        });

        var ba_add = await db.team.bulkAdd(teams);
      });
    }

}
