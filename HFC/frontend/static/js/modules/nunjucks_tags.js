function complex_get(val) {
  let html = "";
  if (Array.isArray(val)) {
    html += '<table class="table">';
    for (let row of val) {
      html +=
        '<tr class="children-align-middle"><td class="left-text">' +
        complex_get(row) +
        "</td></tr>";
    }
    html += "</table>";
  } else if (typeof val === "object" && !Array.isArray(val) && val !== null) {
    html += '<table class="table children-align-middle">';
    for (let [field, value] of Object.entries(val)) {
      html +=
        '<tr class="children-align-middle"><th class="left-text">' +
        field +
        '</th><td class="left-text">' +
        complex_get(value) +
        "</td></tr>";
    }
    html += "</table>";
  } else {
    html = val;
  }
  console.log("complex_get", { val: val, html: html });
  return html;
}

function get_nunjucks_env() {
  const env = new nunjucks.Environment();

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

  env.addFilter("LightenColor", function (color) {
    if (color == undefined) {
      color = "FFFFFF";
    }
    var r = Math.min(parseInt(color.slice(0, 2), 16) + 48, 255);
    var g = Math.min(parseInt(color.slice(2, 4), 16) + 48, 255);
    var b = Math.min(parseInt(color.slice(4, 6), 16) + 48, 255);

    return `rgba(${r},${g},${b},1)`;
  });

  env.addFilter("DefaultIfTooLight", function (first_color, second_color) {
    var R = parseInt(first_color.slice(0, 2), 16);
    var G = parseInt(first_color.slice(2, 4), 16);
    var B = parseInt(first_color.slice(4, 6), 16);

    var Luma = (0.299 * R ** 2 + 0.587 * G ** 2 + 0.114 * B ** 2) ** 0.5;

    if (Luma > 200) {
      return second_color;
    }

    return first_color;
  });

  env.addFilter("get", function (obj, key) {
    return get(obj, key);
  });

  env.addFilter("complex_get", function (obj, key) {
    console.log("filter", { obj: obj, key: key });
    return complex_get(get(obj, key));
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

  env.addFilter("clean_number", function (val) {
    return (val || 0).toFixed(0).toLocaleString("en-US");
  });

  env.addFilter("pluralize", function (word, val) {
    if (val != 1) {
      return word + "s";
    }
    return word;
  });

  env.addFilter("NumberToRatingBadge", function (NumberValue, scale) {
    NumberValue = Math.floor((NumberValue * 1.0) / ((scale * 1.0) / 20));
    let grade_letter = NumberToGrade(NumberValue, 20);
    let badge_class = grade_letter.replace("-", "-Minus").replace("+", "-Plus");

    return `<span class='rating-badge rating-badge-${NumberValue}'>${grade_letter}</span>`;
  });

  env.addFilter("NumberToGradeBadge", function (NumberValue, scale) {
    NumberValue = Math.floor((NumberValue * 1.0) / ((scale * 1.0) / 20));
    let grade_letter = NumberToGrade(NumberValue, 20);
    let badge_class = grade_letter.replace("-", "-Minus").replace("+", "-Plus");

    return `<span class='rating-tag rating-tag-${NumberValue}'>${grade_letter}</span>`;
    // return `<span class='rating-badge rating-badge-${NumberValue}'>${grade_letter}</span>`;
  });

  env.addFilter("NumberToGradeClass", function (NumberValue, scale) {
    return NumberToGrade(NumberValue, scale).replace("-", "-Minus").replace("+", "-Plus");
  });

  env.addFilter("RoundDown", function (NumberValue) {
    return Math.floor(NumberValue || 0);
  });

  env.addFilter("OrZero", function (NumberValue) {
    return NumberValue || 0;
  });

  env.addFilter("NumberToGrade", function (number_value, scale) {
    if ((scale || 100) == 20) {
      let grade_value_map = {
        20: "Elite",
        19: "A++",
        18: "A+",
        17: "A",
        16: "A-",
        15: "B+",
        14: "B",
        13: "B",
        12: "B-",
        11: "B-",
        10: "C+",
        9: "C+",
        8: "C",
        7: "C-",
        6: "D+",
        5: "D",
        4: "D-",
        3: "F",
        2: "F-",
        1: "F-",
      };

      return grade_value_map[number_value];
    } else {
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
      const letter_grade = grade_value_map.find(
        (grade) => grade.lower_bound <= number_value && grade.upper_bound >= number_value
      ).letter_grade;

      console.log("NumberToGrade", {
        grade_value_map: grade_value_map,
        letter_grade: letter_grade,
        number_value: number_value,
        scale: scale,
      });

      return letter_grade;
    }
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

  env.addFilter("HexToRGBA", function (Color, A) {
    var R = parseInt(Color.slice(0, 2), 16);
    var G = parseInt(Color.slice(2, 4), 16);
    var B = parseInt(Color.slice(4, 6), 16);

    return `rgba(${R},${G},${B},${A})`;
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

  env.addFilter("element_type", function (elem) {
    var type = Object.prototype.toString.call(elem);
    if (type === "[object Object]") {
      return "Object";
    } else if (type === "[object Array]") {
      return "Array";
    } else if (type === "[object Boolean]") {
      return "Boolean";
    } else if (type === "[object Number]") {
      return "Number";
    } else {
      return "String";
    }
  });

  return env;
}
