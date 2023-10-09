import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'

import { ESLINT_RESOURCE, JEST_RESOURCE, BABEL_AND_ROLLUP_RESOURCE } from './constants'

const setupResources = async({ 
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"), 
  /* noDoc, */ 
  noTest, 
  noLint,
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  let contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

CATALYST_BABEL:=npx babel
CATALYST_BABEL_CONFIG:=$(shell npm explore ${BABEL_AND_ROLLUP_RESOURCE} -- pwd)/dist/babel/babel.config.cjs

CATALYST_ROLLUP:=npx rollup
CATALYST_ROLLUP_CONFIG:=$(shell npm explore ${BABEL_AND_ROLLUP_RESOURCE} -- pwd)/dist/rollup/rollup.config.mjs\n`

  if (noTest !== true) {
    contents += `\nCATALYST_JEST:=npx jest
CATALYST_JEST_CONFIG:=$(shell npm explore ${JEST_RESOURCE} -- pwd)/dist/jest.config.js\n`
  }

  if (noLint !== true) {
    contents += `\nCATALYST_ESLINT:=npx eslint
CATALYST_ESLINT_CONFIG:=$(shell npm explore ${ESLINT_RESOURCE} -- pwd)/dist/eslint.config.js\n`
  }

  const priority = 10
  const relResourcePath = fsPath.join('make', priority + '-resources.mk')
  const absResourcePath = fsPath.join(workingPkgRoot, relResourcePath)

  await fs.writeFile(absResourcePath, contents)

  return {
    dependencies : [ESLINT_RESOURCE, JEST_RESOURCE, BABEL_AND_ROLLUP_RESOURCE],
    scripts      : [
      {
        builder : myName,
        version : myVersion,
        priority,
        path    : relResourcePath,
        purpose : 'Locates tool executables and configuration files.'
      }
    ]
  }
}

export { setupResources }
