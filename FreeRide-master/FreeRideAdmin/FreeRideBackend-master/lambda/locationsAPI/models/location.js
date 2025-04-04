import mongoose  from 'mongoose';

const { Schema, Types} = mongoose;

import numberRangeSchema from './numberRange.js';
import polygonSchema from './polygon.js';
import timeSlotSchema from './timeSlot.js';

const locationSchema = Schema({
  locationCode: { type: String, default: '' },
  name: { type: String },
  stateCode: { type: String, default: '' },
  serviceHours: { type: [timeSlotSchema], default: [] },
  paymentEnabled: { type: Boolean, default: false },
  ridesFareCopy: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
  hasAppService: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspendedTitle: { type: String, default: 'Suspended' },
  suspendedCopy: { type: String, default: '' },
  poolingEnabled: { type: Boolean, default: false },
  fixedStopEnabled: { type: Boolean, default: false },
  passengerLimit: { type: Number, default: 5 },
  riderAgeRequirement: { type: Number, default: null },
  freeRideAgeRestrictionEnabled: { type: Boolean, default: false },
  freeRideAgeRestrictionInterval: { type: numberRangeSchema, default: {} },
  serviceArea: { type: polygonSchema, set: value => ({ type: 'Polygon', coordinates: [value.map(el => [el.longitude, el.latitude])] }), get: value => value },
  zones: { type: [Types.ObjectId], default: [] },
}, { collection: 'Locations', strict: false, versionKey: false });

export default locationSchema;
