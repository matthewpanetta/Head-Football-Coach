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



function PopulateTeamSeasonHistoryTable(TeamSeasonHistory, WorldID){
  var TeamSeasonHistoryTable = $('#TeamSeasonHistoryTable');

  $.each(TeamSeasonHistory, function(index, TeamSeason){
    var TeamSeasonHistoryTemplate = $('#TeamSeasonHistoryRowClone').clone();

    $(TeamSeasonHistoryTemplate).removeClass('hidden');
    $(TeamSeasonHistoryTemplate).removeAttr('id');
    $.each(TeamSeason, function(TeamSeasonAttr,TeamSeasonAttrValue){
      var FieldCell = $(TeamSeasonHistoryTemplate).find('.TeamSeasonHistoryRowCell[data-field="'+TeamSeasonAttr+'"], .TeamSeasonHistoryRowCell [data-field="'+TeamSeasonAttr+'"]');
      FieldCell.text(TeamSeasonAttrValue);

      var LinkCell = $(TeamSeasonHistoryTemplate).find('.TeamSeasonHistoryRowCell[href-field="'+TeamSeasonAttr+'"], .TeamSeasonHistoryRowCell [href-field="'+TeamSeasonAttr+'"]');
      LinkCell.attr('href', TeamSeasonAttrValue);
    });

    TeamSeasonHistoryTable.append(TeamSeasonHistoryTemplate);
  });

  $('#TeamSeasonHistoryResultsTable').DataTable( {
        "searching": false,
          "info": false,
          "paging":   false,
          "order": [[ 0, "asc" ]]
      } );
}


function PopulateHistoricalLeadersTable(HistoricalLeaders, WorldID){
  console.log('trying to remove .teamHistoryPlayerLeaderRow');
  $('.teamHistoryPlayerLeaderRow').each(function(ind, obj){
    console.log('removing ', obj);
    $(obj).remove();
  });
  console.log('HistoricalLeaders', HistoricalLeaders);
  var LeaderDisplayTemplate = $('#teamHistoryPlayerLeaderRowClone');
  var LeaderDisplay = undefined;

  var BoxCount = 0;
  $.each(HistoricalLeaders, function(index, LeaderGroup){
    console.log('LeaderGroup', LeaderGroup);

    if (BoxCount % 3 == 0) {
      LeaderDisplay = $(LeaderDisplayTemplate).clone();
      $(LeaderDisplay).removeAttr('id').addClass('teamHistoryPlayerLeaderRow');
      $(LeaderDisplayTemplate).before($(LeaderDisplay));
    }

    var TeamHistoryLeaderTableTemplate = $('#teamHistoryPlayerLeadersClone').clone();

    $(TeamHistoryLeaderTableTemplate).removeClass('w3-hide');
    $(TeamHistoryLeaderTableTemplate).removeAttr('id');

    var th = $(TeamHistoryLeaderTableTemplate).find('th[data-field="DisplayName"]');
    $(th).text(LeaderGroup['DisplayName']);
    console.log(TeamHistoryLeaderTableTemplate);

    $.each(LeaderGroup['Players'], function(ind, Player){
      console.log('Player', Player);

      var TeamHistoryLeaderRowTemplate = $(TeamHistoryLeaderTableTemplate).find('#teamHistoryPlayerLeadersRowClone').clone();

      $(TeamHistoryLeaderRowTemplate).removeClass('w3-hide');
      $(TeamHistoryLeaderRowTemplate).removeAttr('id');

      $.each(Player, function(PlayerAttr,PlayerValue){
        var FieldCell = $(TeamHistoryLeaderRowTemplate).find('.TeamHistoricalLeaderRowCell[data-field="'+PlayerAttr+'"], .TeamHistoricalLeaderRowCell [data-field="'+PlayerAttr+'"]');
        FieldCell.text(PlayerValue);

        var LinkCell = $(TeamHistoryLeaderRowTemplate).find('.TeamHistoricalLeaderRowCell[href-field="'+PlayerAttr+'"], .TeamHistoricalLeaderRowCell [href-field="'+PlayerAttr+'"]');
        LinkCell.attr('href', PlayerValue);

      });

      var Table = $(TeamHistoryLeaderTableTemplate).find('table');
      $(Table).removeClass('w3-hide');
      $(Table).append($(TeamHistoryLeaderRowTemplate));

    });

    $(LeaderDisplay).append($(TeamHistoryLeaderTableTemplate));
    BoxCount++;

  });

  //$('#teamHistoryPlayerLeadersClone').remove();

}


