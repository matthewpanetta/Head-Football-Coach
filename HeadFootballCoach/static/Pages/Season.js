
function AddSeasonAllAmericanListeners(){

  $('.season-allamerican-conference-bar button').on('click', function(event, target) {
    console.log('Clicked', event)

    var TargetTab = $(event.target);
    var TargetTabID = TargetTab.attr('id');
    var TargetRowID =  $(TargetTab).attr('id').replace('-tab', '');

    $('.'+TargetRowID).each(function(index, object){
      console.log('Unhiding', object)
      $(object).removeClass('season-allamerican-conf-hide');
    });

    $('.selected-season-award-conference-tab').each(function(index,object){
      $(object).removeClass('selected-season-award-conference-tab');
      console.log('Removing broder from', object)
      var ObjectID = $(object).attr('id').replace('-tab', '');

      $('.'+ObjectID).each(function(index, object){
        console.log('Hiding', object)
        $(object).addClass('season-allamerican-conf-hide');
      });
    });
    $(TargetTab).addClass('selected-season-award-conference-tab');
    console.log('Adding border to ', TargetTab);
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

  AddSeasonAllAmericanListeners();

  console.log('in Season.js file')


});
