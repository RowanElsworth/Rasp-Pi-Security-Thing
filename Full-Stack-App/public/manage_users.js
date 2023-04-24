$(document).ready(function() {
  // Get the saved mode from local storage
  var savedMode = localStorage.getItem('mode');

  // Check if dark mode is saved, and update the body class accordingly
  if (savedMode === 'dark') {
    $('body').addClass('dark-mode');
  }
  const updateUserList = () => {
    $.ajax({
      url: '/users',
      dataType: 'json',
      success: function(users) {
        // Display the user data on the page
        const userTable = $('#users tbody');
        userTable.empty();
        $.each(users, function(i, user) {
          const userRow = $('<tr>');
          const userNameCell = $('<td>').text(user.username);
          const passwordCell = $('<td>');
          const resetPasswordWrapper = $('<div>').css('position', 'relative');
          const resetPasswordButton = $('<button>').text('Reset Password').css('font-size', '1.8rem');
          resetPasswordButton.on('click', function() {
            // Open a popup for changing password
            const newPassword = prompt('Enter new password for user ' + user.username + ':');
            if (newPassword !== null && newPassword !== '') {
              // Send a request to the server to update the password in the database
              $.ajax({
                url: '/users/' + user._id + '/password',
                type: 'PUT',
                data: { password: newPassword },
                success: function(response) {
                  alert('Password changed successfully for user ' + user.username + '.');
                  var action = {
                    action: `Changed ${user.username}'s password`
                  };
                
                  var xhr = new XMLHttpRequest();
                  xhr.open("POST", "/user-actions", true);
                  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                  xhr.onreadystatechange = function () {
                    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                      console.log('User action logged successfully.');
                    }
                  };
                  xhr.send(JSON.stringify(action));
                },
                error: function(error) {
                  console.error('Error changing password:', error);
                  alert('An error occurred while changing password for user ' + user.username + '.');
                }
              });
            }
          });
          resetPasswordWrapper.append(resetPasswordButton);
          passwordCell.append(resetPasswordWrapper);
          userRow.append(userNameCell);
          userRow.append(passwordCell);
          userTable.append(userRow);
        });
      },
      error: function(error) {
        console.error('Error fetching user data:', error);
        alert('An error occurred while fetching user data.');
      }
    });
  }

  const updatePage = () => {
    updateUserList();
    $('.page-content').prepend(`
      <table id="users">
        <thead>
          <tr>
            <th>Username</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `);
  }
  updatePage();

  // Add User button event listener
  $('#add-user-button').on('click', function() {
    $('.popup').css('display', 'block');
  });

  // Close button event listener
  $('.close, #add-user-cancel').on('click', function() {
    $('.popup').css('display', 'none');
  });

  // Submit button event listener
  $('#add-user-submit').on('click', function() {
    const username = $('#username-input').val();
    const password = $('#password-input').val();
    
    // Send POST request to server with user data
    $.ajax({
      url: '/users',
      method: 'POST',
      data: {
        username: username,
        password: password
      },
      success: function(response) {
        updateUserList();
        
        $('#add-user-popup').css('display', 'none');
        var action = {
          action: `Added user: "${username}"`
        };
      
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/user-actions", true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
          if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            console.log('User action logged successfully.');
          }
        };
        xhr.send(JSON.stringify(action));
      },
      error: function(error) {
        console.error('Failed to add user:', error);
      }
    });
  });

});