/* global describe expect test */
import * as fsPath from 'node:path'

import { setupProject } from '../setup-project'

const reporter = {
  log   : () => {},
  error : () => {}
}

describe('setupProjects', () => {
  test('creates files for single, root lib package', async() => {
    const workingPkgRoot = fsPath.join(__dirname, 'data', 'pkgA')
    const data = await setupProject({
      myName: '@liquid-labs/catalyst-builder-node',
      myVersion: 'test-version',
      noDoc : true,
      reporter,
      workingPkgRoot
    })

    expect(data.scripts).toHaveLength(9)
  })
})
