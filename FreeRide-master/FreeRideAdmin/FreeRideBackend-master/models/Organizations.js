import { env } from '../config';

const organizationMapping = env === 'production' ? {
  'frb.gov': '8F2G7KL9X3RMQ5YT',
  'whitesmith.co': 'XS71GBXEEGK8235A'

} : {
  'ridecircuit.com': 'V413G0GC5GZLL84U',
  'whitesmith.co': 'XS71GBXEEGK8235A'
};

Object.freeze(organizationMapping);

export default organizationMapping;
