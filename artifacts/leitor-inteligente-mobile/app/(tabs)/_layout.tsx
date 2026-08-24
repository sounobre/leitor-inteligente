import React from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, Tabs, usePathname } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        <Label>Cards</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <Icon sf={{ default: 'rectangle.stack', selected: 'rectangle.stack.fill' }} />
        <Label>Preparar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="specialists">
        <Icon sf={{ default: 'graduationcap', selected: 'graduationcap.fill' }} />
        <Label>Especialistas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} />
        <Label>Livros</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dictionary">
        <Icon sf={{ default: 'character.book.closed', selected: 'character.book.closed.fill' }} />
        <Label>Dicionário</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const pathname = usePathname();
  const vividScreen = pathname === '/cards' || pathname === '/review' || pathname === '/dictionary';
  const colors = useColors(vividScreen ? 'dark' : undefined);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable onPress={() => router.push('/settings' as never)} hitSlop={12} accessibilityLabel="Abrir configurações de estudo" style={{ marginRight: 18 }}>
            <Feather name="settings" size={20} color={colors.foreground} />
          </Pressable>
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="sparkles" tintColor={color} size={24} /> : <Feather name="star" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: 'Preparar',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="rectangle.stack" tintColor={color} size={24} /> : <Feather name="layers" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Livros',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="books.vertical" tintColor={color} size={24} /> : <Feather name="book-open" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="specialists"
        options={{
          title: 'Especialistas',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="graduationcap" tintColor={color} size={24} /> : <Feather name="award" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: 'Dicionário',
          tabBarIcon: ({ color }) => <Feather name="book" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
