import React, { Component } from 'react';
import {
  Table, Select, Button, message
} from 'antd';
import Axios from 'axios';
import { Row, SmallCard } from '../../elements';

const { Option } = Select;

export default class PaymentPolicy extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cellValues: [],
      isSubmitting: false
    };
  }

  componentDidMount() {
    this.fetchPaymentPolicies();
  }

  componentDidUpdate(prevProps) {
    const { zones } = this.props;
    const { cellValues } = this.state;
    if (prevProps.zones && prevProps.zones.length !== zones.length) {
      this.filterCellValuesByZones(cellValues, zones);
    }
  }

  componentWillUnmount() {}

  handleChange = (newValue, originZone, destinationZone) => {
    const { cellValues } = this.state;
    const existingValueIndex = cellValues.findIndex(
      cv => cv.originZone === originZone.id && cv.destinationZone === destinationZone.id
    );

    if (existingValueIndex !== -1) {
      // Update existing value in cellValues
      cellValues[existingValueIndex].value = newValue;
    } else {
      // Add new value to cellValues
      cellValues.push({
        value: newValue,
        originZone: originZone.id,
        destinationZone: destinationZone.id
      });
    }

    this.setState({
      cellValues: [...cellValues]
    });
  };

  handleSubmit = async () => {
    const { locationId } = this.props;
    const { cellValues } = this.state;
    this.setState({ isSubmitting: true });
    try {
      const cellValuesWithoutIds = cellValues.map(cv => ({
        value: cv.value,
        originZone: cv.originZone,
        destinationZone: cv.destinationZone
      }));
      const { data: updatedCellValues } = await Axios({
        url: `/v1/locations/${locationId}/payment-policies`,
        method: 'POST',
        data: cellValuesWithoutIds
      });
      this.setState({ cellValues: updatedCellValues });
      message.success('Payment rules updated successfully');
    } catch (error) {
      const errorMessage = error.response && error.response.data
        ? error.response.data.message
        : null;
      message.error(errorMessage || 'An error occurred');
    } finally {
      this.setState({ isSubmitting: false });
    }
  };

  fetchPaymentPolicies = async () => {
    const { locationId } = this.props;
    try {
      const { data: cellValues } = await Axios({
        url: `/v1/locations/${locationId}/payment-policies`,
        method: 'GET'
      });
      this.setState({ cellValues });
    } catch (error) {
      message.error('An error occurred');
    }
  };

  filterCellValuesByZones(cellValues, zones) {
    const zoneIds = new Set(zones.map(z => z.id));

    const newCellValues = cellValues.filter(
      cv => zoneIds.has(cv.originZone) && zoneIds.has(cv.destinationZone)
    );
    this.setState({ cellValues: newCellValues });
  }

  render() {
    const { cellValues, isSubmitting } = this.state;
    const { zones } = this.props;

    if (!zones) return null;
    const columns = [
      {
        title: '',
        dataIndex: 'name',
        key: 'name',
        render: text => text
      },
      ...zones.map(item => ({
        title: `${item.name} (Dest)`,
        dataIndex: item.id,
        key: item.id,
        render: (text, record) => {
          const cellValue = cellValues.find(
            cv => cv.originZone === record.id && cv.destinationZone === item.id
          );
          const value = cellValue ? cellValue.value : '';
          return (
            <Select
              value={value}
              onChange={newValue => this.handleChange(newValue, record, item)}
              style={{ width: '150px' }}
            >
              <Option value="origin">Origin</Option>
              <Option value="destination">Destination</Option>
            </Select>
          );
        }
      }))
    ];

    const dataSource = zones.map((rowItem) => {
      const rowData = {
        ...rowItem,
        key: rowItem.id,
        name: `${rowItem.name} (Origin)`
      };
      zones.forEach((colItem) => {
        const cellValue = cellValues.find(
          cv => cv.originZone === rowItem.id && cv.destinationZone === colItem.id
        );
        rowData[colItem.id] = cellValue ? cellValue.value : '';
      });
      return rowData;
    });

    return (
      <>
        <Row gutter={15} spacing={15}>
          <SmallCard size="small" title="Payment Rules">
            <Table
              dataSource={dataSource}
              columns={columns}
              bordered
              pagination={false}
            />
            <Button
              type="primary"
              style={{ float: 'right', marginTop: '10px' }}
              onClick={this.handleSubmit}
              disabled={isSubmitting}
              htmlType="submit"
            >
              Save
            </Button>
          </SmallCard>
        </Row>
      </>
    );
  }
}
