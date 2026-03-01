import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { TabIcon } from '../components/TabIcon';
import { AssetFlowScreen } from '../screens/assets/AssetFlowScreen';
import { AssetFlowDetailScreen } from '../screens/assets/AssetFlowDetailScreen';
import { TotalWealthScreen } from '../screens/assets/TotalWealthScreen';
import { CategoryScreen } from '../screens/category/CategoryScreen';
import { BootScreen } from '../screens/common/BootScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { RecurringManagementScreen } from '../screens/settings/RecurringManagementScreen';
import { StatsScreen } from '../screens/stats/StatsScreen';
import { TransactionFormScreen } from '../screens/transaction/TransactionFormScreen';
import { TransactionScreen } from '../screens/transaction/TransactionScreen';
import { useAuthStore } from '../stores/authStore';
import { AuthStackParamList, MainTabParamList, RootStackParamList } from './routes';

const MainTabs = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const BANNER_HEIGHT = 64;

function MainTabNavigator() {
  const monthTitle = `${dayjs().year()}년 ${dayjs().month() + 1}월`;
  const tabTitleMap: Record<Exclude<keyof MainTabParamList, 'Home'>, string> = {
    Transactions: '거래',
    AssetFlows: '예적금/투자',
    TotalWealth: '총재산',
    Stats: '통계',
    Settings: '설정',
  };

  return (
    <MainTabs.Navigator
      initialRouteName="Home"
      tabBar={(props) => (
        <View>
          <View style={styles.banner}>
          </View>
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={({ route }) => ({
        headerTitle: route.name === 'Home' ? monthTitle : tabTitleMap[route.name as Exclude<keyof MainTabParamList, 'Home'>],
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#64748b',
        tabBarItemStyle: { borderRadius: 10, marginVertical: 4, marginHorizontal: 2 },
        tabBarLabelStyle: { fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<
            keyof MainTabParamList,
            'home' | 'transactions' | 'assetFlows' | 'totalWealth' | 'stats' | 'settings'
          > = {
            Home: 'home',
            Transactions: 'transactions',
            AssetFlows: 'assetFlows',
            TotalWealth: 'totalWealth',
            Stats: 'stats',
            Settings: 'settings',
          };
          const iconName = iconMap[route.name as keyof MainTabParamList] ?? 'home';
          return <TabIcon name={iconName} color={color} size={focused ? size + 1 : size} />;
        },
      })}
    >
      <MainTabs.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <MainTabs.Screen name="Transactions" component={TransactionScreen} options={{ tabBarLabel: '거래' }} />
      <MainTabs.Screen name="AssetFlows" component={AssetFlowScreen} options={{ tabBarLabel: '예적금/투자' }} />
      <MainTabs.Screen name="TotalWealth" component={TotalWealthScreen} options={{ tabBarLabel: '총재산' }} />
      <MainTabs.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: '통계' }} />
      <MainTabs.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '설정' }} />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <BootScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            headerBackTitle: '이전',
          }}
        >
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          <RootStack.Screen name="TransactionForm" component={TransactionFormScreen} />
          <RootStack.Screen
            name="AssetFlowDetail"
            component={AssetFlowDetailScreen}
            options={{
              headerShown: true,
              headerTitle: '상품 상세',
              headerTitleAlign: 'center',
            }}
          />
        <RootStack.Screen
          name="CategoryManagement"
          component={CategoryScreen}
          options={({ route }) => ({
            headerShown: true,
            headerTitle: route.params.title,
            headerTitleAlign: 'center',
          })}
        />
        <RootStack.Screen
          name="RecurringManagement"
          component={RecurringManagementScreen}
          options={{
            headerShown: true,
            headerTitle: '반복 거래 관리',
            headerTitleAlign: 'center',
          }}
        />
      </RootStack.Navigator>
      ) : (
        <AuthStack.Navigator
          screenOptions={{
            headerTitleAlign: 'center',
            headerBackTitle: '이전',
          }}
        >
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ title: '회원가입' }} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: BANNER_HEIGHT,
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
