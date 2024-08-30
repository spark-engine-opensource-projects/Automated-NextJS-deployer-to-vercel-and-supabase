const { spawn } = require('child_process');
const ngrok = require('ngrok');
require("dotenv").config()

// Start the Express server
const server = spawn('node', ['server.js']);

server.stdout.on('data', (data) => {
  console.log(`Express server output: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`Express server error: ${data}`);
});

server.on('close', (code) => {
  console.log(`Express server process exited with code ${code}`);
});

// Start ngrok tunnel
(async function() {
    try {
        console.log('Attempting to start ngrok tunnel...');
        const url = await ngrok.connect({
            proto: 'http',
            addr: 3000,
            authtoken: process.env.NGROK_AUTH_KEY, // Make sure this is set
            onStatusChange: status => {
                console.log(`Ngrok status changed: ${status}`);
            },
            onLogEvent: data => {
                console.log(`Ngrok log: ${data}`);
            }
        });
        console.log(`ngrok tunnel established at: ${url}`);
        console.log('Use this URL to access your API securely over HTTPS');
    } catch (error) {
        console.error('Error establishing ngrok tunnel:', error);
        console.error('Ngrok error details:', error.details);
    }
})();
