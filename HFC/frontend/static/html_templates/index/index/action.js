
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

        await db.version(9).stores({
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
        var conferences_to_include = ['Big 12', 'American Athletic Conference','Atlantic Coast Conference','Big Ten','Southeastern Conference', 'Sun Belt', 'PAC-12','Conference USA','Mountain West Conference','FBS Independents','Mid-American Conference']
        //MID SIZE
        //const conferences_to_include = ['Big 12', 'American Athletic Conference','Big Ten','Southeastern Conference','FBS Independents','Mid-American Conference']
        //SMALL SIZE
         // var conferences_to_include = ['Big 12', 'American Athletic Conference','Atlantic Coast Conference','Big Ten','Southeastern Conference', 'Sun Belt', 'PAC-12','Conference USA','Mountain West Conference','FBS Independents','Mid-American Conference']
          conferences_to_include = shuffle(conferences_to_include)
          var num_conferences_to_include = 2
          conferences_to_include = conferences_to_include.slice(0, num_conferences_to_include)

        //var teams_from_json = await common.get_teams({conference: ['Big 12', 'Southeastern Conference', 'Big Ten', 'Atlantic Coast Conference', 'American Athletic Conference', 'PAC-12', 'Conference USA', 'FBS Independents', 'Mountain West Conference', 'Sun Belt', 'Mid-American Conference']});
        var teams_from_json = await common.get_teams({conference: conferences_to_include});
        const num_teams = teams_from_json.length;

        common.season = season;

        const season_data = {season: season, world_id: world_id, captains_per_team: 3, players_per_team: 70,  num_teams: num_teams}
        const new_season = new league_season(season_data, undefined)
        await db.league_season.add(new_season);

        const phases_created = await common.create_phase(season, common);
        await common.create_week(phases_created, common, season);


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
        var conferences =  await db.conference.toArray();


        await common.create_conference_seasons({common:common, conferences:conferences, season:season, world_id:world_id})
        var conference_seasons =  await index_group(await db.conference_season.toArray(), 'index','conference_id');

        conferences = nest_children(conferences, conference_seasons, 'conference_id', 'conference_season');
        const conferences_by_conference_name = index_group_sync(conferences, 'index', 'conference_name')


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
            conference: {conference_id: conferences_by_conference_name[team.conference_name].conference_id,
                         conference_name: team.conference_name,
                         division_id: null,
                         division_name: team.division_name},
            });

            team_id_counter +=1;
        });

        teams.push({
          team_id: -1,
          school_name: 'Available',
          team_name: 'Players',
          world_id: world_id,
          team_abbreviation: 'AVAIL',
          team_color_primary_hex: '1763B2',
          team_color_secondary_hex: 'FFFFFF',
          rivals: [],
          jersey: {invert:false, id: 'football', teamColors: ['#1763B2', '#000000', '#FFFFFF'], lettering: {text_color: '#FFFFFF', text: ''}},
          team_ratings: {},
          location: {
                        city: 'Washington',
                        state: 'DC'
                    },
          conference: {},
          });

          teams.push({
            team_id: -2,
            school_name: season,
            team_name: 'Recruits',
            world_id: world_id,
            team_abbreviation: 'RECRUIT',
            team_color_primary_hex: '1763B2',
            team_color_secondary_hex: 'FFFFFF',
            rivals: [],
            jersey: {invert:false, id: 'football', teamColors: ['#1763B2', '#000000', '#FFFFFF'], lettering: {text_color: '#FFFFFF', text: ''}},
            team_ratings: {},
            location: {
                          city: 'Washington',
                          state: 'DC'
                      },
            conference: {},
            });


        const teams_by_team_name = await index_group(teams, 'index', 'school_name');

        $.each(teams, function(ind, team){
          $.each(team.rivals, function(ind, rival){
            rival.opponent_team_id = teams_by_team_name[rival.opponent_name].team_id
          });
        });

        var teams_added = await db.team.bulkAdd(teams);
        $(par).append('<div>Adding Team Seasons</div>')

        await common.create_team_season({common: common, season:season, world_id: world_id, conferences_by_conference_name:conferences_by_conference_name})

        var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray();
        const teams_by_team_id = await index_group(await db.team.where('team_id').above(0).toArray(), 'index', 'team_id')

        $(par).append('<div>Adding Players</div>')

        await common.create_players({common: common, team_seasons:team_seasons, teams_by_team_id:teams_by_team_id, world_id:world_id, season:season});

        $(par).append('<div>Assigning players to teams</div>')
        var players = await db.player.toArray();
        await common.create_player_team_seasons({common: common, players:players, world_id:world_id, team_seasons:team_seasons, season:season})

        $(par).append('<div>Creating recruiting class</div>')
        await common.create_recruiting_class(common);

        $(par).append('<div>Populating depth charts</div>')
        await common.populate_all_depth_charts({common: common, season:season, world_id:world_id});

        $(par).append('<div>Evaluating team talent</div>')
        await common.calculate_team_overalls(common);


        $(par).append('<div>Ranking teams</div>')
        const all_weeks = await db.week.where({season: season}).toArray();
        const this_week = all_weeks.filter(w => w.is_current)[0];

        this_week.phase = await db.phase.get({phase_id: this_week.phase_id});
        this_week.phase.season = season;

        console.log('this_week',this_week, all_weeks, common)

        await common.calculate_national_rankings(this_week, all_weeks, common)
        await common.calculate_conference_rankings(this_week, all_weeks, common)

        $(par).append('<div>Creating season schedule</div>')
        await common.create_schedule({common: common, season:season, world_id:world_id});

        await choose_preseason_all_americans(common);

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
