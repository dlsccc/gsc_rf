import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
const path = require('path');
import requireTransform from 'vite-plugin-require-transform';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  experimental: {
    renderBuiltUrl(filename, { hostId, hostType, type }) {
      if (path.extname(hostId) === '.js') {
        // js文件走CDN函数替换
        return { runtime: `window.__toCdnUrl(${JSON.stringify(filename)})` };
      } else if (path.extname(hostId) === '.html') {
        // html入口走wcm替换
        return `{wcm_staticUrl}${filename}`;
      } else {
        // 其他文件走相对路径
        return { relative: true };
      }
    },
  },
  plugins: [
    commonjs(),
    vue(),
    requireTransform({
      fileRegex: /.js$|.vue$/,
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        additionalData: '@import "@hw-itsc/common/src/style/less-varables.less";', // 引入多个文件以；分割
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
      {
        find: '@hw-itsc/common',
        replacement: path.resolve(__dirname, './node_modules/@hw-itsc/common/'),
      },
    ]
  },
  server: {
    disableHostCheck: true,
    allowedHosts: ['itsc-fs80-dev.sd.huawei.com'],
    open: false,
    port: 5173,
    host: 'localhost.huawei.com',
    hot: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 5173,
    },
  }
});