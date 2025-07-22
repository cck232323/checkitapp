const fs = require('fs');
const path = require('path');

// 检查 .next/static 目录是否存在
const staticDir = path.join(__dirname, '..', '.next', 'static');
if (!fs.existsSync(staticDir)) {
  console.error('Static directory does not exist:', staticDir);
  console.log('Creating directory...');
  fs.mkdirSync(staticDir, { recursive: true });
  console.log('Directory created.');
}

// 检查 public 目录是否存在
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  console.error('Public directory does not exist:', publicDir);
  console.log('Creating directory...');
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Directory created.');
}

// 检查 uploads 目录是否存在
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.error('Uploads directory does not exist:', uploadsDir);
  console.log('Creating directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Directory created.');
}

console.log('Directory check completed.');