import mongoose  from 'mongoose';

const { Schema } = mongoose;

const zoneSchema = Schema({
  paymentEnabled: { type: Boolean, default: false },
}, { collection: 'Zones', strict: false, versionKey: false });

export default zoneSchema;
