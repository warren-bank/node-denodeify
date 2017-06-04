#!/usr/bin/env node

const {denodeify, denodeify_net_request} = require('../../denodeify')

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
    log(sep.L, 'URL:', "\n  ", url, "\n\n", 'response data:', sep.R, data)
  })
  .catch((error) => {
    if ((error.statusCode) && (error.statusCode >= 300) && (error.statusCode < 400) && (error.location)){
      log(sep.L, 'redirecting..', "\n  ", 'from:', "\n    ", url, "\n  ", 'to:', "\n    ", error.location)
      make_net_request(error.location)
    }
    else {
      log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`)
    }
  })
}
make_net_request('http://github.com/warren-bank/node-denodeify/raw/master/package.json')
