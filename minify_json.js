import fs from 'fs';

function minifyJSON(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        const json = JSON.parse(data);
        fs.writeFileSync(filename, JSON.stringify(json));
        console.log(`✅ ${filename} has been minified!`);
    } catch (err) {
        console.error(`❌ Error minifying ${filename}:`, err);
    }
}

const target = process.argv[2] || 'pokemon_detail.json';
minifyJSON(target);
