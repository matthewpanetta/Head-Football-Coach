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
      var FieldCell = $(TeamSeasonHistoryTemplate).find('.TeamSeasonHistoryRowCell[data-field="'+TeamSeasonAttr+'"]');
      FieldCell.text(TeamSeasonAttrValue);
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
  var PPGHistoricalLeadersTable = $('#teamHistoryPlayerLeadersPPG');
  //console.log('TeamSeasonHistoryTable', HistoricalLeadersTable);
  var PPGHistoricalLeaders = $.grep(HistoricalLeaders, function(t){
    //return t;
    return 'PPGRank' in t && t.PPGRank <= 5  ;
  });
  var PPGHistoricalLeaders = PPGHistoricalLeaders.sort((a, b) => (a.PPGRank > b.PPGRank) ? 1 : -1);

  $.each(PPGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#teamHistoryPlayerLeadersPPGRowClone').clone();
    //console.log('PlayerStats', PlayerStats, 'HistoricalLeadersTemplate', HistoricalLeadersTemplate);

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderPPGRowCell[data-field="'+PlayerStatsAttr+'"] a');
      if (FieldCell.length == 0) {
        var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderPPGRowCell[data-field="'+PlayerStatsAttr+'"]');
      }
      else {
        var HrefField = FieldCell.attr('href-field');
        FieldCell.attr('href', '/World/'+WorldID+'/Player/'+PlayerStats[HrefField]);
      }
      FieldCell.text(PlayerStatsValue);
      //console.log(FieldCell);
    });

    PPGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });

  $('#teamHistoryPlayerLeadersPPG').DataTable( {
        "searching": false,
          "info": false,
          "paging":   false,
          "order": [[ 0, "asc" ]]
      } );


//------------------------------------------------------------
  var RPGHistoricalLeadersTable = $('#teamHistoryPlayerLeadersRPG');
  //console.log('TeamSeasonHistoryTable', HistoricalLeadersTable);
  var RPGHistoricalLeaders = $.grep(HistoricalLeaders, function(t){
    //return t;
    return 'RPGRank' in t && t.RPGRank <= 5  ;
  });
  var RPGHistoricalLeaders = RPGHistoricalLeaders.sort((a, b) => (a.RPGRank > b.RPGRank) ? 1 : -1);

  $.each(RPGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#teamHistoryPlayerLeadersRPGRowClone').clone();

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderRPGRowCell[data-field="'+PlayerStatsAttr+'"] a');
      if (FieldCell.length == 0) {
        var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderRPGRowCell[data-field="'+PlayerStatsAttr+'"]');
      }
      else {
        var HrefField = FieldCell.attr('href-field');
        FieldCell.attr('href', '/World/'+WorldID+'/Player/'+PlayerStats[HrefField]);
            }
      FieldCell.text(PlayerStatsValue);
    });

    RPGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });

  $('#teamHistoryPlayerLeadersRPG').DataTable( {
        "searching": false,
          "info": false,
          "paging":   false,
          "order": [[ 0, "asc" ]]
      } );


//------------------------------------------------------------
  var APGHistoricalLeadersTable = $('#teamHistoryPlayerLeadersAPG');
  var APGHistoricalLeaders = $.grep(HistoricalLeaders, function(t){
    return 'APGRank' in t && t.APGRank <= 5  ;
  });
  var APGHistoricalLeaders = APGHistoricalLeaders.sort((a, b) => (a.APGRank > b.APGRank) ? 1 : -1);

  $.each(APGHistoricalLeaders, function(index, PlayerStats){

    var HistoricalLeadersTemplate = $('#teamHistoryPlayerLeadersAPGRowClone').clone();

    $(HistoricalLeadersTemplate).removeClass('hidden');
    $(HistoricalLeadersTemplate).removeAttr('id');
    $.each(PlayerStats, function(PlayerStatsAttr,PlayerStatsValue){
      var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderAPGRowCell[data-field="'+PlayerStatsAttr+'"] a');
      if (FieldCell.length == 0) {
        var FieldCell = $(HistoricalLeadersTemplate).find('.TeamHistoricalLeaderAPGRowCell[data-field="'+PlayerStatsAttr+'"]');
      }
      else {
        var HrefField = FieldCell.attr('href-field');
        FieldCell.attr('href', '/World/'+WorldID+'/Player/'+PlayerStats[HrefField]);
      }
      FieldCell.text(PlayerStatsValue);
    });

    APGHistoricalLeadersTable.append(HistoricalLeadersTemplate);
  });

  $('#teamHistoryPlayerLeadersAPG').DataTable( {
        "searching": false,
          "info": false,
          "paging":   false,
          "order": [[ 0, "asc" ]]
      } );
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
    console.log('TeamScheduleContainer', TeamScheduleContainer);

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
      console.log('TeamScheduleRowClone', TeamScheduleRowClone);

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
        console.log('TeamScheduleRowClone', TeamScheduleRowClone);

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
      PopulateHistoricalLeadersTable(res.HistoricalLeaders, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}


