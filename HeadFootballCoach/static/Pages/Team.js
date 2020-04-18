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

  console.log('in Team.js file')
  GetTeamHistory(WorldID, TeamID);
  GetTeamCoaches(WorldID, TeamID);
  DrawFaces(TeamJerseyStyle, TeamJerseyInvert);
  DrawSchedule();

  var MapData = $('#map-data')[0];
  MapData = JSON.parse(MapData.textContent);
  //DrawMap(MapData);


  //DrawCoachOrgChart(TeamName, CoachOrg);
  //GET_HistoricalTeamLeaders

});

function DrawMap(MapData){

  console.log('Drawing map', MapData);

   var Center = {lat: parseFloat(MapData.Latitude), lng: parseFloat(MapData.Longitude)};

  var map = new google.maps.Map($('#map'), {
          center: Center,
          zoom: 6
        });

   var marker = new google.maps.Marker({position: Center, map: map});
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
