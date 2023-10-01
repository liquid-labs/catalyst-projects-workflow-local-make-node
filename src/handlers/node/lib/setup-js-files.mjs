import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'
import { getPackageNameAndVersion } from '@liquid-labs/catalyst-lib-build'

const setupJSFiles = async ({ cwd }) => {
  const [ myName, myVersion ] = await getPackageNameAndVersion({ pkgDir: __dirname })

  let contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

CATALYST_JS_SELECTOR=\( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" \)

# all source, non-test files (cli and lib)
CATALYST_JS_ALL_FILES_SRC:=$(shell find $(SRC) $(CATALYST_JS_SELECTOR) -not $(CATALYST_DATA_SELECTOR))
CATALYST_JS_TEST_FILES_SRC:=$(shell find $(SRC) $(CATALYST_JS_SELECTOR) -not $(CATALYST_DATA_SELECTOR) -type f)
CATALYST_JS_TEST_FILES_BUILT:=$(patsubst %.cjs, %.js, $(patsubst %.mjs, %.js, $(patsubst $(SRC)/%, test-staging/%, $(CATALYST_JS_TEST_FILES_SRC))))
`

  const priority = 20
  const relDataFinder = fsPath.join('make', priority + '-js-src-finder.mk')
  const absDataFinder = fsPath.join(cwd, relDataFinder)

  fs.writeFile(absDataFinder, contents)

  return [
    {
      builder  : myName,
      version  : myVersion,
      priority,
      path     : relDataFinder,
      purpose  : "Sets up vars listing JS files which will need to be tested and built."
    }
  ]
}

export { setupJSFiles }