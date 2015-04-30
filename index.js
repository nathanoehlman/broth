var path = require('path');
var fs = require('fs');
var through = require('through2');
var proxy = require('http-proxy');
var BufferList = require('bl');
var http = require('http');
var st = require('st');
var WebSocketServer = require('ws').Server;
var tap = require('tap-finished');
var spawn = require('child_process').spawn;
var out = require('out');

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

  ## Why?

  Good question.  I was quite happy with `testling` but was starting to notice unusual
  and unpredictable failures, and while `smokestack` is going to be great I have very
  particular requirements and didn't feel that smokestack should be bent to suit my
  requirements.

**/

module.exports = function(launcher) {
  var browser;
  var proxyPort;
  var pendingServers = 1;
  var script = new BufferList();
  var stream = through(write, launch);
  var testServerPath = path.resolve('test/server.js');
  var proxies = [];
  var monitor = tap(function(results) {
    process.exit(results.errors.length);
  });


  var mount = st({
    index: 'index.html',
    path: __dirname + '/static',
    url: '/__broth',
    passthrough: true
  });

  var collector;
  var assetServer;
  var testServer;

  function abortOnError(err) {
    if (! err) {
      pendingServers -= 1;
      if (pendingServers <= 0) {
        proxies = [assetServer, testServer].map(createProxy);
      }

      return;
    }

    out.error(err);
    return process.exit(1);
  }

  function createProxy(target) {
    var server = target && proxy.createProxyServer({
      target: {
        host: 'localhost',
        port: target.address().port
      }
    });

    if (server) {
      server.on('error', createServers);
    }
    
    return server;
  }

  function createServers() {
    // initialise the number of pending servers
    pendingServers = 1;

    proxies.forEach(function(proxy) {
      proxy.close();
    })

    // create the asset server
    assetServer = http.createServer(handleRequest);

    // create the collector
    collector = new WebSocketServer({
      server: assetServer,
      path:  '/__broth/socket'
    });

    collector.on('connection', function(ws) {
      ws.on('message', function(message) {
        stream.push(message + '\n');
        monitor.write(message + '\n');
      });
    });

    assetServer.once('error', createServers);
    assetServer.listen(0, abortOnError);

    // create the test server
    if (fs.existsSync(testServerPath)) {
      pendingServers += 1;
      testServer = require(testServerPath)();
      testServer.once('error', createServers);
      testServer.listen(0, abortOnError);
    }
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
    browser = spawn(launcher || 'x-www-browser', [
      'http://localhost:' + server.address().port + '/__broth/'
    ], { stdio: ['pipe', process.stderr, process.stderr] });

    browser.on('close', function(code) {
      out('browser process exited with errorcode: ' + code);
      process.exit(code);
    });
  }

  function proxyRequest(type) {
    return function(req, res) {
      if (req.url.slice(0, 8) === '/__broth') {
        return proxies[0][type].apply(proxies[0], arguments);
      }
      else if (proxies[1]) {
        return proxies[1][type].apply(proxies[1], arguments);
      }

      res.writeHead(404);
      res.end('not found');
    };
  }

  function startProxy() {
    server = http.createServer(proxyRequest('web'));
    server.on('upgrade', proxyRequest('ws'));
    server.on('error', function(err) {
      startProxy();
    })

    server.listen(proxyPort || 0, function(err) {
      if (! err) {
        proxyPort = server.address().port;
      }
    });
  }

  // gobble the incoming stream into a buffer list for the script
  function write(chunk, encoding, callback) {
    script.append(chunk);
    callback();
  }

  createServers();
  startProxy();

  return stream;
};
