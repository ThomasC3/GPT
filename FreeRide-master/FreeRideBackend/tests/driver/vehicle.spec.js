import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import moment from 'moment';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Settings, Questions, InspectionForms,
  Vehicles, VehicleTypes, Locations,
  Services, Drivers, InspectionResults,
  Responses, Events, Constants, Rides,
  MatchingRules
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import {
  createDriverLogin, driverEndpoint
} from '../utils/driver';
import driverSearcher from '../../services/driverSearch';
import { createRequest, createRiderLogin } from '../utils/rider';
import { createZone } from '../utils/location';

let sandbox;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

const vehicleTypeInfo = {
  type: 'Gem',
  passengerCapacity: 3,
  adaCapacity: 1
};

const vehicleInfo = {
  name: 'Hiace 2020',
  publicId: '0000'
};

const questionInfo = {
  questionString: 'What is the current battery level?',
  questionKey: 'battery',
  responseType: 'number'
};

const checkOutFormInfo = {
  name: 'GEM check-out form',
  inspectionType: 'check-out'
};

const checkInFormInfo = {
  name: 'GEM check-in form',
  inspectionType: 'check-in'
};

let question;
let checkOutForm;
let checkInForm;
let vehicleType;
let vehicle;
let driver;
let driver2;
let location;
let driverId;
let rider;
let driverSocket;
let riderSocket;
let zoneA;

const keyLoc = {
  req1p: [40.6810937, -73.9078617, 'Address'],
  req1d: [40.6851291, -73.9148140, 'Address']
};

