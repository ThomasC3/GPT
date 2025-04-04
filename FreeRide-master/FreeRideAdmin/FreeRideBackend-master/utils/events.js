import moment from 'moment-timezone';
import _ from 'lodash';
import { dateDifference } from './time';
import { Events, Locations } from '../models';
import { addToObject } from './math';

const fetchEventsByLocation = (
  filterParams, locations, eventTypes
) => {
  const promises = [];
  let location;
  for (let l = 0; l < locations.length; l += 1) {
    location = locations[l];
    promises.push(
      Events.getEvents({
        ...filterParams,
        location,
        'eventData.location': location,
        eventType: { $in: eventTypes },
        limit: 0,
        sort: 'createdTimestamp',
        order: 1
      })
    );
  }
  return promises;
};

const getEventsLocationData = (events, startDate, endDate) => {
  const {
    locationTimezone,
    items: locationEventList,
    targets,
    targetData
  } = events;
  const localStartDate = moment.tz(startDate, locationTimezone);
  const localEndDate = moment.tz(endDate, locationTimezone);

  return {
    locationEventList,
    localStartDate,
    localEndDate,
    targets,
    targetData
  };
};

const isType = (event, eventTypes) => eventTypes.includes(event.eventType);

const isAlternateType = (event1, event2, eventTypes) => (
  isType(event1, eventTypes) !== isType(event2, eventTypes)
);

const mergeAdminCheckInInspection = (eventList) => {
  // If there are ADMIN INSPECTION within 1 hour of an ADMIN CHECK-IN
  //   the latest value for each attribute is saved as response in the ADMIN CHECK-IN event
  //   and the ADMIN INSPECTION events are filtered out

  const events = [eventList[0]];
  let prevEvent = eventList[0];
  let currEvent;
  for (let i = 1; i < eventList.length; i += 1) {
    currEvent = eventList[i];
    if (
      prevEvent.eventType === 'ADMIN CHECK-IN' && currEvent.eventType === 'ADMIN INSPECTION'
      && dateDifference(prevEvent.createdTimestamp, currEvent.createdTimestamp, 'minutes') < 60
    ) {
      // If multiple ADMIN INSPECTION responses to merge use last values of each attribute
      events[events.length - 1].eventData.responses = {
        ...prevEvent.eventData.responses,
        ...currEvent.eventData.responses
      };
    } else if (currEvent.eventType !== 'ADMIN INSPECTION') { // Filter out any remaining ADMIN INSPECTION
      events.push(eventList[i]);
    }
    prevEvent = events[events.length - 1];
  }
  return events;
};

const isAttributeComplete = (startEvent, endEvent, attributes) => {
  const startResponses = startEvent.eventData?.responses || {};
  const endResponses = endEvent.eventData?.responses || {};
  return attributes.every(r => Object.keys(startResponses).includes(r))
    && attributes.every(r => Object.keys(endResponses).includes(r));
};

const calculateAttributeDiffs = (startEvent, endEvent, attributes) => {
  const attributeDiffs = {};
  let attribute;
  for (let i = 0; i < attributes.length; i += 1) {
    attribute = attributes[i];
    const startValue = startEvent.eventData.responses[attribute];
    const endValue = endEvent.eventData.responses[attribute];
    if (Number.isNaN(startValue) || Number.isNaN(endValue)) { return null; }

    switch (attribute) {
    case 'battery':
      if (startValue < endValue) { return null; }
      attributeDiffs[attribute] = startValue - endValue;
      break;
    case 'mileage':
      if (startValue > endValue) { return null; }
      attributeDiffs[attribute] = endValue - startValue;
      break;
    default:
      return null;
    }
  }
  return attributeDiffs;
};

