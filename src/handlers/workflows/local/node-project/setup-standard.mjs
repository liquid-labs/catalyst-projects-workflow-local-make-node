import { gatherBasicBuilderData, processBuilderResults } from '@liquid-labs/catalyst-lib-build'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

import { setupProject } from './lib/setup-project'

const help = {
  name        : 'Setup node project',
  description : `By default, this method will analyze the current project and produce an appropriate 'Makefile' with build, test, and lint options and also install necessary 'devDependencies'. The analysis is as follows:

  1. If there is an 'index.js' (or '.mjs', '.cjs') file in the source directory (generally 'src'), then we assume the package to define a single library whose output will be determined by the 'main' field in 'package.json'.
  2. If there is no index file in the source directory, but there are 'lib' and 'bin', 'cli', 'exec', or 'executable' subdirectories containing index files, then we assume a single library under 'lib' and a single executable in the 'bin'/'cli'/'exec'/'executable'. Any one of these directories will be recognized and an error will be thrown if there are multiple directories executable directories. The library output is determined by the 'main' field in 'package.json' and the executable is named by appending '-exec' to the library base name. E.g., given a main entry of 'dist/foo.js', the executable would be 'dist/foo-exec.js'.
  3. Otherwise, the fully automated setup fails and library and executables must be defined using the 'withLibs' and 'withExecutables' parameters.`
}

const method = 'put'
const path = ['workflows', 'local', 'node-project', 'setup-standard']
const parameters = [
  {
    name        : 'distPath',
    description : "Defines the package root relative distribution directory. Defaults to settings value 'dist'."
  },
  {
    name        : 'docBuildPath',
    description : 'Package root relative path to the built docs.'
  },
  {
    name        : 'docSrcPath',
    description : 'src relative path to the documentation source.'
  },
  {
    name        : 'isExecutable',
    isBoolean   : true,
    description : "Applies the default build logic except that a single entry file under the source directory is treated as the source for an executable rather than a library. This setting is ignored if 'withExecutables' or 'withLibs' is specified."
  },
  {
    name        : 'noDevInstall',
    isBoolean   : true,
    description : 'If true, supresses the default behavior of looking for local development packages of resource packages to install. In other words, will always use the latest published package.'
  },
  {
    name        : 'noDoc',
    isBoolean   : true,
    description : "Excludes 'doc' target from the generated makefiles."
  },
  {
    name        : 'noInstall',
    isBoolean   : true,
    description : "Does not install build, test, lint, etc. resources which may be needed by the scripts. Can be useful when you have set up the depencies on a specific version and don't want to override that."
  },
  {
    name        : 'noLint',
    isBoolean   : true,
    description : "Excludes 'lint' and 'lint-fix' targets from the generated makefiles."
  },
  {
    name        : 'noTest',
    isBoolean   : true,
    description : "Excludes 'test' targets from the generated makefiles."
  },
  {
    name        : 'srcPath',
    description : "Defines the package root relative source directory. Defaults to setting value or 'src'."
  },
  {
    name        : 'testStagingPath',
    description : "Defines the package root relative test staging directory. Defaults to settings value 'test-staging'."
  },
  {
    name        : 'qaPath',
    description : "Defines the package root relative qa directory. Defaults to settings value 'qa'."
  },
  {
    name         : 'withExecutables',
    isMultivalue : true,
    description  : `Each use of the parameter specifies an executable entry path and compiled executable output file relative to the effective src and dist directories respectively. E.g., with default src and dist values, 'exec-index.mjs:subdir/exec.js' would mean compilation would start with '~/src/exec-index.mjs' and produce an output executable at '~/dist/subdir/exec.js'.

    When 'withExecutables' is specified, the default auto-guess behavior is suppressed and all build inputs and artifacts must be fully defined.`
  },
  {
    name         : 'withLibs',
    isMultivalue : true,
    description  : `Each use of the parameter specifies a libray entry path and compiled library output file relative to the effective src and dist directories respectively. E.g., with default src and dist values, 'special-index.mjs:subdir/special-lib.js' would mean compilation would start with '~/src/special-index.mjs' and produce an output library at '~/dist/subdir/special-lib.js'.

    When 'withLibs' is specified, the default auto-guess behavior is suppressed and all build inputs and artifacts must be fully defined.`
  }
]

const func = ({ app, reporter }) => async(req, res) => {
  reporter.isolate()

  const { builderName: myName, builderVersion: myVersion, workingPkgRoot } =
    await gatherBasicBuilderData({ builderPkgDir : __dirname, req })

  const data = await setupProject({ myName, myVersion, reporter, workingPkgRoot, ...req.vars })
  data.config = req.vars

  await processBuilderResults({ app, path, pkgRoot : workingPkgRoot, reporter, results : data, ...req.vars })

  const msg = `Created ${data.artifacts.length} files.`

  httpSmartResponse({ msg, data, req, res })
}

export { help, func, method, parameters, path }
