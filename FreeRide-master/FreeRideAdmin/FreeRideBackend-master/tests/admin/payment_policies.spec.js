import sinon from 'sinon';
import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import {
  Locations, Settings, Zones, PaymentPolicies
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createAdminLogin, adminEndpoint } from '../utils/admin';

let sandbox;

let adminSessionResponse;

let developerToken;
const locationInfo = {
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  timezone: 'Europe/Lisbon',
  stateCode: 'NY',
  locationCode: 'NY0001',
  serviceArea: [
    {
      latitude: 40.2246842,
      longitude: -8.4420742
    },
    {
      latitude: 40.2238472,
      longitude: -8.3978139
    },
    {
      latitude: 40.1860998,
      longitude: -8.3972703
    },
    {
      latitude: 40.189714,
      longitude: -8.430009
    },
    {
      latitude: 40.2246842,
      longitude: -8.4420742
    }
  ],
  advertisement: {
    ageRestriction: 80,
    imageUrl: 'image.png',
    url: 'http://www.ridecircuit.com'
  }
};

const zoneServiceArea = [[
  [40.6902437, -73.5554945],
  [40.6985013, -73.4853253],
  [40.6681543, -73.4744476],
  [40.6623055, -73.5530249],
  [40.6902437, -73.5554945]
]];

const zoneInfo = {
  description: 'My test zone',
  serviceArea: zoneServiceArea
};

const adminInfo = {
  firstName: 'Admin',
  zip: 10001,
  phone: 123456789,
  dob: '2000-12-11'
};

describe('Payment Policies', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    adminSessionResponse = await createAdminLogin();
    developerToken = adminSessionResponse.adminToken;
  });

  beforeEach(async () => {
    sandbox.restore();

    await Locations.syncIndexes();
  });

  describe('Updating payment policies', () => {
    let zoneA;
    let zoneB;
    let zoneC;
    let location1;

    before(async () => {
      location1 = await Locations.createLocation({
        name: 'Location',
        ...locationInfo
      });
      zoneA = await Zones.createZone({
        ...zoneInfo,
        code: 'A',
        name: 'Zone A'
      }, location1._id);
      zoneB = await Zones.createZone({
        ...zoneInfo,
        location: location1._id,
        code: 'B',
        name: 'Zone B'
      }, location1._id);
      zoneC = await Zones.createZone({
        ...zoneInfo,
        location: location1._id,
        code: 'C',
        name: 'Zone C'
      }, location1._id);
    });

    afterEach(async () => {
      await PaymentPolicies.deleteMany({});
    });

    after(async () => {
      await Zones.deleteMany({});
      await Locations.deleteMany({});
    });


    it('should update payment policies for all zone pairs in a location', async () => {
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'destination'
        },
        {
          originZone: zoneA._id,
          destinationZone: zoneC._id,
          value: 'destination'
        },
        {
          originZone: zoneC._id,
          destinationZone: zoneA._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneC._id,
          value: 'destination'
        },
        {
          originZone: zoneC._id,
          destinationZone: zoneB._id,
          value: 'destination'
        }
      ];
      const response = await adminEndpoint(
        `/v1/locations/${location1._id}/payment-policies`,
        'post',
        developerToken,
        app,
        request,
        domain,
        policies
      );
      expect(response.body).to.have.lengthOf(6);
      response.body.forEach((policy) => {
        expect(policy).to.have.property('originZone');
        expect(policy).to.have.property('destinationZone');
        expect(policy).to.have.property('value');
      });
    });
    it('should update payment policies for a single zone pair in a location', async () => {
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'destination'
        }
      ];
      const response = await adminEndpoint(
        `/v1/locations/${location1._id}/payment-policies`,
        'post',
        developerToken,
        app,
        request,
        domain,
        policies
      );
      expect(response.body).to.have.lengthOf(2);
      response.body.forEach((policy) => {
        expect(policy).to.have.property('originZone');
        expect(policy).to.have.property('destinationZone');
        expect(policy).to.have.property('value');
      });
    });
    it('should return an error if the location does not exist', async () => {
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'destination'
        }
      ];
      const response = await adminEndpoint(
        '/v1/locations/5c9f2c4e8e147f0001a1d5f2/payment-policies',
        'post',
        developerToken,
        app,
        request,
        domain,
        policies
      );
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal('Location not found');
    });
    it('should return an error if either the origin or destination zone does not exist', async () => {
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'origin'
        },
        {
          originZone: '5c9f2c4e8e147f0001a1d5f2',
          destinationZone: zoneA._id,
          policyValue: 'origin'
        }
      ];
      const response = await adminEndpoint(
        `/v1/locations/${location1._id}/payment-policies`,
        'post',
        developerToken,
        app,
        request,
        domain,
        policies
      );
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal('Zone not found');
    });
  });
  describe('GET Location Policies', () => {
    let zoneA;
    let zoneB;
    let zoneC;
    let location1;

    before(async () => {
      location1 = await Locations.createLocation({
        name: 'Location',
        ...locationInfo
      });
      zoneA = await Zones.createZone({
        ...zoneInfo,
        code: 'A',
        name: 'Zone A'
      }, location1._id);
      zoneB = await Zones.createZone({
        ...zoneInfo,
        location: location1._id,
        code: 'B',
        name: 'Zone B'
      }, location1._id);
      zoneC = await Zones.createZone({
        ...zoneInfo,
        location: location1._id,
        code: 'C',
        name: 'Zone C'
      }, location1._id);
    });

    afterEach(async () => {
      await PaymentPolicies.deleteMany({});
    });

    it('should return all payment policies for a location', async () => {
      const policies = [
        {
          originZone: zoneA._id,
          destinationZone: zoneB._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneA._id,
          value: 'destination'
        },
        {
          originZone: zoneA._id,
          destinationZone: zoneC._id,
          value: 'destination'
        },
        {
          originZone: zoneC._id,
          destinationZone: zoneA._id,
          value: 'destination'
        },
        {
          originZone: zoneB._id,
          destinationZone: zoneC._id,
          value: 'destination'
        },
        {
          originZone: zoneC._id,
          destinationZone: zoneB._id,
          value: 'destination'
        }
      ];
      await Promise.all(policies.map(async (policy) => {
        await PaymentPolicies.createPaymentPolicy({ ...policy, location: location1._id });
      }));
      const response = await adminEndpoint(
        `/v1/locations/${location1._id}/payment-policies`,
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(response.body).to.have.lengthOf(6);
      response.body.forEach((policy) => {
        expect(policy).to.have.property('originZone');
        expect(policy).to.have.property('destinationZone');
        expect(policy).to.have.property('value');
      });
    });
    it('should return an error if the location does not exist', async () => {
      const response = await adminEndpoint(
        '/v1/locations/5c9f2c4e8e147f0001a1d5f2/payment-policies',
        'get',
        developerToken,
        app,
        request,
        domain
      );
      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal('Location not found');
    });
  });
});
