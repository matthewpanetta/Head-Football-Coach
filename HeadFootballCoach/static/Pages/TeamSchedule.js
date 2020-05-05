function PopulateTeamSchedule(data){
  console.log(' in PopulateTeamSchedule', data);

  var ScheduleTable = $('#TeamSchedule').DataTable({
    'searching': false,
    'paging': false,
    'info': false,
    'ordering': false,
    "pageLength": 25,
    "data": data,
     "columns": [
       {"data": "teamseason__teamgame__GameID__WeekID__WeekName", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).attr('style', 'border-left-color: #' + DataObject['Opposing_TeamColor_Primary_HEX']);
           $(td).addClass('teamTableBorder');
       }},
       {"data": "Opposing_TeamName", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            var RankToShow = DataObject.Opposing_TeamRank_Display
           $(td).html("<span>"+"</span> ");
           $(td).append("<img class='worldTeamStatLogo padding-right' src='"+DataObject['Opposing_TeamLogoURL']+"'/>")
           $(td).append("<span class='font10'>"+RankToShow+"</span> ")
           $(td).append("<a href='"+DataObject['Opposing_TeamHref']+"'>"+StringValue+"</a>");
           $(td).append(' <span class="font10">'+DataObject['Opposing_TeamRecord_Show']+'</span>')
       }},
       {"data": "GameDisplay", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).html("<span class='"+DataObject.GameOutcomeLetter+"'>"+DataObject.GameOutcomeLetter+"</span> <span><a href='"+DataObject['GameHref']+"'>"+StringValue+"</a> " + DataObject.OvertimeDisplay+"</span>");
       }},
       {"data": "TeamRecord_Show", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
           $(td).html("<span>"+StringValue+"</span> <span></span>");
       }},
       {"data": "TopPlayerStats", "sortable": true, 'className': 'hide-small','visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
         if (TopPlayerStats.length > 0){
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
       {"data": "TopPlayerStats", "sortable": true, 'className': 'hide-medium','visible': true, 'orderSequence':["asc", "desc"], "fnCreatedCell": function (td, TopPlayerStats, DataObject, iRow, iCol) {
         if (TopPlayerStats.length > 0 ){
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
  });
}

$(document).ready(function(){
  var TeamScheduleData = $('#team-schedule-data')[0];
  TeamScheduleData = JSON.parse(TeamScheduleData.textContent);
  PopulateTeamSchedule(TeamScheduleData);
});
