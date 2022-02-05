// serviceworker registration
navigator.serviceWorker.register('./serviceworker.js').then(function(registration) {
    console.log('ServiceWorker registered: ', registration.scope);
}, function(err) {
    console.log('ServiceWorker not registered: ', err);
});