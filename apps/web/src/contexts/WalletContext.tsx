'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BrowserProvider, Contract, Eip1193Provider, TransactionReceipt, TransactionResponse } from 'ethers';
import { useSession } from 'next-auth/react';
import { useTranslation } from './LanguageContext';
import abis from '@/lib/chain/abis.json';
import type { ChainConfig, ChainSnapshot, ContractName } from '@/lib/chain/types';

type Injected = Eip1193Provider & { on?: (name: string, callback: () => void) => void; removeListener?: (name: string, callback: () => void) => void };
const injected = () => (window as unknown as { ethereum?: Injected }).ethereum;
export async function apiJson(url: string, body?: unknown) {
  const res = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'REQUEST_FAILED');
  return data;
}
function message(error: unknown) {
  const e = error as { code?: string | number; shortMessage?: string; message?: string };
  return e.code === 4001 || e.code === 'ACTION_REJECTED' ? 'Bạn đã từ chối yêu cầu trong ví / Request rejected in wallet.' : e.shortMessage || e.message || 'Transaction failed';
}
interface WalletState {
  address: string; linked: string; config: ChainConfig | null; snapshot: ChainSnapshot | null;
  busy: boolean; status: string; error: string; hash: string;
  connect: () => Promise<void>; refresh: (sync?: boolean) => Promise<ChainSnapshot>;
  run: (name: ContractName, method: string, args: unknown[], value?: bigint, onSubmitted?: (hash: string) => void) => Promise<TransactionReceipt>;
  resume: (hash: string) => Promise<void>;
}
const Context = createContext<WalletState | null>(null);
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const [address, setAddress] = useState(''), [linked, setLinked] = useState('');
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState(''), [hash, setHash] = useState('');
  const lock = useRef(false);
  const refresh = useCallback(async (sync = false) => {
    if (sync) await apiJson('/api/chain/sync', {});
    const data = await apiJson('/api/chain') as ChainSnapshot;
    setSnapshot(data); return data;
  }, []);
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => {
    let active = true;
    setLinked('');
    setAddress('');
    if (session?.user?.id) apiJson('/api/chain/wallet').then(data => { if (active) setLinked(data.walletAddress || ''); }).catch(() => {});
    return () => { active = false; };
  }, [session?.user?.id]);
  useEffect(() => {
    const eth = injected(); if (!eth) return;
    const reset = () => { setAddress(''); setError(''); };
    eth.on?.('accountsChanged', reset); eth.on?.('chainChanged', reset);
    return () => { eth.removeListener?.('accountsChanged', reset); eth.removeListener?.('chainChanged', reset); };
  }, []);
  async function signerFor(c: ChainConfig) {
    const eth = injected();
    if (!eth) throw new Error(vi ? 'Cài MetaMask hoặc mở bằng trình duyệt ví.' : 'Install MetaMask or open in a wallet browser.');
    const chainId = `0x${c.chainId.toString(16)}`;
    try { await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
    catch (error) {
      if ((error as { code: number }).code !== 4902) throw error;
      await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: c.chainName, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [c.walletRpcUrl], ...(c.explorer ? { blockExplorerUrls: [c.explorer] } : {}) }] });
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    }
    await eth.request({ method: 'eth_requestAccounts' });
    const provider = new BrowserProvider(eth);
    if (Number((await provider.getNetwork()).chainId) !== c.chainId) throw new Error('WRONG_WALLET_CHAIN');
    if ((await provider.getBlock(c.deploymentBlock))?.hash !== c.deploymentBlockHash) throw new Error('CHAIN_RESET_REDEPLOY_REQUIRED');
    return provider.getSigner();
  }
  async function connect() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (!session?.user?.id) throw new Error(vi ? 'Đăng nhập trước khi liên kết ví.' : 'Sign in before linking a wallet.');
      const c = (await refresh()).config, signer = await signerFor(c);
      const address = (await signer.getAddress()).toLowerCase();
      const current = await apiJson('/api/chain/wallet');
      if (current.walletAddress?.toLowerCase() !== address) {
        const challenge = await apiJson('/api/chain/wallet', { address });
        const signature = await signer.signMessage(challenge.message);
        await apiJson('/api/chain/wallet', { address, message: challenge.message, signature });
      }
      setAddress(address); setLinked(address); setStatus(vi ? 'Ví đã liên kết' : 'Wallet linked');
    } catch (e) { setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  async function run(name: ContractName, method: string, args: unknown[], value?: bigint, onSubmitted?: (hash: string) => void) {
    if (lock.current) throw new Error('TRANSACTION_IN_PROGRESS');
    lock.current = true; setBusy(true); setError(''); setHash('');
    try {
      const c = (await refresh()).config, signer = await signerFor(c);
      const wallet = (await signer.getAddress()).toLowerCase();
      const current = await apiJson('/api/chain/wallet');
      if (current.walletAddress?.toLowerCase() !== wallet) throw new Error('LINK_THIS_WALLET_FIRST');
      setAddress(wallet); setLinked(wallet);
      const contract = new Contract(c.contracts[name], abis[name], signer);
      setStatus(vi ? 'Xác nhận giao dịch trong ví…' : 'Confirm in your wallet…');
      const tx = await contract[method](...args, ...(value === undefined ? [] : [{ value }])) as TransactionResponse;
      setHash(tx.hash); onSubmitted?.(tx.hash); setStatus(vi ? 'Đang chờ xác nhận blockchain…' : 'Waiting for blockchain confirmations…');
      const receipt = await tx.wait(c.confirmations + 1).catch((error: unknown) => {
        const replacement = error as { code?: string; cancelled?: boolean; receipt?: TransactionReceipt };
        if (replacement.code === 'TRANSACTION_REPLACED' && !replacement.cancelled && replacement.receipt?.status === 1) {
          setHash(replacement.receipt.hash); onSubmitted?.(replacement.receipt.hash); return replacement.receipt;
        }
        throw error;
      });
      if (!receipt || receipt.status !== 1) throw new Error('TRANSACTION_REVERTED');
      try { await refresh(true); setStatus(vi ? 'Giao dịch thành công' : 'Transaction confirmed'); }
      catch { setStatus(vi ? 'Giao dịch đã xác nhận. Bấm đồng bộ để cập nhật dữ liệu.' : 'Transaction confirmed. Refresh to sync indexed data.'); }
      return receipt;
    } catch (e) { setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  async function resume(txHash: string) {
    const c = (await refresh()).config, signer = await signerFor(c);
    setHash(txHash); setStatus(vi ? 'Khôi phục giao dịch đang chờ…' : 'Recovering pending transaction…');
    const tx = await signer.provider.getTransaction(txHash);
    if (!tx) throw new Error('TRANSACTION_NOT_FOUND');
    const receipt = await tx.wait(c.confirmations + 1);
    if (!receipt || receipt.status !== 1) throw new Error('TRANSACTION_REVERTED');
    await refresh(true);
  }
  return <Context.Provider value={{ address, linked, config: snapshot?.config || null, snapshot, busy, status, error, hash, connect, refresh, run, resume }}>{children}</Context.Provider>;
}
export function useWallet() { const value = useContext(Context); if (!value) throw new Error('WalletProvider missing'); return value; }
