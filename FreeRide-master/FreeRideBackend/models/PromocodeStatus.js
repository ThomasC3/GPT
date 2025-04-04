const PromocodeStatus = {
  valid: {
    statusType: 0,
    valid: true,
    type: null,
    message: null
  },
  invalid: {
    statusType: 1,
    valid: false,
    type: 'invalid',
    message: 'Promocode is not valid'
  },
  wrong_location: {
    statusType: 2,
    valid: false,
    type: 'wrong_location',
    message: 'Promocode cannot be used in current location'
  },
  expired: {
    statusType: 3,
    valid: false,
    type: 'expired',
    message: 'Promocode has expired'
  },
  usage_limit: {
    statusType: 4,
    valid: false,
    type: 'usage_limit',
    message: 'Usage limit for this promocode was reached'
  },
  properties: {
    0: {
      statusType: 0,
      valid: true,
      type: null,
      message: null
    },
    1: {
      statusType: 1,
      valid: false,
      type: 'invalid',
      message: 'Promocode is not valid'
    },
    2: {
      statusType: 2,
      valid: false,
      type: 'wrong_location',
      message: 'Promocode cannot be used in current location'
    },
    3: {
      statusType: 3,
      valid: false,
      type: 'expired',
      message: 'Promocode has expired'
    },
    4: {
      statusType: 4,
      valid: false,
      type: 'usage_limit',
      message: 'Usage limit for this promocode was reached'
    }
  }
};

Object.freeze(PromocodeStatus);

export default PromocodeStatus;
