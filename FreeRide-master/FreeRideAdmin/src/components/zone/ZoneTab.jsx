/* eslint-disable react/no-unused-state */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import { Col, message } from 'antd';
import Axios from 'axios';
import { Row, SmallCard } from '../../elements';
import ZonesTable from './ZonesTable';
import ZoneMap from './ZoneMap';
import {
  snapToParentPolygon,
  snapToPolygons,
  snapToZonePolygon
} from './helper';
import ZoneForm from './ZoneForm';

export default class ZoneTab extends Component {
  constructor(props) {
    super(props);

    this.state = {
      zones: [],
      polygonsFeatureCollection: {
        type: 'FeatureCollection',
        features: []
      },
      copyOfServerPolygonsFeatureCollection: {
        type: 'FeatureCollection',
        features: []
      },
      selectedZone: {},
      currentFeature: null,
      selectedFeatureIndex: null,
      fetching: false,
      defaultZoneFeature: null
    };
  }

  componentDidMount() {
    this.fetchZones(this.props.locationId);
  }

  fetchZones = async (locationId) => {
    const { polygonsFeatureCollection } = this.state;
    this.setState({ fetching: true });
    try {
      const { data } = await Axios({
        url: `/v1/locations/${locationId}/zones`
      });
      if (data && data.length) {
        const defaultZone = data.find(zone => zone.isDefault);
        const zonesWithoutDefault = data.filter(zone => !zone.isDefault);
        const polygons = zonesWithoutDefault.map(zone => ({
          id: zone.polygonFeatureId,
          type: 'Feature',
          properties: {
            label: zone.name
          },
          geometry: {
            coordinates: [zone.serviceArea.map(el => [el.longitude, el.latitude])],
            type: 'Polygon'
          }
        }));

        this.setState({
          zones: data,
          polygonsFeatureCollection: {
            ...polygonsFeatureCollection,
            features: polygons
          },
          copyOfServerPolygonsFeatureCollection: {
            ...polygonsFeatureCollection,
            features: polygons
          }
        });
        if (defaultZone) {
          this.setState({
            defaultZoneFeature: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [defaultZone.serviceArea.map(el => [el.longitude, el.latitude])]
                  }
                }
              ]
            }
          });
        }
      }
    } catch (err) {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;

      message.error(errorMessage || 'An Error Occurred');
    } finally {
      this.setState({ fetching: false });
    }
  }

  delete = async (zoneId, polygonFeatureId) => {
    const { zones, polygonsFeatureCollection } = this.state;
    const { locationId, updateZones } = this.props;
    try {
      await Axios({
        url: `/v1/locations/${locationId}/zones/${zoneId}`,
        method: 'DELETE'
      });
      const updatedZones = zones.filter(zone => zone.id !== zoneId);
      const updatedPolygonsFeatureCollection = polygonsFeatureCollection.features.filter(
        feature => feature.id !== polygonFeatureId
      );
      this.setState({
        zones: updatedZones,
        polygonsFeatureCollection: {
          ...polygonsFeatureCollection,
          features: updatedPolygonsFeatureCollection
        },
        copyOfServerPolygonsFeatureCollection: {
          ...polygonsFeatureCollection,
          features: updatedPolygonsFeatureCollection
        },
        selectedZone: {},
        currentFeature: null,
        selectedFeatureIndex: null
      });
      updateZones(updatedZones);
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message
        : null;

      message.error(errorMessage || 'An Error Occurred');
    }
  }

  save = async (data) => {
    const {
      selectedZone,
      zones,
      currentFeature,
      polygonsFeatureCollection,
      selectedFeatureIndex
    } = this.state;
    const { locationId, updateZones } = this.props;

    if (!currentFeature.geometry || !currentFeature.geometry.coordinates) {
      message.error('Please draw a zone on the map before saving');
      return;
    }
    const saveData = {
      ...data,
      polygonFeatureId: currentFeature.id,
      serviceArea: polygonsFeatureCollection.features[selectedFeatureIndex].geometry
        .coordinates
    };
    const updatedFeatureCollection = polygonsFeatureCollection.features.map(
      (feature) => {
        if (feature.id === currentFeature.id) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              label: data.name
            }
          };
        }
        return feature;
      }
    );
    let updatedZones = {};
    if (selectedZone.name) {
      const { data: updatedData } = await Axios({
        url: `/v1/locations/${locationId}/zones/${selectedZone.id}`,
        method: 'PUT',
        data: saveData
      });
      updatedZones = zones.map((zone) => {
        if (zone.polygonFeatureId === currentFeature.id) {
          return updatedData;
        }
        return zone;
      });
    } else {
      const { data: newData } = await Axios({
        url: `/v1/locations/${locationId}/zones`,
        method: 'POST',
        data: saveData
      });
      updatedZones = [...zones, newData];
    }
    this.setState(prevState => ({
      zones: updatedZones,
      currentFeature: null,
      selectedZone: {},
      selectedFeatureIndex: null,
      polygonsFeatureCollection: {
        ...prevState.polygonsFeatureCollection,
        features: updatedFeatureCollection
      },
      copyOfServerPolygonsFeatureCollection: {
        ...polygonsFeatureCollection,
        features: updatedFeatureCollection
      }
    }));
    updateZones(updatedZones);
  };

  updatePolygonsFeatureCollection = (collection) => {
    this.setState(prevState => ({
      polygonsFeatureCollection: {
        ...prevState.polygonsFeatureCollection,
        features: collection
      }
    }));
  };

  updateSelectedFeatureIndexById = (featurePolygonId) => {
    const { polygonsFeatureCollection } = this.state;
    const index = polygonsFeatureCollection.features.findIndex(
      feature => feature.id === featurePolygonId
    );
    return this.updateSelectedFeatureIndex(index);
  }

  updateSelectedFeatureIndex = (index) => {
    const { polygonsFeatureCollection, zones } = this.state;

    const updatedState = { selectedFeatureIndex: index };
    const currentFeature = polygonsFeatureCollection.features[index];
    this.updateCurrentFeature(currentFeature);
    const selectedZone = zones.find(
      zone => zone.polygonFeatureId === currentFeature.id
    );
    if (selectedZone) {
      updatedState.selectedZone = selectedZone;
    } else {
      updatedState.selectedZone = {};
    }
    this.setState(updatedState);
  };

  updateCurrentFeature = (feature) => {
    this.setState({ currentFeature: feature });
  };

  updateCurrentSelectedZone = (selectedZone) => {
    this.setState({ selectedZone });
  };

  cancelEdit = () => {
    this.setState((state) => {
      const { copyOfServerPolygonsFeatureCollection } = state;
      return {
        polygonsFeatureCollection: copyOfServerPolygonsFeatureCollection,
        selectedZone: {},
        currentFeature: null,
        selectedFeatureIndex: null
      };
    });
  }

  snapToPolygon = (target) => {
    const {
      selectedFeatureIndex,
      polygonsFeatureCollection,
      currentFeature
    } = this.state;
    const parentPolygonCoordinates = this.props.serviceArea.map(coordinate => Object.values(coordinate));
    const currentFeatureCoordinates = polygonsFeatureCollection.features[selectedFeatureIndex].geometry
      .coordinates[0];
    let snappedCoordinates;
    if (target === 'parent') {
      snappedCoordinates = snapToParentPolygon(
        currentFeatureCoordinates,
        parentPolygonCoordinates
      );
    } else if (target === 'child') {
      snappedCoordinates = snapToZonePolygon(
        currentFeatureCoordinates,
        polygonsFeatureCollection,
        currentFeature.id
      );
    } else {
      snappedCoordinates = snapToPolygons(
        currentFeatureCoordinates,
        parentPolygonCoordinates,
        polygonsFeatureCollection,
        currentFeature.id
      );
    }
    // update the coordinates of the current feature in the polygonsFeatureCollection
    const updatedFeatureCollection = this.state.polygonsFeatureCollection.features.map(
      (feature) => {
        if (feature.id === this.state.currentFeature.id) {
          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: [snappedCoordinates]
            }
          };
        }
        return feature;
      }
    );
    this.updatePolygonsFeatureCollection(updatedFeatureCollection);
  };

  render() {
    const {
      polygonsFeatureCollection,
      selectedZone,
      currentFeature,
      selectedFeatureIndex,
      zones
    } = this.state;
    const { serviceArea } = this.props;
    return (
      <>
        <Row gutter={15} spacing={15}>
          <SmallCard size="small" title="Zones">
            <Col xs={24} sm={24} md={24} lg={12}>
              <Row gutter={15} spacing={15}>
                <Col sm={24}>
                  <ZonesTable
                    zones={zones}
                    delete={this.delete}
                    updateSelectedFeatureIndexById={this.updateSelectedFeatureIndexById}
                  />
                  Note: Draw on the map to add create a zone
                </Col>
                <Col sm={24} style={{ marginTop: '30px' }}>
                  {currentFeature && (
                    <ZoneForm
                      currentFeatureCoord={
                        polygonsFeatureCollection.features[
                          selectedFeatureIndex
                        ]
                        && polygonsFeatureCollection.features[selectedFeatureIndex]
                          .geometry.coordinates
                      }
                      selectedFeatureIndex={selectedFeatureIndex}
                      save={this.save}
                      zone={selectedZone}
                      cancelEdit={this.cancelEdit}
                    />
                  )}
                </Col>
              </Row>
            </Col>
            <Col xs={24} sm={24} md={24} lg={12}>
              {serviceArea && serviceArea.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => this.snapToPolygon('parent')}
                    disabled={
                      selectedFeatureIndex === null
                      || selectedFeatureIndex === undefined
                    }
                  >
                    Snap to Location
                  </button>
                  <button
                    type="button"
                    onClick={() => this.snapToPolygon('child')}
                    disabled={
                      selectedFeatureIndex === null
                      || selectedFeatureIndex === undefined
                    }
                  >
                    Snap to Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => this.snapToPolygon()}
                    disabled={
                      selectedFeatureIndex === null
                      || selectedFeatureIndex === undefined
                    }
                  >
                    Snap to All
                  </button>
                  <ZoneMap
                    locationCoordinates={serviceArea}
                    polygonsFeatureCollection={polygonsFeatureCollection}
                    updatePolygonsFeatureCollection={
                      this.updatePolygonsFeatureCollection
                    }
                    updateCurrentFeature={this.updateCurrentFeature}
                    zones={this.state.zones}
                    updateSelectedFeatureIndex={this.updateSelectedFeatureIndex}
                    defaultZoneFeature={this.state.defaultZoneFeature}
                    selectedFeatureIndex={selectedFeatureIndex}
                  />
                </div>
              )}
            </Col>
          </SmallCard>
        </Row>
      </>
    );
  }
}
