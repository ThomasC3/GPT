import mongoose, { model }  from 'mongoose';
import locationSchema from './models/location.js';
import zoneSchema from './models/zone.js';
import * as Sentry from "@sentry/aws-serverless";
import { url, config, sentry_dsn } from './config.js';

// Define the Location and Zone models
const Location = mongoose.model('Location', locationSchema);
const Zone = mongoose.model('Zone', zoneSchema);

Sentry.init({
  dsn: sentry_dsn,
});

// Lambda function handler
export const handler = Sentry.wrapHandler(async (event, context) => {
  try {
    // Connect to MongoDB
    mongoose.connect(url, config);

    // Find all locations
    const locations = await Location.find().populate({path: 'zones', select: 'paymentEnabled', model: 'Zone'});

    // Extract Name and StateCode fields
    const result = locations.map(location => {
      const faresEnabled = location.paymentEnabled === true || location.zones.some(zone => zone.paymentEnabled === true);

      return {
        locationCode: location.locationCode,
        name: location.name,
        stateCode: location.stateCode,
        serviceHours: location.serviceHours,
        faresEnabled: faresEnabled,
        ridesFareCopy: faresEnabled === true ? location.ridesFareCopy : null,
        isActive: location.isActive,
        hasAppService: location.hasAppService,
        isSuspended: location.isSuspended,
        suspendedTitle: location.suspendedTitle,
        suspendedCopy: location.suspendedCopy,
        poolingEnabled: location.poolingEnabled,
        fixedStopEnabled: location.fixedStopEnabled,
        passengerLimit: location.passengerLimit,
        riderAgeRequirement: location.riderAgeRequirement,
        freeRideAgeRestrictionEnabled: location.freeRideAgeRestrictionEnabled,
        freeRideAgeRestrictionInterval: location.freeRideAgeRestrictionInterval,
        serviceArea: location.serviceArea?.coordinates[0],
        zones: location.zones
      };
    });

    // Return the result as JSON
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // Return error if any
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
});
