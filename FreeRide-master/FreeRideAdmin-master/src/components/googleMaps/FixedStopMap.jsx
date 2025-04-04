import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  withGoogleMap, GoogleMap, Polygon, Marker, InfoWindow
} from 'react-google-maps';
import { MAP } from 'react-google-maps/lib/constants';
import InfoBox from 'react-google-maps/lib/components/addons/InfoBox';
import differenceWith from 'lodash/differenceWith';
import isEqual from 'lodash/isEqual';
import { worldbounds, getPolygonCenter } from './utils';

const style = {
  strokeColor: '#000',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#000',
  fillOpacity: 0.5
};

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

const zoneEnabledLayerStyle = {
  fillColor: 'transparent',
  strokeColor: 'green',
  strokeOpacity: 0.8,
  strokeWeight: 3,
  clickable: false
};

const zoneDisabledLayerStyle = {
  fillColor: 'transparent',
  strokeColor: 'red',
  strokeOpacity: 0.8,
  strokeWeight: 3,
  clickable: false
};

const inactiveIcon = {
  url: 'https://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png&amp;scale=1'
};
const activeIcon = {
  url: 'https://mt.google.com/vt/icon?psize=30&font=fonts/arialuni_t.ttf&color=ff304C13&name=icons/spotlight/spotlight-waypoint-a.png&ax=43&ay=48&text=%E2%80%A2' // ur
};

class FixedStopMap extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      error: false,
      selectedMarker: {},
      onDragMarker: {},
      showZoneLayer: true
    };
    this.controlToggleZoneLayer = React.createRef();
  }

  componentDidMount() {
    if (this.props.region) {
      this.refs.map.fitBounds(this.getBounds());
    }
    this.refs.map.context[MAP].controls[
      window.google.maps.ControlPosition.BOTTOM_CENTER
    ].push(this.controlToggleZoneLayer.current);
  }

  componentDidUpdate(prevProps, _prevState) {
    if (
      (this.props.region && this.props.region.length !== prevProps.region.length)
      || differenceWith(this.props.region, prevProps.region, isEqual).length) {
      this.refs.map.fitBounds(this.getBounds());
    }
  }

  getBounds = () => {
    const bounds = new window.google.maps.LatLngBounds();
    this.props.region.forEach((i) => {
      bounds.extend(new window.google.maps.LatLng(i.lat, i.lng));
    });
    return bounds;
  }

  onMapClick = (e) => {
    this.resetSelectedMarker();
    this.props.onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }

  onMarkerClick = (e) => {
    this.props.onMarkerSelected({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }

  onDragStart = (e) => {
    this.setState({ onDragMarker: { lat: e.latLng.lat(), lng: e.latLng.lng() } });
  }

  onDragEnd = (e) => {
    const newMarker = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    this.props.onMarkerDragEnd(this.state.onDragMarker, newMarker);
    this.resetOnDragMarker();
  }

  resetSelectedMarker = (e) => {
    this.setState({ selectedMarker: {} });
  }

  resetOnDragMarker = (e) => {
    this.setState({ onDragMarker: {} });
  }

  markerIsEq = (marker1, marker2) => marker1.lat === marker2.lat && marker1.lng === marker2.lng

  static getDerivedStateFromProps(props, state) {
    return {
      ...state,
      selectedMarker: props.selectedMarker
    };
  }

  render() {
    const { region, markers, zones } = this.props;
    const { showZoneLayer } = this.state;

    return (
      <>
        <div>
          <button
            type="button"
            onClick={() => this.refs.map.fitBounds(this.getBounds())}
          >
            Center
          </button>
        </div>

        <div>
          <GoogleMap
            ref="map"
            zoom={this.props.zoom}
            center={this.props.center}
            onClick={this.onMapClick}
          >
            <CustomControl ref={this.controlToggleZoneLayer} text="Show Zone Area" value={showZoneLayer} onClick={() => this.setState({ showZoneLayer: !showZoneLayer })} />
            { region && <Polygon paths={[worldbounds(), region]} options={style} /> }
            { region && markers.map(marker => (
              <Marker
                draggable
                key={Object.entries(marker).toString()}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={this.onMarkerClick}
                onDragEnd={this.onDragEnd}
                onDragStart={this.onDragStart}
                showInfo={false}
                  // eslint-disable-next-line
                  icon={ marker.status == 1 ? activeIcon : inactiveIcon }
              >
                { this.markerIsEq(this.state.selectedMarker, marker)
                      && (
                      <InfoWindow>
                          <>
                            <div id="content">
                              <div id="siteNotice" />
                            </div>
                            <h2 id="firstHeading" className="firstHeading">
                              {marker.name || 'Stop'}
                            </h2>
                            <div id="bodyContent">
                              <p>
                                <b>Business</b>
:
                                {' '}
                                {marker.businessName || '-'}
                              </p>
                              <p>
                                <b>Lat</b>
:
                                {' '}
                                {marker.lat}
                              </p>
                              <p>
                                <b>Lng</b>
:
                                {' '}
                                {marker.lng}
                              </p>
                              {/* eslint-disable-next-line */}
                              <p><b>Status</b>: {marker.status == 1 ? 'Enabled' : 'Disabled'}</p>
                            </div>
                          </>
                      </InfoWindow>
                      )
                  }
              </Marker>
            ))
            }
            {showZoneLayer && zones && zones.map((zone) => {
              const { serviceArea } = zone;
              return (
                <div key={zone.id}>
                  <Polygon
                    paths={serviceArea}
                    options={zone.fixedStopEnabled ? zoneEnabledLayerStyle : zoneDisabledLayerStyle}
                  />
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
        </div>
      </>
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

FixedStopMap.propTypes = {
  title: PropTypes.string,

  zoom: PropTypes.number,

  height: PropTypes.string,

  center: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number
  }),

  markers: PropTypes.arrayOf(PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number
  })),

  region: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    })
  ),

  onClick: PropTypes.func
};

FixedStopMap.defaultProps = {
  title: '',

  zoom: 5,

  height: '500px',

  center: {
    lat: 0,
    lng: 0
  },

  loadingElement: <div style={{ height: '100%' }} />,
  containerElement: <div style={{ height: '400px' }} />,
  mapElement: <div style={{ height: '100%' }} />
};

export default withGoogleMap(FixedStopMap);
