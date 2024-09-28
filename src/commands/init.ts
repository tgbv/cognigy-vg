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
      message: 'Snapshots encryption key. Is base64.',
      initial: randomBytes(32).toString('base64')
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

          if(data === 'OK' && headers['ratelimit-policy']) {
            return true;
          }
        } catch(e) {
        }

        return 'FQDN syntax mismatch, FQDN host not reachable, or not a Cognigy VG API FQDN.';
      }
    },
  ], { onCancel: () => process.exit(0) });


  const { bearerToken } = await prompts({
    type: 'text',
    name: 'bearerToken',
    message: 'Bearer token for authentication. Please consult: https://github.com/tgbv/cognigy-vg/tree/dev#using-the-right-bearer-token',
    hint: 'UUIDv4 or JWT',
    validate: (value) => new Promise(accept => {
      getAccounts(apiFqdn, value).then(res => {
        accounts = res;
        getServiceProviders(apiFqdn, value).then(res => {
          if(res.length === 0) {
            accept('This token cannot be used with any ServiceProvider.');
          }
          serviceProviders = res;
          accept(true)
        }).catch(() => accept('Token does not have privileges to retrieve ServiceProviders.'));
      }).catch(() => accept('Token does not have privileges to retrieve own Accounts.'));
    })
  }, { onCancel: () => process.exit(0) });

  const btSplit = bearerToken.split('.')
  if(btSplit.length === 3) {
    const payload = JSON.parse(Buffer.from(btSplit[1], 'base64').toString('utf8'));
    console.log('WARNING:', 'supplied token will expire in', payload.exp - (Date.now() / 1000) , 'second(s)');
    console.log("You will need to regenerate it. You can do so via 'cognigy-vg set token' command.");
  }

  const { accountSid, serviceProviderSid } = await prompts([
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
    JSON.stringify({vgSpacePath, apiFqdn, bearerToken, accountSid, serviceProviderSid, snapEncryptionKey }, null, 2)
  );

  console.log(`Configuration file generated: ./${fileName}`);
  process.exit(0);
}
