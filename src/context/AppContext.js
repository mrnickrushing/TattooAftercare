import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { getTattoos, getStreak } from '../database/db';
import { isHealed } from '../utils/healingStages';
import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID } from '../config';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [tattoos, setTattoos] = useState([]);
  const [proStatus, setProStatus] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeCount = tattoos.filter((t) => !isHealed(t.date_tattooed)).length;
  const activeTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const healedTattoos = tattoos.filter((t) => isHealed(t.date_tattooed));

  const refreshTattoos = useCallback(async () => {
    try {
      const data = await getTattoos();
      setTattoos(data);
    } catch (error) {
      console.error('Error refreshing tattoos:', error);
    }
  }, []);

  const refreshStreak = useCallback(async () => {
    try {
      const s = await getStreak();
      setStreak(s);
    } catch (error) {
      console.error('Error refreshing streak:', error);
    }
  }, []);

  const checkProStatus = useCallback(async () => {
    try {
      // Try to use RevenueCat if available
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro =
        customerInfo.entitlements.active['pro'] !== undefined ||
        customerInfo.entitlements.active['premium'] !== undefined;
      setProStatus(isPro);
    } catch {
      // RevenueCat not configured or errored — default to free
      setProStatus(false);
    }
  }, []);

  const purchaseMonthly = useCallback(async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const { PRO_MONTHLY_ID } = require('../config');
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        const pkg = offerings.current.availablePackages.find(
          (p) => p.product.productIdentifier === PRO_MONTHLY_ID
        );
        if (pkg) {
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          const isPro = customerInfo.entitlements.active['pro'] !== undefined;
          setProStatus(isPro);
          return isPro;
        }
      }
      return false;
    } catch (error) {
      console.error('Purchase error:', error);
      return false;
    }
  }, []);

  const purchaseLifetime = useCallback(async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const { PRO_LIFETIME_ID } = require('../config');
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        const pkg = offerings.current.availablePackages.find(
          (p) => p.product.productIdentifier === PRO_LIFETIME_ID
        );
        if (pkg) {
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          const isPro = customerInfo.entitlements.active['pro'] !== undefined;
          setProStatus(isPro);
          return isPro;
        }
      }
      return false;
    } catch (error) {
      console.error('Purchase error:', error);
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.restorePurchases();
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;
      setProStatus(isPro);
      return isPro;
    } catch (error) {
      console.error('Restore error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    async function init() {
      await refreshTattoos();
      await refreshStreak();
      await checkProStatus();
      setLoading(false);
    }
    init();
  }, []);

  return (
    <AppContext.Provider
      value={{
        tattoos,
        activeTattoos,
        healedTattoos,
        proStatus,
        streak,
        activeCount,
        loading,
        refreshTattoos,
        refreshStreak,
        checkProStatus,
        purchaseMonthly,
        purchaseLifetime,
        restorePurchases,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
