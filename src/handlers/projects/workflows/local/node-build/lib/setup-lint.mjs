/* eslint-disable no-tabs */
import * as fsPath from 'node:path'
import * as fs from 'node:fs/promises'

import { COMPLY_GENERATED_FILE_NOTICE } from '@liquid-labs/comply-defaults'

import { ESLINT_RESOURCE } from './constants'

const setupLint = async({
  myName = throw new Error("Missing required 'myName' option"),
  myVersion = throw new Error("Missing required 'myVersion' option"),
  noDoc,
  noTest,
  workingPkgRoot = throw new Error("Missing required option 'workingPkgRoot'.")
}) => {
  let contents = `${COMPLY_GENERATED_FILE_NOTICE({ builderNPMName : myName, commentToken : '#' })}

#####
# lint rules
#####

SDLC_LINT_REPORT:=$(QA)/lint.txt
SDLC_LINT_PASS_MARKER:=$(QA)/.lint.passed
LINT_TARGETS+=$(SDLC_LINT_REPORT) $(SDLC_LINT_PASS_MARKER)
PRECIOUS_TARGETS+=$(SDLC_LINT_REPORT)

LINT_IGNORE_PATTERNS:=--ignore-pattern '$(DIST)/**/*'`
  if (noTest !== true) {
    contents += '\\\n--ignore-pattern \'$(TEST_STAGING)/**/*\''
  }
  if (noDoc !== true) {
    contents += '\\\n--ignore-pattern \'$(DOC)/**/*\''
  }
  contents += `

$(SDLC_LINT_REPORT) $(SDLC_LINT_PASS_MARKER): $(SDLC_ALL_JS_FILES_SRC)
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(SDLC_LINT_REPORT)
	git rev-parse HEAD >> $(SDLC_LINT_REPORT)
	( set -e; set -o pipefail; \\
	  $(SDLC_ESLINT) \\
	    --config $(SDLC_ESLINT_CONFIG) \\
	    --ext .cjs,.js,.mjs,.cjs,.xjs \\
	    $(LINT_IGNORE_PATTERNS) \\
	    . \\
	    | tee -a $(SDLC_LINT_REPORT); \\
	  touch $(SDLC_LINT_PASS_MARKER) )

lint-fix:
	@( set -e; set -o pipefail; \\
	  $(SDLC_ESLINT) \\
	    --config $(SDLC_ESLINT_CONFIG) \\
	    --ext .js,.mjs,.cjs,.xjs \\
	    $(LINT_IGNORE_PATTERNS) \\
	    --fix . )

#####
# end lint
#####`

  const priority = 55
  const relLintPath = fsPath.join('make', priority + '-lint.mk')
  const absLintPath = fsPath.join(workingPkgRoot, relLintPath)

  await fs.writeFile(absLintPath, contents)

  return {
    dependencies : [ESLINT_RESOURCE],
    artifacts    : [
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
