/*!
  Spoke specification for snd_Xplore
*/
describe('Xplore - the wonder tool', function () {

  if (typeof snd_Xplore !== 'function') {
    fail('snd_Xplore was not found.');
  }

  describe('ObjectReporter', function () {
    beforeEach(function () {
      this.reporter = new snd_Xplore.ObjectReporter();
    });

    it('can return the report object', function () {
      expect(this.reporter.report).toBeDefined();
      expect(this.reporter.getReport()).toBe(this.reporter.report);
    });

    it('has a begin method for starting the reporter', function () {
      this.reporter.begin({
        type: 'begin#type',
        value: 'begin#value',
        string: 'begin#string'
      });
      var report = this.reporter.report;
      expect(report.status).toBe('started');
      expect(report.type).toBe('begin#type');
      expect(report.value).toBe('begin#value');
      expect(report.string).toBe('begin#string');
    });

    it('has a result method for capturing results', function () {
      var obj = {};
      this.reporter.result(obj);
      expect(this.reporter.report.results).toContain(obj);
    });

    it('has a complete method for finishing the reporter', function () {
      this.reporter.complete();
      expect(this.reporter.report.status).toBe('finished');
    });
  });

  describe('Xplore utilities and helpers', function () {
    describe('dotwalk', function () {
      it('can be used for navigating objects from paths, i.e. the Xplore breadcrumb', function () {
        var obj = {
          child: {
            text: 'foo'
          }
        };
        expect(typeof snd_Xplore.dotwalk).toBe('function');
        expect(snd_Xplore.dotwalk(obj, 'child.text')).toBe('foo');
      });
    });

    describe('getLogs', function () {
      gs.debug('__debug__', 'snd_Xplore_spec');
      gs.info('__info__', 'snd_Xplore_spec');
      gs.warn('__warn__', 'snd_Xplore_spec');
      gs.error('__error__', 'snd_Xplore_spec');
      gs.sleep(100); // allow the database write to work

      var logs = snd_Xplore.getLogs();

      it('can retrieve logs that occured in the current minute', function () {
        expect(logs.length).toBeGreaterThan(1);
      });

      describe('log properties', function () {
        it('each log has a created property', function () {
          expect(logs[0].created).toBeTruthy();
        });

        it('each log has a level property', function () {
          expect(logs[0].level).toBeTruthy();
        });

        it('each log has a message property', function () {
          expect(logs[0].message).toBeTruthy();
        });

        it('each log has a source property', function () {
          expect(logs[0].source).toBeTruthy();
        });
      });

      describe('logs retrieved', function () {
        var log_messages = [];
        for (var i = 0; i < logs.length; i++) {
          log_messages.push(logs[i].message);
        }

        it('does not get debug logs', function () {
          expect(log_messages).not.toContain('__debug__');
        });

        it('does not get info logs', function () {
          expect(log_messages).not.toContain('__info__');
        });

        it('does get warning logs', function () {
          expect(log_messages).toContain('__warn__');
        });

        it('does get error logs', function () {
          expect(log_messages).toContain('__error__');
        });
      });
    });

    describe('getOutputMessages', function () {
      it('can capture gs.addInfoMessage and gs.addErrorMessage', function () {
        gs.addInfoMessage('Testing Xplore');
        gs.addErrorMessage('Testing Xplore');

        var logs = snd_Xplore.getOutputMessages();
        var found = 0;
        for (var i = 0; i < logs.length; i++) {
          if ((logs[i].type == 'error' || logs[i].type == 'info') && logs[i].message == 'Testing Xplore') {
            found++;
          }
        }
        expect(found).toBe(2);
      });

      it('flushes the messages once they have been captured', function () {
        expect(snd_Xplore.getOutputMessages().length).toBe(0);
      });

      it('can capture log messages (when session debug is enabled)', function () {
        var transaction = GlideTransaction.get();
        GlideSessionDebug.enable(transaction);

        gs.debug('Testing Xplore');

        var messages = snd_Xplore.getOutputMessages();
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('log');
        expect(messages[0].message).toContain('Testing Xplore');

        GlideSessionDebug.disable(transaction);
      });

    });
  });

  describe('PrintReporter');

  describe('PrettyPrinter');

  describe('object exploration using snd_Xplore', function () {
    it('has a print reporter', function () {
      var transaction = GlideTransaction.get();
      GlideSessionDebug.enable(transaction);

      // this is where a spy would be useful
      var xplore = new snd_Xplore();
      xplore.xplore({foo: 'bar'});

      var messages = snd_Xplore.getOutputMessages();

      // begin, result, complete
      expect(messages.length).toBe(3);

      GlideSessionDebug.disable(transaction);
    });

    it('has an object reporter', function () {

      var xplore = new snd_Xplore();
      xplore.xplore({foo: 'bar'}, 'snd_Xplore.ObjectReporter');

      var result = xplore.reporter.getReport();
      expect(typeof result).toBe('object');
      expect(result.results.length).toBe(1);

    });
  });

});