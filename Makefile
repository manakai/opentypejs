CURL = curl

all: build

updatenightly:
	$(CURL) -sSLf https://raw.githubusercontent.com/wakaba/ciconfig/master/ciconfig | RUN_GIT=1 REMOVE_UNUSED=1 perl

build:
	docker run -it -v `pwd`:/app node sh -c 'cd /app && npm run build'

test: build always
	docker run -it -v `pwd`:/app node sh -c 'cd /app && npm run test'

always:
