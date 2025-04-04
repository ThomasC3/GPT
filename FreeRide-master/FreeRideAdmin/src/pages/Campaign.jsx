import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Row, Col, Button, Spin, Form,
  DatePicker, message, Card,
  Divider, Tag
} from 'antd';
import {
  Formik, Field, FieldArray, ErrorMessage
} from 'formik';
import moment from 'moment-timezone';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import { FormItem } from '../elements';
import {
  InputField, DeleteModal,
  CheckboxField, LocationsSelector, MediaSelector,
  LabelWrapper, AdvertisersDropdown
} from '../components';

import { common } from '../utils';
import {
  AUTH0_RESOURCE_TYPES, ENDPOINTS, ROUTES
} from '../utils/constants';

const { ERROR_STATE } = common;

const INIT_VALUES = {
  name: '',
  advertiserId: null,
  start: null,
  end: null,
  locations: [],
  featuredMedia: null,
  mediaList: [],
  isEnabled: true,
  isDeleted: false
};
class Campaign extends Component {
  state = {
    data: {}
  }

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
        url: `${ENDPOINTS.CAMPAIGNS}/${id}`
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
      url: `${ENDPOINTS.CAMPAIGNS}/${id || ''}`,
      data
    });
  }

  determineRunningTag = (campaign) => {
    const {
      isDeleted, isEnabled, campaignStart, campaignEnd
    } = campaign;

    if (isDeleted) {
      return <Tag color="red">Deleted</Tag>;
    }

    const currentDate = moment();
    const startDate = campaignStart ? moment(campaignStart, 'MM/DD/YYYY').tz('America/New_York', true).startOf('day') : null;
    const endDate = campaignEnd ? moment(campaignEnd, 'MM/DD/YYYY').tz('America/New_York', true).endOf('day') : null;

    if (!startDate || !startDate.isValid() || !endDate || !endDate.isValid()) {
      return <Tag color="red">Invalid Dates</Tag>;
    }

    const isRunning = isEnabled && currentDate.isBetween(startDate, endDate, null, '[]');

    return (
      <Tag color={isRunning ? 'green' : 'red'}>
        {isRunning ? 'Yes' : 'No'}
      </Tag>
    );
  }

  render() {
    const { fetching, data } = this.state;
    const { match: { params: { id } }, history } = this.props;

    return (
      <Card title="Campaign">
        <Spin spinning={fetching}>
          <Formik
            enableReinitialize
            initialValues={{ ...INIT_VALUES, ...data }}
            onSubmit={(values, actions) => {
              this.save(values).then((res) => {
                if (!id) {
                  message.success('Campaign created!');
                  history.push(`${ROUTES.CAMPAIGNS}/${res.data.id}`);
                } else {
                  message.success('Campaign updated!');
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
                  <Col xs={6} sm={6}>
                    <LabelWrapper label="Advertiser">
                      <AdvertisersDropdown
                        value={formProps.values.advertiserId}
                        onChange={(selection) => {
                          formProps.setFieldValue('advertiserId', selection);
                          if (formProps.values.advertiserId !== selection) {
                            formProps.setFieldValue('featuredMedia', null);
                            formProps.setFieldValue('mediaList', []);
                          }
                        }}
                      />
                    </LabelWrapper>
                  </Col>
                </Row>

                <Row gutter={15}>
                  <Col xs={4} sm={4} style={{ maxWidth: '100px', flex: '0 0 auto' }}>
                    <LabelWrapper label="Running">
                      {this.determineRunningTag(formProps.values)}
                    </LabelWrapper>
                  </Col>
                  <Col xs={4} sm={4} style={{ maxWidth: '100px', flex: '0 0 auto' }}>
                    <LabelWrapper label="Enabled">
                      <Field name="isEnabled" component={CheckboxField} />
                    </LabelWrapper>
                  </Col>
                  <Col xs={6} sm={6} style={{ maxWidth: '250px', flex: '0 0 auto' }}>
                    <FormItem label="Date Interval" {...ERROR_STATE('campaignStart')}>
                      <DatePicker.RangePicker
                        disabled={!formProps.values.isEnabled}
                        allowClear={false}
                        size="small"
                        format="MM/DD/YYYY"
                        onOpenChange={() => formProps.setFieldTouched('campaignStart')}
                        value={[
                          formProps.values.campaignStart ? moment(formProps.values.campaignStart, 'MM/DD/YYYY') : null,
                          formProps.values.campaignEnd ? moment(formProps.values.campaignEnd, 'MM/DD/YYYY') : null
                        ]}
                        onChange={(dates) => {
                          if (dates) {
                            const [campaignStart, campaignEnd] = dates;
                            formProps.setFieldValue('campaignStart', campaignStart.format('MM/DD/YYYY'));
                            formProps.setFieldValue('campaignEnd', campaignEnd.format('MM/DD/YYYY'));
                          } else {
                            formProps.setFieldValue('campaignStart', '');
                            formProps.setFieldValue('campaignEnd', '');
                          }
                        }}
                      />
                    </FormItem>
                  </Col>
                </Row>
                <Divider />
                <Row>
                  <FormItem label="Locations">
                    <FieldArray
                      name="locations"
                      render={arrayHelpers => (
                        <LocationsSelector
                          values={formProps.values.locations}
                          onChange={(target, direction, moved) => {
                            if (direction === 'left') {
                              const popIndexes = [];
                              moved.forEach((i) => {
                                const index = formProps.values.locations.findIndex(
                                  loc => loc === i
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
                    <ErrorMessage name="locations" style={{ color: 'red' }} />
                  </FormItem>
                </Row>
                {formProps.values.advertiserId && (
                  <div>
                    <Divider />
                    <Row>
                      <FieldArray
                        name="mediaList"
                        render={arrayHelpers => (
                          <MediaSelector
                            values={formProps.values.mediaList}
                            advertiserId={formProps.values.advertiserId}
                            withFeaturedMedia
                            featuredMedia={formProps.values.featuredMedia}
                            onFeaturedMediaChange={(value) => {
                              formProps.setFieldValue('featuredMedia', value);
                            }}
                            onChange={(target, direction, moved) => {
                              if (direction === 'left') {
                                const popIndexes = [];
                                moved.forEach((i) => {
                                  const index = formProps.values.mediaList.findIndex(
                                    med => med === i
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
                              if (!target.includes(formProps.values.featuredMedia)) {
                                formProps.setFieldValue('featuredMedia', null);
                              }
                            }}
                          />
                        )}
                      />
                      <ErrorMessage name="mediaList" style={{ color: 'red' }} />
                    </Row>
                  </div>
                )}
                <Divider />
                <Row>
                  <Col>
                    {(id && !data.isDeleted) && (
                      <DeleteModal
                        url={`${ENDPOINTS.CAMPAIGNS}/${id}`}
                        onSuccess={() => history.replace(ROUTES.CAMPAIGNS)}
                        resourceType={AUTH0_RESOURCE_TYPES.ADVERTISEMENTS}
                        title="Delete Campaign?"
                        confirmMessage={`Are you sure you want to delete ${data.name}?`}
                        warningMessage="⚠️ This will remove the campaign from the advertiser! ⚠️"
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


Campaign.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    })
  }),
  history: PropTypes.shape({
    push: PropTypes.func.isRequired
  }).isRequired
};

Campaign.defaultProps = {
  match: {
    params: {
      id: null
    }
  }
};

export default withRouter(Campaign);
