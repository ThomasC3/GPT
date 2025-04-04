import * as React from 'react';
import PropTypes from 'prop-types';
import { Spin, Transfer } from 'antd';
import axios from 'axios';

class LocationsSelector extends React.PureComponent {
  state={
    locations: [],
    fetching: true
  }

  componentDidMount() {
    this.fetch();
  }

  fetch = async () => {
    this.setState({ fetching: true });
    const params = {
      limit: 100
    };
    try {
      const data = await axios({
        url: '/v1/locations',
        params
      }).then(res => res.data);
      this.setState({ fetching: false, locations: data.items });
    } catch (e) {
      this.setState({ fetching: false });
    }
  }

  render() {
    const { locations, fetching } = this.state;
    const { values, onChange } = this.props;
    return (
      <Spin spinning={fetching}>
        <Transfer
          dataSource={locations.map(i => ({ key: i.id, title: i.name }))}
          titles={['Locations', 'Manages']}
          listStyle={{ width: 200, height: 200, marginTop: '8px' }}
          targetKeys={values}
          onChange={onChange}
          render={i => <span>{i.title}</span>}
        />
      </Spin>

    );
  }
}

LocationsSelector.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired
};

export default LocationsSelector;
