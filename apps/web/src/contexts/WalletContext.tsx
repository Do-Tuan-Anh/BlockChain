'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BrowserProvider, Contract, Eip1193Provider, TransactionReceipt, TransactionResponse } from 'ethers';
import { useSession } from 'next-auth/react';
import { useTranslation } from './LanguageContext';
import abis from '@/lib/chain/abis.json';
import type { ChainConfig, ChainSnapshot, ContractName } from '@/lib/chain/types';
import { escrowActionError, transactionErrorMessage } from '@/lib/chain/wallet-errors.cjs';
import { useWalletBalance } from './useWalletBalance';
export { transactionErrorMessage } from '@/lib/chain/wallet-errors.cjs';

type Injected = Eip1193Provider & { on?: (name: string, callback: () => void) => void; removeListener?: (name: string, callback: () => void) => void };
const injected = () => (window as unknown as { ethereum?: Injected }).ethereum;
export async function apiJson(url: string, body?: unknown) {
  const res = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'REQUEST_FAILED');
  return data;
}
interface WalletState extends ReturnType<typeof useWalletBalance> {
  address: string; linked: string; config: ChainConfig | null; snapshot: ChainSnapshot | null;
  busy: boolean; status: string; error: string; hash: string;
  connect: () => Promise<void>; disconnect: () => Promise<void>; refresh: (sync?: boolean) => Promise<ChainSnapshot>;
  run: (name: ContractName, method: string, args: unknown[], value?: bigint, onSubmitted?: (hash: string) => void) => Promise<TransactionReceipt>;
  resume: (hash: string) => Promise<void>;
}
const Context = createContext<WalletState | null>(null);
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const message = (error: unknown) => transactionErrorMessage(error, vi);
  const [address, setAddress] = useState(''), [linked, setLinked] = useState('');
  const [linkedUserId, setLinkedUserId] = useState('');
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState(''), [hash, setHash] = useState('');
  const lock = useRef(false);
  const balanceState = useWalletBalance(linkedUserId === session?.user?.id ? linkedUserId : '', linked, snapshot?.config.scope || '');
  const { refreshBalance } = balanceState;
  useEffect(() => { void refreshBalance(); }, [snapshot, refreshBalance]);
  const refresh = useCallback(async (sync = false) => {
    if (sync) await apiJson('/api/chain/sync', {});
    const data = await apiJson('/api/chain') as ChainSnapshot;
    setSnapshot(data); return data;
  }, []);
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => {
    let active = true;
    setLinked('');
    setLinkedUserId('');
    setAddress('');
    if (session?.user?.id) apiJson('/api/chain/wallet').then(data => { if (active) { setLinked(data.walletAddress || ''); setLinkedUserId(session.user.id); } }).catch(() => {});
    return () => { active = false; };
  }, [session?.user?.id]);
  useEffect(() => {
    const eth = injected(), c = snapshot?.config;
    if (!eth || !linked || !session?.user?.id || !c) return;
    let active = true, request = 0;
    // Read existing permission only. Never request accounts, switch networks or sign automatically.
    const restore = async () => {
      const id = ++request; setAddress('');
      try {
        const accounts = await eth.request({ method: 'eth_accounts' }) as string[];
        if (accounts[0]?.toLowerCase() !== linked.toLowerCase()) return;
        const chainId = await eth.request({ method: 'eth_chainId' }) as string;
        if (Number(BigInt(chainId)) !== c.chainId) return;
        await apiJson('/api/chain/health');
        const block = await eth.request({ method: 'eth_getBlockByNumber', params: ['0x' + c.deploymentBlock.toString(16), false] }) as { hash?: string } | null;
        if (active && id === request && block?.hash === c.deploymentBlockHash) { setAddress(accounts[0].toLowerCase()); }
      } catch { /* A locked wallet or offline node stays disconnected until the user retries. */ }
    };
    const changed = () => { void restore(); };
    const visible = () => { if (!document.hidden) void restore(); };
    const disconnected = () => { request++; setAddress(''); };
    void restore();
    eth.on?.('accountsChanged', changed); eth.on?.('chainChanged', changed); eth.on?.('connect', changed); eth.on?.('disconnect', disconnected);
    window.addEventListener('focus', changed); document.addEventListener('visibilitychange', visible);
    return () => { active = false; request++; eth.removeListener?.('accountsChanged', changed); eth.removeListener?.('chainChanged', changed); eth.removeListener?.('connect', changed); eth.removeListener?.('disconnect', disconnected); window.removeEventListener('focus', changed); document.removeEventListener('visibilitychange', visible); };
  }, [linked, session?.user?.id, snapshot?.config]);
  async function signerFor(c: ChainConfig) {
    const eth = injected();
    if (!eth) throw new Error(vi ? 'Cài MetaMask hoặc mở bằng trình duyệt ví.' : 'Install MetaMask or open in a wallet browser.');
    await apiJson('/api/chain/health');
    const chainId = `0x${c.chainId.toString(16)}`;
    try { await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
    catch (error) {
      if ((error as { code: number }).code !== 4902) throw error;
      await eth.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: c.chainName, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [c.walletRpcUrl], ...(c.explorer ? { blockExplorerUrls: [c.explorer] } : {}) }] });
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    }
    await eth.request({ method: 'eth_requestAccounts' });
    const provider = new BrowserProvider(eth, undefined, { cacheTimeout: -1 });
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
      setAddress(address); setLinked(address); setLinkedUserId(session.user.id); setStatus(vi ? 'Ví đã liên kết' : 'Wallet linked');
    } catch (e) { setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  async function disconnect() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const eth = injected();
      if (eth) await eth.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
      setAddress(''); setHash('');
      setStatus(vi ? 'Đã ngắt kết nối ví khỏi website' : 'Wallet disconnected from this website');
    } catch (e) { setError(message(e)); throw e; }
    finally { lock.current = false; setBusy(false); }
  }
  async function run(name: ContractName, method: string, args: unknown[], value?: bigint, onSubmitted?: (hash: string) => void) {
    if (lock.current) throw new Error('TRANSACTION_IN_PROGRESS');
    lock.current = true; setBusy(true); setError(''); setHash(''); setStatus('');
    try {
      const c = (await refresh()).config, signer = await signerFor(c);
      const wallet = (await signer.getAddress()).toLowerCase();
      const current = await apiJson('/api/chain/wallet');
      if (current.walletAddress?.toLowerCase() !== wallet) throw new Error('LINK_THIS_WALLET_FIRST');
      setAddress(wallet); setLinked(wallet);
      const contract = new Contract(c.contracts[name], abis[name], signer);
      // Indexed UI data can lag behind another tab or a transaction already confirmed.
      // Read the actual contract before asking the wallet to sign a settlement again.
      if (name === 'Escrow' && ['confirmDeliveryAndRelease', 'refundBuyer', 'claimTimeoutRelease'].includes(method)) {
        const deposit = await contract.getEscrow(args[0]);
        const settled = escrowActionError(deposit.state);
        if (settled) throw new Error(settled);
      }
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
    } catch (e) {
      setStatus('');
      // A failed/repeated action must not leave stale actionable buttons on screen.
      await refresh(true).catch(() => {});
      setError(message(e)); throw e;
    }
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
  return <Context.Provider value={{ ...balanceState, address, linked, config: snapshot?.config || null, snapshot, busy, status, error, hash, connect, disconnect, refresh, run, resume }}>{children}</Context.Provider>;
}
export function useWallet() { const value = useContext(Context); if (!value) throw new Error('WalletProvider missing'); return value; }
