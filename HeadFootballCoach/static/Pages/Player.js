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


//PlayerSeasonStatTableClone

function PopulatePlayerSeasonStats(WorldID, PlayerID){

  console.log('Getting player stats!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Player/"+PlayerID+'/PlayerStats',
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);

      $.each(res, function(ind, obj){
        DrawPlayerStats(obj);
      })

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}

function DrawPlayerStats(data){

  var columns = [
  ];
  var columns = $.grep(data.Stats, function(n, i){
    return n.DisplayColumn
  });



  var Parent = $('#PlayerSeasonStatTableClone').parent();

  var ParentRow = $('<div></div>').addClass('margin-top-24').addClass('w3-row-padding');
  $(ParentRow).appendTo(Parent);

  var ParentCol = $('<div></div>').addClass('w3-col').addClass('s8');
  $(ParentCol).appendTo(ParentRow);

  var ParentCard = $('<div></div>').addClass('w3-card');
  $(ParentCard).appendTo(ParentCol);


  var CareerHighParentCol = $('<div></div>').addClass('w3-col').addClass('s4');
  $(CareerHighParentCol).appendTo(ParentRow);

  var CareerHighParentCard = $('<div></div>').addClass('w3-card');
  $(CareerHighParentCard).appendTo(CareerHighParentCol);


  var CareerHighTable = $('#PlayerCareerHighTableClone').clone().removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerCareerHighTable-'+data.StatGroupName)

  var Table = $('#PlayerSeasonStatTableClone').clone().removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerSeasonStatTable-'+data.StatGroupName)

  if (data.CareerStats.length > 0){
    $.each(columns, function(){
      $(Table).find('tfoot tr').append('<td class="bold"></td>');
    });
  }

  $('<span>'+data.StatGroupName+' Career Highs</span>').addClass('table_title').addClass('margin-left-12').appendTo(CareerHighParentCard);
  CareerHighTable.appendTo(CareerHighParentCard);
  var CareerHighDataTable = $(CareerHighTable).DataTable({
    "data": data.CareerHighs,
    'paging': false,
    'searching': false,
    'info': false,
    'ordering': false,
    "columns": [
       {"data": "Field", "sortable": false, 'visible': true},
        {"data": "Value", "sortable": false, 'visible': true},
        {"data": "Week", "sortable": false, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("vs. <img class='worldTeamStatLogo padding-right' src='"+DataObject['OpposingTeamLogo']+"'/><a href='"+DataObject['GameHref']+"'>"+StringValue+"</a>");
          //  $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
          //  $(td).addClass('teamTableBorder');
        }},

    ],
  });


  $('<span>'+data.StatGroupName+' Season Stats</span>').addClass('table_title').addClass('margin-left-12').appendTo(ParentCard);
  Table.appendTo(ParentCard);
  var DataTable = $(Table).DataTable( {
    data: data.SeasonStats,
    columns: columns,
    "paging": false,
    'searching': false,
    'info': false,
  });


  var Counter = 0;
  DataTable.columns().every( function () {
      // ... do something with data(), or this.nodes(), etc
      $(this.footer()).html(data.CareerStats[Counter])
      Counter +=1;
  } );

  $(Table).find('th').addClass('teamColorBorder');
  $(CareerHighTable).find('th').addClass('teamColorBorder');

}

function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));
  var PrimaryColor    = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryJerseyColor');

  var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}
  overrides['jersey'] = {'id': 'football'}

  display('PlayerFace', face, overrides);
}


