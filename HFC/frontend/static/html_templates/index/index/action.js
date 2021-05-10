
    const getHtml = async(common) => {
      nunjucks.configure({ autoescape: true });
      const nunjucks_env = await get_nunjucks_env();

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

      const renderedHtml = nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);
    }



    const action = async (common) => {

      const ddb = await common.driver_db();

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

      $('.idb-export').on('click', async function(){
        console.log('idb export click', $(this).attr('id'))
        var db_name = $(this).attr('id');

        const db = await new Dexie(db_name);

        await db.version(5).stores({
          league_season: 'season',
          team: "team_id",
          team_season: "++team_season_id, team_id, season",
          player: "++player_id",
          player_team_season: "++player_team_season_id, player_id, team_season_id, season",
          conference: '++conference_id, conference_name',
          conference_season: '++conference_season_id, conference_id, season, [conference_id+season]',
          phase: '++phase_id, season',
          week: '++week_id, season, [phase_id+season]',
          team_game: 'team_game_id, game_id, team_season_id, week_id',
          player_team_game: '++player_team_game_id, team_game_id, player_team_season_id',
          game: 'game_id, week_id',
          award: '++award_id, player_id, week_id, season_id',
          world: ""
        });


        console.log('db', db)

        db.open().then(function() {
          const idbDatabase = db.backendDB(); // get native IDBDatabase object from Dexie wrapper

          // export to JSON, clear database, and import from JSON
          exportToJsonString(idbDatabase, function(err, jsonString) {
            if (err) {
              console.error(err);
            } else {
              console.log('Exported as JSON: ' + jsonString);
              download(`${db_name}.json`, jsonString)
            }
          });
        }).catch(function(e) {
          console.error('Could not connect. ' + e);
        });
      });

      $('#truncate-world-row').on('click', async function(){
        const get_databases_references = common.get_databases_references;


        var database_refs = await get_databases_references();
        var db = undefined;
        $.each(database_refs, async function(ind, db_obj){
          console.log('db', db, db_obj)
          await Dexie.delete(db_obj.database_name)
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

        var teams_from_json = await common.get_teams({conference: ['Big 12', 'Southeastern Conference', 'Big Ten', 'Atlantic Coast Conference', 'American Athletic Conference', 'PAC-12', 'Conference USA', 'FBS Independents', 'Mountain West Conference']});
        const num_teams = teams_from_json.length;

        const new_season = await db.league_season.add({season: season,
                                                       world_id: world_id,
                                                       is_current_season: true,
                                                       user_team_id: Math.ceil(Math.random() * num_teams),
                                                       captains_per_team: 3,
                                                       players_per_team: 70,
                                                       preseason_tasks: {
                                                         user_cut_players: false,
                                                         user_set_gameplan: false,
                                                         user_set_depth_chart: false,
                                                       }
                                                     });


        const phases_created = await common.create_phase(season);
        var weeks = await common.create_week(phases_created);



        const divisions_from_json = await common.get_divisions({conference: ['Big 12', 'Southeastern Conference', 'Big Ten', 'Atlantic Coast Conference', 'American Athletic Conference', 'PAC-12', 'Conference USA', 'FBS Independents', 'Mountain West Conference']});
        const divisions = await index_group(divisions_from_json, 'group','conference_name');

        const conferences_from_json = await common.get_conferences({conference: ['Big 12', 'Southeastern Conference', 'Big Ten', 'Atlantic Coast Conference', 'American Athletic Conference', 'PAC-12', 'Conference USA', 'FBS Independents', 'Mountain West Conference']});

        const rivalries = await common.get_rivalries(teams_from_json);

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

        var teams = [], rivals=[], rivals_team_1=[], rivals_team_2=[];
        var jersey_colors = [], jersey_lettering = {};
        const jersey_options = ['football', 'football2', 'football3', 'football4', ]

        var team_id_counter = 1;
        $.each(teams_from_json, function(ind, team){
          if (team.team_jersey_invert) {
            jersey_colors = ['#FFFFFF', `#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`];
          }
          else {
            jersey_colors = [`#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`, '#FFFFFF'];
          }

          jersey_lettering = {text_color: '#FFFFFF', text: ''};

          rivals_team_1 = rivalries.filter(r => r.team_name_1 == team.school_name).map(function(r) { return {opponent_name: r.team_name_2, opponent_team_id: null, preferred_week_number: r.preferred_week_number, rivalry_name: r.rivalry_name}});
          rivals_team_2 = rivalries.filter(r => r.team_name_2 == team.school_name).map(function(r) { return {opponent_name: r.team_name_1, opponent_team_id: null, preferred_week_number: r.preferred_week_number, rivalry_name: r.rivalry_name}});

          rivals = rivals_team_1.concat(rivals_team_2);

          if (Math.random() < .2) {
            jersey_lettering.text = team.team_name
          }
          else if (Math.random() < .1) {
            jersey_lettering.text = team.school_name
          }


          teams.push({
            team_id: team_id_counter,
            school_name: team.school_name,
            team_name: team.team_name,
            world_id: world_id,
            team_abbreviation: team.team_abbreviation,
            team_color_primary_hex: team.team_color_primary_hex,
            team_color_secondary_hex: team.team_color_secondary_hex,
            rivals: rivals,
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

            team_id_counter +=1;
        });

        const teams_by_team_name = await index_group(teams, 'index', 'school_name');

        $.each(teams, function(ind, team){
          $.each(team.rivals, function(ind, rival){
            rival.opponent_team_id = teams_by_team_name[rival.opponent_name].team_id
          });
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
                                        wins: 0, losses: 0, conference_wins: 0, conference_losses: 0, conference_net_wins:0, games_played: 0, conference_gb: 0, win_streak: 0, defeated_teams: []
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
                                      },
                                      season_stats: {
                                        games: {
                                            game_score:0,
                                            games_played:0,
                                            games_started:0,
                                            plays_on_field:0,
                                            team_games_played:0,
                                          },
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

        const num_players_per_team = 75;
        const num_players_to_create = num_players_per_team * team_seasons.length;

        const player_names = await common.random_name(ddb, num_players_to_create);
        const player_cities = await common.random_city(ddb, num_players_to_create);

        var player_counter = 0;
        $.each(team_seasons,  function(ind, team_season){
          for(var i = 0; i<num_players_per_team; i++){
            position = positions[Math.floor(Math.random() * positions.length)];
            ethnicity = common.weighted_random_choice(position_ethnicity[position]);
            players_tocreate.push({ name:player_names[player_counter],
                                    world_id: world_id,
                                    redshirt: {previous: false, current: false},
                                    jersey_number: 21,
                                    hometown: player_cities[player_counter],
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
                player_counter +=1;
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

        const teams_by_team_id = await index_group(await db.team.toArray(), 'index', 'team_id')
        const team_seasons_by_team_id = await index_group(await db.team_season.where({season: season}).toArray(), 'index', 'team_id')
        const team_rivalries_by_team_season_id = await index_group(team_seasons.map(function(ts){ return { team_season_id: ts.team_season_id, rivals:teams_by_team_id[ts.team_id].rivals}}), 'index', 'team_season_id');
        const conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index', 'conference_id');
        const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index', 'conference_season_id');
        console.log('team_rivalries_by_team_season_id', team_rivalries_by_team_season_id)

        const phases = await index_group(await db.phase.where({season: season}).toArray(), 'index','phase_id');;
        var weeks = await db.week.where({season: season}).toArray();
        $.each(weeks, function(ind, week){
          week.phase = phases[week.phase_id];
        })
        weeks = weeks.filter(week => week.phase.phase_name == 'Regular Season');
        all_week_ids = weeks.map(w => w.week_id);
        all_weeks_by_week_id = await index_group(weeks, 'index', 'week_id')

        const weeks_by_week_name = await index_group(weeks, 'index', 'week_name')

        $.each(team_seasons, function(ind, team_season){
          team_season_rivals = team_rivalries_by_team_season_id[team_season.team_season_id].rivals;
          $.each(team_season_rivals, function(ind, rival_obj){
            rival_obj.preferred_week_id = undefined;
            if (rival_obj.preferred_week_number != null){
              rival_obj.preferred_week_id = weeks_by_week_name['Week '+ rival_obj.preferred_week_number];
            }

            rival_obj.opponent_team_season_id = team_seasons_by_team_id[rival_obj.opponent_team_id.toString()].team_season_id
          });


          team_conference = conferences_by_conference_id[conference_seasons_by_conference_season_id[team_season.conference_season_id].conference_id];

          team_season_schedule_tracker[team_season.team_season_id] = {
            conference: {games_to_schedule: team_conference.number_conference_games, games_scheduled: 0,},
            non_conference: {games_to_schedule: games_per_team - team_conference.number_conference_games, games_scheduled: 0,},
            weeks_scheduled: [], opponents_scheduled: [],
            home_games: 0, away_games: 0, net_home_games: 0,
            conference_season_id: team_season.conference_season_id,
            rivals: team_season_rivals
          }
        });

        var scheduling_teams = true;
        var team_season_id_list = [], taken_weeks = [], available_weeks=[];
        var team_set_a = [], team_set_b = [], zipped_set = [], teams_to_schedule=[], games_to_create_ids=[];


        var week_counter = 0, week_id=0, chosen_week=0, game_type='', game_scheduled=true;
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

        var scheduling_dict = {
          team_season_schedule_tracker: team_season_schedule_tracker,
          all_week_ids: all_week_ids,
          all_weeks_by_week_id: all_weeks_by_week_id,
          world_id: world_id,
          season: season,
          next_team_game_id: next_team_game_id,
          next_game_id: next_game_id,
          team_games_to_create_ids: team_games_to_create_ids,
          team_games_to_create: team_games_to_create,
          games_to_create_ids: games_to_create_ids,
          games_to_create: games_to_create
        }


        var attempt_counter = 0;
        //Schedule rival games
        while (scheduling_teams) {
          team_season_id_list = Object.keys(team_season_schedule_tracker);

          zipped_set = []
          $.each(team_season_id_list, function(ind, team_season_id){
            rival_list = team_season_schedule_tracker[team_season_id].rivals;
            $.each(rival_list, function(ind, rival_obj){

              zipped_set.push([team_season_id, team_seasons_by_team_id[rival_obj.opponent_team_id.toString()].team_season_id.toString(), rival_obj]);
            });
          });

          //console.log('zipped_set', zipped_set)
          $.each(zipped_set, function(ind, team_set){
            //check if confernece, pass to next
            [team_a, team_b, rival_obj] = team_set;
            game_type = 'non_conference';
            if (team_season_schedule_tracker[team_a].conference_season_id == team_season_schedule_tracker[team_b].conference_season_id) {
              game_type = 'conference';
            }
            game_scheduled = common.schedule_game(common, scheduling_dict, team_set, game_type, rival_obj)
            if (game_scheduled != 'Scheduled'){
              console.log('Couldnt schedule game!', game_scheduled, team_set, game_type)
            }

          });

          scheduling_teams = false;
        }

        attempt_counter = 0;
        scheduling_teams = true;
        //Schedule conference games
        while (scheduling_teams) {
          team_season_id_list = Object.keys(team_season_schedule_tracker);
          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].conference.games_to_schedule > 0)

          $.each(team_seasons_by_conference_season_id, function(conference_season_id, team_seasons){
            conference_team_season_id_list = team_seasons.map(ts => ts.team_season_id.toString());
            conference_team_season_id_list = conference_team_season_id_list.filter(ts => team_season_id_list.includes(ts))
            conference_team_season_id_list = common.shuffle(conference_team_season_id_list);

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
            $.each(zipped_set, function(ind, team_set){
              common.schedule_game(common, scheduling_dict, team_set, 'conference', null)
            });
          })

          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].conference.games_to_schedule > 0)

          scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 200;

          attempt_counter +=1;
          team_set_a = [];
          team_set_b = [];

        }

        $.each(team_season_schedule_tracker, function(team_id, team_obj){
          team_obj.non_conference.games_to_schedule += team_obj.conference.games_to_schedule;
        })
        scheduling_teams = true;
        attempt_counter = 1;
        //Scheduling non-conference
        while (scheduling_teams) {
          team_season_id_list = Object.keys(team_season_schedule_tracker);
          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].non_conference.games_to_schedule > 0)
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
          $.each(zipped_set, function(ind, team_set){
            common.schedule_game(common, scheduling_dict, team_set, 'non_conference', null)

          });

          team_season_id_list = team_season_id_list.filter(team_id => team_season_schedule_tracker[team_id].non_conference.games_to_schedule > 0)

          scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 400;

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

        const current_league_season = await db.league_season.where({season: season}).first();
        const world = await ddb.world.get({world_id: world_id});
         const user_team = await db.team.get({team_id: current_league_season.user_team_id});

         world.user_team.team_name = user_team.team_name;
         world.user_team.school_name = user_team.school_name;
         world.user_team.team_logo_url = user_team.team_logo;
         world.user_team.team_record = '0-0';
         world.user_team.team_id = user_team.team_id;

         await ddb.world.put(world);

        window.location.href = `/World/${world_id}`
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
