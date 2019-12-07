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



function PopulateTeamStats(TeamStats, WorldID){
  var TeamStatsTabContainer = $('#TeamStatsTabContainer')[0];

    var TeamStatsTableClone = $('#TeamStatsTableClone').clone();

    $(TeamStatsTableClone).removeClass('w3-hide');
    $(TeamStatsTableClone).removeAttr('id');

    $(TeamStatsTabContainer).append($(TeamStatsTableClone));

    $.each(TeamStats, function(index,TeamObject){
      var TeamStatsTeamRowClone = $('#TeamStatsRowClone').clone();
      $(TeamStatsTeamRowClone).removeClass('w3-hide');
      $(TeamStatsTeamRowClone).removeAttr('id');

      $.each(TeamObject, function(TeamAttr,TeamAttrValue){
        var FieldCell = $(TeamStatsTeamRowClone).find('td[data-field="'+TeamAttr+'"], td span[data-field="'+TeamAttr+'"]')[0];
        var HrefCell = $(TeamStatsTeamRowClone).find('td a[href-field="'+TeamAttr+'"]')[0];
        var ImgCell = $(TeamStatsTeamRowClone).find('td img[img-src-field="'+TeamAttr+'"]')[0];

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
      $(TeamStatsTableClone).find('tbody').append($(TeamStatsTeamRowClone));
  });

  $(TeamStatsTableClone).find('table').DataTable( {
    "searching": false,
      "info": false,
      "paging":   false,
      "order": [[ 1, "asc" ]]
  } );
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


function GetTeamStats(WorldID){

  console.log('Getting team stats!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/AllTeamStats",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateTeamStats(res.TeamStats, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
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


  $('.recent-gameview-tab').on('click', function(event, target) {

    var ClickedTab = $(event.target)
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

    $(ClickedTab).addClass('selected-recent-gameview-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}





$(document).ready(function(){

//  AddUpcomingGameListeners();
//  AddRecentGamesListeners();

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));


  console.log('in Team.js file')

  //GetConferenceStandings(WorldID);
  //GetTeamStats(WorldID);
  //GetAwardRaces(WorldID);
  //GetWorldHistory(WorldID);

});
