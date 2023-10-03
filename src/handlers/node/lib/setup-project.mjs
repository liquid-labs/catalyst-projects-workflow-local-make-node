import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import createError from 'http-errors'

import { setupMakefileInfra, setupMakefileLocations } from '@liquid-labs/catalyst-lib-makefiles'
import { install } from '@liquid-labs/npm-toolkit'

import { searchForIndex } from './search-for-index'
import { setupLibraryBuilds, setupExecutableBuilds } from './setup-builds'
import { setupDataFiles } from './setup-data-files'
import { setupJSFiles } from './setup-js-files'
import { setupLint } from './setup-lint'
import { setupResources } from './setup-resources'
import { setupTest } from './setup-test'

const setupProject = async(options) => {
  const {
    app,
    cwd,
    distPath = 'dist',
    isExecutable,
    docBuildPath = 'doc',
    docSrcPath = 'doc',
    noDoc,
    noLint,
    noInstall, // this is for testing
    noTest,
    reporter,
    srcPath = 'src',
    testStagingPath = 'test-staging',
    qaPath = 'qa',
    withExecutables = [],
    withLibs = []
  } = options

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
    console.log('rootFiles:', rootFiles) // DEBUG
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

  const scriptBuilders = [
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
  ]

  if (noLint !== true) {
    scriptBuilders.push(setupLint({ cwd, noDoc, noTest }))
  }

  if (noTest !== true) {
    scriptBuilders.push(setupTest({ cwd }))
  }

  const results = await Promise.all(scriptBuilders)

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

  if (noInstall === true) {
    reporter.log('Skipping dependency install.')
  }
  else {
    reporter.log(`Installing ${dependencies.join(', ')}`)
    install({ devPaths : app.ext.devPaths, latest : true, pkgs : dependencies, targetPath : cwd })
  }

  allScripts = allScripts
    .sort((a, b) => {
      if (a.priority < b.priority) return -1
      else if (a.priority > b.priority) return 1
      else return 0
    })

  const data = { dependencies, scripts : allScripts }

  return data
}

export { setupProject }
