import { Proxy } from '@domoinc/ryuu-proxy';

// Import manifest dynamically
let manifest;
try {
  const manifestModule = await import('../public/manifest.json', {
    assert: { type: 'json' }
  });
  manifest = manifestModule.default;
} catch (err) {
  console.warn('Could not load manifest.json');
  manifest = { name: 'BISSELL Network Optimization UI', version: '1.0.0' };
}

const config = { manifest };
const ryuuProxy = new Proxy(config);

export default function (app) {
  app.use(ryuuProxy.express());
}
