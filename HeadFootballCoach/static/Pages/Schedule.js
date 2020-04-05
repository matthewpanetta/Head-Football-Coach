
$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));

  AddScheduleListeners();

  DrawSchedule();
});



function AddScheduleListeners(){
  var InitialWeekBox = $('.SelectedWeekBox')[0];

  var SelectedWeekID = $(InitialWeekBox).attr('WeekID');
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedWeekID+'"]').removeClass('w3-hide');


  $('.weekScheduleBox').on('click', function(event, target) {

    var ClickedTab = $(event.target).closest('.weekScheduleBox');
    var SelectedWeekID = ClickedTab.attr('WeekID');
    $.each($('.SelectedWeekBox'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).css('backgroundColor', '');
      $(TargetTab).removeClass('SelectedWeekBox');

      var UnselectedWeekID = TargetTab.attr('WeekID');

      $('.weekScheduleDisplayContainer[WeekID="'+UnselectedWeekID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('SelectedWeekBox');
    $('.weekScheduleDisplayContainer[WeekID="'+SelectedWeekID+'"]').removeClass('w3-hide')

  });
}


function DrawSchedule(){
  console.log('Drawing schedule!')

  ResArrowSize();
  $(window).resize(function () {
      ResArrowSize();
  });

  //this function define the size of the items
  function ResArrowSize() {
    console.log('resixing arrow');

      $('#addedStyle').remove();

      var bodyWidth = $('.SelectedWeekBox').width();

      var sideLength = bodyWidth / 2;

      var styleAdd = '';
      styleAdd += 'border-left-width: '+sideLength+'px;'
      styleAdd += 'border-right-width: '+sideLength+'px;'
      styleAdd += 'border-width: 15px '+sideLength+'px 0;'

      $('<style id="addedStyle">.SelectedWeekBox::after{'+styleAdd+'}</style>').appendTo('head');

  }
}
