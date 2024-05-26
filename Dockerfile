# Use the official Node.js 20 image as a parent image
FROM node:20.11.1

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package info
COPY package.json ./
COPY yarn.lock ./

# Install any dependencies
# RUN npm install --global yarn@latest
# Install app dependencies using Yarn
RUN yarn install --frozen-lockfile
RUN yarn add sharp --ignore-engines
# Bundle your app's source code inside the Docker image
COPY . .
# Build your application using Yarn
RUN yarn build

# Your app binds to port 3000, so use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 1337

# Run the app when the container launches
CMD yarn start
