#!/bin/bash

set -e

echo "##"
echo "## Pulling and pushing to upstream"
echo "##"
echo

git pull origin master
git push origin master

echo
echo "##"
echo "## Ssh-ing to Eauchat.org to update"
echo "##"
echo

ssh daydreaming@eauchat.org 'ssh ubuntu@natterjack-prod-daydreaming "cd daydreaming-the-app.net; git pull; ./update.sh"'

echo
echo "##"
echo "## All done!"
echo "##"
