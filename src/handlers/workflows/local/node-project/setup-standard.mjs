import createError from 'http-errors'

import { saveBuilderConfig } from '@liquid-labs/catalyst-lib-build'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { install } from '@liquid-labs/npm-toolkit'

import { setupProject } from './lib/setup-project'

const help = {
  name        : 'Setup node project',
  summary     : 'Sets up make based build, test, and lint for node projects.',
  description : `By default, this method will analyze the current project and produce an appropriate 'Makefile' with build, test, and lint options and also install necessary 'devDependencies'. The analysis is as follows:

  1. If there is an 'index.js' (or '.mjs', '.cjs') file in the source directory (generally 'src'), then we assume the package to define a single library whose output will be determined by the 'main' field in 'package.json'.
  2. If there is no index file in the source directory, but there are 'lib' and 'bin', 'cli', 'exec', or 'executable' subdirectories containing index files, then we assume a single library under 'lib' and a single executable in the 'bin'/'cli'/'exec'/'executable'. Any one of these directories will be recognized and an error will be thrown if there are multiple directories executable directories. The library output is determined by the 'main' field in 'package.json' and the executable is named by appending '-exec' to the library base name. E.g., given a main entry of 'dist/foo.js', the executable would be 'dist/foo-exec.js'.
  3. Otherwise, the fully automated setup fails and library and executables must be defined using the 'withLibs' and 'withExecutables' parameters.`
}

const method = 'put'
const path = ['workflows', 'local', 'node-project', 'setup-standard']
const parameters = [
  {
    name    : 'distPath',
    summary : "Defines the package root relative distribution directory. Defaults to settings value 'dist'."
  },
  {
    name    : 'docBuildPath',
    summary : 'Package root relative path to the built docs.'
  },
  {
    name    : 'docSrcPath',
    summary : 'src relative path to the documentation source.'
  },
  {
    name      : 'isExecutable',
    isBoolean : true,
    summary   : "Applies the default build logic except that a single entry file under the source directory is treated as the source for an executable rather than a library. This setting is ignored if 'withExecutables' or 'withLibs' is specified."
  },
  {
    name      : 'noDevInstall',
    isBoolean : true,
    summary   : 'If true, supresses the default behavior of looking for local development packages of resource packages to install. In other words, will always use the latest published package.'
  },
  {
    name      : 'noDoc',
    isBoolean : true,
    summary   : "Excludes 'doc' target from the generated makefiles."
  },
  {
    name      : 'noInstall',
    isBoolean : true,
    summary   : "Does not install build, test, lint, etc. resources which may be needed by the scripts. Can be useful when you have set up the depencies on a specific version and don't want to override that."
  },
  {
    name      : 'noLint',
    isBoolean : true,
    summary   : "Excludes 'lint' and 'lint-fix' targets from the generated makefiles."
  },
  {
    name      : 'noTest',
    isBoolean : true,
    summary   : "Excludes 'test' targets from the generated makefiles."
  },
  {
    name    : 'srcPath',
    summary : "Defines the package root relative source directory. Defaults to setting value or 'src'."
  },
  {
    name    : 'testStagingPath',
    summary : "Defines the package root relative test staging directory. Defaults to settings value 'test-staging'."
  },
  {
    name    : 'qaPath',
    summary : "Defines the package root relative qa directory. Defaults to settings value 'qa'."
  },
  {
    name         : 'withExecutables',
    isMultivalue : true,
    summary      : "Specifies an executable to build in the form of '<entry file>:<exec file>'.",
    description  : `Each use of the parameter specifies an executable entry path and compiled executable output file relative to the effective src and dist directories respectively. E.g., with default src and dist values, 'exec-index.mjs:subdir/exec.js' would mean compilation would start with '~/src/exec-index.mjs' and produce an output executable at '~/dist/subdir/exec.js'.

    When 'withExecutables' is specified, the default auto-guess behavior is suppressed and all build inputs and artifacts must be fully defined.`
  },
  {
    name         : 'withLibs',
    isMultivalue : true,
    summary      : "Specifies a lib to build in the form of '<entry file>:<lib file>'.",
    description  : `Each use of the parameter specifies a libray entry path and compiled library output file relative to the effective src and dist directories respectively. E.g., with default src and dist values, 'special-index.mjs:subdir/special-lib.js' would mean compilation would start with '~/src/special-index.mjs' and produce an output library at '~/dist/subdir/special-lib.js'.

    When 'withLibs' is specified, the default auto-guess behavior is suppressed and all build inputs and artifacts must be fully defined.`
  }
]

const func = ({ app, reporter }) => async(req, res) => {
  reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest("Called 'node setup', but working dir 'X-CWD' header not found.")
  }

  const data = await setupProject({ cwd, reporter, ...req.vars })
  data.config = req.vars

  await saveBuilderConfig ({ config: data, path, pkgRoot: cwd })

  const { noDevInstall, noInstall } = req.vars
  if (noInstall === true) {
    reporter.log('Skipping dependency install.')
  }
  else {
    const { dependencies } = data
    reporter.log(`Installing ${dependencies.join(', ')}`)
    const devPaths = noDevInstall === true ? [] : app.ext.devPaths
    install({ devPaths, latest : true, pkgs : dependencies, saveDev : true, targetPath : cwd })
  }

  const msg = `Created ${data.scripts} files.`

  httpSmartResponse({ msg, data, req, res })
}

export { help, func, method, parameters, path }
