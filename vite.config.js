import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [{
    name: 'save-exclusions-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Simple API endpoint to save exclusions file
        if (req.method === 'POST' && req.url === '/api/save-exclusions') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = path.resolve(__dirname, 'src/js/gameExclusions.js');
              
              fs.writeFileSync(filePath, data.code);
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'File saved successfully' }));
              
              console.log('✅ Auto-saved gameExclusions.js via Admin UI');
            } catch (err) {
              console.error('❌ Failed to auto-save:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  }]
});
