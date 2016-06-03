// This file contains code for creating the approval forms

function createTestTriggerManually () {
  ScriptApp.newTrigger('onFormSubmitTrigger')
  .forForm(FormApp.openById('1PRaZe94HaFVszseps2kJzoEYC14_nQJDNFTVAm6Q1mQ'))
  .onFormSubmit()
  .create()
}

function configureFormItem (item, params) {
  if (params['title']) {
    item.setTitle(params['title'])
  }
  if (params['helpText']) {
    item.setHelpText(params['helpText'])
  }  
}


function createFormItem (form, params) {
  switch (params['type']) {
    case FormApp.ItemType.TEXT:
      item = form.addTextItem();
      break;
    case FormApp.ItemType.PARAGRAPH_TEXT:
      item = form.addParagraphTextItem();
      break;
    case FormApp.ItemType.SECTION_HEADER:
      item = form.addSectionHeaderItem();            
      break;
    default:
      item = form.addTextItem()
      break;
  }
  configureFormItem(item,params);
}

function listFormItemTitles (form) {
  var titles = []  
  form.getItems().forEach(function (item) {        
    var title = item.getTitle();
    if (title) {
      titles.push(item.getTitle())
    }
    else {
      Logger.log('ignoring '+JSON.stringify(item));
    }
  }) // end forEach item
  return titles
} // end listFormItemTitles
 

function testListFormItemTitles() {
  var form = FormApp.openById('1LRophsb8hTo1GNv8qpGp8G-dCpdLIFBboO5rx5pIfII')
  Logger.log('listFormItemTitles=>'+listFormItemTitles(form));
}


function createEmailTableTemplateForForm (form) {
  htmlOut = '<table>'
  form.getItems().forEach( function (item) {
    var item = item.getTitle();
    htmlOut += '<tr><th>'+item+'</th><td><<'+item+'>></td></tr>';
  }) // end forEach item
  htmlOut += '</table>';
  return htmlOut;
}

