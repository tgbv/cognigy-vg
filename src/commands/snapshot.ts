import { outputFileSync, readFileSync } from "fs-extra";
import { confirm, ILocalConfig, loadJsonFile } from "../lib";
import API from "../lib/api";
import { createCipheriv, randomBytes, createDecipheriv } from "crypto";
import { cloneDeep } from "lodash";

/**
 * 
 * @param api 
 * @param snapEncryptionKey 
 * @param snapshotName 
 */
const create = async (api: API, snapEncryptionKey: string, snapshotName: string) => {
  const speechCredentials = await api.getRemoteSpeechCredentials();
  const apps = await api.getRemoteApps();

  const carriers = await api.getRemoteCarriers();
  await Promise.all(
    carriers.map(o => (async () => {
      const sipGateways = await api.getRemoteCarrierSipGateways(o.voip_carrier_sid);
      const smppGateways = await api.getRemoteCarrierSmppGateways(o.voip_carrier_sid);

      o.sipGateways = sipGateways;
      o.smppGateways = smppGateways;
    })())
  );

  const phones = await api.getRemotePhones();
  const obRouters = await api.getRemoteObRouters();
  await Promise.all(
    obRouters.map(
      o => api.getRemoteObRoutes(o.lcr_sid).then(res => {
        o.routes = res;
      })
    )
  );

  //// encryption & storage part

  const vgSnapRaw = JSON.stringify({
    speechCredentials,
    apps,
    carriers,
    phones,
    obRouters
  });

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(snapEncryptionKey, 'base64'),
    iv
  );

  const vgSnapEncrypted = Buffer.concat([
    cipher.update(vgSnapRaw, 'utf8'),
    cipher.final()
  ]);

  const outputData = Buffer.concat([
    iv,
    cipher.getAuthTag(),
    vgSnapEncrypted
  ])

  outputFileSync(`./${snapshotName}.vgsnap`, outputData);
  console.log('Snapshot', snapshotName, 'created.');

}


/**
 * 
 * @param api 
 * @param snapEncryptionKey 
 * @param snapshotName 
 */
