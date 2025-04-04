import { mongodb } from '../services';

const { Schema } = mongodb;

export const { ObjectId } = Schema.Types;

const VehicleProfileSchema = Schema({
  description: {
    type: String
  },
  profileId: {
    type: String,
    required: true
  },
  configuration: {
    type: Object,
    required: true
  },
  createdTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
},
{
  versionKey: false,
  collection: 'VehicleProfiles'
});

class VehicleProfile {
}

VehicleProfileSchema.index({ isDeleted: 1, profileId: 1 }, { background: true });
VehicleProfileSchema.loadClass(VehicleProfile);

export default mongodb.model('VehicleProfile', VehicleProfileSchema);