/* newTextItems=['Approval'], convertFields={'Requester':'Username', 'Request Timestamp':'Timestamp'}, ) */
function createApprovalForm (firstForm, params) {
  var formAsFile = DriveApp.getFileById(firstForm.getId())
  var origTitle = firstForm.getTitle()
  var origName = formAsFile.getName()
  var titleSuffix = params['titleSuffix'] ? params['titleSuffix'] : ' Approval'  
  var controlSS = params['SpreadsheetApp'] ? params['SpreadsheetApp'] : SpreadsheetApp.getActiveSpreadsheet();
  var masterConfig = getMasterConfig(controlSS);
  var approvalFormAsFile = formAsFile.makeCopy(origName+' '+titleSuffix, params['destinationFolder'] ? params['destinationFolder'] : undefined)
  var approvalForm = FormApp.openById(approvalFormAsFile.getId());   
  approvalForm.setTitle(origTitle+' '+titleSuffix)  
  var convertFields = params['convertFields'] ? params['convertFields'] : [{'from':'Username','to':'Requester','type':FormApp.ItemType.TEXT},
                                                                           {'from':'Timestamp','to':'Request Timestamp','type':FormApp.ItemType.TEXT}
                                                                           ]
  var newSectionHeader = params['approvalHeader'] ? params['approvalHeader'] : {'title':'Approval', 'helpText':'The above information was filled out by the requester. Use the section below to indicate your approval.'}
  var newFields = params['newFields'] ? params['newFields'] : [{'type':'textField','title':'Signature','helpText':'Write initials and date here to approve.'}]  
  newSectionHeader['type']=FormApp.ItemType.SECTION_HEADER
  Logger.log('create header');
  createFormItem(approvalForm,newSectionHeader);  
  for (var fi in convertFields) {
    var fieldParams = convertFields[fi]
    var existingItems = approvalForm.getItems(fieldParams['type'])
    for (var ii in existingItems) {
      itm = existingItems[ii]
      if (itm.getTitle()==fieldParams['from']) {
        Logger.log('Delete existing '+fieldParams['from'])
        approvalForm.deleteItem(itm)
      }
    }
    fieldParams['title']=fieldParams['to']
    fieldParams['helpText'] = 'Do not modify this field.';
    Logger.log('Create from: '+fieldParams);
    createFormItem(approvalForm,fieldParams)    
  }
  for (var i in newFields) {
    var fieldParams = newFields[i]
    Logger.log('Create from: '+fieldParams);
    createFormItem(approvalForm,fieldParams)    
  }
  
  var fromFields = []; toFields = []; helpText = []; fieldTypes = [];
  function addField (f) {
    fromFields.push(f.from ? f.from : '')
    toFields.push(f.to ? f.to : f.title ? f.title : '')
    helpText.push(f.helpText ? f.helpText : '')
    fieldTypes.push(f.type ? f.type : '')
   }
  newFields.forEach(addField);  convertFields.forEach(addField);  
  
  // Create config sheets...
  var configSheets = []
  //
  
  configSheets.push(createConfigurationSheet(controlSS, firstForm.getTitle()+' Approval Form',                                        
                           {
                           'Approval Form ID':approvalForm.getId(),
                    'Approval Form Edit URL':approvalForm.getEditUrl(),
   //}
  //                 ))
  //
  //configSheets.push(createConfigurationSheet(controlSS, firstForm.getTitle()+' Fields',
  //                                           {                                        
      'fromFields':fromFields,
        'toFields':toFields,
          'fieldTypes':fieldTypes,
                                             'helpText':helpText,
                      }
                          ));
  configSheets.push(createConfigurationSheet(
    controlSS,
    firstForm.getTitle()+' Email Template',
    {'Subject':firstForm.getTitle()+' Approval needed',
     'Body':'We have received your form and need your approval. <a href="<<link>>">Click here</a> to approve.\n' + createEmailTableTemplateForForm(firstForm)                
                    }    
    ))
  configSheets.push(createConfigurationSheet(
    controlSS,
    firstForm.getTitle()+' Email Settings',
    {
    'Lookup Field':'',
    'Value 1':'foo@bar.com',
    'Value 2':'boo@foo.com',
    'Default':'asdf@asdf.org',    
    'Possible Fields':listFormItemTitles(FormApp.openById(formAsFile.getId())),
    }
    ));                                                                
  // write Configuration Data...
  Logger.log('masterConfig.pushConfig'+JSON.stringify([firstForm,'Approval',configSheets]));
  masterConfig.pushConfig(
    firstForm,
    'Approval',
    configSheets
    )
  emailConfigSheets = []
  emailConfigSheets.push(createConfigurationSheet(
    controlSS,
    approvalForm.getTitle()+' Email Template',
    {'Subject': firstForm.getTitle()+' Response',
                         'Body':'Your request has been responded to.\n\n'+createEmailTableTemplateForForm(approvalForm)
     }
     ));
  emailConfigSheets.push(createConfigurationSheet(
    controlSS,
    approvalForm.getTitle()+' Email Settings',
    {
    'Lookup Field':'',
    'Value 1':'foo@bar.com',
    'Value 2':'boo@foo.com',
    'Default':'asdf@asdf.org',    
    'Possible Fields':listFormItemTitles(approvalForm),
    }
    ));         
  // Now write second config file...
  masterConfig.pushConfig(
    approvalForm,
    'Email',
    emailConfigSheets);
  // Now set up triggers so that the master form 
  // triggers the approval form...  
  // if we don't have one already...
  createFormTrigger(firstForm);
  createFormTrigger(approvalForm);
  

 return approvalForm
}

function createFormTrigger (form) {
  var alreadyHaveTrigger =  false
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getTriggerSourceId()==form.getId()) {
      if (t.getEventType()==ScriptApp.EventType.ON_FORM_SUBMIT) {
        Logger.log('trigger already installed -- no need for another');
        alreadyHaveTrigger = true
      }
    }
  }) // end forEach trigger
  if (! alreadyHaveTrigger) {
    ScriptApp.newTrigger('onFormSubmitTrigger')
    .forForm(form)
    .onFormSubmit()
    .create();   
  }
}

function testCreateApprovalForm () {   
  //var origForm = FormApp.openById('1LRophsb8hTo1GNv8qpGp8G-dCpdLIFBboO5rx5pIfII')
  var origForm = FormApp.openById('1ntFrLMtb3ER8c8eCV-8nEooDnII_FF6HCLRQMntTCt4')
  var origFolder = DriveApp.getFolderById('0B6UL9LRgyOtHTkJ6U1F1dVVlWkE');  
  var ssApp = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
  var approvalForm = createApprovalForm(origForm, {'destinationFolder':origFolder,
                                                   'SpreadsheetApp':ssApp,})
  
  Logger.log('ID: '+approvalForm.getId())
  Logger.log('Pub URL: '+approvalForm.getPublishedUrl())
  Logger.log('Edit URL: '+approvalForm.getEditUrl())
} // end testCreateApprovalForm

function clearAll () {
  var ssApp = SpreadsheetApp.openById('1qp-rODE2LYzOARFBFnV0ysRvv9RkHj_r0iQKUvj89p0');
  ssApp.getSheets().forEach(function (s) {
    if (s.getSheetId()!=0) { ssApp.deleteSheet(s) }
  });
}
