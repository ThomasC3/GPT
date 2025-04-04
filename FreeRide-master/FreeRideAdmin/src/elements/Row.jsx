import { Row as RowAnt } from 'antd';
import styled from 'styled-components';

const Row = styled(RowAnt)`
  && {
    margin-bottom: ${({ spacing }) => spacing || 0}px;
  }
`;


export default Row;
