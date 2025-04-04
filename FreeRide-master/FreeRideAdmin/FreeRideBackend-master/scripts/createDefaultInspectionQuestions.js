// eslint-disable-next-line no-unused-vars
import { websocket } from '../services';
import { Questions } from '../models';

const createDefaultInspectionQuestions = async () => {
  console.log('Creating default questions...');
  await Questions.insertMany([
    {
      questionKey: 'battery',
      questionString: 'What is the battery percentage?',
      responseType: 'number'
    },
    {
      questionKey: 'mileage',
      questionString: 'What is the mileage?',
      responseType: 'number'
    },
    {
      questionKey: 'pluggedIn',
      questionString: 'Is the car plugged In?',
      responseType: 'boolean'
    }
  ], { ordered: false });
  console.log('Created questions');
  process.exit(0);
};

createDefaultInspectionQuestions();
