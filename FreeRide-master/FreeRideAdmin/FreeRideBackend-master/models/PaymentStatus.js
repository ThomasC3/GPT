const PaymentStatus = {
  unknown: 0,
  requires_payment_method: 1,
  requires_confirmation: 2,
  requires_action: 3,
  processing: 4,
  succeeded: 5,
  requires_capture: 6,
  canceled: 7,
  refunded: 8,
  properties: {
    0: { name: 'unknown', value: 0 },
    1: { name: 'requires_payment_method', value: 1 },
    2: { name: 'requires_confirmation', value: 2 },
    3: { name: 'requires_action', value: 3 },
    4: { name: 'processing', value: 4 },
    5: { name: 'succeeded', value: 5 },
    6: { name: 'requires_capture', value: 6 },
    7: { name: 'canceled', value: 7 },
    8: { name: 'refunded', value: 8 }
  }
};

Object.freeze(PaymentStatus);

export default PaymentStatus;
