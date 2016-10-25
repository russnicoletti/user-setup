var https = require('https');
var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout);
const fs = require('fs');

var state = 'AdminUser';
rl.setPrompt('Admin user: ');
rl.prompt();

var admin = {};
var groupName;
var userforename,
    userphone,
    userpassword;
var users = [];

rl.on('line', function(line) {
    var userText = line.trim();
    switch(state) {
        case 'AdminUser':
            admin.forename = userText;
            state = 'AdminPhone';
            rl.setPrompt('Admin phone: ');
            rl.prompt();
            break;
        case 'AdminPhone':
            admin.phoneNumber = userText;
            admin.username = admin.phoneNumber;
            state = 'AdminPassword';
            rl.setPrompt('Admin password: ');
            rl.prompt();
            break;
        case 'AdminPassword':
            admin.password = userText;
            state = 'Group';
            rl.setPrompt('Group: ');
            rl.prompt();
            break;
        case 'Group':
            groupName = userText;
            state = 'AddUsers';
            rl.setPrompt('Add users? ');
            rl.prompt();
            break;
        case 'AddUsers':
            if (userText == 'y') {
                state = 'User';
                rl.setPrompt('First name: ');
                rl.prompt();
            } else if (userText == 'n') {
                console.log('admin:', admin);
                console.log('users:', users);
                rl.setPrompt('');

                persistData(admin, users, groupName).then(() => {
                    console.log('Have a nice day!');
                    process.exit(0);
                }).catch(() => {
                    console.log('Sorry about that! Have a nice day!');
                    process.exit(0);
                });
            }
            break;
        case 'User':
            userforename = userText;
            state = 'Phone';
            rl.setPrompt('Phone number: ');
            rl.prompt();
            break;
   
        case 'Phone':
            userphone = userText;
            username = userphone;
            state = 'Password';
            rl.setPrompt('Password: ');
            rl.prompt();
            break;
 
        case 'Password':
            userpassword = userText;
            users.push({forename: userforename,
                        username: username,
                        phoneNumber: userphone,
                        password: userpassword});
            console.log('users:', users);
            state = 'AddUsers';
            rl.setPrompt('Add users? ');
            rl.prompt();
            break;
    }
    rl.prompt();
}).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
});

function persistData(admin,
                     users,
                     groupName) {
    return new Promise((resolve, reject) => { 
        // Create admin user 
        console.log('Creating admin user', admin.forename + '......');
        var jsonData = JSON.stringify(admin);
        request('POST', '/users', {'Content-Type': 'application/json',
                           'Content-Length': jsonData.length}, jsonData).then(result => {
            console.log('Admin user created with username:', result.username, 'id:', result.id);
            var postData = {
                username: admin.username,
                password: admin.password
            };
        
            // Login admin user
            postData = JSON.stringify(postData);
            console.log('Logging in admin user......');
            request('POST', '/login', {'Content-Type': 'application/json',
                                       'Content-Length': postData.length}, postData).then(result => {
                console.log('Webtoken from login:', result.token);
                var token = result.token;
        
                // Create group (admin user will be autmatically added to group)
                var groupData = {
                    name: groupName
                };
                console.log('Creating group ' + groupData.name + '.......');
                jsonData = JSON.stringify(groupData);
                request('POST', '/groups', {'Content-Type': 'application/json',
                                    'Content-Length': jsonData.length,
                                    'Authorization': 'Bearer ' + token}, jsonData).then(result => {
                    var groupId = result.id;
                    console.log('group created, id:', groupId);
        
                    function handleCreateUser(user) {
                        // Create users
                        var postData = JSON.stringify(user);
                        console.log('Creating user ' + user.forename + '......');
                        return request('POST', '/users', {'Content-Type': 'application/json',
                                                          'Content-Length': postData.length}, postData);
                    }
                    console.log('Creating users......');
                    var createUserPromises = users.map(handleCreateUser);
                    var userIdMap = new Map();
                    Promise.all(createUserPromises).then(results => {
                        results.forEach(result => {
                            userIdMap.set(result.username, result.id);
                            console.log('User created with username:', result.username, 'id:', result.id);
                        });

                        function handleAddUserToGroup(user) {
                            console.log('Adding user (' + user.forename + ') to group ' + groupData.name + '......');
                            return request('PUT', '/groups/' + groupId + '/members/' + userIdMap.get(user.phoneNumber),
                                {'Authorization': 'Bearer ' + token});
                        }
                        console.log('Adding users to group......');
                        var addUserToGroupPromises = users.map(handleAddUserToGroup);
                        Promise.all(addUserToGroupPromises).then(results => {
                            console.log('Users successfully added to group');
                            persistToken(token);
                            console.log('Web token successfully persisted to file');
                            resolve();
                        }).catch(error => {
                            console.log('Error adding users to group', error);
                            reject();
                        });
                    }).catch(error => {
                        console.log('Error creating user:', error);
                        reject();
                    });
                }).catch(error => {
                    console.log('Error creating group ' + groupData.name + ':', error);
                    reject();
                });
            }).catch(error => {
                console.log('Error logging in admin user (' + admin.username + '):', error);
                reject();
            });
        }).catch(error => {
            console.log('Error creating admin user (' + admin.username + '):', error);
            reject();
        });
    });
}

function request(cmd, path, headers, postData) {
    console.log('request, cmd:', cmd, ', path:', path);
    var options = {
        host: 'calendar.knilxof.org',
        path: '/api/v2' + path,
        port: '443',
        headers: headers,
        method: cmd
    };

    console.log('Creating \'request\' promise for', path, '...');
    return new Promise(function(resolve, reject) {
        var req = https.request(options, (res) => {
            if (res.statusCode !== 200 && res.statusCode !== 201 && res.statusCode !== 204) {
                reject('request failed: ' + res);
            }
            var result;
            res.setEncoding('utf8');
            res.on('data', (data) => {
                result = JSON.parse(data); });
            res.on('end', () => {
                resolve(result);
            });
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

function persistToken(token) {
    var data = '{\n    "passphrase": "Shuddh Desi Romance",\n    "evernote": {\n        "authtoken": ' + '"' + token + '"' + '\n    }\n}\n';
    fs.writeFileSync('secret.json', data);
}

