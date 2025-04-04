import request from 'supertest-promised';
import sinon from 'sinon';
import mongoose from 'mongoose';
import { expect } from 'chai';
import app from '../../server';
import {
  Locations, VehicleTypes, Questions,
  InspectionResults, Responses, Vehicles,
  Events, MatchingRules, Jobs
} from '../../models';
import {
  adminEndpoint, AdminRoles, createAdminLogin
} from '../utils/admin';
import { domain, auth0 as auth0Config } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import { createDriverLogin } from '../utils/driver';
import { createZone } from '../utils/location';


let adminSessionResponse;

let managerToken;
let managerSessionResponse;
let developerToken;

let vehicleType1;
let vehicleType2;
let vehicleType3;

let vehicle;
let vehicle3;
let vehicle4;
let vehicleMatchingRule;

let location1;
let zoneA;
let location2;
let zoneB;

let questions;

let driverId;

let job;

const vehicleType1Info = {
  type: 'Gem',
  passengerCapacity: 3,
  adaCapacity: 1
};

const vehicleType2Info = {
  type: 'Gem 2',
  passengerCapacity: 5,
  adaCapacity: 0
};

const vehicleType3Info = {
  type: 'Gem ADA',
  passengerCapacity: 3,
  adaCapacity: 2
};

const vehicleInfo = {
  name: 'Gem Car',
  publicId: '1212'
};

const vehicleInfo2 = {
  name: 'Hilux',
  publicId: '0008'
};

const vehicleInfo3 = {
  name: 'Gem Z3',
  publicId: '0003'
};

const vehicleInfo4 = {
  name: 'Gem Z4',
  publicId: '0004'
};

const vehicleInfo5 = {
  name: 'Gem Z5',
  publicId: '0005'
};

const vehicleInfo6 = {
  name: 'Gem Z6',
  publicId: '0006'
};

const vehicleMatchingRuleInfo = {
  name: 'Gem Z7',
  publicId: '0007'
};

const wrongVehicleInfo = {
  name: 'Gem Z0',
  publicId: '0000'
};

const questionArr = [
  {
    questionKey: 'battery',
    questionString: 'What is the battery level?',
    responseType: 'number'
  },
  {
    questionKey: 'mileage',
    questionString: 'What is the mileage?',
    responseType: 'number'
  },
  {
    questionKey: 'pluggedIn',
    questionString: 'Is the vehicle pluggedIn?',
    responseType: 'boolean'
  }
];

const responses = {
  battery: '90',
  mileage: '100000',
  pluggedIn: 'true'
};

const locationInfo = {
  name: 'Location1',
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
  locationCode: 'LC001',
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
  ]
};

