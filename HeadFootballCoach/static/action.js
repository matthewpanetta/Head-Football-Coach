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


$(document).ready(function() {

  var DataPassthruHolder = $('#DataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PrimaryColor = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor = $(DataPassthruHolder).attr('SecondaryColor');

  console.log('In Action')

  $('#SimDayModalCloseButton').on('click', function(){
    console.log('Clicked on indexCreateWorldModalCloseButton!!', this);
    $('#SimDayModal').css({'display': 'none'});
    $(window).unbind();
  });

  $('#SimThisWeek, #SimNextMonth, #SimRegularSeason').click(function(e) {

    $('#SimDayModal').css({'display': 'block'});

    $(window).on('click', function(event) {
      if ($(event.target)[0] == $('#SimDayModal')[0]) {
        $('#SimDayModal').css({'display': 'none'});
        $(window).unbind();
      }
    });
    //var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
    $.ajaxSetup({
      beforeSend: function(xhr, settings) {
        // if not safe, set csrftoken
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
          xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
      }
    });

    var days = $(this).attr('id');
    console.log($(this));
    console.log($(this).attr('id'));


    $.ajax({
      method: "POST",
      url: "/World/"+WorldID+"/SimDay/",
      data: {
        // here getdata should be a string so that
        // in your views.py you can fetch the value using get('getdata')
        'Days': days,
        //csrfmiddlewaretoken:'{{ csrf_token }}'
        csrfmiddlewaretoken: csrftoken
      },
      dataType: 'json',
      success: function(res, status) {
        console.log(res, status);
        if (res['redirect'] == '')  {
          location.reload();
        }
        else {
          window.location = res['redirect'];
        }
        //
      },
      error: function(res) {
        alert(res.status);
      }
    });

  });

  $('.nav-tab-button').on('click', function(event, target) {

    var ClickedTab = $(event.target)[0];
    console.log(event, target);
    $.each($('.selected-tab'), function(index, tab){
      var TargetTab = $(tab);
      console.log(TargetTab);
      $(TargetTab).css('backgroundColor', '');
      $(TargetTab).removeClass('selected-tab');
      console.log(TargetTab);
    });

    console.log('ClickedTab', ClickedTab);
    $(ClickedTab).addClass('selected-tab');
//    $(ClickedTab).css({'background-color': "#{{playerTeam.TeamColor_Secondary_HEX}}"});
    $(ClickedTab).css('background-color', SecondaryColor);


    var NewTabContent = $('#' + $(this).attr('id').replace('-tab', ''))[0];
    console.log('new tab??  #' + $(this).attr('id').replace('-tab', ''), NewTabContent);

    $.each($('.tab-content'), function(index, OldTabContent){
      console.log('hiding ', $(OldTabContent));
      $(OldTabContent).css('display', 'none');
      //$(OldTabContent).addClass('w3-hide');
    });

    $(NewTabContent).css('display', 'block');
    //$(NewTabContent).removeClass('w3-hide');
  });
});
