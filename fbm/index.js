const axios = require('axios')
const convert = require('xml-js')
const crypto = require('crypto')
const fsp = require('fs/promises');

const username = 'fritz3183'
const password = 'larve4597'

let challenge
let hash
let sid

const minutes = 5

console.log("Program started");
// (async () => {
    setInterval(async function () {
        console.log("Starting run");
        await run()
        console.log("Run finished");
    }, minutes * 60 * 1000);
// })();

async function run() {
    await axios.get('http://192.168.178.1/login_sid.lua')
        .then(res => {
            const login_result = result_to_json(res.data)

            challenge = login_result.SessionInfo.Challenge._text

            // Convert string from UTF-8 to UTF-16LE
            const utf16leBuffer = Buffer.from(`${challenge}-${password}`, 'utf16le')

            // Calculate MD5 hash
            hash = crypto
                .createHash('md5')
                .update(utf16leBuffer)
                .digest('hex')
        })
        .catch(err => {
            console.log('Error: ', err.message)
        });

    await axios.post('http://192.168.178.1/login_sid.lua', 'response=' + challenge + '-' + hash + '&username=' + username).then(res => {
        let result = result_to_json(res.data)
        sid = result.SessionInfo.SID._text
    })

    await axios.post('http://192.168.178.1/data.lua', 'sid=' + sid + 'lang=de&page=homeNet&no_sidrenew=').then(async res => {

        let current_devices = []

        res.data.data.devices.forEach(e => {
            if (e.category !== 'smarthome') {

                current_devices.push({
                    ip: e.ipinfo,
                    name: e.nameinfo.name,
                    uid: e.UID
                })
            }
        })

        const file = await fsp.readFile('log.json');
        let data = JSON.parse(file);
        data.push({timestamp: Math.floor(Date.now()/1000), devices: current_devices});
        await fsp.writeFile('log.json', JSON.stringify(data, null, 4));

    })
}



function result_to_json(result) {
    return JSON.parse(convert.xml2json(result, {compact: true, spaces: 4}));
}