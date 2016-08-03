# ![Xplore logo](readme-assets/xplore-icon-48.png) Xplore
A toolkit for every ServiceNow developer.

## Install Notes:
Download the update set from
 [Share](https://share.servicenow.com/app.do#/search-result?search_query=sndeveloper&startRow=NaN&sort_parameter=title)
 and install to your instance.

_Downloading from Share should mean you receive notifications when an update is made._

## About:
*Xplore* is designed to make solving everyday tasks in ServiceNow a breeze. Run
a quick script to find the value of something, or debug a complex script include.
Use one of the utilities to make development activities easier.

* Background script alternative - explore server side objects
* Client console alternative - explore client side objects
* Test and debug code and objects
* Built in regular expression testing tool
* Built in table explorer
* Built in log viewer
* Fuji, Geneva and Helsinki compatible

## The Interface

*Xplore* is designed primarily to run code and show you what the result of your code was.
Type your script into the script runner on the left, hit Run, and see the results
shown on the Output tab.

*Xplore* looks at the last object in the script.

![Intro](readme-assets/xplore-gliderecord.png)

## Logging

*Xplore* has some pretty clever features that make debugging really simple... like
capturing log messages and showing them to you.

![Intro](readme-assets/xplore-logging.png)

## Regular Expressions

Everyone loves regular expressions. What do you mean, you don't?
Regardless, the utility built in *Xplore* will help you out and make it much easier
to do string matching and replacement without falling back on using substring methods.

![Intro](readme-assets/xplore-regex.png)

## Table Hierarchy

Whether or not you've been working with ServiceNow for 6 months or 6 years, you
aren't going to know every single table in the database. This handy utility lets
you easily see what's going on, and find out whether or not ServiceNow have already
provided a table for that CI class you've been asked to add.

![Intro](readme-assets/xplore-table-hierarchy.png)

## Other Things
* **User Data** let's you work with large text strings in your script.
* **Script Finder** allows you to quickly pull existing Script Includes into the
editor so you can work with them.
* **Logs** has it's own tab. Forget about trying to navigate to the log table manually,
you can do it right here. Double click the Logs tab to refresh the window.

## Future
* **Intellisense** This is the most asked about feature since Helsinki was released.
We're sure it's possible, we just need some more time on it. Feel free to chip in!

## License:

MIT, see [LICENSE.md](https://github.com/sn-developer/xplore/blob/master/LICENSE.md) for details.
