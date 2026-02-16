export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Transactions: undefined;
  Stats: undefined;
  Settings: undefined;
  AssetFlows: undefined;
  TotalWealth: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  TransactionForm: {
    occurredDate?: string;
    type?: 'EXPENSE' | 'INCOME';
  } | undefined;
};
