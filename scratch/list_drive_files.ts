import { getDrive as getServiceDrive } from '../src/lib/google/drive';
import { getDrive as getOAuthDrive } from '../src/lib/google';
import { DRIVE_FOLDERS } from '../src/lib/driveFolders';

async function listFiles() {
  console.log("Checking Google Drive Students Folder ID:", DRIVE_FOLDERS.students);
  
  // Try Service Account
  try {
    console.log("\n--- TRYING SERVICE ACCOUNT ---");
    const drive = getServiceDrive();
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDERS.students}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    console.log("Success! Files found:", res.data.files);
    return;
  } catch (err: any) {
    console.log("Service Account check failed:", err.message);
  }

  // Try OAuth Refresh Token
  try {
    console.log("\n--- TRYING OAUTH CLIENT ---");
    const drive = getOAuthDrive();
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDERS.students}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)'
    });
    console.log("Success! Files found:", res.data.files);
  } catch (err: any) {
    console.log("OAuth client check failed:", err.message);
  }
}

listFiles();
