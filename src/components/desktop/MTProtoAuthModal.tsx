import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, X, Shield, KeyRound, Smartphone } from 'lucide-react';
import { MTProtoBridge, BridgeSession } from '../../lib/bridge/MTProtoBridge';
import { AuthAgent } from '../../lib/agents/AuthAgent';

interface MTProtoAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLog?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const MTProtoAuthModal: React.FC<MTProtoAuthModalProps> = ({ isOpen, onClose, onLog }) => {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [bridgeStatus, setBridgeStatus] = useState<BridgeSession | undefined>(
    () => MTProtoBridge.getInstance().getSessionStatus()
  );

  useEffect(() => {
    return MTProtoBridge.getInstance().subscribe(setBridgeStatus);
  }, []);

  const handleRequestCode = async () => {
    if (!phone) {
      onLog?.("Введите номер телефона", "warn");
      return;
    }
    setLoading(true);
    try {
      await MTProtoBridge.getInstance().connectPhone(phone);
      onLog?.(`Код подтверждения отправлен на телефон ${phone}`, "success");
    } catch (err: any) {
      onLog?.(`Ошибка подключения: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length < 5) {
      onLog?.("Введите 5-значный код", "warn");
      return;
    }
    setLoading(true);
    try {
      const success = await MTProtoBridge.getInstance().verifyCode(code);
      if (success) {
        onLog?.("Сессия успешно аутентифицирована!", "success");
      }
    } catch (err: any) {
      onLog?.(`Ошибка верификации кода: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      onLog?.("Введите 2FA пароль", "warn");
      return;
    }
    setLoading(true);
    try {
      const success = await MTProtoBridge.getInstance().verifyPassword(password);
      if (success) {
        onLog?.("Пароль принят", "success");
      }
    } catch (err: any) {
      onLog?.(`Ошибка верификации пароля: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticating = bridgeStatus?.status === 'authenticating';
  const isConnected = bridgeStatus?.status === 'connected';
  const authStep = bridgeStatus?.authStep;

  // Auto-close when connected
  useEffect(() => {
    if (isConnected && isOpen) {
      const t = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isConnected, isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-fuchsia-400" /> Подключение MTProto
              </h3>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {bridgeStatus?.status === 'error' && (
                <div className={`p-3 border rounded-lg text-[10px] font-medium ${
                  bridgeStatus.errorMessage?.includes("повреждена") 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-3 h-3" />
                    <span className="uppercase font-bold tracking-tight">
                      {bridgeStatus.errorMessage?.includes("повреждена") ? "Сессия сброшена" : "Ошибка:"}
                    </span>
                  </div>
                  {bridgeStatus.errorMessage}
                  <button 
                    onClick={() => {
                      // Reset and clear session string to force new login
                      const auth = AuthAgent.getInstance();
                      auth.storeCredential("MTPROTO_USER_SESSION_STRING", "");
                      MTProtoBridge.getInstance().resetSession();
                    }}
                    className={`mt-2 w-full py-1 rounded border transition-all uppercase font-bold tracking-widest text-[8px] ${
                      bridgeStatus.errorMessage?.includes("повреждена")
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30"
                      : "bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                    }`}
                  >
                    Переподключиться
                  </button>
                </div>
              )}

              {isConnected ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-emerald-400">Авторизация успешна!</div>
                  <div className="text-[10px] text-slate-400">Мост MTProto активен.</div>
                </div>
              ) : isAuthenticating && authStep === 'password' ? (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Облачный пароль (2FA)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
                  />
                  <p className="text-[9px] text-slate-600 mt-2">
                    Для данного аккаунта включена двухэтапная аутентификация.
                  </p>
                  <button
                    onClick={handleVerifyPassword}
                    disabled={!password || loading}
                    className="w-full mt-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                  >
                    {loading ? "Отправка..." : "Отправить пароль"}
                  </button>
                </div>
              ) : isAuthenticating && authStep === 'code' ? (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Код подтверждения
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="12345"
                    maxLength={5}
                    className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  />
                  <p className="text-[9px] text-slate-600 mt-2">
                    Введите 5-значный код, отправленный в ваш клиент Telegram.
                  </p>
                  <button
                    onClick={handleVerifyCode}
                    disabled={!code || code.length < 5 || loading}
                    className="w-full mt-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                  >
                    {loading ? "Проверка..." : "Подтвердить код"}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Номер телефона (с кодом страны)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full bg-black border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-fuchsia-500 transition-colors"
                    onKeyDown={e => e.key === 'Enter' && handleRequestCode()}
                  />
                  <p className="text-[9px] text-slate-600 mt-2">
                    Необходим для установки сессии. Код придет в ваш клиент Telegram.
                  </p>
                  <button
                    onClick={handleRequestCode}
                    disabled={!phone || phone.length < 5 || loading}
                    className="w-full mt-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                  >
                    {loading ? "Отправка..." : "Запросить код"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
