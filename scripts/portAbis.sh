#!/bin/bash

set -eu

cd $(dirname $0)
cd ../

files=("Cream" "CreamFactory" "CreamVerifier" "MACI" "MACIFactory" "SignUpToken" "VotingToken")

for file in ${files[@]}; do
  json=`cat ./zkcream/packages/contracts/build/contracts/${file}.json`
  cat > ./abis/${file}.json << EOS
    {
      "abi": $(echo $json | jq .abi),
      "bytecode": $(echo $json | jq .bytecode)
    }
EOS
done