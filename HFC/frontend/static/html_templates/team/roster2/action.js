
    const getHtml = async (common) => {
      nunjucks.configure({ autoescape: true });

      var world_obj = {};
      const team_id = parseInt(common.params.team_id);
      const season = common.season;
      const db = common.db;
      const query_to_dict = common.query_to_dict;

      var class_sort_order_map = {
          'FR': 1,
          'FR (RS)': 1.5,
          'SO': 2,
          'SO (RS)': 2.5,
          'JR': 3,
          'JR (RS)': 3.5,
          'SR': 4,
          'SR (RS)': 4.5,
        };

        var position_sort_order_map = {
            'QB': '01',
            'RB': '02',
            'FB': '03',
            'WR': '04',
            'TE': '05',
            'OT': '06',
            'IOL': '07',
            'EDGE': '09',
            'DL': '10',
            'LB': '12',
            'CB': '13',
            'S': '14',
            'K': '15',
            'P': '16',
          };

          var position_group_map = {
              'QB': 'Offense',
              'RB': 'Offense',
              'FB': 'Offense',
              'WR': 'Offense',
              'TE': 'Offense',
              'OT': 'Offense',
              'IOL': 'Offense',
              'EDGE': 'Defense',
              'DL': 'Defense',
              'LB': 'Defense',
              'CB': 'Defense',
              'S': 'Defense',
              'K': 'Special Teams',
              'P': 'Special Teams',
            };

      const NavBarLinks = await common.nav_bar_links({
        path: 'Roster',
        group_name: 'Team',
        db: db
      });

      const TeamHeaderLinks = await common.team_header_links({
        path: 'Roster2',
        season: common.params.season,
        db: db
      });

      var teams = await db.team.where('team_id').above(0).toArray();
      teams = teams.sort(function(teamA, teamB) {
        if ( teamA.school_name < teamB.school_name ){
          return -1;
        }
        if ( teamA.school_name > teamB.school_name ){
          return 1;
        }
        return 0;
      });


      const team = await db.team.get({team_id: team_id})
      const team_season = await db.team_season.get({team_id: team_id, season: season});

      const conference_seasons_by_conference_season_id = await index_group(await db.conference_season.where({season: season}).toArray(), 'index', 'conference_season_id');
      const conference_by_conference_id = await index_group(await db.conference.toArray(), 'index', 'conference_id');

      team.team_season = team_season;
      team.team_season.conference_season = conference_seasons_by_conference_season_id[team.team_season.conference_season_id];
      team.team_season.conference_season.conference = conference_by_conference_id[team.team_season.conference_season.conference_id];

      //const player_team_seasons = await db.player_team_season.where({team_season_id: team_season.team_season_id}).toArray();
      const player_team_seasons = await db.player_team_season.toArray();
      const player_team_season_ids = player_team_seasons.map(pts => pts.player_team_season_id);

      const player_ids = player_team_seasons.map(pts => pts.player_id);
      var players = await db.player.bulkGet(player_ids);

      const player_team_season_games = await query_to_dict(await db.player_team_game.where({player_team_season_id: player_team_season_ids}).toArray(), 'many_to_one', 'player_team_season_id' );


      

      var player_counter = 0;
      $.each(player_team_seasons, function(ind,player_team_season){
        team_season.team = team;
        player_team_season.team_season = team_season;
        player_team_season.player_team_games = player_team_season_games[player_team_season.player_team_season_id];

        player_team_season.class_sort_order = class_sort_order_map[player_team_season.class.class_name]
        player_team_season.position_sort_order = position_sort_order_map[player_team_season.position]
        player_team_season.position_group = position_group_map[player_team_season.position]

        players[player_counter].player_team_season = player_team_season;

        player_counter +=1;

      });


      let classes = ['All', 'SR', 'JR', 'SO', 'FR'];
      let position_groups = ['All', 'Offense', 'Defense', 'Special Teams' ]

      let roster_summary = {}
      for (player_class of classes ){
        roster_summary[player_class] = {}
        for (position_group of position_groups){
          roster_summary[player_class][position_group] = {
            'players': player_team_seasons.filter(pts => (pts.class.class_name == player_class || player_class == 'ALL') && (pts.position_group == position_group || position_group == 'ALL')).length,
            'starters': 0
          }
          console.log({player_team_seasons:player_team_seasons, player_class:player_class, position_group:position_group, summary: roster_summary[player_class][position_group]})
        }
      }

      var table_filters = {
        'player_team_season.position': {
          'player_count': 0,'display': 'Position', 'raw_options': ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'IOL', 'DL', 'EDGE', 'LB', "CB", 'S', 'K', 'P']
        },
        'player_team_season.position_group': {
          'player_count': 0, 'display': 'Position Group', 'raw_options': ['Offense', 'Defense', 'Special Teams']
        },
        'player_team_season.class.class_name': {
          'player_count': 0,'display': 'Class', 'raw_options': ['FR', 'SO', 'JR', 'SR']
        }
      }

      for (table_filter_key in table_filters){
        table_filters[table_filter_key].options = [];
        for (table_filter_option of table_filters[table_filter_key].raw_options){
          console.log({players: players, table_filter_option:table_filter_option, table_filter_key:table_filter_key, g:get_from_dict(players[0], table_filter_key)});
          var player_count =  players.filter(pts => get_from_dict(pts, table_filter_key) == table_filter_option).length;
          table_filters[table_filter_key].player_count += player_count
          table_filters[table_filter_key].options.push({
            display: table_filter_option, player_count:player_count
          })
        }
      }


      common.page = {table_filters: table_filters, PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
      var render_content = {
                            page:     common.page,
                            world_id: common.params['world_id'],
                            team_id:  team_id,
                            team: team,
                            players: players,
                            all_teams: await common.all_teams(common, '/Roster2/'),
                            teams: teams,
                            roster_summary:roster_summary,
                          }

      common.sorted_columns = [{key: 'player_id', sort_direction: 'sort-asc'}];
      common.pagination = {page_size: 75, current_page: 1, max_pages: Math.ceil(players.length / 100)};
      
      common.render_content = render_content;

      common.render_content.column_controls = {
        Stats: {
          'games': {shown: true, display: 'Games'},
          'passing': {shown: false, display: 'Passing'},
          'rushing': {shown: false, display: 'Rushing'},
          'receiving': {shown: false, display: 'Receiving'},
          'blocking': {shown: false, display: 'Blocking'},
          'defense': {shown: false, display: 'Defense'},
          'kicking': {shown: false, display: 'Kicking'},
          },
        Ratings: {
          'athleticism': {shown: false, display: 'Athleticsm'},
          'passing': {shown: false, display: 'Throwing'},
          'rushing': {shown: false, display: 'Running'},
          'receiving': {shown: false, display: 'Receiving'},
          'blocking': {shown: false, display: 'Blocking'},
          'defense': {shown: false, display: 'Defense'},
          'kicking': {shown: false, display: 'Kicking'},
          },  
        Personal: {
          'personal': {shown: false, display: 'Personal'},
          'awards': {shown: false, display: 'Awards'},
          },     
        }

      console.log('render_content', render_content)

      var url = '/static/html_templates/team/roster2/template.html'
      var html = await fetch(url);
      html = await html.text();

      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

      $('#body').html(renderedHtml)


      var filter_url = '/static/html_templates/team/roster2/player_table_filter_template.html'
      var html = await fetch(filter_url);
      html = await html.text();
      var renderedHtml = await common.nunjucks_env.renderString(html, render_content)
      $('#player-stats-table-filter').empty();
      $('#player-stats-table-filter').html(renderedHtml)


      var column_control_url = '/static/html_templates/team/roster2/player_table_column_control_template.html'
      var html = await fetch(column_control_url);
      html = await html.text();
      console.log({'common.render_content': common.render_content})
      var renderedHtml = await common.nunjucks_env.renderString(html, common.render_content)
      $('#player-stats-table-column-control').empty();
      $('#player-stats-table-column-control').html(renderedHtml)

    }

      const player_sorter = (common, players, sorted_columns) => {
        players = players.map(p => Object.assign(p, {sort_value: common.get_from_dict(p, sorted_columns[0].key)}))
        for(player of players){
            player.sort_vals = {};
            for (sort_column_obj of sorted_columns ){
              player.sort_vals[sort_column_obj.key] = common.get_from_dict(player, sort_column_obj.key);
            }
          }  


        return players.sort(function(p_a, p_b) {
          for (sort_column_obj of sorted_columns){
            if (p_b.sort_vals[sort_column_obj.key] != p_a.sort_vals[sort_column_obj.key]){
              if (sort_column_obj.sort_direction == 'sort-asc'){
                return (p_b.sort_vals[sort_column_obj.key] < p_a.sort_vals[sort_column_obj.key]) ? 1 : -1;
              }
              else {
                return (p_b.sort_vals[sort_column_obj.key] > p_a.sort_vals[sort_column_obj.key]) ? 1 : -1;
              }
            }
          }
          return 0;
        });
      }

      const find_filtered_columns = (clicked_button) => {
        var filtered_columns = [];
        $('#player-stats-table-filter .football-table-filter-row').each(function(){
          var all_named_button = $(this).find('.football-table-filter-option[filter_value="All"]').first()

          if ($(clicked_button).is(all_named_button)){
            $(this).find('.football-table-filter-option.selected:not([filter_value="All"])').toggleClass('selected')
          }

          var filter_option = $(this).attr('filter_option');
          var all_children = $(this).find('.football-table-filter-option:not([filter_value="All"])').toArray()
          var selected_options = $(this).find('.football-table-filter-option.selected:not([filter_value="All"])').toArray()

          if (all_children.length != selected_options.length && selected_options.length > 0){
            var values = selected_options.map(so =>  $(so).attr('filter_value'));
            filtered_columns.push({field:filter_option, values:values})

            $(this).find('.football-table-filter-option[filter_value="All"]').removeClass('selected')

          }
          else {
            $(this).find('.football-table-filter-option[filter_value="All"]').addClass('selected')
          }
        });

        return filtered_columns;

      }


      const find_column_controls = (common, clicked_button) => {
        var column_controls = common.render_content.column_controls;
        console.log({column_controls:column_controls, clicked_button:clicked_button})

        $('#player-stats-table-column-control .football-table-column-control-row').each(function(ind, row){
          console.log({row:row})
          var all_named_button = $(row).find('.football-table-column-control-option[column_control_group="All"]').first()

          var all_children = $(row).find('.football-table-column-control-option:not([column_control_group="All"])').toArray()
          var selected_options = $(row).find('.football-table-column-control-option.selected:not([column_control_group="All"])').toArray()

          if ($(clicked_button).is(all_named_button)){
            if (all_children.length == selected_options.length){
              $(row).find('.football-table-column-control-option.selected:not([column_control_group="All"])').removeClass('selected')
            }
            else {
              $(row).find('.football-table-column-control-option:not([column_control_group="All"])').addClass('selected')
            }
          }
          else {
            if (all_children.length == selected_options.length){
              $(all_named_button).addClass('selected')
            }
            else {
              $(all_named_button).removeClass('selected')
            }
          }

          var selected_options = $(row).find('.football-table-column-control-option.selected:not([column_control_group="All"])').toArray()
          console.log({all_children:all_children, selected_options:selected_options})

          $.each(all_children, function(ind, button){
            var column_control_group = $(button).attr('column_control_group');
            common.get_from_dict(column_controls, column_control_group).shown = $(button).hasClass('selected');
          })

          if (selected_options.length > 0){
            
          }
          else {
            $(row).find('.football-table-column-control-option[column_control_group="All"]').removeClass('selected')
          }
        });

        console.log({column_controls: column_controls})
        return column_controls;
      }

      

      const adjust_button_text = (common, players) => {
        $('.football-table-filter-option')

        for (table_filter_field in common.page.table_filters){
          var table_filter_obj = common.page.table_filters[table_filter_field];
          for(filter_option of table_filter_obj.raw_options){
            var count_value = players.filter(p => get_from_dict(p, table_filter_field) == filter_option).length;
            $('.football-table-filter-option[filter_value="'+filter_option+'"]').attr('count_value', count_value);
            $('.football-table-filter-option[filter_value="'+filter_option+'"] .football-table-filter-option-value').text(count_value);
          }
        
        }
      }

      const add_filter_listeners = async (common) => {
        $('.football-table-filter-button').on('click', function(){
          console.log('clicked', this, $(this).next())
          let table_filter_content = $(this).next();
          $(table_filter_content).toggleClass('hidden')
        })

        $('.football-table-filter-option').on('click', function(){
          var clicked_button = $(this);
          $(this).toggleClass('selected')
          common.filtered_columns = find_filtered_columns(clicked_button);
          
          common.pagination.current_page = 1;
          GetPlayerStats(common)
        })

        $('#filter-dropdown-button').on('click', function(){
          $(this).find('i').toggleClass('fa-angle-down');
          $(this).find('i').toggleClass('fa-angle-up');
          $(this).toggleClass('shown');

          $('#football-table-filter-table').toggleClass('hidden')
        })
      }

      const add_column_control_listeners = async (common) => {
        $('.football-table-column-control-button').on('click', function(){
          console.log('clicked', this, $(this).next())
          let table_column_control_content = $(this).next();
          $(table_column_control_content).toggleClass('hidden')
        })

        $('.football-table-column-control-option').on('click', function(){
          var clicked_button = $(this);
          $(this).toggleClass('selected')
          common.render_content.column_controls = find_column_controls(common, clicked_button);
          
          GetPlayerStats(common)
        })

        $('#column-control-dropdown-button').on('click', function(){
          $(this).find('i').toggleClass('fa-angle-down');
          $(this).find('i').toggleClass('fa-angle-up');
          $(this).toggleClass('shown');

          $('#football-table-column-control-table').toggleClass('hidden')
        })
      }

       const add_table_listeners = async (common) => {

        let football_table_body = $('.football-table-body').eq(0);
          let football_table_rows_map = {};
          $('.football-table-row').each(function(ind, row){
            football_table_rows_map[$(row).attr('player_id')] = row;
          })

          

        $('.football-table-column-headers th').on('click', function(e){
          common.pagination.current_page = 1;
          let target_new_class = $(e.target).attr('sort-order') || 'sort-desc';
          if ($(e.target).hasClass('sort-desc')){
            target_new_class = 'sort-asc';
          }
          else if ($(e.target).hasClass('sort-asc')){
            target_new_class = 'sort-desc';
          }

          if (!(e.shiftKey)){
            common.sorted_columns = [];
            $('.football-table-column-headers th').removeClass('sort-desc');
            $('.football-table-column-headers th').removeClass('sort-asc');
          }

          let sort_direction = target_new_class;
          $(e.target).addClass(sort_direction);
          common.sorted_columns.push({key: $(e.target).attr('value-key'), sort_direction: sort_direction})
          GetPlayerStats(common)
        })

        $('#football-table-pagination button').on('click', function(){
          var page_destination = $(this).attr('pagination-action');
          common.pagination.current_page = parseInt(page_destination);
          GetPlayerStats(common)
        })


        $('.player-profile-popup-icon').on('click', async function(){
          await common.populate_player_modal(common, this)
        })

      }

        const GetPlayerStats = async (common) => {

          var startTime = performance.now()
    

          var url = '/static/html_templates/team/roster2/player_table_template.html'
          if (common.GetPlayerStats_html_text == undefined){
            common.GetPlayerStats_html = await fetch(url);
            common.GetPlayerStats_html_text = await common.GetPlayerStats_html.text();
          }

          var sorted_columns = common.sorted_columns || [];
          var filtered_columns = common.filtered_columns || [];

          var players = common.render_content.players;

          for (filtered_column of filtered_columns){
            players = players.filter(p => filtered_column.values.includes(get_from_dict(p, filtered_column.field) ) );
          }

          adjust_button_text(common, players);

          players = player_sorter(common, players, sorted_columns);

          common.pagination.max_pages = Math.ceil(players.length / common.pagination.page_size);
          common.pagination.pagination_index_start = common.pagination.page_size * (common.pagination.current_page - 1);
          common.pagination.pagination_index_end = common.pagination.pagination_index_start + common.pagination.page_size;
          common.pagination.available_page_navigation = [common.pagination.current_page];
          for (var step = 1; step <= 4; step++){
            if (common.pagination.available_page_navigation.length < 5){
              if ((common.pagination.current_page - step) > 0){
                common.pagination.available_page_navigation.push(common.pagination.current_page - step)
              }
              if ((common.pagination.current_page + step) <= common.pagination.max_pages){
                common.pagination.available_page_navigation.push(common.pagination.current_page + step)
              }
            }
          }
          common.pagination.available_page_navigation = common.pagination.available_page_navigation.sort((a,b)=>a-b)
          console.log({'common.pagination.available_page_navigation': common.pagination.available_page_navigation})
          players = players.slice(common.pagination.pagination_index_start, common.pagination.pagination_index_end)

          var renderTime = performance.now()
          console.log(`Time taken to sort & filter: ${parseInt(renderTime - startTime)} ms` );
          
          var renderedHtml = await common.nunjucks_env.renderString(common.GetPlayerStats_html_text, {column_controls: common.render_content.column_controls, pagination:common.pagination, players:players, page:common.page})

          $('#player-stats-table-container').empty();
          $('#player-stats-table-container').append(renderedHtml);

          var endTime = performance.now()
          console.log(`Time taken to render the table: ${parseInt(endTime - renderTime)} ms` );
          console.log(`Time taken for all Player Roster: ${parseInt(endTime - startTime)} ms` );

          let column_counter = 1;
          $('.football-table-column-headers th').each(function(){
            for (sort_column_obj of common.sorted_columns){
              if ($(this).attr('value-key') == sort_column_obj.key){
                $(this).addClass(sort_column_obj.sort_direction);

                $('.football-table-content col:nth-child('+column_counter+')').css('background-color', '#efefef')
              }
            }
            column_counter +=1;
          })

          add_table_listeners(common);
        }

    const action = async (common) => {

      GetPlayerStats(common);
      add_filter_listeners(common)
      add_column_control_listeners(common)
      
    }


    $(document).ready(async function(){
      var startTime = performance.now()

      const common = await common_functions('/World/:world_id/Team/:team_id/Roster2/');
      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })
