$('document').ready(() => {
  // Get the saved mode from local storage
  var savedMode = localStorage.getItem('mode');

  if (savedMode === 'dark') {
    $('body').addClass('dark-mode');
  }

  updateDarkModeText();
  $('#darkModeToggle').click(() => {
    var body = $('body');
    body.toggleClass('dark-mode');

    // Save the current mode to local storage
    var currentMode = body.hasClass('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('mode', currentMode);

    updateDarkModeText();
  });

  function updateDarkModeText() {
    var darkModeText = $('body').hasClass('dark-mode') ? 'On' : 'Off';
    $('#darkModeText').text(`Dark mode: ${darkModeText}`);
  }

  $('#specialModeToggle').click(() => {
    updateSpecialModeText()
    setTimeout(() => {
      window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank').focus();
    }, 10000);
  });

  function updateSpecialModeText() {
    var specialModeText = $('#specialModeText').text();
    $('#specialModeText').text(specialModeText === 'Special mode: Off' ? 'Special mode: On' : 'Special mode: Off');
  }

});