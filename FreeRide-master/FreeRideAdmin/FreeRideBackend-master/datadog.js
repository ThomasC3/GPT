const ddtrace = ['stage', 'production'].includes(process.env.NODE_ENV) ? require('dd-trace').init(
  {
    debug: false,
    env: process.env.NODE_ENV || 'local',
    service: `${process.env.NODE_ENV || 'Local'}-Circuit${process.env.APP_MODE}`,
    reportHostname: true,
    runtimeMetrics: true,
    analytics: true
  }
) : null;

export default ddtrace;
