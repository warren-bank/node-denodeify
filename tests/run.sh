#!/usr/bin/env bash

log='./run.log'

./js/04.js &>  "$log"
./js/05.js &>> "$log"
