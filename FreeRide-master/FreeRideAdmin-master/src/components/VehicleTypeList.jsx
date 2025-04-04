import {
  Button, Col, Form, Row, Table, Divider
} from 'antd';
import Axios from 'axios';
import { Field, Formik } from 'formik';
import React, { Component, Fragment } from 'react';
import { ButtonLink, InputField } from '.';

const initialState = {
  items: [],
  fetching: true,
  filters: {
    type: ''
  }
};
class VehicleTypeList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ...initialState
    };
  }

  componentDidMount() {
    this.fetchVehicleTypes();
  }

  componentDidUpdate(prevProps, prevState) {
    const { fetching } = this.state;
    if (!prevState.fetching && fetching) { this.fetchVehicleTypes(); }
  }


  onReset = () => { this.setState({ ...initialState }); }

  fetchVehicleTypes = async () => {
    this.setState({ fetching: true });
    const { filters } = this.state;
    try {
      const data = await Axios({
        url: '/v1/vehicles/types',
        method: 'GET',
        params: {
          ...filters
        }
      }).then(res => res.data);

      this.setState({ items: data, fetching: false });
    } catch (error) {
      this.setState({ fetching: false });
    }
  }

  onChange = (filters) => {
    this.setState({
      filters,
      fetching: true
    });
  }

  render() {
    const { items, fetching } = this.state;
    return (
      <Fragment>
        <Row>
          <Col>
            <Formik
              initialValues={{
                type: ''
              }}
              onSubmit={(values) => {
                this.onChange(values);
              }}
              onReset={() => {
                this.onReset();
              }}
              render={formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Row gutter={15} spacing={15}>
                    <Col xs={24} sm={12} md={6}>
                      <Field placeholder="Filter by Type" name="type" component={InputField} />
                    </Col>
                  </Row>

                  <Row gutter={15}>
                    <Col>
                      <Button size="small" onClick={formProps.handleReset}>Reset</Button>
                      &nbsp;
                      <Button type="primary" size="small" htmlType="submit">Filter</Button>
                    </Col>
                  </Row>

                </Form>
              )}
            />
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col>
            <Table
              dataSource={items}
              rowKey={i => i.id}
              size="small"
              pagination={false}
              loading={fetching}
            >
              <Table.Column title="Type" dataIndex="type" />
              <Table.Column title="Passenger Capacity" dataIndex="passengerCapacity" />
              <Table.Column title="ADA Capacity" dataIndex="adaCapacity" />
              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`/vehicle_type/${i.id}`}>View</ButtonLink>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default VehicleTypeList;
