const { mergeImages } = require('./lib/imageProcessor');
const path = require('path');

async function test() {
    const testImagePath = path.join(process.cwd(), 'public', 'generated', 'generated-1769837579004.png');
    const timestamp = 'test-positioning';

    console.log('Testing composition with:', testImagePath);

    try {
        const result = await mergeImages(testImagePath, timestamp);
        console.log('Success! Test result created at:', result);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
