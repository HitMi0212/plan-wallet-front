import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { CategoryScreen } from '../screens/category/CategoryScreen';
import { BootScreen } from '../screens/common/BootScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { StatsScreen } from '../screens/stats/StatsScreen';
import { TransactionScreen } from '../screens/transaction/TransactionScreen';
import { useAuthStore } from '../stores/authStore';
import { AuthStackParamList, MainTabParamList } from './routes';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Login">
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ title: '회원가입' }} />
    </AuthStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainTabs.Navigator initialRouteName="Home">
      <MainTabs.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <MainTabs.Screen name="Transactions" component={TransactionScreen} options={{ title: '거래' }} />
      <MainTabs.Screen name="Categories" component={CategoryScreen} options={{ title: '카테고리' }} />
      <MainTabs.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <BootScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
