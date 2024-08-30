#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Update package lists and install required packages
install_dependencies() {
    echo "Updating package lists..."
    sudo apt-get update
    
    echo "Installing required packages..."
    sudo apt-get install -y build-essential libssl-dev curl
}

# Install Node.js and npm if not already installed
install_node() {
    if ! command_exists node || ! command_exists npm; then
        echo "Node.js and npm are not installed. Installing..."
        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "Node.js and npm are already installed."
    fi
}

# Install ngrok
install_ngrok() {
    if ! command_exists ngrok; then
        echo "ngrok is not installed. Installing..."
        wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
        unzip ngrok-stable-linux-amd64.zip
        sudo mv ngrok /usr/local/bin/
        rm ngrok-stable-linux-amd64.zip
    else
        echo "ngrok is already installed."
    fi
}

# Install project dependencies
install_project_dependencies() {
    echo "Installing project dependencies..."
    npm install
}

# Start the server
start_server() {
    echo "Starting the server..."
    node start-server.js
}

# Main function
main() {
    install_dependencies
    install_node
    install_ngrok
    install_project_dependencies
    start_server
}

main
