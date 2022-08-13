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

  env.addFilter('DefaultIfTooLight', function(first_color, second_color){
    var R = parseInt(first_color.slice(0, 2), 16);
    var G = parseInt(first_color.slice(2, 4), 16);
    var B = parseInt(first_color.slice(4, 6), 16);

    var Luma = (0.299 * R ** 2 + 0.587 * G ** 2 + 0.114 * B ** 2) ** 0.5;
    console.log({first_color:first_color, second_color:second_color, Luma:Luma})
    if (Luma > 200) {
      return second_color;
    }
    
    return first_color;
  });

  env.addFilter('get', function(obj, key){
    console.log({get:get, obj:obj, key:key})
    return get(obj, key)
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
