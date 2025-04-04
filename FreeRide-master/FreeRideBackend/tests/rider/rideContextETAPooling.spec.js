import { expect } from 'chai';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import driverSearcher from '../../services/driverSearch';
import { port, domain } from '../../config';
import { createScenarioRiders, createRequest, rideEta } from '../utils/rider';
import { createDriverLogin } from '../utils/driver';
import {
  Drivers, Rides, Settings
} from '../../models';
import { emptyAllCollections, emptyCollectionList } from '../utils/helper';
import { createScenarioLocation, listScenarioPoints } from '../utils/location';
import { createWebsockets } from '../utils/websockets';

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let driver;
let rider1;
let rider2;
let location;

const points = listScenarioPoints('Brooklyn');

const keyLoc = {
  // Driver 1
  d1a: [...points[0].reverse(), 'address'],
  // Request 1
  req1p: [...points[1].reverse(), 'address'],
  req1d: [...points[4].reverse(), 'address'],
  // Request 2
  req2p: [...points[2].reverse(), 'address'],
  req2d: [...points[4], 'address']
};

describe('Rider ride context with pooling', () => {
  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    location = await createScenarioLocation('Brooklyn', { concurrentRideLimit: 1 });

    driver = await createDriverLogin({
      locations: [location._id],
      currentLocation: {
        coordinates: [keyLoc.d1a[1], keyLoc.d1a[0]],
        type: 'Point'
      }
    }, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions));

    const riderSockets = createWebsockets(3);
    ([
      rider1, rider2
    ] = await createScenarioRiders(2, { app, request, domain }, [
      { firstName: 'Rider', riderSocket: riderSockets[0] },
      { firstName: 'Rider', riderSocket: riderSockets[1] },
      { firstName: 'Rider', riderSocket: riderSockets[2] }
    ]));
  });

  beforeEach(async () => {
    await Drivers.updateOne({ _id: driver._id }, { $set: { driverRideList: [] } });
    await emptyCollectionList(['Requests', 'Rides', 'Routes']);
  });

  describe('Rider ride context ETA with pooling', () => {
    it('Should have eta for both rides', async () => {
      await createRequest(
        rider1.riderToken, keyLoc.req1p, keyLoc.req1d, location, app, request, domain
      );
      await driverSearcher.search();
      let ride1 = await Rides.findOne({ rider: rider1.rider._id });

      await createRequest(
        rider2.riderToken, keyLoc.req2p, keyLoc.req2d, location, app, request, domain
      );
      await driverSearcher.search();
      let ride2 = await Rides.findOne({ rider: rider2.rider._id });

      const eta1 = await rideEta(ride1, rider1.riderToken, app, request, domain);
      const eta2 = await rideEta(ride2, rider2.riderToken, app, request, domain);

      ride1 = await Rides.findOne({ rider: rider1.rider._id });
      ride2 = await Rides.findOne({ rider: rider2.rider._id });

      expect(eta1).to.equal(1);
      expect(eta2).to.equal(21);
      expect(!!ride1.eta).to.equal(true);
      expect(!!ride2.eta).to.equal(true);
      expect(!!ride1.dropoffEta).to.equal(true);
      expect(!!ride2.dropoffEta).to.equal(true);

      expect(moment.utc(ride1.dropoffEta * 1000).diff(moment.utc(ride1.eta * 1000), 'minutes')).to.equal(10);
      expect(moment.utc(ride2.eta * 1000).diff(moment.utc(ride1.dropoffEta * 1000), 'minutes')).to.equal(9);
      expect(moment.utc(ride2.dropoffEta * 1000).diff(moment.utc(ride2.eta * 1000), 'minutes')).to.equal(9);
    });
  });
});
