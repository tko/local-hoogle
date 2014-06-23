#!/bin/sh -e
exec hoogle server --port=9000 --dynamic --local --resources=res --template=template.html
