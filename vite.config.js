import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
const path = require('path');
import requireTransform from 'vite-plugin-require-transform';
import commonjs from '@rollup/plugin-commonjs';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig(({mode}) =>{
  let prePath = '';
  if(mode === 'development'){
    prePath = './';
  }else{
    prePath = '{wcm_staticUrl}';
  }
  return {
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
      createHtmlPlugin({
        template: './index.html',
        minify: false,
        inject: {
          data: {
            version: process.env.BUILD_VERSION || Date.now(),
            prePath,
          },
        },
      }),
    ],
    build: {
      commonjsOptions: {
        exclude: /node_modules/,
      },
      // 关键：使用稳定的 moduleId，确保每次构建 hash 一致
      moduleIds: 'deterministic',
      // 关闭文件名hash，只在必要时候使用
      assetsFileNames: 'assets/[name]-[hash][extname]',
      chunkFileNames: 'chunks/[name]-[hash][extname]',
      entryFileNames: 'js/[name]-[hash][extname]',
      // 关闭 css code split，避免顺序问题导致 hash 变化
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // 简化分块，不做复杂分包，避免顺序不稳定
          compact: true,
        },
      },
    },
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
  }
});