#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const nodeApk = require('node-apk');

const DEFAULT_LOCALE = 'en';

const args = process.argv.slice(2);
if (args.length < 2) {
    const TAB = '\t';
    const NL = '\n';

    console.error(
        NL + 'USAGE:' + NL +
        TAB + 'apk-update <apk-path> <output-path> [<password>]' + NL + NL +
        TAB + 'apk-path    - path to your apk' + NL +
        TAB + 'output-path - your update is copied here' + NL +
        TAB + 'password    - optional password' + NL
    );
    process.exit(1);
}

const password = args[2];

let apkName;
let apkPath;

let updatePath;

let zipPath;
let manifestPath;

/**
 * @returns {void}
 */
const validatePaths = () => {
    const apk = path.parse(args[0]);
    const output = path.parse(args[1])

    apkName = apk.base;
    apkPath = path.join(apk.dir, apk.base);

    let updateName;
    if (output.ext === '.zip') {
        updateName = output.name;
        updatePath = output.dir;
    } else {
        updateName = apk.name
        updatePath = path.join(output.dir, output.base);
    }

    zipPath = path.join(updatePath, updateName + '.zip');
    manifestPath = path.join(updatePath, updateName + '.json');
};

/**
 * @returns {Promise<void>}
 */
const compressUpdate = async () => {
    process.stdout.write(
        'Compressing update' +
        (password == null ? '' : ' with password') + '... '
    );

    if (password != null) {
        archiver.registerFormat(
            'zip-encryptable',
            require('archiver-zip-encryptable')
        );
    }

    let output = fs.createWriteStream(zipPath);

    let archive = archiver(
        password == null ? 'zip' : 'zip-encryptable',
        {
            zlib: {
                level: 9
            },
            password: password
        }
    );

    archive.pipe(output);

    // noinspection JSCheckFunctionSignatures
    archive.append(fs.createReadStream(apkPath), {name: apkName});

    await archive.finalize();
    console.log('done.');
};

/**
 * @param {string} sFilePath
 * @returns {Promise<string>}
 */
const getChecksum = async (sFilePath) => {
    return await new Promise((resolve) => {
        let rs = fs.createReadStream(sFilePath);
        let hash = crypto.createHash('md5');
        hash.setEncoding('hex');
        rs.on('end', () => {
            hash.end();
            resolve(hash.read());
        });
        rs.pipe(hash);
    });
};

/**
 * @param {string} sFilePath
 * @returns {Promise<number>}
 */
const getSize = async (sFilePath) => {
    return await new Promise((resolve, reject) => {
        fs.stat(sFilePath, (err, oStats) => {
            if (err == null) {
                resolve(oStats.size);
            } else {
                reject(err);
            }
        });
    });
};

/**
 * @param {string} file
 * @returns {void}
 */
const removeFile = (file) => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
};

/**
 * @returns {void}
 */
const prepareUpdateDirectory = () => {
    if (fs.existsSync(updatePath)) {
        removeFile(zipPath);
        removeFile(manifestPath);
    } else {
        fs.mkdirSync(updatePath);
    }
};

/**
 * @returns {Promise<object>}
 */
const getAppInfo = async () => {
    const apk = new nodeApk.Apk(apkPath);

    const manifest = await apk.getManifestInfo();
    const resources = await apk.getResources();
    let label = manifest.applicationLabel;

    if (typeof label !== 'string') {
        const entries = resources.resolve(label);
        label = (
            entries.find((res) =>
                (res.locale && res.locale.language === DEFAULT_LOCALE)
            ) || entries[0]).value;
    }

    apk.close();

    return {
        name: label,
        package: manifest.package,
        version: {
            code: manifest.versionCode,
            name: manifest.versionName
        }
    };
};

/**
 * @returns {void}
 */
const createManifest = async () => {
    fs.writeFileSync(
        manifestPath,
        JSON.stringify(
            {
                name: apkName,
                size: await getSize(apkPath),
                compressedSize: await getSize(zipPath),
                checksum: await getChecksum(apkPath),
                app: await getAppInfo()
            }
        )
    );
};

(createUpdate = async () => {
    try {
        validatePaths();
        prepareUpdateDirectory();
        await compressUpdate();
        await createManifest();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