describe('Driver vehicle', () => {
  before(async () => {
    sandbox = sinon.createSandbox();
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });


    location = await Locations.createLocation({
      name: 'Location',
      isADA: false,
      isUsingServiceTimes: false,
      isActive: true,
      fleetEnabled: true,
      serviceArea: [
        { longitude: -73.978573, latitude: 40.721239 },
        { longitude: -73.882936, latitude: 40.698337 },
        { longitude: -73.918642, latitude: 40.629585 },
        { longitude: -73.978573, latitude: 40.660845 },
        { longitude: -73.978573, latitude: 40.721239 }
      ],
      unavailabilityReasons: ['Location unavailability reason']
    });
    const currentLocation = {
      coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
      type: 'Point'
    };
    driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver = await createDriverLogin(
      {
        locations: [location._id], vehicle: null, currentLocation, activeLocation: location._id
      },
      app, request, domain, driverSocket,
      { attachSharedVehicle: false }
    );
    driver2 = await createDriverLogin(
      {
        locations: [location._id], email: 'driver2@email.com', vehicle: null, currentLocation, activeLocation: location._id
      },
      app, request, domain, driverSocket,
      { attachSharedVehicle: false }
    );
    driverId = driver.driver.id;
    rider = await createRiderLogin(
      { location: location._id },
      app, request, domain, riderSocket
    );

    question = await Questions.createQuestion(questionInfo);
    checkOutForm = await InspectionForms.createInspectionForm({
      ...checkOutFormInfo,
      questionList: [question._id]
    });

    checkInForm = await InspectionForms.createInspectionForm({
      ...checkInFormInfo,
      questionList: [question._id]
    });

    vehicleType = await VehicleTypes.createVehicleType({
      ...vehicleTypeInfo,
      checkOutForm: checkOutForm._id,
      checkInForm: checkInForm._id
    });

    await MatchingRules.create({
      key: 'priority',
      title: 'Priority',
      description: 'Designated for requests to or from specific zones but available for all requests if needed'
    });

    zoneA = await createZone({
      name: 'Zone A',
      description: 'Zone in Loc',
      serviceArea: location.serviceArea.coordinates,
      location: location._id
    });

    vehicleInfo.matchingRule = 'priority';
    vehicleInfo.zones = [zoneA._id];

    await Vehicles.createVehicle({
      ...vehicleInfo,
      publicId: '1111',
      vehicleType: vehicleType._id,
      location: location._id,
      lastCheckIn: moment().subtract(2, 'hours'),
      licensePlate: 'ABC-123'
    });
    vehicle = await Vehicles.createVehicle({
      ...vehicleInfo,
      vehicleType: vehicleType._id,
      location: location._id,
      lastCheckIn: moment().subtract(3, 'hours'),
      licensePlate: 'DEF-456'
    });

    await Services.create({
      key: 'ada_only',
      title: 'ADA Only',
      desc: 'Ada Cap only'
    });
    await Services.create({
      key: 'passenger_only',
      title: 'Passenger Only',
      desc: 'Passenger Cap only'
    });
    await Services.create({
      key: 'mixed_service',
      title: 'Mixed Service',
      desc: 'Mixed service only'
    });
  });

  describe('GET Check-out Form', () => {
    beforeEach(async () => {
      sandbox.restore();
      driver.driverSocket.removeAllListeners();
      await Drivers.updateOne({ _id: driver.driver._id }, { $set: { isOnline: true } });
      await Drivers.syncIndexes();
      await Locations.syncIndexes();
    });

    it('should not return check-out inspection form if driver is logged out', async () => {
      await Drivers.updateOne({ _id: driver.driver._id }, { $set: { isOnline: false } });
      const { body } = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'get', driver.driverToken, app, request, domain, {}, 403
      );
      sinon.assert.match(
        body.message,
        'Unable to get check-out form. Your session has expired. Please log out and then log back in.'
      );
    });

    it('should return check-out inspection form', async () => {
      const { body: { inspectionForm: inspectionFormData } } = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'get', driver.driverToken, app, request, domain
      );

      sinon.assert.match(inspectionFormData.id, `${checkOutForm._id}`);
      sinon.assert.match(inspectionFormData.inspectionType, 'check-out');
      sinon.assert.match(inspectionFormData.name, checkOutForm.name);
      sinon.assert.match(inspectionFormData.questions.length, 1);
      sinon.assert.match(inspectionFormData.questions[0].id, `${question._id}`);
      sinon.assert.match(inspectionFormData.questions[0].questionString, question.questionString);
      sinon.assert.match(inspectionFormData.questions[0].questionKey, question.questionKey);
      sinon.assert.match(inspectionFormData.questions[0].responseType, question.responseType);
      return sinon.assert.match(inspectionFormData.questions[0].optional, question.optional);
    });
  });
  describe('Get vehicles', () => {
    it('throws error when location is not added to get vehicles', async () => {
      const response = await driverEndpoint('/v1/vehicles', 'get', driver.driverToken, app, request, domain, {}, 400);
      sinon.assert.match(response.status, 400);
    });
    it('should get vehicles sorted by lastCheckedIn when location is provided', async () => {
      const response = await driverEndpoint(`/v1/vehicles/?location=${location._id}`, 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.length, 2);
      sinon.assert.match(response.body[0].publicId, vehicle.publicId);
      expect(response.body[0].matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(response.body[0].zones).to.eql([{ id: `${zoneA._id}`, name: `${zoneA.name}` }]);
      expect(response.body[0].licensePlate).to.equal('DEF-456');
      expect(response.body[1].licensePlate).to.equal('ABC-123');
    });
    it('should not get occupied vehicles', async () => {
      await Vehicles.updateVehicle(vehicle._id, { driverId: driver.driver.id });
      const response = await driverEndpoint(`/v1/vehicles/?location=${location._id}`, 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.length, 1);
    });
  });

  describe('Vehicles Services', () => {
    it('gets correct vehicle services', async () => {
      await Vehicles.updateVehicle(vehicle._id, { driverId: null });
      const response = await driverEndpoint(`/v1/vehicles/?location=${location._id}`, 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body[0].services.length, 3);
    });
    it('doesnt return unavailable service', async () => {
      await Services.updateOne({ key: 'ada_only' }, { isDeleted: true });
      await Services.updateOne({ key: 'mixed_service' }, { isDeleted: true });
      const response = await driverEndpoint(`/v1/vehicles/?location=${location._id}`, 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body[0].services.length, 1);
      sinon.assert.match(response.body[0].services[0].key, 'passenger_only');
    });
  });

  describe('Check-out', () => {
    beforeEach(async () => {
      await Drivers.updateOne({ _id: driver.driver._id }, { $set: { isOnline: true } });
    });
    it('throws error when invalid service key is passed', async () => {
      const payload = {
        service: 'passenger',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '10'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Service is not available');
    });
    it('throws error when service is generally not available', async () => {
      await Drivers.updateOne({ _id: driver.driver._id }, { $set: { isOnline: false } });
      const payload = {
        service: 'ada_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '10'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 403
      );
      sinon.assert.match(
        response.body.message,
        'Unable to check-out vehicle. Your session has expired. Please log out and then log back in.'
      );
    });
    it('throws error when service is generally not available', async () => {
      const payload = {
        service: 'ada_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '10'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Service is not available');
    });
    it('throws error when service is generally available but not for selected vehicle', async () => {
      await Services.updateOne({ key: 'ada_only' }, { isDeleted: false });
      await Services.updateOne({ key: 'mixed_service' }, { isDeleted: false });
      await Vehicles.updateVehicle(vehicle._id, { isADAOnly: true });
      const payload = {
        service: 'passenger_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '10'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Service is not available');
    });
    it('throws error when an invalid response is passed for a question', async () => {
      await Vehicles.updateVehicle(vehicle._id, { isADAOnly: false });
      const payload = {
        service: 'passenger_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: 'true'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Invalid number value');
    });
    it('successfully checks out a vehicle for driver', async () => {
      const payload = {
        service: 'passenger_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '80'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload
      );

      // Check-out return should have matching rule and zone information
      expect(response.body.vehicle.matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(response.body.vehicle.zones).to.have.lengthOf(1);
      expect(response.body.vehicle.zones[0]).to.eql({ id: `${zoneA._id}`, name: 'Zone A' });
      expect(response.body.vehicle.publicId).to.equal(vehicleInfo.publicId);
      expect(response.body.vehicle.name).to.equal(vehicleInfo.name);
      expect(response.body.vehicle.licensePlate).to.equal('DEF-456');

      // Driver should now have matching rule and zone information
      const driverAfterCheckOut = (await Drivers.findOne({ _id: driver.driver._id })).toJSON();
      expect(driverAfterCheckOut.vehicle.matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(driverAfterCheckOut.vehicle.zones).to.have.lengthOf(1);
      expect(driverAfterCheckOut.vehicle.zones).to.eql([{ id: zoneA._id, name: zoneA.name }]);

      const inspectionResults = await InspectionResults.countDocuments();
      const checkOutQuestionResponses = await Responses.find();
      const driverData = await Drivers.findById(driver.driver.id);
      const vehicleData = await Vehicles.findById(driverData.vehicle.vehicleId);
      const { items: checkOutEvents } = await Events.getEvents({ driverId: driver._id, eventType: 'CHECK-OUT' });
      const { items: availabilityEvents } = await Events.getEvents({ driverId: driver._id, eventType: 'AVAILABLE' });
      const inspectionResult = await InspectionResults.findOne({ inspectionType: 'check-out' });
      const responses = await Responses.find({ inspectionResultId: inspectionResult._id });

      sinon.assert.match(response.body.isAvailable, true);
      sinon.assert.match(response.body.unavailabilityReasons, ['Location unavailability reason']);
      sinon.assert.match(inspectionResults, 1);
      sinon.assert.match(checkOutQuestionResponses[0].response, 80);
      sinon.assert.match(driverData.vehicle.vehicleId, vehicle._id);
      sinon.assert.match(driverData.vehicle.publicId, vehicle.publicId);
      sinon.assert.match(checkOutEvents.length, 1);
      sinon.assert.match(checkOutEvents[0].eventData, { responses: { battery: 80 } });
      sinon.assert.match(availabilityEvents.length, 1);
      sinon.assert.match(availabilityEvents[0].eventData, { location: location._id });
      sinon.assert.match(responses.length, 1);
      sinon.assert.match(!!(responses[0].vehicleId), true);
      sinon.assert.match(!!(responses[0].driverId), true);
      sinon.assert.match(!!(responses[0].questionKey), true);
      sinon.assert.match(vehicleData.battery, 80);
    });
    it('throws error when driver has already checked a vehicle', async () => {
      const payload = {
        service: 'passenger_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '20'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Already checked-out a vehicle');
    });
    it('throws error when vehicle is occupied', async () => {
      const payload = {
        service: 'passenger_only',
        inspectionForm: {
          id: checkOutForm._id,
          responses: [
            {
              questionId: question._id,
              response: '20'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        `/v1/vehicle/${vehicle._id}/check-out`, 'post', driver2.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Vehicle is unavailable.');
    });
  });
  describe('Checked-out vehicle driver availability', () => {
    before(async () => {
      await Constants.create({
        topic: 'Unavailability reasons',
        key: 'unavailability_reasons',
        values: [
          'Taking 5 minutes break',
          'Taking 10 minutes break'
        ]
      });
    });
    it('gets checked-out vehicle driver availability', async () => {
      const response = await driverEndpoint('/v1/driver/status/', 'get', driver.driverToken, app, request, domain);
      sinon.assert.match(response.body.isAvailable, true);
      sinon.assert.match(response.body.vehicle.name, vehicle.name);
      sinon.assert.match(response.body.vehicle.serviceKey, 'passenger_only');
      sinon.assert.match(response.body.vehicle.serviceTitle, 'Passenger Only');
      sinon.assert.match(response.body.unavailabilityReasons.length, 3);
      sinon.assert.match(response.body.unavailabilityReasons, [
        'Taking 5 minutes break',
        'Taking 10 minutes break',
        'Location unavailability reason'
      ]);
      expect(response.body.vehicle.matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(response.body.vehicle.zones).to.eql([{ name: zoneA.name, id: `${zoneA._id}` }]);
      expect(response.body.vehicle.licensePlate).to.eql('DEF-456');
    });
    it('successfully updates checked-out vehicle availability', async () => {
      const response = await driverEndpoint('/v1/driver/status/', 'post', driver.driverToken, app, request, domain, { isAvailable: false, reason: 'Taking 10 minutes break' });
      const { items: events } = await Events.getEvents({ sourceId: driverId, sourceType: 'Driver' });
      const driverData = await Drivers.findById(driver.driver.id);

      sinon.assert.match(driverData.status, 'Taking 10 minutes break');
      sinon.assert.match(events[0].eventType, 'UNAVAILABLE');
      sinon.assert.match(events[0].eventData, { reason: 'Taking 10 minutes break', location: location._id });
      sinon.assert.match(response.body.isAvailable, false);
      sinon.assert.match(response.body.vehicle.serviceKey, 'passenger_only');
      sinon.assert.match(response.body.vehicle.serviceTitle, 'Passenger Only');
      sinon.assert.match(response.body.unavailabilityReasons.length, 3);
      sinon.assert.match(response.body.unavailabilityReasons, [
        'Taking 5 minutes break',
        'Taking 10 minutes break',
        'Location unavailability reason'
      ]);
      expect(response.body.vehicle.matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(response.body.vehicle.zones).to.eql([{ name: zoneA.name, id: `${zoneA._id}` }]);
    });
    it('successfully logins again with vehicle information', async () => {
      const response = await driverEndpoint(
        '/v1/login/', 'post', driver.driverToken, app, request, domain, { email: 'some@mail.com', password: 'Password1' }
      );

      expect(response.body.vehicle.matchingRule).to.eql({ key: 'priority', title: 'Priority' });
      expect(response.body.vehicle.zones).to.eql([{ name: zoneA.name, id: `${zoneA._id}` }]);
    });
    it('resets unavailability reason when driver availability is changed to available', async () => {
      const response = await driverEndpoint('/v1/driver/status/', 'post', driver.driverToken, app, request, domain, { isAvailable: true });
      const { items: events } = await Events.getEvents({ sourceId: driverId, sourceType: 'Driver' });
      const driverData = await Drivers.findById(driver.driver.id);
      sinon.assert.match(events[0].eventType, 'AVAILABLE');
      sinon.assert.match(driverData.status, 'Available');
      sinon.assert.match(response.body.isAvailable, true);
    });
  });
  describe('GET Check-in form', () => {
    it('returns error when no vehicle is attached to driver', async () => {
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'get', driver2.driverToken, app, request, domain, {}, 400
      );
      sinon.assert.match(response.body.message, 'No vehicle attached');
    });
    it('returns error when driver is still available to receive rides', async () => {
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'get', driver.driverToken, app, request, domain, {}, 400
      );
      sinon.assert.match(response.body.message, 'Unable to check-in vehicle while available to receive rides');
    });
    it('returns error when driver has active rides', async () => {
      await createRequest(
        rider.riderToken,
        keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      await driverEndpoint('/v1/driver/status/', 'post', driver.driverToken, app, request, domain, { isAvailable: false, reason: 'End of shift' });
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'get', driver.driverToken, app, request, domain, {}, 400
      );
      sinon.assert.match(response.body.message, 'There are active rides');
    });
    it('gets check-in inspection form successfully', async () => {
      await Rides.deleteMany();
      await Drivers.updateOne({ _id: driverId }, { $set: { driverRideList: [] } });
      const { body: { inspectionForm: inspectionFormData } } = await driverEndpoint(
        '/v1/vehicle/check-in', 'get', driver.driverToken, app, request, domain
      );

      sinon.assert.match(inspectionFormData.id, `${checkInForm._id}`);
      sinon.assert.match(inspectionFormData.inspectionType, 'check-in');
      sinon.assert.match(inspectionFormData.name, checkInForm.name);
      sinon.assert.match(inspectionFormData.questions.length, 1);
      sinon.assert.match(inspectionFormData.questions[0].id, `${question._id}`);
      sinon.assert.match(inspectionFormData.questions[0].questionString, question.questionString);
      sinon.assert.match(inspectionFormData.questions[0].questionKey, question.questionKey);
      sinon.assert.match(inspectionFormData.questions[0].responseType, question.responseType);
      sinon.assert.match(inspectionFormData.questions[0].optional, question.optional);
    });
  });
  describe('POST Check-in form', () => {
    it('returns error when no vehicle is attached to driver', async () => {
      const payload = {
        inspectionForm: {
          id: checkInForm._id,
          responses: [
            {
              questionId: question._id,
              response: '5'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'post', driver2.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'No vehicle attached');
    });
    it('returns error when driver is still available to receive rides', async () => {
      const payload = {
        inspectionForm: {
          id: checkInForm._id,
          responses: [
            {
              questionId: question._id,
              response: '5'
            }
          ]
        }
      };
      await driverEndpoint('/v1/driver/status/', 'post', driver.driverToken, app, request, domain, { isAvailable: true });
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'Unable to check-in vehicle while available to receive rides');
    });
    it('returns error when driver has active rides', async () => {
      const payload = {
        inspectionForm: {
          id: checkInForm._id,
          responses: [
            {
              questionId: question._id,
              response: '5'
            }
          ]
        }
      };
      await createRequest(
        rider.riderToken,
        keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      await driverEndpoint('/v1/driver/status/', 'post', driver.driverToken, app, request, domain, { isAvailable: false, reason: 'End of shift' });
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'post', driver.driverToken, app, request, domain, payload, 400
      );
      sinon.assert.match(response.body.message, 'There are active rides');
    });
    it('successfully checks-in vehicle', async () => {
      await Rides.deleteMany();
      await Drivers.updateOne({ _id: driverId }, { $set: { driverRideList: [] } });
      const payload = {
        inspectionForm: {
          id: checkInForm._id,
          responses: [
            {
              questionId: question._id,
              response: '5'
            }
          ]
        }
      };
      const response = await driverEndpoint(
        '/v1/vehicle/check-in', 'post', driver.driverToken, app, request, domain, payload
      );
      const driverData = await Drivers.getDriver({ _id: driverId });
      const vehicleData = await Vehicles.getVehicle({ _id: vehicle._id });
      const { items: events } = await Events.getEvents({ driverId, eventType: 'CHECK-IN' });
      const inspectionResult = await InspectionResults.findOne({ inspectionType: 'check-in' });
      const responses = await Responses.find({ inspectionResultId: inspectionResult._id });

      sinon.assert.match(response.body.vehicle, null);
      sinon.assert.match(response.body.isAvailable, false);
      sinon.assert.match(driverData.vehicle, null);
      sinon.assert.match(vehicleData.driverId, null);
      sinon.assert.match(vehicleData.battery, 5);
      sinon.assert.match(events.length, 1);
      sinon.assert.match(events[0].eventData, { responses: { battery: 5 } });
      sinon.assert.match(responses.length, 1);
      sinon.assert.match(!!(responses[0].vehicleId), true);
      sinon.assert.match(!!(responses[0].driverId), true);
      sinon.assert.match(!!(responses[0].questionKey), true);
    });
  });
});
