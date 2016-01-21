/**
  summary:
    A reporter to pass to snd_xplore for capturing results
**/
function snd_XploreReporter() {};

// #protected: a standard result object
snd_XploreReporter.prototype.response = {
  // The type of object that is being evaluated
  type: '',
  // the valueOf value of the object being evaluated
  value: '',
  // the list of property objects
  report: [],
  // the list of captured messages
  messages: [],
  // a list of logs that occured very recently
  logs: [],
  // the string value of the object being evaluated
  string: ''
};

/**
  summary:
    Get the response object.
**/
snd_XploreReporter.prototype.getResponse = function () {
  return this.response;
};

/**
  summary:
    Called when the main object is evaluated.
  obj: Object
    A result object provided by snd_xplore
**/
snd_XploreReporter.prototype.begin = function (obj) {
  this.response.type = obj.type;
  this.response.value = obj.value;
  this.response.string = obj.string;
};

/**
  summary:
    Called each time a property of the object is evaluated.
  obj: Object
    A result object provided by snd_xplore
**/
snd_XploreReporter.prototype.result = function (obj) {
  this.response.report.push(obj);
};

/**
  summary:
    Push messages onto the response message stack.
**/
snd_XploreReporter.prototype.addMessage = function (type, msg) {
  this.response.messages.push({
    t: type,
    v: msg
  });
};

snd_XploreReporter.prototype.addLog = function (logObj) {
  this.response.logs.push(logObj);
};

/**
  summary:
    Get all the output messages generated in this session, then flush them.
  description:
    Pushes an array of objects containing two properties describing the message
    into the response.messages array. Each object in the array looks like this:
      t: String
        The property type: log, info, error, access
      v: String
        The message.
**/
snd_XploreReporter.prototype.getOutputMessages = function () {
  var tmp, i;

  // access
  tmp = gs.getAccessMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    this.addMessage('access', tmp[i]);
  }

  // errors
  tmp = gs.getErrorMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    this.addMessage('error', tmp[i]);
  }

  // info
  tmp = gs.getInfoMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    this.addMessage('info', tmp[i]);
  }

  // gs.print
  tmp = GlideSessionDebug.getOutputMessages().toArray();
  for (i = 0; i < tmp.length; i++) {
    this.addMessage('log', tmp[i].line.replace(' : ', ' ')); // remove unnecessary colon
  }

  // remove all the messages we just retrieved
  GlideSessionDebug.clearOutputMessages();
  gs.flushAccessMessages();
  gs.flushMessages();
};


/**
  summary:
    Get any errors or warning that occured for the user in the last minute or so.
  returns: Array
    An array of objects containing the properties:
      created: Number
      level: String
      Message: String
      Source: String
**/
snd_XploreReporter.prototype.getLogs = function () {
  var levelMap = {
    '-1': 'Debug',
    '0': 'Info',
    '1': 'Warning',
    '2': 'Error'
  };
  var errors = [];
  var gr = new GlideRecord('syslog');
  gr.addQuery('sys_created_on', 'ON', 'Current minute@javascript:gs.minutesAgoStart(0)@javascript:gs.minutesAgoEnd(0)');
  gr.addQuery('sys_created_by', '=', gs.getUserName());
  gr.addQuery('level', 'IN', '1,2');
  gr.orderBy('sys_created_on');
  gr.query();
  while (gr.next()) {
    this.addLog({
      created: gr.sys_created_on.getDisplayValue(),
      level: levelMap[gr.getValue('level')],
      message: gr.getValue('message'),
      source: gr.getValue('source')
    });
  }
  return errors;
};
