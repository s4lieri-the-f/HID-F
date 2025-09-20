import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: 'index.html',
      pages: 'build',
      assets: 'build',
      strict: false
    }),
    prerender: {
      handleHttpError: 'warn'
    },
    // GitHub Pages configuration
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/HID-F' : '',
    }
  },
};

export default config;
