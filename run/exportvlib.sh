#!/bin/sh

curl -v -H "Accept: application/json" -H "Content-type: application/json" -d '{"id":1,"jsonrpc":"2.0","method":"VideoLibrary.Export", "params": { "options": { "path" : "/media/4g/media" } } }' http://maggie:8080/jsonrpc

