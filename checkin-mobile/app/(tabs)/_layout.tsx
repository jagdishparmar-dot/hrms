import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/src/theme/colors';
import { Fonts } from '@/src/theme/typography';

type MaterialTabButtonProps = {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

/** Material-style press target with Android ripple. */
function MaterialTabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
}: MaterialTabButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{
        color: 'rgba(99, 102, 241, 0.16)',
        borderless: true,
        radius: 36,
      }}
      style={({ pressed }) => [
        styles.tabButton,
        typeof style === 'function' ? style({ pressed }) : style,
        pressed && Platform.OS !== 'android' && { opacity: 0.75 },
      ]}>
      {children}
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const bottomInset = isWeb ? 20 : Math.max(insets.bottom, 10);

  const activeColor = Colors.secondary;
  const inactiveColor = Colors.mutedForeground;
  const activeIndicator = Colors.secondaryLight;
  const surface = Colors.card;

  const renderIcon = (
    name: keyof typeof MaterialIcons.glyphMap,
    nameFocused: keyof typeof MaterialIcons.glyphMap,
    sfSymbol: string,
    sfFilled: string,
    color: string,
    focused: boolean,
  ) => {
    const icon =
      isIOS ? (
        <SymbolView
          name={(focused ? sfFilled : sfSymbol) as never}
          tintColor={color}
          size={22}
        />
      ) : (
        <MaterialIcons name={focused ? nameFocused : name} size={22} color={color} />
      );

    return (
      <View style={[styles.indicator, focused && { backgroundColor: activeIndicator }]}>
        {icon}
      </View>
    );
  };

  const renderLabel = (label: string, color: string, focused: boolean) => (
    <Text numberOfLines={1} style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}>
      {label}
    </Text>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => (
          <MaterialTabButton
            children={props.children}
            onPress={props.onPress ?? undefined}
            onLongPress={props.onLongPress ?? undefined}
            accessibilityState={props.accessibilityState}
            accessibilityLabel={props.accessibilityLabel}
            testID={props.testID}
            style={props.style}
          />
        ),
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.tabIcon,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 56 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          ...Platform.select({
            ios: {
              shadowColor: Colors.foreground,
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
            },
            android: {
              elevation: 10,
            },
            default: {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Colors.border,
            },
          }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: surface,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(10,22,40,0.06)',
                  ...Platform.select({
                    android: { elevation: 10 },
                    default: {},
                  }),
                },
              ]}
            />
          ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ color, focused }) => renderLabel('Home', String(color), focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon('home', 'home', 'house', 'house.fill', String(color), focused),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarLabel: ({ color, focused }) => renderLabel('Attendance', String(color), focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon(
              'event-available',
              'event-available',
              'person.badge.clock',
              'person.badge.clock.fill',
              String(color),
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          tabBarLabel: ({ color, focused }) => renderLabel('Leave', String(color), focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon(
              'beach-access',
              'beach-access',
              'sun.max',
              'sun.max.fill',
              String(color),
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ color, focused }) => renderLabel('Profile', String(color), focused),
          tabBarIcon: ({ color, focused }) =>
            renderIcon('person-outline', 'person', 'person', 'person.fill', String(color), focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabIcon: {
    marginTop: 0,
  },
  indicator: {
    minWidth: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 2,
    letterSpacing: 0.15,
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontFamily: Fonts.semibold,
  },
});
