
function DrawTeamInfo(data, WorldID, SelectedTeamID){
  var div = $(`
    <div class="w3-row-padding">
      <div class='w3-col s3'>
        <img src="" src-field='TeamLogoURL' alt="" class='width100'>
      </div>
      <div class="w3-col s9 column-flex" >
        <div class="w3-row-padding" >

            <div class='w3-col s7 vertical-align-middle'>
              <div>
                <span class='thin-font font32 margin-right-4' data-field="NationalRankDisplay"></span>
                <span class='minor-bold font32 margin-right-4' data-field='TeamName'></span>
                <span class=' font32' data-field='TeamNickname' ></span>
              </div>
              <div>
                <span class='font12' data-field='CityAndState'></span> | <span class='font12' data-field='ConferenceID__ConferenceName'></span>
              </div>
            </div>
            <div class='w3-col s5 hide-medium vertical-align-middle'>
              <div class="w3-row-padding center-text">
                <div class='w3-col s4'>
                  <div class=' font32' data-field="TeamOverallRating_Grade">
                  </div>
                  <div class=' font16'>
                    Overall
                  </div>
                </div>
                <div class='w3-col s4'>
                  <div class=' font32' data-field="TeamOffenseRating_Grade">
                  </div>
                  <div class=' font16'>
                    Offense
                  </div>
                </div>
                <div class='w3-col s4'>
                  <div class=' font32' data-field="TeamDefenseRating_Grade">
                  </div>
                  <div class=' font16'>
                    Defense
                  </div>
                </div>
              </div>

            </div>

        </div>
        <div class="w3-row-padding hide-medium">
          <div class="w3-col s6 w3-row-padding  ">
            <table class='width80'>
              <tbody>
                <tr>
                  <th colspan="3" class='center-text font24'>Offense</th>
                </tr>
                <tr>
                  <td rowspan="3" class='font32 center-text team-highlight-stat-padding bold font-black'  ordinal-field="PPG_Rank">12th</td>
                  <td data-field="PPG" class='right-text team-highlight-stat-padding'>42</td>
                  <td>PPG</td>
                </tr>
                <tr>
                  <td data-field="PassYPG" class='right-text team-highlight-stat-padding'>120</td>
                  <td>Pass YPG</td>
                </tr>
                <tr>
                  <td data-field="RushYPG" class='right-text team-highlight-stat-padding'>110</td>
                  <td>Rush YPG</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="w3-col s6 w3-row-padding ">
            <table class='width80 '>
              <tbody>
                <tr>
                  <th colspan="3" class='center-text font24'>Defense</th>
                </tr>
                <tr>
                  <td rowspan="3" class='font32 center-text team-highlight-stat-padding bold font-black'  ordinal-field="PAPG_Rank">12th</td>
                  <td data-field="PAPG" class='right-text team-highlight-stat-padding'>42</td>
                  <td>PPG</td>
                </tr>
                <tr>
                  <td data-field="OpponentPassYPG" class='right-text team-highlight-stat-padding'>120</td>
                  <td>Pass YPG</td>
                </tr>
                <tr>
                  <td data-field="OpponentRushYPG" class='right-text team-highlight-stat-padding'>110</td>
                  <td>Rush YPG</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    `);

  $.ajax({
    url: '/World/'+WorldID+'/Team/'+SelectedTeamID+'/TeamCardInfo',
    success: function (data) {
      console.log('Ajax return', data);

      $(div).find('div.w3-hide').removeClass('w3-hide');

      $.each(data, function(key, val){

        $(div).find('[data-field="'+key+'"]').text(val);
        $(div).find('[ordinal-field="'+key+'"]').text(ordinal_suffix_of(val));
        $(div).find('[src-field="'+key+'"]').attr('src', val);

      });
    }
  });

  return div;
}

function GetTeamStats(WorldID, data){

  console.log('In GetTeamStats!', data);


  $(document).keydown(function(event){
      if(event.which=="17")
          cntrlIsPressed = true;
  });

  $(document).keyup(function(){
      cntrlIsPressed = false;
  });

  var cntrlIsPressed = false;

  var ColCategories = {
    'Base': 3,
    'Games': 3,
    'Top 25': 4,
    'Awards': 7,
    'Bowls': 6,
    'Expand': 1
    /*'Rank': 1,
    'Top 25': 1,
    'Rivals': 1,
    'Champ': 1,*/
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
      if ((($.inArray( ColNum,  ShowColumnMap['Base'])) == -1) && ($.inArray( ColNum,  ShowColumnMap['Expand']) == -1)){
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
        columns:[1],
        collapse: 'Filter Team',
      },
  }]

  $.each(ColCategories, function(key, val){
    if (key == 'Base' || key == 'Expand' ){
      return true;
    }
    var ButtonObj = {extend: 'colvisGroup',
                      text: key,
                      show: ShowColumnMap[key],
                      hide: HideColumnMap[key],
                      action: function( e, dt, node, config){
                        console.log('cntrlIsPressed', cntrlIsPressed, 'e, dt, node, config', e, dt, node, config)
                        $('#TeamStats').DataTable().columns(config.show).visible(true);
                        $('#TeamStats').DataTable().columns(config.hide).visible(false);

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


  var table = $('#TeamStats').DataTable({
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
        {"data": "TeamName", "sortable": true, 'searchable': true, 'orderSequence': AscFirst, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['TeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['TeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('TeamID', DataObject['TeamID']);
        }},
        {"data": "ConferenceID__ConferenceName", "sortable": true, 'visible': true, 'orderSequence': AscFirst},
        {"data": "NationalRank", "sortable": true, 'visible': true, 'className': 'center-text col-group','orderSequence':AscFirst},
        //NationalRank
        {"data": "GamesPlayed", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Wins", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Losses", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':DescFirst},

          {"data": "Top25_GamesPlayed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Top25_Wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Top25_Losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':AscFirst},
          {"data": "Top25_WinPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},

          {"data": "Heisman_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Natl_AllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Natl_PreSeasonAllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Natl_POTW_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Conf_AllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Conf_PreSeasonAllAmericans_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Conf_POTW_Count", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},

          {"data": "NationalChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "ConferenceChampionshipWins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Bowl_GamesPlayed", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Bowl_Wins", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Bowl_Losses", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Bowl_WinPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},

      ],
      'order': [[ 2, "asc" ]],
  });



    $('#TeamStats tbody').on('click', '.details-control', function () {
      //console.log('clicked', this, SelectedTeamID);

      var tr = $(this).parent();
      $(tr).addClass('shown');
      var SelectedTeamID = $(tr).attr('TeamID');
      var row = table.row( tr );

      if ( row.child.isShown() ) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
      }
      else {
          // Open this row
          var data = row.data()
          var formattedContent = DrawTeamInfo(data, WorldID, SelectedTeamID);
          console.log(formattedContent,'formattedContent');
          row.child( formattedContent, 'teamTableBorder' ).show();
          var childrow = row.child();
          console.log(childrow, 'childrow');

          var teamcolor = data.TeamColor_Primary_HEX;
          childrow.find('td').css('border-left-color', teamcolor)

          tr.addClass('shown');
      }


    });


}




$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamStatData = $('#team-data')[0];
  TeamStatData = JSON.parse(TeamStatData.textContent);
  GetTeamStats(WorldID, TeamStatData);

});
