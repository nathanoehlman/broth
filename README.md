# broth

Should only be used in when neither [`testling`](https://github.com/substack/testling)
nor [`smokestack`](https://github.com/hushsk/smokestack) meet your needs.


[![NPM](https://nodei.co/npm/broth.png)](https://nodei.co/npm/broth/)

[![experimental](https://img.shields.io/badge/stability-experimental-red.svg)](https://github.com/dominictarr/stability#experimental) 

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

## License(s)

### ISC

Copyright (c) 2015, Damon Oehlman <damon.oehlman@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
