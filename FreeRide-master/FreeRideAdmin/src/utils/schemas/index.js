import * as Yup from 'yup';
import moment from 'moment';
import common from '../common';

const { PHONE_REGEXP, ZIP_REGEXP } = common;

// helper for yup transform function
function emptyStringToNull(value, originalValue) {
  if (typeof originalValue === 'string' && originalValue === '') {
    return null;
  }
  return value;
}

// helper for yup transform function
function emptyStringToFalse(value, originalValue) {
  if (typeof originalValue === 'boolean' && originalValue === '') {
    return false;
  }
  return value;
}

// helper for yup transform function
function stringToDate(originalValue, formats, parseStrict) {
  const value = moment(originalValue, formats, parseStrict);
  return value.isValid() ? value.toDate() : new Date('');
}

function validateDate(formats, parseStrict) {
  return this.transform((value, originalValue) => {
    if (this.isType(value)) { return value; }
    return stringToDate(originalValue, formats, parseStrict);
  });
}

function validateServiceHours(serviceHours, idx) {
  const start = moment(serviceHours[idx].openTime, 'HH:mm');
  const end = moment(serviceHours[idx].closeTime, 'HH:mm');

  if (end < start) {
    end.add(1, 'days');
  }

  if (end.isAfter(start, 'day')) {
    const nextDay = (idx + 1) % 7;

    const nextDayStart = moment(serviceHours[nextDay].openTime, 'HH:mm').add(1, 'days');
    const nextDayEnd = moment(serviceHours[nextDay].closeTime, 'HH:mm').add(1, 'days');

    if (nextDayEnd < nextDayStart) {
      nextDayEnd.add(1, 'days');
    }
    if (
      (start.isBetween(nextDayStart, nextDayEnd, null, '[)') || end.isBetween(nextDayStart, nextDayEnd, null, '(]'))
      || (nextDayStart.isBetween(start, end, null, '[)') || nextDayEnd.isBetween(start, end, null, '(]'))
    ) {
      return false;
    }
  }
  return true;
}

function validateTimeslot(timeslot) {
  return !moment(timeslot.closeTime, 'HH:mm').isSame(moment(timeslot.openTime, 'HH:mm'));
}

Yup.addMethod(Yup.date, 'format', validateDate);

const PasswordSchema = Yup.string().required('No password provided.').min(8, 'Password is too short - should be 8 chars minimum.');

const ProfileSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'Too Short!')
    .max(50, 'Too Long!')
    .required('First Name is required'),
  lastName: Yup.string()
    .min(2, 'Too Short!')
    .max(50, 'Too Long!')
    .required('Last Name is required'),
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string().min(
    8,
    'Password is too short - should be 8 chars minimum.'
  )
});

const AdminSchema = ProfileSchema.shape({
  role: Yup.string().required('Role is required')
});

const AdminSchemaNew = AdminSchema.shape({
  password: PasswordSchema
});

