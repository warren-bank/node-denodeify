### [denodeify](https://github.com/warren-bank/node-denodeify)

As we all know, Node.js uses the convention of passing a callback function
as the final parameter to functions that perform asynchronous tasks;
the result (or error) is returned at a later time via this callback.

Many of us prefer Promises over callbacks.<br>
Prior to ES6, we relied upon polyfill libraries (ex: [Q](https://github.com/kriskowal/q), [Bluebird](https://github.com/petkaantonov/bluebird), etc).<br>
Now that ES6 is (mostly) supported, native Promises are available.

This small library uses ES6 features to "denodeify" functions that obey Node.js conventions.<br>
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
  * {Object} optional: `this` context for calls to Function
* Return value:
  * {Proxy}
* Characteristics of Function:
  * makes a network request
  * Signature of Function:
    * input: `(RequestOptions[, callback])`
    * output: Request object
  * Signature of callback:
    * input: `(ResponseObject)`
  * Request object is a writable stream
  * Response object is a readable stream
* Changes to signature of Function (via the Proxy):
  * input: `(RequestOptions[, PostData, configs])`
    * `PostData`
      * key/value pairs written to Request object
      * acceptable formats:
        * string (ex: `'a=1&b-2'`)
        * object (ex: `{a:1,b:2}`)
    * `configs`
      * user-configurable options (with sane defaults)
      * acceptable format: {Object}
      * keys:
        * `binary`
          * type: {Boolean}
          * default: `false`
          * notes:
            * if `false`: data is read into a {string} (utf8 encoding)
            * if `true`: data is read into a {Buffer}
        * `stream`
          * type: {Boolean}
          * default: `false`
          * notes:
            * if `false`: Promise resolves to a buffered data structure ({Buffer} or {string}) that contains the entire data file in memory
            * if `true`: Promise resolves to a Readable stream, chunks of data ({Buffer} or {string}) can be retrieved as they become available
        * `validate_status_code`
          * type: {Function}
          * input:
            * {number} `code`
            * {Object} `ResponseHeaders`
          * example:
            * `{ validate_status_code: function(code, ResponseHeaders){} }`
            * `{ validate_status_code: false }`
          * default value:
            * {Function}
              * throws `Error` if `code` is not 200
              * error.statusCode = code
              * error.location = ResponseHeaders['location']
          * notes:
            * `Error` thrown in function is caught and passed to the Promise
            * a falsy {non-Function} value disables the option
  * output: Promise

#### Example:

```javascript
const {denodeify, denodeify_net_request} = require('@warren-bank/node-denodeify')

const fs = {
  readFile: denodeify( require('fs').readFile ),
  writeFile: denodeify( require('fs').writeFile ),

  createWriteStream: require('fs').createWriteStream
}

const http = {
  get: denodeify_net_request( require('http').get ),
  request: denodeify_net_request( require('http').request )
}

const https = {
  get: denodeify_net_request( require('https').get ),
  request: denodeify_net_request( require('https').request )
}

const sep = {
  div: Array(40).join('-'),
  get L(){return this.div + "\n"},
  get R(){return "\n" + this.div + "\n"}
}

const log = function(){
  var args
  args = [...arguments, "\n"]
  args = args.join('')
  console.log(args)
}

// example: read a file, then display its data
fs.readFile('/etc/hosts', 'utf8')
.then((data) => {
  log(sep.L, '"hosts" file contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})

// example: download a file, parse its JSON data, cherry pick the first object in a large array, then display the value of a particular key
http.get('http://nodejs.org/dist/index.json')
.then((data) => {
  var all_releases, newest_release
  all_releases = JSON.parse(data)
  newest_release = all_releases.length ? all_releases[0] : {}
  log(sep.L, 'newest release of Node.js:', sep.R, newest_release.version)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})

// example: request to download a file that doesn't exist, allow the default status code validation method to throw an Error, display the status code in the server Response
http.get('http://nodejs.org/i.dont.exist/404')
.then((data) => {
  log(sep.L, 'imaginary URL contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})

// example: request to download a file that doesn't exist, disable status code validation, display the (HTML) data in the server Response
http.get('http://nodejs.org/i.dont.exist/404', '', {validate_status_code: false})
.then((data) => {
  log(sep.L, 'imaginary URL contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})

// example: request a binary file, obtain the response in a Buffer, save to disk
https.get('https://codeload.github.com/warren-bank/node-denodeify/zip/master', '', {binary: true})
.then((data) => {
  var filename = 'denodeify.Buffer.zip'
  fs.writeFile(filename, data, 'binary')
  .then(() => {
    log(sep.L, 'Binary data Buffer saved to file:', sep.R, filename)
  })
  .catch((error) => {
    log(sep.L, 'Error: Failed to save binary data Buffer to file:', sep.R, filename, sep.R, error.message)
  })
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})

// example: request a binary file, obtain the response in a Readable stream, save to disk via a pipe
https.get('https://codeload.github.com/warren-bank/node-denodeify/zip/master', '', {binary: true, stream: true})
.then((stream) => {
  var filename = 'denodeify.Stream.zip'
  stream
    .pipe( fs.createWriteStream(filename) )
    .on('finish', () => {
      log(sep.L, 'Binary data Stream saved to file:', sep.R, filename)
    })
    .on('error', (error) => {
      log(sep.L, 'Error: Failed to save binary data Stream to file:', sep.R, filename, sep.R, error.message)
      stream.destroy()
    })
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})

// example: make a GET request, then follow all redirects
const make_net_request = function(url){
  var regex, proto
  regex = /^https/i
  proto = (regex.test(url)) ? https : http

  proto.get(url)
  .then((data) => {
    log(sep.L, 'URL:', "\n  ", url, "\n\n", 'response data:', sep.R, data)
  })
  .catch((error) => {
    if ((error.statusCode) && (error.statusCode >= 300) && (error.statusCode < 400) && (error.location)){
      log(sep.L, 'redirecting..', "\n  ", 'from:', "\n    ", url, "\n  ", 'to:', "\n    ", error.location)
      make_net_request(error.location)
    }
    else {
      log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
    }
  })
}
make_net_request('http://github.com/warren-bank/node-denodeify/raw/master/package.json')
```

#### Fun Fact:

* the previous example: "_make a GET request, then follow all redirects_"<br>
  inspired the library: [node-request](https://github.com/warren-bank/node-request)

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
