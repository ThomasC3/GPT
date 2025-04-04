import moment from 'moment-timezone';

export const getTimeLeft = (from, until, localeString = 'en', noPrefix = false) => {
  const beginning = moment(from).utc();
  const deadline = moment(until).utc();

  // returns “in x hours”, “in x minutes”, “in a few seconds”
  return deadline.locale(localeString).from(beginning, noPrefix);
};

export const convertDate = (date, format = 'YYYY-MM-DD') => {
  // MM/DD/YYYY -> YYYY-MM-DD
  // MM-DD-YYYY -> YYYY-MM-DD
  // YYYY-MM-DD -> YYYY-MM-DD
  if (!date) {
    throw new Error('Date is required');
  }

  let convertedDate = moment(date, 'MM/DD/YYYY');
  if (convertedDate.isValid()) { return convertedDate.format(format); }

  convertedDate = moment(date, 'MM-DD-YYYY');
  if (convertedDate.isValid()) { return convertedDate.format(format); }

  return moment(date, 'YYYY-MM-DD').format(format);
};

export const calculateAge = (dob, now = moment()) => {
  const dobMoment = moment(convertDate(dob));
  const duration = moment.duration(now.diff(dobMoment));
  return duration.years();
};

export const getLastMonthsAndCurrent = (monthNumber, now = moment()) => {
  const end = now.endOf('month');
  const start = end.clone().subtract(monthNumber, 'month').startOf('month');
  return { start, end };
};

export const getMonthYearList = (start, end) => {
  const monthsInSpan = [];
  let current = start.clone();
  do {
    monthsInSpan.push({
      month: current.month() + 1,
      year: current.year(),
      monthName: current.format('MMMM')
    });
    current = current.add(1, 'month');
  } while (current < end);
  return monthsInSpan;
};

export const dateDifference = (start, end, unit = 'seconds') => {
  const difference = moment.duration(moment(end).diff(moment(start)));

  switch (unit) {
  case 'seconds':
  case 'second':
    return difference.asSeconds();
  case 'minutes':
  case 'minute':
    return difference.asMinutes();
  case 'hours':
  case 'hour':
    return difference.asHours();
  case 'days':
  case 'day':
    return difference.asDays();
  default:
    return difference.asSeconds();
  }
};

export const secondsToTime = (sec) => {
  const hours = Math.floor(sec / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(sec % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};


export const DATE_FORMAT = 'MM/DD/YYYY HH:mm';
export const DATE_FORMAT_SHORT = 'MM/DD/YYYY';
export const DATE_FORMAT_ALT = 'YYYY-MM-DD HH:mm';
export const DATE_FORMAT_ALT_SHORT = 'YYYY-MM-DD';

export default {
  getTimeLeft,
  convertDate,
  calculateAge,
  getLastMonthsAndCurrent,
  getMonthYearList,
  dateDifference,
  secondsToTime,
  DATE_FORMAT,
  DATE_FORMAT_SHORT,
  DATE_FORMAT_ALT,
  DATE_FORMAT_ALT_SHORT
};
