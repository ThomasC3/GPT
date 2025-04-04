import React, { Fragment } from 'react';
import { withGoogleMap, GoogleMap, Polygon } from 'react-google-maps';
import HeatmapLayer from 'react-google-maps/lib/components/visualization/HeatmapLayer';
import differenceWith from 'lodash/differenceWith';
import isEqual from 'lodash/isEqual';
import { Switch, Spin } from 'antd';
import { worldbounds } from './utils';

const style = {
  strokeColor: '#000',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#000',
  fillOpacity: 0.5
};

class HeatMap extends React.Component {
  state = {
    showPickup: true,
    showDropoff: true
  }

  componentDidMount() {
    if (this.props.region) {
      this.refs.map.fitBounds(this.getBounds());
    }
  }

  componentDidUpdate(prevProps, prevState) {
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

  render() {
    const { showDropoff, showPickup } = this.state;

    return (
      <Fragment>
        <GoogleMap
          ref="map"
          zoom={this.props.zoom}
          center={this.props.center}
        >
          {showPickup && <HeatmapLayer data={this.props.pickup} /> }
          {showDropoff && <HeatmapLayer data={this.props.dropoff} /> }
          <Polygon paths={[worldbounds(), this.props.region]} options={style} />
        </GoogleMap>

        <label>Toggle Pickup Heat Map</label>
        <div>
          <Switch checked={showPickup} onChange={i => this.setState({ showPickup: i })} />
        </div>
        <label>Toggle Drop off Heat Map</label>
        <div>
          <Switch checked={showDropoff} onChange={i => this.setState({ showDropoff: i })} />
        </div>

      </Fragment>
    );
  }
}
HeatMap.defaultProps = {
  zoom: 5,

  center: {
    lat: 0,
    lng: 0
  }

};
HeatMap.defaultProps = {
  title: '',

  zoom: 5,

  center: {
    lat: 0,
    lng: 0
  },

  loadingElement: <Spin />,
  containerElement: <div style={{ height: '600px' }} />,
  mapElement: <div style={{ height: '100%' }} />
};
const withMaps = withGoogleMap(HeatMap);

withMaps.defaultProps = {
  loadingElement: <Spin />,
  containerElement: <div style={{ height: '90vh' }} />,
  mapElement: <div style={{ height: '100%' }} />
};

export default withMaps;
