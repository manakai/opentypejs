CURL = curl

all: build

updatenightly:
	$(CURL) -sSLf https://raw.githubusercontent.com/wakaba/ciconfig/master/ciconfig | RUN_GIT=1 REMOVE_UNUSED=1 perl

build: dist/opentype.js

dist/opentype.js: src/*.js src/*/*.js
	docker run -i -v `pwd`:/app node sh -c 'cd /app && npm install && npm run build'

test: build test-main

gha-test: test-main

test-main: always
	docker run -i -v `pwd`:/app node sh -c 'cd /app && npm install && npm run test'

always:
