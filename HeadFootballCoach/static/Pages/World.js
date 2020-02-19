function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
var csrftoken = getCookie('csrftoken');



function PopulateLeagueSeasonHistoryTable(LeagueSeasonHistory, WorldID){
  var LeagueSeasonHistoryTable = $('#LeagueSeasonHistoryTable');

  $.each(LeagueSeasonHistory, function(index, LeagueSeason){
    var LeagueSeasonHistoryTemplate = $('#LeagueSeasonHistoryRowClone').clone();

    $(LeagueSeasonHistoryTemplate).removeClass('hidden');
    $(LeagueSeasonHistoryTemplate).removeAttr('id');
    $.each(LeagueSeason, function(LeagueSeasonAttr,LeagueSeasonAttrValue){
      var FieldCell = $(LeagueSeasonHistoryTemplate).find('.LeagueSeasonHistoryRowCell[data-field="'+LeagueSeasonAttr+'"], .LeagueSeasonHistoryRowCell a[data-field="'+LeagueSeasonAttr+'"]').first();
      var SpanCell = $(LeagueSeasonHistoryTemplate).find('.LeagueSeasonHistoryRowCell span[span-field="'+LeagueSeasonAttr+'"]').first()

      FieldCell.text(LeagueSeasonAttrValue['data-field']);
      FieldCell.attr('href',LeagueSeasonAttrValue['href-field']);
      SpanCell.text('('+LeagueSeasonAttrValue['span-field']+')');

    });

    LeagueSeasonHistoryTable.append(LeagueSeasonHistoryTemplate);
  });
}



function PopulateHistoricalLeadersTable(HistoricalLeaders, WorldID){

  var PPGHistoricalLeadersTable = $('#WorldHistoryPlayerLeadersPPG');

  var PPGHistoricalLeaders = HistoricalLeaders['TopScorers'];

  $.each(PPGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#WorldHistoryPlayerLeadersPPGRowClone').clone();

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderPPGRowCell[data-field="'+PlayerStatsAttr+'"], .WorldHistoricalLeaderPPGRowCell a[data-field="'+PlayerStatsAttr+'"]').first();
      var HrefCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderPPGRowCell a[href-field="'+PlayerStatsAttr+'"]').first()

      FieldCell.text(PlayerStatsValue);
      HrefCell.attr('href',PlayerStatsValue);
      //console.log(FieldCell);
    });

    PPGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });


//------------------------------------------------------------
  var RPGHistoricalLeadersTable = $('#WorldHistoryPlayerLeadersRPG');
  //console.log('TeamSeasonHistoryTable', HistoricalLeadersTable);
  var RPGHistoricalLeaders = HistoricalLeaders['TopRebounders'];

  $.each(RPGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#WorldHistoryPlayerLeadersRPGRowClone').clone();

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderRPGRowCell[data-field="'+PlayerStatsAttr+'"], .WorldHistoricalLeaderRPGRowCell a[data-field="'+PlayerStatsAttr+'"]').first();
      var HrefCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderRPGRowCell a[href-field="'+PlayerStatsAttr+'"]').first()

      FieldCell.text(PlayerStatsValue);
      HrefCell.attr('href',PlayerStatsValue);
      //console.log(FieldCell);
    });

    RPGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });


//------------------------------------------------------------
  var APGHistoricalLeadersTable = $('#WorldHistoryPlayerLeadersAPG');
  var APGHistoricalLeaders = HistoricalLeaders['TopAssisters'];

  $.each(APGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#WorldHistoryPlayerLeadersAPGRowClone').clone();

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderAPGRowCell[data-field="'+PlayerStatsAttr+'"], .WorldHistoricalLeaderAPGRowCell a[data-field="'+PlayerStatsAttr+'"]').first();
      var HrefCell = $(HistoricalLeadersTemplate).find('.WorldHistoricalLeaderAPGRowCell a[href-field="'+PlayerStatsAttr+'"]').first()

      FieldCell.text(PlayerStatsValue);
      HrefCell.attr('href',PlayerStatsValue);
      //console.log(FieldCell);
    });

    APGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });

}


