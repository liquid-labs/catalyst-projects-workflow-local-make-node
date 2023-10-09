/* eslint no-tabs: 0 */
/* eslint no-mixed-spaces-and-tabs: 0 */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { snakeCase } from 'lodash'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'

import { BABEL_AND_ROLLUP_RESOURCE } from './constants'

const setupBuilds = async({
  builds,
  makeExecutable = false,
  myName = throw new Error("Missing required option 'myName'."),
  myVersion = throw new Error("Missing required option 'myVerison'."),
  reporter,
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  const scripts = []

  for (const build of builds) {
    const [entryFile, buildTarget] = build.split(':')
    const targetName = buildTarget.replace(/(?:.*\/)?([^/]+)/, '$1')
    const varName = 'CATALYST_' + snakeCase(targetName).toUpperCase()

    const type = makeExecutable === true ? 'executable' : 'library'
    reporter.log(`Creating script to build ${type} ${buildTarget}...`)

    // note there are and must be literal tabs in the following string
    let contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

#####
# build ${buildTarget}
#####

${varName}:=$(DIST)/${targetName}
${varName}_ENTRY=$(SRC)/${entryFile}
BUILD_TARGETS+=$(${varName})

$(${varName}): package.json $(CATALYST_ALL_NON_TEST_JS_FILES_SRC)
	JS_BUILD_TARGET=$(${varName}_ENTRY) \\
	  JS_OUT=$@ \\\n`
    if (makeExecutable === true) {
      contents += '	  JS_OUT_PREAMBLE=\'#!/usr/bin/env -S node --enable-source-maps\' \\\n'
    }
	  contents += '	  $(CATALYST_ROLLUP) --config $(CATALYST_ROLLUP_CONFIG)\n'
	  if (makeExecutable === true) {
	  	contents += '	chmod a+x $@\n'
	  }
	  contents += `
#####
# end ${buildTarget}
#####\n`

	  const priority = 50
	  const scriptName = priority
	  	+ '-'
	  	+ targetName.toLowerCase().replace(/(?:[^a-z0-9-]+)/g, '-')
	  	+ '.mk'
	  const relBuildScriptPath = fsPath.join('make', scriptName)
	  const absBuildScriptPath = fsPath.join(workingPkgRoot, relBuildScriptPath)

	  await fs.writeFile(absBuildScriptPath, contents)

	  scripts.push({
  		builder : myName,
      version : myVersion,
      priority,
      path    : relBuildScriptPath,
      purpose : `Builds the '${buildTarget}' artifact.`
  	})
  }

  return {
  	dependencies : [BABEL_AND_ROLLUP_RESOURCE],
  	scripts
  }
}

const setupExecutableBuilds = ({ workingPkgRoot, myName, myVersion, reporter, withExecutables }) => {
  return setupBuilds({ builds : withExecutables, makeExecutable : true, myName, myVersion, reporter, workingPkgRoot })
}

const setupLibraryBuilds = ({ myName, myVersion, reporter, withLibs, workingPkgRoot }) => {
  return setupBuilds({ builds : withLibs, makeExecutable : false, myName, myVersion, reporter, workingPkgRoot })
}

export { setupExecutableBuilds, setupLibraryBuilds }
