

function GetCoachStats(WorldID, data){

  console.log('In CoachStats!', data);


  var cntrlIsPressed = false;

  var ColCategories = {
    'Base': 4,
    'Games': 4,
    'Skills': 4,
    'Philosophy': 4,

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

  console.log('ShowColumnMap', ShowColumnMap);

  /*
  var ShowColumnMap = {
    'Passing-Stats': [6,7,8,9,10],
    'Rushing-Stats': [11,12,13,14,15, 16,17],
    'Receiving-Stats': [18,19,20,21,22,23,24],
    'Defense-Stats': [25,26,27,28,29,30],

  };
  */

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


  var ButtonList = [{
      extend: 'searchPanes',
      config: {
        cascadePanes: true,
        viewTotal: false, //maybe true later - TODO
        columns:[1,3],
        collapse: 'Coach Position',
      },
  }]

  $.each(ColCategories, function(key, val){
    if (key == 'Base'){
      return true;
    }
    var ButtonObj = {extend: 'colvisGroup',
                      text: key,
                      show: ShowColumnMap[key],
                      hide: HideColumnMap[key],
                      action: function( e, dt, node, config){
                        console.log('cntrlIsPressed', cntrlIsPressed, 'e, dt, node, config', e, dt, node, config)
                        $('#CoachStats').DataTable().columns(config.show).visible(true);
                        $('#CoachStats').DataTable().columns(config.hide).visible(false);

                       $(".dt-buttons").find("button").removeClass("active");
                       node.addClass("active");

                 }}
    ButtonList.push(ButtonObj)
  });

  var DescFirst = ['desc', 'asc'];
  var AscFirst = ['asc', 'desc'];

  console.log('ShowColumnMap', ShowColumnMap)
  console.log('HideColumnMap', HideColumnMap)
  console.log('ButtonList', ButtonList);


  var table = $('#CoachStats').DataTable({
      "dom": 'Brtp',
    //  "scrollX": true,
    fixedHeader: true,
      //"serverSide": true,
      "filter": true,
      "ordering": true,
      "lengthChange" : false,
      "pageLength": 150,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "paging": false,
      "data": data,
       'buttons':ButtonList,
      "columns": [
        {"data": "CoachTeamName", "sortable": true, 'searchable': true, 'orderSequence': AscFirst, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['CoachTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['CoachTeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['CoachTeamColor']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('CoachID', DataObject['CoachID']);
        }},
        {"data": "CoachTeamConference", "sortable": true, 'visible': true, 'orderSequence': AscFirst, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['CoachTeamConferenceHref']+"'>"+StringValue+"</a>");
        }},
        {"data": "CoachName", "sortable": true, 'visible': true, 'orderSequence': AscFirst},
        {"data": "CoachPositionSortOrder", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':AscFirst, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html(DataObject.CoachPosition);
        }},
        {"data": "Wins", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Losses", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "Top25_Wins", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Top25_Losses", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "CharismaRating", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "ReputationRating", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "GameplanRating", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "ScoutingRating", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "SituationalAggressivenessTendency", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PlaycallPassTendency", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "OffensivePlaybook", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "DefensivePlaybook", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

      ],
      'order': [[ 3, "asc" ], [ 4, "desc" ]],
  });

}




$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var CoachData = $('#coach-data')[0];
  CoachData = JSON.parse(CoachData.textContent);
  GetCoachStats(WorldID, CoachData);

});
