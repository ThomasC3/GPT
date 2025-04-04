import sinon from 'sinon';
import request from 'supertest-promised';
import app from '../../server';
import { domain } from '../../config';
import {
  Settings, Questions, InspectionForms
} from '../../models';
import { emptyAllCollections } from '../utils/helper';
import { createAdminLogin, adminEndpoint } from '../utils/admin';

let sandbox;
let admin;

const questionInfo = {
  questionString: 'What is the current battery level?',
  questionKey: 'battery',
  responseType: 'number'
};

const questionInfoAlt = {
  questionString: 'What is the current mileage?',
  questionKey: 'mileage',
  responseType: 'number'
};

const inspectionFormInfo = {
  name: 'GEM check-in form',
  inspectionType: 'check-in'
};

const inspectionFormAlt = {
  name: 'GEM check-out form',
  inspectionType: 'check-out'
};

let question;
let inspectionForm;

describe('Inspection and question validation', () => {
  before(async () => {
    sandbox = sinon.createSandbox();

    await emptyAllCollections();
    await Settings.createSettings({ riderAndroid: '1.0.0' });

    admin = await createAdminLogin();
  });

  describe('Questions validation', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Questions.deleteMany();
      question = await Questions.createQuestion(questionInfo);
    });

    it('should get a single question', async () => {
      const response = await adminEndpoint(
        `/v1/questions/${question._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.questionKey, question.questionKey);
    });

    it('should get all questions', async () => {
      await Questions.createQuestion(questionInfoAlt);
      const response = await adminEndpoint(
        '/v1/questions', 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 2);
    });

    it('should allow updating questionString and optional', async () => {
      const payload = {
        questionString: 'Another question?',
        optional: true
      };
      // Update question
      await adminEndpoint(
        `/v1/questions/${question._id}`, 'put', admin.adminToken, app, request, domain, payload
      );

      const updatedQuestion = await Questions.findOne({ _id: question._id });

      sinon.assert.match(updatedQuestion.questionString, payload.questionString);
      sinon.assert.match(updatedQuestion.questionString !== question.questionString, true);
      sinon.assert.match(updatedQuestion.optional, payload.optional);
      return sinon.assert.match(updatedQuestion.optional, !question.optional);
    });

    it('should not allow updating questionKey', async () => {
      // Update question
      await adminEndpoint(
        `/v1/questions/${question._id}`, 'put', admin.adminToken, app, request, domain, { questionKey: 'another' }
      );
      const updatedQuestion = await Questions.findOne({ _id: question._id });

      sinon.assert.match(updatedQuestion.questionKey !== 'another', true);
      return sinon.assert.match(updatedQuestion.questionKey, question.questionKey);
    });

    it('should create question if key is unique', async () => {
      // Create question
      const response = await adminEndpoint('/v1/questions', 'post', admin.adminToken, app, request, domain, questionInfoAlt);
      const createdQuestion = await Questions.findOne({ _id: response.body.id });

      const questions = await Questions.find({});
      sinon.assert.match(questions.length, 2);

      return sinon.assert.match(createdQuestion.questionKey, 'mileage');
    });

    it('should not create question if key is not unique', async () => {
      let questions = await Questions.find({});
      sinon.assert.match(questions.length, 1);

      // Create question
      const response = await adminEndpoint('/v1/questions', 'post', admin.adminToken, app, request, domain, questionInfo);
      sinon.assert.match(response.status, 409);

      questions = await Questions.find({});
      return sinon.assert.match(questions.length, 1);
    });

    it('should not create question with same key as deleted question', async () => {
      // Delete question
      let response = await adminEndpoint(
        `/v1/questions/${question._id}`, 'delete', admin.adminToken, app, request, domain
      );

      question = await Questions.findOne({ questionKey: questionInfo.questionKey });
      sinon.assert.match(question.isDeleted, true);

      // Create question
      response = await adminEndpoint('/v1/questions', 'post', admin.adminToken, app, request, domain, questionInfo);
      sinon.assert.match(response.status, 409);

      const questions = await Questions.find({});
      return sinon.assert.match(questions.length, 1);
    });

    it('should return 400 when creating a question without required fields', async () => {
      const incompleteQuestion = { questionString: 'Incomplete question' };
      const response = await adminEndpoint('/v1/questions', 'post', admin.adminToken, app, request, domain, incompleteQuestion);
      sinon.assert.match(response.status, 400);
    });
  });

  describe('Inspection Form', () => {
    beforeEach(async () => {
      sandbox.restore();
      await Questions.deleteMany();
      await InspectionForms.deleteMany();
      question = await Questions.createQuestion(questionInfo);
      inspectionForm = await InspectionForms.createInspectionForm({
        ...inspectionFormInfo,
        questionList: [question._id]
      });
    });

    it('should get all inspection forms', async () => {
      await InspectionForms.createInspectionForm(inspectionFormAlt);
      const response = await adminEndpoint(
        '/v1/inspection-forms', 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.items.length, 2);
    });

    it('should get a single inspection form', async () => {
      const response = await adminEndpoint(
        `/v1/inspection-forms/${inspectionForm._id}`, 'get', admin.adminToken, app, request, domain
      );
      sinon.assert.match(response.status, 200);
      sinon.assert.match(response.body.name, inspectionForm.name);
    });

    it('should allow updating inspection form name', async () => {
      const payload = {
        name: 'Another form'
      };

      // Update form
      await adminEndpoint(
        `/v1/inspection-forms/${inspectionForm._id}`, 'put', admin.adminToken, app, request, domain, payload
      );

      const updatedForm = await InspectionForms.findOne({ _id: inspectionForm._id });

      sinon.assert.match(updatedForm.name, payload.name);
      return sinon.assert.match(updatedForm.name !== inspectionForm.name, true);
    });

    it('should not allow updating inspectionType', async () => {
      // Update form
      await adminEndpoint(
        `/v1/inspection-forms/${inspectionForm._id}`, 'put', admin.adminToken, app, request, domain, { inspectionType: 'check-out' }
      );
      const updatedForm = await InspectionForms.findOne({ _id: inspectionForm._id });

      sinon.assert.match(updatedForm.inspectionType !== 'check-out', true);
      return sinon.assert.match(updatedForm.inspectionType, inspectionForm.inspectionType);
    });

    it('should create form if name is unique', async () => {
      // Create form
      const response = await adminEndpoint('/v1/inspection-forms', 'post', admin.adminToken, app, request, domain, inspectionFormAlt);
      const createdForm = await InspectionForms.findOne({ _id: response.body.id });

      const inspectionForms = await InspectionForms.find({});
      sinon.assert.match(inspectionForms.length, 2);

      sinon.assert.match(createdForm.name, inspectionFormAlt.name);
      return sinon.assert.match(createdForm.inspectionType, 'check-out');
    });

    it('should not create form if name is not unique', async () => {
      let inspectionForms = await InspectionForms.find({});
      sinon.assert.match(inspectionForms.length, 1);

      // Create form
      const response = await adminEndpoint('/v1/inspection-forms', 'post', admin.adminToken, app, request, domain, inspectionFormInfo);
      sinon.assert.match(response.status, 409);

      inspectionForms = await InspectionForms.find({});
      return sinon.assert.match(inspectionForms.length, 1);
    });

    it('should not create form with same name as deleted form', async () => {
      // Delete form
      let response = await adminEndpoint(
        `/v1/inspection-forms/${inspectionForm._id}`, 'delete', admin.adminToken, app, request, domain
      );

      inspectionForm = await InspectionForms.findOne({ _id: inspectionForm._id });
      sinon.assert.match(inspectionForm.isDeleted, true);

      // Create form
      response = await adminEndpoint('/v1/inspection-forms', 'post', admin.adminToken, app, request, domain, inspectionFormInfo);
      sinon.assert.match(response.status, 409);

      const inspectionForms = await InspectionForms.find({});
      return sinon.assert.match(inspectionForms.length, 1);
    });
  });
});