const restore = async (api: API, config: ILocalConfig, snapshotName: string) => {
  const vgSnapFile = readFileSync(`${snapshotName}`);

  const iv = Buffer.alloc(12);
  vgSnapFile.copy(iv, 0, 0, 12);

  const authTag = Buffer.alloc(16);
  vgSnapFile.copy(authTag, 0, 12, 28);

  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(config.snapEncryptionKey, 'base64'),
    iv,
  );
  decipher.setAuthTag(authTag);

  const vgSnapRaw = Buffer.concat([
    decipher.update(vgSnapFile.subarray(28)),
    decipher.final()
  ]);
  // writeFileSync('./decrypted.json', vgSnapRaw);

  const vgSnap = JSON.parse(vgSnapRaw.toString('utf8'));

  console.log('Flushing remote configuration ...');

  // flush obroutes
  const defaultObRouters = await api.getRemoteObRouters();
  const defaultObRouter = defaultObRouters.find(o => (o.account_sid === config.accountSid));
  if(defaultObRouter) {
    await api.deleteObRouter(defaultObRouter.lcr_sid);
  }



  // flush numbers
  const phones = await api.getRemotePhones();
  await Promise.all(
    phones.map(o => api.deleteRemotePhone(o.phone_number_sid))
  );

  // flush carriers
  const carriers = await api.getRemoteCarriers();
  await Promise.all(
    carriers.map(o => api.deleteRemoteCarrier(o.voip_carrier_sid))
  );


  // flush apps
  const apps = await api.getRemoteApps();
  await Promise.all(
    apps.map(o => api.deleteRemoteApp(o.application_sid))
  );

  // flush speech
  const speech = await api.getRemoteSpeechCredentials();
  await Promise.all(
    speech.map(o => api.deleteRemoteSpeechCredential(o.speech_credential_sid))
  );

  console.log('Flushed remote configuration!');

  console.log('Restoring snapshot remotely ...');

  // create speech
  await Promise.all(
    vgSnap.speechCredentials.map(o => api.createRemoteSpeechCredential(cloneDeep(o)))
  );

  // create apps
  await Promise.all(
    vgSnap.apps.map(o => 
      api.createRemoteApp(cloneDeep(o))
      .then(data => {
        o.new_application_sid = data.sid;
      })
    )
  );

  // create carriers
  await Promise.all(
    vgSnap.carriers.map(carrierObject => {
      const clonedCarrier = cloneDeep(carrierObject);
      clonedCarrier.application_sid = vgSnap.apps.find(o => o.application_sid === clonedCarrier.application_sid)?.new_application_sid ?? null;

      return api.createRemoteCarrier(clonedCarrier)
        .then(( { sid }) => {
          carrierObject.new_voip_carrier_sid = sid
          const clonedSipGateways = cloneDeep(carrierObject.sipGateways);
          clonedSipGateways.forEach(sgo => {
            sgo.voip_carrier_sid = sid
          })
          return api.createRemoteCarrierSipGateways(cloneDeep(clonedSipGateways));
        })
    })
  );

  // create phones
  await Promise.all(
    vgSnap.phones.map(phoneObject => {
      const clonedObject = cloneDeep(phoneObject);
      clonedObject.voip_carrier_sid = vgSnap.carriers.find(o => o.voip_carrier_sid === clonedObject.voip_carrier_sid).new_voip_carrier_sid;
      clonedObject.application_sid = vgSnap.apps.find(o => o.application_sid === clonedObject.application_sid).new_application_sid;
      clonedObject.account_sid = config.accountSid;
      clonedObject.service_provider_sid = config.serviceProviderSid;
      return api.createRemotePhone(clonedObject)
          .then(( { sid }) => {
            phoneObject.new_phone_number_sid = sid;
          });
    })
  );

  // create obroutes aka lcroutes aka wakanada...
  await Promise.all(
    vgSnap.obRouters.map(obRouterObject => {
      const clonedObject = cloneDeep(obRouterObject);
      // clonedObject.default_carrier_set_entry_sid = vgSnap.carriers.find(o => o.voip_carrier_sid === clonedObject.default_carrier_set_entry_sid)?.new_voip_carrier_sid || null;
      clonedObject.service_provider_sid = config.serviceProviderSid;
      clonedObject.account_sid = config.accountSid;
      delete clonedObject.routes;
      delete clonedObject.number_routes;
      delete clonedObject.default_carrier_set_entry_sid;

      return api.createRemoteObRouter(clonedObject)
        .then(({ sid }) => {
          const routes = cloneDeep(obRouterObject.routes);
          routes.forEach(o => {
            o.lcr_route_sid	= '';
            o.lcr_sid = '';
            o.lcr_carrier_set_entries.forEach(ocse => {
              ocse.lcr_route_sid = '';
              ocse.voip_carrier_sid = vgSnap.carriers.find(c => c.voip_carrier_sid === ocse.voip_carrier_sid).new_voip_carrier_sid;
            })
          })

          return api.putRemoteObRouterRoutes(sid, routes);
        })

    })
  );

  console.log('Done restoring snapshot remotely!');
}

/**
 * 
 */
export default async (action: 'create' | 'restore', snapshotName: string | null, { y, configFile, AU }) => {
  if(action === 'restore' && !snapshotName) {
    console.log('"snapshotName" is needed when command is "restore"');
    return;
  }

  const config = loadJsonFile(configFile) as ILocalConfig;
  const api = new API(config, AU);

  snapshotName = snapshotName ?? await api.getSnapshotName();

  if (
    !y && 
    !await confirm(
      'This will overwrite ' + 
      ((action === 'create') ? (snapshotName  +  '.vgsnap locally') : 'ALL remote configuration') + 
      '. Are you sure?'
    )
  ) {
    return;
  }

  /**
   * 
   * 
   */
  if(action === 'create') {
    return create(api, config.snapEncryptionKey, snapshotName);
  }

  /**
   * 
   * 
   */
  if( action === 'restore' ) {
    return restore(api, config, snapshotName);
  }
}
