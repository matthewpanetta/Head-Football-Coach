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


$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID    = parseInt($(DataPassthruHolder).attr('TeamID'));
  var AvailablePlayerData = $('#available-player-data')[0];
  AvailablePlayerData = JSON.parse(AvailablePlayerData.textContent);

  BuildDepthCharts(WorldID, TeamID, AvailablePlayerData);

});

function AddPositionsToTable(){

  $('.player-name-position').remove();
  $.each($('option:selected'), function(){
    var SelectedPlayerTeamSeasonID = $(this).attr('playerteamseasonid');
    var Position = $(this).parent().attr('positionabbreviation');
    var SelectedRows = $('.AvailablePlayerList').find('tr[playerteamseasonid="'+SelectedPlayerTeamSeasonID+'"] .player-name');
    $(SelectedRows).append('<span class="font10 player-name-position"> '+Position+'</span>')
  });

}


function BuildDepthCharts(WorldID, TeamID, AvailablePlayerData) {

  console.log('AvailablePlayerData', AvailablePlayerData);
  var DescFirst = ["desc", 'asc'];


    var ColCategories = {
      'Base': 3,
      'Physical <i class="fas fa-chart-line"></i>': 6,
      'Pass <i class="fas fa-chart-line"></i>': 7,
      'Rush <i class="fas fa-chart-line"></i>': 5,
      'Rec <i class="fas fa-chart-line"></i>': 6,
      'Block <i class="fas fa-chart-line"></i>': 6,
      'DL <i class="fas fa-chart-line"></i>': 6,
      'LB <i class="fas fa-chart-line"></i>': 8,
      'DB <i class="fas fa-chart-line"></i>': 6,
      'Kick <i class="fas fa-chart-line"></i>': 4,

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


    var ButtonList = [{
        extend: 'searchPanes',
        config: {
          cascadePanes: true,
          viewTotal: false, //maybe true later - TODO
          columns:[2],
          collapse: 'Filter Players',
        },
        className: 'w3-button w3-small w3-round-large'

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
                          console.log('config', e, dt, node, config)
                          dt.columns(config.show).visible(true);
                          dt.columns(config.hide).visible(false);

                         $(".dt-buttons").find("button").removeClass("active");
                         node.addClass("active");

                   }}
      ButtonList.push(ButtonObj)
    });

    console.log('ButtonList', ButtonList);

