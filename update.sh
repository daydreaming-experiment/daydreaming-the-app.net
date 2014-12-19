#!/bin/bash
# Update the release on Tal's server

set -e

# Build
jekyll build

# Redo symbolic links
#ln -s ../../srv/releases build/releases
#ln -s ../../srv/presentations build/presentations

# Clean up
rm -f build/update.sh build/deploy.sh build/README.md
