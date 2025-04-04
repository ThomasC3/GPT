import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row, Table, Tag, Card
} from 'antd';
import Axios from 'axios';
import { Field, Formik } from 'formik';
import { Link } from 'react-router-dom';
import Qs from 'qs';
import {
  ButtonLink, InputField, SelectField
} from '.';
import { formatLocationList } from '../utils/format';
import { ENDPOINTS, ROUTES } from '../utils/constants';
import './CampaignList.css';
import Campaign from '../pages/Campaign';
import { Modal } from '../elements';

const INIT_SEARCH = {
  name: '',
  advertiserId: '',
  location: '',
  isRunning: '',
  isEnabled: ''
};

const INIT_PAGINATION = {
  pageSize: 15, // items per page
  current: 1,
  total: 0
};

const INIT_SORT = {
  key: 'campaignStart',
  order: -1
};

const INIT_STATE = {
  fetching: true,
  items: [],
  advertisers: [],
  filters: { ...INIT_SEARCH },
  pagination: { ...INIT_PAGINATION },
  sort: { ...INIT_SORT },
  newPagination: false
};

class CampaignList extends Component {
  state = { ...INIT_STATE }

  componentDidMount() {
    this.fetchCampaignList();
  }

  componentDidUpdate(prevProps, prevState) {
    const { fetching } = this.state;
    if (!prevState.fetching && fetching) { this.fetchCampaignList(); }
  }

  onChange = (pagination, filters) => {
    const { filters: stateFilters, pagination: statePagination } = this.state;
    this.setState({
      filters: { ...stateFilters, ...filters },
      pagination: { ...statePagination, ...pagination },
      fetching: true
    });
  }

  onReset = () => { this.setState({ ...INIT_STATE }); }

  fetchCampaignList = async () => {
    this.setState({ fetching: true });
    const {
      filters, pagination, newPagination, sort
    } = this.state;
    try {
      const data = await Axios({
        url: ENDPOINTS.CAMPAIGNS,
        method: 'GET',
        params: {
          filters,
          pagination: { ...(newPagination ? INIT_PAGINATION : pagination) },
          sort
        },
        paramsSerializer: p => Qs.stringify(p, { arrayFormat: 'brackets' })
      }).then(res => res.data);

      this.setState({
        items: data.items,
        advertisers: data.advertisers,
        fetching: false,
        pagination: { ...(newPagination ? INIT_PAGINATION : pagination), total: data.total },
        newPagination: false
      });
    } catch (error) {
      this.setState({ fetching: false });
    }
  }

  requestSort = (key) => {
    const { sort } = this.state;
    let order = sort.order || 1;
    if (sort.key === key) {
      order = -order;
    }
    this.setState({ sort: { key, order } });
    this.fetchCampaignList();
  }

  headerFormat = (header, key) => {
    const { sort } = this.state;
    if (sort.key !== key) {
      return (
        <span
          className="clickable-header"
          role="button"
          onClick={() => this.requestSort(key)}
          onKeyPress={(e) => { if (e.key === 'Enter') this.requestSort(key); }}
          tabIndex={0}
        >
          {header}
        </span>
      );
    }
    return (
      <span
        className="clickable-header"
        role="button"
        onClick={() => this.requestSort(key)}
        onKeyPress={(e) => { if (e.key === 'Enter') this.requestSort(key); }}
        tabIndex={0}
      >
        <b>{sort.order === 1 ? `${header} ↓` : `${header} ↑`}</b>
      </span>
    );
  }

  renderAdvertiser = (advertiserId) => {
    const { advertisers } = this.state;
    if (advertiserId) {
      const advertiser = advertisers.find(adv => adv.id === advertiserId);
      if (advertiser) {
        return (
          <Link to={`${ROUTES.ADVERTISERS}/${advertiserId}`}>
            {`${advertiser.name} (${advertiser.clientId})`}
          </Link>
        );
      }
    }
    return '';
  }

