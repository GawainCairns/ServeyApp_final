document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('s_code_input');
    const button = document.getElementById('s_code_submit');
    if (!input || !button) return;

    function goToSurvey() {
        const code = input.value.trim();
        if (!code) {
            input.focus();
            return;
        }
        // Navigate to the respond page in the same `html` folder
        window.location.href = 'respond.html?s_code=' + encodeURIComponent(code);
    }

    button.addEventListener('click', goToSurvey);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') goToSurvey();
    });
});
