(function() {
  var __consoleLog = console.log;
  var sock;
  var queue = [];
  var output = document.getElementById('output');

  function sendMessage(data) {
    if (! sock) {
      sock = new WebSocket(location.origin.replace(/^http/, 'ws') + '/__broth/socket');
      sock.onopen = sendNext;
      sock.onclose = sock.onerror = function() {
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

  console.log = function(data) {
    sendMessage(data);
    output.appendChild(document.createTextNode(data + '\n'));
    window.scroll(0, document.body.clientHeight);
  };
}());