  render() {
    const {
      items, advertisers,
      filters, pagination, fetching
    } = this.state;
    const { locations: fetchedLocations } = this.props;
    const transformedLocations = fetchedLocations.map(loc => (
      { name: loc.name, value: loc.id }
    ));
    const transformedAdvertisers = advertisers.map(adv => (
      { name: `${adv.name} (${adv.clientId})`, value: adv.id }
    ));
    return (
      <Fragment>
        <Row>
          <Col>
            <Formik
              initialValues={{ ...INIT_SEARCH }}
              onSubmit={newFilters => this.setState(
                { fetching: true, newPagination: true, filters: { ...newFilters } }
              )}
              onReset={() => {
                this.onReset();
              }}
            >
              {formProps => (
                <Form onSubmit={formProps.handleSubmit}>
                  <Card
                    title="Filters"
                    extra={(
                      <Modal
                        title="New Campaign"
                        button={<Button type="primary" size="small">New Campaign</Button>}
                        destroyOnClose
                        width="70vw"
                        footer={[]}
                      >
                        <Campaign />
                      </Modal>
                    )}
                  >
                    <Row gutter={15} spacing={15}>
                      <Col xs={24} sm={12} md={6}>
                        <Field label="Name" placeholder="Filter by Name" name="name" component={InputField} />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Field
                          showSearch
                          label="Advertiser"
                          name="advertiserId"
                          options={[
                            { value: '', name: 'Any Advertiser' },
                            ...transformedAdvertisers
                          ]}
                          component={SelectField}
                          filterOption={(input, option) => (
                            ((option && option.props.value && option.props.children) || '')
                              .toLowerCase().includes(input.toLowerCase())
                          )}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Field
                          label="Location"
                          name="location"
                          options={[
                            { value: '', name: 'Any Location' },
                            ...transformedLocations
                          ]}
                          component={SelectField}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Field
                          label="Running"
                          name="isRunning"
                          disabled={formProps.values.isEnabled === 'false'}
                          options={[
                            { value: '', name: 'Any status' },
                            { value: 'true', name: 'Yes' },
                            { value: 'false', name: 'No' }
                          ]}
                          component={SelectField}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Field
                          label="Enabled"
                          name="isEnabled"
                          options={[
                            { value: '', name: 'Any status' },
                            { value: 'true', name: 'Yes' },
                            { value: 'false', name: 'No' }
                          ]}
                          component={SelectField}
                          onChange={(isEnabled) => {
                            if (isEnabled === 'false') {
                              formProps.setFieldValue('isRunning', '');
                            }
                          }}
                        />
                      </Col>
                    </Row>

                    <Row gutter={15}>
                      <Col>
                        <Button size="small" onClick={formProps.handleReset}>Reset</Button>
                        &nbsp;
                        <Button type="primary" size="small" htmlType="submit">Filter</Button>
                      </Col>
                    </Row>
                  </Card>
                </Form>
              )}
            </Formik>
          </Col>
        </Row>
        <br />
        <Row>
          <Col>
            <Table
              dataSource={items}
              rowKey={i => i.id}
              size="small"
              loading={fetching}
              pagination={pagination}
              onChange={newPagination => this.onChange(newPagination, filters)}
            >
              <Table.Column title={this.headerFormat('Name', 'name')} dataIndex="name" />
              <Table.Column title="Advertiser" render={val => this.renderAdvertiser(val.advertiserId)} />
              <Table.Column title="Locations" dataIndex="locations" render={locs => formatLocationList(locs, fetchedLocations)} />
              <Table.Column title="Media" dataIndex="mediaList" render={mediaList => (mediaList && mediaList.length) || 0} />
              <Table.Column
                title="Running"
                dataIndex="isRunning"
                render={isRunning => (
                  <Tag color={isRunning ? 'green' : 'red'}>
                    {isRunning ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column title={this.headerFormat('Start', 'campaignStart')} dataIndex="campaignStart" />
              <Table.Column title={this.headerFormat('End', 'campaignEnd')} dataIndex="campaignEnd" />
              <Table.Column
                title="Enabled"
                dataIndex="isEnabled"
                render={isEnabled => (
                  <Tag color={isEnabled ? 'green' : 'red'}>
                    {isEnabled ? 'Yes' : 'No'}
                  </Tag>
                )}
              />
              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`${ROUTES.CAMPAIGNS}/${i.id}`}>View</ButtonLink>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

CampaignList.propTypes = {
  locations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })).isRequired
};

export default CampaignList;
