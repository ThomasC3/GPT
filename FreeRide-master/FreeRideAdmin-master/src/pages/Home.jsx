import React from 'react';

import { Card, Row, Col } from 'antd';

const Home = props => (
  <Row>
    <Col>
      <Card title="Select a location to manage">
        { props.locations.map(i => (
          <Card.Grid
            key={i.id}
            style={{
              textAlign: 'center', width: '25%', cursor: 'pointer', backgroundColor: i.id === props.activeLocationID ? '#d9d9d9' : '#fff'
            }}
            onClick={() => props.onClick(i.id)}
          >
            {i.name}
          </Card.Grid>
        ))}
      </Card>
    </Col>
  </Row>
);

export default Home;