function PopulatePlayerStats(WorldID, GameStatData, RecentGameStatData, PlayerStatsShow, PrimaryStatShow) {

  console.log('GameStatDate, RecentGameStatData', GameStatData, RecentGameStatData, PlayerStatsShow, PrimaryStatShow);
  var DescFirst = ["desc", 'asc'];


    var ColCategories = {
      'Base': 3,
      'Passing': 8,
      'Rushing': 7,
      'Receiving': 6,
      'Blocking': 2,
      'Defense': 7,
      'Kicking': 4,
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

    var InitialButtonToClick = undefined;
    $.each(ColCategories, function(key, val){
      if (key == 'Base'){
        return true;
      }

      if (PlayerStatsShow[key] == false){
        return true;
      }

      var ButtonObj = {extend: 'colvisGroup',
                        text: key,
                        show: ShowColumnMap[key],
                        hide: HideColumnMap[key],
                        className: 'stats-button-'+key,
                        action: function( e, dt, node, config){
                          console.log('config', e, dt, node, config)
                          dt.columns(config.show).visible(true);
                          dt.columns(config.hide).visible(false);

                          $(node).parent().find('button').removeClass("active");

                         //$(".dt-buttons").find("button").removeClass("active");
                         node.addClass("active");

                   }}
      ButtonList.push(ButtonObj)
    });

    console.log('ButtonList', ButtonList);

//playerteamseasonid='{{Player.PlayerTeamSeasonID}}' position='{{Player.PositionID__PositionAbbreviation}}'
  var RecentGameStats = $('#RecentGameStats').DataTable({
      dom: 'Brt',
      'buttons':ButtonList,
      'ordering': true,
      'sorting': false,
      "filter": true,
      'paging': false,
      scrollX: true,
      'data': RecentGameStatData,
      autoWidth: true,
      columns: [
        {"data": "OpponentTeamName", "sortable": true, 'searchable': true,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['OpponentTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['OpponentTeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['OpponentTeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('PlayerID', DataObject['PlayerID']);
        }},
        {"data": "TeamGameID__GameID__WeekID__WeekNumber", "sortable": true, 'visible': true, 'orderSequence':DescFirst,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html(DataObject.TeamGameID__GameID__WeekID__WeekName);
        }},
        {"data": "GameOutcomeLetter", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':DescFirst,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<span class='"+StringValue+"'>"+StringValue+" </span><a href='"+DataObject.GameHref+"'> "+ DataObject.GameScoreDisplay+"</a>");
        }},
        {"data": "PAS_Completions", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_Attempts", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_CompletionPercentage", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_Yards", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_YardsPerAttempt", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_TD", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_INT", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_SacksAndYards", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "RUS_Carries", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_Yards", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_YardsPerCarry", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_TD", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Fumbles", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_20", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_LNG", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "REC_Targets", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_Receptions", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_Yards", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_YardsPerCatch", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_TD", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_LNG", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "BLK_Pancakes", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "BLK_Sacks", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "DEF_Tackles", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_TacklesForLoss", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_Sacks", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_INT", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_Deflections", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Forced", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Recovered", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "KCK_FGM", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_FGA", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_XPM", "sortable": false, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_FGA", "sortable": false, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

      ],
      'info': false,
      'order': [[ 1, "asc" ]],
      'initComplete': function(){
        $('.stats-button-'+PrimaryStatShow).click();
      }
  });

  var FullGameStats = $('#FullGameStats').DataTable({
      dom: 'Brt',
      'buttons':ButtonList,
      'ordering': true,
      'sorting': true,
      "filter": true,
      'paging': false,
      'data': GameStatData,
      columns: [
        {"data": "OpponentTeamName", "sortable": true, 'searchable': true,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['OpponentTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['OpponentTeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['OpponentTeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('PlayerID', DataObject['PlayerID']);
        }},
        {"data": "TeamGameID__GameID__WeekID__WeekName", "sortable": true, 'visible': true, 'orderSequence':DescFirst},
        {"data": "GameOutcomeLetter", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':DescFirst,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<span class='"+StringValue+"'>"+StringValue+" </span><a href='"+DataObject.GameHref+"'> "+ DataObject.GameScoreDisplay+"</a>");
        }},
        {"data": "PAS_Completions", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_Attempts", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_CompletionPercentage", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_Yards", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_YardsPerAttempt", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_TD", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_INT", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "PAS_SacksAndYards", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "RUS_Carries", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_Yards", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_YardsPerCarry", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_TD", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Fumbles", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_20", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "RUS_LNG", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "REC_Targets", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_Receptions", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_Yards", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_YardsPerCatch", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_TD", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "REC_LNG", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "BLK_Pancakes", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "BLK_Sacks", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "DEF_Tackles", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_TacklesForLoss", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_Sacks", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_INT", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "DEF_Deflections", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Forced", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "FUM_Recovered", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

        {"data": "KCK_FGM", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_FGA", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_XPM", "sortable": true, 'visible': false, 'orderSequence':DescFirst},
        {"data": "KCK_FGA", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},

      ],
      'info': false,
      'order': [[ 1, "asc" ]],
      'initComplete': function(){
        $('.stats-button-'+PrimaryStatShow).click();
      }
  });





}


$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID  = parseInt($(DataPassthruHolder).attr('PlayerID'));

  //PopulatePlayerSeasonStats(WorldID, PlayerID)
  var PrimaryStatShow = $('#primary-stat-show')[0];
  PrimaryStatShow = PrimaryStatShow.textContent.replace(/"/g, '');

  var GameStatData = $('#game-stat-data')[0];
  GameStatData = JSON.parse(GameStatData.textContent);
  var RecentGameStatData = $('#recent-game-stat-data')[0];
  RecentGameStatData = JSON.parse(RecentGameStatData.textContent);
  var PlayerStatsShow = $('#player-stats-show')[0];
  PlayerStatsShow = JSON.parse(PlayerStatsShow.textContent);

  PopulatePlayerStats(WorldID, GameStatData, RecentGameStatData, PlayerStatsShow, PrimaryStatShow);



  PopulatePlayerSeasonStats(WorldID, PlayerID);

});
