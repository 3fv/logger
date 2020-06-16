#!/usr/bin/env bash

set -e

if [[ ! -e index.d.ts ]];then
 mkdir -p lib && cp package.json lib && tsc -b tsconfig.json
fi