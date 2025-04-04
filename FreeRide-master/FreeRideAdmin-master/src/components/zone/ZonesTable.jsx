import {
  Button, Popconfirm, Table, Tag
} from 'antd';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export default class ZonesTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: [
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name'
        },
        {
          title: 'Description',
          dataIndex: 'description',
          key: 'description'
        },
        {
          title: 'Fixed-stop enabled',
          dataIndex: 'fixedStopEnabled',
          key: 'fixedStopEnabled',
          render: fixedStopEnabled => (
            <Tag color={fixedStopEnabled ? 'green' : 'red'}>
              {fixedStopEnabled ? 'Yes' : 'No'}
            </Tag>
          )
        },
        {
          title: 'Action',
          dataIndex: '',
          key: 'x',
          render: (text, record) => (
            <>
              <Button type="link" disabled={record.isDefault} onClick={() => this.props.updateSelectedFeatureIndexById(record.polygonFeatureId)}>
                Edit
              </Button>
              <Popconfirm
                title="Sure to delete?"
                onConfirm={() => this.props.delete(record.id, record.polygonFeatureId)
                }
                disabled={record.isDefault}
              >
                <Button type="link" disabled={record.isDefault}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )
        }
      ]
    };
  }

  componentDidMount() {

  }

  formatVehicleZones = (vehicleZones) => {
    const { zones } = this.props;
    const zoneComponents = vehicleZones.map(vehicleZone => (
      (zones.find(zone => zone.id === vehicleZone) || { name: '' }).name
    ));
    return zoneComponents.filter(zoneName => zoneName !== '').join(', ');
  }

  render() {
    const { columns } = this.state;
    const { zones } = this.props;
    return (
      <Table
        columns={columns}
        dataSource={zones.map(zone => ({ ...zone, key: zone.id }))}
        expandedRowRender={record => (
          <Table
            dataSource={record.vehicles}
            rowKey={i => i.id}
            size="small"
            pagination={false}
          >
            <Table.Column title="Name" render={val => (val.id ? <Link to={`/vehicles/${val.id}`}>{val.name}</Link> : '')} />
            <Table.Column title="Public ID" render={val => `${val.publicId}`} />
            <Table.Column
              title="Driver"
              render={
                val => (
                  val.driver && val.driver.id ? (
                    <Link to={`/drivers/${val.driver.id}`}>{`${val.driver.firstName} ${val.driver.lastName}`}</Link>
                  ) : ''
                )
              }
            />
            <Table.Column title="Routing policy" render={val => `${val.matchingRule}`} />
            <Table.Column title="Zones" render={val => `${this.formatVehicleZones(val.zones)}`} />
            <Table.Column
              title="Ready"
              render={(text, i) => (
                <Tag color={i.isReady ? 'green' : 'red'}>
                  {i.isReady ? 'Yes' : 'No'}
                </Tag>
              )}
            />
          </Table>
        )}
        pagination={false}
      />
    );
  }
}

ZonesTable.propTypes = {
  zones: PropTypes.arrayOf(PropTypes.shape()).isRequired
};
