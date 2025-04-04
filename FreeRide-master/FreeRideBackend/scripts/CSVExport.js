import { RiderGeneratorService, websocket, ReportGeneratorService } from '../services';


export const run = async () => {
  const exportType = process.argv[2];
  if (exportType === 'riderExport') {
    await RiderGeneratorService.perform();
  } else {
    await ReportGeneratorService.perform();
  }
  process.exit(0);
};

run();

export default run;
