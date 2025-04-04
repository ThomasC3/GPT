/* eslint-disable no-await-in-loop */
import moment from 'moment';
import chai from 'chai';
import jsonSchema from 'chai-json-schema';
import io from 'socket.io-client';
import request from 'supertest-promised';
import app from '../../server';
import { port, domain } from '../../config';
import {
  Settings, Locations, Requests, Rides
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { latestTimeIndex } from '../../utils/timeseries';
import { createDriverLogin, pickUp, dropOff } from '../utils/driver';
import { createRiderLogin, createRequest, riderEndpoint } from '../utils/rider';
import driverSearcher from '../../services/driverSearch';
import { MetricsService } from '../../services';
import { processFluxService } from '../../services/rider/metrics';
import { dumpFluxForRider } from '../../utils/dump';
import { dumpFluxForRiderSchema } from '../utils/schemas';
import { buildTranslator } from '../../utils/translation';

chai.use(jsonSchema);
const { expect } = chai;

const ioOptions = {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
};

let location1;
let riderToken;

const locationServiceArea = [[
  [3.4020295258541466, 6.664068753848554],
  [3.339544784643209, 6.657078139769771],
  [3.3362832184810998, 6.600979128639201],
  [3.4099259491939904, 6.601661221767648],
  [3.4020295258541466, 6.664068753848554]
]];

const getTestData = async () => {
  const { hideFlux: hideFluxLoc } = await Locations.getLocation(location1._id);
  const { hideFlux: hideFluxSettings } = await Settings.getSettings();
  const { body: flux } = await riderEndpoint(`/v1/location/${location1._id}/flux`, 'get', riderToken, app, request, domain);
  return { hideFluxLoc, hideFluxSettings, flux };
};

describe('Rider flux', () => {
  before('Add location and ride data', async () => {
    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });
    location1 = await Locations.createLocation({
      name: 'Timeseries location',
      isActive: true,
      hideFlux: false,
      serviceArea: locationServiceArea[0].map(
        coord => ({ latitude: coord[1], longitude: coord[0] })
      )
    });

    const point = [6.632451, 3.353235, 'address'];
    const { driverToken } = await createDriverLogin({
      currentLocation: { coordinates: point.slice(0, 2).reverse(), type: 'Point' },
      locations: [location1._id]
    }, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions));
    ({ riderToken } = await createRiderLogin({}, app, request, domain, io.connect(`http://localhost:${port}`, ioOptions)));

    await createRequest(riderToken, point, point, location1, app, request, domain);
    await driverSearcher.search();
    const ride = await Rides.findOne({ status: { $ne: 700 } });
    await pickUp(driverToken, ride, app, request, domain);
    await dropOff(driverToken, ride, app, request, domain);
    const pickupTs = latestTimeIndex(moment.utc()).subtract(2, 'minute');
    await Rides.findOneAndUpdate({ _id: ride._id }, {
      $set: {
        createdTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate(),
        pickupTimestamp: pickupTs.unix() * 1000
      }
    });
    await Requests.findOneAndUpdate({ _id: ride.request }, {
      $set: {
        requestTimestamp: pickupTs.clone().subtract(10, 'minutes').toDate()
      }
    });
    await MetricsService.update();
  });
  describe('Rider API /v1/location/:id/flux', () => {
    before('Reset global and location settings', async () => {
      await Settings.findOneAndUpdate({}, { $set: { hideFlux: false } });
      await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: false } });
    });
    it('should return latest tag info', async () => {
      const { body: flux } = await riderEndpoint(`/v1/location/${location1._id}/flux`, 'get', riderToken, app, request, domain);
      expect(flux).to.be.jsonSchema(dumpFluxForRiderSchema);
      expect(flux.message).to.equal('very busy');
      expect(flux.status).to.equal(2);
      expect(flux.color).to.equal('red');
      expect(flux.display).to.equal(true);
    });
    it('should translate tag correctly', async () => {
      const { body: flux } = await riderEndpoint(
        `/v1/location/${location1._id}/flux`, 'get', riderToken, app, request, domain, {}, 200, '1.0.0', { 'accept-language': 'es' }
      );
      expect(flux).to.be.jsonSchema(dumpFluxForRiderSchema);
      expect(flux.message).to.equal('está muy lleno');
      expect(flux.status).to.equal(2);
      expect(flux.color).to.equal('red');
      expect(flux.display).to.equal(true);
    });
    it('should return correct copy and color for each one of the 5 tags in english', async () => {
      const en = await buildTranslator('en');
      const loc = await Locations.getLocation(location1._id);
      const set = await Settings.getSettings({});

      const nullEn = dumpFluxForRider(processFluxService(null, loc, set, en));
      const emptyEn = dumpFluxForRider(processFluxService({}, loc, set, en));
      const notBusyEn = dumpFluxForRider(processFluxService({ measurement: -2 }, loc, set, en));
      const lessBusyEn = dumpFluxForRider(processFluxService({ measurement: -1 }, loc, set, en));
      const normalEn = dumpFluxForRider(processFluxService({ measurement: 0 }, loc, set, en));
      const busyEn = dumpFluxForRider(processFluxService({ measurement: 1 }, loc, set, en));
      const veryBusyEn = dumpFluxForRider(processFluxService({ measurement: 2 }, loc, set, en));

      expect(nullEn.message).to.equal('not busy');
      expect(nullEn.status).to.equal(-2);
      expect(nullEn.color).to.equal('green');
      expect(nullEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(emptyEn.message).to.equal('not busy');
      expect(emptyEn.status).to.equal(-2);
      expect(emptyEn.color).to.equal('green');
      expect(emptyEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(notBusyEn.message).to.equal('not busy');
      expect(notBusyEn.status).to.equal(-2);
      expect(notBusyEn.color).to.equal('green');
      expect(notBusyEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(lessBusyEn.message).to.equal('normal');
      expect(lessBusyEn.status).to.equal(-1);
      expect(lessBusyEn.color).to.equal('green');
      expect(lessBusyEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(normalEn.message).to.equal('normal');
      expect(normalEn.status).to.equal(0);
      expect(normalEn.color).to.equal('green');
      expect(normalEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(busyEn.message).to.equal('busy');
      expect(busyEn.status).to.equal(1);
      expect(busyEn.color).to.equal('yellow');
      expect(busyEn).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(veryBusyEn.message).to.equal('very busy');
      expect(veryBusyEn.status).to.equal(2);
      expect(veryBusyEn.color).to.equal('red');
      expect(veryBusyEn).to.be.jsonSchema(dumpFluxForRiderSchema);
    });
    it('should return correct copy and color for each one of the 5 tags in spanish', async () => {
      const es = await buildTranslator('es');
      const loc = await Locations.getLocation(location1._id);
      const set = await Settings.getSettings({});

      const nullEs = dumpFluxForRider(processFluxService(null, loc, set, es));
      const emptyEs = dumpFluxForRider(processFluxService({}, loc, set, es));
      const notBusyEs = dumpFluxForRider(processFluxService({ measurement: -2 }, loc, set, es));
      const lessBusyEs = dumpFluxForRider(processFluxService({ measurement: -1 }, loc, set, es));
      const normalEs = dumpFluxForRider(processFluxService({ measurement: 0 }, loc, set, es));
      const busyEs = dumpFluxForRider(processFluxService({ measurement: 1 }, loc, set, es));
      const veryBusyEs = dumpFluxForRider(processFluxService({ measurement: 2 }, loc, set, es));

      expect(nullEs.message).to.equal('no está lleno');
      expect(nullEs.status).to.equal(-2);
      expect(nullEs.color).to.equal('green');
      expect(nullEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(emptyEs.message).to.equal('no está lleno');
      expect(emptyEs.status).to.equal(-2);
      expect(emptyEs.color).to.equal('green');
      expect(emptyEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(notBusyEs.message).to.equal('no está lleno');
      expect(notBusyEs.status).to.equal(-2);
      expect(notBusyEs.color).to.equal('green');
      expect(notBusyEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(lessBusyEs.message).to.equal('está normal');
      expect(lessBusyEs.status).to.equal(-1);
      expect(lessBusyEs.color).to.equal('green');
      expect(lessBusyEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(normalEs.message).to.equal('está normal');
      expect(normalEs.status).to.equal(0);
      expect(normalEs.color).to.equal('green');
      expect(normalEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(busyEs.message).to.equal('está lleno');
      expect(busyEs.status).to.equal(1);
      expect(busyEs.color).to.equal('yellow');
      expect(busyEs).to.be.jsonSchema(dumpFluxForRiderSchema);

      expect(veryBusyEs.message).to.equal('está muy lleno');
      expect(veryBusyEs.status).to.equal(2);
      expect(veryBusyEs.color).to.equal('red');
      expect(veryBusyEs).to.be.jsonSchema(dumpFluxForRiderSchema);
    });
  });
  describe('Should show tag according to global and location settings', () => {
    describe('With global setting hideFlux undefined', () => {
      before(async () => {
        await Settings.findOneAndUpdate({}, { $unset: { hideFlux: '' } });
      });
      it('should display tag in Locations with hideFlux undefined', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $unset: { hideFlux: '' } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(undefined);
        expect(hideFluxLoc).to.equal(undefined);
        expect(flux.display).to.equal(true);
      });
      it('should display tag in Locations with hideFlux false', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: false } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(undefined);
        expect(hideFluxLoc).to.equal(false);
        expect(flux.display).to.equal(true);
      });
      it('should not display tag in Locations with hideFlux true', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: true } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(undefined);
        expect(hideFluxLoc).to.equal(true);
        expect(flux.display).to.equal(false);
      });
    });
    describe('With global setting hideFlux false', () => {
      before(async () => {
        await Settings.findOneAndUpdate({}, { $set: { hideFlux: false } });
      });
      it('should display tag in Locations with hideFlux undefined', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $unset: { hideFlux: '' } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(false);
        expect(hideFluxLoc).to.equal(undefined);
        expect(flux.display).to.equal(true);
      });
      it('should display tag in Locations with hideFlux false', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: false } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(false);
        expect(hideFluxLoc).to.equal(false);
        expect(flux.display).to.equal(true);
      });
      it('should not display tag in Locations with hideFlux true', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: true } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(false);
        expect(hideFluxLoc).to.equal(true);
        expect(flux.display).to.equal(false);
      });
    });
    describe('With global setting hideFlux true', () => {
      before(async () => {
        await Settings.findOneAndUpdate({}, { $set: { hideFlux: true } });
      });
      it('should not display tag in Locations with hideFlux undefined', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $unset: { hideFlux: '' } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(true);
        expect(hideFluxLoc).to.equal(undefined);
        expect(flux.display).to.equal(false);
      });
      it('should not display tag in Locations with hideFlux false', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: false } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(true);
        expect(hideFluxLoc).to.equal(false);
        expect(flux.display).to.equal(false);
      });
      it('should not display tag in Locations with hideFlux true', async () => {
        await Locations.findOneAndUpdate({ _id: location1._id }, { $set: { hideFlux: true } });

        const { hideFluxLoc, hideFluxSettings, flux } = await getTestData();

        expect(hideFluxSettings).to.equal(true);
        expect(hideFluxLoc).to.equal(true);
        expect(flux.display).to.equal(false);
      });
    });
  });
});
