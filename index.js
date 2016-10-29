var request = require('request');
var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout);
const fs = require('fs');

var baseUrl = 'https://calendar.knilxof.org/api/v2';
var loginRequest = request.defaults({
    url: baseUrl + '/login',
    json: true
}), createUserRequest,
    createGroupRequest,
    addToGroupRequest;

var admin = {};
var groupName;
var userforename,
    userphone,
    userpassword;
var users = [];
var masterPassword;
var state = 'MasterPassword';
rl.setPrompt('Master password: ');
rl.prompt();

rl.on('line', function(line) {
    var userText = line.trim();
    switch(state) {
        case 'MasterPassword':
            masterPassword = userText;
            state = 'AdminUser';
            rl.setPrompt('Admin user: ');
            rl.prompt();
            break;
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

                toServer(admin, users, groupName).then((token) => {
                    persistToken(token);
                    console.log('Web token successfully persisted');
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
 
function toServer(admin, users, groupName) {
    return new Promise((resolve, reject) => {
        console.log('Logging in master user......');
        login({ username: 'master', password: masterPassword }).then(result => {
            var masterToken = result.token;

            createUserRequest = request.defaults({
                url: baseUrl + '/users',
                json: true,
                headers: {'Authorization': 'Bearer ' + masterToken}
            });

            console.log('Creating admin user', admin.forename, '......');
            createUser(admin).then(result => {
                console.log('Admin user created with username:', result.username, 'id:', result.id);

                console.log('Logging in admin user......');
                login(admin).then(result => {
                    token = result.token;

                    createGroupRequest = request.defaults({
                        url: baseUrl + '/groups',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });

                    addToGroupRequest = request.defaults({
                        baseUrl: baseUrl + '/groups',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });

                    createGroup(groupName).then(result => {
                        var groupId = result.id;
                        console.log('group created, id:', groupId);

                        console.log('Creating users......');
                        var createUserPromises = users.map(createUser);
                        var userIdMap = new Map();
                        Promise.all(createUserPromises).then(results => {
                            results.forEach(result => {
                                userIdMap.set(result.username, result.id);
                                console.log('User created with username:', result.username, 'id:', result.id);
                            });

                            function handleAddUserToGroup(user) {
                                console.log('Adding user (' + user.forename + ') to group ' + groupName + '......');
                                return addToGroup(groupId, userIdMap.get(user.phoneNumber));
                            }

                            console.log('Adding users to group......');
                            var addUserToGroupPromises = users.map(handleAddUserToGroup);
                            Promise.all(addUserToGroupPromises).then(() => {
                                console.log('Users successfully added to group');
                                resolve(token);
                            }).catch(error => {
                                console.log('Error adding users to group', error);
                                reject();
                            });
                        }).catch(error => {
                            console.log('Error creating user:', error);
                            reject();
                        });
                    }).catch(error => {
                        console.log('Error creating group ' + groupName + ':', error);
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
        }).catch(error => {
            console.log('Error logging in master user', error);
            reject();
        });
    });
}

function login(user) {
    return new Promise(function(resolve, reject) {
        loginRequest.post(
            {
              body: user
            }
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function createUser(user) {
    console.log('Creating user ' + user.forename + '......');
    return new Promise(function(resolve, reject) {
        createUserRequest.post(
            { 
              body: user,
            }
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function createGroup(groupName) {
    console.log('Creating group ' + groupName, '.......');
    return new Promise(function(resolve, reject) {
        createGroupRequest.post(
            {
              body: {name: groupName},
            }
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function addToGroup(groupId, userId) {
    return new Promise(function(resolve, reject) {
        addToGroupRequest.put(
            {
              url: groupId + '/members/' + userId
            }
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function onResponse(response, resolve, reject) {
        var result = {statusCode: response.statusCode};

        response.on('data', function(data) {
            result.serverData = JSON.parse(data);
        }).on('end', function() {
            if (result.statusCode < 300) {
                resolve(result.serverData || null);
            } else {
                reject(result.serverData.message);
            }
        });
}

function persistToken(token) {
    var data = '{\n    "passphrase": "Shuddh Desi Romance",\n    "evernote": {\n        "authtoken": ' + '"' + token + '"' + '\n    }\n}\n';
    fs.writeFileSync(__dirname + '/secret.json', data);
}

