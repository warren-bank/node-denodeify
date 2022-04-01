#!/usr/bin/env node

const path = require('path')
const url  = require('url')

const {denodeify_net_request} = require('../../denodeify')

const http = {
  request: denodeify_net_request( require('http').request )
}

const fs = {
  createReadStream: require('fs').createReadStream
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

// using:
//   https://github.com/warren-bank/node-serve/blob/130002.18.2/.etc/test/www/cgi-bin/echo-post-data/echo-post-data.pl

http.request(
  Object.assign(
    {},
    url.parse('http://localhost/cgi-bin/echo-post-data/echo-post-data.pl'),
    {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      }
    }
  ),
  [
    // multipart form data
    {
      name:  "hidden1",
      value: "Hello, World!"
    },
    {
      name:  "select1",
      value: "Foo"
    },
    {
      name:  "select1",
      value: "Bar"
    },
    {
      name:  "select1",
      value: "Baz"
    },
    {
      name:  "radio1",
      value: "Foo"
    },
    {
      name:  "checkbox1",
      value: "Foo"
    },
    {
      name:  "checkbox1",
      value: "Bar"
    },
    {
      name:  "checkbox1",
      value: "Baz"
    },
    {
      name:  "file1",
      value: {
        filename: path.resolve(__dirname, '../..', 'lib/multipart/LICENSE.txt')
      }
    },
    {
      name:  "files2",
      value: {
        filename: path.resolve(__dirname, '../..', '.gitignore')
      }
    },
    {
      name:  "files2",
      value: {
        file: fs.createReadStream( path.resolve(__dirname, '../..', '.gitignore') ),
        filename: 'gitignore.txt'
      }
    },
    {
      name:  "files2",
      value: {
        file: fs.createReadStream( path.resolve(__dirname, '../..', '.gitignore') ),
        mime: 'text/plain'
      }
    }
  ],
  {binary: false, stream: false}
)
.then((data) => {
  const headers = []

  for (const key in data.headers) {
    headers.push(`${key}: ${data.headers[key]}`)
  }

  log(sep.L, 'multipart/form-data:', sep.R, headers.join("\n"), "\n\n", data.toString())
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})
