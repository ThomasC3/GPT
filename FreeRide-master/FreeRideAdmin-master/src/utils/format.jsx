import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from './constants';

export const formatPromocodeValue = (type, value) => {
  let amountFormat = '';
  switch (type) {
    case 'percentage':
      amountFormat = `${value}%`;
      break;
    case 'full':
      amountFormat = 'Full';
      break;
    case 'value':
      amountFormat = new Intl.NumberFormat(
        'en-US', { style: 'currency', currency: 'usd' }
      ).format((value || 0.0) / 100.0);
      break;
    default:
      amountFormat = '';
  }
  return amountFormat;
};

export const formatEventData = (event) => {
  let eventData = '';
  if (event.eventData) {
    switch (event.eventType) {
      case 'UNAVAILABLE':
      case 'AVAILABLE':
        if (event.eventData.reason) {
          eventData = `reason: ${event.eventData.reason}`;
        }
        break;
      case 'ADMIN CHECK-IN':
        eventData = <Link to={`/drivers/${event.eventData.driverId}`}>Driver</Link>;
        break;
      case 'ADMIN INSPECTION':
      case 'CHECK-IN':
      case 'CHECK-OUT':
        if (event.eventData.responses) {
          eventData = Object.entries(event.eventData.responses).map(item => `${item[0]}: ${item[1]}`).join(', ');
        }
        break;
      case 'JOB_LOCATION_CHANGE':
      case 'UPDATE':
        eventData = (
          <div>
            { Object.entries(event.eventData.changes).map(([key, val]) => (
              <div>
                {`${key}: `}
                { val.previous && val.previous.id ? (
                  <Link to={`/${key === 'location' ? key : `${key}s`}/${val.previous.id}`}>
                    { val.previous.value }
                  </Link>) : `${val.previous}`
                }
                {' → '}
                { val.current && val.current.id ? (
                  <Link to={`/${key === 'location' ? key : `${key}s`}/${val.current.id}`}>
                    { val.current.value }
                  </Link>) : `${val.current}`
                }
              </div>
            ))}
          </div>
        );
        break;
      default:
        eventData = '';
    }
    if (event.eventData.location) {
      eventData = (
        <div>
          {eventData}
          {event.eventData.service && (
            <div>
              {`service: ${event.eventData.service}`}
            </div>
          )}
          <div>
            <Link to={`/location/${event.eventData.location}`}>Location</Link>
          </div>
        </div>
      );
    }
  }
  return eventData;
};

export const formatCampaignList = campaigns => campaigns.map((campaign, i) => (
  <Link key={campaign.id} to={`${ROUTES.CAMPAIGNS}/${campaign.id}`}>
    {campaign.name}
    {i < campaigns.length - 1 ? ', ' : ''}
  </Link>
));

export const formatLocationList = (
  locations, fetchedLocations
) => locations && locations.map((location, i) => (
  <Link key={location} to={`/location/${location}`}>
    {fetchedLocations.find(el => el.id === location).name}
    {i < locations.length - 1 ? ', ' : ''}
  </Link>
));

export const applyLocationCode = (jobCode, newLocationCode) => {
  const [, clientCodeType] = jobCode.split('-');
  return `${newLocationCode}-${clientCodeType}`;
};

export const applyClientCode = (jobCode, newClientCode) => {
  const [locationCode, clientCodeType] = jobCode.split('-');
  const type = clientCodeType.substring(clientCodeType.length - 1);
  return `${locationCode}-${newClientCode}${type}`;
};

export const applyTypeCode = (jobCode, newType) => {
  const [locationCode, clientCodeType] = jobCode.split('-');
  const clientCode = clientCodeType.substring(0, clientCodeType.length - 1);
  return `${locationCode}-${clientCode}${newType}`;
};

export const decodeJobCode = (jobCode) => {
  const [locationCode, clientCodeType] = jobCode.split('-');
  const clientCode = clientCodeType.substring(0, clientCodeType.length - 1);
  const typeCode = clientCodeType.substring(clientCodeType.length - 1);

  return {
    code: jobCode,
    locationCode,
    clientCode,
    typeCode
  };
};

export default {
  formatPromocodeValue,
  decodeJobCode,
  applyLocationCode,
  applyClientCode,
  applyTypeCode,
  formatCampaignList,
  formatLocationList
};
