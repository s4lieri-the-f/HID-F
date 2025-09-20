#!/bin/bash
echo "🧪 Testing GitHub Pages build locally..."

export NODE_ENV=production

echo "Installing dependencies..."
npm ci

echo "Building for production..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "Build successful! Static files generated in 'build' directory"
    echo "Build contents:"
    ls -la build/
    
    echo ""
    echo "To test locally, you can serve the build directory:"
    echo "   npx serve build"
    echo "   or"
    echo "   python3 -m http.server 8000 --directory build"
else
    echo "Build failed! No 'build' directory found"
    exit 1
fi
