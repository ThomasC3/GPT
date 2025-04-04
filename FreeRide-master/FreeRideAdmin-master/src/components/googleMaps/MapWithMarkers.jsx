import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withGoogleMap, GoogleMap, Marker } from 'react-google-maps';

class MapWithMarkers extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      error: false
    };
  }

  render() {
    const { markers, zoom, center } = this.props;

    return (
      <GoogleMap
        ref="map"
        zoom={zoom}
        center={center}
      >
        {markers && markers.map((marker, index) => <Marker key={index} position={marker} label={marker.label ? marker.label : undefined} />)}
      </GoogleMap>
    );
  }
}

MapWithMarkers.propTypes = {
  title: PropTypes.string,

  zoom: PropTypes.number,

  height: PropTypes.string,

  center: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number
  }),

  markers: PropTypes.arrayOf(PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
    label: PropTypes.string
  })),

  region: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    })
  ),

  onClick: PropTypes.func
};

MapWithMarkers.defaultProps = {
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

export default withGoogleMap(MapWithMarkers);
