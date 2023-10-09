import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'

const setupJSFiles = async({
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"),
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  const contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

CATALYST_JS_SELECTOR=\\( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" \\)
CATALYST_TEST_SELECTOR=\\( -name "*.test.*js" -o -path "*/test/*" \\)

# all source, non-test files (cli and lib)
CATALYST_ALL_JS_FILES_SRC:=$(shell find $(SRC) $(CATALYST_JS_SELECTOR) -not $(CATALYST_DATA_SELECTOR) -type f)
CATALYST_ALL_NON_TEST_JS_FILES_SRC:=$(shell find $(SRC) $(CATALYST_JS_SELECTOR) -not $(CATALYST_DATA_SELECTOR) -not $(CATALYST_TEST_SELECTOR) -type f)
CATALYST_JS_TEST_FILES_BUILT:=$(patsubst %.cjs, %.js, $(patsubst %.mjs, %.js, $(patsubst $(SRC)/%, test-staging/%, $(CATALYST_ALL_JS_FILES_SRC))))
`

  const priority = 20
  const relDataFinder = fsPath.join('make', priority + '-js-src-finder.mk')
  const absDataFinder = fsPath.join(workingPkgRoot, relDataFinder)

  fs.writeFile(absDataFinder, contents)

  return {
    scripts : [
      {
        builder : myName,
        version : myVersion,
        priority,
        path    : relDataFinder,
        purpose : 'Sets up vars listing JS files which will need to be tested and built.'
      }
    ]
  }
}

export { setupJSFiles }
