function MinutesToTime(Val){
  var MinutesLeft = Val * 10;

  var ParsedHours = parseInt(MinutesLeft / 60).toString();
  var ParsedMinutes = (MinutesLeft % 60).toString();

  if (ParsedMinutes.length == 1){
    ParsedMinutes = '0'+ ParsedMinutes;
  }

  return  ParsedHours+ ':' + ParsedMinutes;
}

function UpdateTimeRemaining(data, EventDataTable, row) {

  $('[data-field="all-players-time-remaining"]').text(MinutesToTime(data.AllPlayersTimeRemaining));
  $('[data-field="this-player-time-remaining"]').text(MinutesToTime(data.ThisPlayerTimeRemaining));
  $('#UserRecruitingPointsLeft').text(MinutesToTime(data.AllPlayersTimeRemaining));

  console.log('EventDataTable, row', EventDataTable, row)
  var DT_Row = EventDataTable.row(row[0]);
  console.log('DT_Row',DT_Row)
  EventDataTable.cell(DT_Row, 10).data(MinutesToTime(data.ThisPlayerTimeRemaining)) //.draw();
}


function DrawPlayerInfo(data, WorldID, PlayerID, SourceTable) {
  var div = $(`
    <div class='w3-row-padding' style='text-align: initial;' id='playerinfo-` + SourceTable + `-` + PlayerID + `'>
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
              <div><span data-field="playerteamseason__recruitteamseason__Scouted_Overall"></span></div>
            </li>
          </ul>

        </div>
      </div>
      <div class='w3-col s5'>
      <div class="w3-row-padding">
                <div id='' class="w3-bar w3-row-padding player-highlight-info-selection-bar">
                  <button class='w3-button w3-bar-item highlight-tab selected-highlight-tab highlight-ratings-tab' type="button" name="button" id="highlight-ratings-tab">Ratings</button>
                  <button class='w3-button w3-bar-item w3-hide highlight-tab highlight-stats-tab' type="button" name="button" id="highlight-stats-tab">Stats</button>
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
    url: '/World/' + WorldID + '/Player/' + PlayerID + '/RecruitCardInfo',
    success: function(data) {
      console.log('Ajax return', data);

      $(div, ' div.w3-hide.w3-row-padding').removeClass('w3-hide');

      var overrides = {
        "teamColors": ["#" + data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'], "#" + data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'], "#FFF"]
      }

      $('[css-field="OverallCss"].player-highlight-pills').removeClass('elite').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])


      $.each(data.Skills, function(SkillGroup, SkillObj) {
        var Container = $('<div class=" w3-col s4 no-padding"></div>').appendTo($(div).find('.highlight-ratings'));
        $('<div class="w3-margin-top bold">' + SkillGroup + '</div>').appendTo(Container);
        $.each(SkillObj, function(key, val) {
          //$('<div class="inline-block min-width-75" style="margin: 2px 2px; "><div class="font10 width100">'+key+'  </div>  <div class="font20 width100">'+val+'</div></div>').appendTo(Container);
          $(`<div>` + key + `</div>
            <div class="w3-grey w3-round-xlarge statBar inline-block" style='width: 80%;'>
              <div class="w3-container  w3-round-xlarge   ` + NumberToGradeClass(val) + `-Fill" style="width:` + val + `%; height: 8px;"></div>
            </div>
            <span>` + val + `</span>`).appendTo(Container);
        });
      });


      if (Object.keys(data.Actions).length > 0) {
        $(div).find('.highlight-actions-tab').removeClass('w3-hide');
        var Container = $(div).find('.highlight-actions table')
      } else {
        $(div).find('.highlight-actions-tab').addClass('w3-hide');
        if ($(div).find('.highlight-actions-tab').hasClass('selected-highlight-tab')) {
          $(div).find('.highlight-ratings-tab').click()
        }
      }

      $.each(data.Actions, function(ActionCount, Action) {
        console.log('ActionName, Action', ActionCount, Action, Container)

        $(`<tr>
            <td style='width:10%;'>` + Action.Icon + `</td>
            <td confirm-info='` + Action.ConfirmInfo + `' response-type='refresh' background-ajax='` + Action.AjaxLink + `' class="w3-button ` + Action.Class + ` text-left"> ` + Action.Display + ` </td>
          </tr>`).appendTo(Container);
      });


      $.each(data, function(key, val) {

        if (key == 'PlayerFaceJson') {
          var elem = $(div).find('[data-field="' + key + '"]');
          elem = elem[0];
          $(elem).empty();

          $(div).find('.PlayerFace').attr('id', 'PlayerFace-' + SourceTable + '-' + data.PlayerID)

          var DOMID = 'PlayerFace-' + SourceTable + '-' + data.PlayerID;

          if (typeof val === 'string') {
            val = $.parseJSON(val);
          }
          BuildFace(val, data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyStyle'], data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert'], overrides = overrides, DOMID = DOMID); //playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert
        } else {
          $(div).find('[html-field="' + key + '"]').html(val);
          $(div).find('[data-field="' + key + '"]').text(val);
          $(div).find('[src-field="' + key + '"]').attr('src', val);
          $(div).find('[href-field="' + key + '"]').attr('href', val);
          $(div).find('[width-field="' + key + '"]').css('width', val + '%');
          $(div).find('[class-grade-field="' + key + '"]').addClass(NumberToGradeClass(val) + '-Fill');

        }
      });

      $(div).find('.highlight-tab').on('click', function(event, target) {

        var ClickedTab = $(event.target)
        var ClickedTabContent = ClickedTab.attr('id').replace('-tab', '');
        var ClickedTabParent = ClickedTab.closest('.player-highlight-info-selection-bar');

        $.each($(ClickedTabParent).find(' .selected-highlight-tab'), function(index, tab) {
          var TargetTab = $(tab);
          $(TargetTab).removeClass('selected-highlight-tab');
          var TargetTabContent = TargetTab.attr('id').replace('-tab', '');
          $(div).find('.' + TargetTabContent).addClass('w3-hide');

        });

        $(ClickedTab).addClass('selected-highlight-tab');
        $(div).find('.' + ClickedTabContent).removeClass('w3-hide')

      });
    }
  });



  return div;
}



function DrawRecruitingTable(WorldID, data, SavedPlayers) {

  console.log('DrawRecruitingTable', data, SavedPlayers);

  var DescFirst = ["desc", "asc"];
  var AscFirst = ["asc", "desc"];

  var ColCategories = {
    'Base': 7,
    'STATUS <i class="fas fa-handshake"></i>': 5,
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
  $.each(ColCategories, function(key, val) {
    ShowColumnMap[key] = []
    for (var i = ColCounter; i < ColCounter + val; i++) {
      ShowColumnMap[key].push(i);
    }
    ColCounter = ColCounter + val;
  })

  var FullColumnList = [];
  var HideColumnMap = {}
  $.each(ShowColumnMap, function(key, ColList) {
    $.each(ColList, function(ind, ColNum) {
      if ((($.inArray(ColNum, ShowColumnMap['Base'])) == -1) && ($.inArray(ColNum, ShowColumnMap['Expand']) == -1) && ($.inArray(ColNum, ShowColumnMap['Custom']) == -1)) {
        FullColumnList.push(ColNum);
      }
    })
  });

  $.each(ShowColumnMap, function(key, ColList) {
    var cols = $.grep(FullColumnList, function(val, ind) {
      return $.inArray(val, ColList) == -1
    });
    HideColumnMap[key] = cols;
  });

  var SearchPaneColumns = [1, 3, 11].concat(ShowColumnMap['Custom']);


  var ButtonList = [{
    extend: 'searchPanes',
    config: {
      cascadePanes: true,
      viewTotal: false, //maybe true later - TODO
      columns: SearchPaneColumns,
      collapse: 'Filter Players',
    },

  }]

  $.each(ColCategories, function(key, val) {
    if (key == 'Base' || key == 'Expand' || key == 'Custom') {
      return true;
    }
    var ButtonObj = {
      extend: 'colvisGroup',
      text: key,
      show: ShowColumnMap[key],
      hide: HideColumnMap[key],
      action: function(e, dt, node, config) {
        console.log('config', e, dt, node, config)
        dt.columns(config.show).visible(true);
        dt.columns(config.hide).visible(false);

        $(".dt-buttons").find("button").removeClass("active");
        node.addClass("active");

      }
    }
    ButtonList.push(ButtonObj)
  });

  console.log('ButtonList', ButtonList);

  var StarGroupsMap = {
    1: [1],
    2: [2],
    3: [3],
    4: [2, 2],
    5: [3, 2]
  }


  var RecruitTable = $('#recruitingMainTable').DataTable({
    "dom": 'Brtp',
    'searching': true,
    'info': false,
    "filter": true,
    "pageLength": 25,
    'data': data,
    'buttons': ButtonList,
    "ordering": true,
    "lengthChange": false,
    "pagingType": "full_numbers",
    "paginationType": "full_numbers",
    "paging": true,
    'columnDefs': [{
      searchPanes: {
        show: true,
        options: [{
            label: 'Signed',
            value: function(rowData, rowIdx) {
              return rowData['RecruitingPointsPercent'] >= 100;
            }
          },
          {
            label: 'Closing Stage (< 100%)',
            value: function(rowData, rowIdx) {
              return rowData['RecruitingPointsPercent'] > 75 && rowData['RecruitingPointsPercent'] < 100;
            }
          },
          {
            label: 'Narrowing Down Teams (< 75%)',
            value: function(rowData, rowIdx) {
              return rowData['RecruitingPointsPercent'] > 50 && rowData['RecruitingPointsPercent'] <= 75;
            }
          },
          {
            label: 'Progressing (< 50%)',
            value: function(rowData, rowIdx) {
              return rowData['RecruitingPointsPercent'] > 25 && rowData['RecruitingPointsPercent'] <= 50;
            }
          },
          {
            label: 'Available (< 25%)',
            value: function(rowData, rowIdx) {
              return rowData['RecruitingPointsPercent'] <= 25;
            }
          }
        ],
        combiner: 'or'
      },
      targets: [53]
    },{
      searchPanes: {
        show: true,
        options: [{
            label: 'On Recruiting Board',
            value: function(rowData, rowIdx) {
              return rowData['playerteamseason__recruitteamseason__IsActivelyRecruiting'] && !rowData['RecruitSigned'];
            }
          },
          {
            label: 'All Players',
            value: function(rowData, rowIdx) {
              return true;
            }
          },
          {
            label: 'Committed',
            value: function(rowData, rowIdx) {
              return rowData['playerteamseason__recruitteamseason__Signed'];
            }
          },
        ],
        combiner: 'or'
      },
      targets: [54]
    }, ],
    "columns": [

      {
        "data": "Recruiting_NationalRank",
        "sortable": true,
        'searchable': true,
        'className': 'recruiting-player-rank',
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html(`<div class="">
                        <span>` + StringValue + `</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>State ` + DataObject.Recruiting_StateRank + `</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>Pos ` + DataObject.Recruiting_NationalPositionalRank + `</span>
                    </div>`);

          $(td).closest('tr').attr('PlayerID', DataObject.PlayerID)
        }
      },
      {
        "data": "RecruitingStars",
        "sortable": true,
        'searchable': true,
        'className': 'recruiting-player-rank font14',
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).empty();
          var StarGroups = StarGroupsMap[StringValue];
          $.each(StarGroups, function(ind, obj) {
            var StarGroup = $('<div></div>');

            for (var i = 1; i <= obj; i++) {
              $(StarGroup).append('<i class="fas fa-star  w3-text-amber"></i>');
            }

            $(td).append(StarGroup)
          })

        }
      },
      {
        "data": "PlayerName",
        "visible": true,
        "sortable": true,
        'searchable': true,
        'className': 'text-left',
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html(`<div class="recruiting-player-name font14">
                          <a  href="/World/` + WorldID + `/Player/` + DataObject.PlayerID + `"> ` +
            StringValue +
            `</a>
                      </div>
                      <div class="recruiting-player-city font10">` +
            DataObject.CityID__CityName + ', ' + DataObject.CityID__StateID__StateAbbreviation +
            `</div>`)
        }
      },
      {
        "data": "PositionID__PositionAbbreviation",
        "sortable": true,
        'searchable': true,
        'orderSequence': ["desc", "asc"],
        render: function(data, type, row) {
          var returnVal = data;
          if (type === 'sort') {
            returnVal = row.PositionID__PositionSortOrder;
          }
          return returnVal;
        }
        /* 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){

                   $(td).html(`<div class="section font16">
                                 <span>`+StringValue+`</span>
                               </div>
                               <div class="font10">
                                 <span>`+'Style'+`</span>
                               </div>`)
                 }*/
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Overall",
        "sortable": true,
        'visible': true,
        'orderSequence': ["desc", "asc"],
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html(StringValue)
        }
      },
      {
        "data": 'playerteamseason__recruitteamseason__ScoutingFuzz',
        "sortable": true,
        'visible': true,
        'className': '',
        'orderSequence': DescFirst,
        "defaultContent": ''
      }, //% Scouted
      {
        "data": "RecruitSigned",
        "sortable": true,
        'visible': true,
        'orderSequence': ["desc", "asc"],
        'className': 'col-group',
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          var container = $('<div class="equal-sized-item-container"></div>');
          var MaxInterestLevel = 0;
          var Opacity = 100;
          var IsLeader = false;
          var Trailing = 0;
          $.each(DataObject.RecruitingTeams, function(i, o) {
            IsLeader = false;
            if (o.InterestLevel >= MaxInterestLevel) {
              MaxInterestLevel = o.InterestLevel;
              IsLeader = true;
            } else {
              Trailing = MaxInterestLevel - o.InterestLevel;
            }

            Opacity = Math.max(100 * ((o.InterestLevel / MaxInterestLevel) ** 3), 50);

            if (o.Signed == true) {
              var subtext = 'Signed';
            } else if (IsLeader == true) {
              var subtext = '1st';
            } else {
              var subtext = '-' + Trailing;
            }
            container.append($(`<div class="equal-sized-item"><div class="section font16">
                           <a href=` + o.TeamHref + `><img class='recruitingLeadingTeamLogo' style='opacity: ` + Opacity + `%;' src=` + o.TeamSeasonID__TeamID__TeamLogoURL + `  /></a>
                         </div>
                         <div class="font10">
                           <span>` + subtext + `</span>
                         </div></div>`));

            if (o.Signed == true) {
              return false;
            }
          })
          $(td).html('');
          $(td).append(container)
        }
      },

      {
        "data": 'playerteamseason__recruitteamseason__IsActivelyRecruiting',
        "sortable": true,
        'visible': false,
        'className': '',
        'orderSequence': DescFirst,
        "defaultContent": '',
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html('No');
          if (StringValue){
            $(td).html('Yes')
          }
        },
        'render': function(data, type, row) {
          if (data){
            return 'Yes';
          }
          return 'No';
        }

      }, // % Lock

      {
        "data": 'RecruitingPointsPercent',
        "sortable": true,
        'visible': false,
        'className': '',
        'orderSequence': DescFirst,
        "defaultContent": ''
      }, // % Lock
      {
        "data": 'playerteamseason__recruitteamseason__InterestLevel',
        "sortable": true,
        'visible': false,
        'className': '',
        'orderSequence': DescFirst,
        "defaultContent": ''
      }, // Interest in Team

      {
        "data": "TimeLeftThisWeek",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc", "asc"],
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html(MinutesToTime(StringValue))
        }
      },

      {
        "data": "playerteamseason__recruitteamseason__OfferMade",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc", "asc"],
        'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol) {
          $(td).html('No');
          if (StringValue){
            $(td).html('Yes')
          }
        },
        'render': function(data, type, row) {
          if (data){
            return 'Yes';
          }
          return 'No';
        }
      },

      {
        "data": "Height",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc", "asc"],
        'render': function(data, type, row) {
          return row.HeightFormatted;
        }
      },
      {
        "data": "WeightFormatted",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc", "asc"],
      },
      {
        "data": 'Recruiting_40Time',
        "sortable": true,
        'visible': false,
        'orderSequence': AscFirst,
        'className': ''
      },
      {
        "data": 'Recruiting_BenchPressReps',
        "sortable": true,
        'visible': false,
        'orderSequence': DescFirst,
        'className': ''
      },
      {
        "data": 'Recruiting_VerticalJump',
        "sortable": true,
        'visible': false,
        'orderSequence': DescFirst,
        'className': ' col-group'
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_Strength_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Agility_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Speed_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Acceleration_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Stamina_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Jumping_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Awareness_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_ThrowPower_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ShortThrowAccuracy_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_MediumThrowAccuracy_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_DeepThrowAccuracy_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ThrowOnRun_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ThrowUnderPressure_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_PlayAction_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_Carrying_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Elusiveness_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_BallCarrierVision_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_BreakTackle_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_Catching_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_CatchInTraffic_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_RouteRunning_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Release_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_PassBlock_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_RunBlock_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ImpactBlock_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_PassRush_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_BlockShedding_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Tackle_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_HitPower_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ManCoverage_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_ZoneCoverage_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_Press_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": "playerteamseason__recruitteamseason__Scouted_KickPower_Rating",
        "sortable": true,
        'visible': false,
        'orderSequence': ["desc"]
      },
      {
        "data": "playerteamseason__recruitteamseason__Scouted_KickAccuracy_Rating",
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

      {
        "data": null,
        "sortable": false,
        'visible': true,
        'className': 'details-control',
        "defaultContent": ''
      },
      {
        "data": 'CityID__StateID__StateAbbreviation',
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },
      {
        "data": 'CityID__StateID__StateAbbreviation',
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },
      {
        "data": 'CityID__StateID__StateAbbreviation',
        "sortable": true,
        'visible': false,
        'className': 'col-group',
        'orderSequence': ["desc"]
      },

    ],
  });


  $('#recruitingMainTable tbody').on('click', '.details-control', function() {
    //console.log('clicked', this, SelectedTeamID);

    var tr = $(this).parent();
    $(tr).addClass('shown');
    var PlayerID = $(tr).attr('PlayerID');
    var row = RecruitTable.row(tr);

    var SourceTable = 'Main';

    if (row.child.isShown()) {
      // This row is already open - close it
      row.child.hide();
      tr.removeClass('shown');
    } else {
      // Open this row
      var data = row.data()
      var formattedContent = DrawPlayerInfo(data, WorldID, PlayerID, SourceTable);
      row.child(formattedContent, 'teamTableBorder').show();
      var childrow = row.child();

      var teamcolor = 'blue';
      childrow.find('td').css('border-left-color', teamcolor)

      tr.addClass('shown');
    }


  });


  RecruitingAction(WorldID, RecruitTable);
}


function DrawNationalRankTable(WorldID) {


  var recruitingNationalRankingTable = $('#recruitingNationalRankingTable').DataTable({
    'paging': false,
    'searching': false,
    'info': false,
    "columns": [{
        "orderSequence": ["asc"]
      },
      {
        "orderSequence": ["asc"]
      },
      {
        "orderSequence": ["desc"]
      },
      {
        "orderSequence": ["desc"]
      },
      {
        "orderSequence": ["desc"]
      },
      {
        "orderSequence": ["desc"]
      },
      {
        "orderSequence": ["desc"]
      },
      {
        "orderSequence": ["desc"]
      },
    ]
  });
}


function RecruitingAction(WorldID, MainTable) {

  $(document).on('click', '.recruiting-action', function(event) {
    var ActionTarget = $(event.target)[0];
    ActionTarget = $(ActionTarget)

    var EventTable = ActionTarget.closest('.recruiting-player-table')[0]

    var EventDataTable = $(EventTable).DataTable();


    //console.log('event.target', event.target, ActionTarget,EventTable, EventDataTable )

    $.ajaxSetup({
      beforeSend: function(xhr, settings) {
        // if not safe, set csrftoken
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
          xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
      }
    });


    var Source = '';
    var Action = '';
    var ConfirmText = '';

    var Path = $(ActionTarget).attr('background-ajax');
    console.log('Path', Path)
    var SourcePath = String(ActionTarget[0].baseURI);

    if (SourcePath.indexOf('Player') != -1) {
      Source = 'PlayerPage'
    } else {
      Source = 'PlayerCard'
    }

    if (Path.indexOf('Scout') != -1) {
      Action = 'Scout';
    } else if (Path.indexOf('Board') != -1) {
      if (Path.indexOf('Remove') != -1) {
        Action = 'Remove from Board';
      } else if (Path.indexOf('Add') != -1) {
        Action = 'Add to Board';
      }
    } else if (Path.indexOf('StartRecruitingCall') != -1) {
      Action = 'Start Recruiting Call';
    }


    var UserConfirm = true;
    if (UserConfirm == true) {


      $.ajax({
        method: "POST",
        url: Path,
        data: {
          csrfmiddlewaretoken: csrftoken
        },
        dataType: 'json',
        success: function(res, status) {
          console.log(Action, res, status);

          $.notify(
            res.message, {
              globalPosition: "right bottom",
              className: 'success'
            }
          );

          if (Source == 'PlayerPage') {
            if (Action == 'Scout') {
              window.location = '';
            }
          } else {
            var ParentRow = $(ActionTarget).closest('tr.teamTableBorder');
            var ParentSourceRow = $(ActionTarget).closest('tr.teamTableBorder').prev();
            var PlayerID = ParentSourceRow.attr('playerid');

            var row = MainTable.row(ParentSourceRow);

            if (Action == 'Scout') {
              $.each(res.DataUpdates, function(ind, obj) {
                if (obj.ColumnNumber != null) {
                  MainTable.cell(row[0], obj.ColumnNumber).data(obj.Value) //.draw();
                }
                $(ParentRow).find('[data-field="' + obj.Selector + '"]').text(obj.Value);

                if (obj.FieldName == 'ScoutingFuzz') {
                  if (obj.Value == 0) {
                    $(ParentRow).find('td.recruiting-action').each(function(ind, obj) {
                      if ($(this).attr('background-ajax').indexOf('Scout') != -1) {
                        $(this).closest('tr').remove();
                      }
                    })
                  }
                }
                if (obj.FieldName == 'UserRecruitingPointsLeft') {
                  $('#UserRecruitingPointsLeft').text(obj.Value);
                }
              });


            } else if (Action == 'Add to Board') {
              var DT_Row = MainTable.row(ParentSourceRow);
              MainTable.cell(DT_Row, 7).data(true)

              $(ActionTarget).text('Remove from Board');
              $(ActionTarget).attr('background-ajax', Path.replace('Add', 'Remove'));
            } else if (Action == 'Remove from Board') {
              var DT_Row = MainTable.row(ParentSourceRow);
              MainTable.cell(DT_Row, 7).data(false).draw()
              $(ActionTarget).text('Add to Board');
              $(ActionTarget).attr('background-ajax', Path.replace('Remove', 'Add'));
              //CHANGE BUTTON
            } else if (Action == 'Start Recruiting Call') {

              UpdateTimeRemaining(res.RecruitingCallInfo, MainTable, ParentSourceRow) //.draw(););

              $('#recruiting-nav-pitch-tab').click();
              $('#RecruitingModal .recruiting-pitch').off();
              $('#RecruitingModal .recruiting-discover-pitch').off();
              $('#recruiting-offer-scholarship').off();


              var PitchLineItemTemplate = `
              <tr>
                <td><span data-field="PitchName"></span></td>
                <td data-field="PlayerInterest"></td>
                <td data-field="TeamRating"></td>
                <td>
                  <button class='recruiting-pitch'>Pitch</button>
                  <button class='recruiting-discover-pitch'>Discover Interest</button>
                </td>
              </tr>`;


              var PromiseLineItemTemplate = `
              <tr>
                <td ><span data-field="PromiseText"></span></td>
                <td>
                  <button class='promise-1-year make-promise' timespan='1' InclusiveOrExclusive='exclusive'>In first year</button>
                  <button class='promise-2-year-both make-promise' timespan='2' InclusiveOrExclusive='exclusive'>In one of first 2 years</button>
                  <button class='promise-2-year-either make-promise' timespan='2' InclusiveOrExclusive='inclusive'>In both first 2 years</button>
                </td>
              </tr>`;

              var CallInfo = res.RecruitingCallInfo.PlayerInterest;
              $.each(CallInfo, function(ind, obj) {
                var Cloned_PitchLineItemTemplate = $(PitchLineItemTemplate);
                Cloned_PitchLineItemTemplate.find('[data-field="PitchName"]').html(obj.PlayerRecruitingInterestID__TeamInfoTopicID__AttributeName);
                Cloned_PitchLineItemTemplate.find('[data-field="TeamRating"]').text(NumberToGrade_True(obj.TeamRating).LetterGrade);
                Cloned_PitchLineItemTemplate.find('[data-field="TeamRating"]').addClass(NumberToGrade_True(obj.TeamRating).GradeClass);
                Cloned_PitchLineItemTemplate.find('[data-field="PlayerInterest"]').text(obj.KnownPitchRecruitInterestRank_String);
                Cloned_PitchLineItemTemplate.find('[data-field="PlayerInterest"]').addClass('Rating-' + obj.KnownPitchRecruitInterestRank_String.replace(' ', ''));

                if (obj.UtilizedThisWeek) {
                  Cloned_PitchLineItemTemplate.find('.recruiting-pitch').prop('disabled', true);
                }

                if (obj.PitchRecruitInterestRank_IsKnown) {
                  Cloned_PitchLineItemTemplate.find('.recruiting-discover-pitch').prop('disabled', true);
                }


                $('#RecruitingModal').find('.player-pitch-table tbody').append(Cloned_PitchLineItemTemplate)

              });


              $('#RecruitingModal .recruiting-pitch').on('click', function() {
                var ClickedButton = $(this);
                var Pitch = $(this).closest('tr').find('[data-field="PitchName"]').text();
                var PitchRow = $(this).closest('tr');
                $.ajax({
                  method: "POST",
                  url: '/World/' + WorldID + '/Player/' + PlayerID + '/RecruitingCallPitch/' + Pitch,
                  data: {
                    csrfmiddlewaretoken: csrftoken
                  },
                  dataType: 'json',
                  success: function(res, status) {
                    $(ClickedButton).prop('disabled', true);
                    console.log(res, status);

                    UpdateTimeRemaining(res.PitchInfo, MainTable, ParentSourceRow)

                    var BonusSpan = $('<span class=" w3-text-green" style="font-size: 10px; font-weight: 600; margin-left: 10px;margin-right: -10px;">(+<span event-field="pitch-value">0</span>)</span>')

                    $(PitchRow).find('[data-field="PitchName"]').closest('td').append(BonusSpan);

                    $(PitchRow).find('[event-field="pitch-value"]').each(function(){
                      var CountSpan = $(this)[0];
                      console.log('trying countnum', $(this).text(), $(this), CountSpan)
                      $({ countNum: 0}).animate({
                          countNum: res.PitchInfo.PitchValue
                        },
                        {
                          duration: 750,
                          easing:'linear',
                          step: function() {
                            $(CountSpan).text(Math.floor(this.countNum));
                          },
                          complete: function() {
                            $(CountSpan).text(this.countNum);
                            //alert('finished');
                          }

                        });
                    })
                  },
                  error: function(res) {
                    console.log(res)

                    $.notify(
                      res.responseJSON.message, {
                        globalPosition: "right bottom",
                        className: 'error'
                      }
                    );
                  }
                });

              });

              $('#RecruitingModal .recruiting-discover-pitch').on('click', function() {
                var ClickedButton = $(this);
                var Pitch = $(this).closest('tr').find('[data-field="PitchName"] ').text();
                var PitchRow = $(this).closest('tr');
                $.ajax({
                  method: "POST",
                  url: '/World/' + WorldID + '/Player/' + PlayerID + '/DiscoverRecruitingPitch/' + Pitch,
                  data: {
                    csrfmiddlewaretoken: csrftoken
                  },
                  dataType: 'json',
                  success: function(res, status) {
                    $(ClickedButton).prop('disabled', true);
                    console.log(res, status);

                    PitchRow.find('td[data-field="PlayerInterest"]').text(res.PitchInfo.PitchRecruitInterestRank);
                    PitchRow.find('td[data-field="PlayerInterest"]').addClass('Rating-' + res.PitchInfo.PitchRecruitInterestRank.replace(' ', ''));

                    UpdateTimeRemaining(res.PitchInfo, MainTable, ParentSourceRow)

                  },
                  error: function(res) {
                    console.log(res)

                    $.notify(
                      res.responseJSON.message, {
                        globalPosition: "right bottom",
                        className: 'error'
                      }
                    );
                  }
                });
              });


              var PromiseInfo = res.RecruitingCallInfo.AvailablePromises;
              $.each(PromiseInfo, function(ind, obj) {
                var Cloned_PromiseLineItemTemplate = $(PromiseLineItemTemplate);
                Cloned_PromiseLineItemTemplate.find('[data-field="PromiseText"]').html(obj.PromiseText);

                if (obj.PromiseMade) {
                  Cloned_PromiseLineItemTemplate.find('button').prop('disabled', true);
                }


                $('#RecruitingModal').find('.player-promise-table tbody').append(Cloned_PromiseLineItemTemplate);

              });

              $('#RecruitingModal .make-promise').off();
              $('#RecruitingModal .make-promise').on('click', function(){
                var ClickedButton = $(this);
                var Promise = $(this).closest('tr').find('[data-field="PromiseText"] ').text();
                var PromiseRow = $(this).closest('tr');
                var Timespan = $(this).attr('timespan');
                var InclusiveOrExclusive = $(this).attr('InclusiveOrExclusive');
                $.ajax({
                  method: "POST",
                  url: '/World/' + WorldID + '/Player/' + PlayerID + '/RecruitingMakePromise/' + Promise +'/' + Timespan + '/' + InclusiveOrExclusive,
                  data: {
                    csrfmiddlewaretoken: csrftoken
                  },
                  dataType: 'json',
                  success: function(res, status) {
                    $(PromiseRow).find('button').prop('disabled', true);
                    console.log(res, status);

                    var BonusSpan = $('<span class=" w3-text-green" style="font-size: 10px; font-weight: 600; margin-left: 10px;margin-right: -10px;">(+<span event-field="pitch-value">0</span>)</span>');
                    $(PromiseRow).find('[data-field="PitchName"]').closest('td').append(BonusSpan);

                    $(PromiseRow).find('[event-field="pitch-value"]').each(function(){
                      var CountSpan = $(this)[0];
                      console.log('trying countnum', $(this).text(), $(this), CountSpan)
                      $({ countNum: 0}).animate({
                          countNum: res.PitchInfo.PitchValue
                        },
                        {
                          duration: 750,
                          easing:'linear',
                          step: function() {
                            $(CountSpan).text(Math.floor(this.countNum));
                          },
                          complete: function() {
                            $(CountSpan).text(this.countNum);
                            //alert('finished');
                          }

                        });
                    });

                    UpdateTimeRemaining(res.PitchInfo, MainTable, ParentSourceRow)

                  },
                  error: function(res) {
                    console.log(res)

                    $.notify(
                      res.responseJSON.message, {
                        globalPosition: "right bottom",
                        className: 'error'
                      }
                    );
                  }
                });
              });


              $('#recruiting-offer-scholarship').prop('disabled', false);
              if (res.RecruitingCallInfo.OfferMade) {
                $('#recruiting-offer-scholarship').prop('disabled', true);
              }
              else {
                $('#recruiting-offer-scholarship').on('click', function(){
                  var ClickedButton = $(this);

                  $.ajax({
                    method: "POST",
                    url: '/World/' + WorldID + '/Player/' + PlayerID + '/PlayerRecruitingScholarship/' + 'Offer',
                    data: {
                      csrfmiddlewaretoken: csrftoken
                    },
                    dataType: 'json',
                    success: function(res, status) {
                      $(ClickedButton).prop('disabled', true);
                      console.log(res, status);

                      $.notify(
                        res.message, {
                          globalPosition: "right bottom",
                          className: 'success'
                        }
                      );
                      UpdateTimeRemaining(res.RecruitingInfo, MainTable, ParentSourceRow);
                      var DT_Row = MainTable.row(ParentSourceRow)[0];
                      MainTable.cell(DT_Row, 11).data(true)

                    },
                    error: function(res) {
                      console.log(res)

                      $.notify(
                        res.responseJSON.message, {
                          globalPosition: "right bottom",
                          className: 'error'
                        }
                      );
                    }
                  });
                });
              }


              $('#RecruitingModal').css('display', 'block');

              var modal = $('#RecruitingModal')[0];

              // When the user clicks anywhere outside of the modal, close it
              window.onclick = function(event) {
                if (event.target == modal) {
                  $(modal).css('display', 'none');
                  $('#RecruitingModal').find('tbody').empty();
                }
              }

              $('#RecruitingModal .close-modal').off();
              $('#RecruitingModal .close-modal').on('click', function() {
                $('#RecruitingModal').find('tbody').empty();
                $('#RecruitingModal').css('display', 'none');
              });

              var DataPassthruHolder = $('#DataPassthru')[0];
              var PrimaryColor = $(DataPassthruHolder).attr('PrimaryColor');
              var SecondaryColor = $(DataPassthruHolder).attr('SecondaryColor');

              $('.recruiting-nav-tab-button').off();
              $('.recruiting-nav-tab-button').on('click', function(event, target) {

                var ClickedTab = $(event.target)[0];
                $.each($('.selected-tab'), function(index, tab) {
                  var TargetTab = $(tab);
                  $(TargetTab).css('backgroundColor', '');
                  $(TargetTab).removeClass('selected-tab');
                });

                $(ClickedTab).addClass('selected-tab');
                $(ClickedTab).css('background-color', SecondaryColor);


                var NewTabContent = $('#' + $(this).attr('id').replace('-tab', ''))[0];

                $.each($('.recruiting-tab-content'), function(index, OldTabContent) {
                  $(OldTabContent).css('display', 'none');
                });

                $(NewTabContent).css('display', 'block');
              });

            }
          }

        },
        error: function(res) {
          console.log(res)

          $.notify(
            res.responseJSON.message, {
              globalPosition: "right bottom",
              className: 'error'
            }
          );
        }
      });

    }
  });

}



$(document).ready(function() {
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  console.log('in Recruiting.js file')
  var RecruitingPlayersData = $('#recruiting-player-data')[0];
  RecruitingPlayersData = JSON.parse(RecruitingPlayersData.textContent);

  var SavedRecruitingPlayersData = $('#recruiting-saved-players-data')[0];
  SavedRecruitingPlayersData = JSON.parse(SavedRecruitingPlayersData.textContent);


  DrawRecruitingTable(WorldID, RecruitingPlayersData, SavedRecruitingPlayersData);
  DrawNationalRankTable(WorldID);

});
