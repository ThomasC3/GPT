import request from 'supertest-promised';
import sinon from 'sinon';
import app from '../../server';
import {
  Locations,
  Vehicles, InspectionForms
} from '../../models';
import { adminEndpoint, createAdminLogin } from '../utils/admin';
import { domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';

let superAdminToken;

let vehicleType;

let vehicle;

const vehicleTypeInfo = {
  type: 'Gem',
  passengerCapacity: 3,
  adaCapacity: 1
};

const vehicleInfo = {
  name: 'Hiace 2020',
  publicId: '0000'
};

const locationInfo = {
  name: 'Location1',
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
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

const inspectionFormInfo = {
  name: 'GEM check-in form',
  inspectionType: 'check-in'
};

let inspectionForm;

describe('Vehicle Type', () => {
  before(async () => {
    await emptyAllCollections();
    const location = await Locations.createLocation(locationInfo);
    vehicleInfo.location = location._id;


    const { adminToken } = await createAdminLogin();
    superAdminToken = adminToken;

    inspectionForm = await InspectionForms.createInspectionForm(inspectionFormInfo);
  });

  describe('Vehicle Type creation', () => {
    it('creates vehicle type successfully', async () => {
      const response = await adminEndpoint('/v1/vehicles/types', 'post',
        superAdminToken, app, request,
        domain, { ...vehicleTypeInfo, checkInForm: inspectionForm._id });
      vehicleType = response.body;
      sinon.assert.match(!!inspectionForm._id, true);
      sinon.assert.match(`${inspectionForm._id}`, vehicleType.checkInForm);
      sinon.assert.match(!!vehicleType.checkOutForm, false);
      sinon.assert.match(response.status, 201);
    });
  });

  describe('GET Vehicle Type', () => {
    it('200 OK with correct vehicle types info', async () => {
      const response = await adminEndpoint('/v1/vehicles/types', 'get', superAdminToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body[0].type, vehicleType.type);
    });

    it('should get single vehicle type successfully', async () => {
      const response = await adminEndpoint(`/v1/vehicles/types/${vehicleType.id}`, 'get', superAdminToken, app, request, domain);
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.type, vehicleType.type);
    });
  });

  describe('UPDATE Vehicle Type', () => {
    it('should update vehicleType with correct update data', async () => {
      const response = await adminEndpoint(`/v1/vehicles/types/${vehicleType.id}`, 'put',
        superAdminToken, app, request,
        domain, { passengerCapacity: 4, adaCapacity: 2 });

      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.passengerCapacity, 4);
    });
  });

  describe('DELETE Vehicle Type', () => {
    it('should forbid deletion of vehicle types with vehicles associated to it', async () => {
      vehicleInfo.vehicleType = vehicleType.id;
      vehicle = await Vehicles.createVehicle(vehicleInfo);
      const response = await adminEndpoint(`/v1/vehicles/types/${vehicleType.id}`, 'delete',
        superAdminToken, app, request,
        domain);

      sinon.assert.match(response.status, 400);
    });

    it('should delete vehicle type successfully when no vehicle is attached', async () => {
      await adminEndpoint(`/v1/vehicles/${vehicle._id}`, 'delete',
        superAdminToken, app, request,
        domain);
      const response = await adminEndpoint(`/v1/vehicles/types/${vehicleType.id}`, 'delete',
        superAdminToken, app, request,
        domain);

      sinon.assert.match(response.status, 200);
    });
  });
});
