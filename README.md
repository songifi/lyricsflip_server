
# LyricFlip Backend

LyricFlip is an interactive on-chain card game where players test their music knowledge by guessing song titles or artists from partial lyrics. Featuring categories by genre and decade, players can wager tokens and compete for bragging rights. Powered by Starknet, LyricFlip blends entertainment, blockchain, and nostalgia in a fun, rewarding way!

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB
- **Blockchain**: Starknet (Cairo)
- **Authentication**: JWT
- **Real-time Communication**: WebSockets

## Prerequisites

- Node.js (v18+)
- MongoDB (v6+)
- Starknet development environment for local testing

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/lyricflip-backend.git

# Navigate to the project directory
cd lyricflip-backend

# Install dependencies
npm install
```





### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api/docs
```

## Development Workflow

This project follows a GitHub-issue based workflow. Check the issues page for current tasks and their status.

### Contributing

1. Find an open issue
2. Create a feature branch based on the issue number: `feature/issue-123`
3. Implement the feature or fix
4. Create a pull request

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

The application can be deployed using various methods:

```bash
# Build the application
npm run build

# Start the production server
npm run start:prod
```

## License

[MIT License](LICENSE)

