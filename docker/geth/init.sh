#!/bin/sh
cd `dirname $0`
if [ -e data/geth ]; then
  rm -rf data/geth
fi
geth init --datadir ./data ./zkcream.json