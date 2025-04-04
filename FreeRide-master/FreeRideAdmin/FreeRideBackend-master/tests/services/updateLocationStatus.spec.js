import sinon from 'sinon';
import moment from 'moment-timezone';
// eslint-disable-next-line no-unused-vars
import { websocket } from '../../services';
import updateLocationStatus from '../../services/updateLocationStatus';
import {
  Drivers, Locations, Settings, Events
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

const IN_SCHEDULE = [
  { day: 'Sunday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Monday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Tuesday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Wednesday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Thursday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Friday', openTime: '00:00', closeTime: '23:59' },
  { day: 'Saturday', openTime: '00:00', closeTime: '23:59' }
];

const NOT_IN_SCHEDULE = [
  { day: 'Sunday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Monday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Tuesday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Wednesday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Thursday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Friday', openTime: '00:00', closeTime: '00:00' },
  { day: 'Saturday', openTime: '00:00', closeTime: '00:00' }
];

const IN_SCHEDULE_EXTENDED = [
  { day: 'Sunday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Monday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Tuesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Wednesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Thursday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Friday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Saturday', openTime: '08:00', closeTime: '02:59' }
];

const NOT_IN_SCHEDULE_EXTENDED = [
  { day: 'Sunday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Monday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Tuesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Wednesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Thursday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Friday', openTime: '08:00', closeTime: '02:59' },
  { day: 'Saturday', openTime: '08:00', closeTime: '23:59' }
];

const EXTENDED_CLOSED = [
  { day: 'Sunday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Monday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Tuesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Wednesday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Thursday', openTime: '08:00', closeTime: '23:59' },
  { day: 'Friday', openTime: '08:00', closeTime: '23:59' },
  {
    day: 'Saturday', openTime: '08:00', closeTime: '02:59', closed: true

  }
];

const PERM_CLOSED = [
  {
    day: 'Sunday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Monday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Tuesday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Wednesday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Thursday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Friday', openTime: '00:00', closeTime: '23:59', closed: true
  },
  {
    day: 'Saturday', openTime: '00:00', closeTime: '23:59', closed: true
  }
];

const getDriverInfo = locationId => ({
  firstName: 'Driver FN',
  lastName: 'Driver LN',
  email: 'some@mail.com',
  zip: 10001,
  phone: 123456789,
  isOnline: true,
  isTemporaryPassword: false,
  locations: [locationId],
  password: 'Password1',
  dob: '2000-12-11',
  currentLocation: {
    coordinates: [-73.882936, 40.698337],
    type: 'Point'
  },
  activeLocation: locationId
});

const eventData = body => [
  `${body.sourceId}`,
  body.sourceType,
  `${body.targetId}`,
  body.targetType,
  body.eventType,
  body.eventData.reason
];

const eventAssertData = (locationId, eventType, reason) => [
  `${locationId}`,
  'Location',
  `${locationId}`,
  'Location',
  eventType,
  reason
];

describe('LocationStatusUpdater', () => {
  let clock;
  let subject;
  let sandbox;
  const locationInfo = {
    name: 'Location',
    isADA: false,
    isUsingServiceTimes: false,
    isActive: true,
    isOpen: false,
    timezone: 'Europe/Lisbon',
    serviceArea: [
      {
        longitude: -73.978573,
        latitude: 40.721239
      },
      {
        longitude: -73.882936,
        latitude: 40.698337
      },
      {
        longitude: -73.918642,
        latitude: 40.629585
      },
      {
        longitude: -73.978573,
        latitude: 40.660845
      },
      {
        longitude: -73.978573,
        latitude: 40.721239
      }
    ],
    serviceHours: []
  };

  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    const mockDate = new Date('2024-06-30T01:00:00Z').getTime();
    clock = sinon.useFakeTimers(mockDate);
  });

  beforeEach(async () => {
    sandbox.restore();
    await Locations.deleteMany();
    await Drivers.deleteMany();
    await Events.deleteMany();
  });

  after(() => {
    clock.uninstall();
  });

  describe('Location in schedule and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = IN_SCHEDULE;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should open', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'OPEN', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
    describe('If open', () => {
      it('should remain open', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
  });

  describe('Location in schedule (extended) and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = IN_SCHEDULE_EXTENDED;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should open', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'OPEN', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
    describe('If open', () => {
      it('should remain open', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
  });

  describe('Location in schedule and not isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = IN_SCHEDULE;
      locationInfo.isUsingServiceTimes = false;
    });
    describe('If closed', () => {
      it('should open', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'OPEN', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
    describe('If open', () => {
      it('should remain open', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, true);
      });
    });
  });

  describe('Location not in schedule and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = NOT_IN_SCHEDULE;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should remain closed', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
    describe('If open', () => {
      it('should close', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'CLOSE', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
  });

  describe('Location not in schedule (extended) and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = NOT_IN_SCHEDULE_EXTENDED;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should remain closed', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
    describe('If open', () => {
      it('should close', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'CLOSE', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
  });

  describe('Location is permanently closed and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = PERM_CLOSED;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should remain closed', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
    describe('If open', () => {
      it('should close', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'CLOSE', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
  });

  describe('Location was closed yesterday (extended) and isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = EXTENDED_CLOSED;
      locationInfo.isUsingServiceTimes = true;
    });
    describe('If closed', () => {
      it('should remain closed', async () => {
        locationInfo.isOpen = false;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 0);

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
    describe('If open', () => {
      it('should close', async () => {
        locationInfo.isOpen = true;
        subject = await Locations.createLocation(locationInfo);

        await updateLocationStatus.update();

        const events = await Events.find();
        sinon.assert.match(events.length, 1);
        sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'CLOSE', 'Service hours'));

        const location = await Locations.getLocation(subject.id);
        return sinon.assert.match(location.isOpen, false);
      });
    });
  });

  describe('Location not in schedule and not isUsingServiceTimes', () => {
    before(async () => {
      locationInfo.serviceHours = NOT_IN_SCHEDULE;
      locationInfo.isUsingServiceTimes = false;
    });
    describe('Without online drivers', () => {
      describe('If closed', () => {
        it('should remain closed', async () => {
          locationInfo.isOpen = false;
          subject = await Locations.createLocation(locationInfo);

          await updateLocationStatus.update();

          const events = await Events.find();
          sinon.assert.match(events.length, 0);

          const location = await Locations.getLocation(subject.id);
          return sinon.assert.match(location.isOpen, false);
        });
      });
      describe('If open', () => {
        it('should close', async () => {
          locationInfo.isOpen = true;
          subject = await Locations.createLocation(locationInfo);

          await updateLocationStatus.update();

          const events = await Events.find();
          sinon.assert.match(events.length, 1);
          sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'CLOSE', 'Online drivers'));

          const location = await Locations.getLocation(subject.id);
          return sinon.assert.match(location.isOpen, false);
        });
      });
    });
    describe('With online drivers', () => {
      describe('If open', () => {
        it('should remain open', async () => {
          locationInfo.isOpen = true;
          subject = await Locations.createLocation(locationInfo);

          await Drivers.createDriver(getDriverInfo(subject._id));

          await updateLocationStatus.update();

          const events = await Events.find();
          sinon.assert.match(events.length, 0);

          const location = await Locations.getLocation(subject.id);
          return sinon.assert.match(location.isOpen, true);
        });
      });
      describe('If closed', () => {
        it('should open', async () => {
          locationInfo.isOpen = false;
          subject = await Locations.createLocation(locationInfo);

          await Drivers.createDriver(getDriverInfo(subject._id));

          await updateLocationStatus.update();

          const events = await Events.find();
          sinon.assert.match(events.length, 1);
          sinon.assert.match(eventData(events[0]), eventAssertData(subject._id, 'OPEN', 'Online drivers'));

          const location = await Locations.getLocation(subject.id);
          return sinon.assert.match(location.isOpen, true);
        });
      });
    });
  });
});
