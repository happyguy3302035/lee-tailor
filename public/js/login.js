document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorAlert = document.getElementById('error-alert');

  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset error state
    if (errorAlert) {
      errorAlert.style.display = 'none';
      errorAlert.textContent = '';
    }

    // Extract form values
    const usernameInput = document.getElementById('username')?.value.trim();
    const passwordInput = document.getElementById('password')?.value;

    if (!usernameInput || !passwordInput) {
      showError('請輸入完整的帳號與密碼。');
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to clean root '/' which renders views/index.ejs
        window.location.href = data.redirectUrl || '/';
      } else {
        showError(data.message || '登入失敗，請檢查帳號與密碼。');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      showError('無法連線至伺服器，請檢查網路狀態或稍後再試。');
    }
  });

  // Helper function to display alert messages
  function showError(message) {
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.style.display = 'block';
    } else {
      alert(message);
    }
  }
});
