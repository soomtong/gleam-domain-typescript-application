#!/bin/bash

set -e

echo "🚀 Starting setup for Gleam Domain Typescript Application..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v gleam &> /dev/null; then
    echo "❌ Gleam is not installed. Please install it from https://gleam.run/"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it from https://bun.sh/"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Build Gleam domain layer
echo "🔨 Building Gleam domain layer..."
cd core
gleam build
echo "✅ Gleam build completed"
echo ""

# Install TypeScript dependencies
echo "📦 Installing TypeScript dependencies..."
cd ../main
bun install
echo "✅ Dependencies installed"
echo ""

# Run database migration
echo "🗄️  Running database migration..."
bun run db:migrate
echo "✅ Database migration completed"
echo ""

echo "🎉 Setup completed successfully!"
echo ""
echo "To start the development server, run:"
echo "  cd main && bun dev"
echo ""
echo "Server will be available at http://localhost:3000"
