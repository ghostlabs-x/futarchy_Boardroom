/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use webpack for now to maintain compatibility with Solana packages
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
    };
    
    // Handle ESM modules from @solana packages
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    
    // Ensure proper module resolution
    config.resolve.fullySpecified = false;
    
    return config;
  },
  // Transpile packages that use ESM
  transpilePackages: ['@solana/spl-token'],
  // Add empty turbopack config to silence the warning
  // We're using webpack explicitly for Solana package compatibility
  turbopack: {},
}

module.exports = nextConfig

