const { createWebpackConfigAsync } = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createWebpackConfigAsync(env, argv);

  config.resolve.extensions.push('.wasm');
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });

  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };

  return config;
};
