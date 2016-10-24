Abigail User Setup 
------------------

This module is used during the first-time setup process for Mozilla's Connected Devices Abigail project.

How To Run
----------
This module is used to create the group and the users for a family using project Abigail's product to create lists and reminders. This module is used in conjunction with project Abigail's [Wifi Setup](https://github.com/project-abigail/wifi-setup). The first-time setup process is:
 * The wifi setup process is initiated when the raspberry pi device starts up.
 * When the wifi setup module determines there is no wifi-connection it creates an access point.
 * When the wifi setup access point appears in the list of wifi networks, this module is invoked.
 * This module prompts for the following information
   * Admin user information (username, phone number, password)
   * Group name
   * User information (for each user: username, phone number, password)
 * After collecting the information above, the module uses the API of project Abigail's [reminder server](https://github.com/project-abigail/calendar-server) to create the admin user, group, and users on the server.
 * Finally, the User Setup module save the admin user's web token to the disk in the file `secret.json`.
 * The final step of the user setup process is to manually copy the `secret.json` file to the raspberry pi (`scp secret.json pi@raspberrypi.local~/abigail/device`)

