A suite of tools for every ServiceNow developer.
Originally created by James Neale <james@sndeveloper.com>

## Xplore Install notes:
- Some records have been removed with the updates. ServiceNow can
  misleadingly claim that there is a preview error because of a newer
  version already existing, when in fact there is no current record
  (new or old) installed. Please just ignore these. You can easily
  see with the comparison tool that the instruction is to DELETE and
  the current comparison version is identical.

## Xplore Change Log

## Version 3.3 (G3.0.1)
- Feature: Add User Data pane for working with large text strings e.g. XML
- Feature: Improve table hierarchy search with expression support, label support
  and a search button (just hit <ENTER> instead of waiting).
- Feature: Made the info page permanent, merged with side bar info, added new content.
- Feature: Added a settings side bar menu for supporting new show\_props and show\_strings
  options.
- Change: Log frame tab click reload now only occurs on double click.
- Fix: Fixed tab overlay issue when showing the side bar on smaller screens
  which caused the tabs to stack.
- Fix: Made the glasses injection script more robust.
- Removed: Original informational side bar.


## Version 3.2 (G1.0.2)
- Fix: Mac Ctrl + Enter keyboard command

## Version 3.1 (G1.0.1)
- Feature: Editor gets immediate focus on load.
- Feature: Use Ctrl + Enter to run.
- Feature: Improved string value display.
- Feature: UI Script to inject the Xplore glasses icon.
- Fix (Geneva): CodeMirror not displaying correctly in Geneva.
- Fix (Geneva): Scope selector not working correctly.
- Fix: Give editor focus when clicking demo link.
- Workaround (Geneva): Don't run valueOf on objects - restricted in Geneva.
- Improved welcome content.


## Version 3.0 (F7.3.3)

- Feature: Support for running scripts in application scopes.
- Feature: Support for tabs.
- Feature: Dynamic regular expression tester (tab).
- Feature: Dynamic table hierarchy viewer (tab).
- Feature: System log viewer (tab).
- Fix: better script running capability with enhanced error catching.
- Fix: UI improvements across the board.
- Feature: Welcome page with built in explainers and some script demos.
- Feature: Script editor toggle for full screen output mode.
- Fix (Geneva): Deactivated Fuji application module and replaced with Geneva
  friendly version (standard URL). Fuji users still have the choice and can
  just reactivate the old version if required.


## Version 2.1

- Fix: Script runner improvements
- Feature: Addition of application module
- Fix: JSON issues for versions before Fuji patch 7

## Version 2.0

- Feature: Convert to global application


## Version 1.1

- Script runner
- Help panel
- Output explorer