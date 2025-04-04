import { mongodb } from '../services';
import RequestStatus from './RequestStatus';
import { cancelRequestPayment } from '../utils/request';
import { dumpRequestForRide } from '../utils/dump';
import { buildGetRequestsQuery } from './utils/requests';

const { Schema } = mongodb;

export const { ObjectId } = Schema;

const paymentInformationSchema = Schema({
  paymentIntentId: {
    type: String
  },
  clientSecret: {
    type: String
  },
  status: {
    type: String
  },
  // PROMOCODE
  promocodeCode: {
    type: String,
    default: null
  },
  promocodeId: {
    type: ObjectId,
    ref: 'Promocode',
    default: null
  },
  isPromocodeValid: {
    type: Boolean,
    default: false
  },
  promocodeInvalidMessage: {
    type: String,
    required: false
  },
  promocodeUsed: {
    type: Boolean,
    default: false
  },
  promocodeName: {
    type: String,
    default: null
  },
  // PRICE DATA
  ridePrice: {
    type: Number,
    default: null
  },
  pricePerHead: {
    type: Number,
    default: null
  },
  amountRefunded: {
    type: Number,
    default: null
  },
  totalPrice: {
    type: Number,
    default: null
  },
  totalWithoutDiscount: {
    type: Number,
    default: null
  },
  discount: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  // PWYW specific
  pwywOptions: {
    type: [Number],
    default: []
  },
  maxCustomValue: {
    type: Number,
    default: null
  }
}, {
  _id: false,
  versionKey: false
});

const zoneSchema = Schema({
  id: {
    type: ObjectId,
    ref: 'Zone',
    required: true
  },
  name: {
    type: String,
    required: true
  }
}, {
  _id: false,
  versionKey: false
});

const RequestSchema = Schema({
  // Route
  location: {
    type: ObjectId,
    ref: 'Location',
    required: true
  },
  pickupAddress: {
    type: String,
    required: false
  },
  pickupLatitude: {
    type: Number,
    required: true
  },
  pickupLongitude: {
    type: Number,
    required: true
  },
  pickupFixedStopId: {
    type: ObjectId,
    ref: 'FixedStop',
    required: false
  },
  pickupFixedStopName: {
    type: String
  },
  pickupZone: {
    type: zoneSchema,
    required: true
  },
  dropoffAddress: {
    type: String,
    required: false
  },
  dropoffLatitude: {
    type: Number,
    required: true
  },
  dropoffLongitude: {
    type: Number,
    required: true
  },
  dropoffFixedStopId: {
    type: ObjectId,
    ref: 'FixedStop',
    required: false
  },
  dropoffFixedStopName: {
    type: String
  },
  dropoffZone: {
    type: zoneSchema,
    required: true
  },
  // User Details
  isADA: {
    type: Boolean,
    required: true
  },
  passengers: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger
    }
  },
  requestMessages: {
    type: [ObjectId],
    ref: 'Message',
    default: []
  },
  // Actors
  ride: {
    type: ObjectId,
    ref: 'Ride'
  },
  rider: {
    type: ObjectId,
    ref: 'Rider',
    required: true
  },
  riderFirstName: {
    type: String
  },
  riderLastName: {
    type: String
  },
  driver: {
    type: ObjectId,
    ref: 'Driver',
    default: null
  },
  // Statuses
  status: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger
    }
  },
  requestTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  searchRetries: {
    type: Number,
    default: 0,
    required: true
  },
  lastRetryTimestamp: {
    type: Date,
    default: null
  },
  processing: {
    type: Boolean,
    required: true,
    default: false
  },
  isFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  isPickupFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  isDropoffFixedStop: {
    type: Boolean,
    required: true,
    default: false
  },
  cancelledBy: {
    type: String
  },
  cancelTimestamp: {
    type: Date,
    default: null
  },
  // Payments
  paymentInformation: {
    type: paymentInformationSchema,
    default: null
  },
  waitingPaymentConfirmation: {
    type: Boolean,
    default: false
  }
}, {
  versionKey: false,
  collection: 'Requests',
  strict: 'throw'
});

