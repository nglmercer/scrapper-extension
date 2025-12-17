// Test script to verify the implementation
const { RAWInterceptor } = require('./dist/index.js');

async function testImplementation() {
  console.log('Testing RAWInterceptor implementation...');

  // Test basic instantiation
  try {
    const interceptor = new RAWInterceptor();
    console.log('✓ RAWInterceptor instantiated successfully');
    
    // Initialize the interceptor
    await interceptor.initialize();
    console.log('✓ Interceptor initialized successfully');
    
    // Test configuration
  await interceptor.updateConfig({
    enabled: true,
    filters: {
      urlPatterns: ['*://*/*'],
      minSize: 100,
      contentType: 'application/json'
    }
  });
  console.log('✓ Configuration updated successfully');
  
  // Test getting config
  const config = interceptor.getConfig();
  console.log('✓ Current config retrieved:', JSON.stringify(config, null, 2));
  
  // Test getting stats
  const stats = interceptor.getStats();
  console.log('✓ Stats retrieved:', JSON.stringify(stats, null, 2));
  
  // Test message listener
  const unsubscribe = interceptor.onMessage((message) => {
    console.log('WebSocket message received:', message);
  });
  console.log('✓ Message listener registered');
  
  // Test toggle debug mode
  const debugMode = interceptor.toggleDebugMode();
  console.log('✓ Debug mode toggled:', debugMode);
  
  // Test if enabled
  const isEnabled = interceptor.isEnabled();
  console.log('✓ Interceptor enabled status:', isEnabled);
  
    console.log('\n🎉 All tests passed! Implementation is working correctly.');
    
    // Clean up
    await interceptor.destroy();
    console.log('✓ Interceptor destroyed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testImplementation().catch(console.error);