function PopulateTeamRosterTable(Roster, WorldID){
  var TeamRosterTable = $('#teamRosterTable');

  $.each(Roster, function(index, Player){

    var TeamRosterRowTemplate = $('#TeamRosterPlayerRowClone').clone();

    $(TeamRosterRowTemplate).removeClass('hidden');
    $(TeamRosterRowTemplate).removeAttr('id');
    $.each(Player, function(PlayerAttr,PlayerValue){
      var FieldCell = $(TeamRosterRowTemplate).find('.TeamRosterPlayerRowCell[data-field="'+PlayerAttr+'"] a');
      if (FieldCell.length == 0) {
        var FieldCell = $(TeamRosterRowTemplate).find('.TeamRosterPlayerRowCell[data-field="'+PlayerAttr+'"]');
      }
      else {
        var HrefField = FieldCell.attr('href-field');
        FieldCell.attr('href', '/World/'+WorldID+'/Player/'+Player[HrefField]);
      }
      FieldCell.text(PlayerValue);
    });

    TeamRosterTable.append(TeamRosterRowTemplate);
  });

  $('#teamRosterTable').DataTable( {
        "searching": false,
          "info": false,
          "paging":   false,
          "order": [[ 5, "desc" ]]
      } );

  AddRosterListeners();
}


function PopulateTeamSchedule(Games, WorldID){

    var TeamScheduleContainer = $('#TeamScheduleContainer');

    var RowCount = 0;

    if (Games.PlayedGames.length > 0) {
      var TeamScheduleRowPlayedGames = $($('#TeamScheduleRowPlayedGames')[0]);
      TeamScheduleRowPlayedGames.removeClass('w3-hide')
      TeamScheduleRowPlayedGames.remove();
      $(TeamScheduleContainer).append(TeamScheduleRowPlayedGames);
    }

    $.each(Games.PlayedGames, function(index,Game){
      var TeamScheduleRowClone = $('#TeamScheduleRowClone').clone();
      TeamScheduleRowClone = $(TeamScheduleRowClone[0])
      $(TeamScheduleRowClone).removeClass('w3-hide');
      $(TeamScheduleRowClone).removeAttr('id');

      RowCount += 1;
      if (RowCount % 2 == 1) {
        $(TeamScheduleRowClone).addClass('evenRow');
      }

      $.each(Game, function(GameAttr,GameAttrValue){
        var FieldCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell[data-field="'+GameAttr+'"], .TeamScheduleGameCell > *[data-field="'+GameAttr+'"]')[0];
        var HrefCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > a[href-field="'+GameAttr+'"]')[0];
        var ImgCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > img[img-src-field="'+GameAttr+'"]')[0];
        var ClassCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > *[class-field="'+GameAttr+'"]')[0];

        if (FieldCell != undefined ){
          $(FieldCell).text(GameAttrValue);
        }
        if (HrefCell != undefined){
          $(HrefCell).attr('href', GameAttrValue);
        }
        if (ImgCell != undefined){
          $(ImgCell).attr('src', GameAttrValue);
        }
        if (ClassCell != undefined){
          $(ClassCell).addClass(GameAttrValue);
        }
      });
      $(TeamScheduleContainer).append($(TeamScheduleRowClone));
  });


    if (Games.FutureGames.length > 0) {
      var TeamScheduleRowFutureGames = $($('#TeamScheduleRowFutureGames')[0]);
      TeamScheduleRowFutureGames.removeClass('w3-hide')
      TeamScheduleRowFutureGames.remove();
      $(TeamScheduleContainer).append(TeamScheduleRowFutureGames);
    }

      $.each(Games.FutureGames, function(index,Game){
        var TeamScheduleRowClone = $('#TeamScheduleRowClone').clone();
        TeamScheduleRowClone = $(TeamScheduleRowClone[0])
        $(TeamScheduleRowClone).removeClass('w3-hide');
        $(TeamScheduleRowClone).removeAttr('id');

        RowCount += 1;
        if (RowCount % 2 == 1) {
          $(TeamScheduleRowClone).addClass('evenRow');
        }

        $.each(Game, function(GameAttr,GameAttrValue){
          var FieldCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell[data-field="'+GameAttr+'"], .TeamScheduleGameCell > *[data-field="'+GameAttr+'"]')[0];
          var HrefCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > a[href-field="'+GameAttr+'"]')[0];
          var ImgCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > img[img-src-field="'+GameAttr+'"]')[0];
          var ClassCell = $(TeamScheduleRowClone).find('.TeamScheduleGameCell > *[class-field="'+GameAttr+'"]')[0];

          if (FieldCell != undefined ){
            $(FieldCell).text(GameAttrValue);
          }
          if (HrefCell != undefined){
            $(HrefCell).attr('href', GameAttrValue);
          }
          if (ImgCell != undefined){
            $(ImgCell).attr('src', GameAttrValue);
          }
          if (ClassCell != undefined){
            $(ClassCell).addClass(GameAttrValue);
          }
        });
        $(TeamScheduleContainer).append($(TeamScheduleRowClone));
    });

}



