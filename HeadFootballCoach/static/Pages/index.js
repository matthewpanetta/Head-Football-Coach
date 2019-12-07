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
              alert(res.status);
          }
      });

    });

    $('#indexChooseTeamModalTeamList').append(NewTeamDiv);
  })


}

$(document).ready(function() {

  console.log('Ready in index.js!!');

  $('#indexCreateWorldButton').on('click', function(){
    console.log('Clicked on indexCreateWorldButton!!', this);
    $('#indexCreateWorldModal').css({'display': 'block'});

    $(window).on('click', function(event) {
      if ($(event.target)[0] == $('#indexCreateWorldModal')[0]) {
        $('#indexCreateWorldModal').css({'display': 'none'});
        $(window).unbind();
      }
    });
  });

  $('#indexCreateWorldModalCloseButton').on('click', function(){
    console.log('Clicked on indexCreateWorldModalCloseButton!!', this);
    $('#indexCreateWorldModal').css({'display': 'none'});
    $(window).unbind();
  });


  $('#indexCreateWorldModalContinueButton').on('click', function(){
    $.ajaxSetup({
      beforeSend: function(xhr, settings) {
        // if not safe, set csrftoken
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
          xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
      }
    });

    var ConferenceList = [];
    $.each($('input:checked'), function(index,checkbox){
      console.log(index, checkbox, $(checkbox).attr('name'));
      if (ConferenceList.indexOf($(checkbox).attr('name')) === -1 ) {
        ConferenceList.push($(checkbox).attr('name')) ;
      }
    });

    ConferenceList = ConferenceList.join(',')

    console.log('Creating League!!');


    $.ajax({
      method: "POST",
      url: "/CreateLeague/",
      data: {
        // here getdata should be a string so that
        // in your views.py you can fetch the value using get('getdata')
        'ConferenceList': ConferenceList,
        //csrfmiddlewaretoken:'{{ csrf_token }}'
        csrfmiddlewaretoken: csrftoken
      },
      dataType: 'json',
      success: function(res, status) {
        console.log(res, status);
        if (res.AllTeams.length > 0){
          ChooseTeam(res.AllTeams, res.WorldID);
        }

      },
      error: function(res) {
        alert(res.status);
      }
    });
  });

});
