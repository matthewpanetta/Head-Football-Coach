
function DrawTeamInfo(data, WorldID, TeamID, Category, CategoryDisplayName){
  var div = $(`
      <div class='w3-row-padding'>
        <div class='w3-col s6 top-teams'>
          <table class='width100'>
            <thead>
              <th>Rank</th>
              <th>Team</th>
              <th>`+CategoryDisplayName+`</th>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
        <div class='w3-col s6 bottom-teams'>
          <table class='width100'>
            <thead>
              <th>Rank</th>
              <th>Team</th>
              <th>`+CategoryDisplayName+`</th>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
      </div>
    `);

  $.ajax({
    url: '/World/'+WorldID+'/Team/'+TeamID+'/TeamInfoRating/'+Category,
    success: function (data) {
      console.log('Ajax return', data);

      $.each(data.TopTeams, function(ind, obj){
        var tr = $('<tr></tr>');
        tr.append('<td>'+obj[Category+'_Rank']+'</td>');
        tr.append('<td><a href="'+obj.TeamHref+'"><img src="'+obj.TeamLogoURL+'"  class="small-logo" >'+obj.TeamName+'</a></td>');
        tr.append('<td>'+NumberToGrade_True(obj[Category]).LetterGrade +'</td>');

        $(div).find('.top-teams tbody').append(tr);
      });


      $.each(data.BottomTeams, function(ind, obj){
        var tr = $('<tr></tr>');
        tr.append('<td>'+obj[Category+'_Rank']+'</td>');
        tr.append('<td><a href="'+obj.TeamHref+'"><img src="'+obj.TeamLogoURL+'"  class="small-logo" >'+obj.TeamName+'</a></td>');
        tr.append('<td>'+NumberToGrade_True(obj[Category]).LetterGrade +'</td>');

        $(div).find('.bottom-teams tbody').append(tr);
      });

    }
  });

  return div;
}


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


function DrawTeamInfoChildRows(WorldID, TeamID, data) {

  var DescFirst = ['desc', 'asc'];
  var AscFirst = ['asc', 'desc', ];

  console.log('DrawTeamInfoChildRows', data);
  $.extend( true, $.fn.dataTable.defaults, {
    "orderSequence": DescFirst,
} );



  var table = $('#TeamInfo').DataTable({
    dom: 't',
    data: data,
    columns: [
      {'data': 'TeamInfoTopicID__AttributeName', "sortable": true, 'orderSequence': AscFirst},
      {'data': 'TeamRating', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
        var Rating = StringValue;
        var GradeObject = NumberToGrade_True(StringValue);
        console.log('GradeObject', GradeObject)
          $(td).html("<span class='"+GradeObject.GradeClass+"'>"+GradeObject.LetterGrade+"</span>");


          $(td).parent().attr('Category', DataObject.Category)
          $(td).parent().attr('CategoryDisplayName', DataObject['Field Name'])
      }},
      {'data': 'TeamInfoTopic_Rank', "sortable": true,  "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
          $(td).html("<span>"+ordinal_suffix_of(StringValue)+"</span>");
      }},
      {'data': null, "sortable": false, 'className': 'details-control',   "defaultContent": ''},
    ],
    order: [[1, 'desc']]
  });


    $('#TeamInfo tbody').on('click', '.details-control', function () {

      var tr = $(this).parent();
      $(tr).addClass('shown');
      var Category = $(tr).attr('Category');
      var CategoryDisplayName = $(tr).attr('CategoryDisplayName');
      var row = table.row( tr );

      if ( row.child.isShown() ) {
          // This row is already open - close it
          row.child.hide();
          tr.removeClass('shown');
      }
      else {
          // Open this row
          var data = row.data()
          var formattedContent = DrawTeamInfo(data, WorldID, TeamID, Category, CategoryDisplayName);
          console.log(formattedContent,'formattedContent');
          row.child( formattedContent ).show();
          var childrow = row.child();
          console.log(childrow, 'childrow');

          tr.addClass('shown');
      }


    });
}



