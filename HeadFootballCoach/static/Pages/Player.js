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


//PlayerSeasonStatTableClone

function PopulatePlayerSeasonStats(WorldID, PlayerID){

  console.log('Getting player stats!');
  $.ajax({
    method: "GET",
    url: "/World/"+WorldID+"/Player/"+PlayerID+'/PlayerStats',
    data: {
      csrfmiddlewaretoken: csrftoken
    },
    dataType: 'json',
    success: function(res, status) {
      console.log(res, status);

      $.each(res, function(ind, obj){
        DrawPlayerStats(obj);
      })

    },
    error: function(res) {
      alert(res.status);
    }
  });

  return null;
}

function DrawPlayerStats(data){
  console.log('drawing player stats!', data);

  var columns = [
  ];
  var columns = $.grep(data.Stats, function(n, i){
    return n.DisplayColumn
  });



  var Parent = $('#PlayerSeasonStatTableClone').parent();

  var ParentRow = $('<div></div>').addClass('margin-top-24').addClass('w3-row-padding');
  $(ParentRow).appendTo(Parent);

  var ParentCol = $('<div></div>').addClass('w3-col').addClass('s8');
  $(ParentCol).appendTo(ParentRow);

  var ParentCard = $('<div></div>').addClass('w3-card');
  $(ParentCard).appendTo(ParentCol);


  var CareerHighParentCol = $('<div></div>').addClass('w3-col').addClass('s4');
  $(CareerHighParentCol).appendTo(ParentRow);

  var CareerHighParentCard = $('<div></div>').addClass('w3-card');
  $(CareerHighParentCard).appendTo(CareerHighParentCol);


  var CareerHighTable = $('#PlayerCareerHighTableClone').clone().removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerCareerHighTable-'+data.StatGroupName)

  var Table = $('#PlayerSeasonStatTableClone').clone().removeClass('w3-hide').removeAttr('id').attr('id', 'PlayerSeasonStatTable-'+data.StatGroupName)

  if (data.CareerStats.length > 0){
    $.each(columns, function(){
      $(Table).find('tfoot tr').append('<td class="bold"></td>');
    });
  }

  $('<span>'+data.StatGroupName+' Career Highs</span>').addClass('table_title').addClass('margin-left-12').appendTo(CareerHighParentCard);
  CareerHighTable.appendTo(CareerHighParentCard);
  var CareerHighDataTable = $(CareerHighTable).DataTable({
    "data": data.CareerHighs,
    'paging': false,
    'searching': false,
    'info': false,
    'ordering': false,
    "columns": [
       {"data": "Field", "sortable": false, 'visible': true},
        {"data": "Value", "sortable": false, 'visible': true},
        {"data": "Week", "sortable": false, 'searchable': true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            console.log('td, StringValue, DataObject, iRow, iCol', td, StringValue, DataObject, iRow, iCol);
            $(td).html("vs. <img class='worldTeamStatLogo padding-right' src='"+DataObject['OpposingTeamLogo']+"'/><a href='"+DataObject['GameHref']+"'>"+StringValue+"</a>");
          //  $(td).attr('style', 'border-left-color: #' + DataObject['TeamColor_Primary_HEX']);
          //  $(td).addClass('teamTableBorder');
        }},

    ],
  });


  $('<span>'+data.StatGroupName+' Season Stats</span>').addClass('table_title').addClass('margin-left-12').appendTo(ParentCard);
  Table.appendTo(ParentCard);
  var DataTable = $(Table).DataTable( {
    data: data.SeasonStats,
    columns: columns,
    "paging": false,
    'searching': false,
    'info': false,
  });


  var Counter = 0;
  DataTable.columns().every( function () {
    console.log('column this', this, 'footer', this.footer(), 'footer jquery',  $(this.footer()));
      // ... do something with data(), or this.nodes(), etc
      $(this.footer()).html(data.CareerStats[Counter])
      Counter +=1;
  } );

  $(Table).find('th').addClass('teamColorBorder');
  $(CareerHighTable).find('th').addClass('teamColorBorder');

}

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
  overrides['jersey'] = {'id': 'football2'}

  console.log('face after generate', face);
  display('PlayerFace', face, overrides);
}


$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID  = parseInt($(DataPassthruHolder).attr('PlayerID'));


  PopulatePlayerSeasonStats(WorldID, PlayerID);

});
