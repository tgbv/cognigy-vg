import https from "https";
import axios, { AxiosInstance } from "axios";
import { getSpeechFilename, ILocalConfig, loadJsonFile } from ".";
import { outputFileSync } from "fs-extra";


export default class API {
  protected vgSpacePath: string;
  protected apiFqdn: string;
  protected bearerToken: string;
  protected accountSid: string;
  protected serviceProviderSid: string;
  protected axios: AxiosInstance;

  /**
   * 
   * @param ILocalConfig 
   * @param allowUnauthorized 
   */
  constructor({ vgSpacePath, apiFqdn, bearerToken, accountSid, serviceProviderSid }: ILocalConfig, allowUnauthorized: boolean) {
    this.vgSpacePath = vgSpacePath;
    this.apiFqdn = apiFqdn;
    this.bearerToken = bearerToken;
    this.accountSid = accountSid;
    this.serviceProviderSid = serviceProviderSid;

    this.axios = axios.create({
      baseURL: `https://${this.apiFqdn}`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.bearerToken}`
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: !allowUnauthorized })
    });
    this.axios.interceptors.request.use(config => {
      return config;
    });
  }

  /**
   * 
   * @param from 
   * @param to 
   * @param applicationSid 
   * @param tag
   * @returns 
   */
  createCall = async (from: string, to: string, applicationSid: string, tag: Record<string, any>) => {
    const payload: Record<string, any> = {
      application_sid: applicationSid,
      from,
      to: {
        type: "phone",
        number: to
      },
      tag,
      headers: {
        'P-Asserted-Identity': `<sip:${from}@cognigy-vg>`
      }
    };

    return this.axios.post(`/v1/Accounts/${this.accountSid}/Calls`, payload);
  }

  /**
   * 
   * @returns 
   */
  getRemoteCarriers = async () => {
    const { data } = await this.axios.get<any[]>(`/v1/ServiceProviders/${this.serviceProviderSid}/VoipCarriers`);

    return data;
  }

  /**
   * 
   * @returns 
   */
  getRemoteApps = async () => {
    const { data } = await this.axios.get<any[]>(`/v1/Accounts/${this.accountSid}/Applications`);

    return data;
  }

  /**
   * 
   * @returns 
   */
  getRemoteSpeechCredentials = async () => {
    const { data } = await this.axios.get<any[]>(`/v1/ServiceProviders/${this.serviceProviderSid}/SpeechCredentials`);

    return data;
  }

  /**
   * 
   * @returns 
   */
  getRemotePhones = async () => {
    const { data } = await this.axios.get<any[]>(`/v1/ServiceProviders/${this.serviceProviderSid}/PhoneNumbers`);

    return data;
  }

  /**
   * 
   * @param payload 
   * @returns 
   */
  createRemoteCarrierSipGateway = async (payload: any) => {
    delete payload.sip_gateway_sid;
  
    const { data } = await this.axios.post(`/v1/SipGateways`, payload);
  
    return data;
  }

  /**
   * 
   * @param payloads 
   * @returns 
   */
  createRemoteCarrierSipGateways = async (payloads: any[]) => {
    return Promise.all(payloads.map((o) => this.createRemoteCarrierSipGateway(o)));
  }

  /**
   * 
   * @param carrierSid 
   * @returns 
   */
  getRemoteCarrierSipGateways = async (carrierSid: string) => {
    const { data } = await this.axios.get<any[]>(`/v1/SipGateways?voip_carrier_sid=${carrierSid}`);
  
    return data;
  }

  /**
   * 
   * @param payload 
   */
  deleteRemoteSipGateway = async (payload: any) => {
    const { data } = await this.axios.delete(`/v1/SipGayeways/${payload.sip_gateway_sid}`);

    return data;
  }

  /**
   * 
   * @param carrierSid 
   * @returns 
   */
  deleteRemoteCarrierSipGateways = async (carrierSid: string) => {
    const activeGateways = await this.getRemoteCarrierSipGateways(carrierSid);
  
    return Promise.all(
      activeGateways.map(o => this.deleteRemoteSipGateway(o))
    );
  }

  /**
   * 
   * @param carrierSid 
   * @returns 
   */
  getRemoteCarrierSmppGateways = async (carrierSid: string) => {
    const { data } = await this.axios.get(`/v1/SmppGateways?voip_carrier_sid=${carrierSid}`);

    return data;
  }

  /**
   * 
   * @param resourceName 
   */
  pullCarrierFromRemote = async (resourceName: string) => {
    const carriers = await this.getRemoteCarriers();
    const carrier = carriers.find(({ name }) => (name === resourceName));
    
    if(carrier) {
      const sipGateways = await this.getRemoteCarrierSipGateways(carrier.voip_carrier_sid);
      const smppGateways = await this.getRemoteCarrierSmppGateways(carrier.voip_carrier_sid);

      carrier.sipGateways = sipGateways;
      carrier.smppGateways = smppGateways ;

      outputFileSync(`${this.vgSpacePath}/carriers/${resourceName}.json`, JSON.stringify(carrier, null, 2));
      console.log('Saved', resourceName, 'locally.');
    } else {
      console.log('Could not find', resourceName, 'remotely.');
    } 
  }

  /**
   * 
   * @param resourceName 
   */
  pullAppFromRemote = async (resourceName: string) => {
    const apps = await this.getRemoteApps();
    const app = apps.find(({ name }) => (name === resourceName));
    
    if(app) {
      outputFileSync(`${this.vgSpacePath}/apps/${resourceName}.json`, JSON.stringify(app, null, 2));
      console.log('Saved', resourceName, 'locally.');
    } else {
      console.log('Could not find', resourceName, 'remotely.');
    } 
  }

  /**
   * 
   * @param resourceName 
   * @param resourceLabel 
   */
  pullSpeechFromRemote = async (resourceName: string, resourceLabel: string) => {
    const speechCredentials = await this.getRemoteSpeechCredentials();
    const speech = speechCredentials.find(({ vendor, label }) => (
      vendor === resourceName && label === resourceLabel
    ));
  
    if(speech) {
      outputFileSync(
        `${this.vgSpacePath}/speech/${getSpeechFilename(resourceName, resourceLabel)}`, 
        JSON.stringify(speech, null, 2)
      );
      console.log('Saved', resourceName, 'with label', resourceLabel, 'locally.');
    } else {
      console.log('Could not find', resourceName, 'with label', resourceLabel, 'remotely.');
    } 
  }

  /**
   * 
   * @param resourceName 
   */
  pullPhoneFromRemote = async (resourceName: string) => {
    const phones = await this.getRemotePhones();
    const phone = phones.find(({ number	 }) => (number	 === resourceName));
    
    if(phone) {
      outputFileSync(`${this.vgSpacePath}/phones/${resourceName}.json`, JSON.stringify(phone, null, 2));
      console.log('Saved', resourceName, 'locally.');
    } else {
      console.log('Could not find', resourceName, 'remotely.');
    } 
  }

  /**
   * 
   * @param resourceName 
   * @param create 
   * @returns 
   */
  pushCarrierFromLocal = async (resourceName: string, create?: boolean) => {
    const carrier = loadJsonFile(`${this.vgSpacePath}/carriers/${resourceName}.json`);

    const carrierSid = carrier.voip_carrier_sid;
    const sipGateways = carrier.sipGateways;
    const smppGateways = carrier.smppGateways;
  
    delete carrier.voip_carrier_sid;
    delete carrier.created_at;
    delete carrier.register_status;
    delete carrier.sipGateways;
    delete carrier.smppGateways;
  
    try {
      await this.axios.get(`/v1/VoipCarriers/${carrierSid}`);
    } catch(e: any) {
      if(e.response?.status === 404) {
        console.log('Resource', resourceName, 'does not exit remotely. If you wish to create it remotely specify the --create flag.');
        
        if(create) {
          console.log('Creating...');
          const { data } = await this.axios.post('/v1/VoipCarriers', carrier);
          console.log('Created resource', resourceName, 'with SID:', data.sid);
  
          sipGateways.forEach((o: any) => (o.voip_carrier_sid = data.sid));
          await this.createRemoteCarrierSipGateways(sipGateways);
  
          console.log('Registered SIP Gateways with', resourceName);

          await this.pullCarrierFromRemote(carrier.name);
        }
        return;
      }
    }
  
    await this.axios.put(`/v1/VoipCarriers/${carrierSid}`, carrier);
  
    console.log('Pushed resource', resourceName);
  }


  /**
   * 
   * @param resourceName 
   * @param create 
   * @returns 
   */
  pushAppFromLocal = async (resourceName: string, create: boolean) => {
    const app = loadJsonFile(`${this.vgSpacePath}/apps/${resourceName}.json`);
    const appSid = app.application_sid;
  
    delete app.application_sid;
    delete app.created_at;
  
    try {
      await this.axios.get(`/v1/Applications/${appSid}`);
    } catch(e: any) {
      if(e.response?.status === 404) {
        console.log('Resource', resourceName, 'does not exit remotely. If you wish to create it remotely specify the --create flag.');
        
        if(create) {
          console.log('Creating...');
          const { data } = await this.axios.post(`/v1/Applications`, app);
          console.log('Created resource', resourceName, 'with SID:', data.sid);
          await this.pullAppFromRemote(resourceName);
        }
        return;
      }
    }
  
    await this.axios.put(`/v1/Applications/${appSid}`, app);
  
    console.log('Pushed resource', resourceName);
  }


  /**
   * 
   * @param resourceName 
   * @param create 
   * @returns 
   */
  pushSpeechFromLocal = async (resourceName: string, label: string, create: boolean) => {
    const speech = loadJsonFile(`${this.vgSpacePath}/speech/${getSpeechFilename(resourceName, label)}`);
    const speechSid = speech.speech_credential_sid;
  
    delete speech.api_key;
    delete speech.last_used;
    delete speech.last_tested;
    delete speech.created_at;
    delete speech.tts_tested_ok;
    delete speech.stt_tested_ok;
    delete speech.speech_credential_sid;
  
    try {
      await this.axios.get(`/v1/Accounts/${this.accountSid}/SpeechCredentials/${speechSid}`);
    } catch(e: any) {
      if(e.response?.status === 404) {
        console.log('Resource', resourceName, 'with label', label, 'does not exit remotely. If you wish to create it remotely specify the --create flag.');
        
        if(create) {
          console.log('Creating...');
          const { data } = await this.axios.post(`/v1/Accounts/${this.accountSid}/SpeechCredentials`, speech);
          console.log('Created resource', resourceName, 'with label', label, 'with SID:', data.sid);
          await this.pullSpeechFromRemote(resourceName, label);
        }
        return;
      }
    }
  
    await this.axios.put(`/v1/Accounts/${this.accountSid}/SpeechCredentials/${speechSid}`, speech);
  
    console.log('Pushed resource', resourceName, 'with label', label);
  }


  /**
   * 
   * @param resourceName 
   * @param create 
   * @returns 
   */
  pushPhoneFromLocal = async (resourceName: string, create: boolean) => {
    const phone = loadJsonFile(`${this.vgSpacePath}/phones/${resourceName}.json`);

    try {
      await this.axios.get(`/v1/PhoneNumbers/${phone.phone_number_sid}`);
    } catch(e: any) {
      if(e.response?.status === 404) {
        console.log('Resource', resourceName, 'does not exit remotely. If you wish to create it remotely specify the --create flag.');
        
        if(create) {
          console.log('Creating...');

          delete phone.phone_number_sid;
          delete phone.service_provider_sid;

          const { data } = await this.axios.post(`/v1/PhoneNumbers`, phone);

          console.log('Created resource', resourceName, 'with SID:', data.sid);

          await this.pullPhoneFromRemote(resourceName);
        }
        return;
      }
    }

    const phoneNumberSid = phone.phone_number_sid;

    delete phone.number;
    delete phone.voip_carrier_sid;
    delete phone.service_provider_sid;
    delete phone.phone_number_sid;

    await this.axios.put(`/v1/PhoneNumbers/${phoneNumberSid}`, phone);
  
    console.log('Pushed resource', resourceName);

  }


  /**
   * 
   * @returns 
   */
  getRemoteObRouters = async () => {
    const { data } = await this.axios.get<any[]>('/v1/Lcrs');
    return data
  }

  /**
   * 
   * @param obRouterSid 
   * @returns 
   */
  getRemoteObRoutes = async (obRouterSid: string) => {
    const { data } = await this.axios.get<any[]>(`/v1/LcrRoutes?lcr_sid=${obRouterSid}`);
    return data
  }

  /**
   * 
   * @param obRouteSid 
   * @returns 
   */
  deleteRemoteObRoute = async (obRouteSid: string) => {
    return this.axios.delete(`/v1/LcrRoutes/${obRouteSid}`);
  }

  /**
   * 
   * @param phoneSid 
   */
  deleteRemotePhone = async (phoneSid: string) => {
    return this.axios.delete(`/v1/PhoneNumbers/${phoneSid}`);
  }


   /**
   * 
   * @param phoneSid 
   */
  deleteRemoteCarrier = async (carrierSid: string) => {
    return this.axios.delete(`/v1/VoipCarriers/${carrierSid}`);
  }

  /**
   * 
   * @param obRouterSid 
   * @returns 
   */
  deleteObRouter = async (obRouterSid: string) => {
    return this.axios.delete(`/v1/Lcrs/${obRouterSid}`);
  }

  /**
   * 
   * @param obRouterSid 
   * @returns 
   */
  deleteRemoteSpeechCredential = async (speechSid: string) => {
    return this.axios.delete(`/v1/Accounts/${this.accountSid}/SpeechCredentials/${speechSid}`);
  }

  /**
   * 
   * @param obRouterSid 
   * @param data 
   * @returns 
   */
  deleteRemoteApp = async (appSid: string) => {
    return this.axios.delete(`/v1/Applications/${appSid}`);
  }


  /**
   * 
   */
  pullObRoutesFromRemote = async () => {
    const defaultRouters = await this.getRemoteObRouters();
    const defaultRouter = defaultRouters.find(o => (o.account_sid === this.accountSid));

    if(defaultRouter) {
      const { data: routes } = await this.axios.get<any[]>(`/v1/LcrRoutes?lcr_sid=${defaultRouter.lcr_sid}`);

      defaultRouter.routes = routes;

      outputFileSync(`${this.vgSpacePath}/obroutes/config.json`, JSON.stringify(defaultRouter, null, 2));

      console.log('Saved outbound calling routes locally.');
    } else {
      console.log('Account SID does not have a default router to pull from remotely.');
    }
  }

  /**
   * 
   * @returns 
   */
  getSnapshotName = async () => {
    const { data: account } = await this.axios.get(`/v1/Accounts/${this.accountSid}`);

    return `${account.name}_${Date.now()}`;
  }


  /**
   * 
   * @param payload 
   */
  createRemoteSpeechCredential = async (payload: Record<string, any>) => {
    delete payload.last_used;
    delete payload.last_tested;
    delete payload.created_at;
    delete payload.tts_tested_ok;
    delete payload.stt_tested_ok;
    delete payload.speech_credential_sid;
    
    payload.account_sid = this.accountSid;
    payload.service_provider_sid = this.serviceProviderSid;

    const { data } = await this.axios.post(`/v1/Accounts/${this.accountSid}/SpeechCredentials`, payload);
    return data;
  }

  /**
   * 
   * @param payload 
   * @returns 
   */
  createRemoteApp = async (payload: Record<string, any>) => {
    delete payload.application_sid;
    delete payload.created_at;

    const { data } = await this.axios.post(`/v1/Applications`, payload);

    return data;
  }

  /**
   * 
   * @param payload 
   * @returns 
   */
  createRemoteCarrier = async (payload: Record<string, any>) => {
    delete payload.voip_carrier_sid;
    delete payload.created_at;
    delete payload.register_status;
    delete payload.sipGateways;
    delete payload.smppGateways;

    const { data } = await this.axios.post(`/v1/VoipCarriers`, payload);

    return data;
  }


  /**
   * 
   * @param payload 
   * @returns 
   */
  createRemotePhone = async (payload: Record<string, any>) => {
    delete payload.phone_number_sid;

    const { data } = await this.axios.post(`/v1/PhoneNumbers`, payload);

    return data;
  }

  /**
   * 
   * @param payload 
   */
  createRemoteObRouter = async (payload: Record<string, any>) => {
    const { data } = await this.axios.post(`/v1/Lcrs`, payload);

    return data;
  }


  /**
   * 
   * @param payload 
   */
  createRemoteObRoute = async (payload: Record<string, any>) => {
    const { data } = await this.axios.post(`/v1/LcrRoutes`, payload);

    return data;
  }

  /**
   * 
   * @param routerSid 
   * @param routes 
   */
  putRemoteObRouterRoutes = async (routerSid: string, payload: Record<string, any>[]) => {
    return this.axios.put(`/v1/Lcrs/${routerSid}/Routes`, payload);
  }

}
