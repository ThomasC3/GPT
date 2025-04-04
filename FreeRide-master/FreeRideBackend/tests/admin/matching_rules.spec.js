import request from 'supertest-promised';
import { expect } from 'chai';
import app from '../../server';
import { MatchingRules } from '../../models';
import { adminEndpoint, createAdminLogin } from '../utils/admin';
import { domain } from '../../config';
import { emptyAllCollections } from '../utils/helper';

let developerToken;

const matchingRuleShared = {
  key: 'shared',
  title: 'Shared',
  description: 'Designated for all requests across all zones'
};
const matchingRulePriority = {
  key: 'priority',
  title: 'Priority',
  description: 'Designated for requests to or from specific zones but available for all requests if needed'
};

let matchingRuleSharedId;
let matchingRulePriorityId;

describe('Admin API - Matching Rules', () => {
  before(async () => {
    await emptyAllCollections();

    ({ adminToken: developerToken } = await createAdminLogin());

    ({ _id: matchingRuleSharedId } = await MatchingRules.create(matchingRuleShared));
    ({ _id: matchingRulePriorityId } = await MatchingRules.create(matchingRulePriority));
  });

  it('GET /matching-rules', async () => {
    const response = await adminEndpoint('/v1/matching-rules', 'get', developerToken, app, request, domain);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    expect(response.body).to.have.lengthOf(2);

    const sharedResponse = response.body.find(rule => rule.key === matchingRuleShared.key);
    const priorityResponse = response.body.find(rule => rule.key === matchingRulePriority.key);

    expect(sharedResponse).to.eql({ ...matchingRuleShared, id: `${matchingRuleSharedId}` });
    expect(priorityResponse).to.eql({ ...matchingRulePriority, id: `${matchingRulePriorityId}` });
  });

  it('GET /matching-rules/:id', async () => {
    const response = await adminEndpoint(`/v1/matching-rules/${matchingRuleSharedId}`, 'get', developerToken, app, request, domain);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('object');

    const matchingRule = (await MatchingRules.findOne({ _id: matchingRuleSharedId })).toJSON();
    expect(matchingRule).to.have.all.keys(['id', 'key', 'title', 'description']);

    expect(response.body).to.eql(matchingRule);
  });
});
