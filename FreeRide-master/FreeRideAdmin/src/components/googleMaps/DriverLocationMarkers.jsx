import React, { PureComponent } from 'react';
import { message, Row } from 'antd';
import axios from 'axios';
import { Marker, InfoWindow } from 'react-google-maps';
import { Link } from 'react-router-dom';
import CarIcon from '../../assets/images/car.svg';
import CarIconUnavailable from '../../assets/images/car_unavailable.svg';
import { ConditionalWrapper } from '../../elements';
import withProfileContext from '../hocs/withProfileContext';
import { allowView } from '../../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../../utils/constants';

class DriverLocationMarkers extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      drivers: [],
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
    const { fetching } = this.state;
    if (fetching) {
      return;
    }

    this.setState({ fetching: true });
    const { isAvailable, location } = this.props;
    try {
      const { data } = await axios.get('/v1/dashboard/drivers', {
        params: {
          isOnline: true,
          isAvailable,
          activeLocation: location
        }
      });
      const drivers = data.filter(
        i => i.currentLocation && i.currentLocation.coordinates.length === 2
      );
      this.setState({
        drivers: drivers.map(i => ({
          ...i,
          geo: new window.google.maps.LatLng({
            lat: i.currentLocation.coordinates[1],
            lng: i.currentLocation.coordinates[0]
          }),
          icon: i.isAvailable ? CarIcon : CarIconUnavailable,
          id: i.id
        }))
      });
    } catch (error) {
      message.error('An error occured while getting drivers information');
      this.stopAutoFetch();
    } finally {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { drivers } = this.state;
    const { profileContext: { permissions } } = this.props;
    return drivers.map(i => <DriverMarker permissions={permissions} key={i.id} {...i} />);
  }
}

const DriverMarker = (props) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const {
    firstName, lastName, status, id,
    rideCount = 0, actionCount, vehicle,
    geo, icon, permissions
  } = props;

  return (
    <Marker
      key={id}
      position={geo}
      icon={{ url: icon, scaledSize: new window.google.maps.Size(31, 43) }}
      onClick={() => {
        setShowInfo(!showInfo);
      }}
    >
      { showInfo && (
        <InfoWindow onCloseClick={() => setShowInfo(false)}>
          <>
            <h3>Driver</h3>
            <ConditionalWrapper
              condition={allowView(AUTH0_RESOURCE_TYPES.DRIVERS, permissions)}
              wrapper={children => <Link to={`/drivers/${id}`}>{children}</Link>}
            >
              {firstName}
              {' '}
              {lastName}
              {' '}
            </ConditionalWrapper>
            <br />
            <b>Status: </b>{status}
            <br />
            {
              vehicle && (
                <>
                  <b>Vehicle: </b>
                  <ConditionalWrapper
                    condition={allowView(AUTH0_RESOURCE_TYPES.FLEET, permissions)}
                    wrapper={children => <Link to={`/vehicles/${vehicle.id}`}>{children}</Link>}
                  >
                    {`${vehicle.name} (${vehicle.publicId})`}
                  </ConditionalWrapper>
                  <Row>
                    <b>Matching Policy: </b>
                    {vehicle.matchingRule && vehicle.matchingRule.title}
                  </Row>
                  <Row>
                    <b>Zones: </b>
                    {vehicle.zones && vehicle.zones.map(zone => zone.name).join(', ')}
                  </Row>
                </>
              )
            }
            <div>
              <b>Actions: </b>
              {`${actionCount} (${rideCount} ride${rideCount === 1 ? '' : 's'})`}
            </div>
          </>
        </InfoWindow>
      )}
    </Marker>
  );
};

export default withProfileContext(DriverLocationMarkers);
