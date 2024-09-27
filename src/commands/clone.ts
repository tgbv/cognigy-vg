import API from "../lib/api";
import { confirm, getSpeechFilename, ILocalConfig, loadJsonFile } from "../lib";
import { outputFileSync, rmSync } from "fs-extra";

/**
 * 
 */
export default async ( options: any ) => {
  if(!options.y && !await confirm('This will overwrite all local content. Are you sure?') ) {
    return;
  }

  const config = loadJsonFile(options.configFile) as ILocalConfig;
  const api = new API(config, options.AU);

  console.log('Cloning into', config.vgSpacePath, '...');
  
  rmSync(config.vgSpacePath, { recursive: true, force: true });

  const carriers = await api.getRemoteCarriers();
  await Promise.all(
    carriers.map(o => (async () => {
      const sipGateways = await api.getRemoteCarrierSipGateways(o.voip_carrier_sid);
      const smppGateways = await api.getRemoteCarrierSmppGateways(o.voip_carrier_sid);

      o.sipGateways = sipGateways;
      o.smppGateways = smppGateways;

      outputFileSync(`${config.vgSpacePath}/carriers/${o.name}.json`, JSON.stringify(o, null, 2));
    })())
  );

  const apps = await api.getRemoteApps();
  apps.forEach(o => {
    outputFileSync(`${config.vgSpacePath}/apps/${o.name}.json`, JSON.stringify(o, null, 2));
  });

  const speechCredentials = await api.getRemoteSpeechCredentials();
  speechCredentials.forEach(o => {
    const fname = getSpeechFilename(o.vendor, o.label);
    outputFileSync(`${config.vgSpacePath}/speech/${fname}`, JSON.stringify(o, null, 2));
  });

  const phones = await api.getRemotePhones();
  phones.forEach(o => {
    outputFileSync(`${config.vgSpacePath}/phones/${o.number}.json`, JSON.stringify(o, null, 2));
  });

  await api.pullObRoutesFromRemote();

  console.log('Done.');
}