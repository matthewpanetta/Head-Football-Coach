function ResArrowSize() {

    $('#addedStyle').remove();

    var bodyWidth = $('.SelectedGameBox').width();

    var side_length = bodyWidth / 2;

    var team_color = $('.SelectedGameBox').css('background-color');

    console.log('team_color', team_color, $('.SelectedGameBox'))

    var styleAdd = '';
    styleAdd += `border-left-width: ${side_length}px;`
    styleAdd += `border-right-width: ${side_length}px;`
    styleAdd += `border-width: 15px ${side_length}px 0;`
    styleAdd += `border-top-color: ${team_color};`

    $('<style id="addedStyle">.SelectedGameBox::after{'+styleAdd+'}</style>').appendTo('head');

}

function DrawSchedule(){

  const res_arrow = this.ResArrowSize;
  res_arrow();
  $(window).resize(function () {
      res_arrow();
  });

  //this function define the size of the items

}

function DrawTeamInfo(data, WorldID, TeamID, Category, CategoryDisplayName){
  var div = $(`
      <div class='w3-row-padding'>
        <div class='w3-col s10 top-teams'>
          <table class='width100 w3-table-all'>
            <thead>
              <th>Rank</th>
              <th>Team</th>
              <th>`+CategoryDisplayName+`</th>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
      </div>
    `);


  $.ajax({
    url: '/World/'+WorldID+'/Team/'+TeamID+'/TeamInfoRating/'+Category,
    success: function (data) {
      console.log('Ajax return', data);

      var Table = $(div).find('.top-teams table').DataTable({
        dom: 't',
        data: data.TopTeams,
        paging: false,
        scrollY: "400px",
        scrollCollapse: true,
        columns: [
          {'data': 'Category_Rank', "sortable": true},
          {'data': 'TeamSeasonID__TeamID__TeamName', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
              $(td).html('<a href="'+DataObject.TeamHref+'"><img src="'+DataObject.TeamSeasonID__TeamID__TeamLogoURL+'"  class="logo-30 margin-right-8" >'+DataObject.TeamSeasonID__TeamID__TeamName+'</a>');
          }},
          {'data': 'TeamRating', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            var Rating = StringValue;
            var GradeObject = NumberToGrade_True(StringValue);
              $(td).html(NumberToGrade_True(DataObject.TeamRating).LetterGrade);
          }},

        ],
        order: [[0, 'asc']]
      });
    }
  });

  return div;
}

function DrawTeamInfoChildRows(WorldID, TeamID, data) {

  var DescFirst = ['desc', 'asc'];
  var AscFirst = ['asc', 'desc', ];

  console.log('DrawTeamInfoChildRows', data);
  $.extend( true, $.fn.dataTable.defaults, {
    "orderSequence": DescFirst,
} );


  var table = $('#TeamInfo').DataTable({
    dom: 't',
    data: data,
    columns: [
      {'data': 'TeamInfoTopicID__AttributeName', "sortable": true, 'orderSequence': AscFirst},
      {'data': 'TeamRating', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
        var Rating = StringValue;
        var GradeObject = NumberToGrade_True(StringValue);
        console.log('GradeObject', GradeObject)
          $(td).html("<span class='"+GradeObject.GradeClass+"'>"+GradeObject.LetterGrade+"</span>");


          $(td).parent().attr('Category', DataObject.Category)
          $(td).parent().attr('CategoryDisplayName', DataObject['Field Name'])
      }},
      {'data': 'TeamInfoTopic_Rank', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          $(td).html("<span>"+ordinal_suffix_of(StringValue)+"</span>");
      }},
      {'data': null, "sortable": false, 'className': 'details-control',   "defaultContent": ''},
    ],
    order: [[1, 'desc']]
  });


    $('#TeamInfo tbody').on('click', '.details-control', function () {

      var tr = $(this).parent();
      $(tr).addClass('shown');
      var row = table.row( tr );

      if ( row.child.isShown() ) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
      }
      else {
          // Open this row
          var data = row.data()
          var Category = data.TeamInfoTopicID__AttributeName;
          var CategoryDisplayName = data.TeamInfoTopicID__AttributeName;
          var formattedContent = DrawTeamInfo(data, WorldID, TeamID, Category, CategoryDisplayName);
          row.child( formattedContent ).show();
          tr.addClass('shown');
      }
    });
}


