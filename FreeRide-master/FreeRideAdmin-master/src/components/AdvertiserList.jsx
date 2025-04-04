import {
  Button, Col, Form, Row, Table, Card
} from 'antd';
import Axios from 'axios';
import { Field, Formik } from 'formik';
import React, { Component, Fragment } from 'react';
import Qs from 'qs';
import { ButtonLink, InputField } from '.';
import { formatCampaignList } from '../utils/format';
import { ENDPOINTS, ROUTES } from '../utils/constants';
import Advertiser from '../pages/Advertiser';
import { Modal } from '../elements';

const INIT_SEARCH = {
  name: '',
  clientId: ''
};

const INIT_PAGINATION = {
  pageSize: 15, // items per page
  current: 1,
  total: 0
};

const initialState = {
  fetching: true,
  items: [],
  filters: { ...INIT_SEARCH },
  pagination: { ...INIT_PAGINATION },
  newPagination: false
};

class AdvertiserList extends Component {
  state = { ...initialState }

  componentDidMount() {
    this.fetchAdvertiserList();
  }

  componentDidUpdate(prevProps, prevState) {
    const { fetching } = this.state;
    if (!prevState.fetching && fetching) { this.fetchAdvertiserList(); }
  }

  onChange = (pagination, filters) => {
    const { filters: stateFilters, pagination: statePagination } = this.state;
    this.setState({
      filters: { ...stateFilters, ...filters },
      pagination: { ...statePagination, ...pagination },
      fetching: true
    });
  }

  onReset = () => { this.setState({ ...initialState }); }

  fetchAdvertiserList = async () => {
    this.setState({ fetching: true });
    const { filters, pagination, newPagination } = this.state;
    try {
      const data = await Axios({
        url: ENDPOINTS.ADVERTISERS,
        method: 'GET',
        params: {
          filters,
          pagination: { ...(newPagination ? INIT_PAGINATION : pagination) }
        },
        paramsSerializer: p => Qs.stringify(p, { arrayFormat: 'brackets' })
      }).then(res => res.data);

      this.setState({
        items: data.items,
        fetching: false,
        pagination: { ...(newPagination ? INIT_PAGINATION : pagination), total: data.total },
        newPagination: false
      });
    } catch (error) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const {
      items,
      filters, pagination, fetching
    } = this.state;
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
                        title="New Advertiser"
                        button={<Button type="primary" size="small">New Advertiser</Button>}
                        destroyOnClose
                        width="50vw"
                        footer={[]}
                      >
                        <Advertiser />
                      </Modal>
                    )}
                  >
                    <Row gutter={15} spacing={15}>
                      <Col xs={24} sm={12} md={6}>
                        <Field label="Name" placeholder="Filter by Name" name="name" component={InputField} />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Field label="Client ID" placeholder="Filter by Client ID" name="clientId" component={InputField} />
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
              <Table.Column title="Name" dataIndex="name" />
              <Table.Column title="Client ID" dataIndex="clientId" />
              <Table.Column title="Active Campaigns" dataIndex="campaigns" render={campaigns => formatCampaignList(campaigns.filter(camp => camp.isRunning))} />
              <Table.Column title="" dataIndex="action" render={(text, i) => <ButtonLink size="small" type="primary" to={`${ROUTES.ADVERTISERS}/${i.id}`}>View</ButtonLink>} />
            </Table>
          </Col>
        </Row>
      </Fragment>
    );
  }
}

export default AdvertiserList;
