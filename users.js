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
    deleteUserRequest;
var masterPassword;
var adminUserName;
var adminPassword;
var foreName;
var userName;
var userPassword;
var phone;
var userId;

var createUserStates = [
    { state: '', prompt: 'Master password'},
    { state: 'MasterPassword', prompt: 'Username' },
    { state: 'UserName', prompt: 'Forename' },
    { state: 'Forename', prompt: 'Phone number' },
    { state: 'PhoneNumber', prompt: 'Password' },
    { state: 'UserPassword', prompt: '' }
];

var deleteUserStates = [
    { state: '', prompt: 'Username' },
    { state: 'UserName', prompt: 'Forename' },
    { state: 'Forename', prompt: 'Phone number' },
    { state: 'PhoneNumber', prompt: 'Password' },
    { state: 'UserPassword', prompt: 'User Id' },
    { state: 'UserId', prompt: ''}
];

var activeStates;
switch (mode) {
    case 'add-user':
      activeStates = createUserStates;
      break;
    case 'delete-user':
      activeStates = deleteUserStates;
      break;
    default:
      console.log(mode, 'is not a supported mode');
      process.exit(-1);
      break;
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
        case 'UserId':
            userId = userText;
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
            case 'add-user': 
                console.log('Logging in master user......');
                login({ username: 'master', password: masterPassword }).then(result => {
                    var masterToken = result.token;
                    console.log('Master user token:', masterToken);

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
                });
                break;

            case 'delete-user':
                var user = { username: userName, forename: foreName, phoneNumber: phone, password: userPassword};
                console.log('Logging in user:', JSON.stringify(user), '......');
                login(user).then(result => {
                    var token = result.token;
                    console.log('token for', user.username, ':', token);

                    var url = baseUrl + '/users/' + userId;
                    console.log('deleteUserRequest url:', url);

                    deleteUserRequest = request.defaults({
                        url: url,
                        json: true,
                        headers: {'Authorization': 'Bearer ' + token}
                    });

                    deleteUser(user).then(() => {
                        console.log('Deleted user with user id:');
                        resolve(userId);
                    }).catch(error => {
                        console.log('Error deleting user:', error);
                    }); 
                });
                break;
        }
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

function deleteUser(user) {
    console.log('Deleting user ' + user.forename + '......');
    var user = { username: user.username,
                 forename: user.forename,
                 phoneNumber: user.phoneNumber,
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

