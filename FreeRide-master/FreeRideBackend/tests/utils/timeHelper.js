import { average, perc } from '../../utils/math';

export const statistics = (timeArray) => {
  const timeArrayUnit = timeArray.map(item => item[0] + item[1] / (10 ** 9));

  return {
    min: Math.min(...timeArrayUnit),
    max: Math.max(...timeArrayUnit),
    avg: average(timeArrayUnit),
    p95: perc(timeArrayUnit, 0.95),
    p99: perc(timeArrayUnit, 0.99)
  };
};

export default {
  statistics
};
