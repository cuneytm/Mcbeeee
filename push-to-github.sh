#!/bin/bash

# MCBeeee - Git Push Script
# This script commits the DMG files and pushes to GitHub

echo "🐑 MCBeeee - Preparing to push to GitHub..."
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Not a git repository. Initializing..."
    git init
    git remote add origin https://github.com/cuneytm/Mcbeeee.git
fi

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Release v0.0.0 - MCBeeee Secure Agentic Gateway

- Beautiful macOS desktop app with amber theme
- Native notifications with approve/deny buttons
- Request approval system (toggleable)
- Network isolation controls
- Activity logging with clear history
- Easy configuration for Claude Desktop & VS Code
- Includes DMG installers for Intel and Apple Silicon"

# Push to main branch
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main --force

echo ""
echo "✅ Done! Your DMG files are now available at:"
echo "   https://github.com/cuneytm/Mcbeeee/raw/main/release/MCBeeee-0.0.0-arm64.dmg"
echo "   https://github.com/cuneytm/Mcbeeee/raw/main/release/MCBeeee-0.0.0.dmg"
echo ""
echo "🎉 README is ready with download links!"
