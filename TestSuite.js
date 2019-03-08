
/** @function resubmitForm
* @param formId {string} id of form
* @param i {number} index of response to resubmit
* @desc
* Generates a fake event and runs onFormSubmitTrigger
* as if response i had been submitted from formid.
**/
function resubmitForm (formId,i) {
    Logger.log('Resubmit form: %s',formId);
    var form = FormApp.openById(formId);
    var firstResp = form.getResponses()[i];
    fakeEvent = {
	source : form,
	response : firstResp
    }
    onFormSubmitTrigger(fakeEvent)
}

/** @function getOldResponse
* @param formId {string} id of form
* @param i {number} index of response to resubmit
* @returns response object.
**/
function getOldResponse (formId, i) {
  var form = FormApp.openById(formId);
  var firstResp = form.getResponses()[i];
  return firstResp
}


function getProp () {
    Logger.log(PropertiesService.getUserProperties().getProperty('scratchSS'));//,'1MVfqdE8Y5R_3Ua2fm3L6FHahv4yM8dc6u-pYzTn2nOg'));
}


function addDefaultParams (params) {
    var defaults = {
	configSS : '1SvKY-4FxRsuJLywL4k4uRxj4MxIV7bPR8lG32jWRtuk',
	fileForm : '1iXj_oTMfPhjBeYDYbkQptf-MafpFdKp-Ml3eY9hwvaY',
	masterSS : '1lldMEo4F5K_T8Zb2kURh2CZfgL4-K1yesILGrnmDT5Q',
	getScratchForm : function () {
	    var fid = PropertiesService.getUserProperties().getProperty('scratchForm');
	    if (!fid) {
		var f = FormApp.create('Scratch Form for Testing');
		PropertiesService.getUserProperties().setProperty('scratchForm',f.getId())
		return f
	    }
	    else {
		var f = FormApp.openById(fid);
		return f;
	    }
	},
	getScratchSS : function () {
	    var ssid = PropertiesService.getUserProperties().getProperty('scratchSS');
	    if (!ssid) {
          var ss = SpreadsheetApp.create('Scratch Spreadsheet for Testing');
          PropertiesService.getUserProperties().setProperty('scratchSS',ss.getId())
          return ss
	    }
	    else{
		var ss = SpreadsheetApp.openById(ssid);
		ss.getActiveSheet().clear();
		return ss;
	    }
	},
    }
    for (var key in defaults) {
      if (!params[key]) {
        params[key]=defaults[key]
      }
    }
}

/** @function setupTests
* @desc
* setup tests for the first time. Creates a global array tests that will hold our tests.
* Singleton pattern.
**/
function setupTests () {
  try {
    setup;
  }
  catch (err) {
      //Logger.log('Do setup!');
      /** global **/
      tests = [] // global
    setup = true; // global
  }
}

/** @class Test
* @desc
* @param {object} params
* @param {object} params.params - Parameters passed to figure. We provide bunch of standard defaults
* for convenience: 
* <pre>{configSS, fileForm, masterSS, getScratchForm, getScratchSS}</pre>
* @param {function} params.setup - function to run before running test (gets passed params.params)
* @param {function} params.test - function to run test (this function gets passed params.params)
* @param {function} params.cleanup - function to run after test (gets passed params.params)
*
* @desc
* Create a test object.
* Note: Our house style constructor does not require the *new* keyword.
*
* <pre>
* {
*     params : params that are passed to setup/cleanup/test
*     setup : setup function to run before running test
*     metadata : information about test
*     test : test function to run to DO test. Returns result or throws error.
*     cleanup : function to run after test has succeeded or failed.
* }
* </pre>
* @returns {object}
* <pre>
* {
*    metadata : metadata,
*    test : test,
*    result : result of test
*    success : true or false   
* }
* </pre>
* @desc
* <pre>
* In practice, we use a Test this like this:
* Test({
*    test: function (params) {some function we want to test},
*    params : {some:params,we:want,to:hand,to:our,fun:ction},
*    metadata:{name:'Name of test'},
* });
* 
* You can create tests anywhere in your code and then use runTestSuite
* to run all of them at once.
*
* Each function gets handed params, so if your test needs a value
* created by your setup function, setup can just modify the object
* it is handed. Similary, your test can store values needed by
* cleanup in the same params object -- the same object is handed
* from setup to test to cleanup.
* </pre>    
**/
function Test (o) { // test, params, metadata) {
  setupTests();
  //Logger.log('Registering test: %s',o);
  //Logger.log('We have %s tests so far',tests.length);
  
  if (!o.params) {o.params = {}}
    addDefaultParams(o.params);
    t = {
	run : function () {
	    if (o.setup) {o.params.setupResult = o.setup(o.params)}
	    try {
		var result = o.test(o.params);
		var success = true;
	    }
	    catch (err) {
		var result = err;
		var success = false;
	    }
	    if (o.cleanup) {o.cleanup(o.params,result,success)}
	    return {
		metadata:o.metadata,
		test:o.test,
		result:result,
		success:success
	    }
	},
	solo : function () {
	    if (o.setup) {o.setup(o.params)}
	    r = o.test(o.params);
	    if (o.cleanup) {o.cleanup(o.params)}
	    Logger.log('Got result: %s',r);
	},
	metadata : o.metadata,
	params : o.params,
    }
    tests.push(t)
    return t;
}

Test({
  test:function (a) {Logger.log('This one works every time: %s',a.a);},
  params:{a:'test param'},
    metadata:{name:'Successful test test',extra:'Arbitrary metadata allowed',file:'TestSuite.js'}
});
Test({
  test:function (a) {Logger.log('This one fails every time: %s',a.a);a=duck;},
  params:{a:'test param'},
    metadata:{name:'Failing test test intentionally',file:'TestSuite.js'}
});

/** @function runTestSuite
* @desc Run all tests defined in our library
**/
function runTestSuite () {
    var results = []
    console.log('TestSuite: Running Test Suite');
    console.log('Running %s tests',tests.length);
    var i = 1;
    tests.forEach(function (test) {
        console.log('Running test %s of %s: %s',i,tests.length,test.metadata.name);
        i+=1;
	results.push(test.run())
    })
    console.log('TestSuite RESULTS...');
    successful = 0;
    results.forEach(function (r) {
      if (r.success) {
          console.log('TestSuite SUCCESS: ',r.metadata.name,'Success',r)
          Logger.log('SUCCESS: %s, result: %s',r.metadata.name,r.result)
          successful += 1;
      }
      else {
          console.error('TestSuite FAILURE: ',r.metadata.name,r.metadata.file||'',r)
          Logger.log('FAILURE: %s',r)
      }
    });
    console.log('TestSuite finished: %s of %s tests succeeded; %s failures',
                successful, tests.length, tests.length - successful
               );
}
