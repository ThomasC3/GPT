import * as React from 'react';
import Components from './Login/components';
import { Image } from '../elements';
import Logo from '../assets/images/logo.png';

const {
  Body,
  Container,
  LogoContainer,
  Button
} = Components;

const Login = props => (
  <Body>
    <Container>
      <LogoContainer>
        <Image src={Logo} alt="Logo" width="100%" />
      </LogoContainer>

      <Container>
        <Button type="primary" onClick={() => props.onLogin()}>Login</Button>
      </Container>
    </Container>
  </Body>
);

export default Login;
