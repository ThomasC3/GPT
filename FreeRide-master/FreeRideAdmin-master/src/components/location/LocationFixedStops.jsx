import axios from 'axios';
import React, { Component } from 'react';
import {
  Col, Badge, Descriptions, PageHeader, message
} from 'antd';
import { Row, SmallCard } from '../../elements';

import FixedStopMap from '../googleMaps/FixedStopMap';
import LocationFixedStopsTable from './LocationFixedStopsTable';
import { common } from '../../utils';

const { MAP_AREA_FOR_GOOGLE } = common;

class LocationFixedStops extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedFixedStop: {},
      fixedStops: []
    };
  }

  componentDidMount() {
    this.fetchFixedStops();
    this.fetchZones();
  }

  addFixedStopFromMap = (coordinates) => {
    this.setState({
      fixedStops: [...this.state.fixedStops, { ...coordinates, status: 0, edited: true }]
    });
  }

  updateFixedStops = (fixedStops) => {
    this.setState({ fixedStops });
  }

  markerIsEq = (marker1, marker2) => marker1.lat === marker2.lat && marker1.lng === marker2.lng

  onMarkerDragEnd = (prevMarker, marker) => {
    const fixedStops = this.state.fixedStops;
    const index = fixedStops.findIndex(fs => this.markerIsEq(fs, prevMarker));
    fixedStops[index] = { ...fixedStops[index], ...marker, edited: true };

    this.setState({ fixedStops });
  }

  removeFixedStop = (coordinates) => {
    this.setState({ fixedStops: [...this.state.fixedStops, coordinates] });
  }

  onFixedStopSelected = (fixedStop) => {
    this.setState({ selectedFixedStop: fixedStop });
  }

  handleSave = async fixedStop => axios({
    url: fixedStop.id ? `/v1/fixed-stops/${fixedStop.id}` : '/v1/fixed-stops',
    method: fixedStop.id ? 'PUT' : 'POST',
    data: { ...fixedStop, location: this.props.locationIdParam }
  })
    .then((res) => {
      const fixedStops = this.state.fixedStops;
      const index = fixedStops.findIndex(fs => this.markerIsEq(fs, res.data));
      fixedStops[index] = res.data;
      this.updateFixedStops(fixedStops);
      message.success('Fixed stop saved');
    })
    .catch((err) => {
      const errorMessage = err.response && err.response.data
        ? err.response.data.message
        : null;

      console.log(err);
      message.error(errorMessage || 'An error has occured');
    })

  handleDelete = async (fixedStop) => {
    if (fixedStop.id) {
      return axios
        .delete(`/v1/fixed-stops/${fixedStop.id}`)
        .then((res) => {
          const fixedStops = this.state.fixedStops.filter(
            item => !this.markerIsEq(res.data, item)
          );
          this.updateFixedStops(fixedStops);
        })
        .catch((err) => {
          const errorMessage = err.response && err.response.data
            ? err.response.data.message
            : null;

          console.log(err);
          message.error(errorMessage || 'An error has occured');
        });
    }
    const fixedStops = this.state.fixedStops.filter(item => !this.markerIsEq(fixedStop, item));
    this.updateFixedStops(fixedStops);
  }

  fetchFixedStops = async () => {
    const { locationIdParam: locationId } = this.props;
    const response = await axios.get(
      `/v1/locations/${locationId}/fixed-stops?limit=300`
    );

    this.setState({ fixedStops: response.data });
  }

  fetchZones = async () => {
    const { locationIdParam: locationId } = this.props;
    const { data: response } = await axios.get(
      `/v1/locations/${locationId}/zones`
    );
    let zonesWithoutDefault = [];
    if (response && response.length) {
      zonesWithoutDefault = response.filter(zone => !zone.isDefault).map(zone => ({
        ...zone,
        serviceArea: zone.serviceArea.map(MAP_AREA_FOR_GOOGLE)
      }));
    }
    this.setState({ zones: zonesWithoutDefault });
  }

  render() {
    const formProps = this.props.formProps;
    const emptyBadgeStyle = {
      backgroundColor: '#fff', color: '#999', boxShadow: '0 0 0 1px #d9d9d9 inset'
    };

    return (
      <>
        <PageHeader>
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="Total">
              <Badge count={this.state.fixedStops.length} style={emptyBadgeStyle} />
            </Descriptions.Item>
            <Descriptions.Item label="Active">
              <Badge
                count={this.state.fixedStops.filter(x => x.status === 1).length}
                style={emptyBadgeStyle}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Inactive">
              <Badge
                count={this.state.fixedStops.filter(x => x.status === 0).length}
                style={emptyBadgeStyle}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Not Saved">
              <Badge
                style={{ backgroundColor: '#d46b08' }}
                count={
                this.state.fixedStops.filter(x => x.edited).length
              }
              />
            </Descriptions.Item>
          </Descriptions>
        </PageHeader>
        <Row gutter={15} spacing={15}>
          <SmallCard size="small" title="Fixed Stops">
            <Col xs={24} sm={24} md={24} lg={12}>
              <LocationFixedStopsTable
                fixedStops={this.state.fixedStops}
                onFixedStopSelected={this.onFixedStopSelected}
                updateFixedStops={this.updateFixedStops}
                handleSave={this.handleSave}
                handleDelete={this.handleDelete}
              />
            Note: Click on the map to add a fixed-stop
            </Col>
            <Col xs={24} sm={24} md={24} lg={12}>
              <div>
                <FixedStopMap
                  title={formProps.values.name}
                  region={formProps.values.serviceArea}
                  selectedMarker={this.state.selectedFixedStop}
                  onMapClick={this.addFixedStopFromMap}
                  onMarkerDragEnd={this.onMarkerDragEnd}
                  onMarkerSelected={this.onFixedStopSelected}
                  markers={this.state.fixedStops}
                  zones={this.state.zones}
                  loadingElement={<div style={{ height: '100%' }} />}
                  containerElement={<div style={{ height: '400px' }} />}
                  mapElement={<div style={{ height: '100%' }} />}
                />
              </div>
            </Col>
          </SmallCard>
        </Row>
      </>
    );
  }
}

export default LocationFixedStops;
