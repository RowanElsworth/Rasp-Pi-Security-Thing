
$(document).ready(function() {
  // Fetch the detection log data
  const updateDetectionLog = () => {
    $.ajax({
      url: '/log',
      dataType: 'json'
    }).done((log) => {
      // Display the log data on the page
      const logTable = $('#log tbody');
      // Sort the log data array in descending order based on time
      log.sort((a, b) => new Date(b.time) - new Date(a.time));
      for (let i = 0; i < log.length; i++) {
        const logRow = $('<tr></tr>');
        const logNumberCell = $('<td></td>').text(log.length - i);
        const timeCell = $('<td></td>').text(log[i].time);
        logRow.append(logNumberCell);
        logRow.append(timeCell);
        logTable.append(logRow);
      }
    });
  }

  // Fetch the user log data
  const updateUserLog = () => {
    $.ajax({
      url: '/user-actions',
      dataType: 'json'
    }).done((userActions) => {
      // Display the user actions data on the page
      const userActionsTable = $('#log tbody');
      // Sort the user actions data array in descending order based on time
      userActions.sort((a, b) => new Date(b.time) - new Date(a.time));
      for (let i = 0; i < userActions.length; i++) {
        const userActionsRow = $('<tr></tr>');
        const logNumberCell = $('<td></td>').text(userActions.length - i);
        const userCell = $('<td></td>').text(userActions[i].username);
        const timeCell = $('<td></td>').text(userActions[i].time);
        const actionCell = $('<td></td>').text(userActions[i].action);
        const ipCell = $('<td></td>').text(userActions[i].ip);
        userActionsRow.append(logNumberCell);
        userActionsRow.append(userCell);
        userActionsRow.append(timeCell);
        userActionsRow.append(actionCell);
        userActionsRow.append(ipCell);
        userActionsTable.append(userActionsRow);
      }
    }).fail((error) => {
      console.error('Error fetching user actions:', error);
    });
  }

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
