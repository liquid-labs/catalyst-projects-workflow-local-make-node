import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import createError from 'http-errors'

import { setupMakefileInfra, setupMakefileLocations } from '@liquid-labs/catalyst-lib-makefiles'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { install } from '@liquid-labs/npm-toolkit'

import { searchForIndex } from './lib/search-for-index'
import { setupLibraryBuilds, setupExecutableBuilds } from './lib/setup-builds'
import { setupDataFiles } from './lib/setup-data-files'
import { setupJSFiles } from './lib/setup-js-files'
import { setupResources } from './lib/setup-resources'

const help = {
  name        : 'Setup node project',
  summary     : 'Sets up make based build, test, and lint for node projects.',
  description : `By default, this method will analyze the current project and produce an appropriate 'Makefile' with build, test, and lint options and also install necessary 'devDependencies'. The analysis is as follows:

  1. If there is an 'index.js' (or '.mjs', '.cjs') file in the source directory (generally 'src'), then we assume the package to define a single library whose output will be determined by the 'main' field in 'package.json'.
  2. If there is no index file in the source directory, but there are 'lib' and 'bin', 'cli', 'exec', or 'executable' subdirectories containing index files, then we assume a single library under 'lib' and a single executable in the 'bin'/'cli'/'exec'/'executable'. Any one of these directories will be recognized and an error will be thrown if there are multiple directories executable directories. The library output is determined by the 'main' field in 'package.json' and the executable is named by appending '-exec' to the library base name. E.g., given a main entry of 'dist/foo.js', the executable would be 'dist/foo-exec.js'.
  3. Otherwise, the fully automated setup fails and library and executables must be defined using the 'withLibs' and 'withExecutables' parameters.`
}

const method = 'put'
const path = ['node', 'setup']
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
    name      : 'noDoc',
    isBoolean : true,
    summary   : "Excludes 'doc' target from the generated makefiles."
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

  const {
    distPath = 'dist',
    isExecutable,
    docBuildPath = 'doc',
    docSrcPath = 'doc',
    noDoc,
    noLint,
    noTest,
    srcPath = 'src',
    testStagingPath = 'test-staging',
    qaPath = 'qa',
    withExecutables = [],
    withLibs = []
  } = req.vars

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest("Called 'node setup', but working dir 'X-CWD' header not found.")
  }
  const pkgPath = fsPath.join(cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    throw createError.BadRequest("Current client working directory does not appear to be a package root (no 'package.json file found).")
  }

  const absSource = fsPath.join(cwd, srcPath)
  if (!existsSync(absSource)) {
    throw createError.BadRequest(`No source directory found at '${absSource}'. Set 'srcPath' parameter or create the directory.`)
  }

  if (withExecutables.length === 0 && withLibs.length === 0) {
    // then we need to analyze things to figure out what kind of work to do
    const pkgPath = fsPath.join(cwd, 'package.json')
    let main
    try {
      const pkgContents = await fs.readFile(pkgPath, { encoding : 'utf8' })
      const pkgJSON = JSON.parse(pkgContents);
      ({ main } = pkgJSON)
    }
    catch (e) {
      if (e.code === 'ENOENT') {
        throw createError.BadRequest("No 'package.json' found in " + cwd, { cause : e })
      }
      else {
        throw e
      }
    }
    if (main === undefined) {
      throw createError.BadRequest(`Package ${pkgPath} does not define 'main'; bailing out.`)
    }

    const rootFiles = await fs.readdir(absSource, { withFileTypes : true })
    const rootIndex = searchForIndex(rootFiles)
    if (rootIndex !== undefined) {
      reporter.log(`Found root index, treating as single ${isExecutable === true ? 'executable' : 'library'}.`);
      (isExecutable === true ? withExecutables : withLibs).push(`${rootIndex}:${main}`)
    }
    else {
      if (rootFiles.some((f) => f.name === 'lib' && f.isDirectory() === true)) {
        const libPath = fsPath.join(absSource, 'lib')
        const libFiles = await fs.readdir(libPath, { withFileTypes : true })
        const libIndex = searchForIndex(libFiles)
        if (libIndex !== undefined) {
          reporter.log('Found lib index, adding to library build list.')
          withLibs.push(fsPath.join(srcPath, 'lib') + ':' + main)
        }
      }
      const execPaths = rootFiles.filter((f) => f.isDirectory()
          && (f.name === 'bin' || f.name === 'cli' || f.name === 'exec' || f.name === 'executable'))
      if (execPaths.length > 1) {
        throw createError.BadRequest('Found multple executable candidates; bailing out: ' + execPaths)
      }
      const execPath = execPaths[0]?.name
      if (execPath !== undefined) {
        const absExecDir = fsPath.join(cwd, srcPath, execPath)
        const execFiles = await fs.readdir(absExecDir, { withFileTypes : true })
        const execIndex = searchForIndex(execFiles)
        if (execIndex !== undefined) {
          reporter.log('Found exec index, adding to executable build list.')
          const execName = main.replace(/((?:.*\/)?[^/]+)\.[mc]?js/, '$1-exec.js')
          withExecutables.push(fsPath.join(execPath, execIndex) + ':' + execName)
        }
      }
    }
  }

  if (withExecutables.length === 0 && withLibs.length === 0) {
    throw createError.BadRequest('No library or executable source could be identified; bailing out.')
  }

  reporter.log('Setting up basic makefile infrastructure...')
  const results = await Promise.all([
    setupMakefileInfra({ cwd, noDoc, noLint, noTest }),
    setupMakefileLocations({
      cwd,
      distPath,
      docBuildPath,
      docSrcPath,
      noDoc,
      noTest,
      qaPath,
      srcPath,
      testStagingPath
    }),
    setupDataFiles({ cwd }),
    setupResources({ cwd, noDoc, noTest }),
    setupJSFiles({ cwd }),
    setupLibraryBuilds({ cwd, reporter, withLibs }),
    setupExecutableBuilds({ cwd, reporter, withExecutables })
  ])

  let allScripts = []
  const dependencyIndex = {}
  for (const result of results) {
    const { dependencies = [], scripts = [] } = result
    allScripts.push(...scripts)
    for (const dep of dependencies) {
      dependencyIndex[dep] = true
    }
  }
  const dependencies = Object.keys(dependencyIndex).sort()

  reporter.log(`Installing ${dependencies.join(', ')}`)
  install({ devPaths: app.ext.devPaths, latest: true, pkgs: dependencies, targetPath: cwd })

  allScripts = allScripts
    .sort((a, b) => {
      if (a.priority < b.priority) return -1
      else if (a.priority > b.priority) return 1
      else return 0
    })

  const data = { dependencies, scripts: allScripts }

  const msg = `Created ${allScripts.length} files.`

  httpSmartResponse({ msg, data, req, res })
}

export { help, func, method, parameters, path }
