### [node-multipart](https://github.com/tim-smart/node-multipart)

A simple multipart message creation utility for Node.js, that has a nice stream-like interface.

#### Install

```bash
  npm install multipart
```

#### Usage

For a brief introduction to the api, take a look at [test/simple.js](https://github.com/tim-smart/node-multipart/blob/master/test/simple.js).

Otherwise:

```javascript
  var multipart = require('multipart')

  // Create the stream object using the provided factory.
  var my_mp_stream = multipart.createMultipartStream()

  // Pipe the multipart message to stdout.
  my_mp_stream.pipe(process.stdout)

  // Write some stuff to the multipart stream. Take a look in test/ and index.js
  // for more options and gimmicks.
  my_mp_stream.write(
    { 'Content-Disposition' : 'form-data; name="files"'
    , 'Content-Type'        : another_mp_stream.contentType(my_mp_stream)
    }
  , another_mp_stream
  , function () {
      console.log('FILESWRITTEN')
    }
  )

  // Tie up the loose ends.
  my_mp_stream.end(end_cb_fn)
```
