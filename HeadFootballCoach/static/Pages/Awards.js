
function HeismanRaceContent(WorldID){

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

    $(function() {
      var $sidebar   = $("#teamRosterPlayerHighlight"),
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
  HeismanRaceContent(WorldID)
});
