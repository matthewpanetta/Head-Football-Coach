
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



$(document).ready(function(){

  AddUpcomingGameListeners();
  AddPreseasonAllAmericanListeners();
  AddSeasonAllAmericanListeners();

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));

});