function PopulateConferenceStandings(ConferenceStandings, WorldID){
  var ConferenceStandingTabContainer = $('#ConferenceStandingTabContainer')[0];

  $.each(ConferenceStandings, function(index, Conference){
    var ConferenceStandingTableClone = $('#ConferenceStandingTableClone').clone();

    $(ConferenceStandingTableClone).removeClass('w3-hide');
    $(ConferenceStandingTableClone).removeAttr('id');

    var ConferenceNameSpan = $(ConferenceStandingTableClone).find('span[data-field="ConferenceName"]')[0]
    $(ConferenceNameSpan).text(Conference.ConferenceName);

    $(ConferenceStandingTabContainer).append($(ConferenceStandingTableClone));

    $.each(Conference.ConferenceTeams, function(index,TeamObject){
      var ConferenceStandingTeamRowClone = $('#ConferenceStandingRowClone').clone();
      $(ConferenceStandingTeamRowClone).removeClass('w3-hide');
      $(ConferenceStandingTeamRowClone).removeAttr('id');

      $.each(TeamObject, function(TeamAttr,TeamAttrValue){
        var FieldCell = $(ConferenceStandingTeamRowClone).find('td[data-field="'+TeamAttr+'"], td span[data-field="'+TeamAttr+'"]')[0];
        var HrefCell = $(ConferenceStandingTeamRowClone).find('td a[href-field="'+TeamAttr+'"]')[0];
        var ImgCell = $(ConferenceStandingTeamRowClone).find('td img[img-src-field="'+TeamAttr+'"]')[0];

        if (FieldCell != undefined ){
          $(FieldCell).text(TeamAttrValue);
        }
        if (HrefCell != undefined){
          $(HrefCell).attr('href', TeamAttrValue);
        }
        if (ImgCell != undefined){
          $(ImgCell).attr('src', TeamAttrValue);
        }
      });
      $(ConferenceStandingTableClone).find('tbody').append($(ConferenceStandingTeamRowClone));
    })
    $(ConferenceStandingTableClone).find('table').DataTable( {
      "searching": false,
        "info": false,
        "paging":   false,
        "order": [[ 1, "asc" ]]
    } );
  });
}


function PopulateAwardRaces(AwardRaces, WorldID){
  var AwardRacesTabContainer = $('#AwardRacesTabContainer')[0];

    var AwardRacesTableClone = $('#AwardRacesTableClone').clone();

    $(AwardRacesTableClone).removeClass('w3-hide');
    $(AwardRacesTableClone).removeAttr('id');

    $(AwardRacesTabContainer).append($(AwardRacesTableClone));

    $.each(AwardRaces, function(index,TeamObject){
      var AwardRacesTeamRowClone = $('#AwardRacesRowClone').clone();
      $(AwardRacesTeamRowClone).removeClass('w3-hide');
      $(AwardRacesTeamRowClone).removeAttr('id');

      $.each(TeamObject, function(TeamAttr,TeamAttrValue){
        var FieldCell = $(AwardRacesTeamRowClone).find('td[data-field="'+TeamAttr+'"], td span[data-field="'+TeamAttr+'"]')[0];
        var HrefCell = $(AwardRacesTeamRowClone).find('td a[href-field="'+TeamAttr+'"]')[0];
        var ImgCell = $(AwardRacesTeamRowClone).find('td img[img-src-field="'+TeamAttr+'"]')[0];

        if (FieldCell != undefined ){
          $(FieldCell).text(TeamAttrValue);
        }
        if (HrefCell != undefined){
          $(HrefCell).attr('href', TeamAttrValue);
        }
        if (ImgCell != undefined){
          $(ImgCell).attr('src', TeamAttrValue);
        }
      });
      $(AwardRacesTableClone).find('tbody').append($(AwardRacesTeamRowClone));
  });

  $(AwardRacesTableClone).find('table').DataTable( {
    "searching": false,
      "info": false,
      "paging":   false,
      "order": [[ 9, "desc" ]]
  } );
}

