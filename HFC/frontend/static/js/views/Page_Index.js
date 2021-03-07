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

        var query_to_dict = packaged_functions.query_to_dict;

        const db = new_db['db'];
        const new_season_info = new_db['new_season_info'];

        const world_id = new_season_info.world_id;
        const season = new_season_info.current_season;

        const phases = await packaged_functions['create_phase'](season);
        const weeks = await packaged_functions['create_week'](phases);

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
                                      games: [],
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
        var team_seasons = await db.team_season.toArray();

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

        var team_season_updated = await db.team_season.bulkPut(team_seasons);
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


        var games_to_create = [];
        var team_season_schedule_tracker = {}
        const games_per_team = 10;
        const zip = (a, b) => a.map((k, i) => [k, b[i]]);


        $.each(team_seasons, function(ind, team_season){
          team_season_schedule_tracker[team_season.team_season_id] = {
            games_to_schedule: games_per_team, games_scheduled: 0,
            weeks_scheduled: [], opponents_scheduled: [],
            home_games: 0, away_games: 0,
          }
        });

        var scheduling_teams = true;
        var team_season_id_list = [];
        var team_set_a = [], team_set_b = [], zipped_set = [], teams_to_schedule=[], games_to_create_ids=[];
        var week_id = 1;
        var last_game = await db.game.orderBy('game_id').first();
        var next_game_id = 1;
        if (!(last_game === undefined)){
          next_game_id = last_game.game_id + 1;
        }

        team_seasons = await query_to_dict(await db.team_season.where({season: 2021}).toArray(), 'one_to_one','team_id');
        console.log('team_seasons' , team_seasons)
        while (scheduling_teams) {
          console.log('Scheduling week' , week_id)
          team_season_id_list = Object.keys(team_season_schedule_tracker);
          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].games_to_schedule > 0)
          team_season_id_list.sort(function(t1, t2){
            return team_season_schedule_tracker[t1].games_scheduled - team_season_schedule_tracker[t2].games_scheduled + Math.random() - .5;
          });

          $.each(team_season_id_list, function(ind, obj){
            if (ind%2 == 0){
              team_set_a.push(obj);
            }
            else {
              team_set_b.push(obj);
            }
          });

          zipped_set = zip(team_set_a, team_set_b);
          //console.log('zipped_set', zipped_set)
          $.each(zipped_set, function(ind, obj){
            var team_a = obj[0], team_b = obj[1];

            if (!(team_a in team_season_schedule_tracker[team_b].opponents_scheduled)) {
              team_season_schedule_tracker[team_a].games_to_schedule -=1;
              team_season_schedule_tracker[team_a].games_scheduled   +=1;
              team_season_schedule_tracker[team_a].home_games        +=1;
              team_season_schedule_tracker[team_a].weeks_scheduled.push(week_id);
              team_season_schedule_tracker[team_a].opponents_scheduled.push(team_b);

              team_season_schedule_tracker[team_b].games_to_schedule -=1;
              team_season_schedule_tracker[team_b].games_scheduled   +=1;
              team_season_schedule_tracker[team_b].away_games        +=1;
              team_season_schedule_tracker[team_b].weeks_scheduled.push(week_id);
              team_season_schedule_tracker[team_b].opponents_scheduled.push(team_a);

              team_seasons[team_a].games.push({week_id: week_id, game_id: next_game_id, opponent_team_season_id: team_b,opponent_team_id: team_seasons[team_b].team_id})
              team_seasons[team_b].games.push({week_id: week_id, game_id: next_game_id, opponent_team_season_id: team_a, opponent_team_id: team_seasons[team_a].team_id})

              games_to_create.push({
                game_id: next_game_id,
                home_team_season_id: team_a, away_team_season_id: team_b,
                week_id: week_id, game_time: '7:05PM', was_played: false,
                outcome: {home_team_score: null, away_team_score: null, winning_team_season_id: null, losing_team_season_id: null},
                rivalry: {}, bowl: {}, broadcast: {regional_broadcast: false, national_broadcast: false,}
              });

              games_to_create_ids.push(next_game_id);

              next_game_id +=1;
            }
          });


          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].games_to_schedule > 0)

          scheduling_teams = team_season_id_list.length > 1 && week_id < 16;
          week_id +=1;
          team_set_a = [];
          team_set_b = [];

        }

        const team_seasons_to_update = Object.values(team_seasons);

        console.log('games_to_create', games_to_create, games_to_create_ids)

        //const games_created = await db.game.bulkAdd(games_to_create, games_to_create_ids);
        const games_created = await db.game.bulkPut(games_to_create);
        team_season_updated = await db.team_season.bulkPut(team_seasons_to_update);
        console.log('team_season_schedule_tracker', team_season_schedule_tracker)

        window.location.href = `/World/${world_id}`
      });
    }

}
