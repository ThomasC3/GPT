import {
  Button, Col, Form, Row, Table, Tag, Card
} from 'antd';
import Axios from 'axios';
import { Field, Formik } from 'formik';
import React, { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
import Qs from 'qs';
import { ButtonLink, InputField, SelectField } from '.';
import { Image, Modal } from '../elements';
import { ENDPOINTS, MEDIA_TYPES, ROUTES } from '../utils/constants';
import Media from '../pages/Media';

const INIT_SEARCH = {
  filename: '',
  advertiserId: '',
  advertisementId: ''
};

const INIT_PAGINATION = {
  pageSize: 15, // items per page
  current: 1,
  total: 0
};

const INIT_STATE = {
  fetching: true,
  items: [],
  advertisers: [],
  filters: { ...INIT_SEARCH },
  pagination: { ...INIT_PAGINATION },
  newPagination: false
};

class CampaignList extends Component {
  state = { ...INIT_STATE }

  componentDidMount() {
    this.fetchMediaList();
  }

  componentDidUpdate(prevProps, prevState) {
    const { fetching } = this.state;
    if (!prevState.fetching && fetching) { this.fetchMediaList(); }
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

  fetchMediaList = async () => {
    const { filters, pagination, newPagination } = this.state;
    this.setState({ fetching: true });
    try {
      const data = await Axios({
        url: ENDPOINTS.MEDIA,
        method: 'GET',
        params: {
          filters: {
            ...filters,
            purpose: MEDIA_TYPES.ADVERTISEMENT
          },
          pagination: { ...(newPagination ? INIT_PAGINATION : pagination) }
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
                        title="Add Media"
                        button={<Button type="primary" size="small">Add Media</Button>}
                        destroyOnClose
                        width="70vw"
                        footer={[]}
                      >
                        <Media purpose={MEDIA_TYPES.ADVERTISEMENT} />
                      </Modal>
                    )}
                  >
                    <Row gutter={15} spacing={15}>
                      <Col xs={24} sm={12} md={6}>
                        <Field label="Filename" placeholder="Filter by Filename" name="filename" component={InputField} />
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
                          filterOption={(input, option) => (
                            ((option && option.props.value && option.props.children) || '')
                              .toLowerCase().includes(input.toLowerCase())
                          )}
                          component={SelectField}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Field label="Advertisement ID" placeholder="Filter by Advertisement ID" name="advertisementId" component={InputField} />
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
              <Table.Column
                title="Image"
                dataIndex="sourceUrl"
                render={imgUrl => (
                  <Image
                    src={imgUrl}
                    className="img-thumbnail mt-2"
                    height={50}
                  />
                )}
              />
              <Table.Column title="Filename" dataIndex="filename" />
              <Table.Column title="Advertiser" render={val => this.renderAdvertiser(val.advertisement && val.advertisement.advertiserId)} />
              <Table.Column title="Advertisement ID" dataIndex={['advertisement', 'advertisementId']} />
              <Table.Column title="Url" dataIndex={['advertisement', 'url']} />
              <Table.Column
                title="Age restricted"
                dataIndex={['advertisement', 'ageRestriction']}
                render={ageRestriction => (
                  ageRestriction || <Tag color="green">No</Tag>
                )}
              />

              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`${ROUTES.MEDIA}/${i.id}`}>View</ButtonLink>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default CampaignList;
