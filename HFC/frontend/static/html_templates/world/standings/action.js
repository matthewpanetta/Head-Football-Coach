
    const getHtml = async(common) => {
      const db = common.db;
      nunjucks.configure({ autoescape: true });
      var index_group = common.index_group;
      const season = common.season;

      const conference_id = common.params.conference_id;
      console.log('conference_id', conference_id, common)

      var world_obj = {};

      const NavBarLinks = await common.nav_bar_links({
        path: 'Standings',
        group_name: 'World',
        db: db
      });

      const weeks = await db.week.where({season:season}).toArray();
      const week_ids = weeks.map(week => week.week_id);

      var teams_by_team_id = await index_group(await db.team.where('team_id').above(0).toArray(), 'index','team_id');
      var conferences_by_conference_id = await index_group(await db.conference.toArray(), 'index','conference_id');
      var conference_seasons =  await db.conference_season.where({season: season}).toArray();
      var team_seasons = await db.team_season.where({season: season}).and(ts => ts.team_id > 0).toArray();
      var distinct_team_seasons = [];

      var games_by_game_id = await index_group(await db.game.where('week_id').anyOf(week_ids).toArray(), 'index', 'game_id');
      var team_games = await db.team_game.where('week_id').anyOf(week_ids).toArray();

      $.each(team_games, function(ind, team_game){
          team_game.game = games_by_game_id[team_game.game_id];
      });

      team_games = team_games.filter(tg => tg.game.was_played == true);
      var team_games_by_team_season_id = await index_group(team_games, 'group','team_season_id');
      var team_games_by_team_game_id = await index_group(team_games, 'index','team_game_id');


      $.each(team_seasons, async function(ind, team_season){
        team_season.team =teams_by_team_id[team_season.team_id];

        team_season.team_games = team_games_by_team_season_id[team_season.team_season_id];
        team_season.conference_outcomes = {'record': team_season.conference_record_display, gb: team_season.record.conference_gb, points_for: 0, points_against: 0, games_played: 0}
        team_season.overall_outcomes = {'record': team_season.record_display, points_for: 0, points_against: 0, games_played: 0}

        team_season.first_conference_rank = team_season.rankings.division_rank[team_season.rankings.division_rank.length - 1];
        team_season.final_conference_rank = team_season.rankings.division_rank[0];

        $.each(team_season.team_games, function(ind, team_game){
          team_game.opponent_team_game = team_games_by_team_game_id[team_game.opponent_team_game_id]
          team_season.overall_outcomes.games_played += 1;
          team_season.overall_outcomes.points_for += team_game.points;
          team_season.overall_outcomes.points_against += team_game.opponent_team_game.points;

          if (team_game.game.is_conference_game){
            team_season.conference_outcomes.games_played += 1;
            team_season.conference_outcomes.points_for += team_game.points;
            team_season.conference_outcomes.points_against += team_game.opponent_team_game.points;
          }
        });

        if (team_season.overall_outcomes.games_played > 0){
          team_season.overall_outcomes.ppg = common.round_decimal(team_season.overall_outcomes.points_for / team_season.overall_outcomes.games_played, 1)
          team_season.overall_outcomes.papg = common.round_decimal(team_season.overall_outcomes.points_against / team_season.overall_outcomes.games_played, 1)
          team_season.overall_outcomes.mov = common.round_decimal(team_season.overall_outcomes.ppg - team_season.overall_outcomes.papg, 1);

          if (team_season.overall_outcomes.mov > 0) {
            team_season.overall_outcomes.color = 'W';
          }
          else if (team_season.overall_outcomes.mov < 0) {
            team_season.overall_outcomes.color = 'L';
          }
        }

        if (team_season.conference_outcomes.games_played > 0){
          team_season.conference_outcomes.ppg = common.round_decimal(team_season.conference_outcomes.points_for / team_season.conference_outcomes.games_played, 1)
          team_season.conference_outcomes.papg = common.round_decimal(team_season.conference_outcomes.points_against / team_season.conference_outcomes.games_played, 1)
          team_season.conference_outcomes.mov = common.round_decimal(team_season.conference_outcomes.ppg - team_season.conference_outcomes.papg, 1);

          if (team_season.conference_outcomes.mov > 0) {
            team_season.conference_outcomes.color = 'W';
          }
          else if (team_season.conference_outcomes.mov < 0) {
            team_season.conference_outcomes.color = 'L';
          }
        }
        else {
          team_season.conference_outcomes.ppg = '-'
          team_season.conference_outcomes.papg = '-'
          team_season.conference_outcomes.mov = '-';
        }
      });

      var team_seasons_by_conference_season_id = await index_group(team_seasons, 'group','conference_season_id');

      $.each(conference_seasons, function(ind, conference_season){
        conference_season.conference = conferences_by_conference_id[conference_season.conference_id];
        conference_season.team_seasons = team_seasons_by_conference_season_id[conference_season.conference_season_id];

        conference_season.team_seasons = conference_season.team_seasons.sort(function(a, b) {
            if (a.rankings.division_rank[0] < b.rankings.division_rank[0]) return -1;
            if (a.rankings.division_rank[0] > b.rankings.division_rank[0]) return 1;
            return 0;
          });

      })

      conference_seasons = conference_seasons.sort(function(conference_season_a, conference_season_b) {
          if (conference_season_a.conference.conference_id == conference_id) return -1;
          if (conference_season_b.conference.conference_id == conference_id) return 1;
          if (conference_season_a.conference.conference_name < conference_season_b.conference.conference_name) return -1;
          return 1;
        })


      const recent_games = await common.recent_games(common);


      var render_content = {page: {PrimaryColor: '1763B2', SecondaryColor: '000000', NavBarLinks: NavBarLinks},
                            world_id: common.params['world_id'],
                            team_list: [],
                            recent_games: recent_games,
                            conference_seasons: conference_seasons,
                          };

      common.render_content = render_content;


      console.log('render_content', render_content)

      var url = '/static/html_templates/world/standings/template.html'
      var html = await fetch(url);
      html = await html.text();

      const renderedHtml = common.nunjucks_env.renderString(html, render_content);

      $('#body').html(renderedHtml);


      const conference_seasons_by_conference_id = index_group_sync(conference_seasons, 'index', 'conference_id');
      var clicked_tabs = [];
      var margin = {top: 10, right: 30, bottom: 30, left: 120},
        height = 400 - margin.top - margin.bottom;

      $('.nav-tab-button').on('click', function(){
        var tab_id = $(this).attr('id');
        console.log({clicked_tabs:clicked_tabs, tab_id:tab_id, 'clicked_tabs.includes(tab_id)':clicked_tabs.includes(tab_id)})
        if (clicked_tabs.includes(tab_id) ){
          return false;
        }
        clicked_tabs.push(tab_id);

        var conference_id = $(this).attr('conference_id');

        var chart_div = $(`.standings-trend-chart[conference_id="${conference_id}"]`)[0]


        var conference_season = conference_seasons_by_conference_id[conference_id];
        var team_seasons = conference_season.team_seasons;
        team_seasons = team_seasons.sort((ts_a, ts_b) => ts_a.first_conference_rank - ts_b.first_conference_rank )
        var max_rank = team_seasons.length;

        var width = $($('.standings-trend-chart:visible')[0]).parent().width() - margin.left - margin.right;

        //CODE CREDIT:
        //https://observablehq.com/@d3/dot-plot
        //https://www.d3-graph-gallery.com/graph/lollipop_cleveland.html
        var svg = d3.select(chart_div)
                      .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                      .append("g")
                        .attr("transform",
                              "translate(" + margin.left + "," + margin.top + ")");

        var x = d3.scaleLinear()
              .domain([1, max_rank])
              .range([ 0, width]);
            svg.append("g")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x))

            // Y axis
            var y = d3.scaleBand()
              .range([ 0, height ])
              .domain(team_seasons.map(function(ts) { return ts.team.school_name; }))
              .padding(1);

            svg.append("g")
              .call(d3.axisLeft(y))
              .style("font-size", "14px")

            // Lines
            svg.selectAll("myline")
              .data(team_seasons)
              .enter()
              .append("line")
                .attr("x1", function(ts) { return x(ts.first_conference_rank); })
                .attr("x2", function(ts) { return x(ts.final_conference_rank); })
                .attr("y1", function(ts) { return y(ts.team.school_name); })
                .attr("y2", function(ts) { return y(ts.team.school_name); })
                .attr("stroke", function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .attr("stroke-width", "2px")

            var bubbles1 = svg.selectAll('.bubble')
                  .data(team_seasons)
                  .enter()
                  .append('g')
                  .attr("transform", ts => `translate(${x(ts.first_conference_rank)}, ${y(ts.team.school_name)})`)

            var bubbles2 = svg.selectAll('.bubble')
                  .data(team_seasons)
                  .enter()
                  .append('g')
                  .attr("transform", ts => `translate(${x(ts.final_conference_rank)}, ${y(ts.team.school_name)})`)

            var circles1 = bubbles1.append('circle')
                .attr("r", "8")
                .style('stroke', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .style('fill', 'white')

            var texts1 = bubbles1.append('text')
                .attr('text-anchor', 'middle')
                .attr("cx", function(ts) { return x(ts.first_conference_rank); })
                .attr("cy", function(ts) { return y(ts.team.school_name); })
                .attr('alignment-baseline', 'middle')
                .style('font-size', '10px')
                .attr('fill', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .text(function(ts) { return ts.first_conference_rank; })


            var circles2 = bubbles2.append('circle')
                .attr("r", "8")
                .style('stroke', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .style('fill', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })

            var texts2 = bubbles2.append('text')
                .attr('text-anchor', 'middle')
                .attr("cx", function(ts) { return x(ts.final_conference_rank); })
                .attr("cy", function(ts) { return y(ts.team.school_name); })
                .attr('alignment-baseline', 'middle')
                .style('font-size', '10px')
                .attr('fill', 'white')
                .text(function(ts) { return ts.final_conference_rank; })


      })


      $(`#nav-${conference_seasons[0].conference_id}-tab`).click()

    }

    const action = async (common) => {
      const db = common.db;

      //add_trend_charts(common);
    }

    const add_trend_charts = (common) => {
      const db = common.db;


      var margin = {top: 10, right: 30, bottom: 30, left: 100},
        height = 500 - margin.top - margin.bottom;

      $('.standings-trend-chart').each(function(){
        console.log(this);
        var conference_id = $(this).attr('conference_id')

        var width = $(this).parent().width() - margin.left - margin.right;

        var svg = d3.select(this)
                      .append("svg")
                        .attr("width", width + margin.left + margin.right)
                        .attr("height", height + margin.top + margin.bottom)
                      .append("g")
                        .attr("transform",
                              "translate(" + margin.left + "," + margin.top + ")");



        var conference_season = conference_seasons_by_conference_id[conference_id];
        var team_seasons = conference_season.team_seasons;
        team_seasons = team_seasons.sort((ts_a, ts_b) => ts_a.first_conference_rank - ts_b.first_conference_rank )
        var max_rank = team_seasons.length;
        var x = d3.scaleLinear()
              .domain([1, max_rank]) // set to min and max
              .range([ 0, width]);
            svg.append("g")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x))

            // Y axis
            var y = d3.scaleBand()
              .range([ 0, height ])
              .domain(team_seasons.map(function(ts) { return ts.team.school_name; }))
              .padding(1);
            svg.append("g")
              .call(d3.axisLeft(y))
              .style("font-size", "14px")

            // Lines
            svg.selectAll("myline")
              .data(team_seasons)
              .enter()
              .append("line")
                .attr("x1", function(ts) { return x(ts.first_conference_rank); })
                .attr("x2", function(ts) { return x(ts.final_conference_rank); })
                .attr("y1", function(ts) { return y(ts.team.school_name); })
                .attr("y2", function(ts) { return y(ts.team.school_name); })
                .attr("stroke", function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .attr("stroke-width", "2px")

            var bubbles1 = svg.selectAll('.bubble')
                  .data(team_seasons)
                  .enter()
                  .append('g')
                  .attr("transform", ts => `translate(${x(ts.first_conference_rank)}, ${y(ts.team.school_name)})`)

            var bubbles2 = svg.selectAll('.bubble')
                  .data(team_seasons)
                  .enter()
                  .append('g')
                  .attr("transform", ts => `translate(${x(ts.final_conference_rank)}, ${y(ts.team.school_name)})`)

            var circles1 = bubbles1.append('circle')
                .attr("r", "8")
                .style('stroke', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .style('fill', 'white')

            var texts1 = bubbles1.append('text')
                .attr('text-anchor', 'middle')
                .attr("cx", function(ts) { return x(ts.first_conference_rank); })
                .attr("cy", function(ts) { return y(ts.team.school_name); })
                .attr('alignment-baseline', 'middle')
                .style('font-size', '10px')
                .attr('fill', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .text(function(ts) { return ts.first_conference_rank; })


            var circles2 = bubbles2.append('circle')
                .attr("r", "8")
                .style('stroke', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })
                .style('fill', function(ts){
                    if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
                    if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
                    return 'grey'
                })

            var texts2 = bubbles2.append('text')
                .attr('text-anchor', 'middle')
                .attr("cx", function(ts) { return x(ts.final_conference_rank); })
                .attr("cy", function(ts) { return y(ts.team.school_name); })
                .attr('alignment-baseline', 'middle')
                .style('font-size', '10px')
                .attr('fill', 'white')
                .text(function(ts) { return ts.final_conference_rank; })


            // // Circles of variable 1
            // svg.selectAll("mycircle")
            //   .data(team_seasons)
            //   .enter()
            //   .append("circle")
            //     .attr("cx", function(ts) { return x(ts.first_conference_rank); })
            //     .attr("cy", function(ts) { return y(ts.team.school_name); })
            //     .attr("r", "8")
            //     .style("fill", 'white')
            //     .style('stroke', function(ts){
            //         if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
            //         if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
            //         return 'grey'
            //     })

            // // Circles of variable 2
            // svg.selectAll("mycircle")
            //   .data(team_seasons)
            //   .enter()
            //   .append("circle")
            //     .attr("cx", function(ts) { return x(ts.final_conference_rank); })
            //     .attr("cy", function(ts) { return y(ts.team.school_name); })
            //     .attr("r", "0")
            //     .style("fill", function(ts){
            //         if (ts.first_conference_rank > ts.final_conference_rank) return 'green';
            //         if (ts.first_conference_rank < ts.final_conference_rank) return 'red';
            //         return 'grey'
            //     })
      })

    }


    $(document).ready(async function(){
      var startTime = performance.now()

      var common = await common_functions('/World/:world_id/Standings');
      if ( location.pathname.includes('/Conference/')){
        common = await common_functions('/World/:world_id/Standings/Conference/:conference_id');
      }

      common.startTime = startTime;

      await getHtml(common);
      await action(common);
      await common.add_listeners(common);
      await common.initialize_scoreboard();

      var endTime = performance.now()
      console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

    })

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
