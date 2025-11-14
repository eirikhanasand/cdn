# Uses latest node alpine image for apk package manager
FROM node:alpine

# Install dependencies
RUN apk add --no-cache varnish

# Sets the working directory
WORKDIR /usr/src/app

# Copies varnish
COPY ./entrypoint.sh /usr/src/app/entrypoint.sh

# Copies varnish
COPY ./default.vcl /etc/varnish/default.vcl

# Copies package.json and package-lock.json to the Docker environment
COPY package.json package-lock.json ./

# Installs required dependencies
RUN npm install

# Copies contents
COPY . .

# Expose API port
EXPOSE 8080

# Start the application
CMD  chmod +x /usr/src/app/entrypoint.sh; /usr/src/app/entrypoint.sh
