const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client } = require('pg');

// Directory and file paths
const apiDir = 'project/api';
const pagesDir = 'project/pages';
const middlewareDir = 'project/middleware';
const componentDir = 'project/components';
const vercelConfigPath = 'project/vercel.json';
const jsConfigPath = 'project/jsconfig.json';
const nextConfigPath = 'project/next.config.js';
const postcssConfigPath = 'project/postcss.config.js';
const tailwindConfigPath = 'project/tailwind.config.js';
const globalsCssPath = 'project/globals.css';

// const projectName = "this-one-should-be-the-one";

// Helper function for error logging
const logError = (error, context, errorLogs) => {
    let errorMessage = '';

    if (error.response) {
        errorMessage = `Error ${context} - ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
        errorMessage = `No response received ${context}: ${error.request}`;
    } else {
        errorMessage = `Error ${context}: ${error.message}`;
    }

    console.error(errorMessage);
    errorLogs.push(errorMessage); // Store the error message in the errorLogs array
};

// Function to create a new project on Vercel
const createVercelProject = async (vercelToken, errorLogs, projectName) => {
    try {
        const createResponse = await axios.post(
            'https://api.vercel.com/v9/projects',
            { name: projectName },
            {
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const projectId = createResponse.data.id;
        console.log('Project created:', projectId);

        return projectId;
    } catch (error) {
        logError(error, 'creating Vercel project', errorLogs);
        throw error; // Re-throw error to handle it at a higher level
    }
};

// Function to set environment variables via Vercel API
const setEnvironmentVariables = async (projectId, vercelToken, envVariables, errorLogs) => {
    for (const env of envVariables) {
        try {
            const response = await axios.post(
                `https://api.vercel.com/v9/projects/${projectId}/env`,
                env,
                {
                    headers: {
                        Authorization: `Bearer ${vercelToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log(`Environment variable ${env.key} set:`, response.data);
        } catch (error) {
            logError(error, `setting environment variable ${env.key}`, errorLogs);
        }
    }
};

// Function to deploy the project to Vercel
const deployToVercel = async (projectId, files, vercelToken, errorLogs, projectName) => {
    try {
        const response = await axios.post(
            `https://api.vercel.com/v13/deployments?projectId=${projectId}`,
            {
                name: projectName,
                files: files.map(file => ({
                    file: file.path,
                    data: file.data,
                    encoding: file.encoding,
                })),
                projectSettings: {
                    framework: 'nextjs',
                },
                target: 'production',
            },
            {
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Deployment successful');
        return response.data.id;
    } catch (error) {
        logError(error, 'deploying to Vercel', errorLogs);
        throw error; // Re-throw error to handle it at a higher level
    }
};

// Function to execute SQL on Supabase
const executeSqlOnSupabase = async (sqlCode, supabaseDbUrl, errorLogs) => {
    const client = new Client({
        connectionString: supabaseDbUrl,
    });

    try {
        await client.connect();
        await client.query(sqlCode);
        console.log('Database schema and table created successfully');
    } catch (error) {
        logError(error, 'creating database schema and table', errorLogs);
    } finally {
        await client.end();
    }
};

// Function to wait for deployment to be ready
const waitForDeploymentReady = async (deploymentId, vercelToken, errorLogs, interval = 5000) => {
    while (true) {
        const productionUrl = await getDeploymentDetails(deploymentId, vercelToken, errorLogs);
        if (productionUrl) {
            return productionUrl;
        }
        console.log('Waiting for deployment to be ready...');
        await sleep(interval);
    }
};

// Function to get deployment details from Vercel
const getDeploymentDetails = async (deploymentId, vercelToken, errorLogs) => {
    try {
        const response = await axios.get(
            `https://api.vercel.com/v12/deployments/${deploymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const deploymentStatus = response.data.status;

        if (deploymentStatus === 'READY') {
            const productionUrl = response.data.alias[0];
            return productionUrl;
        } else if (deploymentStatus === 'ERROR' || deploymentStatus === 'FAILED') {
            const errorMessage = `Deployment failed with status ${deploymentStatus}: ${response.data.errorMessage || 'Unknown error'}`;
            console.error(errorMessage);
            errorLogs.push(errorMessage); // Capture the failure details in the error logs
            return null;
        } else {
            console.log('Deployment is not ready yet.');
            return null;
        }
    } catch (error) {
        const errorMessage = `Error fetching deployment details for deployment ID ${deploymentId}: ${error.message}`;
        console.error(errorMessage);
        errorLogs.push(errorMessage); // Log the error
        return null;
    }
};

// Utility function to pause execution for a specified amount of time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to log and catch errors
const logAndCatchError = (operation, callback, errorLogs) => {
    try {
        callback();
        console.log(`${operation} completed successfully.`);
    } catch (error) {
        console.error(`${operation} failed: ${error.message}`);
        errorLogs.push(`${operation} failed: ${error.message}`);
        throw error;
    }
};

// Function to safely read a file and return its base64 content
const safeReadFileSync = (filePath, errorLogs) => {
    try {
        return fs.readFileSync(filePath, 'base64');
    } catch (error) {
        console.error(`Failed to read file ${filePath}: ${error.message}`);
        errorLogs.push(`Failed to read file ${filePath}: ${error.message}`);
        throw error;
    }
};

// Main function to execute deployment and database creation
const runDeployment = async (
    vercelConfig,
    apiData,
    sqlCode,
    pageData,
    componentData,
    jsConfigCode,
    nextConfigJs,
    packageJson,
    envVariables,
    middlewareData,
    keys,
    errorLogs,
    postcssConfig,    // Default to an empty string
    tailwindConfig,   // Default to an empty string
    globalsCss,
    projectName
) => {
    const supabaseDbUrl = keys.SUPABASE_DB_URL;
    const vercelToken = keys.VERCEL_TOKEN;

    try {
        // Create directories if they don't exist
        logAndCatchError(`Creating directory ${apiDir}`, () => {
            if (!fs.existsSync(apiDir)) {
                fs.mkdirSync(apiDir);
            }
        }, errorLogs);

        logAndCatchError(`Creating directory ${pagesDir}`, () => {
            if (!fs.existsSync(pagesDir)) {
                fs.mkdirSync(pagesDir);
            }
        }, errorLogs);

        logAndCatchError(`Creating directory ${middlewareDir}`, () => {
            if (!fs.existsSync(middlewareDir)) {
                fs.mkdirSync(middlewareDir);
            }
        }, errorLogs);

        logAndCatchError(`Creating directory ${componentDir}`, () => {
            if (!fs.existsSync(componentDir)) {
                fs.mkdirSync(componentDir);
            }
        }, errorLogs);

        const files = [];

        // Write package.json
        logAndCatchError(`Writing package.json`, () => {
            const packageJsonPath = './project/package.json';
            fs.writeFileSync(packageJsonPath, packageJson, 'utf8');
            files.push({
                path: 'package.json', 
                data: safeReadFileSync(packageJsonPath, errorLogs),
                encoding: 'base64',
            });
        }, errorLogs);

        // Write jsconfig.json
        logAndCatchError(`Writing jsconfig.json`, () => {
            const jsConfigJsonPath = './project/jsconfig.json';
            fs.writeFileSync(jsConfigJsonPath, jsConfigCode, 'utf8');
            files.push({
                path: 'jsconfig.json',
                data: safeReadFileSync(jsConfigJsonPath, errorLogs),
                encoding: 'base64',
            });
        }, errorLogs);

        // Write next.config.js
        logAndCatchError(`Writing next.config.js`, () => {
            const nextConfigJsPath = './project/next.config.js';
            fs.writeFileSync(nextConfigJsPath, nextConfigJs, 'utf8');
            files.push({
                path: 'next.config.js',
                data: safeReadFileSync(nextConfigJsPath, errorLogs),
                encoding: 'base64',
            });
        }, errorLogs);

        // Write postcss.config.js (Check if defined)
        if (postcssConfig) {
            logAndCatchError(`Writing postcss.config.js`, () => {
                const postcssConfigJsPath = './project/postcss.config.js';
                fs.writeFileSync(postcssConfigJsPath, postcssConfig, 'utf8');
                files.push({
                    path: 'postcss.config.js',
                    data: safeReadFileSync(postcssConfigJsPath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        } else {
            console.warn('postcss.config.js content is undefined or empty.');
        }

        // Write tailwind.config.js (Check if defined)
        if (tailwindConfig) {
            logAndCatchError(`Writing tailwind.config.js`, () => {
                const tailwindConfigJsPath = './project/tailwind.config.js';
                fs.writeFileSync(tailwindConfigJsPath, tailwindConfig, 'utf8');
                files.push({
                    path: 'tailwind.config.js',
                    data: safeReadFileSync(tailwindConfigJsPath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        } else {
            console.warn('tailwind.config.js content is undefined or empty.');
        }

        // Write globals.css (Check if defined)
        if (globalsCss) {
            logAndCatchError(`Writing globals.css`, () => {
                const globalsCssPath = './project/globals.css';
                fs.writeFileSync(globalsCssPath, globalsCss, 'utf8');
                files.push({
                    path: 'globals.css',
                    data: safeReadFileSync(globalsCssPath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        } else {
            console.warn('globals.css content is undefined or empty.');
        }

        // Write middleware scripts to files
        for (let i = 0; i < middlewareData.length; i++) {
            const middlewareScript = middlewareData[i];
            logAndCatchError(`Writing middleware script ${middlewareScript.fileName}`, () => {
                const filePath = `${middlewareDir}/${middlewareScript.fileName}`;
                fs.writeFileSync(filePath, middlewareScript.content, 'utf8');
                files.push({
                    path: `middleware/${middlewareScript.fileName}`, 
                    data: safeReadFileSync(filePath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        }

        // Write API scripts to files
        for (let i = 0; i < apiData.length; i++) {
            const apiScript = apiData[i];
            logAndCatchError(`Writing API script ${apiScript.fileName}`, () => {
                const filePath = `${apiDir}/${apiScript.fileName}`;
                fs.writeFileSync(filePath, apiScript.content, 'utf8');
                files.push({
                    path: `api/${apiScript.fileName}`, 
                    data: safeReadFileSync(filePath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        }

        // Write page scripts to files
        for (let i = 0; i < pageData.length; i++) {
            const pageScript = pageData[i];
            logAndCatchError(`Writing page script ${pageScript.fileName}`, () => {
                const pageDir = `${pagesDir}/${pageScript.fileName}`;

                if (!fs.existsSync(pageDir)) {
                    fs.mkdirSync(pageDir, { recursive: true });
                }

                const filePath = `${pageDir}/index.js`;
                fs.writeFileSync(filePath, pageScript.content, 'utf8');
                files.push({
                    path: `pages/${pageScript.fileName}/index.js`,
                    data: safeReadFileSync(filePath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        }

        // Write component scripts to files
        for (let i = 0; i < componentData.length; i++) {
            const componentScript = componentData[i];
            logAndCatchError(`Writing component script ${componentScript.fileName}`, () => {
                const filePath = `${componentDir}/${componentScript.fileName}`;
                fs.writeFileSync(filePath, componentScript.content, 'utf8');
                files.push({
                    path: `components/${componentScript.fileName}`,
                    data: safeReadFileSync(filePath, errorLogs),
                    encoding: 'base64',
                });
            }, errorLogs);
        }

        // Write Vercel config to file
        logAndCatchError("Writing Vercel config", () => {
            fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
            files.push({
                path: 'vercel.json',
                data: safeReadFileSync(vercelConfigPath, errorLogs),
                encoding: 'base64',
            });
        }, errorLogs);

        // Create Vercel project
        const projectId = await createVercelProject(vercelToken, errorLogs, projectName);
        await sleep(5000);

        // Set environment variables
        await setEnvironmentVariables(projectId, vercelToken, envVariables, errorLogs);

        // Deploy to Vercel
        const deploymentId = await deployToVercel(projectId, files, vercelToken, errorLogs, projectName);

        // Wait for deployment to be ready
        const productionUrl = await waitForDeploymentReady(deploymentId, vercelToken, errorLogs);

        // Execute SQL on Supabase
        await executeSqlOnSupabase(sqlCode, supabaseDbUrl, errorLogs);

        if (productionUrl) {
            console.log('Production URL:', productionUrl);
        }
    } catch (error) {
        console.error('Deployment failed:', error.message);
        errorLogs.push(`Deployment failed: ${error.message}`);
    }
};

module.exports = runDeployment;
