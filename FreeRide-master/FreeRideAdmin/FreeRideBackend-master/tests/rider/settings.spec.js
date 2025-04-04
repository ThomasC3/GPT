import { expect } from 'chai';
import request from 'supertest-promised';
import { createRiderLogin, riderEndpoint } from '../utils/rider';
import app from '../../server';
import { emptyAllCollections } from '../utils/helper';
import { domain } from '../../config';
import { Settings } from '../../models';


let rider;

describe('GET Rider Global Settings', () => {
  before(async () => {
    await emptyAllCollections();
    rider = await createRiderLogin({
      firstName: 'Rider FN',
      lastName: 'Rider LN',
      dob: '2000-12-11',
      email: 'rider1@mail.com',
      password: 'Password1'
    }, app, request, domain);
    await Settings.createSettings({ riderAndroid: '1.0.0' });
  });
  it('should get global settings successfully for smsDisabled', async () => {
    let response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('skipPhoneVerification');
    expect(response.body.skipPhoneVerification).to.equal(false);
    expect(response.body.isDynamicRideSearch).to.equal(false);

    await Settings.updateSettings({ smsDisabled: true, isDynamicRideSearch: true });
    response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('skipPhoneVerification');
    expect(response.body.skipPhoneVerification).to.equal(true);
    expect(response.body.isDynamicRideSearch).to.equal(true);
  });
  it('should get global settings successfully for hideFlux', async () => {
    let response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('flux');
    expect(response.body.flux).to.equal(true);

    await Settings.updateSettings({ hideFlux: true });
    response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('flux');
    expect(response.body.flux).to.equal(false);
  });
  it('should get global settings successfully for hideTripAlternativeSurvey', async () => {
    let response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('hideTripAlternativeSurvey');
    expect(response.body.hideTripAlternativeSurvey).to.equal(false);

    await Settings.updateSettings({ hideTripAlternativeSurvey: true });
    response = await riderEndpoint('/v1/global-settings', 'get', rider.riderToken, app, request, domain);
    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('hideTripAlternativeSurvey');
    expect(response.body.hideTripAlternativeSurvey).to.equal(true);
  });
});
