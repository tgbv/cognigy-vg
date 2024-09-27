import API from "../lib/api";
import { confirm, loadJsonFile } from "../lib"

/**
 * 
 */
export default async (
  resourceType: string, 
  resourceName: string, 
  { y, configFile, label, AU }: any
) => {

  if(!y && !await confirm('This will overwrite all local content. Are you sure?') ) {
    return;
  }

  const config = loadJsonFile(configFile);
  const api = new API(config, AU);

  switch(resourceType) {
    case 'app': {
      const app = api.pullAppFromRemote(resourceName);

    }
    case 'carrier': return api.pullCarrierFromRemote(resourceName);
    case 'speech': return api.pullSpeechFromRemote(resourceName, label || null);
    case 'phone': return api.pullPhoneFromRemote(resourceName);
    case 'obroutes': return api.pullObRoutesFromRemote();
    default: {
      console.log('Unsupported resource type:', resourceType);
    }
  }

}