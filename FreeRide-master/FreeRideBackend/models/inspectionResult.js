import { mongodb } from '../services';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const inspectionTypes = {
  values: ['check-in', 'check-out', 'admin-check'],
  message: 'Value must be either of \'check-in\' or \'check-out\' or \'admin-check\''
};

const userType = {
  values: ['Driver', 'Admin'],
  message: 'Value must be either of \'Driver\', \'Admin\''
};

const InspectionResultSchema = Schema({
  inspectionType: {
    type: String,
    enum: inspectionTypes,
    required: true
  },
  inspectionFormId: {
    type: ObjectId,
    ref: 'InspectionForm'
  },
  submitTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  userType: {
    type: String,
    enum: userType,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  vehicleId: {
    type: ObjectId,
    ref: 'Vehicle',
    required: true
  }
},
{
  versionKey: false,
  collection: 'InspectionResults',
  strict: 'throw'
});


class InspectionResult {
  static async createDriverInspectionResult(body) {
    const data = body;
    data.userType = 'Driver';
    const inspectionResult = await this.create(body);
    return inspectionResult;
  }

  static async createAdminInspectionResult(body) {
    const data = body;
    data.userType = 'Admin';
    const inspectionResult = await this.create(body);
    return inspectionResult;
  }
}

InspectionResultSchema.loadClass(InspectionResult);


export default mongodb.model('InspectionResult', InspectionResultSchema);
