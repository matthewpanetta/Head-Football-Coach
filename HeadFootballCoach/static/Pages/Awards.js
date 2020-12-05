
function HeismanRaceContent(WorldID){

  $('#HeismanRaceTable').DataTable({
    dom: 't',
    columns: [
      {sortable: true},
      {sortable: false},
      {sortable: false},
      {sortable: false},
      {sortable: true},
      {sortable: true},
      {sortable: false},
    ]
  });

    $('#HeismanRaceTable tbody').on('click', 'tr', function () {
      var SelectedPlayerID = $(this).attr('PlayerID');
      console.log('clicked', this, SelectedPlayerID);

      $.ajax({
        url: '/World/'+WorldID+'/Player/'+SelectedPlayerID+'/PlayerCardInfo',
        success: function (data) {
          console.log('Ajax return', data);

          $('#teamRosterPlayerHighlight div.w3-hide.w3-row-padding').removeClass('w3-hide');

          $('#player-highlight-top-color-box').css('background-color', data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
          $('#teamRosterPlayerHighlight').css('border-width', '4px 4px 4px 4px').css('border-style', 'solid').css('border-color', data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX']);
          $('#teamRosterPlayerHighlight').css('box-shadow', '0px 2px 12px 0px #'+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX']);
          var overrides = {"teamColors":["#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'],"#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'],"#FFF"]}

          $('[css-field="OverallCss"].player-highlight-pills').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])

          $.each(data, function(key, val){

            if (key == 'PlayerFaceJson'){
              var elem = $('#teamRosterPlayerHighlight').find('[data-field="'+key+'"]');
              elem = elem[0];
              $(elem).empty();

              if (typeof val === 'string') {
                val = $.parseJSON(val);
              }
              BuildFace(val, data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyStyle'], data['playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert'], overrides, $(elem).attr('id'));//playerteamseason__TeamSeasonID__TeamID__TeamJerseyInvert
            }
            else {
              $('#teamRosterPlayerHighlight').find('[data-field="'+key+'"]').text(val);
              $('#teamRosterPlayerHighlight').find('[src-field="'+key+'"]').attr('src', val);
            }
          });

          $('#highlight-ratings').empty();


          $.each(data.Skills, function(SkillGroup, SkillObj){
            var Container = $('<div class="w3-container"></div>').appendTo($('#highlight-ratings'));
            $('<div class="w3-margin-top">'+SkillGroup+'</div>').appendTo(Container);
            $.each(SkillObj, function(key, val){
              $('<div class="inline-block min-width-75" style="margin: 2px 2px; "><div class="font10 width100">'+key+'  </div>  <div class="font20 width100">'+val+'</div></div>').appendTo(Container);
            });
          });


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



          $('#highlight-stats').empty();
          if (Object.keys(data.Stats).length > 0){
            $('#highlight-stats-tab').removeClass('w3-hide');
          }
          else {
            $('#highlight-stats-tab').addClass('w3-hide');
            if ($('#highlight-stats-tab').hasClass('selected-highlight-tab')){
              $('#highlight-ratings-tab').click()
            }
          }

          $.each(data.Stats, function(StatGroup, StatObj){
            var Container = $('<div class="w3-container"></div>').appendTo($('#highlight-stats'));
            $('<div class="w3-margin-top">'+StatGroup+'</div>').appendTo(Container);
            $('<div class="width100" style="width: 100%;"><table class="tiny" id="highlight-stat-statgroup-'+StatGroup+'" style="width: 100%;"></table> </div>').appendTo(Container);

            var columnNames = Object.keys(StatObj[0]);
            var columns = [];
            for (var i in columnNames) {
              columns.push({data: columnNames[i],
                            title: columnNames[i]});
            }

            var table = $('#highlight-stat-statgroup-'+StatGroup).DataTable({
              data: StatObj,
              columns: columns,
              responsive: true,
              dom: 't'

            });

            $('#highlight-stats-tab').on('click', function(){
              table.columns.adjust().draw();
            })
          });
        }
      })

    })


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

function HeismanWinner(data){
  console.log('HeismanWinner', data);
  var div = $('#heisman-highlight');
  $(div,' div.w3-hide.w3-row-padding').removeClass('w3-hide');

  var overrides = {"teamColors":["#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'],"#"+data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'],"#FFF"]}

  $('[css-field="OverallCss"].player-highlight-pills').removeClass('elite').removeClass('good').removeClass('fine').removeClass('bad').addClass(data['OverallCss'])

  $(div).closest('.teamTableBorder').css('border-left-color', data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'])
  $('.team-primary-background-bar-heisman').css('background-color', data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Primary_HEX'])
  $('.team-primary-background-bar-heisman').css('border-top-color', data['playerteamseason__TeamSeasonID__TeamID__TeamColor_Secondary_HEX'])


//team-primary-background-bar
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

$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  HeismanRaceContent(WorldID);


  var HeismanWinnerData = $('#heisman-winner-data')[0];
  HeismanWinnerData = JSON.parse(HeismanWinnerData.textContent);
  HeismanWinner(HeismanWinnerData);
});
