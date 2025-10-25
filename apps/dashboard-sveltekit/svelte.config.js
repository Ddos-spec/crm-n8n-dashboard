import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    alias: {
      $lib: 'src/lib',
      $stores: 'src/lib/stores',
      $config: 'src/lib/config'
    },
    paths: {
      base: dev ? '' : process.env.PUBLIC_BASE_PATH ?? ''
    }
  },
  preprocess: preprocess({
    postcss: true,
    typescript: true
  })
};

export default config;
