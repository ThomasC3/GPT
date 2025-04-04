import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Button, Spin, Form,
  message, Card, Divider, Tooltip
} from 'antd';
import { Formik, Field } from 'formik';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import {
  InputField, DeleteModal,
  LabelWrapper, AdvertisersDropdown,
  ImageUpload
} from '../components';
import { AUTH0_RESOURCE_TYPES, ENDPOINTS, ROUTES } from '../utils/constants';
import { SmallCard, Image } from '../elements';

const INIT_VALUES = {
  filename: '',
  filetype: '',
  sourceUrl: '',
  sizeInKB: '',
  visualInfo: {},
  advertisement: {},
  purpose: '',
  isDeleted: false
};


const DIMENSION_WARNING = 'Resolution should be under 1280x720 and size under 500KB';
const RATIO_WARNING = 'Ratio should be 16:9';

class Media extends Component {
  state = {
    data: {},
    uploadImageInfo: {}
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
        url: `${ENDPOINTS.MEDIA}/${id}`
      }).then(res => res.data);
      this.setState({ fetching: false, data });
    } catch (e) {
      message.error('An error occurred');
      this.setState({ fetching: false });
    }
  }

  save = (data) => {
    const { match: { params: { id } }, purpose: initialPurpose } = this.props;
    const purpose = data.purpose || initialPurpose;

    return axios({
      method: id ? 'PUT' : 'POST',
      url: `${ENDPOINTS.MEDIA}/${id || ''}`,
      data: { ...data, purpose }
    });
  }

  setUploadImageInfo = (imageInfo) => {
    const {
      filename, filetype, sizeInKB, visualInfo: { width, height, ratio }
    } = imageInfo;
    this.setState({
      uploadImageInfo: {
        filename,
        filetype,
        sizeInKB,
        visualInfo: { width, height, ratio }
      }
    });
  }

  setMediaInfo = (imageInfo, formProps) => {
    const {
      filename, filetype, sourceUrl, sizeInKB, visualInfo: { width, height, ratio }
    } = imageInfo;
    const { data } = this.state;

    formProps.setValues({
      ...formProps.values,
      filename,
      filetype,
      sourceUrl,
      sizeInKB,
      visualInfo: { width, height, ratio }
    });

    this.setState({
      data: {
        ...data,
        filename,
        filetype,
        sourceUrl,
        sizeInKB,
        visualInfo: { width, height, ratio }
      }
    });
  }

  resetUploadImage = () => this.setState({ uploadImageInfo: {} });

  checkRatio = ratio => ratio === '16:9'

  checkSize = sizeInKB => sizeInKB <= 500

  checkWidth = width => width <= 1280

  checkHeight = height => height <= 720

  render() {
    const { fetching, data, uploadImageInfo } = this.state;
    const { sourceUrl } = data;
    const { match: { params: { id } }, history } = this.props;

    const validHeight = this.checkHeight(
      uploadImageInfo.visualInfo && uploadImageInfo.visualInfo.height
    );
    const validWidth = this.checkWidth(
      uploadImageInfo.visualInfo && uploadImageInfo.visualInfo.width
    );
    const validSize = this.checkSize(uploadImageInfo.sizeInKB);
    const validRatio = this.checkRatio(
      uploadImageInfo.visualInfo && uploadImageInfo.visualInfo.ratio
    );

    const showDimensionWarning = !validHeight || !validWidth || !validSize;

    return (
      <Card title="Media">
        <Spin spinning={fetching}>
          <Formik
            enableReinitialize
            initialValues={{ ...INIT_VALUES, ...data }}
            onSubmit={(values, actions) => {
              this.save(values).then((res) => {
                if (!id) {
                  message.success('Media added!');
                  history.push(`${ROUTES.MEDIA}/${res.data.id}`);
                } else {
                  message.success('Media updated!');
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
                <Row gutter={20}>
                  <Col xs={12} sm={12}>
                    <SmallCard title="Current">
                      {id && data.filename && (
                        <div>
                          <Row style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
                            <Image src={sourceUrl} width="90%" />
                          </Row>
                          <Row>
                            <b>Filename: </b>
                            {`${formProps.values.filename} (${formProps.values.filetype})`}
                          </Row>
                          <Row>
                            <b>Size: </b>
                            {`${formProps.values.visualInfo.width}x${formProps.values.visualInfo.height} pixels (${formProps.values.sizeInKB} KB)`}
                          </Row>
                          <Row>
                            <b>Ratio: </b>
                            {formProps.values.visualInfo.ratio}
                          </Row>
                        </div>
                      )}
                      {(id && !data.filename) && (
                        <b>Upload Media first</b>
                      )}
                    </SmallCard>
                  </Col>
                  <Col xs={12} sm={12}>
                    <SmallCard title="Upload">
                      <Row>
                        <ImageUpload
                          mediaId={formProps.values.id}
                          beforeUpload={this.setUploadImageInfo}
                          resetUploadImage={this.resetUploadImage}
                          afterUpload={imageInfo => this.setMediaInfo(imageInfo, formProps)}
                        />
                      </Row>
                      {uploadImageInfo && uploadImageInfo.sizeInKB && (
                        <div>
                          <Row>
                            <b>Filename: </b>
                            {`${uploadImageInfo.filename} (${uploadImageInfo.filetype})`}
                          </Row>
                          <Row>
                            <b>Size: </b>
                            {`${uploadImageInfo.visualInfo.width}x${uploadImageInfo.visualInfo.height} pixels (${uploadImageInfo.sizeInKB} KB)`}
                            { showDimensionWarning && (
                              <Tooltip title={DIMENSION_WARNING}>
                                <span role="img" aria-label="Warning emoji"> ⚠️</span>
                              </Tooltip>
                            )}
                          </Row>
                          <Row>
                            <b>Ratio: </b>
                            {uploadImageInfo.visualInfo.ratio}
                            { !validRatio && (
                              <Tooltip title={RATIO_WARNING}>
                                <span role="img" aria-label="Warning emoji"> ⚠️</span>
                              </Tooltip>
                            )}
                          </Row>
                        </div>
                      )}
                    </SmallCard>
                  </Col>
                </Row>
                <br />
                <SmallCard title="Advertisement Details">
                  <Row gutter={15}>
                    <Col xs={6} sm={6}>
                      <Field label="Advertisement ID" name="advertisement.advertisementId" component={InputField} />
                    </Col>
                    <Col xs={6} sm={6}>
                      <LabelWrapper label="Advertiser">
                        <AdvertisersDropdown
                          value={formProps.values.advertisement.advertiserId}
                          onChange={selection => formProps.setFieldValue('advertisement.advertiserId', selection)}
                        />
                      </LabelWrapper>
                    </Col>
                  </Row>
                  <Row gutter={15}>
                    <Col xs={6} sm={6}>
                      <Field label="URL" name="advertisement.url" component={InputField} />
                    </Col>
                    <Col xs={6} sm={6}>
                      <Field label="Age restriction" name="advertisement.ageRestriction" component={InputField} />
                    </Col>
                  </Row>
                </SmallCard>
                <Divider />
                <Row>
                  <Col>
                    {(id && !data.isDeleted) && (
                      <DeleteModal
                        url={`${ENDPOINTS.MEDIA}/${id}`}
                        onSuccess={() => history.replace(ROUTES.ADVERTISEMENTS)}
                        resourceType={AUTH0_RESOURCE_TYPES.MEDIA}
                        title="Delete Media?"
                        confirmMessage="Are you sure you want to delete this Media?"
                        warningMessage="⚠️ This will remove the media from all campaigns! ⚠️"
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

Media.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    })
  }),
  history: PropTypes.shape({
    push: PropTypes.func.isRequired
  }).isRequired,
  purpose: PropTypes.string
};

Media.defaultProps = {
  purpose: ''
};

Media.defaultProps = {
  match: {
    params: {
      id: null
    }
  }
};


export default withRouter(Media);
