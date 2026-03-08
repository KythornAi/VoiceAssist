const { app } = require('electron')
console.log('App object defined:', !!app)
if (app) {
    console.log('Requesting lock...')
    const lock = app.requestSingleInstanceLock()
    console.log('Lock status:', lock)
}
process.exit(0)
