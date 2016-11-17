var request = require('request');
var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout);
const fs = require('fs');

if (process.argv.length != 3) {
    console.log('one argument must be supplied');
    process.exit(-1);
}

var mode = process.argv[2];

var baseUrl = 'https://calendar.knilxof.org/api/v2';
var loginRequest = request.defaults({
    url: baseUrl + '/login',
    json: true
}), createUserRequest,
    deleteUserRequest,
    getUserRemindersRequest;
var masterPassword;
var adminUserName;
var adminPassword;
var foreName;
var userName;
var userPassword;
var phone;
var userId;
var groupId;

var createUserStates = [
    { state: '', prompt: 'Master password'},
    { state: 'MasterPassword', prompt: 'Username' },
    { state: 'UserName', prompt: 'Forename' },
    { state: 'Forename', prompt: 'Phone number' },
    { state: 'PhoneNumber', prompt: 'Password' },
    { state: 'UserPassword', prompt: '' }
];

var deleteUserStates = [
    { state: '', prompt: 'Phone number' },
    { state: 'PhoneNumber', prompt: 'Password' },
    { state: 'UserPassword', prompt: 'User Id' },
    { state: 'UserId', prompt: ''}
];

var addUserToGroupStates = [
    { state: '', prompt: 'AdminUsername' },
    { state: 'AdminUserName', prompt: 'AdminPassword' },
    { state: 'AdminPassword', prompt: 'User Id' },
    { state: 'UserId', prompt: 'Group Id'},
    { state: 'GroupId', prompt: ''}
];

var deleteGroupStates = [
    { state: '', prompt: 'AdminUsername' },
    { state: 'AdminUserName', prompt: 'AdminPassword' },
    { state: 'AdminPassword', prompt: 'Group Id' },
    { state: 'GroupId', prompt: ''}
];

var getUserRemindersStates = [
    { state: '', prompt: 'Username' },
    { state: 'UserName', prompt: 'Password' },
    { state: 'UserPassword', prompt: '' },
];

// The states for creating a user and adding them to a group are the combination
// of the states for creating a user and for adding a user to a group, except that
// the 'userId' state is not used here since the userId is generated during the flow.
var createUserAddToGroupStates = [
    { state: '', prompt: 'Master password'},
    { state: 'MasterPassword', prompt: 'Username' },
    { state: 'UserName', prompt: 'Forename' },
    { state: 'Forename', prompt: 'Phone number' },
    { state: 'PhoneNumber', prompt: 'Password' },
    { state: 'UserPassword', prompt: 'AdminUsername' },
    { state: 'AdminUserName', prompt: 'AdminPassword' },
    { state: 'AdminPassword', prompt: 'Group Id' },
    { state: 'GroupId', prompt: ''}
];

var kvArray = [['create-user', createUserStates],
               ['delete-user', deleteUserStates],
               ['delete-group', deleteGroupStates],
               ['add-user-to-group', addUserToGroupStates],
               ['create-user-add-to-group', createUserAddToGroupStates],
               ['get-user-reminders', getUserRemindersStates]];

var statesMap = new Map(kvArray);
var activeStates = statesMap.get(mode);
if (!activeStates) {
    console.log(mode, 'is not a supported mode');
    process.exit(-1);
}

var stateObj = activeStates.shift();
prompt(stateObj.prompt);
rl.prompt();
stateObj = activeStates.shift();

rl.on('line', function(line) {
    var userText = line.trim();
    switch(stateObj.state) {
        case 'MasterPassword':
            masterPassword = userText;
            break;
        case 'UserName':
            userName = userText;
            break;
        case 'Forename':
            foreName = userText;
            break;
        case 'PhoneNumber':
            phone = userText;
            break;
        case 'UserPassword':
            userPassword = userText;
            break;
        case 'AdminUserName':
            adminUserName = userText;
            break;
        case 'AdminPassword':
            adminPassword = userText;
            break;
        case 'UserId':
            userId = userText;
            break;
        case 'GroupId':
            groupId = userText;
            break;
    }
    if (stateObj.prompt) {
        prompt(stateObj.prompt);
        stateObj = activeStates.shift();
        rl.prompt();
    } else {
        toServer().then((result) => {
            console.log(result);
            console.log('Have a nice day!');
            process.exit(0);
        });
    }
}).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
});

function prompt(text) {
  rl.setPrompt(text + ': ');
}

