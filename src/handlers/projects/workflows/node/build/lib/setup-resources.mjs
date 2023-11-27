import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { COMPLY_GENERATED_FILE_NOTICE } from '@liquid-labs/comply-defaults'

import { ESLINT_RESOURCE, JEST_RESOURCE, BABEL_AND_ROLLUP_RESOURCE } from './constants'

const setupResources = async({
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"),
  /* noDoc, */
  noTest,
  noLint,
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  let contents = `${COMPLY_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

SDLC_BABEL:=npx babel
SDLC_BABEL_CONFIG:=$(shell npm explore ${BABEL_AND_ROLLUP_RESOURCE} -- pwd)/dist/babel/babel.config.cjs

SDLC_ROLLUP:=npx rollup
SDLC_ROLLUP_CONFIG:=$(shell npm explore ${BABEL_AND_ROLLUP_RESOURCE} -- pwd)/dist/rollup/rollup.config.mjs\n`

  if (noTest !== true) {
    contents += `\nSDLC_JEST:=npx jest
SDLC_JEST_CONFIG:=$(shell npm explore ${JEST_RESOURCE} -- pwd)/dist/jest.config.js\n`
  }

  if (noLint !== true) {
    contents += `\nSDLC_ESLINT:=npx eslint
SDLC_ESLINT_CONFIG:=$(shell npm explore ${ESLINT_RESOURCE} -- pwd)/dist/eslint.config.js\n`
  }

  const priority = 10
  const relResourcePath = fsPath.join('make', priority + '-resources.mk')
  const absResourcePath = fsPath.join(workingPkgRoot, relResourcePath)

  await fs.writeFile(absResourcePath, contents)

  return {
    dependencies : [ESLINT_RESOURCE, JEST_RESOURCE, BABEL_AND_ROLLUP_RESOURCE],
    artifacts    : [
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
