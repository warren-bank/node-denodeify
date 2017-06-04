### [denodeify](https://github.com/warren-bank/node-denodeify)

As we all know, Node.js uses the convention of passing a callback function
as the final parameter to functions that perform asynchronous tasks;
the result (or error) is returned at a later time via this callback.

Many of us prefer Promises over callbacks.<br>
Prior to ES6, we relied upon polyfill libraries (ex: [Q](https://github.com/kriskowal/q), [Bluebird](https://github.com/petkaantonov/bluebird), etc).<br>
Now that ES6 is (mostly) supported, native Promises are available.

This small library uses ES6 features to "denodeify" Functions that obeys Node.js conventions.
The module includes two functions:
  * `denodeify`
  * `denodeify_net_request`

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
* Changes to signature of Function:
  * the last input parameter is removed
  * returns a Promise

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
    * returns a Request object
    * last input parameter is a callback `function(Response object)`
  * Request object is a writable stream
  * Response object is a readable stream
* Changes to Signature of Function:
  * the last input parameter is replaced:
    * callback function is removed
    * (optional) POST data is added; accepts either format:
      * string (ex: 'a=1&b-2')
      * object (ex: {a:1,b:2})
  * returns a Promise

#### Installation:

```bash
npm install --save @warren-bank/node-denodeify
```

#### Example:

```javascript
const {denodeify, denodeify_net_request} = require('@warren-bank/node-denodeify')

const fs = {
  readFile: denodeify( require('fs').readFile )
}
fs.readFile('/etc/hosts', 'utf8')
.then((data) => {
  console.log('passwd:', data)
})
.catch((error) => {
  console.log('Error:', error.message)
})

const http = {
  get: denodeify_net_request( require('http').get )
}
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
