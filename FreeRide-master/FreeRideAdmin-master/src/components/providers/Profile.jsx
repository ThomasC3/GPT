import * as React from 'react';
import axios from 'axios';
import { message } from 'antd';
import { withAuth0 } from '@auth0/auth0-react';
import jwtDecode from 'jwt-decode';
import { setupAxiosInterceptors } from '../../utils/auth';

const ProfileContext = React.createContext();

const INIT = {
  activeLocationID: '',
  email: '',
  firstName: '',
  id: '',
  lastName: '',
  locations: [],
  role: undefined,
  accessToken: '',
  fetching: true,
  permissions: []
};
class Provider extends React.Component {
  state = {
    ...INIT
  }

  componentDidMount() {
    setupAxiosInterceptors(this.logout);
  }

  componentDidUpdate(prevProps) {
    const { auth0 } = this.props;
    if (prevProps.auth0.isAuthenticated !== auth0.isAuthenticated
        || prevProps.auth0.isLoading !== auth0.isLoading) {
      this.checkAuthentication();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  setAccessToken(token = '') {
    axios.defaults.headers.common.Authorization = token ? `bearer ${token}` : undefined;
  }

  checkAuthentication = async () => {
    const { auth0 } = this.props;
    const activeLocationID = localStorage.getItem('activeLocationID');

    if (!auth0.isLoading) {
      try {
        if (auth0.error) {
          message.error(auth0.error.message);
          auth0.logout();
          throw new Error(auth0.error);
        }
        const accessToken = await auth0.getAccessTokenSilently();
        this.setAccessToken(accessToken);
        const decodedToken = jwtDecode(accessToken);
        this.setState({ permissions: decodedToken.permissions, activeLocationID });
        this.setUserProfile(auth0.user, accessToken);
        this.fetchAdminLocations();
      } catch (error) {
        this.setState({ fetching: false });
      }
    }
  }

  fetchAdminLocations = async () => {
    const { data } = await axios.get('/v1/locations', { params: { limit: 0 } });
    this.setState({ locations: data.items });
  }

  setUserProfile = (user, accessToken) => {
    this.setState({
      email: user.email,
      firstName: user.given_name,
      lastName: user.family_name,
      id: user.sub,
      accessToken,
      fetching: false
    });
  }

  login = () => {
    const { auth0 } = this.props;
    auth0.loginWithRedirect();
  }

  logout = () => {
    this.setState({ fetching: true });
    const { auth0 } = this.props;
    auth0.logout({
      logoutParams: { returnTo: window.location.origin }
    });
    this.setAccessToken();
    localStorage.setItem('activeLocationID', '');
    this.setState({ ...INIT, fetching: false });
  }

  activeLocationChange = (activeLocationID) => {
    localStorage.setItem('activeLocationID', activeLocationID);
    this.setState({ activeLocationID });
  }

  isTokenExpired(token) {
    const decodedToken = jwtDecode(token);
    const { exp } = decodedToken;
    const currentTime = Math.floor(Date.now() / 1000);
    this.setState({ permissions: decodedToken.permissions });
    const isExpired = exp < currentTime;
    return isExpired;
  }

  render() {
    const { children } = this.props;
    return (
      <ProfileContext.Provider
        value={{
          ...this.state,
          login: this.login,
          logout: this.logout,
          activeLocationChange: this.activeLocationChange
        }}
      >
        {children}
      </ProfileContext.Provider>
    );
  }
}

const Auth0Provider = withAuth0(Provider);

export default {
  Provider: Auth0Provider,
  ProfileContext
};
