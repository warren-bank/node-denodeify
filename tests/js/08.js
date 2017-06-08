#!/usr/bin/env node

const {denodeify} = require('../../denodeify')

const noop_function_with_nonstandard_callback = denodeify(function(...result){
  var cb = result.pop()

  cb(null, ...result)
})

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

// example: call function that passes multiple values to its callback
noop_function_with_nonstandard_callback(1,2,3)
.then(([arg1, arg2, arg3, ...args]) => {
  log(sep.L, 'Parameters passed to non-standard callback:', sep.R, `#1: ${JSON.stringify(arg1)}`, "\n", `#2: ${JSON.stringify(arg2)}`, "\n", `#3: ${JSON.stringify(arg3)}`, "\n", `rest[${args.length}]: ${JSON.stringify(args)}`)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})

// example: call function that passes multiple values to its callback
noop_function_with_nonstandard_callback('a','b','123','abc','xyz',789,{hello: "world"},["foo","bar"])
.then(([arg1, arg2, arg3, ...args]) => {
  log(sep.L, 'Parameters passed to non-standard callback:', sep.R, `#1: ${JSON.stringify(arg1)}`, "\n", `#2: ${JSON.stringify(arg2)}`, "\n", `#3: ${JSON.stringify(arg3)}`, "\n", `rest[${args.length}]: ${JSON.stringify(args)}`)
})
.catch((error) => {
  log(sep.L, 'Error:', sep.R, error.message)
})
