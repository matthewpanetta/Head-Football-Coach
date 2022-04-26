// from django import template
// from colour import Color
// register = template.Library()
//
// @register.filter
// def modulo(num, val):
//     return num % val
//
//
// @register.filter
// def one_more(_1, _2):
//     return (_1, _2)
//
// @register.filter
// def ChooseNameToDisplay(_1_2, _3):
//     MaxLetters = 12
//     _1, _2 = _1_2
//     Options = [_1, _2, _3]
//     for Option in Options:
//         if len(Option) <= MaxLetters:
//             return Option
//
//
// @register.filter
// def ColorScale(val, args):
//
//     if args is None:
//         return False
//     arg_list = [arg.strip() for arg in args.split(',')]
//
//     MaxVal = int(arg_list[0]) + 2
//
//     BaseColor_Hex = arg_list[1]
//     MaxColor_Hex = arg_list[2]
//
//     if val == 0:
//         return f'#{BaseColor_Hex}'
//
//     BaseColor = Color('#'+BaseColor_Hex)
//     MaxColor = Color('#'+MaxColor_Hex)
//
//     ColorRange = list(MaxColor.range_to(BaseColor, MaxVal))
//     ColorRange.reverse()
//     NewColor = ColorRange[val + 1]
//     NewColor_Hex = NewColor.hex
//
//
//     if val == MaxVal - 2:
//         count = 0
//         for u in ColorRange:
//             print(count, u)
//             count +=1
//
//     return NewColor_Hex
//
// @register.filter
// def PeriodMap(num):
//     PeriodDict = {
//         5: 'OT',
//         6: '2OT',
//         7: '3OT',
//         8: '4OT'
//     }
//     if num in PeriodDict:
//         return PeriodDict[num]
//     return num
//
// @register.filter
// def keyvalue(dict, key):
//     return dict[key]
//
//
// @register.filter
// def NumberToGrade(NumberValue):
//
//     GradeValueMap = [
//         {'letter_grade': 'A+', 'lower_bound': 91, 'upper_bound': 1000},
//         {'letter_grade': 'A',  'lower_bound': 86, 'upper_bound': 90},
//         {'letter_grade': 'A-', 'lower_bound': 81, 'upper_bound': 85},
//         {'letter_grade': 'B+', 'lower_bound': 76, 'upper_bound': 80},
//         {'letter_grade': 'B',  'lower_bound': 71, 'upper_bound': 75},
//         {'letter_grade': 'B-', 'lower_bound': 66, 'upper_bound': 70},
//         {'letter_grade': 'C+', 'lower_bound': 61, 'upper_bound': 65},
//         {'letter_grade': 'C',  'lower_bound': 56, 'upper_bound': 60},
//         {'letter_grade': 'C-', 'lower_bound': 51, 'upper_bound': 55},
//         {'letter_grade': 'D+', 'lower_bound': 46, 'upper_bound': 50},
//         {'letter_grade': 'D',  'lower_bound': 41, 'upper_bound': 45},
//         {'letter_grade': 'D-', 'lower_bound': 36, 'upper_bound': 40},
//         {'letter_grade': 'F',  'lower_bound': 31, 'upper_bound': 35},
//         {'letter_grade': 'F-', 'lower_bound': -1000, 'upper_bound': 30},
//     ]
//
//     for GradeObj in GradeValueMap:
//         if NumberValue >= GradeObj['lower_bound'] and NumberValue <= GradeObj['upper_bound']:
//             return GradeObj['letter_grade']
//
//     return 'NA'
//
//
// @register.filter
// def NumberToGradeClass(NumberValue):
//
//     return NumberToGrade(NumberValue).replace('-', '-Minus').replace('+', '-Plus')
//
//
// @register.filter
// def TeamBackgroundFontColor(BackgroundColor):
//     R = int(BackgroundColor[:2], 16)
//     G = int(BackgroundColor[2:4], 16)
//     B = int(BackgroundColor[4:6], 16)
//
//     Luma = (0.299 * (R**2) + 0.587 * (G**2) + 0.114 * (B**2)) ** .5
//     if Luma > 200:
//         return "000"
//
//     return "FFF"
//
//
// @register.filter
// def EndzoneStrokeColor(SecondaryColor):
//     R = int(SecondaryColor[:2], 16)
//     G = int(SecondaryColor[2:4], 16)
//     B = int(SecondaryColor[4:6], 16)
//
//     Luma = (0.299 * (R**2) + 0.587 * (G**2) + 0.114 * (B**2)) ** .5
//     if Luma > 200:
//         return "000"
//
//     return "FFF"
//


