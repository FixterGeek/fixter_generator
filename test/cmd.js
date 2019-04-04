
var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var request = require('supertest');
var rimraf = require('rimraf');
var spawn = require('child_process').spawn;
var validateNpmName = require('validate-npm-package-name')

var binPath = path.resolve(__dirname, '../bin/fixtergenerate');
var TEMP_DIR = path.resolve(__dirname, '..', 'temp', String(process.pid + Math.random()))
var fileCount = 16
var titleRegex = /<title>Express.*<\/title>/

describe('fixtergenerate(1)', function () {
  before(function (done) {
    this.timeout(30000);
    cleanup(done);
  });

  after(function (done) {
    this.timeout(30000);
    cleanup(done);
  });

  describe('(no args)', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app', function (done) {
      runRaw(ctx.dir, [], function (err, code, stdout, stderr) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        ctx.stderr = stderr
        ctx.stdout = stdout
        assert.equal(ctx.files.length, fileCount)
        done();
      });
    });

    it('should print jade view warning', function () {
      assert.equal(ctx.stderr, "\n  warning: the default view engine will not be jade in future releases\n  warning: use `--view=jade' or `--help' for additional options\n\n")
    })

    it('should provide debug instructions', function () {
      assert.ok(/DEBUG=fixtergenerate\(1\)-\(no-args\):\* (?:\& )?npm start/.test(ctx.stdout))
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    });

    it('should have jade templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.jade'), -1)
    });

    it('should have a package.json file', function () {
      var file = path.resolve(ctx.dir, 'package.json');
      var contents = fs.readFileSync(file, 'utf8');
      assert.equal(contents, '{\n'
        + '  "name": "fixtergenerate(1)-(no-args)",\n'
        + '  "version": "0.0.0",\n'
        + '  "private": true,\n'
        + '  "scripts": {\n'
        + '    "start": "node ./bin/www"\n'
        + '  },\n'
        + '  "dependencies": {\n'
        + '    "body-parser": "~1.16.0",\n'
        + '    "cookie-parser": "~1.4.3",\n'
        + '    "debug": "~2.6.0",\n'
        + '    "express": "~4.14.1",\n'
        + '    "jade": "~1.11.0",\n'
        + '    "morgan": "~1.7.0",\n'
        + '    "serve-favicon": "~2.3.2"\n'
        + '  }\n'
        + '}\n');
    });

    it('should have installable dependencies', function (done) {
      this.timeout(30000);
      npmInstall(ctx.dir, done);
    });

    it('should export an express app from app.js', function () {
      var file = path.resolve(ctx.dir, 'app.js');
      var app = require(file);
      assert.equal(typeof app, 'function');
      assert.equal(typeof app.handle, 'function');
    });

    it('should respond to HTTP request', function (done) {
      var file = path.resolve(ctx.dir, 'app.js');
      var app = require(file);

      request(app)
        .get('/')
        .expect(200, titleRegex, done);
    });

    it('should generate a 404', function (done) {
      var file = path.resolve(ctx.dir, 'app.js');
      var app = require(file);

      request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done);
    });

    describe('when directory contains spaces', function () {
      var ctx = setupTestEnvironment('foo bar (BAZ!)')

      it('should create basic app', function (done) {
        run(ctx.dir, [], function (err, output) {
          if (err) return done(err)
          assert.equal(parseCreatedFiles(output, ctx.dir).length, fileCount)
          done()
        })
      })

      it('should have a valid npm package name', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.equal(name, 'foo-bar-(baz!)')
      })
    })

    describe('when directory is not a valid name', function () {
      var ctx = setupTestEnvironment('_')

      it('should create basic app', function (done) {
        run(ctx.dir, [], function (err, output) {
          if (err) return done(err)
          assert.equal(parseCreatedFiles(output, ctx.dir).length, fileCount)
          done()
        })
      })

      it('should default to name "hello-world"', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.equal(name, 'hello-world')
      })
    })
  });

  describe('(unknown args)', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should exit with code 1', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.strictEqual(code, 1);
        done();
      });
    });

    it('should print usage', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.ok(/Usage: fixtergenerate/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        assert.ok(/error: unknown option/.test(stderr));
        done();
      });
    });

    it('should print unknown option', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.ok(/error: unknown option/.test(stderr));
        done();
      });
    });
  });

  describe('--css <engine>', function () {
    describe('(no engine)', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should exit with code 1', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout, stderr) {
          if (err) return done(err);
          assert.strictEqual(code, 1);
          done();
        });
      });

      it('should print usage', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout) {
          if (err) return done(err);
          assert.ok(/Usage: fixtergenerate/.test(stdout));
          assert.ok(/--help/.test(stdout));
          assert.ok(/--version/.test(stdout));
          done();
        });
      });

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout, stderr) {
          if (err) return done(err);
          assert.ok(/error: option .* argument missing/.test(stderr));
          done();
        });
      });
    });

    describe('less', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with less files', function (done) {
        run(ctx.dir, ['--css', 'less'], function (err, stdout) {
          if (err) return done(err);
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount, 'should have ' + fileCount + ' files')
          done();
        });
      });

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      });

      it('should have less files', function () {
        assert.notEqual(ctx.files.indexOf('public/stylesheets/style.less'), -1, 'should have style.less file')
      });

      it('should have installable dependencies', function (done) {
        this.timeout(30000);
        npmInstall(ctx.dir, done);
      });

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);
        assert.equal(typeof app, 'function');
        assert.equal(typeof app.handle, 'function');
      });

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
          .get('/')
          .expect(200, titleRegex, done);
      });

      it('should respond with stylesheet', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
          .get('/stylesheets/style.css')
          .expect(200, /sans-serif/, done);
      });
    });

    describe('stylus', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with stylus files', function (done) {
        run(ctx.dir, ['--css', 'stylus'], function (err, stdout) {
          if (err) return done(err);
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount, 'should have ' + fileCount + ' files')
          done();
        });
      });

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      });

      it('should have stylus files', function () {
        assert.notEqual(ctx.files.indexOf('public/stylesheets/style.styl'), -1, 'should have style.styl file')
      });

      it('should have installable dependencies', function (done) {
        this.timeout(30000);
        npmInstall(ctx.dir, done);
      });

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);
        assert.equal(typeof app, 'function');
        assert.equal(typeof app.handle, 'function');
      });

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
          .get('/')
          .expect(200, titleRegex, done);
      });

      it('should respond with stylesheet', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
          .get('/stylesheets/style.css')
          .expect(200, /sans-serif/, done);
      });
    });
  });

  describe('--ejs', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with ejs templates', function (done) {
      run(ctx.dir, ['--ejs'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        // There's 1 less file with ejs because there's no layout file
        assert.equal(ctx.files.length, fileCount, 'should have ' + fileCount + ' files')
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
      assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
      assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
    });

    it('should have ejs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.ejs'), -1, 'should have views/error.ejs file')
      assert.notEqual(ctx.files.indexOf('views/index.ejs'), -1, 'should have views/index.ejs file')
      assert.notEqual(ctx.files.indexOf('views/layout.ejs'), -1, 'should have views/layout.ejs file')
    });
  });

  describe('--git', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with git files', function (done) {
      run(ctx.dir, ['--git'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        // 1 extra file - .gitignore
        assert.equal(ctx.files.length, fileCount + 1, 'should have ' + (fileCount + 1) + ' files')
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
      assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
      assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
    });

    it('should have .gitignore', function () {
      assert.notEqual(ctx.files.indexOf('.gitignore'), -1, 'should have .gitignore file')
    });

    it('should have jade templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.jade'), -1)
    });
  });

  describe('-h', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should print usage', function (done) {
      run(ctx.dir, ['-h'], function (err, stdout) {
        if (err) return done(err);
        var files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(files.length, 0);
        assert.ok(/Usage: fixtergenerate/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        done();
      });
    });
  });

  describe('--hbs', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hbs templates', function (done) {
      run(ctx.dir, ['--hbs'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(ctx.files.length, fileCount);
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    });

    it('should have hbs in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json');
      var contents = fs.readFileSync(file, 'utf8');
      var dependencies = JSON.parse(contents).dependencies;
      assert.ok(typeof dependencies.hbs === 'string');
    });

    it('should have hbs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.hbs'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.hbs'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.hbs'), -1)
    });
  });

  describe('--help', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should print usage', function (done) {
      run(ctx.dir, ['--help'], function (err, stdout) {
        if (err) return done(err);
        var files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(files.length, 0);
        assert.ok(/Usage: fixtergenerate/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        done();
      });
    });
  });

  describe('--hogan', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hogan templates', function (done) {
      run(ctx.dir, ['--hogan'], function (err, stdout) {
        if (err) return done(err)
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        // There's 1 less file with Hogan because there's no layout file
        assert.equal(ctx.files.length, fileCount - 1)
        done()
      })
    })

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    })

    it('should have hjs in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json')
      var contents = fs.readFileSync(file, 'utf8')
      var dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.hjs === 'string')
    })

    it('should have hjs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.hjs'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.hjs'), -1)
    })
  })

  describe('--pug', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with pug templates', function (done) {
      run(ctx.dir, ['--pug'], function (err, stdout) {
        if (err) return done(err)
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        assert.equal(ctx.files.length, fileCount)
        done()
      })
    })

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    })

    it('should have pug in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json')
      var contents = fs.readFileSync(file, 'utf8')
      var dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.pug === 'string')
    })

    it('should have pug templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.pug'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.pug'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.pug'), -1)
    })
  })

  describe('--view <engine>', function () {
    describe('(no engine)', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should exit with code 1', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.strictEqual(code, 1)
          done()
        })
      })

      it('should print usage', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout) {
          if (err) return done(err)
          assert.ok(/Usage: fixtergenerate/.test(stdout))
          assert.ok(/--help/.test(stdout))
          assert.ok(/--version/.test(stdout))
          done()
        })
      })

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.ok(/error: option .* argument missing/.test(stderr))
          done()
        })
      })
    })

    describe('ejs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with ejs templates', function (done) {
        run(ctx.dir, ['--view', 'ejs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          // There's 1 less file with ejs because there's no layout file
          assert.equal(ctx.files.length, fileCount, 'should have ' + fileCount + ' files')
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      })

      it('should have ejs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.ejs'), -1, 'should have views/error.ejs file')
        assert.notEqual(ctx.files.indexOf('views/index.ejs'), -1, 'should have views/index.ejs file')
        assert.notEqual(ctx.files.indexOf('views/layout.ejs'), -1, 'should have views/layout.ejs file')
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('hbs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hbs templates', function (done) {
        run(ctx.dir, ['--view', 'hbs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have hbs in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hbs === 'string')
      })

      it('should have hbs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.hbs'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.hbs'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.hbs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('hjs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hogan templates', function (done) {
        run(ctx.dir, ['--view', 'hjs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          // There's 1 less file with Hogan because there's no layout file
          assert.equal(ctx.files.length, fileCount - 1)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have hjs in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hjs === 'string')
      })

      it('should have hjs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.hjs'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.hjs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        // the "hjs" module has a global leak
        this.runnable().globals('renderPartials')

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('pug', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with pug templates', function (done) {
        run(ctx.dir, ['--view', 'pug'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have pug in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.pug === 'string')
      })

      it('should have pug templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.pug'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.pug'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.pug'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('twig', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with twig templates', function (done) {
        run(ctx.dir, ['--view', 'twig'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have twig in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.twig === 'string')
      })

      it('should have twig templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.twig'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.twig'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.twig'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('vash', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with vash templates', function (done) {
        run(ctx.dir, ['--view', 'vash'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, fileCount)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have vash in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.vash === 'string')
      })

      it('should have vash templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.vash'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.vash'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.vash'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/')
          .expect(200, titleRegex, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
          .get('/does_not_exist')
          .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })
  })

  describe('--database <engine>', function () {
    describe('(no engine)', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should exit with code 1', function (done) {
        runRaw(ctx.dir, ['--database'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.strictEqual(code, 1)
          done()
        })
      })

      it('should print usage', function (done) {
        runRaw(ctx.dir, ['--database'], function (err, code, stdout) {
          if (err) return done(err)
          assert.ok(/Usage: fixtergenerate/.test(stdout))
          assert.ok(/--help/.test(stdout))
          assert.ok(/--version/.test(stdout))
          done()
        })
      })

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--database'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.ok(/error: option .* argument missing/.test(stderr))
          done()
        })
      })
    })

    describe('mongoose', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with mongoose', function (done) {
        run(ctx.dir, ['--database', 'mongoose'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          // db projects have an extra models/ folder
          assert.equal(ctx.files.length, fileCount + 1, 'should have ' + (fileCount + 1) + ' files')
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      })

      it('should have mongoose in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.mongoose === 'string')
      })

      it('should have models/ folder', function () {
        assert.notEqual(ctx.files.indexOf('models'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should connect to database with mongoose from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        var mongoosePath = path.resolve(ctx.dir, 'node_modules/mongoose')
        var mongoose = require(mongoosePath)
        assert.notEqual(mongoose.connection.readyState, 0)
      })

      it('should export an express app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'function')
        assert.equal(typeof app.handle, 'function')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
          .get('/')
          .expect(200, titleRegex, done);
      });
    })
  })
});

