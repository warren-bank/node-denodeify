#!/usr/bin/env node

const {denodeify, denodeify_net_request} = require('../../denodeify')

const fs = {
  writeFile: denodeify( require('fs').writeFile )
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

// example: request a binary file, obtain the response in a Buffer, save to disk
https.get('https://codeload.github.com/warren-bank/node-denodeify/zip/master', '', {binary: true})
.then((data) => {
  var filename = 'denodeify.zip'
  fs.writeFile(filename, data, 'binary')
  .then(() => {
    log(sep.L, 'Binary data file saved to:', sep.R, filename)
  })
  .catch((error) => {
    log(sep.L, 'Error: Failed to save binary data file to:', sep.R, filename, sep.R, error.message)
  })
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})
