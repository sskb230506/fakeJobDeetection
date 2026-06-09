import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A valid base64 PNG representation of a verification checkmark badge
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AYKDBQOCxHnQwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmQuAAACfElEQVR42u2avUsDMRDGB0o/LhxBv0t/gqOj4qSDoqODo+Lk6ODg6OioODgq/gMHB0dHB0dHx8HB0UHRwcHBQdHBQdHBwUFRtK/wSC7kctfLJZfkLg38gKSp7y/5JbnLt5eXl5eXl5eXlhVAMhFCSAjh3Xn22WceQgjHn+H+/2+EEMXpQ0xT+u9QCEFEG2EKIQSpP1AIIaLth0IIUX6gEEKEOUIkhBD/O0IkhBClB2Kqf0g+m1D9W2KqH5LPQpT+V/JZiNLbEv2T2Jb+N/FtfE+8Hw/wVbyf6/Z+rtP7Odf9Vw3O867b93N9PteN3/X7Ptf1V1Wz/9mNnv6/WfT8pzb3/f/fbfT9Jzfnf9/2f/D3M/71M/H3e38/G38/N/p9/vWjofv6rxs9ffc1m/z7T28O/z8x+p/XDP6lMcOv6dD/ssb4z2vs4z9p/PhP2tD3q6rF/z/V5N2ravKuVdXgXavKwTv/UuM/tYV3U1uG37m/f6+G2y6f16Ntc8B3YtA+1/0nBv1tDfYftU32W432+2/H8N/XYL+9Gvv2m6n++LdM9Y/e4z3+I3d4n9/mff5T2+z/3x3f/39v8v51Hfy72uTdrWvyrk3e1Xg/fNfmffBtm/c/tG3z/kfbNu9/sTnc/1Obu/8/t7H7v0fV5n0fbJv3vdg27/6LbcPuz22D973YNu9+sm0O85/YNu/6sm3d+l1f3fldV+2403fG/56b97/ZNu/+bNvw/mfaPOZfYvP+97aNYZ5X/D/P/7b//2e2/4Mv7gH+lZ93D5C5B+g8XN0DPG4BfgP95jV97Z9d1gAAAABJRU5ErkJggg==';

const iconsDir = path.resolve(__dirname, '../../src/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const buffer = Buffer.from(iconBase64, 'base64');
const iconSizes = ['16', '32', '48', '128'];

for (const size of iconSizes) {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}

console.log('Icons generated successfully.');
