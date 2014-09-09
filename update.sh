#!/bin/bash
# Update the release on Tal's server

set -e

jekyll build
ln -s ../../srv/releases _site/releases
ln -s ../../srv/experiment-static _site/experiment-static
ln -s ../../srv/presentations _site/presentations
