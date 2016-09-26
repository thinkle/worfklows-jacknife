/* 
DESIGN NOTES

The basic idea here is that we create a master configuration sheet that handles a number of kinds of actions. These
actions can be strung together into a workflow. The spreadsheet manages everything and can be edited directly as needed. 

The sidebar can be used to create the configuration sheets as needed and associate them with forms.

All of the configuration data for the program lives in that spreadsheet.


The master spreadsheet contains:

Form - Action - Config Sheets


Here are the possible actions and configurations:

ACTIONS


Approval - this sets up an approval form workflow. You start with a form and then you create a near duplicate where someone else "approves" the form. When the first form is completed, it triggers an approval email going to the second email.
- This will create tabs based on the name of the initial form
- NAME Form Approval Form -> this will have the new forms edit URL and it also has a list of fields that get changed between one form and another (as opposed to fields that get copied directly)
- NAME Form Email Template -> this will create the approval email subject line and body.
- NAME Form Email Settings -> this lets us look up an email address based on a field in the initial form.


Email by Field - this is a simple trigger to generate an email based on form results when a form is submitted.
- NAME Form Email Settings -> This lets you look up an email address based on a field in the initial form
- NAME Form Email Template -> This lets you create the email subject line and body

Create Account - this allows you to use a form to trigger account creation.
- ACCOUNT settings

Calendar Sharing - this allows you to use a form to trigger the addition of the user to calendars

Group Sharing - this allows you to use a form to trigger the addition of the user to groups



*/