import request from 'supertest-promised';
import io from 'socket.io-client';
import { expect } from 'chai';
import { emptyAllCollections } from '../utils/helper';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Settings, Riders
} from '../../models';
import { createRiderLogin, riderEndpoint } from '../utils/rider';
import Organizations from '../../models/Organizations';
import { createScenarioLocation } from '../utils/location';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let locationPublic;
let locationOrg;
let riderSocket;

const coordinates = {
  latitude: 40.683619,
  longitude: -73.907704
};

describe('Rider Location Organization', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    riderSocket = io.connect(`http://localhost:${port}`, ioOptions);

    // Create a public location
    locationPublic = await createScenarioLocation('Brooklyn', {
      name: 'Public Location',
      organization: null
    });

    // Create an organization-specific location
    locationOrg = await createScenarioLocation('Brooklyn', {
      name: 'Circuit Location',
      organization: Organizations['ridecircuit.com']
    });
  });

  beforeEach(async () => {
    riderSocket.removeAllListeners();
    await Riders.deleteMany();
  });

  describe('Get Locations Api', () => {
    it('should show only public locations for riders without organization', async () => {
      const rider = await createRiderLogin({
        firstName: 'Public',
        lastName: 'Rider',
        email: 'rider@public.com',
        password: 'Password1'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations?longitude=${coordinates.longitude}&latitude=${coordinates.latitude}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(response.status).to.equal(200);
      expect(response.body).to.have.lengthOf(1);
      expect(response.body[0].name).to.equal('Public Location');
    });

    it('should show both public and organization locations for riders with matching organization', async () => {
      const rider = await createRiderLogin({
        firstName: 'Org',
        lastName: 'Rider',
        email: 'rider@ridecircuit.com',
        password: 'Password1',
        organization: Organizations['ridecircuit.com']
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations?longitude=${coordinates.longitude}&latitude=${coordinates.latitude}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(response.status).to.equal(200);
      expect(response.body).to.have.lengthOf(2);
      expect(response.body.map(loc => loc.name)).to.include.members(['Public Location', 'Circuit Location']);
    });

    it('should not show organization locations for riders with different organization', async () => {
      const { rider, riderToken } = await createRiderLogin({
        firstName: 'Other',
        lastName: 'Rider',
        email: 'rider@other.com',
        password: 'Password1',
        organization: 'other.com'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations?longitude=${coordinates.longitude}&latitude=${coordinates.latitude}`,
        'get', riderToken, app, request, domain
      );

      expect(rider.organization).to.equal('other.com');
      expect(response.status).to.equal(200);
      expect(response.body).to.have.lengthOf(1);
      expect(response.body[0].name).to.equal('Public Location');
    });
  });

  describe('Get Single Location Api', () => {
    it('should allow access to public location for all riders', async () => {
      const rider = await createRiderLogin({
        firstName: 'Public',
        lastName: 'Rider',
        email: 'rider@public.com',
        password: 'Password1'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations/${locationPublic._id}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(response.status).to.equal(200);
      expect(response.body.name).to.equal('Public Location');
    });

    it('should allow access to organization location for matching organization riders', async () => {
      const rider = await createRiderLogin({
        firstName: 'Org',
        lastName: 'Rider',
        email: 'rider@ridecircuit.com',
        password: 'Password1',
        organization: Organizations['ridecircuit.com']
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations/${locationOrg._id}`,
        'get', rider.riderToken, app, request, domain
      );

      expect(response.status).to.equal(200);
      expect(response.body.name).to.equal('Circuit Location');
    });

    it('should not allow access to organization location for non-matching organization riders', async () => {
      const rider = await createRiderLogin({
        firstName: 'Other',
        lastName: 'Rider',
        email: 'rider@other.com',
        password: 'Password1',
        organization: 'other.com'
      }, app, request, domain, riderSocket);

      const response = await riderEndpoint(
        `/v1/locations/${locationOrg._id}`,
        'get', rider.riderToken, app, request, domain,
        {},
        404
      );

      expect(response.status).to.equal(404);
    });
  });
});
