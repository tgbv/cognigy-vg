import prompts from "prompts";
import axios from "axios";
import https from "https";
import { existsSync, writeFileSync } from "fs"; 
import { getAccounts, getServiceProviders } from "../lib";
import { randomBytes } from "crypto";

export default async ({ AU }) => {
  if(AU) {
    axios.interceptors.request.use(cfg => {
      cfg.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      })
      return cfg;
    });
  }

  let accounts: {account_sid: string, name: string}[] = [];
  let serviceProviders: {service_provider_sid: string, name: string}[] = [];

  const { fileName, apiFqdn, vgSpacePath, snapEncryptionKey } = await prompts([
    {
      type: 'text',
      name: 'fileName',
      message: 'Config filename',
      initial: 'config.json',
    },
    {
      type: 'text',
      name: 'vgSpacePath',
      message: 'Directory under which to store the future resources',
      initial: './vg-space',
    },
    {
      type: 'text',
      name: 'snapEncryptionKey',
      message: 'Snapshots encryption key. Must be base64.',
      initial: randomBytes(32).toString('base64'),
      validate: (value) => Buffer.from(value, 'base64').toString().length === 0 ? 
        'Please input valid base64 encoded data.' : true
    },
    {
      type: 'text',
      name: 'apiFqdn',
      message: 'VG API FQDN',
      initial: 'api-vg-trial.cognigy.ai',
      validate: async (value) => {
        try {
          if(!value.match(/^[a-z0-9\-\.]+$/)) {
            return false;
          }

          const { data, headers } = await axios.get(`https://${value}`);

          if(data === 'OK') {
            return true;
          }
        } catch(e) {
        }

        return 'FQDN syntax mismatch, FQDN host not reachable, or not a Cognigy VG API FQDN.';
      }
    },
  ], { onCancel: () => process.exit(0) });

  const { serviceProviderToken } = await prompts({
    type: 'text',
    name: 'serviceProviderToken',
    message: 'Service Provider API Key',
    hint: 'UUIDv4',
    validate: async (value) => {
      try {
        serviceProviders = await getServiceProviders(apiFqdn, value);
        if(serviceProviders.length === 0) {
          return 'This token cannot be used with any ServiceProvider.';
        }
        accounts = await getAccounts(apiFqdn, value);
        return true;
      } catch(e) {
        return 'Token does not have privileges to retrieve own Service Providers / Accounts, or network error occurred.';
      }
    }
  }, { onCancel: () => process.exit(0) });

  const { accountSid, serviceProviderSid } = await prompts([
    {
      type: 'select',
      name: 'serviceProviderSid',
      message: 'Service provider you will be working with',
      choices: serviceProviders.map(({ service_provider_sid, name }) => ({
        title: name, 
        value: service_provider_sid
      })),
      initial: 0,
    },
    {
      type: 'select',
      name: 'accountSid',
      message: 'Account you will be working with',
      choices: accounts.map(({ name, account_sid }) => ({
        title: name, 
        value: account_sid
      })),
      initial: 0,
    },
  ], { onCancel: () => process.exit(0) });


  if(existsSync(`./${fileName}`)) {
    const { overwrite } = await prompts({
      type: 'toggle',
      name: 'overwrite',
      initial: false,
      active: 'yes',
      inactive: 'no',
      message: `File ${fileName} already exists! Overwrite?`,
    });
    
    if(!overwrite) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  writeFileSync(
    `./${fileName}`, 
    JSON.stringify({
      vgSpacePath, 
      apiFqdn, 
      serviceProviderToken, 
      accountSid, 
      serviceProviderSid, 
      snapEncryptionKey 
    }, null, 2)
  );

  console.log(`Configuration file generated: ./${fileName}`);
  process.exit(0);
}
