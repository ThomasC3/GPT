import { Questions, InspectionForms } from '../../../models';
import { dump, validator } from '../../../utils';
import { ApplicationError } from '../../../errors';
import { adminErrorCatchHandler } from '..';

const getQuestionsParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    questionKey: validator.rules.string().allow(''),
    questionString: validator.rules.string().allow(''),
    responseType: validator.rules.string().allow(''),
    optional: validator.rules.boolean().allow(''),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    skip: validator.rules.number().integer().min(0),
    limit: validator.rules.number().integer().min(1),
    sort: validator.rules.string().valid('', 'createdTimestamp', 'questionKey'),
    order: validator.rules.string().allow('')
  }),
  req.query
);

const getInspectionFormsParamsValidator = req => validator.validate(
  validator.rules.object().keys({
    inspectionType: validator.rules.string().allow(''),
    name: validator.rules.string().allow(''),
    createdTimestamp: validator.rules.object().keys({
      start: validator.rules.string().allow(''),
      end: validator.rules.string().allow('')
    }),
    skip: validator.rules.number().integer().min(0),
    limit: validator.rules.number().integer().min(1),
    sort: validator.rules.string().valid('', 'createdTimestamp', 'questionKey'),
    order: validator.rules.string().allow('')
  }),
  req.query
);

const getQuestions = async (req, res) => {
  try {
    const filterParams = getQuestionsParamsValidator(req);
    filterParams.isDeleted = false;

    const questions = await Questions.getQuestions(filterParams);
    questions.items = questions.items.map(
      item => dump.dumpQuestionsForAdmin(item)
    );

    res.status(200).json(questions);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getQuestion = async (req, res) => {
  try {
    const {
      params: { id }
    } = req;

    if (!id) { throw new ApplicationError('Missing question id', 400); }

    const question = await Questions.getQuestion({ _id: id });

    if (!question) { throw new ApplicationError('Question not found', 400); }

    res.status(200).json(dump.dumpQuestionsForAdmin(question));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createQuestion = async (req, res) => {
  try {
    const {
      body: questionData
    } = req;

    if (!questionData) { throw new ApplicationError('Missing question information', 400); }

    if (!questionData.questionString) { throw new ApplicationError('Missing question', 400); }
    if (!questionData.questionKey) { throw new ApplicationError('Missing question key', 400); }
    if (!questionData.responseType) { throw new ApplicationError('Missing response type', 400); }

    let question = await Questions.getQuestion({ questionKey: questionData.questionKey });

    if (question) {
      throw new ApplicationError(`Question with key "${question.questionKey}" already exists`, 409);
    }

    question = await Questions.createQuestion(questionData);
    res.status(200).json(dump.dumpQuestionsForAdmin(question));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedQuestion
    } = req;

    if (!id) { throw new ApplicationError('Missing question id', 400); }

    const question = await Questions.updateQuestion(id, updatedQuestion);

    res.status(200).json(dump.dumpQuestionsForAdmin(question));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getInspectionForms = async (req, res) => {
  try {
    const filterParams = getInspectionFormsParamsValidator(req);
    filterParams.isDeleted = false;

    const inspectionForms = await InspectionForms.getInspectionForms(filterParams);
    inspectionForms.items = inspectionForms.items.map(
      item => dump.dumpInspectionFormsForAdmin(item)
    );

    res.status(200).json(inspectionForms);
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const getInspectionForm = async (req, res) => {
  try {
    const {
      params: { id }
    } = req;

    if (!id) { throw new ApplicationError('Missing inspection form id', 400); }

    const inspectionForm = await InspectionForms.getInspectionForm({ _id: id });

    if (!inspectionForm) { throw new ApplicationError('Inspection form not found', 400); }

    res.status(200).json(dump.dumpInspectionFormsWithQuestionsForAdmin(inspectionForm));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const createInspectionForm = async (req, res) => {
  try {
    const {
      body: inspectionFormData
    } = req;

    if (!inspectionFormData) { throw new ApplicationError('Missing inspection form information', 400); }

    if (!inspectionFormData.inspectionType) { throw new ApplicationError('Missing inspection type', 400); }
    if (!inspectionFormData.name) { throw new ApplicationError('Missing name', 400); }

    let inspectionForm = await InspectionForms.getInspectionForm({ name: inspectionFormData.name });

    if (inspectionForm) {
      throw new ApplicationError(`Inspection form with name "${inspectionForm.name}" already exists`, 409);
    }

    inspectionForm = await InspectionForms.createInspectionForm(inspectionFormData);
    res.status(200).json(dump.dumpInspectionFormsWithQuestionsForAdmin(inspectionForm));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const updateInspectionForm = async (req, res) => {
  try {
    const {
      params: { id },
      body: updatedInspectionForm
    } = req;

    if (!id) { throw new ApplicationError('Missing inspection form id', 400); }

    let inspectionForm = await InspectionForms.getInspectionForm({ name: updatedInspectionForm.name, _id: { $ne: id } });

    if (inspectionForm) {
      throw new ApplicationError(`Inspection form with name "${inspectionForm.name}" already exists`, 409);
    }

    inspectionForm = await InspectionForms.updateInspectionForm(id, updatedInspectionForm);

    res.status(200).json(dump.dumpInspectionFormsWithQuestionsForAdmin(inspectionForm));
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteInspectionForm = async (req, res) => {
  try {
    const { id } = req.params;

    await InspectionForms.updateInspectionForm(id, { isDeleted: true });

    res.status(200).json({ message: 'Inspection form deleted successfully' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    await Questions.updateQuestion(id, { isDeleted: true });

    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    adminErrorCatchHandler(res, error, req);
  }
};

export default {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  getInspectionForms,
  getInspectionForm,
  createInspectionForm,
  updateInspectionForm,
  deleteInspectionForm,
  deleteQuestion
};
