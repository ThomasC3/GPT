import React, { PureComponent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Marker, Polyline, InfoWindow } from 'react-google-maps';
import { message } from 'antd';
import { ConditionalWrapper } from '../../elements';
import withProfileContext from '../hocs/withProfileContext';
import { allowView } from '../../utils/auth';
import { AUTH0_RESOURCE_TYPES } from '../../utils/constants';

class RequestMap extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      requests: [],
      fetching: false
    };
    this.timer = null;
  }

  componentDidMount() {
    this.autoFetch();
  }

  componentDidUpdate(prevProps) {
    const { location } = this.props;
    if (location !== prevProps.location) {
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
    const { fetching, requests } = this.state;
    const { location, waitingPaymentConfirmation } = this.props;
    if (fetching) {
      return;
    }

    this.setState({ fetching: true });
    try {
      const { data } = await axios.get('/v1/dashboard/requests', {
        params: {
          status: [100], location, waitingPaymentConfirmation
        }
      });

      const requestsAsObject = requests.reduce(
        (accu, i, index) => ({ ...accu, [i.id]: index }), {}
      );


      this.setState({
        requests: data.map((i) => {
          let existing = {};
          if (requestsAsObject[i.id] !== undefined) {
            existing = requests[requestsAsObject[i.id]];
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
      message.error('An error occured while getting requests information');
      this.stopAutoFetch();
    } finally {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { requests } = this.state;
    const { permissions } = this.props;
    return requests.map((i, index) => <Request permissions={permissions} key={i.id} {...i} index={index + 1} />);
  }
}

const Request = React.memo((props) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const [polyline, setPolyline] = React.useState(null);
  const [nameInfo, setNameInfo] = React.useState(() => ({
    rider: null, driver: null
  }));
  const [addressInfo, setAddressInfo] = React.useState(() => ({
    id: null, pickupAddress: null, dropoffAddress: null
  }));

  const fetch = async () => {
    try {
      const { data } = await axios.get(`/v1/dashboard/requests/${props.id}`);

      // eslint-disable-next-line new-cap
      setPolyline(new window.google.maps.geometry.encoding.decodePath(data.polyline));

      setAddressInfo({
        id: data.id, pickupAddress: data.pickupAddress, dropoffAddress: data.dropoffAddress
      });

      const driver = data.driver
        ? { id: data.driver.id, firstName: data.driver.firstName, lastName: data.driver.lastName }
        : null;
      setNameInfo({
        rider: {
          id: data.rider.id,
          firstName: data.rider.firstName,
          lastName: data.rider.lastName
        },
        driver
      });

      setShowInfo(true);
    } catch (error) {
      message.error('An error occured while getting route information');
    }
  };

  const labelStyle = {
    color: props.waitingPaymentConfirmation ? 'white' : 'black'
  };

  const {
    pickup, dropOff, index, permissions
  } = props;
  return (
    <>
      <Marker
        position={pickup}
        onClick={fetch}
        label={{ text: `${index}:A`, ...labelStyle }}
      >
        {showInfo && (
          <InfoWindow onCloseClick={() => setShowInfo(false)}>
            <>
              <h4>
                { nameInfo.rider ? (
                <>
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
                </>
                ) : ('Rider Loading...')
              }
              </h4>
              <h4>
                { nameInfo.driver ? (
                  <>
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
                  </>
                ) : (
                  'No Driver Assigned Yet'
                )}
              </h4>
              <div>
                {`Pick up: ${addressInfo.pickupAddress}` }
              </div>
              <div>
                {`Drop Off: ${addressInfo.dropoffAddress}`}
              </div>
            </>
          </InfoWindow>
        )}
      </Marker>
      <Marker
        position={dropOff}
        onClick={fetch}
        label={{ text: `${index}:B`, ...labelStyle }}
      />
      {polyline && <Polyline path={polyline} options={{ strokeColor: 'orange' }} /> }
    </>
  );
});


export default withProfileContext(RequestMap);
