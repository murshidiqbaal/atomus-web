const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');
const Terser = require('terser');

const srcDir = path.join(__dirname, '..', 'src', 'frontend website');
const destDir = path.join(__dirname, '..', 'public');

// Recursively copy and minify directory
async function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.html') {
        let content = fs.readFileSync(srcPath, 'utf8');
        content = injectShortcut(content);
        try {
          const minified = await minifyHTML(content, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
            removeAttributeQuotes: false,
            collapseBooleanAttributes: true
          });
          fs.writeFileSync(destPath, minified, 'utf8');
          console.log(`Minified HTML: ${entry.name}`);
        } catch (err) {
          console.warn(`Minification failed for ${entry.name}, copying raw file.`, err.message);
          fs.writeFileSync(destPath, content, 'utf8');
        }
      } else if (ext === '.css' && !entry.name.endsWith('.min.css')) {
        // Minify unminified CSS
        const content = fs.readFileSync(srcPath, 'utf8');
        try {
          const minified = new CleanCSS().minify(content).styles;
          fs.writeFileSync(destPath, minified, 'utf8');
          console.log(`Minified CSS: ${entry.name}`);
        } catch (err) {
          console.warn(`Minification failed for ${entry.name}, copying raw file.`, err.message);
          fs.copyFileSync(srcPath, destPath);
        }
      } else if (ext === '.js' && !entry.name.endsWith('.min.js')) {
        // Minify unminified JS
        const content = fs.readFileSync(srcPath, 'utf8');
        try {
          const minified = await Terser.minify(content);
          if (minified.code) {
            fs.writeFileSync(destPath, minified.code, 'utf8');
            console.log(`Minified JS: ${entry.name}`);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch (err) {
          console.warn(`Minification failed for ${entry.name}, copying raw file.`, err.message);
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        // Copy other files (images, minified css/js) directly
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function injectShortcut(content) {
  const scriptTag = `
<!-- Automatically injected Atomus Admin Navigation Shortcut -->
<script>
  document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
      event.preventDefault();
      window.location.href = '/admin';
    }
  });
</script>
`;
  if (content.includes('</body>')) {
    return content.replace('</body>', `${scriptTag}</body>`);
  } else {
    return content + scriptTag;
  }
}

async function run() {
  console.log('Integrating and minifying frontend website into public directory...');
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory "${srcDir}" not found.`);
    process.exit(1);
  }
  await copyDir(srcDir, destDir);
  console.log('Frontend website integrated and minified successfully with Ctrl+Shift+A navigation shortcut!');
}

run().catch(err => {
  console.error('Fatal error during integration:', err);
});
