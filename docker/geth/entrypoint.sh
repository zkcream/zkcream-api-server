#!/bin/sh

cd `dirname $0`

geth \
  --datadir ./data \
  --networkid 1337 \
  --verbosity 3 \
  --miner.gaslimit 30000000 \
  --rpc \
  --rpcapi "eth,net,web3,personal,admin" \
  --rpccorsdomain '*' \
  --rpcvhosts="*" \
  --rpcaddr [::] \
  --ws \
  --ws.api "eth,net,web3,personal,admin" \
  --ws.origins "*" \
  --ws.addr [::] \
  --unlock "0x6bbf87f75c84a18907db471941907899e3266214" \
  --password /dev/null \
  --mine \
  --nodekey ./data/nodekey \
  --allow-insecure-unlock