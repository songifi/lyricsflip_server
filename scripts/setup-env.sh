#!/bin/bash

# Exit on error
set -e

echo "Environment Setup for LyricsFlip Backend"

# Prompt user for environment type
echo "Select the environment you :"
echo "1) Development"
echo "2) Testing"
echo "3) Production"

read -p "Enter the number (1-3): " env_choice

# Determine environment based on user input
case $env_choice in
    1)
        ENV="development"
        ;;
    2)
        ENV="test"
        ;;
    3)
        ENV="production"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and select a valid option."
        exit 1
        ;;
esac

echo "📜 You selected: $ENV environment"

# Set the .env file name
ENV_FILE=".env.$ENV"

# Check if the file already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️ $ENV_FILE already exists. Do you want to overwrite it? (y/n)"
    read -p "> " overwrite_choice
    if [ "$overwrite_choice" != "y" ]; then
        echo "✅ Keeping existing $ENV_FILE"
    else
        rm "$ENV_FILE"
    fi
fi

# Prompt user for environment variables
echo "Environment variables configuration."
read -p "Enter PORT (default: 3000): " PORT
PORT=${PORT:-3000}

read -p "Enter DATABASE_URL (default: mongodb://localhost:27017/lyricsflip-$ENV): " DATABASE_URL
DATABASE_URL=${DATABASE_URL:-"mongodb://localhost:27017/lyricsflip-$ENV"}

# Write to .env file
echo "NODE_ENV=$ENV" > "$ENV_FILE"
echo "PORT=$PORT" >> "$ENV_FILE"
echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"

echo "✅ Environment file ($ENV_FILE) created successfully!"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed."
fi

# Start the application
echo "🚀 Starting application in $ENV mode..."
if [ "$ENV" = "production" ]; then
    npm run start:prod
elif [ "$ENV" = "test" ]; then
    npm run test
else
    npm run start:dev
fi
