
function DrawFaces(){

  var FacesToBuild =  $('[hasplayerfacejson="1"]');

  var overrides = {"teamColors":["blue","black","#FFF"]}

  $.each(FacesToBuild, function(index,FaceDiv){
    var FaceElement = $(FaceDiv).find('.PlayerFaceDisplay')[0];
    var FaceJson = $(FaceDiv).attr('PlayerFaceJson').replace(/'/g, '"');
    var PlayerFaceJson = JSON.parse(FaceJson);
    BuildFace(PlayerFaceJson, undefined, undefined, overrides = [], DOMID = $(FaceElement).attr('id'));
  });
}


function DrawRecruitingTable(WorldID){

  var RecruitTable = $('#recruitingMainTable').DataTable({
    'searching': true,
    'info': false,
    "serverSide": true,
    "pageLength": 10,
    'ajax': {
        "url": "/World/"+WorldID+"/RecruitingPlayers",
        "type": "GET",
        "data": function ( d ) {

          console.log('Going to post... ', d);
          return d;
        },
        "dataSrc": function ( json ) {
             console.log('json', json);
             return json['data'];
        }
     },
     'fixedColumns': {
    		'leftColumns': 3
    	},
     "columns": [
       {"data": "Recruiting_NationalRank", "sortable": true, 'searchable': true, 'className': 'recruiting-player-rank', 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
         $(td).html(`<div class="">
                        <span>`+StringValue+`</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>State `+DataObject.Recruiting_StateRank+`</span>
                    </div>
                    <div class="recruiting-player-city font10">
                      <span>Pos `+DataObject.Recruiting_NationalPositionalRank+`</span>
                    </div>`)
       }},
         {"data": "PlayerFaceJson", "searchable": true, "fnCreatedCell": function (td, StringValue, DataObject, iRow, iCol) {
            $(td).attr('HasPlayerFaceJSON', '1');
            console.log('StringValue',StringValue);
            $(td).attr('PlayerFaceJson', StringValue);
            $(td).html("<div class='PlayerFaceDisplay' id='PlayerFaceDisplay"+DataObject.PlayerID+"' style='height: 70px;width: 40px;'></div>");
            //console.log('td', $(td), $(td).find('div'));

         }},
         {"data": "PlayerName", "visible": true, "sortable": true, 'searchable': true, 'className': 'text-left', 'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           $(td).html(`<div class="recruiting-player-name font16">
                          <a  href="/World/`+WorldID+`/Player/`+DataObject.PlayerID+`"> `+
                            StringValue
                          +`</a>
                      </div>
                      <div class="recruiting-player-city font10">`+
                          DataObject.CityID__CityName+', '+DataObject.CityID__StateID__StateAbbreviation
                      +`</div>`)
         }},
         {"data": "PositionID__PositionAbbreviation", "sortable": true, 'searchable': true,  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           $(td).html(`<div class="section font16">
                         <span>`+StringValue+`</span>
                       </div>
                       <div class="font10">
                         <span>`+'Style'+`</span>
                       </div>`)
         }},
         {"data": "Height", "sortable": true, 'orderSequence':["desc", "asc"], 'className': 'font16','render':function ( data, type, row ) {  return row.HeightFormatted;}},
         {"data": "WeightFormatted", "sortable": true, 'orderSequence':["desc", "asc"], 'className': 'font16'},
         {"data": "Intelligence", "sortable": true, 'orderSequence':["desc", "asc"]},
         {"data": "Athleticism", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
         {"data": "Passing", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"]},
         {"data": "playerteamseason__recruitteamseason__ScoutedOverall", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"],  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           $(td).html(`<div class="section font16">
                         <span>`+StringValue+` Ovr</span>
                       </div>
                       <div class="font10">
                         <span>`+DataObject.RecruitingPointsPercent+`% Signed</span>
                       </div>`)
         }},
         {"data": "RecruitSigned", "sortable": true, 'visible': true, 'orderSequence':["desc", "asc"],  'fnCreatedCell': function(td, StringValue, DataObject, iRow, iCol){
           var container = $('<div class="equal-sized-item-container"></div>');
           var MaxInterestLevel = 0;
           var Opacity = 100;
           var IsLeader = false;
           var Trailing = 0;
           $.each(DataObject.RecruitingTeams, function(i,o){
             IsLeader = false;
             if (o.InterestLevel >= MaxInterestLevel){
               MaxInterestLevel = o.InterestLevel;
               IsLeader = true;
             }
             else {
               Trailing = MaxInterestLevel - o.InterestLevel;
             }

             Opacity = 100 * ((o.InterestLevel / MaxInterestLevel) ** 3);

             if (o.Signed == true) {
               var subtext = 'Signed';
             }
             else if (IsLeader == true){
               var subtext = '1st';
             }
             else {
               var subtext = '-' + Trailing;
             }
             container.append($(`<div class="equal-sized-item"><div class="section font16">
                           <a href=`+o.TeamHref+`><img class='recruitingLeadingTeamLogo' style='opacity: `+Opacity+`%;' src=`+o.TeamSeasonID__TeamID__TeamLogoURL+`  /></a>
                         </div>
                         <div class="font10">
                           <span>`+subtext+`</span>
                         </div></div>`));

             if (o.Signed == true){
               return false;
             }
           })
           $(td).html('');
           $(td).append(container)



          //equal-sized-item-container
         }},
     ],
     "drawCallback": function( T,b,c,d ) {
        var api = this.api();

        api.rows().every(function ( rowIdx, tableLoop, rowLoop ) {
            var data = this.data();
        });

        var overrides = {"teamColors":["#1763B2","black","#FFF"]};
        var DOMID = '';

        api.column(1).nodes().each(function (cell, i) {
          var n = api.cell(i,1).nodes();
          var d = $(n[0]).find('div').first();

          console.log('DOMID', $(d).attr('id'));

          var FaceJson = api.cell(i,1).data().replace(/'/g, '"');
          var PlayerFaceJson = JSON.parse(FaceJson);
          BuildFace(PlayerFaceJson, 'football3', false, overrides=overrides, DOMID=$(d).attr('id'));
          });
    }
  });


    var HeightSlider = $( "#PlayerHeightSlider" ).slider({
      range: true,
      min: 66,
      max: 89,
      values: [ 66, 89 ],
      stop: function( event, ui ) {
        RecruitTable.columns(4).search( ui.values[ 0 ] + '<' +  ui.values[ 1 ]).draw();
      },
      slide: function( event, ui ) {
        $( "#PlayerHeightSliderValue" ).val( IntToHeight(ui.values[ 0 ]) + " - " + IntToHeight(ui.values[ 1 ]) );
      },
    });
    var vals = $('#PlayerHeightSlider').slider("values");
    $( "#PlayerHeightSliderValue" ).val( IntToHeight(vals[ 0 ]) + " - " + IntToHeight(vals[ 1 ]) );

    $( "#PlayerOverallSlider" ).slider({
      range: true,
      min: 50,
      max: 99,
      values: [ 50, 99 ],
      stop: function( event, ui ) {
        RecruitTable.columns(9).search( ui.values[ 0 ] + '<' +  ui.values[ 1 ]).draw();
      },
      slide: function( event, ui ) {
        $( "#PlayerOverallSliderValue" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
      },
    });
    var vals = $('#PlayerOverallSlider').slider("values");
    $( "#PlayerOverallSliderValue" ).val( vals[ 0 ] + " - " + vals[ 1 ] );

}


function DrawNationalRankTable(WorldID){


  var recruitingNationalRankingTable = $('#recruitingNationalRankingTable').DataTable({
    'paging': false,
    'searching': false,
    'info': false,
    "columns": [
        { "orderSequence": [ "asc" ] },
        { "orderSequence": [ "asc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
        { "orderSequence": [ "desc" ] },
      ]
  });
}



$(document).ready(function(){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID = parseInt($(DataPassthruHolder).attr('WorldID'));
  console.log('in Recruiting.js file')


  DrawFaces();
  DrawRecruitingTable(WorldID);
  DrawNationalRankTable(WorldID);

});
