# node-starter-project

## Pre-requisites

- Requires node.js `v8.9.3` and npm `5.6.0`.
- Requires PostgreSQL (v9.4.x recommended).

## Instalation and development

### Database Initialization

Create the development database. You will only need to run these command once.

```
psql --username=postgres --command='CREATE DATABASE "node-starter-project";'
```

After cloning the project, ensuring you're running Node.js 8 and npm 5 and initializing the DB, you can run the following npm scripts:

### Install dependencies

```
npm install
```

### Run tests

```
npm run test
```

During development, you can also run the following script that skips linting and istanbul coverage reporting for fastest results:

```
npm run test:app
```

### Start the application

```
npm run start
```

You can also start it in live reload mode (ideal during development), running the following script:

```
npm run start:watch
```
