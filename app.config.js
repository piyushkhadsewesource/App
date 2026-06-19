// Dynamic Expo config.
//
// This keeps app.json as the source of truth and only adds the Firebase Android
// file (google-services.json) when it is actually present. That file is needed
// for emergency push delivery (SOS when the app is closed). Drop
// google-services.json next to this file to enable it, no manual edits, and the
// build never breaks if it isn't there yet.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...(config.android || {}), googleServicesFile: './google-services.json' };
  }
  return config;
};
