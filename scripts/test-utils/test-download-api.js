#!/usr/bin/env node

// Test the download API
async function testDownloadAPI() {
  console.log('Testing download API...\n');

  // Direct URL generation (no proxy)
  console.log('1. Testing URL generation (no proxy):');
  try {
    const response = await fetch(
      'http://localhost:3000/api/download?slug=the-iliad&type=chapter&chapter=11'
    );
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n2. Testing proxy download:');
  try {
    const response = await fetch(
      'http://localhost:3000/api/download?slug=the-iliad&type=chapter&chapter=11&proxy=true'
    );
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error Response:', errorText);
    } else {
      console.log('Success! Audio file received.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if running locally
console.log('Make sure your development server is running (npm run dev)');
console.log('This script will test the API at http://localhost:3000\n');

testDownloadAPI();
