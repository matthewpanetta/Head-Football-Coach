// src/constants.ts
var SECONDS_A_MINUTE = 60;
var SECONDS_A_HOUR = SECONDS_A_MINUTE * 60;
var SECONDS_A_DAY = SECONDS_A_HOUR * 24;
var SECONDS_A_WEEK = SECONDS_A_DAY * 7;
var MILLISECONDS_A_SECOND = 1e3;
var MILLISECONDS_A_MINUTE = SECONDS_A_MINUTE * MILLISECONDS_A_SECOND;
var MILLISECONDS_A_HOUR = SECONDS_A_HOUR * MILLISECONDS_A_SECOND;
var MILLISECONDS_A_DAY = SECONDS_A_DAY * MILLISECONDS_A_SECOND;
var MILLISECONDS_A_WEEK = SECONDS_A_WEEK * MILLISECONDS_A_SECOND;
var INVALID_DATE_STRING = "Invalid Date";
var DEFAULT_FORMAT = "YYYY-MM-DDTHH:mm:ssZ";
var REGEX_PARSE = /^(\d{4})[/-]?(\d{1,2})?[/-]?(\d{0,2})[\sTt]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/;
var REGEX_FORMAT = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g;

// src/utils.ts
var mutable = (val) => val;
var pick = (object, keys) => keys.reduce((obj, key) => {
  if (Object.prototype.hasOwnProperty.call(object, key))
    obj[key] = object[key];
  return obj;
}, {});
var cloneDate = (date) => new Date(date);
var padZoneStr = (utcOffset) => {
  const negMinutes = -utcOffset;
  const minutes = Math.abs(negMinutes);
  const hourOffset = Math.floor(minutes / 60);
  const minuteOffset = minutes % 60;
  return `${negMinutes <= 0 ? "+" : "-"}${`${hourOffset}`.padStart(2, "0")}:${`${minuteOffset}`.padStart(2, "0")}`;
};
var isEmptyObject = (value) => typeof value === "object" && value !== null && Object.keys(value).length === 0;

// src/units.ts
var units = mutable({
  y: "year",
  M: "month",
  D: "date",
  h: "hour",
  m: "minute",
  s: "second",
  ms: "millisecond",
  d: "day",
  w: "week"
});
var unitsShort = Object.keys(units);
var unitsLong = Object.values(units);
var isShortUnit = (unit) => unitsShort.includes(unit);
var normalize = (unit) => {
  var _a, _b;
  if (isShortUnit(unit)) {
    return units[unit];
  }
  const normalizedUnit = (_b = (_a = unit == null ? void 0 : unit.toLowerCase()) == null ? void 0 : _a.replace(/s$/, "")) != null ? _b : "";
  return normalizedUnit;
};

