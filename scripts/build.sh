#!/usr/bin/env bash

set -e

TSC_OPTS=${TSC_OPTS:-""}

if [[ ! -e index.d.ts ]];then
 mkdir -p lib
 cp package.json lib
 tsc -b tsconfig.json ${TSC_OPTS}
fi

