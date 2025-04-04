/* eslint-disable react/destructuring-assignment */
import * as React from 'react';
import MapGL, { Source, Layer } from 'react-map-gl';
import { Editor, DrawPolygonMode, EditingMode } from 'react-map-gl-draw';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getFeatureStyle, getEditHandleStyle } from './style';

export default class ZoneMap extends React.Component {
  constructor(props) {
    super(props);
    this.editorRef = null;
    this.state = {
      viewport: {},
      mode: null,
      parentFeature: null
    };
  }

  componentDidMount() {
    const { locationCoordinates } = this.props;
    if (locationCoordinates) {
      const center = Object.values(locationCoordinates[0]);
      const formattedLoc = locationCoordinates.map(coordinate => Object.values(coordinate));
      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [formattedLoc]
            }
          }
        ]
      };

      this.setState({
        viewport: {
          latitude: center[1],
          longitude: center[0],
          zoom: 11.5
        },
        parentFeature: geojson
      });
    }
  }

  componentDidUpdate(prevProps) {
    const { selectedFeatureIndex: previousSelection } = this.editorRef.state;
    const { selectedFeatureIndex: currentSelection } = this.props;

    // On props change
    if (prevProps.selectedFeatureIndex !== currentSelection) {
      // Clear selection
      if (this.editModeEnabled() && [null, undefined].includes(currentSelection)) {
        this.editorRef.setState({ selectedFeatureIndex: null, hovered: null });
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ mode: null });
      // Enable edit mode
      } else if (this.dragModeEnabled() && ![null, undefined].includes(currentSelection)) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ mode: new EditingMode() });
      // Select feature in map
      } else if (this.editModeEnabled()) {
        this.selectFeatureById(currentSelection);
      }
    // Select feature in map
    } else if (
      this.editModeEnabled()
      && ![null, undefined].includes(currentSelection)
      && previousSelection !== currentSelection
    ) {
      this.selectFeatureById(currentSelection);
    }
  }

  selectFeatureById = (selectedFeatureIndex) => {
    if ([null, undefined].includes(selectedFeatureIndex)) {
      this.editorRef.setState({ selectedFeatureIndex, hovered: null });
      this.setState({ mode: null });
    } else if (selectedFeatureIndex !== -1) {
      this.editorRef.setState({ selectedFeatureIndex, hovered: null });
      const feature = this.props.polygonsFeatureCollection.features[selectedFeatureIndex];
      const viewport = {
        ...this.state.viewport,
        latitude: feature.geometry.coordinates[0][0][1],
        longitude: feature.geometry.coordinates[0][0][0]
      };

      this.updateViewport(viewport);
    }
    return true;
  }

  updateViewport = (viewport) => {
    this.setState({ viewport });
  };

  onSelect = (options) => {
    if (options.selectedFeature) {
      if (options.selectedFeatureIndex !== -1) {
        this.props.updateSelectedFeatureIndex(
          options && options.selectedFeatureIndex
        );
      }
      this.props.updateCurrentFeature(options.selectedFeature);
    }
  };

  onDelete = () => {
    const selectedIndex = this.props.selectedFeatureIndex;
    if (selectedIndex !== null && selectedIndex >= 0) {
      this.editorRef.deleteFeatures(selectedIndex);
    }
  };

  onUpdate = (options) => {
    if (options.editType === 'addFeature') {
      const updatedOptions = options;
      const randomIdString = Math.random()
        .toString(36)
        .substr(2, 5);
      const featureIndex = updatedOptions.editContext.featureIndexes[0];
      updatedOptions.data[featureIndex].id = randomIdString;
      this.props.updatePolygonsFeatureCollection(updatedOptions.data);
      this.props.updateSelectedFeatureIndex(featureIndex);
      this.setState({
        mode: new EditingMode()
      });
    } else {
      this.props.updatePolygonsFeatureCollection(options.data);
    }
  };

  drawModeEnabled = () => this.state.mode instanceof DrawPolygonMode

  editModeEnabled = () => this.state.mode instanceof EditingMode

  dragModeEnabled = () => !this.state.mode

  renderDrawTools = () => (
    <div className="mapboxgl-ctrl-top-left">
      <div className="mapboxgl-ctrl-group mapboxgl-ctrl" style={{ display: 'flex' }}>
        <button
          type="button"
          title="Draw tool"
          onClick={() => this.setState({ mode: new DrawPolygonMode() })}
          style={{ background: 'none' }}
        >
          <FontAwesomeIcon icon="draw-polygon" size="lg" color={this.drawModeEnabled() ? 'indianred' : 'grey'} />
        </button>
        <button
          type="button"
          title="Edit tool"
          onClick={() => this.setState({ mode: new EditingMode() })}
          style={{ background: 'none', marginLeft: '10px' }}
        >
          <FontAwesomeIcon icon="pen-square" size="lg" color={this.editModeEnabled() ? 'indianred' : 'grey'} />
        </button>
        <button
          type="button"
          title="Drag tool"
          onClick={() => this.setState({ mode: null })}
          style={{ background: 'none', marginLeft: '10px' }}
        >
          <FontAwesomeIcon icon="hand-rock" size="lg" color={!this.state.mode ? 'indianred' : 'grey'} />
        </button>
      </div>
    </div>
  );

  render() {
    const { viewport, mode, parentFeature } = this.state;
    const { defaultZoneFeature } = this.props;
    return (
      <MapGL
        {...viewport}
        width="600px"
        height="400px"
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        onViewportChange={this.updateViewport}
      >
        <Source type="geojson" data={parentFeature}>
          <Layer
            id="my-polygon-outline"
            type="line"
            paint={{
              'line-color': '#000',
              'line-width': 3
            }}
          />
        </Source>
        {
          defaultZoneFeature && (
          <Source type="geojson" data={defaultZoneFeature}>
            <Layer
              type="fill"
              paint={{
                'fill-color': '#f00',
                'fill-opacity': 0.2
              }}
            />
          </Source>
          )
        }
        <Editor
          featuresDraggable={false}
          // eslint-disable-next-line no-return-assign
          ref={_ => (this.editorRef = _)}
          style={{ width: '100%', height: '100%', cursor: mode ? 'crosshair' : 'grab' }}
          clickRadius={12}
          mode={mode}
          onSelect={this.onSelect}
          onUpdate={this.onUpdate}
          editHandleShape="circle"
          featureStyle={getFeatureStyle}
          features={this.props.polygonsFeatureCollection.features}
          editHandleStyle={getEditHandleStyle}
        />
        {this.renderDrawTools()}

        <Source type="geojson" data={this.props.polygonsFeatureCollection}>
          <Layer
            type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-anchor': 'top'
            }}
            paint={{
              'text-color': '#000000'
            }}
          />
          <Layer
            id="my-polygon"
            type="fill"
            paint={{
              'fill-color': '#f00',
              'fill-opacity': 0.5
            }}
          />
        </Source>
      </MapGL>
    );
  }
}
