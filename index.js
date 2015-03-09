var path = require('path');
var fs = require('fs');
var through = require('through2');
var bouncy = require('bouncy');
var BufferList = require('bl');
var http = require('http');
var st = require('st');
var WebSocketServer = require('ws').Server;
var tap = require('tap-finished');
var spawn = require('child_process').spawn;

/**
  # broth

  Should only be used in when neither [`testling`](https://github.com/substack/testling)
  nor [`smokestack`](https://github.com/hushsk/smokestack) meet your needs.

  ## Usage

  Look, if you really insist then the following is a brief intro on how to use `broth`.

  Firstly, it follows the piping syntax that `smokestack` uses, but makes no attempt to
  launch chrome or firefox or do anything fancy like that.  It just starts the specified
  `<launcher>` process and passes it the url to launch as the first and only argument:

  ```
  browserify test/blah.js | broth <launcher>
  ```

  If you do have a test server that you want to run as part of your test suite, ensure
  that it exists at `test/server.js` and looks something like this:

  ```js
  module.exports = function() {
    return require('http').createServer();
  };
  ```

  If such a file exists, then broth will run the server, start it listening on a random
  port and use [`bouncy`](https://github.com/substack/bouncy) to route any unknown
  requests to it.
**/

module.exports = function(launcher) {
  var browser;
  var script = new BufferList();
  var stream = through(write, launch);
  var assetServer = http.createServer(handleRequest);
  var monitor = tap(function(results) {
    process.exit(results.errors.length);
  });

  var collector = new WebSocketServer({
    server: assetServer,
    path:  '/__broth/socket'
  });

  var mount = st({
    index: 'index.html',
    path: __dirname + '/static',
    url: '/__broth',
    passthrough: true
  });
  var testServerPath = path.resolve('test/server.js');
  var testServer;

  function abortOnError(err) {
    if (! err) {
      return;
    }

    out.error(err);
    return process.exit(1);
  }

  function handleRequest(req, res) {
    mount(req, res, function() {
      if (req.url === '/__broth/script.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(script.toString());
      }
      else {
        res.writeHead(404);
        res.end('not found');
      }
    });
  }

  function launch() {
    // spawn the browser
    browser = spawn(launcher, [
      'http://localhost:' + server.address().port + '/__broth/'
    ]);
  }

  // gobble the incoming stream into a buffer list for the script
  function write(chunk, encoding, callback) {
    script.append(chunk);
    callback();
  }

  if (fs.existsSync(testServerPath)) {
    testServer = require(testServerPath)();
    testServer.listen(0, abortOnError);
  }

  assetServer.listen(0, abortOnError);

  // start bouncy
  server = bouncy(function(req, res, bounce) {
    if (req.url.slice(0, 8) === '/__broth') {
      return bounce(assetServer.address().port);
    }
    else if (testServer) {
      bounce(testServer.address().port);
    }
  });

  server.listen(0);

  collector.on('connection', function(ws) {
    ws.on('message', function(message) {
      stream.push(message + '\n');
      monitor.write(message + '\n');
    });
  });

  return stream;
};
