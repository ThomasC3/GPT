import Cryptr from 'cryptr';
import fs from 'fs';

export const encrypt = () => {
  // Get variables
  const env = process.env.npm_config_env || process.env.NODE_ENV || 'local';

  const secret = String(fs.readFileSync(`./config_keys/${env}.key`));
  const check = process.env.npm_config_check || false;
  const cryptr = new Cryptr(secret);

  // Check if key is correct
  if (check) {
    try {
      const encFile = fs.readFileSync(`./config_files/${env}_config_enc`);
      const plainFile = cryptr.decrypt(encFile);
      const config = JSON.parse(plainFile);

      if (!config || !config.port) {
        console.log('Wrong key!');
        process.exit(1);
      }
      console.log('Key check success!');
    } catch (error) {
      console.log(error);
      console.log('Key check failed!');
      process.exit(1);
    }
  }

  // Encrypt
  try {
    const plainConfig = fs.readFileSync(`./config_files/${env}_config.json`);
    const encConfig = cryptr.encrypt(plainConfig);

    fs.openSync(`./config_files/${env}_config_enc`, 'w');
    fs.writeFileSync(`./config_files/${env}_config_enc`, encConfig, 'utf8');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }

  console.log('Success!');
};

export default { encrypt };
