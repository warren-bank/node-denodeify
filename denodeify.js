const {Buffer}    = require('buffer')
const querystring = require('querystring')
const stream      = require('stream')
const url         = require('url')

const {MultipartStream} = require('./lib/multipart')

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
  const handler = {
    apply(_fwcb, _ctx, _args){
      return new Promise((resolve, reject) => {
        const cb = function(error, ...result){
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
        const args = [..._args, cb]
        try {
          Reflect.apply(fwcb, (ctx || _ctx || null), args)
        }
        catch(error){
          reject(error)
        }
      })
    }
  }
  const proxy = new Proxy(fwcb, handler)
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
 *       - object: {name, value}
 *           name: string
 *           value: string || number || Buffer || object: {file, filename, mime}
 *               file:     Readable stream
 *               filename: string
 *                         absolute filepath, or (if file) basename only
 *               mime:     string
 *                         content-type of file/filename
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
  const handler = {
    apply(_fwcb, _ctx, _args){
      return new Promise((resolve, reject) => {
        let [req_options, POST_data='', config_options={}] = _args
        let multipart
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

          if (Array.isArray(POST_data)) {
            POST_data = POST_data.filter(part => part && (part instanceof Object) && part.name && part.value && (typeof part.name === 'string'))

            if (POST_data.length) {
              multipart = createMultipartStream()

              req_options.headers['content-type'] = multipart.contentType(null, 'multipart/form-data')
            }
            else {
              POST_data = ''
            }
          }
          else if (POST_data instanceof stream.Readable) {
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
        const configs = Object.assign(
          {},
          {
            // default user-configurable option values
            validate_status_code: function(code, headers){
              if (code !== 200){
                const error = new Error(`HTTP response status code: ${code}`)
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
        let data=[]
        const cb = function(res){
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
              const _data   = configs.binary ? Buffer.concat(data) : new String(data.join(''))
              _data.headers = {...res.headers}

              res.destroy()
              data = undefined

              resolve(_data)
            })
          }
        }
        const args = [req_options, cb]
        const error_handler = (error) => {
          if ((error.code === 'HPE_INVALID_CONSTANT') && error.bytesParsed) {
            // ignore
          }
          else {
            reject(error)
          }
        }
        try {
          const req = Reflect.apply(fwcb, (ctx || _ctx || null), args)
          req.on('error', error_handler)
          if (POST_data) {
            if (Array.isArray(POST_data)) {
              multipart.pipe(req)

              for (let i=0; i < POST_data.length; i++) {
                const part = POST_data[i]

                if (
                    ('number' === typeof part.value)
                 || ('string' === typeof part.value)
                 || Buffer.isBuffer(part.value)
                ) {
                  const headers = {'Content-Disposition': `form-data; name="${ encodeURIComponent(part.name) }"`}

                  multipart.write(headers, part.value)
                  continue
                }

                if (part.value instanceof Object) {
                  const _value = {...part.value}

                  if (_value.file && !(_value.file instanceof stream.Readable))
                    delete _value.file
                  if (_value.filename && !('string' === typeof _value.filename))
                    delete _value.filename

                  if (_value.file || _value.filename) {
                    const details = {
                      headers:  {'Content-Disposition': `form-data; name="${ encodeURIComponent(part.name) }"`},
                      file:     _value.file     || null,
                      filename: _value.filename || null
                    }

                    if (!details.headers['content-type'] && (_value['mime'] || _value['mime-type'] || _value['content-type']))
                      details.headers['content-type'] = _value['mime'] || _value['mime-type'] || _value['content-type']

                    if (!details.headers['content-type'] && _value.headers && (_value.headers instanceof Object) && _value.headers['content-type'])
                      details.headers['content-type'] = _value.headers['content-type']

                    if (!details.headers['content-type'] && details.file && !details.filename)
                      details.headers['content-type'] = 'application/octet-stream'

                    multipart.writeFile(details)
                    continue
                  }
                }
              }

              multipart.end(() => {req.end()})
            }
            else if (POST_data instanceof stream.Readable) {
              POST_data.pipe(req)

              POST_data.on('end',   () => {req.end()})
              POST_data.on('close', () => {req.end()})
              POST_data.on('error', () => {req.end()})
            }
            else {
              req.write(POST_data)
              req.end()
            }
          }
          else {
            req.end()
          }
        }
        catch(error){
          error_handler(error)
        }
      })
    }
  }
  const proxy = new Proxy(fwcb, handler)
  return proxy
}

// customized helper
const createMultipartStream = function createMultipartStream(){
  let prefix = ''
  while (prefix.length < 20) {
    prefix += Math.random().toString(36).slice(2)
  }
  prefix = Array(10 + 1 - 2).join('-') + 'denodeify-' + prefix

  const options = {prefix}

  return new MultipartStream(options)
}

module.exports = {denodeify, denodeify_net_request}
