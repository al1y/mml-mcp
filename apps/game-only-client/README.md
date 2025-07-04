# Game Client React App

This is a React-based 3D web client for the MML (Metaverse Markup Language) game experience.

## Structure

The app has been converted to use React components for better modularity and extensibility:

### Main Components

- **App.tsx**: Main application component that orchestrates the game and UI components
- **GameClient.tsx**: Core game client that handles the 3D world, avatar networking, and MML document rendering
- **TextChatUI.tsx**: Text chat interface component
- **VoiceChatUI.tsx**: Voice chat interface component

### Core Classes (unchanged)

- **LocalAvatarClient.ts**: Handles individual avatar client instances
- **LocalAvatarServer.ts**: Local server for avatar networking

## Development

### Start Development Server
```bash
npm run iterate
```

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint-fix
```

## Adding New React Components

The app is now ready for adding new React components. You can:

1. Create new components in `src/components/`
2. Import and use them in `App.tsx` or other components
3. Use React hooks for state management
4. Add TypeScript interfaces for props

## Key Features

- **3D Avatar Networking**: Multi-user 3D environment with avatar synchronization
- **MML Document Support**: Renders Metaverse Markup Language documents
- **Text Chat**: Integrated text chat system
- **Voice Chat**: Voice communication support
- **Real-time Updates**: Live reloading during development

## Dependencies

The app uses these key dependencies:
- React 18 with TypeScript
- MML libraries for 3D web experiences
- Three.js for 3D graphics
- ESBuild for fast compilation 