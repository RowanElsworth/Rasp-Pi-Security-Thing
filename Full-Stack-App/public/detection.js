$(document).ready(function() {
  var socket = io();

  $.ajax({
    url: '/current-state-req',
    method: 'POST',
    contentType: 'application/json',
    data: null,
    success: function() {
      console.log('Request sent to backend');
    },
    error: function(err) {
      console.error('Error sending request to backend: ', err);
    },
  });  

  socket.on('current-state-front', (data) => {
    document.getElementById('light').checked = data;
  });

  socket.on('ready', (data) => {
    console.log(data.message);
    // Update checkbox state based on the received detection state
    document.getElementById('light').checked = data.value;
  });

  socket.on('pi-activated-front', (data) => {
    document.getElementById('light').checked = data.value;
  });
  
  document.getElementById('light').addEventListener('change', function() {
    let isChecked = this.checked;
      var action = {
      action: this.checked ? 'Activated detection' : 'Deactivated detection'
    };
    $.ajax({
      url: '/light',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ checked: isChecked }),
      success: function() {
        console.log('Click sent to backend');
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
      error: function(err) {
        console.error('Error sending click to backend: ', err);
      },
    });
  });
});