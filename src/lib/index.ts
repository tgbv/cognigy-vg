import axios from "axios";
import prompts from "prompts";
import { readFileSync } from "fs";

export interface ILocalConfig {
  vgSpacePath: string,
  apiFqdn: string,
  bearerToken: string,
  accountSid: string,
  serviceProviderSid: string,
  snapEncryptionKey: string
}

/**
 * 
 * @param apiHost 
 * @param bearerToken 
 * @returns 
 */
export const getAccounts = async (apiHost: string, bearerToken: string) => {
  const { data } = await axios.get(
    `https://${apiHost}/v1/Accounts`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`
      }
    }
  );

  return data;
}

/**
 * 
 * @param apiHost 
 * @param bearerToken 
 * @returns 
 */
export const getServiceProviders = async (apiHost: string, bearerToken: string) => {
  const { data } = await axios.get(
    `https://${apiHost}/v1/ServiceProviders`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`
      }
    }
  );

  return data;
}

/**
 * 
 * @param fileName 
 * @returns 
 */
export const loadJsonFile = (fileName: string) => {
  return JSON.parse(
    readFileSync(fileName).toString('utf8')
  )
}

/**
 * 
 * @param resourceName 
 * @param resourceLabel 
 * @returns 
 */
export const getSpeechFilename = (resourceName: string, resourceLabel: string) => {
  return `${resourceName}${resourceLabel ? ('_' + resourceLabel) : ''}.json`
}

/**
 * 
 * @param message 
 * @returns 
 */
export const confirm = async (message: string) => {
  const { yes } = await prompts({
    type: 'toggle',
    active: 'yes',
    inactive: 'no',
    initial: false,
    name: 'yes',
    message
  }, { onCancel: () => process.exit(0)});

  return yes;
}