function AddBoxScoreListeners(){
  var InitialBoxScore = $('.selected-boxscore-tab')[0];

  var SelectedTeamID = $(InitialBoxScore).attr('TeamID');


  $('.boxscore-tab').on('click', function(event, target) {


    var ClickedTab = $(event.target)
    var ClickedTabParent = ClickedTab.closest('.boxscore-bar').attr('id');
    var SelectedTeamID = ClickedTab.attr('TeamID');
    var SelectedGameID = ClickedTab.attr('GameID');

    $.each($('#'+ClickedTabParent+' > .selected-boxscore-tab'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).removeClass('selected-boxscore-tab');
      var TargetTabParent = TargetTab.closest('.boxscore-bar').attr('id');


      var UnselectedTeamID = TargetTab.attr('TeamID');
      var UnselectedGameID = TargetTab.attr('GameID');

      $('.team-highlights[TeamID="'+UnselectedTeamID+'"][GameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('selected-boxscore-tab');
    $('.team-highlights[TeamID="'+SelectedTeamID+'"]').removeClass('w3-hide')

  });
}


function DrawFaces(TeamJerseyStyle, TeamJerseyInvert, overrides = undefined){

  $.each($('[hasplayerfacejson="1"]'), function(index,FaceDiv){
    var FaceElement = $(FaceDiv).find('.PlayerFaceDisplay')[0];
    var FaceJson = $(FaceDiv).attr('PlayerFaceJson').replace(/'/g, '"');
    var PlayerFaceJson = JSON.parse(FaceJson);
    BuildFace(PlayerFaceJson, TeamJerseyStyle, TeamJerseyInvert, overrides, $(FaceElement).attr('id'));
  });
}



$(document).ready(function(){

  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID  = parseInt($(DataPassthruHolder).attr('TeamID'));
  var TeamJerseyStyle  = $(DataPassthruHolder).attr('TeamJerseyStyle');
  var TeamJerseyInvert  = $(DataPassthruHolder).attr('TeamJerseyInvert');
  var TeamColor_Primary_HEX  = $(DataPassthruHolder).attr('PrimaryColor');
  var TeamColor_Secondary_HEX  = $(DataPassthruHolder).attr('SecondaryJerseyColor');
  var TeamName = '';
  var CoachOrg = '';

  var overrides = {'teamColors': ['#'+TeamColor_Primary_HEX, '#'+TeamColor_Secondary_HEX , '#FFF']};

  AddScheduleListeners();
  AddBoxScoreListeners();

  DrawFaces(TeamJerseyStyle, TeamJerseyInvert, overrides=overrides);
  DrawSchedule();

  var TeamInfoData = $('#team-info-data')[0];
  TeamInfoData = JSON.parse(TeamInfoData.textContent);
  DrawTeamInfoChildRows(WorldID, TeamID, TeamInfoData)


});


function AddScheduleListeners(){
  var InitialGameBox = $('.SelectedGameBox')[0];

  var SelectedGameID = $(InitialGameBox).attr('BoxScoreGameID');
  $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide');


  $('.teamScheduleGameBox').on('click', function(event, target) {

    var ClickedTab = $(event.target).closest('.teamScheduleGameBox');
    var SelectedGameID = ClickedTab.attr('BoxScoreGameID');
    $.each($('.SelectedGameBox'), function(index, tab){
      var TargetTab = $(tab);
      $(TargetTab).css('backgroundColor', '');
      $(TargetTab).removeClass('SelectedGameBox');

      var UnselectedGameID = TargetTab.attr('BoxScoreGameID');

      $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+UnselectedGameID+'"]').addClass('w3-hide')
    });

    $(ClickedTab).addClass('SelectedGameBox');
    $('.teamScheduleGameDashboardGameDisplay[BoxScoreGameID="'+SelectedGameID+'"]').removeClass('w3-hide')

  });
}

function DrawSchedule(){

  ResArrowSize();
  $(window).resize(function () {
      ResArrowSize();
  });

  //this function define the size of the items
  function ResArrowSize() {

      $('#addedStyle').remove();

      var bodyWidth = $('.SelectedGameBox').width();

      var sideLength = bodyWidth / 2;

      var styleAdd = '';
      styleAdd += 'border-left-width: '+sideLength+'px;'
      styleAdd += 'border-right-width: '+sideLength+'px;'
      styleAdd += 'border-width: 15px '+sideLength+'px 0;'

      $('<style id="addedStyle">.SelectedGameBox::after{'+styleAdd+'}</style>').appendTo('head');

  }
}