function GetTeamHistory(WorldID, TeamID){


  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Team/"+TeamID+"/TeamHistory",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateTeamSeasonHistoryTable(res.TeamSeasonHistory, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetTeamHistoricalLeaders(WorldID, TeamID, Timeframe){

  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Team/"+TeamID+"/TeamHistoricalLeaders/"+Timeframe,
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateHistoricalLeadersTable(res.HistoricalLeaders, WorldID);
    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetTeamCoaches(WorldID, TeamID){


  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Team/"+TeamID+"/TeamCoaches",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      DrawCoachOrgChart(res.TeamInfo, res.CoachOrg);
    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetTeamRoster(WorldID, TeamID){

  //teamRosterTable

  var CurrentSelectedPlayerID = 0;

  var ColumnAjaxMap = {
    2: "/GetPlayerPositions/",
    4: "/GetClasses/"
  }

  var table = $('#teamRosterTable').DataTable({
      "dom": '',
      //"serverSide": true,
      "filter": true,
      "ordering": true,
      "lengthChange" : false,
      "pageLength": 100,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "paging": true,
      'ajax': {
          "url": "/World/"+WorldID+"/Team/"+TeamID+"/TeamRoster",
          "type": "GET",
          "data": function ( d ) {

            console.log('GetTeamRoster - Going to post... ', d);
            return d;
          },
          "dataSrc": function ( json ) {
               console.log('GetTeamRoster json', json);
               return json['Roster'];
          }
       },
      "columns": [
        {"data": "FullName", "sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).parent().attr('PlayerID', DataObject['PlayerID']);
            $(td).html("<a href='/World/"+WorldID+"/Player/"+DataObject['PlayerID']+"'>"+StringValue+"</a>");
        }},
        {"data": "JerseyNumber", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
        {"data": "Position", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
        {"data": "HeightFormatted", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
        {"data": "PlayerClass", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
        {"data": "OverallRating", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
      ],
      'order': [[ 5, "desc" ]],
      'initComplete': function () {

        this.api().columns([2,4]).every( function (ColumnIndex, CounterIndex) {

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

        $('#teamRosterTable').find('tr').on('click', function(){
          var SelectedPlayerID = $(this).attr('PlayerID');
          console.log('clicked', this, SelectedPlayerID);

          $.ajax({
            url: '/World/'+WorldID+'/Player/'+SelectedPlayerID+'/PlayerCardInfo',
            success: function (data) {
              console.log('Ajax return', data);

              $.each(data, function(key, val){

                if (key == 'PlayerFaceJson'){
                  var elem = $('#teamRosterPlayerHighlight').find('[data-field="'+key+'"]');
                  elem = elem[0];
                  $(elem).empty();

                  if (typeof val === 'string') {
                    val = $.parseJSON(val);
                  }
                  BuildFace(val, undefined, undefined, $(elem).attr('id'));
                }
                else {
                  $('#teamRosterPlayerHighlight').find('[data-field="'+key+'"]').text(val);

                }
              })

            }
          })

        })

      }});

  return null;
}





function GetTeamSchedule(WorldID, TeamID){

  console.log('Getting team schedule!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Team/"+TeamID+"/TeamSchedule",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log('Team Schedule:', res, status);
      PopulateTeamSchedule(res.Games, WorldID, )
    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}

function AddScheduleListeners(){
  var InitialGameBox = $('.SelectedGameBox')[0];

  var SelectedGameID = $(InitialGameBox).attr('BoxScoreGameID');
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide');


  $('.teamScheduleGameBox').on('click', function(event, target) {

    var ClickedTab = $(event.target).closest('.teamScheduleGameBox');
    var SelectedGameID = ClickedTab.attr('BoxScoreGameID');
    $.each($('.SelectedGameBox'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).css('backgroundColor', '');
      $(TargetTab).removeClass('SelectedGameBox');

      var UnselectedGameID = TargetTab.attr('BoxScoreGameID');

      $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('SelectedGameBox');
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide')

  });
}



function AddHistoricalLeaderListeners(WorldID, TeamID){

  $('.team-record-bar button').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    console.log('ClickedTab AddHistoricalLeaderListeners', ClickedTab);
    var ClickedTabValue = ClickedTab.attr('timeframe');

    if (! $(ClickedTab).hasClass('selected-team-record-tab')) {
      $('.selected-team-record-tab').each(function(ind, obj){
        $(obj).removeClass('selected-team-record-tab');
      })
      $(ClickedTab).addClass('selected-team-record-tab');
    }

    $('[timeframe="'+ClickedTabValue+'"]').each(function(ind, obj){
      $(obj).removeClass('w3-hide');
    });

    GetTeamHistoricalLeaders(WorldID, TeamID, ClickedTabValue);

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

function AddRosterListeners(){
  console.log('Adding roster listeners!');

  $('#roster-bar button').on('click', function(event, target){

    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.roster-bar').attr('id');
    var SelectedDataContext = ClickedTab.attr('table-data-context');

    $.each($('.selected-roster-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-roster-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedDataContext = TargetTab.attr('table-data-context');
      $('.TeamRosterPlayerRowCell[table-data-context="'+UnselectedDataContext+'"]').addClass('w3-hide')
      $('.TeamRosterHeaderCell[table-data-context="'+UnselectedDataContext+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('selected-roster-tab');
    $('.TeamRosterPlayerRowCell[table-data-context="'+SelectedDataContext+'"]').removeClass('w3-hide')
    $('.TeamRosterHeaderCell[table-data-context="'+SelectedDataContext+'"]').removeClass('w3-hide')

  });

}

function DrawFaces(TeamJerseyStyle, TeamJerseyInvert){

  $.each($('[hasplayerfacejson="1"]'), function(index,FaceDiv){
    var FaceElement = $(FaceDiv).find('.PlayerFaceDisplay')[0];
    var FaceJson = $(FaceDiv).attr('PlayerFaceJson').replace(/'/g, '"');
    var PlayerFaceJson = JSON.parse(FaceJson);
    BuildFace(PlayerFaceJson, undefined, undefined, $(FaceElement).attr('id'));
  });
}

function DrawCoachOrgChart(TeamInfo, CoachOrg){

  console.log('TeamInfo, CoachOrg', TeamInfo, CoachOrg);
  var TeamName = TeamInfo.TeamName;
  var TeamLogoURL = TeamInfo.TeamLogoURL;

  Highcharts.chart('CoachChart', {
    chart: {
        height: 600,
        inverted: true
    },

    title: {
        text: 'Coach Org Chart'
    },

    accessibility: {
        point: {
            descriptionFormatter: function (point) {
                var nodeName = point.toNode.name,
                    nodeId = point.toNode.id,
                    nodeDesc = nodeName === nodeId ? nodeName : nodeName + ', ' + nodeId,
                    parentDesc = point.fromNode.id;
                return point.index + '. ' + nodeDesc + ', reports to ' + parentDesc + '.';
            }
        }
    },

    series: [{
        type: 'organization',
        name: TeamName,
        keys: ['from', 'to', 'weight'],
        data: [
            ['HC', 'OC', 3],
            ['HC', 'STC', 3],
            ['HC', 'DC', 3],
            ['OC', 'QBC', 1],
            ['OC', 'RBC', 1],
            ['OC', 'WRC', 1],
            ['OC', 'OLC', 1],
            ['DC', 'DLC', 1],
            ['DC', 'LBC', 1],
            ['DC', 'DBC', 1],
        ],
        levels: [
          {level: 0},
          {level: 1},
          {level: 2},
          {level: 3},
        ],
        nodes: [{
            id: 'HC',
            title: 'Head Coach',
            name: CoachOrg.HC.CoachName,
            image: TeamLogoURL,
            column: 0
        }, {
            id: 'OC',
            title: 'Offensive Coordinator',
            name: CoachOrg.OC.CoachName,
            image: TeamLogoURL,
            column: 1
        },  {
            id: 'STC',
            title: 'Special Teams Coach',
            name: CoachOrg.STC.CoachName,
            image: TeamLogoURL,
            column: 1
        },{
            id: 'DC',
            title: 'Defensive Coordinator',
            name: CoachOrg.DC.CoachName,
            image: TeamLogoURL,
            column: 1
        }, {
            id: 'QBC',
            title: 'QB Coach',
            name: CoachOrg.QBC.CoachName,
            image: TeamLogoURL,
            column: 2
        }, {
            id: 'RBC',
            title: 'RB Coach',
            name: CoachOrg.RBC.CoachName,
            image: TeamLogoURL,
            column: 2
        }, {
            id: 'WRC',
            title: 'WR Coach',
            name: CoachOrg.WRC.CoachName,
            image: TeamLogoURL,
            column: 3
        }, {
            id: 'OLC',
            title: 'O Line Coach',
            name: CoachOrg.OLC.CoachName,
            image: TeamLogoURL,
            column: 3
        }, {
            id: 'DLC',
            title: 'D Line Coach',
            name: CoachOrg.DLC.CoachName,
            image: TeamLogoURL,
            column: 2
        }, {
            id: 'LBC',
            title: 'LB Coach',
            name: CoachOrg.LBC.CoachName,
            image: TeamLogoURL,
            column: 2
        }, {
            id: 'DBC',
            title: 'D Back Coach',
            name: CoachOrg.DBC.CoachName,
            image: TeamLogoURL,
            column: 3
        }],
        colorByPoint: false,
        color: 'white',
        dataLabels: {
            color: 'black'
        },
        borderColor: 'black',
        nodeWidth: 150
    }],
    tooltip: {
        outside: true
    },
    exporting: {
        allowHTML: true,
        sourceWidth: 800,
        sourceHeight: 600
    }

});
}



$(document).ready(function(){

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));
  var TeamJerseyStyle  = $(DataPassthruHolder).attr('TeamJerseyStyle');
  var TeamJerseyInvert  = $(DataPassthruHolder).attr('TeamJerseyInvert');
  var TeamName = '';
  var CoachOrg = '';

  AddScheduleListeners();
  AddBoxScoreListeners();
  AddHistoricalLeaderListeners(WorldID, TeamID);

  console.log('in Team.js file')
  GetTeamHistory(WorldID, TeamID);
  GetTeamHistoricalLeaders(WorldID, TeamID, 'Season');
  GetTeamRoster(WorldID, TeamID);
  GetTeamSchedule(WorldID, TeamID);
  GetTeamCoaches(WorldID, TeamID);
  DrawFaces(TeamJerseyStyle, TeamJerseyInvert);
  DrawSchedule();

  //DrawCoachOrgChart(TeamName, CoachOrg);
  //GET_HistoricalTeamLeaders

});

function DrawSchedule(){

  ResArrowSize();
  $(window).resize(function () {
      ResArrowSize();
  });

  //this function define the size of the items
  function ResArrowSize() {

      $('#addedStyle').remove();

      var bodyWidth = $('.SelectedGameBox').width();

      var sideLength = bodyWidth / 2;

      var styleAdd = '';
      styleAdd += 'border-left-width: '+sideLength+'px;'
      styleAdd += 'border-right-width: '+sideLength+'px;'
      styleAdd += 'border-width: 15px '+sideLength+'px 0;'

      $('<style id="addedStyle">.SelectedGameBox::after{'+styleAdd+'}</style>').appendTo('head');

  }
}




function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));
  var PrimaryColor    = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryJerseyColor');

  if (face == '' || face == undefined){
    return 0;
  }
  if (TeamJerseyInvert == 'True') {
    var overrides = {"teamColors":["#FFFFFF", "#"+PrimaryColor,"#"+SecondaryColor]}
  }
  else {
    var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}

  }
  //overrides['jersey'] = {'id': TeamJerseyStyle}

  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  display(DOMID, face, overrides);
}
