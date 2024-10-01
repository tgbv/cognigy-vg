import prompts from "prompts";
import axios from "axios";
import https from "https";
import { writeFileSync } from "fs"; 
import { getAccounts, getServiceProviders, ILocalConfig, loadJsonFile } from "../lib";

export default async (_, { AU, configFile }) => {
  if(AU) {
    axios.interceptors.request.use(cfg => {
      cfg.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      })
      return cfg;
    });
  }

  const config = loadJsonFile(configFile) as ILocalConfig;

  const { bearerToken } = await prompts({
    type: 'text',
    name: 'bearerToken',
    message: 'Bearer token for authentication. Please consult: https://github.com/tgbv/cognigy-vg/tree/dev#using-the-right-bearer-token',
    hint: 'UUIDv4 or JWT',
    validate: (value) => new Promise(accept => {
      getAccounts(config.apiFqdn, value).then(res => {
        if(!res.find(o => (o.account_sid === config.accountSid))) {
          return accept(`Token does not have privileges to access Account: ${config.accountSid}`);
        }
        getServiceProviders(config.apiFqdn, value).then(res => {
          if(!res.find(o => (o.service_provider_sid === config.serviceProviderSid))) {
            return accept(`Token does not have privileges to access ServiceProvider: ${config.serviceProviderSid}`);
          }
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

  config.bearerToken = bearerToken;

  writeFileSync(
    configFile, 
    JSON.stringify(config, null, 2)
  );

  console.log(`Access token updated in: ${configFile}`);
  process.exit(0);
}
