const url = require('url')
const querystring = require('querystring')

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
        cb = function(error, result){
          if (error) reject(error)
          else resolve(result)
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
        var cb, args
        var req
        var [req_options, POST_data='', config_options={}] = _args
        if (typeof req_options === 'string'){
          req_options = url.parse(req_options)
        }
        if (typeof POST_data === 'object'){
          POST_data = querystring.stringify(POST_data)
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
              var _data = configs.binary ? Buffer.concat(data) : data.join('')

              res.destroy()
              data = undefined

              resolve(_data)
            })
          }
        }
        args = [req_options, cb]
        try {
          req = Reflect.apply(fwcb, (ctx || _ctx || null), args)
          req.on('error', (error) => { reject(error) })
          if (POST_data) req.write(POST_data)
          req.end()
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

module.exports = {denodeify, denodeify_net_request}
