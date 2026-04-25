import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Inject Buffer + process polyfills BEFORE any module code runs.
    // Solana libraries reference Buffer as a bare global at module evaluation time.
    // Vite bundles the npm 'buffer' package, but the bundled code uses bare `Buffer`
    // references that expect it on globalThis — and those run BEFORE the
    // main.jsx import sets it. This inline script guarantees Buffer exists
    // before ANY JavaScript module evaluates.
    {
      name: 'buffer-polyfill',
      enforce: 'pre',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
    <script>
      if (typeof globalThis.process === 'undefined') {
        globalThis.process = { env: {}, browser: true, version: '', versions: {} };
      }
      if (typeof globalThis.Buffer === 'undefined') {
        // Minimal stub — the real Buffer from the npm package overwrites this
        // once the ES module evaluates. This stub prevents "Buffer is not defined"
        // crashes from Solana code that runs before the import completes.
        globalThis.Buffer = {
          from: function(a) {
            if (Array.isArray(a)) { var b = new Uint8Array(a); b.__proto__ = globalThis.Buffer.prototype || Uint8Array.prototype; return b; }
            if (typeof a === 'string') { var e = new TextEncoder(); var b = e.encode(a); b.__proto__ = globalThis.Buffer.prototype || Uint8Array.prototype; return b; }
            throw new TypeError('Buffer.from stub: unsupported type');
          },
          alloc: function(n) { var b = new Uint8Array(n); b.__proto__ = globalThis.Buffer.prototype || Uint8Array.prototype; return b; },
          allocUnsafe: function(n) { return globalThis.Buffer.alloc(n); },
          allocUnsafeSlow: function(n) { return globalThis.Buffer.alloc(n); },
          isBuffer: function(o) { return o instanceof Uint8Array; },
          byteLength: function(s) { return new TextEncoder().encode(s).length; },
          concat: function(list, total) { var t = total || list.reduce(function(a,b){return a+b.length},0); var b = globalThis.Buffer.alloc(t); var o=0; list.forEach(function(i){b.set(i,o);o+=i.length}); return b; }
        };
      }
    </script>`
        )
      }
    }
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
})