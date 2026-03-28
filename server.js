// server.js - HTTPS server with English logs
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Determine environment based on npm script
const scriptName = process.env.npm_lifecycle_event;
let dev;

if (scriptName === 'dev:https') {
  dev = true;
  console.log('Development mode');
} else if (scriptName === 'start:https') {
  dev = false;
  console.log('Production mode');
} else {
  // Default to production mode
  dev = false;
  console.log('Unknown script, using production mode');
}

const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL certificate file paths
const sslFiles = {
  ca: path.join(__dirname, 'ssl/root.ca-bundle'),
  cert: path.join(__dirname, 'ssl/server.crt'),
  key: path.join(__dirname, 'ssl/server.key')
};

// Check and load SSL certificates
function loadSSLCertificates() {
  try {
    // Check if all certificate files exist
    for (const [type, filePath] of Object.entries(sslFiles)) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`SSL ${type} file not found: ${filePath}`);
      }
    }

    console.log('All SSL certificate files found');
    
    return {
      ca: fs.readFileSync(sslFiles.ca),
      cert: fs.readFileSync(sslFiles.cert),
      key: fs.readFileSync(sslFiles.key)
    };
  } catch (error) {
    console.error('Failed to load SSL certificates:', error.message);
    console.error('Please ensure the following files exist:');
    console.error('  - ssl/*.ca-bundle');
    console.error('  - ssl/*.crt');
    console.error('  - ssl/*.key');
    process.exit(1);
  }
}

// Start the application
app.prepare().then(() => {
  const httpsOptions = loadSSLCertificates();
  
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, (err) => {
    if (err) {
      console.error('Failed to start HTTPS server:', err);
      process.exit(1);
    }
    console.log(`HTTPS Server ready on https://${hostname}:${port}`);
    
    if (dev) {
      console.log('Development mode started with hot reload support');
    } else {
      console.log('Production mode started with optimized performance');
    }
  });

}).catch((ex) => {
  console.error('Failed to start Next.js application:', ex.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');  
  process.exit(0);
});