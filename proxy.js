const DESTINATION = 'localhost';
const DESTINATION_PORT = 5280;
const PORT = 5443;

let https = require('https');
var http = require('http');
let fs = require('fs');
let headers = {
    "Strict-Transport-Security": "max-age=31536000;\ includeSubdomains;\ preload",
    "Content-Security-Policy": "default-src\ 'self'\ https:\ data:\ 'unsafe-inline'\ 'unsafe-eval'",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1;\ mode=block",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
};
let options = {
    pfx: fs.readFileSync(__dirname + '/heyhey.pfx'),
    passphrase: 'password',
};

// const options = {
//   key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
//   cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
// };


https.createServer(options, proxyServer).listen(PORT);

console.log(`proxy running at https://localhost:${PORT}`);

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


function proxyServer(req, res) {

    var nonStringExtentions = [
        '.woff2', '.woff', '.tff',
        '.png', '.jpg', '.ico', '.gif',
    ];

    var responseAsString = !hasExtention(nonStringExtentions, req.url);

    var options = {
        host: DESTINATION,
        path: req.url,
        port: DESTINATION_PORT,
        method: req.method,
    };

    var request = http.request(options, callback);

    req.on('error', (err) => console.log('req: ', err));
    request.on('error', (err) => console.log('request: ', err));

    if (req.method.toLowerCase() === 'get') {
        request.end();
    }

    if (req.method.toLowerCase() === 'post' || req.method.toLowerCase() === 'put') {
        let body = [];

        req.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();

            request.write(body);
            request.end();
        });
    }

    function callback(response) {
        let body = [];

        //another chunk of data has been recieved, so append it to `body`
        response.on('data', (chunk) => {
            body.push(chunk);
        });

        //the whole response has been recieved, so we assemble the body as appropriate
        response.on('end', () => {
            body = Buffer.concat(body);
            if (responseAsString) {
                body = body.toString().replace(
                    new RegExp(`http://localhost:${DESTINATION_PORT}`, 'g'),
                    `https://localhost:${PORT}`
                );
            }

            processObject(response.headers, (h, v) => res.setHeader(h, v));
            processObject(headers, (h, v) => res.setHeader(h, v));

            res.end(body);
        });
    }
}

function hasExtention(exts, str) {
    for (var i = 0, l = exts.length; i < l; i++) {
        if (str.toLowerCase().indexOf(exts[i].toLowerCase()) !== -1) {
            return true;
        }
    }
    return false;
}

function processObject(obj, process) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            process(key, obj[key]);
        }
    }
}
