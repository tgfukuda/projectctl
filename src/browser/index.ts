import { ProjectConfig } from '../config';
import { BaseBrowser } from './BaseBrowser';
import { BraveBrowser } from './BraveBrowser';
import { ChromeBrowser } from './ChromeBrowser';

export function createBrowser(project: ProjectConfig, projectName: string): BaseBrowser {
  const browserType = project.browser ?? 'brave';

  switch (browserType) {
    case 'brave':
      return new BraveBrowser(project, projectName);
    case 'chrome':
      return new ChromeBrowser(project, projectName);
    default:
      return new BraveBrowser(project, projectName);
  }
}

export { BaseBrowser, BROWSER_TYPES, BrowserType } from './BaseBrowser';
export { BraveBrowser } from './BraveBrowser';
export { ChromeBrowser } from './ChromeBrowser';