function GetTeamRoster(WorldID, TeamID){


  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Team/"+TeamID+"/TeamRoster",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateTeamRosterTable(res.Roster, WorldID, )
    },
    error: function(res) {
      alert(res.status);
    }
  });

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


  console.log($('.teamScheduleGameBox'));
  $('.teamScheduleGameBox').on('click', function(event, target) {

    var ClickedTab = $(event.target).closest('.teamScheduleGameBox');
    var SelectedGameID = ClickedTab.attr('BoxScoreGameID');
    console.log('Schedulebox clicked', event, target);
    $.each($('.SelectedGameBox'), function(index, tab){
      var TargetTab = $(tab);
      console.log(TargetTab);
      $(TargetTab).css('backgroundColor', '');
      $(TargetTab).removeClass('SelectedGameBox');
      console.log(TargetTab);

      var UnselectedGameID = TargetTab.attr('BoxScoreGameID');
      console.log('UnselectedGameID',UnselectedGameID);

      console.log('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]', $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]'));
      $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    console.log('ClickedTab', ClickedTab);
    $(ClickedTab).addClass('SelectedGameBox');
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}


function AddBoxScoreListeners(){
  var InitialBoxScore = $('.selected-boxscore-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');
  //$('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide');


  console.log($('.selected-boxscore-tab'));
  $('.boxscore-tab').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedTeamID = ClickedTab.attr('TeamID');
    var SelectedGameID = ClickedTab.attr('GameID');

    console.log('$("#'+ClickedTabParent+' > .selected-boxscore-tab")', $('#'+ClickedTabParent+' > .selected-boxscore-tab'));
    $.each($('#'+ClickedTabParent+' > .selected-boxscore-tab'), function(index, tab){
      var TargetTab = $(tab);
      console.log('TargetTab',TargetTab);
      $(TargetTab).removeClass('selected-boxscore-tab');
      console.log('TargetTab',TargetTab);
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');
      console.log('UnselectedGameID',UnselectedTeamID);

      console.log('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]', $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]'));
      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    console.log('ClickedTab', ClickedTab);
    $(ClickedTab).addClass('selected-boxscore-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}

function AddRosterListeners(){
  console.log('Adding roster listeners!');

  $('#roster-bar button').on('click', function(event, target){
    console.log(this, event, target);

    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.roster-bar').attr('id');
    var SelectedDataContext = ClickedTab.attr('table-data-context');

    $.each($('.selected-roster-tab'), function(index, tab){
      var TargetTab = $(tab);
      console.log('TargetTab',TargetTab);
      $(TargetTab).removeClass('selected-roster-tab');
      console.log('TargetTab',TargetTab);
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedDataContext = TargetTab.attr('table-data-context');
      $('.TeamRosterPlayerRowCell[table-data-context="'+UnselectedDataContext+'"]').addClass('w3-hide')
      $('.TeamRosterHeaderCell[table-data-context="'+UnselectedDataContext+'"]').addClass('w3-hide')
    });

    console.log('ClickedTab', ClickedTab);
    $(ClickedTab).addClass('selected-roster-tab');
    $('.TeamRosterPlayerRowCell[table-data-context="'+SelectedDataContext+'"]').removeClass('w3-hide')
    $('.TeamRosterHeaderCell[table-data-context="'+SelectedDataContext+'"]').removeClass('w3-hide')

  });

}

function DrawFaces(TeamJerseyStyle, TeamJerseyInvert){
  console.log('In Draw Face')
//  BuildFace({{player.PlayerFaceJson|safe}}, '{{playerTeam.TeamJerseyStyle}}', '{{playerTeam.TeamJerseyInvert}}');

  $.each($('.teamTeamLeaderBoxPlayerFace'), function(index,FaceDiv){
    console.log('FaceDiv', $(FaceDiv));
    var FaceElement = $(FaceDiv)[0];
    if ($(FaceDiv).attr('PlayerFaceJson').length == 0) {
      var TeamLogo = $('.teamTeamLogo')[0];
      var TeamLogoSrc = $(TeamLogo).attr('src');
      console.log('Adding team logo!', TeamLogoSrc, FaceElement);
      $(FaceElement).append('<img class="teamTeamLeaderBoxTeamLogo" src="'+TeamLogoSrc+'"  >');
      return 0;
    }

    var PlayerFaceJson = JSON.parse($(FaceElement).attr('PlayerFaceJson'));
    BuildFace(PlayerFaceJson, TeamJerseyStyle, TeamJerseyInvert, $(FaceElement).attr('id'));
  });
}



$(document).ready(function(){

  AddScheduleListeners();
  AddBoxScoreListeners();

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));
  var TeamJerseyStyle  = $(DataPassthruHolder).attr('TeamJerseyStyle');
  var TeamJerseyInvert  = $(DataPassthruHolder).attr('TeamJerseyInvert');


  console.log('in Team.js file')
  //GetTeamHistory(WorldID, TeamID);
  GetTeamRoster(WorldID, TeamID);
  GetTeamSchedule(WorldID, TeamID);

  DrawFaces(TeamJerseyStyle, TeamJerseyInvert);

});




function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  console.log('DataPassthruHolder',DataPassthruHolder);
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));
  var PrimaryColor    = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryColor');
  console.log(DataPassthruHolder, PrimaryColor, SecondaryColor,WorldID , PlayerID);

  console.log('face before generate', face, TeamJerseyStyle, TeamJerseyInvert);
  if (face == '' || face == undefined){
    /*
    console.log('face was empty');
    face = generate();

    $.ajax({
      method: "POST",
      url: "/World/"+WorldID+"/Player/"+PlayerID+"/SetPlayerFaceJSON",
      data: {
        csrfmiddlewaretoken: csrftoken,
        PlayerFaceJson: JSON.stringify(face)
      },
      dataType: 'json',
      success: function(res, status) {
        console.log(res, status);
      },
      error: function(res) {
        alert(res.status);
      }
    });
    */
    return 0;
  }
  if (TeamJerseyInvert == 'True') {
    var overrides = {"teamColors":["#FFFFFF", "#"+PrimaryColor,"#"+SecondaryColor]}
  }
  else {
    var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}

  }
  overrides['jersey'] = {'id': TeamJerseyStyle}

  console.log('face after generate', face);
  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  console.log('displaying!!', DOMID, face, overrides)
  display(DOMID, face, overrides);
}
