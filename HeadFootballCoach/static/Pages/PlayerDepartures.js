function DrawPlayerInfo(data, WorldID, PlayerID){
  var div = $(`
    <div class='w3-row-padding' style='text-align: initial;' id='playerinfo-`+PlayerID+`'>
      <div class='w3-col s3'>
        <img class='playerTeamLogo' src-field='playerteamseason__TeamSeasonID__TeamID__TeamLogoURL'  style='width: 80%; height: inherit; margin-left: 0%;'>
        <div class="PlayerFace" style='width: 150px; height: 250px; margin-left: -50%;'>

        </div>
      </div>
      <div class='w3-col s4 vertical-align-middle'>
        <div class=''>
          <div class='playerHeaderInfo'>
            <span data-field="PlayerFirstName" class='playerFirstName'>
            </span>
            <span data-field="PlayerLastName" class='playerLastName' style='margin-top: 0px; margin-bottom: 0px;'>

            </span>
            <div class='playerOverviewInfo'>
              <a href-field="PlayerTeamHref"><span data-field="playerteamseason__TeamSeasonID__TeamID__TeamName"></span> <span data-field="playerteamseason__TeamSeasonID__TeamID__TeamNickname"></span></a>
              | #<span data-field="JerseyNumber"></span> | <span data-field="Position"></span>
            </div>
            <div class='playerOverviewInfo italic player-captain'>
              <span html-field="TeamCaptainIcon"></span><span data-field="TeamCaptain"></span>
            </div>

          </div>
          <ul class='playerHeaderBio' style='border-color:{{playerTeam.TeamColor_Primary_HEX}}'>
            <li class='playerHeaderClass'>
              <div class='playerHeaderBioDescription'>CLASS</div>
              <div class="player-class">
                <span data-field="playerteamseason__ClassID__ClassName"></span><span  html-field="RedshirtIcon"></span>
              </div>
            </li>
            <li class='playerHeaderHtWt'>
              <div class='playerHeaderBioDescription'>HT/WT</div>
              <div><span data-field="HeightFormatted"></span>, <span data-field="WeightFormatted"></span></div>
            </li>
            <li class='playerHeaderHometown'>
              <div class='playerHeaderBioDescription'>HOMETOWN</div>
              <div><span data-field="HometownAndState"></span></div>
            </li>
            <li class='playerHeaderHometown'>
              <div class='playerHeaderBioDescription'>OVR</div>
              <div><span data-field="playerteamseason__playerteamseasonskill__OverallRating"></span></div>
            </li>
          </ul>

        </div>
      </div>
      <div class='w3-col s5'>
      <div class="w3-row-padding">
                <div id='' class="w3-bar w3-row-padding player-highlight-info-selection-bar">
                  <button class='w3-button w3-bar-item highlight-tab selected-highlight-tab highlight-ratings-tab' type="button" name="button" id="highlight-ratings-tab">Ratings</button>
                  <button class='w3-button w3-bar-item w3-hide highlight-tab highlight-stats-tab' type="button" name="button" id="highlight-stats-tab">Stats</button>
                  <button class='w3-button w3-bar-item highlight-tab highlight-awards-tab' type="button" name="button" id="highlight-awards-tab">Awards</button>
                  <button class='w3-button w3-bar-item highlight-tab highlight-recruiting-tab' type="button" name="button" id="highlight-recruiting-tab">Recruiting</button>
                  <button class='w3-button w3-bar-item highlight-tab highlight-actions-tab' type="button" name="button" id="highlight-actions-tab">Actions</button>
                </div>
              </div>
              <div class='w3-row-padding'>
                <div style="width: 100%;" class='player-highlight-info-content'>
                  <div  class="w3-row-padding highlight-ratings">

                  </div>
                  <div class="w3-container w3-hide highlight-stats">
                    stats here
                  </div>
                  <div class="w3-container w3-hide highlight-awards">
                  </div>
                  <div class="w3-container w3-hide highlight-recruiting">
                    recruting here
                  </div>
                  <div class="w3-container w3-hide highlight-actions w3-row-padding">
                    <table class=' w3-table' style='width: 50%;'>
                    </table>
                  </div>
                </div>
              </div>
      </div>

    </div>
    `);

  $.ajax({
    url: '/World/'+WorldID+'/Player/'+PlayerID+'/PlayerCardInfo',
    success: function (data) {
      console.log('Ajax return', data);

      $(div,' div.w3-hide.w3-row-padding').removeClass('w3-hide');

      var overrides = {"teamColors":["#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'],"#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'],"#FFF"]}

      $('[css-field="OverallCss"].player-highlight-pills').removeClass('elite').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])


      $.each(data.Skills, function(SkillGroup, SkillObj){
        var Container = $('<div class=" w3-col s4"></div>').appendTo($(div).find('.highlight-ratings'));
        $('<div class="w3-margin-top bold">'+SkillGroup+'</div>').appendTo(Container);
        $.each(SkillObj, function(key, val){
          //$('<div class="inline-block min-width-75" style="margin: 2px 2px; "><div class="font10 width100">'+key+'  </div>  <div class="font20 width100">'+val+'</div></div>').appendTo(Container);
          $(`<div>`+key+`</div>
            <div class="w3-grey w3-round-xlarge statBar inline-block" style='width: 80%;'>
              <div class="w3-container  w3-round-xlarge   `+NumberToGradeClass(val)+`-Fill" style="width:`+val+`%; height: 8px;"></div>
            </div>
            <span>`+val+`</span>`).appendTo(Container);
        });
      });


      console.log('Awards', data.Awards)

      if (Object.keys(data.Awards).length > 0){
        $('#highlight-awards-tab').removeClass('w3-hide');
        $('<div class=""></div>').appendTo($(div).find( '.highlight-awards'));
        var Container = $('<ul class="w3-ul w3-small"></ul>').appendTo($(div).find('.highlight-awards > div'));
      }
      else {
        console.log('hiding awards tab', $(div).find('.highlight-awards-tab'));
        $(div).find('.highlight-awards-tab').addClass('w3-hide');
        if ($(div).find( '.highlight-awards-tab').hasClass('selected-highlight-tab')){
          $(div).find('.highlight-ratings-tab').click()
        }
      }

      $.each(data.Awards, function(AwardName, AwardCount){
        console.log('AwardName, AwardCount', AwardName, AwardCount, Container)
        $('<li>'+AwardCount+'x '+AwardName+' </li>').appendTo(Container);

      });

      if (Object.keys(data.Stats).length > 0){
        $(div).find('.highlight-stats-tab').removeClass('w3-hide');
      }
      else {
        $(div).find('.highlight-stats-tab').addClass('w3-hide');
        if ($(div).find('.highlight-stats-tab').hasClass('selected-highlight-tab')){
          $(div).find('.highlight-ratings-tab').click()
        }
      }


      if (Object.keys(data.Actions).length > 0){
        $(div).find('.highlight-actions-tab').removeClass('w3-hide');
        var Container = $(div).find('.highlight-actions table')
      }
      else {
        $(div).find('.highlight-actions-tab').addClass('w3-hide');
        if ($(div).find('.highlight-actions-tab').hasClass('selected-highlight-tab')){
          $(div).find('.highlight-ratings-tab').click()
        }
      }

      $.each(data.Actions, function(ActionCount, Action){
        console.log('ActionName, Action', ActionCount, Action, Container)

        $(`<tr>
            <td style='width:10%;'>`+Action.Icon+`</td>
            <td confirm-info='`+Action.ConfirmInfo+`' response-type='refresh' background-ajax='`+Action.AjaxLink+`' class="w3-button `+Action.Class+` text-left"> `+Action.Display+` </td>
          </tr>`).appendTo(Container);
      });


      $.each(data.Stats, function(StatGroup, StatObj){
        var Container = $('<div class=""></div>').appendTo($(div).find('.highlight-stats'));
        $('<div class="w3-margin-top">'+StatGroup+'</div>').appendTo(Container);
        $('<div class="width100" style="width: 100%;"><table class="tiny highlight-stat-statgroup-'+StatGroup+'" style="width: 100%;"></table> </div>').appendTo(Container);

        var columnNames = Object.keys(StatObj[0]);
        var columns = [];
        for (var i in columnNames) {
          columns.push({data: columnNames[i],
                        title: columnNames[i]});
        }

        console.log("$(div).find('.highlight-stat-statgroup-'+StatGroup)", $(div).find('.highlight-stat-statgroup-'+StatGroup))
        var table = $(div).find('.highlight-stat-statgroup-'+StatGroup).DataTable({
          data: StatObj,
          columns: columns,
          dom: 't',

        });

        $('.highlight-tab').on('click', function(){
          table.columns.adjust().draw();
        })
      });

      $.each(data, function(key, val){

        if (key == 'PlayerFaceJson'){
          var elem = $(div).find('[data-field="'+key+'"]');
          elem = elem[0];
          $(elem).empty();

          $(div).find('.PlayerFace').attr('id', 'PlayerFace-'+data.PlayerID)

          var DOMID ='PlayerFace-'+data.PlayerID;

          if (typeof val === 'string') {
            val = $.parseJSON(val);
          }
          BuildFace(val, data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyStyle'], data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert'], overrides=overrides, DOMID = DOMID);//playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert
        }
        else {
          $(div).find('[html-field="'+key+'"]').html(val);
          $(div).find('[data-field="'+key+'"]').text(val);
          $(div).find('[src-field="'+key+'"]').attr('src', val);
          $(div).find('[href-field="'+key+'"]').attr('href',val);
          $(div).find('[width-field="'+key+'"]').css('width', val + '%');
          $(div).find('[class-grade-field="'+key+'"]').addClass( NumberToGradeClass(val) + '-Fill');

        }
      });

      $(div).find('.highlight-tab').on('click', function(event, target) {

        var ClickedTab = $(event.target)
        var ClickedTabContent = ClickedTab.attr('id').replace('-tab', '');
        var ClickedTabParent = ClickedTab.closest('.player-highlight-info-selection-bar');

        $.each($(ClickedTabParent).find(' .selected-highlight-tab'), function(index, tab){
          var TargetTab = $(tab);
          $(TargetTab).removeClass('selected-highlight-tab');
          var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
          $(div).find('.'+TargetTabContent).addClass('w3-hide');

        });

        $(ClickedTab).addClass('selected-highlight-tab');
        $(div).find( '.'+ClickedTabContent).removeClass('w3-hide')

      });
    }
  });



  return div;
}



