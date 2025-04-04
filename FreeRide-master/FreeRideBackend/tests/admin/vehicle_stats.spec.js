import sinon from 'sinon';
import request from 'supertest-promised';
import moment from 'moment-timezone';
import app from '../../server';
import { domain } from '../../config';
import {
  driverEndpoint,
  createDriver,
  driverLogin,
  setLocation,
  updateStatus
} from '../utils/driver';
import { createGEMVehicle } from '../utils/vehicle';
import {
  createAdminLogin,
  adminEndpoint
} from '../utils/admin';
import {
  Locations, Settings, Events, Services,
  Drivers, Questions, InspectionForms,
  VehicleTypes
} from '../../models';
import { emptyAllCollections } from '../utils/helper';

let location;
let driver;
let driverId;
let driver1Token;
let adminToken;
let vehicleId1;
let vehicleId2;
let vehicleType1;
let vehicleType2;
let dates1;
let dates2;
let inspectionData1;
let inspectionData2;
let eventQuery;
let hourQuery;
let locationStatsQuery;
let questions;

const questionArr = [
  {
    questionKey: 'mileage',
    questionString: 'What is the mileage?',
    responseType: 'number'
  },
  {
    questionKey: 'battery',
    questionString: 'What is the battery level?',
    responseType: 'number'
  }
];

const driverCheck = async (typ, vehicleId, formId, responses) => {
  const payload = {
    inspectionForm: {
      id: formId,
      responses: Object.entries(responses).map(([k, v]) => ({
        questionId: questions.filter(q => q.questionKey === k)[0]._id,
        response: String(v)
      }))
    }
  };
  if (typ === 'out') { payload.service = 'passenger_only'; }

  return driverEndpoint(
    `/v1/vehicle${typ === 'out' ? `/${vehicleId}` : ''}/check-${typ}`,
    'post', driver1Token, app, request, domain, payload
  );
};

const adminInspection = async (vehicleId, responses) => {
  const payload = {
    responses: Object.entries(responses).map(([k, v]) => ({
      questionId: questions.filter(q => q.questionKey === k)[0]._id,
      response: String(v)
    }))
  };
  return adminEndpoint(
    `/v1/vehicles/${vehicleId}/inspection`,
    'post', adminToken, app, request, domain, payload
  );
};

const adminCheckIn = async () => (
  adminEndpoint(`/v1/drivers/${driverId}/vehicle/detach`, 'post', adminToken, app, request, domain)
);

const setQueryTarget = (targetId) => {
  if (targetId) {
    eventQuery.targetId = targetId;
  } else {
    delete eventQuery.targetId;
  }
};

const buildEventQuery = () => new URLSearchParams(eventQuery).toString();
const buildHourQuery = () => new URLSearchParams(hourQuery).toString();
const buildLocationStatsQuery = () => new URLSearchParams(locationStatsQuery).toString();

const changeLatestEvent = async (eventType, targetCreatedTimestamp) => (
  Events.findOneAndUpdate(
    { eventType },
    { $set: { createdTimestamp: targetCreatedTimestamp } },
    { upsert: false, sort: { createdTimestamp: -1 } },
  )
);

