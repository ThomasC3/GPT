import Cryptr from 'cryptr';
import fs from 'fs';

export const decrypt = () => {
  const env = process.env.npm_config_env || process.env.NODE_ENV || 'local';

  console.log(`Decrypting "./config_files/${env}_config_enc"`);

  try {
    const key = String(fs.readFileSync(`./config_keys/${env}.key`));
    const cryptr = new Cryptr(key);

    const encFile = fs.readFileSync(`./config_files/${env}_config_enc`);
    const plainFile = cryptr.decrypt(encFile);

    fs.openSync(`./config_files/${env}_config.json`, 'w');
    fs.writeFileSync(`./config_files/${env}_config.json`, plainFile, 'utf8');
  } catch (error) {
    console.log(error);
    throw new Error('Wrong key used in config.js decryption');
  }
};

export default { decrypt };
