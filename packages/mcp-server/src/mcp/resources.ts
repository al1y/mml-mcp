import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import type { Server } from "@modelcontextprotocol/sdk/server/index.js"

import { MML_ELEMENTS } from "../data/elements.js"
import { MML_TEMPLATES } from "../data/templates.js"
import { MML_EXAMPLES } from "../data/examples.js"

/**
 * Register all resource handlers for the MCP server
 */
export function registerResourceHandlers(server: Server) {
  // List all available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [
      // MML Element Documentation
      ...Object.keys(MML_ELEMENTS).map((element) => ({
        uri: `mml://elements/${element}`,
        name: `MML Element: ${element}`,
        description:
          MML_ELEMENTS[element as keyof typeof MML_ELEMENTS].description,
        mimeType: "text/plain",
      })),

      // MML Templates
      ...Object.keys(MML_TEMPLATES).map((template) => ({
        uri: `mml://templates/${template}`,
        name: `MML Template: ${template}`,
        description: `Complete MML document template for ${template.replace("-", " ")}`,
        mimeType: "text/html",
      })),

      // MML Examples
      ...Object.keys(MML_EXAMPLES).map((example) => ({
        uri: `mml://examples/${example}`,
        name: `MML Example: ${example}`,
        description: `MML code example demonstrating ${example.replace("-", " ")}`,
        mimeType: "text/html",
      })),

      // MML Schema and Documentation
      {
        uri: "mml://schema/elements",
        name: "MML Elements Schema",
        description: "Complete list of all MML elements and their attributes",
        mimeType: "application/json",
      },

      {
        uri: "mml://docs/getting-started",
        name: "MML Getting Started Guide",
        description: "Introduction to MML and basic concepts",
        mimeType: "text/markdown",
      },

      {
        uri: "mml://docs/networked-dom",
        name: "MML Networked DOM Guide",
        description:
          "Understanding MML's multi-user capabilities via Networked DOM",
        mimeType: "text/markdown",
      },
    ]

    console.log(`Listed ${resources.length} resources`)
    return { resources }
  })

  // Read specific resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri
    console.log(`Reading resource: ${uri}`)

    // Handle MML element documentation
    if (uri.startsWith("mml://elements/")) {
      const elementName = uri.replace("mml://elements/", "")
      const element = elementName as keyof typeof MML_ELEMENTS
      if (MML_ELEMENTS[element]) {
        console.log(`Serving element documentation for: ${elementName}`)
        const elementInfo = MML_ELEMENTS[element]
        const attributeList = Object.entries(elementInfo.attributes)
          .map(([attr, desc]) => `  ${attr}: ${desc}`)
          .join("\n")

        const elementId = elementName.replace("m-", "")
        const interactiveExample = generateInteractiveExample(
          elementName,
          elementId,
        )

        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: `MML Element: ${elementName}

Description: ${elementInfo.description}

Attributes:
${attributeList}

Example Usage:
${generateBasicExample(elementName)}

Interactive Example:
${interactiveExample}`,
            },
          ],
        }
      }
    }

    // Handle MML templates
    if (uri.startsWith("mml://templates/")) {
      const templateName = uri.replace("mml://templates/", "")
      const template = templateName as keyof typeof MML_TEMPLATES
      if (MML_TEMPLATES[template]) {
        console.log(`Serving template: ${templateName}`)
        return {
          contents: [
            {
              uri,
              mimeType: "text/html",
              text: MML_TEMPLATES[template],
            },
          ],
        }
      }
    }

    // Handle MML examples
    if (uri.startsWith("mml://examples/")) {
      const exampleName = uri.replace("mml://examples/", "")
      const example = exampleName as keyof typeof MML_EXAMPLES
      if (MML_EXAMPLES[example]) {
        console.log(`Serving example: ${exampleName}`)
        return {
          contents: [
            {
              uri,
              mimeType: "text/html",
              text: MML_EXAMPLES[example],
            },
          ],
        }
      }
    }

    // Handle MML schema
    if (uri === "mml://schema/elements") {
      console.log(`Serving MML elements schema`)
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(MML_ELEMENTS, null, 2),
          },
        ],
      }
    }

    // Handle getting started guide
    if (uri === "mml://docs/getting-started") {
      console.log(`Serving getting started guide`)
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: getGettingStartedGuide(),
          },
        ],
      }
    }

    // Handle networked DOM guide
    if (uri === "mml://docs/networked-dom") {
      console.log(`Serving networked DOM guide`)
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: getNetworkedDOMGuide(),
          },
        ],
      }
    }

    console.error(`Resource not found: ${uri}`)
    throw new Error(`Resource not found: ${uri}`)
  })
}

