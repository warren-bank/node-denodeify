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

const sep = "\n" + Array(40).join('-') + "\n"

fs.readFile('/etc/hosts', 'utf8')
.then((data) => {
  console.log([sep, '"hosts" file contents:', sep, data].join(''))
})
.catch((error) => {
  console.log([sep, 'Error:', sep, error.message].join())
})

http.get('http://nodejs.org/dist/index.json')
.then((data) => {
  var all_releases, newest_release
  all_releases = JSON.parse(data)
  newest_release = all_releases.length ? all_releases[0] : {}
  console.log([sep, 'newest release of Node.js:', sep, newest_release.version].join(''))
})
.catch((error) => {
  console.log([sep, 'Error:', sep, error.message].join(''))
})
