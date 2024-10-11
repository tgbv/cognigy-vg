import prompt from "prompts";
import { ILocalConfig, loadJsonFile } from "../lib";
import API from "../lib/api";
import { PhoneNumberUtil } from "google-libphonenumber";

/**
 * 
 */
export default async (_, options: any ) => {
  const config = loadJsonFile(options.configFile) as ILocalConfig;
  const api = new API(config, options.AU);

  const phones = await api.getRemotePhones();

  const { from } = await prompt({
    type: 'select',
    name: 'from',
    message: 'Caller',
    choices: phones.map(({ number }) => ({
      title: number, 
      value: number
    })),
    initial: 0,
  });

  const { to } = await prompt({
    type: 'text',
    name: 'to',
    message: 'Callee. Must contain the country code',
    initial: '+1234567890',
    validate: (value: string) => {
      try {
        const phoneUtil = PhoneNumberUtil.getInstance();

        if(phoneUtil.isValidNumber(
          phoneUtil.parse(value.trim().replace(' ', ''))
        )) {
          return true;
        }
      } catch(e) {}

      return 'Invalid phone number';
    }
  });

  const { tag } = await prompt({
    type: 'text',
    name: 'tag',
    message: 'JSON data to send to bot when call initiates',
    initial: '{"hello": "world"}',
    validate: v => {
      try {
        JSON.parse(v);
      } catch(e) {
        return 'Please provide valid JSON.';
      }

      return true;
    }
  });

  let apiKeys = await api.getRemoteAccountApiKeys();
  if(apiKeys.length === 0) {
    console.log('WARN: No API key found for account', config.accountSid, '. Generating one...');
    await api.createRemoteAccountApiKey();
    apiKeys = await api.getRemoteAccountApiKeys();
  }

  await api.createCall(
    from[0] === '+' ? from : `+${from}`, 
    to[0] === '+' ? to : `+${to}`, 
    phones.find(o => o.number === from).application_sid, 
    JSON.parse(tag),
    apiKeys[0].token
  );

  console.log('Done.');
}