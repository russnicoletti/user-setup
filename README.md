Abigail User Setup 
------------------

This module is used during the first-time setup process for Mozilla's Connected Devices Abigail project.

First Time Setup
----------------
This module is used to create the group and the users for a family using project Abigail's product to create lists and reminders. This module is used in conjunction with project Abigail's [Wifi Setup](https://github.com/project-abigail/wifi-setup). The first-time setup process is:
 * The wifi setup process is initiated when the Raspberry Pi device starts up.
 * This module is manually invoked when the wifi setup access point appears in the list of wifi networks (which will happend after the wifi setup module determines there is no wifi connection).
 * This module prompts for the following information
   * Admin user (username, phone number, password)
   * Group name
   * Users (for each user: username, phone number, password)
 * After collecting the information above, the module uses the API of project Abigail's [reminder server](https://github.com/project-abigail/calendar-server) to create the admin user, group, and users on the server.
 * Finally, this User Setup module saves the admin user's web token to the disk in the file `secret.json`.

For Each Device
---------------
For each device being setup, the `secret.json` file needs to be copied to the Raspberry Pi. This is a manual process:
   * `scp secret.json pi@raspberrypi.local:~/abigail-device`

To copy the file, we take advantage of the access point created by the wifi-setup module (in order to avoid the complication of connecting the laptop, on which the user-setup process has run, to the home network). Therefore, the `secret.json` file should be copied after the wifi-setup access point has been created and before using the wifi-setup page to connect the Raspberry Pi to the home network.
