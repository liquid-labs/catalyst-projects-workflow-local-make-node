import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'
import { getPackageNameAndVersion } from '@liquid-labs/catalyst-lib-build'

import { ESLINT_RESOURCE, JEST_RESOURCE, ROLLUP_RESOURCE } from './constants'

const setupResources = async({ cwd, /* noDoc, */ noTest, noLint }) => {
  const [myName, myVersion] = await getPackageNameAndVersion({ pkgDir : __dirname })

  let contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

CATALYST_BABEL:=npx babel
CATALYST_BABEL_CONFIG:=$(shell npm explore ${ROLLUP_RESOURCE} -- pwd)/dist/babel/babel.config.cjs

CATALYST_ROLLUP:=npx rollup
CATALYST_ROLLUP_CONFIG:=$(shell npm explore ${ROLLUP_RESOURCE} -- pwd)/dist/rollup/rollup.config.mjs\n`

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
  const absResourcePath = fsPath.join(cwd, relResourcePath)

  await fs.writeFile(absResourcePath, contents)

  return {
    dependencies : [ESLINT_RESOURCE, JEST_RESOURCE, ROLLUP_RESOURCE],
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
