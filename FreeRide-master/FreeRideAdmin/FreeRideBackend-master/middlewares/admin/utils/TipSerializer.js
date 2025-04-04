import moment from 'moment-timezone';

export class TipSerializer {
  constructor(timezone) {
    this.timezone = timezone;
  }

  adminTipToCsv(ride) {
    const mappedTip = ride.toJSON();

    mappedTip.index = true;

    const timezone = mappedTip.timezone || this.timezone || 'America/New_York';

    const dateFormat = 'MM/DD/YYYY HH:mm';

    // timestamps
    mappedTip.createdTimestamp = moment(mappedTip.createdTimestamp).tz(timezone).format(dateFormat);

    // driver
    mappedTip.driverFirstName = mappedTip.driverFirstName;
    mappedTip.driverLastName = mappedTip.driverLastName;
    mappedTip.driverId = `${mappedTip.driverId}`;

    // rider
    mappedTip.riderFirstName = mappedTip.riderFirstName;
    mappedTip.riderLastName = mappedTip.riderLastName;
    mappedTip.riderId = `${mappedTip.riderId}`;

    // ride
    mappedTip.rideId = `${mappedTip.rideId}`;

    const {
      locationId, _id, id, __v,
      ...selectedTipAttrs
    } = mappedTip;

    return selectedTipAttrs;
  }
}

export default new TipSerializer();
