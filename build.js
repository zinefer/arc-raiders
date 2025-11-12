import * as esbuild from 'esbuild';

async function buildReactApps() {
  const apps = [
    { src: 'src/items.jsx', out: 'www/items.js' },
    { src: 'src/quests.jsx', out: 'www/quests.js' }
  ];
  
  for (const app of apps) {
    await esbuild.build({
      entryPoints: [app.src],
      bundle: false,
      outfile: app.out,
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2015',
      format: 'iife'
    });
    
    console.log(`✓ Built ${app.out}`);
  }
}

buildReactApps().catch(console.error);
