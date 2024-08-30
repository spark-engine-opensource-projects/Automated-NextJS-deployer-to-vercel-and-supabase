# Project Deployment Server

This project provides an automated deployment solution for a Next.js project using Vercel and Supabase. The solution includes an Express server that handles the deployment process, integrates with Vercel, manages environment variables, and executes SQL on Supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Endpoints](#endpoints)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed on your machine. You can install them [here](https://nodejs.org/).
- An account with [Vercel](https://vercel.com/) and [Supabase](https://supabase.com/).
- An [ngrok](https://ngrok.com/) account for tunneling.

## Installation

To install the project, follow these steps:

1. Clone this repository:

    ```bash
    git clone https://github.com/yourusername/yourrepository.git
    cd yourrepository
    ```

2. Install the required dependencies by running the bash script:

    ```bash
    ./setup-and-start.sh
    ```

3. Create a `.env` file in the root directory and add your `NGROK_AUTH_KEY`:

    ```bash
    NGROK_AUTH_KEY=your-ngrok-auth-key
    ```

4. The script will automatically install necessary packages and start the server.

## Usage

Once the server is running, it will listen on port `3000` and establish an ngrok tunnel.

To deploy a project, you can send a POST request to the `/deploy` endpoint with the necessary structure data.

Example:

```bash
curl -X POST http://localhost:3000/deploy -H "Content-Type: application/json" -d @your-project-data.json
```

Replace your-project-data.json with your JSON file containing the deployment structure.

## Project Structure
Here's a brief overview of the project structure:

```bash
.
├── Deploy.js                # Handles deployment to Vercel and Supabase
├── server.js                # Express server to manage deployment
├── start-server.js          # Script to start the server and ngrok
├── setup-and-start.sh       # Bash script to install dependencies and start the server
├── package.json            
```

## Environment Variables
The following environment variables need to be set in your .env file:

NGROK_AUTH_KEY: Your ngrok authentication token.

## Endpoints
POST /deploy
This endpoint triggers the deployment process.

Request Body: A JSON object with the following structure:

```json
{
  "structure": {
    "files": [],
    "packageJson": "",
    "jsConfigCode": "",
    "nextConfigJs": "",
    "postcssConfig": "",
    "tailwindConfig": "",
    "globalsCss": "",
    "envVariables": [],
    "sqlCode": "",
    "keys": {
      "SUPABASE_DB_URL": "",
      "VERCEL_TOKEN": ""
    },
    "projectName": "your-project-name"
  }
}
```
Response: Returns 200 if the deployment was successfully started, otherwise 500 with error details.

## License
This project is licensed under the MIT License - see the LICENSE file for details.