/** @type {import('next').NextConfig} */
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.plugins = [
      ...(config.resolve.plugins || []),
      new TsconfigPathsPlugin({
        configFile: './tsconfig.json',
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      }),
    ];
    return config;
  },
}

export default nextConfig
