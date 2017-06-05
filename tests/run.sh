#!/usr/bin/env bash

log='./run.log'

./js/04.js &>  "$log"
./js/05.js &>> "$log"
./js/06.js &>> "$log"

echo '---------------------------------------
Test integrity of binary zip file:
  > unzip -t denodeify.zip
---------------------------------------' &>> "$log"
unzip -t denodeify.zip  &>> "$log"

rm denodeify.zip
