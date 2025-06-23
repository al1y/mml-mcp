# MML Objects API Client

A TypeScript client wrapper for the MML Objects API that supports both localhost development and M² cloud APIs.

## Features

- ✅ **Automatic Mode Detection**: Uses environment variables to switch between localhost and M² cloud APIs
- ✅ **Zero Configuration**: Works out of the box for localhost, just set env vars for cloud
- ✅ **Full TypeScript Support**: Complete type definitions and IntelliSense
- ✅ **Comprehensive CRUD Operations**: Create, Read, Update, Delete, and List MML objects
- ✅ **Error Handling**: Robust error handling with descriptive messages
- ✅ **Automatic Server Management**: Starts and stops localhost server automatically

## Installation

```typescript
import { createMMLClient, MMLClient } from './mml-objects/index.js';
```

## Quick Start

### Localhost Mode (Default)

```typescript
import { createMMLClient } from './mml-objects/index.js';

// Automatically starts local server
const client = await createMMLClient({
  projectId: 'my-project-123'
});

// Clean up when done
await client.stop();
```

### M² Cloud API Mode

```bash
# Set environment variables
export USE_MSQUARED_APIS=true
export MSQUARED_API_KEY=your-actual-api-key
```

```typescript
import { createMMLClient } from './mml-objects/index.js';

// Automatically uses https://api.msquared.io with env API key
const client = await createMMLClient({
  projectId: 'my-project-123'
});

// No server cleanup needed in cloud mode
```

## Configuration

### MMLClientConfig

```typescript
interface MMLClientConfig {
  // Project ID (required)
  projectId: string;
  
  // Custom headers (optional)
  headers?: Record<string, string>;
  
  // Server configuration for localhost mode (optional)
  serverConfig?: {
    port?: number;
    tempDir?: string;
  };
}
```

### Environment Variables

- `USE_MSQUARED_APIS`: Set to any truthy value to use M² cloud APIs instead of localhost
- `MSQUARED_API_KEY`: Your M² API key (required when USE_MSQUARED_APIS is set)

## API Methods

### Create MML Object

```typescript
const newObject = await client.createMMLObject({
  name: 'My Cool Object',
  description: 'A demonstration MML object',
  mmlContent: '<m-cube color="blue" y="1"></m-cube>',
  metadata: {
    category: 'demo',
    tags: ['cube', 'blue']
  }
});

console.log('Created object:', newObject.id);
```

### Get MML Object by ID

```typescript
const object = await client.getMMLObject('instance-id-123');
console.log('Object name:', object.name);
console.log('MML content:', object.mmlContent);
console.log('Can write:', object.canWrite);
```

### Update MML Object

```typescript
const updatedObject = await client.updateMMLObject('instance-id-123', {
  name: 'Updated Object Name',
  mmlContent: '<m-sphere color="red" y="2"></m-sphere>',
  metadata: {
    category: 'updated',
    lastModified: new Date().toISOString()
  }
});

console.log('Updated object:', updatedObject.name);
```

### Delete MML Object

```typescript
await client.deleteMMLObject('instance-id-123');
console.log('Object deleted successfully');
```

### List MML Objects

```typescript
// List all objects
const allObjects = await client.listMMLObjects();
console.log(`Found ${allObjects.totalResults} objects`);

// List with pagination and search
const searchResults = await client.listMMLObjects({
  offset: 0,
  limit: 10,
  search: 'cube'
});

searchResults.objects.forEach(obj => {
  console.log(`- ${obj.name} (${obj.id})`);
});
```

## Usage Examples

### Localhost Development

```typescript
import { createMMLClient } from './mml-objects/index.js';

const client = await createMMLClient({
  projectId: 'dev-project'
});

// Server info available for localhost mode
const serverInfo = client.getLocalServerInfo();
console.log(`Server running at: ${serverInfo?.url}`);

// Your API calls...
const cube = await client.createMMLObject({
  name: 'Test Cube',
  mmlContent: '<m-cube color="blue" y="1"></m-cube>'
});

// Always cleanup localhost server
await client.stop();
```

### Production with M² APIs

```typescript
// In your deployment environment
process.env.USE_MSQUARED_APIS = 'true';
process.env.MSQUARED_API_KEY = 'your-production-api-key';

import { createMMLClient } from './mml-objects/index.js';

const client = await createMMLClient({
  projectId: 'prod-project-id',
  headers: {
    'X-App-Version': '1.0.0'
  }
});

// Same API, but hits M² cloud
const sphere = await client.createMMLObject({
  name: 'Production Sphere',
  mmlContent: '<m-sphere color="red" y="2"></m-sphere>'
});

// No cleanup needed for cloud mode
```

### Advanced Localhost Configuration

```typescript
const client = await createMMLClient({
  projectId: 'advanced-project',
  serverConfig: {
    port: 8080,        // Specific port instead of random
    tempDir: '/tmp/my-mml-objects'  // Custom temp directory
  },
  headers: {
    'X-Custom-Header': 'my-value'
  }
});
```

## Error Handling

```typescript
try {
  const object = await client.getMMLObject('non-existent-id');
} catch (error) {
  if (error.message.includes('404')) {
    console.log('Object not found');
  } else {
    console.error('API error:', error.message);
  }
}
```

## Type Definitions

All TypeScript types are exported for your convenience:

```typescript
import type { 
  MMLObjectInstance,
  CreateMMLObjectInstanceBody,
  UpdateMMLObjectInstanceBody,
  ListMMLObjectInstancesResponse,
  MMLClientConfig,
  ServerInfo
} from './mml-objects/index.js';
```

## Best Practices

1. **Environment Management**: Use environment variables to switch between development and production
2. **Cleanup**: Always call `client.stop()` in localhost mode to properly cleanup resources
3. **Error Handling**: Always wrap API calls in try-catch blocks
4. **Type Safety**: Use the exported types for better development experience

## Mode Comparison

| Feature | Localhost Mode | M² Cloud Mode |
|---------|---------------|---------------|
| **Setup** | Zero config | Set 2 env vars |
| **Server** | Auto-managed | External |
| **Storage** | Temporary files | Persistent cloud |
| **Cleanup** | Required (`client.stop()`) | Not needed |
| **URL** | Random localhost port | https://api.msquared.io |
| **Auth** | None | API key from env | 