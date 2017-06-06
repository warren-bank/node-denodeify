#!/usr/bin/env bash

log='./run.log'

echo '######################################################################
' &> "$log"

./js/04.js &>>  "$log"

echo '######################################################################
' &>> "$log"

./js/05.js &>> "$log"

echo '######################################################################
' &>> "$log"

./js/06.js &>> "$log"

echo '---------------------------------------
Test integrity of binary zip file:
  > unzip -t denodeify.Buffer.zip
---------------------------------------' &>> "$log"
unzip -t denodeify.Buffer.zip  &>> "$log"

rm denodeify.Buffer.zip

echo '' &>> "$log"

echo '######################################################################
' &>> "$log"

./js/07.js &>> "$log"

echo '---------------------------------------
Test integrity of binary zip file:
  > unzip -t denodeify.Stream.zip
---------------------------------------' &>> "$log"
unzip -t denodeify.Stream.zip  &>> "$log"

rm denodeify.Stream.zip

echo '' &>> "$log"

echo '######################################################################
' &>> "$log"
