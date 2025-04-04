import React, { Component } from 'react';
import {
  Col, Collapse, Button, Card, Icon
} from 'antd';
import { Field } from 'formik';
import { Row, SmallCard } from '../../elements';
import { InputField } from '..';
import SubmitLocation from './SubmitLocation';

const { Panel } = Collapse;

class LocationDetails extends Component {
  genExtra = index => (
    <Icon
      type="delete"
      onClick={(event) => {
        this.removeLocale(index);
        event.stopPropagation();
      }}
    />
  );

  addLocale = () => {
    const copyData = this.props.formProps.values.copyData;
    copyData.push({ localeName: 'New locale' });

    this.props.setCopyData(copyData);
  };

  removeLocale = (index) => {
    const copyData = this.props.formProps.values.copyData;
    copyData.splice(index, 1);
    this.props.setCopyData(copyData);
  };

  render() {
    const { formProps } = this.props;
    const id = this.props.locationIdParam;

    return (
      <>
        <Collapse accordion>
          <Panel header="English (en) Default" key="1">
            <Row gutter={15} spacing={15}>
              <Col xs={24} sm={24} md={24} lg={12}>
                <SmallCard type="inner" title="Suspended Information">
                  <Row gutter={15}>
                    <Col xs={24}>
                      <Field label="Closed Copy" name="closedCopy" component={InputField} type="textarea" row={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="Suspended Title" name="suspendedTitle" component={InputField} type="textarea" rows={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="Suspended Copy" name="suspendedCopy" component={InputField} type="textarea" rows={4} />
                    </Col>
                  </Row>
                </SmallCard>
                <SmallCard type="inner" title="Payment Information" style={{ marginTop: '1rem' }}>
                  <Row gutter={15}>
                    <Col xs={24}>
                      <Field label="Powered By" name="poweredBy" component={InputField} type="textarea" row={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="Rides Fare Copy" name="ridesFareCopy" component={InputField} type="textarea" row={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="PWYW App Copy" name="pwywCopy" component={InputField} type="textarea" rows={4} />
                    </Col>
                  </Row>
                </SmallCard>
              </Col>
              <Col xs={24} sm={24} md={24} lg={12}>
                <SmallCard type="inner" title="Alert Information">
                  <Row gutter={15}>
                    <Col xs={24}>
                      <Field label="Alert Title" name="alert.title" component={InputField} type="textarea" row={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="Alert Copy" name="alert.copy" component={InputField} type="textarea" rows={4} />
                    </Col>
                  </Row>
                </SmallCard>
                <SmallCard type="inner" title="Failed Age Requirement Alert" style={{ marginTop: '1rem' }}>
                  <Row gutter={15}>
                    <Col xs={24}>
                      <Field label="Title" name="failedAgeRequirementAlert.title" component={InputField} type="textarea" row={4} />
                    </Col>
                    <Col xs={24}>
                      <Field label="Copy" name="failedAgeRequirementAlert.copy" component={InputField} type="textarea" rows={4} />
                    </Col>
                  </Row>
                </SmallCard>
              </Col>
            </Row>
          </Panel>

          {
            (formProps.values.copyData.length > 0)
            && formProps.values.copyData.map((copy, index) => (
              <Panel header={`${copy.localeName} (${copy.locale})`} key={index + 2} extra={this.genExtra(index)}>
                <Row gutter={15} spacing={15}>
                  <Col xs={24} sm={24} md={24} lg={12}>
                    <SmallCard type="inner" title="Suspended Information">
                      <Row gutter={15}>
                        <Col xs={12}>
                          <Field label="Locale code" name={`copyData[${index}].locale`} component={InputField} type="textarea" rows={1} />
                        </Col>
                        <Col xs={12}>
                          <Field label="Locale name" name={`copyData[${index}].localeName`} component={InputField} type="textarea" rows={1} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Closed Copy" name={`copyData[${index}].closedCopy`} component={InputField} type="textarea" row={4} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Suspended Title" name={`copyData[${index}].suspendedTitle`} component={InputField} type="textarea" rows={4} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Suspended Copy" name={`copyData[${index}].suspendedCopy`} component={InputField} type="textarea" rows={4} />
                        </Col>
                      </Row>
                    </SmallCard>
                    <SmallCard type="inner" title="Payment Information">
                      <Row gutter={15}>
                        <Col xs={24}>
                          <Field label="PWYW App Copy" name={`copyData[${index}].pwywCopy`} component={InputField} type="textarea" rows={4} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Rides Fare Copy" name={`copyData[${index}].ridesFareCopy`} component={InputField} type="textarea" rows={4} />
                        </Col>
                      </Row>
                    </SmallCard>
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={12}>
                    <SmallCard type="inner" title="Alert Information">
                      <Row gutter={15}>
                        <Col xs={24}>
                          <Field label="Alert Title" name={`copyData[${index}].alert.title`} component={InputField} type="textarea" row={4} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Alert Copy" name={`copyData[${index}].alert.copy`} component={InputField} type="textarea" rows={4} />
                        </Col>
                      </Row>
                    </SmallCard>
                    <SmallCard type="inner" title="Failed Age Requirement Alert" style={{ marginTop: '1rem' }}>
                      <Row gutter={15}>
                        <Col xs={24}>
                          <Field label="Title" name={`copyData[${index}].failedAgeRequirementAlert.title`} component={InputField} type="textarea" row={4} />
                        </Col>
                        <Col xs={24}>
                          <Field label="Copy" name={`copyData[${index}].failedAgeRequirementAlert.copy`} component={InputField} type="textarea" rows={4} />
                        </Col>
                      </Row>
                    </SmallCard>
                  </Col>
                </Row>
              </Panel>
            ))
          }
        </Collapse>

        <Row gutter={15} spacing={15}>
          <Col xs={24} sm={24} md={24} lg={24}>
            <Card bordered={false}>
              <div style={{ float: 'right' }}>
                <Button
                  type="primary"
                  shape="circle"
                  style={{ float: 'right' }}
                  disabled={formProps.isSubmitting}
                  onClick={this.addLocale}
                >
                    +
                </Button>
              </div>
            </Card>
          </Col>
        </Row>

        <SubmitLocation id={id} formProps={formProps} />
      </>
    );
  }
}

export default LocationDetails;