function GetWorldHistory(WorldID){

  console.log('Getting world history!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/WorldHistory",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateLeagueSeasonHistoryTable(res.WorldHistory, WorldID);
      PopulateHistoricalLeadersTable(res.HistoricalLeaders, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}

function GetConferenceStandings(WorldID){

  console.log('Getting conference standings!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/ConferenceStandings",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateConferenceStandings(res.ConferenceStandings, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetLeagueLeaders(WorldID){

  console.log('Getting conference standings!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/LeagueLeaders",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateLeagueLeadersTable(res.LeagueLeaders, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetTeamStats(WorldID){

  console.log('In Get Team Stats!')

  var ColumnAjaxMap = {
    2: "/GetConferences/"+WorldID,
  }

  var ColumnMap = {
    'WorldTeamStats-Stat-Offense': [6,7,9,10,11],
    'WorldTeamStats-Stat-Offense-Adv': [12,13,14,15,16,17,18],
  };


  var ColumnsToAlwaysShow = [0,1,2,3,4,5,6,7];

  var table = $('#WorldTeamStats').DataTable({
      "dom": '',
      //"serverSide": true,
      "filter": true,
      "ordering": true,
      "lengthChange" : false,
      "pageLength": 75,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "paging": true,
      'ajax': {
          "url": "/World/"+WorldID+"/AllTeamStats",
          "type": "GET",
          "data": function ( d ) {

            console.log('GetTeamStats - Going to post... ', d);
            return d;
          },
          "dataSrc": function ( json ) {
               console.log('GetTeamStats json', json);
               return json['data'];
          }
       },
      "columns": [
        {"data": "TeamName", "sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['TeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['TeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
        }},
          {"data": "teamseason__teamseasonweekrank__NationalRank", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"]},
          {"data": "ConferenceID__ConferenceAbbreviation", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"]},
          {"data": "ConferenceWinsLosses", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
          {"data": "WinsLosses", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
          {"data": "PPG", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
          {"data": "PAPG", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"]},
          {"data": "MOV", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
          {"data": "RUS_YardsPG", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "PAS_YardsPG", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "PercentPassPlays", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "SacksAllowed", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "PercentOfScoringDrives", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "PercentOfTurnoverDrives", "sortable": true, 'visible': false, 'orderSequence':["asc", "desc"]},
          {"data": "PointsPerDrive", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "TimeOfPossessionPerDriveSeconds", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "YardsPerDrive", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "PlaysPerDrive", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
          {"data": "SecondsPerPlay", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"]},
      ],
      'order': [[ 1, "asc" ]],
      'initComplete': function () {

        this.api().columns([2]).every( function (ColumnIndex, CounterIndex) {

            console.log('initComplete', ColumnIndex, CounterIndex, this);
            var column = this;
            var select = $('<select class="datatable-tfoot"><option value=""></option></select>')
                .appendTo( $(column.footer()).empty() )
                .on( 'change', function () {
                    var val = $(this).val();
                    column.search( this.value ).draw();
                } );

            // If I add extra data in my JSON, how do I access it here besides column.data?

            $.ajax({
               url: ColumnAjaxMap[ColumnIndex],
               success: function (data) {
                 console.log('Ajax return', data)
                 $.each(data, function(ind, elem){
                    select.append( '<option value="'+elem+'">'+elem+'</option>' )
                 });
               }
             });

        });
    }
  });


  $('.WorldTeamStats-Stat').on('click', function(Obj){
    var Target = Obj.target;

    if (!$(Target).hasClass('WorldTeamStats-Stat-Selected')) {
      $('.WorldTeamStats-Stat-Selected').each(function(ind, obj){
        $(obj).removeClass('WorldTeamStats-Stat-Selected');
      });

      $(Target).addClass('WorldTeamStats-Stat-Selected');
      var Val = $(Target).attr('id');
      var ColumnsToShow = ColumnMap[Val];
    }
    else {
      $(Target).removeClass('WorldTeamStats-Stat-Selected');
      var ColumnsToShow = [];
    }

    table.columns().every( function (i,o) {
      var column = table.column( i );
      if ($.inArray(i, ColumnsToAlwaysShow) < 0 && column.visible()){
        column.visible( false );
      }
    } );

    $.each(ColumnsToShow, function(i,o){
      var column = table.column( o );
      if (! column.visible()) {
        column.visible( true );
      }
    });
  })

}


function GetAwardRaces(WorldID){

  console.log('Getting award races!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/AwardRaces",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateAwardRaces(res.AwardPlayers, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}



function AddUpcomingGameListeners(){
  var InitialBoxScore = $('.recent-gameview-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');
  //$('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide');


  $('.upcoming-gameview-tab').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    //console.log('ClickedTab', ClickedTab);
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedGameFilterSelection = ClickedTab.attr('GameFilterSelection');

    $.each($('#'+ClickedTabParent+' > .selected-upcoming-gameview-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-upcoming-gameview-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');

      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    //console.log('Trying to filter ' , '.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]', $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]'));
    $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]').removeClass('w3-hide');
    $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="0"]').addClass('w3-hide');

    $(ClickedTab).addClass('selected-upcoming-gameview-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}



function AddRecentGamesListeners(){
  var InitialBoxScore = $('.recent-gameview-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');
  //$('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide');


  $('.recent-gameview-tab').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    //console.log('ClickedTab', ClickedTab);
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedGameFilterSelection = ClickedTab.attr('GameFilterSelection');

    $.each($('#'+ClickedTabParent+' > .selected-recent-gameview-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-recent-gameview-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');

      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    //console.log('Trying to filter ' , '.overviewRecentGameDisplay['+SelectedGameFilterSelection+'="1"]', $('.overviewRecentGameDisplay['+SelectedGameFilterSelection+'="1"]'));
    $('.overviewRecentGameDisplay['+SelectedGameFilterSelection+'="1"]').removeClass('w3-hide');
    $('.overviewRecentGameDisplay['+SelectedGameFilterSelection+'="0"]').addClass('w3-hide');

    $(ClickedTab).addClass('selected-recent-gameview-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}




function AddPreseasonAllAmericanListeners(){

  $('.preseason-allamerican-conference-bar button').on('click', function(event, target) {

    var TargetTab = $(event.target);
    var TargetTabID = TargetTab.attr('id');
    var TargetRowID =  $(TargetTab).attr('id').replace('-tab', '');

    $('.'+TargetRowID).each(function(index, object){
      $(object).removeClass('preseason-allamerican-conf-hide');
    });

    $('.selected-preseason-award-conference-tab').each(function(index,object){
      $(object).removeClass('selected-preseason-award-conference-tab');
      var ObjectID = $(object).attr('id').replace('-tab', '');

      $('.'+ObjectID).each(function(index, object){
        $(object).addClass('preseason-allamerican-conf-hide');
      });
    });
    $(TargetTab).addClass('selected-preseason-award-conference-tab');
  });


  $('.preseason-allamerican-team-bar button').on('click', function(event, target) {

    var TargetTab = $(event.target);
    var TargetTabID = TargetTab.attr('id');
    var TargetRowID =  $(TargetTab).attr('id').replace('-tab', '');

    $('.'+TargetRowID).each(function(index, object){
      $(object).removeClass('preseason-allamerican-team-hide');
    });

    $('.selected-preseason-award-team-tab').each(function(index,object){
      $(object).removeClass('selected-preseason-award-team-tab');
      var ObjectID = $(object).attr('id').replace('-tab', '');

      $('.'+ObjectID).each(function(index, object){
        $(object).addClass('preseason-allamerican-team-hide');
      });
    });
    $(TargetTab).addClass('selected-preseason-award-team-tab');
  });
}


function AddSeasonAllAmericanListeners(){

  $('.season-allamerican-conference-bar button').on('click', function(event, target) {

    var TargetTab = $(event.target);
    var TargetTabID = TargetTab.attr('id');
    var TargetRowID =  $(TargetTab).attr('id').replace('-tab', '');

    $('.'+TargetRowID).each(function(index, object){
      $(object).removeClass('season-allamerican-conf-hide');
    });

    $('.selected-season-award-conference-tab').each(function(index,object){
      $(object).removeClass('selected-season-award-conference-tab');
      var ObjectID = $(object).attr('id').replace('-tab', '');

      $('.'+ObjectID).each(function(index, object){
        $(object).addClass('season-allamerican-conf-hide');
      });
    });
    $(TargetTab).addClass('selected-season-award-conference-tab');
  });


  $('.season-allamerican-team-bar button').on('click', function(event, target) {

    var TargetTab = $(event.target);
    var TargetTabID = TargetTab.attr('id');
    var TargetRowID =  $(TargetTab).attr('id').replace('-tab', '');

    $('.'+TargetRowID).each(function(index, object){
      $(object).removeClass('season-allamerican-team-hide');
    });

    $('.selected-season-award-team-tab').each(function(index,object){
      $(object).removeClass('selected-season-award-team-tab');
      var ObjectID = $(object).attr('id').replace('-tab', '');

      $('.'+ObjectID).each(function(index, object){
        $(object).addClass('season-allamerican-team-hide');
      });
    });
    $(TargetTab).addClass('selected-season-award-team-tab');
  });
}



function PopulateLeagueLeadersTable(LeagueLeaders, WorldID){
  //console.log('LeagueLeaders', LeagueLeaders);
  var LeaderDisplayTemplate = $('#worldLeagueLeaderRow');
  var LeaderDisplay = undefined;

  var BoxCount = 0;
  $.each(LeagueLeaders, function(index, LeaderGroup){
    //console.log('LeaderGroup', LeaderGroup);

    if (BoxCount % 3 == 0) {
      LeaderDisplay = $(LeaderDisplayTemplate).clone();
      $(LeaderDisplayTemplate).before($(LeaderDisplay));
    }

    var TeamHistoryLeaderTableTemplate = $('#worldLeagueLeadersClone').clone();

    $(TeamHistoryLeaderTableTemplate).removeClass('w3-hide');
    $(TeamHistoryLeaderTableTemplate).removeAttr('id');

    var th = $(TeamHistoryLeaderTableTemplate).find('th[data-field="DisplayName"]');
    $(th).text(LeaderGroup['DisplayName']);
    //console.log(TeamHistoryLeaderTableTemplate);

    $.each(LeaderGroup['Players'], function(ind, Player){
      //console.log('Player', Player);

      var TeamHistoryLeaderRowTemplate = $(TeamHistoryLeaderTableTemplate).find('#worldLeagueLeadersRowClone').clone();

      $(TeamHistoryLeaderRowTemplate).removeClass('w3-hide');
      $(TeamHistoryLeaderRowTemplate).removeAttr('id');

      $.each(Player, function(PlayerAttr,PlayerValue){
        var FieldCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[data-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [data-field="'+PlayerAttr+'"]');
        FieldCell.text(PlayerValue);

        var LinkCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[href-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [href-field="'+PlayerAttr+'"]');
        LinkCell.attr('href', PlayerValue);

        var LinkCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[src-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [src-field="'+PlayerAttr+'"]');
        LinkCell.attr('src', PlayerValue);

      });

      var Table = $(TeamHistoryLeaderTableTemplate).find('table');
      $(Table).removeClass('w3-hide');
      $(Table).append($(TeamHistoryLeaderRowTemplate));

    });

    $(LeaderDisplay).append($(TeamHistoryLeaderTableTemplate));
    BoxCount++;

  });

  $('#worldLeagueLeadersClone').remove();

}

function GetPlayerStats(WorldID){

  var ColumnAjaxMap = {
    3: "/GetPlayerPositions/",
    2: "/GetClasses/"
  }

  var ColumnMap = {
    'WorldPlayerStats-Stat-Passing': [6,7,8,9,10],
    'WorldPlayerStats-Stat-Rushing': [11,12,13,14,15, 16,17],
    'WorldPlayerStats-Stat-Receiving': [18,19,20,21,22,23,24],
    'WorldPlayerStats-Stat-Defense': [25,26,27,28,29,30]
  };


  var ColumnsToAlwaysShow = [0,1,2,3,4,5];

  var table = $('#WorldPlayerStats').DataTable({
      "dom": '',
      "serverSide": true,
      "filter": true,
      "ordering": true,
      "lengthChange" : false,
      "pageLength": 15,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "paging": true,
      'ajax': {
          "url": "/World/"+WorldID+"/PlayerStats",
          "type": "GET",
          "data": function ( d ) {

            console.log('Going to post... ', d);
            return d;
          },
          "dataSrc": function ( json ) {
               console.log('json', json);
               return json['data'];
          }
       },
      "columns": [
        {"data": "playerteamseason__TeamSeasonID__TeamID__TeamName", "sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['PlayerTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['playerteamseason__TeamSeasonID__TeamID__TeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
        }},
          {"data": "PlayerName", "searchable": true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
              $(td).html("<a href='"+DataObject['PlayerHref']+"'>"+StringValue+"</a>");
          }},
          {"data": "ClassID__ClassAbbreviation", "sortable": true, 'searchable': true},
          {"data": "PositionID__PositionAbbreviation", "sortable": true, 'searchable': true},
          {"data": "playerseasonskill__OverallRating", "sortable": true, 'orderSequence':["desc"]},
          {"data": "GameScore", "sortable": true, 'orderSequence':["desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {

              $(td).html(parseInt(StringValue));
          }},

          {"data": "PAS_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_CompletionPercentage", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_INT", "sortable": true, 'visible': false, 'orderSequence':["desc"]},

          {"data": "RUS_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_YPC", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_LNG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_20", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Fumbles", "sortable": true, 'visible': false, 'orderSequence':["desc"]},

          {"data": "REC_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_Receptions", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_YPC", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_Targets", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_LNG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},

          {"data": "DEF_Tackles", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_TacklesForLoss", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_Sacks", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_INT", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Forced", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Recovered", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
      ],
      'order': [[ 4, "desc" ]],
      'initComplete': function () {

        this.api().columns([2,3]).every( function (ColumnIndex, CounterIndex) {

            console.log('initComplete', ColumnIndex, CounterIndex, this);
            var column = this;
            var select = $('<select class="datatable-tfoot"><option value=""></option></select>')
                .appendTo( $(column.footer()).empty() )
                .on( 'change', function () {
                    var val = $(this).val();
                    column.search( this.value ).draw();
                } );

            // If I add extra data in my JSON, how do I access it here besides column.data?

            $.ajax({
               url: ColumnAjaxMap[ColumnIndex],
               success: function (data) {
                 console.log('Ajax return', data)
                 $.each(data, function(ind, elem){
                    select.append( '<option value="'+elem+'">'+elem+'</option>' )
                 });
               }
             });

        });
    }
  });


  $('.WorldPlayerStats-Stat').on('click', function(Obj){
    var Target = Obj.target;

    if (!$(Target).hasClass('WorldPlayerStats-Stat-Selected')) {
      $('.WorldPlayerStats-Stat-Selected').each(function(ind, obj){
        $(obj).removeClass('WorldPlayerStats-Stat-Selected');
      });

      $(Target).addClass('WorldPlayerStats-Stat-Selected');
      var Val = $(Target).attr('id');
      var ColumnsToShow = ColumnMap[Val];
    }
    else {
      $(Target).removeClass('WorldPlayerStats-Stat-Selected');
      var ColumnsToShow = [];
    }

    table.columns().every( function (i,o) {
      var column = table.column( i );
      if ($.inArray(i, ColumnsToAlwaysShow) < 0 && column.visible()){
        column.visible( false );
      }
    } );

    $.each(ColumnsToShow, function(i,o){
      var column = table.column( o );
      if (! column.visible()) {
        column.visible( true );
      }
    });
  })

}



$(document).ready(function(){

  InitializeScoreboard();

  AddUpcomingGameListeners();
  AddRecentGamesListeners();
  AddPreseasonAllAmericanListeners();
  AddSeasonAllAmericanListeners();

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));


  console.log('in World.js file')

  GetConferenceStandings(WorldID);
  GetTeamStats(WorldID);
  GetLeagueLeaders(WorldID);
  //GetAwardRaces(WorldID);
  GetWorldHistory(WorldID);
  GetPlayerStats(WorldID);

});


function InitializeScoreboard() {
  if ($('.MultiCarousel-inner').children().length == 0){
    $('.scoreboard-slideshow').remove();
    return 0;
  }
  console.log('in InitializeScoreboard');
    var itemsMainDiv = ('.MultiCarousel');
    var itemsDiv = ('.MultiCarousel-inner');
    var itemWidth = "";
    var initialOffset = 20;
    $('.leftLst, .rightLst').click(function () {
        var condition = $(this).hasClass("leftLst");
        if (condition)
            click(0, this);
        else
            click(1, this)
    });

    ResCarouselSize();




    $(window).resize(function () {
        ResCarouselSize();
    });

    //this function define the size of the items
    function ResCarouselSize() {
        var incno = 0;
        var dataItems = ("data-items");
        var itemClass = ('.scoreboard-carousel-item');
        var id = 0;
        var btnParentSb = '';
        var itemsSplit = '';
        var sampwidth = $(itemsMainDiv).width();
        var bodyWidth = $('body').width();
        $(itemsDiv).each(function () {
            id = id + 1;
            var itemNumbers = $(this).find(itemClass).length;
            btnParentSb = $(this).parent().attr(dataItems);
            itemsSplit = btnParentSb.split(',');
            $(this).parent().attr("id", "MultiCarousel" + id);


            if (bodyWidth >= 1200) {
                incno = itemsSplit[3];
                itemWidth = sampwidth / incno;
            }
            else if (bodyWidth >= 992) {
                incno = itemsSplit[2];
                itemWidth = sampwidth / incno;
            }
            else if (bodyWidth >= 768) {
                incno = itemsSplit[1];
                itemWidth = sampwidth / incno;
            }
            else {
                incno = itemsSplit[0];
                itemWidth = sampwidth / incno;
            }
            $(this).css({ 'transform': 'translateX('+initialOffset+'px)', 'width': itemWidth * itemNumbers });
            $(this).find(itemClass).each(function () {
                $(this).outerWidth(itemWidth);
            });

            $(".leftLst").addClass("over");
            $(".rightLst").removeClass("over");

        });
    }


    //this function used to move the items
    function ResCarousel(e, el, s) {
        var leftBtn = ('.leftLst');
        var rightBtn = ('.rightLst');
        var translateXval = '';
        var divStyle = $(el + ' ' + itemsDiv).css('transform');
        var values = divStyle.match(/-?[\d\.]+/g);
        var xds = Math.abs(values[4]);
        if (e == 0) {
            translateXval = parseInt(xds) - parseInt(itemWidth * s);
            $(el + ' ' + rightBtn).removeClass("over");

            if (translateXval <= itemWidth / 2) {
                translateXval = -1 * initialOffset;
                $(el + ' ' + leftBtn).addClass("over");
            }
        }
        else if (e == 1) {
            var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
            translateXval = parseInt(xds) + parseInt(itemWidth * s);
            $(el + ' ' + leftBtn).removeClass("over");

            if (translateXval >= itemsCondition - itemWidth / 2) {
                translateXval = itemsCondition + initialOffset;
                $(el + ' ' + rightBtn).addClass("over");
            }
        }
        $(el + ' ' + itemsDiv).css('transform', 'translateX(' + -translateXval + 'px)');

    }

    //It is used to get some elements from btn
    function click(ell, ee) {
        var Parent = "#" + $(ee).parent().attr("id");
        var slide = $(Parent).attr("data-slide");
        ResCarousel(ell, Parent, slide);
    }

    $('.scoreboard-carousel-item.w3-hide').each(function(ind, obj){
      console.log('removing w3-hide', ind, obj);
      $(obj).removeClass('w3-hide');
    });

}
