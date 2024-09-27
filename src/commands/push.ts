import { confirm, loadJsonFile } from "../lib";
import API from "../lib/api";


/**
 * 
 */
export default async (
  resourceType: string, 
  resourceName: string, 
  { create, label, configFile, y, AU }
) => {
  if(!y && !await confirm('This will overwrite all remote content. Are you sure?') ) {
    return;
  }

  const config = loadJsonFile(configFile);
  const api = new API(config, AU);

  switch(resourceType) {
    case 'app': return api.pushAppFromLocal(resourceName, create);
    case 'carrier': return api.pushCarrierFromLocal(resourceName, create);
    case 'speech': return api.pushSpeechFromLocal(resourceName, label, create);
    case 'phone': return api.pushPhoneFromLocal(resourceName, create);
    default: {
      console.log('Unsupported resource type:', resourceType);
    }
  }

}