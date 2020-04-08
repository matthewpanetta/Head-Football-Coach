
$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID    = parseInt($(DataPassthruHolder).attr('TeamID'));

  AddScheduleListeners();

  DrawSchedule();
  PopulateTeamSchedule(WorldID, TeamID);
});


function PopulateTeamSchedule(WorldID, TeamID){
  console.log('in pop team sched', WorldID, TeamID)

  function ScheduleHeader(settings, json, onReload){

    if (onReload){
      settings.nTableWrapper = settings.context[0].nTableWrapper
    }

     var TeamData = json.TeamData;
     var FullTeamList = json.TeamList;

     var Card = $(settings.nTableWrapper).parent().first();

     console.log('Card', Card, $(Card))

     var TeamSelectList = `<select class="w3-select" name="option" style="width: 200px;" id="scheduleTeamScheduleSelect"><option value="" disabled selected>Choose team schedule</option>`;
     $.each(FullTeamList, function(ind, obj){
       TeamSelectList = TeamSelectList + '<option value="'+obj.TeamID+'"><img class="small-logo" src="'+obj.TeamLogoURL+'" />'+obj.TeamName+' '+obj.TeamNickname+'</option>'
     });
     TeamSelectList = TeamSelectList + '</select>'
     // team-header-color-left
     $(settings.nTableWrapper).addClass('overflow-hidden');
     $(settings.nTableWrapper).find('.scheduleTeamScheduleHeader').remove();
     $(settings.nTableWrapper).prepend(`<div class="scheduleTeamScheduleHeader" >`
                                           +`<div style="height: 100px; background-color: #`+TeamData.TeamColor_Primary_HEX+`;"></div>`
                                           +`<div class="w3-row-padding">`
                                           +`<img style="height: 150px; background-color: white;border-radius: 550px;margin-top: -75px; margin-bottom: -10px;" src="`+TeamData.TeamLogoURL+`"  /></div>`
                                           + `<div class="w3-row-padding" style="font-size: 32px;"><div><span class="minor-bold">`+TeamData.TeamName + '</span> <span>'+ TeamData.TeamNickname + `</span><span class="thin-font"> Schedule</span></div></div>`
                                       + `<div class="w3-row-padding">`+TeamSelectList+`</div>`
                                       +`</div>`);
    $(Card).css('box-shadow', '0px 2px 12px 0px #'+TeamData.TeamColor_Primary_HEX);
     $('#scheduleTeamScheduleSelect').change( function(){
       var NewTeamID = $(this).find('option:selected').first().attr('value');
       ScheduleTable.ajax.url('/World/'+WorldID+'/Team/'+NewTeamID+'/TeamSchedule').load(function(data, other){ ScheduleHeader(ScheduleTable, data, true)});
     });
   }

  var ScheduleTable = $('#scheduleTeamScheduleTable').DataTable({
    'searching': false,
    'paging': false,
    'info': false,
    "serverSide": true,
    "pageLength": 10,
    'ajax': {
        "url": "/World/"+WorldID+"/Team/"+TeamID+'/TeamSchedule',
        "type": "GET",
        "data": function ( d ) {

          console.log('Going to get... ', d);
          return d;
        },
        "dataSrc": function ( json ) {
             console.log('json', json);
             var PlayedGames = json['Games']['PlayedGames'];
             var UnplayedGames = json['Games']['FutureGames'];
             return PlayedGames.concat(UnplayedGames);
        }
     },
     "columns": [
       {"data": "WeekName", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
           $(td).addClass('teamTableBorder');
       }},
       {"data": "TeamName", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            var RankToShow = DataObject.AtOrVs == 'W' ? DataObject.AwayTeamRank : DataObject.HomeTeamRank
           $(td).html("<span>"+DataObject.AtOrVs+"</span> ");
           $(td).append("<img class='worldTeamStatLogo padding-right' src='"+DataObject['LogoURL']+"'/>")
           $(td).append("<span class='font10'>"+RankToShow+"</span> ")
           $(td).append("<a href='"+DataObject['TeamHref']+"'>"+StringValue+"</a>");
           $(td).append(' <span class="font10">'+DataObject['TeamRecordDisplay']+'</span>')
       }},
       {"data": "GameDisplay", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).html("<span class='"+DataObject.GameResultLetterClass+"'>"+DataObject.GameResultLetter+"</span> <span><a href='"+DataObject['GameHref']+"'>"+StringValue+"</a></span>");
       }},
       {"data": "ThisTeamRecord", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).html("<span>"+StringValue+"</span> <span></span>");
       }},
       {"data": "TopPlayerStats", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
         if (TopPlayerStats){
           $(td).html(`
              <span>`+TopPlayerStats[0].PlayerPosition+`</span>
              <a href='`+TopPlayerStats[0].PlayerHref+`'>`+TopPlayerStats[0].PlayerName+`</a>
              <span>`+TopPlayerStats[0].PlayerTeam+`</span>
              <ul class='no-list-style'>
                <li>`+TopPlayerStats[0].PlayerStats[0]+`</li>
                <li>`+TopPlayerStats[0].PlayerStats[1]+`</li>
              </ul>
            `);
          }
       }},
       {"data": "TopPlayerStats", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
         if (TopPlayerStats ){
           $(td).html(`
              <span>`+TopPlayerStats[1].PlayerPosition+`</span>
              <a href='`+TopPlayerStats[1].PlayerHref+`'>`+TopPlayerStats[1].PlayerName+`</a>
              <span>`+TopPlayerStats[1].PlayerTeam+`</span>
              <ul class='no-list-style'>
                <li>`+TopPlayerStats[1].PlayerStats[0]+`</li>
                <li>`+TopPlayerStats[1].PlayerStats[1]+`</li>
              </ul>
            `);
          }
       }},
     ],
     "initComplete": ScheduleHeader
  });


}


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
