import * as React from 'react';
import Unavailable from '../assets/images/unavailable.png';


const Image = props => (
  <img {...props} src={props.src ? props.src : Unavailable} alt="" />
);

export default Image;
