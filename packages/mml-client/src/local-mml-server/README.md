# MML Object Server

A local TypeScript HTTP server implementation of the MML Object API specification. This server provides a RESTful API for managing MML (Metaverse Markup Language) object instances with temporary file storage.

## Features

- ✅ RESTful API following the OpenAPI specification
- ✅ Temporary file storage with automatic cleanup
- ✅ Random port assignment
- ✅ TypeScript implementation with full type safety
- ✅ CORS support for web applications
- ✅ Search and pagination support
- ✅ Automatic server cleanup on shutdown

## API Endpoints

The server implements the following endpoints:

- `GET /v1/mml-objects/{projectId}/object-instances/` - List MML Object Instances
- `POST /v1/mml-objects/{projectId}/object-instances/` - Create an MML Object Instance
- `GET /v1/mml-objects/{projectId}/object-instances/{instanceId}` - Retrieve an MML Object Instance
- `POST /v1/mml-objects/{projectId}/object-instances/{instanceId}` - Update an MML Object Instance  
- `DELETE /v1/mml-objects/{projectId}/object-instances/{instanceId}` - Delete an MML Object Instance
- `GET /health` - Health check endpoint

## Usage

### Basic Usage

```typescript
import { createMMLObjectServer } from './local-mml-server/index.js';

// Create and start server on a random port
const serverInfo = await createMMLObjectServer();

console.log(`Server running at: ${serverInfo.url}`);
console.log(`Temp directory: ${serverInfo.tempDir}`);

// Use the server...

// Stop and cleanup when done
await serverInfo.stop();
```

### Advanced Configuration

```typescript
import { createMMLObjectServer } from './local-mml-server/index.js';

const serverInfo = await createMMLObjectServer({
  port: 3000,        // Specific port (optional, defaults to random)
  tempDir: '/tmp/my-mml-objects'  // Custom temp directory (optional)
});
```

### Creating MML Objects

```typescript
// Create a new MML object instance
const response = await fetch(`${serverInfo.url}/v1/mml-objects/my-project/object-instances/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Red Cube',
    description: 'A simple red cube',
    mmlContent: '<m-cube color="red" x="0" y="1" z="0"></m-cube>',
    metadata: {
      tags: ['primitive', 'cube'],
      category: 'basic-shapes'
    }
  })
});

const instance = await response.json();
console.log('Created:', instance);
```

### Listing MML Objects

```typescript
// List all objects in a project
const response = await fetch(`${serverInfo.url}/v1/mml-objects/my-project/object-instances/`);
const data = await response.json();

console.log(`Found ${data.totalResults} objects`);
console.log('Objects:', data.objects);
```

### Search and Pagination

```typescript
// Search with pagination
const params = new URLSearchParams({
  search: 'cube',
  offset: '0',
  limit: '10'
});

const response = await fetch(`${serverInfo.url}/v1/mml-objects/my-project/object-instances/?${params}`);
const data = await response.json();
```

## Server Lifecycle

The server automatically:

1. **On Start**: Creates a unique temporary directory for storing MML objects
2. **During Operation**: Stores each MML object instance as a JSON file in project-specific subdirectories
3. **On Stop**: Removes the entire temporary directory and all stored objects

## Data Structure

### MML Object Instance

```typescript
{
  id: string;              // Auto-generated UUID
  projectId: string;       // Project identifier from URL path
  name: string;            // Human-readable name
  description?: string;    // Optional description
  mmlContent: string;      // The actual MML markup
  metadata?: object;       // Optional metadata object
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

## Example

Run the example to see the server in action:

```bash
npm run build
node build/mml-objects/local-mml-server/example.js
```

This will:
1. Start the server on a random port
2. Create a test MML object
3. List all objects  
4. Retrieve the specific object
5. Automatically stop after 30 seconds

## Dependencies

The server uses the following key dependencies:
- `express` - HTTP server framework
- `fs/promises` - File system operations
- `crypto` - UUID generation
- `os` - System temporary directory access

All dependencies are already included in the main project's `package.json`.

## Error Handling

The server provides consistent error responses:

```typescript
{
  error: {
    code: string;        // Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
    message: string;     // Human-readable error message
    details?: any;       // Optional additional error details
  }
}
```

Common HTTP status codes:
- `200` - Success
- `204` - Success (no content, for DELETE)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error 