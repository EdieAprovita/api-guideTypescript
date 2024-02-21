#Use Node.js 18 as the base image

FROM node:18

#Set the working directory in the container to /src

WORKDIR /src

#Copy the package.json and package-lock.json files to the working directory

COPY package*.json ./

#Install the dependencies

RUN npm install

#Copy the rest of the application files to the working directory

COPY . .

#Build Typescript code 

RUN npm run build

#Expose the port defined in the .env file or default to 5000

ENV PORT=${PORT:-5000}

# Set the NODE_ENV environment variable to 'development' by default
ENV NODE_ENV=${NODE_ENV:-development}

# Expose the port on which the app will run
EXPOSE $PORT

# Command to start the application
CMD ["npm", "run", "start:prod"]