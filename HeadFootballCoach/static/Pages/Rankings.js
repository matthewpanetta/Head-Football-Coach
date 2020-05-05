function ordinal_suffix_of(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert, overrides=undefined, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));

  if (face == '' || face == undefined){
    return 0;
  }
  if (TeamJerseyInvert == true) {
    console.log('overrides', overrides);
    overrides.teamColors.pop();
    overrides.teamColors.unshift('#FFFFFF');
  }

  //overrides['jersey'] = {'id': TeamJerseyStyle}

  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  display(DOMID, face, overrides);
}


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

function PopulateTop25(WorldID, data){

  console.log('In PopulateTopTeams!', data)


  var table = $('#Top25Table').DataTable({
      "dom": 'rt',
      fixedHeader: true,
      //"serverSide": true,
      "filter": false,
      "ordering": true,
      "pageLength": 25,
      "lengthChange" : false,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "data": data,
      "columns": [
        {"data": "NationalRank", "sortable": true, 'className': 'Top25RankNumber', 'searchable': true,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).attr('style', 'border-left-color: #' + DataObject['TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).html('<span>'+StringValue+'</span>')
            $(td).append('<span class="font12 w3-margin-left '+DataObject.NationalRankDeltaClass+'">'+DataObject.NationalRankDeltaSymbol+DataObject.NationalRankDeltaShow+'</span>')
        }},
          {"data": "TeamFullName", "searchable": true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html(`<a href='`+DataObject['TeamHref']+`'><img class='worldTeamStatLogo padding-right' src='`+DataObject['TeamSeasonID__TeamID__TeamLogoURL']+`'/>`+StringValue+`</a>`);
            $(td).parent().attr('TeamID', DataObject['TeamSeasonID__TeamID']);
          }},
          {"data": "WinsLosses", "sortable": true, 'className': 'hide-small', 'orderSequence':["desc"]},
          {"data": "LastWeekGame", "sortable": true, 'searchable': true, "fnCreatedCell": function (td, LastWeekObject, DataObject, iRow, iCol) {
            if (LastWeekObject == 'BYE'){
              $(td).html('BYE')
            }
            else{
              $(td).html('<a href="'+LastWeekObject.GameHref+'">'+LastWeekObject.Points +'-'+ LastWeekObject.OpponentPoints+' </a>')
              $(td).append('<span class="'+LastWeekObject.WinLossLetter+'">'+LastWeekObject.WinLossLetter+'</span>');
              $(td).append('<span class="hide-small"> '+LastWeekObject.VsAtLetter+' </span><a class="hide-small" href="'+LastWeekObject.OpponentTeamHref+'">'+LastWeekObject.OpponentNationalRankDisplay+' ' + LastWeekObject.OpponentTeamName+'</a>');
            }
          }},
          {"data": "ThisWeekGame", "sortable": true, 'searchable': true, 'className': 'hide-small', "fnCreatedCell": function (td, ThisWeekObject, DataObject, iRow, iCol) {
            console.log('LastWeekObject', ThisWeekObject)
            if (ThisWeekObject == 'BYE'){
              $(td).html('BYE')
            }
            else{
              $(td).html('<span> '+ThisWeekObject.VsAtLetter+' </span><a href="'+ThisWeekObject.OpponentTeamHref+'">'+ThisWeekObject.OpponentNationalRankDisplay+' ' + ThisWeekObject.OpponentTeamName+'</a>');
            }
          }},
          {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},

      ],
      'order': [[ 0, "asc" ]],
  });


  $('#Top25Table tbody').on('click', '.details-control', function () {
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

        var teamcolor = data.TeamSeasonID__TeamID__TeamColor_Primary_HEX;
        childrow.find('td').css('border-left-color', teamcolor)
        //childrow.css('background-color', '#'+teamcolor+'33');

        tr.addClass('shown');
    }


  })

  $(function() {
    var $sidebar   = $("#teamHighlight"),
        $window    = $(window),
        offset     = $sidebar.offset(),
        topPadding = 15;

    $window.scroll(function() {
        if ($window.scrollTop() > offset.top) {
            $sidebar.stop().animate({
                marginTop: $window.scrollTop() - offset.top + topPadding
            });
        } else {
            $sidebar.stop().animate({
                marginTop: 0
            });
        }
    });

});


    $('.highlight-tab').on('click', function(event, target) {

      var ClickedTab = $(event.target)
      var ClickedTabContent = ClickedTab.attr('id').replace('-tab', '');
      var ClickedTabParent = ClickedTab.closest('#player-highlight-info-selection-bar').attr('id');

      $.each($('#'+ClickedTabParent+' > .selected-highlight-tab'), function(index, tab){
        var TargetTab = $(tab);
        $(TargetTab).removeClass('selected-highlight-tab');
        var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
        $('#'+TargetTabContent).addClass('w3-hide');
        var TargetTabParent = TargetTab.closest('#player-highlight-info-selection-bar').attr('id');

      });

      $(ClickedTab).addClass('selected-highlight-tab');
      $('#'+ClickedTabContent).removeClass('w3-hide')

    });
}




$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TopTeamsData = $('#top-teams-data')[0];
  console.log('TopTeamsData', TopTeamsData)
  TopTeamsData = JSON.parse(TopTeamsData.textContent);
  PopulateTop25(WorldID, TopTeamsData);


});
