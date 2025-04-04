import PropTypes from 'prop-types';
import {
  message, Col, Row, Card, Descriptions, Tag, Table
} from 'antd';
import Axios from 'axios';
import { withRouter, Link } from 'react-router-dom';
import React, { Component, Fragment } from 'react';
import { EventList } from '../components';

class Job extends Component {
  state = {
    code: '',
    locationId: '',
    locationName: '',
    locationCode: '',
    clientCode: '',
    typeCode: '',
    active: false,
    isDeleted: false,
    vehicles: [],
    fetching: false
  };

  componentDidMount() {
    const { match: { params: { id } } } = this.props;
    if (id) {
      this.fetchJob();
      this.fetchVehicles();
    }
  }

  fetchJob = async () => {
    const { match: { params: { id } } } = this.props;
    return Axios({
      url: `/v1/jobs/${id}`,
      method: 'GET'
    }).then(res => this.setState(res.data))
      .catch(err => (
        message.error(err.response && err.response.data ? err.response.data.message : 'An error has occured while fetching jobs')
      ));
  }

  fetchVehicles = async () => {
    const { match: { params: { id: jobId } } } = this.props;
    try {
      const data = await Axios({
        url: '/v1/vehicles',
        params: { job: jobId }
      }).then(res => res.data);
      this.setState({ vehicles: data.items, fetching: false });
    } catch (err) {
      this.setState({ fetching: false });
      message.error(err.response && err.response.data ? err.response.data.message : 'An error has occured while fetching vehicles');
    }
  }

  render() {
    const { match: { params: { id } } } = this.props;
    const {
      code, locationId, locationName, locationCode,
      clientCode, typeCode, isDeleted, active,
      vehicles, fetching
    } = this.state;

    const tag = {
      statusColor: active ? 'green' : 'gold',
      statusTag: active ? 'ACTIVE' : 'INACTIVE'
    };

    if (isDeleted) {
      tag.statusColor = 'red';
      tag.statusTag = 'DELETED';
    }

    return (
      <Fragment>
        <Row gutter={16}>
          <Col sm={12}>
            <Card title="Job Info">
              <Descriptions
                size="small"
                bordered
                column={{
                  xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1
                }}
              >
                <Descriptions.Item label="Code">
                  { code }
                </Descriptions.Item>

                <Descriptions.Item label="Location">
                  <Link to={`/location/${locationId}`}>{ locationName }</Link>
                </Descriptions.Item>

                <Descriptions.Item label="Location Code">
                  { locationCode }
                </Descriptions.Item>

                <Descriptions.Item label="Client Code">
                  { clientCode }
                </Descriptions.Item>

                <Descriptions.Item label="Type Code">
                  { typeCode }
                </Descriptions.Item>

                <Descriptions.Item label="Status">
                  { <Tag color={tag.statusColor}>{tag.statusTag}</Tag> }
                </Descriptions.Item>
              </Descriptions>
            </Card>
            &nbsp;
            <Card title="Vehicles with job assigned">
              <Table
                dataSource={vehicles}
                rowKey={i => i.id}
                size="small"
                loading={fetching}
                pagination={false}
              >
                <Table.Column
                  title="Name"
                  render={val => (
                    <Link to={`/vehicles/${val.id}`}>
                      {val.name}
                    </Link>
                  )}
                />
                <Table.Column title="Type" dataIndex="type" />
                <Table.Column title="Public ID" dataIndex="publicId" />
                <Table.Column
                  title="Driver"
                  dataIndex="driver"
                  render={
                    val => (val ? (
                      <Link to={`/drivers/${val.id}`}>
                        {val.firstName}
                        {' '}
                        {val.lastName}
                      </Link>) : '')
                  }
                />
              </Table>
            </Card>
          </Col>
          { id && (
            <Col sm={12}>
              <Card title="Change Timeline">
                <EventList
                  job={id}
                />
              </Card>
            </Col>
          )}
        </Row>
      </Fragment>
    );
  }
}

Job.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    })
  }).isRequired
};

export default withRouter(Job);
