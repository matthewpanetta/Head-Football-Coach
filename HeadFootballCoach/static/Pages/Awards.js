
function AddWeeklyAwardConferenceListeners(){


  $('.conference-weeklyaward-tab').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    console.log('ClickedTab', ClickedTab);
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

    console.log('Trying to filter ' , '.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]', $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]'));
    $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="1"]').removeClass('w3-hide');
    $('.overviewUpcomingGameDisplay['+SelectedGameFilterSelection+'="0"]').addClass('w3-hide');

    $(ClickedTab).addClass('selected-upcoming-gameview-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
  //  $(ClickedTab).css('background-color', 'black');

  });
}


$(document).ready(function(){

  AddWeeklyAwardConferenceListeners();

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));


  console.log('in Awards.js file')

});
