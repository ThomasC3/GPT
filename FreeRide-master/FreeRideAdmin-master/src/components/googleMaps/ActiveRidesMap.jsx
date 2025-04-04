import React, { Component } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Marker, Polyline, InfoWindow } from 'react-google-maps';
import { message, Tag } from 'antd';
import { ConditionalWrapper } from '../../elements';
import { allowView } from '../../utils/auth';
import withProfileContext from '../hocs/withProfileContext';
import { AUTH0_RESOURCE_TYPES } from '../../utils/constants';

class ActiveRidesMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rides: [],
      fetching: false
    };

    this.timer = null;
  }

  componentDidMount() {
    this.autoFetch();
  }

  componentDidUpdate(prevProps) {
    const { location: propsLocation } = this.props;
    if (propsLocation !== prevProps.location) {
      this.autoFetch();
    }
  }

  componentWillUnmount() {
    this.stopAutoFetch();
  }

  autoFetch = () => {
    this.stopAutoFetch();
    this.timer = setInterval(this.fetch, 10 * 1000);
    this.fetch();
  }

  stopAutoFetch = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  fetch = async () => {
    const { fetching, rides: stateRides } = this.state;
    const { location } = this.props;
    if (fetching) {
      return;
    }

    this.setState({ fetching: true });
    try {
      const { data } = await axios.get('/v1/dashboard/rides', {
        params: {
          status: [
            200, // RideInQueue
            201, // NextInQueue
            202, // DriverEnRoute
            203, // DriverArrived
            300 // RideInProgress
          ],
          location
        }
      });

      const ridesAsObject = stateRides.reduce((accu, i, index) => ({ ...accu, [i.id]: index }), {});

      this.setState({
        rides: data.map((i) => {
          let existing = {};
          if (ridesAsObject[i.id] !== undefined) {
            existing = stateRides[ridesAsObject[i.id]];
          }
          return {
            ...i,
            ...existing,
            dropOff: new window.google.maps.LatLng({
              lat: i.dropoffLatitude,
              lng: i.dropoffLongitude
            }),
            pickup: new window.google.maps.LatLng({
              lat: i.pickupLatitude,
              lng: i.pickupLongitude
            }),
            id: i.id
          };
        })
      });
    } catch (error) {
      message.error('An error occured while getting routes information');
      this.stopAutoFetch();
    } finally {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { rides } = this.state;
    const { profileContext: { permissions } } = this.props;
    return rides.map((i, index) => <Ride key={i.id} label={index + 1} {...i} permissions={permissions} />);
  }
}

const Ride = React.memo((props) => {
  const [showInfo, setShowInfo] = React.useState(false);

  const [nameInfo, setNamesInfo] = React.useState(() => ({
    rider: { id: null, firstName: null, lastName: null },
    driver: { id: null, firstName: null, lastName: null },
    vehicle: { id: null, name: null, publicId: null }
  }));

  const [polylines, setPolylines] = React.useState(() => ({
    driverEnRoute: null,
    destinationRoute: null
  }));

  const labelStyle = {
    fontWeight: 'bold'
  };

  const fetch = async () => {
    try {
      const { data } = await axios.get(`/v1/dashboard/rides/${props.id}`);
      setShowInfo(true);
      setPolylines({
        // eslint-disable-next-line max-len, new-cap
        driverEnRoute: data.polylines.driverEnRoute ? new window.google.maps.geometry.encoding.decodePath(data.polylines.driverEnRoute) : null,
        // eslint-disable-next-line max-len, new-cap
        destinationRoute: data.polylines.destinationRoute ? new window.google.maps.geometry.encoding.decodePath(data.polylines.destinationRoute) : null
      });
      setNamesInfo({
        rider: {
          id: data.rider.id, firstName: data.rider.firstName, lastName: data.rider.lastName
        },
        driver: {
          id: data.driver.id, firstName: data.driver.firstName, lastName: data.driver.lastName
        },
        vehicle: {
          id: data.vehicle.vehicleId,
          vehicleName: data.vehicle.vehicleName,
          publicId: data.vehicle.publicId
        }
      });
    } catch (error) {
      message.error('An error occured while getting route information');
    }
  };

  const {
    pickup, dropOff, label, permissions
  } = props;

  return (
    <>
      <Marker position={pickup} onClick={fetch} label={{ text: `${label}:A`, ...labelStyle }}>
        {showInfo && (
          <InfoWindow onCloseClick={() => setShowInfo(false)}>
            <>
              {
                allowView(AUTH0_RESOURCE_TYPES.RIDES, permissions) && (
                  <Link to={`/rides/${props.id}`}>Ride Info</Link>
                )
              }
              <h4>
                Rider:
                &nbsp;
                <ConditionalWrapper
                  condition={allowView(AUTH0_RESOURCE_TYPES.RIDERS, permissions)}
                  wrapper={children => <Link to={`/riders/${nameInfo.rider.id}`}>{children}</Link>}
                >
                  {nameInfo.rider.firstName}
                  {' '}
                  {nameInfo.rider.lastName}
                </ConditionalWrapper>
              </h4>
              <h4>
                Driver:
                &nbsp;
                <ConditionalWrapper
                  condition={allowView(AUTH0_RESOURCE_TYPES.DRIVERS, permissions)}
                  wrapper={children => <Link to={`/drivers/${nameInfo.driver.id}`}>{children}</Link>}
                >
                  {nameInfo.driver.firstName}
                  {' '}
                  {nameInfo.driver.lastName}
                </ConditionalWrapper>
              </h4>
              <h4>
                Vehicle:
                &nbsp;
                <ConditionalWrapper
                  condition={allowView(AUTH0_RESOURCE_TYPES.FLEET, permissions)}
                  wrapper={children => <Link to={`/vehicles/${nameInfo.vehicle.id}`}>{children}</Link>}
                >
                  {`${nameInfo.vehicle.vehicleName} (${nameInfo.vehicle.publicId})`}
                </ConditionalWrapper>
              </h4>
              <div>
                <Tag color={props.isPickupFixedStop ? 'green' : 'blue'}>{props.isPickupFixedStop ? 'FS' : 'D2D'}</Tag>
                {'Pick up: '}
                {`${props.pickupAddress} (${props.pickupZone.name})`}
              </div>
              <div>
                <Tag color={props.isDropoffFixedStop ? 'green' : 'blue'}>{props.isDropoffFixedStop ? 'FS' : 'D2D'}</Tag>
                {'Drop Off: '}
                {`${props.dropoffAddress} (${props.dropoffZone.name})`}
              </div>
            </>
          </InfoWindow>
        )}
      </Marker>
      <Marker position={dropOff} onClick={fetch} label={{ text: `${label}:B`, ...labelStyle }} />

      {polylines.driverEnRoute && <Polyline path={polylines.driverEnRoute} options={{ strokeColor: 'blue' }} /> }
      {polylines.destinationRoute && <Polyline path={polylines.destinationRoute} options={{ strokeColor: 'red' }} /> }
    </>
  );
});


export default withProfileContext(ActiveRidesMap);
