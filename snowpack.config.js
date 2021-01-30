// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
	  src: "/",
  },
  plugins: [
	  '@snowpack/plugin-typescript',
  ],
  packageOptions: {
	  "source": "remote",
	  "types": true,
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
