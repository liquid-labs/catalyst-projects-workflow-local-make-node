/* global describe expect test */
import * as fsPath from 'node:path'

import { setupProject } from '../setup-project'

const reporter = {
  log   : () => {},
  error : () => {}
}

describe('setupProjects', () => {
  test('creates files for single, root lib package', async() => {
    const cwd = fsPath.join(__dirname, 'data', 'pkgA')
    const data = await setupProject({ cwd, noDoc : true, noInstall : true, reporter })

    expect(data.scripts).toHaveLength(9)
  })
})