function toServer() {
    return new Promise((resolve, reject) => {

        switch (mode) {
            case 'create-user': 
                login({ username: 'master', password: masterPassword }).then(result => {
                    var masterToken = result.token;
                    console.log('Master user token:' + masterToken);

                    createUserRequest = request.defaults({
                        url: baseUrl + '/users',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + masterToken}
                    });
                    var user = {username: phone, forename: foreName, phoneNumber: phone, password: userPassword};
                    createUser(user).then((result) => {
                        console.log('User created, id:');
                        resolve(result.id);
                    }).catch(error => {
                        console.log('Error creating user:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in master user:', error);
                });
                break;

            case 'delete-user':
                var user = { username: phone, password: userPassword};
                login(user).then(result => {
                    var token = result.token;
                    console.log('Token for', user.username + ':', token);

                    deleteUserRequest = request.defaults({
                        url: baseUrl + '/users/' + userId,
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });

                    deleteUser(user).then(() => {
                        console.log('Deleted user with user id:');
                        resolve(userId);
                    }).catch(error => {
                        console.log('Error deleting user:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in user:', error);
                });
                break;

            case 'delete-group':
                var user = { username: adminUserName, password: adminPassword};
                login(user).then(result => {
                    var token = result.token;
                    console.log('Token for', user.username + ':', token);

                    deleteGroupRequest = request.defaults({
                        url: baseUrl + '/groups/' + groupId,
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });

                    deleteGroup(groupId).then(() => {
                        console.log('Deleted group with id:');
                        resolve(groupId);
                    }).catch(error => {
                        console.log('Error deleting user:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in user:', error);
                });
                break;
            case 'add-user-to-group':
                var admin = { username: adminUserName, password: adminPassword};
                login(admin).then(result => {
                    var token = result.token;
                    console.log('Token for', admin.username + ':', token);

                    addToGroupRequest = request.defaults({
                        baseUrl: baseUrl + '/groups',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });
                    addToGroup(groupId, userId).then(() => {
                        resolve('user (' + userId + ') added to group ' + groupId); 
                    }).catch(error => {
                        console.log('Error adding user to group:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in admin user:', error);
                });
                break;
            case 'get-user-reminders':
                var user = { username: userName, password: userPassword};
                login(user).then(result => {
                    var token = result.token;
                    console.log('Token for', user.username + ':', token);

                    getUserRemindersRequest = request.defaults({
                        baseUrl: baseUrl + '/reminders',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });
                    getUserReminders().then((result) => {
                        console.log(result);
                    }).catch(error => {
                        console.log('Error getting reminders:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in admin user:', error);
                });
                break;
            case 'create-user-add-to-group':
                login({ username: 'master', password: masterPassword }).then(result => {
                    var masterToken = result.token;
                    console.log('Master user token:' + masterToken);

                    createUserRequest = request.defaults({
                        url: baseUrl + '/users',
                        json: true,
                        headers: {'Authorization': 'Bearer ' + masterToken}
                    });
                    var user = {username: phone, forename: foreName, phoneNumber: phone, password: userPassword};
                    createUser(user).then((result) => {
                        var userId = result.id;
                        console.log('User created, id:', userId);
                
                        var admin = { username: adminUserName, password: adminPassword};
                        login(admin).then(result => {
                            var token = result.token;
                            console.log('Token for', admin.username + ':', token);

                            addToGroupRequest = request.defaults({
                                baseUrl: baseUrl + '/groups',
                                json: true,
                                headers: {'Authorization': 'Bearer ' + token}
                            });
                            addToGroup(groupId, userId).then(() => {
                                resolve('user (' + userId + ') added to group ' + groupId); 
                            }).catch(error => {
                                console.log('Error adding user to group:', error);
                            }); 
                        }).catch(error => {
                            console.log('Error logging in admin user:', error);
                        });
                    }).catch(error => {
                        console.log('Error creating user:', error);
                    }); 
                }).catch(error => {
                    console.log('Error logging in master user:', error);
                });
                break;
        }
    });
}

function login(user) {
    return new Promise(function(resolve, reject) {
        console.log('Logging in user:', JSON.stringify(user), '......');
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

function deleteUser(user) {
    console.log('Deleting user ' + user.username + '......');
    var user = { username: user.phoneNumber,
                 currentPassword: userPassword
    };
    console.log('user information for user being deleted:', JSON.stringify(user));
    return new Promise(function(resolve, reject) {
        deleteUserRequest.delete(
            {
              body: user
            }
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function deleteGroup(groupId) {
    console.log('Deleting group', groupId + '......');
    return new Promise(function(resolve, reject) {
        deleteGroupRequest.delete(
            {}
        ).on('response', function(response) {
            onResponse(response, resolve, reject)
        });
    });
}

function addToGroup(groupId, userId) {
    console.log('Adding user', userId, 'to group', groupId, '.....');

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
        console.log('statusCode:', result.statusCode);
        if (result.statusCode < 300) {
            resolve(result.serverData || null);
        } else {
            reject(result.serverData.message);
        }
    });
}

