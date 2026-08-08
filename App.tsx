/**
 * Application entry — Slice 0.
 *
 * The previous Cockpit-backed entry is preserved verbatim as App.cockpit.tsx. It is
 * not deleted because Slice 1 onward re-points its 14 live screens at bim-crm one
 * domain at a time; deleting it now would mean rewriting them from scratch instead.
 * It is not rendered because Cockpit is being retired and its credentials are blank,
 * so it cannot function.
 *
 * This entry renders the CRM connection check, which is Slice 0's definition of done:
 * sign in and reach an authenticated screen backed by bim-crm.
 *
 * Slice 0's navigation step (D.NAV) replaces this file with expo-router's app/
 * directory — see aidlc-docs/inception/application-design/mobile-architecture.md.
 */

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';

import CrmSignInScreen from './src/components/CrmSignInScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <CrmSignInScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
});