function get_nunjucks_env() {
  var env = new nunjucks.Environment();

  env.addFilter("TeamBackgroundFontColorBlack", function (BackgroundColor) {
    if (BackgroundColor == undefined) {
      BackgroundColor = "FFFFFF";
    }
    var R = parseInt(BackgroundColor.slice(0, 2), 16);
    var G = parseInt(BackgroundColor.slice(2, 4), 16);
    var B = parseInt(BackgroundColor.slice(4, 6), 16);

    var Luma = (0.299 * R ** 2 + 0.587 * G ** 2 + 0.114 * B ** 2) ** 0.5;
    if (Luma > 200) {
      return "000";
    }
    return BackgroundColor;
  });

  env.addFilter("TeamBackgroundFontColor", function (BackgroundColor) {
    if (BackgroundColor == undefined) {
      BackgroundColor = "FFFFFF";
    }
    var R = parseInt(BackgroundColor.slice(0, 2), 16);
    var G = parseInt(BackgroundColor.slice(2, 4), 16);
    var B = parseInt(BackgroundColor.slice(4, 6), 16);

    var Luma = (0.299 * R ** 2 + 0.587 * G ** 2 + 0.114 * B ** 2) ** 0.5;
    if (Luma > 200) {
      return "000";
    }
    return "FFF";
  });

  env.addFilter("toLocaleString", function (val) {
    return (val || "").toLocaleString("en-US");
  });

  env.addFilter("NumberToGradeClass", function (NumberValue) {
    return NumberToGrade(NumberValue)
      .replace("-", "-Minus")
      .replace("+", "-Plus");
  });

  env.addFilter("RoundDown", function (NumberValue) {
    return Math.floor(NumberValue || 0);
  });

  env.addFilter("OrZero", function (NumberValue) {
    return NumberValue || 0;
  });

  env.addFilter("NumberToGrade", function (number_value) {
    const grade_value_map = [
      { letter_grade: "A+", lower_bound: 91, upper_bound: 1000 },
      { letter_grade: "A", lower_bound: 86, upper_bound: 90 },
      { letter_grade: "A-", lower_bound: 81, upper_bound: 85 },
      { letter_grade: "B+", lower_bound: 76, upper_bound: 80 },
      { letter_grade: "B", lower_bound: 71, upper_bound: 75 },
      { letter_grade: "B-", lower_bound: 66, upper_bound: 70 },
      { letter_grade: "C+", lower_bound: 61, upper_bound: 65 },
      { letter_grade: "C", lower_bound: 56, upper_bound: 60 },
      { letter_grade: "C-", lower_bound: 51, upper_bound: 55 },
      { letter_grade: "D+", lower_bound: 46, upper_bound: 50 },
      { letter_grade: "D", lower_bound: 41, upper_bound: 45 },
      { letter_grade: "D-", lower_bound: 36, upper_bound: 40 },
      { letter_grade: "F", lower_bound: 31, upper_bound: 35 },
      { letter_grade: "F-", lower_bound: -1000, upper_bound: 30 },
    ];

    const letter_grade = grade_value_map.filter(
      (grade) =>
        grade.lower_bound <= number_value && grade.upper_bound >= number_value
    )[0];

    return letter_grade;
  });

  env.addFilter("ordinal", function (num) {
    return ordinal(num);
  });

  env.addFilter("TeamSecondaryColor", function (Color) {
    var R = parseInt(Color.slice(0, 2), 16);
    var G = parseInt(Color.slice(2, 4), 16);
    var B = parseInt(Color.slice(4, 6), 16);

    var Luma = (0.299 * R ** 2 + 0.587 * G ** 2 + 0.114 * B ** 2) ** 0.5;

    if (Luma > 230) {
      return "000";
    }
    return Color;
  });

  env.addFilter("Color_RGB_With_Opacity", function (Color) {
    var R = parseInt(Color.slice(0, 2), 16);
    var G = parseInt(Color.slice(2, 4), 16);
    var B = parseInt(Color.slice(4, 6), 16);

    return `rgb(${R},${G},${B},.125)`;
  });

  env.addFilter("toLocaleDateString", function (DateInt) {
    const Dt = new Date(DateInt);
    return Dt.toLocaleString("en-US", { dateStyle: "short" });
  });

  env.addFilter("toLocaleTimeString", function (DateInt) {
    const Dt = new Date(DateInt);
    return Dt.toLocaleString("en-US", { timeStyle: "short" });
  });

  env.addFilter("log", function (Obj) {
    console.log("Logging from template", Obj);
  });

  env.addFilter("round", function (val) {
    return val.toFixed(0);
  });

  env.addFilter("coalesce", function (val_a, val_b) {
    return val_a ?? val_b;
  });

  return env;
}