class Request {
  static async getRequests(filterParams) {
    const [items = [], total = 0] = await Promise.all([
      this.find(filterParams).populate('paymentInformation.promocodeId').sort({ requestTimestamp: -1 }),
      this.countDocuments(filterParams)
    ]);

    return { total, items };
  }

  static async getRequest(id) {
    return (await this.findById(id)).toJSON();
  }

  static getRequestsCursor(filterParams = {}, locationTimezone = null) {
    const { query } = buildGetRequestsQuery({ ...filterParams, noLimit: true }, locationTimezone);
    return query.cursor();
  }

  static async createRequest(body, message) {
    const requestBody = body;
    if (!requestBody.status) {
      requestBody.status = RequestStatus.RideRequested;
    }

    requestBody.isPickupFixedStop = !!requestBody.pickupFixedStopId;
    requestBody.isDropoffFixedStop = !!requestBody.dropoffFixedStopId;
    requestBody.isFixedStop = requestBody.isPickupFixedStop || requestBody.isDropoffFixedStop;

    if (message) {
      requestBody.requestMessages = [message.id];
    }

    return this.create(requestBody);
  }

  static async updateRequest(id, body) {
    return this.findOneAndUpdate(id, body, { new: true });
  }

  static async findWithoutDriver(locationsQuery) {
    const fifteenSecAgo = 15000; // 15s
    const findQuery = {
      status: RequestStatus.RideRequested,
      lastRetryTimestamp: {
        $not: { $gt: Date.now() - fifteenSecAgo }
      },
      waitingPaymentConfirmation: { $ne: true }
    };

    if (locationsQuery) {
      findQuery.location = locationsQuery;
    }
    const requests = await this.find(findQuery).sort({ requestTimestamp: 1 });

    return requests;
  }

  static async zombiesInCity(locationId) {
    const oneHour = 60 * 60 * 1000;
    const oneHourAgo = Date.now() - oneHour;

    return this.find({
      status: RequestStatus.RideRequested, // requested
      location: locationId, // for current city
      requestTimestamp: { $lt: oneHourAgo }, // older than 1h
      waitingPaymentConfirmation: { $eq: true } // pending payment confirmation
    });
  }

  static async cleanZombiesInLocation(locationId) {
    const requests = await this.zombiesInCity(locationId);

    const updatedRequests = await this.updateMany({
      _id: { $in: requests.map(el => el.id) }
    },
    {
      $set: {
        cancelTimestamp: Date.now(),
        status: RequestStatus.RequestCancelled,
        cancelledBy: 'ADMIN',
        processing: false
      }
    });

    await Promise.all(requests.map(req => cancelRequestPayment(req._id)));

    return updatedRequests;
  }

  async cancel() {
    await cancelRequestPayment(this._id);
    this.status = RequestStatus.RequestCancelled;
    this.processing = false;
    this.cancelledBy = 'NO_AVAILABILITY';
    this.cancelTimestamp = Date.now();

    return this.save();
  }

  rideInfo() {
    return dumpRequestForRide(this.toJSON());
  }
}

RequestSchema.set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    ret.request = ret._id;
    delete ret._id;
    return ret;
  }
});

RequestSchema.index({ status: 1, lastRetryTimestamp: 1 }, { background: true });
RequestSchema.index({ lastRetryTimestamp: 1 }, { background: true });
RequestSchema.index({ rider: 1, status: 1 }, { background: true });
RequestSchema.index({ 'paymentInformation.promocodeUsed': 1, location: 1 }, { background: true });
RequestSchema.index({ location: 1, status: 1 }, { background: true });
RequestSchema.index({ location: 1, requestTimestamp: -1, cancelledBy: 1 }, { background: true });

RequestSchema.index({ 'paymentInformation.paymentIntentId': 1 }, { background: true });

RequestSchema.loadClass(Request);

export default mongodb.model('Request', RequestSchema);
