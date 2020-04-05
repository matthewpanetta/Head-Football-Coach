

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
          {"data": "WinsLosses", "sortable": true, 'orderSequence':["desc"]},
          {"data": "LastWeekGame", "sortable": true, 'searchable': true, "fnCreatedCell": function (td, LastWeekObject, DataObject, iRow, iCol) {
            console.log('LastWeekObject', LastWeekObject)
            if (LastWeekObject == 'BYE'){
              $(td).html('BYE')
            }
            else{
              $(td).html('<a href="'+LastWeekObject.GameHref+'">'+LastWeekObject.Points +'-'+ LastWeekObject.OpponentPoints+' </a>')
              $(td).append('<span class="'+LastWeekObject.WinLossLetter+'">'+LastWeekObject.WinLossLetter+'</span>');
              $(td).append('<span> '+LastWeekObject.VsAtLetter+' </span><a href="'+LastWeekObject.OpponentTeamHref+'">'+ LastWeekObject.OpponentTeamName+'</a>');
            }
          }},
          {"data": "ConferenceWinsLosses", "sortable": true, 'searchable': true},

      ],
      'order': [[ 0, "asc" ]],
  });


  $('#Top25Table tbody').on('click', 'tr', function () {
    var SelectedTeamID = $(this).attr('TeamID');
    console.log('clicked', this, SelectedTeamID);

    $.ajax({
      url: '/World/'+WorldID+'/Team/'+SelectedTeamID+'/TeamCardInfo',
      success: function (data) {
        console.log('Ajax return', data);

        $('#teamHighlight div.w3-hide.w3-row-padding').removeClass('w3-hide');

        $('#team-highlight-top-color-box').css('background-color', data['TeamColor_Primary_HEX']);
        $('#teamHighlight').css('border-width', '4px 4px 4px 4px').css('border-style', 'solid').css('border-color', data['TeamColor_Secondary_HEX']);
        $('#teamHighlight').css('box-shadow', '0px 2px 12px 0px #'+data['TeamColor_Primary_HEX']);
        var overrides = {"teamColors":["#"+data['TeamColor_Primary_HEX'],"#"+data['TeamColor_Secondary_HEX'],"#000000"]}

        $('[css-field="OverallCss"].team-highlight-pills').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])

        $.each(data, function(key, val){

          $('#teamHighlight').find('[data-field="'+key+'"]').text(val);
          $('#teamHighlight').find('[src-field="'+key+'"]').attr('src', val);

        });

        /*
        $('#highlight-awards').empty();
        if (Object.keys(data.Awards).length > 0){
          $('#highlight-awards-tab').removeClass('w3-hide');
          $('<div class="w3-container"></div>').appendTo($('#highlight-awards'));
          var Container = $('<ul class="w3-ul w3-small"></ul>').appendTo($('#highlight-awards .w3-container'));
        }
        else {
          $('#highlight-awards-tab').addClass('w3-hide');
          if ($('#highlight-awards-tab').hasClass('selected-highlight-tab')){
            $('#highlight-ratings-tab').click()
          }
        }

        $.each(data.Awards, function(AwardName, AwardCount){
          $('<li>'+AwardCount+'x '+AwardName+' </li>').appendTo(Container);

        });
        */


      }
    })

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
