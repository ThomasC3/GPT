import { mongodb } from '../services';

const { Schema } = mongodb;
export const { ObjectId } = Schema;

const PaymentRulesSchema = Schema(
  {
    location: {
      type: ObjectId,
      ref: 'Locations',
      required: true
    },
    originZone: {
      type: ObjectId,
      ref: 'Zones',
      required: true
    },
    destinationZone: {
      type: ObjectId,
      ref: 'Zones',
      required: true
    },
    value: {
      type: String,
      enum: ['origin', 'destination'],
      required: true
    }
  },
  {
    versionKey: false,
    collection: 'PaymentRules',
    strict: 'throw'
  }
);

class PaymentRule {
  static async createPaymentPolicy(body) {
    const policy = await this.create(body);
    return policy;
  }

  static async updatePaymentPolicy(body) {
    const policy = await this.findOneAndUpdate(
      { originZone: body.originZone, destinationZone: body.destinationZone },
      body,
      { new: true }
    );
    return policy;
  }

  static async updateOrCreatePaymentPolicy(body) {
    return this.findOneAndUpdate(
      { originZone: body.originZone, destinationZone: body.destinationZone },
      body,
      { new: true, upsert: true }
    );
  }

  static async getPaymentPolicies(queryParam) {
    const policies = await this.find(queryParam);
    return policies;
  }

  static async getPaymentPolicy(queryParam) {
    const policy = await this.findOne(queryParam);
    return policy;
  }
}

PaymentRulesSchema.index({ location: 1 }, { background: true });
PaymentRulesSchema.index({ originZone: 1, destinationZone: 1 }, { background: true });

PaymentRulesSchema.loadClass(PaymentRule);

export default mongodb.model('PaymentRule', PaymentRulesSchema);
