export const dumpRequestForRiderSchema = {
  title: 'Request Schema',
  type: 'object',
  required: [
    'passengers', 'isADA', 'location', 'origin',
    'destination', 'waitingPaymentConfirmation',
    'paymentInformation', 'requestTimestamp'
  ],
  properties: {
    passengers: { type: 'number', minimum: 1, maximum: 5 },
    isADA: { type: 'boolean' },
    location: { type: 'string' },
    origin: {
      type: 'object',
      required: ['latitude', 'longitude', 'isFixedStop'],
      properties: {
        address: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        fixedStopId: { type: 'string' },
        isFixedStop: { type: 'boolean' }
      }
    },
    destination: {
      type: 'object',
      required: ['latitude', 'longitude', 'isFixedStop'],
      properties: {
        address: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        fixedStopId: { type: 'string' },
        isFixedStop: { type: 'boolean' }
      }
    },
    waitingPaymentConfirmation: { type: 'boolean' },
    paymentInformation: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          required: [
            'totalPrice', 'currency', 'status'
          ],
          properties: {
            ridePrice: { anyOf: [{ type: 'null' }, { type: 'number' }] },
            pricePerHead: { anyOf: [{ type: 'null' }, { type: 'number' }] },
            capEnabled: { type: 'boolean' },
            priceCap: { type: 'number' },
            status: { anyOf: [{ type: 'null' }, { type: 'string' }] },
            totalPrice: { type: 'number' },
            currency: { type: 'string' },
            clientSecret: { anyOf: [{ type: 'null' }, { type: 'string' }] }, // null when ride is free because of pwyw or promocode
            paymentIntentId: { anyOf: [{ type: 'null' }, { type: 'string' }] },
            totalWithoutDiscount: { type: 'number' },
            discount: { type: 'number' },
            promocodeCode: { type: 'string' },
            promocodeName: { type: 'string' },
            isPromocodeValid: { type: 'boolean' },
            promocodeInvalidMessage: { anyOf: [{ type: 'null' }, { type: 'string' }] },
            promocodeUsesLeft: { type: 'number' },
            promocodeUsesMax: { type: 'number' },
            promocodeExpiryDate: { type: 'string' }
          }
        }
      ]
    },
    requestTimestamp: { type: 'string' }
  }
};

export const dumpRideForRiderSchema = {
  title: 'Ride Schema',
  type: 'object',
  required: [
    'id', 'isADA', 'driverName', 'createdTimestamp',
    'origin', 'destination', 'status', 'passengers',
    'requestMessages', 'rating'
  ],
  properties: {
    id: { type: 'string' },
    isADA: { type: 'boolean' },
    driverName: { type: 'string' },
    driverPhoto: { type: 'string' },
    licensePlate: { type: 'string' },
    eta: { type: 'number' },
    createdTimestamp: { type: 'string' },
    origin: {
      type: 'object',
      required: ['latitude', 'longitude', 'isFixedStop'],
      properties: {
        address: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        fixedStopId: { type: 'string' },
        isFixedStop: { type: 'boolean' }
      }
    },
    destination: {
      type: 'object',
      required: ['latitude', 'longitude', 'isFixedStop'],
      properties: {
        address: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        fixedStopId: { type: 'string' },
        isFixedStop: { type: 'boolean' }
      }
    },
    status: { type: 'number' },
    passengers: { type: 'number' },
    rating: { anyOf: [{ type: 'null' }, { type: 'number' }] },
    requestMessages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['createdTimestamp', 'message', 'owner', 'ride', 'sender'],
        properties: {
          createdTimestamp: { type: 'string' },
          message: { type: 'string' },
          owner: { type: 'string' },
          ride: { type: 'string' },
          sender: { type: 'string' }
        }
      }
    },
    totalPrice: { type: 'number' },
    totalWithoutDiscount: { type: 'number' },
    discount: { type: 'number' },
    paymentStatus: { type: 'string' },
    currency: { type: 'string' },
    driverArrivedTimestamp: { type: 'string' },
    tipCurrency: { type: 'string' },
    tipTotal: { type: 'number' }
  }
};

export const dumpStopForRiderSchema = {
  title: 'Stop Schema',
  type: 'object',
  required: ['isFixedStop', 'stop'],
  properties: {
    isFixedStop: { type: 'boolean' },
    stop: {
      type: 'object',
      required: ['latitude', 'longitude'],
      properties: {
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        name: { type: 'string' },
        address: { type: 'string' },
        id: { type: 'string' }
      }
    }
  }
};

export const dumpFluxForRiderSchema = {
  title: 'Flux Schema',
  type: 'object',
  required: ['message', 'status', 'color', 'display'],
  properties: {
    message: { type: 'string' },
    status: { type: 'number', minimum: -2, maximum: 2 },
    color: { type: 'string' },
    display: { type: 'boolean' }
  }
};

export const rideContextForRiderSchema = {
  title: 'Ride Context Schema',
  type: 'object',
  required: ['pooling', 'stops', 'eta'],
  additionalProperties: false,
  properties: {
    eta: { type: 'number', minimum: 0, maximum: 60 },
    pooling: { type: 'boolean' },
    stops: { type: 'number', minimum: 0, maximum: 4 }
  }
};

export const dumpMediaItemForRiderSchema = {
  title: 'Media Item Schema',
  type: 'object',
  required: ['id', 'sourceUrl', 'url'],
  properties: {
    id: { type: 'string' },
    sourceUrl: { type: 'string' },
    url: { type: 'string' },
    advertiserId: { type: 'string' },
    advertisementId: { type: 'string' },
    campaignId: { type: 'string' },
    featured: { type: 'boolean' }
  }
};

export default {
  dumpRequestForRiderSchema,
  dumpRideForRiderSchema,
  dumpStopForRiderSchema,
  rideContextForRiderSchema,
  dumpMediaItemForRiderSchema
};
