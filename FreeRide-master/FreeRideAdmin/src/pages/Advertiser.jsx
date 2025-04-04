import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import {
  Card, Row, Col, Button, Spin, Form, message,
  Divider
} from 'antd';
import {
  Formik, Field, ErrorMessage, FieldArray
} from 'formik';
import axios from 'axios';
import { InputField, CampaignSelector, DeleteModal } from '../components';
import { FormItem } from '../elements';
import { ENDPOINTS, ROUTES, AUTH0_RESOURCE_TYPES } from '../utils/constants';

const INIT_VALUES = {
  name: '',
  clientId: '',
  isDeleted: false
};

class Advertiser extends Component {
  state = {
    data: {}
  };

  componentDidMount() {
    const { match: { params: { id } } } = this.props;

    if (id) {
      this.fetch(id);
    } else {
      this.setState({ fetching: false });
    }
  }

  fetch = async (id) => {
    this.setState({ fetching: true });
    try {
      const data = await axios({
        url: `${ENDPOINTS.ADVERTISERS}/${id}`
      }).then(res => res.data);
      this.setState({ fetching: false, data });
    } catch (e) {
      message.error('An error occurred');
      this.setState({ fetching: false });
    }
  }

  save = (data) => {
    const { match: { params: { id } } } = this.props;

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `${ENDPOINTS.ADVERTISERS}/${id || ''}`,
      data
    });
  }

  render() {
    const { fetching, data } = this.state;
    const { match: { params: { id } }, history } = this.props;

    return (
      <Card title="Advertiser">
        <Spin spinning={fetching}>
          <Formik
            enableReinitialize
            initialValues={{ ...INIT_VALUES, ...data }}
            onSubmit={(values, actions) => {
              this.save(values).then((res) => {
                if (!id) {
                  message.success('Advertiser created!');
                  history.push(`${ROUTES.ADVERTISERS}/${res.data.id}`);
                } else {
                  message.success('Advertiser updated!');
                  this.setState(res.data);
                  actions.setSubmitting(false);
                }
              }).catch((error) => {
                const errorMessage = error.response
                  && error.response.data
                  && error.response.data.message;

                message.error(errorMessage || 'An error occurred');
                actions.setSubmitting(false);
              });
            }}
          >
            {formProps => (
              <Form onSubmit={formProps.handleSubmit}>
                <Row gutter={15}>
                  <Col xs={6} sm={6}>
                    <Field label="Name" name="name" component={InputField} />
                  </Col>
                </Row>
                <Row gutter={15}>
                  <Col xs={6} sm={6}>
                    <Field label="Client ID" name="clientId" component={InputField} />
                  </Col>
                </Row>
                <Row>
                  { data && data.id && (
                    <FormItem label="Campaigns">
                      <FieldArray
                        name="campaigns"
                        render={arrayHelpers => (
                          <CampaignSelector
                            availableForAdvertiserId={data.id}
                            values={formProps.values.campaigns}
                            onChange={(target, direction, moved) => {
                              if (direction === 'left') {
                                const popIndexes = [];
                                moved.forEach((i) => {
                                  const index = formProps.values.campaigns.findIndex(
                                    cam => cam === i
                                  );
                                  if (index !== -1) {
                                    popIndexes.push(index);
                                  }
                                });
                                popIndexes.sort();
                                let change = 0;
                                popIndexes.forEach((i) => {
                                  arrayHelpers.remove(i - change);
                                  change += 1;
                                });
                              } else {
                                moved.forEach(i => arrayHelpers.push(i));
                              }
                            }}
                          />
                        )}
                      />
                      <ErrorMessage name="campaigns" style={{ color: 'red' }} />
                    </FormItem>
                  )}
                </Row>
                <Divider />
                <Row gutter={15}>
                  <Col>
                    {(id && !data.isDeleted) && (
                      <DeleteModal
                        url={`${ENDPOINTS.ADVERTISERS}/${id}`}
                        onSuccess={() => history.replace(ROUTES.ADVERTISERS)}
                        resourceType={AUTH0_RESOURCE_TYPES.ADVERTISEMENT}
                        title="Delete Advertiser?"
                        confirmMessage={`Are you sure you want to delete ${data.name} (${data.clientId})?`}
                        warningMessage="⚠️ This will delete all campaigns and media associated with this advertiser! ⚠️"
                      />
                    )}
                    <Button size="small" style={{ float: 'right' }} type="primary" htmlType="submit" disabled={formProps.isSubmitting}>{id ? 'Update' : 'Create'}</Button>
                  </Col>
                </Row>
              </Form>
            )}
          </Formik>
        </Spin>
      </Card>
    );
  }
}

Advertiser.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    })
  }),
  history: PropTypes.shape({
    push: PropTypes.func.isRequired
  }).isRequired
};

Advertiser.defaultProps = {
  match: {
    params: {
      id: null
    }
  }
};

export default withRouter(Advertiser);
