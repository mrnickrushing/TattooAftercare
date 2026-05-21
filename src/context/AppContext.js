import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTattoos, getStreak } from '../database/db';
import { isHealed } from '../utils/healingStages';

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
    } catch (e) {
      console.error('Error refreshing tattoos:', e);
    }
  }, []);

  const refreshStreak = useCallback(async () => {
    try {
      const s = await getStreak();
      setStreak(s);
    } catch (e) {
      console.error('Error refreshing streak:', e);
    }
  }, []);

  const checkProStatus = useCallback(async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;
      setProStatus(isPro);
    } catch {
      setProStatus(false);
    }
  }, []);

  const purchasePro = useCallback(async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const { PRO_PRODUCT_ID } = require('../config');
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        const pkg = offerings.current.availablePackages.find(
          (p) => p.product.productIdentifier === PRO_PRODUCT_ID
        );
        if (pkg) {
          const { customerInfo } = await Purchases.purchasePackage(pkg);
          const isPro = customerInfo.entitlements.active['pro'] !== undefined;
          setProStatus(isPro);
          return isPro;
        }
      }
      return false;
    } catch (e) {
      console.error('Purchase error:', e);
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
    } catch (e) {
      console.error('Restore error:', e);
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
        tattoos, activeTattoos, healedTattoos,
        proStatus, streak, activeCount, loading,
        refreshTattoos, refreshStreak, checkProStatus,
        purchasePro, restorePurchases,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
