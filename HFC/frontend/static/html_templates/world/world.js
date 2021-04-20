const getHtml = async (common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var query_to_dict = common.query_to_dict;

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'World',
        group_name: 'World',
        db: db
      });

      var render_content = {team_list: [], page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks}, world_id: common.world_id};
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

      var url = '/static/html_templates/world/template_world.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);
      //return renderedHtml

      $('#body').html(renderedHtml)
    }


    const action = async (common) => {
      const packaged_functions = common;
      const db = this.db;

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


      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        const db = await packaged_functions['create_new_db']();
        console.log('Created new db!', db)

        const teams = await packaged_functions['get_teams']({})

        var ba_add = await db.team.bulkAdd(teams);
        console.log('ba_add', ba_add);

      });
    }

$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/');

  await getHtml(common);
  await action(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );
})
