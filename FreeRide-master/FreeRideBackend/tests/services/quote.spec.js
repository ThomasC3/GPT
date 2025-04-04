/* eslint-disable no-new */
import sinon from 'sinon';
import Quote from '../../services/quote';

describe('Quote', () => {
  describe('has no ride Price', () => {
    it('throws no ride price error', () => {
      let errorMsg;
      try {
        new Quote({});
      } catch (err) {
        errorMsg = err.message;
      } finally {
        sinon.assert.match(errorMsg, 'Invalid ride price');
      }
    });
  });

  describe('has no number of passengers', () => {
    it('throws no number of passengers error', () => {
      let errorMsg;
      try {
        new Quote({ ridePrice: 100 });
      } catch (err) {
        errorMsg = err.message;
      } finally {
        sinon.assert.match(errorMsg, 'Invalid number of passengers');
      }
    });
  });

  describe('no price per head', () => {
    it('returns ridePrice = 100', () => {
      const quote = new Quote({ ridePrice: 100, heads: 2 });
      sinon.assert.match(quote.totalPrice, 100);
    });

    it('returns pricePerHead = 0', () => {
      const quote = new Quote({ ridePrice: 100, heads: 2 });
      sinon.assert.match(quote.pricePerHead, 0);
    });
  });

  describe('not capped quote', () => {
    it('returns ridePrice = 120', () => {
      const quote = new Quote({
        ridePrice: 100, heads: 2, pricePerHead: 20, priceCap: 110
      });
      sinon.assert.match(quote.totalPrice, 120);
    });

    it('returns pricePerHead = 20', () => {
      const quote = new Quote({
        ridePrice: 100, heads: 2, pricePerHead: 20, priceCap: 110
      });
      sinon.assert.match(quote.pricePerHead, 20);
    });
  });

  describe('ridePrice is 0', () => {
    it('returns ridePrice = 0', () => {
      const quote = new Quote({
        ridePrice: 0, heads: 1, pricePerHead: 0, priceCap: 110
      });
      sinon.assert.match(quote.totalPrice, 0);
    });
  });

  describe('capped quote', () => {
    it('returns ridePrice = 120', () => {
      const quote = new Quote({
        ridePrice: 100, heads: 2, pricePerHead: 20, priceCap: 150, capEnabled: true
      });
      sinon.assert.match(quote.totalPrice, 120);
    });

    it('returns ridePrice = 110', () => {
      const quote = new Quote({
        ridePrice: 100, heads: 2, pricePerHead: 20, priceCap: 110, capEnabled: true
      });
      sinon.assert.match(quote.totalPrice, 110);
    });

    it('returns priceCap = 110', () => {
      const quote = new Quote({
        ridePrice: 100, heads: 2, pricePerHead: 20, priceCap: 110, capEnabled: true
      });
      sinon.assert.match(quote.priceCap, 110);
    });

    it('returns totalPrice = 75', () => {
      const quote = new Quote({
        ridePrice: 100,
        heads: 2,
        pricePerHead: 50,
        promocode: {
          type: 'percentage',
          value: '50'
        }
      });
      sinon.assert.match(quote.totalPrice, 75);
    });

    it('returns discounValue = 75', () => {
      const quote = new Quote({
        ridePrice: 100,
        heads: 2,
        pricePerHead: 50,
        promocode: {
          type: 'percentage',
          value: '50'
        }
      });
      sinon.assert.match(quote.totalPrice, 75);
    });
  });
  describe('pwyw quote', () => {
    it('returns ridePrice = 100', () => {
      const quote = new Quote({
        heads: 2, pwywValue: 100, pwywOptions: [0, 100, 200], maxCustomValue: 1000, paymentType: 'pwyw'
      });
      sinon.assert.match(quote.totalPrice, 100);
    });

    it('returns ridePrice = 200', () => {
      const quote = new Quote({
        pwywValue: 200,
        pwywOptions: [0, 100, 200],
        maxCustomValue: 1000,
        ridePrice: 100,
        heads: 2,
        pricePerHead: 20,
        priceCap: 110,
        capEnabled: true,
        paymentType: 'pwyw'
      });
      sinon.assert.match(quote.totalPrice, 200);
    });

    it('throws no pwyw values', () => {
      let errorMsg;
      try {
        new Quote({ ridePrice: 100, heads: 2, paymentType: 'pwyw' });
      } catch (err) {
        errorMsg = err.message;
        sinon.assert.match(errorMsg, 'Invalid options');
      }
    });

    it('throws no max custom value', () => {
      let errorMsg;
      try {
        new Quote({
          ridePrice: 100,
          pwywOptions: [100, 200, 300],
          heads: 2,
          paymentType: 'pwyw'
        });
      } catch (err) {
        errorMsg = err.message;
        sinon.assert.match(errorMsg, 'Invalid max value');
      }
    });

    it('throws no pwyw value', () => {
      let errorMsg;
      try {
        new Quote({
          ridePrice: 100,
          pwywOptions: [100, 200, 300],
          maxCustomValue: 1000,
          heads: 2,
          paymentType: 'pwyw'
        });
      } catch (err) {
        errorMsg = err.message;
        sinon.assert.match(errorMsg, 'Invalid chosen value');
      }
    });

    it('throws pwyw value below minimum', () => {
      let errorMsg;
      try {
        new Quote({
          pwywValue: 50,
          ridePrice: 100,
          pwywOptions: [100, 200, 300],
          maxCustomValue: 1000,
          heads: 2,
          paymentType: 'pwyw'
        });
      } catch (err) {
        errorMsg = err.message;
        sinon.assert.match(errorMsg, 'Invalid value below minimum');
      }
    });

    it('throws pwyw value above maximum', () => {
      let errorMsg;
      try {
        new Quote({
          pwywValue: 1100,
          ridePrice: 100,
          pwywOptions: [100, 200, 300],
          maxCustomValue: 1000,
          heads: 2,
          paymentType: 'pwyw'
        });
      } catch (err) {
        errorMsg = err.message;
        sinon.assert.match(errorMsg, 'Invalid value above maximum');
      }
    });

    it('returns totalPrice = 50', () => {
      const quote = new Quote({
        pwywValue: 100,
        ridePrice: 300,
        heads: 2,
        pricePerHead: 50,
        pwywOptions: [100, 200, 300],
        maxCustomValue: 1000,
        paymentType: 'pwyw',
        promocode: {
          type: 'percentage',
          value: '50'
        }
      });
      sinon.assert.match(quote.totalPrice, 50);
    });

    it('returns discounValue = 50', () => {
      const quote = new Quote({
        pwywValue: 100,
        ridePrice: 300,
        heads: 2,
        pricePerHead: 50,
        pwywOptions: [100, 200, 300],
        maxCustomValue: 1000,
        paymentType: 'pwyw',
        promocode: {
          type: 'percentage',
          value: '50'
        }
      });
      sinon.assert.match(quote.totalPrice, 50);
    });
  });
});
