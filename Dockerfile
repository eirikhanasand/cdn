# Uses latest node alpine image for apk package manager
FROM node:alpine

# Install dependencies
RUN apk add --no-cache varnish

# Sets the working directory
WORKDIR /usr/src/app

# Copies contents
COPY . .
COPY ./entrypoint.sh /usr/src/app/entrypoint.sh
COPY ./default.vcl /etc/varnish/default.vcl
COPY package.json package-lock.json ./

# Adds execute permissions to entrypoint script
RUN chmod +x /usr/src/app/entrypoint.sh

# Installs required dependencies
RUN npm install

# Expose API port
EXPOSE 8080

# Start the application
CMD /usr/src/app/entrypoint.sh
