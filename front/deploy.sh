#!/bin/sh

rsync -avz -e "ssh -i ~/.ssh/pakpak.pem" --progress ./dist/* -t ubuntu@ec2-35-165-24-103.us-west-2.compute.amazonaws.com:/var/www/webcraft/front/