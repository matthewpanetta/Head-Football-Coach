

function AddScoringSummaryListeners(){

  //  DriveEndingEvent-All
  //  DriveEndingEvent-Score

  $('.drive-event-bar button').on('click', function(event, target) {

    var ClickedTab = $(event.target)
    console.log('ClickedTab', ClickedTab);
    var ClickedTabParent = ClickedTab.attr('id');
    var SelectedEventSelection = ClickedTabParent.replace('-tab', '');

    if (! $(ClickedTab).hasClass('selected-drive-event-tab')) {
      $('.selected-drive-event-tab').each(function(ind, obj){
        $(obj).removeClass('selected-drive-event-tab');
      })
      $(ClickedTab).addClass('selected-drive-event-tab');
    }

    $('.DriveEndingEvent-All').each(function(ind, obj){
      $(obj).addClass('w3-hide');
    });

    $('.' + SelectedEventSelection).each(function(ind, obj){
      $(obj).removeClass('w3-hide');
    });

  });
}





$(document).ready(function(){

  $.extend(true, $.fn.dataTable.defaults, {
    column: {
        orderSequence: ['desc','asc']
    }
  });
  console.log('In Game.js');
  $('.gamePlayerBoxStats').find('table').DataTable( {
    "searching": false,
    "info": false,
    "paging":   false,
    "ordering": true,
    'order': [[1, 'desc']],

  });

  AddScoringSummaryListeners();
});


'selected-drive-event-tab'
