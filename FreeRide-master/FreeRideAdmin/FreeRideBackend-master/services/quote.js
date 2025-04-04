import { ApplicationError } from '../errors';

export default class Quote {
  constructor({
    ridePrice, heads, pricePerHead = 0,
    priceCap = null, capEnabled = false,
    promocode = null, paymentType = 'fixedPayment',
    // PWYW specific
    pwywOptions = null, maxCustomValue = null, pwywValue
  }) {
    this.ridePrice = ridePrice;
    if (paymentType === 'fixedPayment' && !this.ridePrice && this.ridePrice !== 0) {
      throw new ApplicationError('Invalid ride price', 400, 'quote.invalidRidePrice');
    }

    this.heads = heads;
    if (!this.heads) {
      throw new ApplicationError('Invalid number of passengers', 400, 'quote.invalidPassengers');
    }

    if (paymentType === 'pwyw') {
      if (!pwywOptions || pwywOptions.length < 3) {
        throw new ApplicationError('Invalid options', 400, 'quote.invalidPwywOptions');
      }
      if (!maxCustomValue) {
        throw new ApplicationError('Invalid max value', 400, 'quote.invalidMaxPwywValue');
      }
      if (!pwywValue && pwywValue !== 0) {
        throw new ApplicationError('Invalid chosen value', 400, 'quote.invalidPwywValue');
      }
      if (pwywValue < pwywOptions[0]) {
        throw new ApplicationError('Invalid value below minimum', 400, 'quote.lowPwywValue');
      }
      if (pwywValue > maxCustomValue) {
        throw new ApplicationError('Invalid value above maximum', 400, 'quote.highPwywValue');
      }
      this.pwywOptions = pwywOptions;
      this.maxCustomValue = maxCustomValue;
      this.ridePrice = pwywValue;
    }

    this.pricePerHead = pricePerHead;
    this.priceCap = priceCap;
    this.capEnabled = capEnabled;
    this.promocode = promocode;
    this.paymentType = paymentType;
  }

  get totalPrice() {
    const totalPrice = this.calcTotalCapped();
    const discount = (this.promocode && totalPrice !== 0) ? this.calcDiscount(totalPrice) : null;
    return totalPrice - (discount || 0);
  }

  get totalUncapped() {
    return this.calcTotalUncapped();
  }

  get totalCapped() {
    return this.calcTotalCapped();
  }

  get discountValue() {
    const totalPrice = this.calcTotalCapped();
    return this.calcDiscount(totalPrice);
  }

  calcTotalUncapped() {
    if (this.paymentType === 'pwyw') {
      return this.ridePrice;
    }
    return this.ridePrice + (this.heads - 1) * this.pricePerHead;
  }

  calcTotalCapped() {
    const total = this.calcTotalUncapped();
    if (this.paymentType === 'pwyw') {
      return total;
    }
    return this.capEnabled ? Math.min(total, this.priceCap || total) : total;
  }

  calcDiscount(totalPrice) {
    const { type, value: discountValue } = this.promocode;
    switch (type) {
    case 'percentage':
      return Math.round(totalPrice * (discountValue / 100.0));
    case 'value':
      return Math.round(Math.min(discountValue, totalPrice));
    case 'full':
      return totalPrice;
    default:
      return null;
    }
  }
}
