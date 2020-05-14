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

function PlayerAction(WorldID){

  $(document).on('click', '.player-action', function(event){
    var ActionTarget = $(event.target)[0];
    ActionTarget = $(ActionTarget)

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
    console.log('clicked on this ', ActionTarget.baseURI, ActionTarget[0].baseURI, ActionTarget.baseURL, ActionTarget[0].baseURL)
    var SourcePath = String(ActionTarget[0].baseURI);

    console.log('SourcePath', SourcePath, 'Path', Path)

    if (SourcePath.indexOf('Player') != -1){
      Source = 'PlayerPage'
    }
    else {
      Source = 'PlayerCard'
    }

    if (Path.indexOf('Cut') != -1){
      ConfirmText = 'Are you sure you want to cut '+$(ActionTarget).attr('confirm-info')+'? This cannot be undone.';
      Action = 'Cut';
    }
    else if (Path.indexOf('Redshirt') != -1){
      if (Path.indexOf('Remove') != -1){
        ConfirmText = 'Are you sure you want to remove the redshirt of '+$(ActionTarget).attr('confirm-info')+'?';
        Action = 'Remove Redshirt';
      }
      else if (Path.indexOf('Add') != -1){
        ConfirmText = 'Are you sure you want to redshirt '+$(ActionTarget).attr('confirm-info')+'?';
        Action = 'Add Redshirt';
      }

    }
    else if (Path.indexOf('Captain') != -1){
      if (Path.indexOf('Remove') != -1){
        ConfirmText = 'Are you sure you want to remove '+$(ActionTarget).attr('confirm-info')+' as a captain?';
        Action = 'Remove Captain';
      }
      else if (Path.indexOf('Add') != -1){
        ConfirmText = 'Are you sure you make '+$(ActionTarget).attr('confirm-info')+' a captain?';
        Action = 'Add Captain';
      }
    }

    var UserConfirm = confirm(ConfirmText);
    if (UserConfirm == true) {


      $.ajax({
        method: "POST",
        url: Path,
        data: {
          csrfmiddlewaretoken: csrftoken
        },
        dataType: 'json',
        success: function(res, status) {
          console.log(res, status);
          alert(res.message)

          if (Source == 'PlayerPage') {
            if (Action == 'Cut') {
              window.location = '/World/'+WorldID;
            }
            else if (Action == 'Add Redshirt') {
              $('.player-class').append('<i class="fas fa-tshirt player-class-icon" style="color: red; margin-left: 4px;"></i>')
              $(ActionTarget).text('Remove Redshirt');
              $(ActionTarget).attr('background-ajax', Path.replace('Add', 'Remove'));
            }
            else if (Action == 'Remove Redshirt') {
              $('.player-class-icon').remove();
              $(ActionTarget).text('Redshirt player');
              $(ActionTarget).attr('background-ajax', Path.replace('Remove', 'Add'));
              //CHANGE BUTTON
            }
            else if (Action == 'Add Captain') {
              $('.player-captain').html('<i class="fas fa-crown w3-text-green"></i><span class="italic">Team Captain</span>');
              $(ActionTarget).text('Remove as Captain');
              $(ActionTarget).attr('background-ajax', Path.replace('Add', 'Remove'));
              //CHANGE BUTTON
            }
            else if (Action == 'Remove Captain') {
              $('.player-captain').empty();
              $(ActionTarget).text('Add as Captain');
              $(ActionTarget).attr('background-ajax', Path.replace('Remove', 'Add'));
              //CHANGE BUTTON
            }
          }
          else {
            var ParentRow = $(ActionTarget).closest('tr.teamTableBorder');
            var ParentSourceRow = $(ActionTarget).closest('tr.teamTableBorder').prev();
            if (Action == 'Cut') {
              $(ParentSourceRow).remove();
              $(ParentRow).remove();
            }
            else if (Action == 'Add Redshirt') {
              $(ParentRow).find('.player-class').append('<i class="fas fa-tshirt player-class-icon" style="color: red; margin-left: 4px;"></i>')
              $(ParentSourceRow).find('.player-class').append('<i class="fas fa-tshirt player-class-icon" style="color: red; margin-left: 4px;"></i>')
              $(ActionTarget).text('Remove Redshirt');
              $(ActionTarget).attr('background-ajax', Path.replace('Add', 'Remove'));
              //CHANGE BUTTON
            }
            else if (Action == 'Remove Redshirt') {
              $(ParentRow).find('.player-class-icon').remove();
              $(ParentSourceRow).find('.player-class-icon').remove();
              $(ActionTarget).text('Redshirt player');
              $(ActionTarget).attr('background-ajax', Path.replace('Remove', 'Add'));
              //CHANGE BUTTON
            }
            else if (Action == 'Add Captain') {
              $(ParentRow).find('.player-captain').html('<i class="fas fa-crown w3-text-green"></i><span class="italic">Team Captain</span>');
              $(ActionTarget).text('Remove as Captain');
              $(ActionTarget).attr('background-ajax', Path.replace('Add', 'Remove'));
              //CHANGE BUTTON
            }
            else if (Action == 'Remove Captain') {
              $(ParentRow).find('.player-captain').empty();
              $(ActionTarget).text('Add as Captain');
              $(ActionTarget).attr('background-ajax', Path.replace('Remove', 'Add'));
              //CHANGE BUTTON
            }
          }

        },
        error: function(res) {
          console.log(res)
          alert(res.responseJSON.message);
        }
      });

    }
    });

}


$(document).ready(function() {

  var DataPassthruHolder = $('#DataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PrimaryColor = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor = $(DataPassthruHolder).attr('SecondaryColor');

  console.log('In Action');
  PlayerAction(WorldID);

  $('#SimDayModalCloseButton').on('click', function(){
    console.log('Clicked on indexCreateWorldModalCloseButton!!', this);
    $('#SimDayModal').css({'display': 'none'});
    $(window).unbind();
  });

  $('#SimThisWeek:not(.w3-disabled)').click(function(e) {

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

    if ($(this).attr('id') == 'nav-sidebar-tab'){
      $('#sidebar').addClass('sidebar-open');
      $('.sidebar-fade').addClass('sidebar-fade-open');


        $('.sidebar-fade-open').on('click', function(){
          $(this).removeClass('sidebar-fade-open');
          $('#sidebar').removeClass('sidebar-open');
        });
      return false;
    }

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
