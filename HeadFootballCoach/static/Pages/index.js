
function ChooseTeam(AllTeams, WorldID){

  console.log('Choosing a team!', AllTeams);
  $('#indexChooseTeamModal').css({'display': 'block'});
  $('#indexCreateWorldModal').css({'display': 'none'});


  $.each(AllTeams, function(index,TeamObject){
    console.log(index,TeamObject);

    var NewTeamDiv = $('#indexChooseTeamModalTeamListTeamDivClone').clone();

    NewTeamDiv = $(NewTeamDiv);

    NewTeamDiv.removeClass('hidden').removeAttr('id');
    $(NewTeamDiv.children('.indexChooseTeamModalTeamListTeamName')[0]).text(TeamObject.TeamName+' '+TeamObject.TeamNickname);
    $(NewTeamDiv.children('img')[0]).attr('src', TeamObject.LogoURL);
    NewTeamDiv.attr('TeamName', TeamObject.TeamName)

    $(NewTeamDiv).on('click', function(){
      var TeamNameSelected = $(this).attr('TeamName');


      console.log('Sending post to ', "/World/"+WorldID+"/PickTeam/");
      $.ajax({
          method: "POST",
          url: "/World/"+WorldID+"/PickTeam/",
          data: {
              // here getdata should be a string so that
              // in your views.py you can fetch the value using get('getdata')
              'TeamName': TeamNameSelected,
              //csrfmiddlewaretoken:'{{ csrf_token }}'
              csrfmiddlewaretoken: csrftoken
          },
          dataType: 'json',
          success: function (res, status) {
              window.location.replace("/World/"+WorldID);
          },
          error: function (res) {
            $.notify(
              res.message,
              { globalPosition:"right bottom", className: 'error' }
            );
          }
      });

    });

    $('#indexChooseTeamModalTeamList').append(NewTeamDiv);
  })


}

$(document).ready(function() {

  console.log('Ready in index.js!!');

});
