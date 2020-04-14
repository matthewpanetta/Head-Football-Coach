
$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));


  BuildDepthCharts_td();

});


function BuildDepthCharts_td() {

  var DescFirst = ["desc", 'asc'];


  var LI_POSITION = 'li_position';
  $( "tbody.player-list" ).sortable({
    connectWith: ".player-list",
    items: ">  tr:not(.group-row)",//:not(:first)
    placeholder: "ui-state-highlight",
    zIndex: 999990,
    distance: 25,
    update: function(event, ui) {
            var order = [];
            console.log('dropped', event, ui);

            var StarterCount = parseInt($(event.target).attr('startercount'))
            var MaxPlayers =  StarterCount + parseInt($(event.target).attr('benchcount'));
             $(event.target).children('tr').each( function(e) {

               var originalposition = $(this).attr('position');

              if ($(this).index() + 1 > MaxPlayers){
                $(this).detach();

                $('.original-list').append(this);
                $(this).css('border', '');
              }
              else {
                order.push( $(this).attr('playerid')  + '=' + ( $(this).index() + 2 ) );
                if ($(this).index() + 1 <= StarterCount){
                  $(this).removeClass('is-not-starter').addClass('is-starter');
                }
                else if ($(this).index() + 1 <= MaxPlayers) {
                  $(this).removeClass('is-starter').addClass('is-not-starter');
                }
              }
            });

            var positions = order.join(';')
            Cookies.set( LI_POSITION , positions , { expires: 10 });
          }
  });

  $( "tbody, tr" ).disableSelection();


    var ColCategories = {
      'Base': 4,
      'QB Skills': 5,
      'RB Skills': 5,
      'WR Skills': 5
    }

    var ShowColumnMap = {}
    var ColCounter = 0;
    $.each(ColCategories, function(key, val){
      ShowColumnMap[key] = []
      for(var i = ColCounter; i < ColCounter+val; i++){
        ShowColumnMap[key].push(i);
      }
      ColCounter = ColCounter + val;
    })

    var FullColumnList = [];
    var HideColumnMap = {}
    $.each(ShowColumnMap, function(key, ColList){
      $.each(ColList, function(ind, ColNum){
        if ((($.inArray( ColNum,  ShowColumnMap['Base'])) == -1)){
          FullColumnList.push(ColNum);
        }
      })
    });

    $.each(ShowColumnMap, function(key, ColList){
       var cols = $.grep( FullColumnList, function( val, ind ) {
          return $.inArray( val,  ColList) == -1
        });
        HideColumnMap[key] = cols;
    });


    var ButtonList = []

    $.each(ColCategories, function(key, val){
      if (key == 'Base'){
        return true;
      }
      var ButtonObj = {extend: 'colvisGroup',
                        text: key,
                        show: ShowColumnMap[key],
                        hide: HideColumnMap[key],
                        action: function( e, dt, node, config){
                          console.log('config', e, dt, node, config)
                          dt.columns(config.show).visible(true);
                          dt.columns(config.hide).visible(false);

                         $(".dt-buttons").find("button").removeClass("active");
                         node.addClass("active");

                   }}
      ButtonList.push(ButtonObj)
    });

    console.log('ButtonList', ButtonList);


  var AvailableTables = $('.AvailablePlayerList').DataTable({
      dom: 'Bfrt',
      'buttons':ButtonList,
      scrollX: false,
      'ordering': true,
      'sorting': true,
      'searching': false,
      'paging': false,
      fixedHeader: true,
      /*
      rowGroup: {
            dataSrc: 2,
            endRender: function(ui, text, count){
              console.log('row group, ', ui, text, count);
              console.log(ui.rowGroup());
            }
        },
        */
      columns: [
        {"sortable": false, 'visible': true},
        {"sortable": false, 'visible': true},
        {"sortable": false, 'visible': true, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': true, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"sortable": false, 'visible': false, 'orderSequence':DescFirst},
      ],
      'info': false,
      'order': [[ 2, "asc" ],[ 3, "desc" ]],
  });


  var OtherTables = $('.player-list-table:not(.AvailablePlayerList)').DataTable({
    scrollX: true,
    scrollY: false,
    dom: 'rt',
    fixedHeader: false,
    sorting: false,
    columns: [
      {"sortable": false, 'visible': true},
      {"sortable": false, 'visible': true},
      {"sortable": false, 'visible': true},
      {"sortable": false, 'visible': true},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
      {"sortable": false, 'visible': false},
    ],
  });

  console.log('OtherTables', OtherTables);

  AvailableTables.tables().on('column-visibility', function ( e, settings, colIdx, visibility ) {
    console.log('colIdx, visibility', colIdx, visibility, OtherTables, OtherTables.tables());

    for (var i = 0; i < OtherTables.context.length; i++){
      OtherTables.table(i).column(colIdx).visible(visibility);
    }
  });
}

/*

$(document).ready(function() {
  var tables = $('table.display').DataTable( { displayLength: 5 } ); // When the column visibility changes on the firs table, also change it on // the others
  tables.table(0).on('column-visibility', function ( e, settings, colIdx, visibility ) {
    tables.tables(':gt(0)').column( colIdx ).visible( visibility );
  });
  // Create ColVis on the first table only
  var colvis = new $.fn.dataTable.ColVis( tables.table(0) );
  $( colvis.button() ).insertAfter('div.info');
}
);
*/