function AddBoxScoreListeners(){
  var InitialBoxScore = $('.selected-boxscore-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');


  $('.boxscore-tab').on('click', function(event, target) {


    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedTeamID = ClickedTab.attr('TeamID');
    var SelectedGameID = ClickedTab.attr('GameID');

    $.each($('#'+ClickedTabParent+' > .selected-boxscore-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-boxscore-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');

      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('selected-boxscore-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

  });
}


function AddScheduleListeners(){
  var InitialGameBox = $('.SelectedGameBox')[0];
  var SelectedGameID = $(InitialGameBox).attr('BoxScoreGameID');
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide');

  const res_arrow = this.ResArrowSize;

  $('.teamScheduleGameBox').on('click', function(event, target) {
    var ClickedTab = $(event.target).closest('.teamScheduleGameBox');
    var SelectedGameID = ClickedTab.attr('BoxScoreGameID');
    $.each($('.SelectedGameBox'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('SelectedGameBox');

      var UnselectedGameID = TargetTab.attr('BoxScoreGameID');

      $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('SelectedGameBox');
    res_arrow()
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide')
  });
}

const getHtml = async (common) => {

  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const team_id = common.params.team_id;
  const db = common.db;

  const NavBarLinks = await common.nav_bar_links({
    path: 'Overview',
    group_name: 'Team',
    db: db
  });

  const TeamHeaderLinks = await common.team_header_links({
    path: 'Overview',
    season: undefined,
    db: db
  });

  var teams = await db.team.toArray();
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
  const team_season = await db.team_season.get({team_id: team_id, season: 2021});

  team.team_season = team_season;

  var team_games = await db.team_game.where({team_season_id: team_season.team_season_id}).toArray();
  team_games = team_games.sort(function(team_game_a,team_game_b){
    return team_game_a.week_id - team_game_b.week_id;
  });
  const game_ids = team_games.map(game => parseInt(game.game_id));

  const games = await db.game.bulkGet(game_ids);

  console.log('team_games', team_games)

  const opponent_team_game_ids = team_games.map(team_game => team_game.opponent_team_game_id);
  console.log('opponent_team_game_ids', opponent_team_game_ids)
  const opponent_team_games = await db.team_game.bulkGet(opponent_team_game_ids);

  const opponent_team_season_ids = opponent_team_games.map(team_game => parseInt(team_game.team_season_id));
  const opponent_team_seasons = await db.team_season.bulkGet(opponent_team_season_ids);

  const opponent_team_ids = opponent_team_seasons.map(team_season => parseInt(team_season.team_id));
  const opponent_teams = await db.team.bulkGet(opponent_team_ids);

  console.log('opponent_teams', opponent_teams, opponent_team_seasons, opponent_team_games)
  var counter_games = 0;
  const pop_games = await $.each(games, async function(ind, game){

    game.opponent_team_game = opponent_team_games[counter_games];
    game.opponent_team = opponent_teams[counter_games];
    game.opponent_team_season = opponent_team_seasons[counter_games];

    game.game_display = 'Preview'
    game.game_result_letter = ''
    if (game.was_played){
      game.game_display = `${game.home_team_score} - ${game.away_team_score}`;

      if (game.home_team_score > game.away_team_score){
        game.game_result_letter = 'W'
      }
    }

    if (game.home_team_season_id == team.team_season.team_season_id){
      game.game_location = 'home'
      game.game_location_char = 'vs.'
      game.home_team = team;
      game.home_team_season = team_season;
      game.away_team = game.opponent_team;
      game.away_team_season = game.opponent_team_season;

    }
    else {
      game.game_location = 'away';
      game.game_location_char = '@'
      game.away_team = team;
      game.away_team_season = team_season;
      game.home_team = game.opponent_team;
      game.home_team_season = game.opponent_team_season;
    }

    game.selected_game_box = '';
    if (counter_games == 0){
      game.selected_game_box = 'SelectedGameBox';
    }

    game.opponent_rank_string = game.opponent_team_season.national_rank_display;

    counter_games +=1;
  });


  var conference_season = await db.conference_season.get({conference_season_id: team.team_season.conference_season_id})  ;
  var conference = await db.conference.get({conference_id: conference_season.conference_id})  ;

  var team_seasons_in_conference = await db.team_season.where({season: 2021}).toArray();
  team_seasons_in_conference = team_seasons_in_conference.filter(team_season => team_season.conference_season_id == team.team_season.conference_season_id).sort(function(teamA,teamB){
    return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
  });

  var team_ids = team_seasons_in_conference.map(team_season => team_season.team_id);
  var teams = await db.team.bulkGet(team_ids);
  var team_counter = 0;
  $.each(team_seasons_in_conference, function(ind, team_season){
    team_season.team = teams[team_counter];
    team_counter +=1;
  })


  common.page = {PrimaryColor: team.team_color_primary_hex, SecondaryColor: team.secondary_color_display, NavBarLinks:NavBarLinks, TeamHeaderLinks: TeamHeaderLinks};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        team_id:  team_id,
                        team: team,
                        games: games,
                        teams: teams,
                        conference_standings: team_seasons_in_conference
                      }

  console.log('render_content', render_content)

  var url = '/static/html_templates/team/template_team.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml)
}



const action = async (common) => {

  const query_to_dict = common.query_to_dict;

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));
  var TeamJerseyStyle  = $(DataPassthruHolder).attr('TeamJerseyStyle');
  var TeamJerseyInvert  = $(DataPassthruHolder).attr('TeamJerseyInvert');
  var TeamColor_Primary_HEX  = $(DataPassthruHolder).attr('PrimaryColor');
  var TeamColor_Secondary_HEX  = $(DataPassthruHolder).attr('SecondaryJerseyColor');
  var TeamName = '';
  var CoachOrg = '';

  var overrides = {'teamColors': ['#'+TeamColor_Primary_HEX, '#'+TeamColor_Secondary_HEX , '#FFF']};

  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawSchedule();
  navbar(common.page);

  const team_seasons = await common.db.team_season.toArray();
  const teams = await common.query_to_dict(await common.db.team.toArray(), 'one_to_one','team_id');

  $.each(team_seasons, function(ind, team_season){
    team_seasons.team = teams[team_season.team_id];
  });
  const TeamInfoData = [];

  //this.DrawTeamInfoChildRows(WorldID, TeamID, team_seasons);

  //$('[data-toggle="tooltip"]').tooltip();

}

$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/Team/:team_id/');

  await getHtml(common);
  await action(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
