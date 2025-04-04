import { expect } from 'chai';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import { createScenarioLocation } from '../utils/location';
import { createWebsockets } from '../utils/websockets';
import {
  createScenarioDrivers, hailRide, driverMoved,
  pickUp, dropOff,
  noShowCancel,
  driverCancel,
  driverArrived
} from '../utils/driver';
import {
  Settings, MatchingRules, Rides,
  Routes
} from '../../models';
import { createRequest, createScenarioRiders, riderCancel } from '../utils/rider';
import { driverSearch } from '../../services';
import { fixAndUpdateEtas } from '../../utils/ride';

describe('Scenario #11', () => {
  let location;
  let driver;
  let riders;

  before(async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    // Create location
    location = await createScenarioLocation('San Diego');

    // Create driver
    await MatchingRules.create({
      key: 'shared',
      title: 'Shared',
      description: 'Designated for all requests across all zones'
    });
    const [driverSocket] = createWebsockets(1);
    ([driver] = await createScenarioDrivers(1, { app, request, domain }, [{
      currentLocation: {
        coordinates: [-117.15657043457031, 32.71316146850586],
        type: 'Point'
      },
      locations: [location._id],
      driverSocket
    }]));

    // Create riders
    const riderSockets = createWebsockets(2).map(ws => ({ riderSocket: ws }));
    const riderSocketList = [
      {}, riderSockets[0], {}, {}, {}, {},
      {}, {}, riderSockets[1], {}, {},
      {}, {}, {}, {}, {}];
    riders = await createScenarioRiders(
      15, { app, request, domain }, riderSocketList
    );
  });

  describe('Ride set proper route', () => {
    it('Should assign ride to driver when capacity allows it', async () => {
      await createRequest(
        riders[1].riderToken,
        [32.7253566, -117.167459], [32.7055098, -117.1500737],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.71316146850586, -117.15657043457031);
      await createRequest(
        riders[2].riderToken,
        [32.728744, -117.1726586], [32.7120961, -117.1633583],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.71319580078125, -117.1564712524414);
      await createRequest(
        riders[3].riderToken,
        [32.7112182, -117.1521071], [32.7186937, -117.1540936],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.71150207519531, -117.15299987792969);
      const ride2 = await Rides.findOne({ rider: riders[2].rider._id });
      await pickUp(driver.driverToken, ride2, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71628189086914, -117.15471649169922);
      await dropOff(driver.driverToken, ride2, app, request, domain);
      await driverMoved(driver.driverSocket, 32.717838287353516, -117.15546417236328);
      const ride3 = await Rides.findOne({ rider: riders[3].rider._id });
      await pickUp(driver.driverToken, ride3, app, request, domain);
      await driverMoved(driver.driverSocket, 32.719879150390625, -117.16648864746094);
      const ride1 = await Rides.findOne({ rider: riders[1].rider._id });
      await riderCancel(driver.driverSocket, riders[1].riderSocket, ride1);
      await driverMoved(driver.driverSocket, 32.719879150390625, -117.16648864746094);
      await createRequest(
        riders[4].riderToken,
        [32.71803283691406, -117.1561279296875],
        [32.72428894042969, -117.16835021972656],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.719879150390625, -117.16648864746094);
      await createRequest(
        riders[5].riderToken,
        [32.7193472, -117.1562954], [32.7119913, -117.1550596],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.7198600769043, -117.16726684570312);
      await createRequest(
        riders[6].riderToken,
        [32.7046596, -117.1633], [32.7078454, -117.1490021],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.7198600769043, -117.16726684570312);
      await createRequest(
        riders[7].riderToken,
        [32.7193472, -117.15629539999999], [32.7119913, -117.1550596],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.723567962646484, -117.16838073730469);
      await dropOff(driver.driverToken, ride3, app, request, domain);
      await driverMoved(driver.driverSocket, 32.718833923339844, -117.1684799194336);
      await createRequest(
        riders[8].riderToken,
        [32.7135243, -117.1563772], [32.7088947, -117.1643065],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.71885681152344, -117.16218566894531);
      const ride4 = await Rides.findOne({ rider: riders[4].rider._id });
      await pickUp(driver.driverToken, ride4, app, request, domain);
      const ride6 = await Rides.findOne({ rider: riders[6].rider._id });
      await pickUp(driver.driverToken, ride6, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71257019042969, -117.15667724609375);
      await dropOff(driver.driverToken, ride4, app, request, domain);
      await driverMoved(driver.driverSocket, 32.711734771728516, -117.15510559082031);
      await createRequest(
        riders[9].riderToken,
        [32.71220397949219, -117.15424346923828],
        [32.7122802734375, -117.15985870361328],
        location, app, request, domain
      );
      await driverSearch.search();
      await dropOff(driver.driverToken, ride6, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71173858642578, -117.15510559082031);
      await hailRide(driver.driverToken, location, app, request, domain, false, 2);
      await driverMoved(driver.driverSocket, 32.71173858642578, -117.15510559082031);
      const ride10 = await Rides.findOne({ rider: null });
      await dropOff(driver.driverToken, ride10, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71173858642578, -117.15511322021484);
      const ride8 = await Rides.findOne({ rider: riders[8].rider._id });
      await riderCancel(driver.driverSocket, riders[8].riderSocket, ride8);
      await driverMoved(driver.driverSocket, 32.71223449707031, -117.1546859741211);
      await createRequest(
        riders[11].riderToken,
        [32.709747314453125, -117.15251159667969],
        [32.71691131591797, -117.1580581665039],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.70679473876953, -117.16053009033203);
      const ride7 = await Rides.findOne({ rider: riders[7].rider._id });
      await pickUp(driver.driverToken, ride7, app, request, domain);
      await dropOff(driver.driverToken, ride7, app, request, domain);
      await driverMoved(driver.driverSocket, 32.70494842529297, -117.16361236572266);
      let ride5 = await Rides.findOne({ rider: riders[5].rider._id });
      await driverArrived(driver.driverToken, ride5, app, request, domain);
      let threeMinAgo = new Date((new Date()).getTime() - 180000);
      ride5 = await Rides.findOneAndUpdate(
        { rider: riders[5].rider._id },
        { $set: { driverArrivedTimestamp: threeMinAgo } },
        { new: true }
      );
      await noShowCancel(driver.driverToken, { ride: ride5 }, app, request, domain);
      await driverMoved(driver.driverSocket, 32.704559326171875, -117.15850067138672);
      await createRequest(
        riders[12].riderToken,
        [32.7060956, -117.1505488], [32.720617, -117.1626522],
        location, app, request, domain
      );
      await driverSearch.search();
      await driverMoved(driver.driverSocket, 32.706443786621094, -117.1558837890625);
      await createRequest(
        riders[13].riderToken,
        [32.7186937, -117.1540936], [32.7112182, -117.1521071],
        location, app, request, domain
      );
      await driverSearch.search();
      const ride11 = await Rides.findOne({ rider: riders[11].rider._id });
      await pickUp(driver.driverToken, ride11, app, request, domain);
      await driverMoved(driver.driverSocket, 32.70622253417969, -117.15089416503906);
      const ride9 = await Rides.findOne({ rider: riders[9].rider._id });
      await pickUp(driver.driverToken, ride9, app, request, domain);

      await driverMoved(driver.driverSocket, 32.717803955078125, -117.16092681884766);

      threeMinAgo = new Date((new Date()).getTime() - 180000);
      await Routes.findOneAndUpdate({}, { $set: { lastUpdate: threeMinAgo } });
      await fixAndUpdateEtas(driver.driver._id);

      let route = await Routes.findOne();
      const ride12 = await Rides.findOne({ rider: riders[12].rider._id });
      const ride13 = await Rides.findOne({ rider: riders[13].rider._id });
      const dict = {};
      dict[`${ride9._id}`] = 'ride9';
      dict[`${ride11._id}`] = 'ride11';
      dict[`${ride12._id}`] = 'ride12';
      dict[`${ride13._id}`] = 'ride13';
      expect(
        route.stops.slice(-6).map(stop => [stop.status, stop.stopType, dict[`${stop.ride}`]])
      ).to.eql([
        ['waiting', 'dropoff', 'ride11'],
        ['waiting', 'pickup', 'ride13'],
        ['waiting', 'dropoff', 'ride9'],
        ['waiting', 'pickup', 'ride12'],
        ['waiting', 'dropoff', 'ride13'],
        ['waiting', 'dropoff', 'ride12']
      ]);

      await dropOff(driver.driverToken, ride9, app, request, domain);
      await dropOff(driver.driverToken, ride11, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71886444091797, -117.15670013427734);
      await pickUp(driver.driverToken, ride12, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71529006958008, -117.15386199951172);
      await pickUp(driver.driverToken, ride13, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71116638183594, -117.15199279785156);
      await createRequest(
        riders[14].riderToken,
        [32.7138067, -117.156343], [32.7054854, -117.1487489],
        location, app, request, domain
      );
      await driverSearch.search();

      threeMinAgo = new Date((new Date()).getTime() - 180000);
      await Routes.findOneAndUpdate({}, { $set: { lastUpdate: threeMinAgo } });
      await fixAndUpdateEtas(driver.driver._id);
      route = await Routes.findOne();
      const ride14 = await Rides.findOne({ rider: riders[14].rider._id });
      dict[`${ride14._id}`] = 'ride14';
      expect(
        route.stops.slice(-4).map(stop => [stop.status, stop.stopType, dict[`${stop.ride}`]])
      ).to.eql([
        ['waiting', 'dropoff', 'ride13'],
        ['waiting', 'dropoff', 'ride12'],
        ['waiting', 'pickup', 'ride14'],
        ['waiting', 'dropoff', 'ride14']
      ]);

      await dropOff(driver.driverToken, ride12, app, request, domain);
      await driverMoved(driver.driverSocket, 32.71107482910156, -117.15200805664062);
      await driverCancel(driver.driverToken, ride14._id, app, request, domain);
      await dropOff(driver.driverToken, ride13, app, request, domain);

      const routes = await Routes.find();
      expect(routes.length).to.equal(1);
      expect(routes[0].active).to.equal(false);
    });
  });
});
