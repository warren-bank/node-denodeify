#!/usr/bin/env node

const {denodeify_net_request} = require('../../denodeify')

const https = {
  get: denodeify_net_request( require('https').get )
}

const fs = {
  createWriteStream: require('fs').createWriteStream
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

// example: request a binary file, obtain the response in a Readable stream, save to disk via a pipe
https.get('https://codeload.github.com/warren-bank/node-denodeify/zip/master', '', {binary: true, stream: true})
.then((stream) => {
  var filename = 'denodeify.Stream.zip'
  stream
    .pipe( fs.createWriteStream(filename) )
    .on('finish', () => {
      log(sep.L, 'Binary data Stream saved to file:', sep.R, filename)
    })
    .on('error', (error) => {
      log(sep.L, 'Error: Failed to save binary data Stream to file:', sep.R, filename, sep.R, error.message)
      stream.destroy()
    })
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message, "\n", `error.statusCode === ${error.statusCode}`, "\n", `error.location === ${error.location}`)
})
