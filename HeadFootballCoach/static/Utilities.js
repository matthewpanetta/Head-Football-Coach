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



function NumberToGrade(NumberValue) {

    var returnVal = 'NA'

    var GradeValueMap = [
        {'LetterGrade': 'A+', 'LowerBound': 91, 'UpperBound': 1000},
        {'LetterGrade': 'A',  'LowerBound': 86, 'UpperBound': 90},
        {'LetterGrade': 'A-', 'LowerBound': 81, 'UpperBound': 85},
        {'LetterGrade': 'B+', 'LowerBound': 76, 'UpperBound': 80},
        {'LetterGrade': 'B',  'LowerBound': 71, 'UpperBound': 75},
        {'LetterGrade': 'B-', 'LowerBound': 66, 'UpperBound': 70},
        {'LetterGrade': 'C+', 'LowerBound': 61, 'UpperBound': 65},
        {'LetterGrade': 'C',  'LowerBound': 56, 'UpperBound': 60},
        {'LetterGrade': 'C-', 'LowerBound': 51, 'UpperBound': 55},
        {'LetterGrade': 'D+', 'LowerBound': 46, 'UpperBound': 50},
        {'LetterGrade': 'D',  'LowerBound': 41, 'UpperBound': 45},
        {'LetterGrade': 'D-', 'LowerBound': 36, 'UpperBound': 40},
        {'LetterGrade': 'F',  'LowerBound': 31, 'UpperBound': 35},
        {'LetterGrade': 'F-', 'LowerBound': -1000, 'UpperBound': 30},
    ]

    $.each(GradeValueMap, function(ind, GradeObj){
      if ((NumberValue >= GradeObj['LowerBound']) && (NumberValue <= GradeObj['UpperBound'])){
        GradeObj['GradeClass'] =
          returnVal = GradeObj['LetterGrade']
      }
    });

    return returnVal
}

function NumberToGradeClass(NumberValue){
    return NumberToGrade(NumberValue).replace('-', '-Minus').replace('+', '-Plus');

}

function NumberToGrade_True(NumberValue){

    var GradeValueMap = [
        {'LetterGrade': 'A+', 'GradeClass': 'A-Plus',  'LowerBound': 91, 'UpperBound': 1000},
        {'LetterGrade': 'A',  'GradeClass': 'A',       'LowerBound': 86, 'UpperBound': 90},
        {'LetterGrade': 'A-', 'GradeClass': 'A-Minus', 'LowerBound': 81, 'UpperBound': 85},
        {'LetterGrade': 'B+', 'GradeClass': 'B-Plus',  'LowerBound': 76, 'UpperBound': 80},
        {'LetterGrade': 'B',  'GradeClass': 'B',       'LowerBound': 71, 'UpperBound': 75},
        {'LetterGrade': 'B-', 'GradeClass': 'B-Minus', 'LowerBound': 66, 'UpperBound': 70},
        {'LetterGrade': 'C+', 'GradeClass': 'C-Plus',  'LowerBound': 61, 'UpperBound': 65},
        {'LetterGrade': 'C',  'GradeClass': 'C',       'LowerBound': 56, 'UpperBound': 60},
        {'LetterGrade': 'C-', 'GradeClass': 'D-Minus', 'LowerBound': 51, 'UpperBound': 55},
        {'LetterGrade': 'D+', 'GradeClass': 'D-Plus',  'LowerBound': 46, 'UpperBound': 50},
        {'LetterGrade': 'D',  'GradeClass': 'D',       'LowerBound': 41, 'UpperBound': 45},
        {'LetterGrade': 'D-', 'GradeClass': 'D-Minus', 'LowerBound': 36, 'UpperBound': 40},
        {'LetterGrade': 'F',  'GradeClass': 'F',       'LowerBound': 31, 'UpperBound': 35},
        {'LetterGrade': 'F-', 'GradeClass': 'F-Minus', 'LowerBound': -1000, 'UpperBound': 30},
    ]

    var GradeReturn = $.grep(GradeValueMap, function(d){
      return NumberValue >= d.LowerBound && NumberValue <= d.UpperBound;
    });

    if (GradeReturn.length > 0){
      return GradeReturn[0];
    }

    return {'LetterGrade': 'F-', 'GradeClass': 'F-Minus'}
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
