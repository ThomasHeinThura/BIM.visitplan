import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles';

type BannerState = {
  tone: 'error' | 'success' | 'info';
  message: string;
};

export function Banner({ banner }: { banner: BannerState }) {
  return (
    <View
      style={[
        styles.banner,
        banner.tone === 'error'
          ? styles.bannerError
          : banner.tone === 'success'
            ? styles.bannerSuccess
            : styles.bannerInfo,
      ]}
    >
      <Text style={styles.bannerText}>{banner.message}</Text>
    </View>
  );
}