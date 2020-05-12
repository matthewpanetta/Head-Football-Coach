function PopulateTeamHistory(TeamHistoryData){
  console.log(' in PopulateTeamHistory', TeamHistoryData);

  var HistoryTable = $('#teamSeasonHistoryResultsTable').DataTable({
    'searching': false,
    'paging': false,
    'scrollX': true,
    'info': false,
    "pageLength": 25,
    'data': TeamHistoryData,
    'columns': [
      {"data": "SeasonYear", "sortable": true, 'visible': true, 'orderSequence':["asc", "desc"]},
      {"data": "FinalRank", "sortable": true, 'visible': true, 'orderSequence':["asc", 'desc']},
      {"data": "Wins", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          $(td).text(DataObject.TeamRecord)
      }},
      {"data": "ConferenceWins", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          $(td).text(DataObject.TeamConferenceRecord)
      }},
      {"data": "ConferenceRank", "sortable": true, 'visible': true, 'orderSequence':[ "asc", 'desc']},
      {"data": "BowlResult", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"], "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          $(td).empty();
          $(` <span>`+DataObject.BowlResult+`</span>
              <a href="`+DataObject.BowlHref+`"><span>`+DataObject.BowlScore+`</span></a>
              <span>`+DataObject.String_BowlVs+`</span>
              <a href='`+DataObject.BowlOpponentHref+`'><span >`+DataObject.BowlOpponent+`</span></a>
              <span>`+DataObject.String_BowlIn+`</span>
              <span>`+DataObject.BowlName+`</span>`
            ).appendTo($(td));
      }},
      {"data": "RecruitingClassRank", "sortable": true, 'visible': true, 'orderSequence':[ "asc", 'desc']},
    ]
  });

  /*
  {% for TeamSeason in TeamSeasonHistory%}
  <tr id='' class=''>
    <td class='' data-field='' data-value="">
        <span data-field='BowlResult'>{{TeamSeason.BowlResult}}</span>
        <a href-field='BowlHref' href="{{TeamSeason.BowlHref}}"><span data-field='BowlScore'>{{TeamSeason.BowlScore}}</span></a>
        <span data-field='String_BowlVs'>{{TeamSeason.String_BowlVs}}</span>
        <a href='{{TeamSeason.BowlOpponentHref}}'><span >{{TeamSeason.BowlOpponent}}</span></a>
        <span data-field='String_BowlIn'>{{TeamSeason.String_BowlIn}}</span>
        <span data-field='BowlName'>{{TeamSeason.BowlName}}</span>
    </td>
    <td class='TeamSeasonHistoryRowCell' data-field='RecruitingClassRank' data-value="">{{TeamSeason.RecruitingClassRank}}</td>
  </tr>
  {% endfor %}
  */
}

$(document).ready(function(){
  var TeamHistoryData = $('#team-history-data')[0];
  TeamHistoryData = JSON.parse(TeamHistoryData.textContent);
  PopulateTeamHistory(TeamHistoryData);
});
