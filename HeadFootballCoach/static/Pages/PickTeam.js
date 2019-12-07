$(document).ready(function(){
  $('.teamChoice').click(function(t){
    console.log($(t['target']).attr('id').replace('CoachTeam',''));

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

            $.ajaxSetup({
              beforeSend: function (xhr, settings) {
                      // if not safe, set csrftoken
                      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                          xhr.setRequestHeader("X-CSRFToken", csrftoken);
                      }
                  }
              });

            $.ajax({
                method: "POST",
                url: "/PickTeam/",
                data: {
                    // here getdata should be a string so that
                    // in your views.py you can fetch the value using get('getdata')
                    'TeamID': parseInt($(t['target']).attr('id').replace('CoachTeam','')),
                    //csrfmiddlewaretoken:'{{ csrf_token }}'
                    csrfmiddlewaretoken: csrftoken
                },
                dataType: 'json',
                success: function (res, status) {
                    window.location.replace("/");
                },
                error: function (res) {
                    alert(res.status);
                }
            });

})
});
