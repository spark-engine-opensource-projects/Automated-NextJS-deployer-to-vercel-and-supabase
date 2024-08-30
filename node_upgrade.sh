#!/bin/bash

# Update package list and install curl if not already installed
sudo apt-get update
sudo apt-get install -y curl

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Load NVM immediately in the current shell session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Install Node.js version 20
nvm install 20

# Set Node.js version 20 as the default
nvm use 20

# Verify the installation
node --version
npm --version

# Optional: Install some global npm packages you might need
npm install -g pm2 nodemon

echo "Node.js 20 has been installed and set as the default version."
echo "Please restart your terminal or run 'source ~/.bashrc' to ensure NVM is loaded in your current session."
