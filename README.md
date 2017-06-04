### [denodeify](https://github.com/warren-bank/node-denodeify)

As we all know, Node.js uses the convention of passing a callback function
as the final parameter to functions that perform asynchronous tasks;
the result (or error) is returned at a later time via this callback.

Many of us prefer Promises over callbacks.<br>
Prior to ES6, we relied upon polyfill libraries (ex: [Q](https://github.com/kriskowal/q), [Bluebird](https://github.com/petkaantonov/bluebird), etc).<br>
Now that ES6 is (mostly) supported, native Promises are available.

This small library uses ES6 features to "denodeify" functions that obeys Node.js conventions.<br>
The module includes two functions:
  * `denodeify`
  * `denodeify_net_request`

#### Installation:

```bash
npm install --save @warren-bank/node-denodeify
```

#### API:

`proxy = denodeify(function)`:
* Summary:
  * accepts a Function and returns a Proxy
  * when the Proxy is called, a Promise is returned
* Input parameters:
  * {Function} required
  * {Object} optional: 'this' context for calls to Function
* Return value:
  * {Proxy}
* Characteristics of Function:
  * last input parameter is a callback `function(error, result)`
* Changes to signature of Function (via the Proxy):
  * input:
    * the last parameter (callback function) is removed
  * output: Promise

`proxy = denodeify_net_request(function)`:
* Summary:
  * accepts a Function and returns a Proxy
  * when the Proxy is called, a Promise is returned
* Input parameters:
  * {Function} required
  * {Object} optional: 'this' context for calls to Function
* Return value:
  * {Proxy}
* Characteristics of Function:
  * makes a network request
  * Signature of Function:
    * input: `(options[, callback])`
    * output: Request object
  * Signature of callback:
    * input: `(ResponseObject)`
  * Request object is a writable stream
  * Response object is a readable stream
* Changes to signature of Function (via the Proxy):
  * input: `(options[, PostData])`
    * acceptable formats of `PostData`:
      * string (ex: `'a=1&b-2'`)
      * object (ex: `{a:1,b:2}`)
  * output: Promise

#### Example:

```javascript
const {denodeify, denodeify_net_request} = require('@warren-bank/node-denodeify')

const fs = {
  readFile: denodeify( require('fs').readFile ),
  writeFile: denodeify( require('fs').writeFile )
}

const http = {
  get: denodeify_net_request( require('http').get ),
  request: denodeify_net_request( require('http').request )
}

const https = {
  get: denodeify_net_request( require('https').get ),
  request: denodeify_net_request( require('https').request )
}

fs.readFile('/etc/hosts', 'utf8')
.then((data) => {
  console.log('passwd:', data)
})
.catch((error) => {
  console.log('Error:', error.message)
})

http.get('http://nodejs.org/dist/index.json')
.then((data) => {
  var all_releases, newest_release
  all_releases = JSON.parse(data)
  newest_release = all_releases.length ? all_releases[0] : {}
  console.log('newest release of Node.js:', newest_release.version)
})
.catch((error) => {
  console.log('Error:', error)
})
```

#### Requirements:

* Node version: v6.4.0 (and higher)
  * [ES6 support](http://node.green/)
    * v0.12.18+: Promise
    * v4.08.03+: Object shorthand methods
    * v5.12.00+: spread operator
    * v6.04.00+: Proxy constructor
    * v6.04.00+: Proxy 'apply' handler
    * v6.04.00+: Reflect.apply
  * tested in:
    * v7.9.0
* no external dependencies

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
