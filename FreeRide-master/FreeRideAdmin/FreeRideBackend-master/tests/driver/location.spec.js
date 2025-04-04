import sinon from 'sinon';
import io from 'socket.io-client';
import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { port, domain } from '../../config';
import {
  driverEndpoint,
  createDriverLogin
} from '../utils/driver';
import {
  Locations, Settings, Drivers, Zones
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createZone } from '../utils/location';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let sandbox;
let location;
let driver;
const driverLocation = {
  longitude: -73.9078617,
  latitude: 40.7762649
};
const defaultLocationInfo = {
  name: 'Location',
  isADA: false,
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
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


describe('Driver locations', () => {
  before(async () => {
    await emptyAllCollections();

    location = await Locations.createLocation(defaultLocationInfo);

    const defaultZoneInfo = {
      serviceArea: [
        [
          [-73.978573, 40.721239],
          [-73.882936, 40.698337],
          [-73.918642, 40.629585],
          [-73.978573, 40.660845],
          [-73.978573, 40.721239]
        ]
      ],
      location: location._id
    };
    // create zones
    await createZone({ ...defaultZoneInfo, name: 'Zone 1' });
    await createZone({ ...defaultZoneInfo, name: 'Zone 2' });
    await createZone({ ...defaultZoneInfo, name: 'Zone 3' });

    const driverSocket = io.connect(`http://localhost:${port}`, ioOptions);
    driver = await createDriverLogin({
      currentLocation: {
        coordinates: [-73.9078617, 40.6810937],
        type: 'Point'
      },
      locations: [location._id],
      email: 'driver1@mail.com',
      password: 'Password1',
      isOnline: true,
      isAvailable: false
    }, app, request, domain, driverSocket);
    driver.driverSocket = driverSocket;

    await Settings.deleteMany();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    sandbox = sinon.createSandbox();
  });

  beforeEach(async () => {
    sandbox.restore();

    await Drivers.syncIndexes();
    await Locations.syncIndexes();
  });

  describe('GET locations for driver', () => {
    it('should get all associated locations with zones data', async () => {
      const response = await driverEndpoint(`/v1/locations?latitude=${driverLocation.latitude}&longitude=${driverLocation.longitude}`, 'get', driver.driverToken, app, request, domain, {});
      expect(response.body).to.be.an('array');
      expect(response.body[0]).to.have.property('name', location.name);
      expect(response.body[0]).to.have.property('zones');
      expect(response.body[0].zones).to.be.an('array');
      expect(response.body[0].zones).to.have.lengthOf(3);
      expect(response.body[0].zones[0]).to.have.property('name');
      expect(response.body[0].zones[0]).to.have.property('id');
      expect(response.body[0].zones[0]).to.have.property('serviceArea');
    });
    it('should get a single location with zones data', async () => {
      const response = await driverEndpoint(`/v1/locations/${location._id}`, 'get', driver.driverToken, app, request, domain, {});
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('name', location.name);
      expect(response.body).to.have.property('zones');
      expect(response.body.zones).to.be.an('array');
      expect(response.body.zones).to.have.lengthOf(3);
      expect(response.body.zones[0]).to.have.property('name');
      expect(response.body.zones[0]).to.have.property('id');
      expect(response.body.zones[0]).to.have.property('serviceArea');
    });
    it('should return an empty zones array for a location without zones', async () => {
      const newLocation = await Locations.createLocation({
        ...defaultLocationInfo,
        name: 'Location 2'
      });
      const response = await driverEndpoint(`/v1/locations/${newLocation._id}`, 'get', driver.driverToken, app, request, domain, {});
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('name', newLocation.name);
      expect(response.body).to.have.property('zones');
      expect(response.body.zones).to.be.an('array');
      expect(response.body.zones).to.have.lengthOf(0);
    });
    it('should not return deleted zones and default zones for a driver', async () => {
      const newLocation = await Locations.createLocation({
        ...defaultLocationInfo,
        name: 'Location 3'
      });
      await Drivers.updateOne(
        { _id: driver?.driver?._id },
        { locations: [newLocation._id] }
      );
      const zone = await createZone({
        ...defaultLocationInfo,
        name: 'Zone 4',
        location: newLocation._id
      });
      const zonesInLocation = await Zones.getZones({
        location: newLocation._id
      });
      expect(zonesInLocation).to.be.an('array');
      expect(zonesInLocation).to.have.lengthOf(2);

      let singleLocationResponse = await driverEndpoint(
        `/v1/locations/${newLocation._id}`,
        'get',
        driver.driverToken,
        app,
        request,
        domain,
        {}
      );
      let allLocationsResponse = await driverEndpoint(
        `/v1/locations?latitude=${defaultLocationInfo.serviceArea[0].latitude}&longitude=${defaultLocationInfo.serviceArea[0].longitude}`,
        'get',
        driver.driverToken,
        app,
        request,
        domain,
        {}
      );
      expect(singleLocationResponse.body.zones).to.be.an('array');
      expect(singleLocationResponse.body.zones).to.have.lengthOf(1);
      expect(allLocationsResponse.body).to.be.an('array');
      expect(allLocationsResponse.body[0].zones).to.be.an('array');
      expect(allLocationsResponse.body[0].zones).to.have.lengthOf(1);

      await Zones.deleteZone(zone._id, newLocation._id);
      singleLocationResponse = await driverEndpoint(
        `/v1/locations/${newLocation._id}`,
        'get',
        driver.driverToken,
        app,
        request,
        domain,
        {}
      );
      allLocationsResponse = await driverEndpoint(
        `/v1/locations?latitude=${defaultLocationInfo.serviceArea[0].latitude}&longitude=${defaultLocationInfo.serviceArea[0].longitude}`,
        'get',
        driver.driverToken,
        app,
        request,
        domain,
        {}
      );
      expect(singleLocationResponse.body).to.have.property('zones');
      expect(singleLocationResponse.body.zones).to.be.an('array');
      expect(singleLocationResponse.body.zones).to.have.lengthOf(0);
      expect(allLocationsResponse.body[0].zones).to.be.an('array');
      expect(allLocationsResponse.body[0].zones).to.have.lengthOf(0);
    });
  });
});
