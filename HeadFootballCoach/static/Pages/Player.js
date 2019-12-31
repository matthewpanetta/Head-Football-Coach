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
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryJerseyColor');
  //console.log('Datapassthru', DataPassthruHolder, PrimaryColor, SecondaryColor,WorldID , PlayerID);

  console.log('face before generate', face, TeamJerseyStyle, TeamJerseyInvert);

  var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}
  overrides['jersey'] = {'id': 'football'}

  console.log('face after generate', face);
  display('PlayerFace', face, overrides);
}
