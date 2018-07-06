# UBC Course Finder

Full-stack web application capable of running queries over cached UBC room and course data using a self-built query language.

## Dev environment configuration

1. Ensure you have Node LTS  (8.9.X) and NPM.

2. Ensure you have [Yarn](https://yarnpkg.com/en/docs/install).

## Project commands

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete the *node_modules* directory.

1. `yarn install` to download the packages specified in *package.json* to the *node_modules* directory.

1. `yarn build` to compile.

1. `yarn test` to run the test suite.

## Running and testing from an IDE

WebStorm should be automatically configured the first time you open the project. For other IDEs and editors, you'll want to set up test and debug tasks and specify that the schema of all files in `test/queries` should follow `test/query.schema.json`.
