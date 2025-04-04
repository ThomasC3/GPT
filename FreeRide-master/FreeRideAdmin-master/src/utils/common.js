const PHONE_REGEXP = /^([+]?\d{1,2}[.-\s]?)?(\d{3}[.-]?){2}\d{4}$/;
const ZIP_REGEXP = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

// Formik + Antd Item error state
const ERROR_STATE = (error, touched) => (touched ? {
  validateStatus: error ? 'error' : undefined,
  help: error
} : {});

// Formik + Antd Item error state
const ERROR_STATE_GENERATOR = (error, touched) => name => (touched[name] ? {
  validateStatus: error[name] ? 'error' : undefined,
  help: error[name]
} : {});

const ENSURE_CLOCKWISE_POLYGON = (poly) => {
  const sum = poly.reduce((accu, cur, index, src) => {
    if (index === src.length - 1) {
      return accu;
    }
    const next = src[index + 1];
    accu += (next.lat - cur.lat) * (next.lng + cur.lng);
    return accu;
  }, 0);
  return sum < 0 ? [...poly].reverse() : poly;
};

const MAP_AREA_FOR_GOOGLE = i => ({ lng: i.longitude, lat: i.latitude });
const MAP_AREA_FOR_SERVER = i => ({ longitude: i.lng, latitude: i.lat });

const convertBase64LengthToSizeInKB = (imageLength) => {
  const bits = imageLength * 6;
  const bytes = bits / 8;
  return Math.round(bytes / 1000);
};

const greatestCommonDivisor = (a, b) => {
  if (!b) {
    return a;
  }
  return greatestCommonDivisor(b, a % b);
};

const ratioToFraction = (width, height) => {
  const commonDivisor = greatestCommonDivisor(width, height);
  const numerator = width / commonDivisor;
  const denominator = height / commonDivisor;

  return `${numerator}:${denominator}`;
};

const getRatio = (width, height) => {
  if (height === 0) {
    return 'NA';
  }
  return ratioToFraction(width, height);
};

const getFileExtension = (filename) => {
  if (!filename || !filename.includes('.')) {
    return 'NA';
  }
  return filename.split('.').pop().trim().toLowerCase();
};

export default {
  PHONE_REGEXP,
  ZIP_REGEXP,
  ERROR_STATE,
  ERROR_STATE_GENERATOR,
  ENSURE_CLOCKWISE_POLYGON,
  MAP_AREA_FOR_GOOGLE,
  MAP_AREA_FOR_SERVER,
  convertBase64LengthToSizeInKB,
  getRatio,
  getFileExtension
};
