const {Buffer}    = require('buffer')
const querystring = require('querystring')
const stream      = require('stream')
const url         = require('url')

/**
 * Wrap Function with Proxy.
 * Characteristics of Function:
 *   - final input parameter is a callback function(error, result)
 * Changes to Signature of Function:
 *   - remove the final input parameter
 *   - return a Promise
 * @param {Function} fwcb    function with callback
 * @param {Object} ctx       'this' context
 * @return {Proxy}
 */
const denodeify = function(fwcb, ctx){
  var handler, proxy
  handler = {
    apply(_fwcb, _ctx, _args){
      return new Promise((resolve, reject) => {
        var cb, args
        cb = function(error, ...result){
          if (error) reject(error)
          else {
            // Promise can only resolve a single value!
            // This is NOT valid:
            //     resolve(...result)
            // If multiple values are passed to the callback function,
            // then resolve them in an Array,
            // and use destructuring to retrieve them later:
            //     .then(([arg1, arg2, arg3, ...args]) => {})
            if (! result || (result.length === 0)) resolve(undefined)
            else if (result.length === 1) resolve(result[0])
            else resolve(result)
          }
        }
        args = [..._args, cb]
        try {
          Reflect.apply(fwcb, (ctx || _ctx || null), args)
        }
        catch(error){
          reject(error)
        }
      })
    }
  }
  proxy = new Proxy(fwcb, handler)
  return proxy
}

/**
 * Wrap Function with Proxy.
 * Characteristics of Function:
 *   - makes a network request
 *     - returns a Request object
 *   - Signature:
 *     - (RequestOptions, callback)
 *     - Signature of callback function: (ResponseObject)
 *   - Request object is a writable stream
 *   - Response object is a readable stream
 * Changes to Signature of Function:
 *   - Signature:
 *     - (RequestOptions, PostData, ConfigOptions)
 *     - format of PostData:
 *       - string (ex: 'a=1&b-2')
 *       - object (ex: {a:1,b:2})
 *       - Buffer
 *       - Readable stream
 *     - format of ConfigOptions:
 *       - object: {
 *           validate_status_code: function(code), // Function or falsy. Enables throwing an Error, conditional on HTTP status code.
 *           binary: false,                        // Boolean. `false` indicates that the Response stream should be text (utf8 encoding)
 *           stream: false                         // Boolean. `false` indicates that the Response stream should be entirely buffered, and its final value (string or Buffer) returned when the Promise is resolved. `true` indicates that the Response stream should be returned when the Promise is resolved. In this case, it can be piped elsewhere. Doing so removes the need to buffer the entire data file in memory.
 *                                                 //          (note: the "binary" option can be used in combination to set the encoding on the Response stream before it is returned. `{binary:true}` leaves the encoding undefined, which results in chunks of Buffer data.)
 *         }
 *   - returns a Promise
 * @param {Function} fwcb    function with callback
 * @param {Object} ctx       'this' context
 * @return {Proxy}
 */
const denodeify_net_request = function(fwcb, ctx){
  var handler, proxy
  handler = {
    apply(_fwcb, _ctx, _args){
      return new Promise((resolve, reject) => {
        var cb, args, error_handler
        var req
        var [req_options, POST_data='', config_options={}] = _args
        if (typeof req_options === 'string'){
          req_options = url.parse(req_options)
        }
        if (req_options.headers) {
          if (! req_options.headers instanceof Object){
            delete req_options.headers
          }
          else {
            const normalized_headers = {}
            let old_key, new_key, value
            for (old_key in req_options.headers){
              new_key = old_key.toLowerCase()
              value   = req_options.headers[old_key]
              normalized_headers[new_key] = value
            }
            req_options.headers = normalized_headers
          }
        }
        if (POST_data) {
          if (! req_options.headers) req_options.headers = {}

          if (POST_data instanceof stream.Readable) {
            if (! req_options.headers['content-type']) req_options.headers['content-type'] = 'application/octet-stream'
          }
          else if (POST_data instanceof Buffer) {
            req_options.headers['content-length'] = POST_data.length

            if (! req_options.headers['content-type']) req_options.headers['content-type'] = 'application/octet-stream'
          }
          else {
            if (POST_data instanceof Object) {
              if (req_options.headers['content-type'] === 'application/json') {
                POST_data = JSON.stringify(POST_data)
              }
              else {
                POST_data = querystring.stringify(POST_data)

                delete req_options.headers['content-type']
              }
            }
            if (typeof POST_data === 'string') {
              req_options.headers['content-length'] = Buffer.byteLength(POST_data, 'utf8')

              if (! req_options.headers['content-type']) req_options.headers['content-type'] = 'application/x-www-form-urlencoded'
            }
          }
        }
        var configs = Object.assign(
          {},
          {
            // default user-configurable option values
            validate_status_code: function(code, headers){
              var error
              if (code !== 200){
                error = new Error(`HTTP response status code: ${code}`)
                error.statusCode = code
                if (headers && headers.location){
                  error.location = headers.location
                }
                throw error
              }
            },
            binary: false,
            stream: false
          },
          config_options
        )
        var data=[]
        cb = function(res){
          if (typeof configs.validate_status_code === 'function'){
            try {
              configs.validate_status_code(res.statusCode, res.headers)
            }
            catch (error){
              res.destroy()
              return reject(error)
            }
          }
          if (! configs.binary){
            // Setting an encoding causes the stream data to be returned as strings of the specified encoding rather than as Buffer objects
            res.setEncoding('utf8')
          }
          if (configs.stream){
            resolve(res)
          }
          else {
            res.on('data', (chunk) => { data.push(chunk) })
            res.on('end', () => {
              var _data
              _data         = configs.binary ? Buffer.concat(data) : new String(data.join(''))
              _data.headers = {...res.headers}

              res.destroy()
              data = undefined

              resolve(_data)
            })
          }
        }
        args = [req_options, cb]
        error_handler = (error) => {
          if ((error.code === 'HPE_INVALID_CONSTANT') && error.bytesParsed) {
            // ignore
          }
          else {
            reject(error)
          }
        }
        try {
          req = Reflect.apply(fwcb, (ctx || _ctx || null), args)
          req.on('error', error_handler)
          if (POST_data) {
            if (POST_data instanceof stream.Readable)
              POST_data.pipe(req)
            else
              req.write(POST_data)
          }
          req.end()
        }
        catch(error){
          error_handler(error)
        }
      })
    }
  }
  proxy = new Proxy(fwcb, handler)
  return proxy
}

module.exports = {denodeify, denodeify_net_request}
