import moment from 'moment';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  message, Card, Row, Col
} from 'antd';
import { FluxTag } from '.';

class LiveMetrics extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      fetching: false
    };
    this.timer = null;
  }

  componentDidMount() {
    this.autoFetch();
  }

  componentDidUpdate(prevProps) {
    const { location } = this.props;
    if (location !== prevProps.location) {
      this.autoFetch();
    }
  }

  componentWillUnmount() {
    this.stopAutoFetch();
  }

  autoFetch = () => {
    this.stopAutoFetch();
    this.timer = setInterval(this.fetch, 10 * 1000);
    this.fetch();
  }

  stopAutoFetch = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  fetch = async () => {
    const { fetching } = this.state;
    const { location } = this.props;
    if (fetching) {
      return;
    }

    this.setState({ fetching: true });
    try {
      const { data: tag } = await axios.get('/v1/metrics', {
        params: { location, timestamp: moment.utc().format('YYYY-MM-DD HH:mm') }
      });

      this.setState({ tag });
    } catch (error) {
      message.error('An error occured while getting tag information');
      this.stopAutoFetch();
    } finally {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { tag } = this.state;
    return (
      <Card>
        { (tag && Number.isFinite(tag.measurement)) && (
        <Row>
          <Col>
            <Row>
              <Col sm={6}>
                <FluxTag
                  tag={
                    (tag && Number.isFinite(tag.measurement)) ? tag.measurement : null
                  }
                />
              </Col>
              <Col sm={6}>
                { `Wait time: ${
                  (tag && Number.isFinite(tag.instantaneous)) ? tag.instantaneous.toFixed(2) : '--'
                } mins`}
              </Col>
              <Col sm={6}>
                { `Historic average: ${(tag && Number.isFinite(tag.avg)) ? tag.avg.toFixed(2) : '--'} mins` }
              </Col>
              <Col sm={6}>
                { 'Intervals: '}
                <em style={{ color: 'green' }}>
                  { ` < ${
                    (tag && Number.isFinite(tag.p30)) ? tag.p30.toFixed(2) : '--'
                  }, ${
                    (tag && Number.isFinite(tag.p60)) ? tag.p60.toFixed(2) : '--'}[`
                  }
                </em>
                <em style={{ color: 'gold' }}>
                  { ` [${
                    (tag && Number.isFinite(tag.p60)) ? tag.p60.toFixed(2) : '--'
                  }, ${
                    (tag && Number.isFinite(tag.p70)) ? tag.p70.toFixed(2) : '--'}[`
                  }
                </em>
                <em style={{ color: 'red' }}>
                  { ` >= ${(tag && Number.isFinite(tag.p70)) ? tag.p70.toFixed(2) : '--'}` }
                </em>
              </Col>
            </Row>
          </Col>
        </Row>
        )}
        { !(tag && Number.isFinite(tag.measurement)) && (
          <em style={{ color: 'grey' }}>
            { 'No data available' }
          </em>
        )}
      </Card>
    );
  }
}

LiveMetrics.propTypes = {
  tag: PropTypes.shape({
    measurement: PropTypes.number,
    instantaneous: PropTypes.number,
    intervals: PropTypes.shape({
      avg: PropTypes.number,
      p30: PropTypes.number,
      p40: PropTypes.number,
      p60: PropTypes.number,
      p70: PropTypes.number
    })
  })
};

LiveMetrics.defaultProps = {
  tag: {}
};

export default LiveMetrics;
