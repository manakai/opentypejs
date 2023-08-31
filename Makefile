all: build

build:
	docker run -it -v `pwd`:/app node sh -c 'cd /app && npm run build'

test: always
	docker run -it -v `pwd`:/app node sh -c 'cd /app && npm run test'

always:
