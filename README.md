# cognigy-vg

CLI to interact with <a href="https://www.cognigy.com/platform/cognigy-voice-gateway" target="_blank">Cognigy Voice Gateway</a> product. It is account-scoped. Not affiliated with Cognigy or its subsidiaries.

Features include and are not limited to:
- Creating local snapshots (.csnap like).
- Restoring local snapshots remotely.
- Pulling VG resources locally.
- Pushing VG resources remotely.
- Creating outbound calls.

<img src="https://raw.githubusercontent.com/tgbv/cognigy-vg/refs/heads/main/demos/create-snap.gif">

<img src="https://raw.githubusercontent.com/tgbv/cognigy-vg/refs/heads/main/demos/restore-snap.gif">

### Quick setup

```bash
$ npm i -g cognigy-vg

$ cognigy-vg init
```

### Commands overview

```bash
Usage: cognigy-vg [options] [command]

CLI to interact with Cognigy Voice Gateway.

Options:
  -V, --version                                      output the version number
  -h, --help                                         display help for command

Commands:
  init [options]                                     Guided way to initialize new configuration file.
  pull [options] <resoureType> <resourceIdentifier>  Pull one resource from API to disk. Can be "app", "carrier", "speech", "phone",
                                                     "obroutes".
  push [options] <resoureType> <resourceIdentifier>  Push one resource from disk to API. Can be "app", "carrier", "speech", "phone".
  clone [options]                                    Clone locally VG app/service provider with all dependencies.
  snapshot [options] <action> [snapshotName]         Create, restore a snapshot remotely, or inspect it locally.
  create [options] <call>                            Guided way to create an outbound call.
  help [command]                                     display help for command
```

<hr>

### API FQDN

Usually the FQDN has the scheme: `api-{VG tenant FQDN}`.

Trial tenant FQDN is `vg-trial.cognigy.ai`. Therefore the trial API FQDN is: `api-vg-trial.cognigy.ai`. 

### Using the right API Key

Unlike v1, you will need to request a single ServiceProvider API key which has access to the account you want to work with, and the BYO Services linked to it. Please contact Cognigy Support to request one.

### Snapshots

A snapshot (.vgsnap) is a JSON file containing the entire dump of your VG Account & BYO Services configuration. To avoid unauthorized access, it is encrypted using AES-256-GCM algorithm provided by OpenSSL. If you do not have the OpenSSL bundle installed on your local machine, you cannot use this feature. Never change any byte of the vgsnap file manually, as there's a big chance you will not be able to decrypt it afterwards.

The encryption key of snapshots is generated at project initialization. If you plan on restoring the created snapshots, <b>never ever loose the key from configuration file: `snapEncryptionKey`</b>

Snapshots are cross-compatible remotely between different VG accounts / byo services, but may not be compatible locally between major CLI package versions. If there's incompatibility, you will be notified when executing 'snapshot restore' command.

### Speech services not working after restoration?

Cognigy decided to safeguard Speech services credentials like treasures from Indiana Jones <i>(and neglect the Basic Authentication of bot webhooks / carrier endpoints entirely)</i>. Therefore keys of speech services are not returned in full by their API. After speech services are pulled/restored remotely, you will have to manually update their API keys to the correct ones.

### Err... "obroutes" ?

Term 'obroutes' stands for 'Outbound calling routes'. It references the entities from section <a href="https://docs.cognigy.com/voice-gateway/webapp/outbound-call-routing/" target="_blank">Outbound Call Routing</a>. It's a naming I adopted because the technical term Cognigy uses for outbound calling routes is 'Least cost routes' which doesn't mean a darn thing. LCR sounds like banned meth naming.
