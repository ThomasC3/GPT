import * as React from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Row, Col, message } from 'antd';
import { library } from '@fortawesome/fontawesome-svg-core';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import Pages from './pages';
import {
  Navigation, LocationDropdown, Profile, ProtectedRoute, ConditionalRoute, PageSpinner, Grid
} from './components';
import routes from './routes';

Object.entries(Icons.fas).forEach(icon => library.add(icon[1]));

const grid2 = {
  xs: 24, sm: 24, md: 20, lg: { span: 18, offset: 3 }, xl: { span: 12, offset: 6 }
};

const isAllowed = (requiredPermission, userPermissions = []) => !requiredPermission || userPermissions.includes(requiredPermission);

const App = () => {
  const [expanded, setExpanded] = React.useState(false);
  message.config({ top: 50 });

  const onToggleNav = () => setExpanded(!expanded);
  const onCloseNav = () => setExpanded(false);

  return (
    <div className="App">
      <Profile.Provider>
        <Profile.ProfileContext.Consumer>
          {(context) => {
            const {
              accessToken, activeLocationID, locations, fetching, permissions
            } = context;
            if (fetching) {
              return <PageSpinner size="large" />;
            }
            return (
              accessToken ? (
                <React.Fragment>
                  <Header>
                    <LocationDropdown
                      locations={locations}
                      value={activeLocationID}
                      onLocationChange={context.activeLocationChange}
                    />
                    <div style={{ float: 'right', color: '#fff', marginRight: '5px' }}>
                      {`v${process.env.REACT_APP_VERSION}`}
                    </div>
                  </Header>
                  <Router>
                    <Main>
                      <Navigation
                        expanded={expanded}
                        onToggle={onToggleNav}
                        onClose={onCloseNav}
                        activeLocationID={activeLocationID}
                        logout={context.logout}
                        permissions={permissions}
                        routes={routes}
                      />
                      <Content expanded={expanded}>
                        <Switch>
                          <Route
                            exact
                            path="/"
                            render={props => (
                              <Row>
                                <Col {...grid2}>
                                  <Pages.Home
                                    {...props}
                                    locations={locations}
                                    activeLocationID={activeLocationID}
                                    onClick={(id) => {
                                      context.activeLocationChange(id);
                                      if (props.location.pathname === '/') {
                                        props.history.push('/activity');
                                      }
                                    }}
                                  />
                                </Col>
                              </Row>
                            )}
                          />
                          {routes.map((route) => {
                            const RouteComponent = route.requiresActiveLocation
                              ? ConditionalRoute
                              : ProtectedRoute;
                            return (
                              <RouteComponent
                                key={route.path}
                                exact={route.exact}
                                path={route.path}
                                isAllowed={isAllowed(route.permission, permissions)}
                                condition={route.requiresActiveLocation ? activeLocationID : true}
                                render={props => (
                                  <route.component
                                    {...props}
                                    {...route.props}
                                    location={activeLocationID}
                                     // TODO: The initial App list has some components with location, and some with activeLocation.
                                     // Which points to the same thing. This has been integrated far into the app
                                     // and will need a lot of file changes to fix.
                                    activeLocation={activeLocationID}
                                    locations={locations}
                                    permissions={permissions}
                                  />
                                )}
                              />
                            );
                          })}
                          <Route
                            exact
                            path="/profile"
                            render={props => (
                              <Grid col={grid2} {...props} {...context} component={Pages.Profile} />
                            )}
                          />
                          <Route render={() => 'Page Not Found'} />
                        </Switch>
                      </Content>
                    </Main>
                  </Router>
                </React.Fragment>
              ) : (
                <Router>
                  <Switch>
                    <Route path="/forgot-password" component={Pages.ForgotPassword} />
                    <Route render={() => <Pages.Login onLogin={context.login} />} />
                  </Switch>
                </Router>
              )
            );
          }}
        </Profile.ProfileContext.Consumer>
      </Profile.Provider>
    </div>
  );
};

const navWidthCollapsed = 64;
const navWidthExpanded = 240;
const headerHeight = 35;

const Header = styled.header`
  width: 100%;
  height: ${headerHeight}px;
  background: rgb(24, 144, 255);
  position: fixed;
  z-index: 2000;

  > :first-child {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

const Main = styled.main`
  width: 100%;
  position: relative;
  top: ${headerHeight}px;
  transition: all .15s;
`;

const Content = styled.div`
  padding: 0 15px;
  padding-top: 15px;
  margin-left: ${props => (props.expanded ? navWidthExpanded : navWidthCollapsed)}px;
  transition: all .15s;
`;

export default App;
