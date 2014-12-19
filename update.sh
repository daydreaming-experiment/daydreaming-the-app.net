#!/bin/bash
# Update the release on Tal's server

set -e

# Build
jekyll build

# Redo symbolic links
#ln -s ../../srv/releases _site/releases
#ln -s ../../srv/presentations _site/presentations

# Clean up
rm -f _site/update.sh _site/deploy.sh _site/README.md