const setupScenario = async () => {
  await emptyAllCollections();

  await Settings.createSettings({ riderAndroid: '1.0.0' });

  location = await Locations.createLocation({
    name: 'Location',
    isADA: false,
    isUsingServiceTimes: false,
    isActive: true,
    timezone: 'America/New_York',
    serviceArea: [
      { longitude: -73.978573, latitude: 40.721239 },
      { longitude: -73.882936, latitude: 40.698337 },
      { longitude: -73.918642, latitude: 40.629585 },
      { longitude: -73.978573, latitude: 40.660845 },
      { longitude: -73.978573, latitude: 40.721239 }
    ]
  });

  ({ adminToken } = await createAdminLogin());

  driver = await createDriver({
    currentLocation: {
      coordinates: [-73.9078617, 40.6810937],
      type: 'Point'
    },
    locations: [location._id],
    email: 'driver1@mail.com',
    password: 'Password1',
    isOnline: false,
    isAvailable: false
  });

  ({ driver: { _id: driverId } } = driver);

  await Services.create({
    key: 'passenger_only',
    title: 'Passenger Only',
    desc: 'Passenger Cap only'
  });

  questions = await Questions.insertMany(questionArr);

  const { _id: checkOutFormId } = await InspectionForms.createInspectionForm({
    name: 'Check-out form',
    inspectionType: 'check-out',
    questionList: questions.map(q => q._id)
  });
  const { _id: emptyCheckOutFormId } = await InspectionForms.createInspectionForm({
    name: 'Empty check-out form',
    inspectionType: 'check-out',
    questionList: []
  });
  const { _id: checkInFormId1 } = await InspectionForms.createInspectionForm({
    name: 'Check-in form #1',
    inspectionType: 'check-in',
    questionList: questions.map(q => q._id)
  });
  const { _id: checkInFormId2 } = await InspectionForms.createInspectionForm({
    name: 'Check-in form #2',
    inspectionType: 'check-in',
    questionList: [questions.find(q => q.questionKey === 'mileage')._id]
  });
  const { _id: emptyCheckInFormId } = await InspectionForms.createInspectionForm({
    name: 'Empty check-in form',
    inspectionType: 'check-in',
    questionList: []
  });

  const opts = { checkOutForm: checkOutFormId, checkInForm: checkInFormId1 };
  ({
    vehicleId: vehicleId1, vehicleType: { id: vehicleType1 }
  } = await createGEMVehicle(false, location._id, opts));
  ({
    vehicleId: vehicleId2, vehicleType: { id: vehicleType2 }
  } = await createGEMVehicle(false, location._id, opts));

  await Drivers.syncIndexes();
  await Locations.syncIndexes();

  eventQuery = {
    targetType: 'Vehicle',
    location: location._id,
    'createdTimestamp[start]': '2022-01-29 00:00',
    'createdTimestamp[end]': '2022-01-30 23:59',
    skip: 0,
    limit: 15
  };

  hourQuery = {
    location: location._id,
    'createdTimestamp[start]': '2022-01-29 00:00',
    'createdTimestamp[end]': '2022-01-30 23:59'
  };

  locationStatsQuery = {
    'createdTimestamp[start]': '2022-01-29 00:00',
    'createdTimestamp[end]': '2022-01-30 23:59'
  };

  inspectionData1 = {
    checkOut1: { battery: 100, mileage: 1000 },
    checkIn1: { battery: 0, mileage: 1200 },
    checkOut2: { battery: 100, mileage: 1200 },
    checkIn2: { mileage: 1400 } // check in form changed
  };

  inspectionData2 = {
    checkOut1: { battery: 100, mileage: 1000 },
    adminInspection11: { battery: 50 },
    adminInspection12: { mileage: 1100 },
    checkIn1: { battery: 0, mileage: 1200 },
    checkOut2: { battery: 100, mileage: 1200 },
    adminInspection21: { battery: 50 },
    adminInspection22: { mileage: 1400 }
  };

  dates1 = {
    shiftStart: moment('2022-01-29 00:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    checkOut1: moment('2022-01-29 00:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 100, mileage: 1000 }
    checkIn1: moment('2022-01-29 02:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 0, mileage: 1200 }

    checkOut2: moment('2022-01-29 03:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 100, mileage: 1200 }
    checkIn2: moment('2022-01-29 04:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { mileage: 1400 }
    shiftEnd: moment('2022-01-29 05:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true)
  };

  dates2 = {
    shiftStart: moment('2022-01-30 00:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    checkOut1: moment('2022-01-30 00:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 100, mileage: 1000 }
    adminInspection11: moment('2022-01-30 01:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 50 }
    adminInspection12: moment('2022-01-30 01:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { mileage: 1100 }
    checkIn1: moment('2022-01-30 02:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 0, mileage: 1200 }

    checkOut2: moment('2022-01-30 03:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 100, mileage: 1200 }
    adminCheckIn2: moment('2022-01-30 04:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    adminInspection21: moment('2022-01-30 04:30', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { battery: 50 }
    adminInspection22: moment('2022-01-30 04:30', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true), // { mileage: 1400 }

    checkOut3: moment('2022-01-30 05:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    checkIn3: moment('2022-01-30 06:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true),
    shiftEnd: moment('2022-01-30 07:00', 'YYYY-MM-DD HH:mm:SS').tz(location.timezone, true)
  };

  // Create events and update dates for vehicle #1

  ({ accessToken: driver1Token } = await driverLogin('driver1@mail.com', 'Password1', app, request, domain));
  await changeLatestEvent('LOGIN', dates1.shiftStart);

  await setLocation(location._id, driver1Token, app, request, domain);
  await changeLatestEvent('SET LOCATION', dates1.shiftStart);

  await driverCheck('out', vehicleId1, checkOutFormId, inspectionData1.checkOut1);
  await changeLatestEvent('CHECK-OUT', dates1.checkOut1);
  await updateStatus(driver1Token, app, request, domain, { isAvailable: false });

  await driverCheck('in', vehicleId1, checkInFormId1, inspectionData1.checkIn1);
  await changeLatestEvent('CHECK-IN', dates1.checkIn1);

  await driverCheck('out', vehicleId1, checkOutFormId, inspectionData1.checkOut2);
  await changeLatestEvent('CHECK-OUT', dates1.checkOut2);
  await updateStatus(driver1Token, app, request, domain, { isAvailable: false });

  await VehicleTypes.findOneAndUpdate(
    { _id: vehicleType1 }, { $set: { checkInForm: checkInFormId2 } }
  );
  await driverCheck('in', vehicleId1, checkInFormId2, inspectionData1.checkIn2);
  await changeLatestEvent('CHECK-IN', dates1.checkIn2);


  await driverEndpoint('/v1/logout', 'post', driver1Token, app, request, domain, { deviceToken: driver1Token });
  await changeLatestEvent('LOGOUT', dates1.shiftEnd);

  // Create events and update dates for vehicle #2

  ({ accessToken: driver1Token } = await driverLogin('driver1@mail.com', 'Password1', app, request, domain));
  await changeLatestEvent('LOGIN', dates2.shiftStart);

  await setLocation(location._id, driver1Token, app, request, domain);
  await changeLatestEvent('SET LOCATION', dates2.shiftStart);

  await driverCheck('out', vehicleId2, checkOutFormId, inspectionData2.checkOut1);
  await changeLatestEvent('CHECK-OUT', dates2.checkOut1);
  await updateStatus(driver1Token, app, request, domain, { isAvailable: false });

  await adminInspection(vehicleId2, inspectionData2.adminInspection11);
  await changeLatestEvent('ADMIN INSPECTION', dates2.adminInspection11);

  await adminInspection(vehicleId2, inspectionData2.adminInspection12);
  await changeLatestEvent('ADMIN INSPECTION', dates2.adminInspection12);

  await driverCheck('in', vehicleId2, checkInFormId1, inspectionData2.checkIn1);
  await changeLatestEvent('CHECK-IN', dates2.checkIn1);

  await driverCheck('out', vehicleId2, checkOutFormId, inspectionData2.checkOut2);
  await changeLatestEvent('CHECK-OUT', dates2.checkOut2);
  await updateStatus(driver1Token, app, request, domain, { isAvailable: false });

  await adminCheckIn();
  await changeLatestEvent('ADMIN CHECK-IN', dates2.adminCheckIn2);

  await adminInspection(vehicleId2, inspectionData2.adminInspection21);
  await changeLatestEvent('ADMIN INSPECTION', dates2.adminInspection21);

  await adminInspection(vehicleId2, inspectionData2.adminInspection22);
  await changeLatestEvent('ADMIN INSPECTION', dates2.adminInspection22);


  await VehicleTypes.findOneAndUpdate(
    { _id: vehicleType2 },
    { $set: { checkOutForm: emptyCheckOutFormId, checkInForm: emptyCheckInFormId } }
  );

  await driverCheck('out', vehicleId2, checkOutFormId, {});
  await changeLatestEvent('CHECK-OUT', dates2.checkOut3);
  await updateStatus(driver1Token, app, request, domain, { isAvailable: false });

  await driverCheck('in', vehicleId2, checkInFormId1, {});
  await changeLatestEvent('CHECK-IN', dates2.checkIn3);


  await driverEndpoint('/v1/logout', 'post', driver1Token, app, request, domain, { deviceToken: driver1Token });
  await changeLatestEvent('LOGOUT', dates2.shiftEnd);
};

describe('Vehicle hours and attribute metrics', () => {
  before(async () => {
    await setupScenario();
  });

  describe('Vehicle #1 - no admin actions', () => {
    before(async () => {
      setQueryTarget(vehicleId1);
    });

    it('Should have all events and responses', async () => {
      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].target.id}`,
          ...eventChecks
        ],
        [
          4,
          `${vehicleId1}`,
          ['CHECK-OUT', `${location._id}`],
          ['CHECK-IN', `${location._id}`],
          ['CHECK-OUT', `${location._id}`],
          ['CHECK-IN', `${location._id}`]
        ]
      );
    });

    it('Should have correct metrics for vehicle 1', async () => {
      const { body: { vehicleStats } } = await adminEndpoint(
        `/v1/vehicles/${vehicleId1}/stats?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      // Day 2022-01-29
      // Vehicle checked-out hours: 3h (02:00-00:00 = 2, 04:00-03:00 = 1)
      // Total mileage: 400mi (
      //    min max: 400 (1400 - 1000 = 400)
      //    diff sum: 400 (1200 - 1000 = 200, 1400 - 1200 = 200)
      //    => 02:00 - 00:00 + 04:00 - 03:00 = 3h
      // Total battery: 100% (
      //    100 - 0 = 100 % => 02:00 - 00:00 = 2h,
      //    other value is ignored because there is no battery end value in second check-in)
      // Total battery and mileage: 100% and 200mi (
      //    100 - 0 = 100%,
      //    1200 - 1000 = 200mi,
      //    => 02:00 - 00:00 = 2h,
      //    second mileage value is ignored because
      //    there is no battery end value in second check-in)

      const {
        city,
        cityId,
        checkOutHours: {
          individualCount,
          totalHours: checkOutHours
        },
        mileage: {
          totalHours: mileageHours,
          totalMileage
        },
        battery: {
          totalHours: batteryHours,
          totalBattery
        },
        batteryMileage: {
          totalHours: bmHours,
          totalBattery: bmTotalBattery,
          totalMileage: bmTotalMileage
        }
      } = vehicleStats;

      return sinon.assert.match(
        [
          city, cityId,
          individualCount, checkOutHours,
          mileageHours, totalMileage,
          batteryHours, totalBattery,
          bmHours, bmTotalBattery, bmTotalMileage
        ],
        [
          'Location', `${location._id}`,
          1, 3,
          3, 400,
          2, 100,
          2, 100, 200
        ]
      );
    });
  });
  describe('Vehicle #2 - admin check in and inspections', () => {
    before(async () => {
      setQueryTarget(vehicleId2);
    });

    it('Should have all events and responses', async () => {
      const { body: events } = await adminEndpoint(
        `/v1/events?${buildEventQuery()}`, 'get', adminToken, app, request, domain
      );

      const eventChecks = events.items.map(
        it => [it.eventType, it.eventData?.location]
      ).reverse();

      sinon.assert.match(
        [
          events.items.length,
          `${events.items[0].target.id}`,
          ...eventChecks
        ],
        [
          10,
          `${vehicleId2}`,
          ['CHECK-OUT', `${location._id}`],
          ['ADMIN INSPECTION', `${location._id}`],
          ['ADMIN INSPECTION', `${location._id}`],
          ['CHECK-IN', `${location._id}`],
          ['CHECK-OUT', `${location._id}`],
          ['ADMIN CHECK-IN', `${location._id}`],
          ['ADMIN INSPECTION', `${location._id}`],
          ['ADMIN INSPECTION', `${location._id}`],
          ['CHECK-OUT', `${location._id}`],
          ['CHECK-IN', `${location._id}`]
        ]
      );
    });

    it('Should have correct metrics', async () => {
      const { body: { vehicleStats } } = await adminEndpoint(
        `/v1/vehicles/${vehicleId2}/stats?${buildHourQuery()}`, 'get', adminToken, app, request, domain
      );

      // Day 2022-01-30
      // Vehicle checked-out hours: 4h (02:00-00:00 = 2, 04:00-03:00 = 1, 06:00-05:00 = 1)
      // Total mileage: 400mi (
      //    min max: 400 (1400 - 1000 = 400)
      //    diff sum: 400 (1200 - 1000 = 200, 1400 - 1200 = 200)
      //    => 02:00 - 00:00 + 04:00 - 03:00 = 3h
      // Total battery: 150% (
      //    100 - 0 = 100 %, 100 - 50 = 50%
      //    => 02:00 - 00:00 + 04:00 - 03:00 = 3h)
      // Total battery and mileage: 150% and 400mi (
      //    100 - 0 = 100%, 100 - 50 = 50%
      //    1200 - 1000 = 200mi, 1400 - 1200 = 200mi
      //    => 02:00 - 00:00 + 04:00 - 03:00 = 3h)

      const {
        city,
        cityId,
        checkOutHours: {
          individualCount,
          totalHours: checkOutHours
        },
        mileage: {
          totalHours: mileageHours,
          totalMileage
        },
        battery: {
          totalHours: batteryHours,
          totalBattery
        },
        batteryMileage: {
          totalHours: bmHours,
          totalBattery: bmTotalBattery,
          totalMileage: bmTotalMileage
        }
      } = vehicleStats;

      return sinon.assert.match(
        [
          city, cityId,
          individualCount, checkOutHours,
          mileageHours, totalMileage,
          batteryHours, totalBattery,
          bmHours, bmTotalBattery, bmTotalMileage
        ],
        [
          'Location', `${location._id}`,
          1, 4,
          3, 400,
          3, 150,
          3, 150, 400
        ]
      );
    });
  });

  describe('Location vehicle metrics', () => {
    before(async () => {
      setQueryTarget(null);
    });

    it('Should have correct metrics', async () => {
      const { body: { vehicleStats } } = await adminEndpoint(
        `/v1/stats/vehicles?${buildLocationStatsQuery()}`, 'get', adminToken, app, request, domain
      );

      const {
        city,
        cityId,
        checkOutHours: {
          individualCount,
          totalHours: checkOutHours
        },
        mileage: {
          totalHours: mileageHours,
          totalMileage
        },
        battery: {
          totalHours: batteryHours,
          totalBattery
        },
        batteryMileage: {
          totalHours: bmHours,
          totalBattery: bmTotalBattery,
          totalMileage: bmTotalMileage
        },
        individual
      } = vehicleStats[0];

      // Total vehicle metrics
      sinon.assert.match(
        [
          vehicleStats.length,
          city, cityId,
          individualCount, checkOutHours,
          mileageHours, totalMileage,
          batteryHours, totalBattery,
          bmHours, bmTotalBattery, bmTotalMileage
        ],
        [
          1,
          'Location', `${location._id}`,
          2, 7,
          6, 800,
          5, 250,
          5, 250, 600
        ]
      );

      // Individual metrics
      const {
        id: id1,
        checkOutHours: checkOutHours1,
        mileage: {
          totalHours: mileageHours1,
          totalMileage: totalMileage1
        },
        battery: {
          totalHours: batteryHours1,
          totalBattery: totalBattery1
        },
        batteryMileage: {
          totalHours: bmHours1,
          totalBattery: bmTotalBattery1,
          totalMileage: bmTotalMileage1
        }
      } = individual.find(v => v.id === `${vehicleId1}`);
      const {
        id: id2,
        checkOutHours: checkOutHours2,
        mileage: {
          totalHours: mileageHours2,
          totalMileage: totalMileage2
        },
        battery: {
          totalHours: batteryHours2,
          totalBattery: totalBattery2
        },
        batteryMileage: {
          totalHours: bmHours2,
          totalBattery: bmTotalBattery2,
          totalMileage: bmTotalMileage2
        }
      } = individual.find(v => v.id === `${vehicleId2}`);

      sinon.assert.match(
        [
          `${id1}`, checkOutHours1,
          mileageHours1, totalMileage1,
          batteryHours1, totalBattery1,
          bmHours1, bmTotalBattery1, bmTotalMileage1,

          `${id2}`, checkOutHours2,
          mileageHours2, totalMileage2,
          batteryHours2, totalBattery2,
          bmHours2, bmTotalBattery2, bmTotalMileage2
        ],
        [
          `${vehicleId1}`, 3,
          3, 400,
          2, 100,
          2, 100, 200,

          `${vehicleId2}`, 4,
          3, 400,
          3, 150,
          3, 150, 400
        ]
      );
    });
  });
});
