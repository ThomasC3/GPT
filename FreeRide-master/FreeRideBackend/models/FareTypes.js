const FareTypes = {
  paymentDisabled: { type: 'free', subType: 'paymentDisabled' },
  freeAgeRestriction: { type: 'free', subType: 'ageRestriction' },
  fixedPayment: { type: 'paid', subType: 'fixedPayment' },
  pwyw: { type: 'paid', subType: 'pwyw' }
};

Object.freeze(FareTypes);

export default FareTypes;