function generateBasicExample(elementName: string): string {
  switch (elementName) {
    case "m-cube":
    case "m-sphere":
    case "m-cylinder":
      return `<${elementName} id="example" color="blue" x="0" y="1" z="0"></${elementName}>`

    case "m-model":
      return `<${elementName} id="example" src="https://public.mml.io/example.glb" x="0" y="0" z="0"></${elementName}>`

    case "m-character":
      return `<${elementName} id="example" src="https://public.mml.io/avatar.glb" x="0" y="0" z="0"></${elementName}>`

    case "m-video":
      return `<${elementName} id="example" src="https://example.com/video.mp4" width="4" height="2.25" x="0" y="2" z="0"></${elementName}>`

    case "m-audio":
      return `<${elementName} id="example" src="https://example.com/audio.mp3" x="0" y="1" z="0"></${elementName}>`

    case "m-label":
      return `<${elementName} id="example" text="Hello World" color="white" x="0" y="2" z="0"></${elementName}>`

    case "m-light":
      return `<${elementName} id="example" type="point" color="white" intensity="1" x="0" y="5" z="0"></${elementName}>`

    case "m-group":
      return `<${elementName} id="example" x="0" y="0" z="0">
  <m-cube color="red" y="1"></m-cube>
  <m-sphere color="blue" x="2" y="1"></m-sphere>
</${elementName}>`

    default:
      return `<${elementName} id="example"></${elementName}>`
  }
}

