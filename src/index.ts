#!/usr/bin/env node

import { Argument, Command } from "commander";
import { readFileSync } from "fs";
import initCommand from "./commands/init";
import pullCommand from "./commands/pull";
import pushCommand from "./commands/push";
import cloneCommand from "./commands/clone";
import snapshotCommand from "./commands/snapshot";
import setToken from "./commands/set-token";

const resourceTypesArg = new Argument('<resoureType>', 'Resource type to pull from API.')
  .choices(['app', 'carrier', 'speech', 'phone', 'obroutes']);

const program = new Command();

const packageJson = JSON.parse(readFileSync('./package.json').toString());

program
  .name(packageJson.name)
  .version(packageJson.version)
  .description(packageJson.description);

program
  .command('init')
  .description('Guided way to initialize new configuration file.')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .action(initCommand);

program
  .command('set token')
  .description('Quickly set workspace API key/bearer token.')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .action(setToken);

program
  .command('pull')
  .description('Pull one resource from API to disk. Can be "app", "carrier", "speech", "phone", "obroutes".')
  .addArgument(resourceTypesArg)
  .argument('<resourceIdentifier>', 'Can be resource name, vendor, phone depending on case.')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('--label <string>', 'Required only if resourceType is "carrier" and multiple vendors are registered.')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .option('-y', 'Skip asking for confirmation.')
  .action(pullCommand);

program
  .command('push')
  .description('Push one resource from disk to API. Can be "app", "carrier", "speech", "phone".')
  .addArgument(resourceTypesArg)
  .argument('<resourceIdentifier>', 'Can be resource name, vendor, phone depending on case.')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('--label <string>', 'Required only if resourceType is "carrier" and multiple vendors are registered.')
  .option('--create', 'Creates the resource if it does not exist.')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .option('-y', 'Skip asking for confirmation.')
  .action(pushCommand);

program
  .command('clone')
  .description('Clone locally VG app/service provider with all dependencies.')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .option('-y', 'Skip confirmations.')
  .action(cloneCommand);

program
  .command('snapshot')
  .description('Create or restore a snapshot remotely.')
  .addArgument(new Argument('<action>', 'Must be create or restore.').choices(['create', 'restore']))
  .argument('[snapshotName]', 'Name or path to snapshot. Is required if command is "restore".')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .option('-y', 'Skip confirmations.')
  .action(snapshotCommand);
  
program.parse();
