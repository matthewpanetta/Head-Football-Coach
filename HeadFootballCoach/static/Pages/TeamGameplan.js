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


$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var TeamID    = parseInt($(DataPassthruHolder).attr('TeamID'));

  BuildGameplan(WorldID, TeamID);

});



function BuildGameplan(WorldID, TeamID) {

  $.ajaxSetup({
    beforeSend: function(xhr, settings) {
      // if not safe, set csrftoken
      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });


  $('.slider').each(function(){
    var Min = parseInt($(this).attr('min'));
    var Max = parseInt($(this).attr('max'));
    var Def = parseInt($(this).attr('default'));
    var Step = parseInt($(this).attr('step'));
    var Disabled = $(this).attr('disable');
    console.log('Disabled', Disabled)
    if (Disabled == 'disabled'){
      Disabled = true;
    }
    else{
      Disabled = false;
    }
    console.log('Disabled', Disabled)
    $( this ).slider({
      value:Def,
      min: Min,
      max: Max,
      step: Step,
      disabled: Disabled,
      slide: function( event, ui ) {
        $(this).siblings('.label').text( ui.value )

      }
    });
    $(this).siblings('.label').text( Def )
  })


  $('button.save-gameplan').click(function(){
    var FieldsToSave = {}
    $('.w3-select').children('option:selected').each(function(){
      var Field = $(this).parent().first().attr('field');
      FieldsToSave[Field] = $(this).attr('value');

    });
    $('.slider').each(function(){
      Field = $(this).attr('field');
      FieldsToSave[Field] = $(this).siblings('.label').text();
    });
    console.log(FieldsToSave);

    var DoPost = true;

    if (DoPost) {
      $.ajax({
        method: "POST",
        url: "/World/"+WorldID+"/Team/"+TeamID+"/SetTeamGameplan",
        data: {
          'TeamGameplan': FieldsToSave,
          csrfmiddlewaretoken: csrftoken
        },
        dataType: 'json',
        success: function(res, status) {
          console.log(res, status);
          alert('Gameplan saved successfully');
        },
        error: function(res) {
          alert(res.status);
        }
      });
    }
  });
}
