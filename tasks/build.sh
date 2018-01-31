#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Print shell input lines as they are read
set -v

# Clean dist and package folder
rm -rf dist
rm -rf artifact

mkdir dist
mkdir artifact

# Get package name and version
PACKAGE_NAME=`node -e "console.log(require('./package.json').name);"`
PACKAGE_VERSION=`node -e "console.log(require('./package.json').version);"`

# Copy assets
cp -R assets package.json dist/

# Git revision
git-rev dist/VERSION

if [ "$NODE_ENV" = "development" ]; then
  # Create symlink to node_modules
  ln -s ../node_modules dist/node_modules
else
  # Removing devDependencies
  npm prune --production
  # Install production dependencies
  npm install --production --prefix dist
fi

# Copy sources & config to dist folder
cp -R src dist/
cp -R config dist/
cp ${PACKAGE_NAME}.js dist/

if [ "$NODE_ENV" != "development" ]; then
  # Create TAR
  tar -czf artifact/${PACKAGE_NAME}-${PACKAGE_VERSION}.tar.gz -C dist .
fi
