# This file was generated by @liquid-labs/catalyst-builder-node. Refer to
# https://npmjs.com/package/@liquid-labs/catalyst-builder-node for further details

CATALYST_BABEL:=npx babel
CATALYST_BABEL_CONFIG:=$(shell npm explore @liquid-labs/catalyst-resource-babel-and-rollup -- pwd)/dist/babel/babel.config.cjs

CATALYST_ROLLUP:=npx rollup
CATALYST_ROLLUP_CONFIG:=$(shell npm explore @liquid-labs/catalyst-resource-babel-and-rollup -- pwd)/dist/rollup/rollup.config.mjs

CATALYST_JEST:=npx jest
CATALYST_JEST_CONFIG:=$(shell npm explore @liquid-labs/catalyst-resource-jest -- pwd)/dist/jest.config.js

CATALYST_ESLINT:=npx eslint
CATALYST_ESLINT_CONFIG:=$(shell npm explore @liquid-labs/catalyst-resource-eslint -- pwd)/dist/eslint.config.js