//playerteamseasonid='{{Player.PlayerTeamSeasonID}}' position='{{Player.PositionID__PositionAbbreviation}}'
  var AvailableTables = $('.AvailablePlayerList').DataTable({
      dom: 'Brt',
      'buttons':ButtonList,
      'ordering': true,
      'sorting': true,
      "filter": true,
      'paging': false,
      'data': AvailablePlayerData,
      fixedHeader: true,
      columns: [
        {"data": "playerteamseason__TeamSeasonID__TeamID__TeamName", "sortable": true, 'searchable': true,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['PlayerTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['playerteamseason__TeamSeasonID__TeamID__TeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('PlayerTeamSeasonID', DataObject['PlayerTeamSeasonID']);
        }},
        {"data": "PlayerName", "sortable": true, 'visible': true, 'className': 'player-name', 'orderSequence':DescFirst, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['PlayerHref']+"'>"+StringValue+"</a>");
            $(td).append('<span class="font10 player-name-position">'+''+'</span>')
        }}, //PlayerHref
        {"data": "PositionID__PositionAbbreviation", "sortable": true, 'visible': true, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__OverallRating", "sortable": true, 'visible': true, 'orderSequence':DescFirst},

        {"data": "playerseasonskill__Speed_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Strength_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Agility_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Acceleration_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Jumping_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Awareness_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_QB", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ShortThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__MediumThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__DeepThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ThrowPower_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ThrowOnRun_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__PlayAction_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_RB", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__BallCarrierVision_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Elusiveness_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__BreakTackle_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Carrying_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_WR", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_TE", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Catching_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__CatchInTraffic_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Release_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__RouteRunning_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_OT", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_OG", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_OC", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__PassBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__RunBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ImpactBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_DE", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_DT", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Tackle_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__HitPower_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__PassRush_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__BlockShedding_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_OLB", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_MLB", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Tackle_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__HitPower_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__PassRush_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__BlockShedding_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ManCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ZoneCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_CB", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_S", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__Tackle_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__HitPower_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ManCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__ZoneCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},

        {"data": "OverallRating_K", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "OverallRating_P", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__KickPower_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "playerseasonskill__KickAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
      ],
      'info': false,
      'order': [[ 3, "desc" ]],
      initComplete: function(){
        AddPositionsToTable();
        $('select').on('change', function(){
          AddPositionsToTable();
        });
      }
  });

  $.ajaxSetup({
    beforeSend: function(xhr, settings) {
      // if not safe, set csrftoken
      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });




  $('button.save-depth-chart').click(function(){
    var TeamDepthChart = [];
    var Starters = {};
    var Positions = {};
    $('.w3-select').children('option:selected').each(function(){
      var Pos = $(this).parent().first().attr('positionabbreviation');
      var DepthChart = {
        'PositionAbbreviation': Pos,
        'DepthPosition': parseInt($(this).parent().first().attr('depthposition')),
        'PlayerTeamSeasonID': parseInt($(this).val())
      }

      var PositionGroup = $(this).closest('.tab-content').attr('id');
      if (!(PositionGroup in Starters)){
        Starters[PositionGroup] = []
      }
      if (DepthChart['PlayerTeamSeasonID'] > 0 ) {
        if ($(this).closest('td').hasClass('is-starter')){
          Starters[PositionGroup].push({'Name': $(this).text(), 'PlayerTeamSeasonID': parseInt($(this).val())})
        }

        if (!( Pos in Positions )) {
          Positions[Pos] = [];
        }
        Positions[Pos].push({'Name': $(this).text(), 'PlayerTeamSeasonID': parseInt($(this).val())});

        TeamDepthChart.push(DepthChart);
      }
    });

    var DoPost = true;
    var StarterPlayerTeamSeasonIDList = {};
    $.each(Starters, function(key, PlayerList){
      StarterPlayerTeamSeasonIDList[key] = [];
      $.each(PlayerList, function(ind, obj){
        if ( $.inArray(obj.PlayerTeamSeasonID, StarterPlayerTeamSeasonIDList[key]) == -1 ) {
          StarterPlayerTeamSeasonIDList[key].push(obj.PlayerTeamSeasonID );
        }
        else {
          DoPost = false;
          alert('Cannot save depth chart. '+ obj.Name + ' is starting twice.');
        }
      })

    });

    $.each(Positions, function(Pos,PosList){
      var PositionPlayerTeamSeasonIDList = [];
      $.each(PosList, function(ind, obj){
        if ( $.inArray(obj.PlayerTeamSeasonID, PositionPlayerTeamSeasonIDList) == -1 ) {
          PositionPlayerTeamSeasonIDList.push(obj.PlayerTeamSeasonID );
        }
        else {
          DoPost = false;
          alert('Cannot save depth chart. '+ obj.Name + ' is listed twice for position ' + Pos);
        }
      })
    })

    if (DoPost) {
      $.ajax({
        method: "POST",
        url: "/World/"+WorldID+"/Team/"+TeamID+"/SetTeamDepthChart",
        data: {
          'TeamDepthChart': TeamDepthChart,
          csrfmiddlewaretoken: csrftoken
        },
        dataType: 'json',
        success: function(res, status) {
          console.log(res, status);
          alert('Depth chart saved successfully');
        },
        error: function(res) {
          alert(res.status);
        }
      });
    }
  });


//$('.w3-select').children('option:selected').each(function(){console.log($(this).parent().first().attr('positionabbreviation'), $(this).parent().first().attr('depthposition'), $(this).val())})

}
