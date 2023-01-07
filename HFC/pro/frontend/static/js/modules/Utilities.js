function ordinal_suffix_of(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}


function IntToHeight(Val){
  var Feet = parseInt(Val / 12);
  var Inches = Val % 12;
  return Feet + '\' ' + Inches + '"';
}





function BuildFace(face, TeamJerseyStyle, TeamJerseyInvert, overrides=undefined, DOMID=undefined){
  var DataPassthruHolder = $('#PageDataPassthru')[0];
  var WorldID    = parseInt($(DataPassthruHolder).attr('WorldID'));
  var PlayerID   = parseInt($(DataPassthruHolder).attr('PlayerID'));

  console.log('face', face, 'TeamJerseyStyle, TeamJerseyInvert', TeamJerseyStyle, TeamJerseyInvert)
  if (face == '' || face == undefined){
    return 0;
  }
  if (TeamJerseyInvert == true) {
    console.log('overrides', overrides);
    overrides.teamColors.pop();
    overrides.teamColors.unshift('#FFFFFF');
  }

  console.log('overrides', overrides);
  if (TeamJerseyStyle == undefined) {
    overrides['jersey'] = {'id': 'football'};
  }
  else {
    overrides['jersey'] = {'id': TeamJerseyStyle}
  }
  console.log('overrides', overrides);

  //overrides['jersey'] = {'id': TeamJerseyStyle}

  if (DOMID == undefined){
    DOMID = 'PlayerFace';
  }
  display(DOMID, face, overrides);
}

function LikertScale( Value){
  var ScaleOptions = {
    '-3': 'Very Low',
    '-2': 'Low',
    '-1': 'Somewhat Low',
     '0': 'Balanced',
     '1': 'Somewhat High',
     '2': 'High',
     '3': 'Very High',
  };

  return ScaleOptions[Value]
}