const matchEventGroup = (
  eventList_, eventTypeStart, eventTypeEnd, startDate, endDate, attributes = null
) => {
  const [defaultEventTypeStart] = eventTypeStart;
  const [defaultEventTypeEnd] = eventTypeEnd;
  let totalHours = 0;
  const eventList = [...eventList_];
  if (eventList.length === 0) {
    return { matchedGroup: [], totalHours };
  }

  // Close groups
  if (isType(eventList[0], eventTypeEnd)) {
    eventList.unshift({
      ...eventList[0],
      eventType: defaultEventTypeStart,
      createdTimestamp: startDate.toDate()
    });
  }
  if (isType(eventList[eventList.length - 1], eventTypeStart)) {
    eventList.push({
      ...eventList[eventList.length - 1],
      eventType: defaultEventTypeEnd,
      createdTimestamp: endDate.toDate()
    });
  }

  let totalAttributes = {};
  if (attributes?.length === 1 && attributes.includes('mileage')) {
    const mileageArray = eventList.filter(
      ev => ev.eventData?.responses?.mileage
    ).map(
      ev => ev.eventData?.responses?.mileage
    );
    totalAttributes = { minMaxMileage: Math.max(...mileageArray) - Math.min(...mileageArray) };
  }

  let attributeDiffs;
  let partialHours;
  const matchedGroup = [eventList[0]];
  let prevEvent = eventList[0];
  let currEvent;
  for (let i = 1; i < eventList.length; i += 1) {
    currEvent = eventList[i];
    // If alternate event type
    // add current event to list
    if (isAlternateType(currEvent, prevEvent, eventTypeStart)) {
      matchedGroup.push(eventList[i]);
      if (isType(currEvent, eventTypeEnd)) {
        partialHours = dateDifference(prevEvent.createdTimestamp, currEvent.createdTimestamp, 'hours');
        if (attributes && isAttributeComplete(prevEvent, currEvent, attributes)) {
          attributeDiffs = calculateAttributeDiffs(prevEvent, currEvent, attributes);
          // Check if attribute values make sense
          if (attributeDiffs) {
            // and add to totalAttributes in corresponding key
            totalAttributes = addToObject(totalAttributes, attributeDiffs);
          } else {
            partialHours = 0;
          }
        } else if (attributes) {
          partialHours = 0;
        }
        totalHours += partialHours;
      }
    }
    // If duplicate event,
    // don't add current event

    prevEvent = matchedGroup[matchedGroup.length - 1];
  }
  return { matchedGroup, totalHours, totalAttributes };
};

export const eventHour = async (
  filterParams, eventTypeStart, eventTypeEnd, attributes = null, locationEvents_ = null
) => {
  const {
    locations,
    createdTimestamp: {
      start: windowStart,
      end: windowEnd
    }
  } = filterParams;

  const locationEvents = locationEvents_ || await Promise.all(
    fetchEventsByLocation(filterParams, locations, [...eventTypeStart, ...eventTypeEnd])
  );

  const locationHours = [];
  let location;

  let locationEventList;
  let localStartDate;
  let localEndDate;

  let totalHours = 0;
  let totalAttributes = {};
  let individualHours = [];

  let individualEvents;
  let partialHours;
  let partialAttributes;
  let matchedGroup;

  let targets;
  let target;
  let targetData;
  let tg;

  for (let l = 0; l < locations.length; l += 1) {
    location = locations[l];
    ({
      locationEventList,
      localStartDate,
      localEndDate,
      targets,
      targetData
    } = getEventsLocationData(locationEvents[l], windowStart, windowEnd));

    totalHours = 0;
    totalAttributes = {};
    individualHours = [];

    for (let i = 0; i < targets?.length; i += 1) {
      target = targets[i];
      // eslint-disable-next-line no-loop-func
      individualEvents = locationEventList.filter(it => `${it.targetId}` === `${target}`);

      if (attributes) {
        individualEvents = mergeAdminCheckInInspection(individualEvents);
      }

      ({
        totalHours: partialHours,
        matchedGroup,
        totalAttributes: partialAttributes
      } = matchEventGroup(
        individualEvents, eventTypeStart, eventTypeEnd, localStartDate, localEndDate, attributes
      ));

      totalHours += partialHours || 0;
      totalAttributes = addToObject(totalAttributes, partialAttributes);
      // eslint-disable-next-line no-loop-func
      tg = targetData.find(it => `${it.id}` === `${target}`);

      individualHours.push({
        id: target,
        name: tg ? tg.name || `${tg.firstName} ${tg.lastName}` : null,
        totalHours: partialHours,
        totalAttributes: partialAttributes,
        matchedGroup,
        originalEvents: individualEvents
      });
    }

    locationHours.push({
      location,
      totalHours,
      totalAttributes,
      individualHours
    });
  }
  return { locationHours };
};

