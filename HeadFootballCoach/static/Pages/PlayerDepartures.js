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


function InitializeDepartureTable(WorldID, ConferenceList, TeamList, PositionList){

  //teamRosterTable

  var CurrentSelectedPlayerID = 0;

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


$(document).ready(function(){

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));


});