function generateInteractiveExample(
  elementName: string,
  elementId: string,
): string {
  switch (elementName) {
    case "m-cube":
    case "m-sphere":
    case "m-cylinder":
      return `<${elementName} id="interactive-${elementId}" 
         color="red" 
         x="0" y="1" z="0"
         onclick="changeColorAndRotate()"></${elementName}>

<script>
  function changeColorAndRotate() {
    const element = document.getElementById('interactive-${elementId}');
    
    // Cycle through colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    const currentColor = element.getAttribute('color') || 'red';
    const currentIndex = colors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % colors.length;
    element.setAttribute('color', colors[nextIndex]);
    
    // Add rotation animation
    const currentRotation = parseFloat(element.getAttribute('ry') || '0');
    element.setAttribute('ry', currentRotation + 45);
    
    console.log('${elementName} clicked! New color: ' + colors[nextIndex]);
  }
</script>`

    case "m-video":
      return `<m-video id="interactive-${elementId}" 
         src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
         width="4" height="2.25" 
         x="0" y="2" z="0"
         onclick="toggleVideo()"></m-video>

<script>
  let isPlaying = false;
  
  function toggleVideo() {
    const video = document.getElementById('interactive-${elementId}');
    
    if (isPlaying) {
      video.setAttribute('autoplay', 'false');
      console.log('Video paused');
    } else {
      video.setAttribute('autoplay', 'true');
      console.log('Video playing');
    }
    
    isPlaying = !isPlaying;
  }
</script>`

    case "m-audio":
      return `<m-audio id="interactive-${elementId}" 
         src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
         x="0" y="1" z="0"
         onclick="playAndAdjustVolume()"></m-audio>

<script>
  let currentVolume = 0.5;
  
  function playAndAdjustVolume() {
    const audio = document.getElementById('interactive-${elementId}');
    
    // Cycle through volume levels
    currentVolume = currentVolume >= 1 ? 0.1 : currentVolume + 0.3;
    audio.setAttribute('volume', currentVolume);
    audio.setAttribute('autoplay', 'true');
    
    console.log('Audio volume set to: ' + Math.round(currentVolume * 100) + '%');
  }
</script>`

    case "m-label":
      return `<m-label id="interactive-${elementId}" 
         text="Click me!" 
         color="white" 
         font-size="32"
         x="0" y="2" z="0"
         onclick="changeText()"></m-label>

<script>
  let clickCount = 0;
  
  function changeText() {
    const label = document.getElementById('interactive-${elementId}');
    clickCount++;
    
    const messages = [
      'Hello!', 
      'Welcome to MML!', 
      'Interactive text!', 
      'Click count: ' + clickCount,
      'Amazing! 🎉'
    ];
    
    const colors = ['white', 'yellow', 'cyan', 'lime', 'pink'];
    
    label.setAttribute('text', messages[clickCount % messages.length]);
    label.setAttribute('color', colors[clickCount % colors.length]);
    
    console.log('Label updated - clicks: ' + clickCount);
  }
</script>`

    case "m-light":
      return `<m-light id="interactive-${elementId}" 
         type="point" 
         color="white" 
         intensity="1" 
         x="0" y="5" z="0"></m-light>

<!-- Add a cube to see the lighting effect -->
<m-cube id="lit-cube" color="gray" y="1" onclick="changeLighting()"></m-cube>

<script>
  let lightColorIndex = 0;
  let lightIntensity = 1;
  const lightColors = ['white', 'red', 'blue', 'green', 'yellow'];
  
  function changeLighting() {
    const light = document.getElementById('interactive-${elementId}');
    
    // Change light color
    lightColorIndex = (lightColorIndex + 1) % lightColors.length;
    light.setAttribute('color', lightColors[lightColorIndex]);
    
    // Toggle intensity
    lightIntensity = lightIntensity === 1 ? 2 : 1;
    light.setAttribute('intensity', lightIntensity);
    
    console.log('Light: ' + lightColors[lightColorIndex] + ', intensity: ' + lightIntensity);
  }
</script>`

    case "m-model":
      return `<m-model id="interactive-${elementId}" 
         src="https://public.mml.io/dice.glb" 
         x="0" y="0" z="0"
         onclick="spinModel()"></m-model>

<script>
  function spinModel() {
    const model = document.getElementById('interactive-${elementId}');
    
    // Random rotation on all axes for dice effect
    const rx = Math.random() * 360;
    const ry = Math.random() * 360;
    const rz = Math.random() * 360;
    
    model.setAttribute('rx', rx);
    model.setAttribute('ry', ry);
    model.setAttribute('rz', rz);
    
    console.log('Model spun! New rotation: ' + Math.round(ry) + '°');
  }
</script>`

    case "m-character":
      return `<m-character id="interactive-${elementId}" 
           src="https://public.mml.io/avatar-base.glb"
           x="0" y="0" z="0"
           onclick="waveAnimation()"></m-character>

<script>
  let isWaving = false;
  
  function waveAnimation() {
    if (!isWaving) {
      isWaving = true;
      const character = document.getElementById('interactive-${elementId}');
      
      // Trigger wave animation
      character.setAttribute('animation', 'wave');
      
      setTimeout(() => {
        character.removeAttribute('animation');
        isWaving = false;
      }, 2000);
      
      console.log('Character is waving!');
    }
  }
</script>`

    case "m-group":
      return `<m-group id="interactive-${elementId}" 
         x="0" y="0" z="0"
         onclick="rotateGroup()">
  <m-cube color="red" x="-1" y="1"></m-cube>
  <m-sphere color="blue" x="1" y="1"></m-sphere>
  <m-cylinder color="green" y="0.5" radius="0.3" height="1"></m-cylinder>
</m-group>

<script>
  let groupRotation = 0;
  
  function rotateGroup() {
    const group = document.getElementById('interactive-${elementId}');
    groupRotation += 45;
    
    group.setAttribute('ry', groupRotation);
    
    // Add scaling effect
    const scale = 1 + Math.sin(groupRotation * Math.PI / 180) * 0.2;
    group.setAttribute('sx', scale);
    group.setAttribute('sz', scale);
    
    console.log('Group rotated: ' + groupRotation + '°, scale: ' + scale.toFixed(2));
  }
</script>`

    default:
      return `<${elementName} id="interactive-${elementId}"></${elementName}>

<script>
  // This element doesn't have a specific interactive example yet
  console.log('${elementName} element - add custom interactivity here');
</script>`
  }
}

