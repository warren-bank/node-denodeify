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

fs.readFile('/etc/hosts', 'utf8')
.then((data) => {
  log(sep.L, '"hosts" file contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})

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

http.get('http://nodejs.org/i.dont.exist/404')
.then((data) => {
  log(sep.L, 'imaginary URL contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})

http.get('http://nodejs.org/i.dont.exist/404', '', {validate_status_code: false})
.then((data) => {
  log(sep.L, 'imaginary URL contents:', sep.R, data)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})
