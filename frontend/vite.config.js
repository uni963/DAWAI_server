import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
    },
  },
  server: {
    host: '0.0.0.0', // iPhone等外部デバイスからアクセス可能
    port: 5173,
    strictPort: true, // ポート競合時にエラーで停止（複数起動禁止）
    hmr: {
      port: 5173,
      protocol: 'ws'
    },
    // プロキシ設定: AIエンドポイントをバックエンドにルーティング
    proxy: {
      // DiffSinger音声合成専用プロキシ（port 8001）
      '/ai/api/voice': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai\/api\/voice/, '/api')
      },
      // その他のAIエンドポイント（port 8000）
      '/ai/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai\/api/, '/ai/api')
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    },
    // 大きなファイルの配信設定
    fs: {
      allow: ['..']
    },
    // 静的ファイルの配信設定
    static: {
      directory: path.join(__dirname, 'public'),
      watch: true
    },
    // キャッシュ制御を改善
    force: true,
    // 開発時のキャッシュを無効化
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  // WebSocket接続エラーの処理を改善
  define: {
    global: 'globalThis',
  },
  // 開発モードでのキャッシュを無効化
  optimizeDeps: {
    force: true,
    // 依存関係のキャッシュを無効化
    include: [],
    exclude: []
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    // ビルド時のキャッシュ制御
    sourcemap: false, // 本番ではソースマップを無効化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 本番ではコンソールログを削除
        drop_debugger: true
      }
    },
    // 本番用の最適化設定
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000
  },
  // キャッシュディレクトリをクリア
  cacheDir: '.vite-cache'
})
