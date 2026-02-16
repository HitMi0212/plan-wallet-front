import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useEffect } from 'react';

import { AssetFlowScreen } from '../screens/assets/AssetFlowScreen';
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

  return (
    <MainTabs.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTitle: monthTitle,
        headerTitleAlign: 'center',
      }}
    >
      <MainTabs.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />
      <MainTabs.Screen name="Transactions" component={TransactionScreen} options={{ tabBarLabel: '거래' }} />
      <MainTabs.Screen name="Categories" component={CategoryScreen} options={{ tabBarLabel: '카테고리' }} />
      <MainTabs.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: '통계' }} />
      <MainTabs.Screen name="AssetFlows" component={AssetFlowScreen} options={{ tabBarLabel: '예적금/투자' }} />
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
