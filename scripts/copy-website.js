const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'frontend website');
const destDir = path.join(__dirname, '..', 'public');

// Recursively copy directory
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      // If it's an HTML file, inject the keydown listener
      if (entry.name.endsWith('.html')) {
        injectShortcut(destPath);
      }
    }
  }
}

function injectShortcut(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
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
  // Inject before </body> if present, otherwise at the end
  if (content.includes('</body>')) {
    content = content.replace('</body>', `${scriptTag}</body>`);
  } else {
    content += scriptTag;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Integrating frontend website into public directory...');
if (!fs.existsSync(srcDir)) {
  console.error(`Error: Source directory "${srcDir}" not found.`);
  process.exit(1);
}
copyDirSync(srcDir, destDir);
console.log('Frontend website integrated successfully with Ctrl+Shift+A navigation shortcut!');