function getGettingStartedGuide(): string {
  return `# MML Getting Started Guide

## What is MML?

Metaverse Markup Language (MML) is a markup language for describing 3D multi-user interactive Metaversal objects and experiences based on HTML.

## Key Concepts

### 1. HTML-based 3D Elements
MML extends HTML with 3D elements like:
- \`<m-cube>\` - 3D cube primitive
- \`<m-sphere>\` - 3D sphere primitive  
- \`<m-model>\` - Load 3D models (GLTF, GLB, OBJ)
- \`<m-character>\` - 3D character/avatar
- \`<m-group>\` - Group elements together

### 2. JavaScript Interactivity
Use familiar JavaScript/DOM APIs:
\`\`\`javascript
const cube = document.getElementById('my-cube');
cube.addEventListener('click', () => {
  cube.setAttribute('color', 'blue');
});
\`\`\`

### 3. Networked DOM
MML documents can run on a server, enabling multi-user experiences where multiple people can interact with the same 3D content simultaneously.

## Your First MML Document

\`\`\`html
<m-cube id="my-cube" color="red" y="1"></m-cube>

<script>
  const cube = document.getElementById('my-cube');
  cube.addEventListener('click', () => {
    cube.setAttribute('color', 'blue');
  });
</script>
\`\`\`

## Common Attributes

Most MML elements support these attributes:
- \`x, y, z\` - Position in 3D space (meters)
- \`rx, ry, rz\` - Rotation in degrees
- \`sx, sy, sz\` - Scale factors
- \`color\` - Color value
- \`visible\` - Show/hide element
- \`onclick\` - Click handler script
- \`id\` - Unique identifier

## Next Steps

1. Try the basic templates provided
2. Experiment with different elements
3. Add interactivity with JavaScript
4. Explore multi-user capabilities with Networked DOM`
}

function getNetworkedDOMGuide(): string {
  return `# MML Networked DOM Guide

## Overview

Networked DOM is the technology that enables MML documents to support multiple users interacting with the same 3D content simultaneously.

## How It Works

1. **Server-Side Execution**: MML documents run on a server using a library called "Networked DOM"
2. **WebSocket Communication**: Clients connect via WebSocket to receive real-time updates
3. **Synchronized State**: All users see the same state and can interact with shared objects
4. **Event Propagation**: User interactions are sent to the server and propagated to all connected clients

## Architecture

\`\`\`
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   MML Client    │◄─────────────────►│  Networked DOM  │
│   (Browser)     │                   │     Server      │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   MML Document  │
                                    │   (JSDOM)       │
                                    └─────────────────┘
\`\`\`

## Key Features

### Multi-User Interactions
- Multiple users can click, move, and modify the same objects
- Changes are synchronized in real-time across all connected clients
- Supports concurrent modifications with conflict resolution

### Persistent State
- Object states persist across user sessions
- Server maintains the authoritative state
- New users joining see the current state immediately

### Event Synchronization
- DOM events (clicks, attribute changes) are networked
- Custom events can be broadcast to all users
- Script execution happens on the server

## Example Multi-User Document

\`\`\`html
<m-cube id="shared-cube" 
        color="red" 
        y="1" 
        onclick="changeColor()">
</m-cube>

<m-label id="click-counter" 
         text="Clicks: 0" 
         x="2" y="2">
</m-label>

<script>
  let clickCount = 0;
  
  function changeColor() {
    const cube = document.getElementById('shared-cube');
    const counter = document.getElementById('click-counter');
    
    // This runs on the server and is synchronized to all clients
    clickCount++;
    
    const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
    cube.setAttribute('color', colors[clickCount % colors.length]);
    counter.setAttribute('text', \`Clicks: \${clickCount}\`);
  }
</script>
\`\`\`

## Benefits

1. **Real-time Collaboration**: Multiple users can interact with 3D content together
2. **Familiar APIs**: Uses standard HTML/JavaScript - no new learning curve
3. **Scalable**: Server handles state management and synchronization
4. **Portable**: Documents can run across different 3D engines and platforms

## Use Cases

- **Collaborative 3D Spaces**: Virtual offices, meeting rooms
- **Multi-player Games**: Shared game objects and interactions  
- **Educational Environments**: Interactive 3D lessons with multiple students
- **Virtual Showrooms**: Customers can explore products together
- **Social VR**: Shared experiences and activities

## Getting Started

1. Set up a Networked DOM server using the MML libraries
2. Create your MML document with interactive elements  
3. Deploy to a server that supports WebSocket connections
4. Share the URL with multiple users to test multi-user functionality`
}
