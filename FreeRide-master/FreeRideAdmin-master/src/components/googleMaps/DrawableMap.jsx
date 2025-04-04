import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withGoogleMap, GoogleMap, Polygon } from 'react-google-maps';
import differenceWith from 'lodash/differenceWith';
import isEqual from 'lodash/isEqual';
import { Button } from 'antd';
import { worldbounds } from './utils';
import { common } from '../../utils';

const { DrawingManager } = require('react-google-maps/lib/components/drawing/DrawingManager');

const { ENSURE_CLOCKWISE_POLYGON } = common;

const style = {
  strokeColor: '#000',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#000',
  fillOpacity: 0.5
};

const routingLayerStyle = {
  strokeColor: 'red',
  strokeOpacity: 0.5,
  fillColor: '#000',
  fillOpacity: 0.2
};

class DrawableMap extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
      showRoutingLayer: false
    };
  }

  componentDidMount() {
    if (this.props.region) {
      this.refs.map.fitBounds(this.getBounds());
    }
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

  toggleShowRoutingLayer = () => {
    this.setState({
      showRoutingLayer: !this.state.showRoutingLayer
    });
  }

  render() {
    const { region } = this.props;
    const { showRoutingLayer } = this.state;

    return (
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={() => this.refs.map.fitBounds(this.getBounds())}
          >
            Center
          </button>
          <Button
            type="primary"
            onClick={this.toggleShowRoutingLayer}
            style={{
              marginLeft: 10
            }}
          >
            Toggle Routing Area
          </Button>
        </div>
        <div>
          <GoogleMap
            ref="map"
            zoom={this.props.zoom}
            center={this.props.center}
          >
            {region && (
              <>
                <DrawingManager
                  defaultOptions={{
                    drawingControl: true,
                    drawingControlOptions: {
                      position: window.google.maps.ControlPosition.TOP_CENTER,
                      drawingModes: [
                        window.google.maps.drawing.OverlayType.POLYGON
                      ]
                    },
                    polygonOptions: style
                  }}
                  onPolygonComplete={(poly) => {
                    const polyArray = poly.getPath().getArray();
                    const paths = polyArray.map(i => ({
                      lat: i.lat(),
                      lng: i.lng()
                    }));
                    if (paths.length) {
                      paths.push(paths[0]);
                    }
                    this.props.onChangeRegion(ENSURE_CLOCKWISE_POLYGON(paths));
                    poly.setMap(null);
                  }}
                />
                <Polygon paths={[worldbounds(), region]} options={style} />
                {showRoutingLayer && (
                  <>
                    <DrawingManager
                      defaultOptions={{
                        drawingControl: true,
                        drawingControlOptions: {
                          position:
                            window.google.maps.ControlPosition.BOTTOM_CENTER,
                          drawingModes: [
                            window.google.maps.drawing.OverlayType.POLYGON
                          ]
                        },
                        polygonOptions: routingLayerStyle
                      }}
                      onPolygonComplete={(poly) => {
                        const polyArray = poly.getPath().getArray();
                        const paths = polyArray.map(i => ({
                          lat: i.lat(),
                          lng: i.lng()
                        }));
                        if (paths.length) {
                          paths.push(paths[0]);
                        }
                        this.props.onChangeRoutingLayer(
                          ENSURE_CLOCKWISE_POLYGON(paths)
                        );
                        poly.setMap(null);
                      }}
                    />
                    <Polygon
                      paths={[worldbounds(), this.props.routingArea || []]}
                      options={routingLayerStyle}
                    />
                  </>
                )}
              </>
            )}
          </GoogleMap>
        </div>
      </>
    );
  }
}

DrawableMap.propTypes = {
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

DrawableMap.defaultProps = {
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

export default withGoogleMap(DrawableMap);
