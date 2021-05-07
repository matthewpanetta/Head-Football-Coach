
    const getHtml = async(common) => {
      nunjucks.configure({ autoescape: true });

      var db = null;
      var world_obj = {};
      const db_list = await common.get_databases_references();
      var render_content = {world_list: []}

      $.each(db_list, function(ind, db){

        world_obj = db;
        //world_obj['world_id'] = parseInt(db['database_name'].replace('headfootballcoach', ''));
        render_content['world_list'].push(world_obj)
      });


      console.log('render_content', render_content)

      var url = '/static/html_templates/index/index/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = nunjucks.renderString(html, render_content);

      $('#body').html(renderedHtml);
    }



    const action = async (common) => {

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

      $('#truncate-world-row').on('click', async function(){
        const get_databases_references = common.get_databases_references;


        var database_refs = await get_databases_references();
        var db = undefined;
        $.each(database_refs, async function(ind, db_obj){
          db = await db_obj.db;
          console.log('db', db)
          alert('trying to delete db')

          await db.delete();
        });

        const driver_db = await common.driver_db();

        const driver_worlds = await driver_db.world.toArray();
        const world_ids = driver_worlds.map(world => world.world_id);
        await driver_db.world.bulkDelete(world_ids);

        location.reload();
        return false;

      });



      const classes = ['FR', 'SO', 'JR', 'SR'];
      const positions = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'OC', 'DE', 'DT', 'OLB', 'MLB', 'CB', 'S', 'K', 'P'];
      const first_names = ["Tom", "Miles", "Travis", "Jack", "Maina", "Phil", "Andrew", 'Tyler', 'Bryan', 'Peter', 'Jeffrey', 'Brad', 'Taronish', 'Jeremy', 'Craig', 'Jim', 'Barry', 'Dan', 'Ted', 'Theodore'];
      const last_names = ['Kennedy', 'Wilson', 'Latham', 'Jackson', 'Murphy', 'Shon', "Dodson", 'Alley', 'Cate', 'Rushton', 'Miller', 'Bollinger', 'Pope', 'Loach', 'Weiss', 'Lovalvo', 'Russell', 'Ingram', 'Zucker'];

      const position_ethnicity =    //numbers normalized from https://theundefeated.com/features/the-nfls-racial-divide/
          {"QB":{"white":75,"black":15,"hispanic":5,"asian":5},"RB":{"white":15,"black":80,"hispanic":10,"asian":5},"WR":{"white":10,"black":85,"hispanic":5,"asian":5},"TE":{"white":50,"black":50,"hispanic":15,"asian":2},"OT":{"white":45,"black":55,"hispanic":15,"asian":1},"OG":{"white":40,"black":50,"hispanic":15,"asian":1},"OC":{"white":40,"black":50,"hispanic":15,"asian":1},"DE":{"white":20,"black":80,"hispanic":10,"asian":1},"DT":{"white":10,"black":80,"hispanic":10,"asian":1},"OLB":{"white":20,"black":80,"hispanic":10,"asian":1},"MLB":{"white":25,"black":75,"hispanic":10,"asian":1},"CB":{"white":2,"black":100,"hispanic":10,"asian":2},"S":{"white":15,"black":80,"hispanic":10,"asian":5},"K":{"white":70,"black":10,"hispanic":25,"asian":25},"P":{"white":70,"black":10,"hispanic":25,"asian":25}}


      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        var par = $('#indexCreateWorldModalCloseButton').parent();
        $(par).empty();
        $(par).append('<div>Creating new world!</div>');
        const new_db = await common.create_new_db();

        var index_group = common.index_group;

        const db = new_db['db'];
        const new_season_info = new_db['new_season_info'];

        const world_id = new_season_info.world_id;
        const season = new_season_info.current_season;

        const new_season = await db.league_season.add({season: season,
                                                       world_id: world_id,
                                                       is_current_season: true,
                                                       user_team_id: 1,
                                                       captains_per_team: 3,
                                                       players_per_team: 70,
                                                       preseason_tasks: {
                                                         user_cut_players: false,
                                                         user_set_gameplan: false,
                                                         user_set_depth_chart: false,
                                                       }
                                                     });

        const phases_created = await common.create_phase(season);
        const weeks = await common.create_week(phases_created);

        var teams_from_json = await common.get_teams({conference: ['Big 12 Conference', 'Southeastern Conference', 'Big Ten Conference', 'Atlantic Coast Conference', 'American Athletic Conference', 'Pac-12 Conference']});
        const num_teams = teams_from_json.length;


        const divisions_from_json = await common.get_divisions({conference: ['Big 12 Conference', 'Southeastern Conference', 'Big Ten Conference', 'Atlantic Coast Conference', 'American Athletic Conference', 'Pac-12 Conference']});
        const divisions = await index_group(divisions_from_json, 'group','conference_name');

        const conferences_from_json = await common.get_conferences({conference: ['Big 12 Conference', 'Southeastern Conference', 'Big Ten Conference', 'Atlantic Coast Conference', 'American Athletic Conference', 'Pac-12 Conference']});

        $.each(conferences_from_json, function(ind, conference){
          conference.world_id = world_id;
          conference.divisions = {}
          $.each(divisions[conference.conference_name], function(ind, division){
            conference.divisions[division.division_name] = division;
          })
        });

        const conferences_added = await db.conference.bulkAdd(conferences_from_json);
        var conferences =  await index_group(await db.conference.toArray(), 'index','conference_name');

        var conference_seasons_to_create = [];

        $.each(conferences, function(conference_name, conference){
          var new_conference_season = {world_id: world_id,
                                       conference_id: conference.conference_id,
                                       season: season,
                                       divisions: conference.divisions,
                                       conference_champion_team_season_id: null,

                                     };
          $.each(new_conference_season.divisions, function(ind, division){
            division.teams = [];
            division.standings = [];
          });
          conference_seasons_to_create.push(new_conference_season)
        });

        const conference_seasons_added = await db.conference_season.bulkAdd(conference_seasons_to_create);
        var conference_seasons =  await index_group(await db.conference_season.toArray(), 'index','conference_id');

        $.each(conferences, function(conference_name, conference){
          conference.conference_season = conference_seasons[conference.conference_id];
        });

        var teams = [];
        var jersey_colors = [], jersey_lettering = {};
        const jersey_options = ['football', 'football2', 'football3', 'football4', ]

        $.each(teams_from_json, function(ind, team){
          if (team.team_jersey_invert) {
            jersey_colors = ['#FFFFFF', `#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`];
          }
          else {
            jersey_colors = [`#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`, '#FFFFFF'];
          }

          jersey_lettering = {text_color: '#FFFFFF', text: ''};

          if (Math.random() < .2) {
            jersey_lettering.text = team.team_name
          }
          else if (Math.random() < .1) {
            jersey_lettering.text = team.school_name
          }


          teams.push({
            school_name: team.school_name,
            team_name: team.team_name,
            team_abbreviation: team.team_abbreviation,
            team_color_primary_hex: team.team_color_primary_hex,
            team_color_secondary_hex: team.team_color_secondary_hex,
            jersey: {
              id: jersey_options[Math.floor(Math.random() * jersey_options.length)],
              teamColors: jersey_colors,
              lettering: jersey_lettering
            },
            team_ratings: {academic_prestige: team.academic_prestige,
                           campus_lifestyle: team.campus_lifestyle,
                           championship_contender: team.championship_contender,
                           facilities: team.facilities,
                           location: team.location,
                           pro_potential: team.pro_potential,
                           team_prestige: team.team_prestige,
                           television_exposure: team.television_exposure,
                         },
            location: {
                          city: team.city,
                          state: team.state
                      },
            conference: {conference_id: conferences[team.conference_name].conference_id,
                         conference_name: team.conference_name,
                         division_id: null,
                         division_name: team.division_name},
            });
        });


        $.each(teams, function(ind, team){
          team.world_id = world_id;
        });

        var teams_added = await db.team.bulkAdd(teams);
        $(par).append('<div>Adding Team Seasons</div>')
        var teams = await db.team.toArray();
        var team_seasons_tocreate = [];


        var team_id = 1;
        $.each(teams, function(ind, team){
          team_seasons_tocreate.push({team_id: team.team_id,
                                      world_id: world_id,
                                      season: season,
                                      conference_name: team.conference_name,
                                      record: {
                                        wins: 0, losses: 0, conference_wins: 0, conference_losses: 0, games_played: 0, conference_gb: 0, win_streak: 0
                                      },
                                      rankings: {
                                        division_rank: [], national_rank: [], national_rank_delta: 0, national_rank_delta_abs: 0
                                      },
                                      conference_season_id: conferences[team.conference.conference_name].conference_season.conference_season_id,
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
            if (a.rating.overall > b.rating.overall) return -1;
            if (a.rating.overall < b.rating.overall) return 1;
            return 0;
          });

        var rank_count = 1;
        $.each(team_seasons, function(ind, team_season){
          team_season.rankings.national_rank.push(rank_count);

          rank_count +=1;
        });

        conference_seasons =  await db.conference_season.toArray();
        var team_seasons_in_conference_season = [];
        var top_record = {};
        $.each(conference_seasons, function(ind, conference_season){
          team_seasons_in_conference_season = team_seasons.filter(ts => ts.conference_season_id == conference_season.conference_season_id);
          team_seasons_in_conference_season.sort(function(a, b) {
              if (a.rating.overall > b.rating.overall) return -1;
              if (a.rating.overall < b.rating.overall) return 1;
              return 0;
            });

            rank_count = 1;
            top_record = {};
            $.each(team_seasons_in_conference_season, function(ind, team_season){
              team_season.rankings.division_rank.push(rank_count);

              if (rank_count == 1){
                team_season.record.conference_gb
                top_record = team_season.record;
                team_season.record.conference_gb = 0;
              }
              else {
                team_season.record.conference_gb = ((top_record.conference_wins - team_season.record.conference_wins) + ( team_season.record.conference_losses - top_record.conference_losses)) / 2;
              }

              rank_count +=1;
            });
        });

        var team_season_updated = await db.team_season.bulkPut(team_seasons);
        $(par).append('<div>Adding Players</div>')
        var players_tocreate = [];
        var position = '';
        var ethnicity = '';

        $.each(team_seasons,  function(ind, team_season){
          for(var i = 0; i<=50; i++){
            position = positions[Math.floor(Math.random() * positions.length)];
            ethnicity = common.weighted_random_choice(position_ethnicity[position]);
            players_tocreate.push({ name:{
                                      first: first_names[Math.floor(Math.random() * first_names.length)],
                                      last:  last_names[Math.floor(Math.random() * last_names.length)]
                                    },
                                    world_id: world_id,
                                    redshirt: {previous: false, current: false},
                                    jersey_number: 21,
                                    hometown: {city: 'Hartford', state: 'VT'},
                                    position: position,
                                    ethnicity: ethnicity,
                                    player_face: undefined,
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
        var player_stat_obj = undefined;
        $.each(players, function(ind, player){
          player_team_seasons_tocreate.push({ player_id: player.player_id,
                                              team_season_id: team_seasons[count % num_teams]['team_season_id'],
                                              season: season,
                                              is_captain: false,
                                              position: player.position,
                                              class: {
                                                class_name: classes[Math.floor(Math.random() * classes.length)],
                                                redshirted: false
                                              },
                                              season_stats: {
                                                games: {
                                                    game_score:0,
                                                    games_played:0,
                                                    games_started:0,
                                                    plays_on_field:0,
                                                    team_games_played:0,
                                                  },
                                                top_stats : [],
                                                passing : {
                                                    completions: 0,
                                                    attempts: 0,
                                                    yards: 0,
                                                    tds: 0,
                                                    ints:0,
                                                    sacks:0,
                                                    sack_yards:0,
                                                  },
                                                  rushing : {
                                                    carries:0,
                                                    yards:0,
                                                    tds:0,
                                                    over_20:0,
                                                    lng:0,
                                                    broken_tackles:0,
                                                    yards_after_contact:0,
                                                  },

                                                  receiving : {
                                                    yards:0,
                                                    targets:0,
                                                    receptions:0,
                                                    tds:0,
                                                    yards_after_catch:0,
                                                    drops:0,
                                                    lng:0,
                                                    yards:0,
                                                  },
                                                  blocking : {
                                                    sacks_allowed:0,
                                                    pancakes:0,
                                                    blocks:0,
                                                  },
                                                  defense : {
                                                    tackles:0,
                                                    solo_tackles:0,
                                                    sacks:0,
                                                    tackles_for_loss:0,
                                                    deflections:0,
                                                    qb_hits:0,
                                                    tds:0,
                                                    ints:0,
                                                    int_yards:0,
                                                    int_tds:0,
                                                    safeties:0,
                                                  },
                                                  fumbles : {
                                                    fumbles: 0,
                                                    lost: 0,
                                                    recovered: 0,
                                                    forced: 0,
                                                    return_yards: 0,
                                                    return_tds: 0,
                                                  },
                                                  kicking : {
                                                    fga:0,
                                                    fgm:0,
                                                    fga_29:0,
                                                    fgm_29:0,
                                                    fga_39:0,
                                                    fgm_39:0,
                                                    fga_49:0,
                                                    fgm_49:0,
                                                    fga_50:0,
                                                    fgm_50:0,
                                                    lng:0,
                                                    xpa:0,
                                                    xpm:0,
                                                    kickoffs:0,
                                                    touchbacks:0,
                                                  },
                                                  punting: {
                                                    punts:0,
                                                    yards:0,
                                                    touchbacks:0,
                                                    within_20:0,
                                                  },
                                                  returning: {
                                                    kr_returns:0,
                                                    kr_yards:0,
                                                    kr_tds:0,
                                                    kr_lng:0,
                                                    pr_returns:0,
                                                    pr_yards:0,
                                                    pr_tds:0,
                                                    pr_lng:0,
                                                  }
                                              },
                                              ratings: {
                                                athleticism: {
                                                  strength: Math.floor(Math.random() * 100),
                                                  agility: Math.floor(Math.random() * 100),
                                                  speed: Math.floor(Math.random() * 100),
                                                  acceleration: Math.floor(Math.random() * 100),
                                                  stamina: Math.floor(Math.random() * 100),
                                                  jumping: Math.floor(Math.random() * 100),
                                                  injury: Math.floor(Math.random() * 100),
                                                },
                                                passing: {
                                                  throwing_power: Math.floor(Math.random() * 100),
                                                  short_throw_accuracy: Math.floor(Math.random() * 100),
                                                  medium_throw_accuracy: Math.floor(Math.random() * 100),
                                                  deep_throw_accuracy: Math.floor(Math.random() * 100),
                                                  throw_on_run: Math.floor(Math.random() * 100),
                                                  throw_under_pressure: Math.floor(Math.random() * 100),
                                                  play_action: Math.floor(Math.random() * 100),
                                                },
                                                rushing: {
                                                  elusiveness: Math.floor(Math.random() * 100),
                                                  ball_carrier_vision: Math.floor(Math.random() * 100),
                                                  break_tackle: Math.floor(Math.random() * 100),
                                                  carrying: Math.floor(Math.random() * 100),
                                                },
                                                receiving: {
                                                  catching: Math.floor(Math.random() * 100),
                                                  catch_in_traffic: Math.floor(Math.random() * 100),
                                                  route_running: Math.floor(Math.random() * 100),
                                                  release: Math.floor(Math.random() * 100),
                                                },
                                                defense: {
                                                  hit_power: Math.floor(Math.random() * 100),
                                                  tackle: Math.floor(Math.random() * 100),
                                                  pass_rush: Math.floor(Math.random() * 100),
                                                  block_shedding: Math.floor(Math.random() * 100),
                                                  pursuit: Math.floor(Math.random() * 100),
                                                  play_recognition: Math.floor(Math.random() * 100),
                                                  man_coverage: Math.floor(Math.random() * 100),
                                                  zone_coverage: Math.floor(Math.random() * 100),
                                                  press: Math.floor(Math.random() * 100),
                                                },
                                                blocking: {
                                                  pass_block: Math.floor(Math.random() * 100),
                                                  run_block: Math.floor(Math.random() * 100),
                                                  impact_block: Math.floor(Math.random() * 100),
                                                },
                                                kicking: {
                                                  kick_power: Math.floor(Math.random() * 100),
                                                  kick_accuracy: Math.floor(Math.random() * 100),
                                                },
                                                overall: {
                                                  awareness: Math.floor(Math.random() * 100),
                                                  overall: Math.floor(Math.random() * 100),
                                                }
                                              },
                                              world_id: world_id,
                                              post_season_movement: null, //[quit, graduate, draft, transfer]
                                              top_stats: []
                                            });

            count +=1;

        });
        var player_team_seasons_tocreate_added = await db.player_team_season.bulkAdd(player_team_seasons_tocreate);

        $(par).append('<div>Creating season schedule</div>')
        var games_to_create = [],team_games_to_create = [],team_games_to_create_ids = [];
        var team_season_schedule_tracker = {}
        const games_per_team = 12;
        const zip = (a, b) => a.map((k, i) => [k, b[i]]);

        $.each(team_seasons, function(ind, team_season){
          team_season_schedule_tracker[team_season.team_season_id] = {
            conference_games_to_schedule: 8, non_conference_games_to_schedule: games_per_team - 8,
            conference_games_scheduled: 0, non_conference_games_scheduled: 0,
            weeks_scheduled: [], opponents_scheduled: [],
            home_games: 0, away_games: 0, net_home_games: 0,
            conference_season_id: team_season.conference_season_id
          }
        });

        var scheduling_teams = true;
        var team_season_id_list = [], taken_weeks = [], available_weeks=[];
        var team_set_a = [], team_set_b = [], zipped_set = [], teams_to_schedule=[], games_to_create_ids=[];

        const phases = await index_group(await db.phase.where({season: season}).toArray(), 'index','phase_id');;
        var week_ids = await db.week.where({season: season}).toArray();
        $.each(week_ids, function(ind, week){
          week.phase = phases[week.phase_id];
        })
        week_ids = week_ids.filter(week => week.phase.phase_name == 'Regular Season');
        all_week_ids = week_ids.map(w => w.week_id);

        var week_counter = 0, week_id=0, chosen_week=0;
        var last_game = await db.game.orderBy('game_id').first();
        var last_team_game = await db.team_game.orderBy('team_game_id').first();

        var next_game_id = 1;
        if (!(last_game === undefined)){
          next_game_id = last_game.game_id + 1;
        }
        var next_team_game_id = 1;
        if (!(last_team_game === undefined)){
          next_team_game_id = last_team_game.team_game_id + 1;
        }

        team_seasons = await index_group(await db.team_season.where({season: season}).toArray(), 'index','team_id');
        team_seasons_by_conference_season_id = await index_group(await db.team_season.where({season: season}).toArray(), 'group','conference_season_id');
        console.log('team_seasons_by_conference_season_id', team_seasons_by_conference_season_id)
        var attempt_counter = 0;
        //Schedule conference games
        while (scheduling_teams) {
          team_season_id_list = Object.keys(team_season_schedule_tracker);
          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].conference_games_to_schedule > 0)

          $.each(team_seasons_by_conference_season_id, function(conference_season_id, team_seasons){
            conference_team_season_id_list = team_seasons.map(ts => ts.team_season_id.toString());
            conference_team_season_id_list = conference_team_season_id_list.filter(ts => team_season_id_list.includes(ts))
            conference_team_season_id_list = common.shuffle(conference_team_season_id_list);
            console.log('conference_team_season_id_list', conference_team_season_id_list)

            $.each(conference_team_season_id_list, function(ind, obj){
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
              if (team_b == undefined){
                return true;
              }

              if ((!(team_season_schedule_tracker[team_b].opponents_scheduled.includes(team_a))) && ((team_season_schedule_tracker[team_a].conference_season_id == team_season_schedule_tracker[team_b].conference_season_id))) {

                taken_weeks = common.union(team_season_schedule_tracker[team_a].weeks_scheduled, team_season_schedule_tracker[team_b].weeks_scheduled)
                available_weeks = common.except(all_week_ids, taken_weeks);

                if (available_weeks.length > 0) {
                  chosen_week_id = common.uniform_random_choice(available_weeks);

                  if (team_season_schedule_tracker[team_a].net_home_games > team_season_schedule_tracker[team_b].net_home_games) {
                    [team_a, team_b] = [team_b, team_a];
                  }

                  team_season_schedule_tracker[team_a].conference_games_to_schedule -=1;
                  team_season_schedule_tracker[team_a].conference_games_scheduled   +=1;
                  team_season_schedule_tracker[team_a].home_games        +=1;
                  team_season_schedule_tracker[team_a].net_home_games    +=1;
                  team_season_schedule_tracker[team_a].weeks_scheduled.push(chosen_week_id);
                  team_season_schedule_tracker[team_a].opponents_scheduled.push(team_b);

                  team_season_schedule_tracker[team_b].conference_games_to_schedule -=1;
                  team_season_schedule_tracker[team_b].conference_games_scheduled   +=1;
                  team_season_schedule_tracker[team_b].away_games        +=1;
                  team_season_schedule_tracker[team_b].net_home_games    -=1;
                  team_season_schedule_tracker[team_b].weeks_scheduled.push(chosen_week_id);
                  team_season_schedule_tracker[team_b].opponents_scheduled.push(team_a);

                  team_games_to_create.push({world_id: world_id, season: season, team_game_id: next_team_game_id  , points:null, is_winning_team: null , record:{wins:0, losses:0, conference_wins: 0, conference_losses:0}, is_home_team: true , opponent_team_game_id: next_team_game_id+1,week_id: chosen_week_id, game_id: next_game_id, team_season_id: parseInt(team_a), opponent_team_season_id: parseInt(team_b)});
                  team_games_to_create.push({world_id: world_id, season: season, team_game_id: next_team_game_id+1, points:null, is_winning_team: null , record:{wins:0, losses:0, conference_wins: 0, conference_losses:0}, is_home_team: false, opponent_team_game_id: next_team_game_id  ,week_id: chosen_week_id, game_id: next_game_id, team_season_id: parseInt(team_b), opponent_team_season_id: parseInt(team_a), });


                  team_games_to_create_ids.push(next_team_game_id)
                  team_games_to_create_ids.push(next_team_game_id+1)

                  games_to_create.push({
                    game_id: next_game_id,
                    season: season,
                    home_team_season_id: parseInt(team_a), away_team_season_id: parseInt(team_b),
                    home_team_game_id: next_team_game_id , away_team_game_id: next_team_game_id+1,
                    week_id: chosen_week_id, game_time: '7:05PM', was_played: false,
                    outcome: {home_team_score: null, away_team_score: null, winning_team_season_id: null, losing_team_season_id: null},
                    rivalry: {}, bowl: {}, broadcast: {regional_broadcast: false, national_broadcast: false,},
                    world_id: world_id,
                  });

                  games_to_create_ids.push(next_game_id);

                  next_game_id +=1;
                  next_team_game_id +=2;
                }
              }
            });
          })

          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].conference_games_to_schedule > 0)

          scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 100;

          attempt_counter +=1;
          team_set_a = [];
          team_set_b = [];

        }

        $.each(team_season_schedule_tracker, function(team_id, team_obj){
          team_obj.non_conference_games_to_schedule += team_obj.conference_games_to_schedule;
        })
        scheduling_teams = true;
        attempt_counter = 1;
        //Scheduling non-conference
        while (scheduling_teams) {
          team_season_id_list = Object.keys(team_season_schedule_tracker);
          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].non_conference_games_to_schedule > 0)
          team_season_id_list = common.shuffle(team_season_id_list);


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
            if (team_b == undefined){
              return true;
            }

            if (!(team_season_schedule_tracker[team_b].opponents_scheduled.includes(team_a)) && (!(team_season_schedule_tracker[team_a].conference_season_id == team_season_schedule_tracker[team_b].conference_season_id))) {

              taken_weeks = common.union(team_season_schedule_tracker[team_a].weeks_scheduled, team_season_schedule_tracker[team_b].weeks_scheduled)
              available_weeks = common.except(all_week_ids, taken_weeks);

              if (available_weeks.length > 0) {
                chosen_week_id = common.uniform_random_choice(available_weeks);

                if (team_season_schedule_tracker[team_a].net_home_games > team_season_schedule_tracker[team_b].net_home_games) {
                  [team_a, team_b] = [team_b, team_a];
                }

                team_season_schedule_tracker[team_a].non_conference_games_to_schedule -=1;
                team_season_schedule_tracker[team_a].non_conference_games_scheduled   +=1;
                team_season_schedule_tracker[team_a].home_games        +=1;
                team_season_schedule_tracker[team_a].net_home_games    +=1;
                team_season_schedule_tracker[team_a].weeks_scheduled.push(chosen_week_id);
                team_season_schedule_tracker[team_a].opponents_scheduled.push(team_b);

                team_season_schedule_tracker[team_b].non_conference_games_to_schedule -=1;
                team_season_schedule_tracker[team_b].non_conference_games_scheduled   +=1;
                team_season_schedule_tracker[team_b].away_games        +=1;
                team_season_schedule_tracker[team_b].net_home_games    -=1;
                team_season_schedule_tracker[team_b].weeks_scheduled.push(chosen_week_id);
                team_season_schedule_tracker[team_b].opponents_scheduled.push(team_a);

                team_games_to_create.push({world_id: world_id, season: season, team_game_id: next_team_game_id  , points:null, is_winning_team: null , record:{wins:0, losses:0, conference_wins: 0, conference_losses:0}, is_home_team: true , opponent_team_game_id: next_team_game_id+1,week_id: chosen_week_id, game_id: next_game_id, team_season_id: parseInt(team_a), opponent_team_season_id: parseInt(team_b)});
                team_games_to_create.push({world_id: world_id, season: season, team_game_id: next_team_game_id+1, points:null, is_winning_team: null , record:{wins:0, losses:0, conference_wins: 0, conference_losses:0}, is_home_team: false, opponent_team_game_id: next_team_game_id  ,week_id: chosen_week_id, game_id: next_game_id, team_season_id: parseInt(team_b), opponent_team_season_id: parseInt(team_a), });


                team_games_to_create_ids.push(next_team_game_id)
                team_games_to_create_ids.push(next_team_game_id+1)

                games_to_create.push({
                  game_id: next_game_id,
                  season: season,
                  home_team_season_id: parseInt(team_a), away_team_season_id: parseInt(team_b),
                  home_team_game_id: next_team_game_id , away_team_game_id: next_team_game_id+1,
                  week_id: chosen_week_id, game_time: '7:05PM', was_played: false,
                  outcome: {home_team_score: null, away_team_score: null, winning_team_season_id: null, losing_team_season_id: null},
                  rivalry: {}, bowl: {}, broadcast: {regional_broadcast: false, national_broadcast: false,},
                  world_id: world_id,
                });

                games_to_create_ids.push(next_game_id);

                next_game_id +=1;
                next_team_game_id +=2;
              }
            }
          });


          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].non_conference_games_to_schedule > 0)

          scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 300;

          attempt_counter +=1;
          team_set_a = [];
          team_set_b = [];

        }

        console.log('team_season_schedule_tracker', team_season_schedule_tracker)

        const team_seasons_to_update = Object.values(team_seasons);

        //const games_created = await db.game.bulkAdd(games_to_create, games_to_create_ids);
        const games_created = await db.game.bulkPut(games_to_create);
        const team_games_created = await db.team_game.bulkPut(team_games_to_create);
        team_season_updated = await db.team_season.bulkPut(team_seasons_to_update);

        //window.location.href = `/World/${world_id}`
      });
    }

    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/index/');

      await getHtml(common);
      await action(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
