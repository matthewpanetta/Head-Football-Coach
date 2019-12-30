
function DrawFaces(){
//  BuildFace({{player.PlayerFaceJson|safe}}, '{{playerTeam.TeamJerseyStyle}}', '{{playerTeam.TeamJerseyInvert}}');

  var FacesToBuild =  $('[hasplayerfacejson="1"]');

  $.each(FacesToBuild, function(index,FaceDiv){
    var FaceElement = $(FaceDiv).find('.PlayerFaceDisplay')[0];
    var FaceJson = $(FaceDiv).attr('PlayerFaceJson').replace(/'/g, '"');
    var PlayerFaceJson = JSON.parse(FaceJson);
    BuildFace(PlayerFaceJson, $(FaceElement).attr('id'));
  });
}



function BuildFace(face, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  //console.log('DataPassthruHolder',DataPassthruHolder);

  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PrimaryColor    = $(DataPassthruHolder).attr('PrimaryColor');
  var SecondaryColor  = $(DataPassthruHolder).attr('SecondaryColor');
  var overrides = {"teamColors":["#"+PrimaryColor,"#"+SecondaryColor,"#000000"]}
  overrides['jersey'] = {'id': 'football'}

  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  console.log(DOMID, overrides);

  display(DOMID, face, overrides);

}



$(document).ready(function(){

  console.log('in Recruiting.js file')


  DrawFaces();

});
