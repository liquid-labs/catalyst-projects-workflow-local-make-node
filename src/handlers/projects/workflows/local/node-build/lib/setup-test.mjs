/* eslint-disable no-tabs */
import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { COMPLY_GENERATED_FILE_NOTICE } from '@liquid-labs/comply-defaults'

import { ESLINT_RESOURCE, BABEL_AND_ROLLUP_RESOURCE } from './constants'

const setupTest = async({
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"),
  noDoc,
  noTest,
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  // Tried to use '--testPathPattern=$(TEST_STAGING)' awithout the 'cd $(TEST_STAGING)', but it seemed to have no
  // effect' '--runInBand' because some suites require serial execution (yes, it's "best practice" to have unit tests
  // totally independent, but in practice there are sometimes good reasons why it's useful or necessary to run
  // sequentially); also, it may be faster this way; see:
  // https://stackoverflow.com/questions/43864793/why-does-jest-runinband-speed-up-tests
  const contents = `${COMPLY_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

#####
# test rules
#####

SDLC_TEST_REPORT:=$(QA)/unit-test.txt
SDLC_TEST_PASS_MARKER:=$(QA)/.unit-test.passed
SDLC_COVERAGE_REPORTS:=$(QA)/coverage
TEST_TARGETS+=$(SDLC_TEST_REPORT) $(SDLC_TEST_PASS_MARKER) $(SDLC_COVERAGE_REPORTS)
PRECIOUS_TARGETS+=$(SDLC_TEST_REPORT)

SDLC_TEST_FILES_BUILT:=$(patsubst %.cjs, %.js, $(patsubst %.mjs, %.js, $(patsubst $(SRC)/%, $(TEST_STAGING)/%, $(SDLC_ALL_JS_FILES_SRC))))

$(SDLC_TEST_DATA_BUILT): $(TEST_STAGING)/%: $(SRC)/%
	@echo "Copying test data..."
	@mkdir -p $(dir $@)
	@cp $< $@

# Jest is not picking up the external maps, so we inline them for the test. (As of?)
# We tried to ignore the data directories in the babel config, but as of 7.23.4, it didn't seem to work. This problem 
# has been reported, though it claims to be fixed
$(SDLC_TEST_FILES_BUILT) &: $(SDLC_ALL_JS_FILES_SRC)
	rm -rf $(TEST_STAGING)
	mkdir -p $(TEST_STAGING)
	NODE_ENV=test $(SDLC_BABEL) \\
		--config-file=$(SDLC_BABEL_CONFIG) \\
		--out-dir=./$(TEST_STAGING) \\
		--source-maps=inline \\
    --ignore='**/test/data/**' --ignore='**/test-data/**' \\
		$(SRC)

$(SDLC_TEST_PASS_MARKER) $(SDLC_TEST_REPORT) $(TEST_STAGING)/coverage &: package.json $(SDLC_TEST_FILES_BUILT) $(SDLC_TEST_DATA_BUILT)
	rm -rf $@
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(SDLC_TEST_REPORT)
	git rev-parse HEAD >> $(SDLC_TEST_REPORT)
	( set -e; set -o pipefail; \\
	  ( cd $(TEST_STAGING) && $(SDLC_JEST) \\
	    --config=$(SDLC_JEST_CONFIG) \\
	    --runInBand \\
	    $(TEST) 2>&1 ) \\
	  | tee -a $(SDLC_TEST_REPORT); \\
	  touch $(SDLC_TEST_PASS_MARKER) )

$(SDLC_COVERAGE_REPORTS): $(SDLC_TEST_PASS_MARKER) $(TEST_STAGING)/coverage
	rm -rf $(SDLC_COVERAGE_REPORTS)
	mkdir -p $(SDLC_COVERAGE_REPORTS)
	cp -r $(TEST_STAGING)/coverage/* $(SDLC_COVERAGE_REPORTS)

#####
# end test
#####`

  const priority = 55
  const relTestPath = fsPath.join('make', priority + '-test.mk')
  const absTestPath = fsPath.join(workingPkgRoot, relTestPath)

  await fs.writeFile(absTestPath, contents)

  return {
    dependencies : [ESLINT_RESOURCE, BABEL_AND_ROLLUP_RESOURCE],
    artifacts    : [
      {
        builder : myName,
        version : myVersion,
        priority,
        path    : relTestPath,
        purpose : 'Provides test functionality with jest.'
      }
    ]
  }
}

export { setupTest }
