import moment from 'moment-timezone';
import { DATE_FORMAT } from '../../../utils/time';

class RiderSerializer {
  static adminRiderToCsv(rider) {
    const mappedRider = typeof rider.toJSON === 'function' ? rider.toJSON() : rider;
    const {
      emailVerificationDeadline,
      isEmailVerified,
      createdTimestamp,
      email,
      phone,
      firstName,
      lastName,
      location,
      lastSeen,
      isBanned,
      zip,
      dob
    } = mappedRider;

    const item = {
      index: true,
      email,
      phone,
      firstName,
      lastName,
      zip,
      dob
    };

    const timezone = location?.timezone || 'America/New_York';
    item.createdTimestamp = createdTimestamp
      && moment(createdTimestamp).tz(timezone).format(DATE_FORMAT);
    item.emailVerificationDeadline = !isEmailVerified && emailVerificationDeadline
      ? moment(emailVerificationDeadline).tz(timezone).format(DATE_FORMAT)
      : '';
    item.lastSeen = lastSeen && moment(lastSeen).tz(timezone).format(DATE_FORMAT);
    item.isEmailVerified = isEmailVerified ? 'Yes' : 'No';
    item.isBanned = isBanned ? 'Yes' : 'No';

    return item;
  }

  static csvColumns() {
    return [
      { key: 'index', header: 'Index ' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'zip', header: 'Zip' },
      { key: 'dob', header: 'Date of birth' },
      { key: 'isEmailVerified', header: 'Email Verified' },
      { key: 'emailVerificationDeadline', header: 'Email Verification Deadline' },
      { key: 'lastSeen', header: 'Last seen' },
      { key: 'isBanned', header: 'Banned' },
      { key: 'createdTimestamp', header: 'Account creation date' }
    ];
  }
}

export default RiderSerializer;
