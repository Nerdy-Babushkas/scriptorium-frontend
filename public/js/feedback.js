/* public/js/feedback.js */
async function submitFeedback() {
  const name        = document.getElementById('fb-name').value.trim();
  const email       = document.getElementById('fb-email').value.trim();
  const area        = document.getElementById('fb-area').value;
  const description = document.getElementById('fb-description').value.trim();
  const successEl   = document.getElementById('fb-success');
  const errorEl     = document.getElementById('fb-error');
  const inlineErr   = document.getElementById('fb-inline-error');
  const btn         = document.getElementById('fb-submit');

  // Reset all messages
  successEl.classList.remove('visible');
  errorEl.classList.remove('visible');
  inlineErr.classList.remove('visible');

  // Validate required fields
  if (!area || !description) {
    inlineErr.classList.add('visible');
    return;
  }

  // Submit
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('https://scriptorium-backend-six.vercel.app/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, area, description })
    });

    const data = await res.json();

    if (res.ok) {
      successEl.classList.add('visible');
      document.getElementById('fb-name').value = '';
      document.getElementById('fb-email').value = '';
      document.getElementById('fb-area').value = '';
      document.getElementById('fb-description').value = '';
      btn.textContent = '✓ Sent!';
    } else {
      errorEl.textContent = data.error || 'Something went wrong. Please try again.';
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Send Feedback';
    }
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
    errorEl.classList.add('visible');
    btn.disabled = false;
    btn.textContent = 'Send Feedback';
  }
}