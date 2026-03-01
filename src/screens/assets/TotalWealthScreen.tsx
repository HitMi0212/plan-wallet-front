import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { fetchUsdKrwRate } from '../../services/exchangeRateApi';
import {
  AssetFlowAccount,
  getLocalAssetFlowAccounts,
  requireAuthenticatedUserId,
} from '../../services/localDb';
import { useTransactionStore } from '../../stores/transactionStore';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 48;

export function TotalWealthScreen() {
  const { items, load } = useTransactionStore();
  const [accounts, setAccounts] = useState<AssetFlowAccount[]>([]);
  const [usdKrwRate, setUsdKrwRate] = useState<number | null>(null);
  const [assetCurrentTotal, setAssetCurrentTotal] = useState(0);
  const [savingsCurrentTotal, setSavingsCurrentTotal] = useState(0);
  const [investCurrentTotal, setInvestCurrentTotal] = useState(0);
  const [depositTransactionIdSet, setDepositTransactionIdSet] = useState<Set<number>>(new Set());
  const [savingsDepositTransactionIdSet, setSavingsDepositTransactionIdSet] = useState<Set<number>>(new Set());
  const [investDepositTransactionIdSet, setInvestDepositTransactionIdSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      (async () => {
        const userId = await requireAuthenticatedUserId();
        const [accounts, usdKrwRate] = await Promise.all([
          getLocalAssetFlowAccounts(userId),
          fetchUsdKrwRate().catch(() => null),
        ]);
        setAccounts(accounts);
        setUsdKrwRate(usdKrwRate);
        let savingsTotal = 0;
        let investTotal = 0;
        const total = accounts.reduce((sum, account) => {
          const accountTotal = account.records.reduce((recordSum, record) => {
            const kind = record.kind ?? 'DEPOSIT';
            if (kind === 'WITHDRAW') return recordSum - Math.abs(record.amount);
            if (kind === 'INTEREST') return recordSum + Math.abs(record.amount);
            return recordSum + record.amount;
          }, 0);
          const accountTotalInKrw =
            (account.currency ?? 'KRW') === 'USD'
              ? Math.trunc(accountTotal * (usdKrwRate ?? 0))
              : accountTotal;
          if (account.type === 'SAVINGS') {
            savingsTotal += accountTotalInKrw;
          } else if (account.type === 'INVEST') {
            investTotal += accountTotalInKrw;
          }
          if ((account.currency ?? 'KRW') === 'USD') {
            return sum + Math.trunc(accountTotal * (usdKrwRate ?? 0));
          }
          return sum + accountTotal;
        }, 0);
        const depositIds = new Set<number>();
        const savingsIds = new Set<number>();
        const investIds = new Set<number>();
        accounts.forEach((account) => {
          account.records.forEach((record) => {
            const kind = record.kind ?? 'DEPOSIT';
            if (kind !== 'DEPOSIT' || typeof record.transactionId !== 'number') return;
            depositIds.add(record.transactionId);
            if (account.type === 'SAVINGS') savingsIds.add(record.transactionId);
            if (account.type === 'INVEST') investIds.add(record.transactionId);
          });
        });
        setAssetCurrentTotal(Math.trunc(total));
        setSavingsCurrentTotal(Math.trunc(savingsTotal));
        setInvestCurrentTotal(Math.trunc(investTotal));
        setDepositTransactionIdSet(depositIds);
        setSavingsDepositTransactionIdSet(savingsIds);
        setInvestDepositTransactionIdSet(investIds);
      })();
    }, [load])
  );

  const currentYear = dayjs().year();
  const yearItems = useMemo(
    () => items.filter((item) => dayjs(item.occurredAt).year() === currentYear),
    [items, currentYear]
  );

  const totals = useMemo(() => {
    const totalIncome = yearItems
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = yearItems
      .filter((item) => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0);

    const savingsExpense = yearItems
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => savingsDepositTransactionIdSet.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
    const investExpense = yearItems
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => investDepositTransactionIdSet.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
    const depositExpenseExcluded = yearItems
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => depositTransactionIdSet.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
    return {
      totalIncome,
      totalExpense,
      netWealth: totalIncome - (totalExpense - depositExpenseExcluded) + assetCurrentTotal,
      savingsExpense,
      investExpense,
      depositExpenseExcluded,
    };
  }, [
    yearItems,
    assetCurrentTotal,
    depositTransactionIdSet,
    savingsDepositTransactionIdSet,
    investDepositTransactionIdSet,
  ]);

  const thisMonth = dayjs().startOf('month');
  const monthNet = useMemo(() => {
    const monthItems = items.filter((item) => {
      const d = dayjs(item.occurredAt);
      return d.year() === thisMonth.year() && d.month() === thisMonth.month();
    });
    const income = monthItems
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0);
    const normalExpense = monthItems
      .filter((item) => item.type === 'EXPENSE')
      .filter((item) => !depositTransactionIdSet.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);

    return income - normalExpense;
  }, [items, thisMonth, depositTransactionIdSet]);

  const assetTrend = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, idx) =>
      dayjs().subtract(5 - idx, 'month').startOf('month')
    );
    const data = months.map((month) => {
      const monthEnd = month.endOf('month');
      const total = accounts.reduce((sum, account) => {
        const accountTotal = account.records.reduce((recordSum, record) => {
          const occurred = dayjs(record.occurredAt);
          if (occurred.isAfter(monthEnd)) return recordSum;
          const kind = record.kind ?? 'DEPOSIT';
          let amount = record.amount;
          if (kind === 'WITHDRAW') amount = -Math.abs(record.amount);
          if (kind === 'INTEREST') amount = Math.abs(record.amount);
          return recordSum + amount;
        }, 0);
        const currency = account.currency ?? 'KRW';
        if (currency === 'USD') {
          return sum + Math.trunc(accountTotal * (usdKrwRate ?? 0));
        }
        return sum + Math.trunc(accountTotal);
      }, 0);
      return total;
    });
    return { labels: months.map((month) => month.format('M월')), data };
  }, [accounts, usdKrwRate]);

  const assetDistribution = useMemo(() => {
    if (savingsCurrentTotal === 0 && investCurrentTotal === 0) return [];
    return [
      { name: '예적금', total: savingsCurrentTotal, color: '#0ea5e9', legendFontColor: '#334155', legendFontSize: 12 },
      { name: '투자', total: investCurrentTotal, color: '#f97316', legendFontColor: '#334155', legendFontSize: 12 },
    ].filter((item) => item.total > 0);
  }, [savingsCurrentTotal, investCurrentTotal]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.mainCard}>
        <Text style={styles.title}>총 재산</Text>
        <Text style={styles.value}>{totals.netWealth.toLocaleString()}원</Text>
        <Text style={styles.assetFlowText}>
          예적금 {savingsCurrentTotal.toLocaleString()}원 · 투자 {investCurrentTotal.toLocaleString()}원
        </Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>자산 추이</Text>
        {assetTrend.data.every((value) => value === 0) ? (
          <Text style={styles.helperText}>자산 데이터가 없습니다.</Text>
        ) : (
          <LineChart
            data={{ labels: assetTrend.labels, datasets: [{ data: assetTrend.data }] }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chartInner}
          />
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>자산 비중</Text>
        {assetDistribution.length > 0 ? (
          <PieChart
            data={assetDistribution.map((item) => ({
              name: item.name,
              population: item.total,
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={chartWidth}
            height={220}
            accessor="population"
            chartConfig={chartConfig}
            backgroundColor="transparent"
            paddingLeft="8"
          />
        ) : (
          <Text style={styles.helperText}>자산 비중 데이터가 없습니다.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{currentYear}년 수입</Text>
        <Text style={styles.income}>{totals.totalIncome.toLocaleString()}원</Text>
        <Text style={styles.label}>{currentYear}년 지출</Text>
        <Text style={styles.expense}>{(totals.totalExpense - totals.depositExpenseExcluded).toLocaleString()}원</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{currentYear}년 예적금 지출</Text>
        <Text style={styles.savings}>{totals.savingsExpense.toLocaleString()}원</Text>
        <Text style={styles.label}>{currentYear}년 투자 지출</Text>
        <Text style={styles.invest}>{totals.investExpense.toLocaleString()}원</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>이번달 실질 자산(수입-일반지출)</Text>
        <Text style={styles.valueSmall}>{monthNet.toLocaleString()}원</Text>
      </View>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  decimalPlaces: 0,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  mainCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  value: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  assetFlowText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  chartInner: {
    borderRadius: 12,
  },
  helperText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  income: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  expense: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '800',
  },
  savings: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  invest: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '800',
  },
  valueSmall: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
});
