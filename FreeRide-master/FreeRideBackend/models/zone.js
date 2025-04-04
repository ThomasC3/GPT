import * as turf from '@turf/turf';
import {
  Locations, PaymentPolicies, FixedStops, FixedStopStatus
} from '.';
import { ApplicationError, FixedStopNotFoundError } from '../errors';
import { mongodb } from '../services';
import { isPaymentInformationValid, isPwywInformationValid } from '../utils/location';

const { Schema } = mongodb;

const polygonSchema = Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]],
    required: true
  }
}, {
  versionKey: false
});

const paymentInformationSchema = Schema({
  ridePrice: {
    type: Number,
    default: null
  },
  capEnabled: {
    type: Boolean,
    default: false
  },
  priceCap: {
    type: Number,
    default: null
  },
  pricePerHead: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'usd'
  }
}, {
  _id: false,
  versionKey: false
});

const pwywInformationSchema = Schema({
  pwywOptions: {
    type: [Number],
    default: []
  },
  maxCustomValue: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'usd'
  }
}, {
  _id: false,
  versionKey: false
});

const ZoneSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  polygonFeatureId: {
    type: String
  },
  code: {
    type: String
  },
  serviceArea: {
    type: polygonSchema,
    required: true,
    set: value => ({
      type: 'Polygon',
      coordinates: value
    }),
    get: value => value
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  paymentEnabled: {
    type: Boolean,
    default: false
  },
  paymentInformation: {
    type: paymentInformationSchema,
    default: null,
    required: false
  },
  pwywEnabled: {
    type: Boolean,
    default: false
  },
  pwywInformation: {
    type: pwywInformationSchema,
    default: null,
    required: false
  },
  poweredBy: {
    type: String,
    default: ''
  },
  fixedStopEnabled: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'Zones',
  versionKey: false
});

ZoneSchema
  .virtual('pwywBasePrice')
  .get(function getPwywBasePrice() {
    return this.pwywInformation?.pwywOptions[0];
  });

class Zone {
  static async createZone(body, location) {
    const zoneExists = await this.getZone({
      code: body.code,
      location
    });
    if (zoneExists) {
      throw new ApplicationError(
        `Zone with internal zone code ${body.code} already exists`,
        409
      );
    }
    isPaymentInformationValid(body);
    isPwywInformationValid(body);

    const zone = await this.create({ ...body, location });
    await Locations.updateOne(
      { _id: location },
      { $push: { zones: zone._id } }
    );
    return zone;
  }

  static async updateZone(queryParam, bodyParam) {
    const body = bodyParam;
    if (body.serviceArea) {
      body.serviceArea = {
        type: 'Polygon',
        coordinates: body.serviceArea
      };
    }

    if (body.code) {
      if (!queryParam._id || !queryParam.location) {
        throw new ApplicationError(
          'Zone _id and location are required to update zone code',
          400
        );
      }

      const zoneExists = await this.getZone({
        _id: { $ne: queryParam._id },
        code: body.code,
        location: queryParam.location
      });
      if (zoneExists) {
        throw new ApplicationError(
          `Zone with internal zone code ${body.code} already exists`,
          409
        );
      }
    }
    isPaymentInformationValid(body);
    isPwywInformationValid(body);

    return this.findOneAndUpdate(
      { ...queryParam, isDeleted: false },
      { $set: body },
      { new: true }
    );
  }

  static async deleteZone(id, locationId) {
    const zone = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    await Locations.updateOne({ _id: locationId }, { $pull: { zones: id } });
    await PaymentPolicies.deleteMany({
      $or: [{ originZone: id }, { destinationZone: id }]
    });
    return zone;
  }

  static async getZoneById(id) {
    return this.findOne({ _id: id, isDeleted: false });
  }

  static async getZones(filter) {
    return this.find({ ...filter, isDeleted: false });
  }

  static getZone(filter) {
    return this.findOne({ ...filter, isDeleted: false });
  }

  static async detectZone(location, coordinates) {
    let zones = await this.find({
      location,
      isDeleted: false,
      serviceArea: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] }
        }
      }
    });

    if (zones.length < 2) { return zones[0]; }

    zones = zones.filter(zone => !zone.isDefault);
    const zoneIds = zones.map(zone => zone._id);
    const zoneWithinCount = (await Promise.all(
      zones.map(zone => this.find({
        _id: { $in: zoneIds },
        serviceArea: {
          $geoWithin: {
            $geometry: zone.serviceArea
          }
        }
      }))
    )).map(zoneList => (zoneList ? zoneList.length : 0));

    const smallestZoneIndex = zoneWithinCount.indexOf(Math.min(...zoneWithinCount));

    return zones[smallestZoneIndex];
  }

  static async getClosestFixedStop(zoneId, coordinates, selectedStopId = null) {
    const zone = await this.getZoneById(zoneId);

    // Fetch non-default zones within zone
    const zoneFilterParams = {
      _id: { $ne: zone._id },
      isDefault: false,
      isDeleted: false,
      location: zone.location
    };
    if (!zone.isDefault) {
      zoneFilterParams.serviceArea = {
        $geoWithin: {
          $geometry: zone.serviceArea
        }
      };
    }
    const zonesWithin = await this.find(zoneFilterParams);
    const containsOtherZones = !!zonesWithin.length;

    // Fetch fixed-stops within zone's service area
    let fixedStops = await FixedStops.find({
      _id: { $ne: selectedStopId },
      location: zone.location,
      status: FixedStopStatus.enabled,
      isDeleted: false,
      mapLocation: {
        $geoWithin: {
          $geometry: zone.serviceArea
        }
      }
    });

    let zoneAsPolygon = turf.helpers.polygon(zone.serviceArea.coordinates);

    const hasFixedStops = !!fixedStops.length;
    if (containsOtherZones && hasFixedStops) {
      // Build service area excluding the area of the zones within
      zoneAsPolygon = zonesWithin.reduce(
        (zoneArea, zoneWithin) => turf.difference(
          zoneArea,
          turf.helpers.polygon(zoneWithin.serviceArea.coordinates)
        ),
        zoneAsPolygon
      );
      // Filter fixed-stops that are contained in the previously built area
      fixedStops = fixedStops.filter(
        fs => turf.booleanPointInPolygon(
          turf.helpers.point(fs.mapLocation.coordinates), zoneAsPolygon
        )
      );
    }

    const noFixedStops = !fixedStops.length;
    if (noFixedStops) {
      throw new FixedStopNotFoundError();
    }

    const fsAsPoints = turf.helpers.featureCollection(fixedStops.map(fs => (
      turf.helpers.point([fs.longitude, fs.latitude], { fs: fs.toJSON() })
    )));

    // Determine which fixed-stop from the set is closest to the given coordinates
    const stopPoint = turf.helpers.point([coordinates.longitude, coordinates.latitude]);
    const { properties: { fs: nearestFixedStop } } = turf.nearestPoint(stopPoint, fsAsPoints);

    return nearestFixedStop;
  }
}

ZoneSchema.loadClass(Zone);

ZoneSchema.index({ location: 1, isDeleted: 1 }, { background: true });
ZoneSchema.index({ serviceArea: '2dsphere' });

ZoneSchema.set('toJSON', {
  getters: true,
  transform: (doc, _ret) => {
    const ret = _ret;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

export default mongodb.model('Zone', ZoneSchema);
