#!/bin/bash

set -e

echo "##"
echo "## Pushing to upstream"
echo "##"
echo

echo "##"
echo "## Ssh-ing to Tal's server to update"
echo "##"
echo

ssh daydreaming@74.207.250.156 'source /etc/bash_completion.d/virtualenvwrapper; workon jekyll; cd daydreaming/daydreaming-the-app.net; git pull; ./update.sh'

echo
echo "##"
echo "## All done!"
echo "##"
echo
