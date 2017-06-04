const url = require('url')
const querystring = require('querystring')

/**
 * Wrap Function with Proxy.
 * Characteristics of Function:
 *   - final input parameter is a callback function(error, result)
 * Changes to Signature of Function:
 *   - drops the final input parameter
 *   - returns a Promise
 * @param {Function} fwcb    function with callback
 * @param {Object} ctx       'this' context
 * @return {Object}          Proxy
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
 * Wrap Function (that makes a network request, returns a Request object, and accepts callback that takes a Response object) with Proxy that returns Promise
 * @param {Function} fwcb    function to make network request
 * @param {Object} ctx       'this' context
 * @return {Object}          Promise
 */

/**
 * Wrap Function with Proxy.
 * Characteristics of Function:
 *   - makes a network request
 *     - returns a Request object
 *     - final input parameter is a callback function(Response object)
 *   - Request object is a writable stream
 *   - Response object is a readable stream
 * Changes to Signature of Function:
 *   - replaces the final input parameter:
 *     - drops callback function
 *     - adds (optional) POST data
 *       - string (ex: 'a=1&b-2')
 *       - object (ex: {a:1,b:2})
 *   - returns a Promise
 * @param {Function} fwcb    function with callback
 * @param {Object} ctx       'this' context
 * @return {Object}          Proxy
 */
const denodeify_net_request = function(fwcb, ctx){
  var handler, proxy
  handler = {
    apply(_fwcb, _ctx, _args){
      return new Promise((resolve, reject) => {
        var cb, args
        var req
        var [options, POST_data] = _args
        if (typeof options === 'string'){
          options = url.parse(options)
        }
        if (typeof POST_data === 'object'){
          POST_data = querystring.stringify(POST_data)
        }
        var data=''
        cb = function(res){
          if (res.statusCode !== 200){ reject(new Error(`HTTP response status code: ${res.statusCode}`)) }
          res.setEncoding('utf8')
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => { resolve(data) })
        }
        args = [options, cb]
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