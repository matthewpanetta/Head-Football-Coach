function DrawPlayerInfo(data, WorldID, PlayerID){
  var div = $(`
    <div class='w3-row-padding' style='text-align: initial;' id='playerinfo-`+PlayerID+`'>
      <div class='w3-col s2'>
        <div class="PlayerFace" style='width: 150px; height: 250px; margin-left: 20%;'>

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
              <span data-field="Position"></span>
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
              <div><span data-field="playerteamseason__playerteamseasonskill__Scouted_Overall"></span></div>
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
    url: '/World/'+WorldID+'/Player/'+PlayerID+'/RecruitCardInfo',
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



function DrawRecruitingTable(WorldID, data){

  console.log('DrawRecruitingTable', data);

  var DescFirst = ["desc", "asc"];
  var AscFirst = [ "asc", "desc"];

    var ColCategories = {
      'Base': 9,
      'MEAS <i class="fas fa-ruler"></i>': 5,
      'PHY <i class="fas fa-chart-line"></i>': 7,
      'PAS <i class="fas fa-chart-line"></i>': 7,
      'RUS <i class="fas fa-chart-line"></i>': 4,
      'REC <i class="fas fa-chart-line"></i>': 4,
      'BLK <i class="fas fa-chart-line"></i>': 3,
      'DEF <i class="fas fa-chart-line"></i>': 7,
      'KCK <i class="fas fa-chart-line"></i>': 2,
      'Expand': 1,
      'Custom': 3
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

    var SearchPaneColumns = [1,3].concat(ShowColumnMap['Custom']);


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

    console.log('ButtonList', ButtonList);

    var StarGroupsMap = {
      1: [1],
      2: [2],
      3: [3],
      4: [2,2],
      5: [3,2]
    }


  var RecruitTable = $('#recruitingMainTable').DataTable({
    "dom": 'Brtp',
    'searching': true,
    'info': false,
    "filter": true,
    "pageLength": 25,
      'data': data,
       'buttons':ButtonList,
       "ordering": true,
       "lengthChange" : false,
       "pagingType": "full_numbers",
       "paginationType": "full_numbers",
       "paging": true,
     "columns": [

       {"data": "Recruiting_NationalRank", "sortable": true, 'searchable': true, 'className': 'recruiting-player-rank', 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
         $(td).html(`<div class="">
                        <span>`+StringValue+`</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>State `+DataObject.Recruiting_StateRank+`</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>Pos `+DataObject.Recruiting_NationalPositionalRank+`</span>
                    </div>`);

          $(td).closest('tr').attr('PlayerID', DataObject.PlayerID)
       }},
       {"data": "RecruitingStars", "sortable": true, 'searchable': true, 'className': 'recruiting-player-rank font14', 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
         $(td).empty();
          var StarGroups = StarGroupsMap[StringValue];
          $.each(StarGroups, function(ind, obj){
            var StarGroup = $('<div></div>');

            for (var i = 1; i <= obj; i++){
              $(StarGroup).append('<i class="fas fa-star  w3-text-amber"></i>');
            }

            $(td).append(StarGroup)
          })

       }},
         {"data": "PlayerName", "visible": true, "sortable": true, 'searchable': true, 'className': 'text-left', 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           $(td).html(`<div class="recruiting-player-name font14">
                          <a  href="/World/`+WorldID+`/Player/`+DataObject.PlayerID+`"> `+
                            StringValue
                          +`</a>
                      </div>
                      <div class="recruiting-player-city font10">`+
                          DataObject.CityID__CityName+', '+DataObject.CityID__StateID__StateAbbreviation
                      +`</div>`)
         }},
         {"data": "PositionID__PositionAbbreviation", "sortable": true, 'searchable': true,'orderSequence':["desc", "asc"], render: function ( data, type, row ) {
                               var returnVal = data;
                               if ( type === 'sort' ) {
                                   returnVal = row.PositionID__PositionSortOrder;
                               }
                               return returnVal;
                           }/* 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){

           $(td).html(`<div class="section font16">
                         <span>`+StringValue+`</span>
                       </div>
                       <div class="font10">
                         <span>`+'Style'+`</span>
                       </div>`)
         }*/},
         {"data": "playerteamseason__recruitteamseason__Scouted_Overall", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"],  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           $(td).html(StringValue)
         }},
         {"data": 'playerteamseason__recruitteamseason__ScoutingFuzz', "sortable": true, 'visible': true,'className': '',  'orderSequence':DescFirst,  "defaultContent": ''}, //% Scouted
         {"data": 'RecruitingPointsPercent', "sortable": true, 'visible': true,'className': '', 'orderSequence':DescFirst,   "defaultContent": ''}, // % Lock
         {"data": 'playerteamseason__recruitteamseason__InterestLevel', "sortable": true, 'visible': true,'className': '',  'orderSequence':DescFirst,  "defaultContent": ''}, // Interest in Team
         {"data": "RecruitSigned", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"], 'className': 'col-group',  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           var container = $('<div class="equal-sized-item-container"></div>');
           var MaxInterestLevel = 0;
           var Opacity = 100;
           var IsLeader = false;
           var Trailing = 0;
           $.each(DataObject.RecruitingTeams, function(i,o){
             IsLeader = false;
             if (o.InterestLevel >= MaxInterestLevel){
               MaxInterestLevel = o.InterestLevel;
               IsLeader = true;
             }
             else {
               Trailing = MaxInterestLevel - o.InterestLevel;
             }

             Opacity = 100 * ((o.InterestLevel / MaxInterestLevel) ** 3);

             if (o.Signed == true) {
               var subtext = 'Signed';
             }
             else if (IsLeader == true){
               var subtext = '1st';
             }
             else {
               var subtext = '-' + Trailing;
             }
             container.append($(`<div class="equal-sized-item"><div class="section font16">
                           <a href=`+o.TeamHref+`><img class='recruitingLeadingTeamLogo' style='opacity: `+Opacity+`%;' src=`+o.TeamSeasonID__TeamID__TeamLogoURL+`  /></a>
                         </div>
                         <div class="font10">
                           <span>`+subtext+`</span>
                         </div></div>`));

             if (o.Signed == true){
               return false;
             }
           })
           $(td).html('');
           $(td).append(container)
         }},
         {"data": "Height", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"], 'className': 'font16','render':function ( data, type, row ) {  return row.HeightFormatted;}},
         {"data": "WeightFormatted", "sortable": true, 'visible': false, 'orderSequence':["desc", "asc"], 'className': 'font16'},
         {"data": 'Recruiting_40Time', "sortable": true, 'visible': false, 'orderSequence':AscFirst, 'className': ''},
         {"data": 'Recruiting_BenchPressReps', "sortable": true, 'visible': false, 'orderSequence':DescFirst, 'className': ''},
         {"data": 'Recruiting_VerticalJump', "sortable": true, 'visible': false, 'orderSequence':DescFirst, 'className': ' col-group'},

         {"data": "playerteamseason__recruitteamseason__Scouted_Strength_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Agility_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Speed_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Acceleration_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Stamina_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Jumping_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Awareness_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_ThrowPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ShortThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_MediumThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_DeepThrowAccuracy_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ThrowOnRun_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ThrowUnderPressure_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_PlayAction_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_Carrying_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Elusiveness_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_BallCarrierVision_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_BreakTackle_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_Catching_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_CatchInTraffic_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_RouteRunning_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Release_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_PassBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_RunBlock_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ImpactBlock_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_PassRush_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_BlockShedding_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Tackle_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_HitPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ManCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_ZoneCoverage_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_Press_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": "playerteamseason__recruitteamseason__Scouted_KickPower_Rating", "sortable": true, 'visible': false, 'orderSequence':["desc"]},
         {"data": "playerteamseason__recruitteamseason__Scouted_KickAccuracy_Rating", "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

         {"data": null, "sortable": false, 'visible': true,'className': 'details-control',    "defaultContent": ''},
         {"data": 'CityID__StateID__StateAbbreviation', "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},
         {"data": 'CityID__StateID__StateAbbreviation', "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},
         {"data": 'CityID__StateID__StateAbbreviation', "sortable": true, 'visible': false,'className': 'col-group',  'orderSequence':["desc"]},

     ],
  });

  console.log('RecruitTable', RecruitTable);


      $('#recruitingMainTable tbody').on('click', '.details-control', function () {
        //console.log('clicked', this, SelectedTeamID);

        var tr = $(this).parent();
        $(tr).addClass('shown');
        var PlayerID = $(tr).attr('PlayerID');
        var row = RecruitTable.row( tr );

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

            var teamcolor = 'blue';
            childrow.find('td').css('border-left-color', teamcolor)

            tr.addClass('shown');
        }


      });
}


function DrawNationalRankTable(WorldID){


  var recruitingNationalRankingTable = $('#recruitingNationalRankingTable').DataTable({
    'paging': false,
    'searching': false,
    'info': false,
    "columns": [
        { "orderSequence": [ "asc" ] },
        { "orderSequence": [ "asc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
      ]
  });
}



$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  console.log('in Recruiting.js file')
  var RecruitingPlayersData = $('#recruiting-player-data')[0];
  RecruitingPlayersData = JSON.parse(RecruitingPlayersData.textContent);

  var SavedRecruitingPlayersData = $('#recruiting-saved-players-data')[0];
  SavedRecruitingPlayersData = JSON.parse(SavedRecruitingPlayersData.textContent);


  DrawRecruitingTable(WorldID, RecruitingPlayersData);
  DrawSavedRecruitingTable(WorldID, SavedRecruitingPlayersData);
  DrawNationalRankTable(WorldID);

});