function cleanup(dir, callback) {
  if (typeof dir === 'function') {
    callback = dir;
    dir = TEMP_DIR;
  }

  rimraf(dir, function (err) {
    callback(err);
  });
}

function npmInstall(dir, callback) {
  var env = Object.create(null)

  // copy the environment except for "undefined" strings
  for (var key in process.env) {
    if (process.env[key] !== 'undefined') {
      env[key] = process.env[key]
    }
  }

  exec('npm install', { cwd: dir, env: env }, function (err, stderr) {
    if (err) {
      err.message += stderr;
      callback(err);
      return;
    }

    callback();
  });
}

function parseCreatedFiles(output, dir) {
  var files = [];
  var lines = output.split(/[\r\n]+/);
  var match;

  for (var i = 0; i < lines.length; i++) {
    if ((match = /create.*?: (.*)$/.exec(lines[i]))) {
      var file = match[1];

      if (dir) {
        file = path.resolve(dir, file);
        file = path.relative(dir, file);
      }

      file = file.replace(/\\/g, '/');
      files.push(file);
    }
  }

  return files;
}

function run(dir, args, callback) {
  runRaw(dir, args, function (err, code, stdout, stderr) {
    if (err) {
      return callback(err);
    }

    process.stderr.write(stripWarnings(stderr))

    try {
      assert.equal(stripWarnings(stderr), '')
      assert.strictEqual(code, 0);
    } catch (e) {
      return callback(e);
    }

    callback(null, stripColors(stdout))
  });
}

function runRaw(dir, args, callback) {
  var argv = [binPath].concat(args);
  var exec = process.argv[0];
  var stderr = '';
  var stdout = '';

  var child = spawn(exec, argv, {
    cwd: dir
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function ondata(str) {
    stdout += str;
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function ondata(str) {
    stderr += str;
  });

  child.on('close', onclose);
  child.on('error', callback);

  function onclose(code) {
    callback(null, code, stdout, stderr);
  }
}

function setupTestEnvironment(name) {
  var ctx = {}

  before('create environment', function (done) {
    ctx.dir = path.join(TEMP_DIR, name.replace(/[<>]/g, ''))
    mkdirp(ctx.dir, done)
  })

  after('cleanup environment', function (done) {
    this.timeout(30000)
    cleanup(ctx.dir, done)
  })

  return ctx
}

function stripColors(str) {
  return str.replace(/\x1b\[(\d+)m/g, '_color_$1_')
}

function stripWarnings(str) {
  return str.replace(/\n(?:  warning: [^\n]+\n)+\n/g, '')
}