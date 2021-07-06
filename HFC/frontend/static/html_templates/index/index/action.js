
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
      //$('head').append('<title>Alabama</title>');
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


      //Create new db if clicked 'continue'
      $('#indexCreateWorldModalContinueButton').on('click', async function(){
        var par = $('#indexCreateWorldModalCloseButton').parent();
        $(par).empty();
        $(par).append('<div>Creating new world!</div>');
        const new_db = await common.create_new_db();

        var index_group = common.index_group;
        var index_group_sync = common.index_group_sync;

        const db = new_db['db'];
        common.db = await db;

        const new_season_info = new_db['new_season_info'];

        const world_id = new_season_info.world_id;
        const season = new_season_info.current_season;

        //FULL LEAGUE
        //const conferences_to_include = ['Big 12', 'American Athletic Conference','Atlantic Coast Conference','Big Ten','Southeastern Conference', 'Sun Belt', 'PAC-12','Conference USA','Mountain West Conference','FBS Independents','Mid-American Conference']
        //MID SIZE
        //const conferences_to_include = ['Big 12', 'American Athletic Conference','Big Ten','Southeastern Conference','FBS Independents','Mid-American Conference']
        //SMALL SIZE
        const conferences_to_include = ['Big 12', 'American Athletic Conference']

        //var teams_from_json = await common.get_teams({conference: ['Big 12', 'Southeastern Conference', 'Big Ten', 'Atlantic Coast Conference', 'American Athletic Conference', 'PAC-12', 'Conference USA', 'FBS Independents', 'Mountain West Conference', 'Sun Belt', 'Mid-American Conference']});
        var teams_from_json = await common.get_teams({conference: conferences_to_include});
        const num_teams = teams_from_json.length;

        const season_data = {season: season, world_id: world_id, captains_per_team: 3, players_per_team: 70,  num_teams: num_teams}
        const new_season = new league_season(season_data, undefined)
        await db.league_season.add(new_season);

        const phases_created = await common.create_phase(season);
        var weeks = await common.create_week(phases_created);


        const divisions_from_json = await common.get_divisions({conference: conferences_to_include});
        const divisions = await index_group(divisions_from_json, 'group','conference_name');

        const conferences_from_json = await common.get_conferences({conference: conferences_to_include});

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
          if (team.jersey.invert) {
            team.jersey.teamColors = ['#FFFFFF', `#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`];
          }
          else {
            team.jersey.teamColors = [`#${team.team_color_primary_hex}`, `#${team.team_color_secondary_hex}`, '#FFFFFF'];
          }

          team.jersey.lettering = {text_color: '#FFFFFF', text: ''};

          if (Math.random() < .2) {
            team.jersey.lettering.text = team.team_name
          }
          else if (Math.random() < .1) {
            team.jersey.lettering.text = team.school_name
          }

          if (team.jersey.id == null){
            team.jersey.id = jersey_options[Math.floor(Math.random() * jersey_options.length)];
          }


          rivals_team_1 = rivalries.filter(r => r.team_name_1 == team.school_name).map(function(r) { return {opponent_name: r.team_name_2, opponent_team_id: null, preferred_week_number: r.preferred_week_number, rivalry_name: r.rivalry_name}});
          rivals_team_2 = rivalries.filter(r => r.team_name_2 == team.school_name).map(function(r) { return {opponent_name: r.team_name_1, opponent_team_id: null, preferred_week_number: r.preferred_week_number, rivalry_name: r.rivalry_name}});

          rivals = rivals_team_1.concat(rivals_team_2);


          teams.push({
            team_id: team_id_counter,
            school_name: team.school_name,
            team_name: team.team_name,
            world_id: world_id,
            team_abbreviation: team.team_abbreviation,
            team_color_primary_hex: team.team_color_primary_hex,
            team_color_secondary_hex: team.team_color_secondary_hex,
            rivals: rivals,
            jersey: team.jersey,
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

        await common.create_team_season({common: common, season:season, world_id: world_id, conferences:conferences})

        $(par).append('<div>Ranking teams</div>')
        const all_weeks = await db.week.where({season: season}).toArray();
        const this_week = all_weeks.filter(w => w.is_current)[0];

        this_week.phase = await db.phase.get({phase_id: this_week.phase_id});
        this_week.phase.season = season;

        console.log('this_week',this_week, all_weeks, common)

        await common.calculate_national_rankings(this_week, all_weeks, common)
        await common.calculate_conference_rankings(this_week, all_weeks, common)

        var team_seasons = await db.team_season.where({season: season}).toArray();
        const teams_by_team_id = await index_group(await db.team.toArray(), 'index', 'team_id')

        $(par).append('<div>Adding Players</div>')

        await common.create_players({common: common, team_seasons_tocreate:team_seasons_tocreate, team_seasons:team_seasons, teams_by_team_id:teams_by_team_id, world_id:world_id, season:season})


        $(par).append('<div>Populating depth charts</div>')
        var team_seasons_to_update = [];
        var team_seasons_by_team_season_id = await index_group(await db.team_season.where({season: season}).toArray(), 'index', 'team_season_id');
        var player_team_seasons = await db.player_team_season.where({season: season}).toArray();
        var player_team_seasons_by_team_season_id = await index_group(player_team_seasons, 'group', 'team_season_id');

        var team_season = null;

        await $.each(player_team_seasons_by_team_season_id,  function(team_season_id, player_team_season_list) {
          team_season = team_seasons_by_team_season_id[team_season_id];

          player_team_season_list =  player_team_season_list.sort(function(pts_a, pts_b) {
            return pts_b.ratings.overall.overall - pts_a.ratings.overall.overall;
          });

          team_season.depth_chart = {}

          var position_player_team_season_obj = index_group_sync(player_team_season_list, 'group', 'position')

          $.each(position_player_team_season_obj, function(position, position_player_team_season_list){
            team_season.depth_chart[position] = position_player_team_season_list.map(pts => pts.player_team_season_id);
          });

          team_seasons_to_update.push(team_season)
        })

        var tsu = await db.team_season.bulkPut(team_seasons_to_update);

        $(par).append('<div>Creating season schedule</div>')
        var games_to_create = [],team_games_to_create = [],team_games_to_create_ids = [];
        var team_season_schedule_tracker = {}
        const games_per_team = 12;
        const zip = (a, b) => a.map((k, i) => [k, b[i]]);

        team_seasons = await db.team_season.where({season: season}).toArray();
        const team_seasons_by_team_id = await index_group(team_seasons, 'index', 'team_id')
        const team_rivalries_by_team_season_id = await index_group(team_seasons.map(function(ts){ return { team_season_id: ts.team_season_id, rivals:teams_by_team_id[ts.team_id].rivals}}), 'index', 'team_season_id');
        const conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index', 'conference_id');
        const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index', 'conference_season_id');

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
            conference: {games_to_schedule: team_conference.number_conference_games, games_scheduled: 0, home_games: 0, away_games: 0, net_home_games: 0,},
            non_conference: {games_to_schedule: games_per_team - team_conference.number_conference_games, games_scheduled: 0, home_games: 0, away_games: 0, net_home_games: 0,},
            weeks_scheduled: [], opponents_scheduled: [],
            conference_season_id: team_season.conference_season_id,
            rivals: team_season_rivals,
            team: teams_by_team_id[team_season.team_id]
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


            if (attempt_counter % 4  == 3 ){
              conference_team_season_id_list = common.shuffle(conference_team_season_id_list);
            }
            else if (attempt_counter % 4 < 2) {
              conference_team_season_id_list = conference_team_season_id_list.sort(function(team_a, team_b){
                if (team_season_schedule_tracker[team_a].conference.games_to_schedule > team_season_schedule_tracker[team_b].conference.games_to_schedule) return 1;
                if (team_season_schedule_tracker[team_a].conference.games_to_schedule < team_season_schedule_tracker[team_b].conference.games_to_schedule) return -1;
                return 0;
              });
            }
            else {
              conference_team_season_id_list = conference_team_season_id_list.sort(function(team_a, team_b){
                if (team_season_schedule_tracker[team_a].non_conference.games_to_schedule > team_season_schedule_tracker[team_b].non_conference.games_to_schedule) return 1;
                if (team_season_schedule_tracker[team_a].non_conference.games_to_schedule < team_season_schedule_tracker[team_b].non_conference.games_to_schedule) return -1;
                return 0;
              });
            }

            const half = Math.ceil(conference_team_season_id_list.length / 2);
            team_set_a = conference_team_season_id_list.splice(0, half)
            team_set_b = conference_team_season_id_list.splice(-half)
            team_set_b = team_set_b.reverse()


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
        //Scheduling non_conference
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

        team_seasons_to_update = Object.values(team_seasons);

        //const games_created = await db.game.bulkAdd(games_to_create, games_to_create_ids);
        const games_created = await db.game.bulkPut(games_to_create);
        const team_games_created = await db.team_game.bulkPut(team_games_to_create);
        //team_season_updated = await db.team_season.bulkPut(team_seasons_to_update);

        //await choose_preseason_all_americans(this_week, common);

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
