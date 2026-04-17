// CELEBRATE 70 — Share Page
// QR code for friends to install the PWA
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, Download, Users, Smartphone, CheckCircle2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { canWrite, unlock, lock, onAccessChange } from "@/lib/access";

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://celebrate70.manus.space';

const INSTALL_STEPS = [
  { icon: '📱', title: 'Open the link', desc: 'Scan the QR code or tap the share link' },
  { icon: '🌐', title: 'Open in Safari/Chrome', desc: 'Make sure you\'re using your phone\'s browser' },
  { icon: '⬆️', title: 'Tap Share / Menu', desc: 'Use the share button at the bottom (iOS) or menu (Android)' },
  { icon: '➕', title: 'Add to Home Screen', desc: 'Tap "Add to Home Screen" and confirm' },
];

export default function SharePage() {
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(canWrite());
  const [phrase, setPhrase] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => onAccessChange(() => setUnlocked(canWrite())), []);

  function handleUnlock() {
    if (unlock(phrase)) {
      toast.success("Editing unlocked. Your changes will now sync to the group.");
      setPhrase("");
      setShowPrompt(false);
    } else {
      toast.error("That passphrase didn't match.");
    }
  }

  function handleLock() {
    lock();
    toast.message("Editing locked. Local changes only on this device.");
  }

  function copyLink() {
    navigator.clipboard.writeText(APP_URL).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({
        title: 'Celebrate 70 — Trip App',
        text: 'Join our Scotland & Orkney adventure! Install this app to follow along.',
        url: APP_URL,
      }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ background: 'oklch(0.28 0.07 155)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
          Share with Friends
        </h1>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.72 0.14 68)' }}>
          Invite your travel companions to install the app
        </p>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* QR Code Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)', boxShadow: '0 2px 12px oklch(0.28 0.07 155 / 0.10)' }}>
          
          {/* Card top banner */}
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.38 0.08 155))' }}>
            <Users size={16} style={{ color: 'oklch(0.72 0.14 68)' }} />
            <span className="text-sm font-semibold" style={{ color: 'oklch(0.97 0.02 85)' }}>
              Celebrate 70 · Scotland & Orkney 2026
            </span>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center py-6 px-4">
            <div className="p-4 rounded-2xl" style={{ background: 'oklch(0.97 0.02 85)' }}>
              <QRCodeSVG
                value={APP_URL}
                size={200}
                level="H"
                fgColor="oklch(0.20 0.03 155)"
                bgColor="transparent"
                imageSettings={{
                  src: '',
                  height: 0,
                  width: 0,
                  excavate: false,
                }}
              />
            </div>
            <p className="text-xs text-center mt-3" style={{ color: 'oklch(0.55 0.04 155)' }}>
              Scan with your phone camera to open the app
            </p>
            <div className="mt-2 px-3 py-1.5 rounded-full text-xs font-mono break-all text-center"
              style={{ background: 'oklch(0.94 0.03 80)', color: 'oklch(0.40 0.04 155)' }}>
              {APP_URL}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex gap-3">
            <button onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: copied ? 'oklch(0.38 0.08 155)' : 'oklch(0.94 0.03 80)', color: copied ? 'oklch(0.97 0.02 85)' : 'oklch(0.28 0.07 155)' }}>
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'oklch(0.28 0.07 155)', color: 'oklch(0.97 0.02 85)' }}>
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>

        {/* Install instructions */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} style={{ color: 'oklch(0.28 0.07 155)' }} />
            <h2 className="font-bold text-base" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              How to Install
            </h2>
          </div>
          {INSTALL_STEPS.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                style={{ background: 'oklch(0.94 0.03 80)' }}>
                {step.icon}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'oklch(0.20 0.03 155)' }}>{step.title}</div>
                <div className="text-xs" style={{ color: 'oklch(0.55 0.04 155)' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Editing access — gate for cloud writes */}
        <div className="rounded-2xl p-4"
          style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)' }}>
          <div className="flex items-center gap-2 mb-1">
            {unlocked
              ? <Unlock size={16} style={{ color: 'oklch(0.45 0.14 155)' }} />
              : <Lock size={16} style={{ color: 'oklch(0.28 0.07 155)' }} />}
            <h2 className="font-bold text-base" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              Editing access
            </h2>
          </div>
          <p className="text-xs" style={{ color: 'oklch(0.55 0.04 155)' }}>
            {unlocked
              ? 'This device can save itinerary edits, bucket-list toggles, and photo uploads to the shared album.'
              : 'You can view everything. Enter the trip passphrase to save changes for the whole group.'}
          </p>

          {unlocked ? (
            <button onClick={handleLock}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.94 0.03 80)', color: 'oklch(0.28 0.07 155)' }}>
              <Lock size={14} />
              Lock editing
            </button>
          ) : showPrompt ? (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                autoFocus
                placeholder="Trip passphrase"
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'oklch(0.94 0.03 80)', color: 'oklch(0.20 0.03 155)', border: '1px solid oklch(0.88 0.03 80)' }}
              />
              <button onClick={handleUnlock}
                className="px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'oklch(0.28 0.07 155)', color: 'oklch(0.97 0.02 85)' }}>
                Unlock
              </button>
            </div>
          ) : (
            <button onClick={() => setShowPrompt(true)}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.28 0.07 155)', color: 'oklch(0.97 0.02 85)' }}>
              <Unlock size={14} />
              Unlock editing
            </button>
          )}
        </div>

        {/* Trip info card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid oklch(0.88 0.03 80)' }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/hero-scotland-ammTfMGLeNbrezrDTP6rm9.webp"
            alt="Scotland Highlands"
            className="w-full h-28 object-cover"
          />
          <div className="p-4" style={{ background: 'oklch(1 0 0)' }}>
            <h3 className="font-bold text-base" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              Scotland & Orkney · April 2026
            </h3>
            <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.04 155)' }}>
              Clive & Jane Struver are celebrating with friends across the Scottish Highlands and Orkney Islands. 
              Install this app to follow the journey, explore nearby attractions, and stay up to date.
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {['17–24 April', 'Caithness', 'Cawdor', 'Orkney'].map(tag => (
                <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'oklch(0.72 0.14 68 / 0.15)', color: 'oklch(0.45 0.08 68)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
