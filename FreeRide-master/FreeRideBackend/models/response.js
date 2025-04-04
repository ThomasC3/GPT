import { mongodb } from '../services';

const { Schema } = mongodb;

const { ObjectId, Mixed } = Schema.Types;

const ResponseSchema = Schema({
  questionId: {
    type: ObjectId,
    ref: 'Question',
    required: true
  },
  inspectionResultId: {
    type: ObjectId,
    ref: 'InspectionResult',
    required: true
  },
  response: {
    type: Mixed,
    required: true
  },
  responseType: {
    type: String,
    required: true
  },
  submitTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  questionKey: {
    type: String,
    required: true
  },
  vehicleId: {
    type: ObjectId,
    ref: 'Vehicle',
    required: true
  },
  driverId: {
    type: ObjectId,
    ref: 'Driver'
  },
  adminId: {
    type: String
  }
}, {
  versionKey: false,
  collection: 'Responses',
  strict: 'throw'
});

class Response {
  static async createResponses(body) {
    const responses = await this.insertMany(body);
    return responses;
  }
}

ResponseSchema.index({ vehicleId: 1, questionKey: 1 }, { background: true });

ResponseSchema.loadClass(Response);

export default mongodb.model('Response', ResponseSchema);
