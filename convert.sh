#!/usr/bin/env bash

set -e

TEST=generator/local.js

sed -f convert.sed test-buster/$TEST > test/$TEST
jscodeshift -t sinon-codemod/extract-calls-fake.js test/$TEST

# mocha
