const express = require('express');
const path = require('path');
const fs = require('fs');
const runDeployment = require('./Deploy.js');
const cors = require('cors');

const app = express();
const port = 3000;

const corsOptions = {
    origin: [
        'https://nextjs-builder-nine.vercel.app',
        'http://localhost:3000',
        /\.ngrok-free\.app$/
      ], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

function deleteFolderRecursive(directoryPath) {
    if (fs.existsSync(directoryPath)) {
      fs.readdirSync(directoryPath).forEach((file) => {
        const curPath = path.join(directoryPath, file);
        if (fs.lstatSync(curPath).isDirectory()) { // Recurse if it's a directory
          deleteFolderRecursive(curPath);
        } else { // Delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(directoryPath); // Delete the empty directory itself
    }
};

// POST endpoint to handle deployment
app.post('/deploy', async (req, res) => {
    const errorLogs = [];
    try {
        const { structure } = req.body; // Extract the structure from the request body

        const collectedData = JSON.parse(structure); // Parse the collected data

        const {
            files,
            packageJson,
            jsConfigCode,
            nextConfigJs,
            postcssConfig,    // Added postcss.config.js
            tailwindConfig,   // Added tailwind.config.js
            globalsCss,       // Added globals.css
            envVariables,
            sqlCode,
            keys,
            projectName
        } = collectedData;

        // console.log("PostCSS")
        // console.log(postcssConfig)
        // console.log("TailwindCSS")
        // console.log(tailwindConfig)
        // console.log("GlobalCSS")
        // console.log(globalsCss)

        const apiData = files.filter(file => file.type === 'api');
        const pageData = files.filter(file => file.type === 'page');
        const middlewareData = files.filter(file => file.type === 'middleware');
        const componentData = files.filter(file => file.type === 'component');

        // Create necessary directories for the project
        deleteFolderRecursive("./project");
        const projectDir = path.join(__dirname, 'project');
        if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir);

        const apiDir = path.join(projectDir, 'api');
        const pagesDir = path.join(projectDir, 'pages');
        const middlewareDir = path.join(projectDir, 'middleware');
        const componentDir = path.join(projectDir, 'components');

        [apiDir, pagesDir, middlewareDir, componentDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        });

        // Write the files to the appropriate directories
        const writeFile = (filePath, content) => {
            fs.writeFileSync(filePath, content, 'utf8');
        };

        // Write API files
        apiData.forEach(apiFile => {
            const filePath = path.join(apiDir, apiFile.fileName);
            writeFile(filePath, apiFile.content);
        });

        // Write page files
        pageData.forEach(pageFile => {
            const pageDir = path.join(pagesDir, pageFile.fileName);
            if (!fs.existsSync(pageDir)) {
                fs.mkdirSync(pageDir, { recursive: true });
            }
            const filePath = path.join(pageDir, 'index.js');
            writeFile(filePath, pageFile.content);
        });

        // Write middleware files
        middlewareData.forEach(middlewareFile => {
            const filePath = path.join(middlewareDir, middlewareFile.fileName);
            writeFile(filePath, middlewareFile.content);
        });

        // Write component files
        componentData.forEach(componentFile => {
            const filePath = path.join(componentDir, componentFile.fileName);
            writeFile(filePath, componentFile.content);
        });

        // Write configuration files
        writeFile(path.join(projectDir, 'package.json'), packageJson);
        writeFile(path.join(projectDir, 'jsconfig.json'), jsConfigCode);
        writeFile(path.join(projectDir, 'next.config.js'), nextConfigJs);
        writeFile(path.join(projectDir, 'postcss.config.js'), postcssConfig);    // Write postcss.config.js
        writeFile(path.join(projectDir, 'tailwind.config.js'), tailwindConfig);  // Write tailwind.config.js
        writeFile(path.join(projectDir, 'globals.css'), globalsCss);             // Write globals.css

        // Run the deployment function with all parsed data
        await runDeployment(
            {}, // vercelConfig, as an empty object for now
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
            postcssConfig,    
            tailwindConfig,   
            globalsCss,
            projectName
        );

        if (errorLogs.length > 0) {
            return res.status(500).json({
                message: 'Deployment failed',
                errorLogs: errorLogs
            });
        }

        res.status(200).json({ message: 'Deployment started successfully' });
    } catch (error) {
        console.error('Deployment error:', error);
        res.status(500).json({ error: 'Failed to deploy project', errorLogs });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
