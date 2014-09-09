#!/bin/bash

set -e

echo "##"
echo "## Ssh-ing to Tal's server to update"
echo "##"
echo

ssh daydreaming@74.207.250.156 "cd daydreaming/daydreaming-the-app.net; git pull; jekyll build; ln -s ../../srv/releases _site/releases; ln -s ../../srv/experiment-static _site/experiment-static; ln -s ../../srv/presentations _site/presentations"

echo "##"
echo "## All done!"
echo "##"
echo
