
$(document).ready(function() {
  // Get the saved mode from local storage
  var savedMode = localStorage.getItem('mode');

  // Check if dark mode is saved, and update the body class accordingly
  if (savedMode === 'dark') {
    $('body').addClass('dark-mode');
  }
  // Fetch the detection log data
  const updateDetectionLog = () => {
    $.ajax({
      url: '/log',
      dataType: 'json'
    }).done((logs) => {
      logs = logs.sort((a, b) => new Date(a.time) - new Date(b.time)).reverse();
      const tableRows = logs.map((log, index) => `
        <tr>
          <td>${logs.length - index}</td>
          <td>${log.time}</td>
        </tr>
      `);
      document.querySelector('tbody').innerHTML = tableRows.join('');
    });
  };  

  // Fetch the user log data
  const updateUserLog = () => {
    $.ajax({
      url: '/user-actions',
      dataType: 'json'
    }).done((userActions) => {
      userActions = userActions.sort((a, b) => new Date(a.time) - new Date(b.time)).reverse();
      const tableRows = userActions.map((log, index) => `
        <tr>
          <td>${userActions.length - index}</td>
          <td>${log.username}</td>
          <td>${log.time}</td>
          <td>${log.action}</td>
          <td>${log.ip}</td>
        </tr>
      `);
      document.querySelector('tbody').innerHTML = tableRows.join('');
    }).fail((error) => {
      console.error('Error fetching user actions:', error);
    });
  };


  // Update the page content depending on the active page
  const updatePage = () => {
    if ($('#detection').hasClass('active')) {
      updateDetectionLog()
      $('.page-content').empty().html(`
        <table id="log">
          <thead>
            <tr>
              <th>Log Number</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `)
    } else {
      updateUserLog()
      $('.page-content').empty().html(`
        <table id="log">
        <thead>
          <tr>
            <th>Log Number</th>
            <th>User</th>
            <th>Time</th>
            <th>Action</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      `)
    }
  }

  // Select toggle slider
  updatePage()
  $('.select-toggle').on('click', '.toggle-split', function() {
    if ($(this).hasClass('active')) {
    } else {
      $('.toggle-split').removeClass('active');
      $(this).addClass('active');
      $('.toggle-slider').toggleClass('move');
      updatePage()
    }
  });
});
