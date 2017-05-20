# Xplore: Developer Toolkit
A toolkit for every ServiceNow developer. Find more at https://thewhitespace.io.

### Version 4.3
* Tested in Jakarta early-access.
* Fix issue using GlideScopedEvaluator in Helsinki patch 9a and Istanbul patch 4.
* Fix impersonation issue in Istanbul.
* Fix table search by label.
* Improve table search functionality and display.
* Dirty form alert! Reduces likelihood of accidental data loss.
* Added JSON prettify to User Data.
* User data can be automatically pre-processed so you don't need to convert from JSON/XML.
* Added new 'Quotes' setting to prevent strings from being wrapped with quotes. Means that prettify will work properly.
* Removed panels from info page and added contents links.
* Fixed illegal access to thread name (used for automatic node log parameter population) (H,I,J).
* Fixed illegal access to impersonating user name (H,I,J).

### Version 4.2
* Fix prototype error when looking at Java functions.
* Automatically blacklist illegal fields.
* Add prototype property to function explanations.
* Fix cross-origin target frame access issue.
* Add support for property driven default blacklist and redlist.
* Update info page.
* Prevent strings containing XML from being quoted so it formats better.
* Move timer to the header for better visibility and reference.
* Add code example to regular expression tester.
* Added format button to user_data for formatting XML.
* Fix submit button spinner.
* Add support for function prototypes.
* Added node log support.

### Version 4.1
* Released under version 4.2

### Version 4.0
* Fixed issue with running scoped code in Helsinki.
* Full refactor for script include and processor.
* snd_Xplore is now a script include class which works both server and client
  side. The browser and the server both use this script.
* Pretty print improvement - with intelligent value capture for GlideRecord and
  GlideElement types.
* Minor UI modifications.
* Added icon.

### Version 3.6 (G5.0.1)
* Feature: Output wrapping controlled by setting. Defaulted to wrap.
* Feature: New side pane: Script Include importer.
* UI: Improved Settings pane.
* UI: Made setting panes overlay script editor instead of shrink it.
* UI: Updated Share link so it doesn't point to an old version.
* UI: Added additional Table Hierarchy link.
* Fix: Set default wrapping for long text to match the checkbox setting.
* Fix: user_data object now works in scoped scripts on the source instance.
* Tested in Helsinki. Scoped exploration does not work.


### Version 3.5 (G3.0.3)
* Feature: Prettify code in output pane.
* Feature: Timer to show how long the transaction has been running.
* Feature: Default output pane message.
* Change: Show logs and output messages when a transaction is cancelled.
* Fix: Typos


### Version 3.4 (G3.0.2)
* Feature: Add cancel button to cancel long running transactions.
* Feature: Setting to allow output messages to escape HTML.
* Feature: Xplore will run while impersonating.
* Interface modifications.


### Version 3.3 (G3.0.1)
* Feature: Add User Data pane for working with large text strings e.g. XML
* Feature: Improve table hierarchy search with expression support, label support
  and a search button (just hit <ENTER> instead of waiting).
* Feature: Made the info page permanent, merged with side bar info, added new content.
* Feature: Added a settings side bar menu for supporting new show\_props and
  show\_strings options.
* Change: Log frame tab click reload now only occurs on double click.
* Fix: Fixed tab overlay issue when showing the side bar on smaller screens
  which caused the tabs to stack.
* Fix: Made the glasses injection script more robust.
* Removed: Original informational side bar.


### Version 3.2 (G1.0.2)
* Fix: Mac Ctrl + Enter keyboard command

### Version 3.1 (G1.0.1)
* Feature: Editor gets immediate focus on load.
* Feature: Use Ctrl + Enter to run.
* Feature: Improved string value display.
* Feature: UI Script to inject the Xplore glasses icon.
* Fix (Geneva): CodeMirror not displaying correctly in Geneva.
* Fix (Geneva): Scope selector not working correctly.
* Fix: Give editor focus when clicking demo link.
* Workaround (Geneva): Don't run valueOf on objects - restricted in Geneva.
* Improved welcome content.


### Version 3.0 (F7.3.3)
* Feature: Support for running scripts in application scopes.
* Feature: Support for tabs.
* Feature: Dynamic regular expression tester (tab).
* Feature: Dynamic table hierarchy viewer (tab).
* Feature: System log viewer (tab).
* Fix: better script running capability with enhanced error catching.
* Fix: UI improvements across the board.
* Feature: Welcome page with built in explainers and some script demos.
* Feature: Script editor toggle for full screen output mode.
* Fix (Geneva): Deactivated Fuji application module and replaced with Geneva
  friendly version (standard URL). Fuji users still have the choice and can
  just reactivate the old version if required.


### Version 2.1
* Fix: Script runner improvements
* Feature: Addition of application module
* Fix: JSON issues for versions before Fuji patch 7

### Version 2.0
* Feature: Convert to global application


### Version 1.1
* Script runner
* Help panel
* Output explorer
