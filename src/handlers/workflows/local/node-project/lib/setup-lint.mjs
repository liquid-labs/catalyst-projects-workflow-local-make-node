/* eslint-disable no-tabs */
import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { CATALYST_GENERATED_FILE_NOTICE } from '@liquid-labs/catalyst-defaults'
import { getPackageNameAndVersion } from '@liquid-labs/catalyst-lib-build'

import { ESLINT_RESOURCE } from './constants'

const setupLint = async({ cwd, noDoc, noTest }) => {
  const [myName, myVersion] = await getPackageNameAndVersion({ pkgDir : __dirname })

  let contents = `${CATALYST_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

#####
# lint rules
#####

CATALYST_LINT_REPORT:=$(QA)/lint.txt
CATALYST_LINT_PASS_MARKER:=$(QA)/.lint.passed
LINT_TARGETS+=$(CATALYST_LINT_REPORT) $(CATALYST_LINT_PASS_MARKER)
PRECIOUS_TARGETS+=$(CATALYST_LINT_REPORT)

LINT_IGNORE_PATTERNS:=--ignore-pattern '$(DIST)/**/*'`
  if (noTest !== true) {
    contents += '\\\n--ignore-pattern \'$(TEST_STAGING)/**/*\''
  }
  if (noDoc !== true) {
    contents += '\\\n--ignore-pattern \'$(DOCS)/**/*\''
  }
  contents += `

$(CATALYST_LINT_REPORT) $(CATALYST_LINT_PASS_MARKER): $(CATALYST_ALL_JS_FILES_SRC)
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(CATALYST_LINT_REPORT)
	git rev-parse HEAD >> $(CATALYST_LINT_REPORT)
	( set -e; set -o pipefail; \\
	  $(CATALYST_ESLINT) \\
	    --config $(CATALYST_ESLINT_CONFIG) \\
	    --ext .cjs,.js,.mjs,.cjs,.xjs \\
	    $(LINT_IGNORE_PATTERNS) \\
	    . \\
	    | tee -a $(CATALYST_LINT_REPORT); \\
	  touch $(CATALYST_LINT_PASS_MARKER) )

lint-fix:
	@( set -e; set -o pipefail; \\
	  $(CATALYST_ESLINT) \\
	    --config $(CATALYST_ESLINT_CONFIG) \\
	    --ext .js,.mjs,.cjs,.xjs \\
	    $(LINT_IGNORE_PATTERNS) \\
	    --fix . )

#####
# end lint
#####`

  const priority = 55
  const relLintPath = fsPath.join('make', priority + '-lint.mk')
  const absLintPath = fsPath.join(cwd, relLintPath)

  await fs.writeFile(absLintPath, contents)

  return {
    dependencies : [ESLINT_RESOURCE],
    scripts      : [
      {
        builder : myName,
        version : myVersion,
        priority,
        path    : relLintPath,
        purpose : 'Provides lint functionality with eslint.'
      }
    ]
  }
}

export { setupLint }
