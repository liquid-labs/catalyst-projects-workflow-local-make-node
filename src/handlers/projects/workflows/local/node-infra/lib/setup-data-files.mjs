import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { COMPLY_GENERATED_FILE_NOTICE } from '@liquid-labs/comply-defaults'

const setupDataFiles = async({
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"),
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  const contents = `${COMPLY_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

SDLC_DATA_SELECTOR=\\( -path "*/test/data/*"  -o -path "*/test/data-*/*" -o -path "*/test-data/*" \\)

# all test data (cli and lib)
SDLC_TEST_DATA_SRC:=$(shell find $(SRC) -type f $(SDLC_DATA_SELECTOR))
SDLC_TEST_DATA_BUILT:=$(patsubst $(SRC)/%, $(TEST_STAGING)/%, $(SDLC_TEST_DATA_SRC))
`

  const priority = 15
  const relDataFinder = fsPath.join('make', priority + '-data-finder.mk')
  const absDataFinder = fsPath.join(workingPkgRoot, relDataFinder)

  fs.writeFile(absDataFinder, contents)

  return {
    artifacts : [
      {
        builder : myName,
        version : myVersion,
        priority,
        path    : relDataFinder,
        purpose : 'Sets up vars listing test data files which will need to be copied under the test staging dir.'
      }
    ]
  }
}

export { setupDataFiles }
