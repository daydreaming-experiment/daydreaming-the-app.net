#!/bin/bash

set -e

echo "##"
echo "## Ssh-ing to Tal's server to update"
echo "##"
echo

ssh daydreaming@74.207.250.156 "cd daydreaming/daydreaming-the-app.net; git pull; workon jekyll; ./update.sh"

echo "##"
echo "## All done!"
echo "##"
echo
