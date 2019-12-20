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


function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  console.log('DataPassthruHolder',DataPassthruHolder);
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));
  var PrimaryColor    = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryColor');
  console.log(DataPassthruHolder, PrimaryColor, SecondaryColor,WorldID , PlayerID);

  console.log('face before generate', face, TeamJerseyStyle, TeamJerseyInvert);
  if (true === false){//(face == '' || face == undefined){
    console.log('face was empty');
    face = generate();

    $.ajax({
      method: "POST",
      url: "/World/"+WorldID+"/Player/"+PlayerID+"/SetPlayerFaceJSON",
      data: {
        csrfmiddlewaretoken: csrftoken,
        PlayerFaceJson: JSON.stringify(face)
      },
      dataType: 'json',
      success: function(res, status) {
        console.log(res, status);
      },
      error: function(res) {
        alert(res.status);
      }
    });
  }
  if (TeamJerseyInvert == 'True') {
    var overrides = {"teamColors":["#FFFFFF", "#"+PrimaryColor,"#"+SecondaryColor]}
  }
  else {
    var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}

  }
  overrides['jersey'] = {'id': TeamJerseyStyle}

  console.log('face after generate', face);
  display('PlayerFace', face, overrides);
}
