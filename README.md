
# [FixterGeek](https://www.fixter.camp) [Express](https://www.npmjs.com/package/express) application generator.

![Logo](https://avatars3.githubusercontent.com/u/21000119?s=200&v=4)

## Introduction

`fixter_generator` is FixterGeek's NPM package that allows students to quickly create express projects. The `fixter_generator` is strongly opinionated:

- Follows industry best practices
- Predefined directory structure:
    - `public`: Public Assets folder (css, js, images)
    - `models`: Mongoose Schemas and models
    - `routes`: Project routes
    - `views`: Project views and layouts
- **Views Template**: [Pug](https://pugjs.org)
- **CSS Engine**: [SCSS](http://sass-lang.com/) - [Node-sass-middleware]()
- **ODM**: Mongoose
- Comes prepopulated with popular, useful Express middlewares
  - **Logger**: morgan
  - **Favicon**: serve-favicon
  - **HTTP POST Params**: body-parser
  - **Cookies**: cookie-parser
- **Error handling**: 404 (Not found), 500 (Internal Server Error)
- Creates project `.gitignore` - *removes `node_modules`, etc*
- **Environment variables** loaded from `.env` configuration file
- **Server monitoring**: nodemon

## Installation

Install `fixter_generator` as a global NPM package, so you can run it from anywhere in your computer:

```sh
$ npm install -g fixter_generator
```

## Quick Start

The quickest way to get started with express is to utilize the executable `fixtergenerate(1)` to generate an application as shown below:

Create the app:

```bash
$ fixtergenerate awesome-project/
$ cd awesome-project/
```

This will generate the following directory structure:

```
awesome-project/
├── app.js
├── package.json
├── models
├── routes
│   └── index.js
├── views
│    ├── error.pug
│    ├── index.pug
│    └── layout.pug
├── public
│   ├── images
│   ├── javascripts
│   │   └── script.js
│   └── stylesheets
│       └── styles.sass
├── .env
├── .gitignoe
├── bin
    ├── www
```

Install all dependencies described in `package.json`:

```bash
$ npm install
```

Start your Express.js app at `http://localhost:3000/`:

```bash
$ npm start
```

## Command Line Options

This generator can also be further configured with the following command line flags.

    -h, --help           output usage information
        --version        output the version number
    -c, --css <engine>   add stylesheet <engine> support (plain|less|sass|scss) (defaults to scss)
    -f, --force          force on non-empty directory
        --git            initialise a Git project

## License

[MIT](LICENSE)