export const mergeDriverHourData = (locations, loginHours, availableHours) => {
  const driverHours = [];
  let loc;
  let locLoginHours;
  let locAvailableHours;
  let locTargets;
  for (let i = 0; i < locations.length; i += 1) {
    loc = locations[i];
    // eslint-disable-next-line no-loop-func
    locLoginHours = loginHours.find(it => `${it.location._id}` === `${loc._id}`);
    // eslint-disable-next-line no-loop-func
    locAvailableHours = availableHours.find(it => `${it.location._id}` === `${loc._id}`);
    locTargets = [...new Set([
      ...(locLoginHours?.individualHours.map(it => `${it.id}`) || []),
      ...(locAvailableHours?.individualHours.map(it => `${it.id}`) || [])
    ])];
    driverHours.push({
      city: loc.name,
      cityId: loc._id,
      loginHours: {
        totalHours: locLoginHours?.totalHours || 0,
        individualCount: locLoginHours?.individualHours.length || 0
      },
      availableHours: {
        totalHours: locAvailableHours?.totalHours || 0,
        individualCount: locAvailableHours?.individualHours.length || 0
      },
      // eslint-disable-next-line no-loop-func
      individualHours: _.sortBy(locTargets.map(tg => ({
        name: (
          locLoginHours.individualHours.find(it => `${it.id}` === `${tg}`)?.name
          || locAvailableHours.individualHours.find(it => `${it.id}` === `${tg}`)?.name
          || ''
        ),
        id: tg,
        loginHours: locLoginHours.individualHours.find(it => `${it.id}` === `${tg}`)?.totalHours || 0,
        availableHours: locAvailableHours.individualHours.find(it => `${it.id}` === `${tg}`)?.totalHours || 0
      })), 'name')
    });
  }
  return _.sortBy(driverHours, 'city');
};

const mapTotalAttributeData = (data, attribute) => {
  const processedData = {
    totalHours: data?.totalHours || 0,
    individualCount: data ? data.individualHours.length : 0,
    [`total${attribute[0].toUpperCase()}${attribute.slice(1)}`]: data.totalAttributes[attribute] || 0
  };

  switch (attribute) {
  case 'mileage':
    processedData.totalMinMaxMileage = data?.totalAttributes?.minMaxMileage || 0;
    break;
  case 'batteryMileage':
    processedData.totalBattery = data?.totalAttributes?.battery || 0;
    processedData.totalMileage = data?.totalAttributes?.mileage || 0;
    delete processedData.totalBatteryMileage;
    break;
  default:
  }

  return processedData;
};

const mapIndividualAttributeData = (individualData, attributes) => {
  const indivData = {
    totalHours: individualData?.totalHours || 0
  };
  attributes.map(k => Object.assign(
    indivData,
    { [`total${k[0].toUpperCase()}${k.slice(1)}`]: individualData?.totalAttributes[k] || 0 }
  ));
  return indivData;
};

