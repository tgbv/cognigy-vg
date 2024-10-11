#!/usr/bin/env node

import { Argument, Command } from "commander";
import initCommand from "./commands/init";
import pullCommand from "./commands/pull";
import pushCommand from "./commands/push";
import cloneCommand from "./commands/clone";
import snapshotCommand from "./commands/snapshot";
import { loadJsonFile } from "./lib";
import createCallCommand from "./commands/create-call";

const resourceTypesArg = new Argument('<resoureType>', 'Resource type to pull from API.')
  .choices(['app', 'carrier', 'speech', 'phone', 'obroutes']);

const program = new Command();

const packageJson = loadJsonFile(`${__dirname}/../package.json`);

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
  .description('Create, restore a snapshot remotely, or inspect it locally.')
  .addArgument(new Argument('<action>', '').choices(['create', 'restore', 'inspect']))
  .argument('[snapshotName]', 'Name or path to snapshot. Is required if command is "restore" or "inspect".')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('--force', 'Forcefully restore snapshot even if versions mismatch. Can be used with "restore" command.')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .option('-y', 'Skip confirmations.')
  .action(snapshotCommand);

program
  .command('create call')
  .description('Guided way to create an outbound call.')
  .option('--configFile <string>', 'Configuration file path.', './config.json')
  .option('-AU', 'Allows unauthorized SSL certificates. Useful if your machine is behind VPN.')
  .action(createCallCommand)

  
program.parse();
