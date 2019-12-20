
function DrawFaces(){
//  BuildFace({{player.PlayerFaceJson|safe}}, '{{playerTeam.TeamJerseyStyle}}', '{{playerTeam.TeamJerseyInvert}}');

  $.each($('[hasplayerfacejson="1"]'), function(index,FaceDiv){
    var FaceElement = $(FaceDiv).find('.PlayerFaceDisplay')[0];
    var FaceJson = $(FaceDiv).attr('PlayerFaceJson').replace(/'/g, '"');
    var PlayerFaceJson = JSON.parse(FaceJson);
    BuildFace(PlayerFaceJson, $(FaceElement).attr('id'));
  });
}



function BuildFace(face, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));

  var overrides = undefined;
  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  display(DOMID, face, overrides);
}



$(document).ready(function(){

  console.log('in Recruiting.js file')


  DrawFaces();

});
