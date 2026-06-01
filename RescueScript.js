/**
 * One-off recovery for form responses missed while the Rhino runtime was down.
 *
 * Run rescuePreviewMissingResponses() first, then rescueFirstMissingResponse().
 * After verifying entry 4167, run rescueMissingResponses().
 */

var RESCUE_FORM_ID = '1v0pD0xw_cB8X_sJh1n3q7GK9IJYnCbMayUhp462FTNA';
var RESCUE_FIRST_ENTRY = 4167;
var RESCUE_LAST_ENTRY = 4180;
var RESCUE_PROPERTY_PREFIX = 'rescue-attempted:';

function rescueRequireConfirmation_(actual, expected) {
    if (actual !== expected) {
        throw new Error('Confirmation required. Pass exactly: ' + expected);
    }
}

function rescueGetResponse_(entryNumber) {
    var form = FormApp.openById(RESCUE_FORM_ID);
    var responses = form.getResponses();
    var response = responses[entryNumber - 1];
    if (!response) {
        throw new Error(
            'Could not find entry ' + entryNumber +
            '. Form currently has ' + responses.length + ' responses.'
        );
    }
    return {form: form, response: response};
}

function rescuePropertyKey_(response) {
    return RESCUE_PROPERTY_PREFIX + RESCUE_FORM_ID + ':' + response.getId();
}

function rescueResponse_(entryNumber) {
    var rescue = rescueGetResponse_(entryNumber);
    var props = PropertiesService.getScriptProperties();
    var propertyKey = rescuePropertyKey_(rescue.response);

    if (props.getProperty(propertyKey)) {
        console.log('Skipping entry %s: this rescue script already attempted it.', entryNumber);
        return;
    }

    console.log(
        'Replaying entry %s: response %s submitted %s',
        entryNumber,
        rescue.response.getId(),
        rescue.response.getTimestamp()
    );
    onFormSubmitTrigger({source: rescue.form, response: rescue.response});
    props.setProperty(propertyKey, new Date().toISOString());
}

function rescuePreviewMissingResponses() {
    for (var entryNumber = RESCUE_FIRST_ENTRY; entryNumber <= RESCUE_LAST_ENTRY; entryNumber++) {
        var rescue = rescueGetResponse_(entryNumber);
        console.log(
            'Entry %s: response %s submitted %s',
            entryNumber,
            rescue.response.getId(),
            rescue.response.getTimestamp()
        );
    }
}

function rescueFirstMissingResponse() {
    rescueRequireConfirmation_(
        arguments[0],
        'REPLAY ENTRY ' + RESCUE_FIRST_ENTRY
    );
    rescueResponse_(RESCUE_FIRST_ENTRY);
}

function rescueOneResponse(entryNumber, confirmation) {
    rescueRequireConfirmation_(confirmation, 'REPLAY ENTRY ' + entryNumber);
    rescueResponse_(entryNumber);
}

function rescueClearAttempt(entryNumber) {
    var rescue = rescueGetResponse_(entryNumber);
    PropertiesService.getScriptProperties().deleteProperty(rescuePropertyKey_(rescue.response));
    console.log('Cleared rescue attempt marker for entry %s.', entryNumber);
}

function rescueMissingResponses() {
    rescueRequireConfirmation_(
        arguments[0],
        'REPLAY ENTRIES ' + RESCUE_FIRST_ENTRY + '-' + RESCUE_LAST_ENTRY
    );
    for (var entryNumber = RESCUE_FIRST_ENTRY; entryNumber <= RESCUE_LAST_ENTRY; entryNumber++) {
        rescueResponse_(entryNumber);
    }
}
