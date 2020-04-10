
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

function GetPlayerStats(WorldID, data){

  console.log('In PlayerStats!', data);


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
    'Point Margin': 3,
    'Total Offense': 8,
    'Total Defense': 8,
    'Passing - OFF': 12,
    'Rushing - OFF': 6,
    'Receiving - OFF': 6,
    'Downs - OFF': 12,
    'Passing - DEF': 12,
    'Rushing - DEF': 6,
    'Kicking': 11,
    'Punting': 5,
    'Returning': 9,
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
        columns:[1],
        collapse: 'Filter Team',
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
        {"data": "Points_PerGame", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':["desc", 'asc']},
        {"data": "Opponent_Points_PerGame", "sortable": true, 'visible': true, 'className': 'center-text','orderSequence':["asc", 'desc']},
        {"data": "MOV", "sortable": true, 'visible': true, 'className': 'col-group center-text', 'orderSequence':["desc", 'asc']},
        {"data": "Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Yards_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':DescFirst},
        {"data": "PAS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_Yards_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':DescFirst},
        {"data": "RUS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "RUS_Yards_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':DescFirst},
        {"data": "Points", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Points_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "Opponent_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Opponent_Yards_PerGame", "sortable": true, 'visible': false,'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "Opponent_PAS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Opponent_PAS_Yards_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':DescFirst},
        {"data": "Opponent_RUS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Opponent_RUS_Yards_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text','orderSequence':DescFirst},
        {"data": "Opponent_Points", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "Opponent_Points_PerGame", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "PAS_Completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_Attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_CompletionPercentage", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_Yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
        {"data": "PAS_YardsPerAttempt", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
        {"data": "PAS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_INT", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_Sacks", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_SackYards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "PAS_RTG", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "RUS_Carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "RUS_Yards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
        {"data": "RUS_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "RUS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "RUS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
        {"data": "RUS_TD", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
        {"data": "REC_Receptions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "REC_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "REC_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "REC_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "REC_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "REC_TD", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
          {"data": "FirstDowns", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FirstDowns_Rush", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "FirstDowns_Pass", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "FirstDowns_Penalties", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
          {"data": "ThirdDownConversion", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "ThirdDownAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "ThirdDownPercentage", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
          {"data": "FourthDownConversion", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FourthDownAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FourthDownPercentage", "sortable": true, 'visible': false,'className': 'col-group center-text',  'orderSequence':DescFirst},
          {"data": "Penalties", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PenaltyYards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_Completions", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_Attempts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_CompletionPercentage", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "Opponent_PAS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_YardsPerAttempt", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_PAS_INT", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "Opponent_PAS_Sacks", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "Opponent_PAS_SackYards", "sortable": true, 'visible': false,'className': 'center-text', 'orderSequence':DescFirst},
          {"data": "Opponent_PAS_RTG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_Carries", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_YPC", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_YPG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "Opponent_RUS_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FGM", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FGA", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FGPercent", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
          {"data": "FG_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FG29", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FG39", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FG49", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "FG50", "sortable": true, 'visible': false, 'className': 'col-group center-text', 'orderSequence':DescFirst},
          {"data": "XPM", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "XPA", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "XPPercent", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PNT_Punts", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PNT_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PNT_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PNT_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "PNT_NET", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_PNT_ATT", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_PNT_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_PNT_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_PNT_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_PNT_TD", "sortable": true, 'visible': false,'className': 'col-group center-text',  'orderSequence':DescFirst},
          {"data": "RET_KCK_ATT", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_KCK_Yards", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_KCK_AVG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_KCK_LNG", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
          {"data": "RET_KCK_TD", "sortable": true, 'visible': false, 'className': 'center-text','orderSequence':DescFirst},
      ],
      'order': [[ 2, "asc" ]],
  });


    $('#TeamStats tbody').on('click', 'tr', function () {
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
        }
      })
    });

/*
     table.button( 4 ).action( function () {
       console.log('Action for ', this);
         this.active( true );
         table.button( 1 ).active( false );
         table.button( 2 ).active( false );
         table.button( 3 ).active( false );

         // ... set button index 1's mode of operation
     } );
  */
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
      var ClickedTabParent = ClickedTab.closest('#team-highlight-info-selection-bar').attr('id');

      $.each($('#'+ClickedTabParent+' > .selected-highlight-tab'), function(index, tab){
        var TargetTab = $(tab);
        $(TargetTab).removeClass('selected-highlight-tab');
        var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
        $('#'+TargetTabContent).addClass('w3-hide');
        var TargetTabParent = TargetTab.closest('#team-highlight-info-selection-bar').attr('id');

      });

      $(ClickedTab).addClass('selected-highlight-tab');
      $('#'+ClickedTabContent).removeClass('w3-hide')

    });
}




$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamStatData = $('#team-stat-data')[0];
  TeamStatData = JSON.parse(TeamStatData.textContent);
  GetPlayerStats(WorldID, TeamStatData);

});
