import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
const path = require('path');

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
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ]
  },
  server: {
    port: 5173,
    open: true
  }
});