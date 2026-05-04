const fs = require('fs');
const path = require('path');

const HEADER = `/**
 * ============================================================================
 * LAUNDRY BUDDY - Smart Laundry Management System
 * ============================================================================
 * 
 * @project   Laundry Buddy
 * @author    Ayush
 * @status    Production Ready
 * @description Part of the Laundry Buddy Evaluation Project. 
 *              Handles core application logic, API routing, and database integrations.
 * ============================================================================
 */
`;

const HTML_HEADER = `<!--
 ============================================================================
 LAUNDRY BUDDY - Smart Laundry Management System
 ============================================================================
 @project   Laundry Buddy
 @author    Ayush
 @status    Production Ready
 @description Frontend View Template.
 ============================================================================
-->
`;

function addHeaderToFile(filePath) {
    const ext = path.extname(filePath);
    if (ext !== '.js' && ext !== '.html') return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has a similar header
    if (content.includes('LAUNDRY BUDDY - Smart Laundry Management System')) {
        return;
    }

    if (ext === '.js') {
        content = HEADER + '\n' + content;
    } else if (ext === '.html') {
        // Prepend after the <!DOCTYPE html> if it exists, else just prepend
        if (content.toLowerCase().startsWith('<!doctype html>')) {
            content = content.replace(/<!doctype html>/i, '<!DOCTYPE html>\n' + HTML_HEADER);
        } else {
            content = HTML_HEADER + '\n' + content;
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Documented: ${filePath}`);
}

function walkDir(dir) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('android')) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            addHeaderToFile(fullPath);
        }
    }
}

const targetDir = path.resolve(__dirname);
console.log(`Adding documentation headers to all files in ${targetDir}...`);
walkDir(targetDir);
console.log('Documentation headers added successfully!');
