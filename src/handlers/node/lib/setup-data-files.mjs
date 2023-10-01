import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'
import { getPackageNameAndVersion } from '@liquid-labs/catalyst-lib-build'

const setupDataFiles = async({ cwd }) => {
  const [myName, myVersion] = await getPackageNameAndVersion({ pkgDir : __dirname })

  const contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

CATALYST_DATA_SELECTOR=\( -path "*/test/data/*"  -o -path "*/test/data-*/*" -o -path "*/test-data/*" \)

# all test data (cli and lib)
CATALYST_TEST_DATA_SRC:=$(shell find $(SRC) -type f $(CATALYST_NODE_PROJECT_DATA_SELECTOR))
CATALYST_TEST_DATA_BUILT:=$(patsubst $(SRC)/%, $(TEST_STAGING)/%, $(CATALYST_JS_TEST_DATA_SRC))
`

  const priority = 15
  const relDataFinder = fsPath.join('make', priority + '-data-finder.mk')
  const absDataFinder = fsPath.join(cwd, relDataFinder)

  fs.writeFile(absDataFinder, contents)

  return [
    {
      builder : myName,
      version : myVersion,
      priority,
      path    : relDataFinder,
      purpose : 'Sets up vars listing test data files which will need to be copied under the test staging dir.'
    }
  ]
}

export { setupDataFiles }
