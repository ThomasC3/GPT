import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withGoogleMap, GoogleMap, Polygon } from 'react-google-maps';
import { MAP } from 'react-google-maps/lib/constants';
import differenceWith from 'lodash/differenceWith';
import isEqual from 'lodash/isEqual';
import InfoBox from 'react-google-maps/lib/components/addons/InfoBox';
import DriverLocationMarkers from './DriverLocationMarkers';
import ActiveRidesMap from './ActiveRidesMap';
import RequestMap from './RequestMap';
import { getPolygonCenter, worldbounds } from './utils';


const buttonStyle = {
  backgroundColor: '#fff',
  border: '2px solid #fff',
  borderRadius: '3px',
  boxShadow: '0 2px 6px rgba(0,0,0,.3)',
  cursor: 'pointer',
  marginTop: '22px',
  marginBottom: '22px',
  textAlign: 'center'
};
const textStyle = {
  color: 'rgb(25,25,25)',
  fontFamily: 'Roboto,Arial,sans-serif',
  fontSize: '12px',
  lineHeight: '24px',
  paddingLeft: '5px',
  paddingRight: '5px'
};

const routingLayerStyle = {
  strokeColor: 'red',
  strokeOpacity: 0.5,
  fillColor: 'transparent'
};

const zoneLayerStyle = {
  fillColor: 'transparent',
  strokeColor: 'green',
  strokeOpacity: 0.8,
  strokeWeight: 3
};
class LiveMap extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showAvailableDrivers: true,
      showUnavailableDrivers: true,
      showRides: true,
      showRequests: true,
      showIncompleteRequests: false,
      showRoutingLayer: false
    };
    this.controlToggleAvailableDrivers = React.createRef();
    this.controlToggleUnavailableDrivers = React.createRef();
    this.controlToggleRides = React.createRef();
    this.controlToggleRequests = React.createRef();
    this.controlToggleIncompleteRequests = React.createRef();
    this.controlToggleRoutingLayer = React.createRef();
    this.controlToggleZoneLayer = React.createRef();
  }

  componentDidMount() {
    const { region } = this.props;
    if (region) {
      this.refs.map.fitBounds(this.getBounds());
    }
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.TOP_CENTER
    ].push(this.controlToggleAvailableDrivers.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.TOP_CENTER
    ].push(this.controlToggleUnavailableDrivers.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.TOP_CENTER
    ].push(this.controlToggleRides.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.TOP_CENTER
    ].push(this.controlToggleRequests.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.TOP_CENTER
    ].push(this.controlToggleIncompleteRequests.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.BOTTOM_CENTER
    ].push(this.controlToggleRoutingLayer.current);
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.BOTTOM_CENTER
    ].push(this.controlToggleZoneLayer.current);
  }

  componentDidUpdate(prevProps) {
    const { region } = this.props;
    if (
      (region && region.length !== prevProps.region.length)
      || differenceWith(region, prevProps.region, isEqual).length) {
      this.refs.map.fitBounds(this.getBounds());
    }
  }

  getBounds = () => {
    const { region } = this.props;
    const bounds = new window.google.maps.LatLngBounds();
    region.forEach((i) => {
      bounds.extend(new window.google.maps.LatLng(i.lat, i.lng));
    });
    return bounds;
  }

  render() {
    const {
      showAvailableDrivers, showUnavailableDrivers,
      showRides, showRequests, showIncompleteRequests,
      showRoutingLayer, showZoneLayer
    } = this.state;
    const {
      map, zoom, center, region, location, routingArea, zones
    } = this.props;

    return (
      <React.Fragment>
        <GoogleMap
          ref="map"
          zoom={zoom}
          center={center}
          {...map}
        >
          <CustomControl ref={this.controlToggleAvailableDrivers} text="Toggle Available Drivers" value={showAvailableDrivers} onClick={() => this.setState({ showAvailableDrivers: !showAvailableDrivers })} />
          <CustomControl ref={this.controlToggleUnavailableDrivers} text="Toggle Unavavailable Drivers" value={showUnavailableDrivers} onClick={() => this.setState({ showUnavailableDrivers: !showUnavailableDrivers })} />
          <CustomControl ref={this.controlToggleRides} text="Toggle Rides" value={showRides} onClick={() => this.setState({ showRides: !showRides })} />
          <CustomControl ref={this.controlToggleRequests} text="Toggle Requests" value={showRequests} onClick={() => this.setState({ showRequests: !showRequests })} />
          <CustomControl ref={this.controlToggleIncompleteRequests} text="Toggle Incomplete Requests" value={showIncompleteRequests} onClick={() => this.setState({ showIncompleteRequests: !showIncompleteRequests })} />
          <CustomControl ref={this.controlToggleRoutingLayer} text="Show Routing Area" value={showRoutingLayer} onClick={() => this.setState({ showRoutingLayer: !showRoutingLayer })} />
          <CustomControl ref={this.controlToggleZoneLayer} text="Show Zone Area" value={showZoneLayer} onClick={() => this.setState({ showZoneLayer: !showZoneLayer })} />
          {
            showAvailableDrivers && (
              <DriverLocationMarkers location={location} isAvailable />
            )
          }
          {
            showUnavailableDrivers && (
              <DriverLocationMarkers location={location} isAvailable={false} />
            )
          }
          {
            showRides && (
              <ActiveRidesMap location={location} />
            )
          }
          {
            showRequests && (
              <RequestMap location={location} waitingPaymentConfirmation={false} />
            )
          }
          {
            showIncompleteRequests && (
              <RequestMap location={location} waitingPaymentConfirmation />
            )
          }
          {region && <Polygon paths={[worldbounds(), region]} />}
          {showRoutingLayer && routingArea && (
          <Polygon
            paths={routingArea}
            options={routingLayerStyle}
          />
          )}
          {showZoneLayer && zones && zones.map((zone) => {
            const { serviceArea } = zone;
            return (
              <div key={zone.id}>
                <Polygon paths={serviceArea} options={zoneLayerStyle} />
                <InfoBox
                  defaultPosition={getPolygonCenter(serviceArea)}
                  options={{ closeBoxURL: '' }}
                >
                  <div style={{ backgroundColor: 'white' }}>
                    <p
                      style={{
                        fontSize: '12px',
                        fontColor: '#08233B'
                      }}
                    >
                      {zone.name}
                    </p>
                  </div>
                </InfoBox>
              </div>
            );
          })}
        </GoogleMap>
      </React.Fragment>
    );
  }
}

const CustomControl = React.forwardRef((props, ref) => {
  const { onClick, text, value } = props;
  const st = { ...textStyle };
  if (value) {
    st.fontWeight = 'bold';
  }
  return (
    <button type="button" onClick={onClick} ref={ref} style={buttonStyle}>
      <div className="text" style={st}>{text}</div>
    </button>
  );
});

LiveMap.propTypes = {
  zoom: PropTypes.number,
  center: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number
  }),
  region: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    })
  )
};

LiveMap.defaultProps = {
  zoom: 5,
  center: {
    lat: 0,
    lng: 0
  },
  region: []
};

const withMaps = withGoogleMap(LiveMap);

withMaps.defaultProps = {
  loadingElement: <div style={{ height: '100%' }} />,
  containerElement: <div style={{ height: '80vh' }} />,
  mapElement: <div style={{ height: '100%' }} />
};

export default withMaps;