// src/locale/en.ts
var locale = {
  name: "en",
  weekdays: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var en_default = locale;

// src/dayjs.ts
var globalLocale = "en";
var loadedLocales = {};
loadedLocales[globalLocale] = en_default;
var parseDate = (date) => {
  if (date instanceof Date)
    return cloneDate(date);
  else if (date === null)
    return new Date(Number.NaN);
  else if (date === void 0)
    return new Date();
  else if (isEmptyObject(date))
    return new Date();
  else if (Array.isArray(date))
    return new Date(date[0], date[1], date[2], date[3], date[4], date[5], date[6]);
  else if (typeof date === "string" && !/z$/i.test(date)) {
    const d = date.match(REGEX_PARSE);
    if (d) {
      const m = +d[2] - 1 || 0;
      const ms = +(d[7] || "0").slice(0, 3);
      return new Date(+d[1], m, +(d[3] || 1), +(d[4] || 0), +(d[5] || 0), +(d[6] || 0), ms);
    }
  }
  return new Date(date);
};
var parseLocale = (preset, installOnly, newLocale) => {
  let locale2;
  if (!preset) {
    return globalLocale;
  }
  if (typeof preset === "string") {
    const presetLower = preset.toLowerCase();
    if (loadedLocales[presetLower]) {
      locale2 = presetLower;
    }
    if (newLocale) {
      loadedLocales[presetLower] = newLocale;
      locale2 = presetLower;
    }
    const presetSplit = preset.split("-");
    if (!locale2 && presetSplit.length > 1) {
      return parseLocale(presetSplit[0]);
    }
  } else {
    const { name } = preset;
    loadedLocales[name] = preset;
    locale2 = name;
  }
  if (!installOnly && locale2)
    globalLocale = locale2;
  return locale2 || (!installOnly ? globalLocale : "");
};
var Dayjs = class extends class {
} {
  constructor(date, options) {
    super();
    this._d = new Date();
    this._options = options || {};
    this._locale = parseLocale(this._options.locale, true);
    this.parse(date);
    this._init();
  }
  parse(date) {
    this._d = parseDate(date);
  }
  _init() {
    this._year = this._d.getFullYear();
    this._month = this._d.getMonth();
    this._date = this._d.getDate();
    this._hour = this._d.getHours();
    this._minute = this._d.getMinutes();
    this._second = this._d.getSeconds();
    this._millisecond = this._d.getMilliseconds();
    this._day = this._d.getDay();
  }
  valueOf() {
    return this._d.getTime();
  }
  unix() {
    return Math.floor(this.valueOf() / 1e3);
  }
  isValid() {
    return !(this._d.toString() === INVALID_DATE_STRING);
  }
  _startEndOf(unit, isStartOf) {
    const factory = ({
      year = this._year,
      month = this._month,
      date = this._date,
      hour = this._hour,
      minute = this._minute,
      second = this._second,
      millisecond = this._millisecond
    }) => new Dayjs([year, month, date, hour, minute, second, millisecond], this._options);
    const numbers = isStartOf ? { month: 0, date: 1, hour: 0, minute: 0, second: 0, millisecond: 0 } : {
      month: 11,
      date: 31,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999
    };
    const normalizedUnit = normalize(unit);
    switch (normalizedUnit) {
      case "year":
        return factory(numbers);
      case "month":
        return factory(isStartOf ? pick(numbers, ["date", "hour", "minute", "second", "millisecond"]) : {
          month: this._month + 1,
          date: 0,
          ...pick(numbers, ["hour", "minute", "second", "millisecond"])
        });
      case "date":
      case "day":
        return factory(pick(numbers, ["hour", "minute", "second", "millisecond"]));
      case "hour":
        return factory(pick(numbers, ["minute", "second", "millisecond"]));
      case "minute":
        return factory(pick(numbers, ["second", "millisecond"]));
      case "second":
        return factory(pick(numbers, ["millisecond"]));
      case "week": {
        const weekStart = this.$locale().weekStart || 0;
        const gap = (this._day < weekStart ? this._day + 7 : this._day) - weekStart;
        return factory({
          date: isStartOf ? this._date - gap : this._date + (6 - gap),
          ...pick(numbers, ["hour", "minute", "second", "millisecond"])
        });
      }
      case "millisecond":
        return this.clone();
    }
  }
  $locale() {
    return loadedLocales[this._locale];
  }
  locale(preset, locale2) {
    if (!preset)
      return this._locale;
    const that = this.clone();
    const nextLocaleName = parseLocale(preset, true, locale2);
    if (nextLocaleName)
      that._locale = nextLocaleName;
    return that;
  }
  startOf(unit) {
    return this._startEndOf(unit, true);
  }
  endOf(unit) {
    return this._startEndOf(unit, false);
  }
  isSame(that, unit = "millisecond") {
    const other = dayjs(that);
    return this.startOf(unit) <= other && other <= this.endOf(unit);
  }
  isAfter(that, unit = "millisecond") {
    return dayjs(that) < this.startOf(unit);
  }
  isBefore(that, unit = "millisecond") {
    return this.endOf(unit) < dayjs(that);
  }
  isSameOrBefore(that, unit = "millisecond") {
    return this.isSame(that, unit) || this.isBefore(that, unit)
  }
  isBetween(a, b, unit, inclusivity) {
    const dA = dayjs(a)
    const dB = dayjs(b)
    inclusivity = inclusivity || '()'
    const dAi = inclusivity[0] === '('
    const dBi = inclusivity[1] === ')'

    return ((dAi ? this.isAfter(dA, unit) : !this.isBefore(dA, unit)) &&
           (dBi ? this.isBefore(dB, unit) : !this.isAfter(dB, unit)))
        || ((dAi ? this.isBefore(dA, unit) : !this.isAfter(dA, unit)) &&
           (dBi ? this.isAfter(dB, unit) : !this.isBefore(dB, unit)))
  }
  clone() {
    return new Dayjs(this._d, this._options);
  }
  get(unit) {
    return this[`_${unit}`];
  }
  set(unit, value) {
    const methods = {
      year: "setFullYear",
      month: "setMonth",
      date: "setDate",
      hour: "setHours",
      minute: "setMinutes",
      second: "setSeconds",
      millisecond: "setMilliseconds",
      day: "setDate"
    };
    const method = methods[unit];
    if (!method)
      return this;
    const date = cloneDate(this._d);
    const val = unit === "day" ? this._date + (value - this._day) : value;
    if (unit === "month" || unit === "year") {
      date.setDate(1);
      date[method](val);
      date.setDate(Math.min(this._date, dayjs(date).daysInMonth()));
    } else if (method)
      date[method](val);
    return dayjs(date);
  }
  daysInMonth() {
    return this.endOf("month").date();
  }
  toDate() {
    return cloneDate(this._d);
  }
  toJSON() {
    return this.isValid() ? this.toISOString() : null;
  }
  toISOString() {
    return this._d.toISOString();
  }
  toString() {
    return this._d.toUTCString();
  }
  utcOffset() {
    return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
  }
  format(formatStr) {
    const locale2 = this.$locale();
    if (!this.isValid())
      return locale2.invalidDate || INVALID_DATE_STRING;
    const str = formatStr || DEFAULT_FORMAT;
    const zoneStr = padZoneStr(this.utcOffset());
    const { weekdays, months } = locale2;
    const getShort = (arr, index, full, length) => (arr == null ? void 0 : arr[index]) || (full == null ? void 0 : full[index].slice(0, Math.max(0, length != null ? length : 0)));
    const getHour = (num) => `${this._hour % 12 || 12}`.padStart(num, "0");
    const meridiem = locale2.meridiem || ((hour, minute, isLowercase) => {
      const m = hour < 12 ? "AM" : "PM";
      return isLowercase ? m.toLowerCase() : m;
    });
    const matches = {
      YY: String(this._year).slice(-2),
      YYYY: this._year,
      M: this._month + 1,
      MM: `${this._month + 1}`.padStart(2, "0"),
      MMM: getShort(locale2.monthsShort, this._month, months, 3),
      MMMM: getShort(months, this._month),
      D: this._date,
      DD: `${this._date}`.padStart(2, "0"),
      d: String(this._day),
      dd: getShort(locale2.weekdaysMin, this._day, weekdays, 2),
      ddd: getShort(locale2.weekdaysShort, this._day, weekdays, 3),
      dddd: weekdays[this._day],
      H: String(this._hour),
      HH: `${this._hour}`.padStart(2, "0"),
      h: getHour(1),
      hh: getHour(2),
      a: meridiem(this._hour, this._minute, true),
      A: meridiem(this._hour, this._minute, false),
      m: String(this._minute),
      mm: `${this._minute}`.padStart(2, "0"),
      s: String(this._second),
      ss: `${this._second}`.padStart(2, "0"),
      SSS: `${this._millisecond}`.padStart(3, "0"),
      Z: zoneStr
    };
    return str.replace(REGEX_FORMAT, (match, $1) => $1 || matches[match] || zoneStr.replace(":", ""));
  }
  add(number, unit) {
    const normalizedUnit = normalize(unit);
    const factory = (n) => this.date(this.date() + Math.round(n * number));
    if (normalizedUnit === "month") {
      return this.set("month", this._month + number);
    } else if (normalizedUnit === "year") {
      return this.set("year", this._year + number);
    } else if (normalizedUnit === "day") {
      return factory(1);
    } else if (normalizedUnit === "week") {
      return factory(7);
    }
    const steps = {
      minute: MILLISECONDS_A_MINUTE,
      hour: MILLISECONDS_A_HOUR,
      second: MILLISECONDS_A_SECOND,
      millisecond: 1
    };
    const step = steps[normalizedUnit];
    const nextTimeStamp = this.valueOf() + number * step;
    return new Dayjs(nextTimeStamp, this._options);
  }
  subtract(number, unit) {
    return this.add(number * -1, unit);
  }
};
var getterOrSetter = (unit) => {
  function fn(value) {
    if (value === void 0) {
      return this.get(unit);
    } else {
      return this.set(unit, value);
    }
  }
  return fn;
};
[
  "year",
  "month",
  "date",
  "hour",
  "minute",
  "second",
  "millisecond",
  "day"
].forEach((unit) => Dayjs.prototype[unit] = getterOrSetter(unit));
var isDayjs = (value) => value instanceof Dayjs;
var unix = (timestamp) => dayjs(timestamp * 1e3);
var extend = (plugin, option) => {
  if (!plugin._i) {
    plugin(Dayjs, dayjs, option);
    plugin._i = true;
  }
  return dayjs;
};
var dayjs = (date, format, locale2, strict) => {
  if (isDayjs(date))
    return date;
  if (typeof locale2 === "boolean") {
    strict = locale2;
    locale2 = void 0;
  }
  const options = {
    format,
    locale: locale2,
    strict
  };
  return new Dayjs(date, options);
};
dayjs.isDayjs = isDayjs;
dayjs.unix = unix;
dayjs.extend = extend;
dayjs.locale = parseLocale;

// src/index.ts
var src_default = dayjs;
export {
  Dayjs,
  dayjs,
  src_default as default,
  extend,
  isDayjs,
  parseLocale as locale,
  unix
};
