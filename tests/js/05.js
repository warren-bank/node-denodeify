#!/usr/bin/env node

const {denodeify_net_request} = require('../../denodeify')

const http = {
  get: denodeify_net_request( require('http').get )
}

const https = {
  get: denodeify_net_request( require('https').get )
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

// follow all redirects
const make_net_request = function(url){
  var regex, proto
  regex = /^https/i
  proto = (regex.test(url)) ? https : http

  proto.get(url)
  .then((data) => {
    log(sep.L, 'URL:', "\n  ", url, "\n\n", 'response headers:', sep.R, JSON.stringify(data.headers, null, 2), "\n\n", 'response data:', sep.R, data)
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
