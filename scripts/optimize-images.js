const fs = require('fs');
const path = require('path');

// We use dynamic require for sharp because it might still be installing in the background
function getSharp() {
  try {
    return require('sharp');
  } catch (err) {
    console.error('Error: sharp is not installed or still installing. Run npm install first.');
    process.exit(1);
  }
}

const imgDir = path.join(__dirname, '..', 'src', 'frontend website', 'img');

async function optimizeImages() {
  const sharp = getSharp();
  if (!fs.existsSync(imgDir)) {
    console.error(`Directory not found: ${imgDir}`);
    return;
  }

  const files = fs.readdirSync(imgDir);
  let totalSaved = 0;

  for (const file of files) {
    const filePath = path.join(imgDir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      const originalSize = stat.size;
      // Skip files already smaller than 10KB to avoid redundant processing
      if (originalSize < 10240) continue;

      console.log(`Optimizing ${file} (${(originalSize / 1024).toFixed(1)} KB)...`);
      try {
        const inputBuffer = fs.readFileSync(filePath);
        let pipeline = sharp(inputBuffer);
        
        if (ext === '.jpg' || ext === '.jpeg') {
          pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        } else if (ext === '.png') {
          pipeline = pipeline.png({ quality: 80, compressionLevel: 9, palette: true });
        }

        const outputBuffer = await pipeline.toBuffer();
        
        // Only overwrite if the output is actually smaller than original
        if (outputBuffer.length < originalSize) {
          fs.writeFileSync(filePath, outputBuffer);
          const saved = originalSize - outputBuffer.length;
          totalSaved += saved;
          console.log(`✓ Compressed ${file}: ${(outputBuffer.length / 1024).toFixed(1)} KB (-${((saved / originalSize) * 100).toFixed(1)}%)`);
        } else {
          console.log(`- Skipped ${file} (compression didn't reduce size)`);
        }
      } catch (err) {
        console.error(`✗ Failed to optimize ${file}:`, err.message);
      }
    }
  }
  
  console.log(`\nDone! Total bandwidth saved: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB`);
}

optimizeImages().catch(err => {
  console.error('Fatal error during optimization:', err);
});
