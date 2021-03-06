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
      const positions = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'OC', 'DE', 'DT', 'OLB', 'MLB', 'CB', 'S', 'K', 'P'];
      const first_names = ["Tom", "Miles", "Travis", "Jack", "Maina", "Phil", "Andrew"];
      const last_names = ['Kennedy', 'Wilson', 'Latham', 'Jackson', 'Murphy', 'Shon', "Dodson", 'Alley', 'Cate'];

      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        var par = $('#indexCreateWorldModalCloseButton').parent();
        $(par).empty();
        $(par).append('<div>Creating new world!</div>');
        const new_db = await packaged_functions['create_new_db']();

        const db = new_db['db'];
        const new_season_info = new_db['new_season_info'];

        const world_id = new_season_info.world_id;
        const season = new_season_info.current_season;

        const phases = await packaged_functions['create_phase'](db, season);
        const weeks = await packaged_functions['create_week'](db, phases);

        var teams = await packaged_functions['get_teams']({conference: ['Big 12 Conference', 'Southeastern Conference', 'Big 10 Conference', 'Atlantic Coast Conference', 'American Athletic Conference', 'Pac-12 Conference']});
        const num_teams = teams.length;

        var teams_added = await db.team.bulkAdd(teams);
        $(par).append('<div>Adding Team Seasons</div>')
        var teams = await db.team.toArray();
        var team_seasons_tocreate = [];

        var team_id = 1;
        $.each(teams, function(ind, Obj_Team){
          team_seasons_tocreate.push({team_id: Obj_Team.team_id,
                                      season: season,
                                      conference_name: Obj_Team.conference_name,
                                      record: {
                                        wins: 0, losses: 0, conference_wins: 0, conference_losses: 0, games_played: 0, conference_gb: 0, win_streak: 0
                                      },
                                      rankings: {
                                        division_rank: [], national_rank: []
                                      },
                                      playoff: {},
                                      broadcast: {
                                        national_broadcast: 0, regional_broadcast: 0
                                      },
                                      recruiting: {
                                        scholarships_to_offer: 25,
                                        recruiting_class_rank: 1,
                                        points_per_week: 100
                                      },
                                      rating: {
                                        overall: Math.floor(Math.random() * 100),
                                        offense: Math.floor(Math.random() * 100),
                                        defense: Math.floor(Math.random() * 100)
                                      },
                                      results: {
                                        conference_champion: false,
                                        national_champion: false,
                                        bowl: null,
                                      }
                                    });

          team_id += 1;
        });


        var team_seasons_tocreate_added = await db.team_season.bulkAdd(team_seasons_tocreate);
        $(par).append('<div>Ranking teams</div>')
        const team_seasons = await db.team_season.toArray();

        team_seasons.sort(function(a, b) {
            if (a.rating.overall < b.rating.overall) return -1;
            if (a.rating.overall > b.rating.overall) return 1;
            return 0;
          });

        var rank_count = 1;
        $.each(team_seasons, function(ind, team_season){
          team_season.rankings.national_rank.push(rank_count);

          rank_count +=1;
        });

        const team_season_updated = await db.team_season.bulkPut(team_seasons);
        $(par).append('<div>Adding Players</div>')
        var players_tocreate = [];

        $.each(team_seasons, function(ind, team_season){
          for(var i = 0; i<=50; i++){
            players_tocreate.push({ name:{
                                      first: first_names[Math.floor(Math.random() * first_names.length)],
                                      last:  last_names[Math.floor(Math.random() * last_names.length)]
                                      },
                                    redshirt: {previous: false, current: false},
                                    jersey_number: 21,
                                    hometown: {city: '', state: ''},
                                    position: positions[Math.floor(Math.random() * positions.length)],
                                    player_face: {},
                                    body: {
                                      height_inches: 73,
                                      height: "6'1",
                                      weight: 225
                                    },
                                    recruiting: {
                                      is_recruit: false,
                                      speed: 1,
                                      stars: 4,
                                      signed: false,
                                      stage: 'Signed',
                                      rank: {
                                        national: 100,
                                        position_rank: 20,
                                        state: 10
                                      },
                                      measurables: {
                                        fourty_yard_dash: 4.5,
                                        bench_press_reps: 10,
                                        vertical_jump: 31
                                      }
                                    },
                                    personality: {
                                      leadership: 80,
                                      work_ethic: 75,
                                      desire_for_winner: 50,
                                      loyalty: 70,
                                      desire_for_playtime: 90
                                    }
                              })
          }
        });
        var players_tocreate_added = await db.player.bulkAdd(players_tocreate);
        $(par).append('<div>Adding Players to teams</div>')
        const players = await db.player.toArray();
        var player_team_seasons_tocreate = [];

        var count = 0;
        $.each(players, function(ind, player){
          player_team_seasons_tocreate.push({ player_id: player.player_id,
                                              team_season_id: team_seasons[count % num_teams]['team_season_id'],
                                              is_captain: false,
                                              class: {
                                                class_name: 'JR',
                                                redshirted: false
                                              },
                                              post_season_movement: null, //[quit, graduate, draft, transfer]
                                              top_stats: []
                                            });

            count +=1;

        });
        var player_team_seasons_tocreate_added = await db.player_team_season.bulkAdd(player_team_seasons_tocreate);


        window.location.href = `/World/${world_id}`
      });
    }

}
