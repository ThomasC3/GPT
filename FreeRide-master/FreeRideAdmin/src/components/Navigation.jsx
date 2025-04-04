import React from 'react';
import { withRouter } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ClickOutside from 'react-click-outside';
import SideNav, {
  Toggle, Nav, NavItem, NavIcon, NavText
} from '@trendmicro/react-sidenav';
import styled from 'styled-components';
import '@trendmicro/react-sidenav/dist/react-sidenav.css';

const Navigation = (props) => {
  const {
    expanded, onToggle, onClose, activeLocationID, permissions, routes
  } = props;

  return (
    <ClickOutside onClickOutside={onClose}>
      <StyledSideNav
        expanded={expanded}
        onSelect={(selected) => {
          const { history, location } = props;
          const to = `/${selected}`;
          if (!selected) { return; }
          if (location.pathname !== to) {
            history.push(to);
            onClose();
          }
        }}
        onToggle={onToggle}
      >
        <Toggle />
        <Nav defaultSelected="">
          {
            routes.filter(route => route.showInNav).map(route => (
              (!route.requiresActiveLocation || activeLocationID)
              && (!route.permission || permissions.includes(route.permission)) && (
                <NavItem key={route.path} eventKey={route.path.slice(1)}>
                  <NavIcon>
                    <NavFontIcon icon={route.icon} />
                  </NavIcon>
                  <NavText>
                    {route.text}
                  </NavText>
                </NavItem>
              )
            ))
          }
          <NavItem eventKey="profile">
            <NavIcon>
              <NavFontIcon icon="user" />
            </NavIcon>
            <NavText>Profile</NavText>
          </NavItem>

          <NavItem onClick={async (e) => {
            await props.logout();
          }}
          >
            <NavIcon>
              <NavFontIcon icon="sign-out-alt" />
            </NavIcon>
            <NavText>Sign out</NavText>
          </NavItem>

        </Nav>
      </StyledSideNav>
    </ClickOutside>
  );
};

const StyledSideNav = styled(SideNav)`
  min-height: 100%;
  background-color: #1890ff;
  bottom: unset;
`;

const NavFontIcon = styled(FontAwesomeIcon)`
  font-size: 1.75em;
`;

export default withRouter(Navigation);
