# Main App

This is a Next.js TypeScript application that contains a Game component which iframes the MML world constructed from environment variables, and includes a ChatGPT chat panel for AI assistance.

## Environment Variables

This app requires the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` - The project ID (part before the underscore)
- `NEXT_PUBLIC_WORLD_ID` - The world ID (part after the underscore)
- `OPENAI_API_KEY` - Your OpenAI API key for ChatGPT integration

The MML world URL is constructed as: `https://{PROJECT_ID}_{WORLD_ID}.mml.world/`

## Getting Started

First, create a `.env.local` file with your environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your project ID, world ID, and OpenAI API key:

```
NEXT_PUBLIC_PROJECT_ID=your-project-id
NEXT_PUBLIC_WORLD_ID=your-world-id
OPENAI_API_KEY=your-openai-api-key
```

To get an OpenAI API key:
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and paste it into your `.env.local` file

Then, install the dependencies:

```bash
npm install
```

Finally, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Game Integration**: Next.js 14 with TypeScript that iframes an MML world
- **ChatGPT Integration**: Floating chat panel with ChatGPT-3.5-turbo
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **Environment Configuration**: Easy configuration through environment variables
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Chat**: Send messages to ChatGPT and receive responses
- **Chat History**: Maintains conversation context within the session
- **Error Handling**: Proper error handling for API failures
- **Loading States**: Visual feedback during API calls

## ChatGPT Features

- **Floating Chat Button**: Access the chat panel from anywhere
- **Real-time Messaging**: Send and receive messages instantly
- **Conversation History**: Maintains context throughout the conversation
- **Responsive Design**: Works well on different screen sizes
- **Clear Chat**: Reset the conversation at any time
- **Error Handling**: Graceful error handling for API failures
- **Loading Indicators**: Visual feedback while waiting for responses

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint 