import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@react-navigation/native-stack', () => {
  return {
    createNativeStackNavigator: () => {
      return {
        Navigator: ({ children }: { children: React.ReactNode }) => children,
        Screen: ({ children }: { children: React.ReactNode }) => children,
      };
    },
  };
});

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  return {
    BarChart: () => React.createElement('BarChart'),
    PieChart: () => React.createElement('PieChart'),
  };
});