const DriverSchema = Yup.object().shape({
  firstName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('First Name is required'),
  lastName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('Last Name is required'),
  displayName: Yup.string().min(2, 'Too Short!').max(50, 'Too Long!').required('Display Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  locations: Yup.array().min(1).required('Location is required for a manager')
});
const DriverSchemaNew = DriverSchema.shape({
  password: PasswordSchema
});

const RiderSchema = Yup.object().shape({
  firstName: Yup.string().min(1, 'Too Short!').max(50, 'Too Long!').required('First Name is required'),
  lastName: Yup.string().min(1, 'Too Short!').max(50, 'Too Long!').required('Last Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string().matches(PHONE_REGEXP, 'Phone number is not valid').required('Phone number is required'),
  dob: Yup.string().required('DOB is required'),
  gender: Yup.string().required('Gender is required'),
  zip: Yup.string().matches(ZIP_REGEXP, 'Zip code must have only 5 numbers').required('Zip code is required'),
  isPhoneVerified: Yup.boolean(),
  isEmailVerified: Yup.boolean(),
  location: Yup.string(),
  subscriptions: Yup.object().shape({
    receipt: Yup.boolean()
  })
});

const PaymentInformationSchema = Yup.object().shape({
});

const PwywInformationSchema = Yup.object().shape({
  pwywOptions: Yup.array().min(3, 'All 3 PWYW options are required'),
  maxCustomValue: Yup.string().required('PWYW maxCustomValue value is required'),
  currency: Yup.string().required('PWYW currency is required')
}).nullable();

const TipInformationSchema = Yup.object().shape({
  tipOptions: Yup.array().min(3, 'All 3 Tip options are required'),
  maxCustomValue: Yup.string().required('Tip maxCustomValue value is required'),
  currency: Yup.string().required('Tip currency is required')
}).nullable();

const LocationSchema = Yup.object().shape({
  name: Yup.string().required('Location Name is required'),
  closedCopy: Yup.string().required('Closed copy is required'),
  inactiveCopy: Yup.string().transform(emptyStringToNull).nullable(),
  isADA: Yup.boolean().transform(emptyStringToNull),
  isAvailablilityOverlayActive: Yup.boolean().transform(emptyStringToNull),
  isUsingServiceTimes: Yup.boolean().transform(emptyStringToNull),
  poolingEnabled: Yup.boolean().transform(emptyStringToNull),
  showAlert: Yup.boolean().transform(emptyStringToNull),
  alert: Yup.object().shape({
    title: Yup.string().transform(emptyStringToNull).nullable(),
    copy: Yup.string().transform(emptyStringToNull).nullable()
  }),
  serviceHours: Yup.array().of(
    Yup.object().shape({
      day: Yup.string().required('Day is required'),
      openTime: Yup.string().required('Open time is required'),
      closeTime: Yup.string().required('Close time is required')
    })
      .test('non-empty-timeslot', 'Timeslot is invalid', function checkEmptyTimeslot(timeslot) {
        if (!validateTimeslot(timeslot)) {
          return new Yup.ValidationError(`${timeslot.day}'s timeslot is invalid`, timeslot.closeTime, `${this.path}.closeTime`);
        }
        return true;
      })
      .test('no-overlap', 'Service hours overlap', function checkOverlap(timeslot) {
        const idx = parseInt(this.path.slice(this.path.lastIndexOf('[') + 1, this.path.lastIndexOf(']')), 10);
        if (!validateServiceHours(this.parent, idx)) {
          return new Yup.ValidationError(`${timeslot.day}'s hours overlap`, timeslot, `${this.path}.closeTime`);
        }
        return true;
      }),
  )
    .min(7),

  serviceArea: Yup.array().of(
    Yup.object().shape({
      lat: Yup.string().required('Latitude is required'),
      lng: Yup.string().required('Longitude is required')
    })
  ).min(3),
  timezone: Yup.string().ensure().required('Timezone is required'),
  paymentEnabled: Yup.boolean().transform(emptyStringToFalse),
  paymentInformation: PaymentInformationSchema,
  pwywEnabled: Yup.boolean().transform(emptyStringToFalse),
  pwywInformation: PwywInformationSchema,
  tipEnabled: Yup.boolean().transform(emptyStringToFalse),
  tipInformation: TipInformationSchema,
  isActive: Yup.boolean().transform(emptyStringToNull)
});

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('E-mail is not valid!')
    .required('E-mail is required!'),
  password: Yup.string()
    .min(6, 'Password has to be longer than 6 characters!')
    .required('Password is required!')
});

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('E-mail is not valid!')
    .required('E-mail is required!')
});
const VerifyCodeSchema = Yup.object().shape({
  code: Yup.string().required('Pin code is required!')
});

export default {
  LoginSchema,
  ProfileSchema,
  AdminSchema,
  AdminSchemaNew,
  DriverSchema,
  DriverSchemaNew,
  RiderSchema,
  LocationSchema,
  ForgotPasswordSchema,
  VerifyCodeSchema,
  PasswordSchema
};
