import addUserDataToReports from '../utils/addUserToReports';

addUserDataToReports()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
