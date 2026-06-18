import { registerRootComponent } from 'expo';
import type { ComponentType } from 'react';

// Load the app via require (not a static import) so that any error thrown while
// the app's modules evaluate at startup is catchable, and we can show it on
// screen instead of the app silently crashing on launch.
let App: ComponentType;
try {
  App = require('./App').default;
} catch (e: any) {
  const React = require('react');
  const { ScrollView, Text } = require('react-native');
  const message = String((e && e.message) || e || 'Unknown startup error');
  App = function StartupError() {
    return React.createElement(
      ScrollView,
      { style: { flex: 1, backgroundColor: '#FBF8F6' }, contentContainerStyle: { padding: 24, paddingTop: 90 } },
      React.createElement(
        Text,
        { style: { fontSize: 20, fontWeight: '700', color: '#2E2A2A', marginBottom: 10 } },
        'Tether could not start',
      ),
      React.createElement(
        Text,
        { selectable: true, style: { fontSize: 13, color: '#C7416B', lineHeight: 19 } },
        message,
      ),
      React.createElement(
        Text,
        { style: { marginTop: 16, fontSize: 13, color: '#6F6663' } },
        'Please screenshot this and send it to me.',
      ),
    );
  };
}

registerRootComponent(App);
