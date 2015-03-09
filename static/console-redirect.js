(function() {
  var __consoleLog = console.log;
  var sock;
  var queue = [];

  function sendMessage(data) {
    if (! sock) {
      sock = new WebSocket(location.origin.replace(/^http/, 'ws') + '/__broth/socket');
      sock.onopen = sendNext;
      sock.onclose = function() {
        sock = null;
      };
    }

    if (sock.readyState === 1 && queue.length === 0) {
     return sock.send(data);
    }

    queue.push(data);
  }

  function sendNext() {
    var message = queue.shift();
    if (message !== undefined) {
      sock.send(message);
      setTimeout(sendNext, 0);
    }
  }

  console.log = sendMessage;
}());
