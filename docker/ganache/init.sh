#!/bin/sh

cd `dirname $0`
if [ -e data/* ]; then
  rm -rf data/*
fi