#!/bin/sh

curl -v -H "Accept: application/json" -H "Content-type: application/json" -d '{"id":5,"jsonrpc":"2.0","method":"VideoLibrary.Scan"}' http://maggie:8080/jsonrpc
