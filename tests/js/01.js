#!/usr/bin/env node

const {denodeify, denodeify_net_request} = require('../../denodeify')

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
