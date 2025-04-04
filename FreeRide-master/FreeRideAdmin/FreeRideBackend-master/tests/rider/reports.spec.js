import request from 'supertest-promised';
import { expect } from 'chai';
import { createRiderLogin, riderEndpoint } from '../utils/rider';
import {
  Locations, Reports, Rides
} from '../../models';

import app from '../../server';
import { domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';
import { createDriverLogin } from '../utils/driver';

let rider;
let location;
let driver;
let riderToken;

const locationInfo = {
  name: 'Location',
  isUsingServiceTimes: false,
  isActive: true,
  poolingEnabled: true,
  timezone: 'Europe/Lisbon',
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
  ]
};
const keyLoc = {
  req1p: [40.683619, -73.907704, '1485-1461 Bushwick Ave, Brooklyn, NY 11207, USA'],
  req1d: [40.709924, -73.962413, '178 Broadway, Brooklyn, NY 11211, USA']
};

describe('Rider reports driver', () => {
  before(async () => {
    await emptyAllCollections();
    location = await Locations.createLocation(locationInfo);

    ({ rider, riderToken } = await createRiderLogin(
      { email: 'rider1@mail.com', password: 'Password1', phone: '111' },
      app,
      request,
      domain,
    ));

    ({ driver } = await createDriverLogin({
      firstName: 'Driver FN',
      lastName: 'Driver LN',
      email: 'some@mail.com',
      zip: 10001,
      phone: 123456789,
      isOnline: true,
      isTemporaryPassword: false,
      password: 'Password1',
      dob: '2000-12-11',
      currentLocation: {
        coordinates: [keyLoc.req1p[1], keyLoc.req1p[0]],
        type: 'Point'
      },
      locations: [location._id]
    }, app, request, domain));
  });

  it('Should allow a rider to report a driver', async () => {
    const ride = await Rides.create({
      createdTimestamp: new Date(2019, 1, 1, 0, 0),
      location: location._id,
      passengers: 1,
      isADA: false,
      driver: driver._id,
      rider: rider._id,
      status: 700,
      vehicle: null
    });

    const payload = {
      ride: ride._id,
      reason: 'Unsafe driving',
      feedback: 'Driver was texting while driving'
    };

    await riderEndpoint(
      '/v1/report',
      'post',
      riderToken,
      app,
      request,
      domain,
      payload
    );

    const report = await Reports.findOne({
      'reporter.id': rider._id,
      'reportee.id': driver._id
    });
    expect(report.reason).to.equal(payload.reason);
  });
});
