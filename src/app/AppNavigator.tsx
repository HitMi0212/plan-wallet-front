import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useEffect } from 'react';

import { TabIcon } from '../components/TabIcon';
import { AssetFlowScreen } from '../screens/assets/AssetFlowScreen';
import { TotalWealthScreen } from '../screens/assets/TotalWealthScreen';
import { CategoryScreen } from '../screens/category/CategoryScreen';
import { BootScreen } from '../screens/common/BootScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { StatsScreen } from '../screens/stats/StatsScreen';
import { TransactionScreen } from '../screens/transaction/TransactionScreen';
import { useAuthStore } from '../stores/authStore';
import { MainTabParamList } from './routes';

const MainTabs = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const monthTitle = `${dayjs().year()}년 ${dayjs().month() + 1}월`;
  const tabTitleMap: Record<Exclude<keyof MainTabParamList, 'Home'>, string> = {
    Transactions: '거래',
    AssetFlows: '예적금/투자',
    TotalWealth: '총재산',
    Stats: '통계',
    Categories: '카테고리',
    Settings: '설정',
  };

  return (
    <MainTabs.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerTitle: route.name === 'Home' ? monthTitle : tabTitleMap[route.name as Exclude<keyof MainTabParamList, 'Home'>],
        headerTitleAlign: 'center',
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<
            keyof MainTabParamList,
            'home' | 'transactions' | 'assetFlows' | 'totalWealth' | 'stats' | 'categories' | 'settings'
          > = {
            Home: 'home',
            Transactions: 'transactions',
            AssetFlows: 'assetFlows',
            TotalWealth: 'totalWealth',
            Stats: 'stats',
            Categories: 'categories',
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
      <MainTabs.Screen name="Categories" component={CategoryScreen} options={{ tabBarLabel: '카테고리' }} />
      <MainTabs.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '설정' }} />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <BootScreen />;
  }

  return <NavigationContainer><MainTabNavigator /></NavigationContainer>;
}
