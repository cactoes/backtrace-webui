util.check_logged_in().then(r => {
    if (!r)
        window.location.href = "/login";
});

/* await */component.sidebar.setup();