function GetPlayerStats(WorldID, data){

  var PositionSortOrderMap = {
      'QB': '01',
      'RB': '02',
      'FB': '03',
      'WR': '04',
      'TE': '05',
      'OT': '06',
      'OG': '07',
      'OC': '08',
      'DE': '09',
      'DT': '10',
      'OLB': '11',
      'MLB': '12',
      'CB': '13',
      'S': '14',
      'K': '15',
      'P': '16',
  };


    var PositionGroupMap = {
        'QB': 'Offense',
        'RB': 'Offense',
        'FB': 'Offense',
        'WR': 'Offense',
        'TE': 'Offense',
        'OT': 'Offense',
        'OG': 'Offense',
        'OC': 'Offense',
        'DE': 'Defense',
        'DT': 'Defense',
        'OLB': 'Defense',
        'MLB': 'Defense',
        'CB': 'Defense',
        'S': 'Defense',
        'K': 'Special Teams',
        'P': 'Special Teams',
    };
  var ClassSortOrderMap = {
      'FR': 1,
      'SO': 2,
      'JR': 3,
      'SR': 4,
  };

      var ColCategories = {
        'Base': 6,
        'PAS <i class="fas fa-list-ol"></i>': 5,
        'RUSH <i class="fas fa-list-ol"></i>': 7,
        'REC <i class="fas fa-list-ol"></i>': 7,
        'DEF <i class="fas fa-list-ol"></i>': 7,
        'PHY <i class="fas fa-chart-line"></i>': 7,
        'PAS <i class="fas fa-chart-line"></i>': 7,
        'RUS <i class="fas fa-chart-line"></i>': 4,
        'REC <i class="fas fa-chart-line"></i>': 4,
        'BLK <i class="fas fa-chart-line"></i>': 3,
        'DEF <i class="fas fa-chart-line"></i>': 7,
        'KCK <i class="fas fa-chart-line"></i>': 2,
        'Expand': 1,
        'Custom': 2
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
          if ((($.inArray( ColNum,  ShowColumnMap['Base'])) == -1) && ($.inArray( ColNum,  ShowColumnMap['Expand']) == -1) && ($.inArray( ColNum,  ShowColumnMap['Custom']) == -1)){
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

      var SearchPaneColumns = [0,2,3,6].concat(ShowColumnMap['Custom']);


      var ButtonList = [{
          extend: 'searchPanes',
          config: {
            cascadePanes: true,
            viewTotal: false, //maybe true later - TODO
            columns:SearchPaneColumns,
            collapse: 'Filter Players',
          },

      }]

      $.each(ColCategories, function(key, val){
        if (key == 'Base' || key == 'Expand'  || key == 'Custom' ){
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

  var table = $('#PlayerStats').DataTable({
      "dom": 'Brtp',
      "scrollX": true,
    //fixedHeader: true,
      //"serverSide": true,
      "filter": true,
      "ordering": true,
      "lengthChange" : false,
      "pageLength": 25,
      "pagingType": "full_numbers",
      "paginationType": "full_numbers",
      "paging": true,
      "data": data,
       'buttons':ButtonList,
       'columnDefs': [
         {
          searchPanes: {
            show: true,
              options:[
                  {
                      label: 'Passing Qualifiers',
                      value: function(rowData, rowIdx){
                          return rowData['TeamGamesPlayed'] > 0 && rowData['PAS_Attempts'] > 10*rowData['TeamGamesPlayed'];
                      }
                  },
                  {
                      label: 'Rushing Qualifiers',
                      value: function(rowData, rowIdx){
                        return rowData['TeamGamesPlayed'] > 0 && rowData['RUS_Carries'] > 10*rowData['TeamGamesPlayed'];
                      }
                  }
              ],
              combiner: 'and'
          },
          targets: [67]
        },
        {
         targets: [68]
       }
      ],
      "columns": [
        {"data": "playerteamseason__TeamSeasonID__TeamID__TeamName", "sortable": true, 'className': 'left-text', 'searchable': true,"fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).html("<a href='"+DataObject['PlayerTeamHref']+"'><img class='worldTeamStatLogo padding-right' src='"+DataObject['playerteamseason__TeamSeasonID__TeamID__TeamLogoURL']+"'/>"+StringValue+"</a>");
            $(td).attr('style', 'border-left-color: #' + DataObject['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
            $(td).addClass('teamTableBorder');
            $(td).parent().attr('PlayerID', DataObject['PlayerID']);
        }},
          {"data": "PlayerName", "searchable": true, 'className': 'left-text', "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
              $(td).html("<a href='"+DataObject['PlayerHref']+"'>"+StringValue+"</a>");
          }},
          {"data": "playerteamseason__ClassID__ClassAbbreviation", render: function ( data, type, row ) {
                                var returnVal = data;
                                if ( type === 'sort' ) {
                                    returnVal = ClassSortOrderMap[data];
                                }
                                return returnVal;
                            },"sortable": true, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
                                $(td).html(StringValue);
                                $(td).append('<span class="player-class"></span>')
                                if (DataObject.playerteamseason__RedshirtedThisSeason) {
                                  $(td).find('.player-class').append('<i class="fas fa-tshirt w3-tooltip player-class-icon" style="color: red; margin-left: 4px;"><span style="position:absolute;left:0;bottom:18px" class="w3-text">Player Redshirted</span></i>')
                                }
                            }},
          {"data": "PositionID__PositionAbbreviation", render: function ( data, type, row ) {
                                var returnVal = data;
                                if ( type === 'sort' ) {
                                    returnVal = PositionSortOrderMap[data];
                                }
                                return returnVal;
                            },"sortable": true, 'searchable': true},
          {"data": "playerteamseason__playerteamseasonskill__OverallRating", "sortable": true, 'orderSequence':["desc"]},
          {"data": 'ReasonForLeaving', "sortable": true, 'orderSequence':["desc"], 'className': 'col-group', "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          }},

          {"data": "PAS_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_CompletionPercentage", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "PAS_INT", "sortable": true, 'visible': false,'className': 'col-group', 'orderSequence':["desc"]},

          {"data": "RUS_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_YPC", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_LNG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "RUS_20", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Fumbles", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "REC_Yards", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_Receptions", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_YPC", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_YPG", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_TD", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_Targets", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "REC_LNG", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "DEF_Tackles", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_TacklesForLoss", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_Sacks", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_INT", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "DEF_Deflections", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Forced", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "FUM_Recovered", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__Strength_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Agility_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Speed_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Acceleration_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Stamina_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Jumping_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Awareness_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__ThrowPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ShortThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__MediumThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__DeepThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ThrowOnRun_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ThrowUnderPressure_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__PlayAction_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__Carrying_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Elusiveness_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__BallCarrierVision_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__BreakTackle_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__Catching_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__CatchInTraffic_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__RouteRunning_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Release_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__PassBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__RunBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ImpactBlock_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__PassRush_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__BlockShedding_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Tackle_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__HitPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ManCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__ZoneCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__Press_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

          {"data": "playerteamseason__playerteamseasonskill__KickPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
          {"data": "playerteamseason__playerteamseasonskill__KickAccuracy_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},
          {"data": null, "sortable": false, 'searchable': false, 'className': 'details-control',   "defaultContent": ''},
          {"data": null, 'visible': false,"sortable": false, 'searchable': false,   "defaultContent": ''},
          {"data": null, 'visible': false,"sortable": false, 'searchable': false,  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
            $(td).html(PositionGroupMap[DataObject['PositionID__PositionAbbreviation']]);
          }},
      ],
      'order': [[ 4, "desc" ]],
  });



    $('#PlayerStats tbody').on('click', '.details-control', function () {
      //console.log('clicked', this, SelectedTeamID);

      var tr = $(this).parent();
      $(tr).addClass('shown');
      var PlayerID = $(tr).attr('PlayerID');
      var row = table.row( tr );

      if ( row.child.isShown() ) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
      }
      else {
          // Open this row
          var data = row.data()
          var formattedContent = DrawPlayerInfo(data, WorldID, PlayerID);
          row.child( formattedContent, 'teamTableBorder' ).show();
          var childrow = row.child();

          var teamcolor = data.playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX;
          childrow.find('td').css('border-left-color', teamcolor)

          tr.addClass('shown');
      }


    });



}


function GetLeagueLeaders(WorldID){

  console.log('Getting conference standings!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/LeagueLeaders",
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);
      PopulateLeagueLeadersTable(res.LeagueLeaders, WorldID);

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}



function PopulateLeagueLeadersTable(LeagueLeaders, WorldID){
  //console.log('LeagueLeaders', LeagueLeaders);
  var LeaderDisplayTemplate = $('#worldLeagueLeaderRow');
  var LeaderDisplay = undefined;

  var BoxCount = 0;
  $.each(LeagueLeaders, function(index, LeaderGroup){
    //console.log('LeaderGroup', LeaderGroup);

    if (BoxCount % 3 == 0) {
      LeaderDisplay = $(LeaderDisplayTemplate).clone();
      $(LeaderDisplayTemplate).before($(LeaderDisplay));
    }

    var TeamHistoryLeaderTableTemplate = $('#worldLeagueLeadersClone').clone();

    $(TeamHistoryLeaderTableTemplate).removeClass('w3-hide');
    $(TeamHistoryLeaderTableTemplate).removeAttr('id');

    var th = $(TeamHistoryLeaderTableTemplate).find('th[data-field="DisplayName"]');
    $(th).text(LeaderGroup['DisplayName']);
    //console.log(TeamHistoryLeaderTableTemplate);

    $.each(LeaderGroup['Players'], function(ind, Player){
      //console.log('Player', Player);

      var TeamHistoryLeaderRowTemplate = $(TeamHistoryLeaderTableTemplate).find('#worldLeagueLeadersRowClone').clone();

      $(TeamHistoryLeaderRowTemplate).removeClass('w3-hide');
      $(TeamHistoryLeaderRowTemplate).removeAttr('id');

      $.each(Player, function(PlayerAttr,PlayerValue){
        var FieldCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[data-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [data-field="'+PlayerAttr+'"]');
        FieldCell.text(PlayerValue);

        var LinkCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[href-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [href-field="'+PlayerAttr+'"]');
        LinkCell.attr('href', PlayerValue);

        var LinkCell = $(TeamHistoryLeaderRowTemplate).find('.WorldLeagueLeaderRowCell[src-field="'+PlayerAttr+'"], .WorldLeagueLeaderRowCell [src-field="'+PlayerAttr+'"]');
        LinkCell.attr('src', PlayerValue);

      });

      var Table = $(TeamHistoryLeaderTableTemplate).find('table');
      $(Table).removeClass('w3-hide');
      $(Table).append($(TeamHistoryLeaderRowTemplate));

    });

    $(LeaderDisplay).append($(TeamHistoryLeaderTableTemplate));
    BoxCount++;

  });

  $('#worldLeagueLeadersClone').remove();

}



$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerStatData = $('#player-stat-data')[0];
  PlayerStatData = JSON.parse(PlayerStatData.textContent);
  GetPlayerStats(WorldID, PlayerStatData);
  GetLeagueLeaders(WorldID);

});
