/* eslint-disable no-tabs */
import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'
import { getPackageNameAndVersion } from '@liquid-labs/catalyst-lib-build'

import { ESLINT_RESOURCE, BABEL_AND_ROLLUP_RESOURCE } from './constants'

const setupTest = async({ cwd, noDoc, noTest }) => {
  const [myName, myVersion] = await getPackageNameAndVersion({ pkgDir : __dirname })

  // Tried to use '--testPathPattern=$(TEST_STAGING)' awithout the 'cd $(TEST_STAGING)', but it seemed to have no
  // effect' '--runInBand' because some suites require serial execution (yes, it's "best practice" to have unit tests
  // totally independent, but in practice there are sometimes good reasons why it's useful or necessary to run
  // sequentially); also, it may be faster this way; see:
  // https://stackoverflow.com/questions/43864793/why-does-jest-runinband-speed-up-tests
  const contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

#####
# test rules
#####

CATALYST_TEST_REPORT:=$(QA)/unit-test.txt
CATALYST_TEST_PASS_MARKER:=$(QA)/.unit-test.passed
CATALYST_COVERAGE_REPORTS:=$(QA)/coverage
TEST_TARGETS+=$(CATALYST_TEST_REPORT) $(CATALYST_TEST_PASS_MARKER) $(CATALYST_COVERAGE_REPORTS)
PRECIOUS_TARGETS+=$(CATALYST_TEST_REPORT)

$(CATALYST_TEST_DATA_BUILT): $(TEST_STAGING)/%: $(SRC)/%
	@echo "Copying test data..."
	@mkdir -p $(dir $@)
	@cp $< $@

# Jest is not picking up the external maps, so we inline them for the test. (As of?)
$(CATALYST_TEST_FILES_BUILT) &: $(CATALYST_ALL_JS_FILES_SRC)
	rm -rf $(TEST_STAGING)
	mkdir -p $(TEST_STAGING)
	NODE_ENV=test $(CATALYST_BABEL) \\
		--config-file=$(CATALYST_BABEL_CONFIG) \\
		--out-dir=./$(TEST_STAGING) \\
		--source-maps=inline \\
		$(SRC)

$(CATALYST_TEST_PASS_MARKER) $(CATALYST_TEST_REPORT) $(TEST_STAGING)/coverage &: package.json $(CATALYST_TEST_FILES_BUILT) $(CATALYST_TEST_DATA_BUILT)
	rm -f $@
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(CATALYST_TEST_REPORT)
	git rev-parse HEAD >> $(CATALYST_TEST_REPORT)
	( set -e; set -o pipefail; \\
	  ( cd $(TEST_STAGING) && $(CATALYST_JEST) \\
	    --config=$(CATALYST_JEST_CONFIG) \\
	    --runInBand \\
	    $(TEST) 2>&1 ) \\
	  | tee -a $(CATALYST_TEST_REPORT); \\
	  touch $(CATALYST_TEST_PASS_MARKER) )

$(CATALYST_COVERAGE_REPORTS): $(CATALYST_TEST_PASS_MARKER) $(TEST_STAGING)/coverage
	rm -rf $(CATALYST_COVERAGE_REPORTS)
	mkdir -p $(CATALYST_COVERAGE_REPORTS)
	cp -r $(TEST_STAGING)/coverage/* $(CATALYST_COVERAGE_REPORTS)

#####
# end test
#####`

  const priority = 55
  const relTestPath = fsPath.join('make', priority + '-test.mk')
  const absTestPath = fsPath.join(cwd, relTestPath)

  await fs.writeFile(absTestPath, contents)

  return {
    dependencies : [ESLINT_RESOURCE, BABEL_AND_ROLLUP_RESOURCE],
    scripts      : [
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
