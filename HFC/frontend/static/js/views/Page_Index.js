import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.setTitle("Dashboard");
        this['db_list'] = params['db_list'];
        console.log('params', params)
        console.log('this', this)

    }

    async getHtml() {
      var world_list = []
      var db = null;

      $.each(this.db_list, function(db_name, db){
        var world_obj = {};

        world_obj = db.world;

      });

      var url = '/static/html_templates/index.html'
      var html = await fetch(url);
      html = await html.text();


    }
}
