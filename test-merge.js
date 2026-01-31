const { mergeImages } = require('./lib/imageProcessor');
const path = require('path');

async function test() {
    const testImagePath = path.join(process.cwd(), 'public', 'generated', 'generated-1769837579004.png');
    const timestamp = 'long-name-test';
    const name = 'PROFESSOR ALEXANDER CUNNINGHAM JUNIOR'; // Extremely long name
    const designation = 'Senior Executive Vice President of Strategic Innovation';

    console.log('Testing composition with:', testImagePath);
    console.log('Using Long Name:', name);
    console.log('Using Long Designation:', designation);

    try {
        const result = await mergeImages(testImagePath, timestamp, name, designation);
        console.log('Success! Test result created at:', result);
        console.log('Please check: http://localhost:3000/final/final-long-name-test.png');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