describe('Vehicle', () => {
  before(async () => {
    await emptyAllCollections();

    location1 = await Locations.createLocation(locationInfo);
    location2 = await Locations.createLocation({ ...locationInfo, name: 'Location2' });

    ({ _id: zoneA } = await createZone({
      name: 'Zone A',
      description: 'Zone in Loc 1',
      serviceArea: location1.serviceArea.coordinates,
      location: location1._id
    }));
    ({ _id: zoneB } = await createZone({
      name: 'Zone B',
      description: 'Zone in Loc 2',
      serviceArea: location2.serviceArea.coordinates,
      location: location2._id
    }));

    vehicleType1 = await VehicleTypes.createVehicleType(vehicleType1Info);
    questions = await Questions.insertMany(questionArr);
    vehicleType2 = await VehicleTypes.createVehicleType(vehicleType2Info);
    vehicleType3 = await VehicleTypes.createVehicleType(vehicleType3Info);

    await MatchingRules.create({
      key: 'shared',
      title: 'Shared',
      description: 'Designated for all requests across all zones'
    });

    await MatchingRules.create({
      key: 'priority',
      title: 'Priority',
      description: 'Designated for requests to or from specific zones but available for all requests if needed'
    });

    job = await Jobs.createJob({
      code: 'LC001-ABCT', location: `${location1._id}`, locationCode: location1.locationCode, clientCode: 'ABC', typeCode: 'T', active: true
    });

    vehicle3 = await Vehicles.createVehicle({
      ...vehicleInfo3,
      vehicleType: vehicleType3._id,
      location: location1._id,
      driverId: new mongoose.Types.ObjectId(),
      jobs: [job._id]
    });

    vehicle4 = await Vehicles.createVehicle({
      ...vehicleInfo4,
      vehicleType: vehicleType3._id,
      location: location1._id,
      driverId: new mongoose.Types.ObjectId()
    });

    vehicleMatchingRule = await Vehicles.createVehicle({
      ...vehicleMatchingRuleInfo,
      vehicleType: vehicleType1._id,
      location: location1._id,
      matchingRule: 'priority',
      zones: [zoneA]
    });

    adminSessionResponse = await createAdminLogin();
    managerSessionResponse = await createAdminLogin(
      { role: AdminRoles.LOCATION_MANAGER, locations: [location2._id] }
    );
    managerToken = managerSessionResponse.adminToken;
    developerToken = adminSessionResponse.adminToken;

    const driver = await createDriverLogin(
      {}, app, request, domain, null, { attachSharedVehicle: false }
    );
    driverId = driver.driver.id;
  });

  describe('Create vehicle', () => {
    it('creates vehicle successfully', async () => {
      vehicleInfo.vehicleType = vehicleType1._id;
      vehicleInfo.location = location1._id;
      const response = await adminEndpoint('/v1/vehicles', 'post', developerToken, app, request, domain, vehicleInfo);
      vehicle = response.body;
      await Vehicles.updateVehicle(
        vehicle.id,
        { driverId }
      );
      sinon.assert.match(response.status, 201);
      sinon.assert.match(response.body.publicId, vehicleInfo.publicId);
      sinon.assert.match(response.body.vehicleType.type, vehicleType1.type);
      sinon.assert.match(response.body.location.name, location1.name);
    });
    it('restricts vehicle creation by accessible location', async () => {
      const [managerLocation] = managerSessionResponse[auth0Config.claimNamespace]
        .app_metadata.locations;
      vehicleInfo2.location = managerLocation;
      vehicleInfo2.vehicleType = vehicleType1._id;
      const response = await adminEndpoint('/v1/vehicles', 'post', managerToken, app, request, domain, vehicleInfo);
      const successResponse = await adminEndpoint('/v1/vehicles', 'post', managerToken, app, request, domain, vehicleInfo2);
      sinon.assert.match(response.status, 403);
      sinon.assert.match(successResponse.status, 201);
    });
    it('creates vehicle without matching rules and zones successfully', async () => {
      vehicleInfo5.vehicleType = vehicleType1._id;
      vehicleInfo5.location = location1._id;
      vehicleInfo5.zones = [];
      vehicleInfo5.matchingRule = '';
      const { body, status } = await adminEndpoint(
        '/v1/vehicles', 'post', developerToken, app, request, domain, vehicleInfo5
      );

      expect(status).to.equal(201);
      expect(body.publicId).to.equal(vehicleInfo5.publicId);
      expect(body.zones).to.eql([]);
      expect(body.matchingRule).to.equal('');
    });
    it('creates vehicle with correct matching rules and zones successfully', async () => {
      vehicleInfo6.vehicleType = vehicleType1._id;
      vehicleInfo6.location = location1._id;
      vehicleInfo6.zones = [zoneA];
      vehicleInfo6.matchingRule = 'priority';
      const { body, status } = await adminEndpoint(
        '/v1/vehicles', 'post', developerToken, app, request, domain, vehicleInfo6
      );

      expect(status).to.equal(201);
      expect(body.publicId).to.equal(vehicleInfo6.publicId);
      expect(body.zones).to.eql([`${zoneA._id}`]);
      expect(body.matchingRule).to.equal('priority');
    });
    it('does not create vehicle with correct matching rule and no zones', async () => {
      wrongVehicleInfo.vehicleType = vehicleType1._id;
      wrongVehicleInfo.location = location1._id;
      wrongVehicleInfo.zones = [];
      wrongVehicleInfo.matchingRule = 'priority';
      const { body, status } = await adminEndpoint(
        '/v1/vehicles', 'post', developerToken, app, request, domain, wrongVehicleInfo
      );

      expect(status).to.equal(409);
      expect(body.message).to.equal('This routing policy requires at least one zone assigned');
    });

    it('does not create vehicle with correct matching rule with zone from different location', async () => {
      wrongVehicleInfo.vehicleType = vehicleType1._id;
      wrongVehicleInfo.location = location1._id;
      wrongVehicleInfo.zones = [zoneB];
      wrongVehicleInfo.matchingRule = 'priority';
      const { body, status } = await adminEndpoint(
        '/v1/vehicles', 'post', developerToken, app, request, domain, wrongVehicleInfo
      );

      expect(status).to.equal(409);
      expect(body.message).to.equal('The selected zones may not be assigned within this location');
    });

    it('does not create vehicle with shared matching rule and zones assigned', async () => {
      wrongVehicleInfo.vehicleType = vehicleType1._id;
      wrongVehicleInfo.location = location1._id;
      wrongVehicleInfo.zones = [zoneA];
      wrongVehicleInfo.matchingRule = 'shared';
      const { body, status } = await adminEndpoint(
        '/v1/vehicles', 'post', developerToken, app, request, domain, wrongVehicleInfo
      );

      expect(status).to.equal(409);
      expect(body.message).to.equal('No zone may be attached for this routing policy');
    });
  });

  describe('GET Vehicle', () => {
    it('gets all vehicles successfully', async () => {
      const response = await adminEndpoint('/v1/vehicles', 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 7);
      sinon.assert.match(response.body.items[0].name, vehicleInfo.name);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets vehicles successfully with available filter true', async () => {
      const params = 'available=true';
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 4);
      sinon.assert.match(response.body.items[3].name, vehicleInfo2.name);
      sinon.assert.match(response.body.items[3].type, vehicleType1Info.type);

      expect(response.body.items[2].name).to.equal(vehicleMatchingRuleInfo.name);
      expect(response.body.items[2].type).to.equal(vehicleType1Info.type);
      expect(response.body.items[2].matchingRule).to.equal('priority');
      expect(response.body.items[2].zones).to.eql([`${zoneA._id}`]);
    });
    it('gets vehicles successfully with available filter false', async () => {
      const params = 'available=false';
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 3);
      sinon.assert.match(response.body.items[0].name, vehicleInfo.name);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets vehicles successfully with name filter', async () => {
      const params = 'name=Hil';
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].name, vehicleInfo2.name);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets vehicles successfully with publicId filter', async () => {
      const params = 'publicId=12';
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].name, vehicleInfo.name);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets all vehicles successfully with vehicleType filter', async () => {
      const params = `vehicleType=${vehicleType1._id}`;
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 5);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets vehicles successfully with job filter', async () => {
      const params = `job=${job._id}`;
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 1);
      sinon.assert.match(response.body.items[0].name, vehicleInfo3.name);
      sinon.assert.match(response.body.items[0].type, vehicleType1Info.type);
    });
    it('gets no vehicles with wrong vehicleType filter', async () => {
      const params = `vehicleType=${vehicleType2._id}`;
      const response = await adminEndpoint(`/v1/vehicles?${params}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 0);
    });
    it('should get single vehicle successfully', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'get', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.name, vehicleInfo.name);
      sinon.assert.match(response.body.vehicleType.type, vehicleType1Info.type);
    });
  });

  describe('UPDATE vehicle', () => {
    beforeEach(async () => {
      await Vehicles.updateMany({ _id: { $in: [vehicle.id, vehicle3.id, vehicle4.id] } }, [
        { $set: { driverId: null } }
      ]);
    });
    it('should restrict vehicle update by admin accessible location', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'put', managerToken, app, request, domain, {
        location: location1._id
      });
      sinon.assert.match(response.status, 403);
    });
    it('200 OK with custom adaCapacity and passengerCapacity update for vehicle', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'put', developerToken, app, request, domain, {
        adaCapacity: 2,
        passengerCapacity: 2,
        setCustomPassengerCapacity: true,
        setCustomADACapacity: true
      });

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.isCustomized, true);
      sinon.assert.match(response.body.vehicleType.adaCapacity, 1);
      sinon.assert.match(response.body.vehicleType.passengerCapacity, 3);
      sinon.assert.match(response.body.adaCapacity, 2);
      sinon.assert.match(response.body.passengerCapacity, 2);
    });
    it('should not allow changing publicId into an already existing publicId', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle4.id}`, 'put', developerToken, app, request, domain, {
        publicId: vehicle3.publicId
      });

      sinon.assert.match(response.status, 409);
      return sinon.assert.match(response.body.message, '');
    });
    it('should not allow changing publicId into an already existing publicId', async () => {
      let response = await adminEndpoint(`/v1/vehicles/${vehicle4.id}`, 'put', developerToken, app, request, domain, {
        publicId: vehicle3.publicId
      });

      sinon.assert.match(response.status, 409);
      sinon.assert.match(response.body.message, '');

      response = await adminEndpoint(`/v1/vehicles/${vehicle3.id}`, 'delete', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.isDeleted, true);

      response = await adminEndpoint(`/v1/vehicles/${vehicle4.id}`, 'put', developerToken, app, request, domain, {
        publicId: vehicle3.publicId
      });

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.publicId, vehicle3.publicId);
      sinon.assert.match(`${response.body.id}` !== `${vehicle3._id}`, true);
      return sinon.assert.match(`${response.body.id}`, `${vehicle4._id}`);
    });
    it('should not allow updating vehicle with correct matching rule and no zones', async () => {
      const { body, status } = await adminEndpoint(`/v1/vehicles/${vehicleMatchingRule._id}`, 'put', developerToken, app, request, domain, {
        matchingRule: 'priority',
        zones: []
      });

      expect(status).to.equal(409);
      expect(body.message).to.equal('This routing policy requires at least one zone assigned');
    });
    it('should not allow updating vehicle with correct matching rule with zone from different location', async () => {
      const { body, status } = await adminEndpoint(`/v1/vehicles/${vehicleMatchingRule._id}`, 'put', developerToken, app, request, domain, {
        matchingRule: 'priority',
        zones: [zoneB]
      });

      expect(status).to.equal(409);
      expect(body.message).to.equal('The selected zones may not be assigned within this location');
    });
    it('should not allow updating vehicle with shared matching rule and zones assigned', async () => {
      const { body, status } = await adminEndpoint(`/v1/vehicles/${vehicleMatchingRule._id}`, 'put', developerToken, app, request, domain, {
        matchingRule: 'shared',
        zones: [zoneA]
      });

      expect(status).to.equal(409);
      expect(body.message).to.equal('No zone may be attached for this routing policy');
    });
    it('should unready a vehicle when matching rule is not set', async () => {
      const { body, status } = await adminEndpoint(`/v1/vehicles/${vehicleMatchingRule._id}`, 'put', developerToken, app, request, domain, {
        matchingRule: '',
        zones: []
      });

      expect(status).to.equal(200);
      expect(body.matchingRule).to.equal('');
      expect(body.zones).to.eql([]);
      expect(body.isReady).to.equal(false);
    });
    it('should enable assigning of jobs to a vehicles', async () => {
      const { body, status } = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'put', developerToken, app, request, domain, {
        jobs: [job._id]
      });

      expect(status).to.equal(200);
      expect(body.jobs).to.have.lengthOf(1);
      expect(body.jobs[0]).to.equal(`${job._id}`);
    });
  });

  describe('Vehicle Inspection', () => {
    it('throws error when an invalid response is passed for a question', async () => {
      const batteryQuestion = await questions.find(question => question.questionKey === 'battery');
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}/inspection`, 'post', developerToken, app, request, domain, {
        responses: [
          {
            questionId: batteryQuestion._id,
            response: 'true'
          }
        ]
      });
      sinon.assert.match(response.body.message, 'Invalid number value');
    });
    it('should update vehicle attributes when admin fills inspection correctly', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}/inspection`, 'post', developerToken, app, request, domain, {
        responses: questions.map(question => ({
          questionId: question._id,
          response: responses[question.questionKey]
        }))
      });
      const inspectionResults = await InspectionResults.find({ inspectionType: 'admin-check' });
      const inspectionResponses = await Responses.find(
        { inspectionResultId: inspectionResults[0]._id }
      );
      sinon.assert.match(inspectionResults[0].userId, adminSessionResponse.id);

      const inspectionEvent = await Events.findOne({ sourceType: 'Admin', eventType: 'ADMIN INSPECTION' });

      sinon.assert.match(inspectionEvent.eventData, {
        responses: { battery: 90, mileage: 100000, pluggedIn: true }
      });
      sinon.assert.match(response.status, 200);
      sinon.assert.match(inspectionResults.length, 1);
      sinon.assert.match(inspectionResponses.length, 3);
      sinon.assert.match(!!(inspectionResponses[0].adminId), true);
      sinon.assert.match(!!(inspectionResponses[0].vehicleId), true);
      sinon.assert.match(!!(inspectionResponses[0].questionKey), true);
      sinon.assert.match(response.body.battery, 90);
      sinon.assert.match(response.body.mileage, 100000);
      sinon.assert.match(response.body.pluggedIn, true);
    });
  });

  describe('DELETE vehicle', () => {
    beforeEach(async () => {
      await Vehicles.findOneAndUpdate({ _id: vehicle.id }, { driverId: null });
    });
    it('should not allow vehicle deletion if driver is attached', async () => {
      await Vehicles.findOneAndUpdate({ _id: vehicle.id }, { driverId });
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'delete', developerToken, app, request, domain);
      sinon.assert.match(response.status, 400);
      sinon.assert.match(response.body.message, 'Unable to delete vehicle because driver is attached');
    });
    it('should not allow admin without delete permission delete vehicle', async () => {
      const { adminToken } = await createAdminLogin({ permissions: ['view:drivers'] });
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'delete', adminToken, app, request, domain);
      sinon.assert.match(response.status, 403);
    });
    it('should allow admins with delete permission delete vehicle', async () => {
      const response = await adminEndpoint(`/v1/vehicles/${vehicle.id}`, 'delete', developerToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.isDeleted, true);
    });
  });
});
