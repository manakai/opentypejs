all: build

build:
	docker run -it -v `pwd`:/app node sh -c 'cd /app && npm run build'
