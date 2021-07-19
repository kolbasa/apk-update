### APK Update

This node script compresses an APK update and creates a manifest file with the version info next to it.

### Installation

```bash
npm install -g apk-update
```

### Instructions

```bash
USAGE:
	apk-update <apk-path> <output-path> [<password>]

	apk-path    - path to your apk
	output-path - your update is copied here
	password    - optional password
```

### Sample usage

This example...
```bash
apk-update "Demo.apk" "update/"
```

...generates two files...

```
update/
├ Demo.zip
└ Demo.json
```

...with this version info:
```json
{
  "name": "Demo.apk",
  "size": 1760840,
  "compressedSize": 1616355,
  "checksum": "29fec3254eded5804e103c0413f17c3d",
  "app": {
    "name": "Apk Updater Demo",
    "package": "de.kolbasa.apkupdater.demo",
    "version": {
      "code": 10000,
      "name": "1.0.0"
    }
  }
}
```