export const mergeVehicleStatsData = (
  locations, checkOutHours, mileageHours, batteryHours, batteryMileageHours
) => {
  const vehicleStats = [];
  let loc;
  let locCheckOutHours;
  let locBatteryHours;
  let locBatteryMileageHours;
  let locMileage;
  let locTargets;
  for (let i = 0; i < locations.length; i += 1) {
    loc = locations[i];
    // eslint-disable-next-line no-loop-func
    locCheckOutHours = checkOutHours.find(it => `${it.location._id}` === `${loc._id}`);
    // eslint-disable-next-line no-loop-func
    locBatteryHours = batteryHours.find(it => `${it.location._id}` === `${loc._id}`);
    // eslint-disable-next-line no-loop-func
    locBatteryMileageHours = batteryMileageHours.find(it => `${it.location._id}` === `${loc._id}`);
    // eslint-disable-next-line no-loop-func
    locMileage = mileageHours.find(it => `${it.location._id}` === `${loc._id}`);

    locTargets = [...new Set((locCheckOutHours?.individualHours.map(it => `${it.id}`) || []))];
    vehicleStats.push({
      city: loc.name,
      cityId: loc._id,
      checkOutHours: {
        individualCount: locCheckOutHours?.individualHours?.length || 0,
        totalHours: locCheckOutHours?.totalHours || 0
      },
      mileage: mapTotalAttributeData(locMileage, 'mileage'),
      battery: mapTotalAttributeData(locBatteryHours, 'battery'),
      batteryMileage: mapTotalAttributeData(locBatteryMileageHours, 'batteryMileage'),
      // eslint-disable-next-line no-loop-func
      individual: _.sortBy(locTargets.map(tg => ({
        name: locCheckOutHours.individualHours.find(it => `${it.id}` === `${tg}`)?.name || '',
        id: tg,
        checkOutHours: locCheckOutHours.individualHours.find(it => `${it.id}` === `${tg}`)?.totalHours || 0,
        mileage: mapIndividualAttributeData(
          locMileage.individualHours.find(it => `${it.id}` === `${tg}`),
          ['mileage']
        ),
        minMaxMileage: mapIndividualAttributeData(
          locMileage.individualHours.find(it => `${it.id}` === `${tg}`),
          ['minMaxMileage']
        ),
        battery: mapIndividualAttributeData(
          locBatteryHours.individualHours.find(it => `${it.id}` === `${tg}`),
          ['battery']
        ),
        batteryMileage: mapIndividualAttributeData(
          locBatteryMileageHours.individualHours.find(it => `${it.id}` === `${tg}`),
          ['battery', 'mileage']
        )
      })), 'name')
    });
  }
  return _.sortBy(vehicleStats, 'city');
};

export const vehicleAttributeStats = async (filterParams) => {
  const { locationHours: checkOutHours } = await eventHour(
    filterParams, ['CHECK-OUT'], ['CHECK-IN', 'ADMIN CHECK-IN']
  );

  const locationEvents = await Promise.all(
    fetchEventsByLocation(
      filterParams, filterParams.locations, ['CHECK-OUT', 'CHECK-IN', 'ADMIN CHECK-IN', 'ADMIN INSPECTION']
    )
  );

  const {
    locationHours: mileageHours
  } = await eventHour(
    filterParams, ['CHECK-OUT'], ['CHECK-IN', 'ADMIN CHECK-IN'], ['mileage'], locationEvents
  );

  const {
    locationHours: batteryHours
  } = await eventHour(
    filterParams, ['CHECK-OUT'], ['CHECK-IN', 'ADMIN CHECK-IN'], ['battery'], locationEvents
  );

  const {
    locationHours: batteryMileageHours
  } = await eventHour(
    filterParams, ['CHECK-OUT'], ['CHECK-IN', 'ADMIN CHECK-IN'], ['battery', 'mileage'], locationEvents
  );

  // Process so that all values and metrics are in one object
  const locations = await Locations.find({ _id: { $in: filterParams.locations } }).select('id name');
  const vehicleStats = mergeVehicleStatsData(
    locations.map(l => ({ _id: `${l.id}`, name: l.name })), checkOutHours, mileageHours, batteryHours, batteryMileageHours
  );

  return vehicleStats;
};

export default {
  matchEventGroup,
  eventHour,
  mergeDriverHourData,
  vehicleAttributeStats
};
